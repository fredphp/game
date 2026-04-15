package handler

import (
	"strconv"

	"user-service/internal/model"
	"user-service/internal/service"
	pkgresponse "user-service/pkg/response"

	"github.com/gin-gonic/gin"
)

// InternalHandler 内部服务间调用的 HTTP 处理器
type InternalHandler struct {
	internalSvc *service.InternalService
}

// NewInternalHandler 创建 InternalHandler
func NewInternalHandler(internalSvc *service.InternalService) *InternalHandler {
	return &InternalHandler{internalSvc: internalSvc}
}

// ──────────────────────────────────────
// 钻石操作
// ──────────────────────────────────────

// DeductDiamonds 扣除钻石
// @Summary 扣除钻石（内部接口）
// @Description 供其他微服务调用，扣除用户钻石（带余额校验）
// @Tags 内部接口
// @Accept json
// @Produce json
// @Param body body model.InternalDeductRequest true "扣除请求"
// @Success 200 {object} pkgresponse.Response
// @Router /internal/user/deduct-diamonds [post]
func (h *InternalHandler) DeductDiamonds(c *gin.Context) {
	var req model.InternalDeductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	if err := h.internalSvc.DeductDiamonds(c.Request.Context(), req.UserID, req.Amount, req.Reason); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrServer, err.Error())
		return
	}

	pkgresponse.Success(c, gin.H{
		"user_id": req.UserID,
		"amount":  req.Amount,
		"reason":  req.Reason,
	})
}

// AddDiamonds 增加钻石
// @Summary 增加钻石（内部接口）
// @Description 供其他微服务调用，增加用户钻石
// @Tags 内部接口
// @Accept json
// @Produce json
// @Param body body model.InternalAddRequest true "增加请求"
// @Success 200 {object} pkgresponse.Response
// @Router /internal/user/add-diamonds [post]
func (h *InternalHandler) AddDiamonds(c *gin.Context) {
	var req model.InternalAddRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	if err := h.internalSvc.AddDiamonds(c.Request.Context(), req.UserID, req.Amount, req.Reason); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrServer, err.Error())
		return
	}

	pkgresponse.Success(c, gin.H{
		"user_id": req.UserID,
		"amount":  req.Amount,
		"reason":  req.Reason,
	})
}

// ──────────────────────────────────────
// 金币操作
// ──────────────────────────────────────

// DeductGold 扣除金币
// @Summary 扣除金币（内部接口）
// @Description 供其他微服务调用，扣除用户金币（带余额校验）
// @Tags 内部接口
// @Accept json
// @Produce json
// @Param body body model.InternalDeductRequest true "扣除请求"
// @Success 200 {object} pkgresponse.Response
// @Router /internal/user/deduct-gold [post]
func (h *InternalHandler) DeductGold(c *gin.Context) {
	var req model.InternalDeductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	if err := h.internalSvc.DeductGold(c.Request.Context(), req.UserID, req.Amount, req.Reason); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrServer, err.Error())
		return
	}

	pkgresponse.Success(c, gin.H{
		"user_id": req.UserID,
		"amount":  req.Amount,
		"reason":  req.Reason,
	})
}

// AddGold 增加金币
// @Summary 增加金币（内部接口）
// @Description 供其他微服务调用，增加用户金币
// @Tags 内部接口
// @Accept json
// @Produce json
// @Param body body model.InternalAddRequest true "增加请求"
// @Success 200 {object} pkgresponse.Response
// @Router /internal/user/add-gold [post]
func (h *InternalHandler) AddGold(c *gin.Context) {
	var req model.InternalAddRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	if err := h.internalSvc.AddGold(c.Request.Context(), req.UserID, req.Amount, req.Reason); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrServer, err.Error())
		return
	}

	pkgresponse.Success(c, gin.H{
		"user_id": req.UserID,
		"amount":  req.Amount,
		"reason":  req.Reason,
	})
}

// ──────────────────────────────────────
// 经验操作
// ──────────────────────────────────────

