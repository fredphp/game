// Package handler 提供九州争鼎后台管理服务的所有HTTP处理器。
// 每个Handler函数负责：参数解析 → 业务调用 → 统一JSON响应。
// 对接下游微服务(user/card/map/guild/payment)通过service层网关转发。
package handler

import (
        "encoding/json"
        "fmt"
        "log"
        "strconv"
        "strings"
        "time"

        "admin-service/internal/dao"
        "admin-service/internal/model"
        "admin-service/internal/service"
        jwtpkg "admin-service/pkg/jwt"
        "admin-service/pkg/response"

        "github.com/gin-gonic/gin"
        "golang.org/x/crypto/bcrypt"
)

// ==================== 认证: 登录 ====================

// Login 管理员登录
// POST /api/v1/admin/login
func Login(c *gin.Context) {
        var req model.LoginRequest
        if err := c.ShouldBindJSON(&req); err != nil {
                response.Fail(c, "参数错误: "+err.Error())
                return
        }

        // 查询用户
        user, err := dao.GetAdminUserByUsername(req.Username)
        if err != nil {
                response.Fail(c, "用户名或密码错误")
                return
        }

        // 检查状态
        if user.Status != 1 {
                response.Fail(c, "账号已被禁用")
                return
        }

        // 验证密码 (bcrypt)
        if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
                response.Fail(c, "用户名或密码错误")
                return
        }

        // 生成JWT
        secret := "jiuzhou-admin-jwt-secret-2025" // 从配置获取
        token, expireAt, err := jwtpkg.GenerateToken(user.ID, user.Username, secret, 24)
        if err != nil {
                response.ServerError(c, "生成令牌失败")
                return
        }

        // 更新登录信息
        clientIP := c.ClientIP()
        _ = dao.UpdateAdminUserLastLogin(user.ID, clientIP)

        // 记录GM操作日志
        _ = dao.CreateGmLog(&model.GmOperationLog{
                OperatorID:   user.ID,
                OperatorName: user.Username,
                TargetID:     user.ID,
                TargetType:   "admin",
                Action:       "login",
                IP:           clientIP,
                CreatedAt:    time.Now(),
        })

        // 返回登录信息(不包含密码)
        user.PasswordHash = ""
        response.OK(c, model.LoginResponse{
                Token:    token,
                ExpireAt: expireAt,
                User:     *user,
        })
}

// ==================== 仪表盘 ====================

// GetDashboardStats 获取仪表盘统计
// GET /api/v1/admin/dashboard/stats
func GetDashboardStats(c *gin.Context) {
        stats := model.DashboardStats{
                TotalUsers:      0,
                TodayActive:     0,
                TodayRevenue:    0,
                TotalRevenue:    0,
                TodayRegistered: 0,
                OnlineNow:       0,
                TotalOrders:     0,
                PendingRefunds:  0,
        }

        // 获取在线人数
        if service.Users != nil {
                if body, err := service.Users.GetOnlineCount(); err == nil {
                        var data struct {
                                Online int64 `json:"online"`
                        }
                        if json.Unmarshal(body, &data) == nil {
                                stats.OnlineNow = data.Online
                        }
                }
        }

        // 获取订单统计(当月)
        tableName := dao.GetOrderTableName(time.Now())
        if orderStats, err := dao.GetOrderStats(tableName); err == nil {
                if v, ok := orderStats["totalOrders"]; ok {
                        stats.TotalOrders = v.(int64)
                }
                if v, ok := orderStats["totalRevenue"]; ok {
                        stats.TotalRevenue = v.(int64)
                }
        }

        response.OK(c, stats)
}

// ==================== 用户管理 ====================

// GetUsers 获取用户列表
// GET /api/v1/admin/users?page=1&pageSize=20&status=
func GetUsers(c *gin.Context) {
        page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
        pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
        status := c.Query("status")

        if page < 1 {
                page = 1
        }
        if pageSize < 1 || pageSize > 100 {
                pageSize = 20
        }

        if service.Users != nil {
                body, err := service.Users.GetUsers(page, pageSize, status)
                if err != nil {
                        log.Printf("get users from gateway: %v", err)
                        // 网关不可用时返回空列表
                        response.OKPage(c, []interface{}{}, 0, page, pageSize)
                        return
                }
                // 直接转发网关响应
                var raw map[string]interface{}
                if json.Unmarshal(body, &raw) == nil {
                        c.JSON(200, raw)
                        return
                }
        }

        response.OKPage(c, []interface{}{}, 0, page, pageSize)
}

// GetUserDetail 获取用户详情
// GET /api/v1/admin/users/:id
func GetUserDetail(c *gin.Context) {
        userID := c.Param("id")

        if service.Users != nil {
                body, err := service.Users.GetUserDetail(userID)
                if err != nil {
                        log.Printf("get user detail: %v", err)
                        response.Fail(c, "获取用户详情失败")
                        return
                }
                var raw map[string]interface{}
                if json.Unmarshal(body, &raw) == nil {
                        c.JSON(200, raw)
                        return
                }
        }

        response.Fail(c, "获取用户详情失败")
}

