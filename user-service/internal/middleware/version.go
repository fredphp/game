package middleware

import (
	"user-service/internal/model"
	"user-service/internal/service"
	pkgresponse "user-service/pkg/response"

	"github.com/gin-gonic/gin"
)

// =============================================================================
// 客户端版本检查 & 功能开关中间件
// =============================================================================

// configSvc 全局配置服务实例（由 InitConfigService 初始化）
var configSvc *service.ConfigService

// InitConfigService 初始化配置服务
// 在 main.go 中调用: middleware.InitConfigService()
func InitConfigService() {
	configSvc = service.NewConfigService()
}

// VersionCheck 客户端版本检查中间件
// 通过请求头 X-Platform 和 X-Client-Version 识别客户端版本。
// 如果版本低于最低支持版本，直接拒绝请求并返回更新信息。
// 注意：如果没有版本信息头（旧客户端），不会阻断（兼容策略）。
func VersionCheck() gin.HandlerFunc {
	return func(c *gin.Context) {
		platform := c.GetHeader("X-Platform")
		version := c.GetHeader("X-Client-Version")

		// 没有版本信息头 —— 兼容旧客户端，不阻断
		if platform == "" || version == "" {
			c.Next()
			return
		}

		// 验证平台合法性
		validPlatforms := map[string]bool{
			"android": true,
			"ios":     true,
			"windows": true,
		}
		if !validPlatforms[platform] {
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "不支持的客户端平台")
			c.Abort()
			return
		}

		// 查询版本配置
		if configSvc != nil {
			req := &model.VersionCheckRequest{
				Platform:    platform,
				VersionCode: version,
			}
			resp, err := configSvc.CheckVersion(c.Request.Context(), req)
			if err == nil && resp.ForceUpdate {
				// 版本过低，强制更新
				pkgresponse.ErrorWithData(c, pkgresponse.CodeErrServer,
					"客户端版本过低，请更新到最新版本",
					gin.H{
						"force_update":       true,
						"latest_version":     resp.LatestVersion,
						"download_url":       resp.DownloadURL,
						"update_description": resp.UpdateDescription,
						"update_title":       resp.UpdateTitle,
						"min_version":        resp.MinSupportedVersion,
					})
				c.Abort()
				return
			}
		}

		// 将版本信息注入上下文，供后续 FeatureGate 等中间件使用
		c.Set("client_platform", platform)
		c.Set("client_version", version)

		c.Next()
	}
}

// FeatureGate 功能开关中间件
// 在路由级别保护特定功能：如果该功能对当前用户/客户端未启用，则拒绝请求。
// 使用示例: router.Use(middleware.FeatureGate("battle_pvp_mode"))
func FeatureGate(flagKey string) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 配置服务未初始化时放行
		if configSvc == nil {
			c.Next()
			return
		}

		// 从上下文获取客户端信息（由 VersionCheck 中间件注入）
		platform, _ := c.Get("client_platform")
		version, _ := c.Get("client_version")
		userID, _ := c.Get("user_id")
		vipLevel, _ := c.Get("vip_level")

		pStr := ""
		vStr := ""
		var uid int64
		var vip int

		if platform != nil {
			pStr = platform.(string)
		}
		if version != nil {
			vStr = version.(string)
		}
		if userID != nil {
			uid = userID.(int64)
		}
		if vipLevel != nil {
			vip = vipLevel.(int)
		}

		// 检查功能是否启用
		enabled := configSvc.IsFeatureEnabled(
			c.Request.Context(),
			flagKey, pStr, vStr, uid, vip, 0,
		)

		if !enabled {
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrServer,
				"该功能暂未开放，敬请期待")
			c.Abort()
			return
		}

		c.Next()
	}
}
