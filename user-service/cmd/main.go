package main

import (
	"fmt"
	"log"

	"user-service/internal/dao"
	"user-service/internal/handler"
	"user-service/internal/router"
	"user-service/internal/service"
	pkgmysql "user-service/pkg/mysql"
	myredis "user-service/pkg/redis"
	pkgresponse "user-service/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
)

func main() {
	// ─────────────────────────────────
	// 1. 加载配置
	// ─────────────────────────────────
	conf := viper.New()
	conf.SetConfigName("config")
	conf.SetConfigType("yaml")
	conf.AddConfigPath("./config")
	conf.AddConfigPath(".")

	if err := conf.ReadInConfig(); err != nil {
		log.Fatalf("❌ 加载配置文件失败: %v", err)
	}
	fmt.Println("✅ 配置文件加载成功")

	// ─────────────────────────────────
	// 2. 初始化 MySQL
	// ─────────────────────────────────
	if err := pkgmysql.Init(conf); err != nil {
		log.Fatalf("❌ MySQL 初始化失败: %v", err)
	}
	defer pkgmysql.Close()
	fmt.Println("✅ MySQL 连接成功")

	// ─────────────────────────────────
	// 3. 初始化 Redis
	// ─────────────────────────────────
	if err := myredis.Init(conf); err != nil {
		log.Fatalf("❌ Redis 初始化失败: %v", err)
	}
	defer myredis.Close()
	fmt.Println("✅ Redis 连接成功")

	// ─────────────────────────────────
	// 4. 初始化依赖层
	// ─────────────────────────────────
	userDAO := dao.NewUserDAO(pkgmysql.DB)
	userService := service.NewUserService(userDAO)
	userHandler := handler.NewUserHandler(userService)

	// ─────────────────────────────────
	// 5. 启动 HTTP 服务
	// ─────────────────────────────────
	mode := conf.GetString("server.mode")
	gin.SetMode(mode)

	engine := gin.New()
	router.Setup(engine, userHandler)

	host := conf.GetString("server.host")
	port := conf.GetInt("server.port")
	addr := fmt.Sprintf("%s:%d", host, port)

	// 注册统一错误码消息（可选）
	_ = pkgresponse.GetMessage(pkgresponse.CodeSuccess)

	fmt.Printf("\n🚀 用户服务启动成功 → http://%s\n", addr)
	fmt.Println("   健康检查 → GET /health")
	fmt.Println("   注册     → POST /api/v1/user/register")
	fmt.Println("   登录     → POST /api/v1/user/login")
	fmt.Println("   用户信息 → GET  /api/v1/user/profile  [需要JWT]")
	fmt.Println("   修改资料 → PUT  /api/v1/user/profile  [需要JWT]")
	fmt.Println("   修改密码 → PUT  /api/v1/user/password [需要JWT]")
	fmt.Println("   登出     → POST /api/v1/user/logout   [需要JWT]")

	if err := engine.Run(addr); err != nil {
		log.Fatalf("❌ 服务启动失败: %v", err)
	}
}
