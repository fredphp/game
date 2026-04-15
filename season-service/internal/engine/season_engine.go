package engine

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	pkgmysql "season-service/pkg/mysql"
	myredis "season-service/pkg/redis"

	"github.com/spf13/viper"
)

// activeSeason 活跃赛季快照
type activeSeason struct {
	ID        int64
	SeasonNum int
	ServerID  int64
	Name      string
	Status    int8
	StartTime time.Time
	EndTime   time.Time
}

// SeasonEngine 赛季定时引擎（后台 goroutine 轮询）
type SeasonEngine struct {
	checkInterval   time.Duration
	prepareHours    time.Duration
	mapServiceURL   string
	guildServiceURL string
	userServiceURL  string
	stopCh          chan struct{}
	wg              sync.WaitGroup
	mu              sync.Mutex
	isSettling      bool
}

// NewSeasonEngine 创建赛季引擎
func NewSeasonEngine(conf *viper.Viper) *SeasonEngine {
	intervalSec := conf.GetInt("season.check_interval")
	if intervalSec <= 0 {
		intervalSec = 60
	}
	prepareHr := conf.GetInt("season.prepare_hours")
	if prepareHr <= 0 {
		prepareHr = 24
	}

	return &SeasonEngine{
		checkInterval:   time.Duration(intervalSec) * time.Second,
		prepareHours:    time.Duration(prepareHr) * time.Hour,
		mapServiceURL:   "http://127.0.0.1:9005",
		guildServiceURL: "http://127.0.0.1:9004",
		userServiceURL:  "http://127.0.0.1:9001",
		stopCh:          make(chan struct{}),
	}
}

// Start 启动赛季引擎后台任务
func (e *SeasonEngine) Start() {
	e.wg.Add(1)
	go e.seasonTicker()
	log.Println("[SeasonEngine] ✅ 赛季定时引擎已启动")
}

// Stop 停止赛季引擎
func (e *SeasonEngine) Stop() {
	close(e.stopCh)
	e.wg.Wait()
	log.Println("[SeasonEngine] ⏹ 赛季定时引擎已停止")
}

// seasonTicker 赛季主循环
func (e *SeasonEngine) seasonTicker() {
	defer e.wg.Done()

	ticker := time.NewTicker(e.checkInterval)
	defer ticker.Stop()

	// 启动后立即执行一次检查
	e.checkAllSeasons()

	for {
		select {
		case <-e.stopCh:
			return
		case <-ticker.C:
			e.checkAllSeasons()
		}
	}
}

// checkAllSeasons 检查所有需要处理的赛季
func (e *SeasonEngine) checkAllSeasons() {
	ctx := context.Background()

	rows, err := pkgmysql.DB.QueryContext(ctx,
		`SELECT id, season_num, server_id, name, status, start_time, end_time
		 FROM seasons WHERE status IN (1, 2, 3) ORDER BY end_time ASC`)
	if err != nil {
		log.Printf("[SeasonEngine] ❌ 查询活跃赛季失败: %v", err)
		return
	}
	defer rows.Close()

	var seasons []activeSeason
	for rows.Next() {
		var s activeSeason
		if err := rows.Scan(&s.ID, &s.SeasonNum, &s.ServerID, &s.Name, &s.Status, &s.StartTime, &s.EndTime); err != nil {
			log.Printf("[SeasonEngine] ❌ 扫描赛季行失败: %v", err)
			continue
		}
		seasons = append(seasons, s)
	}

	now := time.Now()

	for _, s := range seasons {
		remain := time.Until(s.EndTime)

		switch s.Status {
		case 1: // Active → Ending（提前预警）
			if remain <= e.prepareHours && remain > 0 {
				log.Printf("[SeasonEngine] ⏰ 赛季 S%d(%s) 即将结束，剩余 %s，切换为 Ending 状态",
					s.ID, s.Name, remain.Round(time.Minute))
				e.transitionToEnding(ctx, s.ID)
			} else if remain <= 0 {
				log.Printf("[SeasonEngine] 🔄 赛季 S%d(%s) 已到期，开始结算",
					s.ID, s.Name)
				e.beginSettlement(ctx, s)
			}

		case 2: // Ending → Settling
			if remain <= 0 {
				log.Printf("[SeasonEngine] 🔄 赛季 S%d(%s) 结束，开始结算",
					s.ID, s.Name)
				e.beginSettlement(ctx, s)
			}

		case 3: // Settling（如果卡住了，尝试恢复）
			if e.shouldRetrySettlement(ctx, s.ID) {
				log.Printf("[SeasonEngine] 🔁 赛季 S%d 结算超时，重新尝试", s.ID)
				e.runFullSettlement(ctx, s)
			}
		}
	}
}

