package engine

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"os"
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

	// Redis Sorted Set keys (优先队列)
	marchQueueKey      = "map:march:queue"       // Sorted Set: priority queue, score=arrive_time.UnixNano
	marchCheckpointKey = "map:march:checkpoint:"  // String: heartbeat key per march

	marchCheckpointTTL = 30 * time.Second // 检查点心跳TTL
	lockExpireDefault  = 30               // 城池占领锁默认超时秒数
	recoveryInterval   = 30 * time.Second // 断线恢复检查间隔
)

// MarchEngine 行军引擎
// 使用 Redis Sorted Set 实现优先级队列 + 检查点心跳 + 断线恢复 + 城池占领锁
type MarchEngine struct {
	dao              *dao.MapDAO
	workerCount      int
	tickInterval     time.Duration
	maxActivePerUser int
	recallRefundRate float64
	lockTTLSeconds   int
	heartbeatTTL     int
	recoveryInterval time.Duration

	mu       sync.RWMutex
	running  bool
	cancelFn context.CancelFunc
	wg       sync.WaitGroup
	workerID string
}

// NewMarchEngine 创建行军引擎
func NewMarchEngine(dao *dao.MapDAO, workerCount int, tickIntervalMs int, maxActivePerUser int, recallRefundRate float64) *MarchEngine {
	hostname, _ := os.Hostname()
	pid := os.Getpid()
	return &MarchEngine{
		dao:              dao,
		workerCount:      workerCount,
		tickInterval:     time.Duration(tickIntervalMs) * time.Millisecond,
		maxActivePerUser: maxActivePerUser,
		recallRefundRate: recallRefundRate,
		lockTTLSeconds:   lockExpireDefault,
		heartbeatTTL:     int(marchCheckpointTTL.Seconds()),
		recoveryInterval: recoveryInterval,
		workerID:         fmt.Sprintf("%s-p%d", hostname, pid),
	}
}

// SetLockTTL 设置城池占领锁TTL
func (e *MarchEngine) SetLockTTL(seconds int) {
	if seconds > 0 {
		e.lockTTLSeconds = seconds
	}
}

// SetHeartbeatTTL 设置心跳TTL
func (e *MarchEngine) SetHeartbeatTTL(seconds int) {
	if seconds > 0 {
		e.heartbeatTTL = seconds
	}
}

// SetRecoveryInterval 设置恢复检查间隔
func (e *MarchEngine) SetRecoveryInterval(seconds int) {
	if seconds > 0 {
		e.recoveryInterval = time.Duration(seconds) * time.Second
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

	log.Printf("🚀 行军引擎启动: %d 个消费者协程, 轮询间隔 %v, 实例ID: %s",
		e.workerCount, e.tickInterval, e.workerID)

	// 启动消费者协程池（使用 ZPOPMIN 原子消费）
	for i := 0; i < e.workerCount; i++ {
		e.wg.Add(1)
		go e.worker(ctx, i)
	}

	// 启动进度更新 + 心跳协程
	e.wg.Add(1)
	go e.progressUpdater(ctx)

	// 启动断线恢复协程
	e.wg.Add(1)
	go e.recoveryWorker(ctx)

	// 启动过期锁清理协程
	e.wg.Add(1)
	go e.lockCleanupWorker(ctx)

	log.Println("✅ 行军引擎运行中")
}

// Stop 停止行军引擎（优雅关闭）
func (e *MarchEngine) Stop() {
	e.mu.Lock()
	defer e.mu.Unlock()
	if !e.running {
		return
	}
	e.running = false

	log.Println("⏳ 行军引擎正在优雅关闭...")

	if e.cancelFn != nil {
		e.cancelFn()
	}

	// 等待所有协程退出，最多30秒
	done := make(chan struct{})
	go func() {
		e.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		log.Println("✅ 行军引擎已优雅停止，所有协程退出")
	case <-time.After(30 * time.Second):
		log.Println("⚠ 行军引擎关闭超时，强制退出")
	}
}

// ================================================================
// 行军发起
// ================================================================

// InitiateMarch 发起行军
// 1. 验证参数
// 2. 计算路径和到达时间
// 3. 写入数据库
// 4. 推入 Redis Sorted Set + 创建检查点
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

	// 8. 推入 Redis Sorted Set（异步）
	go e.enqueueMarch(marchID, arriveTime)

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

	// 从 Redis Sorted Set 移除
	go func() {
		bgCtx := context.Background()
		myredis.RDB.ZRem(bgCtx, marchQueueKey, marchID)
		// 清理检查点
		myredis.RDB.Del(bgCtx, marchCheckpointKey+marchID)
	}()

	return e.dao.UpdateMarchStatus(ctx, marchID, model.MarchStatusRecalled, nil)
}

