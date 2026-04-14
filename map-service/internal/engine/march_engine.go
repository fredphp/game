package engine

import (
        "context"
        "crypto/rand"
        "database/sql"
        "encoding/hex"
        "encoding/json"
        "fmt"
        "log"
        "sync"
        "time"

        "map-service/internal/dao"
        "map-service/internal/model"

        myredis "map-service/pkg/redis"

        "github.com/redis/go-redis/v9"
)

const (
        // MarchProgressPrefix 行军进度缓存前缀（供 service 层使用）
        MarchProgressPrefix = "map:march:progress:"
        marchProgressTTL    = 30 * time.Second

        // Redis Stream keys
        streamKey     = "map:march:stream"
        consumerGroup = "map-service-consumers"
)

// MarchEngine 行军引擎
// 使用 Redis Stream 实现高并发行军队列处理
type MarchEngine struct {
        dao         *dao.MapDAO
        workerCount int
        tickInterval time.Duration
        maxActivePerUser int
        recallRefundRate float64

        mu       sync.RWMutex
        running  bool
        cancelFn context.CancelFunc
}

// NewMarchEngine 创建行军引擎
func NewMarchEngine(dao *dao.MapDAO, workerCount int, tickIntervalMs int, maxActivePerUser int, recallRefundRate float64) *MarchEngine {
        return &MarchEngine{
                dao:         dao,
                workerCount: workerCount,
                tickInterval: time.Duration(tickIntervalMs) * time.Millisecond,
                maxActivePerUser: maxActivePerUser,
                recallRefundRate: recallRefundRate,
        }
}

// Start 启动行军引擎（后台消费协程）
func (e *MarchEngine) Start() {
        e.mu.Lock()
        if e.running {
                e.mu.Unlock()
                return
        }
        e.running = true
        ctx, cancel := context.WithCancel(context.Background())
        e.cancelFn = cancel
        e.mu.Unlock()

        // 确保 Redis Stream 和 Consumer Group 存在
        e.initStream(ctx)

        log.Printf("🚀 行军引擎启动: %d 个消费者协程, 轮询间隔 %v", e.workerCount, e.tickInterval)

        // 启动消费者协程池
        for i := 0; i < e.workerCount; i++ {
                go e.worker(ctx, i)
        }

        // 启动进度更新协程
        go e.progressUpdater(ctx)

        log.Println("✅ 行军引擎运行中")
}

// Stop 停止行军引擎
func (e *MarchEngine) Stop() {
        e.mu.Lock()
        defer e.mu.Unlock()
        if !e.running {
                return
        }
        e.running = false
        if e.cancelFn != nil {
                e.cancelFn()
        }
        log.Println("⏹ 行军引擎已停止")
}

// ================================================================
// 行军发起
// ================================================================

