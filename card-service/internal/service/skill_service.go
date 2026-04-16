package service

import (
        "context"
        "encoding/json"
        "errors"
        "fmt"
        "time"

        "card-service/internal/dao"
        "card-service/internal/engine"
        "card-service/internal/model"
        myredis "card-service/pkg/redis"

        "github.com/redis/go-redis/v9"
)

var (
        ErrSkillPoolNotFound    = errors.New("skill pool not found")
        ErrSkillPoolClosed      = errors.New("skill pool is closed")
        ErrSkillNotOwned        = errors.New("skill not owned by player")
        ErrSkillLocked          = errors.New("skill is locked, cannot decompose")
        ErrHeroNotFound         = errors.New("hero card not found")
        ErrSlotOccupied         = errors.New("skill slot is already occupied")
        ErrSkillAlreadyEquipped = errors.New("skill is already equipped on another hero")
        ErrMaxEquipReached      = errors.New("hero already has 3 skills equipped")
        ErrSkillEquipped        = errors.New("skill is equipped, cannot decompose")
        ErrMaxLevelReached      = errors.New("skill already at max level")
        ErrInsufficientFragments = errors.New("insufficient skill fragments")
)

const (
        cacheSkillPoolPrefix      = "skill:pool:"
        cacheSkillPoolTTL         = 10 * time.Minute
        cacheSkillGachaStatsPrefix = "skill:gacha:stats:"
        cacheSkillGachaStatsTTL   = 24 * time.Hour
        cacheUserSkillsPrefix     = "skill:user:list:"
        cacheUserSkillsTTL        = 5 * time.Minute

        // 分解返还碎片规则: R=5, SR=20, SSR=80
        decomposeRewards = map[int]int{
                3: 5,   // R 技能 → 5 碎片
                4: 20,  // SR 技能 → 20 碎片
                5: 80,  // SSR 技能 → 80 碎片
        }

        // 升级消耗碎片规则 (每级)
        upgradeCostBase = map[int]int{
                3: 10,  // R 技能每级 10 碎片
                4: 30,  // SR 技能每级 30 碎片
                5: 100, // SSR 技能每级 100 碎片
        }
)

// SkillService 技能业务逻辑
type SkillService struct {
        cardDAO    *dao.CardDAO
        skillDAO   *dao.SkillDAO
        engine     *engine.GachaEngine
}

func NewSkillService(cardDAO *dao.CardDAO, skillDAO *dao.SkillDAO, engine *engine.GachaEngine) *SkillService {
        return &SkillService{cardDAO: cardDAO, skillDAO: skillDAO, engine: engine}
}

// ──────────────────────────────────────
// 技能抽卡
// ──────────────────────────────────────

