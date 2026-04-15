package engine

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
        "sync"
        "time"

        "payment-service/internal/dao"
        "payment-service/internal/model"

        myredis "payment-service/pkg/redis"
)

const (
        idempotentPrefix = "pay:idem:"     // String: 幂等锁 key
        idempotentTTL    = 24 * time.Hour // 幂等锁过期时间
        callbackLockPrefix = "pay:cb:lock:"  // String: 回调处理锁
        callbackLockTTL    = 30 * time.Second

        userServiceURL   = "http://user-service:9001"
        internalApiKey   = "internal-api-key-2024"
)

// PaymentEngine 支付引擎
type PaymentEngine struct {
        dao       *dao.PaymentDAO
        mu        sync.RWMutex
        running   bool
        cancelFn  context.CancelFunc
}

func NewPaymentEngine(dao *dao.PaymentDAO) *PaymentEngine {
        return &PaymentEngine{dao: dao}
}

// Start 启动后台协程
func (e *PaymentEngine) Start() {
        e.mu.Lock()
        if e.running {
                e.mu.Unlock()
                return
        }
        e.running = true
        ctx, cancel := context.WithCancel(context.Background())
        e.cancelFn = cancel
        e.mu.Unlock()

        go e.expiredOrderLoop(ctx)
        go e.monthlyCardExpireLoop(ctx)

        log.Println("✅ 支付引擎启动")
}

func (e *PaymentEngine) Stop() {
        e.mu.Lock()
        defer e.mu.Unlock()
        if !e.running { return }
        e.running = false
        if e.cancelFn != nil { e.cancelFn() }
        log.Println("⏹ 支付引擎已停止")
}

// ================================================================
// 订单状态机
// ================================================================

// CreateOrder 创建订单（含幂等检查）
func (e *PaymentEngine) CreateOrder(ctx context.Context, userID int64,
        productType int8, productKey, productName string,
        amount int, amountYuan float64, channel, ip, deviceID string) (*model.PaymentOrder, error) {

        orderNo := generateOrderNo()

        // Redis 幂等锁：防止同一用户短时间内重复下单
        idempotentKey := fmt.Sprintf("%s%d:%s", idempotentPrefix, userID, productKey)
        locked, err := myredis.RDB.SetNX(ctx, idempotentKey, orderNo, 3*time.Second).Result()
        if err != nil {
                return nil, fmt.Errorf("idempotent check: %w", err)
        }
        if !locked {
                // 防重复：5秒内同用户同商品不允许重复
                return nil, fmt.Errorf("请勿重复提交，稍后再试")
        }
        defer myredis.RDB.Del(ctx, idempotentKey)

        order := &model.PaymentOrder{
                OrderNo:     orderNo,
                UserID:      userID,
                ProductType: productType,
                ProductKey:  productKey,
                ProductName: productName,
                Amount:      amount,
                AmountYuan:  amountYuan,
                Currency:    "CNY",
                Channel:     channel,
                IP:          ip,
                DeviceID:    deviceID,
                Status:      model.OrderPending,
                ExpireAt:    time.Now().Add(24 * time.Hour),
        }

        if err := e.dao.CreateOrder(ctx, order); err != nil {
                return nil, err
        }

        return order, nil
}

