package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"user-service/internal/dao"
	"user-service/internal/model"
	jwtPkg "user-service/pkg/jwt"
	myredis "user-service/pkg/redis"
	pkgresponse "user-service/pkg/response"

	"github.com/redis/go-redis/v9"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUserAlreadyExists = errors.New("username already exists")
	ErrPhoneAlreadyExists = errors.New("phone already exists")
	ErrInvalidCredentials = errors.New("invalid username or password")
	ErrAccountBanned      = errors.New("account has been banned")
	ErrOldPasswordWrong   = errors.New("old password is wrong")
)

const (
	prefixUserInfo    = "user:info:"       // Hash: 用户信息缓存
	prefixSession     = "user:session:"    // String: token -> userID 映射
	prefixBlacklist   = "user:blacklist:"  // String: 已注销的 token
	prefixLoginCount  = "user:login:cnt:"  // String: 登录失败次数(限流)
)

// UserService 用户业务逻辑层
type UserService struct {
	dao     *dao.UserDAO
}

// NewUserService 创建 UserService
func NewUserService(dao *dao.UserDAO) *UserService {
	return &UserService{dao: dao}
}

// ──────────────────────────────────────
// 注册
// ──────────────────────────────────────
func (s *UserService) Register(ctx context.Context, req *model.RegisterRequest) (*model.User, error) {
	// 检查用户名是否已存在
	exists, err := s.dao.ExistsByUsername(ctx, req.Username)
	if err != nil {
		return nil, fmt.Errorf("check username: %w", err)
	}
	if exists {
		return nil, ErrUserAlreadyExists
	}

	// 检查手机号是否已存在
	if req.Phone != "" {
		exists, err = s.dao.ExistsByPhone(ctx, req.Phone)
		if err != nil {
			return nil, fmt.Errorf("check phone: %w", err)
		}
		if exists {
			return nil, ErrPhoneAlreadyExists
		}
	}

	// 密码加密 (bcrypt cost=10)
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("hash password: %w", err)
	}

	nickname := req.Nickname
	if nickname == "" {
		nickname = req.Username // 默认昵称为用户名
	}

	user := &model.User{
		Username: req.Username,
		Password: string(hashed),
		Nickname: nickname,
		Avatar:   "",
		Phone:    req.Phone,
		Email:    req.Email,
	}

	id, err := s.dao.Create(ctx, user)
	if err != nil {
		return nil, fmt.Errorf("create user: %w", err)
	}
	user.ID = id

	return user, nil
}

// ──────────────────────────────────────
// 登录
// ──────────────────────────────────────
func (s *UserService) Login(ctx context.Context, req *model.LoginRequest) (*model.LoginResponse, error) {
	// 检查登录失败次数（防暴力破解）
	countKey := fmt.Sprintf("%s%s", prefixLoginCount, req.Username)
	cnt, _ := myredis.RDB.Get(ctx, countKey).Int()
	if cnt >= 5 {
		return nil, errors.New("too many login attempts, please try again later")
	}

	// 查询用户
	user, err := s.dao.GetByUsername(ctx, req.Username)
	if err != nil {
		if errors.Is(err, dao.ErrUserNotFound) {
			// 记录失败次数
			myredis.RDB.Incr(ctx, countKey)
			myredis.RDB.Expire(ctx, countKey, 15*time.Minute)
			return nil, ErrInvalidCredentials
		}
		return nil, fmt.Errorf("get user: %w", err)
	}

	// 检查账号状态
	if user.Status == 0 {
		return nil, ErrAccountBanned
	}

	// 校验密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		myredis.RDB.Incr(ctx, countKey)
		myredis.RDB.Expire(ctx, countKey, 15*time.Minute)
		return nil, ErrInvalidCredentials
	}

	// 登录成功，清除失败计数
	myredis.RDB.Del(ctx, countKey)

	// 更新最后登录时间
	_ = s.dao.UpdateLastLogin(ctx, user.ID)

	// 生成 JWT
	accessToken, err := jwtPkg.GenerateToken(user.ID, user.Username, user.VIPLevel)
	if err != nil {
		return nil, fmt.Errorf("generate access token: %w", err)
	}

	refreshToken, err := jwtPkg.GenerateRefreshToken(user.ID, user.Username)
	if err != nil {
		return nil, fmt.Errorf("generate refresh token: %w", err)
	}

	// 缓存用户信息到 Redis
	_ = s.cacheUserInfo(ctx, user)

	// 缓存 Session（token -> userID）
	sessionKey := fmt.Sprintf("%s%s", prefixSession, accessToken)
	ttl := time.Duration(time.Duration(7200) * time.Second) // 与 access_token TTL 一致
	_ = myredis.RDB.Set(ctx, sessionKey, user.ID, ttl).Err()

	return &model.LoginResponse{
		UserID:      user.ID,
		Username:    user.Username,
		Nickname:    user.Nickname,
		Avatar:      user.Avatar,
		VIPLevel:    user.VIPLevel,
		AccessToken: accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:   7200,
	}, nil
}

