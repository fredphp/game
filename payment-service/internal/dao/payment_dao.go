package dao

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"payment-service/internal/model"
)

var (
	ErrOrderNotFound   = errors.New("order not found")
	ErrDuplicateOrder  = errors.New("duplicate order")
	ErrCallbackExists  = errors.New("callback already processed")
	ErrMonthlyNotFound = errors.New("monthly card not found")
	ErrGiftNotFound    = errors.New("gift purchase not found")
	ErrVIPNotFound     = errors.New("vip record not found")
	ErrRefundExists    = errors.New("refund already exists")
)

type PaymentDAO struct {
	db *sql.DB
}

func NewPaymentDAO(db *sql.DB) *PaymentDAO {
	return &PaymentDAO{db: db}
}

// ================================================================
// 订单
// ================================================================

func (d *PaymentDAO) CreateOrder(ctx context.Context, o *model.PaymentOrder) error {
	_, err := d.db.ExecContext(ctx,
		`INSERT INTO payment_orders
		    (order_no, user_id, product_type, product_key, product_name,
		     amount, amount_yuan, currency, channel, ip, device_id, expire_at, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
		o.OrderNo, o.UserID, o.ProductType, o.ProductKey, o.ProductName,
		o.Amount, o.AmountYuan, o.Currency, o.Channel, o.IP, o.DeviceID, o.ExpireAt)
	if err != nil {
		if strings.Contains(err.Error(), "Duplicate entry") && strings.Contains(err.Error(), "uk_order_no") {
			return ErrDuplicateOrder
		}
		return fmt.Errorf("create order: %w", err)
	}
	return nil
}

func (d *PaymentDAO) GetOrderByNo(ctx context.Context, orderNo string) (*model.PaymentOrder, error) {
	o := &model.PaymentOrder{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, order_no, user_id, product_type, product_key, product_name,
		        amount, amount_yuan, currency, channel, channel_trade_no, status,
		        ip, device_id, paid_at, delivered_at, closed_at, expire_at,
		        retry_count, created_at
		 FROM payment_orders WHERE order_no = ?`, orderNo,
	).Scan(&o.ID, &o.OrderNo, &o.UserID, &o.ProductType, &o.ProductKey, &o.ProductName,
		&o.Amount, &o.AmountYuan, &o.Currency, &o.Channel, &o.ChannelTradeNo, &o.Status,
		&o.IP, &o.DeviceID, &o.PaidAt, &o.DeliveredAt, &o.ClosedAt, &o.ExpireAt,
		&o.RetryCount, &o.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrOrderNotFound
		}
		return nil, fmt.Errorf("get order: %w", err)
	}
	return o, nil
}

func (d *PaymentDAO) UpdateOrderStatus(ctx context.Context, orderNo string, status int8, channelTradeNo string) (int64, error) {
	sets := "status = ?"
	args := []interface{}{status}
	if status == model.OrderPaid {
		sets += ", paid_at = NOW()"
	}
	if status == model.OrderDelivered {
		sets += ", delivered_at = NOW()"
	}
	if status == model.OrderClosed {
		sets += ", closed_at = NOW()"
	}
	if channelTradeNo != "" {
		sets += ", channel_trade_no = ?"
		args = append(args, channelTradeNo)
	}
	sets += " WHERE order_no = ? AND status != ?"
	args = append(args, orderNo, model.OrderRefunded)

	result, err := d.db.ExecContext(ctx, fmt.Sprintf("UPDATE payment_orders SET %s", sets), args...)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

func (d *PaymentDAO) UpdateOrderRetry(ctx context.Context, orderNo string) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE payment_orders SET retry_count = retry_count + 1 WHERE order_no = ?`, orderNo)
	return err
}

func (d *PaymentDAO) ListUserOrders(ctx context.Context, userID int64, status int8, page, pageSize int) ([]*model.PaymentOrder, int64, error) {
	where := "WHERE user_id = ?"
	args := []interface{}{userID}
	if status >= 0 {
		where += " AND status = ?"
		args = append(args, status)
	}
	var total int64
	d.db.QueryRowContext(ctx, fmt.Sprintf(`SELECT COUNT(1) FROM payment_orders %s`, where), args...).Scan(&total)

	offset := (page - 1) * pageSize
	rows, err := d.db.QueryContext(ctx,
		fmt.Sprintf(`SELECT id, order_no, user_id, product_type, product_key, product_name,
		        amount, amount_yuan, currency, channel, channel_trade_no, status,
		        ip, device_id, paid_at, delivered_at, closed_at, expire_at,
		        retry_count, created_at
		 FROM payment_orders %s ORDER BY created_at DESC LIMIT ? OFFSET ?`, where),
		append(args, pageSize, offset)...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	return d.scanOrders(rows)
}

func (d *PaymentDAO) ListExpiredOrders(ctx context.Context, limit int) ([]*model.PaymentOrder, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, order_no, user_id, product_type, product_key, product_name,
		        amount, amount_yuan, currency, channel, channel_trade_no, status,
		        ip, device_id, paid_at, delivered_at, closed_at, expire_at,
		        retry_count, created_at
		 FROM payment_orders WHERE status = 0 AND expire_at < NOW() LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	return d.scanOrders(rows)
}

func (d *PaymentDAO) scanOrders(rows *sql.Rows) ([]*model.PaymentOrder, int64, error) {
	orders := make([]*model.PaymentOrder, 0)
	for rows.Next() {
		o := &model.PaymentOrder{}
		err := rows.Scan(&o.ID, &o.OrderNo, &o.UserID, &o.ProductType, &o.ProductKey, &o.ProductName,
			&o.Amount, &o.AmountYuan, &o.Currency, &o.Channel, &o.ChannelTradeNo, &o.Status,
			&o.IP, &o.DeviceID, &o.PaidAt, &o.DeliveredAt, &o.ClosedAt, &o.ExpireAt,
			&o.RetryCount, &o.CreatedAt)
		if err != nil {
			return nil, 0, err
		}
		orders = append(orders, o)
	}
	return orders, int64(len(orders)), nil
}

// ================================================================
// 回调日志
// ================================================================

func (d *PaymentDAO) CreateCallback(ctx context.Context, cb *model.PaymentCallback) error {
	_, err := d.db.ExecContext(ctx,
		`INSERT INTO payment_callbacks (callback_id, order_no, channel, raw_data, signature, status, created_at)
		 VALUES (?, ?, ?, ?, ?, 0, NOW())`,
		cb.CallbackID, cb.OrderNo, cb.Channel, cb.RawData, cb.Signature)
	if err != nil {
		if strings.Contains(err.Error(), "Duplicate entry") {
			return ErrCallbackExists
		}
		return err
	}
	return nil
}

func (d *PaymentDAO) UpdateCallback(ctx context.Context, callbackID string, status int8, errMsg string) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE payment_callbacks SET status = ?, error_msg = ?, processed_at = NOW()
		 WHERE callback_id = ?`, status, errMsg, callbackID)
	return err
}

