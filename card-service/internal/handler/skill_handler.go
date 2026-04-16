package handler

import (
	"errors"
	"net/http"
	"strconv"

	"card-service/internal/model"
	"card-service/internal/service"
	pkgresponse "card-service/pkg/response"

	"github.com/gin-gonic/gin"
)

// SkillHandler 技能API处理器
type SkillHandler struct {
	skillSvc *service.SkillService
}

func NewSkillHandler(skillSvc *service.SkillService) *SkillHandler {
	return &SkillHandler{skillSvc: skillSvc}
}

// ──────────────────────────────────────
// 技能抽卡
// ──────────────────────────────────────

// SkillGacha 技能抽卡
// @Summary 技能抽卡
// @Description 单抽/十连抽技能
// @Tags 技能系统
// @Accept json
// @Produce json
// @Param body body model.SkillGachaRequest true "抽卡请求"
// @Success 200 {object} pkgresponse.Response{data=model.SkillGachaResponse}
// @Router /api/v1/skill/gacha [post]
func (h *SkillHandler) SkillGacha(c *gin.Context) {
	var req model.SkillGachaRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	userID, _ := c.Get("user_id")
	resp, err := h.skillSvc.SkillGacha(c.Request.Context(), userID.(int64), &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrSkillPoolNotFound):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "技能卡池不存在或已关闭")
		case errors.Is(err, service.ErrInsufficientDiamonds):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "技能券不足")
		default:
			pkgresponse.Error(c, pkgresponse.CodeErrServer)
		}
		return
	}

	pkgresponse.Success(c, resp)
}

// ──────────────────────────────────────
// 技能背包
// ──────────────────────────────────────

// ListUserSkills 获取玩家技能列表
// @Summary 技能列表
// @Description 获取玩家技能背包
// @Tags 技能系统
// @Param page query int false "页码"
// @Param page_size query int false "每页数量"
// @Param rarity query int false "稀有度筛选 3=R 4=SR 5=SSR"
// @Param category query string false "分类筛选 attack/defense/support/control"
// @Success 200 {object} pkgresponse.Response
// @Router /api/v1/skill/list [get]
func (h *SkillHandler) ListUserSkills(c *gin.Context) {
	userID, _ := c.Get("user_id")
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	rarity, _ := strconv.Atoi(c.DefaultQuery("rarity", "0"))
	category := c.DefaultQuery("category", "")

	skills, total, err := h.skillSvc.GetUserSkills(c.Request.Context(), userID.(int64), page, pageSize, rarity, category)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	pkgresponse.Success(c, pkgresponse.PageData{
		Total: total,
		Page:  page,
		Size:  pageSize,
		List:  skills,
	})
}

// ListSkillDefinitions 获取所有技能定义
// @Summary 技能图鉴
// @Description 获取所有技能定义（公开）
// @Tags 技能系统
// @Param page query int false "页码"
// @Param page_size query int false "每页数量"
// @Param rarity query int false "稀有度筛选"
// @Param category query string false "分类筛选"
// @Success 200 {object} pkgresponse.Response
// @Router /api/v1/skill/definitions [get]
func (h *SkillHandler) ListSkillDefinitions(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	rarity, _ := strconv.Atoi(c.DefaultQuery("rarity", "0"))
	category := c.DefaultQuery("category", "")

	skills, total, err := h.skillSvc.ListSkillDefinitions(c.Request.Context(), page, pageSize, rarity, category)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	pkgresponse.Success(c, pkgresponse.PageData{
		Total: total,
		Page:  page,
		Size:  pageSize,
		List:  skills,
	})
}

// ──────────────────────────────────────
// 装备管理
// ──────────────────────────────────────

// EquipSkill 装备技能到英雄
// @Summary 装备技能
// @Description 将技能装备到英雄的指定槽位（每英雄最多3个）
// @Tags 技能系统
// @Accept json
// @Produce json
// @Param body body model.EquipSkillRequest true "装备请求"
// @Success 200 {object} pkgresponse.Response
// @Router /api/v1/skill/equip [post]
func (h *SkillHandler) EquipSkill(c *gin.Context) {
	var req model.EquipSkillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	userID, _ := c.Get("user_id")
	err := h.skillSvc.EquipSkill(c.Request.Context(), userID.(int64), &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrHeroNotFound):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "英雄不存在")
		case errors.Is(err, service.ErrSkillNotOwned):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "技能不属于该玩家")
		case errors.Is(err, service.ErrSlotOccupied):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "该槽位已被占用")
		case errors.Is(err, service.ErrSkillAlreadyEquipped):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "技能已装备在其他英雄上")
		case errors.Is(err, service.ErrMaxEquipReached):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "英雄已装备满3个技能")
		default:
			pkgresponse.Error(c, pkgresponse.CodeErrServer)
		}
		return
	}

	pkgresponse.Success(c, nil)
}

// UnequipSkill 卸下英雄技能
// @Summary 卸下技能
// @Description 从英雄的指定槽位卸下技能
// @Tags 技能系统
// @Accept json
// @Produce json
// @Param body body model.UnequipSkillRequest true "卸下请求"
// @Success 200 {object} pkgresponse.Response
// @Router /api/v1/skill/unequip [post]
func (h *SkillHandler) UnequipSkill(c *gin.Context) {
	var req model.UnequipSkillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	userID, _ := c.Get("user_id")
	err := h.skillSvc.UnequipSkill(c.Request.Context(), userID.(int64), &req)
	if err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "卸下失败")
		return
	}

	pkgresponse.Success(c, nil)
}