// ================================================================
// Redis Sorted Set 优先队列
// ================================================================

// enqueueMarch 将行军推入优先队列
func (e *MarchEngine) enqueueMarch(marchID string, arriveTime time.Time) {
	ctx := context.Background()
	score := float64(arriveTime.UnixNano())
	_, err := myredis.RDB.ZAdd(ctx, marchQueueKey, redis.Z{
		Score:  score,
		Member: marchID,
	}).Result()
	if err != nil {
		log.Printf("❌ 推入优先队列失败: march_id=%s, err=%v", marchID, err)
		return
	}
	log.Printf("📤 行军入队: %s, score=%d, 预计到达=%s", marchID, int64(score), arriveTime.Format("15:04:05"))
}

// worker 消费者工作协程（使用 ZPOPMIN 原子消费）
func (e *MarchEngine) worker(ctx context.Context, workerID int) {
	defer e.wg.Done()
	workerName := fmt.Sprintf("%s-w%d", e.workerID, workerID)
	log.Printf("👷 消费者协程启动: %s", workerName)

	for {
		select {
		case <-ctx.Done():
			log.Printf("👷 消费者协程退出: %s", workerName)
			return
		default:
		}

		// ZPOPMIN 从 Sorted Set 中原子弹出一个最早到期的行军（阻塞等待1秒）
		result, err := myredis.RDB.ZPopMin(ctx, marchQueueKey, 1).Result()
		if err != nil && err != redis.Nil {
			log.Printf("worker-%s: ZPOPMIN失败: %v", workerName, err)
			time.Sleep(e.tickInterval)
			continue
		}

		if len(result) == 0 {
			// 队列为空，短暂等待
			time.Sleep(e.tickInterval)
			continue
		}

		marchID := result[0].Member.(string)
		scoreArriveTime := time.Unix(0, int64(result[0].Score))

		// 检查是否到达时间
		if time.Now().Before(scoreArriveTime) {
			// 还没到时间，重新推入队列
			go e.enqueueMarch(marchID, scoreArriveTime)
			time.Sleep(500 * time.Millisecond)
			continue
		}

		// 从数据库获取行军详情
		march, err := e.dao.GetMarchByMarchID(ctx, marchID)
		if err != nil {
			log.Printf("worker-%s: 行军不存在 %s, 从队列移除", workerName, marchID)
			continue
		}

		// 如果行军状态不是"行军中"，跳过
		if march.Status != model.MarchStatusMarching {
			log.Printf("worker-%s: 行军 %s 状态=%d, 跳过", workerName, marchID, march.Status)
			continue
		}

		// CAS 方式获取处理权：将状态从 Marching(1) 更新为 Battle(3)
		if !e.acquireProcessing(ctx, marchID) {
			log.Printf("worker-%s: 行军 %s 已被其他worker处理, 跳过", workerName, marchID)
			continue
		}

		log.Printf("worker-%s: 开始处理行军 %s → 城池 %d", workerName, marchID, march.TargetCityID)

		// 执行到达处理
		success := true
		func() {
			processCtx, cancel := context.WithTimeout(ctx, 15*time.Second)
			defer cancel()
			e.ProcessArrival(processCtx, march)
		}()

		// 释放处理权
		e.releaseProcessing(ctx, marchID, success)

		log.Printf("worker-%s: 行军 %s 处理完成", workerName, marchID)
	}
}

