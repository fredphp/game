package dao

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"quest-service/internal/model"
)

var (
	ErrNotFound       = errors.New("record not found")
	ErrDuplicateKey   = errors.New("duplicate key")
	ErrNoRowsAffected = errors.New("no rows affected")
)

// QuestDAO 任务系统数据访问层
type QuestDAO struct {
	db *sql.DB
}

// NewQuestDAO 创建 QuestDAO
func NewQuestDAO(db *sql.DB) *QuestDAO {
	return &QuestDAO{db: db}
}

// ============================================================
// 新手引导
// ============================================================

// GetAllTutorialSteps 获取所有启用的引导步骤（按顺序）
func (d *QuestDAO) GetAllTutorialSteps(ctx context.Context) ([]*model.TutorialStep, error) {
	query := `SELECT id, step_order, step_key, title, description, trigger_type,
	          trigger_condition, ui_target, dialogues, rewards, is_required, status,
	          created_at, updated_at
	          FROM tutorial_steps WHERE status = 1 ORDER BY step_order ASC`

	rows, err := d.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query tutorial steps failed: %w", err)
	}
	defer rows.Close()

	var steps []*model.TutorialStep
	for rows.Next() {
		s := &model.TutorialStep{}
		if err := rows.Scan(
			&s.ID, &s.StepOrder, &s.StepKey, &s.Title, &s.Description,
			&s.TriggerType, &s.TriggerCondition, &s.UITarget,
			&s.Dialogues, &s.Rewards, &s.IsRequired, &s.Status,
			&s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan tutorial step failed: %w", err)
		}
		steps = append(steps, s)
	}

	return steps, rows.Err()
}

// GetTutorialStepByID 根据ID获取引导步骤
func (d *QuestDAO) GetTutorialStepByID(ctx context.Context, id int) (*model.TutorialStep, error) {
	s := &model.TutorialStep{}
	query := `SELECT id, step_order, step_key, title, description, trigger_type,
	          trigger_condition, ui_target, dialogues, rewards, is_required, status,
	          created_at, updated_at
	          FROM tutorial_steps WHERE id = ? AND status = 1`
	err := d.db.QueryRowContext(ctx, query, id).Scan(
		&s.ID, &s.StepOrder, &s.StepKey, &s.Title, &s.Description,
		&s.TriggerType, &s.TriggerCondition, &s.UITarget,
		&s.Dialogues, &s.Rewards, &s.IsRequired, &s.Status,
		&s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query tutorial step by id failed: %w", err)
	}
	return s, nil
}

// GetUserTutorialProgress 获取用户新手引导进度
func (d *QuestDAO) GetUserTutorialProgress(ctx context.Context, userID int64) ([]*model.TutorialProgress, error) {
	query := `SELECT id, user_id, step_id, status, completed_at, created_at
	          FROM user_tutorial_progress WHERE user_id = ?`
	rows, err := d.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("query user tutorial progress failed: %w", err)
	}
	defer rows.Close()

	var progress []*model.TutorialProgress
	for rows.Next() {
		p := &model.TutorialProgress{}
		if err := rows.Scan(&p.ID, &p.UserID, &p.StepID, &p.Status, &p.CompletedAt, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan user tutorial progress failed: %w", err)
		}
		progress = append(progress, p)
	}
	return progress, rows.Err()
}