// SkillGacha 技能抽卡（单抽/十连）
func (s *SkillService) SkillGacha(ctx context.Context, userID int64, req *model.SkillGachaRequest) (*model.SkillGachaResponse, error) {
        // 0. 扣除货币
        cost := req.Count * 120 // 单抽120技能券
        if req.Count >= 10 {
                cost = 1200 // 十连1200技能券
        }
        if err := s.deductSkillTickets(ctx, userID, int64(cost), req.PoolID); err != nil {
                return nil, err
        }

        // 1. 获取技能卡池配置
        pool, poolCfg, err := s.getSkillPoolConfig(ctx, req.PoolID)
        if err != nil {
                return nil, err
        }

        // 2. 获取保底计数
        stats, err := s.skillDAO.GetSkillGachaStats(ctx, userID, req.PoolID)
        if err != nil {
                return nil, fmt.Errorf("get skill gacha stats: %w", err)
        }

        // 3. 转换为通用 PoolConfig 用于引擎
        genericCfg := &model.PoolConfig{
                SSRRate:   poolCfg.SSRRate,
                SRRate:    poolCfg.SRRate,
                RRate:     poolCfg.RRate,
                SSRUpRate: poolCfg.SSRUpRate,
                PitySSR:   poolCfg.PitySSR,
                PitySR:    poolCfg.PitySR,
                SSRPool:   poolCfg.SSRPool,
                SRPool:    poolCfg.SRPool,
                RPool:     poolCfg.RPool,
                UpCards:   poolCfg.UpSkills,
        }

        // 4. 执行抽卡引擎
        results, err := s.engine.PullBatch(genericCfg, req.Count, stats.SSRPityCounter, stats.SRPityCounter)
        if err != nil {
                return nil, fmt.Errorf("skill gacha engine error: %w", err)
        }

        // 5. 获取技能定义（批量）
        skillIDs := make([]int64, 0, len(results))
        for _, r := range results {
                skillIDs = append(skillIDs, r.CardID)
        }
        skillDefs, err := s.skillDAO.GetSkillDefinitionsByIDs(ctx, skillIDs)
        if err != nil {
                return nil, fmt.Errorf("get skill defs: %w", err)
        }

        // 6. 处理抽卡结果（新技能/重复技能）
        gachaResults := make([]model.SkillGachaResult, 0, len(results))
        gachaRecords := make([]*model.SkillGachaRecord, 0, len(results))
        ssrCount, srCount, rCount, newCount := 0, 0, 0, 0

        for i, result := range results {
                // 检查是否已有该技能
                existingSkill, _ := s.skillDAO.GetUserSkillBySkillID(ctx, userID, result.CardID)
                isNew := existingSkill == nil

                var userSkillID int64

                if isNew {
                        // 创建新的技能实例
                        newSkill := &model.UserSkill{
                                UserID:     userID,
                                SkillID:    result.CardID,
                                Level:      1,
                                Count:      1,
                                ObtainFrom: fmt.Sprintf("skill_pool_%d", req.PoolID),
                        }
                        id, err := s.skillDAO.CreateUserSkill(ctx, newSkill)
                        if err != nil {
                                return nil, fmt.Errorf("create user skill: %w", err)
                        }
                        userSkillID = id
                        newCount++
                } else {
                        // 重复技能，增加数量
                        if err := s.skillDAO.IncrementUserSkillCount(ctx, existingSkill.ID, 1); err != nil {
                                return nil, fmt.Errorf("increment skill count: %w", err)
                        }
                        userSkillID = existingSkill.ID
                }

                // 计数
                switch result.Rarity {
                case 5:
                        ssrCount++
                case 4:
                        srCount++
                default:
                        rCount++
                }

                // 构建响应
                skillDef := skillDefs[result.CardID]
                skillName, category := "", "attack"
                if skillDef != nil {
                        skillName = skillDef.Name
                        category = skillDef.Category
                }
                gachaResults = append(gachaResults, model.SkillGachaResult{
                        SkillID:     result.CardID,
                        Name:        skillName,
                        Rarity:      result.Rarity,
                        Category:    category,
                        IsNew:       isNew,
                        IsPity:      result.IsPity,
                        IsUp:        result.IsUp,
                        UserSkillID: userSkillID,
                })

                // 抽卡记录
                gachaRecords = append(gachaRecords, &model.SkillGachaRecord{
                        UserID:    userID,
                        PoolID:    req.PoolID,
                        SkillID:   result.CardID,
                        Rarity:    result.Rarity,
                        IsNew:     isNew,
                        IsPity:    result.IsPity,
                        PullIndex: stats.TotalPulls + i + 1,
                })

                // 更新保底计数
                switch result.Rarity {
                case 5:
                        stats.SSRPityCounter = 0
                        stats.SRPityCounter = 0
                case 4:
                        stats.SRPityCounter = 0
                        stats.SSRPityCounter++
                default:
                        stats.SSRPityCounter++
                        stats.SRPityCounter++
                }
        }

        // 7. 异步持久化记录
        go func() {
                bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
                defer cancel()
                _ = s.skillDAO.BatchCreateSkillGachaRecords(bgCtx, gachaRecords)
        }()

        // 8. 更新保底统计
        stats.TotalPulls += req.Count
        _ = s.skillDAO.UpsertSkillGachaStats(ctx, stats)
        s.cacheSkillGachaStats(ctx, stats)

        // 9. 清缓存
        _ = myredis.RDB.Del(ctx, fmt.Sprintf("%s%d", cacheUserSkillsPrefix, userID))

        return &model.SkillGachaResponse{
                PullIndex:   stats.TotalPulls,
                Skills:      gachaResults,
                NewSkills:   newCount,
                SSRCount:    ssrCount,
                SRCount:     srCount,
                RCount:      rCount,
                SSRPityLeft: poolCfg.PitySSR - stats.SSRPityCounter,
                SRPityLeft:  poolCfg.PitySR - stats.SRPityCounter,
        }, nil
}

