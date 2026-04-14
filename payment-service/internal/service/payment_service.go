package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"payment-service/internal/dao"
	"payment-service/internal/engine"
	"payment-service/internal/model"

	myredis "payment-service/pkg/redis"
)

var (
	ErrOrderNotFound    = errors.New("order not found")
	ErrDuplicateOrder   = errors.New("duplicate order")
	ErrAlreadyClaimed   = errors.New("already claimed today")
	ErrGiftLimitReached = errors.New("gift limit reached")
	ErrInvalidTransition = errors.New("invalid status transition")
	ErrRefundNotAllowed = errors.New("refund not allowed")
)

// 商品配置（从配置文件加载的简化版）
var RechargeTiers = []model.RechargeTier{
	{Yuan: 6, Diamond: 60, Bonus: 0, Tag: "首充"},
	{Yuan: 30, Diamond: 300, Bonus: 30, Tag: "超值"},
	{Yuan: 68, Diamond: 680, Bonus: 80, Tag: "热卖"},
	{Yuan: 128, Diamond: 1280, Bonus: 180, Tag: "推荐"},
	{Yuan: 328, Diamond: 3280, Bonus: 520, Tag: "豪华"},
	{Yuan: 648, Diamond: 6480, Bonus: 1200, Tag: "至尊"},
}

type PaymentService struct {
	dao    *dao.PaymentDAO
	engine *engine.PaymentEngine
}

func NewPaymentService(dao *dao.PaymentDAO, engine *engine.PaymentEngine) *PaymentService {
	return &PaymentService{dao: dao, engine: engine}
}

// GetRechargeTiers 获取充值档位
func (s *PaymentService) GetRechargeTiers() []model.RechargeTier {
	return RechargeTiers
}

// CreateRechargeOrder 创建充值订单
func (s *PaymentService) CreateRechargeOrder(ctx context.Context, userID int64, yuan int, channel, ip, deviceID string) (*model.PaymentOrder, error) {
	var tier *model.RechargeTier
	for i := range RechargeTiers {
		if RechargeTiers[i].Yuan == yuan {
			tier = &RechargeTiers[i]
			break
		}
	}
	if tier == nil {
		return nil, fmt.Errorf("invalid tier: %d yuan", yuan)
	}

	totalDiamond := tier.Diamond + tier.Bonus
	productKey := fmt.Sprintf("recharge_%d", yuan)
	productName := fmt.Sprintf("%d钻石(%s)", totalDiamond, tier.Tag)

	return s.engine.CreateOrder(ctx, userID, model.ProductDiamond, productKey, productName,
		yuan*100, float64(yuan), channel, ip, deviceID)
}

// CreateGiftOrder 创建礼包订单
func (s *PaymentService) CreateGiftOrder(ctx context.Context, userID int64, giftKey, channel, ip, deviceID string) (*model.PaymentOrder, error) {
	var yuan int
	var name string
	switch giftKey {
	case "starter_pack":
		yuan, name = 1, "新手礼包"
	case "growth_pack":
		yuan, name = 30, "成长基金"
	case "weekly_pack":
		yuan, name = 12, "每周特惠"
	default:
		return nil, fmt.Errorf("unknown gift: %s", giftKey)
	}

	return s.engine.CreateOrder(ctx, userID, model.ProductGiftPack, giftKey, name,
		yuan*100, float64(yuan), channel, ip, deviceID)
}

// CreateMonthlyCardOrder 创建月卡订单
func (s *PaymentService) CreateMonthlyCardOrder(ctx context.Context, userID int64, channel, ip, deviceID string) (*model.PaymentOrder, error) {
	return s.engine.CreateOrder(ctx, userID, model.ProductMonthlyCard, "monthly_card", "月卡",
		3000, 30.0, channel, ip, deviceID)
}

// GetOrder 获取订单详情
func (s *PaymentService) GetOrder(ctx context.Context, orderNo string) (*model.PaymentOrder, error) {
	order, err := s.dao.GetOrderByNo(ctx, orderNo)
	if err != nil {
		return nil, ErrOrderNotFound
	}
	return order, nil
}

// ListUserOrders 获取用户订单列表
func (s *PaymentService) ListUserOrders(ctx context.Context, userID int64, status int8, page, pageSize int) ([]*model.PaymentOrder, int64, error) {
	if page <= 0 { page = 1 }
	if pageSize <= 0 || pageSize > 50 { pageSize = 20 }
	return s.dao.ListUserOrders(ctx, userID, status, page, pageSize)
}

// HandleCallback 处理支付回调（核心防重放）
func (s *PaymentService) HandleCallback(ctx context.Context, cb *model.PaymentCallback) error {
	return s.engine.ProcessCallback(ctx, cb)
}

