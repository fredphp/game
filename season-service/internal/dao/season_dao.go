package dao

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"season-service/internal/model"
)

var ErrSeasonNotFound = errors.New("season not found")
var ErrRewardNotFound = errors.New("reward not found")

// SeasonDAO 赛季数据访问层
type SeasonDAO struct {
	db *sql.DB
}

// NewSeasonDAO 创建 SeasonDAO
func NewSeasonDAO(db *sql.DB) *SeasonDAO {
	return &SeasonDAO{db: db}
}

// ================================================================
// Season CRUD
// ================================================================

// CreateSeason 创建赛季
func (d *SeasonDAO) CreateSeason(ctx context.Context, season *model.Season) (int64, error) {
	result, err := d.db.ExecContext(ctx,
		`INSERT INTO seasons (season_num, server_id, name, status, start_time, end_time,
		 duration_days, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
		season.SeasonNum, season.ServerID, season.Name, season.Status,
		season.StartTime, season.EndTime, season.DurationDays,
	)
	if err != nil {
		return 0, fmt.Errorf("insert season failed: %w", err)
	}
	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("get last insert id failed: %w", err)
	}
	return id, nil
}

// GetSeasonByID 根据ID获取赛季
func (d *SeasonDAO) GetSeasonByID(ctx context.Context, id int64) (*model.Season, error) {
	s := &model.Season{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, season_num, server_id, name, status, start_time, end_time,
		        settled_at, duration_days, player_count, guild_count,
		        city_reset_count, reward_sent_count, settle_result,
		        created_at, updated_at
		 FROM seasons WHERE id = ?`, id,
	).Scan(
		&s.ID, &s.SeasonNum, &s.ServerID, &s.Name, &s.Status,
		&s.StartTime, &s.EndTime, &s.SettledAt, &s.DurationDays,
		&s.PlayerCount, &s.GuildCount, &s.CityResetCount, &s.RewardSentCount,
		&s.SettleResult, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSeasonNotFound
		}
		return nil, fmt.Errorf("get season by id failed: %w", err)
	}
	return s, nil
}

// GetCurrentSeason 获取当前进行中的赛季
func (d *SeasonDAO) GetCurrentSeason(ctx context.Context, serverID int64) (*model.Season, error) {
	s := &model.Season{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, season_num, server_id, name, status, start_time, end_time,
		        settled_at, duration_days, player_count, guild_count,
		        city_reset_count, reward_sent_count, settle_result,
		        created_at, updated_at
		 FROM seasons WHERE server_id = ? AND status IN (1, 2, 3)
		 ORDER BY season_num DESC LIMIT 1`, serverID,
	).Scan(
		&s.ID, &s.SeasonNum, &s.ServerID, &s.Name, &s.Status,
		&s.StartTime, &s.EndTime, &s.SettledAt, &s.DurationDays,
		&s.PlayerCount, &s.GuildCount, &s.CityResetCount, &s.RewardSentCount,
		&s.SettleResult, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSeasonNotFound
		}
		return nil, fmt.Errorf("get current season failed: %w", err)
	}
	return s, nil
}

// ListSeasons 获取赛季列表
func (d *SeasonDAO) ListSeasons(ctx context.Context, serverID int64, status int8, page, pageSize int) ([]*model.Season, int64, error) {
	where := "WHERE 1=1"
	args := []interface{}{}

	if serverID > 0 {
		where += " AND server_id = ?"
		args = append(args, serverID)
	}
	if status >= 0 {
		where += " AND status = ?"
		args = append(args, status)
	}

	// Count
	var total int64
	countArgs := make([]interface{}, len(args))
	copy(countArgs, args)
	err := d.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM seasons `+where, countArgs...,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count seasons failed: %w", err)
	}

	// List
	args = append(args, (page-1)*pageSize, pageSize)
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, season_num, server_id, name, status, start_time, end_time,
		        settled_at, duration_days, player_count, guild_count,
		        city_reset_count, reward_sent_count, settle_result,
		        created_at, updated_at
		 FROM seasons `+where+` ORDER BY season_num DESC LIMIT ? OFFSET ?`, args...,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list seasons failed: %w", err)
	}
	defer rows.Close()

	var seasons []*model.Season
	for rows.Next() {
		s := &model.Season{}
		err := rows.Scan(
			&s.ID, &s.SeasonNum, &s.ServerID, &s.Name, &s.Status,
			&s.StartTime, &s.EndTime, &s.SettledAt, &s.DurationDays,
			&s.PlayerCount, &s.GuildCount, &s.CityResetCount, &s.RewardSentCount,
			&s.SettleResult, &s.CreatedAt, &s.UpdatedAt,
		)
		if err != nil {
			return nil, 0, fmt.Errorf("scan season row failed: %w", err)
		}
		seasons = append(seasons, s)
	}

	return seasons, total, nil
}

// UpdateSeasonStatus 更新赛季状态（CAS）
func (d *SeasonDAO) UpdateSeasonStatus(ctx context.Context, id int64, expected, newStatus int8) (bool, error) {
	result, err := d.db.ExecContext(ctx,
		`UPDATE seasons SET status = ?, updated_at = NOW() WHERE id = ? AND status = ?`,
		newStatus, id, expected,
	)
	if err != nil {
		return false, fmt.Errorf("update season status failed: %w", err)
	}
	affected, _ := result.RowsAffected()
	return affected > 0, nil
}

// UpdateSeasonSettleResult 更新结算结果
func (d *SeasonDAO) UpdateSeasonSettleResult(ctx context.Context, id int64, result string, rewardCount int) error {
	now := time.Now()
	_, err := d.db.ExecContext(ctx,
		`UPDATE seasons SET settle_result = ?, reward_sent_count = ?, settled_at = ?, updated_at = NOW()
		 WHERE id = ?`,
		result, rewardCount, now, id,
	)
	if err != nil {
		return fmt.Errorf("update settle result failed: %w", err)
	}
	return nil
}

// UpdateSeasonStats 更新赛季统计数据
func (d *SeasonDAO) UpdateSeasonStats(ctx context.Context, id int64, playerCount, guildCount, cityCount int) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE seasons SET player_count = ?, guild_count = ?, city_reset_count = ?, updated_at = NOW()
		 WHERE id = ?`,
		playerCount, guildCount, cityCount, id,
	)
	if err != nil {
		return fmt.Errorf("update season stats failed: %w", err)
	}
	return nil
}