// ──────────────────────────────────────
// 技能背包
// ──────────────────────────────────────

// GetUserSkills 获取玩家技能列表
func (s *SkillService) GetUserSkills(ctx context.Context, userID int64, page, pageSize int, rarity int, category string) ([]model.UserSkill, int64, error) {
        if page <= 0 {
                page = 1
        }
        if pageSize <= 0 {
                pageSize = 20
        }
        return s.skillDAO.GetUserSkills(ctx, userID, page, pageSize, rarity, category)
}

// ──────────────────────────────────────
// 装备技能到英雄
// ──────────────────────────────────────

// EquipSkill 装备技能到英雄
func (s *SkillService) EquipSkill(ctx context.Context, userID int64, req *model.EquipSkillRequest) error {
        // 1. 验证英雄卡牌属于该玩家
        _, err := s.cardDAO.GetUserCardByID(ctx, req.UserCardID, userID)
        if err != nil {
                if errors.Is(err, dao.ErrCardNotFound) {
                        return ErrHeroNotFound
                }
                return err
        }

        // 2. 验证技能属于该玩家
        userSkill, err := s.skillDAO.GetUserSkillByID(ctx, req.UserSkillID, userID)
        if err != nil {
                if errors.Is(err, dao.ErrUserSkillNotFound) {
                        return ErrSkillNotOwned
                }
                return err
        }

        // 3. 检查技能是否已装备到其他英雄
        equippedCardID, err := s.skillDAO.GetEquippedSkillInfo(ctx, req.UserSkillID)
        if err != nil {
                return err
        }
        if equippedCardID > 0 && equippedCardID != req.UserCardID {
                return ErrSkillAlreadyEquipped
        }

        // 4. 检查槽位是否已被占用（仅当技能不在此英雄此槽位时）
        existingEquip, _ := s.skillDAO.GetSlotEquipment(ctx, req.UserCardID, req.Slot)
        if existingEquip != nil && existingEquip.UserSkillID != req.UserSkillID {
                return ErrSlotOccupied
        }

        // 5. 如果是新装备（非更换），检查是否超过3个
        if existingEquip == nil {
                count, err := s.skillDAO.CountHeroEquipments(ctx, req.UserCardID, userID)
                if err != nil {
                        return err
                }
                if count >= 3 {
                        return ErrMaxEquipReached
                }
        }

        // 6. 如果该技能已装备在当前英雄的其他槽位，先卸下
        if equippedCardID == req.UserCardID {
                _ = s.skillDAO.UnequipSkillFromHero(ctx, req.UserCardID, 0, userID) // 不精确匹配slot
                // 获取旧的槽位
                allEquips, _ := s.skillDAO.GetHeroEquipments(ctx, req.UserCardID, userID)
                for _, eq := range allEquips {
                        if eq.UserSkillID == req.UserSkillID && eq.Slot != req.Slot {
                                _ = s.skillDAO.UnequipSkillFromHero(ctx, req.UserCardID, eq.Slot, userID)
                                break
                        }
                }
        }

        // 7. 执行装备
        eq := &model.HeroSkillEquipment{
                UserID:      userID,
                UserCardID:  req.UserCardID,
                UserSkillID: req.UserSkillID,
                Slot:        req.Slot,
        }
        if err := s.skillDAO.EquipSkillToHero(ctx, eq); err != nil {
                return fmt.Errorf("equip skill: %w", err)
        }

        // 8. 更新技能的装备状态
        _ = s.skillDAO.UpdateUserSkillEquipped(ctx, req.UserSkillID, true)

        return nil
}