// BanUser 封禁用户
// PUT /api/v1/admin/users/:id/ban
func BanUser(c *gin.Context) {
        userID := c.Param("id")
        var req model.BanRequest
        if err := c.ShouldBindJSON(&req); err != nil {
                response.Fail(c, "参数错误")
                return
        }

        if service.Users != nil {
                _, err := service.Users.BanUser(userID, req.Reason, req.Duration)
                if err != nil {
                        log.Printf("ban user: %v", err)
                        response.Fail(c, "封禁失败")
                        return
                }
        }

        // 记录GM操作日志
        operatorID, _ := c.Get("userId")
        operatorName, _ := c.Get("username")
        uid, _ := strconv.ParseInt(userID, 10, 64)
        _ = dao.CreateGmLog(&model.GmOperationLog{
                OperatorID:   operatorID.(int64),
                OperatorName: operatorName.(string),
                TargetID:     uid,
                TargetType:   "user",
                Action:       "ban",
                Detail:       fmt.Sprintf("reason=%s duration=%dh", req.Reason, req.Duration),
                IP:           c.ClientIP(),
                CreatedAt:    time.Now(),
        })

        response.OKWithMsg(c, "封禁成功", nil)
}

// UnbanUser 解封用户
// PUT /api/v1/admin/users/:id/unban
func UnbanUser(c *gin.Context) {
        userID := c.Param("id")

        if service.Users != nil {
                _, err := service.Users.UnbanUser(userID)
                if err != nil {
                        log.Printf("unban user: %v", err)
                        response.Fail(c, "解封失败")
                        return
                }
        }

        operatorID, _ := c.Get("userId")
        operatorName, _ := c.Get("username")
        uid, _ := strconv.ParseInt(userID, 10, 64)
        _ = dao.CreateGmLog(&model.GmOperationLog{
                OperatorID:   operatorID.(int64),
                OperatorName: operatorName.(string),
                TargetID:     uid,
                TargetType:   "user",
                Action:       "unban",
                IP:           c.ClientIP(),
                CreatedAt:    time.Now(),
        })

        response.OKWithMsg(c, "解封成功", nil)
}

// ModifyUserResources 修改用户资源
// PUT /api/v1/admin/users/:id/resources
func ModifyUserResources(c *gin.Context) {
        userID := c.Param("id")
        var req model.ResourceModifyRequest
        if err := c.ShouldBindJSON(&req); err != nil {
                response.Fail(c, "参数错误")
                return
        }

        if service.Users != nil {
                _, err := service.Users.ModifyResources(userID, req.Resource, req.Amount, req.Reason)
                if err != nil {
                        log.Printf("modify resources: %v", err)
                        response.Fail(c, "资源修改失败")
                        return
                }
        }

        operatorID, _ := c.Get("userId")
        operatorName, _ := c.Get("username")
        uid, _ := strconv.ParseInt(userID, 10, 64)
        _ = dao.CreateGmLog(&model.GmOperationLog{
                OperatorID:   operatorID.(int64),
                OperatorName: operatorName.(string),
                TargetID:     uid,
                TargetType:   "user",
                Action:       "modify_resources",
                Detail:       fmt.Sprintf("resource=%s amount=%d reason=%s", req.Resource, req.Amount, req.Reason),
                IP:           c.ClientIP(),
                CreatedAt:    time.Now(),
        })

        response.OKWithMsg(c, "资源修改成功", nil)
}

// ==================== 卡池管理 ====================

// GetCardPools 获取卡池列表
// GET /api/v1/admin/card-pools
func GetCardPools(c *gin.Context) {
        if service.Cards != nil {
                body, err := service.Cards.GetCardPools()
                if err != nil {
                        log.Printf("get card pools: %v", err)
                        response.Fail(c, "获取卡池列表失败")
                        return
                }
                var raw map[string]interface{}
                if json.Unmarshal(body, &raw) == nil {
                        c.JSON(200, raw)
                        return
                }
        }
        response.OK(c, []interface{}{})
}

// CreateCardPool 创建卡池
// POST /api/v1/admin/card-pools
func CreateCardPool(c *gin.Context) {
        var poolData map[string]interface{}
        if err := c.ShouldBindJSON(&poolData); err != nil {
                response.Fail(c, "参数错误")
                return
        }

        if service.Cards != nil {
                _, err := service.Cards.CreateCardPool(poolData)
                if err != nil {
                        log.Printf("create card pool: %v", err)
                        response.Fail(c, "创建卡池失败")
                        return
                }
        }

        response.OKWithMsg(c, "创建成功", nil)
}

