// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Data Models
// =============================================================================
// 描述：任务系统数据模型，对应 quest-service 后端数据结构。
//       包含新手引导、主线任务、日常任务、成就四大模块的数据模型。
//       所有 JSON 字段名使用 snake_case 与 Go 后端保持一致。
// =============================================================================

using System;
using System.Collections.Generic;
using UnityEngine;

namespace Game.Data
{
    // ============================================================
    // 新手引导 (Tutorial)
    // ============================================================

    /// <summary>
    /// 新手引导步骤定义
    /// 对应 Go 后端 quest-service model.TutorialStep
    /// </summary>
    [Serializable]
    public class TutorialStep
    {
        [SerializeField] private int step_id;
        [SerializeField] private string title;
        [SerializeField] private string description;
        [SerializeField] private string speaker;
        [SerializeField] private string target_panel;
        [SerializeField] private string target_ui_path;
        [SerializeField] private string trigger_type;      // auto/manual/condition
        [SerializeField] private string trigger_condition;   // JSON condition
        [SerializeField] private int order;
        [SerializeField] private bool skippable;
        [SerializeField] private int next_step_id;

        public int StepId { get => step_id; set => step_id = value; }
        public string Title { get => title; set => title = value; }
        public string Description { get => description; set => description = value; }
        public string Speaker { get => speaker; set => speaker = value; }
        public string TargetPanel { get => target_panel; set => target_panel = value; }
        public string TargetUiPath { get => target_ui_path; set => target_ui_path = value; }
        public string TriggerType { get => trigger_type; set => trigger_type = value; }
        public string TriggerCondition { get => trigger_condition; set => trigger_condition = value; }
        public int Order { get => order; set => order = value; }
        public bool Skippable { get => skippable; set => skippable = value; }
        public int NextStepId { get => next_step_id; set => next_step_id = value; }

        /// <summary>是否为自动触发步骤</summary>
        public bool IsAutoTrigger => trigger_type == "auto";

        /// <summary>是否为条件触发步骤</summary>
        public bool IsConditionTrigger => trigger_type == "condition";
    }

    /// <summary>
    /// 新手引导进度（玩家已完成/当前步骤）
    /// 对应 Go 后端 quest-service model.TutorialProgress
    /// </summary>
    [Serializable]
    public class TutorialProgress
    {
        [SerializeField] private int step_id;
        [SerializeField] private int status;        // 0=未开始, 1=进行中, 2=已完成
        [SerializeField] private string completed_at;
        [SerializeField] private TutorialStep step;  // 关联的步骤定义

        public int StepId { get => step_id; set => step_id = value; }
        public int Status { get => status; set => status = value; }
        public string CompletedAt { get => completed_at; set => completed_at = value; }
        public TutorialStep Step { get => step; set => step = value; }

        /// <summary>是否已完成</summary>
        public bool IsCompleted => status == 2;

        /// <summary>是否进行中</summary>
        public bool IsInProgress => status == 1;

        /// <summary>是否未开始</summary>
        public bool IsNotStarted => status == 0;
    }

    /// <summary>
    /// 新手引导步骤列表响应
    /// GET /api/v1/quest/tutorial/steps
    /// </summary>
    [Serializable]
    public class TutorialStepsResponse
    {
        [SerializeField] private List<TutorialStep> steps;

        public List<TutorialStep> Steps { get => steps; set => steps = value; }
    }

    /// <summary>
    /// 新手引导进度响应
    /// GET /api/v1/quest/tutorial/progress
    /// </summary>
    [Serializable]
    public class TutorialProgressResponse
    {
        [SerializeField] private List<TutorialProgress> progress;
        [SerializeField] private int completed;
        [SerializeField] private int total;

        public List<TutorialProgress> Progress { get => progress; set => progress = value; }
        public int Completed { get => completed; set => completed = value; }
        public int Total { get => total; set => total = value; }

        /// <summary>是否全部完成</summary>
        public bool IsAllCompleted => completed >= total && total > 0;

