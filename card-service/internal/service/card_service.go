package service

import (
        "bytes"
        "context"
        "encoding/json"
        "errors"
        "fmt"
        "net/http"
        "time"

        "card-service/internal/dao"
        "card-service/internal/engine"
        "card-service/internal/model"
        myredis "card-service/pkg/redis"

        "github.com/redis/go-redis/v9"
)

var (
        ErrPoolNotFound         = errors.New("card pool not found")
        ErrPoolClosed           = errors.New("card pool is closed")
        ErrNotEnoughPulls       = errors.New("insufficient pull count")
        ErrInsufficientDiamonds = errors.New("insufficient diamonds")
)

const (
        cachePoolPrefix      = "card:pool:"         // Hash: 卡池配置缓存
        cachePoolTTL         = 10 * time.Minute
        cacheGachaStatsPrefix = "card:gacha:stats:"  // Hash: 保底计数缓存
        cacheGachaStatsTTL   = 24 * time.Hour
        cacheUserCardsPrefix = "card:user:list:"     // String: 用户卡牌列表缓存
        cacheUserCardsTTL    = 5 * time.Minute

        userServiceURL  = "http://user-service:9001"
        internalApiKey  = "internal-api-key-2024"
)

// CardService 卡牌业务逻辑
type CardService struct {
        dao    *dao.CardDAO
        engine *engine.GachaEngine
}

func NewCardService(dao *dao.CardDAO, engine *engine.GachaEngine) *CardService {
        return &CardService{dao: dao, engine: engine}
}

// ──────────────────────────────────────
// 抽卡
// ──────────────────────────────────────

