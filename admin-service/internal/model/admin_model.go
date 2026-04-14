// Package model 定义九州争鼎后台管理服务的所有数据模型。
// 包括: 后台用户、角色、权限(RBAC)、全局配置、活动配置、请求/响应结构。
// 日志模型: 用户行为日志、战斗日志、GM操作日志、登录日志
package model

import "time"

// AdminUser 后台用户
type AdminUser struct {
	ID           int64      `json:"id" gorm:"primaryKey;autoIncrement"`
	Username     string     `json:"username" gorm:"size:50;uniqueIndex;not null"`
	PasswordHash string     `json:"-" gorm:"size:255;not null;column:password_hash"`
	RealName     string     `json:"realName" gorm:"size:50;column:real_name"`
	Email        string     `json:"email" gorm:"size:100"`
	Phone        string     `json:"phone" gorm:"size:20"`
	Avatar       string     `json:"avatar" gorm:"size:255"`
	Status       int8       `json:"status" gorm:"default:1"`
	LastLoginAt  *time.Time `json:"lastLoginAt" gorm:"column:last_login_at"`
	LastLoginIP  string     `json:"lastLoginIp" gorm:"size:45;column:last_login_ip"`
	CreatedAt    time.Time  `json:"createdAt"`
	UpdatedAt    time.Time  `json:"updatedAt"`
	Roles        []Role     `json:"roles" gorm:"many2many:admin_user_role;"`
}

// TableName 指定AdminUser表名
func (AdminUser) TableName() string {
	return "admin_user"
}

// Role 角色
type Role struct {
	ID          int64       `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string      `json:"name" gorm:"size:50;not null"`
	Code        string      `json:"code" gorm:"size:50;uniqueIndex;not null"`
	Description string      `json:"description" gorm:"size:200"`
	Status      int8        `json:"status" gorm:"default:1"`
	CreatedAt   time.Time   `json:"createdAt"`
	UpdatedAt   time.Time   `json:"updatedAt"`
	Permissions []Permission `json:"permissions" gorm:"many2many:admin_role_permission;"`
}

// TableName 指定Role表名
func (Role) TableName() string {
	return "admin_role"
}

// Permission 权限 (菜单/按钮/API)
type Permission struct {
	ID       int64  `json:"id" gorm:"primaryKey;autoIncrement"`
	Name     string `json:"name" gorm:"size:50;not null"`
	Code     string `json:"code" gorm:"size:100;uniqueIndex;not null"`
	Type     string `json:"type" gorm:"size:20;not null"` // menu / button / api
	ParentID int64  `json:"parentId" gorm:"default:0;column:parent_id"`
	Path     string `json:"path" gorm:"size:200"`
	Icon     string `json:"icon" gorm:"size:50"`
	Sort     int    `json:"sort" gorm:"default:0"`
	Status   int8   `json:"status" gorm:"default:1"`
}

// TableName 指定Permission表名
func (Permission) TableName() string {
	return "admin_permission"
}

// GlobalConfig 全局配置
type GlobalConfig struct {
	ID          int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	ConfigKey   string    `json:"key" gorm:"size:100;uniqueIndex;column:config_key;not null"`
	ConfigName  string    `json:"name" gorm:"size:100;column:config_name;not null"`
	ConfigValue string    `json:"value" gorm:"type:text;column:config_value;not null"`
	ValueType   string    `json:"type" gorm:"size:20;column:value_type;default:string"`
	ConfigGroup string    `json:"group" gorm:"size:50;column:config_group;default:global"`
	Description string    `json:"description" gorm:"size:500"`
	UpdatedAt   time.Time `json:"updatedAt" gorm:"autoUpdateTime"`
	UpdatedBy   string    `json:"updatedBy" gorm:"size:50;column:updated_by"`
}

// TableName 指定GlobalConfig表名
func (GlobalConfig) TableName() string {
	return "global_config"
}

// ActivityConfig 活动配置
type ActivityConfig struct {
	ID          int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	Name        string    `json:"name" gorm:"size:100;not null"`
	Type        string    `json:"type" gorm:"size:30;not not null"` // gacha/war/growth/festival/guild
	Description string    `json:"description" gorm:"type:text"`
	StartTime   time.Time `json:"startTime" gorm:"column:start_time;not null"`
	EndTime     time.Time `json:"endTime" gorm:"column:end_time;not null"`
	RewardsJSON string    `json:"rewards" gorm:"type:json;column:rewards_json;not null"`
	Status      int8      `json:"status" gorm:"default:1"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt" gorm:"autoUpdateTime"`
}

// TableName 指定ActivityConfig表名
func (ActivityConfig) TableName() string {
	return "activity_config"
}

// ==================== 日志模型 ====================