// UpdateCardPool 更新卡池
// PUT /api/v1/admin/card-pools/:id
func UpdateCardPool(c *gin.Context) {
        poolID := c.Param("id")
        var poolData map[string]interface{}
        if err := c.ShouldBindJSON(&poolData); err != nil {
                response.Fail(c, "参数错误")
                return
        }

        if service.Cards != nil {
                _, err := service.Cards.UpdateCardPool(poolID, poolData)
                if err != nil {
                        log.Printf("update card pool: %v", err)
                        response.Fail(c, "更新卡池失败")
                        return
                }
        }

        response.OKWithMsg(c, "更新成功", nil)
}

// ToggleCardPoolStatus 切换卡池状态
// PUT /api/v1/admin/card-pools/:id/status
func ToggleCardPoolStatus(c *gin.Context) {
        poolID := c.Param("id")

        if service.Cards != nil {
                _, err := service.Cards.ToggleCardPoolStatus(poolID)
                if err != nil {
                        log.Printf("toggle card pool: %v", err)
                        response.Fail(c, "操作失败")
                        return
                }
        }

        response.OKWithMsg(c, "状态切换成功", nil)
}

// ==================== 英雄管理 ====================

// GetHeroes 获取英雄列表
// GET /api/v1/admin/heroes
func GetHeroes(c *gin.Context) {
        if service.Cards != nil {
                body, err := service.Cards.GetHeroes()
                if err != nil {
                        log.Printf("get heroes: %v", err)
                        response.Fail(c, "获取英雄列表失败")
                        return
                }
                var raw map[string]interface{}
                if json.Unmarshal(body, &raw) == nil {
                        c.JSON(200, raw)
                        return
                }
        }
        response.OK(c, []interface{}{})
}

// CreateHero 创建英雄
// POST /api/v1/admin/heroes
func CreateHero(c *gin.Context) {
        var heroData map[string]interface{}
        if err := c.ShouldBindJSON(&heroData); err != nil {
                response.Fail(c, "参数错误")
                return
        }

        if service.Cards != nil {
                _, err := service.Cards.CreateHero(heroData)
                if err != nil {
                        log.Printf("create hero: %v", err)
                        response.Fail(c, "创建英雄失败")
                        return
                }
        }

        response.OKWithMsg(c, "创建成功", nil)
}

// UpdateHero 更新英雄
// PUT /api/v1/admin/heroes/:id
func UpdateHero(c *gin.Context) {
        heroID := c.Param("id")
        var heroData map[string]interface{}
        if err := c.ShouldBindJSON(&heroData); err != nil {
                response.Fail(c, "参数错误")
                return
        }

        if service.Cards != nil {
                _, err := service.Cards.UpdateHero(heroID, heroData)
                if err != nil {
                        log.Printf("update hero: %v", err)
                        response.Fail(c, "更新英雄失败")
                        return
                }
        }

        response.OKWithMsg(c, "更新成功", nil)
}

// ==================== 地图管理 ====================

// GetCities 获取城池列表
// GET /api/v1/admin/map/cities
func GetCities(c *gin.Context) {
        if service.Maps != nil {
                body, err := service.Maps.GetCities()
                if err != nil {
                        log.Printf("get cities: %v", err)
                        response.Fail(c, "获取城池列表失败")
                        return
                }
                var raw map[string]interface{}
                if json.Unmarshal(body, &raw) == nil {
                        c.JSON(200, raw)
                        return
                }
        }
        response.OK(c, []interface{}{})
}

// UpdateCity 更新城池
// PUT /api/v1/admin/map/cities/:id
func UpdateCity(c *gin.Context) {
        cityID := c.Param("id")
        var cityData map[string]interface{}
        if err := c.ShouldBindJSON(&cityData); err != nil {
                response.Fail(c, "参数错误")
                return
        }

        if service.Maps != nil {
                _, err := service.Maps.UpdateCity(cityID, cityData)
                if err != nil {
                        log.Printf("update city: %v", err)
                        response.Fail(c, "更新城池失败")
                        return
                }
        }

        response.OKWithMsg(c, "更新成功", nil)
}

// GetMarches 获取行军列表
// GET /api/v1/admin/map/marches
func GetMarches(c *gin.Context) {
        if service.Maps != nil {
                body, err := service.Maps.GetMarches()
                if err != nil {
                        log.Printf("get marches: %v", err)
                        response.Fail(c, "获取行军列表失败")
                        return
                }
                var raw map[string]interface{}
                if json.Unmarshal(body, &raw) == nil {
                        c.JSON(200, raw)
                        return
                }
        }
        response.OK(c, []interface{}{})
}

// CancelMarch 取消行军
// DELETE /api/v1/admin/map/marches/:id
func CancelMarch(c *gin.Context) {
        marchID := c.Param("id")

        if service.Maps != nil {
                _, err := service.Maps.CancelMarch(marchID)
                if err != nil {
                        log.Printf("cancel march: %v", err)
                        response.Fail(c, "取消行军失败")
                        return
                }
        }

        response.OKWithMsg(c, "取消成功", nil)
}