// transitionToEnding 切换赛季为即将结束状态
func (e *SeasonEngine) transitionToEnding(ctx context.Context, seasonID int64) {
	_, err := pkgmysql.DB.ExecContext(ctx,
		`UPDATE seasons SET status = 2, updated_at = NOW() WHERE id = ? AND status = 1`, seasonID)
	if err != nil {
		log.Printf("[SeasonEngine] ❌ 切换赛季 %d 状态失败: %v", seasonID, err)
		return
	}

	// 发布赛季即将结束通知（Redis pub/sub）
	msg := fmt.Sprintf(`{"type":"season_ending","season_id":%d,"time":"%s"}`, seasonID, time.Now().Format(time.RFC3339))
	_ = myredis.RDB.Publish(ctx, "season:notifications", msg).Err()
}

// beginSettlement 开始结算（Active/Ending → Settling）
func (e *SeasonEngine) beginSettlement(ctx context.Context, s activeSeason) {
	// CAS: 只从 Active(1) 或 Ending(2) 转为 Settling(3)
	result, err := pkgmysql.DB.ExecContext(ctx,
		`UPDATE seasons SET status = 3, updated_at = NOW() WHERE id = ? AND status IN (1, 2)`, s.ID)
	if err != nil {
		log.Printf("[SeasonEngine] ❌ 赛季 %d 开始结算失败: %v", s.ID, err)
		return
	}
	affected, _ := result.RowsAffected()
	if affected == 0 {
		return // 已被其他进程处理
	}

	log.Printf("[SeasonEngine] 📋 赛季 S%d(%s) 进入结算状态", s.ID, s.Name)

	// 异步执行完整结算流程
	go func() {
		e.mu.Lock()
		if e.isSettling {
			e.mu.Unlock()
			log.Printf("[SeasonEngine] ⏳ 已有结算任务在执行中，跳过赛季 %d", s.ID)
			return
		}
		e.isSettling = true
		e.mu.Unlock()

		defer func() {
			e.mu.Lock()
			e.isSettling = false
			e.mu.Unlock()
		}()

		e.runFullSettlement(context.Background(), s)
	}()
}