// ================================================================
// 月卡
// ================================================================

func (d *PaymentDAO) CreateMonthlyCard(ctx context.Context, mc *model.UserMonthlyCard) error {
	_, err := d.db.ExecContext(ctx,
		`INSERT INTO user_monthly_cards (user_id, order_no, start_date, end_date, status, total_days, created_at)
		 VALUES (?, ?, ?, ?, 1, 30, NOW())`,
		mc.UserID, mc.OrderNo, mc.StartDate, mc.EndDate)
	return err
}

func (d *PaymentDAO) GetActiveMonthlyCard(ctx context.Context, userID int64) (*model.UserMonthlyCard, error) {
	mc := &model.UserMonthlyCard{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, user_id, order_no, start_date, end_date, status,
		        total_days, claimed_days, last_claim_date, created_at
		 FROM user_monthly_cards WHERE user_id = ? AND status = 1
		 AND end_date >= CURDATE() ORDER BY end_date DESC LIMIT 1`, userID,
	).Scan(&mc.ID, &mc.UserID, &mc.OrderNo, &mc.StartDate, &mc.EndDate, &mc.Status,
		&mc.TotalDays, &mc.ClaimedDays, &mc.LastClaimDate, &mc.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrMonthlyNotFound
		}
		return nil, err
	}
	return mc, nil
}

func (d *PaymentDAO) UpdateMonthlyCardClaim(ctx context.Context, id int64, date string) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE user_monthly_cards SET claimed_days = claimed_days + 1, last_claim_date = ?
		 WHERE id = ? AND status = 1`, date, id)
	return err
}

func (d *PaymentDAO) ExpireMonthlyCards(ctx context.Context) (int64, error) {
	result, err := d.db.ExecContext(ctx,
		`UPDATE user_monthly_cards SET status = 2 WHERE status = 1 AND end_date < CURDATE()`)
	if err != nil {
		return 0, err
	}
	return result.RowsAffected()
}

// ================================================================
// 礼包
// ================================================================

func (d *PaymentDAO) CreateGiftPurchase(ctx context.Context, gp *model.UserGiftPurchase) error {
	_, err := d.db.ExecContext(ctx,
		`INSERT INTO user_gift_purchases (user_id, gift_key, order_no, purchase_time, created_at)
		 VALUES (?, ?, ?, NOW(), NOW())`,
		gp.UserID, gp.GiftKey, gp.OrderNo)
	return err
}

func (d *PaymentDAO) CountGiftPurchase(ctx context.Context, userID int64, giftKey string) (int64, error) {
	var count int64
	err := d.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM user_gift_purchases WHERE user_id = ? AND gift_key = ?`, userID, giftKey).Scan(&count)
	return count, err
}

// ================================================================
// VIP
// ================================================================

func (d *PaymentDAO) GetVIPRecord(ctx context.Context, userID int64) (*model.UserVIPRecord, error) {
	v := &model.UserVIPRecord{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, user_id, vip_level, exp, expire_at, order_no, source,
		        last_daily_claim, created_at, updated_at
		 FROM user_vip_records WHERE user_id = ?`, userID,
	).Scan(&v.ID, &v.UserID, &v.VIPLevel, &v.Exp, &v.ExpireAt,
		&v.OrderNo, &v.Source, &v.LastDailyClaim, &v.CreatedAt, &v.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrVIPNotFound
		}
		return nil, err
	}
	return v, nil
}