// InitiateMarch 发起行军
// 1. 验证参数
// 2. 计算路径和到达时间
// 3. 写入数据库
// 4. 推入 Redis Stream
func (e *MarchEngine) InitiateMarch(ctx context.Context, userID, allianceID int64, sourceCityID, targetCityID int64,
        marchType int8, armyPower int) (*model.MarchOrder, error) {

        // 1. 校验活跃行军数
        activeCount, err := e.dao.CountUserActiveMarches(ctx, userID)
        if err != nil {
                return nil, fmt.Errorf("check active marches: %w", err)
        }
        if activeCount >= e.maxActivePerUser {
                return nil, fmt.Errorf("活跃行军数已达上限(%d)", e.maxActivePerUser)
        }

        // 2. 获取出发/目标城池
        sourceCity, err := e.dao.GetCityByID(ctx, sourceCityID)
        if err != nil {
                return nil, fmt.Errorf("source city not found: %w", err)
        }
        targetCity, err := e.dao.GetCityByID(ctx, targetCityID)
        if err != nil {
                return nil, fmt.Errorf("target city not found: %w", err)
        }

        // 3. BFS 计算最短路径
        path, distance, err := e.calculatePath(ctx, sourceCityID, targetCityID)
        if err != nil {
                return nil, fmt.Errorf("calculate path: %w", err)
        }

        // 4. 计算行军时间
        marchSpeed := 10 // 基础速度
        if marchType == model.MarchTypeScout {
                marchSpeed = int(float64(marchSpeed) * 1.5) // 侦查速度快50%
        } else if marchType == model.MarchTypeRetreat {
                marchSpeed = int(float64(marchSpeed) * 0.8) // 撤退速度慢20%
        } else if marchType == model.MarchTypeRelocate {
                marchSpeed = int(float64(marchSpeed) * 0.5) // 迁城速度最慢
        }

        // 行军时间 = 距离 / 速度 (秒)
        marchDurationSecs := int64(float64(distance) / float64(marchSpeed) * 3600)
        if marchDurationSecs < 10 {
                marchDurationSecs = 10 // 最少10秒
        }

        // 5. 计算粮食消耗
        foodCost := armyPower * 2 // 基础消耗
        if marchType == model.MarchTypeReinforce {
                foodCost = armyPower * 1
        } else if marchType == model.MarchTypeRelocate {
                foodCost = armyPower * 5
        }

        arriveTime := time.Now().Add(time.Duration(marchDurationSecs) * time.Second)
        marchID := generateUUID()

        // 6. 构建行军令
        march := &model.MarchOrder{
                MarchID:       marchID,
                UserID:        userID,
                SourceCityID:  sourceCityID,
                TargetCityID:  targetCityID,
                MarchType:     marchType,
                ArmyPower:     armyPower,
                Path:          path,
                TotalDistance: distance,
                MarchSpeed:    marchSpeed,
                Status:        model.MarchStatusMarching,
                ArriveTime:    arriveTime,
                ConsumeFood:   foodCost,
        }
        if allianceID > 0 {
                march.AllianceID.Valid = true
                march.AllianceID.Int64 = allianceID
        }

        // 7. 写入数据库
        _, err = e.dao.CreateMarch(ctx, march)
        if err != nil {
                return nil, fmt.Errorf("create march: %w", err)
        }

        // 8. 推入 Redis Stream（异步触发）
        go e.publishMarchEvent(marchID, arriveTime)

        log.Printf("⚔ 行军发起: %s | %s(%d) → %s(%d) | 距离:%d 速度:%d 到达:%s",
                marchID, sourceCity.Name, sourceCityID, targetCity.Name, targetCityID,
                distance, marchSpeed, arriveTime.Format("15:04:05"))

        return march, nil
}

// RecallMarch 撤回行军
func (e *MarchEngine) RecallMarch(ctx context.Context, userID int64, marchID string) error {
        march, err := e.dao.GetMarchByMarchID(ctx, marchID)
        if err != nil {
                return fmt.Errorf("march not found: %w", err)
        }
        if march.UserID != userID {
                return fmt.Errorf("not your march")
        }
        if march.Status != model.MarchStatusMarching {
                return fmt.Errorf("只能撤回行军中的部队")
        }

        // 进度超过90%不可撤回
        if march.Progress >= 90 {
                return fmt.Errorf("部队即将到达，无法撤回")
        }

        // 按比例返还粮食
        refundFood := int(float64(march.ConsumeFood) * e.recallRefundRate * (1.0 - float64(march.Progress)/100.0))
        _ = refundFood // TODO: 返还用户粮食

        return e.dao.UpdateMarchStatus(ctx, marchID, model.MarchStatusRecalled, nil)
}

// ================================================================
// BFS 最短路径计算
// ================================================================

func (e *MarchEngine) calculatePath(ctx context.Context, from, to int64) ([]int64, int, error) {
        if from == to {
                return []int64{from}, 0, nil
        }

        // 使用带权BFS计算最短路径（权重=城市间距离）
        type queueItem struct {
                cityID   int64
                path     []int64
                distance int
        }

        queue := []queueItem{{cityID: from, path: []int64{from}, distance: 0}}
        visited := map[int64]bool{from: true}

        for len(queue) > 0 {
                current := queue[0]
                queue = queue[1:]

                // 获取当前城池
                city, err := e.dao.GetCityByID(ctx, current.cityID)
                if err != nil {
                        continue
                }

                for _, neighborID := range city.Connections {
                        if visited[neighborID] {
                                continue
                        }
                        visited[neighborID] = true

                        // 计算距离（曼哈顿距离）
                        neighbor, err := e.dao.GetCityByID(ctx, neighborID)
                        if err != nil {
                                continue
                        }
                        dist := abs(city.PosX-neighbor.PosX) + abs(city.PosY-neighbor.PosY)
                        newDist := current.distance + dist
                        newPath := make([]int64, len(current.path)+1)
                        copy(newPath, current.path)
                        newPath[len(current.path)] = neighborID

                        if neighborID == to {
                                return newPath, newDist, nil
                        }

                        queue = append(queue, queueItem{cityID: neighborID, path: newPath, distance: newDist})
                }
        }

        return nil, 0, fmt.Errorf("无法找到从 %d 到 %d 的路径", from, to)
}