        /// <summary>完成进度百分比 (0~100)</summary>
        public int ProgressPercent => total > 0 ? Mathf.RoundToInt((float)completed / total * 100f) : 0;
    }

    // ============================================================
    // 主线任务 (Main Quest)
    // ============================================================

    /// <summary>
    /// 主线章节
    /// 对应 Go 后端 quest-service model.MainChapter
    /// </summary>
    [Serializable]
    public class MainChapter
    {
        [SerializeField] private int id;
        [SerializeField] private string name;
        [SerializeField] private string description;
        [SerializeField] private string story_bg;
        [SerializeField] private int order;
        [SerializeField] private int unlock_level;
        [SerializeField] private int quest_count;
        [SerializeField] private int completed_count;

        public int Id { get => id; set => id = value; }
        public string Name { get => name; set => name = value; }
        public string Description { get => description; set => description = value; }
        public string StoryBg { get => story_bg; set => story_bg = value; }
        public int Order { get => order; set => order = value; }
        public int UnlockLevel { get => unlock_level; set => unlock_level = value; }
        public int QuestCount { get => quest_count; set => quest_count = value; }
        public int CompletedCount { get => completed_count; set => completed_count = value; }

        /// <summary>章节是否已全部完成</summary>
        public bool IsCompleted => completed_count >= quest_count && quest_count > 0;

        /// <summary>章节完成进度百分比</summary>
        public int ProgressPercent => quest_count > 0 ? Mathf.RoundToInt((float)completed_count / quest_count * 100f) : 0;
    }

    /// <summary>
    /// 主线任务定义
    /// 对应 Go 后端 quest-service model.MainQuest
    /// </summary>
    [Serializable]
    public class MainQuest
    {
        [SerializeField] private int id;
        [SerializeField] private int chapter_id;
        [SerializeField] private string title;
        [SerializeField] private string description;
        [SerializeField] private string quest_type;        // battle/dialogue/collect/explore
        [SerializeField] private string target;             // JSON target definition
        [SerializeField] private List<RewardItem> rewards;
        [SerializeField] private int order;
        [SerializeField] private int prerequisite_id;       // 前置任务ID，0表示无前置
        [SerializeField] private int stamina_cost;

        public int Id { get => id; set => id = value; }
        public int ChapterId { get => chapter_id; set => chapter_id = value; }
        public string Title { get => title; set => title = value; }
        public string Description { get => description; set => description = value; }
        public string QuestType { get => quest_type; set => quest_type = value; }
        public string Target { get => target; set => target = value; }
        public List<RewardItem> Rewards { get => rewards; set => rewards = value; }
        public int Order { get => order; set => order = value; }
        public int PrerequisiteId { get => prerequisite_id; set => prerequisite_id = value; }
        public int StaminaCost { get => stamina_cost; set => stamina_cost = value; }

        /// <summary>是否有前置任务</summary>
        public bool HasPrerequisite => prerequisite_id > 0;

        /// <summary>获取任务类型中文名称</summary>
        public string GetQuestTypeName()
        {
            switch (quest_type)
            {
                case "battle": return "战斗";
                case "dialogue": return "对话";
                case "collect": return "收集";
                case "explore": return "探索";
                default: return "未知";
            }
        }
    }

    /// <summary>
    /// 主线任务进度
    /// 对应 Go 后端 quest-service model.MainQuestProgress
    /// </summary>
    [Serializable]
    public class MainQuestProgress
    {
        [SerializeField] private int quest_id;
        [SerializeField] private int status;           // 0=锁定, 1=可接取, 2=进行中, 3=已完成, 4=已领奖
        [SerializeField] private int current_progress;
        [SerializeField] private int target_progress;
        [SerializeField] private string completed_at;
        [SerializeField] private string claimed_at;
        [SerializeField] private MainQuest quest;     // 关联的任务定义

        public int QuestId { get => quest_id; set => quest_id = value; }
        public int Status { get => status; set => status = value; }
        public int CurrentProgress { get => current_progress; set => current_progress = value; }
        public int TargetProgress { get => target_progress; set => target_progress = value; }
        public string CompletedAt { get => completed_at; set => completed_at = value; }
        public string ClaimedAt { get => claimed_at; set => claimed_at = value; }
        public MainQuest Quest { get => quest; set => quest = value; }

