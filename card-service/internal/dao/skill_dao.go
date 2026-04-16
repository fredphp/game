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
	ErrSkillNotFound      = errors.New("skill not found")
	ErrSkillPoolNotFound  = errors.New("skill pool not found")
	ErrUserSkillNotFound  = errors.New("user skill not found")
	ErrSlotOccupied       = errors.New("skill slot is already occupied")
	ErrSkillAlreadyEquipped = errors.New("skill is already equipped on another hero")
	ErrInvalidSlot        = errors.New("invalid slot number")
	ErrInsufficientCount  = errors.New("insufficient skill count")
)

// SkillDAO 技能数据访问层
type SkillDAO struct {
	db *sql.DB
}

func NewSkillDAO(db *sql.DB) *SkillDAO {
	return &SkillDAO{db: db}
}

// ──────────────────────────────────────
// 技能定义
// ──────────────────────────────────────

// GetSkillDefinitionByID 获取技能定义
func (d *SkillDAO) GetSkillDefinitionByID(ctx context.Context, id int64) (*model.SkillDefinition, error) {
	skill := &model.SkillDefinition{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, name, type, target_type, damage_type, damage_ratio, base_damage,
		        cd, special, heal_ratio, buffs_json, rarity, category, icon,
		        description, level_config, is_obtainable, max_level, created_at
		 FROM skill_definitions WHERE id = ?`, id,
	).Scan(
		&skill.ID, &skill.Name, &skill.Type, &skill.TargetType, &skill.DamageType,
		&skill.DamageRatio, &skill.BaseDamage, &skill.CD, &skill.Special,
		&skill.HealRatio, &skill.BuffsJSON, &skill.Rarity, &skill.Category,
		&skill.Icon, &skill.Description, &skill.LevelConfig,
		&skill.IsObtainable, &skill.MaxLevel, &skill.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSkillNotFound
		}
		return nil, fmt.Errorf("get skill definition: %w", err)
	}
	return skill, nil
}

// GetSkillDefinitionsByIDs 批量获取技能定义
func (d *SkillDAO) GetSkillDefinitionsByIDs(ctx context.Context, ids []int64) (map[int64]*model.SkillDefinition, error) {
	if len(ids) == 0 {
		return make(map[int64]*model.SkillDefinition), nil
	}

	placeholders := ""
	args := make([]interface{}, 0, len(ids))
	for i, id := range ids {
		if i > 0 {
			placeholders += ","
		}
		placeholders += "?"
		args = append(args, id)
	}

	query := fmt.Sprintf(
		`SELECT id, name, type, target_type, damage_type, damage_ratio, base_damage,
		        cd, special, heal_ratio, buffs_json, rarity, category, icon,
		        description, level_config, is_obtainable, max_level, created_at
		 FROM skill_definitions WHERE id IN (%s)`, placeholders,
	)

	rows, err := d.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("batch get skill defs: %w", err)
	}
	defer rows.Close()

	skills := make(map[int64]*model.SkillDefinition)
	for rows.Next() {
		skill := &model.SkillDefinition{}
		err := rows.Scan(
			&skill.ID, &skill.Name, &skill.Type, &skill.TargetType, &skill.DamageType,
			&skill.DamageRatio, &skill.BaseDamage, &skill.CD, &skill.Special,
			&skill.HealRatio, &skill.BuffsJSON, &skill.Rarity, &skill.Category,
			&skill.Icon, &skill.Description, &skill.LevelConfig,
			&skill.IsObtainable, &skill.MaxLevel, &skill.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan skill def: %w", err)
		}
		skills[skill.ID] = skill
	}
	return skills, nil
}

// ListSkillDefinitions 获取技能列表（分页，支持筛选）
func (d *SkillDAO) ListSkillDefinitions(ctx context.Context, page, pageSize int, rarity int, category string) ([]model.SkillDefinition, int64, error) {
	where := "WHERE 1=1"
	args := []interface{}{}
	if rarity > 0 {
		where += " AND rarity = ?"
		args = append(args, rarity)
	}
	if category != "" {
		where += " AND category = ?"
		args = append(args, category)
	}

	var total int64
	countQuery := fmt.Sprintf(`SELECT COUNT(1) FROM skill_definitions %s`, where)
	if err := d.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count skills: %w", err)
	}

	offset := (page - 1) * pageSize
	listQuery := fmt.Sprintf(
		`SELECT id, name, type, target_type, damage_type, damage_ratio, base_damage,
		        cd, special, heal_ratio, buffs_json, rarity, category, icon,
		        description, level_config, is_obtainable, max_level, created_at
		 FROM skill_definitions %s ORDER BY rarity DESC, id ASC LIMIT ? OFFSET ?`, where,
	)
	listArgs := append(args, pageSize, offset)
	rows, err := d.db.QueryContext(ctx, listQuery, listArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("list skills: %w", err)
	}
	defer rows.Close()

	skills := make([]model.SkillDefinition, 0)
	for rows.Next() {
		skill := model.SkillDefinition{}
		err := rows.Scan(
			&skill.ID, &skill.Name, &skill.Type, &skill.TargetType, &skill.DamageType,
			&skill.DamageRatio, &skill.BaseDamage, &skill.CD, &skill.Special,
			&skill.HealRatio, &skill.BuffsJSON, &skill.Rarity, &skill.Category,
			&skill.Icon, &skill.Description, &skill.LevelConfig,
			&skill.IsObtainable, &skill.MaxLevel, &skill.CreatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan skill: %w", err)
		}
		skills = append(skills, skill)
	}
	return skills, total, nil
}

// ──────────────────────────────────────
// 技能卡池
// ──────────────────────────────────────

// GetSkillPoolByID 获取技能卡池
func (d *SkillDAO) GetSkillPoolByID(ctx context.Context, id int64) (*model.SkillPool, error) {
	pool := &model.SkillPool{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, name, display_name, type, start_time, end_time, status, config, created_at
		 FROM skill_pools WHERE id = ? AND status = 1`, id,
	).Scan(
		&pool.ID, &pool.Name, &pool.DisplayName, &pool.Type,
		&pool.StartTime, &pool.EndTime, &pool.Status,
		&pool.Config, &pool.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSkillPoolNotFound
		}
		return nil, fmt.Errorf("get skill pool: %w", err)
	}
	return pool, nil
}

