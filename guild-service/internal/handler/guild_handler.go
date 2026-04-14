package handler

import (
	"errors"
	"net/http"
	"strconv"

	"guild-service/internal/model"
	"guild-service/internal/service"
	pkgresponse "guild-service/pkg/response"

	"github.com/gin-gonic/gin"
)

type GuildHandler struct {
	guildSvc *service.GuildService
}

func NewGuildHandler(guildSvc *service.GuildService) *GuildHandler {
	return &GuildHandler{guildSvc: guildSvc}
}

// CreateGuild 创建联盟
func (h *GuildHandler) CreateGuild(c *gin.Context) {
	var req model.CreateGuildRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	userID, _ := c.Get("user_id")
	guild, err := h.guildSvc.CreateGuild(c.Request.Context(), userID.(int64), &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrNameExists):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "联盟名称已存在")
		case errors.Is(err, service.ErrTagExists):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "联盟标签已存在")
		default:
			pkgresponse.Error(c, pkgresponse.CodeErrServer)
		}
		return
	}
	pkgresponse.Success(c, guild)
}

// ListGuilds 联盟列表
func (h *GuildHandler) ListGuilds(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	size, _ := strconv.Atoi(c.DefaultQuery("size", "20"))
	keyword := c.Query("keyword")
	guilds, total, err := h.guildSvc.ListGuilds(c.Request.Context(), page, size, keyword)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}
	pkgresponse.Success(c, pkgresponse.PageData{Total: total, Page: page, Size: size, List: guilds})
}

// GetGuild 联盟详情
func (h *GuildHandler) GetGuild(c *gin.Context) {
	guildID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrParam)
		return
	}
	detail, err := h.guildSvc.GetGuild(c.Request.Context(), guildID)
	if err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "联盟不存在")
		return
	}
	pkgresponse.Success(c, detail)
}

// GetMyGuild 我的联盟
func (h *GuildHandler) GetMyGuild(c *gin.Context) {
	userID, _ := c.Get("user_id")
	detail, err := h.guildSvc.GetMyGuild(c.Request.Context(), userID.(int64))
	if err != nil {
		if errors.Is(err, service.ErrNotInGuild) {
			pkgresponse.Success(c, nil)
			return
		}
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}
	pkgresponse.Success(c, detail)
}

// JoinGuild 加入联盟
func (h *GuildHandler) JoinGuild(c *gin.Context) {
	var req model.JoinGuildRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	userID, _ := c.Get("user_id")
	if err := h.guildSvc.JoinGuild(c.Request.Context(), userID.(int64), &req); err != nil {
		switch {
		case errors.Is(err, service.ErrAlreadyInGuild):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "你已在联盟中")
		case errors.Is(err, service.ErrGuildNotFound):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "联盟不存在")
		case errors.Is(err, service.ErrMemberFull):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "联盟人数已满")
		default:
			pkgresponse.Error(c, pkgresponse.CodeErrServer)
		}
		return
	}
	pkgresponse.SuccessWithMsg(c, "申请已发送", nil)
}

// LeaveGuild 退出联盟
func (h *GuildHandler) LeaveGuild(c *gin.Context) {
	userID, _ := c.Get("user_id")
	if err := h.guildSvc.LeaveGuild(c.Request.Context(), userID.(int64)); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	pkgresponse.SuccessWithMsg(c, "已退出联盟", nil)
}

// KickMember 踢出成员
func (h *GuildHandler) KickMember(c *gin.Context) {
	userID, _ := c.Get("user_id")
	guildID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrParam)
		return
	}
	targetID, err := strconv.ParseInt(c.Param("userId"), 10, 64)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrParam)
		return
	}
	if err := h.guildSvc.KickMember(c.Request.Context(), guildID, userID.(int64), targetID); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	pkgresponse.SuccessWithMsg(c, "已踢出成员", nil)
}

// PromoteMember 晋升/降职成员
func (h *GuildHandler) PromoteMember(c *gin.Context) {
	userID, _ := c.Get("user_id")
	guildID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	targetID, _ := strconv.ParseInt(c.Param("userId"), 10, 64)
	role, _ := strconv.Atoi(c.Param("role"))
	if err := h.guildSvc.PromoteMember(c.Request.Context(), guildID, userID.(int64), targetID, int8(role)); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	pkgresponse.SuccessWithMsg(c, "角色已更新", nil)
}

