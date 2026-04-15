package service

import (
	"context"
	"errors"
	"fmt"
	"time"

	"user-service/internal/dao"
	"user-service/internal/model"
	myredis "user-service/pkg/redis"

	"github.com/redis/go-redis/v9"
)

var (
	ErrServerNotFound    = errors.New("server not found")
	ErrServerFull        = errors.New("server is full")
	ErrServerMaintaining = errors.New("server is under maintenance")
	ErrServerClosed      = errors.New("server is closed")
)

// ServerService 区服服务
type ServerService struct {
	serverDAO *dao.ServerDAO
}

// NewServerService 创建 ServerService
func NewServerService(serverDAO *dao.ServerDAO) *ServerService {
	return &ServerService{serverDAO: serverDAO}
}

// ListAll 获取所有区服列表
func (s *ServerService) ListAll(ctx context.Context) ([]model.Server, error) {
	return s.serverDAO.List(ctx)
}

// ListRunning 获取可进入的区服列表
func (s *ServerService) ListRunning(ctx context.Context) ([]model.Server, error) {
	return s.serverDAO.ListRunning(ctx)
}

// GetByServerID 获取区服详情
func (s *ServerService) GetByServerID(ctx context.Context, serverID int) (*model.Server, error) {
	return s.serverDAO.GetByServerID(ctx, serverID)
}

// CreateServer 创建新区服
func (s *ServerService) CreateServer(ctx context.Context, req *model.CreateServerRequest) (*model.Server, error) {
	// 获取最大区服编号
	maxID, err := s.serverDAO.GetMaxServerID(ctx)
	if err != nil {
		return nil, fmt.Errorf("get max server_id failed: %w", err)
	}

	newServerID := maxID + 1

	// 解析开服时间
	openTime, err := time.Parse(time.RFC3339, req.OpenTime)
	if err != nil {
		return nil, fmt.Errorf("invalid open_time format: %w", err)
	}

	// 如果开服时间在未来，状态为"即将开服"
	status := model.ServerStatusRunning
	if openTime.After(time.Now()) {
		status = model.ServerStatusPreparing
	}

	region := req.Region
	if region == "" {
		region = "cn"
	}
	maxPlayers := req.MaxPlayers
	if maxPlayers <= 0 {
		maxPlayers = 50000
	}

	server := &model.Server{
		Name:       req.Name,
		ServerID:   newServerID,
		Status:     int8(status),
		OpenTime:   openTime,
		Host:       req.Host,
		Region:     region,
		MaxPlayers: maxPlayers,
	}

	id, err := s.serverDAO.Create(ctx, server)
	if err != nil {
		return nil, fmt.Errorf("create server failed: %w", err)
	}
	server.ID = id

	// 初始化区服 Redis 数据
	if err := s.initServerRedis(ctx, newServerID); err != nil {
		// 非致命错误，记录日志即可
		fmt.Printf("⚠️ init server redis failed: %v\n", err)
	}

	return server, nil
}

// SelectServer 用户选择/进入区服
func (s *ServerService) SelectServer(ctx context.Context, userID int64, serverID int) (*model.Server, error) {
	server, err := s.serverDAO.GetByServerID(ctx, serverID)
	if err != nil {
		return nil, ErrServerNotFound
	}

	// 检查区服状态
	switch model.ServerStatus(server.Status) {
	case model.ServerStatusMaintain:
		return nil, ErrServerMaintaining
	case model.ServerStatusClosed:
		return nil, ErrServerClosed
	}

	// 检查人数
	count, err := s.serverDAO.GetServerPlayerCount(ctx, serverID)
	if err != nil {
		return nil, fmt.Errorf("get player count failed: %w", err)
	}
	if count >= server.MaxPlayers {
		return nil, ErrServerFull
	}

	// 绑定用户到区服
	if err := s.serverDAO.BindUserServer(ctx, userID, serverID); err != nil {
		return nil, fmt.Errorf("bind user server failed: %w", err)
	}

	// 更新最后登录时间
	if err := s.serverDAO.UpdateUserLastLogin(ctx, userID, serverID); err != nil {
		return nil, fmt.Errorf("update last login failed: %w", err)
	}

	// 更新 users 表的 server_id
	if err := s.serverDAO.UpdateUserServerID(ctx, userID, serverID); err != nil {
		return nil, fmt.Errorf("update user server_id failed: %w", err)
	}

	// 更新在线人数 (+1)
	if err := s.serverDAO.UpdateOnlineCount(ctx, serverID, count+1); err != nil {
		fmt.Printf("⚠️ update online count failed: %v\n", err)
	}

	// 缓存用户所在区服到 Redis
	serverKey := fmt.Sprintf("server:user:%d", userID)
	myredis.RDB.Set(ctx, serverKey, serverID, 0)

	return server, nil
}