// GetActiveMonthlyCard 获取生效中的月卡
func (s *PaymentService) GetActiveMonthlyCard(ctx context.Context, userID int64) (*model.UserMonthlyCard, error) {
	return s.dao.GetActiveMonthlyCard(ctx, userID)
}

// ClaimMonthlyDaily 月卡每日领取
func (s *PaymentService) ClaimMonthlyDaily(ctx context.Context, userID int64) error {
	card, err := s.dao.GetActiveMonthlyCard(ctx, userID)
	if err != nil {
		return fmt.Errorf("no active monthly card")
	}

	today := time.Now().Format("2006-01-02")
	if card.LastClaimDate.Valid && card.LastClaimDate.String == today {
		return ErrAlreadyClaimed
	}
	if card.ClaimedDays >= card.TotalDays {
		return fmt.Errorf("monthly card fully claimed")
	}

	if err := s.dao.UpdateMonthlyCardClaim(ctx, card.ID, today); err != nil {
		return err
	}

	_ = s.dao.CreateWalletLog(ctx, &model.WalletLog{
		UserID: userID, OrderNo: card.OrderNo,
		Currency: "diamond", ChangeAmount: 100,
		BalanceBefore: 0, BalanceAfter: 100,
		Reason: "monthly_daily", Detail: fmt.Sprintf("月卡第%d天领取", card.ClaimedDays+1),
	})

	return nil
}

// GetVIPInfo 获取VIP信息
func (s *PaymentService) GetVIPInfo(ctx context.Context, userID int64) (*model.UserVIPRecord, error) {
	return s.dao.GetVIPRecord(ctx, userID)
}

// ClaimVIPDaily VIP每日奖励
func (s *PaymentService) ClaimVIPDaily(ctx context.Context, userID int64) error {
	vip, err := s.dao.GetVIPRecord(ctx, userID)
	if err != nil {
		return fmt.Errorf("no VIP record")
	}

	today := time.Now().Format("2006-01-02")
	if vip.LastDailyClaim.Valid && vip.LastDailyClaim.String == today {
		return ErrAlreadyClaimed
	}

	// 每日奖励按等级
	dailyReward := map[int8]int{1: 10, 2: 20, 3: 50, 4: 100, 5: 200}
	reward := dailyReward[vip.VIPLevel]

	_ = s.dao.UpdateVIPDailyClaim(ctx, userID, today)
	_ = s.dao.CreateWalletLog(ctx, &model.WalletLog{
		UserID: userID,
		Currency: "diamond", ChangeAmount: reward,
		BalanceBefore: 0, BalanceAfter: reward,
		Reason: "vip_daily", Detail: fmt.Sprintf("VIP%d每日奖励", vip.VIPLevel),
	})

	return nil
}

// ClaimMilestone 领取成长基金里程碑
func (s *PaymentService) ClaimMilestone(ctx context.Context, userID int64, orderNo string, level int) error {
	return s.dao.ClaimMilestone(ctx, userID, orderNo, level)
}

// ListMilestones 获取成长基金里程碑
func (s *PaymentService) ListMilestones(ctx context.Context, userID int64, orderNo string) ([]*model.GrowthFundMilestone, error) {
	return s.dao.ListMilestones(ctx, userID, orderNo)
}

// ListWalletLogs 获取钱包流水
func (s *PaymentService) ListWalletLogs(ctx context.Context, userID int64, limit int) ([]*model.WalletLog, error) {
	if limit <= 0 || limit > 100 { limit = 30 }
	return s.dao.ListWalletLogs(ctx, userID, limit)
}

// RequestRefund 申请退款
func (s *PaymentService) RequestRefund(ctx context.Context, userID int64, req *model.RefundRequest) error {
	order, err := s.dao.GetOrderByNo(ctx, req.OrderNo)
	if err != nil {
		return ErrOrderNotFound
	}
	if order.UserID != userID {
		return fmt.Errorf("not your order")
	}
	if order.Status != model.OrderDelivered {
		return ErrRefundNotAllowed
	}

	// 24小时内可退款
	if time.Since(order.CreatedAt) > 24*time.Hour {
		return fmt.Errorf("refund window expired (24h)")
	}

	refundNo := fmt.Sprintf("REF%s%s", time.Now().Format("20060102150405"), generateRefundNo())
	_ = s.dao.CreateRefund(ctx, &model.RefundRecord{
		RefundNo: refundNo, OrderNo: req.OrderNo,
		UserID: userID, RefundAmount: order.Amount,
		Reason: req.Reason,
	})
	return nil
}

var _ = myredis.RDB
