package engine

import (
        "context"
        "crypto/rand"
        "encoding/hex"
        "encoding/json"
        "fmt"
        "log"
        "sync"
        "time"

        "guild-service/internal/dao"
        "guild-service/internal/model"
)

const (
        maxCoopContributors    = 5
        coopBonusPerMember     = 0.08  // 每个协作者 +8% 加成
        coopLeaderBonus        = 0.15  // 发起者额外 +15% 加成
        coopJoinWindowSecs     = 600   // 协作加入窗口 10分钟
        coopAutoStartThreshold = 3     // 3人以上自动开战
        coopAutoStartDelay     = 30    // 满人后30秒自动开战

        battleWarPrefix = "guild:battle:" // Redis key prefix for battle state
)

// WarEngine 联盟战争引擎
// 核心职责：协作战斗机制、战争计分、自动结算
type WarEngine struct {
        dao    *dao.GuildDAO
        mu     sync.RWMutex
        running bool
        cancelFn context.CancelFunc
}

func NewWarEngine(dao *dao.GuildDAO) *WarEngine {
        return &WarEngine{dao: dao}
}

// Start 启动战争引擎
func (e *WarEngine) Start() {
        e.mu.Lock()
        if e.running {
                e.mu.Unlock()
                return
        }
        e.running = true
        ctx, cancel := context.WithCancel(context.Background())
        e.cancelFn = cancel
        e.mu.Unlock()

        // 启动自动结算协程
        go e.autoSettleLoop(ctx)
        // 启动协作自动开战协程
        go e.autoBattleStartLoop(ctx)

        log.Println("✅ 联盟战争引擎启动")
}

// Stop 停止战争引擎
func (e *WarEngine) Stop() {
        e.mu.Lock()
        defer e.mu.Unlock()
        if !e.running {
                return
        }
        e.running = false
        if e.cancelFn != nil {
                e.cancelFn()
        }
        log.Println("⏹ 联盟战争引擎已停止")
}

// ================================================================
// 协作战斗机制
// ================================================================

// InitiateCoopBattle 发起协作战斗
// 1. 验证战争状态
// 2. 创建协作战斗组
// 3. 发起者作为第一个贡献者
func (e *WarEngine) InitiateCoopBattle(ctx context.Context, warID string, cityID int64,
        attackerGuild, defenderGuild, leaderID int64, armyPower int) (*model.WarBattle, error) {

        // 1. 验证战争存在且进行中
        war, err := e.dao.GetWarByWarID(ctx, warID)
        if err != nil {
                return nil, fmt.Errorf("war not found: %w", err)
        }
        if war.Status != model.WarStatusActive {
                return nil, fmt.Errorf("war not active, current status: %s", model.WarStatusText(war.Status))
        }

        // 2. 验证进攻方属于战争参战方
        if war.AttackerGuild != attackerGuild {
                return nil, fmt.Errorf("not attacker in this war")
        }

        // 3. 创建协作战斗组
        battleID := generateBattleID()
        leader := model.Contributor{
                UserID:   leaderID,
                Power:    armyPower,
                JoinTime: time.Now(),
        }
        contributorsJSON, _ := json.Marshal([]model.Contributor{leader})

        // 计算初始协作加成
        coopBonus := coopLeaderBonus // 发起者加成

        battle := &model.WarBattle{
                BattleID:      battleID,
                WarID:         warID,
                CityID:        cityID,
                AttackerGuild: attackerGuild,
                DefenderGuild: defenderGuild,
                LeaderID:      leaderID,
                Contributors:  contributorsJSON,
                TotalArmy:     armyPower,
                CoopBonus:     coopBonus,
                DefenderPower: 1000,  // 默认防守兵力，后续从城池获取
                CityDefense:   100,    // 默认城防，后续从城池获取
        }

        if err := e.dao.CreateBattle(ctx, battle); err != nil {
                return nil, fmt.Errorf("create battle: %w", err)
        }

        log.Printf("⚔ 协作战斗发起: %s | 战争:%s 城池:%d 发起者:%d 兵力:%d",
                battleID, warID, cityID, leaderID, armyPower)

        return battle, nil
}

