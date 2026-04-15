package dao

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"user-service/internal/model"
)

var (
	ErrServerNotFound = errors.New("server not found")
	ErrServerExists   = errors.New("server already exists")
)

// ServerDAO 区服数据访问层
type ServerDAO struct {
	db *sql.DB
}

// NewServerDAO 创建 ServerDAO
func NewServerDAO(db *sql.DB) *ServerDAO {
	return &ServerDAO{db: db}
}

// Create 创建区服
func (d *ServerDAO) Create(ctx context.Context, s *model.Server) (int64, error) {
	result, err := d.db.ExecContext(ctx,
		`INSERT INTO servers (name, server_id, status, open_time, host, region, max_players, online_count, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())`,
		s.Name, s.ServerID, s.Status, s.OpenTime, s.Host, s.Region, s.MaxPlayers,
	)
	if err != nil {
		return 0, fmt.Errorf("insert server failed: %w", err)
	}
	return result.LastInsertId()
}

// GetByServerID 根据区服编号查询
func (d *ServerDAO) GetByServerID(ctx context.Context, serverID int) (*model.Server, error) {
	s := &model.Server{}
	err := d.db.QueryRowContext(ctx,
		`SELECT id, name, server_id, status, open_time, close_time, host, region, max_players, online_count, created_at, updated_at
		 FROM servers WHERE server_id = ?`, serverID,
	).Scan(&s.ID, &s.Name, &s.ServerID, &s.Status, &s.OpenTime, &s.CloseTime,
		&s.Host, &s.Region, &s.MaxPlayers, &s.OnlineCount, &s.CreatedAt, &s.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrServerNotFound
		}
		return nil, fmt.Errorf("query server by server_id failed: %w", err)
	}
	return s, nil
}

// List 查询所有区服列表
func (d *ServerDAO) List(ctx context.Context) ([]model.Server, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, name, server_id, status, open_time, close_time, host, region, max_players, online_count, created_at, updated_at
		 FROM servers ORDER BY server_id ASC`,
	)
	if err != nil {
		return nil, fmt.Errorf("list servers failed: %w", err)
	}
	defer rows.Close()

	var servers []model.Server
	for rows.Next() {
		var s model.Server
		if err := rows.Scan(&s.ID, &s.Name, &s.ServerID, &s.Status, &s.OpenTime, &s.CloseTime,
			&s.Host, &s.Region, &s.MaxPlayers, &s.OnlineCount, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan server row failed: %w", err)
		}
		servers = append(servers, s)
	}
	return servers, nil
}

// ListRunning 查询运行中的区服
func (d *ServerDAO) ListRunning(ctx context.Context) ([]model.Server, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, name, server_id, status, open_time, close_time, host, region, max_players, online_count, created_at, updated_at
		 FROM servers WHERE status IN (1, 2) ORDER BY server_id ASC`,
	)
	if err != nil {
		return nil, fmt.Errorf("list running servers failed: %w", err)
	}
	defer rows.Close()

	var servers []model.Server
	for rows.Next() {
		var s model.Server
		if err := rows.Scan(&s.ID, &s.Name, &s.ServerID, &s.Status, &s.OpenTime, &s.CloseTime,
			&s.Host, &s.Region, &s.MaxPlayers, &s.OnlineCount, &s.CreatedAt, &s.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan server row failed: %w", err)
		}
		servers = append(servers, s)
	}
	return servers, nil
}

// UpdateStatus 更新区服状态
func (d *ServerDAO) UpdateStatus(ctx context.Context, serverID int, status int8) error {
	result, err := d.db.ExecContext(ctx,
		`UPDATE servers SET status = ?, updated_at = NOW() WHERE server_id = ?`, status, serverID,
	)
	if err != nil {
		return fmt.Errorf("update server status failed: %w", err)
	}
	rows, _ := result.RowsAffected()
	if rows == 0 {
		return ErrServerNotFound
	}
	return nil
}

// UpdateHost 更新区服地址
func (d *ServerDAO) UpdateHost(ctx context.Context, serverID int, host string) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE servers SET host = ?, updated_at = NOW() WHERE server_id = ?`, host, serverID,
	)
	return err
}

// UpdateOnlineCount 更新在线人数
func (d *ServerDAO) UpdateOnlineCount(ctx context.Context, serverID int, count int) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE servers SET online_count = ?, updated_at = NOW() WHERE server_id = ?`, count, serverID,
	)
	return err
}

// GetMaxServerID 获取最大区服编号（用于自动开服）
func (d *ServerDAO) GetMaxServerID(ctx context.Context) (int, error) {
	var maxID int
	err := d.db.QueryRowContext(ctx, `SELECT COALESCE(MAX(server_id), 0) FROM servers`).Scan(&maxID)
	if err != nil {
		return 0, fmt.Errorf("get max server_id failed: %w", err)
	}
	return maxID, nil
}

// ExistsByServerID 检查区服编号是否存在
func (d *ServerDAO) ExistsByServerID(ctx context.Context, serverID int) (bool, error) {
	var count int
	err := d.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM servers WHERE server_id = ?`, serverID,
	).Scan(&count)
	if err != nil {
		return false, fmt.Errorf("check server exists failed: %w", err)
	}
	return count > 0, nil
}

// ──────────────────────────────────────
// 用户区服绑定
// ──────────────────────────────────────

// BindUserServer 绑定用户到区服
func (d *ServerDAO) BindUserServer(ctx context.Context, userID int64, serverID int) error {
	_, err := d.db.ExecContext(ctx,
		`INSERT IGNORE INTO user_servers (user_id, server_id, last_login, created_at)
		 VALUES (?, ?, NOW(), NOW())`,
		userID, serverID,
	)
	if err != nil {
		return fmt.Errorf("bind user server failed: %w", err)
	}
	return nil
}

// UpdateUserLastLogin 更新用户最后登录区服时间
func (d *ServerDAO) UpdateUserLastLogin(ctx context.Context, userID int64, serverID int) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE user_servers SET last_login = NOW() WHERE user_id = ? AND server_id = ?`,
		userID, serverID,
	)
	return err
}

// GetUserServers 获取用户绑定的所有区服
func (d *ServerDAO) GetUserServers(ctx context.Context, userID int64) ([]model.UserServer, error) {
	rows, err := d.db.QueryContext(ctx,
		`SELECT id, user_id, server_id, last_login, created_at
		 FROM user_servers WHERE user_id = ? ORDER BY last_login DESC`, userID,
	)
	if err != nil {
		return nil, fmt.Errorf("list user servers failed: %w", err)
	}
	defer rows.Close()

	var userServers []model.UserServer
	for rows.Next() {
		var us model.UserServer
		if err := rows.Scan(&us.ID, &us.UserID, &us.ServerID, &us.LastLogin, &us.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan user_server row failed: %w", err)
		}
		userServers = append(userServers, us)
	}
	return userServers, nil
}

// GetServerPlayerCount 获取区服玩家数
func (d *ServerDAO) GetServerPlayerCount(ctx context.Context, serverID int) (int, error) {
	var count int
	err := d.db.QueryRowContext(ctx,
		`SELECT COUNT(1) FROM user_servers WHERE server_id = ?`, serverID,
	).Scan(&count)
	return count, err
}

// UpdateUserServerID 更新用户当前区服
func (d *ServerDAO) UpdateUserServerID(ctx context.Context, userID int64, serverID int) error {
	_, err := d.db.ExecContext(ctx,
		`UPDATE users SET server_id = ?, updated_at = NOW() WHERE id = ?`, serverID, userID,
	)
	return err
}
