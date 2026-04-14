package handler

import (
	"errors"
	"net/http"

	"user-service/internal/model"
	"user-service/internal/service"
	pkgresponse "user-service/pkg/response"

	"github.com/gin-gonic/gin"
)

// UserHandler 用户 HTTP 处理器
type UserHandler struct {
	userSvc *service.UserService
}

// NewUserHandler 创建 UserHandler
func NewUserHandler(userSvc *service.UserService) *UserHandler {
	return &UserHandler{userSvc: userSvc}
}

// Register 用户注册
// @Summary 用户注册
// @Description 注册新用户账号
// @Tags 用户
// @Accept json
// @Produce json
// @Param body body model.RegisterRequest true "注册信息"
// @Success 200 {object} pkgresponse.Response
// @Router /api/v1/user/register [post]
func (h *UserHandler) Register(c *gin.Context) {
	var req model.RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	user, err := h.userSvc.Register(c.Request.Context(), &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrUserAlreadyExists):
			pkgresponse.Error(c, pkgresponse.CodeErrUserExist)
		case errors.Is(err, service.ErrPhoneAlreadyExists):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "手机号已被注册")
		default:
			pkgresponse.Error(c, pkgresponse.CodeErrServer)
		}
		return
	}

	pkgresponse.Success(c, gin.H{
		"user_id":  user.ID,
		"username": user.Username,
	})
}

// Login 用户登录
// @Summary 用户登录
// @Description 用户名+密码登录，返回 JWT Token
// @Tags 用户
// @Accept json
// @Produce json
// @Param body body model.LoginRequest true "登录信息"
// @Success 200 {object} pkgresponse.Response{data=model.LoginResponse}
// @Router /api/v1/user/login [post]
func (h *UserHandler) Login(c *gin.Context) {
	var req model.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	resp, err := h.userSvc.Login(c.Request.Context(), &req)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrInvalidCredentials):
			pkgresponse.Error(c, pkgresponse.CodeErrPassword)
		case errors.Is(err, service.ErrAccountBanned):
			pkgresponse.Error(c, pkgresponse.CodeErrUserBanned)
		default:
			pkgresponse.Error(c, pkgresponse.CodeErrServer)
		}
		return
	}

	pkgresponse.Success(c, resp)
}

// GetProfile 获取用户信息
// @Summary 获取用户信息
// @Description 获取当前登录用户的详细信息
// @Tags 用户
// @Produce json
// @Security BearerAuth
// @Success 200 {object} pkgresponse.Response{data=model.UserProfile}
// @Router /api/v1/user/profile [get]
func (h *UserHandler) GetProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		pkgresponse.Error(c, pkgresponse.CodeErrAuth)
		return
	}

	profile, err := h.userSvc.GetProfile(c.Request.Context(), userID.(int64))
	if err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	pkgresponse.Success(c, profile)
}

// UpdateProfile 更新用户资料
// @Summary 更新用户资料
// @Description 更新当前用户的昵称、头像、手机号、邮箱
// @Tags 用户
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body model.UpdateProfileRequest true "更新信息"
// @Success 200 {object} pkgresponse.Response
// @Router /api/v1/user/profile [put]
func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		pkgresponse.Error(c, pkgresponse.CodeErrAuth)
		return
	}

	var req model.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	if err := h.userSvc.UpdateProfile(c.Request.Context(), userID.(int64), &req); err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	pkgresponse.Success(c, nil)
}

// UpdatePassword 修改密码
// @Summary 修改密码
// @Description 修改当前用户密码，需要验证旧密码
// @Tags 用户
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param body body model.UpdatePasswordRequest true "密码信息"
// @Success 200 {object} pkgresponse.Response
// @Router /api/v1/user/password [put]
func (h *UserHandler) UpdatePassword(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		pkgresponse.Error(c, pkgresponse.CodeErrAuth)
		return
	}

	var req model.UpdatePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, err.Error())
		return
	}

	if err := h.userSvc.UpdatePassword(c.Request.Context(), userID.(int64), &req); err != nil {
		switch {
		case errors.Is(err, service.ErrOldPasswordWrong):
			pkgresponse.ErrorWithMsg(c, pkgresponse.CodeErrParam, "旧密码不正确")
		default:
			pkgresponse.Error(c, pkgresponse.CodeErrServer)
		}
		return
	}

	pkgresponse.Success(c, nil)
}

// Logout 登出
// @Summary 用户登出
// @Description 注销当前Token，使其失效
// @Tags 用户
// @Produce json
// @Security BearerAuth
// @Success 200 {object} pkgresponse.Response
// @Router /api/v1/user/logout [post]
func (h *UserHandler) Logout(c *gin.Context) {
	token := c.GetHeader("Authorization")
	if len(token) > 7 {
		token = token[7:] // 去掉 "Bearer " 前缀
	}

	if err := h.userSvc.Logout(c.Request.Context(), token); err != nil {
		pkgresponse.Error(c, pkgresponse.CodeErrServer)
		return
	}

	pkgresponse.Success(c, nil)
}

// ──────────────────────────────────────
// Health 健康检查
// ──────────────────────────────────────
func Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"service": "user-service",
	})
}