func abs(x int) int {
        if x < 0 {
                return -x
        }
        return x
}

// ================================================================
// 行军到达处理（战斗/占领）
// ================================================================

// ProcessArrival 处理行军到达
func (e *MarchEngine) ProcessArrival(ctx context.Context, march *model.MarchOrder) {
        log.Printf("🏁 行军到达: %s → 城池 %d", march.MarchID, march.TargetCityID)

        switch march.MarchType {
        case model.MarchTypeAttack:
                e.handleAttackArrival(ctx, march)
        case model.MarchTypeReinforce:
                e.handleReinforceArrival(ctx, march)
        case model.MarchTypeScout:
                e.handleScoutArrival(ctx, march)
        case model.MarchTypeRelocate:
                e.handleRelocateArrival(ctx, march)
        default:
                _ = e.dao.UpdateMarchStatus(ctx, march.MarchID, model.MarchStatusArrived, nil)
        }
}

// handleAttackArrival 处理进攻到达
func (e *MarchEngine) handleAttackArrival(ctx context.Context, march *model.MarchOrder) {
        // 标记为战斗中
        _ = e.dao.UpdateMarchStatus(ctx, march.MarchID, model.MarchStatusBattle, nil)

        // 获取目标城池占领信息
        occupation, err := e.dao.GetOccupation(ctx, march.TargetCityID)
        if err != nil {
                // 中立城池，直接占领
                e.occupyCity(ctx, march, 0, "")
                return
        }

        // 获取城池防御加成
        city, _ := e.dao.GetCityByID(ctx, march.TargetCityID)
        defenseBonus := 0
        if city != nil {
                defenseBonus = city.DefenseBase
        }

        // 简化战斗：战力对比 + 防御加成 + 随机浮动
        attackerPower := float64(march.ArmyPower)
        defenderPower := float64(occupation.GarrisonPower + defenseBonus)

        // 10%随机浮动
        attackerPower *= 0.95 + randomFloat()*0.1
        defenderPower *= 0.95 + randomFloat()*0.1

        attackerWin := attackerPower > defenderPower

        result := map[string]interface{}{
                "attacker_power": march.ArmyPower,
                "defender_power": occupation.GarrisonPower + defenseBonus,
                "attacker_float": attackerPower,
                "defender_float": defenderPower,
                "winner":         mapAttackerWin(attackerWin),
        }

        resultJSON, _ := json.Marshal(result)

        if attackerWin {
                // 进攻胜利 → 占领城池
                e.occupyCity(ctx, march, occupation.OwnerID, formatOwnerName(occupation.OwnerType, occupation.OwnerID))
                _ = e.dao.UpdateMarchStatus(ctx, march.MarchID, model.MarchStatusArrived, resultJSON)
        } else {
                // 进攻失败
                _ = e.dao.UpdateMarchStatus(ctx, march.MarchID, model.MarchStatusFailed, resultJSON)
        }

        // 记录战斗日志
        battleLog := &model.CityBattleLog{
                CityID:        march.TargetCityID,
                MarchID:       sqlNullString(march.MarchID),
                AttackerID:    march.UserID,
                AttackerName:  fmt.Sprintf("玩家%d", march.UserID),
                DefenderID:    occupation.OwnerID,
                DefenderName:  formatOwnerName(occupation.OwnerType, occupation.OwnerID),
                AttackerPower: march.ArmyPower,
                DefenderPower: occupation.GarrisonPower + defenseBonus,
                AttackerWin:   attackerWin,
                ResultDetail:  resultJSON,
        }
        _ = e.dao.CreateBattleLog(ctx, battleLog)
}