// ResetMap 重置地图
// POST /api/v1/admin/map/reset
func ResetMap(c *gin.Context) {
        if service.Maps != nil {
                _, err := service.Maps.ResetMap()
                if err != nil {
                        log.Printf("reset map: %v", err)
                        response.Fail(c, "重置地图失败")
                        return
                }
        }

        operatorID, _ := c.Get("userId")
        operatorName, _ := c.Get("username")
        _ = dao.CreateGmLog(&model.GmOperationLog{
                OperatorID:   operatorID.(int64),
                OperatorName: operatorName.(string),
                TargetID:     0,
                TargetType:   "map",
                Action:       "reset_map",
                Detail:       "重置世界地图",
                IP:           c.ClientIP(),
                CreatedAt:    time.Now(),
        })

        response.OKWithMsg(c, "地图已重置", nil)
}

// ==================== 公会管理 ====================

// GetGuilds 获取公会列表
// GET /api/v1/admin/guilds
func GetGuilds(c *gin.Context) {
        if service.Guilds != nil {
                body, err := service.Guilds.GetGuilds()
                if err != nil {
                        log.Printf("get guilds: %v", err)
                        response.Fail(c, "获取公会列表失败")
                        return
                }
                var raw map[string]interface{}
                if json.Unmarshal(body, &raw) == nil {
                        c.JSON(200, raw)
                        return
                }
        }
        response.OK(c, []interface{}{})
}

// GetGuildMembers 获取公会成员
// GET /api/v1/admin/guilds/:id/members
func GetGuildMembers(c *gin.Context) {
        guildID := c.Param("id")

        if service.Guilds != nil {
                body, err := service.Guilds.GetGuildMembers(guildID)
                if err != nil {
                        log.Printf("get guild members: %v", err)
                        response.Fail(c, "获取公会成员失败")
                        return
                }
                var raw map[string]interface{}
                if json.Unmarshal(body, &raw) == nil {
                        c.JSON(200, raw)
                        return
                }
        }
        response.OK(c, []interface{}{})
}

// UpdateGuild 更新公会
// PUT /api/v1/admin/guilds/:id
func UpdateGuild(c *gin.Context) {
        guildID := c.Param("id")
        var guildData map[string]interface{}
        if err := c.ShouldBindJSON(&guildData); err != nil {
                response.Fail(c, "参数错误")
                return
        }

        if service.Guilds != nil {
                _, err := service.Guilds.UpdateGuild(guildID, guildData)
                if err != nil {
                        log.Printf("update guild: %v", err)
                        response.Fail(c, "更新公会失败")
                        return
                }
        }

        response.OKWithMsg(c, "更新成功", nil)
}

// DisbandGuild 解散公会
// DELETE /api/v1/admin/guilds/:id
func DisbandGuild(c *gin.Context) {
        guildID := c.Param("id")

        if service.Guilds != nil {
                _, err := service.Guilds.DisbandGuild(guildID)
                if err != nil {
                        log.Printf("disband guild: %v", err)
                        response.Fail(c, "解散公会失败")
                        return
                }
        }

        gid, _ := strconv.ParseInt(guildID, 10, 64)
        operatorID, _ := c.Get("userId")
        operatorName, _ := c.Get("username")
        _ = dao.CreateGmLog(&model.GmOperationLog{
                OperatorID:   operatorID.(int64),
                OperatorName: operatorName.(string),
                TargetID:     gid,
                TargetType:   "guild",
                Action:       "disband",
                IP:           c.ClientIP(),
                CreatedAt:    time.Now(),
        })

        response.OKWithMsg(c, "公会已解散", nil)
}

// ==================== 充值/订单管理 ====================

// GetOrders 获取订单列表
// GET /api/v1/admin/orders?page=1&pageSize=20&month=2025-07&status=&userId=
func GetOrders(c *gin.Context) {
        page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
        pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
        month := c.DefaultQuery("month", time.Now().Format("2006-01"))
        statusStr := c.Query("status")
        userIDStr := c.Query("userId")

        if page < 1 {
                page = 1
        }
        if pageSize < 1 || pageSize > 100 {
                pageSize = 20
        }

        // 解析月份得到分表名
        tableName := "orders_" + strings.ReplaceAll(month, "-", "_")

        // 构建过滤条件
        filters := make(map[string]interface{})
        if statusStr != "" {
                if s, err := strconv.ParseInt(statusStr, 10, 8); err == nil {
                        filters["status"] = s
                }
        }
        if userIDStr != "" {
                if uid, err := strconv.ParseInt(userIDStr, 10, 64); err == nil {
                        filters["user_id"] = uid
                }
        }

        orders, total, err := dao.GetOrdersFromShard(tableName, page, pageSize, filters)
        if err != nil {
                log.Printf("get orders from shard %s: %v", tableName, err)
                response.Fail(c, "查询订单失败，请检查分表是否存在")
                return
        }

        response.OKPage(c, orders, total, page, pageSize)
}

