package model

import "time"

// ============================================================
// 数据库模型
// ============================================================

// TutorialStep 新手引导步骤配置
type TutorialStep struct {
	ID               int       `json:"id"`
	StepOrder        int       `json:"step_order"`
	StepKey          string    `json:"step_key"`
	Title            string    `json:"title"`
	Description      *string   `json:"description,omitempty"`
	TriggerType      string    `json:"trigger_type"`
	TriggerCondition *string   `json:"trigger_condition,omitempty"`
	UITarget         *string   `json:"ui_target,omitempty"`
	Dialogues        *string   `json:"dialogues,omitempty"`
	Rewards          *string   `json:"rewards,omitempty"`
	IsRequired       int8      `json:"is_required"`
	Status           int8      `json:"status"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// TutorialProgress 用户新手引导进度
type TutorialProgress struct {
	ID          int64      `json:"id"`
	UserID      int64      `json:"user_id"`
	StepID      int        `json:"step_id"`
	Status      string     `json:"status"` // pending, completed, skipped
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

// MainChapter 主线章节
type MainChapter struct {
	ID              int       `json:"id"`
	ChapterOrder    int       `json:"chapter_order"`
	Title           string    `json:"title"`
	Description     *string   `json:"description,omitempty"`
	UnlockLevel     int       `json:"unlock_level"`
	UnlockCondition *string   `json:"unlock_condition,omitempty"`
	BackgroundImage *string   `json:"background_image,omitempty"`
	Rewards         *string   `json:"rewards,omitempty"`
	Status          int8      `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// MainQuest 主线任务
type MainQuest struct {
	ID              int       `json:"id"`
	ChapterID       int       `json:"chapter_id"`
	QuestOrder      int       `json:"quest_order"`
	Title           string    `json:"title"`
	Description     *string   `json:"description,omitempty"`
	QuestType       string    `json:"quest_type"`
	TargetType      string    `json:"target_type"`
	TargetCount     int       `json:"target_count"`
	EnergyCost      int       `json:"energy_cost"`
	Rewards         *string   `json:"rewards,omitempty"`
	UnlockCondition *string   `json:"unlock_condition,omitempty"`
	Status          int8      `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// MainQuestProgress 用户主线任务进度
type MainQuestProgress struct {
	ID          int64      `json:"id"`
	UserID      int64      `json:"user_id"`
	QuestID     int        `json:"quest_id"`
	Progress    int        `json:"progress"`
	Status      string     `json:"status"` // locked, in_progress, completed, claimed
	BestRecord  int        `json:"best_record"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	ClaimedAt   *time.Time `json:"claimed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// DailyTask 日常任务模板
type DailyTask struct {
	ID              int       `json:"id"`
	TaskKey         string    `json:"task_key"`
	Title           string    `json:"title"`
	Description     *string   `json:"description,omitempty"`
	TaskType        string    `json:"task_type"`
	TargetType      string    `json:"target_type"`
	TargetCount     int       `json:"target_count"`
	RefreshType     string    `json:"refresh_type"` // daily, weekly
	SortOrder       int       `json:"sort_order"`
	ActivityPoints  int       `json:"activity_points"`
	Rewards         *string   `json:"rewards,omitempty"`
	Status          int8      `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// DailyProgress 用户日常任务进度
type DailyProgress struct {
	ID        int64      `json:"id"`
	UserID    int64      `json:"user_id"`
	TaskID    int        `json:"task_id"`
	Progress  int        `json:"progress"`
	Status    string     `json:"status"` // in_progress, completed, claimed
	ClaimedAt *time.Time `json:"claimed_at,omitempty"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

// ActivityReward 活跃度奖励配置
type ActivityReward struct {
	ID              int       `json:"id"`
	RequiredPoints  int       `json:"required_points"`
	Rewards         string    `json:"rewards"`
	Status          int8      `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
}

// Achievement 成就定义
type Achievement struct {
	ID              int       `json:"id"`
	Category        string    `json:"category"`
	AchievementKey  string    `json:"achievement_key"`
	Title           string    `json:"title"`
	Description     *string   `json:"description,omitempty"`
	Icon            *string   `json:"icon,omitempty"`
	ConditionType   string    `json:"condition_type"`
	ConditionParams *string   `json:"condition_params,omitempty"`
	RewardPoints    int       `json:"reward_points"`
	Rewards         *string   `json:"rewards,omitempty"`
	IsHidden        int8      `json:"is_hidden"`
	SortOrder       int       `json:"sort_order"`
	Status          int8      `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// AchievementProgress 用户成就进度
type AchievementProgress struct {
	ID            int64      `json:"id"`
	UserID        int64      `json:"user_id"`
	AchievementID int        `json:"achievement_id"`
	Progress      int64      `json:"progress"`
	Status        string     `json:"status"` // in_progress, completed, claimed
	CompletedAt   *time.Time `json:"completed_at,omitempty"`
	ClaimedAt     *time.Time `json:"claimed_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// ============================================================
// 请求 DTO
// ============================================================

// CompleteTutorialRequest 完成新手引导步骤请求
type CompleteTutorialRequest struct {
	StepID int `json:"step_id" binding:"required"`
}

// CompleteMainQuestRequest 完成主线任务请求
type CompleteMainQuestRequest struct {
	Progress   int `json:"progress"`
	BestRecord int `json:"best_record"`
}

// UpdateDailyProgressRequest 更新日常任务进度请求
type UpdateDailyProgressRequest struct {
	TaskKey  string `json:"task_key" binding:"required"`
	Progress int    `json:"progress" binding:"min=1"`
}

// ClaimActivityRewardRequest 领取活跃度奖励请求
type ClaimActivityRewardRequest struct {
	RewardID int `json:"reward_id" binding:"required"`
}

// ============================================================
// 响应 DTO
// ============================================================

// TutorialStepsResponse 新手引导步骤列表响应
type TutorialStepsResponse struct {
	Steps []TutorialStepWithProgress `json:"steps"`
}

// TutorialStepWithProgress 带用户进度的新手引导步骤
type TutorialStepWithProgress struct {
	*TutorialStep
	UserStatus string `json:"user_status,omitempty"` // pending, completed, skipped
}

// TutorialProgressResponse 新手引导进度响应
type TutorialProgressResponse struct {
	TotalSteps    int                     `json:"total_steps"`
	CompletedSteps int                    `json:"completed_steps"`
	SkippedSteps  int                     `json:"skipped_steps"`
	Items         []TutorialProgressItem  `json:"items"`
}

// TutorialProgressItem 引导进度项
type TutorialProgressItem struct {
	StepID  int    `json:"step_id"`
	StepKey string `json:"step_key"`
	Title   string `json:"title"`
	Status  string `json:"status"`
}

// ChaptersResponse 章节列表响应
type ChaptersResponse struct {
	Chapters []ChapterWithProgress `json:"chapters"`
}

// ChapterWithProgress 带进度的章节
type ChapterWithProgress struct {
	*MainChapter
	TotalQuests    int `json:"total_quests"`
	CompletedQuests int `json:"completed_quests"`
	IsUnlocked     bool `json:"is_unlocked"`
}

// ChapterDetailResponse 章节详情响应
type ChapterDetailResponse struct {
	*MainChapter
	Quests    []QuestWithProgress `json:"quests"`
	IsUnlocked bool               `json:"is_unlocked"`
}

// QuestWithProgress 带进度的任务
type QuestWithProgress struct {
	*MainQuest
	Progress int    `json:"progress"`
	Status   string `json:"status"`
}

// MainQuestProgressResponse 主线任务总进度响应
type MainQuestProgressResponse struct {
	TotalQuests     int `json:"total_quests"`
	CompletedQuests int `json:"completed_quests"`
	ClaimedQuests   int `json:"claimed_quests"`
}

// DailyTaskListResponse 日常任务列表响应
type DailyTaskListResponse struct {
	Tasks          []DailyTaskWithProgress `json:"tasks"`
	TotalPoints    int                     `json:"total_points"`    // 今日总活跃度
	ActivityLevel  int                     `json:"activity_level"` // 当前活跃度等级
}

// DailyTaskWithProgress 带进度的日常任务
type DailyTaskWithProgress struct {
	*DailyTask
	Progress int    `json:"progress"`
	Status   string `json:"status"`
}

// ActivityInfoResponse 活跃度信息响应
type ActivityInfoResponse struct {
	CurrentPoints  int              `json:"current_points"`
	ClaimedRewards []int            `json:"claimed_rewards"` // 已领取的奖励ID列表
	Rewards        []ActivityReward `json:"rewards"`
}

// AchievementListResponse 成就列表响应
type AchievementListResponse struct {
	Categories []AchievementCategory `json:"categories"`
	TotalPoints int                  `json:"total_points"`
	CompletedCount int               `json:"completed_count"`
}

// AchievementCategory 成就分类
type AchievementCategory struct {
	Category string                  `json:"category"`
	Items    []AchievementWithProgress `json:"items"`
}

// AchievementWithProgress 带进度的成就
type AchievementWithProgress struct {
	*Achievement
	Progress int64  `json:"progress"`
	Status   string `json:"status"`
}

// AchievementDetailResponse 成就详情响应
type AchievementDetailResponse struct {
	*Achievement
	Progress int64  `json:"progress"`
	Status   string `json:"status"`
}

// AchievementStatsResponse 成就统计响应
type AchievementStatsResponse struct {
	TotalAchievements int   `json:"total_achievements"`
	CompletedCount    int   `json:"completed_count"`
	ClaimedCount      int   `json:"claimed_count"`
	TotalPoints       int   `json:"total_points"`
	EarnedPoints      int   `json:"earned_points"`
	CategoryStats     []CategoryStat `json:"category_stats"`
}

// CategoryStat 分类统计
type CategoryStat struct {
	Category        string `json:"category"`
	TotalCount      int    `json:"total_count"`
	CompletedCount  int    `json:"completed_count"`
	CompletionRate  float64 `json:"completion_rate"`
}