// ListOpenSkillPools 获取所有开放的技能卡池
func (d *SkillDAO) ListOpenSkillPools(ctx context.Context) ([]*model.SkillPool, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, name, display_name, type, start_time, end_time, status, config, created_at
		 FROM skill_pools WHERE status = 1 AND end_time > NOW()
		 ORDER BY id ASC`,
	)
	if err != nil {
		return nil, fmt.Errorf("list open skill pools: %w", err)
	}
	defer rows.Close()

	pools := make([]*model.SkillPool, 0)
	for rows.Next() {
		pool := &model.SkillPool{}
		err := rows.Scan(
			&pool.ID, &pool.Name, &pool.DisplayName, &pool.Type,
			&pool.StartTime, &pool.EndTime, &pool.Status,
			&pool.Config, &pool.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan skill pool: %w", err)
		}
		pools = append(pools, pool)
	}
	return pools, nil
}

// ──────────────────────────────────────
// 玩家技能背包
// ──────────────────────────────────────

// GetUserSkillByID 获取玩家技能实例
func (d *SkillDAO) GetUserSkillByID(ctx context.Context, userSkillID, userID int64) (*model.UserSkill, error) {
	us := &model.UserSkill{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, user_id, skill_id, level, count, is_locked, is_equipped,
		        obtain_time, obtain_from, create_time, update_time
		 FROM user_skills WHERE id = ? AND user_id = ?`, userSkillID, userID,
	).Scan(
		&us.ID, &us.UserID, &us.SkillID, &us.Level, &us.Count,
		&us.IsLocked, &us.IsEquipped, &us.ObtainTime, &us.ObtainFrom,
		&us.CreateTime, &us.UpdateTime,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserSkillNotFound
		}
		return nil, fmt.Errorf("get user skill: %w", err)
	}
	return us, nil
}

