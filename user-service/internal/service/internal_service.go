package service

import (
        "context"
        "errors"
        "fmt"
        "time"

        "user-service/internal/dao"
        "user-service/internal/model"
)

// InternalService 内部服务间调用的业务逻辑
type InternalService struct {
        dao *dao.UserDAO
}

// NewInternalService 创建 InternalService
func NewInternalService(dao *dao.UserDAO) *InternalService {
        return &InternalService{dao: dao}
}

// ──────────────────────────────────────
// 钻石操作
// ──────────────────────────────────────

// DeductDiamonds 扣除钻石（带余额校验）
func (s *InternalService) DeductDiamonds(ctx context.Context, userID int64, amount int, reason string) error {
        ok, err := s.dao.DeductDiamonds(ctx, userID, amount)
        if err != nil {
                return fmt.Errorf("deduct diamonds failed: %w", err)
        }
        if !ok {
                return fmt.Errorf("钻石余额不足: user_id=%d, amount=%d", userID, amount)
        }
        return nil
}

// AddDiamonds 增加钻石
func (s *InternalService) AddDiamonds(ctx context.Context, userID int64, amount int, reason string) error {
        return s.dao.AddDiamonds(ctx, userID, amount)
}

// ──────────────────────────────────────
// 金币操作
// ──────────────────────────────────────

// DeductGold 扣除金币（带余额校验）
func (s *InternalService) DeductGold(ctx context.Context, userID int64, amount int, reason string) error {
        err := s.dao.DeductGold(ctx, userID, amount)
        if err != nil {
                return fmt.Errorf("deduct gold failed: %w", err)
        }
        return nil
}

// AddGold 增加金币
func (s *InternalService) AddGold(ctx context.Context, userID int64, amount int, reason string) error {
        return s.dao.AddGold(ctx, userID, amount)
}

// ──────────────────────────────────────
// 粮食操作
// ──────────────────────────────────────

// DeductFood 扣除粮食（带余额校验）
func (s *InternalService) DeductFood(ctx context.Context, userID int64, amount int) error {
        ok, err := s.dao.DeductFood(ctx, userID, amount)
        if err != nil {
                return fmt.Errorf("deduct food failed: %w", err)
        }
        if !ok {
                return fmt.Errorf("粮食余额不足: user_id=%d, amount=%d", userID, amount)
        }
        return nil
}

// AddFood 增加粮食
func (s *InternalService) AddFood(ctx context.Context, userID int64, amount int) error {
        return s.dao.AddFood(ctx, userID, amount)
}

// ──────────────────────────────────────
// 经验与升级
// ──────────────────────────────────────

// AddExpWithLevelUp 增加经验并自动升级
// 升级公式: 需要经验 = level * 100
// 最高等级: 100
func (s *InternalService) AddExpWithLevelUp(ctx context.Context, userID int64, exp int64) (*model.InternalAddExpResponse, error) {
        // 先增加经验
        _, err := s.dao.AddExp(ctx, userID, exp)
        if err != nil {
                return nil, fmt.Errorf("add exp failed: %w", err)
        }

        // 获取最新用户数据
        user, err := s.dao.GetByID(ctx, userID)
        if err != nil {
                return nil, fmt.Errorf("get user after add exp: %w", err)
        }

        originalLevel := user.Level

        // 升级循环：经验满足则升级
        for {
                neededExp := int64(user.Level) * 100
                if user.Experience >= neededExp && user.Level < 100 {
                        user.Experience -= neededExp
                        user.Level++
                        if err := s.dao.UpdateLevel(ctx, userID, user.Level, user.Experience); err != nil {
                                return nil, fmt.Errorf("update level failed: %w", err)
                        }
                } else {
                        break
                }
        }

        return &model.InternalAddExpResponse{
                UserID:     userID,
                Level:      user.Level,
                Experience: user.Experience,
                LeveledUp:  user.Level > originalLevel,
        }, nil
}

// ──────────────────────────────────────
// 余额查询
// ──────────────────────────────────────

// GetBalance 获取用户资源余额
func (s *InternalService) GetBalance(ctx context.Context, userID int64) (*model.InternalBalanceResponse, error) {
        user, err := s.dao.GetByID(ctx, userID)
        if err != nil {
                if errors.Is(err, dao.ErrUserNotFound) {
                        return nil, fmt.Errorf("用户不存在: user_id=%d", userID)
                }
                return nil, fmt.Errorf("get user balance failed: %w", err)
        }

        // 粮食字段不在 User 结构体中，需要单独查询
        food, _ := s.dao.GetFoodBalance(ctx, userID)

        return &model.InternalBalanceResponse{
                UserID:     user.ID,
                Gold:       user.Gold,
                Diamond:    user.Diamond,
                Food:       food,
                Level:      user.Level,
                Experience: user.Experience,
                VIPLevel:   user.VIPLevel,
        }, nil
}

// ──────────────────────────────────────
// VIP 操作
// ──────────────────────────────────────

// UpdateVIP 更新VIP等级
func (s *InternalService) UpdateVIP(ctx context.Context, userID int64, vipLevel int) error {
        // 获取用户当前VIP过期时间（如果有）
        user, err := s.dao.GetByID(ctx, userID)
        if err != nil {
                return fmt.Errorf("get user failed: %w", err)
        }

        // 保持现有过期时间，仅更新等级
        // 如果没有过期时间，使用零值（数据库会存储为 NULL）
        expireTime := time.Time{}
        if user.VIPExpireTime != nil {
                expireTime = *user.VIPExpireTime
        }

        return s.dao.UpdateVIPLevel(ctx, userID, vipLevel, expireTime)
}