// JoinCoopBattle 加入协作战斗
// 1. 验证战斗状态（组队中）
// 2. 验证人数上限
// 3. 添加协作者，更新总兵力和加成
func (e *WarEngine) JoinCoopBattle(ctx context.Context, battleID string, userID int64, armyPower int) (*model.WarBattle, error) {

        battle, err := e.dao.GetBattleByBattleID(ctx, battleID)
        if err != nil {
                return nil, fmt.Errorf("battle not found: %w", err)
        }

        // 验证状态
        if battle.Status != model.CoopStatusGathering {
                return nil, fmt.Errorf("battle not in gathering phase, status: %d", battle.Status)
        }

        // 解析现有协作者
        var contributors []model.Contributor
        _ = json.Unmarshal(battle.Contributors, &contributors)

        // 验证人数上限
        if len(contributors) >= maxCoopContributors {
                return nil, fmt.Errorf("battle full, max %d contributors", maxCoopContributors)
        }

        // 验证加入窗口
        elapsed := time.Since(battle.CreatedAt).Seconds()
        if elapsed > float64(coopJoinWindowSecs) {
                return nil, fmt.Errorf("join window expired")
        }

        // 验证是否已加入
        for _, c := range contributors {
                if c.UserID == userID {
                        return nil, fmt.Errorf("already joined")
                }
        }

        // 添加协作者
        contributors = append(contributors, model.Contributor{
                UserID:   userID,
                Power:    armyPower,
                JoinTime: time.Now(),
        })

        // 计算新的总兵力和加成
        newContributorsJSON, _ := json.Marshal(contributors)
        memberCount := len(contributors) - 1 // 减去发起者
        newCoopBonus := coopLeaderBonus + float64(memberCount)*coopBonusPerMember
        newTotalArmy := battle.TotalArmy + armyPower

        // 更新数据库
        _, err = e.dao.GetBattleByBattleID(ctx, battleID) // 重新获取最新数据
        _ = err

        // 使用原始方法直接更新
        e.dao.UpdateBattleContributors(ctx, battleID, newContributorsJSON, newTotalArmy, newCoopBonus)

        log.Printf("🤝 加入协作: %s | 玩家:%d 兵力:%d 当前人数:%d/%d 加成:%.0f%%",
                battleID, userID, armyPower, len(contributors), maxCoopContributors, newCoopBonus*100)

        // 返回更新后的战斗
        battle.Contributors = newContributorsJSON
        battle.TotalArmy = newTotalArmy
        battle.CoopBonus = newCoopBonus
        return battle, nil
}

// ExecuteCoopBattle 执行协作战斗
// 核心战斗协作机制：
//   - 协作者总兵力 × (1 + 协作加成系数) vs 防守方战力 + 城防加成
//   - 每个协作者按贡献比例获得分数
//   - 战斗结果影响战争总分
func (e *WarEngine) ExecuteCoopBattle(ctx context.Context, battleID string) error {
        battle, err := e.dao.GetBattleByBattleID(ctx, battleID)
        if err != nil {
                return fmt.Errorf("battle not found: %w", err)
        }

        if battle.Status != model.CoopStatusGathering {
                return fmt.Errorf("battle already started")
        }

        // 标记为战斗中
        _ = e.dao.UpdateBattleResult(ctx, battleID, model.CoopStatusBattle, false, 0, 0, nil)

        // 解析协作者
        var contributors []model.Contributor
        _ = json.Unmarshal(battle.Contributors, &contributors)

        // === 协作战斗计算 ===

        // 1. 进攻方有效战力 = 总兵力 × (1 + 协作加成)
        attackerEffective := float64(battle.TotalArmy) * (1.0 + battle.CoopBonus)

        // 2. 防守方有效战力 = 驻军战力 + 城防加成
        defenderEffective := float64(battle.DefenderPower) + float64(battle.CityDefense)*0.5

        // 3. 随机浮动 ±10%
        attackerEffective *= 0.90 + randomFloat()*0.20
        defenderEffective *= 0.90 + randomFloat()*0.20

        // 4. 判定胜负
        attackerWin := attackerEffective > defenderEffective

        // 5. 计算伤害
        damageDealt := int(defenderEffective * 0.8)
        damageTaken := int(attackerEffective * 0.6)
        if !attackerWin {
                damageDealt = int(defenderEffective * 0.3)
                damageTaken = int(attackerEffective * 0.9)
        }

        // 6. 构建结果详情
        result := map[string]interface{}{
                "attacker_total":    battle.TotalArmy,
                "coop_bonus":        battle.CoopBonus,
                "attacker_effective": int(attackerEffective),
                "defender_power":    battle.DefenderPower,
                "city_defense":      battle.CityDefense,
                "defender_effective": int(defenderEffective),
                "contributors":      len(contributors),
                "winner":            "attacker",
                "damage_dealt":      damageDealt,
                "damage_taken":      damageTaken,
        }

        if !attackerWin {
                result["winner"] = "defender"
        }

        // 7. 各协作者贡献比例
        contribDetails := make([]map[string]interface{}, 0)
        totalPower := 0
        for _, c := range contributors {
                totalPower += c.Power
        }
        for _, c := range contributors {
                ratio := 0.0
                if totalPower > 0 {
                        ratio = float64(c.Power) / float64(totalPower)
                }
                score := int(float64(damageDealt) * ratio)
                contribDetails = append(contribDetails, map[string]interface{}{
                        "user_id": c.UserID,
                        "power":   c.Power,
                        "ratio":   ratio,
                        "score":   score,
                })
        }
        result["contribution_details"] = contribDetails

        resultJSON, _ := json.Marshal(result)

        // 8. 更新战斗结果
        _ = e.dao.UpdateBattleResult(ctx, battleID, model.CoopStatusFinished,
                attackerWin, damageDealt, damageTaken, resultJSON)

        // 9. 更新战争得分
        warScore := damageDealt / 100
        if attackerWin {
                _ = e.dao.UpdateWarScore(ctx, battle.WarID, true, warScore+50) // 胜利额外+50分
                _ = e.dao.UpdateWarScore(ctx, battle.WarID, false, warScore/2) // 防守方也得一些分
        } else {
                _ = e.dao.UpdateWarScore(ctx, battle.WarID, false, warScore+50)
        }

        log.Printf("💥 协作战斗完成: %s | %s → 城池%d | 参与:%d 伤害:%d 结果:%v",
                battleID, mapWin(attackerWin), battle.CityID, len(contributors), damageDealt, attackerWin)

        return nil
}

