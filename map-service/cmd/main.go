package main

import (
        "context"
        "fmt"
        "log"

        "map-service/internal/dao"
        "map-service/internal/engine"
        "map-service/internal/handler"
        "map-service/internal/router"
        "map-service/internal/service"
        pkgjwt "map-service/pkg/jwt"
        pkgmysql "map-service/pkg/mysql"
        myredis "map-service/pkg/redis"

        "github.com/gin-gonic/gin"
        "github.com/spf13/viper"
)

func main() {
        // 1. 加载配置
        conf := viper.New()
        conf.SetConfigName("config")
        conf.SetConfigType("yaml")
        conf.AddConfigPath("./config")
        conf.AddConfigPath(".")
        if err := conf.ReadInConfig(); err != nil {
                log.Fatalf("❌ 加载配置失败: %v", err)
        }

        // 2. 初始化 MySQL
        if err := pkgmysql.Init(conf); err != nil {
                log.Fatalf("❌ MySQL 初始化失败: %v", err)
        }
        defer pkgmysql.Close()

        // 3. 初始化 Redis
        if err := myredis.Init(conf); err != nil {
                log.Fatalf("❌ Redis 初始化失败: %v", err)
        }
        defer myredis.Close()

        // 4. 初始化 JWT
        pkgjwt.Init(
                conf.GetString("jwt.secret"),
                conf.GetString("jwt.issuer"),
                conf.GetInt("jwt.access_ttl"),
                conf.GetInt("jwt.refresh_ttl"),
        )

        // 5. 初始化依赖
        mapDAO := dao.NewMapDAO(pkgmysql.DB)

        // 6. 初始化行军引擎
        workerCount := conf.GetInt("march.consumer_workers")
        if workerCount <= 0 {
                workerCount = 5
        }
        tickInterval := conf.GetInt("march.tick_interval_ms")
        if tickInterval <= 0 {
                tickInterval = 1000
        }
        maxActivePerUser := conf.GetInt("march.max_active_march_per_user")
        if maxActivePerUser <= 0 {
                maxActivePerUser = 3
        }
        recallRefundRate := conf.GetFloat64("march.recall_refund_rate")
        if recallRefundRate <= 0 {
                recallRefundRate = 0.8
        }

        marchEngine := engine.NewMarchEngine(mapDAO, workerCount, tickInterval, maxActivePerUser, recallRefundRate)

        // 7. 启动行军引擎（后台协程）
        marchEngine.Start()
        defer marchEngine.Stop()

        // 启动后恢复中断的行军
        recovered, err := marchEngine.RecoverAllMarches(context.Background())
        if err != nil {
                log.Printf("⚠ 行军恢复检查: %v", err)
        } else if recovered > 0 {
                log.Printf("🔄 恢复 %d 个中断行军到处理队列", recovered)
        }

        // 8. 初始化 Service + Handler
        mapService := service.NewMapService(mapDAO, marchEngine)
        mapHandler := handler.NewMapHandler(mapService)

        // 9. 启动 HTTP 服务
        gin.SetMode(conf.GetString("server.mode"))
        r := gin.New()
        router.Setup(r, mapHandler)

        addr := fmt.Sprintf("%s:%d",
                conf.GetString("server.host"),
                conf.GetInt("server.port"),
        )

        fmt.Println("✅ 地图服务启动成功")
        fmt.Printf("   🗺 地图总览 → GET %s/api/v1/map/overview\n", addr)
        fmt.Printf("   🏛 区域列表 → GET %s/api/v1/map/regions\n", addr)
        fmt.Printf("   🏰 城池详情 → GET %s/api/v1/map/city/:id\n", addr)
        fmt.Printf("   ⚔ 发起行军 → POST %s/api/v1/map/march     [JWT]\n", addr)
        fmt.Printf("   📋 行军列表 → GET  %s/api/v1/map/march/list [JWT]\n", addr)
        fmt.Printf("   📊 行军进度 → GET  %s/api/v1/map/march/:marchId/progress [JWT]\n", addr)
        fmt.Printf("   ↩ 撤回行军 → POST %s/api/v1/map/march/:marchId/recall [JWT]\n", addr)
        fmt.Printf("   🏛 联盟领土 → GET  %s/api/v1/map/alliance/:allianceId/territory [JWT]\n", addr)
        fmt.Printf("   📜 战斗日志 → GET  %s/api/v1/map/city/:id/logs\n", addr)

        r.Run(addr)
}
