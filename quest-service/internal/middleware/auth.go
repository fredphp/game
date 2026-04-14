package middleware

import (
	"strings"

	jwtPkg "quest-service/pkg/jwt"
	pkgresponse "quest-service/pkg/response"

	"github.com/gin-gonic/gin"
)

// JWTAuth JWT 认证中间件
func JWTAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取 Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			pkgresponse.Error(c, pkgresponse.CodeErrAuth)
			c.Abort()
			return
		}

		// 检查 Bearer 前缀
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrAuth, "Authorization格式错误，应为 Bearer {token}")
			c.Abort()
			return
		}

		tokenStr := parts[1]

		// 检查 Token 是否在黑名单中
		if jwtPkg.IsTokenBlacklisted == nil {
			pkgresponse.Error(c, pkgresponse.CodeErrServer)
			c.Abort()
			return
		}

		// 解析 Token
		claims, err := jwtPkg.ParseToken(tokenStr)
		if err != nil {
			switch err {
			case jwtPkg.ErrExpiredToken:
				pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrToken, "Token已过期，请重新登录")
			default:
				pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrToken, "无效Token")
			}
			c.Abort()
			return
		}

		// 将用户信息注入上下文
		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("vip_level", claims.VIPLevel)

		c.Next()
	}
}

// CORS 跨域中间件
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, X-Token")
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
