package router

import (
	"user-service/internal/handler"
	"user-service/internal/middleware"

	"github.com/gin-gonic/gin"
)

// Setup 配置路由
func Setup(
	engine *gin.Engine,
	userHandler *handler.UserHandler,
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
	// 健康检查（无需认证）
	// ─────────────────────────────────
	engine.GET("/health", handler.Health)

	// ─────────────────────────────────
	// API v1 路由组
	// ─────────────────────────────────
	v1 := engine.Group("/api/v1")

	// 无需认证的接口
	user := v1.Group("/user")
	{
		user.POST("/register", userHandler.Register)
		user.POST("/login", userHandler.Login)
	}

	// 需要 JWT 认证的接口
	auth := v1.Group("")
	auth.Use(middleware.JWTAuth())
	{
		auth.GET("/user/profile", userHandler.GetProfile)
		auth.PUT("/user/profile", userHandler.UpdateProfile)
		auth.PUT("/user/password", userHandler.UpdatePassword)
		auth.POST("/user/logout", userHandler.Logout)
	}
}