// runFullSettlement 执行完整的赛季结算流程
func (e *SeasonEngine) runFullSettlement(ctx context.Context, s activeSeason) {
	log.Printf("[SeasonEngine] 🚀 开始赛季 S%d 完整结算流程", s.ID)

	settleResult := make(map[string]interface{})
	totalStart := time.Now()

	// ─── Phase 1: 计算排名 ───
	phaseStart := time.Now()
	log.Printf("[SeasonEngine] 📊 Phase 1/5: 计算赛季排名...")
	playerCount, guildCount := e.calculateRankings(ctx, s.ID, s.ServerID)
	settleResult["phase1_ranking_duration_ms"] = time.Since(phaseStart).Milliseconds()
	settleResult["player_count"] = playerCount
	settleResult["guild_count"] = guildCount
	log.Printf("[SeasonEngine] ✅ Phase 1 完成: %d 玩家, %d 联盟", playerCount, guildCount)

	// ─── Phase 2: 发放赛季奖励 ───
	phaseStart = time.Now()
	log.Printf("[SeasonEngine] 🎁 Phase 2/5: 发放赛季奖励...")
	rewardCount := e.distributeRewards(ctx, s.ID, s.SeasonNum)
	settleResult["phase2_reward_duration_ms"] = time.Since(phaseStart).Milliseconds()
	settleResult["reward_count"] = rewardCount
	log.Printf("[SeasonEngine] ✅ Phase 2 完成: %d 奖励已发放", rewardCount)

	// ─── Phase 3: 重置地图（城池归属清空） ───
	phaseStart = time.Now()
	log.Printf("[SeasonEngine] 🗺 Phase 3/5: 重置地图（清空城池归属）...")
	cityResetCount := e.resetMap(ctx, s.ID, s.ServerID, s.SeasonNum)
	settleResult["phase3_map_reset_duration_ms"] = time.Since(phaseStart).Milliseconds()
	settleResult["city_reset_count"] = cityResetCount
	log.Printf("[SeasonEngine] ✅ Phase 3 完成: %d 城池已重置", cityResetCount)

	// ─── Phase 4: 联盟重组 ───
	phaseStart = time.Now()
	log.Printf("[SeasonEngine] 🏛 Phase 4/5: 联盟重组...")
	guildResetCount := e.resetGuilds(ctx, s.ID, s.ServerID, s.SeasonNum)
	settleResult["phase4_guild_reset_duration_ms"] = time.Since(phaseStart).Milliseconds()
	settleResult["guild_reset_count"] = guildResetCount
	log.Printf("[SeasonEngine] ✅ Phase 4 完成: %d 联盟已重组", guildResetCount)

	// ─── Phase 5: 清除 Redis 缓存 ───
	phaseStart = time.Now()
	log.Printf("[SeasonEngine] 🧹 Phase 5/5: 清除赛季相关缓存...")
	e.clearSeasonCache(ctx, s.ServerID)
	settleResult["phase5_cache_clear_duration_ms"] = time.Since(phaseStart).Milliseconds()
	log.Printf("[SeasonEngine] ✅ Phase 5 完成: 缓存已清除")

	// ─── 更新赛季状态为已结束 ───
	settleResult["total_duration_ms"] = time.Since(totalStart).Milliseconds()
	settleResult["settled_at"] = time.Now().Format(time.RFC3339)

	resultJSON, _ := json.Marshal(settleResult)
	_, err := pkgmysql.DB.ExecContext(ctx,
		`UPDATE seasons SET status = 4, settle_result = ?, settled_at = NOW(),
		 player_count = ?, guild_count = ?, city_reset_count = ?, reward_sent_count = ?, updated_at = NOW()
		 WHERE id = ? AND status = 3`,
		string(resultJSON), playerCount, guildCount, cityResetCount, rewardCount, s.ID)
	if err != nil {
		log.Printf("[SeasonEngine] ❌ 赛季 %d 结算完成但更新状态失败: %v", s.ID, err)
		return
	}

	log.Printf("[SeasonEngine] 🎉 赛季 S%d(%s) 结算完成！总耗时 %s",
		s.ID, s.Name, time.Since(totalStart).Round(time.Second))

	// ─── 自动创建下一个赛季 ───
	e.autoCreateNextSeason(ctx, s.ServerID, s.SeasonNum)

	// 发布赛季结束通知
	msg := fmt.Sprintf(`{"type":"season_ended","season_id":%d,"season_num":%d}`, s.ID, s.SeasonNum)
	_ = myredis.RDB.Publish(ctx, "season:notifications", msg).Err()
}

