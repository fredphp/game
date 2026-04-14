// Package handler 提供九州争鼎后台管理服务的日志HTTP处理器。
// 包含: GM操作日志、用户行为日志、战斗日志、登录日志的查询接口。
// 所有日志查询均支持分表、时间范围筛选、分页。
package handler

import (
	"log"
	"strconv"
	"time"

	"admin-service/internal/dao"
	"admin-service/internal/model"
	"admin-service/pkg/response"

	"github.com/gin-gonic/gin"
)

// ==================== GM操作日志 ====================

// GetGmLogs 获取GM操作日志
// GET /api/v1/admin/logs/gm?page=1&pageSize=20&start=&end=&action=&operator=&level=
func GetGmLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	startStr := c.Query("start")
	endStr := c.Query("end")
	action := c.Query("action")
	operator := c.Query("operator")
	levelStr := c.Query("level")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var start, end time.Time
	if startStr != "" {
		start, _ = time.Parse("2006-01-02", startStr)
	}
	if endStr != "" {
		end, _ = time.Parse("2006-01-02", endStr)
		end = end.Add(24*time.Hour - time.Second)
	}
	if start.IsZero() {
		start = time.Now().AddDate(0, 0, -30)
	}
	if end.IsZero() {
		end = time.Now()
	}

	// 构建过滤条件
	filters := make(map[string]interface{})
	if action != "" {
		filters["action"] = action
	}
	if operator != "" {
		filters["operator_name"] = operator
	}
	if levelStr != "" {
		if level, err := strconv.ParseInt(levelStr, 10, 8); err == nil {
			filters["level"] = level
		}
	}

	logs, total, err := dao.GetGmLogs(start, end, page, pageSize, filters)
	if err != nil {
		log.Printf("get gm logs: %v", err)
		response.Fail(c, "查询GM日志失败")
		return
	}

	response.OKPage(c, logs, total, page, pageSize)
}

// GetGmLogStats 获取GM日志统计
// GET /api/v1/admin/logs/gm/stats?start=&end=
func GetGmLogStats(c *gin.Context) {
	startStr := c.DefaultQuery("start", time.Now().AddDate(0, 0, -30).Format("2006-01-02"))
	endStr := c.DefaultQuery("end", time.Now().Format("2006-01-02"))

	start, _ := time.Parse("2006-01-02", startStr)
	end, _ := time.Parse("2006-01-02", endStr)
	end = end.Add(24*time.Hour - time.Second)

	stats, err := dao.GetGmLogStats(start, end)
	if err != nil {
		log.Printf("get gm log stats: %v", err)
		response.Fail(c, "获取GM日志统计失败")
		return
	}

	response.OK(c, stats)
}

// ==================== 用户行为日志 ====================

// GetActionLogs 获取用户行为日志
// GET /api/v1/admin/logs/action?page=1&pageSize=20&action=&category=&userId=&start=&end=
func GetActionLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	action := c.Query("action")
	category := c.Query("category")
	userIDStr := c.Query("userId")
	startStr := c.Query("start")
	endStr := c.Query("end")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var start, end time.Time
	if startStr != "" {
		start, _ = time.Parse("2006-01-02", startStr)
	}
	if endStr != "" {
		end, _ = time.Parse("2006-01-02", endStr)
		end = end.Add(24*time.Hour - time.Second)
	}
	if start.IsZero() {
		start = time.Now().AddDate(0, 0, -7)
	}
	if end.IsZero() {
		end = time.Now()
	}

	// 构建过滤条件
	filters := make(map[string]interface{})
	if action != "" {
		filters["action"] = action
	}
	if category != "" {
		filters["category"] = category
	}
	if userIDStr != "" {
		if uid, err := strconv.ParseInt(userIDStr, 10, 64); err == nil {
			filters["user_id"] = uid
		}
	}

	logs, total, err := dao.GetActionLogs(start, end, page, pageSize, filters)
	if err != nil {
		log.Printf("get action logs: %v", err)
		response.Fail(c, "查询行为日志失败")
		return
	}

	response.OKPage(c, logs, total, page, pageSize)
}

// GetActionStats 获取用户行为统计
// GET /api/v1/admin/logs/action/stats?start=&end=
func GetActionStats(c *gin.Context) {
	startStr := c.DefaultQuery("start", time.Now().AddDate(0, 0, -7).Format("2006-01-02"))
	endStr := c.DefaultQuery("end", time.Now().Format("2006-01-02"))

	start, _ := time.Parse("2006-01-02", startStr)
	end, _ := time.Parse("2006-01-02", endStr)
	end = end.Add(24*time.Hour - time.Second)

	stats, err := dao.GetActionStats(start, end)
	if err != nil {
		log.Printf("get action stats: %v", err)
		response.Fail(c, "获取行为统计失败")
		return
	}

	response.OK(c, stats)
}

// ==================== 战斗日志 ====================

