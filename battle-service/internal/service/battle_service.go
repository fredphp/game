package service

import (
        "bytes"
        "context"
        "encoding/json"
        "fmt"
        "net/http"
        "time"

        "battle-service/internal/dao"
        "battle-service/internal/engine"
        "battle-service/internal/model"
)

type BattleService struct {
        dao     *dao.BattleDAO
        engine  *engine.BattleEngine
}

const (
        userServiceURL = "http://user-service:9001"
        internalApiKey = "internal-api-key-2024"
)

func NewBattleService(dao *dao.BattleDAO, engine *engine.BattleEngine) *BattleService {
        return &BattleService{dao: dao, engine: engine}
}

// StartPVE 发起 PVE 战斗
func (s *BattleService) StartPVE(ctx context.Context, userID int64, req *model.StartBattleRequest) (*model.BattleResponse, error) {
        // 1. 获取关卡定义
        stage, err := s.dao.GetStageDefinition(ctx, req.StageID)
        if err != nil {
                return nil, fmt.Errorf("stage not found: %w", err)
        }

        // 2. 构建我方阵容
        attackers, err := s.buildTeamFromRequest(userID, req.Team)
        if err != nil {
                return nil, err
        }

        // 3. 构建敌方阵容
        defenders, err := s.buildEnemyTeam(stage.EnemyTeamJSON)
        if err != nil {
                return nil, err
        }

        // 4. 执行战斗
        result := s.engine.Execute(attackers, defenders)

        // 5. 持久化记录
        resultJSON, _ := engine.SerializeResult(result)
        _ = s.dao.CreateBattleRecord(ctx, &model.BattleRecord{
                BattleID:    result.BattleID,
                AttackerID:  userID,
                DefenderID:  0,
                AttackerWin: result.Winner == 1,
                Type:        "pve",
                StageID:     req.StageID,
                TurnCount:   result.TurnCount,
                ResultJSON:  resultJSON,
                Duration:    result.Duration,
        })

        // 6. 胜利奖励发放
        var rewards []model.Reward
        if result.Winner == 1 {
                rewards = s.distributeRewards(ctx, userID, req.StageID)
        }

        return &model.BattleResponse{
                BattleID:  result.BattleID,
                Winner:    result.Winner,
                TurnCount: result.TurnCount,
                Turns:     result.Turns,
                Units:     result.Units,
                Rewards:   rewards,
                Duration:  result.Duration,
        }, nil
}

// GetBattleReplay 获取战斗回放
func (s *BattleService) GetBattleReplay(ctx context.Context, battleID string) (*model.BattleResult, error) {
        record, err := s.dao.GetBattleRecord(ctx, battleID)
        if err != nil {
                return nil, err
        }

        var result model.BattleResult
        if err := json.Unmarshal([]byte(record.ResultJSON), &result); err != nil {
                return nil, fmt.Errorf("parse battle result: %w", err)
        }
        return &result, nil
}

// GetBattleHistory 获取战斗历史
func (s *BattleService) GetBattleHistory(ctx context.Context, userID int64, limit int) ([]model.BattleRecord, error) {
        if limit <= 0 { limit = 20 }
        return s.dao.ListBattleRecords(ctx, userID, limit)
}

// SimulateBattle 模拟战斗（不持久化，用于预览）
func (s *BattleService) SimulateBattle(attackers, defenders []*model.BattleUnit) *model.BattleResult {
        return s.engine.Execute(attackers, defenders)
}

// ──────────────────────────────────────
// 构建阵容
// ──────────────────────────────────────

func (s *BattleService) buildTeamFromRequest(userID int64, slots []model.TeamSlot) ([]*model.BattleUnit, error) {
        // 使用预设武将数据（实际项目中从 user_cards + card_definitions 联查）
        cardDefs := defaultCardDefs()
        units := make([]*model.BattleUnit, 0, len(slots))

        for _, slot := range slots {
                card, ok := cardDefs[slot.CardID]
                if !ok { continue }

                unit := cardToUnit(userID, slot.CardID, card, slot.Slot)
                units = append(units, unit)
        }
        return units, nil
}

