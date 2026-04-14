// Package redis 提供九州争鼎后台管理服务的Redis连接初始化。
// 基于go-redis/v9，用于会话缓存、配置缓存、限流等。
package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	// Client 全局Redis客户端实例
	Client *redis.Client
)

// Init 初始化Redis连接
// addr格式: host:port (例: 127.0.0.1:6379)
func Init(addr, password string, db, poolSize int) error {
	Client = redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: password,
		DB:       db,
		PoolSize: poolSize,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := Client.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("connect redis %s: %w", addr, err)
	}

	return nil
}

// Close 关闭Redis连接
func Close() {
	if Client != nil {
		Client.Close()
	}
}