// GetNextSeasonNum 获取下一个赛季编号
func (d *SeasonDAO) GetNextSeasonNum(ctx context.Context, serverID int64) (int, error) {
	var num int
	err := d.db.QueryRowContext(ctx,
		`SELECT COALESCE(MAX(season_num), 0) + 1 FROM seasons WHERE server_id = ?`, serverID,
	).Scan(&num)
	if err != nil {
		return 1, nil
	}
	return num, nil
}

// GetSeasonsNeedCheck 获取需要检查的赛季（即将到期或需要结算的）
func (d *SeasonDAO) GetSeasonsNeedCheck(ctx context.Context) ([]*model.Season, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, season_num, server_id, name, status, start_time, end_time,
		        settled_at, duration_days, player_count, guild_count,
		        city_reset_count, reward_sent_count, settle_result,
		        created_at, updated_at
		 FROM seasons WHERE status IN (1, 2, 3)
		 ORDER BY end_time ASC`,
	)
	if err != nil {
		return nil, fmt.Errorf("get seasons need check failed: %w", err)
	}
	defer rows.Close()

	var seasons []*model.Season
	for rows.Next() {
		s := &model.Season{}
		err := rows.Scan(
			&s.ID, &s.SeasonNum, &s.ServerID, &s.Name, &s.Status,
			&s.StartTime, &s.EndTime, &s.SettledAt, &s.DurationDays,
			&s.PlayerCount, &s.GuildCount, &s.CityResetCount, &s.RewardSentCount,
			&s.SettleResult, &s.CreatedAt, &s.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("scan season row failed: %w", err)
		}
		seasons = append(seasons, s)
	}
	return seasons, nil
}

// ================================================================
// SeasonReward CRUD
// ================================================================

// CreateReward 创建奖励配置
func (d *SeasonDAO) CreateReward(ctx context.Context, reward *model.SeasonReward) (int64, error) {
	result, err := d.db.ExecContext(ctx,
		`INSERT INTO season_rewards (season_num, rank_min, rank_max, reward_type, reward_id, amount, title, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
		reward.SeasonNum, reward.RankMin, reward.RankMax,
		reward.RewardType, reward.RewardID, reward.Amount, reward.Title,
	)
	if err != nil {
		return 0, fmt.Errorf("insert reward failed: %w", err)
	}
	return result.LastInsertId()
}

