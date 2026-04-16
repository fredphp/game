package router

import (
	"card-service/internal/handler"
	"card-service/internal/middleware"

	"github.com/gin-gonic/gin"
)

// Setup 设置路由（整合卡牌 + 技能系统）
func Setup(engine *gin.Engine, cardHandler *handler.CardHandler, skillHandler *handler.SkillHandler) {
	engine.Use(middleware.CORS(), gin.Recovery(), gin.Logger())

	engine.GET("/health", handler.Health)
	engine.GET("/skill/health", handler.SkillHealth)

	v1 := engine.Group("/api/v1")
	{
		// ──────────────────────────────
		// 公开接口
		// ──────────────────────────────
		v1.GET("/card/pools", cardHandler.ListPools)
		v1.GET("/skill/pools", skillHandler.ListSkillPools)
		v1.GET("/skill/definitions", skillHandler.ListSkillDefinitions)

		// ──────────────────────────────
		// 鉴权接口 - 卡牌
		// ──────────────────────────────
		auth := v1.Group("")
		auth.Use(middleware.JWTAuth())
		{
			auth.POST("/card/gacha", cardHandler.Gacha)
			auth.GET("/card/list", cardHandler.ListUserCards)
			auth.PUT("/card/:id/lock", cardHandler.ToggleLock)
			auth.GET("/card/gacha/history", cardHandler.GachaHistory)
			auth.GET("/card/gacha/stats", cardHandler.GachaStats)
		}

		// ──────────────────────────────
		// 鉴权接口 - 技能
		// ──────────────────────────────
		skillAuth := v1.Group("")
		skillAuth.Use(middleware.JWTAuth())
		{
			// 技能抽卡
			skillAuth.POST("/skill/gacha", skillHandler.SkillGacha)
			skillAuth.GET("/skill/gacha/history", skillHandler.SkillGachaHistory)
			skillAuth.GET("/skill/gacha/stats", skillHandler.SkillGachaStats)

			// 技能背包
			skillAuth.GET("/skill/list", skillHandler.ListUserSkills)

			// 装备管理
			skillAuth.POST("/skill/equip", skillHandler.EquipSkill)
			skillAuth.POST("/skill/unequip", skillHandler.UnequipSkill)
			skillAuth.GET("/skill/hero-equipment", skillHandler.GetHeroEquipment)

			// 分解 & 升级
			skillAuth.POST("/skill/decompose", skillHandler.DecomposeSkill)
			skillAuth.POST("/skill/upgrade", skillHandler.UpgradeSkill)
		}
	}
}