// ProcessCallback 处理支付回调（防重放 + 状态机）
func (e *PaymentEngine) ProcessCallback(ctx context.Context, cb *model.PaymentCallback) error {
        // 1. 幂等检查：同一个 callback_id 只处理一次
        if err := e.dao.CreateCallback(ctx, cb); err != nil {
                if errors.Is(err, dao.ErrCallbackExists) {
                        log.Printf("⚠ 回调已处理(重复): %s", cb.CallbackID)
                        return nil // 幂等返回成功
                }
                return fmt.Errorf("save callback: %w", err)
        }

        // 2. 获取订单
        order, err := e.dao.GetOrderByNo(ctx, cb.OrderNo)
        if err != nil {
                _ = e.dao.UpdateCallback(ctx, cb.CallbackID, model.CallbackFailed, "order not found")
                return fmt.Errorf("order not found: %s", cb.OrderNo)
        }

        // 3. 状态机校验：只有 Pending → Paid
        if !model.IsValidTransition(order.Status, model.OrderPaid) {
                _ = e.dao.UpdateCallback(ctx, cb.CallbackID, model.CallbackSuccess, "order status not pending")
                return nil // 非Pending状态，直接返回成功（兼容重复回调）
        }

        // 4. Redis 分布式锁：防止并发回调
        lockKey := fmt.Sprintf("%s%s", callbackLockPrefix, cb.OrderNo)
        locked, err := myredis.RDB.SetNX(ctx, lockKey, "1", callbackLockTTL).Result()
        if err != nil {
                _ = e.dao.UpdateCallback(ctx, cb.CallbackID, model.CallbackFailed, "lock error")
                return fmt.Errorf("callback lock: %w", err)
        }
        if !locked {
                _ = e.dao.UpdateCallback(ctx, cb.CallbackID, model.CallbackSuccess, "already processing")
                return nil
        }
        defer myredis.RDB.Del(ctx, lockKey)

        // 5. 更新订单状态为已支付
        rows, err := e.dao.UpdateOrderStatus(ctx, cb.OrderNo, model.OrderPaid, cb.ChannelTradeNo)
        if err != nil {
                _ = e.dao.UpdateCallback(ctx, cb.CallbackID, model.CallbackFailed, "update order failed")
                _ = e.dao.UpdateOrderRetry(ctx, cb.OrderNo)
                return fmt.Errorf("update order: %w", err)
        }
        if rows == 0 {
                _ = e.dao.UpdateCallback(ctx, cb.CallbackID, model.CallbackSuccess, "order already processed")
                return nil
        }

        // 6. 标记回调成功
        _ = e.dao.UpdateCallback(ctx, cb.CallbackID, model.CallbackSuccess, "")

        log.Printf("💰 支付成功: %s | 用户:%d 商品:%s 金额:%.2f元 渠道:%s",
                cb.OrderNo, order.UserID, order.ProductName, order.AmountYuan, cb.Channel)

        // 7. 异步发货
        go func() {
                bgCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
                defer cancel()
                e.Deliver(bgCtx, cb.OrderNo)
        }()

        return nil
}

// Deliver 发货（Pending → Delivered）
func (e *PaymentEngine) Deliver(ctx context.Context, orderNo string) error {
        order, err := e.dao.GetOrderByNo(ctx, orderNo)
        if err != nil {
                return err
        }
        if order.Status != model.OrderPaid {
                return fmt.Errorf("order not paid, status: %d", order.Status)
        }

        // 根据商品类型发货
        switch order.ProductType {
        case model.ProductDiamond:
                // 钻石充值：直接加钻石
                diamondAmount := order.Amount // 实际钻石数从订单金额读取
                if diamondAmount <= 0 {
                        diamondAmount = 100
                }
                _ = e.dao.CreateWalletLog(ctx, &model.WalletLog{
                        UserID: order.UserID, OrderNo: orderNo,
                        Currency: "diamond", ChangeAmount: diamondAmount,
                        BalanceBefore: 0, BalanceAfter: diamondAmount,
                        Reason: "recharge", Detail: order.ProductName,
                })
                // 调用 user-service 实际加钻石
                if err := callUserAddDiamonds(ctx, order.UserID, diamondAmount); err != nil {
                        log.Printf("❌ 加钻石失败: user=%d amount=%d err=%v", order.UserID, diamondAmount, err)
                }
        case model.ProductMonthlyCard:
                // 月卡：创建月卡记录
                now := time.Now()
                endDate := now.AddDate(0, 0, 30).Format("2006-01-02")
                _ = e.dao.CreateMonthlyCard(ctx, &model.UserMonthlyCard{
                        UserID:    order.UserID,
                        OrderNo:   orderNo,
                        StartDate: now.Format("2006-01-02"),
                        EndDate:   endDate,
                })
                // 首日钻石奖励
                monthlyDiamonds := 300
                _ = e.dao.CreateWalletLog(ctx, &model.WalletLog{
                        UserID: order.UserID, OrderNo: orderNo,
                        Currency: "diamond", ChangeAmount: monthlyDiamonds,
                        BalanceBefore: 0, BalanceAfter: monthlyDiamonds,
                        Reason: "monthly_card", Detail: "月卡购买奖励",
                })
                // 调用 user-service 实际加钻石
                if err := callUserAddDiamonds(ctx, order.UserID, monthlyDiamonds); err != nil {
                        log.Printf("❌ 月卡首日奖励加钻石失败: user=%d amount=%d err=%v", order.UserID, monthlyDiamonds, err)
                }
        case model.ProductGiftPack:
                // 礼包：记录购买 + 发放奖励
                _ = e.dao.CreateGiftPurchase(ctx, &model.UserGiftPurchase{
                        UserID:       order.UserID,
                        GiftKey:      order.ProductKey,
                        OrderNo:      orderNo,
                })
                // 成长基金特殊处理
                if order.ProductKey == "growth_pack" {
                        _ = e.dao.CreateMilestones(ctx, orderNo, order.UserID)
                }
                giftDiamonds := 200
                _ = e.dao.CreateWalletLog(ctx, &model.WalletLog{
                        UserID: order.UserID, OrderNo: orderNo,
                        Currency: "diamond", ChangeAmount: giftDiamonds,
                        BalanceBefore: 0, BalanceAfter: giftDiamonds,
                        Reason: "gift", Detail: order.ProductName,
                })
                // 调用 user-service 实际加钻石
                if err := callUserAddDiamonds(ctx, order.UserID, giftDiamonds); err != nil {
                        log.Printf("❌ 礼包加钻石失败: user=%d amount=%d err=%v", order.UserID, giftDiamonds, err)
                }
        case model.ProductVIPPack:
                // VIP礼包：增加VIP经验
                vip, err := e.dao.GetVIPRecord(ctx, order.UserID)
                if err != nil {
                        vip = &model.UserVIPRecord{UserID: order.UserID, VIPLevel: 1, Exp: 500, Source: "purchase"}
                }
                vip.Exp += 500
                if vip.Exp >= 5000 { vip.VIPLevel = 5 } else if vip.Exp >= 2000 { vip.VIPLevel = 4 }
                else if vip.Exp >= 500 { vip.VIPLevel = 3 } else { vip.VIPLevel = 2 }
                _ = e.dao.UpsertVIP(ctx, vip)
                vipDiamonds := 200
                _ = e.dao.CreateWalletLog(ctx, &model.WalletLog{
                        UserID: order.UserID, OrderNo: orderNo,
                        Currency: "diamond", ChangeAmount: vipDiamonds,
                        BalanceBefore: 0, BalanceAfter: vipDiamonds,
                        Reason: "vip", Detail: "VIP礼包",
                })
                // 调用 user-service 实际加钻石
                if err := callUserAddDiamonds(ctx, order.UserID, vipDiamonds); err != nil {
                        log.Printf("❌ VIP礼包加钻石失败: user=%d amount=%d err=%v", order.UserID, vipDiamonds, err)
                }
        }

        // 更新订单为已发货
        _, _ = e.dao.UpdateOrderStatus(ctx, orderNo, model.OrderDelivered, "")

        log.Printf("📦 发货完成: %s | 类型:%s 商品:%s", orderNo, model.ProductTypeText(order.ProductType), order.ProductName)
        return nil
}