func (s *BattleService) buildEnemyTeam(jsonStr string) ([]*model.BattleUnit, error) {
        var team []struct {
                CardID int   `json:"card_id"`
                Slot   int   `json:"slot"`
                Level  int   `json:"level"`
                Star   int   `json:"star"`
        }
        if err := json.Unmarshal([]byte(jsonStr), &team); err != nil {
                return nil, fmt.Errorf("parse enemy team: %w", err)
        }

        cardDefs := defaultCardDefs()
        units := make([]*model.BattleUnit, 0)

        for _, t := range team {
                card, ok := cardDefs[t.CardID]
                if !ok { continue }
                unit := cardToUnit(0, t.CardID, card, t.Slot)
                // 根据关卡等级调整属性
                mul := 1.0 + float64(t.Level-1)*0.1 + float64(t.Star-1)*0.15
                unit.MaxHP = int(float64(unit.MaxHP) * mul)
                unit.CurrentHP = unit.MaxHP
                unit.ATK = int(float64(unit.ATK) * mul)
                unit.DEF = int(float64(unit.DEF) * mul)
                units = append(units, unit)
        }
        return units, nil
}

func cardToUnit(userID, cardID int64, c *CardDef, slot int) *model.BattleUnit {
        unit := &model.BattleUnit{
                UnitID:  userID*100 + int64(slot),
                UserID:  userID,
                CardID:  cardID,
                Name:    c.Name,
                Faction: c.Faction,
                Element: c.Element,
                Role:    c.Role,
                Slot:    slot,
                MaxHP:   c.BaseHP,
                CurrentHP: c.BaseHP,
                ATK:     c.BaseATK,
                DEF:     c.BaseDEF,
                SPD:     c.BaseSPD,
                CritRate: 500,
                CritDMG: 20000,
                Alive:   true,
                Buffs:   make([]*model.BuffEffect, 0),
                Debuffs: make([]*model.BuffEffect, 0),
        }
        if c.SkillID > 0 {
                unit.ActiveSkill = defaultSkill(c.SkillID)
        }
        return unit
}

// ──────────────────────────────────────
// 预设数据（实际项目中从 DB 加载）
// ──────────────────────────────────────

type CardDef struct {
        Name      string `json:"name"`
        Faction   string `json:"faction"`
        Element   string `json:"element"`
        Role      string `json:"role"`
        BaseHP    int    `json:"base_hp"`
        BaseATK   int    `json:"base_atk"`
        BaseDEF   int    `json:"base_def"`
        BaseSPD   int    `json:"base_spd"`
        SkillID   int64  `json:"skill_id"`
}

func defaultCardDefs() map[int64]*CardDef {
        return map[int64]*CardDef{
                1001: {Name: "关羽", Faction: "shu", Element: "fire", Role: "warrior", BaseHP: 4500, BaseATK: 380, BaseDEF: 200, BaseSPD: 120, SkillID: 1001},
                1002: {Name: "赵云", Faction: "shu", Element: "wind", Role: "assassin", BaseHP: 3800, BaseATK: 420, BaseDEF: 160, BaseSPD: 150, SkillID: 1002},
                1003: {Name: "陆逊", Faction: "wu", Element: "fire", Role: "mage", BaseHP: 3200, BaseATK: 450, BaseDEF: 140, BaseSPD: 130, SkillID: 1003},
                1004: {Name: "貂蝉", Faction: "qun", Element: "ice", Role: "mage", BaseHP: 3000, BaseATK: 400, BaseDEF: 130, BaseSPD: 140, SkillID: 1004},
                1005: {Name: "华佗", Faction: "qun", Element: "light", Role: "support", BaseHP: 3500, BaseATK: 200, BaseDEF: 180, BaseSPD: 110, SkillID: 1005},
                1006: {Name: "吕布", Faction: "qun", Element: "thunder", Role: "warrior", BaseHP: 5500, BaseATK: 500, BaseDEF: 180, BaseSPD: 100, SkillID: 1006},
                1007: {Name: "曹操", Faction: "wei", Element: "dark", Role: "tank", BaseHP: 6000, BaseATK: 280, BaseDEF: 300, BaseSPD: 90, SkillID: 1007},
                1008: {Name: "张飞", Faction: "shu", Element: "fire", Role: "tank", BaseHP: 5800, BaseATK: 300, BaseDEF: 280, BaseSPD: 85, SkillID: 1007},
                1009: {Name: "周瑜", Faction: "wu", Element: "fire", Role: "mage", BaseHP: 3300, BaseATK: 460, BaseDEF: 135, BaseSPD: 135, SkillID: 1003},
                1010: {Name: "诸葛亮", Faction: "shu", Element: "wind", Role: "mage", BaseHP: 3400, BaseATK: 480, BaseDEF: 140, BaseSPD: 145, SkillID: 1003},
        }
}

