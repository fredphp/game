package router

import (
	"user-service/internal/handler"
	"user-service/internal/middleware"
	"github.com/gin-gonic/gin"
)

func Setup(engine *gin.Engine, battleHandler *handler.BattleHandler) {
	engine.Use(middleware.CORS(), gin.Recovery(), gin.Logger())
	engine.GET("/health", handler.Health)

	v1 := engine.Group("/api/v1")
	auth := v1.Group("")
	auth.Use(middleware.JWTAuth())
	{
		auth.POST("/battle/pve", battleHandler.StartPVE)
		auth.GET("/battle/replay/:id", battleHandler.Replay)
		auth.GET("/battle/history", battleHandler.History)
	}
}
