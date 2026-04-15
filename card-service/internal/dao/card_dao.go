package dao

import (
        "context"
        "database/sql"
        "encoding/json"
        "errors"
        "fmt"

        "card-service/internal/model"
)

var (
        ErrCardNotFound      = errors.New("card not found")
        ErrPoolNotFound      = errors.New("pool not found")
        ErrPoolClosed        = errors.New("pool is closed")
)

// CardDAO 卡牌数据访问层
type CardDAO struct {
        db *sql.DB
}

func NewCardDAO(db *sql.DB) *CardDAO {
        return &CardDAO{db: db}
}

// ──────────────────────────────────────
// 卡牌定义
// ──────────────────────────────────────

// GetCardByID 根据ID获取卡牌定义
func (d *CardDAO) GetCardByID(ctx context.Context, id int64) (*model.Card, error) {
        card := &model.Card{}
        err := d.db.QueryRowContext(ctx,
                `SELECT id, name, title, rarity, element, faction, role,
                        base_hp, base_atk, base_def, skill_id, lead_skill_id,
                        description, obtain_from, is_limited, created_at
                 FROM card_definitions WHERE id = ?`, id,
        ).Scan(
                &card.ID, &card.Name, &card.Title, &card.Rarity, &card.Element,
                &card.Faction, &card.Role, &card.BaseHP, &card.BaseATK, &card.BaseDEF,
                &card.SkillID, &card.LeadSkillID, &card.Description,
                &card.ObtainFrom, &card.IsLimited, &card.CreatedAt,
        )
        if err != nil {
                if errors.Is(err, sql.ErrNoRows) {
                        return nil, ErrCardNotFound
                }
                return nil, fmt.Errorf("get card by id: %w", err)
        }
        return card, nil
}

// GetCardsByIDs 批量获取卡牌定义
func (d *CardDAO) GetCardsByIDs(ctx context.Context, ids []int64) (map[int64]*model.Card, error) {
        if len(ids) == 0 {
                return make(map[int64]*model.Card), nil
        }

        placeholders := ""
        args := make([]interface{}, 0, len(ids))
        for i, id := range ids {
                if i > 0 { placeholders += "," }
                placeholders += "?"
                args = append(args, id)
        }

        query := fmt.Sprintf(
                `SELECT id, name, title, rarity, element, faction, role,
                        base_hp, base_atk, base_def, skill_id, lead_skill_id,
                        description, obtain_from, is_limited, created_at
                 FROM card_definitions WHERE id IN (%s)`, placeholders,
        )

        rows, err := d.db.QueryContext(ctx, query, args...)
        if err != nil {
                return nil, fmt.Errorf("batch get cards: %w", err)
        }
        defer rows.Close()

        cards := make(map[int64]*model.Card)
        for rows.Next() {
                card := &model.Card{}
                err := rows.Scan(
                        &card.ID, &card.Name, &card.Title, &card.Rarity, &card.Element,
                        &card.Faction, &card.Role, &card.BaseHP, &card.BaseATK, &card.BaseDEF,
                        &card.SkillID, &card.LeadSkillID, &card.Description,
                        &card.ObtainFrom, &card.IsLimited, &card.CreatedAt,
                )
                if err != nil {
                        return nil, fmt.Errorf("scan card: %w", err)
                }
                cards[card.ID] = card
        }
        return cards, nil
}

// ──────────────────────────────────────
// 卡池
// ──────────────────────────────────────

// GetPoolByID 获取卡池（含配置）
func (d *CardDAO) GetPoolByID(ctx context.Context, id int64) (*model.CardPool, error) {
        pool := &model.CardPool{}
        err := d.db.QueryRowContext(ctx,
                `SELECT id, name, display_name, type, start_time, end_time, status, config, created_at
                 FROM card_pools WHERE id = ? AND status = 1`, id,
        ).Scan(
                &pool.ID, &pool.Name, &pool.DisplayName, &pool.Type,
                &pool.StartTime, &pool.EndTime, &pool.Status,
                &pool.Config, &pool.CreatedAt,
        )
        if err != nil {
                if errors.Is(err, sql.ErrNoRows) {
                        return nil, ErrPoolNotFound
                }
                return nil, fmt.Errorf("get pool by id: %w", err)
        }
        return pool, nil
}

