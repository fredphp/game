package model

import (
	"database/sql"
	"encoding/json"
	"time"
)

// ================================================================
// 商品类型
// ================================================================
const (
	ProductDiamond   = 1 // 钻石充值
	ProductMonthlyCard = 2 // 月卡
	ProductGiftPack   = 3 // 礼包
	ProductVIPPack    = 4 // VIP礼包
)

// ================================================================
// 订单状态机
// ================================================================
// 状态流转:  Pending → Paid → Delivered → (终态)
//             Pending → Closed(超时/取消)
//             Delivered → Refunded
const (
	OrderPending   = 0 // 待支付
	OrderPaid      = 1 // 已支付（待发货）
	OrderDelivered = 2 // 已发货
	OrderClosed    = 3 // 已关闭
	OrderRefunded  = 4 // 已退款
)

// 支持的状态转换
var ValidTransitions = map[int8][]int8{
	OrderPending:   {OrderPaid, OrderClosed},
	OrderPaid:      {OrderDelivered, OrderRefunded},
	OrderDelivered: {OrderRefunded},
}

// ================================================================
// 回调状态
// ================================================================
const (
	CallbackPending  = 0
	CallbackSuccess  = 1
	CallbackFailed   = 2
)

// ================================================================
// 充值订单
// ================================================================
type PaymentOrder struct {
	ID             int64          `json:"id"`
	OrderNo        string         `json:"order_no"`
	UserID         int64          `json:"user_id"`
	ProductType    int8           `json:"product_type"`
	ProductKey     string         `json:"product_key"`
	ProductName    string         `json:"product_name"`
	Amount         int            `json:"amount"`
	AmountYuan     float64        `json:"amount_yuan"`
	Currency       string         `json:"currency"`
	Channel        string         `json:"channel"`
	ChannelTradeNo string         `json:"channel_trade_no"`
	Status         int8           `json:"status"`
	IP             string         `json:"ip"`
	DeviceID       string         `json:"device_id"`
	PaidAt         sql.NullTime   `json:"paid_at,omitempty"`
	DeliveredAt    sql.NullTime   `json:"delivered_at,omitempty"`
	ClosedAt       sql.NullTime   `json:"closed_at,omitempty"`
	ExpireAt       time.Time      `json:"expire_at"`
	RetryCount     int8           `json:"retry_count"`
	CreatedAt      time.Time      `json:"created_at"`
}

// ================================================================
// 支付回调日志
// ================================================================
type PaymentCallback struct {
	ID           int64     `json:"id"`
	CallbackID   string    `json:"callback_id"`
	OrderNo      string    `json:"order_no"`
	Channel      string    `json:"channel"`
	RawData      string    `json:"raw_data"`
	Signature    string    `json:"signature"`
	Status       int8      `json:"status"`
	RetryCount   int8      `json:"retry_count"`
	ProcessedAt  sql.NullTime `json:"processed_at"`
	ErrorMsg    string    `json:"error_msg"`
	CreatedAt    time.Time `json:"created_at"`
}

// ================================================================
// 月卡
// ================================================================
type UserMonthlyCard struct {
	ID            int64     `json:"id"`
	UserID        int64     `json:"user_id"`
	OrderNo       string    `json:"order_no"`
	StartDate     string    `json:"start_date"`
	EndDate      string    `json:"end_date"`
	Status        int8      `json:"status"`
	TotalDays     int       `json:"total_days"`
	ClaimedDays   int       `json:"claimed_days"`
	LastClaimDate sql.NullString `json:"last_claim_date"`
	CreatedAt     time.Time `json:"created_at"`
}

// ================================================================
// 礼包购买
// ================================================================
type UserGiftPurchase struct {
	ID            int64     `json:"id"`
	UserID        int64     `json:"user_id"`
	GiftKey       string    `json:"gift_key"`
	OrderNo       string    `json:"order_no"`
	PurchaseTime  time.Time `json:"purchase_time"`
	ResetNext     sql.NullTime `json:"reset_next"`
	CreatedAt     time.Time `json:"created_at"`
}