func (d *PaymentDAO) UpsertVIP(ctx context.Context, v *model.UserVIPRecord) error {
	_, err := d.db.ExecContext(ctx,
		`INSERT INTO user_vip_records (user_id, vip_level, exp, expire_at, order_no, source, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
		 ON DUPLICATE KEY UPDATE vip_level = VALUES(vip_level), exp = VALUES(exp),
		   expire_at = VALUES(expire_at), order_no = VALUES(order_no), updated_at = NOW()`,
		v.UserID, v.VIPLevel, v.Exp, v.ExpireAt, v.OrderNo, v.Source)
	return err
}

func (d *PaymentDAO) UpdateVIPDailyClaim(ctx context.Context, userID int64, date string) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE user_vip_records SET last_daily_claim = ? WHERE user_id = ?`, date, userID)
	return err
}

// ================================================================
// 钱包流水
// ================================================================

func (d *PaymentDAO) CreateWalletLog(ctx context.Context, w *model.WalletLog) error {
	_, err := d.db.ExecContext(ctx,
		`INSERT INTO user_wallet_logs (user_id, order_no, currency, change_amount, balance_before, balance_after, reason, detail, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
		w.UserID, w.OrderNo, w.Currency, w.ChangeAmount, w.BalanceBefore, w.BalanceAfter, w.Reason, w.Detail)
	return err
}

func (d *PaymentDAO) ListWalletLogs(ctx context.Context, userID int64, limit int) ([]*model.WalletLog, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, user_id, order_no, currency, change_amount, balance_before, balance_after, reason, detail, created_at
		 FROM user_wallet_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`, userID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	logs := make([]*model.WalletLog, 0)
	for rows.Next() {
		l := &model.WalletLog{}
		err := rows.Scan(&l.ID, &l.UserID, &l.OrderNo, &l.Currency, &l.ChangeAmount,
			&l.BalanceBefore, &l.BalanceAfter, &l.Reason, &l.Detail, &l.CreatedAt)
		if err != nil {
			return nil, err
		}
		logs = append(logs, l)
	}
	return logs, nil
}

// ================================================================
// 成长基金
// ================================================================

func (d *PaymentDAO) CreateMilestones(ctx context.Context, orderNo string, userID int64) error {
	levels := []int{10, 20, 30, 40, 50}
	amounts := []int{200, 400, 600, 800, 2000}
	for i, lv := range levels {
		_, err := d.db.ExecContext(ctx,
			`INSERT IGNORE INTO growth_fund_milestones (user_id, order_no, level, reward_currency, reward_amount, created_at)
			 VALUES (?, ?, ?, 'diamond', ?, NOW())`, userID, orderNo, lv, amounts[i])
		if err != nil {
			return err
		}
	}
	return nil
}

func (d *PaymentDAO) ClaimMilestone(ctx context.Context, userID int64, orderNo string, level int) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE growth_fund_milestones SET status = 1, claimed_at = NOW()
		 WHERE user_id = ? AND order_no = ? AND level = ? AND status = 0`, userID, orderNo, level)
	return err
}

func (d *PaymentDAO) ListMilestones(ctx context.Context, userID int64, orderNo string) ([]*model.GrowthFundMilestone, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, user_id, order_no, level, reward_currency, reward_amount, status, claimed_at, created_at
		 FROM growth_fund_milestones WHERE user_id = ? AND order_no = ? ORDER BY level ASC`, userID, orderNo)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ms := make([]*model.GrowthFundMilestone, 0)
	for rows.Next() {
		m := &model.GrowthFundMilestone{}
		err := rows.Scan(&m.ID, &m.UserID, &m.OrderNo, &m.Level, &m.RewardCurrency, &m.RewardAmount, &m.Status, &m.ClaimedAt, &m.CreatedAt)
		if err != nil {
			return nil, err
		}
		ms = append(ms, m)
	}
	return ms, nil
}

// ================================================================
// 退款
// ================================================================

func (d *PaymentDAO) CreateRefund(ctx context.Context, r *model.RefundRecord) error {
	_, err := d.db.ExecContext(ctx,
		`INSERT INTO refund_records (refund_no, order_no, user_id, refund_amount, reason, status, created_at)
		 VALUES (?, ?, ?, ?, ?, 0, NOW())`,
		r.RefundNo, r.OrderNo, r.UserID, r.RefundAmount, r.Reason)
	if err != nil {
		if strings.Contains(err.Error(), "Duplicate entry") {
			return ErrRefundExists
		}
		return err
	}
	return nil
}

var _ = json.Marshal
