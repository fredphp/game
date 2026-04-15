package middleware

import (
	"os"
	"strings"

	pkgresponse "user-service/pkg/response"

	"github.com/gin-gonic/gin"
)

// InternalAuth 内部服务间调用的 API Key 认证中间件
// 通过 X-Internal-Api-Key 请求头传递密钥
func InternalAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 从环境变量或配置中读取内部 API Key
		apiKey := os.Getenv("INTERNAL_API_KEY")
		if apiKey == "" {
			// 默认密钥（生产环境应通过环境变量覆盖）
			apiKey = "user-service-internal-key-2024"
		}

		// 从请求头获取 API Key
		clientKey := c.GetHeader("X-Internal-Api-Key")
		if clientKey == "" {
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrAuth, "缺少内部服务认证头 X-Internal-Api-Key")
			c.Abort()
			return
		}

		// 校验 API Key
		if !strings.EqualFold(clientKey, apiKey) {
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrAuth, "内部服务认证失败: API Key 无效")
			c.Abort()
			return
		}

		// 记录调用来源（可选）
		caller := c.GetHeader("X-Caller-Service")
		if caller != "" {
			c.Set("caller_service", caller)
		}

		c.Next()
	}
}