// GetHeroEquipment 获取英雄装备信息
// @Summary 英雄装备
// @Description 获取英雄的天生技能和装备技能
// @Tags 技能系统
// @Param user_card_id query int true "玩家卡牌实例ID"
// @Success 200 {object} pkgresponse.Response{data=model.HeroEquipmentResponse}
// @Router /api/v1/skill/hero-equipment [get]
func (h *SkillHandler) GetHeroEquipment(c *gin.Context) {
	userID, _ := c.Get("user_id")
	userCardID, err := strconv.ParseInt(c.Query("user_card_id"), 10, 64)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrParam)
		return
	}

	resp, err := h.skillSvc.GetHeroEquipmentInfo(c.Request.Context(), userID.(int64), userCardID)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrHeroNotFound):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "英雄不存在")
		default:
			pkgresponse.Error(c, pkgresponse.CodeErrServer)
		}
		return
	}

	pkgresponse.Success(c, resp)
}

// ──────────────────────────────────────
// 技能分解
// ──────────────────────────────────────

// DecomposeSkill 分解技能
// @Summary 分解技能
// @Description 分解重复技能获取碎片
// @Tags 技能系统
// @Accept json
// @Produce json
// @Param body body model.DecomposeSkillRequest true "分解请求"
// @Success 200 {object} pkgresponse.Response{data=model.DecomposeSkillResponse}
// @Router /api/v1/skill/decompose [post]
func (h *SkillHandler) DecomposeSkill(c *gin.Context) {
	var req model.DecomposeSkillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	userID, _ := c.Get("user_id")
	resp, err := h.skillSvc.DecomposeSkill(c.Request.Context(), userID.(int64), &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrSkillNotOwned):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "技能不属于该玩家")
		case errors.Is(err, service.ErrSkillLocked):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "技能已锁定，无法分解")
		case errors.Is(err, service.ErrSkillEquipped):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "技能已装备，请先卸下")
		default:
			pkgresponse.Error(c, pkgresponse.CodeErrServer)
		}
		return
	}

	pkgresponse.Success(c, resp)
}

// ──────────────────────────────────────
// 技能升级
// ──────────────────────────────────────

// UpgradeSkill 升级技能
// @Summary 升级技能
// @Description 消耗碎片升级技能
// @Tags 技能系统
// @Accept json
// @Produce json
// @Param body body model.UpgradeSkillRequest true "升级请求"
// @Success 200 {object} pkgresponse.Response{data=model.UpgradeSkillResponse}
// @Router /api/v1/skill/upgrade [post]
func (h *SkillHandler) UpgradeSkill(c *gin.Context) {
	var req model.UpgradeSkillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	userID, _ := c.Get("user_id")
	resp, err := h.skillSvc.UpgradeSkill(c.Request.Context(), userID.(int64), &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrSkillNotOwned):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "技能不属于该玩家")
		case errors.Is(err, service.ErrMaxLevelReached):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "技能已达最大等级")
		case errors.Is(err, service.ErrInsufficientFragments):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "技能碎片不足")
		default:
			pkgresponse.Error(c, pkgresponse.CodeErrServer)
		}
		return
	}

	pkgresponse.Success(c, resp)
}

// ──────────────────────────────────────
// 技能卡池
// ──────────────────────────────────────

// ListSkillPools 技能卡池列表
// @Summary 技能卡池
// @Description 获取当前开放的技能卡池
// @Tags 技能系统
// @Success 200 {object} pkgresponse.Response
// @Router /api/v1/skill/pools [get]
func (h *SkillHandler) ListSkillPools(c *gin.Context) {
	pools, err := h.skillSvc.ListSkillPools(c.Request.Context())
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}
	pkgresponse.Success(c, pools)
}

// SkillGachaHistory 技能抽卡历史
// @Summary 抽卡历史
// @Description 获取技能抽卡历史记录
// @Tags 技能系统
// @Param limit query int false "数量限制"
// @Success 200 {object} pkgresponse.Response
// @Router /api/v1/skill/gacha/history [get]
func (h *SkillHandler) SkillGachaHistory(c *gin.Context) {
	userID, _ := c.Get("user_id")
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	records, err := h.skillSvc.GetSkillGachaHistory(c.Request.Context(), userID.(int64), limit)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}
	pkgresponse.Success(c, records)
}

// SkillGachaStats 技能保底计数
// @Summary 保底计数
// @Description 获取技能抽卡保底计数
// @Tags 技能系统
// @Param pool_id query int true "卡池ID"
// @Success 200 {object} pkgresponse.Response
// @Router /api/v1/skill/gacha/stats [get]
func (h *SkillHandler) SkillGachaStats(c *gin.Context) {
	userID, _ := c.Get("user_id")
	poolID, err := strconv.ParseInt(c.Query("pool_id"), 10, 64)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrParam)
		return
	}

	stats, err := h.skillSvc.GetSkillGachaStats(c.Request.Context(), userID.(int64), poolID)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}
	pkgresponse.Success(c, stats)
}

// SkillHealth 技能服务健康检查
func SkillHealth(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "skill-service"})
}
