package main

import (
	"fmt"
	"log"

	"payment-service/internal/dao"
	"payment-service/internal/engine"
	"payment-service/internal/handler"
	"payment-service/internal/router"
	"payment-service/internal/service"
	pkgjwt "payment-service/pkg/jwt"
	pkgmysql "payment-service/pkg/mysql"
	myredis "payment-service/pkg/redis"

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
	pkgjwt.Init(conf.GetString("jwt.secret"), conf.GetString("jwt.issuer"), conf.GetInt("jwt.access_ttl"), conf.GetInt("jwt.refresh_ttl"))

	payDAO := dao.NewPaymentDAO(pkgmysql.DB)
	payEngine := engine.NewPaymentEngine(payDAO)
	payEngine.Start()
	defer payEngine.Stop()

	payService := service.NewPaymentService(payDAO, payEngine)
	payHandler := handler.NewPaymentHandler(payService)

	gin.SetMode(conf.GetString("server.mode"))
	r := gin.New()
	router.Setup(r, payHandler)

	addr := fmt.Sprintf("%s:%d", conf.GetString("server.host"), conf.GetInt("server.port"))

	fmt.Println("✅ 支付服务启动成功")
	fmt.Printf("   💰 充值档位 → GET  %s/api/v1/pay/tiers\n", addr)
	fmt.Printf("   💳 创建充值 → POST %s/api/v1/pay/recharge    [JWT]\n", addr)
	fmt.Printf("   🎁 创建礼包 → POST %s/api/v1/pay/gift       [JWT]\n", addr)
	fmt.Printf("   📅 月卡购买 → POST %s/api/v1/pay/monthly    [JWT]\n", addr)
	fmt.Printf("   💳 支付回调 → POST %s/api/v1/pay/callback\n", addr)
	fmt.Printf("   👑 VIP信息  → GET  %s/api/v1/pay/vip        [JWT]\n", addr)
	fmt.Printf("   📋 钱包流水 → GET  %s/api/v1/pay/wallet/logs [JWT]\n", addr)

	r.Run(addr)
}
