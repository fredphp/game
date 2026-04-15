package main

import (
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"

	"season-service/internal/dao"
	"season-service/internal/engine"
	"season-service/internal/handler"
	"season-service/internal/router"
	"season-service/internal/service"
	pkgmysql "season-service/pkg/mysql"
	myredis "season-service/pkg/redis"
	pkgresponse "season-service/pkg/response"

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
	seasonDAO := dao.NewSeasonDAO(pkgmysql.DB)
	seasonService := service.NewSeasonService(seasonDAO)
	seasonHandler := handler.NewSeasonHandler(seasonService)
	internalHandler := handler.NewSeasonInternalHandler(seasonService)

	// ─────────────────────────────────
	// 5. 启动赛季定时引擎
	// ─────────────────────────────────
	seasonEngine := engine.NewSeasonEngine(conf)
	seasonEngine.Start()

	// ─────────────────────────────────
	// 6. 启动 HTTP 服务
	// ─────────────────────────────────
	mode := conf.GetString("server.mode")
	gin.SetMode(mode)

	httpEngine := gin.New()
	router.Setup(httpEngine, seasonHandler, internalHandler)

	host := conf.GetString("server.host")
	port := conf.GetInt("server.port")
	addr := fmt.Sprintf("%s:%d", host, port)

	// 注册统一错误码消息
	_ = pkgresponse.GetMessage(pkgresponse.CodeSuccess)

	fmt.Printf("\n🚀 赛季服务启动成功 → http://%s\n", addr)
	fmt.Println("   健康检查     → GET /health")
	fmt.Println("   ── 玩家接口 ─────────────────────────")
	fmt.Println("   当前赛季     → GET  /api/v1/season/current")
	fmt.Println("   赛季列表     → GET  /api/v1/season/list")
	fmt.Println("   赛季详情     → GET  /api/v1/season/:id")
	fmt.Println("   赛季排名     → GET  /api/v1/season/:id/rankings")
	fmt.Println("   奖励记录     → GET  /api/v1/season/:id/rewards  [JWT]")
	fmt.Println("   ── 管理接口 ─────────────────────────")
	fmt.Println("   创建赛季     → POST /admin/season/create        [API Key]")
	fmt.Println("   启动赛季     → POST /admin/season/:id/start     [API Key]")
	fmt.Println("   手动结算     → POST /admin/season/:id/settle     [API Key]")
	fmt.Println("   强制结束     → POST /admin/season/:id/force-end  [API Key]")
	fmt.Println("   赛季统计     → GET  /admin/season/:id/stats      [API Key]")
	fmt.Println("   奖励配置     → POST /admin/season/reward/create  [API Key]")
	fmt.Println("   奖励列表     → GET  /admin/season/reward/list    [API Key]")
	fmt.Println("   删除奖励     → DEL  /admin/season/reward/:id     [API Key]")
	fmt.Println("   ── 内部接口 ─────────────────────────")
	fmt.Println("   当前赛季     → GET  /internal/season/current     [API Key]")
	fmt.Println("   ── 定时任务 ─────────────────────────")
	duration := conf.GetInt("season.duration_days")
	interval := conf.GetInt("season.check_interval")
	prepare := conf.GetInt("season.prepare_hours")
	fmt.Printf("   赛季周期     → %d 天\n", duration)
	fmt.Printf("   检查间隔     → %d 秒\n", interval)
	fmt.Printf("   预警时间     → %d 小时\n", prepare)

	// 优雅关闭
	go func() {
		quit := make(chan os.Signal, 1)
		signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
		<-quit
		fmt.Println("\n⏳ 正在优雅关闭...")
		seasonEngine.Stop()
		fmt.Println("✅ 赛季服务已停止")
		os.Exit(0)
	}()

	if err := httpEngine.Run(addr); err != nil {
		log.Fatalf("❌ 服务启动失败: %v", err)
	}
}