// GetUserSkills 获取玩家技能列表（分页）
func (d *SkillDAO) GetUserSkills(ctx context.Context, userID int64, page, pageSize int, rarity int, category string) ([]model.UserSkill, int64, error) {
	// Build where clause with join for filtering
	where := "WHERE us.user_id = ?"
	args := []interface{}{userID}
	if rarity > 0 {
		where += " AND sd.rarity = ?"
		args = append(args, rarity)
	}
	if category != "" {
		where += " AND sd.category = ?"
		args = append(args, category)
	}

	var total int64
	countQuery := fmt.Sprintf(
		`SELECT COUNT(1) FROM user_skills us JOIN skill_definitions sd ON us.skill_id = sd.id %s`, where,
	)
	if err := d.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count user skills: %w", err)
	}

	offset := (page - 1) * pageSize
	listQuery := fmt.Sprintf(
		`SELECT us.id, us.user_id, us.skill_id, us.level, us.count, us.is_locked, us.is_equipped,
		        us.obtain_time, us.obtain_from, us.create_time, us.update_time
		 FROM user_skills us %s ORDER BY us.create_time DESC LIMIT ? OFFSET ?`, where,
	)
	listArgs := append(args, pageSize, offset)
	rows, err := d.db.QueryContext(ctx, listQuery, listArgs...)
	if err != nil {
		return nil, 0, fmt.Errorf("list user skills: %w", err)
	}
	defer rows.Close()

	skills := make([]model.UserSkill, 0)
	for rows.Next() {
		us := model.UserSkill{}
		err := rows.Scan(
			&us.ID, &us.UserID, &us.SkillID, &us.Level, &us.Count,
			&us.IsLocked, &us.IsEquipped, &us.ObtainTime, &us.ObtainFrom,
			&us.CreateTime, &us.UpdateTime,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan user skill: %w", err)
		}
		skills = append(skills, us)
	}
	return skills, total, nil
}

// GetUserSkillBySkillID 获取玩家持有的某个技能
func (d *SkillDAO) GetUserSkillBySkillID(ctx context.Context, userID, skillID int64) (*model.UserSkill, error) {
	us := &model.UserSkill{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, user_id, skill_id, level, count, is_locked, is_equipped,
		        obtain_time, obtain_from, create_time, update_time
		 FROM user_skills WHERE user_id = ? AND skill_id = ?`, userID, skillID,
	).Scan(
		&us.ID, &us.UserID, &us.SkillID, &us.Level, &us.Count,
		&us.IsLocked, &us.IsEquipped, &us.ObtainTime, &us.ObtainFrom,
		&us.CreateTime, &us.UpdateTime,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserSkillNotFound
		}
		return nil, fmt.Errorf("get user skill by skill_id: %w", err)
	}
	return us, nil
}

// CreateUserSkill 创建玩家技能实例
func (d *SkillDAO) CreateUserSkill(ctx context.Context, us *model.UserSkill) (int64, error) {
	result, err := d.db.ExecContext(ctx,
		`INSERT INTO user_skills (user_id, skill_id, level, count, is_locked, is_equipped, obtain_time, obtain_from, create_time, update_time)
		 VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())`,
		us.UserID, us.SkillID, us.Level, us.Count, us.IsLocked, us.IsEquipped, us.ObtainFrom,
	)
	if err != nil {
		return 0, fmt.Errorf("create user skill: %w", err)
	}
	return result.LastInsertId()
}

// IncrementUserSkillCount 增加玩家技能数量（抽到重复技能时）
func (d *SkillDAO) IncrementUserSkillCount(ctx context.Context, userSkillID int64, count int) error {
	result, err := d.db.ExecContext(ctx,
		`UPDATE user_skills SET count = count + ?, update_time = NOW() WHERE id = ?`,
		count, userSkillID,
	)
	if err != nil {
		return fmt.Errorf("increment skill count: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrUserSkillNotFound
	}
	return nil
}

// UpdateUserSkillLock 更新技能锁定状态
func (d *SkillDAO) UpdateUserSkillLock(ctx context.Context, userSkillID, userID int64, locked bool) error {
	result, err := d.db.ExecContext(ctx,
		`UPDATE user_skills SET is_locked = ?, update_time = NOW() WHERE id = ? AND user_id = ?`,
		locked, userSkillID, userID,
	)
	if err != nil {
		return fmt.Errorf("update skill lock: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrUserSkillNotFound
	}
	return nil
}

// UpdateUserSkillEquipped 更新技能装备状态
func (d *SkillDAO) UpdateUserSkillEquipped(ctx context.Context, userSkillID int64, equipped bool) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE user_skills SET is_equipped = ?, update_time = NOW() WHERE id = ?`,
		equipped, userSkillID,
	)
	if err != nil {
		return fmt.Errorf("update skill equipped: %w", err)
	}
	return nil
}

