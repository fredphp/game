package service

import (
        "bytes"
        "context"
        "crypto/rand"
        "encoding/hex"
        "encoding/json"
        "errors"
        "fmt"
        "log"
        "net/http"
        "time"

        "payment-service/internal/dao"
        "payment-service/internal/engine"
        "payment-service/internal/model"

        myredis "payment-service/pkg/redis"
)

const (
        userSVCURL      = "http://user-service:9001"
        internalAPIKey  = "internal-api-key-2024"
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

// RequestRefund 申请退款（含资源回滚）
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

        // 计算退款钻石数量（从商品名解析或使用默认值）
        diamondRefund := order.AmountYuan * 10 // 简化：1元=10钻石
        if order.ProductType == model.ProductDiamond {
                // 从商品名解析钻石数: "680钻石(热卖)" → 680
                diamondRefund = parseDiamondFromName(order.ProductName)
                if diamondRefund <= 0 {
                        diamondRefund = int(order.AmountYuan * 10)
                }
        }

        // 1. 回滚用户资源：扣除钻石（调用 user-service 内部API）
        if diamondRefund > 0 {
                err := callUserDeductDiamonds(ctx, userID, int(diamondRefund), "refund_"+req.OrderNo)
                if err != nil {
                        log.Printf("❌ 退款扣钻失败: user=%d, amount=%d, err=%v", userID, diamondRefund, err)
                        // 钻石不足时不阻断退款流程（可能已消费部分），仅记录日志
                }
        }

        // 2. 创建退款记录
        b := make([]byte, 4)
        rand.Read(b)
        refundNo := fmt.Sprintf("REF%s%s", time.Now().Format("20060102150405"), hex.EncodeToString(b))
        if err := s.dao.CreateRefund(ctx, &model.RefundRecord{
                RefundNo: refundNo, OrderNo: req.OrderNo,
                UserID: userID, RefundAmount: order.Amount,
                Reason: req.Reason,
        }); err != nil {
                log.Printf("❌ 创建退款记录失败: %v", err)
        }

        // 3. 更新订单状态为已退款
        _, _ = s.dao.UpdateOrderStatus(ctx, req.OrderNo, model.OrderRefunded, refundNo)

        // 4. 记录钱包流水
        _ = s.dao.CreateWalletLog(ctx, &model.WalletLog{
                UserID: userID, OrderNo: req.OrderNo,
                Currency: "diamond", ChangeAmount: -int(diamondRefund),
                BalanceBefore: 0, BalanceAfter: 0,
                Reason: "refund", Detail: fmt.Sprintf("退款扣除%d钻石", diamondRefund),
        })

        log.Printf("💰 退款完成: order=%s user=%d refund=%d diamonds, refund_no=%s",
                req.OrderNo, userID, diamondRefund, refundNo)
        return nil
}

// callUserDeductDiamonds 调用 user-service 内部API扣除钻石
func callUserDeductDiamonds(ctx context.Context, userID int64, amount int, reason string) error {
        body := map[string]interface{}{
                "user_id": userID,
                "amount":  amount,
                "reason":  reason,
        }
        data, _ := json.Marshal(body)
        req, err := http.NewRequestWithContext(ctx, "POST", userSVCURL+"/internal/user/deduct-diamonds", bytes.NewReader(data))
        if err != nil {
                return err
        }
        req.Header.Set("Content-Type", "application/json")
        req.Header.Set("X-Internal-Api-Key", internalAPIKey)

        client := &http.Client{Timeout: 5 * time.Second}
        resp, err := client.Do(req)
        if err != nil {
                return err
        }
        defer resp.Body.Close()

        var result map[string]interface{}
        json.NewDecoder(resp.Body).Decode(&result)
        if code, ok := result["code"].(float64); ok && code != 0 {
                return fmt.Errorf("deduct failed: %v", result["message"])
        }
        return nil
}

// parseDiamondFromName 从商品名解析钻石数量
func parseDiamondFromName(name string) int {
        n := 0
        for _, c := range name {
                if c >= '0' && c <= '9' {
                        n = n*10 + int(c-'0')
                } else if n > 0 {
                        break
                }
        }
        return n
}

var _ = myredis.RDB