// occupyCity 占领城池
func (e *MarchEngine) occupyCity(ctx context.Context, march *model.MarchOrder, prevOwnerID int64, prevOwnerName string) {
        occupation := &model.CityOccupation{
                CityID:        march.TargetCityID,
                OwnerType:     1, // 玩家
                OwnerID:       march.UserID,
                GarrisonPower: march.ArmyPower / 2, // 留下一半驻军
                DefenseWalls:  100,
        }
        if march.AllianceID.Valid {
                occupation.AllianceID = march.AllianceID
                occupation.OwnerType = 2 // 联盟
        }

        if err := e.dao.UpsertOccupation(ctx, occupation); err != nil {
                log.Printf("❌ 占领城池失败: %v", err)
                return
        }

        log.Printf("🏰 城池占领: 玩家%d 占领城池 %d (原: %s)", march.UserID, march.TargetCityID, prevOwnerName)

        // 更新联盟领土
        if march.AllianceID.Valid {
                go e.refreshAllianceTerritory(context.Background(), march.AllianceID.Int64)
        }

        // 清除城池缓存
        myredis.RDB.Del(ctx, fmt.Sprintf("map:city:info:%d", march.TargetCityID))
}

// handleReinforceArrival 增援到达
func (e *MarchEngine) handleReinforceArrival(ctx context.Context, march *model.MarchOrder) {
        occupation, err := e.dao.GetOccupation(ctx, march.TargetCityID)
        if err != nil {
                // 中立城池，增援变为占领
                e.occupyCity(ctx, march, 0, "中立")
                return
        }

        // 增加驻军
        newGarrison := occupation.GarrisonPower + march.ArmyPower
        if err := e.dao.UpdateGarrison(ctx, march.TargetCityID, newGarrison); err != nil {
                log.Printf("❌ 增援失败: %v", err)
                return
        }

        _ = e.dao.UpdateMarchStatus(ctx, march.MarchID, model.MarchStatusReturned, nil)
        log.Printf("📦 增援到达: 玩家%d 增援城池 %d, 驻军 +%d → %d",
                march.UserID, march.TargetCityID, march.ArmyPower, newGarrison)
}

// handleScoutArrival 侦查到达
func (e *MarchEngine) handleScoutArrival(ctx context.Context, march *model.MarchOrder) {
        city, err := e.dao.GetCityByID(ctx, march.TargetCityID)
        if err != nil {
                _ = e.dao.UpdateMarchStatus(ctx, march.MarchID, model.MarchStatusFailed, nil)
                return
        }

        occupation, _ := e.dao.GetOccupation(ctx, march.TargetCityID)

        scoutResult := map[string]interface{}{
                "city_name":       city.Name,
                "city_level":      city.Level,
                "terrain":         city.Terrain,
                "defense_base":    city.DefenseBase,
                "resource_output": map[string]int{
                        "food": city.FoodOutput,
                        "wood": city.WoodOutput,
                        "iron": city.IronOutput,
                        "gold": city.GoldOutput,
                },
        }

        if occupation != nil {
                scoutResult["owner_type"] = occupation.OwnerType
                scoutResult["owner_id"] = occupation.OwnerID
                scoutResult["garrison_power"] = occupation.GarrisonPower
                scoutResult["defense_walls"] = occupation.DefenseWalls
        } else {
                scoutResult["owner_type"] = 0
                scoutResult["owner_id"] = 0
                scoutResult["garrison_power"] = 0
        }

        resultJSON, _ := json.Marshal(scoutResult)
        _ = e.dao.UpdateMarchStatus(ctx, march.MarchID, model.MarchStatusArrived, resultJSON)
        log.Printf("👁 侦查完成: 玩家%d 侦查城池 %d (%s)", march.UserID, march.TargetCityID, city.Name)
}

// handleRelocateArrival 迁城到达
func (e *MarchEngine) handleRelocateArrival(ctx context.Context, march *model.MarchOrder) {
        e.occupyCity(ctx, march, 0, "迁城")
        log.Printf("🏠 迁城完成: 玩家%d 迁至城池 %d", march.UserID, march.TargetCityID)
}

// ================================================================
// 联盟领土刷新
// ================================================================