// ListRewards 获取奖励配置列表
func (d *SeasonDAO) ListRewards(ctx context.Context, seasonNum int) ([]*model.SeasonReward, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, season_num, rank_min, rank_max, reward_type, reward_id, amount, title, created_at
		 FROM season_rewards WHERE season_num = ? ORDER BY rank_min ASC`, seasonNum,
	)
	if err != nil {
		return nil, fmt.Errorf("list rewards failed: %w", err)
	}
	defer rows.Close()

	var rewards []*model.SeasonReward
	for rows.Next() {
		r := &model.SeasonReward{}
		err := rows.Scan(&r.ID, &r.SeasonNum, &r.RankMin, &r.RankMax,
			&r.RewardType, &r.RewardID, &r.Amount, &r.Title, &r.CreatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan reward row failed: %w", err)
		}
		rewards = append(rewards, r)
	}
	return rewards, nil
}

// DeleteReward 删除奖励配置
func (d *SeasonDAO) DeleteReward(ctx context.Context, id int64) error {
	_, err := d.db.ExecContext(ctx, `DELETE FROM season_rewards WHERE id = ?`, id)
	return err
}

// ================================================================
// SeasonRanking CRUD
// ================================================================

// UpsertRanking 插入或更新排名
func (d *SeasonDAO) UpsertRanking(ctx context.Context, r *model.SeasonRanking) error {
	_, err := d.db.ExecContext(ctx,
		`INSERT INTO season_rankings (season_id, server_id, user_id, guild_id, nickname, avatar,
		 score, kill_count, city_count, rank, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
		 ON DUPLICATE KEY UPDATE score = VALUES(score), kill_count = VALUES(kill_count),
		 city_count = VALUES(city_count), nickname = VALUES(nickname), avatar = VALUES(avatar),
		 guild_id = VALUES(guild_id), updated_at = NOW()`,
		r.SeasonID, r.ServerID, r.UserID, r.GuildID, r.Nickname, r.Avatar,
		r.Score, r.KillCount, r.CityCount, r.Rank,
	)
	if err != nil {
		return fmt.Errorf("upsert ranking failed: %w", err)
	}
	return nil
}

// BatchInsertRankings 批量插入排名
func (d *SeasonDAO) BatchInsertRankings(ctx context.Context, rankings []*model.SeasonRanking) error {
	if len(rankings) == 0 {
		return nil
	}
	tx, err := d.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin tx failed: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.PrepareContext(ctx,
		`INSERT INTO season_rankings (season_id, server_id, user_id, guild_id, nickname, avatar,
		 score, kill_count, city_count, rank, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
		 ON DUPLICATE KEY UPDATE score = VALUES(score), kill_count = VALUES(kill_count),
		 city_count = VALUES(city_count), nickname = VALUES(nickname), avatar = VALUES(avatar),
		 guild_id = VALUES(guild_id), updated_at = NOW()`,
	)
	if err != nil {
		return fmt.Errorf("prepare stmt failed: %w", err)
	}
	defer stmt.Close()

	for _, r := range rankings {
		_, err := stmt.ExecContext(ctx,
			r.SeasonID, r.ServerID, r.UserID, r.GuildID, r.Nickname, r.Avatar,
			r.Score, r.KillCount, r.CityCount, r.Rank,
		)
		if err != nil {
			return fmt.Errorf("exec insert ranking failed: %w", err)
		}
	}
	return tx.Commit()
}

// ListRankings 获取赛季排名列表
func (d *SeasonDAO) ListRankings(ctx context.Context, seasonID int64, page, pageSize int) ([]*model.SeasonRanking, int64, error) {
	var total int64
	err := d.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM season_rankings WHERE season_id = ?`, seasonID,
	).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count rankings failed: %w", err)
	}

	rows, err := d.db.QueryContext(ctx,
		`SELECT id, season_id, server_id, user_id, guild_id, nickname, avatar,
		        score, kill_count, city_count, rank, created_at, updated_at
		 FROM season_rankings WHERE season_id = ?
		 ORDER BY score DESC, rank ASC
		 LIMIT ? OFFSET ?`, seasonID, pageSize, (page-1)*pageSize,
	)
	if err != nil {
		return nil, 0, fmt.Errorf("list rankings failed: %w", err)
	}
	defer rows.Close()

	var rankings []*model.SeasonRanking
	for rows.Next() {
		r := &model.SeasonRanking{}
		err := rows.Scan(&r.ID, &r.SeasonID, &r.ServerID, &r.UserID, &r.GuildID,
			&r.Nickname, &r.Avatar, &r.Score, &r.KillCount, &r.CityCount,
			&r.Rank, &r.CreatedAt, &r.UpdatedAt)
		if err != nil {
			return nil, 0, fmt.Errorf("scan ranking row failed: %w", err)
		}
		rankings = append(rankings, r)
	}
	return rankings, total, nil
}

// UpdateRanks 批量更新排名
func (d *SeasonDAO) UpdateRanks(ctx context.Context, seasonID int64) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE season_rankings sr
		 JOIN (
		   SELECT id,
		     ROW_NUMBER() OVER (ORDER BY score DESC, city_count DESC, kill_count DESC) as new_rank
		   FROM season_rankings WHERE season_id = ?
		 ) ranked ON sr.id = ranked.id
		 SET sr.rank = ranked.new_rank, sr.updated_at = NOW()
		 WHERE sr.season_id = ?`,
		seasonID, seasonID,
	)
	return err
}

// GetRankingByUser 获取玩家赛季排名
func (d *SeasonDAO) GetRankingByUser(ctx context.Context, seasonID, userID int64) (*model.SeasonRanking, error) {
	r := &model.SeasonRanking{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, season_id, server_id, user_id, guild_id, nickname, avatar,
		        score, kill_count, city_count, rank, created_at, updated_at
		 FROM season_rankings WHERE season_id = ? AND user_id = ?`, seasonID, userID,
	).Scan(&r.ID, &r.SeasonID, &r.ServerID, &r.UserID, &r.GuildID,
		&r.Nickname, &r.Avatar, &r.Score, &r.KillCount, &r.CityCount,
		&r.Rank, &r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrSeasonNotFound
		}
		return nil, fmt.Errorf("get ranking by user failed: %w", err)
	}
	return r, nil
}