// ================================================================
// 后台协程
// ================================================================

func (e *PaymentEngine) expiredOrderLoop(ctx context.Context) {
        ticker := time.NewTicker(1 * time.Minute)
        defer ticker.Stop()
        for {
                select {
                case <-ctx.Done():
                        return
                case <-ticker.C:
                        orders, _, err := e.dao.ListExpiredOrders(ctx, 100)
                        if err != nil { continue }
                        for _, o := range orders {
                                _, _ = e.dao.UpdateOrderStatus(ctx, o.OrderNo, model.OrderClosed, "")
                                log.Printf("⏰ 订单过期关闭: %s", o.OrderNo)
                        }
                }
        }
}

func (e *PaymentEngine) monthlyCardExpireLoop(ctx context.Context) {
        ticker := time.NewTicker(1 * time.Hour)
        defer ticker.Stop()
        for {
                select {
                case <-ctx.Done():
                        return
                case <-ticker.C:
                        count, _ := e.dao.ExpireMonthlyCards(ctx)
                        if count > 0 {
                                log.Printf("📅 月卡过期: %d 张", count)
                        }
                }
        }
}

// ================================================================
// 辅助函数
// ================================================================

func generateOrderNo() string {
        now := time.Now()
        b := make([]byte, 6)
        _, _ = rand.Read(b)
        return fmt.Sprintf("PAY%s%s%s",
                now.Format("20060102"),
                now.Format("150405"),
                hex.EncodeToString(b),
        )
}

// callUserInternal 调用 user-service 内部 API
func callUserInternal(ctx context.Context, method, path string, body interface{}) (map[string]interface{}, error) {
        data, _ := json.Marshal(body)
        req, err := http.NewRequestWithContext(ctx, method, userServiceURL+path, bytes.NewReader(data))
        if err != nil {
                return nil, err
        }
        req.Header.Set("Content-Type", "application/json")
        req.Header.Set("X-Internal-Api-Key", internalApiKey)
        client := &http.Client{Timeout: 5 * time.Second}
        resp, err := client.Do(req)
        if err != nil {
                return nil, err
        }
        defer resp.Body.Close()
        var result map[string]interface{}
        json.NewDecoder(resp.Body).Decode(&result)
        return result, nil
}

// callUserAddDiamonds 调用 user-service 加钻石
func callUserAddDiamonds(ctx context.Context, userID int64, amount int) error {
        _, err := callUserInternal(ctx, "POST", "/internal/user/add-diamonds", map[string]interface{}{
                "user_id": userID,
                "amount":  amount,
        })
        return err
}

var _ = fmt.Sprint
