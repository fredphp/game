package redis

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/spf13/viper"
)

var RDB *redis.Client

// Init 初始化 Redis 连接
func Init(conf *viper.Viper) error {
	RDB = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", conf.GetString("redis.host"), conf.GetInt("redis.port")),
		Password: conf.GetString("redis.password"),
		DB:       conf.GetInt("redis.db"),
		PoolSize: conf.GetInt("redis.pool_size"),
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := RDB.Ping(ctx).Err(); err != nil {
		return fmt.Errorf("failed to ping redis: %w", err)
	}

	return nil
}

// Close 关闭 Redis 连接
func Close() {
	if RDB != nil {
		_ = RDB.Close()
	}
}
