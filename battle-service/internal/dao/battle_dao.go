package dao

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"user-service/internal/model"
)

var ErrBattleNotFound = errors.New("battle record not found")

// BattleDAO 战斗数据访问层
type BattleDAO struct {
	db *sql.DB
}

func NewBattleDAO(db *sql.DB) *BattleDAO {
	return &BattleDAO{db: db}
}

// CreateBattleRecord 创建战斗记录
func (d *BattleDAO) CreateBattleRecord(ctx context.Context, r *model.BattleRecord) (int64, error) {
	result, err := d.db.ExecContext(ctx,
		`INSERT INTO battle_records (battle_id, attacker_id, defender_id, attacker_win, type, stage_id, turn_count, result_json, duration_ms, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
		r.BattleID, r.AttackerID, r.DefenderID, r.AttackerWin, r.Type, r.StageID, r.TurnCount, r.ResultJSON, r.Duration,
	)
	if err != nil {
		return 0, fmt.Errorf("create battle record: %w", err)
	}
	return result.LastInsertId()
}

// GetBattleRecord 获取战斗记录
func (d *BattleDAO) GetBattleRecord(ctx context.Context, battleID string) (*model.BattleRecord, error) {
	r := &model.BattleRecord{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, battle_id, attacker_id, defender_id, attacker_win, type, stage_id, turn_count, result_json, duration_ms, created_at
		 FROM battle_records WHERE battle_id = ?`, battleID,
	).Scan(&r.ID, &r.BattleID, &r.AttackerID, &r.DefenderID, &r.AttackerWin, &r.Type, &r.StageID, &r.TurnCount, &r.ResultJSON, &r.Duration, &r.CreatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) { return nil, ErrBattleNotFound }
		return nil, fmt.Errorf("get battle record: %w", err)
	}
	return r, nil
}

// ListBattleRecords 获取玩家战斗历史
func (d *BattleDAO) ListBattleRecords(ctx context.Context, userID int64, limit int) ([]model.BattleRecord, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, battle_id, attacker_id, defender_id, attacker_win, type, stage_id, turn_count, result_json, duration_ms, created_at
		 FROM battle_records WHERE attacker_id = ? OR defender_id = ?
		 ORDER BY created_at DESC LIMIT ?`, userID, userID, limit,
	)
	if err != nil { return nil, fmt.Errorf("list battle records: %w", err) }
	defer rows.Close()

	records := make([]model.BattleRecord, 0)
	for rows.Next() {
		r := model.BattleRecord{}
		if err := rows.Scan(&r.ID, &r.BattleID, &r.AttackerID, &r.DefenderID, &r.AttackerWin, &r.Type, &r.StageID, &r.TurnCount, &r.ResultJSON, &r.Duration, &r.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan battle record: %w", err)
		}
		records = append(records, r)
	}
	return records, nil
}

// GetStageDefinition 获取关卡定义
func (d *BattleDAO) GetStageDefinition(ctx context.Context, stageID int) (*StageDef, error) {
	var name, enemyTeamJSON, rewardsJSON, firstRewardJSON string
	err := d.db.QueryRowContext(ctx,
		`SELECT name, enemy_team_json, rewards_json, first_reward_json
		 FROM stage_definitions WHERE id = ?`, stageID,
	).Scan(&name, &enemyTeamJSON, &rewardsJSON, &firstRewardJSON)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) { return nil, ErrBattleNotFound }
		return nil, fmt.Errorf("get stage: %w", err)
	}
	return &StageDef{Name: name, EnemyTeamJSON: enemyTeamJSON, RewardsJSON: rewardsJSON, FirstRewardJSON: firstRewardJSON}, nil
}

// StageDef 关卡定义
type StageDef struct {
	Name             string
	EnemyTeamJSON    string
	RewardsJSON      string
	FirstRewardJSON  string
}

// GetSkillDefinition 获取技能定义
func (d *BattleDAO) GetSkillDefinition(ctx context.Context, skillID int64) (*model.Skill, error) {
	var buffsJSON sql.NullString
	skill := &model.Skill{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, name, type, target_type, damage_type, damage_ratio, base_damage, cd, special, heal_ratio, buffs_json, description
		 FROM skill_definitions WHERE id = ?`, skillID,
	).Scan(&skill.ID, &skill.Name, &skill.Type, &skill.TargetType, &skill.DamageType, &skill.DamageRatio, &skill.BaseDamage, &skill.CD, &skill.Special, &skill.HealRatio, &buffsJSON, &skill.Description)
	if err != nil {
		return nil, fmt.Errorf("get skill: %w", err)
	}
	if buffsJSON.Valid {
		_ = json.Unmarshal([]byte(buffsJSON.String), &skill.Buffs)
	}
	return skill, nil
}

var _ = time.Now()
