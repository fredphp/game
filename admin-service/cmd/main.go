// 九州争鼎 admin-service 启动入口
// 后台管理系统微服务，端口: 9100
// 提供: RBAC权限、用户管理、卡池管理、地图管理、公会管理、充值管理、数据分析、日志查看、配置中心、活动管理
package main

import (
	"admin-service/config"
	"admin-service/internal/router"
	"admin-service/internal/service"
	"admin-service/pkg/mysql"
	redispkg "admin-service/pkg/redis"
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
)

func main() {
	// 加载配置
	cfg, err := config.Load("config/config.yaml")
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	// 设置Gin运行模式
	gin.SetMode(cfg.Server.Mode)

	// 初始化数据库连接
	if err := mysql.Init(cfg.Database.AdminDSN(), cfg.Database.LogDSN(), cfg.Database.MaxOpenConns, cfg.Database.MaxIdleConns); err != nil {
		log.Fatalf("init database: %v", err)
	}
	defer mysql.Close()
	log.Println("database connected: admin_db + log_db")

	// 初始化Redis连接
	if err := redispkg.Init(cfg.Redis.Addr, cfg.Redis.Password, cfg.Redis.DB, cfg.Redis.PoolSize); err != nil {
		log.Fatalf("init redis: %v", err)
	}
	defer redispkg.Close()
	log.Println("redis connected:", cfg.Redis.Addr)

	// 初始化下游服务代理
	service.InitServices(cfg.Gateway.Addr)
	log.Println("gateway client initialized:", cfg.Gateway.Addr)

	// 创建Gin引擎
	r := gin.Default()

	// 注册路由
	router.Register(r, cfg)

	// 启动HTTP服务
	addr := fmt.Sprintf(":%d", cfg.Server.Port)
	log.Printf("九州争鼎 admin-service starting on %s", addr)
	if err := r.Run(addr); err != nil {
		log.Fatalf("start server: %v", err)
	}
}
