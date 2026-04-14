// Package middleware 提供九州争鼎后台管理服务的HTTP中间件。
// 包括: JWT认证、RBAC权限检查、请求日志、CORS等。
package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// JWTClaims 自定义JWT载荷，嵌入标准RegisteredClaims
type JWTClaims struct {
	UserID   int64  `json:"userId"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// JWTAuth JWT认证中间件
// 从Authorization header中提取Bearer token并验证
// 验证成功后将userId和username注入gin.Context
func JWTAuth(secret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "未授权"})
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || parts[0] != "Bearer" {
			c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "token格式错误"})
			c.Abort()
			return
		}

		tokenStr := parts[1]
		token, err := jwt.ParseWithClaims(tokenStr, &JWTClaims{}, func(t *jwt.Token) (interface{}, error) {
			if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return []byte(secret), nil
		})
		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "token无效或已过期"})
			c.Abort()
			return
		}

		claims, ok := token.Claims.(*JWTClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"code": 401, "message": "token解析失败"})
			c.Abort()
			return
		}

		// 将用户信息注入上下文，供后续handler使用
		c.Set("userId", claims.UserID)
		c.Set("username", claims.Username)
		c.Next()
	}
}

// RBACCheck RBAC权限检查中间件
// permission: 需要的权限code
// 生产环境中应查询数据库验证用户是否拥有该权限
func RBACCheck(permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// TODO: 生产环境实现
		// 1. 从c.GetInt64("userId")获取当前操作者
		// 2. 查询admin_user_role和admin_role_permission获取权限列表
		// 3. 检查是否包含所需permission
		//
		// permissions := dao.GetUserPermissions(c.GetInt64("userId"))
		// if !contains(permissions, permission) {
		//     c.JSON(http.StatusForbidden, gin.H{"code": 403, "message": "无权限"})
		//     c.Abort()
		//     return
		// }
		c.Next()
	}
}

// CORS 跨域中间件
func CORS() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// contains 检查字符串切片中是否包含目标值
func contains(slice []string, target string) bool {
	for _, s := range slice {
		if s == target {
			return true
		}
	}
	return false
}