// RefundOrder 退款
// POST /api/v1/admin/orders/:id/refund
func RefundOrder(c *gin.Context) {
        orderNo := c.Param("id")
        var req struct {
                Reason string `json:"reason"`
        }
        _ = c.ShouldBindJSON(&req)

        // 尝试在多个分表中找到并更新订单
        tables, _ := dao.ListOrderShardTables()
        found := false
        for _, t := range tables {
                if err := dao.UpdateOrderStatus(t, orderNo, 3, "已退款"); err == nil {
                        found = true
                        break
                }
        }
        if !found {
                response.Fail(c, "退款失败，未找到订单")
                return
        }

        // 通知支付服务
        if service.Payments != nil {
                _, _ = service.Payments.RefundOrder(orderNo, req.Reason)
        }

        operatorID, _ := c.Get("userId")
        operatorName, _ := c.Get("username")
        _ = dao.CreateGmLog(&model.GmOperationLog{
                OperatorID:   operatorID.(int64),
                OperatorName: operatorName.(string),
                TargetID:     0,
                TargetType:   "order",
                Action:       "refund",
                Detail:       fmt.Sprintf("orderNo=%s reason=%s", orderNo, req.Reason),
                IP:           c.ClientIP(),
                CreatedAt:    time.Now(),
        })

        response.OKWithMsg(c, "退款成功", nil)
}

// ManualDeliver 手动发货
// POST /api/v1/admin/orders/:id/deliver
func ManualDeliver(c *gin.Context) {
        orderNo := c.Param("id")

        tables, _ := dao.ListOrderShardTables()
        found := false
        for _, t := range tables {
                if err := dao.UpdateOrderStatus(t, orderNo, 2, "已发货"); err == nil {
                        found = true
                        break
                }
        }
        if !found {
                response.Fail(c, "发货失败，未找到订单")
                return
        }

        if service.Payments != nil {
                _, _ = service.Payments.ManualDeliver(orderNo)
        }

        operatorID, _ := c.Get("userId")
        operatorName, _ := c.Get("username")
        _ = dao.CreateGmLog(&model.GmOperationLog{
                OperatorID:   operatorID.(int64),
                OperatorName: operatorName.(string),
                TargetID:     0,
                TargetType:   "order",
                Action:       "manual_deliver",
                Detail:       fmt.Sprintf("orderNo=%s", orderNo),
                IP:           c.ClientIP(),
                CreatedAt:    time.Now(),
        })

        response.OKWithMsg(c, "发货成功", nil)
}

// GetOrderStats 获取订单统计
// GET /api/v1/admin/orders/stats?month=2025-07
func GetOrderStats(c *gin.Context) {
        month := c.DefaultQuery("month", time.Now().Format("2006-01"))
        tableName := "orders_" + strings.ReplaceAll(month, "-", "_")

        stats, err := dao.GetOrderStats(tableName)
        if err != nil {
                log.Printf("get order stats %s: %v", tableName, err)
                response.Fail(c, "获取统计失败")
                return
        }

        response.OK(c, stats)
}

// ==================== 数据分析 ====================

// GetDailyStats 获取每日统计
// GET /api/v1/admin/analytics/daily?start=2025-07-01&end=2025-07-31
func GetDailyStats(c *gin.Context) {
        startDate := c.DefaultQuery("start", time.Now().AddDate(0, 0, -7).Format("2006-01-02"))
        _ = c.DefaultQuery("end", time.Now().Format("2006-01-02"))

        // TODO: 从game_db或log_db聚合每日统计数据
        // 当前返回示例数据结构
        stats := []model.DailyStats{
                {Date: startDate, NewUsers: 150, ActiveUsers: 1200, Revenue: 45000, Orders: 320, GachaDraws: 5000, NewGuilds: 5},
        }

        response.OK(c, stats)
}

// GetGachaStats 获取抽卡统计
// GET /api/v1/admin/analytics/gacha?start=2025-07-01&end=2025-07-31
func GetGachaStats(c *gin.Context) {
        startDate := c.DefaultQuery("start", time.Now().AddDate(0, 0, -7).Format("2006-01-02"))
        endDate := c.DefaultQuery("end", time.Now().Format("2006-01-02"))

        if service.Cards != nil {
                body, err := service.Cards.GetGachaStats(startDate, endDate)
                if err == nil {
                        var raw map[string]interface{}
                        if json.Unmarshal(body, &raw) == nil {
                                c.JSON(200, raw)
                                return
                        }
                }
        }

        // 网关不可用时返回示例数据
        stats := []model.GachaStats{
                {Date: startDate, PoolName: "限定卡池", Total: 10000, SSR: 200, SR: 2800, R: 7000, SSRRate: "2.0%", Revenue: 150000},
        }

        response.OK(c, stats)
}

