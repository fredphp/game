package main

import (
	"fmt"
	"log"

	"guild-service/internal/dao"
	"guild-service/internal/engine"
	"guild-service/internal/handler"
	"guild-service/internal/router"
	"guild-service/internal/service"
	pkgjwt "guild-service/pkg/jwt"
	pkgmysql "guild-service/pkg/mysql"
	myredis "guild-service/pkg/redis"

	"github.com/gin-gonic/gin"
	"github.com/spf13/viper"
)

func main() {
	conf := viper.New()
	conf.SetConfigName("config")
	conf.SetConfigType("yaml")
	conf.AddConfigPath("./config")
	conf.AddConfigPath(".")
	if err := conf.ReadInConfig(); err != nil {
		log.Fatalf("❌ 加载配置失败: %v", err)
	}

	if err := pkgmysql.Init(conf); err != nil {
		log.Fatalf("❌ MySQL 初始化失败: %v", err)
	}
	defer pkgmysql.Close()

	if err := myredis.Init(conf); err != nil {
		log.Fatalf("❌ Redis 初始化失败: %v", err)
	}
	defer myredis.Close()

	pkgjwt.Init(
		conf.GetString("jwt.secret"),
		conf.GetString("jwt.issuer"),
		conf.GetInt("jwt.access_ttl"),
		conf.GetInt("jwt.refresh_ttl"),
	)

	guildDAO := dao.NewGuildDAO(pkgmysql.DB)
	warEngine := engine.NewWarEngine(guildDAO)
	warEngine.Start()
	defer warEngine.Stop()

	guildService := service.NewGuildService(guildDAO, warEngine)
	guildHandler := handler.NewGuildHandler(guildService)

	gin.SetMode(conf.GetString("server.mode"))
	r := gin.New()
	router.Setup(r, guildHandler)

	addr := fmt.Sprintf("%s:%d", conf.GetString("server.host"), conf.GetInt("server.port"))

	fmt.Println("✅ 联盟服务启动成功")
	fmt.Printf("   🏛 联盟列表 → GET  %s/api/v1/guild/list\n", addr)
	fmt.Printf("   📋 联盟详情 → GET  %s/api/v1/guild/:id\n", addr)
	fmt.Printf("   ➕ 创建联盟 → POST %s/api/v1/guild/create    [JWT]\n", addr)
	fmt.Printf("   🤝 加入联盟 → POST %s/api/v1/guild/join       [JWT]\n", addr)
	fmt.Printf("   👋 退出联盟 → POST %s/api/v1/guild/leave       [JWT]\n", addr)
	fmt.Printf("   ⚔ 宣战     → POST %s/api/v1/guild/war/declare  [JWT]\n", addr)
	fmt.Printf("   🤝 协作战斗 → POST %s/api/v1/guild/war/coop     [JWT]\n", addr)
	fmt.Printf("   📝 联盟日志 → GET  %s/api/v1/guild/:id/logs     [JWT]\n", addr)

	r.Run(addr)
}