// ──────────────────────────────────────
// 获取用户信息
// ──────────────────────────────────────
func (s *UserService) GetProfile(ctx context.Context, userID int64) (*model.UserProfile, error) {
	// 先查 Redis 缓存
	cached, err := s.getCachedUserInfo(ctx, userID)
	if err == nil && cached != nil {
		return cached, nil
	}

	// 缓存未命中，查数据库
	user, err := s.dao.GetByID(ctx, userID)
	if err != nil {
		if errors.Is(err, dao.ErrUserNotFound) {
			return nil, pkgresponse.ErrUserNotFound
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}

	// 写入缓存
	_ = s.cacheUserInfo(ctx, user)

	return &model.UserProfile{
		ID:            user.ID,
		Username:      user.Username,
		Nickname:      user.Nickname,
		Avatar:        user.Avatar,
		VIPLevel:      user.VIPLevel,
		VIPExpireTime: user.VIPExpireTime,
		Gold:          user.Gold,
		Diamond:       user.Diamond,
		Level:         user.Level,
		Experience:    user.Experience,
		Status:        user.Status,
		CreatedAt:     user.CreatedAt,
	}, nil
}

// ──────────────────────────────────────
// 更新用户资料
// ──────────────────────────────────────
func (s *UserService) UpdateProfile(ctx context.Context, userID int64, req *model.UpdateProfileRequest) error {
	nickname, avatar, phone, email := "", "", "", ""
	if req.Nickname != nil { nickname = *req.Nickname }
	if req.Avatar != nil   { avatar = *req.Avatar }
	if req.Phone != nil    { phone = *req.Phone }
	if req.Email != nil    { email = *req.Email }

	if err := s.dao.UpdateProfile(ctx, userID, nickname, avatar, phone, email); err != nil {
		return err
	}

	// 清除缓存，下次查询时重新加载
	_ = myredis.RDB.Del(ctx, fmt.Sprintf("%s%d", prefixUserInfo, userID))

	return nil
}

// ──────────────────────────────────────
// 修改密码
// ──────────────────────────────────────
func (s *UserService) UpdatePassword(ctx context.Context, userID int64, req *model.UpdatePasswordRequest) error {
	user, err := s.dao.GetByID(ctx, userID)
	if err != nil {
		return fmt.Errorf("get user: %w", err)
	}

	// 校验旧密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
		return ErrOldPasswordWrong
	}

	// 加密新密码
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("hash new password: %w", err)
	}

	if err := s.dao.UpdatePassword(ctx, userID, string(hashed)); err != nil {
		return fmt.Errorf("update password: %w", err)
	}

	// 清除缓存
	_ = myredis.RDB.Del(ctx, fmt.Sprintf("%s%d", prefixUserInfo, userID))

	return nil
}

// ──────────────────────────────────────
// 登出（Token 加入黑名单）
// ──────────────────────────────────────
func (s *UserService) Logout(ctx context.Context, token string) error {
	// 将 token 加入黑名单，TTL 与 token 剩余有效期一致
	blacklistKey := fmt.Sprintf("%s%s", prefixBlacklist, token)
	claims, err := jwtPkg.ParseToken(token)
	if err == nil {
		remaining := time.Until(claims.ExpiresAt.Time)
		if remaining > 0 {
			_ = myredis.RDB.Set(ctx, blacklistKey, "1", remaining).Err()
		}
	}

	// 删除 Session 缓存
	sessionKey := fmt.Sprintf("%s%s", prefixSession, token)
	_ = myredis.RDB.Del(ctx, sessionKey)

	return nil
}

// ──────────────────────────────────────
// 检查 Token 是否在黑名单中
// ──────────────────────────────────────
func IsTokenBlacklisted(ctx context.Context, token string) bool {
	key := fmt.Sprintf("%s%s", prefixBlacklist, token)
	val, err := myredis.RDB.Exists(ctx, key).Result()
	return err == nil && val > 0
}

// ──────────────────────────────────────
// Redis 缓存方法（私有）
// ──────────────────────────────────────
func (s *UserService) cacheUserInfo(ctx context.Context, user *model.User) error {
	key := fmt.Sprintf("%s%d", prefixUserInfo, user.ID)
	data, _ := json.Marshal(model.UserProfile{
		ID:            user.ID,
		Username:      user.Username,
		Nickname:      user.Nickname,
		Avatar:        user.Avatar,
		VIPLevel:      user.VIPLevel,
		VIPExpireTime: user.VIPExpireTime,
		Gold:          user.Gold,
		Diamond:       user.Diamond,
		Level:         user.Level,
		Experience:    user.Experience,
		Status:        user.Status,
		CreatedAt:     user.CreatedAt,
	})

	pipe := myredis.RDB.Pipeline()
	pipe.Del(ctx, key)
	pipe.HSet(ctx, key, map[string]interface{}{
		"id":             user.ID,
		"username":       user.Username,
		"nickname":       user.Nickname,
		"avatar":         user.Avatar,
		"vip_level":      user.VIPLevel,
		"gold":           user.Gold,
		"diamond":        user.Diamond,
		"level":          user.Level,
		"experience":     user.Experience,
		"status":         user.Status,
		"data_json":      string(data),
	})
	pipe.Expire(ctx, key, 30*time.Minute)
	_, err := pipe.Exec(ctx)
	return err
}

func (s *UserService) getCachedUserInfo(ctx context.Context, userID int64) (*model.UserProfile, error) {
	key := fmt.Sprintf("%s%d", prefixUserInfo, userID)
	dataJSON, err := myredis.RDB.HGet(ctx, key, "data_json").Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, nil
		}
		return nil, err
	}

	var profile model.UserProfile
	if err := json.Unmarshal([]byte(dataJSON), &profile); err != nil {
		return nil, err
	}
	return &profile, nil
}
