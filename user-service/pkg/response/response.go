package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Response 统一响应结构
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// PageData 分页数据
type PageData struct {
	Total int64       `json:"total"`
	Page  int         `json:"page"`
	Size  int         `json:"size"`
	List  interface{} `json:"list"`
}

const (
	CodeSuccess      = 0
	CodeErrParam     = 10001
	CodeErrAuth      = 10002
	CodeErrToken     = 10003
	CodeErrServer    = 10004
	CodeErrDB        = 10005
	CodeErrRedis     = 10006
	CodeErrUserExist = 10007
	CodeErrPassword  = 10008
	CodeErrUserNotFound = 10009
	CodeErrUserBanned   = 10010
)

var codeMsg = map[int]string{
	CodeSuccess:         "success",
	CodeErrParam:        "参数错误",
	CodeErrAuth:         "认证失败",
	CodeErrToken:        "Token无效或已过期",
	CodeErrServer:       "服务器内部错误",
	CodeErrDB:           "数据库错误",
	CodeErrRedis:        "Redis错误",
	CodeErrUserExist:    "用户名已存在",
	CodeErrPassword:     "密码错误",
	CodeErrUserNotFound: "用户不存在",
	CodeErrUserBanned:   "账号已被禁用",
}

func GetMessage(code int) string {
	if msg, ok := codeMsg[code]; ok {
		return msg
	}
	return "未知错误"
}

// Success 成功响应
func Success(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    CodeSuccess,
		Message: GetMessage(CodeSuccess),
		Data:    data,
	})
}

// SuccessWithMsg 自定义消息成功响应
func SuccessWithMsg(c *gin.Context, msg string, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    CodeSuccess,
		Message: msg,
		Data:    data,
	})
}

// Error 错误响应
func Error(c *gin.Context, code int) {
	c.JSON(http.StatusOK, Response{
		Code:    code,
		Message: GetMessage(code),
	})
}

// ErrorWithMsg 自定义消息错误响应
func ErrorWithMsg(c *gin.Context, code int, msg string) {
	c.JSON(http.StatusOK, Response{
		Code:    code,
		Message: msg,
	})
}

// ErrorWithData 带数据的错误响应
func ErrorWithData(c *gin.Context, code int, msg string, data interface{}) {
	c.JSON(http.StatusOK, Response{
		Code:    code,
		Message: msg,
		Data:    data,
	})
}