        /// <summary>是否已锁定</summary>
        public bool IsLocked => status == 0;

        /// <summary>是否可接取</summary>
        public bool IsAvailable => status == 1;

        /// <summary>是否进行中</summary>
        public bool IsInProgress => status == 2;

        /// <summary>是否已完成（可领奖）</summary>
        public bool IsCompleted => status == 3;

        /// <summary>是否已领奖</summary>
        public bool IsClaimed => status == 4;

        /// <summary>进度百分比 (0~100)</summary>
        public int ProgressPercent => target_progress > 0 ? Mathf.RoundToInt((float)current_progress / target_progress * 100f) : 0;

        /// <summary>是否有奖励可领取</summary>
        public bool CanClaim => status == 3;

        /// <summary>状态中文名</summary>
        public string GetStatusName()
        {
            switch (status)
            {
                case 0: return "未解锁";
                case 1: return "可接取";
                case 2: return "进行中";
                case 3: return "已完成";
                case 4: return "已领奖";
                default: return "未知";
            }
        }
    }

    /// <summary>
    /// 章节列表响应
    /// GET /api/v1/quest/main/chapters
    /// </summary>
    [Serializable]
    public class ChaptersResponse
    {
        [SerializeField] private List<MainChapter> chapters;

        public List<MainChapter> Chapters { get => chapters; set => chapters = value; }
    }

    /// <summary>
    /// 章节详情响应（含任务列表）
    /// GET /api/v1/quest/main/chapters/{chapterId}
    /// </summary>
    [Serializable]
    public class ChapterDetailResponse
    {
        [SerializeField] private MainChapter chapter;
        [SerializeField] private List<MainQuest> quests;

        public MainChapter Chapter { get => chapter; set => chapter = value; }
        public List<MainQuest> Quests { get => quests; set => quests = value; }
    }

    /// <summary>
    /// 主线任务进度列表响应
    /// GET /api/v1/quest/main/progress
    /// </summary>
    [Serializable]
    public class MainQuestProgressResponse
    {
        [SerializeField] private List<MainQuestProgress> progress;
        [SerializeField] private int current_chapter;

        public List<MainQuestProgress> Progress { get => progress; set => progress = value; }
        public int CurrentChapter { get => current_chapter; set => current_chapter = value; }
    }

    // ============================================================
    // 日常任务 (Daily Task)
    // ============================================================

    /// <summary>
    /// 日常任务定义
    /// 对应 Go 后端 quest-service model.DailyTask
    /// </summary>
    [Serializable]
    public class DailyTask
    {
        [SerializeField] private int id;
        [SerializeField] private string title;
        [SerializeField] private string description;
        [SerializeField] private string task_type;        // login/battle/gacha/guild/etc
        [SerializeField] private string target;             // JSON target
        [SerializeField] private int target_count;
        [SerializeField] private List<RewardItem> rewards;
        [SerializeField] private int activity_points;      // 完成获得活跃度
        [SerializeField] private int order;
        [SerializeField] private int reset_type;           // 0=每日, 1=每周

        public int Id { get => id; set => id = value; }
        public string Title { get => title; set => title = value; }
        public string Description { get => description; set => description = value; }
        public string TaskType { get => task_type; set => task_type = value; }
        public string Target { get => target; set => target = value; }
        public int TargetCount { get => target_count; set => target_count = value; }
        public List<RewardItem> Rewards { get => rewards; set => rewards = value; }
        public int ActivityPoints { get => activity_points; set => activity_points = value; }
        public int Order { get => order; set => order = value; }
        public int ResetType { get => reset_type; set => reset_type = value; }

        /// <summary>是否为每日重置</summary>
        public bool IsDailyReset => reset_type == 0;
    }