func (e *MarchEngine) refreshAllianceTerritory(ctx context.Context, allianceID int64) {
        occupations, err := e.dao.ListOccupationsByOwner(ctx, 2, allianceID)
        if err != nil {
                log.Printf("❌ 刷新联盟领土失败: %v", err)
                return
        }

        // 获取所有城池信息以计算资源
        cityIDs := make([]int64, 0, len(occupations))
        for _, o := range occupations {
                cityIDs = append(cityIDs, o.CityID)
        }

        cities, err := e.dao.BatchGetCities(ctx, cityIDs)
        if err != nil {
                return
        }

        territory := &model.AllianceTerritory{
                AllianceID: allianceID,
                CityCount:  len(occupations),
        }

        for _, o := range occupations {
                city := cities[o.CityID]
                if city != nil {
                        territory.TotalFood += int64(city.FoodOutput)
                        territory.TotalWood += int64(city.WoodOutput)
                        territory.TotalIron += int64(city.IronOutput)
                        territory.TotalGold += int64(city.GoldOutput)
                        if city.IsCapital {
                                territory.CapitalCount++
                        }
                }
        }

        // 计算领土等级
        switch {
        case territory.CityCount >= 36:
                territory.TerritoryLevel = 5
        case territory.CityCount >= 25:
                territory.TerritoryLevel = 4
        case territory.CityCount >= 15:
                territory.TerritoryLevel = 3
        case territory.CityCount >= 8:
                territory.TerritoryLevel = 2
        default:
                territory.TerritoryLevel = 1
        }

        if err := e.dao.UpsertAllianceTerritory(ctx, territory); err != nil {
                log.Printf("❌ 更新联盟领土失败: %v", err)
                return
        }

        // 清除联盟领土缓存
        myredis.RDB.Del(ctx, fmt.Sprintf("map:alliance:territory:%d", allianceID))

        log.Printf("🏛 联盟%d领土更新: %d城 %d州城 等级%d",
                allianceID, territory.CityCount, territory.CapitalCount, territory.TerritoryLevel)
}

// ================================================================
// Redis Stream 消费者协程
// ================================================================

func (e *MarchEngine) initStream(ctx context.Context) {
        // 创建 Consumer Group（忽略已存在错误）
        myredis.RDB.XGroupCreateMkStream(ctx, streamKey, consumerGroup, "$").Err()
}

func (e *MarchEngine) publishMarchEvent(marchID string, arriveTime time.Time) {
        ctx := context.Background()
        event := map[string]interface{}{
                "march_id":    marchID,
                "arrive_time": arriveTime.Unix(),
                "event":       "march_created",
        }
        payload, _ := json.Marshal(event)

        // 推入 Redis Stream，设置到达时间为消息ID排序参考
        _, err := myredis.RDB.XAdd(ctx, &redis.XAddArgs{
                Stream: streamKey,
                Values: map[string]interface{}{
                        "march_id":    marchID,
                        "arrive_time": fmt.Sprintf("%d", arriveTime.Unix()),
                        "payload":     string(payload),
                },
        }).Result()
        if err != nil {
                log.Printf("❌ 发布行军事件失败: %v", err)
        }
}

// worker 消费者工作协程
func (e *MarchEngine) worker(ctx context.Context, workerID int) {
        consumerName := fmt.Sprintf("worker-%d", workerID)

        for {
                select {
                case <-ctx.Done():
                        return
                default:
                }

                // 1. 检查已到达的行军（从数据库查询）
                arrived, err := e.dao.ListArrivedMarches(ctx, 50)
                if err != nil {
                        log.Printf("worker-%d: 查询到达行军失败: %v", workerID, err)
                        time.Sleep(e.tickInterval)
                        continue
                }

                // 2. 并发处理到达的行军
                if len(arrived) > 0 {
                        log.Printf("worker-%d: 处理 %d 个到达行军", workerID, len(arrived))
                }

                var wg sync.WaitGroup
                for _, march := range arrived {
                        wg.Add(1)
                        go func(m *model.MarchOrder) {
                                defer wg.Done()
                                processCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
                                defer cancel()
                                e.ProcessArrival(processCtx, m)
                        }(march)
                }
                wg.Wait()

                // 3. 从 Redis Stream 消费新事件
                streams, err := myredis.RDB.XReadGroup(ctx, &redis.XReadGroupArgs{
                        Group:    consumerGroup,
                        Consumer: consumerName,
                        Streams:  []string{streamKey, ">"},
                        Count:    10,
                        Block:    time.Duration(e.tickInterval) * time.Second,
                }).Result()

                if err != nil && err != redis.Nil {
                        // Stream 消费错误不影响主流程
                        continue
                }

                for _, stream := range streams {
                        for _, message := range stream.Messages {
                                marchID := message.Values["march_id"].(string)
                                arriveTimeStr := message.Values["arrive_time"].(string)
                                arriveTimeUnix := parseInt64(arriveTimeStr)
                                arriveTime := time.Unix(arriveTimeUnix, 0)

                                // 检查是否到达
                                if time.Now().Before(arriveTime) {
                                        continue
                                }

                                // 处理到达
                                march, err := e.dao.GetMarchByMarchID(ctx, marchID)
                                if err != nil {
                                        // ACK 消息
                                        myredis.RDB.XAck(ctx, streamKey, consumerGroup, message.ID)
                                        continue
                                }

                                if march.Status == model.MarchStatusMarching {
                                        e.ProcessArrival(ctx, march)
                                }

                                // ACK 消息
                                myredis.RDB.XAck(ctx, streamKey, consumerGroup, message.ID)
                        }
                }
        }
}