// ================================================================
// VIP
// ================================================================
type UserVIPRecord struct {
	ID             int64          `json:"id"`
	UserID         int64          `json:"user_id"`
	VIPLevel       int8           `json:"vip_level"`
	Exp            int64          `json:"exp"`
	ExpireAt       sql.NullTime   `json:"expire_at"`
	OrderNo        string         `json:"order_no"`
	Source         string         `json:"source"`
	LastDailyClaim sql.NullString `json:"last_daily_claim"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

// ================================================================
// 钱包流水
// ================================================================
type WalletLog struct {
	ID            int64     `json:"id"`
	UserID        int64     `json:"user_id"`
	OrderNo       string    `json:"order_no"`
	Currency      string    `json:"currency"`
	ChangeAmount  int       `json:"change_amount"`
	BalanceBefore int       `json:"balance_before"`
	BalanceAfter  int       `json:"balance_after"`
	Reason        string    `json:"reason"`
	Detail        string    `json:"detail"`
	CreatedAt     time.Time `json:"created_at"`
}

// ================================================================
// 成长基金
// ================================================================
type GrowthFundMilestone struct {
	ID             int64          `json:"id"`
	UserID         int64          `json:"user_id"`
	OrderNo        string         `json:"order_no"`
	Level          int            `json:"level"`
	RewardCurrency string         `json:"reward_currency"`
	RewardAmount   int            `json:"reward_amount"`
	Status         int8           `json:"status"`
	ClaimedAt      sql.NullTime   `json:"claimed_at"`
	CreatedAt      time.Time      `json:"created_at"`
}

// ================================================================
// 退款
// ================================================================
type RefundRecord struct {
	ID               int64          `json:"id"`
	RefundNo         string         `json:"refund_no"`
	OrderNo          string         `json:"order_no"`
	UserID           int64          `json:"user_id"`
	RefundAmount     int            `json:"refund_amount"`
	Reason           string         `json:"reason"`
	ChannelRefundNo  string         `json:"channel_refund_no"`
	Status           int8           `json:"status"`
	ReviewerID       sql.NullInt64  `json:"reviewer_id"`
	ReviewNote       string         `json:"review_note"`
	CreatedAt        time.Time      `json:"created_at"`
	ProcessedAt       sql.NullTime   `json:"processed_at"`
}

// ================================================================
// 请求/响应
// ================================================================

type CreateOrderRequest struct {
	ProductType int8   `json:"product_type" binding:"required,min=1,max=4"`
	ProductKey  string `json:"product_key" binding:"required"`
	Channel     string `json:"channel" binding:"required,oneof=wechat alipay appstore"`
}

type CallbackRequest struct {
	OrderNo        string `json:"order_no"`
	Channel        string `json:"channel"`
	ChannelTradeNo string `json:"channel_trade_no"`
	CallbackID     string `json:"callback_id"`
	Amount         int    `json:"amount"`
	RawData        string `json:"raw_data"`
	Signature      string `json:"signature"`
}

type RefundRequest struct {
	OrderNo string `json:"order_no" binding:"required"`
	Reason  string `json:"reason" binding:"max=256"`
}

// ================================================================
// 充值档位
// ================================================================
type RechargeTier struct {
	Yuan   int    `json:"yuan"`
	Diamond int   `json:"diamond"`
	Bonus  int    `json:"bonus"`
	Tag    string `json:"tag"`
}

// ================================================================
// 辅助函数
// ================================================================

func OrderStatusText(s int8) string {
	switch s {
	case OrderPending:
		return "待支付"
	case OrderPaid:
		return "已支付"
	case OrderDelivered:
		return "已发货"
	case OrderClosed:
		return "已关闭"
	case OrderRefunded:
		return "已退款"
	default:
		return "未知"
	}
}

func ProductTypeText(t int8) string {
	switch t {
	case ProductDiamond:
		return "钻石充值"
	case ProductMonthlyCard:
		return "月卡"
	case ProductGiftPack:
		return "礼包"
	case ProductVIPPack:
		return "VIP礼包"
	default:
		return "未知"
	}
}

func IsValidTransition(from, to int8) bool {
	targets, ok := ValidTransitions[from]
	if !ok {
		return false
	}
	for _, t := range targets {
		if t == to {
			return true
		}
	}
	return false
}

// ensure json import
var _ = json.Marshal
