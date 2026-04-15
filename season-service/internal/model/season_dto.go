package model

// SeasonSettleStatus 奖励发放状态
const (
	RewardStatusPending  = 0 // 待发放
	RewardStatusSent     = 1 // 已发放
	RewardStatusFailed   = 2 // 发放失败
)

// SeasonResetRequest 赛季重置请求（内部调用）
type SeasonResetRequest struct {
	SeasonID  int64  `json:"season_id" binding:"required"`
	ServerID  int64  `json:"server_id" binding:"required"`
	SeasonNum int    `json:"season_num" binding:"required"`
}

// MapResetRequest 地图重置请求
type MapResetRequest struct {
	SeasonID  int64 `json:"season_id" binding:"required"`
	ServerID  int64 `json:"server_id" binding:"required"`
	SeasonNum int   `json:"season_num" binding:"required"`
}

// GuildResetRequest 联盟重置请求
type GuildResetRequest struct {
	SeasonID  int64 `json:"season_id" binding:"required"`
	ServerID  int64 `json:"server_id" binding:"required"`
	SeasonNum int   `json:"season_num" binding:"required"`
}

// BatchRewardRequest 批量发放奖励请求
type BatchRewardRequest struct {
	UserID     int64 `json:"user_id" binding:"required"`
	RewardType int8  `json:"reward_type" binding:"required"`
	RewardID   int64 `json:"reward_id"`
	Amount     int   `json:"amount" binding:"required,gt=0"`
	Reason     string `json:"reason" binding:"required"`
}

// SettleProgressResponse 结算进度响应
type SettleProgressResponse struct {
	Phase       string `json:"phase"`         // current phase
	Progress    int    `json:"progress"`      // 0~100
	Message     string `json:"message"`
	StartTime   string `json:"start_time"`
	CurrentTime string `json:"current_time"`
}

// CreateRewardRequest 创建奖励配置请求
type CreateRewardRequest struct {
	SeasonNum  int    `json:"season_num" binding:"omitempty"`        // 0=通用模板
	RankMin    int    `json:"rank_min" binding:"required,min=1"`
	RankMax    int    `json:"rank_max" binding:"required,min=0"`
	RewardType int8   `json:"reward_type" binding:"required,min=1,max=5"`
	RewardID   int64  `json:"reward_id" binding:"omitempty"`
	Amount     int    `json:"amount" binding:"required,min=1"`
	Title      string `json:"title" binding:"omitempty,max=32"`
}
