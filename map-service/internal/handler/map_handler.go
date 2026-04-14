package handler

import (
        "errors"
        "net/http"
        "strconv"

        "map-service/internal/model"
        "map-service/internal/service"
        pkgresponse "map-service/pkg/response"

        "github.com/gin-gonic/gin"
)

type MapHandler struct {
        mapSvc *service.MapService
}

func NewMapHandler(mapSvc *service.MapService) *MapHandler {
        return &MapHandler{mapSvc: mapSvc}
}

// ================================================================
// 地图总览
// ================================================================

// MapOverview 地图总览
func (h *MapHandler) MapOverview(c *gin.Context) {
        resp, err := h.mapSvc.GetMapOverview(c.Request.Context())
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrServer)
                return
        }
        pkgresponse.Success(c, resp)
}

// ================================================================
// 区域 & 城池
// ================================================================

// ListRegions 区域列表
func (h *MapHandler) ListRegions(c *gin.Context) {
        regions, err := h.mapSvc.ListRegions(c.Request.Context())
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrServer)
                return
        }
        pkgresponse.Success(c, regions)
}

// GetCityDetail 城池详情
func (h *MapHandler) GetCityDetail(c *gin.Context) {
        cityID, err := strconv.ParseInt(c.Param("id"), 10, 64)
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrParam)
                return
        }

        city, err := h.mapSvc.GetCityDetail(c.Request.Context(), cityID)
        if err != nil {
                if errors.Is(err, service.ErrCityNotFound) {
                        pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "城池不存在")
                        return
                }
                pkgresponse.Error(c, pkgresponse.CodeErrServer)
                return
        }
        pkgresponse.Success(c, city)
}

// ListCitiesByRegion 按区域获取城池
func (h *MapHandler) ListCitiesByRegion(c *gin.Context) {
        regionID, err := strconv.Atoi(c.Param("regionId"))
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrParam)
                return
        }

        cities, err := h.mapSvc.ListCitiesByRegion(c.Request.Context(), regionID)
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrServer)
                return
        }
        pkgresponse.Success(c, cities)
}

// ================================================================
// 行军系统
// ================================================================

// InitiateMarch 发起行军
func (h *MapHandler) InitiateMarch(c *gin.Context) {
        var req model.MarchRequest
        if err := c.ShouldBindJSON(&req); err != nil {
                pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
                return
        }

        userID, _ := c.Get("user_id")
        var allianceID int64
        if aid, ok := c.Get("alliance_id"); ok {
                allianceID = aid.(int64)
        }

        march, err := h.mapSvc.InitiateMarch(c.Request.Context(), userID.(int64), allianceID, &req)
        if err != nil {
                switch {
                case errors.Is(err, service.ErrMarchLimitExceed):
                        pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
                case errors.Is(err, service.ErrCityNotFound):
                        pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "城池不存在")
                case errors.Is(err, service.ErrPathNotFound):
                        pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "无法到达目标城池")
                default:
                        pkgresponse.Error(c, pkgresponse.CodeErrServer)
                }
                return
        }

        pkgresponse.Success(c, march)
}

// ListMarches 行军列表
func (h *MapHandler) ListMarches(c *gin.Context) {
        userID, _ := c.Get("user_id")
        status, _ := strconv.Atoi(c.DefaultQuery("status", "0"))
        limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

        marches, err := h.mapSvc.ListUserMarches(c.Request.Context(), userID.(int64), int8(status), limit)
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrServer)
                return
        }
        pkgresponse.Success(c, marches)
}

// GetMarchProgress 行军进度
func (h *MapHandler) GetMarchProgress(c *gin.Context) {
        marchID := c.Param("marchId")
        if marchID == "" {
                pkgresponse.Error(c, pkgresponse.CodeErrParam)
                return
        }

        progress, err := h.mapSvc.GetMarchProgress(c.Request.Context(), marchID)
        if err != nil {
                if errors.Is(err, service.ErrMarchNotFound) {
                        pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "行军记录不存在")
                        return
                }
                pkgresponse.Error(c, pkgresponse.CodeErrServer)
                return
        }
        pkgresponse.Success(c, progress)
}

// RecallMarch 撤回行军
func (h *MapHandler) RecallMarch(c *gin.Context) {
        userID, _ := c.Get("user_id")
        marchID := c.Param("marchId")
        if marchID == "" {
                pkgresponse.Error(c, pkgresponse.CodeErrParam)
                return
        }

        if err := h.mapSvc.RecallMarch(c.Request.Context(), userID.(int64), marchID); err != nil {
                switch {
                case errors.Is(err, service.ErrCannotRecall):
                        pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
                case errors.Is(err, service.ErrMarchNotFound):
                        pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "行军记录不存在")
                        return
                default:
                        pkgresponse.Error(c, pkgresponse.CodeErrServer)
                }
                return
        }

        pkgresponse.SuccessWithMsg(c, "行军已撤回", nil)
}

// ================================================================
// 联盟领土
// ================================================================

// AllianceTerritory 联盟领土
func (h *MapHandler) AllianceTerritory(c *gin.Context) {
        allianceID, err := strconv.ParseInt(c.Param("allianceId"), 10, 64)
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrParam)
                return
        }

        territory, err := h.mapSvc.GetAllianceTerritory(c.Request.Context(), allianceID)
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrServer)
                return
        }
        pkgresponse.Success(c, territory)
}

// ================================================================
// 城池战斗日志
// ================================================================

// CityBattleLogs 城池战斗日志
func (h *MapHandler) CityBattleLogs(c *gin.Context) {
        cityID, err := strconv.ParseInt(c.Param("id"), 10, 64)
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrParam)
                return
        }

        limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
        logs, err := h.mapSvc.ListCityBattleLogs(c.Request.Context(), cityID, limit)
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrServer)
                return
        }
        pkgresponse.Success(c, logs)
}

// Health 健康检查
func Health(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "map-service"})
}

// ================================================================
// 引擎统计
// ================================================================

// EngineStats 引擎统计信息
func (h *MapHandler) EngineStats(c *gin.Context) {
        stats, err := h.mapSvc.GetEngineStats(c.Request.Context())
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrServer)
                return
        }
        pkgresponse.Success(c, stats)
}