// AddExp 增加经验（自动升级）
// @Summary 增加经验（内部接口）
// @Description 供其他微服务调用，增加用户经验并自动处理升级
// @Tags 内部接口
// @Accept json
// @Produce json
// @Param body body model.InternalAddExpRequest true "增加经验请求"
// @Success 200 {object} pkgresponse.Response{data=model.InternalAddExpResponse}
// @Router /internal/user/add-exp [post]
func (h *InternalHandler) AddExp(c *gin.Context) {
	var req model.InternalAddExpRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	resp, err := h.internalSvc.AddExpWithLevelUp(c.Request.Context(), req.UserID, req.Amount)
	if err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrServer, err.Error())
		return
	}

	pkgresponse.Success(c, resp)
}

// ──────────────────────────────────────
// 粮食操作
// ──────────────────────────────────────

// DeductFood 扣除粮食
// @Summary 扣除粮食（内部接口）
// @Description 供其他微服务调用，扣除用户粮食（带余额校验）
// @Tags 内部接口
// @Accept json
// @Produce json
// @Param body body model.InternalDeductRequest true "扣除请求"
// @Success 200 {object} pkgresponse.Response
// @Router /internal/user/deduct-food [post]
func (h *InternalHandler) DeductFood(c *gin.Context) {
	var req model.InternalDeductRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	if err := h.internalSvc.DeductFood(c.Request.Context(), req.UserID, req.Amount); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrServer, err.Error())
		return
	}

	pkgresponse.Success(c, gin.H{
		"user_id": req.UserID,
		"amount":  req.Amount,
	})
}

// AddFood 增加粮食
// @Summary 增加粮食（内部接口）
// @Description 供其他微服务调用，增加用户粮食
// @Tags 内部接口
// @Accept json
// @Produce json
// @Param body body model.InternalAddRequest true "增加请求"
// @Success 200 {object} pkgresponse.Response
// @Router /internal/user/add-food [post]
func (h *InternalHandler) AddFood(c *gin.Context) {
	var req model.InternalAddRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	if err := h.internalSvc.AddFood(c.Request.Context(), req.UserID, req.Amount); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrServer, err.Error())
		return
	}

	pkgresponse.Success(c, gin.H{
		"user_id": req.UserID,
		"amount":  req.Amount,
	})
}

// ──────────────────────────────────────
// 余额查询
// ──────────────────────────────────────

// GetBalance 查询用户资源余额
// @Summary 查询用户余额（内部接口）
// @Description 供其他微服务调用，查询用户的金币、钻石、粮食、等级等余额信息
// @Tags 内部接口
// @Produce json
// @Param user_id query int true "用户ID"
// @Success 200 {object} pkgresponse.Response{data=model.InternalBalanceResponse}
// @Router /internal/user/balance [get]
func (h *InternalHandler) GetBalance(c *gin.Context) {
	userIDStr := c.Query("user_id")
	if userIDStr == "" {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "缺少 user_id 参数")
		return
	}

	userID, err := strconv.ParseInt(userIDStr, 10, 64)
	if err != nil || userID <= 0 {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "user_id 参数格式错误")
		return
	}

	balance, err := h.internalSvc.GetBalance(c.Request.Context(), userID)
	if err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrServer, err.Error())
		return
	}

	pkgresponse.Success(c, balance)
}

// ──────────────────────────────────────
// VIP 操作
// ──────────────────────────────────────

// UpdateVIP 更新VIP等级
// @Summary 更新VIP等级（内部接口）
// @Description 供其他微服务调用，更新用户VIP等级
// @Tags 内部接口
// @Accept json
// @Produce json
// @Param body body model.InternalUpdateVIPRequest true "VIP更新请求"
// @Success 200 {object} pkgresponse.Response
// @Router /internal/user/update-vip [post]
func (h *InternalHandler) UpdateVIP(c *gin.Context) {
	var req model.InternalUpdateVIPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	if err := h.internalSvc.UpdateVIP(c.Request.Context(), req.UserID, req.VIPLevel); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrServer, err.Error())
		return
	}

	pkgresponse.Success(c, gin.H{
		"user_id":   req.UserID,
		"vip_level": req.VIPLevel,
	})
}