// ================================================================
// SeasonRewardLog CRUD
// ================================================================

// CreateRewardLog 创建奖励发放记录
func (d *SeasonDAO) CreateRewardLog(ctx context.Context, log *model.SeasonRewardLog) (int64, error) {
	result, err := d.db.ExecContext(ctx,
		`INSERT INTO season_reward_logs (season_id, user_id, rank, reward_type, reward_id, amount, status, created_at)
		 VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
		log.SeasonID, log.UserID, log.Rank, log.RewardType, log.RewardID, log.Amount,
	)
	if err != nil {
		return 0, fmt.Errorf("insert reward log failed: %w", err)
	}
	return result.LastInsertId()
}

// UpdateRewardLogStatus 更新奖励发放状态
func (d *SeasonDAO) UpdateRewardLogStatus(ctx context.Context, id int64, status int8) error {
	if status == model.RewardStatusSent {
		_, err := d.db.ExecContext(ctx,
			`UPDATE season_reward_logs SET status = ?, sent_at = NOW() WHERE id = ?`, status, id,
		)
		return err
	}
	_, err := d.db.ExecContext(ctx,
		`UPDATE season_reward_logs SET status = ? WHERE id = ?`, status, id,
	)
	return err
}

// CountRewardLogsBySeason 统计赛季奖励发放数量
func (d *SeasonDAO) CountRewardLogsBySeason(ctx context.Context, seasonID int64) (int, error) {
	var count int
	err := d.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM season_reward_logs WHERE season_id = ? AND status = ?`,
		seasonID, model.RewardStatusSent,
	).Scan(&count)
	return count, err
}

// ListRewardLogs 获取奖励发放记录
func (d *SeasonDAO) ListRewardLogs(ctx context.Context, seasonID int64, page, pageSize int) ([]*model.SeasonRewardLog, int64, error) {
	var total int64
	err := d.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM season_reward_logs WHERE season_id = ?`, seasonID,
	).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	rows, err := d.db.QueryContext(ctx,
		`SELECT id, season_id, user_id, rank, reward_type, reward_id, amount, status, created_at, sent_at
		 FROM season_reward_logs WHERE season_id = ?
		 ORDER BY id DESC LIMIT ? OFFSET ?`, seasonID, pageSize, (page-1)*pageSize,
	)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var logs []*model.SeasonRewardLog
	for rows.Next() {
		l := &model.SeasonRewardLog{}
		err := rows.Scan(&l.ID, &l.SeasonID, &l.UserID, &l.Rank,
			&l.RewardType, &l.RewardID, &l.Amount, &l.Status, &l.CreatedAt, &l.SentAt)
		if err != nil {
			return nil, 0, err
		}
		logs = append(logs, l)
	}
	return logs, total, nil
}

// ================================================================
// 统计查询
// ================================================================

// GetGuildSeasonStats 获取联盟赛季统计（用于结算排名）
func (d *SeasonDAO) GetGuildSeasonStats(ctx context.Context) ([]*model.SeasonGuildRanking, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT g.id as guild_id, g.name as guild_name,
		        COALESCE(SUM(w.attacker_score + w.defender_score), 0) as score,
		        COUNT(DISTINCT gm.user_id) as member_count
		 FROM guilds g
		 LEFT JOIN guild_members gm ON g.id = gm.guild_id AND gm.status = 1
		 LEFT JOIN guild_wars w ON (g.id = w.attacker_guild OR g.id = w.defender_guild) AND w.status = 2
		 GROUP BY g.id, g.name
		 ORDER BY score DESC, member_count DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("get guild season stats failed: %w", err)
	}
	defer rows.Close()

	var stats []*model.SeasonGuildRanking
	rank := 0
	for rows.Next() {
		gs := &model.SeasonGuildRanking{}
		err := rows.Scan(&gs.GuildID, &gs.GuildName, &gs.Score, &gs.MemberCount)
		if err != nil {
			return nil, fmt.Errorf("scan guild stat row failed: %w", err)
		}
		rank++
		gs.Rank = rank
		stats = append(stats, gs)
	}
	return stats, nil
}