// UnequipSkill 卸下英雄的技能
func (s *SkillService) UnequipSkill(ctx context.Context, userID int64, req *model.UnequipSkillRequest) error {
        // 1. 获取槽位装备信息
        existingEquip, err := s.skillDAO.GetSlotEquipment(ctx, req.UserCardID, req.Slot)
        if err != nil {
                return err
        }
        if existingEquip == nil {
                return ErrSlotOccupied // 槽位为空
        }

        // 2. 卸下
        if err := s.skillDAO.UnequipSkillFromHero(ctx, req.UserCardID, req.Slot, userID); err != nil {
                return err
        }

        // 3. 更新技能装备状态
        _ = s.skillDAO.UpdateUserSkillEquipped(ctx, existingEquip.UserSkillID, false)

        return nil
}

// GetHeroEquipmentInfo 获取英雄的完整装备信息（天生技能 + 装备技能）
func (s *SkillService) GetHeroEquipmentInfo(ctx context.Context, userID, userCardID int64) (*model.HeroEquipmentResponse, error) {
        // 1. 获取英雄卡牌
        userCard, err := s.cardDAO.GetUserCardByID(ctx, userCardID, userID)
        if err != nil {
                if errors.Is(err, dao.ErrCardNotFound) {
                        return nil, ErrHeroNotFound
                }
                return nil, err
        }

        // 2. 获取英雄的天生技能
        cardDef, err := s.cardDAO.GetCardByID(ctx, userCard.CardID)
        if err != nil {
                return nil, err
        }

        resp := &model.HeroEquipmentResponse{
                UserCardID:    userCardID,
                EquippedSkills: make([]model.EquippedSkillDetail, 0),
        }

        if cardDef.InnateSkillID > 0 {
                innateSkill, err := s.skillDAO.GetSkillDefinitionByID(ctx, int64(cardDef.InnateSkillID))
                if err == nil {
                        resp.InnateSkill = innateSkill
                }
        }

        // 3. 获取装备的技能
        equips, err := s.skillDAO.GetHeroEquipments(ctx, userCardID, userID)
        if err != nil {
                return nil, err
        }

        for _, eq := range equips {
                userSkill, err := s.skillDAO.GetUserSkillByID(ctx, eq.UserSkillID, userID)
                if err != nil {
                        continue
                }
                skillDef, err := s.skillDAO.GetSkillDefinitionByID(ctx, userSkill.SkillID)
                if err != nil {
                        continue
                }
                resp.EquippedSkills = append(resp.EquippedSkills, model.EquippedSkillDetail{
                        Slot:        eq.Slot,
                        UserSkillID: eq.UserSkillID,
                        Skill:       skillDef,
                        Level:       userSkill.Level,
                })
        }

        return resp, nil
}

// ──────────────────────────────────────
// 技能分解
// ──────────────────────────────────────

