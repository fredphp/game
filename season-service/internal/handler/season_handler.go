package handler

import (
	"strconv"

	"season-service/internal/model"
	"season-service/internal/service"
	pkgresponse "season-service/pkg/response"

	"github.com/gin-gonic/gin"
)

// SeasonHandler 赛季 HTTP 处理器
type SeasonHandler struct {
	seasonSvc *service.SeasonService
}

// NewSeasonHandler 创建 SeasonHandler
func NewSeasonHandler(svc *service.SeasonService) *SeasonHandler {
	return &SeasonHandler{seasonSvc: svc}
}

// Health 健康检查
func Health(c *gin.Context) {
	pkgresponse.Success(c, gin.H{
		"service": "season-service",
		"status":  "ok",
	})
}

// CreateSeason 创建赛季
func (h *SeasonHandler) CreateSeason(c *gin.Context) {
	var req model.CreateSeasonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "参数错误: "+err.Error())
		return
	}

	season, err := h.seasonSvc.CreateSeason(c.Request.Context(), &req)
	if err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrSeason, err.Error())
		return
	}

	pkgresponse.Success(c, season)
}

// StartSeason 启动赛季
func (h *SeasonHandler) StartSeason(c *gin.Context) {
	seasonID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrParam)
		return
	}

	season, err := h.seasonSvc.StartSeason(c.Request.Context(), seasonID)
	if err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrSeason, err.Error())
		return
	}

	pkgresponse.Success(c, season)
}

// GetSeason 获取赛季详情
func (h *SeasonHandler) GetSeason(c *gin.Context) {
	seasonID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrParam)
		return
	}

	detail, err := h.seasonSvc.GetSeasonDetail(c.Request.Context(), seasonID)
	if err != nil {
		if err == service.ErrSeasonNotFound {
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrSeason, "赛季不存在")
			return
		}
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	pkgresponse.Success(c, detail)
}

// ListSeasons 获取赛季列表
func (h *SeasonHandler) ListSeasons(c *gin.Context) {
	var req model.SeasonListRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "参数错误: "+err.Error())
		return
	}
	if req.Page <= 0 {
		req.Page = 1
	}
	if req.PageSize <= 0 {
		req.PageSize = 20
	}

	data, err := h.seasonSvc.ListSeasons(c.Request.Context(), &req)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	pkgresponse.Success(c, data)
}

// GetCurrentSeason 获取当前赛季倒计时
func (h *SeasonHandler) GetCurrentSeason(c *gin.Context) {
	serverID, _ := strconv.ParseInt(c.DefaultQuery("server_id", "0"), 10, 64)

	countdown, err := h.seasonSvc.GetCurrentSeason(c.Request.Context(), serverID)
	if err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrSeason, "当前无活跃赛季")
		return
	}

	pkgresponse.Success(c, countdown)
}

// ListRankings 获取赛季排名
func (h *SeasonHandler) ListRankings(c *gin.Context) {
	seasonID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrParam)
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	data, err := h.seasonSvc.ListRankings(c.Request.Context(), seasonID, page, pageSize)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	pkgresponse.Success(c, data)
}

// ListRewardLogs 获取奖励发放记录
func (h *SeasonHandler) ListRewardLogs(c *gin.Context) {
	seasonID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrParam)
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	if page <= 0 {
		page = 1
	}
	if pageSize <= 0 || pageSize > 100 {
		pageSize = 20
	}

	data, err := h.seasonSvc.ListRewardLogs(c.Request.Context(), seasonID, page, pageSize)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	pkgresponse.Success(c, data)
}

// SettleSeason 手动结算赛季
func (h *SeasonHandler) SettleSeason(c *gin.Context) {
	var req model.SettleSeasonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "参数错误: "+err.Error())
		return
	}

	err := h.seasonSvc.PrepareSettlement(c.Request.Context(), req.SeasonID)
	if err != nil {
		switch err {
		case service.ErrSeasonNotFound:
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrSeason, "赛季不存在")
		case service.ErrSeasonBusy:
			pkgresponse.Error(c, pkgresponse.CodeErrSeasonBusy)
		case service.ErrSeasonInvalid:
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrSeason, "赛季状态无效，只有进行中或即将结束的赛季可以结算")
		default:
			pkgresponse.Error(c, pkgresponse.CodeErrServer)
		}
		return
	}

	pkgresponse.SuccessWithMsg(c, "赛季已进入结算状态", nil)
}