// GmOperationLog GM操作日志 (增强版)
type GmOperationLog struct {
	ID           int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	OperatorID   int64     `json:"operatorId" gorm:"column:operator_id;not null"`
	OperatorName string    `json:"operatorName" gorm:"size:50;column:operator_name;not null"`
	TargetID     int64     `json:"targetId" gorm:"column:target_id;not null"`
	TargetType   string    `json:"targetType" gorm:"size:30;column:target_type;not null"`
	Action       string    `json:"action" gorm:"size:50;not null"`
	Detail       string    `json:"detail" gorm:"type:text"`
	BeforeData   *string   `json:"beforeData" gorm:"type:json;column:before_data"`
	AfterData    *string   `json:"afterData" gorm:"type:json;column:after_data"`
	Level        int8      `json:"level" gorm:"default:1;comment:1低2中3高4危险"`
	Result       int8      `json:"result" gorm:"default:1;comment:0失败1成功"`
	IP           string    `json:"ip" gorm:"size:45"`
	UserAgent    string    `json:"userAgent" gorm:"size:255;column:user_agent"`
	CreatedAt    time.Time `json:"createdAt" gorm:"column:created_at"`
}

// LoginLog 登录日志 (增强版)
type LoginLog struct {
	ID          int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID      int64     `json:"userId" gorm:"column:user_id;not null"`
	Nickname    string    `json:"nickname" gorm:"size:50"`
	IP          string    `json:"ip" gorm:"size:45"`
	Device      string    `json:"device" gorm:"size:100"`
	Channel     string    `json:"channel" gorm:"size:30"`
	OSVersion   string    `json:"osVersion" gorm:"size:50;column:os_version"`
	AppVersion  string    `json:"appVersion" gorm:"size:30;column:app_version"`
	Status      int8      `json:"status" gorm:"default:1;comment:1成功0失败"`
	FailReason  string    `json:"failReason" gorm:"size:100;column:fail_reason"`
	CreatedAt   time.Time `json:"createdAt" gorm:"column:created_at"`
}

// UserActionLog 用户行为日志 (增强版)
type UserActionLog struct {
	ID        int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	UserID    int64     `json:"userId" gorm:"column:user_id;not null"`
	UID       string    `json:"uid" gorm:"size:30;not null"`
	Nickname  string    `json:"nickname" gorm:"size:50"`
	Category  string    `json:"category" gorm:"size:30;not null;comment:battle/gacha/trade/social/system/guild/map"`
	Action    string    `json:"action" gorm:"size:50;not null"`
	Detail    string    `json:"detail" gorm:"type:text"`
	ExtraData *string   `json:"extraData" gorm:"type:json;column:extra_data"`
	IP        string    `json:"ip" gorm:"size:45"`
	Device    string    `json:"device" gorm:"size:100"`
	ServerID  int       `json:"serverId" gorm:"column:server_id;default:0"`
	CreatedAt time.Time `json:"createdAt" gorm:"column:created_at"`
}

// BattleLog 战斗日志
type BattleLog struct {
	ID            int64     `json:"id" gorm:"primaryKey;autoIncrement"`
	BattleID      string    `json:"battleId" gorm:"size:64;uniqueIndex;column:battle_id;not null"`
	UserID        int64     `json:"userId" gorm:"column:user_id;not null"`
	UID           string    `json:"uid" gorm:"size:30;not null"`
	Nickname      string    `json:"nickname" gorm:"size:50"`
	BattleType    string    `json:"battleType" gorm:"size:20;column:battle_type;not null;comment:pve/pvp/arena/siege/world_boss"`
	StageID       int       `json:"stageId" gorm:"column:stage_id;default:0"`
	Difficulty    int8      `json:"difficulty" gorm:"default:1"`
	AttackerPower int       `json:"attackerPower" gorm:"column:attacker_power;default:0"`
	DefenderID    int64     `json:"defenderId" gorm:"column:defender_id;default:0"`
	DefenderName  string    `json:"defenderName" gorm:"size:50;column:defender_name"`
	DefenderPower int       `json:"defenderPower" gorm:"column:defender_power;default:0"`
	Result        int8      `json:"result" gorm:"default:0;comment:0失败1胜利2平局"`
	StarRating    int8      `json:"starRating" gorm:"column:star_rating;default:0"`
	Turns         int       `json:"turns" gorm:"default:0"`
	Duration      int       `json:"duration" gorm:"default:0;comment:战斗耗时(秒)"`
	HeroUsed      string    `json:"heroUsed" gorm:"size:500;column:hero_used"`
	HeroDetail    *string   `json:"heroDetail" gorm:"type:json;column:hero_detail"`
	RewardJSON    *string   `json:"rewardJson" gorm:"type:json;column:reward_json"`
	DamageTotal   int       `json:"damageTotal" gorm:"column:damage_total;default:0"`
	DamageTaken   int       `json:"damageTaken" gorm:"column:damage_taken;default:0"`
	HealTotal     int       `json:"healTotal" gorm:"column:heal_total;default:0"`
	SkillCasts    int       `json:"skillCasts" gorm:"column:skill_casts;default:0"`
	IP            string    `json:"ip" gorm:"size:45"`
	ServerID      int       `json:"serverId" gorm:"column:server_id;default:0"`
	CreatedAt     time.Time `json:"createdAt" gorm:"column:created_at"`
}