// UpdateUserSkillLevel 更新技能等级
func (d *SkillDAO) UpdateUserSkillLevel(ctx context.Context, userSkillID int64, newLevel int) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE user_skills SET level = ?, update_time = NOW() WHERE id = ?`,
		newLevel, userSkillID,
	)
	if err != nil {
		return fmt.Errorf("update skill level: %w", err)
	}
	return nil
}

// DecreaseUserSkillCount 减少玩家技能数量
func (d *SkillDAO) DecreaseUserSkillCount(ctx context.Context, userSkillID int64, count int) error {
	result, err := d.db.ExecContext(ctx,
		`UPDATE user_skills SET count = count - ?, update_time = NOW() WHERE id = ? AND count >= ?`,
		count, userSkillID, count,
	)
	if err != nil {
		return fmt.Errorf("decrease skill count: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrInsufficientCount
	}
	return nil
}

// DeleteUserSkillIfEmpty 如果数量为0则删除
func (d *SkillDAO) DeleteUserSkillIfEmpty(ctx context.Context, userSkillID int64) error {
	_, err := d.db.ExecContext(ctx,
		`DELETE FROM user_skills WHERE id = ? AND count <= 0`, userSkillID,
	)
	if err != nil {
		return fmt.Errorf("delete empty skill: %w", err)
	}
	return nil
}

// ──────────────────────────────────────
// 英雄技能装备
// ──────────────────────────────────────

// EquipSkillToHero 装备技能到英雄
func (d *SkillDAO) EquipSkillToHero(ctx context.Context, eq *model.HeroSkillEquipment) error {
	_, err := d.db.ExecContext(ctx,
		`INSERT INTO hero_skill_equipments (user_id, user_card_id, user_skill_id, slot, equip_time, create_time, update_time)
		 VALUES (?, ?, ?, ?, NOW(), NOW(), NOW())`,
		eq.UserID, eq.UserCardID, eq.UserSkillID, eq.Slot,
	)
	if err != nil {
		return fmt.Errorf("equip skill: %w", err)
	}
	return nil
}

// UnequipSkillFromHero 卸下英雄技能
func (d *SkillDAO) UnequipSkillFromHero(ctx context.Context, userCardID int64, slot int, userID int64) error {
	result, err := d.db.ExecContext(ctx,
		`DELETE FROM hero_skill_equipments WHERE user_card_id = ? AND slot = ? AND user_id = ?`,
		userCardID, slot, userID,
	)
	if err != nil {
		return fmt.Errorf("unequip skill: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrSlotOccupied
	}
	return nil
}

// GetHeroEquipments 获取英雄所有装备的技能
func (d *SkillDAO) GetHeroEquipments(ctx context.Context, userCardID int64, userID int64) ([]model.HeroSkillEquipment, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, user_id, user_card_id, user_skill_id, slot, equip_time, create_time, update_time
		 FROM hero_skill_equipments WHERE user_card_id = ? AND user_id = ? ORDER BY slot ASC`,
		userCardID, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("get hero equipments: %w", err)
	}
	defer rows.Close()

	equips := make([]model.HeroSkillEquipment, 0)
	for rows.Next() {
		eq := model.HeroSkillEquipment{}
		err := rows.Scan(
			&eq.ID, &eq.UserID, &eq.UserCardID, &eq.UserSkillID,
			&eq.Slot, &eq.EquipTime, &eq.CreateTime, &eq.UpdateTime,
		)
		if err != nil {
			return nil, fmt.Errorf("scan equipment: %w", err)
		}
		equips = append(equips, eq)
	}
	return equips, nil
}

