package router

import (
	"map-service/internal/handler"
	"map-service/internal/middleware"

	"github.com/gin-gonic/gin"
)

func Setup(engine *gin.Engine, mapHandler *handler.MapHandler) {
	engine.Use(middleware.CORS(), gin.Recovery(), gin.Logger())

	engine.GET("/health", handler.Health)

	v1 := engine.Group("/api/v1")
	{
		// ===== 公开接口 =====
		v1.GET("/map/overview", mapHandler.MapOverview)       // 地图总览
		v1.GET("/map/regions", mapHandler.ListRegions)         // 区域列表
		v1.GET("/map/region/:regionId/cities", mapHandler.ListCitiesByRegion) // 区域城池
		v1.GET("/map/city/:id", mapHandler.GetCityDetail)      // 城池详情
		v1.GET("/map/city/:id/logs", mapHandler.CityBattleLogs) // 战斗日志

		// ===== 鉴权接口 =====
		auth := v1.Group("")
		auth.Use(middleware.JWTAuth())
		{
			// 行军系统
			auth.POST("/map/march", mapHandler.InitiateMarch)            // 发起行军
			auth.GET("/map/march/list", mapHandler.ListMarches)           // 行军列表
			auth.GET("/map/march/:marchId/progress", mapHandler.GetMarchProgress) // 行军进度
			auth.POST("/map/march/:marchId/recall", mapHandler.RecallMarch)      // 撤回行军

			// 联盟领土
			auth.GET("/map/alliance/:allianceId/territory", mapHandler.AllianceTerritory) // 联盟领土
		}
	}
}