// calculateRankings 计算赛季排名
func (e *SeasonEngine) calculateRankings(ctx context.Context, seasonID int64, serverID int64) (int, int) {
	// 更新排名序号
	_, err := pkgmysql.DB.ExecContext(ctx,
		`UPDATE season_rankings sr
		 JOIN (
		   SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC, city_count DESC, kill_count DESC) as new_rank
		   FROM season_rankings WHERE season_id = ?
		 ) ranked ON sr.id = ranked.id
		 SET sr.rank = ranked.new_rank, sr.updated_at = NOW()
		 WHERE sr.season_id = ?`, seasonID, seasonID)
	if err != nil {
		log.Printf("[SeasonEngine] ❌ 计算排名失败: %v", err)
	}

	// 统计玩家数
	var playerCount int
	_ = pkgmysql.DB.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM season_rankings WHERE season_id = ?`, seasonID).Scan(&playerCount)

	// 统计联盟数
	var guildCount int
	_ = pkgmysql.DB.QueryRowContext(ctx,
		`SELECT COUNT(DISTINCT guild_id) FROM season_rankings WHERE season_id = ? AND guild_id > 0`, seasonID).Scan(&guildCount)

	return playerCount, guildCount
}

// distributeRewards 发放赛季奖励
func (e *SeasonEngine) distributeRewards(ctx context.Context, seasonID int64, seasonNum int) int {
	// 获取奖励配置（先查赛季专属，再查通用模板）
	rewards := e.getRewardConfig(ctx, seasonNum)
	if len(rewards) == 0 {
		log.Printf("[SeasonEngine] ⚠ 无奖励配置，跳过奖励发放")
		return 0
	}

	// 获取所有排名
	rows, err := pkgmysql.DB.QueryContext(ctx,
		`SELECT user_id, rank FROM season_rankings WHERE season_id = ? ORDER BY rank ASC`, seasonID)
	if err != nil {
		log.Printf("[SeasonEngine] ❌ 获取排名列表失败: %v", err)
		return 0
	}
	defer rows.Close()

	rewardCount := 0
	for rows.Next() {
		var userID int64
		var rank int
		if err := rows.Scan(&userID, &rank); err != nil {
			continue
		}

		// 匹配奖励
		for _, r := range rewards {
			if rank >= r.RankMin && (r.RankMax == 0 || rank <= r.RankMax) {
				// 创建奖励发放记录
				_, err := pkgmysql.DB.ExecContext(ctx,
					`INSERT INTO season_reward_logs (season_id, user_id, rank, reward_type, reward_id, amount, status, created_at)
					 VALUES (?, ?, ?, ?, ?, ?, 1, NOW())`,
					seasonID, userID, rank, r.RewardType, r.RewardID, r.Amount)
				if err != nil {
					log.Printf("[SeasonEngine] ❌ 创建奖励记录失败: user=%d rank=%d: %v", userID, rank, err)
					continue
				}

				// 通过内部 API 调用 user-service 发放奖励
				e.sendRewardToUser(ctx, userID, r.RewardType, r.Amount, fmt.Sprintf("S%d赛季排名奖励(第%d名)", seasonNum, rank))
				rewardCount++
			}
		}
	}

	return rewardCount
}

type rewardConfig struct {
	RankMin    int
	RankMax    int
	RewardType int8
	RewardID   int64
	Amount     int
}

func (e *SeasonEngine) getRewardConfig(ctx context.Context, seasonNum int) []rewardConfig {
	// 优先查赛季专属配置
	rows, err := pkgmysql.DB.QueryContext(ctx,
		`SELECT rank_min, rank_max, reward_type, reward_id, amount
		 FROM season_rewards WHERE season_num = ? ORDER BY rank_min ASC`, seasonNum)
	if err != nil || !rows.Next() {
		// 回退到通用模板
		if rows != nil {
			rows.Close()
		}
		rows, err = pkgmysql.DB.QueryContext(ctx,
			`SELECT rank_min, rank_max, reward_type, reward_id, amount
			 FROM season_rewards WHERE season_num = 0 ORDER BY rank_min ASC`)
		if err != nil {
			return nil
		}
	}
	defer rows.Close()

	var rewards []rewardConfig
	for rows.Next() {
		var r rewardConfig
		if err := rows.Scan(&r.RankMin, &r.RankMax, &r.RewardType, &r.RewardID, &r.Amount); err != nil {
			continue
		}
		rewards = append(rewards, r)
	}
	return rewards
}

// sendRewardToUser 通过内部 API 发放奖励
func (e *SeasonEngine) sendRewardToUser(ctx context.Context, userID int64, rewardType int8, amount int, reason string) {
	apiKey := "season-service-internal-key-2024"

	switch rewardType {
	case 1: // 金币
		go func() {
			body := fmt.Sprintf(`{"user_id":%d,"amount":%d,"reason":"%s"}`, userID, amount, reason)
			_, _ = e.doInternalPost(e.userServiceURL+"/internal/user/add-gold", body, apiKey)
		}()
	case 2: // 钻石
		go func() {
			body := fmt.Sprintf(`{"user_id":%d,"amount":%d,"reason":"%s"}`, userID, amount, reason)
			_, _ = e.doInternalPost(e.userServiceURL+"/internal/user/add-diamonds", body, apiKey)
		}()
	case 5: // 经验
		go func() {
			body := fmt.Sprintf(`{"user_id":%d,"amount":%d,"reason":"%s"}`, userID, amount, reason)
			_, _ = e.doInternalPost(e.userServiceURL+"/internal/user/add-exp", body, apiKey)
		}()
	}
}

// resetMap 重置地图（清空城池归属、行军、领地）
func (e *SeasonEngine) resetMap(ctx context.Context, seasonID int64, serverID int64, seasonNum int) int {
	cityCount := 0

	// 1. 统计有归属的城池数
	_ = pkgmysql.DB.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM city_occupations`).Scan(&cityCount)

	// 2. 清空城池归属
	_, err := pkgmysql.DB.ExecContext(ctx, `DELETE FROM city_occupations`)
	if err != nil {
		log.Printf("[SeasonEngine] ❌ 清空城池归属失败: %v", err)
	}

	// 3. 取消所有进行中的行军
	_, err = pkgmysql.DB.ExecContext(ctx,
		`DELETE FROM march_orders WHERE status IN (0, 1)`)
	if err != nil {
		log.Printf("[SeasonEngine] ❌ 清空行军订单失败: %v", err)
	}

	// 4. 清空行军检查点
	_, err = pkgmysql.DB.ExecContext(ctx, `DELETE FROM march_checkpoints`)
	if err != nil {
		log.Printf("[SeasonEngine] ❌ 清空行军检查点失败: %v", err)
	}

	// 5. 清空城池锁定
	_, err = pkgmysql.DB.ExecContext(ctx, `DELETE FROM city_occupation_locks`)
	if err != nil {
		log.Printf("[SeasonEngine] ❌ 清空城池锁定失败: %v", err)
	}

	// 6. 清空联盟领地
	_, err = pkgmysql.DB.ExecContext(ctx, `DELETE FROM alliance_territories`)
	if err != nil {
		log.Printf("[SeasonEngine] ❌ 清空联盟领地失败: %v", err)
	}

	// 7. 归档战斗日志
	_, err = pkgmysql.DB.ExecContext(ctx, `DELETE FROM city_battle_logs`)
	if err != nil {
		log.Printf("[SeasonEngine] ⚠ 清空战斗日志失败: %v", err)
	}

	// 8. 清除地图相关 Redis 缓存
	e.clearMapRedisCache(ctx, serverID)

	// 记录结算日志
	e.logSettlePhase(ctx, seasonID, "map_reset", "reset_map", 1,
		fmt.Sprintf(`{"city_count":%d,"server_id":%d}`, cityCount, serverID), "")

	return cityCount
}

