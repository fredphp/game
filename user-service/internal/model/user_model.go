package model

import "time"

// User 用户模型
type User struct {
        ID             int64      `json:"id" db:"id"`
        Username       string     `json:"username" db:"username"`
        Password       string     `json:"-" db:"password"` // 不序列化到JSON
        Nickname       string     `json:"nickname" db:"nickname"`
        Avatar         string     `json:"avatar" db:"avatar"`
        Phone          string     `json:"phone,omitempty" db:"phone"`
        Email          string     `json:"email,omitempty" db:"email"`
        VIPLevel       int        `json:"vip_level" db:"vip_level"`
        VIPExpireTime  *time.Time `json:"vip_expire_time" db:"vip_expire_time"`
        Gold           int64      `json:"gold" db:"gold"`
        Diamond        int64      `json:"diamond" db:"diamond"`
        Level          int        `json:"level" db:"level"`
        Experience     int64      `json:"experience" db:"experience"`
        LastLoginAt    *time.Time `json:"last_login_at" db:"last_login_at"`
        Status         int8       `json:"status" db:"status"` // 1:正常 0:禁用
        CreatedAt      time.Time  `json:"created_at" db:"created_at"`
        UpdatedAt      time.Time  `json:"updated_at" db:"updated_at"`
}

// TableName 表名
func (User) TableName() string {
        return "users"
}

// RegisterRequest 注册请求
type RegisterRequest struct {
        Username string `json:"username" binding:"required,min=3,max=32,alphanum"`
        Password string `json:"password" binding:"required,min=6,max=64"`
        Nickname string `json:"nickname" binding:"max=32"`
        Phone    string `json:"phone" binding:"omitempty,e164"`
        Email    string `json:"email" binding:"omitempty,email,max=128"`
}

// LoginRequest 登录请求
type LoginRequest struct {
        Username string `json:"username" binding:"required"`
        Password string `json:"password" binding:"required"`
}

// LoginResponse 登录响应
type LoginResponse struct {
        UserID      int64      `json:"user_id"`
        Username    string     `json:"username"`
        Nickname    string     `json:"nickname"`
        Avatar      string     `json:"avatar"`
        VIPLevel    int        `json:"vip_level"`
        AccessToken string     `json:"access_token"`
        RefreshToken string    `json:"refresh_token"`
        ExpiresIn   int64      `json:"expires_in"`
}

// UpdateProfileRequest 更新资料请求
type UpdateProfileRequest struct {
        Nickname *string `json:"nickname" binding:"omitempty,max=32"`
        Avatar   *string `json:"avatar" binding:"omitempty,max=512"`
        Phone    *string `json:"phone" binding:"omitempty,e164"`
        Email    *string `json:"email" binding:"omitempty,email,max=128"`
}

// UpdatePasswordRequest 修改密码请求
type UpdatePasswordRequest struct {
        OldPassword string `json:"old_password" binding:"required,min=6"`
        NewPassword string `json:"new_password" binding:"required,min=6,max=64"`
}

// ──────────────────────────────────────
// 内部服务间调用 - 请求/响应模型
// ──────────────────────────────────────

// InternalDeductRequest 扣除资源请求（钻石/金币/粮食）
type InternalDeductRequest struct {
        UserID int64  `json:"user_id" binding:"required"`
        Amount int    `json:"amount" binding:"required,gt=0"`
        Reason string `json:"reason" binding:"required"`
}

// InternalAddRequest 增加资源请求（钻石/金币/粮食）
type InternalAddRequest struct {
        UserID int64  `json:"user_id" binding:"required"`
        Amount int    `json:"amount" binding:"required,gt=0"`
        Reason string `json:"reason" binding:"required"`
}

// InternalAddExpRequest 增加经验请求
type InternalAddExpRequest struct {
        UserID int64  `json:"user_id" binding:"required"`
        Amount int64  `json:"amount" binding:"required,gt=0"`
}

// InternalUpdateVIPRequest 更新VIP等级请求
type InternalUpdateVIPRequest struct {
        UserID   int64  `json:"user_id" binding:"required"`
        VIPLevel int    `json:"vip_level" binding:"required,gte=0,lte=10"`
}

// InternalBalanceResponse 余额查询响应
type InternalBalanceResponse struct {
        UserID      int64  `json:"user_id"`
        Gold        int64  `json:"gold"`
        Diamond     int64  `json:"diamond"`
        Food        int64  `json:"food"`
        Level       int    `json:"level"`
        Experience  int64  `json:"experience"`
        VIPLevel    int    `json:"vip_level"`
}

// InternalAddExpResponse 增加经验响应
type InternalAddExpResponse struct {
        UserID     int64 `json:"user_id"`
        Level      int   `json:"level"`
        Experience int64 `json:"experience"`
        LeveledUp  bool  `json:"leveled_up"`
}

// UserProfile 用户公开信息（不含敏感数据）
type UserProfile struct {
        ID           int64      `json:"id"`
        Username     string     `json:"username"`
        Nickname     string     `json:"nickname"`
        Avatar       string     `json:"avatar"`
        VIPLevel     int        `json:"vip_level"`
        VIPExpireTime *time.Time `json:"vip_expire_time"`
        Gold         int64      `json:"gold"`
        Diamond      int64      `json:"diamond"`
        Level        int        `json:"level"`
        Experience   int64      `json:"experience"`
        Status       int8       `json:"status"`
        CreatedAt    time.Time  `json:"created_at"`
}