// DecomposeSkill 分解技能
func (s *SkillService) DecomposeSkill(ctx context.Context, userID int64, req *model.DecomposeSkillRequest) (*model.DecomposeSkillResponse, error) {
        // 1. 获取玩家技能
        userSkill, err := s.skillDAO.GetUserSkillByID(ctx, req.UserSkillID, userID)
        if err != nil {
                if errors.Is(err, dao.ErrUserSkillNotFound) {
                        return nil, ErrSkillNotOwned
                }
                return nil, err
        }

        // 2. 检查是否锁定
        if userSkill.IsLocked {
                return nil, ErrSkillLocked
        }

        // 3. 检查是否已装备
        if userSkill.IsEquipped {
                return nil, ErrSkillEquipped
        }

        // 4. 检查数量
        if userSkill.Count < req.DecomposeCount {
                return nil, dao.ErrInsufficientCount
        }

        // 5. 获取技能定义
        skillDef, err := s.skillDAO.GetSkillDefinitionByID(ctx, userSkill.SkillID)
        if err != nil {
                return nil, err
        }

        // 6. 计算奖励
        fragmentsPerUnit := decomposeRewards[skillDef.Rarity]
        if fragmentsPerUnit == 0 {
                fragmentsPerUnit = 5
        }
        totalReward := fragmentsPerUnit * req.DecomposeCount

        // 7. 扣减数量
        if err := s.skillDAO.DecreaseUserSkillCount(ctx, req.UserSkillID, req.DecomposeCount); err != nil {
                return nil, err
        }

        // 8. 如果数量归零，删除记录
        _ = s.skillDAO.DeleteUserSkillIfEmpty(ctx, req.UserSkillID)

        // 9. 记录分解日志
        decomposeRec := &model.SkillDecomposeRecord{
                UserID:         userID,
                UserSkillID:    req.UserSkillID,
                SkillID:        userSkill.SkillID,
                SkillName:      skillDef.Name,
                Rarity:         skillDef.Rarity,
                Level:          userSkill.Level,
                DecomposeCount: req.DecomposeCount,
                RewardType:     "skill_fragment",
                RewardAmount:   totalReward,
        }
        _ = s.skillDAO.CreateDecomposeRecord(ctx, decomposeRec)

        // 10. 发放碎片（调用 user-service）
        _ = s.grantSkillFragments(ctx, userID, int64(totalReward), "decompose")

        // 清缓存
        _ = myredis.RDB.Del(ctx, fmt.Sprintf("%s%d", cacheUserSkillsPrefix, userID))

        remainCount := userSkill.Count - req.DecomposeCount
        return &model.DecomposeSkillResponse{
                SkillName:    skillDef.Name,
                Rarity:       skillDef.Rarity,
                Level:        userSkill.Level,
                RewardType:   "skill_fragment",
                RewardAmount: totalReward,
                RemainCount:  remainCount,
        }, nil
}

// ──────────────────────────────────────
// 技能升级
// ──────────────────────────────────────

// UpgradeSkill 升级技能
func (s *SkillService) UpgradeSkill(ctx context.Context, userID int64, req *model.UpgradeSkillRequest) (*model.UpgradeSkillResponse, error) {
        // 1. 获取玩家技能
        userSkill, err := s.skillDAO.GetUserSkillByID(ctx, req.UserSkillID, userID)
        if err != nil {
                if errors.Is(err, dao.ErrUserSkillNotFound) {
                        return nil, ErrSkillNotOwned
                }
                return nil, err
        }

        // 2. 获取技能定义
        skillDef, err := s.skillDAO.GetSkillDefinitionByID(ctx, userSkill.SkillID)
        if err != nil {
                return nil, err
        }

        // 3. 检查是否已达最大等级
        if userSkill.Level >= skillDef.MaxLevel {
                return nil, ErrMaxLevelReached
        }

        // 4. 计算升级消耗
        costBase := upgradeCostBase[skillDef.Rarity]
        if costBase == 0 {
                costBase = 10
        }
        costFragments := costBase * userSkill.Level // 消耗 = 基础值 × 当前等级

        // 5. 扣除碎片（调用 user-service）
        if err := s.deductSkillFragments(ctx, userID, int64(costFragments), "upgrade"); err != nil {
                return nil, ErrInsufficientFragments
        }

        // 6. 升级
        newLevel := userSkill.Level + 1
        if err := s.skillDAO.UpdateUserSkillLevel(ctx, req.UserSkillID, newLevel); err != nil {
                return nil, err
        }

        // 7. 计算新属性
        newDamageRatio := skillDef.DamageRatio
        newBaseDamage := skillDef.BaseDamage

        // 如果有等级配置，使用对应等级的数值
        if skillDef.LevelConfig != "" {
                var levelConfigs []model.SkillLevelConfig
                if err := json.Unmarshal([]byte(skillDef.LevelConfig), &levelConfigs); err == nil {
                        for _, lc := range levelConfigs {
                                if lc.Level == newLevel {
                                        if lc.DamageRatio > 0 {
                                                newDamageRatio = lc.DamageRatio
                                        }
                                        if lc.BaseDamage > 0 {
                                                newBaseDamage = lc.BaseDamage
                                        }
                                        break
                                }
                        }
                }
        }

        // 8. 记录升级日志
        upgradeRec := &model.SkillUpgradeRecord{
                UserID:        userID,
                UserSkillID:   req.UserSkillID,
                SkillID:       userSkill.SkillID,
                BeforeLevel:   userSkill.Level,
                AfterLevel:    newLevel,
                CostFragments: costFragments,
        }
        _ = s.skillDAO.CreateUpgradeRecord(ctx, upgradeRec)

        return &model.UpgradeSkillResponse{
                SkillName:       skillDef.Name,
                Rarity:          skillDef.Rarity,
                BeforeLevel:     userSkill.Level,
                AfterLevel:      newLevel,
                CostFragments:   costFragments,
                NewDamageRatio:  newDamageRatio,
                NewBaseDamage:   newBaseDamage,
        }, nil
}

