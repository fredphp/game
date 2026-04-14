// Package response 提供九州争鼎后台管理API的统一响应格式。
// 所有API端点应使用本包的辅助函数返回一致的JSON结构。
package response

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// R 统一API响应结构
type R struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data,omitempty"`
}

// PageData 分页数据结构
type PageData struct {
	List     interface{} `json:"list"`
	Total    int64       `json:"total"`
	Page     int         `json:"page"`
	PageSize int         `json:"pageSize"`
}

// OK 返回成功响应 (code=0)
func OK(c *gin.Context, data interface{}) {
	c.JSON(http.StatusOK, R{
		Code:    0,
		Message: "ok",
		Data:    data,
	})
}

// OKWithMsg 返回带自定义消息的成功响应
func OKWithMsg(c *gin.Context, msg string, data interface{}) {
	c.JSON(http.StatusOK, R{
		Code:    0,
		Message: msg,
		Data:    data,
	})
}

// OKPage 返回分页数据响应
func OKPage(c *gin.Context, list interface{}, total int64, page, pageSize int) {
	c.JSON(http.StatusOK, R{
		Code:    0,
		Message: "ok",
		Data: PageData{
			List:     list,
			Total:    total,
			Page:     page,
			PageSize: pageSize,
		},
	})
}

// Fail 返回失败响应 (code=1)
func Fail(c *gin.Context, msg string) {
	c.JSON(http.StatusOK, R{
		Code:    1,
		Message: msg,
	})
}

// FailWithCode 返回带HTTP状态码的失败响应
func FailWithCode(c *gin.Context, httpCode int, msg string) {
	c.JSON(httpCode, R{
		Code:    1,
		Message: msg,
	})
}

// FailWithData 返回带数据的失败响应
func FailWithData(c *gin.Context, msg string, data interface{}) {
	c.JSON(http.StatusOK, R{
		Code:    1,
		Message: msg,
		Data:    data,
	})
}

// ServerError 返回服务器错误响应
func ServerError(c *gin.Context, msg string) {
	c.JSON(http.StatusInternalServerError, R{
		Code:    500,
		Message: msg,
	})
}