// GetSlotEquipment 获取指定槽位的装备
func (d *SkillDAO) GetSlotEquipment(ctx context.Context, userCardID int64, slot int) (*model.HeroSkillEquipment, error) {
	eq := &model.HeroSkillEquipment{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, user_id, user_card_id, user_skill_id, slot, equip_time, create_time, update_time
		 FROM hero_skill_equipments WHERE user_card_id = ? AND slot = ?`, userCardID, slot,
	).Scan(
		&eq.ID, &eq.UserID, &eq.UserCardID, &eq.UserSkillID,
		&eq.Slot, &eq.EquipTime, &eq.CreateTime, &eq.UpdateTime,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("get slot equipment: %w", err)
	}
	return eq, nil
}

// IsSkillEquippedAnywhere 检查技能是否已装备到某英雄
func (d *SkillDAO) IsSkillEquippedAnywhere(ctx context.Context, userSkillID int64) (bool, error) {
	var count int
	err := d.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM hero_skill_equipments WHERE user_skill_id = ?`, userSkillID,
	).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("check skill equipped: %w", err)
	}
	return count > 0, nil
}

// GetEquippedSkillInfo 获取已装备技能的所属卡牌ID
func (d *SkillDAO) GetEquippedSkillInfo(ctx context.Context, userSkillID int64) (int64, error) {
	var userCardID int64
	err := d.db.QueryRowContext(ctx,
		`SELECT user_card_id FROM hero_skill_equipments WHERE user_skill_id = ? LIMIT 1`,
		userSkillID,
	).Scan(&userCardID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return 0, nil
		}
		return 0, fmt.Errorf("get equipped skill info: %w", err)
	}
	return userCardID, nil
}

// CountHeroEquipments 统计英雄已装备的技能数
func (d *SkillDAO) CountHeroEquipments(ctx context.Context, userCardID int64, userID int64) (int, error) {
	var count int
	err := d.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM hero_skill_equipments WHERE user_card_id = ? AND user_id = ?`,
		userCardID, userID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count hero equipments: %w", err)
	}
	return count, nil
}

// ──────────────────────────────────────
// 技能抽卡记录
// ──────────────────────────────────────

// BatchCreateSkillGachaRecords 批量写入技能抽卡记录
func (d *SkillDAO) BatchCreateSkillGachaRecords(ctx context.Context, records []*model.SkillGachaRecord) error {
	if len(records) == 0 {
		return nil
	}

	tx, err := d.db.Begin()
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx,
		`INSERT INTO skill_gacha_records (user_id, pool_id, skill_id, rarity, is_new, is_pity, pull_index, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`)
	if err != nil {
		return fmt.Errorf("prepare stmt: %w", err)
	}
	defer stmt.Close()

	for _, r := range records {
		if _, err := stmt.ExecContext(ctx, r.UserID, r.PoolID, r.SkillID, r.Rarity, r.IsNew, r.IsPity, r.PullIndex); err != nil {
			return fmt.Errorf("insert skill gacha record: %w", err)
		}
	}

	return tx.Commit()
}

// GetSkillGachaHistory 获取技能抽卡历史
func (d *SkillDAO) GetSkillGachaHistory(ctx context.Context, userID int64, limit int) ([]model.SkillGachaRecord, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, user_id, pool_id, skill_id, rarity, is_new, is_pity, pull_index, created_at
		 FROM skill_gacha_records WHERE user_id = ?
		 ORDER BY created_at DESC LIMIT ?`, userID, limit,
	)
	if err != nil {
		return nil, fmt.Errorf("get skill gacha history: %w", err)
	}
	defer rows.Close()

	records := make([]model.SkillGachaRecord, 0)
	for rows.Next() {
		r := model.SkillGachaRecord{}
		err := rows.Scan(
			&r.ID, &r.UserID, &r.PoolID, &r.SkillID, &r.Rarity,
			&r.IsNew, &r.IsPity, &r.PullIndex, &r.CreatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan skill gacha record: %w", err)
		}
		records = append(records, r)
	}
	return records, nil
}