    /// <summary>
    /// 日常任务进度
    /// 对应 Go 后端 quest-service model.DailyTaskProgress
    /// </summary>
    [Serializable]
    public class DailyTaskProgress
    {
        [SerializeField] private int task_id;
        [SerializeField] private int status;           // 0=未完成, 1=已完成, 2=已领奖
        [SerializeField] private int current_progress;
        [SerializeField] private int target_count;
        [SerializeField] private string completed_at;
        [SerializeField] private string claimed_at;
        [SerializeField] private DailyTask task;       // 关联的任务定义

        public int TaskId { get => task_id; set => task_id = value; }
        public int Status { get => status; set => status = value; }
        public int CurrentProgress { get => current_progress; set => current_progress = value; }
        public int TargetCount { get => target_count; set => target_count = value; }
        public string CompletedAt { get => completed_at; set => completed_at = value; }
        public string ClaimedAt { get => claimed_at; set => claimed_at = value; }
        public DailyTask Task { get => task; set => task = value; }

        /// <summary>是否未完成</summary>
        public bool IsNotCompleted => status == 0;

        /// <summary>是否已完成（可领奖）</summary>
        public bool IsCompleted => status == 1;

        /// <summary>是否已领奖</summary>
        public bool IsClaimed => status == 2;

        /// <summary>是否有奖励可领取</summary>
        public bool CanClaim => status == 1;

        /// <summary>进度百分比</summary>
        public int ProgressPercent => target_count > 0 ? Mathf.RoundToInt((float)current_progress / target_count * 100f) : 0;

        /// <summary>状态中文名</summary>
        public string GetStatusName()
        {
            switch (status)
            {
                case 0: return "进行中";
                case 1: return "可领奖";
                case 2: return "已领取";
                default: return "未知";
            }
        }
    }

    /// <summary>
    /// 活跃度奖励
    /// 对应 Go 后端 quest-service model.ActivityReward
    /// </summary>
    [Serializable]
    public class ActivityReward
    {
        [SerializeField] private int required_points;
        [SerializeField] private List<RewardItem> rewards;

        public int RequiredPoints { get => required_points; set => required_points = value; }
        public List<RewardItem> Rewards { get => rewards; set => rewards = value; }
    }

    /// <summary>
    /// 日常任务列表响应
    /// GET /api/v1/quest/daily/tasks
    /// </summary>
    [Serializable]
    public class DailyTasksResponse
    {
        [SerializeField] private List<DailyTaskProgress> tasks;
        [SerializeField] private int total_activity;

        public List<DailyTaskProgress> Tasks { get => tasks; set => tasks = value; }
        public int TotalActivity { get => total_activity; set => total_activity = value; }
    }

    /// <summary>
    /// 活跃度信息响应
    /// GET /api/v1/quest/daily/activity
    /// </summary>
    [Serializable]
    public class ActivityInfoResponse
    {
        [SerializeField] private int current_points;
        [SerializeField] private List<ActivityReward> rewards;
        [SerializeField] private List<int> claimed;     // 已领取的活跃度节点

        public int CurrentPoints { get => current_points; set => current_points = value; }
        public List<ActivityReward> Rewards { get => rewards; set => rewards = value; }
        public List<int> Claimed { get => claimed; set => claimed = value; }

        /// <summary>检查指定活跃度是否已领取</summary>
        public bool IsClaimed(int points)
        {
            return claimed != null && claimed.Contains(points);
        }
    }

    // ============================================================
    // 成就 (Achievement)
    // ============================================================

    /// <summary>
    /// 成就定义
    /// 对应 Go 后端 quest-service model.Achievement
    /// </summary>
    [Serializable]
    public class Achievement
    {
        [SerializeField] private int id;
        [SerializeField] private string name;
        [SerializeField] private string description;
        [SerializeField] private string category;        // battle/card/guild/collection/etc
        [SerializeField] private string condition_type;  // level/count/stat
        [SerializeField] private string target;           // JSON target
        [SerializeField] private int target_value;
        [SerializeField] private int points;             // 成就点数
        [SerializeField] private int rarity;             // 1=普通, 2=稀有, 3=传说
        [SerializeField] private List<RewardItem> rewards;
        [SerializeField] private bool hidden;            // 隐藏成就（未完成前不显示具体信息）

