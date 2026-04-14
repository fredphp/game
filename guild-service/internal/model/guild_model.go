package model

import (
	"database/sql"
	"encoding/json"
	"time"
)

// ================================================================
// 联盟角色
// ================================================================
const (
	RoleLeader     = 1 // 盟主
	RoleViceLeader = 2 // 副盟主
	RoElder        = 3 // 长老
	RoleMember     = 4 // 成员
)

// ================================================================
// 联盟状态
// ================================================================
const (
	GuildStatusNormal   = 1 // 正常
	GuildStatusDisbanding = 2 // 解散中
	GuildStatusDisbanded  = 3 // 已解散
)

// ================================================================
// 入盟申请状态
// ================================================================
const (
	ApplyPending  = 0 // 待审批
	ApplyApproved = 1 // 已通过
	ApplyRejected = 2 // 已拒绝
	ApplyCanceled = 3 // 已取消
)

// ================================================================
// 战争状态
// ================================================================
const (
	WarStatusPrepare = 0 // 准备中
	WarStatusActive  = 1 // 进行中
	WarStatusEnded   = 2 // 已结束
	WarStatusCancel  = 3 // 已取消
)

// 战争阶段
const (
	WarPhaseDeclare = 0 // 宣战
	WarPhaseReady   = 1 // 准备
	WarPhaseBattle  = 2 // 战斗
	WarPhaseSettle  = 3 // 结算
)

// 协作战斗状态
const (
	CoopStatusGathering = 0 // 组队中
	CoopStatusBattle    = 1 // 战斗中
	CoopStatusFinished  = 2 // 已结束
	CoopStatusCancel    = 3 // 已取消
)

// ================================================================
// 联盟结构体
// ================================================================
type Guild struct {
	ID            int64          `json:"id"`
	Name          string         `json:"name"`
	Tag           string         `json:"tag"`
	Declaration   string         `json:"declaration"`
	LeaderID      int64          `json:"leader_id"`
	Level         int8           `json:"level"`
	Exp           int64          `json:"exp"`
	MemberCount   int            `json:"member_count"`
	MaxMembers    int            `json:"max_members"`
	TotalPower    int64          `json:"total_power"`
	CityCount     int            `json:"city_count"`
	Notice        string         `json:"notice"`
	Language      string         `json:"language"`
	AutoJoin      bool           `json:"auto_join"`
	MinJoinLevel  int            `json:"min_join_level"`
	Status        int8           `json:"status"`
	CreatedAt     time.Time      `json:"created_at"`
	DisbandedAt   sql.NullTime   `json:"disbanded_at,omitempty"`
}

// GuildDetail 联盟详情（含成员列表）
type GuildDetail struct {
	Guild
	Members []GuildMember `json:"members,omitempty"`
}

// ================================================================
// 联盟成员
// ================================================================
type GuildMember struct {
	ID           int64     `json:"id"`
	GuildID      int64     `json:"guild_id"`
	UserID       int64     `json:"user_id"`
	Role         int8      `json:"role"`
	Nickname     string    `json:"nickname"`
	Power        int       `json:"power"`
	Contribution int64     `json:"contribution"`
	TotalDonate  int64     `json:"total_donate"`
	WeekDonate   int       `json:"week_donate"`
	JoinTime     time.Time `json:"join_time"`
	LastActive   time.Time `json:"last_active"`
	Status       int8      `json:"status"`
}

// ================================================================
// 入盟申请
// ================================================================
type GuildApplication struct {
	ID          int64          `json:"id"`
	GuildID     int64          `json:"guild_id"`
	UserID      int64          `json:"user_id"`
	Message     string         `json:"message"`
	Status      int8           `json:"status"`
	ReviewerID  sql.NullInt64  `json:"reviewer_id"`
	ReviewTime  sql.NullTime   `json:"review_time"`
	ReviewNote  string         `json:"review_note"`
	CreatedAt   time.Time      `json:"created_at"`
}