// UpsertTutorialProgress 创建或更新引导进度
func (d *QuestDAO) UpsertTutorialProgress(ctx context.Context, userID int64, stepID int, status string) error {
	now := time.Now()
	var completedAt interface{}
	if status == "completed" || status == "skipped" {
		completedAt = now
	}

	// 先尝试更新
	result, err := d.db.ExecContext(ctx,
		`UPDATE user_tutorial_progress SET status = ?, completed_at = IFNULL(?, completed_at)
		 WHERE user_id = ? AND step_id = ?`,
		status, completedAt, userID, stepID,
	)
	if err != nil {
		return fmt.Errorf("update tutorial progress failed: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows > 0 {
		return nil
	}

	// 不存在则插入
	_, err = d.db.ExecContext(ctx,
		`INSERT INTO user_tutorial_progress (user_id, step_id, status, completed_at)
		 VALUES (?, ?, ?, ?)`,
		userID, stepID, status, completedAt,
	)
	if err != nil {
		// 处理唯一键冲突（并发情况）
		if strings.Contains(err.Error(), "Duplicate entry") {
			return nil
		}
		return fmt.Errorf("insert tutorial progress failed: %w", err)
	}
	return nil
}

// SkipAllTutorial 跳过所有未完成的引导步骤
func (d *QuestDAO) SkipAllTutorial(ctx context.Context, userID int64) (int64, error) {
	// 获取所有启用的步骤ID
	steps, err := d.GetAllTutorialSteps(ctx)
	if err != nil {
		return 0, err
	}

	var count int64
	now := time.Now()
	for _, step := range steps {
		result, err := d.db.ExecContext(ctx,
			`INSERT INTO user_tutorial_progress (user_id, step_id, status, completed_at)
			 VALUES (?, ?, 'skipped', ?)
			 ON DUPLICATE KEY UPDATE status = 'skipped', completed_at = IFNULL(completed_at, VALUES(completed_at))`,
			userID, step.ID, now,
		)
		if err != nil {
			continue
		}
		if n, _ := result.RowsAffected(); n > 0 {
			count++
		}
	}
	return count, nil
}

// ============================================================
// 主线任务
// ============================================================

// GetAllChapters 获取所有启用的章节（按顺序）
func (d *QuestDAO) GetAllChapters(ctx context.Context) ([]*model.MainChapter, error) {
	query := `SELECT id, chapter_order, title, description, unlock_level,
	          unlock_condition, background_image, rewards, status, created_at, updated_at
	          FROM main_chapters WHERE status = 1 ORDER BY chapter_order ASC`

	rows, err := d.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query chapters failed: %w", err)
	}
	defer rows.Close()

	var chapters []*model.MainChapter
	for rows.Next() {
		ch := &model.MainChapter{}
		if err := rows.Scan(
			&ch.ID, &ch.ChapterOrder, &ch.Title, &ch.Description,
			&ch.UnlockLevel, &ch.UnlockCondition, &ch.BackgroundImage,
			&ch.Rewards, &ch.Status, &ch.CreatedAt, &ch.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan chapter failed: %w", err)
		}
		chapters = append(chapters, ch)
	}
	return chapters, rows.Err()
}

// GetChapterByID 根据ID获取章节
func (d *QuestDAO) GetChapterByID(ctx context.Context, id int) (*model.MainChapter, error) {
	ch := &model.MainChapter{}
	query := `SELECT id, chapter_order, title, description, unlock_level,
	          unlock_condition, background_image, rewards, status, created_at, updated_at
	          FROM main_chapters WHERE id = ? AND status = 1`
	err := d.db.QueryRowContext(ctx, query, id).Scan(
		&ch.ID, &ch.ChapterOrder, &ch.Title, &ch.Description,
		&ch.UnlockLevel, &ch.UnlockCondition, &ch.BackgroundImage,
		&ch.Rewards, &ch.Status, &ch.CreatedAt, &ch.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query chapter by id failed: %w", err)
	}
	return ch, nil
}

// GetQuestsByChapterID 获取章节下的所有任务（按顺序）
func (d *QuestDAO) GetQuestsByChapterID(ctx context.Context, chapterID int) ([]*model.MainQuest, error) {
	query := `SELECT id, chapter_id, quest_order, title, description, quest_type,
	          target_type, target_count, energy_cost, rewards, unlock_condition, status,
	          created_at, updated_at
	          FROM main_quests WHERE chapter_id = ? AND status = 1 ORDER BY quest_order ASC`

	rows, err := d.db.QueryContext(ctx, query, chapterID)
	if err != nil {
		return nil, fmt.Errorf("query quests by chapter failed: %w", err)
	}
	defer rows.Close()

	var quests []*model.MainQuest
	for rows.Next() {
		q := &model.MainQuest{}
		if err := rows.Scan(
			&q.ID, &q.ChapterID, &q.QuestOrder, &q.Title, &q.Description,
			&q.QuestType, &q.TargetType, &q.TargetCount, &q.EnergyCost,
			&q.Rewards, &q.UnlockCondition, &q.Status,
			&q.CreatedAt, &q.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan quest failed: %w", err)
		}
		quests = append(quests, q)
	}
	return quests, rows.Err()
}