        public int Id { get => id; set => id = value; }
        public string Name { get => name; set => name = value; }
        public string Description { get => description; set => description = value; }
        public string Category { get => category; set => category = value; }
        public string ConditionType { get => condition_type; set => condition_type = value; }
        public string Target { get => target; set => target = value; }
        public int TargetValue { get => target_value; set => target_value = value; }
        public int Points { get => points; set => points = value; }
        public int Rarity { get => rarity; set => rarity = value; }
        public List<RewardItem> Rewards { get => rewards; set => rewards = value; }
        public bool Hidden { get => hidden; set => hidden = value; }

        /// <summary>获取稀有度名称</summary>
        public string GetRarityName()
        {
            switch (rarity)
            {
                case 1: return "普通";
                case 2: return "稀有";
                case 3: return "传说";
                default: return "普通";
            }
        }

        /// <summary>获取稀有度颜色值 (R, G, B)</summary>
        public Color GetRarityColor()
        {
            switch (rarity)
            {
                case 1: return new Color(0.7f, 0.7f, 0.7f, 1f);    // 灰白
                case 2: return new Color(0.3f, 0.5f, 0.9f, 1f);    // 蓝色
                case 3: return new Color(1f, 0.75f, 0.1f, 1f);      // 金色
                default: return Color.white;
            }
        }

        /// <summary>获取分类中文名称</summary>
        public string GetCategoryName()
        {
            switch (category)
            {
                case "battle": return "战斗";
                case "card": return "卡牌";
                case "guild": return "公会";
                case "collection": return "收集";
                case "social": return "社交";
                case "growth": return "成长";
                default: return category;
            }
        }
    }

    /// <summary>
    /// 成就进度
    /// 对应 Go 后端 quest-service model.AchievementProgress
    /// </summary>
    [Serializable]
    public class AchievementProgress
    {
        [SerializeField] private int achievement_id;
        [SerializeField] private int status;           // 0=未完成, 1=已完成, 2=已领奖
        [SerializeField] private int current_value;
        [SerializeField] private int target_value;
        [SerializeField] private string completed_at;
        [SerializeField] private string claimed_at;
        [SerializeField] private Achievement achievement;  // 关联的成就定义

        public int AchievementId { get => achievement_id; set => achievement_id = value; }
        public int Status { get => status; set => status = value; }
        public int CurrentValue { get => current_value; set => current_value = value; }
        public int TargetValue { get => target_value; set => target_value = value; }
        public string CompletedAt { get => completed_at; set => completed_at = value; }
        public string ClaimedAt { get => claimed_at; set => claimed_at = value; }
        public Achievement Achievement { get => achievement; set => achievement = value; }

        /// <summary>是否未完成</summary>
        public bool IsNotCompleted => status == 0;

        /// <summary>是否已完成（可领奖）</summary>
        public bool IsCompleted => status == 1;

        /// <summary>是否已领奖</summary>
        public bool IsClaimed => status == 2;

        /// <summary>是否有奖励可领取</summary>
        public bool CanClaim => status == 1;

        /// <summary>进度百分比</summary>
        public int ProgressPercent => target_value > 0 ? Mathf.RoundToInt((float)current_value / target_value * 100f) : 0;

        /// <summary>获取显示文本（隐藏成就未完成时显示 ???）</summary>
        public string GetDisplayDescription()
        {
            if (achievement != null && achievement.Hidden && status == 0)
                return "???";
            if (achievement != null)
                return achievement.Description;
            return "";
        }

        /// <summary>获取显示名称（隐藏成就未完成时显示 ???）</summary>
        public string GetDisplayName()
        {
            if (achievement != null && achievement.Hidden && status == 0)
                return "隐藏成就";
            if (achievement != null)
                return achievement.Name;
            return "";
        }
    }

    /// <summary>
    /// 成就列表响应
    /// GET /api/v1/quest/achievement/list?category=battle
    /// </summary>
    [Serializable]
    public class AchievementListResponse
    {
        [SerializeField] private string category;
        [SerializeField] private List<AchievementProgress> achievements;
        [SerializeField] private int total_points;