// ================================================================
// 联盟战争
// ================================================================
type GuildWar struct {
	ID             int64           `json:"id"`
	WarID          string          `json:"war_id"`
	AttackerGuild  int64           `json:"attacker_guild"`
	DefenderGuild  int64           `json:"defender_guild"`
	TargetCityID   sql.NullInt64   `json:"target_city_id"`
	Status         int8            `json:"status"`
	Phase          int8            `json:"phase"`
	DeclareTime    time.Time       `json:"declare_time"`
	StartTime      time.Time       `json:"start_time"`
	EndTime        time.Time       `json:"end_time"`
	AttackerScore  int             `json:"attacker_score"`
	DefenderScore  int             `json:"defender_score"`
	AttackerDeaths int             `json:"attacker_deaths"`
	DefenderDeaths int             `json:"defender_deaths"`
	CitiesChanged  int             `json:"cities_changed"`
	Winner         sql.NullInt64   `json:"winner"`
	SurrenderGuild sql.NullInt64   `json:"surrender_guild"`
	WarConfig      json.RawMessage `json:"war_config,omitempty"`
	ResultDetail   json.RawMessage `json:"result_detail,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
}

// ================================================================
// 协作战斗
// ================================================================
type WarBattle struct {
	ID            int64           `json:"id"`
	BattleID      string          `json:"battle_id"`
	WarID         string          `json:"war_id"`
	CityID        int64           `json:"city_id"`
	AttackerGuild int64           `json:"attacker_guild"`
	DefenderGuild int64           `json:"defender_guild"`
	LeaderID      int64           `json:"leader_id"`
	Contributors  json.RawMessage `json:"contributors,omitempty"`
	TotalArmy     int             `json:"total_army"`
	CoopBonus     float64         `json:"coop_bonus"`
	DefenderPower int             `json:"defender_power"`
	CityDefense   int             `json:"city_defense"`
	AttackerWin   bool            `json:"attacker_win"`
	DamageDealt   int             `json:"damage_dealt"`
	DamageTaken   int             `json:"damage_taken"`
	Loot          json.RawMessage `json:"loot,omitempty"`
	ResultDetail  json.RawMessage `json:"result_detail,omitempty"`
	Status        int8            `json:"status"`
	StartTime     sql.NullTime    `json:"start_time"`
	EndTime       sql.NullTime    `json:"end_time"`
	CreatedAt     time.Time       `json:"created_at"`
}

// ================================================================
// 联盟日志
// ================================================================
type GuildLog struct {
	ID        int64     `json:"id"`
	GuildID   int64     `json:"guild_id"`
	UserID    int64     `json:"user_id"`
	TargetID  sql.NullInt64 `json:"target_id"`
	Action    string    `json:"action"`
	Detail    string    `json:"detail"`
	CreatedAt time.Time `json:"created_at"`
}

// ================================================================
// 联盟科技
// ================================================================
type GuildTech struct {
	ID             int64           `json:"id"`
	GuildID        int64           `json:"guild_id"`
	TechKey        string          `json:"tech_key"`
	Level          int8            `json:"level"`
	Researching    bool            `json:"researching"`
	ResearchStart  sql.NullTime    `json:"research_start"`
	ResearchEnd    sql.NullTime    `json:"research_end"`
	Contributions  json.RawMessage `json:"contributions,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
}

// ================================================================
// 请求 / 响应 模型
// ================================================================

// CreateGuildRequest 创建联盟请求
type CreateGuildRequest struct {
	Name        string `json:"name" binding:"required,min=2,max=12"`
	Tag         string `json:"tag" binding:"required,min=2,max=4"`
	Declaration string `json:"declaration" binding:"max=64"`
}

// JoinGuildRequest 入盟请求
type JoinGuildRequest struct {
	GuildID int64  `json:"guild_id" binding:"required"`
	Message string `json:"message" binding:"max=256"`
}

// DeclareWarRequest 宣战请求
type DeclareWarRequest struct {
	TargetGuildID int64 `json:"target_guild_id" binding:"required"`
	TargetCityID  int64 `json:"target_city_id"` // 可选，指定争夺城池
}

// CoopBattleRequest 协作战斗请求
type CoopBattleRequest struct {
	WarID    string `json:"war_id" binding:"required"`
	CityID   int64  `json:"city_id" binding:"required"`
	ArmyPower int   `json:"army_power" binding:"required,min=500"`
}

// JoinCoopRequest 加入协作请求
type JoinCoopRequest struct {
	BattleID  string `json:"battle_id" binding:"required"`
	ArmyPower int    `json:"army_power" binding:"required,min=500"`
}

// WarScoreResponse 战争得分响应
type WarScoreResponse struct {
	WarID          string  `json:"war_id"`
	AttackerGuild  int64   `json:"attacker_guild"`
	DefenderGuild  int64   `json:"defender_guild"`
	AttackerScore  int     `json:"attacker_score"`
	DefenderScore  int     `json:"defender_score"`
	Phase          int8    `json:"phase"`
	Status         int8    `json:"status"`
	TimeRemaining  int64   `json:"time_remaining_secs"`
}

// ================================================================
// 辅助函数
// ================================================================

func RoleName(role int8) string {
	switch role {
	case RoleLeader:
		return "盟主"
	case RoleViceLeader:
		return "副盟主"
	case RoElder:
		return "长老"
	case RoleMember:
		return "成员"
	default:
		return "未知"
	}
}

func GuildStatusText(s int8) string {
	switch s {
	case GuildStatusNormal:
		return "正常"
	case GuildStatusDisbanding:
		return "解散中"
	case GuildStatusDisbanded:
		return "已解散"
	default:
		return "未知"
	}
}

func WarStatusText(s int8) string {
	switch s {
	case WarStatusPrepare:
		return "准备中"
	case WarStatusActive:
		return "进行中"
	case WarStatusEnded:
		return "已结束"
	case WarStatusCancel:
		return "已取消"
	default:
		return "未知"
	}
}

func WarPhaseText(p int8) string {
	switch p {
	case WarPhaseDeclare:
		return "宣战"
	case WarPhaseReady:
		return "准备"
	case WarPhaseBattle:
		return "战斗"
	case WarPhaseSettle:
		return "结算"
	default:
		return "未知"
	}
}

func ApplyStatusText(s int8) string {
	switch s {
	case ApplyPending:
		return "待审批"
	case ApplyApproved:
		return "已通过"
	case ApplyRejected:
		return "已拒绝"
	case ApplyCanceled:
		return "已取消"
	default:
		return "未知"
	}
}

// Contributor 协作者
type Contributor struct {
	UserID   int64     `json:"user_id"`
	Power    int       `json:"power"`
	JoinTime time.Time `json:"join_time"`
}
