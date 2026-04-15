package router

import (
	"season-service/internal/handler"
	"season-service/internal/middleware"

	"github.com/gin-gonic/gin"
)

// Setup 配置路由
func Setup(
	engine *gin.Engine,
	seasonHandler *handler.SeasonHandler,
	internalHandler *handler.SeasonInternalHandler,
) {
	// ─────────────────────────────────
	// 全局中间件
	// ─────────────────────────────────
	engine.Use(
		middleware.CORS(),
		middleware.Recovery(),
		gin.Logger(),
	)

	// ─────────────────────────────────
	// 健康检查
	// ─────────────────────────────────
	engine.GET("/health", handler.Health)

	// ─────────────────────────────────
	// API v1 路由组（玩家端）
	// ─────────────────────────────────
	v1 := engine.Group("/api/v1")

	// 赛季公开接口（无需认证）
	season := v1.Group("/season")
	{
		season.GET("/current", seasonHandler.GetCurrentSeason) // 当前赛季倒计时
		season.GET("/list", seasonHandler.ListSeasons)        // 赛季列表
		season.GET("/:id", seasonHandler.GetSeason)           // 赛季详情
		season.GET("/:id/rankings", seasonHandler.ListRankings) // 赛季排名
	}

	// 赛季需要认证的接口
	authSeason := v1.Group("/season")
	authSeason.Use(middleware.JWTAuth())
	{
		authSeason.GET("/:id/rewards", seasonHandler.ListRewardLogs) // 奖励记录
	}

	// ─────────────────────────────────
	// 管理端 API（Internal API Key 认证）
	// ─────────────────────────────────
	admin := engine.Group("/admin/season")
	admin.Use(middleware.InternalAuth())
	{
		admin.POST("/create", seasonHandler.CreateSeason)                  // 创建赛季
		admin.POST("/:id/start", seasonHandler.StartSeason)                // 启动赛季
		admin.POST("/:id/settle", seasonHandler.SettleSeason)              // 手动结算
		admin.GET("/:id/stats", internalHandler.GetSeasonStats)            // 赛季统计
		admin.POST("/:id/force-end", internalHandler.ForceEndSeason)       // 强制结束
		admin.POST("/reward/create", internalHandler.CreateReward)         // 创建奖励
		admin.GET("/reward/list", internalHandler.ListRewards)             // 奖励列表
		admin.DELETE("/reward/:id", internalHandler.DeleteReward)          // 删除奖励
	}

	// ─────────────────────────────────
	// 内部服务间调用 API
	// ─────────────────────────────────
	internal := engine.Group("/internal/season")
	internal.Use(middleware.InternalAuth())
	{
		internal.GET("/current", seasonHandler.GetCurrentSeason)           // 获取当前赛季
		internal.GET("/:id/detail", seasonHandler.GetSeason)              // 赛季详情
	}
}
