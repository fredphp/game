package model

import "time"

// Server 区服模型
type Server struct {
	ID          int64      `json:"id" db:"id"`
	Name        string     `json:"name" db:"name"`
	ServerID    int        `json:"server_id" db:"server_id"`
	Status      int8       `json:"status" db:"status"`       // 0=维护中 1=正常 2=即将开服 3=已关闭
	OpenTime    time.Time  `json:"open_time" db:"open_time"`
	CloseTime   *time.Time `json:"close_time,omitempty" db:"close_time"`
	Host        string     `json:"host,omitempty" db:"host"`
	Region      string     `json:"region" db:"region"`
	MaxPlayers  int        `json:"max_players" db:"max_players"`
	OnlineCount int        `json:"online_count" db:"online_count"`
	CreatedAt   time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at"`
}

// TableName 表名
func (Server) TableName() string {
	return "servers"
}

// ServerStatus 区服状态常量
const (
	ServerStatusMaintain  int8 = 0 // 维护中
	ServerStatusRunning   int8 = 1 // 正常运行
	ServerStatusPreparing int8 = 2 // 即将开服
	ServerStatusClosed    int8 = 3 // 已关闭
)

// UserServer 用户区服绑定
type UserServer struct {
	ID         int64     `json:"id" db:"id"`
	UserID     int64     `json:"user_id" db:"user_id"`
	ServerID   int       `json:"server_id" db:"server_id"`
	LastLogin  time.Time `json:"last_login" db:"last_login"`
	CreatedAt  time.Time `json:"created_at" db:"created_at"`
}

// TableName 表名
func (UserServer) TableName() string {
	return "user_servers"
}

// ──────────────────────────────────────
// 请求/响应模型
// ──────────────────────────────────────

// CreateServerRequest 创建区服请求
type CreateServerRequest struct {
	Name       string `json:"name" binding:"required,min=1,max=64"`
	OpenTime   string `json:"open_time" binding:"required"` // RFC3339
	Region     string `json:"region" binding:"omitempty,oneof=cn tw sea"`
	MaxPlayers int    `json:"max_players" binding:"omitempty,gte=100,lte=200000"`
	Host       string `json:"host" binding:"omitempty,max=128"`
}

// UpdateServerRequest 更新区服请求
type UpdateServerRequest struct {
	Name   *string `json:"name" binding:"omitempty,max=64"`
	Status *int8   `json:"status" binding:"omitempty,oneof=0 1 2 3"`
	Host   *string `json:"host" binding:"omitempty,max=128"`
}

// SelectServerRequest 选择/进入区服请求
type SelectServerRequest struct {
	ServerID int `json:"server_id" binding:"required,gte=1"`
}

// ServerListResponse 区服列表响应
type ServerListResponse struct {
	Servers    []Server `json:"servers"`
	Total      int      `json:"total"`
	MyServerID *int     `json:"my_server_id,omitempty"` // 当前所在区服
}

// ServerDetailResponse 区服详情响应
type ServerDetailResponse struct {
	Server      Server `json:"server"`
	PlayerCount int    `json:"player_count"` // 该区服玩家数
	IsMyServer  bool   `json:"is_my_server"`
}
