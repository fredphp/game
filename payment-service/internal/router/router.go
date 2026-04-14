package router

import (
	"payment-service/internal/handler"
	"payment-service/internal/middleware"

	"github.com/gin-gonic/gin"
)

func Setup(engine *gin.Engine, h *handler.PaymentHandler) {
	engine.Use(middleware.CORS(), gin.Recovery(), gin.Logger())
	engine.GET("/health", handler.Health)

	v1 := engine.Group("/api/v1")
	{
		v1.GET("/pay/tiers", h.GetRechargeTiers)              // 充值档位

		// 支付回调（由支付平台调用，无需JWT）
		v1.POST("/pay/callback", h.PaymentCallback)

		// ===== 鉴权接口 =====
		auth := v1.Group("")
		auth.Use(middleware.JWTAuth())
		{
			// 订单
			auth.POST("/pay/recharge", h.CreateRechargeOrder)    // 创建充值订单
			auth.POST("/pay/gift", h.CreateGiftOrder)              // 创建礼包订单
			auth.POST("/pay/monthly", h.CreateMonthlyCardOrder)    // 创建月卡订单
			auth.GET("/pay/order/:orderNo", h.GetOrder)            // 订单详情
			auth.GET("/pay/orders", h.ListOrders)                   // 我的订单
			auth.POST("/pay/refund", h.RequestRefund)              // 申请退款

			// 月卡
			auth.GET("/pay/monthly", h.GetMonthlyCard)             // 月卡信息
			auth.POST("/pay/monthly/claim", h.ClaimMonthlyDaily)     // 每日领取

			// VIP
			auth.GET("/pay/vip", h.GetVIPInfo)                    // VIP信息
			auth.POST("/pay/vip/claim", h.ClaimVIPDaily)            // VIP每日奖励

			// 成长基金
			auth.GET("/pay/milestones", h.ListMilestones)          // 里程碑列表
			auth.POST("/pay/milestone/:level/claim", h.ClaimMilestone) // 领取里程碑

			// 钱包
			auth.GET("/pay/wallet/logs", h.ListWalletLogs)         // 钱包流水
		}
	}
}
