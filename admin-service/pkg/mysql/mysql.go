// Package mysql 提供九州争鼎后台管理服务的MySQL数据库连接初始化。
// 基于GORM v2，支持admin_db和log_db两个数据库实例。
package mysql

import (
	"fmt"
	"time"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var (
	// AdminDB admin_db数据库实例 (RBAC、配置、活动)
	AdminDB *gorm.DB
	// LogDB log_db数据库实例 (操作日志、订单)
	LogDB *gorm.DB
)

// Init 初始化数据库连接
// dsn格式: user:password@tcp(host:port)/dbname?charset=utf8mb4&parseTime=True&loc=Asia%2FShanghai
// maxOpenConns / maxIdleConns 控制连接池大小
func Init(adminDSN, logDSN string, maxOpen, maxIdle int) error {
	var err error

	// 初始化admin_db
	AdminDB, err = openDB(adminDSN, maxOpen, maxIdle)
	if err != nil {
		return fmt.Errorf("connect admin_db: %w", err)
	}

	// 初始化log_db
	LogDB, err = openDB(logDSN, maxOpen, maxIdle)
	if err != nil {
		return fmt.Errorf("connect log_db: %w", err)
	}

	return nil
}

// openDB 创建GORM数据库连接并配置连接池
func openDB(dsn string, maxOpen, maxIdle int) (*gorm.DB, error) {
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxOpenConns(maxOpen)
	sqlDB.SetMaxIdleConns(maxIdle)
	sqlDB.SetConnMaxLifetime(time.Hour)
	sqlDB.SetConnMaxIdleTime(10 * time.Minute)

	return db, nil
}

// Close 关闭所有数据库连接
func Close() {
	if AdminDB != nil {
		if sqlDB, err := AdminDB.DB(); err == nil {
			sqlDB.Close()
		}
	}
	if LogDB != nil {
		if sqlDB, err := LogDB.DB(); err == nil {
			sqlDB.Close()
		}
	}
}
