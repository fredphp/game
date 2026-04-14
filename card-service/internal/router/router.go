package router

import (
	"user-service/internal/handler"
	"user-service/internal/middleware"

	"github.com/gin-gonic/gin"
)

func Setup(engine *gin.Engine, cardHandler *handler.CardHandler) {
	engine.Use(middleware.CORS(), gin.Recovery(), gin.Logger())

	engine.GET("/health", handler.Health)

	v1 := engine.Group("/api/v1")
	{
		// 公开接口
		v1.GET("/card/pools", cardHandler.ListPools)

		// 鉴权接口
		auth := v1.Group("")
		auth.Use(middleware.JWTAuth())
		{
			auth.POST("/card/gacha", cardHandler.Gacha)
			auth.GET("/card/list", cardHandler.ListUserCards)
			auth.PUT("/card/:id/lock", cardHandler.ToggleLock)
			auth.GET("/card/gacha/history", cardHandler.GachaHistory)
			auth.GET("/card/gacha/stats", cardHandler.GachaStats)
		}
	}
}