// clearMapRedisCache 清除地图相关 Redis 缓存
func (e *SeasonEngine) clearMapRedisCache(ctx context.Context, serverID int64) {
	patterns := []string{
		"map:overview",
		"map:city:info:*",
		"map:city:occupy:*",
		"map:alliance:territory:*",
		fmt.Sprintf("s%d:map:*", serverID),
	}

	for _, pattern := range patterns {
		iter := myredis.RDB.Scan(ctx, 0, pattern, 100).Iterator()
		for iter.Next(ctx) {
			_ = myredis.RDB.Del(ctx, iter.Val()).Err()
		}
	}

	// 清除行军队列
	_ = myredis.RDB.Del(ctx, "map:march:queue").Err()
}

// resetGuilds 联盟重组（保留联盟但重置赛季数据）
func (e *SeasonEngine) resetGuilds(ctx context.Context, seasonID int64, serverID int64, seasonNum int) int {
	guildCount := 0

	// 1. 统计活跃联盟数
	_ = pkgmysql.DB.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM guilds WHERE status = 1`).Scan(&guildCount)

	// 2. 取消所有进行中的战争
	_, err := pkgmysql.DB.ExecContext(ctx,
		`UPDATE guild_wars SET status = 3, end_time = NOW() WHERE status IN (0, 1, 2)`)
	if err != nil {
		log.Printf("[SeasonEngine] ❌ 取消联盟战争失败: %v", err)
	}

	// 3. 取消所有进行中的协同战斗
	_, err = pkgmysql.DB.ExecContext(ctx,
		`UPDATE guild_war_battles SET status = 3 WHERE status IN (0, 1)`)
	if err != nil {
		log.Printf("[SeasonEngine] ❌ 取消协同战斗失败: %v", err)
	}

	// 4. 重置联盟赛季统计（保留联盟结构，重置赛季相关数据）
	_, err = pkgmysql.DB.ExecContext(ctx,
		`UPDATE guilds SET city_count = 0, total_power = 0,
		 updated_at = NOW() WHERE status = 1`)
	if err != nil {
		log.Printf("[SeasonEngine] ❌ 重置联盟统计失败: %v", err)
	}

	// 5. 重置成员赛季贡献（保留成员身份）
	_, err = pkgmysql.DB.ExecContext(ctx,
		`UPDATE guild_members SET contribution = 0, total_donate = 0, week_donate = 0,
		 updated_at = NOW() WHERE status = 1`)
	if err != nil {
		log.Printf("[SeasonEngine] ❌ 重置成员贡献失败: %v", err)
	}

	// 6. 清除待处理的入盟申请
	_, err = pkgmysql.DB.ExecContext(ctx,
		`UPDATE guild_applications SET status = 3 WHERE status = 0`)
	if err != nil {
		log.Printf("[SeasonEngine] ⚠ 清除入盟申请失败: %v", err)
	}

	// 7. 重置联盟科技（保留等级，清除研究中状态）
	_, err = pkgmysql.DB.ExecContext(ctx,
		`UPDATE guild_technologies SET researching = 0, research_start = NULL, research_end = NULL,
		 updated_at = NOW()`)
	if err != nil {
		log.Printf("[SeasonEngine] ⚠ 重置联盟科技失败: %v", err)
	}

	// 记录结算日志
	e.logSettlePhase(ctx, seasonID, "guild_reset", "reset_guilds", 1,
		fmt.Sprintf(`{"guild_count":%d,"server_id":%d}`, guildCount, serverID), "")

	return guildCount
}

// clearSeasonCache 清除赛季相关缓存
func (e *SeasonEngine) clearSeasonCache(ctx context.Context, serverID int64) {
	patterns := []string{
		"season:current:*",
		"season:countdown:*",
		fmt.Sprintf("season:info:%d", serverID),
	}

	for _, pattern := range patterns {
		iter := myredis.RDB.Scan(ctx, 0, pattern, 100).Iterator()
		for iter.Next(ctx) {
			_ = myredis.RDB.Del(ctx, iter.Val()).Err()
		}
	}
}

// autoCreateNextSeason 自动创建下一个赛季
func (e *SeasonEngine) autoCreateNextSeason(ctx context.Context, serverID int64, currentNum int) {
	var exists int
	_ = pkgmysql.DB.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM seasons WHERE server_id = ? AND status IN (0, 1)`, serverID).Scan(&exists)
	if exists > 0 {
		log.Printf("[SeasonEngine] ℹ 已存在新赛季，跳过自动创建")
		return
	}

	nextNum := currentNum + 1
	nextName := fmt.Sprintf("第%d赛季", nextNum)
	startTime := time.Now().Add(24 * time.Hour)
	endTime := startTime.Add(60 * 24 * time.Hour)

	_, err := pkgmysql.DB.ExecContext(ctx,
		`INSERT INTO seasons (season_num, server_id, name, status, start_time, end_time, duration_days, created_at, updated_at)
		 VALUES (?, ?, ?, 0, ?, ?, 60, NOW(), NOW())`,
		nextNum, serverID, nextName, startTime, endTime)
	if err != nil {
		log.Printf("[SeasonEngine] ❌ 自动创建新赛季失败: %v", err)
		return
	}

	log.Printf("[SeasonEngine] 🆕 自动创建新赛季 S%d(%s)，将于 %s 开始",
		nextNum, nextName, startTime.Format("2006-01-02 15:04"))
}

