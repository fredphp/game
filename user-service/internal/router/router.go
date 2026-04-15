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
        internalHandler *handler.InternalHandler,
        serverHandler *handler.ServerHandler,
        configHandler *handler.ConfigHandler,
) {
        // ─────────────────────────────────
        // 全局中间件
        // ─────────────────────────────────
        engine.Use(
                middleware.CORS(),
                middleware.Recovery(),
                gin.Logger(),
                middleware.VersionCheck(), // 客户端版本检查（通过请求头 X-Platform + X-Client-Version）
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

        // ─────────────────────────────────
        // 区服路由
        // ─────────────────────────────────
        servers := v1.Group("/servers")
        {
                servers.GET("", serverHandler.ListServers)                // 区服列表
                servers.GET("/running", serverHandler.ListRunningServers) // 可进入的区服
                servers.GET("/:id", serverHandler.GetServer)              // 区服详情
        }

        authServers := v1.Group("/servers")
        authServers.Use(middleware.JWTAuth())
        {
                authServers.POST("/select", serverHandler.SelectServer) // 选择区服
                authServers.GET("/my", serverHandler.GetMyServers)      // 我的区服
        }

        // ─────────────────────────────────
        // 配置检测路由（无需认证）
        // ─────────────────────────────────
        config := v1.Group("/config")
        {
                config.POST("/version/check", configHandler.CheckVersion)   // 版本检查
                config.POST("/features", configHandler.GetFeatureFlags)       // 功能开关列表
                config.POST("/hotupdate/check", configHandler.CheckHotUpdate) // 热更新检查
        }

        // ─────────────────────────────────
        // 内部服务间调用 API（Internal API Key 认证）
        // ─────────────────────────────────
        internal := engine.Group("/internal/user")
        internal.Use(middleware.InternalAuth())
        {
                internal.POST("/deduct-diamonds", internalHandler.DeductDiamonds)
                internal.POST("/add-diamonds", internalHandler.AddDiamonds)
                internal.POST("/deduct-gold", internalHandler.DeductGold)
                internal.POST("/add-gold", internalHandler.AddGold)
                internal.POST("/add-exp", internalHandler.AddExp)
                internal.POST("/deduct-food", internalHandler.DeductFood)
                internal.POST("/add-food", internalHandler.AddFood)
                internal.GET("/balance", internalHandler.GetBalance)
                internal.POST("/update-vip", internalHandler.UpdateVIP)
        }
}