// GetQuestByID 根据ID获取主线任务
func (d *QuestDAO) GetQuestByID(ctx context.Context, id int) (*model.MainQuest, error) {
	q := &model.MainQuest{}
	query := `SELECT id, chapter_id, quest_order, title, description, quest_type,
	          target_type, target_count, energy_cost, rewards, unlock_condition, status,
	          created_at, updated_at
	          FROM main_quests WHERE id = ? AND status = 1`
	err := d.db.QueryRowContext(ctx, query, id).Scan(
		&q.ID, &q.ChapterID, &q.QuestOrder, &q.Title, &q.Description,
		&q.QuestType, &q.TargetType, &q.TargetCount, &q.EnergyCost,
		&q.Rewards, &q.UnlockCondition, &q.Status,
		&q.CreatedAt, &q.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query quest by id failed: %w", err)
	}
	return q, nil
}

// GetUserMainQuestProgress 获取用户主线任务进度
func (d *QuestDAO) GetUserMainQuestProgress(ctx context.Context, userID int64) ([]*model.MainQuestProgress, error) {
	query := `SELECT id, user_id, quest_id, progress, status, best_record,
	          completed_at, claimed_at, created_at, updated_at
	          FROM user_main_quest_progress WHERE user_id = ?`
	rows, err := d.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("query user main quest progress failed: %w", err)
	}
	defer rows.Close()

	var progress []*model.MainQuestProgress
	for rows.Next() {
		p := &model.MainQuestProgress{}
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.QuestID, &p.Progress, &p.Status,
			&p.BestRecord, &p.CompletedAt, &p.ClaimedAt,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan user main quest progress failed: %w", err)
		}
		progress = append(progress, p)
	}
	return progress, rows.Err()
}

// GetUserQuestProgress 获取用户单个任务进度
func (d *QuestDAO) GetUserQuestProgress(ctx context.Context, userID int64, questID int) (*model.MainQuestProgress, error) {
	p := &model.MainQuestProgress{}
	query := `SELECT id, user_id, quest_id, progress, status, best_record,
	          completed_at, claimed_at, created_at, updated_at
	          FROM user_main_quest_progress WHERE user_id = ? AND quest_id = ?`
	err := d.db.QueryRowContext(ctx, query, userID, questID).Scan(
		&p.ID, &p.UserID, &p.QuestID, &p.Progress, &p.Status,
		&p.BestRecord, &p.CompletedAt, &p.ClaimedAt,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query user quest progress failed: %w", err)
	}
	return p, nil
}