// ──────────────────────────────────────
// 技能抽卡统计（保底）
// ──────────────────────────────────────

// GetSkillGachaStats 获取玩家技能抽卡统计
func (d *SkillDAO) GetSkillGachaStats(ctx context.Context, userID, poolID int64) (*model.UserSkillGachaStats, error) {
	stats := &model.UserSkillGachaStats{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, user_id, pool_id, total_pulls, ssr_pity_counter, sr_pity_counter
		 FROM user_skill_gacha_stats WHERE user_id = ? AND pool_id = ?`, userID, poolID,
	).Scan(&stats.ID, &stats.UserID, &stats.PoolID, &stats.TotalPulls, &stats.SSRPityCounter, &stats.SRPityCounter)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return &model.UserSkillGachaStats{UserID: userID, PoolID: poolID}, nil
		}
		return nil, fmt.Errorf("get skill gacha stats: %w", err)
	}
	return stats, nil
}

// UpsertSkillGachaStats 更新技能抽卡统计
func (d *SkillDAO) UpsertSkillGachaStats(ctx context.Context, stats *model.UserSkillGachaStats) error {
	_, err := d.db.ExecContext(ctx,
		`INSERT INTO user_skill_gacha_stats (user_id, pool_id, total_pulls, ssr_pity_counter, sr_pity_counter, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, NOW(), NOW())
		 ON DUPLICATE KEY UPDATE
		   total_pulls = VALUES(total_pulls),
		   ssr_pity_counter = VALUES(ssr_pity_counter),
		   sr_pity_counter = VALUES(sr_pity_counter),
		   updated_at = NOW()`,
		stats.UserID, stats.PoolID, stats.TotalPulls, stats.SSRPityCounter, stats.SRPityCounter,
	)
	if err != nil {
		return fmt.Errorf("upsert skill gacha stats: %w", err)
	}
	return nil
}

// ──────────────────────────────────────
// 技能分解记录
// ──────────────────────────────────────

// CreateDecomposeRecord 创建分解记录
func (d *SkillDAO) CreateDecomposeRecord(ctx context.Context, rec *model.SkillDecomposeRecord) error {
	_, err := d.db.ExecContext(ctx,
		`INSERT INTO skill_decompose_records (user_id, user_skill_id, skill_id, skill_name, rarity, level, decompose_count, reward_type, reward_amount, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
		rec.UserID, rec.UserSkillID, rec.SkillID, rec.SkillName, rec.Rarity, rec.Level,
		rec.DecomposeCount, rec.RewardType, rec.RewardAmount,
	)
	if err != nil {
		return fmt.Errorf("create decompose record: %w", err)
	}
	return nil
}

// ──────────────────────────────────────
// 技能升级记录
// ──────────────────────────────────────

// CreateUpgradeRecord 创建升级记录
func (d *SkillDAO) CreateUpgradeRecord(ctx context.Context, rec *model.SkillUpgradeRecord) error {
	_, err := d.db.ExecContext(ctx,
		`INSERT INTO skill_upgrade_records (user_id, user_skill_id, skill_id, before_level, after_level, cost_fragments, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, NOW())`,
		rec.UserID, rec.UserSkillID, rec.SkillID, rec.BeforeLevel, rec.AfterLevel, rec.CostFragments,
	)
	if err != nil {
		return fmt.Errorf("create upgrade record: %w", err)
	}
	return nil
}

// ensure json import is used
var _ = json.Marshal