// ListOpenPools 获取所有开放卡池
func (d *CardDAO) ListOpenPools(ctx context.Context) ([]*model.CardPool, error) {
        rows, err := d.db.QueryContext(ctx,
                `SELECT id, name, display_name, type, start_time, end_time, status, config, created_at
                 FROM card_pools WHERE status = 1 AND end_time > NOW()
                 ORDER BY id ASC`,
        )
        if err != nil {
                return nil, fmt.Errorf("list open pools: %w", err)
        }
        defer rows.Close()

        pools := make([]*model.CardPool, 0)
        for rows.Next() {
                pool := &model.CardPool{}
                err := rows.Scan(
                        &pool.ID, &pool.Name, &pool.DisplayName, &pool.Type,
                        &pool.StartTime, &pool.EndTime, &pool.Status,
                        &pool.Config, &pool.CreatedAt,
                )
                if err != nil {
                        return nil, fmt.Errorf("scan pool: %w", err)
                }
                pools = append(pools, pool)
        }
        return pools, nil
}

// ──────────────────────────────────────
// 玩家卡牌
// ──────────────────────────────────────

// CreateUserCard 创建玩家卡牌实例
func (d *CardDAO) CreateUserCard(ctx context.Context, uc *model.UserCard) (int64, error) {
        result, err := d.db.ExecContext(ctx,
                `INSERT INTO user_cards (user_id, card_id, star, level, exp, is_locked, obtain_time, obtain_from, create_time, update_time)
                 VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())`,
                uc.UserID, uc.CardID, uc.Star, uc.Level, uc.Exp, uc.IsLocked, uc.ObtainFrom,
        )
        if err != nil {
                return 0, fmt.Errorf("create user card: %w", err)
        }
        return result.LastInsertId()
}

// GetUserCards 获取玩家所有卡牌（分页）
func (d *CardDAO) GetUserCards(ctx context.Context, userID int64, page, pageSize int, rarity int) ([]model.UserCard, int64, error) {
        where := "WHERE user_id = ?"
        args := []interface{}{userID}
        if rarity > 0 {
                where += " AND c.rarity = ?"
                args = append(args, rarity)
        }

        // 总数
        var total int64
        countQuery := fmt.Sprintf(`SELECT COUNT(1) FROM user_cards uc JOIN card_definitions c ON uc.card_id = c.id %s`, where)
        if err := d.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
                return nil, 0, fmt.Errorf("count user cards: %w", err)
        }

        // 分页查询
        offset := (page - 1) * pageSize
        listQuery := fmt.Sprintf(
                `SELECT uc.id, uc.user_id, uc.card_id, uc.star, uc.level, uc.exp, uc.is_locked,
                        uc.obtain_time, uc.obtain_from, uc.create_time, uc.update_time
                 FROM user_cards uc %s ORDER BY uc.create_time DESC LIMIT ? OFFSET ?`, where,
        )
        listArgs := append(args, pageSize, offset)
        rows, err := d.db.QueryContext(ctx, listQuery, listArgs...)
        if err != nil {
                return nil, 0, fmt.Errorf("list user cards: %w", err)
        }
        defer rows.Close()

        cards := make([]model.UserCard, 0)
        for rows.Next() {
                uc := model.UserCard{}
                err := rows.Scan(
                        &uc.ID, &uc.UserID, &uc.CardID, &uc.Star, &uc.Level, &uc.Exp,
                        &uc.IsLocked, &uc.ObtainTime, &uc.ObtainFrom, &uc.CreateTime, &uc.UpdateTime,
                )
                if err != nil {
                        return nil, 0, fmt.Errorf("scan user card: %w", err)
                }
                cards = append(cards, uc)
        }
        return cards, total, nil
}

// GetUserCardByID 获取玩家单张卡牌
func (d *CardDAO) GetUserCardByID(ctx context.Context, userCardID int64, userID int64) (*model.UserCard, error) {
        uc := &model.UserCard{}
        err := d.db.QueryRowContext(ctx,
                `SELECT id, user_id, card_id, star, level, exp, is_locked,
                        obtain_time, obtain_from, create_time, update_time
                 FROM user_cards WHERE id = ? AND user_id = ?`, userCardID, userID,
        ).Scan(
                &uc.ID, &uc.UserID, &uc.CardID, &uc.Star, &uc.Level, &uc.Exp,
                &uc.IsLocked, &uc.ObtainTime, &uc.ObtainFrom, &uc.CreateTime, &uc.UpdateTime,
        )
        if err != nil {
                if errors.Is(err, sql.ErrNoRows) {
                        return nil, ErrCardNotFound
                }
                return nil, fmt.Errorf("get user card: %w", err)
        }
        return uc, nil
}

// CountUserCardByCardID 统计玩家某张卡的数量
func (d *CardDAO) CountUserCardByCardID(ctx context.Context, userID, cardID int64) (int64, error) {
        var count int64
        err := d.db.QueryRowContext(ctx,
                `SELECT COUNT(1) FROM user_cards WHERE user_id = ? AND card_id = ?`, userID, cardID,
        ).Scan(&count)
        if err != nil {
                return 0, fmt.Errorf("count user card: %w", err)
        }
        return count, nil
}

