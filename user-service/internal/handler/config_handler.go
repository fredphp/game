package handler

import (
	"encoding/json"

	"user-service/internal/model"
	"user-service/internal/service"
	pkgresponse "user-service/pkg/response"

	"github.com/gin-gonic/gin"
)

// =============================================================================
// 客户端功能检测处理器 — 版本校验、功能开关、热更新检测
// =============================================================================

// ConfigHandler 配置检测处理器
type ConfigHandler struct {
	configSvc *service.ConfigService
}

// NewConfigHandler 创建配置检测处理器
func NewConfigHandler(configSvc *service.ConfigService) *ConfigHandler {
	return &ConfigHandler{configSvc: configSvc}
}

// CheckVersion 检查客户端版本
// @Summary 客户端版本检查
// @Description 检查客户端版本是否需要更新，返回最新版本信息和下载链接
// @Tags 配置检测
// @Accept json
// @Produce json
// @Param body body model.VersionCheckRequest true "版本检查请求"
// @Success 200 {object} pkgresponse.Response{data=model.VersionCheckResponse}
// @Router /api/v1/config/version/check [post]
func (h *ConfigHandler) CheckVersion(c *gin.Context) {
	var req model.VersionCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	resp, err := h.configSvc.CheckVersion(c.Request.Context(), &req)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	// 异步记录审计日志
	checkResult := int8(0)
	if resp.ForceUpdate {
		checkResult = 2
	} else if resp.NeedUpdate {
		checkResult = 1
	}
	h.recordAuditLog(c, "version", req.Platform, req.VersionCode, "", checkResult)

	pkgresponse.Success(c, resp)
}

// GetFeatureFlags 获取功能开关列表
// @Summary 获取功能开关
// @Description 根据客户端平台、版本、用户信息获取适用的功能开关列表
// @Tags 配置检测
// @Accept json
// @Produce json
// @Param body body model.FeatureFlagsRequest true "功能开关请求"
// @Success 200 {object} pkgresponse.Response{data=[]model.FeatureFlagItem}
// @Router /api/v1/config/features [post]
func (h *ConfigHandler) GetFeatureFlags(c *gin.Context) {
	var req model.FeatureFlagsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	flags, err := h.configSvc.GetFeatureFlags(c.Request.Context(), &req)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	pkgresponse.Success(c, flags)
}

// CheckHotUpdate 检查热更新
// @Summary 热更新检查
// @Description 检查是否有可用的热更新资源，返回更新清单信息
// @Tags 配置检测
// @Accept json
// @Produce json
// @Param body body model.HotUpdateCheckRequest true "热更新检查请求"
// @Success 200 {object} pkgresponse.Response{data=model.HotUpdateCheckResponse}
// @Router /api/v1/config/hotupdate/check [post]
func (h *ConfigHandler) CheckHotUpdate(c *gin.Context) {
	var req model.HotUpdateCheckRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	resp, err := h.configSvc.CheckHotUpdate(c.Request.Context(), &req)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	// 异步记录审计日志
	checkResult := int8(0)
	if resp.HasUpdate {
		if resp.ForceUpdate {
			checkResult = 2
		} else {
			checkResult = 1
		}
	}
	h.recordAuditLog(c, "hotupdate", req.Platform, req.AppVersion, req.ResourceVersion, checkResult)

	pkgresponse.Success(c, resp)
}

// recordAuditLog 异步记录审计日志（不影响主请求响应时间）
func (h *ConfigHandler) recordAuditLog(c *gin.Context, checkType, platform, appVersion, resourceVersion string, checkResult int8) {
	go func() {
		// 提取用户ID（可选，未登录时为 nil）
		userID, _ := c.Get("user_id")
		var uid *int64
		if userID != nil {
			id := userID.(int64)
			uid = &id
		}

		// 构造详情 JSON
		detail, _ := json.Marshal(map[string]interface{}{
			"path":     c.Request.URL.Path,
			"platform": platform,
		})

		log := &model.ClientAuditLog{
			UserID:          uid,
			Platform:        platform,
			AppVersion:      appVersion,
			ResourceVersion: resourceVersion,
			DeviceID:        c.GetHeader("X-Device-ID"),
			OSVersion:       c.GetHeader("X-OS-Version"),
			CheckType:       checkType,
			CheckResult:     checkResult,
			Detail:          string(detail),
			IPAddress:       c.ClientIP(),
		}
		_ = h.configSvc.RecordAuditLog(log)
	}()
}
