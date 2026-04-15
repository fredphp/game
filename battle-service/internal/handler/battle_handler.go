package handler

import (
        "net/http"
        "strconv"

        "battle-service/internal/model"
        "battle-service/internal/service"
        pkgresponse "battle-service/pkg/response"

        "github.com/gin-gonic/gin"
)

type BattleHandler struct {
        battleSvc *service.BattleService
}

func NewBattleHandler(battleSvc *service.BattleService) *BattleHandler {
        return &BattleHandler{battleSvc: battleSvc}
}

// StartPVE PVE战斗
func (h *BattleHandler) StartPVE(c *gin.Context) {
        var req model.StartBattleRequest
        if err := c.ShouldBindJSON(&req); err != nil {
                pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
                return
        }
        req.Type = "pve"

        userID, _ := c.Get("user_id")
        resp, err := h.battleSvc.StartPVE(c.Request.Context(), userID.(int64), &req)
        if err != nil {
                pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrServer, err.Error())
                return
        }
        pkgresponse.Success(c, resp)
}

// Replay 战斗回放
func (h *BattleHandler) Replay(c *gin.Context) {
        battleID := c.Param("id")
        result, err := h.battleSvc.GetBattleReplay(c.Request.Context(), battleID)
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrServer)
                return
        }
        pkgresponse.Success(c, result)
}

// History 战斗历史
func (h *BattleHandler) History(c *gin.Context) {
        userID, _ := c.Get("user_id")
        limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
        records, err := h.battleSvc.GetBattleHistory(c.Request.Context(), userID.(int64), limit)
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrServer)
                return
        }
        pkgresponse.Success(c, records)
}

// Health 健康检查
func Health(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "battle-service"})
}