// ActionCategory 行为分类
type ActionCategory struct {
	ID          int64   `json:"id" gorm:"primaryKey;autoIncrement"`
	Category    string  `json:"category" gorm:"size:30;uniqueIndex;not null"`
	Name        string  `json:"name" gorm:"size:50;not null"`
	Description string  `json:"description" gorm:"size:200"`
	Actions     *string `json:"actions" gorm:"type:json"`
	IsMonitored int8    `json:"isMonitored" gorm:"column:is_monitored;default:0"`
	CreatedAt   time.Time `json:"createdAt"`
}

// ==================== 订单模型 ====================

// Order 支付订单 (分表)
type Order struct {
	OrderNo     string     `json:"orderNo" gorm:"primaryKey;size:64;column:order_no"`
	UserID      int64      `json:"userId" gorm:"column:user_id;not null"`
	ProductType string     `json:"productType" gorm:"size:20;column:product_type;not null"`
	ProductName string     `json:"productName" gorm:"size:100;column:product_name;not null"`
	Amount      int        `json:"amount" gorm:"not null"` // 金额(分)
	Diamond     int        `json:"diamond" gorm:"default:0"`
	Bonus       int        `json:"bonus" gorm:"default:0"`
	Status      int8       `json:"status" gorm:"default:0"` // 0待付 1已付 2已发 3退 4关
	StatusText  string     `json:"statusText" gorm:"size:20;column:status_text"`
	PayMethod   string     `json:"payMethod" gorm:"size:30;column:pay_method"`
	TradeNo     string     `json:"tradeNo" gorm:"size:128;column:trade_no"`
	PaidAt      *time.Time `json:"paidAt" gorm:"column:paid_at"`
	DeliveredAt *time.Time `json:"deliveredAt" gorm:"column:delivered_at"`
	CreatedAt   time.Time  `json:"createdAt"`
}

// ==================== 请求/响应结构 ====================

// LoginRequest 登录请求
type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// LoginResponse 登录响应
type LoginResponse struct {
	Token    string    `json:"token"`
	ExpireAt time.Time `json:"expireAt"`
	User     AdminUser `json:"user"`
}

// PageRequest 通用分页请求
type PageRequest struct {
	Page     int `form:"page" json:"page"`
	PageSize int `form:"pageSize" json:"pageSize"`
}

// GetOffset 计算分页偏移量
func (p *PageRequest) GetOffset() int {
	if p.Page <= 0 {
		p.Page = 1
	}
	if p.PageSize <= 0 || p.PageSize > 100 {
		p.PageSize = 20
	}
	return (p.Page - 1) * p.PageSize
}

// PageResponse 通用分页响应
type PageResponse struct {
	List     interface{} `json:"list"`
	Total    int64       `json:"total"`
	Page     int         `json:"page"`
	PageSize int         `json:"pageSize"`
}

// BanRequest 封禁用户请求
type BanRequest struct {
	Reason   string `json:"reason"`
	Duration int    `json:"duration"` // 封禁时长(小时), 0=永久
}

// ResourceModifyRequest 资源修改请求
type ResourceModifyRequest struct {
	Resource string `json:"resource" binding:"required"` // gold/diamond/stamina/...
	Amount   int    `json:"amount" binding:"required"`
	Reason   string `json:"reason"`
}

// RoleCreateRequest 创建角色请求
type RoleCreateRequest struct {
	Name        string `json:"name" binding:"required"`
	Code        string `json:"code" binding:"required"`
	Description string `json:"description"`
}

// RoleUpdateRequest 更新角色请求
type RoleUpdateRequest struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Status      *int8   `json:"status"`
	Permissions []int64 `json:"permissions"`
}

// AssignRolesRequest 分配角色请求
type AssignRolesRequest struct {
	RoleIDs []int64 `json:"roleIds" binding:"required"`
}

// ConfigUpdateRequest 配置更新请求
type ConfigUpdateRequest struct {
	ConfigValue string `json:"value" binding:"required"`
	UpdatedBy   string `json:"updatedBy"`
}

// ActivityCreateRequest 创建活动请求
type ActivityCreateRequest struct {
	Name        string    `json:"name" binding:"required"`
	Type        string    `json:"type" binding:"required"`
	Description string    `json:"description"`
	StartTime   time.Time `json:"startTime" binding:"required"`
	EndTime     time.Time `json:"endTime" binding:"required"`
	RewardsJSON string    `json:"rewards" binding:"required"`
}