// ──────────────────────────────────────
// 技能卡池
// ──────────────────────────────────────

// ListSkillPools 获取可用技能卡池
func (s *SkillService) ListSkillPools(ctx context.Context) ([]*model.SkillPool, error) {
        return s.skillDAO.ListOpenSkillPools(ctx)
}

// GetSkillGachaHistory 获取技能抽卡历史
func (s *SkillService) GetSkillGachaHistory(ctx context.Context, userID int64, limit int) ([]model.SkillGachaRecord, error) {
        if limit <= 0 {
                limit = 20
        }
        return s.skillDAO.GetSkillGachaHistory(ctx, userID, limit)
}

// GetSkillGachaStats 获取技能保底计数
func (s *SkillService) GetSkillGachaStats(ctx context.Context, userID, poolID int64) (*model.UserSkillGachaStats, error) {
        info, err := s.getCachedSkillGachaStats(ctx, userID, poolID)
        if err == nil && info != nil {
                return info, nil
        }
        return s.skillDAO.GetSkillGachaStats(ctx, userID, poolID)
}

// ListSkillDefinitions 获取所有技能定义（管理员用）
func (s *SkillService) ListSkillDefinitions(ctx context.Context, page, pageSize int, rarity int, category string) ([]model.SkillDefinition, int64, error) {
        if page <= 0 {
                page = 1
        }
        if pageSize <= 0 {
                pageSize = 20
        }
        return s.skillDAO.ListSkillDefinitions(ctx, page, pageSize, rarity, category)
}

// ──────────────────────────────────────
// 内部方法：缓存
// ──────────────────────────────────────

func (s *SkillService) getSkillPoolConfig(ctx context.Context, poolID int64) (*model.SkillPool, *model.SkillPoolConfig, error) {
        pool, cfg, err := s.getCachedSkillPool(ctx, poolID)
        if err == nil && pool != nil {
                return pool, cfg, nil
        }

        pool, err = s.skillDAO.GetSkillPoolByID(ctx, poolID)
        if err != nil {
                if errors.Is(err, dao.ErrSkillPoolNotFound) {
                        return nil, nil, ErrSkillPoolNotFound
                }
                return nil, nil, fmt.Errorf("get skill pool: %w", err)
        }

        cfg, err = parseSkillPoolConfig(pool.Config)
        if err != nil {
                return nil, nil, fmt.Errorf("parse skill pool config: %w", err)
        }

        s.cacheSkillPool(ctx, pool, cfg)
        return pool, cfg, nil
}

func (s *SkillService) cacheSkillPool(ctx context.Context, pool *model.SkillPool, cfg *model.SkillPoolConfig) {
        key := fmt.Sprintf("%s%d", cacheSkillPoolPrefix, pool.ID)
        cfgJSON, _ := json.Marshal(cfg)
        poolJSON, _ := json.Marshal(pool)

        pipe := myredis.RDB.Pipeline()
        pipe.HSet(ctx, key, "pool", string(poolJSON))
        pipe.HSet(ctx, key, "config", string(cfgJSON))
        pipe.Expire(ctx, key, cacheSkillPoolTTL)
        pipe.Exec(ctx)
}