// UpdateUserCardLock 更新卡牌锁定状态
func (d *CardDAO) UpdateUserCardLock(ctx context.Context, userCardID, userID int64, locked bool) error {
        result, err := d.db.ExecContext(ctx,
                `UPDATE user_cards SET is_locked = ?, update_time = NOW()
                 WHERE id = ? AND user_id = ?`, locked, userCardID, userID,
        )
        if err != nil {
                return fmt.Errorf("update card lock: %w", err)
        }
        rows, _ := result.RowsAffected()
        if rows == 0 {
                return ErrCardNotFound
        }
        return nil
}

// ──────────────────────────────────────
// 抽卡记录
// ──────────────────────────────────────

// BatchCreateGachaRecords 批量写入抽卡记录
func (d *CardDAO) BatchCreateGachaRecords(ctx context.Context, records []*model.GachaRecord) error {
        if len(records) == 0 {
                return nil
        }

        tx, err := d.db.Begin()
        if err != nil {
                return fmt.Errorf("begin tx: %w", err)
        }
        defer tx.Rollback()

        stmt, err := tx.PrepareContext(ctx,
                `INSERT INTO gacha_records (user_id, pool_id, card_id, rarity, is_new, is_pity, pull_index, created_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`)
        if err != nil {
                return fmt.Errorf("prepare stmt: %w", err)
        }
        defer stmt.Close()

        for _, r := range records {
                if _, err := stmt.ExecContext(ctx, r.UserID, r.PoolID, r.CardID, r.Rarity, r.IsNew, r.IsPity, r.PullIndex); err != nil {
                        return fmt.Errorf("insert gacha record: %w", err)
                }
        }

        return tx.Commit()
}

// ──────────────────────────────────────
// 玩家抽卡统计（保底）
// ──────────────────────────────────────

// GetGachaStats 获取玩家抽卡统计
func (d *CardDAO) GetGachaStats(ctx context.Context, userID, poolID int64) (*model.UserGachaInfo, error) {
        info := &model.UserGachaInfo{}
        err := d.db.QueryRowContext(ctx,
                `SELECT user_id, pool_id, total_pulls, ssr_pity_counter, sr_pity_counter
                 FROM user_gacha_stats WHERE user_id = ? AND pool_id = ?`, userID, poolID,
        ).Scan(&info.UserID, &info.PoolID, &info.TotalPulls, &info.SSRPityCounter, &info.SRPityCounter)
        if err != nil {
                if errors.Is(err, sql.ErrNoRows) {
                        return &model.UserGachaInfo{UserID: userID, PoolID: poolID}, nil
                }
                return nil, fmt.Errorf("get gacha stats: %w", err)
        }
        return info, nil
}

// UpsertGachaStats 更新抽卡统计
func (d *CardDAO) UpsertGachaStats(ctx context.Context, info *model.UserGachaInfo) error {
        _, err := d.db.ExecContext(ctx,
                `INSERT INTO user_gacha_stats (user_id, pool_id, total_pulls, ssr_pity_counter, sr_pity_counter, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, NOW(), NOW())
                 ON DUPLICATE KEY UPDATE
                   total_pulls = VALUES(total_pulls),
                   ssr_pity_counter = VALUES(ssr_pity_counter),
                   sr_pity_counter = VALUES(sr_pity_counter),
                   updated_at = NOW()`,
                info.UserID, info.PoolID, info.TotalPulls, info.SSRPityCounter, info.SRPityCounter,
        )
        if err != nil {
                return fmt.Errorf("upsert gacha stats: %w", err)
        }
        return nil
}

// GetGachaHistory 获取抽卡历史
func (d *CardDAO) GetGachaHistory(ctx context.Context, userID int64, limit int) ([]model.GachaRecord, error) {
        rows, err := d.db.QueryContext(ctx,
                `SELECT id, user_id, pool_id, card_id, rarity, is_new, is_pity, pull_index, created_at
                 FROM gacha_records WHERE user_id = ?
                 ORDER BY created_at DESC LIMIT ?`, userID, limit,
        )
        if err != nil {
                return nil, fmt.Errorf("get gacha history: %w", err)
        }
        defer rows.Close()

        records := make([]model.GachaRecord, 0)
        for rows.Next() {
                r := model.GachaRecord{}
                err := rows.Scan(&r.ID, &r.UserID, &r.PoolID, &r.CardID, &r.Rarity, &r.IsNew, &r.IsPity, &r.PullIndex, &r.CreatedAt)
                if err != nil {
                        return nil, fmt.Errorf("scan record: %w", err)
                }
                records = append(records, r)
        }
        return records, nil
}

// ensure json import is used
var _ = json.Marshal