// GetBattleLogs 获取战斗日志
// GET /api/v1/admin/logs/battle?page=1&pageSize=20&type=&result=&userId=&start=&end=
func GetBattleLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	battleType := c.Query("type")
	resultStr := c.Query("result")
	userIDStr := c.Query("userId")
	battleID := c.Query("battleId")
	startStr := c.Query("start")
	endStr := c.Query("end")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var start, end time.Time
	if startStr != "" {
		start, _ = time.Parse("2006-01-02", startStr)
	}
	if endStr != "" {
		end, _ = time.Parse("2006-01-02", endStr)
		end = end.Add(24*time.Hour - time.Second)
	}
	if start.IsZero() {
		start = time.Now().AddDate(0, 0, -7)
	}
	if end.IsZero() {
		end = time.Now()
	}

	// 如果指定了battleId，精确查找
	if battleID != "" {
		battleLog, err := dao.GetBattleLogByBattleID(battleID, start)
		if err != nil {
			response.Fail(c, "未找到该战斗记录")
			return
		}
		response.OK(c, []model.BattleLog{*battleLog})
		return
	}

	// 构建过滤条件
	filters := make(map[string]interface{})
	if battleType != "" {
		filters["battle_type"] = battleType
	}
	if resultStr != "" {
		if r, err := strconv.ParseInt(resultStr, 10, 8); err == nil {
			filters["result"] = r
		}
	}
	if userIDStr != "" {
		if uid, err := strconv.ParseInt(userIDStr, 10, 64); err == nil {
			filters["user_id"] = uid
		}
	}

	logs, total, err := dao.GetBattleLogs(start, end, page, pageSize, filters)
	if err != nil {
		log.Printf("get battle logs: %v", err)
		response.Fail(c, "查询战斗日志失败")
		return
	}

	response.OKPage(c, logs, total, page, pageSize)
}

// GetBattleLogDetail 获取战斗日志详情
// GET /api/v1/admin/logs/battle/:battleId
func GetBattleLogDetail(c *gin.Context) {
	battleID := c.Param("battleId")

	// 尝试当月分表
	battleLog, err := dao.GetBattleLogByBattleID(battleID, time.Now())
	if err != nil {
		// 尝试上月分表
		battleLog, err = dao.GetBattleLogByBattleID(battleID, time.Now().AddDate(0, -1, 0))
		if err != nil {
			response.Fail(c, "未找到该战斗记录")
			return
		}
	}

	response.OK(c, battleLog)
}

// GetBattleStats 获取战斗统计
// GET /api/v1/admin/logs/battle/stats?start=&end=
func GetBattleStats(c *gin.Context) {
	startStr := c.DefaultQuery("start", time.Now().AddDate(0, 0, -7).Format("2006-01-02"))
	endStr := c.DefaultQuery("end", time.Now().Format("2006-01-02"))

	start, _ := time.Parse("2006-01-02", startStr)
	end, _ := time.Parse("2006-01-02", endStr)
	end = end.Add(24*time.Hour - time.Second)

	// 获取每日战斗统计
	dailyStats, err := dao.GetBattleDailyStats(start, end)
	if err != nil {
		log.Printf("get battle daily stats: %v", err)
		response.Fail(c, "获取战斗统计失败")
		return
	}

	// 获取各类型统计
	typeStats, err := dao.GetBattleTypeStats(start, end)
	if err != nil {
		log.Printf("get battle type stats: %v", err)
		typeStats = []map[string]interface{}{}
	}

	response.OK(c, map[string]interface{}{
		"dailyStats": dailyStats,
		"typeStats":  typeStats,
	})
}

// GetBattleHeroStats 获取武将使用率统计
// GET /api/v1/admin/logs/battle/heroes?start=&end=&limit=20
func GetBattleHeroStats(c *gin.Context) {
	startStr := c.DefaultQuery("start", time.Now().AddDate(0, 0, -7).Format("2006-01-02"))
	endStr := c.DefaultQuery("end", time.Now().Format("2006-01-02"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	if limit < 1 || limit > 100 {
		limit = 20
	}

	start, _ := time.Parse("2006-01-02", startStr)
	end, _ := time.Parse("2006-01-02", endStr)
	end = end.Add(24*time.Hour - time.Second)

	pickRates, err := dao.GetHeroPickRate(start, end, limit)
	if err != nil {
		log.Printf("get hero pick rate: %v", err)
		response.Fail(c, "获取武将统计失败")
		return
	}

	response.OK(c, pickRates)
}

// ==================== 登录日志 ====================

// GetLoginLogs 获取登录日志
// GET /api/v1/admin/logs/login?page=1&pageSize=20&status=&channel=&userId=&start=&end=
func GetLoginLogs(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
	statusStr := c.Query("status")
	channel := c.Query("channel")
	userIDStr := c.Query("userId")
	startStr := c.Query("start")
	endStr := c.Query("end")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	var start, end time.Time
	if startStr != "" {
		start, _ = time.Parse("2006-01-02", startStr)
	}
	if endStr != "" {
		end, _ = time.Parse("2006-01-02", endStr)
		end = end.Add(24*time.Hour - time.Second)
	}
	if start.IsZero() {
		start = time.Now().AddDate(0, 0, -7)
	}
	if end.IsZero() {
		end = time.Now()
	}

	// 构建过滤条件
	filters := make(map[string]interface{})
	if statusStr != "" {
		if s, err := strconv.ParseInt(statusStr, 10, 8); err == nil {
			filters["status"] = s
		}
	}
	if channel != "" {
		filters["channel"] = channel
	}
	if userIDStr != "" {
		if uid, err := strconv.ParseInt(userIDStr, 10, 64); err == nil {
			filters["user_id"] = uid
		}
	}

	logs, total, err := dao.GetLoginLogs(start, end, page, pageSize, filters)
	if err != nil {
		log.Printf("get login logs: %v", err)
		response.Fail(c, "查询登录日志失败")
		return
	}

	response.OKPage(c, logs, total, page, pageSize)
}
