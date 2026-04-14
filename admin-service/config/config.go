// Package config 定义九州争鼎后台管理服务的全局配置结构及加载逻辑。
package config

import (
        "os"
        "strconv"

        "gopkg.in/yaml.v3"
)

// Config 全局配置根结构
type Config struct {
        Server   ServerConfig   `yaml:"server"`
        Database DatabaseConfig `yaml:"database"`
        Redis    RedisConfig    `yaml:"redis"`
        JWT      JWTConfig      `yaml:"jwt"`
        Gateway  GatewayConfig  `yaml:"gateway"`
        Log      LogConfig      `yaml:"log"`
}

// ServerConfig HTTP服务配置
type ServerConfig struct {
        Port int    `yaml:"port"`
        Mode string `yaml:"mode"` // debug / release / test
}

// DatabaseConfig 数据库连接配置
type DatabaseConfig struct {
        Host         string `yaml:"host"`
        Port         int    `yaml:"port"`
        User         string `yaml:"user"`
        Password     string `yaml:"password"`
        AdminDB      string `yaml:"admin_db"`
        LogDB        string `yaml:"log_db"`
        GameDB       string `yaml:"game_db"`
        MaxOpenConns int    `yaml:"max_open_conns"`
        MaxIdleConns int    `yaml:"max_idle_conns"`
}

// AdminDSN 返回admin_db的GORM数据源名称
func (d *DatabaseConfig) AdminDSN() string {
        return d.User + ":" + d.Password + "@tcp(" + d.Host + ":" + strconv.Itoa(d.Port) + ")/" + d.AdminDB + "?charset=utf8mb4&parseTime=True&loc=Asia%2FShanghai"
}

// LogDSN 返回log_db的GORM数据源名称
func (d *DatabaseConfig) LogDSN() string {
        return d.User + ":" + d.Password + "@tcp(" + d.Host + ":" + strconv.Itoa(d.Port) + ")/" + d.LogDB + "?charset=utf8mb4&parseTime=True&loc=Asia%2FShanghai"
}

// GameDSN 返回game_db的GORM数据源名称
func (d *DatabaseConfig) GameDSN() string {
        return d.User + ":" + d.Password + "@tcp(" + d.Host + ":" + strconv.Itoa(d.Port) + ")/" + d.GameDB + "?charset=utf8mb4&parseTime=True&loc=Asia%2FShanghai"
}

// RedisConfig Redis连接配置
type RedisConfig struct {
        Addr     string `yaml:"addr"`
        Password string `yaml:"password"`
        DB       int    `yaml:"db"`
        PoolSize int    `yaml:"pool_size"`
}

// JWTConfig JWT令牌配置
type JWTConfig struct {
        Secret           string `yaml:"secret"`
        ExpireHours      int    `yaml:"expire_hours"`
        RefreshExpireDays int  `yaml:"refresh_expire_days"`
}

// GatewayConfig 游戏网关配置
type GatewayConfig struct {
        Addr string `yaml:"addr"`
}

// LogConfig 日志配置
type LogConfig struct {
        Level string `yaml:"level"`
        File  string `yaml:"file"`
}

// Load 从YAML文件加载配置
func Load(path string) (*Config, error) {
        data, err := os.ReadFile(path)
        if err != nil {
                return nil, err
        }
        var cfg Config
        if err := yaml.Unmarshal(data, &cfg); err != nil {
                return nil, err
        }
        return &cfg, nil
}
