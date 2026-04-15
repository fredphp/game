package main

import (
        "fmt"
        "log"

        "card-service/internal/dao"
        "card-service/internal/engine"
        "card-service/internal/handler"
        "card-service/internal/router"
        "card-service/internal/service"
        pkgmysql "card-service/pkg/mysql"
        myredis "card-service/pkg/redis"

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

        // 4. 初始化依赖
        cardDAO := dao.NewCardDAO(pkgmysql.DB)
        gachaEngine := engine.NewGachaEngine()
        cardService := service.NewCardService(cardDAO, gachaEngine)
        cardHandler := handler.NewCardHandler(cardService)

        // 5. 启动服务
        gin.SetMode(conf.GetString("server.mode"))
        engine := gin.New()
        router.Setup(engine, cardHandler)

        addr := fmt.Sprintf("%s:%d",
                conf.GetString("server.host"),
                conf.GetInt("server.port"),
        )

        fmt.Println("✅ 卡牌服务启动成功")
        fmt.Printf("   🎴 抽卡 → POST %s/api/v1/card/gacha  [JWT]\n", addr)
        fmt.Printf("   📋 卡池 → GET  %s/api/v1/card/pools\n", addr)
        fmt.Printf("   🃏 库存 → GET  %s/api/v1/card/list    [JWT]\n", addr)
        fmt.Printf("   🔒 锁定 → PUT  %s/api/v1/card/:id/lock [JWT]\n", addr)
        fmt.Printf("   📊 历史 → GET  %s/api/v1/card/gacha/history [JWT]\n", addr)

        engine.Run(addr)
}
