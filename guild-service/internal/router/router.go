package router

import (
	"guild-service/internal/handler"
	"guild-service/internal/middleware"

	"github.com/gin-gonic/gin"
)

func Setup(engine *gin.Engine, guildHandler *handler.GuildHandler) {
	engine.Use(middleware.CORS(), gin.Recovery(), gin.Logger())

	engine.GET("/health", handler.Health)

	v1 := engine.Group("/api/v1")
	{
		// ===== 公开接口 =====
		v1.GET("/guild/list", guildHandler.ListGuilds)          // 联盟列表
		v1.GET("/guild/:id", guildHandler.GetGuild)             // 联盟详情
		v1.GET("/guild/:id/members", guildHandler.ListMembers)  // 成员列表
		v1.GET("/guild/:id/logs", guildHandler.ListLogs)        // 联盟日志
		v1.GET("/guild/war/:warId", guildHandler.GetWar)        // 战争详情

		// ===== 鉴权接口 =====
		auth := v1.Group("")
		auth.Use(middleware.JWTAuth())
		{
			// 联盟管理
			auth.POST("/guild/create", guildHandler.CreateGuild)      // 创建联盟
			auth.GET("/guild/my", guildHandler.GetMyGuild)              // 我的联盟
			auth.POST("/guild/join", guildHandler.JoinGuild)            // 加入联盟
			auth.POST("/guild/leave", guildHandler.LeaveGuild)          // 退出联盟
			auth.PUT("/guild/:id", guildHandler.UpdateGuild)            // 更新联盟
			auth.POST("/guild/:id/disband", guildHandler.DisbandGuild)  // 解散联盟

			// 成员管理
			auth.POST("/guild/:id/kick/:userId", guildHandler.KickMember)       // 踢出成员
			auth.PUT("/guild/:id/role/:userId/:role", guildHandler.PromoteMember) // 晋升降职
			auth.GET("/guild/:id/applications", guildHandler.ListApplications)  // 待审批
			auth.POST("/guild/:id/approve/:appId", guildHandler.ApproveApplication) // 审批

			// 联盟战争
			auth.POST("/guild/war/declare", guildHandler.DeclareWar)            // 宣战
			auth.GET("/guild/:id/wars", guildHandler.ListWars)                  // 战争列表
			auth.POST("/guild/:id/war/:warId/surrender", guildHandler.SurrenderWar) // 投降

			// 协作战斗
			auth.POST("/guild/war/coop/initiate", guildHandler.InitiateCoopBattle) // 发起协作
			auth.POST("/guild/war/coop/join", guildHandler.JoinCoopBattle)       // 加入协作
			auth.POST("/guild/war/coop/:battleId/start", guildHandler.ForceStartBattle) // 强制开战
		}
	}
}