// ActivityUpdateRequest 更新活动请求
type ActivityUpdateRequest struct {
	Name        *string     `json:"name"`
	Type        *string     `json:"type"`
	Description *string     `json:"description"`
	StartTime   *time.Time  `json:"startTime"`
	EndTime     *time.Time  `json:"endTime"`
	RewardsJSON *string     `json:"rewards"`
	Status      *int8       `json:"status"`
}

// ==================== 仪表盘 & 统计 ====================

// DashboardStats 仪表盘统计数据
type DashboardStats struct {
	TotalUsers      int64 `json:"totalUsers"`
	TodayActive     int64 `json:"todayActive"`
	TodayRevenue    int64 `json:"todayRevenue"`    // 今日收入(分)
	TotalRevenue    int64 `json:"totalRevenue"`    // 总收入(分)
	TodayRegistered int64 `json:"todayRegistered"`
	OnlineNow       int64 `json:"onlineNow"`
	TotalOrders     int64 `json:"totalOrders"`
	PendingRefunds  int64 `json:"pendingRefunds"`
}

// DailyStats 每日统计
type DailyStats struct {
	Date        string `json:"date"`
	NewUsers    int64  `json:"newUsers"`
	ActiveUsers int64  `json:"activeUsers"`
	Revenue     int64  `json:"revenue"`
	Orders      int64  `json:"orders"`
	GachaDraws  int64  `json:"gachaDraws"`
	NewGuilds   int64  `json:"newGuilds"`
}

// GachaStats 抽卡统计
type GachaStats struct {
	Date     string `json:"date"`
	PoolName string `json:"poolName"`
	Total    int64  `json:"total"`
	SSR      int64  `json:"ssr"`
	SR       int64  `json:"sr"`
	R        int64  `json:"r"`
	SSRRate  string `json:"ssrRate"`
	Revenue  int64  `json:"revenue"`
}

// RetentionStats 留存统计
type RetentionStats struct {
	CohortDate string  `json:"cohortDate"`
	NewUsers   int64   `json:"newUsers"`
	D1         float64 `json:"d1"`
	D3         float64 `json:"d3"`
	D7         float64 `json:"d7"`
	D14        float64 `json:"d14"`
	D30        float64 `json:"d30"`
}

// BattleDailyStats 战斗每日统计
type BattleDailyStats struct {
	Date         string  `json:"date"`
	BattleType   string  `json:"battleType"`
	TotalBattles int64   `json:"totalBattles"`
	Wins         int64   `json:"wins"`
	WinRate      float64 `json:"winRate"`
	AvgDuration  float64 `json:"avgDuration"`
	AvgTurns     float64 `json:"avgTurns"`
	AvgDamage    float64 `json:"avgDamage"`
}

// HeroPickRate 武将使用率
type HeroPickRate struct {
	HeroID   int64   `json:"heroId"`
	HeroName string  `json:"heroName"`
	Faction  string  `json:"faction"`
	PickRate int64   `json:"pickRate"`
	WinRate  float64 `json:"winRate"`
}

// ActionStats 用户行为统计
type ActionStats struct {
	Category string `json:"category"`
	Action   string `json:"action"`
	Count    int64  `json:"count"`
}

// ==================== 服务代理模型 ====================

// CardPool 卡池信息 (从card-service获取)
type CardPool struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	Type       string `json:"type"`
	TotalDraws int64  `json:"totalDraws"`
	SSRRate    string `json:"ssrRate"`
	SRRate     string `json:"srRate"`
	StartTime  string `json:"startTime"`
	EndTime    string `json:"endTime"`
}

// Hero 英雄信息 (从card-service获取)
type Hero struct {
	ID     int64  `json:"id"`
	Name   string `json:"name"`
	Rarity string `json:"rarity"`
	Status int8   `json:"status"`
}

// City 城池信息 (从map-service获取)
type City struct {
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Region    string `json:"region"`
	Level     int    `json:"level"`
	GuildName string `json:"guildName"`
	GuildID   int64  `json:"guildId"`
}

// Guild 公会信息 (从guild-service获取)
type Guild struct {
	ID          int64  `json:"id"`
	Name        string `json:"name"`
	LeaderName  string `json:"leaderName"`
	MemberCount int    `json:"memberCount"`
	MaxMembers  int    `json:"maxMembers"`
	Level       int    `json:"level"`
	CityCount   int    `json:"cityCount"`
}

// GuildMember 公会成员信息
type GuildMember struct {
	UserID   int64  `json:"userId"`
	Nickname string `json:"nickname"`
	Role     string `json:"role"`
	Level    int    `json:"level"`
	Power    int    `json:"power"`
}
