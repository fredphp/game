package handler

import (
	"strconv"

	"season-service/internal/model"
	"season-service/internal/service"
	pkgresponse "season-service/pkg/response"

	"github.com/gin-gonic/gin"
)

// SeasonInternalHandler 赛季内部服务处理器（管理端、服务间调用）
type SeasonInternalHandler struct {
	seasonSvc *service.SeasonService
}

// NewSeasonInternalHandler 创建 SeasonInternalHandler
func NewSeasonInternalHandler(svc *service.SeasonService) *SeasonInternalHandler {
	return &SeasonInternalHandler{seasonSvc: svc}
}

// CreateReward 创建奖励配置
func (h *SeasonInternalHandler) CreateReward(c *gin.Context) {
	var req model.CreateRewardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "参数错误: "+err.Error())
		return
	}

	reward, err := h.seasonSvc.CreateReward(c.Request.Context(), &req)
	if err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrSeason, err.Error())
		return
	}

	pkgresponse.Success(c, reward)
}

// ListRewards 获取奖励配置
func (h *SeasonInternalHandler) ListRewards(c *gin.Context) {
	seasonNum, _ := strconv.Atoi(c.DefaultQuery("season_num", "0"))

	rewards, err := h.seasonSvc.ListRewards(c.Request.Context(), seasonNum)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	pkgresponse.Success(c, rewards)
}

// DeleteReward 删除奖励配置
func (h *SeasonInternalHandler) DeleteReward(c *gin.Context) {
	rewardID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrParam)
		return
	}

	err = h.seasonSvc.DeleteReward(c.Request.Context(), rewardID)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	pkgresponse.SuccessWithMsg(c, "删除成功", nil)
}

// ForceEndSeason 强制结束赛季（管理端使用）
func (h *SeasonInternalHandler) ForceEndSeason(c *gin.Context) {
	seasonID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrParam)
		return
	}

	// 先准备结算
	err = h.seasonSvc.PrepareSettlement(c.Request.Context(), seasonID)
	if err != nil {
		switch err {
		case service.ErrSeasonNotFound:
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrSeason, "赛季不存在")
		case service.ErrSeasonBusy:
			pkgresponse.Error(c, pkgresponse.CodeErrSeasonBusy)
		default:
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrSeason, err.Error())
		}
		return
	}

	pkgresponse.SuccessWithMsg(c, "赛季已强制进入结算流程", nil)
}

// GetSeasonStats 获取赛季统计（管理端使用）
func (h *SeasonInternalHandler) GetSeasonStats(c *gin.Context) {
	seasonID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrParam)
		return
	}

	detail, err := h.seasonSvc.GetSeasonDetail(c.Request.Context(), seasonID)
	if err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrSeason, "赛季不存在")
		return
	}

	pkgresponse.Success(c, gin.H{
		"season":         detail,
		"status_text":    detail.StatusText,
		"remain_days":    detail.RemainDays,
		"guild_rankings": detail.GuildRankings,
	})
}