// shouldRetrySettlement 判断是否需要重试结算
func (e *SeasonEngine) shouldRetrySettlement(ctx context.Context, seasonID int64) bool {
	var count int
	err := pkgmysql.DB.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM season_settle_logs WHERE season_id = ?`, seasonID).Scan(&count)
	if err != nil || count == 0 {
		return true
	}

	var lastLogTime time.Time
	_ = pkgmysql.DB.QueryRowContext(ctx,
		`SELECT MAX(created_at) FROM season_settle_logs WHERE season_id = ?`, seasonID).Scan(&lastLogTime)

	return time.Since(lastLogTime) > 30*time.Minute
}

// logSettlePhase 记录结算阶段日志
func (e *SeasonEngine) logSettlePhase(ctx context.Context, seasonID int64, phase, action string, status int8, detail, errMsg string) {
	_, _ = pkgmysql.DB.ExecContext(ctx,
		`INSERT INTO season_settle_logs (season_id, phase, action, status, detail, error_msg, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, NOW())`,
		seasonID, phase, action, status, detail, errMsg)
}

// doInternalPost 发送内部 HTTP POST 请求
func (e *SeasonEngine) doInternalPost(url, body, apiKey string) ([]byte, error) {
	req, err := http.NewRequest("POST", url, bytes.NewBufferString(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Api-Key", apiKey)
	req.Header.Set("X-Caller-Service", "season-service")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	return io.ReadAll(resp.Body)
}
