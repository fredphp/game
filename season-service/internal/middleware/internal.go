package middleware

import (
	"os"
	"strings"

	pkgresponse "season-service/pkg/response"

	"github.com/gin-gonic/gin"
)

// InternalAuth 内部服务间调用的 API Key 认证中间件
func InternalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		apiKey := os.Getenv("INTERNAL_API_KEY")
		if apiKey == "" {
			apiKey = "season-service-internal-key-2024"
		}

		clientKey := c.GetHeader("X-Internal-Api-Key")
		if clientKey == "" {
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrAuth, "缺少内部服务认证头 X-Internal-Api-Key")
			c.Abort()
			return
		}

		if !strings.EqualFold(clientKey, apiKey) {
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrAuth, "内部服务认证失败: API Key 无效")
			c.Abort()
			return
		}

		caller := c.GetHeader("X-Caller-Service")
		if caller != "" {
			c.Set("caller_service", caller)
		}

		c.Next()
	}
}