// GetUserServers 获取用户已绑定的区服列表
func (s *ServerService) GetUserServers(ctx context.Context, userID int64) ([]model.UserServer, error) {
	return s.serverDAO.GetUserServers(ctx, userID)
}

// GetServerDetail 获取区服详情（含玩家数、是否为我的区服）
func (s *ServerService) GetServerDetail(ctx context.Context, serverID int, userID int64) (*model.ServerDetailResponse, error) {
	server, err := s.serverDAO.GetByServerID(ctx, serverID)
	if err != nil {
		return nil, ErrServerNotFound
	}

	playerCount, _ := s.serverDAO.GetServerPlayerCount(ctx, serverID)

	// 检查是否为用户的区服
	isMyServer := false
	userServers, _ := s.serverDAO.GetUserServers(ctx, userID)
	for _, us := range userServers {
		if us.ServerID == serverID {
			isMyServer = true
			break
		}
	}

	return &model.ServerDetailResponse{
		Server:      *server,
		PlayerCount: playerCount,
		IsMyServer:  isMyServer,
	}, nil
}

// AutoCreateServer 自动创建新区服（定时任务调用）
func (s *ServerService) AutoCreateServer(ctx context.Context, name string, openTimeStr string) (*model.Server, error) {
	req := &model.CreateServerRequest{
		Name:       name,
		OpenTime:   openTimeStr,
		Region:     "cn",
		MaxPlayers: 50000,
	}
	return s.CreateServer(ctx, req)
}

// initServerRedis 初始化区服 Redis 数据
func (s *ServerService) initServerRedis(ctx context.Context, serverID int) error {
	pipeline := myredis.RDB.Pipeline()

	// 区服排行榜（有序集合，为空）
	pipeline.ZAdd(ctx, serverRankKey(serverID), &redis.Z{Score: 0, Member: "placeholder"})

	// 区服配置哈希
	pipeline.HSet(ctx, serverConfigKey(serverID), map[string]interface{}{
		"double_exp":   "0",
		"double_gold":  "0",
		"maintenance":  "false",
		"announcement": "",
	})

	// 在线玩家集合
	pipeline.Del(ctx, serverOnlineKey(serverID))

	// 开服时间
	pipeline.Set(ctx, serverInfoKey(serverID), "active", 0)

	_, err := pipeline.Exec(ctx)
	return err
}

// ──────────────────────────────────────
// Redis Key 隔离工具函数
// ──────────────────────────────────────

// ServerKeyPrefix 返回区服隔离的 key 前缀
func ServerKeyPrefix(serverID int) string {
	return fmt.Sprintf("s%d:", serverID)
}

// serverRankKey 区服排行榜 key
func serverRankKey(serverID int) string {
	return fmt.Sprintf("s%d:ranking:power", serverID)
}

// serverConfigKey 区服配置 key
func serverConfigKey(serverID int) string {
	return fmt.Sprintf("s%d:config", serverID)
}

// serverOnlineKey 区服在线玩家 key
func serverOnlineKey(serverID int) string {
	return fmt.Sprintf("s%d:online", serverID)
}

// serverInfoKey 区服信息 key
func serverInfoKey(serverID int) string {
	return fmt.Sprintf("s%d:info", serverID)
}

// IsolatedKey 通用隔离 key 生成
// 用法: IsolatedKey(serverID, "user:profile", userID) → "s1:user:profile:123"
func IsolatedKey(serverID int, parts ...interface{}) string {
	prefix := ServerKeyPrefix(serverID)
	result := prefix
	for _, p := range parts {
		result += fmt.Sprintf("%v:", p)
	}
	// 去掉最后一个冒号
	if len(result) > len(prefix) {
		result = result[:len(result)-1]
	}
	return result
}
