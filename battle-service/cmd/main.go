package main

import (
        "fmt"
        "log"
        "battle-service/internal/dao"
        "battle-service/internal/engine"
        "battle-service/internal/handler"
        "battle-service/internal/router"
        "battle-service/internal/service"
        pkgmysql "battle-service/pkg/mysql"
        myredis "battle-service/pkg/redis"
        "github.com/gin-gonic/gin"
        "github.com/spf13/viper"
)

func main() {
        conf := viper.New()
        conf.SetConfigName("config")
        conf.SetConfigType("yaml")
        conf.AddConfigPath("./config")
        if err := conf.ReadInConfig(); err != nil { log.Fatalf("加载配置失败: %v", err) }

        if err := pkgmysql.Init(conf); err != nil { log.Fatalf("MySQL: %v", err) }
        defer pkgmysql.Close()
        if err := myredis.Init(conf); err != nil { log.Fatalf("Redis: %v", err) }
        defer myredis.Close()

        battleDAO := dao.NewBattleDAO(pkgmysql.DB)
        battleEngine := engine.NewBattleEngine()
        battleService := service.NewBattleService(battleDAO, battleEngine)
        battleHandler := handler.NewBattleHandler(battleService)

        gin.SetMode(conf.GetString("server.mode"))
        engine := gin.New()
        router.Setup(engine, battleHandler)

        addr := fmt.Sprintf("%s:%d", conf.GetString("server.host"), conf.GetInt("server.port"))
        fmt.Println("✅ 战斗服务启动成功")
        fmt.Printf("   ⚔️ PVE战斗 → POST %s/api/v1/battle/pve     [JWT]\n", addr)
        fmt.Printf("   📺 战斗回放 → GET  %s/api/v1/battle/replay/:id [JWT]\n", addr)
        fmt.Printf("   📊 战斗历史 → GET  %s/api/v1/battle/history   [JWT]\n", addr)
        engine.Run(addr)
}
