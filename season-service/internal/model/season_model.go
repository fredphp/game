package model

import "time"

// ================================================================
// 赛季状态常量
// ================================================================

const (
	SeasonStatusPreparing = 0 // 准备中（未开始）
	SeasonStatusActive   = 1 // 进行中
	SeasonStatusEnding   = 2 // 即将结束（提前预警）
	SeasonStatusSettling = 3 // 结算中
	SeasonStatusEnded    = 4 // 已结束
)

// SeasonStatusText 赛季状态文本
func SeasonStatusText(status int8) string {
	switch status {
	case SeasonStatusPreparing:
		return "准备中"
	case SeasonStatusActive:
		return "进行中"
	case SeasonStatusEnding:
		return "即将结束"
	case SeasonStatusSettling:
		return "结算中"
	case SeasonStatusEnded:
		return "已结束"
	default:
		return "未知"
	}
}

// ================================================================
// 赛季奖励类型
// ================================================================

const (
	RewardTypeGold    = 1 // 金币
	RewardTypeDiamond = 2 // 钻石
	RewardTypeItem    = 3 // 道具
	RewardTypeTitle   = 4 // 称号
	RewardTypeExp     = 5 // 经验
)

func RewardTypeText(t int8) string {
	switch t {
	case RewardTypeGold:
		return "金币"
	case RewardTypeDiamond:
		return "钻石"
	case RewardTypeItem:
		return "道具"
	case RewardTypeTitle:
		return "称号"
	case RewardTypeExp:
		return "经验"
	default:
		return "未知"
	}
}

// ================================================================
// 数据库实体
// ================================================================

// Season 赛季
type Season struct {
	ID              int64      `json:"id"`
	SeasonNum       int        `json:"season_num"`        // 赛季编号（S1, S2...）
	ServerID        int64      `json:"server_id"`         // 区服ID（0=全服）
	Name            string     `json:"name"`              // 赛季名称
	Status          int8       `json:"status"`            // 状态
	StartTime       time.Time  `json:"start_time"`        // 开始时间
	EndTime         time.Time  `json:"end_time"`          // 结束时间
	SettledAt       *time.Time `json:"settled_at"`        // 结算时间
	DurationDays    int        `json:"duration_days"`     // 持续天数
	PlayerCount     int        `json:"player_count"`      // 参与玩家数
	GuildCount      int        `json:"guild_count"`       // 参与联盟数
	CityResetCount  int        `json:"city_reset_count"`  // 重置城池数
	RewardSentCount int        `json:"reward_sent_count"` // 发放奖励数
	SettleResult    string     `json:"settle_result"`     // 结算结果JSON
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

// SeasonReward 赛季奖励配置
type SeasonReward struct {
	ID        int64  `json:"id"`
	SeasonNum int    `json:"season_num"`  // 赛季编号（0=通用模板）
	RankMin   int    `json:"rank_min"`    // 排名下限
	RankMax   int    `json:"rank_max"`    // 排名上限（0=无上限）
	RewardType int8  `json:"reward_type"` // 奖励类型
	RewardID   int64  `json:"reward_id"`   // 奖励物品ID
	Amount    int    `json:"amount"`      // 奖励数量
	Title     string `json:"title"`       // 称号名称（仅RewardTypeTitle）
	CreatedAt time.Time `json:"created_at"`
}

// SeasonRanking 赛季玩家排名
type SeasonRanking struct {
	ID        int64     `json:"id"`
	SeasonID  int64     `json:"season_id"`
	ServerID  int64     `json:"server_id"`
	UserID    int64     `json:"user_id"`
	GuildID   int64     `json:"guild_id"`
	Nickname  string    `json:"nickname"`
	Avatar    string    `json:"avatar"`
	Score     int64     `json:"score"`     // 总积分
	KillCount int       `json:"kill_count"` // 击杀数
	CityCount int       `json:"city_count"` // 攻城数
	Rank      int       `json:"rank"`      // 最终排名
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// SeasonRewardLog 赛季奖励发放记录
type SeasonRewardLog struct {
	ID        int64     `json:"id"`
	SeasonID  int64     `json:"season_id"`
	UserID    int64     `json:"user_id"`
	Rank      int       `json:"rank"`
	RewardType int8     `json:"reward_type"`
	RewardID  int64     `json:"reward_id"`
	Amount    int       `json:"amount"`
	Status    int8      `json:"status"` // 0:待发放 1:已发放 2:发放失败
	CreatedAt time.Time `json:"created_at"`
	SentAt    *time.Time `json:"sent_at"`
}

// ================================================================
// 请求/响应 DTO
// ================================================================

// CreateSeasonRequest 创建赛季请求
type CreateSeasonRequest struct {
	ServerID     int64 `json:"server_id" binding:"omitempty"`     // 区服ID（0=全服）
	Name         string `json:"name" binding:"required,min=1,max=64"` // 赛季名称
	DurationDays int   `json:"duration_days" binding:"omitempty,min=1,max=365"` // 持续天数
}

// SeasonListRequest 赛季列表查询
type SeasonListRequest struct {
	ServerID int64 `form:"server_id" binding:"omitempty"`
	Status   int8  `form:"status" binding:"omitempty"`
	Page     int   `form:"page,default=1" binding:"omitempty,min=1"`
	PageSize int   `form:"page_size,default=20" binding:"omitempty,min=1,max=100"`
}

// SettleSeasonRequest 手动结算赛季
type SettleSeasonRequest struct {
	SeasonID int64 `json:"season_id" binding:"required"`
}

// SeasonDetailResponse 赛季详情响应
type SeasonDetailResponse struct {
	Season
	RemainDays  int    `json:"remain_days"`   // 剩余天数
	StatusText  string `json:"status_text"`   // 状态文本
	GuildRankings []SeasonGuildRanking `json:"guild_rankings,omitempty"` // 联盟排名
}

// SeasonGuildRanking 赛季联盟排名
type SeasonGuildRanking struct {
	GuildID   int64  `json:"guild_id"`
	GuildName string `json:"guild_name"`
	Score     int64  `json:"score"`
	Rank      int    `json:"rank"`
	MemberCount int  `json:"member_count"`
}

// SeasonCountdownResponse 赛季倒计时响应
type SeasonCountdownResponse struct {
	SeasonID    int64 `json:"season_id"`
	SeasonNum   int   `json:"season_num"`
	SeasonName  string `json:"season_name"`
	Status      int8  `json:"status"`
	StatusText  string `json:"status_text"`
	RemainHours int64 `json:"remain_hours"` // 剩余小时数
	RemainDays  int64 `json:"remain_days"`  // 剩余天数
	TotalDays   int   `json:"total_days"`
	Progress    float64 `json:"progress"`    // 进度 0~1
}
