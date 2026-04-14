package handler

import (
	"errors"
	"net/http"
	"strconv"

	"payment-service/internal/model"
	"payment-service/internal/service"
	pkgresponse "payment-service/pkg/response"

	"github.com/gin-gonic/gin"
)

type PaymentHandler struct {
	paySvc *service.PaymentService
}

func NewPaymentHandler(paySvc *service.PaymentService) *PaymentHandler {
	return &PaymentHandler{paySvc: paySvc}
}

// GetRechargeTiers 充值档位
func (h *PaymentHandler) GetRechargeTiers(c *gin.Context) {
	pkgresponse.Success(c, h.paySvc.GetRechargeTiers())
}

// CreateRechargeOrder 创建充值订单
func (h *PaymentHandler) CreateRechargeOrder(c *gin.Context) {
	userID, _ := c.Get("user_id")
	yuan, _ := strconv.Atoi(c.PostForm("yuan"))
	channel := c.PostForm("channel")
	ip := c.ClientIP()
	deviceID := c.GetHeader("X-Device-ID")

	if yuan <= 0 || channel == "" {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "yuan and channel required")
		return
	}

	order, err := h.paySvc.CreateRechargeOrder(c.Request.Context(), userID.(int64), yuan, channel, ip, deviceID)
	if err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	pkgresponse.Success(c, order)
}

// CreateGiftOrder 创建礼包订单
func (h *PaymentHandler) CreateGiftOrder(c *gin.Context) {
	userID, _ := c.Get("user_id")
	giftKey := c.PostForm("gift_key")
	channel := c.PostForm("channel")
	ip := c.ClientIP()

	order, err := h.paySvc.CreateGiftOrder(c.Request.Context(), userID.(int64), giftKey, channel, ip, "")
	if err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	pkgresponse.Success(c, order)
}

// CreateMonthlyCardOrder 创建月卡订单
func (h *PaymentHandler) CreateMonthlyCardOrder(c *gin.Context) {
	userID, _ := c.Get("user_id")
	channel := c.PostForm("channel")
	ip := c.ClientIP()

	order, err := h.paySvc.CreateMonthlyCardOrder(c.Request.Context(), userID.(int64), channel, ip, "")
	if err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	pkgresponse.Success(c, order)
}

// PaymentCallback 支付回调
func (h *PaymentHandler) PaymentCallback(c *gin.Context) {
	var cb model.CallbackRequest
	if err := c.ShouldBindJSON(&cb); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	callback := &model.PaymentCallback{
		CallbackID:     cb.CallbackID,
		OrderNo:        cb.OrderNo,
		Channel:        cb.Channel,
	ChannelTradeNo: cb.ChannelTradeNo,
		RawData:        cb.RawData,
		Signature:      cb.Signature,
	}

	if err := h.paySvc.HandleCallback(c.Request.Context(), callback); err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}
	pkgresponse.Success(c, nil)
}

// GetOrder 订单详情
func (h *PaymentHandler) GetOrder(c *gin.Context) {
	orderNo := c.Param("orderNo")
	order, err := h.paySvc.GetOrder(c.Request.Context(), orderNo)
	if err != nil {
		if errors.Is(err, service.ErrOrderNotFound) {
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "订单不存在")
			return
		}
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}
	pkgresponse.Success(c, order)
}

// ListOrders 我的订单
func (h *PaymentHandler) ListOrders(c *gin.Context) {
	userID, _ := c.Get("user_id")
	status, _ := strconv.Atoi(c.DefaultQuery("status", "-1"))
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	orders, total, err := h.paySvc.ListUserOrders(c.Request.Context(), userID.(int64), int8(status), page, size)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}
	pkgresponse.Success(c, pkgresponse.PageData{Total: total, Page: page, Size: size, List: orders})
}

// GetMonthlyCard 月卡信息
func (h *PaymentHandler) GetMonthlyCard(c *gin.Context) {
	userID, _ := c.Get("user_id")
	card, err := h.paySvc.GetActiveMonthlyCard(c.Request.Context(), userID.(int64))
	if err != nil {
		pkgresponse.Success(c, nil)
		return
	}
	pkgresponse.Success(c, card)
}

// ClaimMonthlyDaily 月卡每日领取
func (h *PaymentHandler) ClaimMonthlyDaily(c *gin.Context) {
	userID, _ := c.Get("user_id")
	if err := h.paySvc.ClaimMonthlyDaily(c.Request.Context(), userID.(int64)); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	pkgresponse.SuccessWithMsg(c, "领取成功 +100💎", nil)
}

// GetVIPInfo VIP信息
func (h *PaymentHandler) GetVIPInfo(c *gin.Context) {
	userID, _ := c.Get("user_id")
	vip, err := h.paySvc.GetVIPInfo(c.Request.Context(), userID.(int64))
	if err != nil {
		pkgresponse.Success(c, nil)
		return
	}
	pkgresponse.Success(c, vip)
}

// ClaimVIPDaily VIP每日奖励
func (h *PaymentHandler) ClaimVIPDaily(c *gin.Context) {
	userID, _ := c.Get("user_id")
	if err := h.paySvc.ClaimVIPDaily(c.Request.Context(), userID.(int64)); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	pkgresponse.SuccessWithMsg(c, "VIP每日奖励已领取", nil)
}

// ListMilestones 成长基金里程碑
func (h *PaymentHandler) ListMilestones(c *gin.Context) {
	userID, _ := c.Get("user_id")
	orderNo := c.Query("order_no")
	if orderNo == "" {
		pkgresponse.Error(c, pkgresponse.CodeErrParam)
		return
	}
	ms, err := h.paySvc.ListMilestones(c.Request.Context(), userID.(int64), orderNo)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}
	pkgresponse.Success(c, ms)
}

// ClaimMilestone 领取里程碑
func (h *PaymentHandler) ClaimMilestone(c *gin.Context) {
	userID, _ := c.Get("user_id")
	orderNo := c.Query("order_no")
	level, _ := strconv.Atoi(c.Param("level"))
	if orderNo == "" || level <= 0 {
		pkgresponse.Error(c, pkgresponse.CodeErrParam)
		return
	}
	if err := h.paySvc.ClaimMilestone(c.Request.Context(), userID.(int64), orderNo, level); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	pkgresponse.SuccessWithMsg(c, "里程碑奖励已领取", nil)
}

// ListWalletLogs 钱包流水
func (h *PaymentHandler) ListWalletLogs(c *gin.Context) {
	userID, _ := c.Get("user_id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))
	logs, err := h.paySvc.ListWalletLogs(c.Request.Context(), userID.(int64), limit)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}
	pkgresponse.Success(c, logs)
}

// RequestRefund 申请退款
func (h *PaymentHandler) RequestRefund(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var req model.RefundRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	if err := h.paySvc.RequestRefund(c.Request.Context(), userID.(int64), &req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	pkgresponse.SuccessWithMsg(c, "退款申请已提交", nil)
}

func Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "payment-service"})
}
