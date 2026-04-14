package dao

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"user-service/internal/model"
)

var ErrUserNotFound = errors.New("user not found")

// UserDAO 用户数据访问层
type UserDAO struct {
	db *sql.DB
}

// NewUserDAO 创建 UserDAO
func NewUserDAO(db *sql.DB) *UserDAO {
	return &UserDAO{db: db}
}

// Create 创建用户
func (d *UserDAO) Create(ctx context.Context, user *model.User) (int64, error) {
	result, err := d.db.ExecContext(ctx,
		`INSERT INTO users (username, password, nickname, avatar, phone, email,
         vip_level, gold, diamond, level, experience, status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, 0, 0, 0, 1, 0, 1, NOW(), NOW())`,
		user.Username, user.Password, user.Nickname, user.Avatar,
		user.Phone, user.Email,
	)
	if err != nil {
		return 0, fmt.Errorf("insert user failed: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return 0, fmt.Errorf("get last insert id failed: %w", err)
	}

	return id, nil
}

// GetByID 根据ID查询用户
func (d *UserDAO) GetByID(ctx context.Context, id int64) (*model.User, error) {
	user := &model.User{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, username, password, nickname, avatar, phone, email,
		        vip_level, vip_expire_time, gold, diamond, level, experience,
		        last_login_at, status, created_at, updated_at
		 FROM users WHERE id = ?`, id,
	).Scan(
		&user.ID, &user.Username, &user.Password, &user.Nickname, &user.Avatar,
		&user.Phone, &user.Email, &user.VIPLevel, &user.VIPExpireTime,
		&user.Gold, &user.Diamond, &user.Level, &user.Experience,
		&user.LastLoginAt, &user.Status, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("query user by id failed: %w", err)
	}
	return user, nil
}

// GetByUsername 根据用户名查询
func (d *UserDAO) GetByUsername(ctx context.Context, username string) (*model.User, error) {
	user := &model.User{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, username, password, nickname, avatar, phone, email,
		        vip_level, vip_expire_time, gold, diamond, level, experience,
		        last_login_at, status, created_at, updated_at
		 FROM users WHERE username = ?`, username,
	).Scan(
		&user.ID, &user.Username, &user.Password, &user.Nickname, &user.Avatar,
		&user.Phone, &user.Email, &user.VIPLevel, &user.VIPExpireTime,
		&user.Gold, &user.Diamond, &user.Level, &user.Experience,
		&user.LastLoginAt, &user.Status, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("query user by username failed: %w", err)
	}
	return user, nil
}

// GetByPhone 根据手机号查询
func (d *UserDAO) GetByPhone(ctx context.Context, phone string) (*model.User, error) {
	user := &model.User{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, username, password, nickname, avatar, phone, email,
		        vip_level, vip_expire_time, gold, diamond, level, experience,
		        last_login_at, status, created_at, updated_at
		 FROM users WHERE phone = ?`, phone,
	).Scan(
		&user.ID, &user.Username, &user.Password, &user.Nickname, &user.Avatar,
		&user.Phone, &user.Email, &user.VIPLevel, &user.VIPExpireTime,
		&user.Gold, &user.Diamond, &user.Level, &user.Experience,
		&user.LastLoginAt, &user.Status, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrUserNotFound
		}
		return nil, fmt.Errorf("query user by phone failed: %w", err)
	}
	return user, nil
}

// UpdateProfile 更新用户资料
func (d *UserDAO) UpdateProfile(ctx context.Context, id int64, nickname, avatar, phone, email string) error {
	result, err := d.db.ExecContext(ctx,
		`UPDATE users SET nickname=IFNULL(?, nickname), avatar=IFNULL(?, avatar),
		 phone=IFNULL(?, phone), email=IFNULL(?, email), updated_at=NOW()
		 WHERE id = ?`,
		nullableString(nickname), nullableString(avatar),
		nullableString(phone), nullableString(email), id,
	)
	if err != nil {
		return fmt.Errorf("update user profile failed: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrUserNotFound
	}
	return nil
}

// UpdatePassword 更新密码
func (d *UserDAO) UpdatePassword(ctx context.Context, id int64, hashedPassword string) error {
	result, err := d.db.ExecContext(ctx,
		`UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?`,
		hashedPassword, id,
	)
	if err != nil {
		return fmt.Errorf("update password failed: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrUserNotFound
	}
	return nil
}

// UpdateLastLogin 更新最后登录时间
func (d *UserDAO) UpdateLastLogin(ctx context.Context, id int64) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE users SET last_login_at = NOW() WHERE id = ?`, id,
	)
	if err != nil {
		return fmt.Errorf("update last login time failed: %w", err)
	}
	return nil
}

// UpdateVIPLevel 更新VIP等级
func (d *UserDAO) UpdateVIPLevel(ctx context.Context, id int64, level int, expireTime time.Time) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE users SET vip_level = ?, vip_expire_time = ?, updated_at = NOW() WHERE id = ?`,
		level, expireTime, id,
	)
	if err != nil {
		return fmt.Errorf("update vip level failed: %w", err)
	}
	return nil
}

// ExistsByUsername 检查用户名是否存在
func (d *UserDAO) ExistsByUsername(ctx context.Context, username string) (bool, error) {
	var count int
	err := d.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM users WHERE username = ?`, username,
	).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("check username exists failed: %w", err)
	}
	return count > 0, nil
}

// ExistsByPhone 检查手机号是否存在
func (d *UserDAO) ExistsByPhone(ctx context.Context, phone string) (bool, error) {
	var count int
	err := d.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM users WHERE phone = ?`, phone,
	).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("check phone exists failed: %w", err)
	}
	return count > 0, nil
}

func nullableString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
