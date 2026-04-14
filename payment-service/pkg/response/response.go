package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

type PageData struct {
	Total int64       `json:"total"`
	Page  int         `json:"page"`
	Size  int         `json:"size"`
	List  interface{} `json:"list"`
}

const (
	CodeSuccess      = 0
	CodeErrParam     = 10001
	CodeErrAuth       = 10002
	CodeErrToken      = 10003
	CodeErrServer     = 10004
	CodeErrDB         = 10005
	CodeErrRedis      = 10006
	CodeErrPayFailed  = 10007
	CodeErrDuplicate  = 10008
)

var codeMsg = map[int]string{
	CodeSuccess:     "success", CodeErrParam: "参数错误",
	CodeErrAuth:     "认证失败", CodeErrToken: "Token无效或已过期",
	CodeErrServer:   "服务器内部错误", CodeErrDB: "数据库错误",
	CodeErrRedis:    "Redis错误", CodeErrPayFailed: "支付失败",
	CodeErrDuplicate: "重复操作",
}

func GetMessage(code int) string { if msg, ok := codeMsg[code]; ok { return msg }; return "未知错误" }
func Success(c *gin.Context, data interface{}) { c.JSON(http.StatusOK, Response{Code: CodeSuccess, Message: GetMessage(CodeSuccess), Data: data}) }
func SuccessWithMsg(c *gin.Context, msg string, data interface{}) { c.JSON(http.StatusOK, Response{Code: CodeSuccess, Message: msg, Data: data}) }
func Error(c *gin.Context, code int) { c.JSON(http.StatusOK, Response{Code: code, Message: GetMessage(code)}) }
func ErrorWithMsg(c *gin.Context, code int, msg string) { c.JSON(http.StatusOK, Response{Code: code, Message: msg}) }
func ErrorWithData(c *gin.Context, code int, msg string, data interface{}) { c.JSON(http.StatusOK, Response{Code: code, Message: msg, Data: data}) }
