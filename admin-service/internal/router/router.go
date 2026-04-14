// Package router 注册九州争鼎后台管理服务的所有HTTP路由。
// 路由分为公开路由(登录)和认证路由(JWT保护)。
package router

import (
	"admin-service/config"
	"admin-service/internal/handler"
	"admin-service/internal/middleware"

	"github.com/gin-gonic/gin"
)

// Register 注册所有路由到Gin引擎
func Register(r *gin.Engine, cfg *config.Config) {
	// 全局中间件
	r.Use(middleware.CORS())

	// API v1 路由组
	api := r.Group("/api/v1/admin")

	// ======== 公开路由 (无需认证) ========
	api.POST("/login", handler.Login)

	// ======== 认证路由 (需要JWT) ========
	auth := api.Group("")
	auth.Use(middleware.JWTAuth(cfg.JWT.Secret))
	{
		// 仪表盘
		auth.GET("/dashboard/stats", handler.GetDashboardStats)

		// 用户管理 (转发到user-service)
		auth.GET("/users", handler.GetUsers)
		auth.GET("/users/:id", handler.GetUserDetail)
		auth.PUT("/users/:id/ban", handler.BanUser)
		auth.PUT("/users/:id/unban", handler.UnbanUser)
		auth.PUT("/users/:id/resources", handler.ModifyUserResources)

		// 卡池管理 (转发到card-service)
		auth.GET("/card-pools", handler.GetCardPools)
		auth.POST("/card-pools", handler.CreateCardPool)
		auth.PUT("/card-pools/:id", handler.UpdateCardPool)
		auth.PUT("/card-pools/:id/status", handler.ToggleCardPoolStatus)

		// 英雄管理 (转发到card-service)
		auth.GET("/heroes", handler.GetHeroes)
		auth.POST("/heroes", handler.CreateHero)
		auth.PUT("/heroes/:id", handler.UpdateHero)

		// 地图管理 (转发到map-service)
		auth.GET("/map/cities", handler.GetCities)
		auth.PUT("/map/cities/:id", handler.UpdateCity)
		auth.GET("/map/marches", handler.GetMarches)
		auth.DELETE("/map/marches/:id", handler.CancelMarch)
		auth.POST("/map/reset", handler.ResetMap)

		// 公会管理 (转发到guild-service)
		auth.GET("/guilds", handler.GetGuilds)
		auth.GET("/guilds/:id/members", handler.GetGuildMembers)
		auth.PUT("/guilds/:id", handler.UpdateGuild)
		auth.DELETE("/guilds/:id", handler.DisbandGuild)

		// 充值管理 (查询log_db分表)
		auth.GET("/orders", handler.GetOrders)
		auth.POST("/orders/:id/refund", handler.RefundOrder)
		auth.POST("/orders/:id/deliver", handler.ManualDeliver)
		auth.GET("/orders/stats", handler.GetOrderStats)

		// 数据分析
		auth.GET("/analytics/daily", handler.GetDailyStats)
		auth.GET("/analytics/gacha", handler.GetGachaStats)
		auth.GET("/analytics/retention", handler.GetRetentionStats)

		// 日志查看 (查询log_db分表)
		auth.GET("/logs/gm", handler.GetGmLogs)
		auth.GET("/logs/login", handler.GetLoginLogs)
		auth.GET("/logs/action", handler.GetActionLogs)

		// 配置中心 (admin_db)
		auth.GET("/configs", handler.GetConfigs)
		auth.PUT("/configs/:id", handler.UpdateConfig)

		// 活动管理 (admin_db)
		auth.GET("/activities", handler.GetActivities)
		auth.POST("/activities", handler.CreateActivity)
		auth.PUT("/activities/:id", handler.UpdateActivity)
		auth.DELETE("/activities/:id", handler.DeleteActivity)

		// RBAC管理 (admin_db)
		auth.GET("/roles", handler.GetRoles)
		auth.POST("/roles", handler.CreateRole)
		auth.PUT("/roles/:id", handler.UpdateRole)
		auth.DELETE("/roles/:id", handler.DeleteRole)
		auth.GET("/permissions", handler.GetPermissions)
		auth.GET("/admin-users", handler.GetAdminUsers)
		auth.PUT("/admin-users/:id/roles", handler.AssignAdminRoles)
	}
}
