package handler

import (
	"strconv"

	"user-service/internal/model"
	"user-service/internal/service"
	pkgresponse "user-service/pkg/response"

	"github.com/gin-gonic/gin"
)

// ServerHandler 区服 HTTP 处理器
type ServerHandler struct {
	serverSvc *service.ServerService
}

// NewServerHandler 创建 ServerHandler
func NewServerHandler(serverSvc *service.ServerService) *ServerHandler {
	return &ServerHandler{serverSvc: serverSvc}
}

// ListServers 获取区服列表
// @Summary 获取区服列表
// @Tags 区服
// @Produce json
// @Success 200 {object} pkgresponse.Response{data=[]model.Server}
// @Router /api/v1/servers [get]
func (h *ServerHandler) ListServers(c *gin.Context) {
	servers, err := h.serverSvc.ListAll(c.Request.Context())
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	pkgresponse.Success(c, gin.H{
		"servers": servers,
		"total":   len(servers),
	})
}

// ListRunningServers 获取可进入的区服
func (h *ServerHandler) ListRunningServers(c *gin.Context) {
	servers, err := h.serverSvc.ListRunning(c.Request.Context())
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	pkgresponse.Success(c, gin.H{
		"servers": servers,
		"total":   len(servers),
	})
}

// GetServer 获取区服详情
// @Summary 获取区服详情
// @Tags 区服
// @Produce json
// @Param id path int true "区服编号"
// @Security BearerAuth
// @Router /api/v1/servers/{id} [get]
func (h *ServerHandler) GetServer(c *gin.Context) {
	serverIDStr := c.Param("id")
	serverID, err := strconv.Atoi(serverIDStr)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrParam)
		return
	}

	// 可选: 获取当前用户ID
	var userID int64
	if uid, exists := c.Get("user_id"); exists {
		userID = uid.(int64)
	}

	detail, err := h.serverSvc.GetServerDetail(c.Request.Context(), serverID, userID)
	if err != nil {
		switch err {
		case service.ErrServerNotFound:
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "区服不存在")
		default:
			pkgresponse.Error(c, pkgresponse.CodeErrServer)
		}
		return
	}

	pkgresponse.Success(c, detail)
}

// CreateServer 创建新区服
// @Summary 创建新区服
// @Tags 区服
// @Accept json
// @Produce json
// @Param body body model.CreateServerRequest true "区服信息"
// @Router /api/v1/servers [post]
func (h *ServerHandler) CreateServer(c *gin.Context) {
	var req model.CreateServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	server, err := h.serverSvc.CreateServer(c.Request.Context(), &req)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	pkgresponse.Success(c, server)
}

// SelectServer 用户选择进入区服
// @Summary 选择区服
// @Tags 区服
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body model.SelectServerRequest true "区服编号"
// @Router /api/v1/servers/select [post]
func (h *ServerHandler) SelectServer(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		pkgresponse.Error(c, pkgresponse.CodeErrAuth)
		return
	}

	var req model.SelectServerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	server, err := h.serverSvc.SelectServer(c.Request.Context(), userID.(int64), req.ServerID)
	if err != nil {
		switch err {
		case service.ErrServerNotFound:
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "区服不存在")
		case service.ErrServerFull:
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "区服人数已满")
		case service.ErrServerMaintaining:
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "区服正在维护中")
		case service.ErrServerClosed:
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "区服已关闭")
		default:
			pkgresponse.Error(c, pkgresponse.CodeErrServer)
		}
		return
	}

	pkgresponse.Success(c, server)
}

// GetMyServers 获取我的区服列表
func (h *ServerHandler) GetMyServers(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		pkgresponse.Error(c, pkgresponse.CodeErrAuth)
		return
	}

	userServers, err := h.serverSvc.GetUserServers(c.Request.Context(), userID.(int64))
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	pkgresponse.Success(c, userServers)
}