        public string Category { get => category; set => category = value; }
        public List<AchievementProgress> Achievements { get => achievements; set => achievements = value; }
        public int TotalPoints { get => total_points; set => total_points = value; }
    }

    /// <summary>
    /// 成就统计响应
    /// GET /api/v1/quest/achievement/stats
    /// </summary>
    [Serializable]
    public class AchievementStatsResponse
    {
        [SerializeField] private int total_achievements;
        [SerializeField] private int completed;
        [SerializeField] private int claimed;
        [SerializeField] private int total_points;

        public int TotalAchievements { get => total_achievements; set => total_achievements = value; }
        public int Completed { get => completed; set => completed = value; }
        public int Claimed { get => claimed; set => claimed = value; }
        public int TotalPoints { get => total_points; set => total_points = value; }

        /// <summary>可领奖成就数</summary>
        public int Claimable => completed - claimed;

        /// <summary>完成进度百分比</summary>
        public int ProgressPercent => total_achievements > 0 ? Mathf.RoundToInt((float)completed / total_achievements * 100f) : 0;
    }

    // ============================================================
    // 通用模型 (Common)
    // ============================================================

    /// <summary>
    /// 奖励物品
    /// 对应 Go 后端 quest-service model.RewardItem
    /// 所有任务奖励统一使用此结构
    /// </summary>
    [Serializable]
    public class RewardItem
    {
        [SerializeField] private string type;        // gold/diamonds/card_item/exp/stamina
        [SerializeField] private int id;
        [SerializeField] private string name;
        [SerializeField] private int amount;
        [SerializeField] private int rarity;

        public string Type { get => type; set => type = value; }
        public int Id { get => id; set => id = value; }
        public string Name { get => name; set => name = value; }
        public int Amount { get => amount; set => amount = value; }
        public int Rarity { get => rarity; set => rarity = value; }

        /// <summary>获取奖励类型中文名称</summary>
        public string GetTypeName()
        {
            switch (type)
            {
                case "gold": return "金币";
                case "diamonds": return "钻石";
                case "card_item": return "卡牌碎片";
                case "exp": return "经验";
                case "stamina": return "体力";
                case "equipment": return "装备";
                case "material": return "材料";
                default: return type;
            }
        }

        /// <summary>获取带数量的显示文本</summary>
        public string GetDisplayText()
        {
            return $"{GetTypeName()} x{amount}";
        }

        /// <summary>获取奖励图标颜色（基于稀有度）</summary>
        public Color GetRarityColor()
        {
            switch (rarity)
            {
                case 1: return new Color(0.7f, 0.7f, 0.7f, 1f);    // 普通 - 灰
                case 2: return new Color(0.2f, 0.7f, 0.2f, 1f);    // 优秀 - 绿
                case 3: return new Color(0.3f, 0.5f, 0.9f, 1f);    // 稀有 - 蓝
                case 4: return new Color(0.6f, 0.3f, 0.9f, 1f);    // 史诗 - 紫
                case 5: return new Color(1f, 0.75f, 0.1f, 1f);      // 传说 - 金
                default: return Color.white;
            }
        }
    }

    /// <summary>
    /// 完成步骤请求体
    /// POST /api/v1/quest/tutorial/complete
    /// </summary>
    [Serializable]
    public class CompleteStepRequest
    {
        [SerializeField] private int step_id;

        public CompleteStepRequest(int stepId)
        {
            step_id = stepId;
        }

        public int StepId { get => step_id; set => step_id = value; }
    }

    /// <summary>
    /// 领取奖励响应
    /// 所有领取奖励接口统一返回此格式
    /// </summary>
    [Serializable]
    public class ClaimRewardResponse
    {
        [SerializeField] private List<RewardItem> rewards;

        public List<RewardItem> Rewards { get => rewards; set => rewards = value; }

        /// <summary>是否成功获得奖励</summary>
        public bool HasRewards => rewards != null && rewards.Count > 0;
    }
}