// ListApplications 待审批申请
func (h *GuildHandler) ListApplications(c *gin.Context) {
	guildID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	apps, err := h.guildSvc.ListPendingApplications(c.Request.Context(), guildID)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}
	pkgresponse.Success(c, apps)
}

// ApproveApplication 审批申请
func (h *GuildHandler) ApproveApplication(c *gin.Context) {
	userID, _ := c.Get("user_id")
	appID, _ := strconv.ParseInt(c.Param("appId"), 10, 64)
	approve := c.Query("approve") == "true"
	note := c.Query("note")
	if err := h.guildSvc.ApproveApplication(c.Request.Context(), appID, userID.(int64), approve, note); err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}
	msg := "已拒绝"
	if approve { msg = "已通过" }
	pkgresponse.SuccessWithMsg(c, msg, nil)
}

// DeclareWar 宣战
func (h *GuildHandler) DeclareWar(c *gin.Context) {
	var req model.DeclareWarRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	userID, _ := c.Get("user_id")
	member, _ := c.Get("guild_id")
	guildID := int64(0)
	if m, ok := member.(int64); ok { guildID = m }
	if guildID == 0 {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "你不在联盟中")
		return
	}
	war, err := h.guildSvc.DeclareWar(c.Request.Context(), guildID, userID.(int64), &req)
	if err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	pkgresponse.Success(c, war)
}

// ListWars 战争列表
func (h *GuildHandler) ListWars(c *gin.Context) {
	guildID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	status, _ := strconv.Atoi(c.DefaultQuery("status", "-1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	wars, err := h.guildSvc.ListWars(c.Request.Context(), guildID, int8(status), limit)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}
	pkgresponse.Success(c, wars)
}

// GetWar 战争详情
func (h *GuildHandler) GetWar(c *gin.Context) {
	warID := c.Param("warId")
	war, err := h.guildSvc.GetWar(c.Request.Context(), warID)
	if err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "战争不存在")
		return
	}
	pkgresponse.Success(c, war)
}

// SurrenderWar 投降
func (h *GuildHandler) SurrenderWar(c *gin.Context) {
	userID, _ := c.Get("user_id")
	guildID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	warID := c.Param("warId")
	if err := h.guildSvc.SurrenderWar(c.Request.Context(), warID, guildID, userID.(int64)); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	pkgresponse.SuccessWithMsg(c, "已投降", nil)
}

// InitiateCoopBattle 发起协作战斗
func (h *GuildHandler) InitiateCoopBattle(c *gin.Context) {
	var req model.CoopBattleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	userID, _ := c.Get("user_id")
	guildID := int64(0)
	if m, ok := c.Get("guild_id"); ok { guildID = m.(int64) }
	if guildID == 0 {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "你不在联盟中")
		return
	}
	battle, err := h.guildSvc.InitiateCoopBattle(c.Request.Context(), &req, guildID, userID.(int64))
	if err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	pkgresponse.Success(c, battle)
}

// JoinCoopBattle 加入协作
func (h *GuildHandler) JoinCoopBattle(c *gin.Context) {
	var req model.JoinCoopRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	userID, _ := c.Get("user_id")
	battle, err := h.guildSvc.JoinCoopBattle(c.Request.Context(), &req, userID.(int64))
	if err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	pkgresponse.Success(c, battle)
}

// ForceStartBattle 强制开战
func (h *GuildHandler) ForceStartBattle(c *gin.Context) {
	battleID := c.Param("battleId")
	if err := h.guildSvc.ForceStartBattle(c.Request.Context(), battleID, 0); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}
	pkgresponse.SuccessWithMsg(c, "战斗已开始", nil)
}

// ListMembers 成员列表
func (h *GuildHandler) ListMembers(c *gin.Context) {
	guildID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	members, err := h.guildSvc.ListMembers(c.Request.Context(), guildID)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}
	pkgresponse.Success(c, members)
}

// ListLogs 联盟日志
func (h *GuildHandler) ListLogs(c *gin.Context) {
	guildID, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "30"))
	logs, err := h.guildSvc.ListLogs(c.Request.Context(), guildID, limit)
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}
	pkgresponse.Success(c, logs)
}

// Health 健康检查
func Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"status": "ok", "service": "guild-service"})
}