// progressUpdater 进度更新协程
func (e *MarchEngine) progressUpdater(ctx context.Context) {
        ticker := time.NewTicker(e.tickInterval)
        defer ticker.Stop()

        for {
                select {
                case <-ctx.Done():
                        return
                case <-ticker.C:
                        e.updateAllMarchProgress(ctx)
                }
        }
}

func (e *MarchEngine) updateAllMarchProgress(ctx context.Context) {
        marches, err := e.dao.ListActiveMarches(ctx)
        if err != nil {
                return
        }

        now := time.Now()
        for _, march := range marches {
                if march.Status != model.MarchStatusMarching {
                        continue
                }

                // 计算进度
                totalDuration := march.ArriveTime.Sub(march.StartTime).Seconds()
                elapsed := now.Sub(march.StartTime).Seconds()
                if totalDuration <= 0 {
                        continue
                }

                progress := int(elapsed / totalDuration * 100)
                if progress > 100 {
                        progress = 100
                }

                // 更新数据库（每10%更新一次减少写入）
                if progress != march.Progress && progress%10 == 0 {
                        _ = e.dao.UpdateMarchProgress(ctx, march.MarchID, progress)
                }

                // 写入 Redis 缓存（实时读取用）
                remainSecs := int64(march.ArriveTime.Sub(now).Seconds())
                if remainSecs < 0 {
                        remainSecs = 0
                }

                progressData := map[string]interface{}{
                        "march_id":    march.MarchID,
                        "progress":    progress,
                        "remain_secs": remainSecs,
                }
                dataJSON, _ := json.Marshal(progressData)
                key := fmt.Sprintf("%s%s", MarchProgressPrefix, march.MarchID)
                myredis.RDB.Set(ctx, key, string(dataJSON), marchProgressTTL)
        }
}

// ================================================================
// 辅助函数
// ================================================================

func randomFloat() float64 {
        // 简单伪随机（生产环境用 crypto/rand）
        return float64(time.Now().UnixNano()%10000) / 10000.0
}

func generateUUID() string {
        b := make([]byte, 16)
        _, _ = rand.Read(b)
        b[6] = (b[6] & 0x0f) | 0x40 // Version 4
        b[8] = (b[8] & 0x3f) | 0x80 // Variant 10
        return hex.EncodeToString(b[0:4]) + "-" +
                hex.EncodeToString(b[4:6]) + "-" +
                hex.EncodeToString(b[6:8]) + "-" +
                hex.EncodeToString(b[8:10]) + "-" +
                hex.EncodeToString(b[10:16])
}

func mapAttackerWin(win bool) string {
        if win {
                return "attacker"
        }
        return "defender"
}

func formatOwnerName(ownerType int8, ownerID int64) string {
        switch ownerType {
        case 0:
                return "中立"
        case 1:
                return fmt.Sprintf("玩家%d", ownerID)
        case 2:
                return fmt.Sprintf("联盟%d", ownerID)
        default:
                return "未知"
        }
}

func sqlNullString(s string) sql.NullString {
        return sql.NullString{String: s, Valid: s != ""}
}

func parseInt64(s string) int64 {
        n := int64(0)
        for _, c := range s {
                if c >= '0' && c <= '9' {
                        n = n*10 + int64(c-'0')
                }
        }
        return n
}

// ensure imports
var _ = json.Marshal