// ================================================================
// 战争结算
// ================================================================

// SettleWar 战争结算
func (e *WarEngine) SettleWar(ctx context.Context, warID string) {
        war, err := e.dao.GetWarByWarID(ctx, warID)
        if err != nil {
                return
        }

        if war.Status != model.WarStatusActive {
                return
        }

        // 更新为结算阶段
        _ = e.dao.UpdateWarStatus(ctx, warID, model.WarStatusEnded, model.WarPhaseSettle, nil)

        // 判定胜负
        winner := int64(3) // 默认平局
        if war.AttackerScore > war.DefenderScore {
                winner = 1 // 进攻方胜
        } else if war.DefenderScore > war.AttackerScore {
                winner = 2 // 防守方胜
        }

        // 构建结算详情
        result := map[string]interface{}{
                "attacker_score":  war.AttackerScore,
                "defender_score":  war.DefenderScore,
                "attacker_deaths": war.AttackerDeaths,
                "defender_deaths": war.DefenderDeaths,
                "cities_changed":  war.CitiesChanged,
                "winner":          winner,
                "settle_time":     time.Now().Format("2006-01-02 15:04:05"),
        }

        // 如果有目标城池，胜方占领
        if war.TargetCityID.Valid && winner != 3 {
                result["city_occupied"] = war.TargetCityID.Int64
                result["occupied_by"] = winner
        }

        resultJSON, _ := json.Marshal(result)

        // 更新战争结果
        _, _ = e.dao.GetWarByWarID(ctx, warID) // 最新数据
        // 直接更新
        _ = e.dao.UpdateWarStatus(ctx, warID, model.WarStatusEnded, model.WarPhaseSettle, resultJSON)

        log.Printf("🏛 战争结算: %s | 进攻方:%d分 防守方:%d分 胜方:%s",
                warID, war.AttackerScore, war.DefenderScore, mapWinner(winner))
}

// SurrenderWar 战争投降
func (e *WarEngine) SurrenderWar(ctx context.Context, warID string, surrenderGuildID int64) error {
        war, err := e.dao.GetWarByWarID(ctx, warID)
        if err != nil {
                return err
        }
        if war.Status != model.WarStatusActive {
                return fmt.Errorf("war not active")
        }

        // 投降方失败
        winner := int64(2) // 默认防守方赢
        if surrenderGuildID == war.DefenderGuild {
                winner = 1 // 防守方投降，进攻方赢
        }

        result := map[string]interface{}{
                "winner":           winner,
                "surrender_guild": surrenderGuildID,
                "surrender_time":   time.Now().Format("2006-01-02 15:04:05"),
        }
        resultJSON, _ := json.Marshal(result)

        return e.dao.UpdateWarStatus(ctx, warID, model.WarStatusEnded, model.WarPhaseSettle, resultJSON)
}

