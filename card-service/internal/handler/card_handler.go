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

type CardHandler struct {
        cardSvc *service.CardService
}

func NewCardHandler(cardSvc *service.CardService) *CardHandler {
        return &CardHandler{cardSvc: cardSvc}
}

// Gacha 抽卡
func (h *CardHandler) Gacha(c *gin.Context) {
        var req model.GachaRequest
        if err := c.ShouldBindJSON(&req); err != nil {
                pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
                return
        }

        userID, _ := c.Get("user_id")
        resp, err := h.cardSvc.Gacha(c.Request.Context(), userID.(int64), &req)
        if err != nil {
                switch {
                case errors.Is(err, service.ErrPoolNotFound):
                        pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "卡池不存在或已关闭")
                case errors.Is(err, service.ErrInsufficientDiamonds):
                        pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "钻石不足")
                default:
                        pkgresponse.Error(c, pkgresponse.CodeErrServer)
                }
                return
        }

        pkgresponse.Success(c, resp)
}

// ListPools 卡池列表
func (h *CardHandler) ListPools(c *gin.Context) {
        pools, err := h.cardSvc.ListPools(c.Request.Context())
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrServer)
                return
        }
        pkgresponse.Success(c, pools)
}

// ListUserCards 用户卡牌列表
func (h *CardHandler) ListUserCards(c *gin.Context) {
        userID, _ := c.Get("user_id")
        page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
        pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
        rarity, _ := strconv.Atoi(c.DefaultQuery("rarity", "0"))

        cards, total, err := h.cardSvc.GetUserCards(c.Request.Context(), userID.(int64), page, pageSize, rarity)
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrServer)
                return
        }

        pkgresponse.Success(c, pkgresponse.PageData{
                Total: total,
                Page:  page,
                Size:  pageSize,
                List:  cards,
        })
}

// ToggleLock 切换锁定
func (h *CardHandler) ToggleLock(c *gin.Context) {
        userID, _ := c.Get("user_id")
        userCardID, err := strconv.ParseInt(c.Param("id"), 10, 64)
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrParam)
                return
        }

        if err := h.cardSvc.ToggleLock(c.Request.Context(), userID.(int64), userCardID); err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrServer)
                return
        }

        pkgresponse.Success(c, nil)
}

// GachaHistory 抽卡历史
func (h *CardHandler) GachaHistory(c *gin.Context) {
        userID, _ := c.Get("user_id")
        limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

        records, err := h.cardSvc.GetGachaHistory(c.Request.Context(), userID.(int64), limit)
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrServer)
                return
        }
        pkgresponse.Success(c, records)
}

// GachaStats 保底计数
func (h *CardHandler) GachaStats(c *gin.Context) {
        userID, _ := c.Get("user_id")
        poolID, err := strconv.ParseInt(c.Query("pool_id"), 10, 64)
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrParam)
                return
        }

        stats, err := h.cardSvc.GetGachaStats(c.Request.Context(), userID.(int64), poolID)
        if err != nil {
                pkgresponse.Error(c, pkgresponse.CodeErrServer)
                return
        }
        pkgresponse.Success(c, stats)
}

// Health 健康检查
func Health(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "card-service"})
}