// UpsertMainQuestProgress 创建或更新主线任务进度
func (d *QuestDAO) UpsertMainQuestProgress(ctx context.Context, userID int64, questID int, progress int, bestRecord int) error {
	// 计算状态
	var status string
	// 获取任务目标数来判定是否完成
	quest, err := d.GetQuestByID(ctx, questID)
	if err != nil {
		return fmt.Errorf("get quest for progress update: %w", err)
	}
	if progress >= quest.TargetCount {
		status = "completed"
	} else {
		status = "in_progress"
	}

	// 尝试更新
	result, err := d.db.ExecContext(ctx,
		`UPDATE user_main_quest_progress
		 SET progress = GREATEST(progress, ?), best_record = GREATEST(best_record, ?),
		     status = ?, completed_at = IF(? = 'completed', IFNULL(completed_at, NOW()), completed_at)
		 WHERE user_id = ? AND quest_id = ?`,
		progress, bestRecord, status, status, userID, questID,
	)
	if err != nil {
		return fmt.Errorf("update main quest progress failed: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows > 0 {
		return nil
	}

	// 不存在则插入
	var completedAt interface{}
	if status == "completed" {
		completedAt = time.Now()
	}
	_, err = d.db.ExecContext(ctx,
		`INSERT INTO user_main_quest_progress (user_id, quest_id, progress, status, best_record, completed_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		userID, questID, progress, status, bestRecord, completedAt,
	)
	if err != nil {
		if strings.Contains(err.Error(), "Duplicate entry") {
			// 并发插入冲突，重新更新
			_, err = d.db.ExecContext(ctx,
				`UPDATE user_main_quest_progress
				 SET progress = GREATEST(progress, ?), best_record = GREATEST(best_record, ?),
				     status = ?, completed_at = IF(? = 'completed', IFNULL(completed_at, NOW()), completed_at)
				 WHERE user_id = ? AND quest_id = ?`,
				progress, bestRecord, status, status, userID, questID,
			)
			if err != nil {
				return fmt.Errorf("retry update main quest progress failed: %w", err)
			}
			return nil
		}
		return fmt.Errorf("insert main quest progress failed: %w", err)
	}
	return nil
}

// ClaimMainQuestReward 领取主线任务奖励
func (d *QuestDAO) ClaimMainQuestReward(ctx context.Context, userID int64, questID int) error {
	result, err := d.db.ExecContext(ctx,
		`UPDATE user_main_quest_progress SET status = 'claimed', claimed_at = NOW()
		 WHERE user_id = ? AND quest_id = ? AND status = 'completed'`,
		userID, questID,
	)
	if err != nil {
		return fmt.Errorf("claim main quest reward failed: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNoRowsAffected
	}
	return nil
}

// ============================================================
// 日常任务
// ============================================================

// GetAllDailyTasks 获取所有启用的日常任务（按排序）
func (d *QuestDAO) GetAllDailyTasks(ctx context.Context) ([]*model.DailyTask, error) {
	query := `SELECT id, task_key, title, description, task_type, target_type,
	          target_count, refresh_type, sort_order, activity_points, rewards, status,
	          created_at, updated_at
	          FROM daily_tasks WHERE status = 1 ORDER BY sort_order ASC`

	rows, err := d.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query daily tasks failed: %w", err)
	}
	defer rows.Close()

	var tasks []*model.DailyTask
	for rows.Next() {
		t := &model.DailyTask{}
		if err := rows.Scan(
			&t.ID, &t.TaskKey, &t.Title, &t.Description,
			&t.TaskType, &t.TargetType, &t.TargetCount, &t.RefreshType,
			&t.SortOrder, &t.ActivityPoints, &t.Rewards, &t.Status,
			&t.CreatedAt, &t.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan daily task failed: %w", err)
		}
		tasks = append(tasks, t)
	}
	return tasks, rows.Err()
}

// GetDailyTaskByTaskKey 根据task_key获取日常任务
func (d *QuestDAO) GetDailyTaskByTaskKey(ctx context.Context, taskKey string) (*model.DailyTask, error) {
	t := &model.DailyTask{}
	query := `SELECT id, task_key, title, description, task_type, target_type,
	          target_count, refresh_type, sort_order, activity_points, rewards, status,
	          created_at, updated_at
	          FROM daily_tasks WHERE task_key = ? AND status = 1`
	err := d.db.QueryRowContext(ctx, query, taskKey).Scan(
		&t.ID, &t.TaskKey, &t.Title, &t.Description,
		&t.TaskType, &t.TargetType, &t.TargetCount, &t.RefreshType,
		&t.SortOrder, &t.ActivityPoints, &t.Rewards, &t.Status,
		&t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query daily task by key failed: %w", err)
	}
	return t, nil
}

// GetDailyTaskByID 根据ID获取日常任务
func (d *QuestDAO) GetDailyTaskByID(ctx context.Context, id int) (*model.DailyTask, error) {
	t := &model.DailyTask{}
	query := `SELECT id, task_key, title, description, task_type, target_type,
	          target_count, refresh_type, sort_order, activity_points, rewards, status,
	          created_at, updated_at
	          FROM daily_tasks WHERE id = ? AND status = 1`
	err := d.db.QueryRowContext(ctx, query, id).Scan(
		&t.ID, &t.TaskKey, &t.Title, &t.Description,
		&t.TaskType, &t.TargetType, &t.TargetCount, &t.RefreshType,
		&t.SortOrder, &t.ActivityPoints, &t.Rewards, &t.Status,
		&t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query daily task by id failed: %w", err)
	}
	return t, nil
}

// GetUserDailyProgress 获取用户今日日常任务进度
func (d *QuestDAO) GetUserDailyProgress(ctx context.Context, userID int64) ([]*model.DailyProgress, error) {
	// 只查今天创建的记录
	today := time.Now().Truncate(24 * time.Hour)
	query := `SELECT id, user_id, task_id, progress, status, claimed_at, created_at, updated_at
	          FROM user_daily_progress WHERE user_id = ? AND created_at >= ?`
	rows, err := d.db.QueryContext(ctx, query, userID, today)
	if err != nil {
		return nil, fmt.Errorf("query user daily progress failed: %w", err)
	}
	defer rows.Close()

	var progress []*model.DailyProgress
	for rows.Next() {
		p := &model.DailyProgress{}
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.TaskID, &p.Progress, &p.Status,
			&p.ClaimedAt, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan user daily progress failed: %w", err)
		}
		progress = append(progress, p)
	}
	return progress, rows.Err()
}

// GetUserDailyProgressByTaskID 获取用户某个日常任务的进度
func (d *QuestDAO) GetUserDailyProgressByTaskID(ctx context.Context, userID int64, taskID int) (*model.DailyProgress, error) {
	today := time.Now().Truncate(24 * time.Hour)
	p := &model.DailyProgress{}
	query := `SELECT id, user_id, task_id, progress, status, claimed_at, created_at, updated_at
	          FROM user_daily_progress WHERE user_id = ? AND task_id = ? AND created_at >= ?`
	err := d.db.QueryRowContext(ctx, query, userID, taskID, today).Scan(
		&p.ID, &p.UserID, &p.TaskID, &p.Progress, &p.Status,
		&p.ClaimedAt, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query user daily progress by task failed: %w", err)
	}
	return p, nil
}

// UpsertDailyProgress 更新日常任务进度
func (d *QuestDAO) UpsertDailyProgress(ctx context.Context, userID int64, taskID int, progress int) error {
	// 获取任务目标
	task, err := d.GetDailyTaskByID(ctx, taskID)
	if err != nil {
		return fmt.Errorf("get daily task for progress update: %w", err)
	}

	status := "in_progress"
	if progress >= task.TargetCount {
		status = "completed"
	}

	// 尝试更新
	result, err := d.db.ExecContext(ctx,
		`UPDATE user_daily_progress SET progress = GREATEST(progress, ?), status = ?
		 WHERE user_id = ? AND task_id = ? AND created_at >= ?`,
		progress, status, userID, taskID, time.Now().Truncate(24*time.Hour),
	)
	if err != nil {
		return fmt.Errorf("update daily progress failed: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows > 0 {
		return nil
	}

	// 不存在则插入
	_, err = d.db.ExecContext(ctx,
		`INSERT INTO user_daily_progress (user_id, task_id, progress, status)
		 VALUES (?, ?, ?, ?)`,
		userID, taskID, progress, status,
	)
	if err != nil {
		if strings.Contains(err.Error(), "Duplicate entry") {
			return nil
		}
		return fmt.Errorf("insert daily progress failed: %w", err)
	}
	return nil
}

// ClaimDailyReward 领取日常任务奖励
func (d *QuestDAO) ClaimDailyReward(ctx context.Context, userID int64, taskID int) error {
	result, err := d.db.ExecContext(ctx,
		`UPDATE user_daily_progress SET status = 'claimed', claimed_at = NOW()
		 WHERE user_id = ? AND task_id = ? AND status = 'completed' AND created_at >= ?`,
		userID, taskID, time.Now().Truncate(24*time.Hour),
	)
	if err != nil {
		return fmt.Errorf("claim daily reward failed: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNoRowsAffected
	}
	return nil
}

// ============================================================
// 活跃度奖励
// ============================================================

// GetAllActivityRewards 获取所有活跃度奖励（按所需点数排序）
func (d *QuestDAO) GetAllActivityRewards(ctx context.Context) ([]*model.ActivityReward, error) {
	query := `SELECT id, required_points, rewards, status, created_at
	          FROM activity_rewards WHERE status = 1 ORDER BY required_points ASC`

	rows, err := d.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query activity rewards failed: %w", err)
	}
	defer rows.Close()

	var rewards []*model.ActivityReward
	for rows.Next() {
		r := &model.ActivityReward{}
		if err := rows.Scan(&r.ID, &r.RequiredPoints, &r.Rewards, &r.Status, &r.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan activity reward failed: %w", err)
		}
		rewards = append(rewards, r)
	}
	return rewards, rows.Err()
}

// ============================================================
// 成就系统
// ============================================================

// GetAllAchievements 获取所有启用的成就（按分类和排序）
func (d *QuestDAO) GetAllAchievements(ctx context.Context) ([]*model.Achievement, error) {
	query := `SELECT id, category, achievement_key, title, description, icon,
	          condition_type, condition_params, reward_points, rewards,
	          is_hidden, sort_order, status, created_at, updated_at
	          FROM achievements WHERE status = 1 ORDER BY category ASC, sort_order ASC`

	rows, err := d.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query achievements failed: %w", err)
	}
	defer rows.Close()

	var achievements []*model.Achievement
	for rows.Next() {
		a := &model.Achievement{}
		if err := rows.Scan(
			&a.ID, &a.Category, &a.AchievementKey, &a.Title, &a.Description,
			&a.Icon, &a.ConditionType, &a.ConditionParams, &a.RewardPoints,
			&a.Rewards, &a.IsHidden, &a.SortOrder, &a.Status,
			&a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan achievement failed: %w", err)
		}
		achievements = append(achievements, a)
	}
	return achievements, rows.Err()
}

// GetAchievementByID 根据ID获取成就
func (d *QuestDAO) GetAchievementByID(ctx context.Context, id int) (*model.Achievement, error) {
	a := &model.Achievement{}
	query := `SELECT id, category, achievement_key, title, description, icon,
	          condition_type, condition_params, reward_points, rewards,
	          is_hidden, sort_order, status, created_at, updated_at
	          FROM achievements WHERE id = ? AND status = 1`
	err := d.db.QueryRowContext(ctx, query, id).Scan(
		&a.ID, &a.Category, &a.AchievementKey, &a.Title, &a.Description,
		&a.Icon, &a.ConditionType, &a.ConditionParams, &a.RewardPoints,
		&a.Rewards, &a.IsHidden, &a.SortOrder, &a.Status,
		&a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query achievement by id failed: %w", err)
	}
	return a, nil
}

// GetAchievementsByCategory 根据分类获取成就
func (d *QuestDAO) GetAchievementsByCategory(ctx context.Context, category string) ([]*model.Achievement, error) {
	query := `SELECT id, category, achievement_key, title, description, icon,
	          condition_type, condition_params, reward_points, rewards,
	          is_hidden, sort_order, status, created_at, updated_at
	          FROM achievements WHERE category = ? AND status = 1 ORDER BY sort_order ASC`

	rows, err := d.db.QueryContext(ctx, query, category)
	if err != nil {
		return nil, fmt.Errorf("query achievements by category failed: %w", err)
	}
	defer rows.Close()

	var achievements []*model.Achievement
	for rows.Next() {
		a := &model.Achievement{}
		if err := rows.Scan(
			&a.ID, &a.Category, &a.AchievementKey, &a.Title, &a.Description,
			&a.Icon, &a.ConditionType, &a.ConditionParams, &a.RewardPoints,
			&a.Rewards, &a.IsHidden, &a.SortOrder, &a.Status,
			&a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan achievement failed: %w", err)
		}
		achievements = append(achievements, a)
	}
	return achievements, rows.Err()
}

// GetUserAchievementProgress 获取用户所有成就进度
func (d *QuestDAO) GetUserAchievementProgress(ctx context.Context, userID int64) ([]*model.AchievementProgress, error) {
	query := `SELECT id, user_id, achievement_id, progress, status,
	          completed_at, claimed_at, created_at, updated_at
	          FROM user_achievement_progress WHERE user_id = ?`

	rows, err := d.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("query user achievement progress failed: %w", err)
	}
	defer rows.Close()

	var progress []*model.AchievementProgress
	for rows.Next() {
		p := &model.AchievementProgress{}
		if err := rows.Scan(
			&p.ID, &p.UserID, &p.AchievementID, &p.Progress,
			&p.Status, &p.CompletedAt, &p.ClaimedAt,
			&p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan user achievement progress failed: %w", err)
		}
		progress = append(progress, p)
	}
	return progress, rows.Err()
}

// GetUserAchievementProgressByID 获取用户某个成就的进度
func (d *QuestDAO) GetUserAchievementProgressByID(ctx context.Context, userID int64, achievementID int) (*model.AchievementProgress, error) {
	p := &model.AchievementProgress{}
	query := `SELECT id, user_id, achievement_id, progress, status,
	          completed_at, claimed_at, created_at, updated_at
	          FROM user_achievement_progress WHERE user_id = ? AND achievement_id = ?`
	err := d.db.QueryRowContext(ctx, query, userID, achievementID).Scan(
		&p.ID, &p.UserID, &p.AchievementID, &p.Progress,
		&p.Status, &p.CompletedAt, &p.ClaimedAt,
		&p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("query user achievement progress by id failed: %w", err)
	}
	return p, nil
}

// UpsertAchievementProgress 更新成就进度
func (d *QuestDAO) UpsertAchievementProgress(ctx context.Context, userID int64, achievementID int, progress int64) error {
	// 获取成就配置来判断是否完成
	achievement, err := d.GetAchievementByID(ctx, achievementID)
	if err != nil {
		return fmt.Errorf("get achievement for progress update: %w", err)
	}

	status := "in_progress"
	if progress >= int64(achievement.RewardPoints) {
		status = "completed"
	}

	result, err := d.db.ExecContext(ctx,
		`UPDATE user_achievement_progress
		 SET progress = GREATEST(progress, ?), status = ?,
		     completed_at = IF(? = 'completed', IFNULL(completed_at, NOW()), completed_at)
		 WHERE user_id = ? AND achievement_id = ?`,
		progress, status, status, userID, achievementID,
	)
	if err != nil {
		return fmt.Errorf("update achievement progress failed: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows > 0 {
		return nil
	}

	var completedAt interface{}
	if status == "completed" {
		completedAt = time.Now()
	}
	_, err = d.db.ExecContext(ctx,
		`INSERT INTO user_achievement_progress (user_id, achievement_id, progress, status, completed_at)
		 VALUES (?, ?, ?, ?, ?)`,
		userID, achievementID, progress, status, completedAt,
	)
	if err != nil {
		if strings.Contains(err.Error(), "Duplicate entry") {
			return nil
		}
		return fmt.Errorf("insert achievement progress failed: %w", err)
	}
	return nil
}

// ClaimAchievementReward 领取成就奖励
func (d *QuestDAO) ClaimAchievementReward(ctx context.Context, userID int64, achievementID int) error {
	result, err := d.db.ExecContext(ctx,
		`UPDATE user_achievement_progress SET status = 'claimed', claimed_at = NOW()
		 WHERE user_id = ? AND achievement_id = ? AND status = 'completed'`,
		userID, achievementID,
	)
	if err != nil {
		return fmt.Errorf("claim achievement reward failed: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrNoRowsAffected
	}
	return nil
}