// GetRetentionStats 获取留存统计
// GET /api/v1/admin/analytics/retention?start=2025-07-01&end=2025-07-31
func GetRetentionStats(c *gin.Context) {
        startDate := c.DefaultQuery("start", time.Now().AddDate(0, 0, -30).Format("2006-01-02"))
        _ = c.DefaultQuery("end", time.Now().Format("2006-01-02"))

        // TODO: 从log_db的login_log分表计算留存率
        stats := []model.RetentionStats{
                {CohortDate: startDate, NewUsers: 500, D1: 55.2, D3: 38.5, D7: 25.1, D14: 18.3, D30: 12.5},
        }

        response.OK(c, stats)
}

// ==================== 日志查看 ====================

// GetGmLogs 获取GM操作日志
// GET /api/v1/admin/logs/gm?page=1&pageSize=20&start=&end=&action=
func GetGmLogs(c *gin.Context) {
        page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
        pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
        startStr := c.Query("start")
        endStr := c.Query("end")

        if page < 1 {
                page = 1
        }
        if pageSize < 1 || pageSize > 100 {
                pageSize = 20
        }

        var start, end time.Time
        if startStr != "" {
                start, _ = time.Parse("2006-01-02", startStr)
        }
        if endStr != "" {
                end, _ = time.Parse("2006-01-02", endStr)
                end = end.Add(24 * time.Hour - time.Second)
        }
        if start.IsZero() {
                start = time.Now().AddDate(0, 0, -30)
        }
        if end.IsZero() {
                end = time.Now()
        }

        logs, total, err := dao.GetGmLogs(start, end, page, pageSize)
        if err != nil {
                log.Printf("get gm logs: %v", err)
                response.Fail(c, "查询日志失败")
                return
        }

        response.OKPage(c, logs, total, page, pageSize)
}

// GetLoginLogs 获取登录日志
// GET /api/v1/admin/logs/login?page=1&pageSize=20&start=&end=
func GetLoginLogs(c *gin.Context) {
        page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
        pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
        startStr := c.Query("start")
        endStr := c.Query("end")

        if page < 1 {
                page = 1
        }
        if pageSize < 1 || pageSize > 100 {
                pageSize = 20
        }

        var start, end time.Time
        if startStr != "" {
                start, _ = time.Parse("2006-01-02", startStr)
        }
        if endStr != "" {
                end, _ = time.Parse("2006-01-02", endStr)
                end = end.Add(24 * time.Hour - time.Second)
        }
        if start.IsZero() {
                start = time.Now().AddDate(0, 0, -7)
        }
        if end.IsZero() {
                end = time.Now()
        }

        logs, total, err := dao.GetLoginLogs(start, end, page, pageSize)
        if err != nil {
                log.Printf("get login logs: %v", err)
                response.Fail(c, "查询登录日志失败")
                return
        }

        response.OKPage(c, logs, total, page, pageSize)
}

// GetActionLogs 获取用户行为日志
// GET /api/v1/admin/logs/action?page=1&pageSize=20&action=&start=&end=
func GetActionLogs(c *gin.Context) {
        page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
        pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))
        action := c.Query("action")
        startStr := c.Query("start")
        endStr := c.Query("end")

        if page < 1 {
                page = 1
        }
        if pageSize < 1 || pageSize > 100 {
                pageSize = 20
        }

        var start, end time.Time
        if startStr != "" {
                start, _ = time.Parse("2006-01-02", startStr)
        }
        if endStr != "" {
                end, _ = time.Parse("2006-01-02", endStr)
                end = end.Add(24 * time.Hour - time.Second)
        }
        if start.IsZero() {
                start = time.Now().AddDate(0, 0, -7)
        }
        if end.IsZero() {
                end = time.Now()
        }

        logs, total, err := dao.GetActionLogs(start, end, action, page, pageSize)
        if err != nil {
                log.Printf("get action logs: %v", err)
                response.Fail(c, "查询行为日志失败")
                return
        }

        response.OKPage(c, logs, total, page, pageSize)
}

// ==================== 配置中心 ====================

// GetConfigs 获取配置列表
// GET /api/v1/admin/configs?group=
func GetConfigs(c *gin.Context) {
        group := c.Query("group")

        configs, err := dao.GetConfigs(group)
        if err != nil {
                log.Printf("get configs: %v", err)
                response.Fail(c, "获取配置失败")
                return
        }

        response.OK(c, configs)
}

