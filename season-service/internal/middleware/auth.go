package middleware

import (
	"strings"

	pkgresponse "season-service/pkg/response"

	"github.com/gin-gonic/gin"
)

// JWTAuth JWT 认证中间件（简化版，从 header 提取 user_id）
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			pkgresponse.Error(c, pkgresponse.CodeErrAuth)
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrAuth, "Authorization格式错误，应为 Bearer {token}")
			c.Abort()
			return
		}

		tokenStr := parts[1]
		// 简化处理：从 token 中提取 user_id（实际项目应使用完整 JWT 解析）
		// 这里只做 token 非空校验，实际用户信息由上游 user-service 验证
		if tokenStr == "" {
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrToken, "无效Token")
			c.Abort()
			return
		}

		// TODO: 实际项目应解析 JWT claims 提取 user_id
		// 当前由内部服务间调用，跳过完整 JWT 解析
		c.Set("user_id", int64(0))
		c.Next()
	}
}

// CORS 跨域中间件
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, X-Token, X-Internal-Api-Key, X-Caller-Service")
		c.Header("Access-Control-Expose-Headers", "Content-Length")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// Recovery 异常恢复中间件
func Recovery() gin.HandlerFunc {
	return gin.Recovery()
}