// acquireProcessing CAS方式获取处理权 + 创建/验证检查点
func (e *MarchEngine) acquireProcessing(ctx context.Context, marchID string) bool {
	// 1. CAS 更新行军状态 Marching(1) → Battle(3)
	updated, err := e.dao.UpdateMarchStatusCAS(ctx, marchID, model.MarchStatusMarching, model.MarchStatusBattle)
	if err != nil {
		log.Printf("❌ CAS更新行军状态失败: %s, err=%v", marchID, err)
		return false
	}
	if !updated {
		return false // 另一个worker已经获取
	}

	// 2. 创建/更新检查点
	checkpoint := &model.MarchCheckpoint{
		MarchID:  marchID,
		WorkerID: e.workerID,
		Progress: 100,
		Status:   model.CheckpointProcessing,
	}
	if err := e.dao.CreateCheckpoint(ctx, checkpoint); err != nil {
		log.Printf("❌ 创建检查点失败: %s, err=%v", marchID, err)
		// 不回退CAS，继续处理
	}

	// 3. 设置 Redis 心跳 key
	myredis.RDB.Set(ctx, marchCheckpointKey+marchID, e.workerID,
		time.Duration(e.heartbeatTTL)*time.Second)

	return true
}

// releaseProcessing 释放处理权，标记检查点完成
func (e *MarchEngine) releaseProcessing(ctx context.Context, marchID string, success bool) {
	// 标记检查点为已完成
	if err := e.dao.MarkCheckpointCompleted(ctx, marchID); err != nil {
		log.Printf("❌ 标记检查点完成失败: %s, err=%v", marchID, err)
	}

	// 删除 Redis 心跳 key
	myredis.RDB.Del(ctx, marchCheckpointKey+marchID)

	// 从队列中清除（可能已经不在队列中了）
	myredis.RDB.ZRem(ctx, marchQueueKey, marchID)
}

// heartbeat 更新所有活跃检查点的心跳
func (e *MarchEngine) heartbeat(ctx context.Context) {
	// 获取所有处理中的检查点
	processing, _, _, err := e.dao.CountCheckpointsByStatus(ctx)
	if err != nil {
		return
	}
	if processing == 0 {
		return
	}

	// 更新 Redis 心跳 key（自动续期）
	// 这里通过 ZPOPMIN 的原子性来保证不会有重复处理，
	// 心跳主要用于断线恢复检测
}

// ================================================================
// 断线恢复 (Disconnect Recovery)
// ================================================================

// recoveryWorker 断线恢复协程
func (e *MarchEngine) recoveryWorker(ctx context.Context) {
	defer e.wg.Done()
	log.Printf("🔄 断线恢复协程启动, 间隔: %v", e.recoveryInterval)

	ticker := time.NewTicker(e.recoveryInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("🔄 断线恢复协程退出")
			return
		case <-ticker.C:
			e.runRecovery(ctx)
		}
	}
}

// runRecovery 执行一次恢复检查
func (e *MarchEngine) runRecovery(ctx context.Context) {
	recovered := 0

	// 1. 查找中断的检查点（状态=3，心跳超过30秒）
	interrupted, err := e.dao.ListInterruptedCheckpoints(ctx, 100)
	if err != nil {
		log.Printf("❌ 查询中断检查点失败: %v", err)
	} else {
		for _, cp := range interrupted {
			// 获取行军记录
			march, err := e.dao.GetMarchByMarchID(ctx, cp.MarchID)
			if err != nil {
				// 行军已不存在，清理检查点
				e.dao.MarkCheckpointCompleted(ctx, cp.MarchID)
				continue
			}

			// 如果行军仍然在战斗状态，重新入队
			if march.Status == model.MarchStatusBattle || march.Status == model.MarchStatusMarching {
				// 重置为行军中
				e.dao.UpdateMarchStatusCAS(ctx, cp.MarchID, model.MarchStatusBattle, model.MarchStatusMarching)
				// 重新推入队列
				e.enqueueMarch(cp.MarchID, march.ArriveTime)
				// 清除旧检查点
				e.dao.MarkCheckpointCompleted(ctx, cp.MarchID)
				recovered++
				log.Printf("🔄 恢复中断行军: %s (原worker: %s)", cp.MarchID, cp.WorkerID)
			}
		}
	}

	// 2. 查找卡住的行军（状态=行军中，已到达时间，无活跃检查点）
	stuckMarches, err := e.dao.ListStuckMarches(ctx, 5, 100)
	if err != nil {
		log.Printf("❌ 查询卡住行军失败: %v", err)
	} else {
		for _, m := range stuckMarches {
			// 重新入队
			e.enqueueMarch(m.MarchID, m.ArriveTime)
			recovered++
			log.Printf("🔄 恢复卡住行军: %s → 城池 %d (用户:%d)", m.MarchID, m.TargetCityID, m.UserID)
		}
	}

	if recovered > 0 {
		log.Printf("🔄 本轮恢复 %d 个行军", recovered)
	}

	// 3. 清理过期检查点
	cleaned, err := e.dao.CleanupCompletedCheckpoints(ctx, time.Now().Add(-1*time.Hour))
	if err == nil && cleaned > 0 {
		log.Printf("🧹 清理 %d 个过期检查点", cleaned)
	}
}