// UpdateConfig 更新配置
// PUT /api/v1/admin/configs/:id
func UpdateConfig(c *gin.Context) {
        idStr := c.Param("id")
        id, err := strconv.ParseInt(idStr, 10, 64)
        if err != nil {
                response.Fail(c, "无效的配置ID")
                return
        }

        var req model.ConfigUpdateRequest
        if err := c.ShouldBindJSON(&req); err != nil {
                response.Fail(c, "参数错误")
                return
        }

        if err := dao.UpdateConfig(id, req.ConfigValue, req.UpdatedBy); err != nil {
                log.Printf("update config: %v", err)
                response.Fail(c, "更新配置失败")
                return
        }

        operatorID, _ := c.Get("userId")
        operatorName, _ := c.Get("username")
        _ = dao.CreateGmLog(&model.GmOperationLog{
                OperatorID:   operatorID.(int64),
                OperatorName: operatorName.(string),
                TargetID:     id,
                TargetType:   "config",
                Action:       "update",
                Detail:       fmt.Sprintf("value=%s", req.ConfigValue),
                IP:           c.ClientIP(),
                CreatedAt:    time.Now(),
        })

        response.OKWithMsg(c, "更新成功", nil)
}

// ==================== 活动管理 ====================

// GetActivities 获取活动列表
// GET /api/v1/admin/activities?type=&status=
func GetActivities(c *gin.Context) {
        actType := c.Query("type")
        var status *int8
        if s := c.Query("status"); s != "" {
                if v, err := strconv.ParseInt(s, 10, 8); err == nil {
                        s8 := int8(v)
                        status = &s8
                }
        }

        activities, err := dao.GetActivities(actType, status)
        if err != nil {
                log.Printf("get activities: %v", err)
                response.Fail(c, "获取活动列表失败")
                return
        }

        response.OK(c, activities)
}

// CreateActivity 创建活动
// POST /api/v1/admin/activities
func CreateActivity(c *gin.Context) {
        var req model.ActivityCreateRequest
        if err := c.ShouldBindJSON(&req); err != nil {
                response.Fail(c, "参数错误: "+err.Error())
                return
        }

        activity := &model.ActivityConfig{
                Name:        req.Name,
                Type:        req.Type,
                Description: req.Description,
                StartTime:   req.StartTime,
                EndTime:     req.EndTime,
                RewardsJSON: req.RewardsJSON,
                Status:      1,
        }

        if err := dao.CreateActivity(activity); err != nil {
                log.Printf("create activity: %v", err)
                response.Fail(c, "创建活动失败")
                return
        }

        operatorID, _ := c.Get("userId")
        operatorName, _ := c.Get("username")
        _ = dao.CreateGmLog(&model.GmOperationLog{
                OperatorID:   operatorID.(int64),
                OperatorName: operatorName.(string),
                TargetID:     activity.ID,
                TargetType:   "activity",
                Action:       "create",
                Detail:       fmt.Sprintf("name=%s type=%s", req.Name, req.Type),
                IP:           c.ClientIP(),
                CreatedAt:    time.Now(),
        })

        response.OKWithMsg(c, "创建成功", activity)
}

// UpdateActivity 更新活动
// PUT /api/v1/admin/activities/:id
func UpdateActivity(c *gin.Context) {
        idStr := c.Param("id")
        id, err := strconv.ParseInt(idStr, 10, 64)
        if err != nil {
                response.Fail(c, "无效的活动ID")
                return
        }

        var req model.ActivityUpdateRequest
        if err := c.ShouldBindJSON(&req); err != nil {
                response.Fail(c, "参数错误")
                return
        }

        activity, err := dao.GetActivityByID(id)
        if err != nil {
                response.Fail(c, "活动不存在")
                return
        }

        updates := make(map[string]interface{})
        if req.Name != nil {
                updates["name"] = *req.Name
        }
        if req.Type != nil {
                updates["type"] = *req.Type
        }
        if req.Description != nil {
                updates["description"] = *req.Description
        }
        if req.StartTime != nil {
                updates["start_time"] = *req.StartTime
        }
        if req.EndTime != nil {
                updates["end_time"] = *req.EndTime
        }
        if req.RewardsJSON != nil {
                updates["rewards_json"] = *req.RewardsJSON
        }
        if req.Status != nil {
                updates["status"] = *req.Status
        }

        if err := dao.UpdateActivity(activity, updates); err != nil {
                log.Printf("update activity: %v", err)
                response.Fail(c, "更新活动失败")
                return
        }

        response.OKWithMsg(c, "更新成功", nil)
}

// DeleteActivity 删除活动
// DELETE /api/v1/admin/activities/:id
func DeleteActivity(c *gin.Context) {
        idStr := c.Param("id")
        id, err := strconv.ParseInt(idStr, 10, 64)
        if err != nil {
                response.Fail(c, "无效的活动ID")
                return
        }

        if err := dao.DeleteActivity(id); err != nil {
                log.Printf("delete activity: %v", err)
                response.Fail(c, "删除活动失败")
                return
        }

        response.OKWithMsg(c, "删除成功", nil)
}