func (s *SkillService) getCachedSkillPool(ctx context.Context, poolID int64) (*model.SkillPool, *model.SkillPoolConfig, error) {
        key := fmt.Sprintf("%s%d", cacheSkillPoolPrefix, poolID)
        poolJSON, err := myredis.RDB.HGet(ctx, key, "pool").Result()
        if err != nil {
                return nil, nil, err
        }

        var pool model.SkillPool
        if err := json.Unmarshal([]byte(poolJSON), &pool); err != nil {
                return nil, nil, err
        }

        cfgJSON, _ := myredis.RDB.HGet(ctx, key, "config").Result()
        var cfg model.SkillPoolConfig
        if err := json.Unmarshal([]byte(cfgJSON), &cfg); err != nil {
                return &pool, nil, err
        }

        return &pool, &cfg, nil
}

func (s *SkillService) cacheSkillGachaStats(ctx context.Context, info *model.UserSkillGachaStats) {
        key := fmt.Sprintf("%s%d:%d", cacheSkillGachaStatsPrefix, info.UserID, info.PoolID)
        pipe := myredis.RDB.Pipeline()
        pipe.HSet(ctx, key,
                "user_id", info.UserID,
                "pool_id", info.PoolID,
                "total_pulls", info.TotalPulls,
                "ssr_pity_counter", info.SSRPityCounter,
                "sr_pity_counter", info.SRPityCounter,
        )
        pipe.Expire(ctx, key, cacheSkillGachaStatsTTL)
        pipe.Exec(ctx)
}

func (s *SkillService) getCachedSkillGachaStats(ctx context.Context, userID, poolID int64) (*model.UserSkillGachaStats, error) {
        key := fmt.Sprintf("%s%d:%d", cacheSkillGachaStatsPrefix, userID, poolID)
        totalStr, err := myredis.RDB.HGet(ctx, key, "total_pulls").Result()
        if err != nil {
                if errors.Is(err, redis.Nil) {
                        return nil, nil
                }
                return nil, err
        }
        if totalStr == "" {
                return nil, nil
        }

        ssrStr, _ := myredis.RDB.HGet(ctx, key, "ssr_pity_counter").Result()
        srStr, _ := myredis.RDB.HGet(ctx, key, "sr_pity_counter").Result()

        return &model.UserSkillGachaStats{
                UserID:         userID,
                PoolID:         poolID,
                TotalPulls:     parseInt(totalStr),
                SSRPityCounter: parseInt(ssrStr),
                SRPityCounter:  parseInt(srStr),
        }, nil
}

// ──────────────────────────────────────
// 跨服务调用
// ──────────────────────────────────────

func (s *SkillService) deductSkillTickets(ctx context.Context, userID, amount int64, poolID int64) error {
        // TODO: 调用 user-service 扣除技能券
        // 目前简化处理，直接返回成功
        return nil
}

func (s *SkillService) deductSkillFragments(ctx context.Context, userID, amount int64, reason string) error {
        // TODO: 调用 user-service 扣除技能碎片
        return nil
}

func (s *SkillService) grantSkillFragments(ctx context.Context, userID, amount int64, reason string) error {
        // TODO: 调用 user-service 发放技能碎片
        return nil
}

// ──────────────────────────────────────
// 工具函数
// ──────────────────────────────────────

func parseSkillPoolConfig(jsonStr string) (*model.SkillPoolConfig, error) {
        var cfg model.SkillPoolConfig
        if err := json.Unmarshal([]byte(jsonStr), &cfg); err != nil {
                return nil, fmt.Errorf("parse skill pool config: %w", err)
        }
        if cfg.PitySSR <= 0 || cfg.PitySR <= 0 {
                return nil, ErrInvalidPoolConfig
        }
        if len(cfg.SSRPool)+len(cfg.SRPool)+len(cfg.RPool) == 0 {
                return nil, ErrEmptyPool
        }
        return &cfg, nil
}