// Gacha 抽卡（单抽/十连）
func (s *CardService) Gacha(ctx context.Context, userID int64, req *model.GachaRequest) (*model.GachaResponse, error) {
        // 0. 扣除钻石
        cost := req.Count * 160 // 单抽160钻石
        if req.Count >= 10 {
                cost = 1600 // 十连1600钻石（十连折扣）
        }
        if err := s.deductDiamonds(ctx, userID, int64(cost), req.PoolID); err != nil {
                return nil, ErrInsufficientDiamonds
        }

        // 1. 获取卡池配置
        pool, poolCfg, err := s.getPoolConfig(ctx, req.PoolID)
        if err != nil {
                return nil, err
        }

        // 2. 获取保底计数
        stats, err := s.dao.GetGachaStats(ctx, userID, req.PoolID)
        if err != nil {
                return nil, fmt.Errorf("get gacha stats: %w", err)
        }

        // 3. 执行抽卡引擎
        results, err := s.engine.PullBatch(poolCfg, req.Count, stats.SSRPityCounter, stats.SRPityCounter)
        if err != nil {
                return nil, fmt.Errorf("gacha engine error: %w", err)
        }

        // 4. 获取卡牌定义（批量）
        cardIDs := make([]int64, 0, len(results))
        for _, r := range results {
                cardIDs = append(cardIDs, r.CardID)
        }
        cardDefs, err := s.dao.GetCardsByIDs(ctx, cardIDs)
        if err != nil {
                return nil, fmt.Errorf("get card defs: %w", err)
        }

        // 5. 创建玩家卡牌实例 + 记录
        gachaCards := make([]model.GachaCard, 0, len(results))
        gachaRecords := make([]*model.GachaRecord, 0, len(results))
        ssrCount, srCount, rCount, newCount := 0, 0, 0, 0

        for i, result := range results {
                // 检查是否新卡
                existCount, _ := s.dao.CountUserCardByCardID(ctx, userID, result.CardID)
                isNew := existCount == 0

                // 创建卡牌实例
                userCard := &model.UserCard{
                        UserID:     userID,
                        CardID:     result.CardID,
                        Star:       1,
                        Level:      1,
                        ObtainFrom: fmt.Sprintf("pool_%d", req.PoolID),
                }
                userCardID, err := s.dao.CreateUserCard(ctx, userCard)
                if err != nil {
                        return nil, fmt.Errorf("create user card: %w", err)
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
                if isNew {
                        newCount++
                }

                // 构建响应
                cardDef := cardDefs[result.CardID]
                cardName := ""
                if cardDef != nil {
                        cardName = cardDef.Name
                }
                gachaCards = append(gachaCards, model.GachaCard{
                        CardID:     result.CardID,
                        Name:       cardName,
                        Rarity:     result.Rarity,
                        IsNew:      isNew,
                        IsPity:     result.IsPity,
                        IsUp:       result.IsUp,
                        UserCardID: userCardID,
                })

                // 抽卡记录
                gachaRecords = append(gachaRecords, &model.GachaRecord{
                        UserID:    userID,
                        PoolID:    req.PoolID,
                        CardID:    result.CardID,
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

        // 6. 持久化抽卡记录（异步批量写入）
        go func() {
                bgCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
                defer cancel()
                _ = s.dao.BatchCreateGachaRecords(bgCtx, gachaRecords)
        }()

        // 7. 更新保底统计
        stats.TotalPulls += req.Count
        _ = s.dao.UpsertGachaStats(ctx, stats)

        // 8. 缓存保底计数到 Redis
        s.cacheGachaStats(ctx, stats)

        // 9. 清除用户卡牌缓存
        _ = myredis.RDB.Del(ctx, fmt.Sprintf("%s%d", cacheUserCardsPrefix, userID))

        return &model.GachaResponse{
                PullIndex:   stats.TotalPulls,
                Cards:       gachaCards,
                NewCards:    newCount,
                SSRCount:    ssrCount,
                SRCount:     srCount,
                RCount:      rCount,
                SSRPityLeft: poolCfg.PitySSR - stats.SSRPityCounter,
                SRPityLeft:  poolCfg.PitySR - stats.SRPityCounter,
        }, nil
}

// ──────────────────────────────────────
// 用户卡牌
// ──────────────────────────────────────

// GetUserCards 获取用户卡牌列表
func (s *CardService) GetUserCards(ctx context.Context, userID int64, page, pageSize, rarity int) ([]model.UserCard, int64, error) {
        if page <= 0 { page = 1 }
        if pageSize <= 0 { pageSize = 20 }
        return s.dao.GetUserCards(ctx, userID, page, pageSize, rarity)
}

// ToggleLock 切换卡牌锁定状态
func (s *CardService) ToggleLock(ctx context.Context, userID, userCardID int64) error {
        uc, err := s.dao.GetUserCardByID(ctx, userCardID, userID)
        if err != nil {
                return err
        }
        return s.dao.UpdateUserCardLock(ctx, userCardID, userID, !uc.IsLocked)
}

// ──────────────────────────────────────
// 卡池
// ──────────────────────────────────────

// ListPools 获取可用卡池列表
func (s *CardService) ListPools(ctx context.Context) ([]*model.CardPool, error) {
        return s.dao.ListOpenPools(ctx)
}

// GetGachaHistory 获取抽卡历史
func (s *CardService) GetGachaHistory(ctx context.Context, userID int64, limit int) ([]model.GachaRecord, error) {
        if limit <= 0 { limit = 20 }
        return s.dao.GetGachaHistory(ctx, userID, limit)
}

// GetGachaStats 获取保底计数
func (s *CardService) GetGachaStats(ctx context.Context, userID, poolID int64) (*model.UserGachaInfo, error) {
        // 先查 Redis
        info, err := s.getCachedGachaStats(ctx, userID, poolID)
        if err == nil && info != nil {
                return info, nil
        }
        // 查 MySQL
        return s.dao.GetGachaStats(ctx, userID, poolID)
}

// ──────────────────────────────────────
// 内部方法
// ──────────────────────────────────────

func (s *CardService) getPoolConfig(ctx context.Context, poolID int64) (*model.CardPool, *model.PoolConfig, error) {
        // 先查 Redis 缓存
        pool, cfg, err := s.getCachedPool(ctx, poolID)
        if err == nil && pool != nil {
                return pool, cfg, nil
        }

        // 查 MySQL
        pool, err = s.dao.GetPoolByID(ctx, poolID)
        if err != nil {
                if errors.Is(err, dao.ErrPoolNotFound) {
                        return nil, nil, ErrPoolNotFound
                }
                return nil, nil, fmt.Errorf("get pool: %w", err)
        }

        cfg, err = engine.ParsePoolConfig(pool.Config)
        if err != nil {
                return nil, nil, fmt.Errorf("parse pool config: %w", err)
        }

        // 写入缓存
        s.cachePool(ctx, pool, cfg)

        return pool, cfg, nil
}

func (s *CardService) cachePool(ctx context.Context, pool *model.CardPool, cfg *model.PoolConfig) {
        key := fmt.Sprintf("%s%d", cachePoolPrefix, pool.ID)
        cfgJSON, _ := json.Marshal(cfg)
        poolJSON, _ := json.Marshal(pool)

        pipe := myredis.RDB.Pipeline()
        pipe.HSet(ctx, key, "pool", string(poolJSON))
        pipe.HSet(ctx, key, "config", string(cfgJSON))
        pipe.Expire(ctx, key, cachePoolTTL)
        pipe.Exec(ctx)
}

func (s *CardService) getCachedPool(ctx context.Context, poolID int64) (*model.CardPool, *model.PoolConfig, error) {
        key := fmt.Sprintf("%s%d", cachePoolPrefix, poolID)
        poolJSON, err := myredis.RDB.HGet(ctx, key, "pool").Result()
        if err != nil {
                return nil, nil, err
        }

        var pool model.CardPool
        if err := json.Unmarshal([]byte(poolJSON), &pool); err != nil {
                return nil, nil, err
        }

        cfgJSON, _ := myredis.RDB.HGet(ctx, key, "config").Result()
        var cfg model.PoolConfig
        if err := json.Unmarshal([]byte(cfgJSON), &cfg); err != nil {
                return &pool, nil, err
        }

        return &pool, &cfg, nil
}

func (s *CardService) cacheGachaStats(ctx context.Context, info *model.UserGachaInfo) {
        key := fmt.Sprintf("%s%d:%d", cacheGachaStatsPrefix, info.UserID, info.PoolID)
        pipe := myredis.RDB.Pipeline()
        pipe.HSet(ctx, key,
                "user_id", info.UserID,
                "pool_id", info.PoolID,
                "total_pulls", info.TotalPulls,
                "ssr_pity_counter", info.SSRPityCounter,
                "sr_pity_counter", info.SRPityCounter,
        )
        pipe.Expire(ctx, key, cacheGachaStatsTTL)
        pipe.Exec(ctx)
}

func (s *CardService) getCachedGachaStats(ctx context.Context, userID, poolID int64) (*model.UserGachaInfo, error) {
        key := fmt.Sprintf("%s%d:%d", cacheGachaStatsPrefix, userID, poolID)
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

        return &model.UserGachaInfo{
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

// deductDiamonds 调用 user-service 内部 API 扣除钻石
func (s *CardService) deductDiamonds(ctx context.Context, userID, amount int64, poolID int64) error {
        body := map[string]interface{}{
                "user_id": userID,
                "amount":  amount,
                "reason":  fmt.Sprintf("gacha_pool_%d", poolID),
        }
        resp, err := callUserInternal(ctx, "POST", "/internal/user/deduct-diamonds", body)
        if err != nil {
                return err
        }
        code, ok := resp["code"].(float64)
        if !ok || code != 0 {
                return ErrInsufficientDiamonds
        }
        return nil
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

func parseInt(s string) int {
        n := 0
        for _, c := range s {
                if c >= '0' && c <= '9' {
                        n = n*10 + int(c-'0')
                }
        }
        return n
}