// ==================== RBAC: 角色 & 权限 ====================

// GetRoles 获取角色列表
// GET /api/v1/admin/roles
func GetRoles(c *gin.Context) {
        roles, err := dao.GetRoles()
        if err != nil {
                log.Printf("get roles: %v", err)
                response.Fail(c, "获取角色列表失败")
                return
        }

        response.OK(c, roles)
}

// CreateRole 创建角色
// POST /api/v1/admin/roles
func CreateRole(c *gin.Context) {
        var req model.RoleCreateRequest
        if err := c.ShouldBindJSON(&req); err != nil {
                response.Fail(c, "参数错误")
                return
        }

        // 检查code唯一性
        if _, err := dao.GetRoleByCode(req.Code); err == nil {
                response.Fail(c, "角色编码已存在")
                return
        }

        role := &model.Role{
                Name:        req.Name,
                Code:        req.Code,
                Description: req.Description,
                Status:      1,
        }

        if err := dao.CreateRole(role); err != nil {
                log.Printf("create role: %v", err)
                response.Fail(c, "创建角色失败")
                return
        }

        response.OKWithMsg(c, "创建成功", role)
}

// UpdateRole 更新角色
// PUT /api/v1/admin/roles/:id
func UpdateRole(c *gin.Context) {
        idStr := c.Param("id")
        id, err := strconv.ParseInt(idStr, 10, 64)
        if err != nil {
                response.Fail(c, "无效的角色ID")
                return
        }

        var req model.RoleUpdateRequest
        if err := c.ShouldBindJSON(&req); err != nil {
                response.Fail(c, "参数错误")
                return
        }

        role, err := dao.GetRoleByID(id)
        if err != nil {
                response.Fail(c, "角色不存在")
                return
        }

        if req.Name != "" {
                role.Name = req.Name
        }
        if req.Description != "" {
                role.Description = req.Description
        }
        if req.Status != nil {
                role.Status = *req.Status
        }

        if err := dao.UpdateRole(role); err != nil {
                log.Printf("update role: %v", err)
                response.Fail(c, "更新角色失败")
                return
        }

        // 更新权限关联
        if req.Permissions != nil {
                if err := dao.SetRolePermissions(id, req.Permissions); err != nil {
                        log.Printf("set role permissions: %v", err)
                        response.Fail(c, "更新权限关联失败")
                        return
                }
        }

        response.OKWithMsg(c, "更新成功", nil)
}

// DeleteRole 删除角色
// DELETE /api/v1/admin/roles/:id
func DeleteRole(c *gin.Context) {
        idStr := c.Param("id")
        id, err := strconv.ParseInt(idStr, 10, 64)
        if err != nil {
                response.Fail(c, "无效的角色ID")
                return
        }

        // 禁止删除super_admin角色
        if role, err := dao.GetRoleByID(id); err == nil && role.Code == "super_admin" {
                response.Fail(c, "不能删除超级管理员角色")
                return
        }

        if err := dao.DeleteRole(id); err != nil {
                log.Printf("delete role: %v", err)
                response.Fail(c, "删除角色失败")
                return
        }

        response.OKWithMsg(c, "删除成功", nil)
}

// GetPermissions 获取权限列表
// GET /api/v1/admin/permissions
func GetPermissions(c *gin.Context) {
        perms, err := dao.GetPermissions()
        if err != nil {
                log.Printf("get permissions: %v", err)
                response.Fail(c, "获取权限列表失败")
                return
        }

        response.OK(c, perms)
}

// GetAdminUsers 获取后台管理员列表
// GET /api/v1/admin/admin-users?page=1&pageSize=20
func GetAdminUsers(c *gin.Context) {
        page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
        pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "20"))

        if page < 1 {
                page = 1
        }
        if pageSize < 1 || pageSize > 100 {
                pageSize = 20
        }

        users, total, err := dao.GetAdminUsers(page, pageSize)
        if err != nil {
                log.Printf("get admin users: %v", err)
                response.Fail(c, "获取管理员列表失败")
                return
        }

        response.OKPage(c, users, total, page, pageSize)
}

// AssignAdminRoles 分配管理员角色
// PUT /api/v1/admin/admin-users/:id/roles
func AssignAdminRoles(c *gin.Context) {
        idStr := c.Param("id")
        userID, err := strconv.ParseInt(idStr, 10, 64)
        if err != nil {
                response.Fail(c, "无效的管理员ID")
                return
        }

        var req model.AssignRolesRequest
        if err := c.ShouldBindJSON(&req); err != nil {
                response.Fail(c, "参数错误")
                return
        }

        if err := dao.AssignAdminUserRoles(userID, req.RoleIDs); err != nil {
                log.Printf("assign roles: %v", err)
                response.Fail(c, "分配角色失败")
                return
        }

        response.OKWithMsg(c, "分配成功", nil)
}