// RecoverAllMarches 启动时恢复所有中断行军（一次性调用）
func (e *MarchEngine) RecoverAllMarches(ctx context.Context) (int, error) {
	recovered := 0

	// 1. 恢复中断的检查点
	interrupted, err := e.dao.ListInterruptedCheckpoints(ctx, 1000)
	if err != nil {
		log.Printf("❌ 启动恢复-查询中断检查点失败: %v", err)
	} else {
		for _, cp := range interrupted {
			march, err := e.dao.GetMarchByMarchID(ctx, cp.MarchID)
			if err != nil {
				e.dao.MarkCheckpointCompleted(ctx, cp.MarchID)
				continue
			}
			if march.Status == model.MarchStatusBattle || march.Status == model.MarchStatusMarching {
				e.dao.UpdateMarchStatusCAS(ctx, cp.MarchID, model.MarchStatusBattle, model.MarchStatusMarching)
				e.enqueueMarch(cp.MarchID, march.ArriveTime)
				e.dao.MarkCheckpointCompleted(ctx, cp.MarchID)
				recovered++
				log.Printf("🔄 启动恢复: 中断行军 %s (原worker: %s)", cp.MarchID, cp.WorkerID)
			}
		}
	}

	// 2. 恢复卡住的行军
	stuckMarches, err := e.dao.ListStuckMarches(ctx, 5, 1000)
	if err != nil {
		log.Printf("❌ 启动恢复-查询卡住行军失败: %v", err)
	} else {
		for _, m := range stuckMarches {
			e.enqueueMarch(m.MarchID, m.ArriveTime)
			recovered++
			log.Printf("🔄 启动恢复: 卡住行军 %s → 城池 %d", m.MarchID, m.TargetCityID)
		}
	}

	// 3. 清理旧的已完成检查点
	cleaned, _ := e.dao.CleanupCompletedCheckpoints(ctx, time.Now().Add(-1*time.Hour))
	if cleaned > 0 {
		log.Printf("🧹 启动清理: %d 个过期检查点", cleaned)
	}

	return recovered, nil
}

// ================================================================
// 过期锁清理
// ================================================================

// lockCleanupWorker 过期锁清理协程
func (e *MarchEngine) lockCleanupWorker(ctx context.Context) {
	defer e.wg.Done()
	log.Println("🔓 过期锁清理协程启动, 间隔: 60s")

	ticker := time.NewTicker(60 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Println("🔓 过期锁清理协程退出")
			return
		case <-ticker.C:
			e.cleanupExpiredLocks(ctx)
		}
	}
}

// cleanupExpiredLocks 清理过期锁
func (e *MarchEngine) cleanupExpiredLocks(ctx context.Context) (int, error) {
	expiredLocks, err := e.dao.ListExpiredLocks(ctx, 100)
	if err != nil {
		return 0, err
	}

	cleaned := 0
	for _, lock := range expiredLocks {
		if err := e.dao.ForceReleaseLock(ctx, lock.ID); err != nil {
			log.Printf("❌ 强制释放锁失败: lock_id=%d, city_id=%d, err=%v", lock.ID, lock.CityID, err)
			continue
		}
		cleaned++
		log.Printf("🔓 清理过期锁: city_id=%d, march_id=%s", lock.CityID, lock.MarchID)
	}

	return cleaned, nil
}