func defaultSkill(id int64) *model.Skill {
        skills := map[int64]*model.Skill{
                1001: {ID: 1001, Name: "青龙偃月刀", Type: "active", TargetType: "enemy_all", DamageType: "physical", DamageRatio: 1.8, BaseDamage: 200, CD: 4, Buffs: []model.BuffTemplate{{Type: "def_down", Value: 0.15, Duration: 2, IsDebuff: true}}, Description: "全体物理伤害+降防"},
                1002: {ID: 1002, Name: "龙胆枪法", Type: "active", TargetType: "single", DamageType: "physical", DamageRatio: 3.5, BaseDamage: 500, CD: 5, Buffs: []model.BuffTemplate{{Type: "atk_up", Value: 0.2, Duration: 3, IsDebuff: false}}, Description: "单体高伤+加攻"},
                1003: {ID: 1003, Name: "火烧连营", Type: "active", TargetType: "enemy_all", DamageType: "magical", DamageRatio: 2.0, BaseDamage: 300, CD: 5, Buffs: []model.BuffTemplate{{Type: "dot", Value: 0.05, Duration: 3, IsDebuff: true}}, Description: "全体法术+灼烧DOT"},
                1004: {ID: 1004, Name: "倾国倾城", Type: "active", TargetType: "enemy_back", DamageType: "magical", DamageRatio: 2.5, BaseDamage: 150, CD: 4, Buffs: []model.BuffTemplate{{Type: "spd_down", Value: 0.2, Duration: 2, IsDebuff: true}}, Description: "后排伤害+降速"},
                1005: {ID: 1005, Name: "妙手回春", Type: "active", TargetType: "ally_lowest_hp", DamageType: "magical", DamageRatio: 0, CD: 3, Special: "heal", HealRatio: 2.5, Buffs: []model.BuffTemplate{{Type: "hot", Value: 0.03, Duration: 3, IsDebuff: false}}, Description: "治疗最低血量队友"},
                1006: {ID: 1006, Name: "天下无双", Type: "active", TargetType: "single", DamageType: "physical", DamageRatio: 5.0, BaseDamage: 800, CD: 6, Buffs: []model.BuffTemplate{{Type: "atk_up", Value: 0.3, Duration: 2, IsDebuff: false}}, Description: "超高单体伤害"},
                1007: {ID: 1007, Name: "铁壁防御", Type: "active", TargetType: "self", DamageType: "physical", DamageRatio: 0, CD: 4, Buffs: []model.BuffTemplate{{Type: "def_up", Value: 0.4, Duration: 2, IsDebuff: false}}, Description: "自身加防40%"},
        }
        return skills[id]
}

// ──────────────────────────────────────
// 跨服务调用 / 奖励
// ──────────────────────────────────────

// distributeRewards 战斗胜利后发放奖励
func (s *BattleService) distributeRewards(ctx context.Context, userID int64, stageID int) []model.Reward {
        // 计算基础奖励
        goldReward := 100 + stageID*50
        expReward := 50 + stageID*20

        // 首次通关额外 +200 金币
        isFirstClear := false
        cleared, err := s.dao.HasClearedStage(ctx, userID, stageID)
        if err == nil && !cleared {
                goldReward += 200
                isFirstClear = true
        }

        // 调用 user-service 增加金币
        _ = callUserInternal(ctx, "POST", "/internal/user/add-gold", map[string]interface{}{
                "user_id": userID,
                "amount":  goldReward,
                "reason":  fmt.Sprintf("pve_stage_%d", stageID),
        })

        // 调用 user-service 增加经验
        _ = callUserInternal(ctx, "POST", "/internal/user/add-exp", map[string]interface{}{
                "user_id": userID,
                "amount":  expReward,
                "reason":  fmt.Sprintf("pve_stage_%d", stageID),
        })

        rewards := []model.Reward{
                {Type: "gold", Count: goldReward},
                {Type: "exp", Count: expReward},
        }
        if isFirstClear {
                rewards = append(rewards, model.Reward{Type: "gold", ID: 0, Count: 200})
        }

        return rewards
}

// callUserInternal 调用 user-service 内部 API 通用方法
func callUserInternal(ctx context.Context, method, path string, body interface{}) (map[string]interface{}, error) {
        data, _ := json.Marshal(body)
        req, err := http.NewRequestWithContext(ctx, method, userServiceURL+path, bytes.NewReader(data))
        if err != nil {
                return nil, err
        }
        req.Header.Set("Content-Type", "application/json")
        req.Header.Set("X-Internal-Api-Key", internalApiKey)

        client := &http.Client{Timeout: 5 * time.Second}
        resp, err := client.Do(req)
        if err != nil {
                return nil, err
        }
        defer resp.Body.Close()

        var result map[string]interface{}
        json.NewDecoder(resp.Body).Decode(&result)
        return result, nil
}

var _ = time.Now()