// ================================================================
// 自动化协程
// ================================================================

func (e *WarEngine) autoSettleLoop(ctx context.Context) {
        ticker := time.NewTicker(30 * time.Second)
        defer ticker.Stop()

        for {
                select {
                case <-ctx.Done():
                        return
                case <-ticker.C:
                        e.checkWarSettlement(ctx)
                }
        }
}

func (e *WarEngine) checkWarSettlement(ctx context.Context) {
        wars, err := e.dao.ListActiveWars(ctx)
        if err != nil {
                return
        }

        now := time.Now()
        for _, war := range wars {
                // 阶段推进
                if war.Phase == model.WarPhaseDeclare && now.After(war.StartTime) {
                        // 宣战 → 战斗阶段
                        _ = e.dao.UpdateWarStatus(ctx, war.WarID, model.WarStatusActive, model.WarPhaseBattle, nil)
                        log.Printf("⚔ 战争开始: %s → 进入战斗阶段", war.WarID)
                }

                // 检查是否到期
                if war.Phase >= model.WarPhaseBattle && now.After(war.EndTime) {
                        go e.SettleWar(context.Background(), war.WarID)
                }
        }
}

func (e *WarEngine) autoBattleStartLoop(ctx context.Context) {
        ticker := time.NewTicker(10 * time.Second)
        defer ticker.Stop()

        for {
                select {
                case <-ctx.Done():
                        return
                case <-ticker.C:
                        e.checkAutoBattleStart(ctx)
                }
        }
}

func (e *WarEngine) checkAutoBattleStart(ctx context.Context) {
        // 查找所有进行中的战争
        wars, err := e.dao.ListActiveWars(ctx)
        if err != nil {
                return
        }

        for _, war := range wars {
                if war.Phase != model.WarPhaseBattle {
                        continue
                }
                // 查找组队中的战斗
                battles, err := e.dao.ListGatheringBattles(ctx, war.WarID)
                if err != nil {
                        continue
                }

                for _, battle := range battles {
                        var contributors []model.Contributor
                        _ = json.Unmarshal(battle.Contributors, &contributors)

                        // 满3人自动开战 或 超时强制开战
                        elapsed := time.Since(battle.CreatedAt)
                        if len(contributors) >= coopAutoStartThreshold && elapsed > time.Duration(coopAutoStartDelay)*time.Second {
                                go e.ExecuteCoopBattle(context.Background(), battle.BattleID)
                        } else if elapsed > time.Duration(coopJoinWindowSecs)*time.Second {
                                // 超时强制开战
                                go e.ExecuteCoopBattle(context.Background(), battle.BattleID)
                        }
                }
        }
}

// ================================================================
// DAO 扩展（避免循环依赖）
// ================================================================

// UpdateBattleContributors is a convenience method to update battle contributors
// This is a thin wrapper to avoid adding too many methods to the DAO
func (e *WarEngine) UpdateBattleContributors(ctx context.Context, battleID string,
        contributors json.RawMessage, totalArmy int, coopBonus float64) {

        // Use raw SQL update
        _, err := e.dao.UpdateBattleContributorsRaw(ctx, battleID, contributors, totalArmy, coopBonus)
        if err != nil {
                log.Printf("❌ update battle contributors: %v", err)
        }
}

// ================================================================
// 辅助函数
// ================================================================

func generateBattleID() string {
        b := make([]byte, 16)
        _, _ = rand.Read(b)
        b[6] = (b[6] & 0x0f) | 0x40
        b[8] = (b[8] & 0x3f) | 0x80
        return "BTL-" + hex.EncodeToString(b[0:4]) + hex.EncodeToString(b[8:12])
}

func randomFloat() float64 {
        return float64(time.Now().UnixNano()%10000) / 10000.0
}

func mapWin(win bool) string {
        if win {
                return "进攻方胜"
        }
        return "防守方胜"
}

func mapWinner(winner int64) string {
        switch winner {
        case 1:
                return "进攻方"
        case 2:
                return "防守方"
        case 3:
                return "平局"
        default:
                return "未知"
        }
}

// ensure imports
var _ = json.Marshal