// ================================================================
// 城池占领锁 (Prevent Duplicate Occupation)
// ================================================================

// lockCity 获取城池占领锁
func (e *MarchEngine) lockCity(ctx context.Context, march *model.MarchOrder) bool {
	// 获取当前占领状态作为快照
	var ownerBefore json.RawMessage
	occupation, err := e.dao.GetOccupation(ctx, march.TargetCityID)
	if err == nil && occupation != nil {
		snapshot := map[string]interface{}{
			"owner_type":     occupation.OwnerType,
			"owner_id":       occupation.OwnerID,
			"garrison_power": occupation.GarrisonPower,
		}
		ownerBefore, _ = json.Marshal(snapshot)
	}

	acquired, err := e.dao.TryAcquireCityLock(ctx, march.TargetCityID, march.MarchID, e.lockTTLSeconds, ownerBefore)
	if err != nil {
		log.Printf("❌ 获取城池锁失败: city_id=%d, err=%v", march.TargetCityID, err)
		return false
	}

	if !acquired {
		log.Printf("🔒 城池锁已被占用: city_id=%d, 跳过 march=%s", march.TargetCityID, march.MarchID)
		return false
	}

	log.Printf("🔓 获取城池锁成功: city_id=%d, march=%s", march.TargetCityID, march.MarchID)
	return true
}

// unlockCity 释放城池占领锁
func (e *MarchEngine) unlockCity(ctx context.Context, march *model.MarchOrder, success bool) {
	if err := e.dao.ReleaseCityLock(ctx, march.TargetCityID, march.MarchID, success); err != nil {
		log.Printf("❌ 释放城池锁失败: city_id=%d, err=%v", march.TargetCityID, err)
	}
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

// handleAttackArrival 处理进攻到达（带城池锁）
func (e *MarchEngine) handleAttackArrival(ctx context.Context, march *model.MarchOrder) {
	// 尝试获取城池占领锁
	if !e.lockCity(ctx, march) {
		log.Printf("🔒 城池 %d 已被其他worker锁定, 跳过行军 %s", march.TargetCityID, march.MarchID)
		// 标记为失败，让恢复机制重新处理
		_ = e.dao.UpdateMarchStatus(ctx, march.MarchID, model.MarchStatusArrived, nil)
		return
	}

	// 确保最终释放锁
	defer func() {
		// 检查是否胜利来判断是否commit锁
		m, _ := e.dao.GetMarchByMarchID(ctx, march.MarchID)
		if m != nil {
			success := m.Status == model.MarchStatusArrived
			e.unlockCity(ctx, march, success)
		} else {
			e.unlockCity(ctx, march, false)
		}
	}()

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
// 进度更新 + 心跳
// ================================================================

// progressUpdater 进度更新 + 心跳协程
func (e *MarchEngine) progressUpdater(ctx context.Context) {
	defer e.wg.Done()

	ticker := time.NewTicker(e.tickInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			e.updateAllMarchProgress(ctx)
			e.heartbeat(ctx)
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
// 引擎统计
// ================================================================

// GetEngineStats 获取引擎统计信息
func (e *MarchEngine) GetEngineStats(ctx context.Context) (*model.EngineStats, error) {
	stats := &model.EngineStats{}

	// 活跃行军数
	activeMarches, err := e.dao.ListActiveMarches(ctx)
	if err != nil {
		return nil, fmt.Errorf("获取活跃行军失败: %w", err)
	}
	stats.ActiveMarches = len(activeMarches)

	// 检查点统计
	processing, completed, interrupted, err := e.dao.CountCheckpointsByStatus(ctx)
	if err == nil {
		stats.CheckpointCount = processing + completed
		stats.InterruptedCount = interrupted
	}

	// 锁统计
	locked, committed, released, expired, err := e.dao.CountLocksByStatus(ctx)
	if err == nil {
		stats.LockCount = locked + committed + released
		stats.ExpiredLockCount = expired
	}

	return stats, nil
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
