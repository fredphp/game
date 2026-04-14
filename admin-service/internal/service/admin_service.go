// Package service 提供九州争鼎后台管理服务的业务逻辑层。
// 负责与game-service各微服务通信(HTTP)、业务校验、数据聚合。
// 通过gateway统一转发请求到下游服务(user/card/map/guild/payment)。
package service

import (
        "bytes"
        "encoding/json"
        "fmt"
        "io"
        "net/http"
        "time"
)

// GatewayClient 封装与游戏网关的HTTP通信
type GatewayClient struct {
        baseURL    string
        httpClient *http.Client
}

// NewGatewayClient 创建网关客户端
func NewGatewayClient(gatewayAddr string) *GatewayClient {
        return &GatewayClient{
                baseURL: "http://" + gatewayAddr,
                httpClient: &http.Client{
                        Timeout: 30 * time.Second,
                },
        }
}

// gatewayResp 统一网关响应结构
type gatewayResp struct {
        Code    int             `json:"code"`
        Message string          `json:"message"`
        Data    json.RawMessage `json:"data"`
}

// get 发送GET请求到网关
func (g *GatewayClient) get(path string, queryParams map[string]string) ([]byte, error) {
        url := g.baseURL + path
        if len(queryParams) > 0 {
                q := url + "?"
                first := true
                for k, v := range queryParams {
                        if !first {
                                q += "&"
                        }
                        q += k + "=" + v
                        first = false
                }
                url = q
        }

        resp, err := g.httpClient.Get(url)
        if err != nil {
                return nil, fmt.Errorf("gateway get %s: %w", path, err)
        }
        defer resp.Body.Close()

        body, err := io.ReadAll(resp.Body)
        if err != nil {
                return nil, fmt.Errorf("read response: %w", err)
        }

        if resp.StatusCode != http.StatusOK {
                return nil, fmt.Errorf("gateway status %d: %s", resp.StatusCode, string(body))
        }

        return body, nil
}

// post 发送POST请求到网关
func (g *GatewayClient) post(path string, payload interface{}) ([]byte, error) {
        data, err := json.Marshal(payload)
        if err != nil {
                return nil, fmt.Errorf("marshal request: %w", err)
        }

        url := g.baseURL + path
        resp, err := g.httpClient.Post(url, "application/json", bytes.NewReader(data))
        if err != nil {
                return nil, fmt.Errorf("gateway post %s: %w", path, err)
        }
        defer resp.Body.Close()

        body, err := io.ReadAll(resp.Body)
        if err != nil {
                return nil, fmt.Errorf("read response: %w", err)
        }

        if resp.StatusCode != http.StatusOK {
                return nil, fmt.Errorf("gateway status %d: %s", resp.StatusCode, string(body))
        }

        return body, nil
}

// put 发送PUT请求到网关
func (g *GatewayClient) put(path string, payload interface{}) ([]byte, error) {
        data, err := json.Marshal(payload)
        if err != nil {
                return nil, fmt.Errorf("marshal request: %w", err)
        }

        url := g.baseURL + path
        req, err := http.NewRequest(http.MethodPut, url, bytes.NewReader(data))
        if err != nil {
                return nil, fmt.Errorf("create request: %w", err)
        }
        req.Header.Set("Content-Type", "application/json")

        resp, err := g.httpClient.Do(req)
        if err != nil {
                return nil, fmt.Errorf("gateway put %s: %w", path, err)
        }
        defer resp.Body.Close()

        body, err := io.ReadAll(resp.Body)
        if err != nil {
                return nil, fmt.Errorf("read response: %w", err)
        }

        if resp.StatusCode != http.StatusOK {
                return nil, fmt.Errorf("gateway status %d: %s", resp.StatusCode, string(body))
        }

        return body, nil
}

// delete 发送DELETE请求到网关
func (g *GatewayClient) delete(path string) ([]byte, error) {
        url := g.baseURL + path
        req, err := http.NewRequest(http.MethodDelete, url, nil)
        if err != nil {
                return nil, fmt.Errorf("create request: %w", err)
        }

        resp, err := g.httpClient.Do(req)
        if err != nil {
                return nil, fmt.Errorf("gateway delete %s: %w", path, err)
        }
        defer resp.Body.Close()

        body, err := io.ReadAll(resp.Body)
        if err != nil {
                return nil, fmt.Errorf("read response: %w", err)
        }

        if resp.StatusCode != http.StatusOK {
                return nil, fmt.Errorf("gateway status %d: %s", resp.StatusCode, string(body))
        }

        return body, nil
}

// parseGatewayResp 解析网关响应并提取data字段
func parseGatewayResp(body []byte) (json.RawMessage, error) {
        var resp gatewayResp
        if err := json.Unmarshal(body, &resp); err != nil {
                return nil, fmt.Errorf("unmarshal gateway resp: %w", err)
        }
        if resp.Code != 0 {
                return nil, fmt.Errorf("gateway error code=%d msg=%s", resp.Code, resp.Message)
        }
        return resp.Data, nil
}

// ==================== 用户服务代理 ====================

// UserService 用户管理服务代理
type UserService struct {
        gw *GatewayClient
}

// NewUserService 创建用户服务代理
func NewUserService(gw *GatewayClient) *UserService {
        return &UserService{gw: gw}
}

// GetUsers 获取用户列表 (转发到user-service)
func (s *UserService) GetUsers(page, pageSize int, status string) ([]byte, error) {
        params := map[string]string{
                "page":     fmt.Sprintf("%d", page),
                "pageSize": fmt.Sprintf("%d", pageSize),
        }
        if status != "" {
                params["status"] = status
        }
        return s.gw.get("/api/v1/users/list", params)
}

// GetUserDetail 获取用户详情 (转发到user-service)
func (s *UserService) GetUserDetail(userID string) ([]byte, error) {
        return s.gw.get(fmt.Sprintf("/api/v1/users/%s", userID), nil)
}

// BanUser 封禁用户 (转发到user-service)
func (s *UserService) BanUser(userID string, reason string, duration int) ([]byte, error) {
        return s.gw.put(fmt.Sprintf("/api/v1/users/%s/ban", userID), map[string]interface{}{
                "reason":   reason,
                "duration": duration,
        })
}

// UnbanUser 解封用户 (转发到user-service)
func (s *UserService) UnbanUser(userID string) ([]byte, error) {
        return s.gw.put(fmt.Sprintf("/api/v1/users/%s/unban", userID), nil)
}

// ModifyResources 修改用户资源 (转发到user-service)
func (s *UserService) ModifyResources(userID, resource string, amount int, reason string) ([]byte, error) {
        return s.gw.put(fmt.Sprintf("/api/v1/users/%s/resources", userID), map[string]interface{}{
                "resource": resource,
                "amount":   amount,
                "reason":   reason,
        })
}

// GetOnlineCount 获取在线人数
func (s *UserService) GetOnlineCount() ([]byte, error) {
        return s.gw.get("/api/v1/users/online", nil)
}

// ==================== 卡牌服务代理 ====================

// CardService 卡牌管理服务代理
type CardService struct {
        gw *GatewayClient
}

// NewCardService 创建卡牌服务代理
func NewCardService(gw *GatewayClient) *CardService {
        return &CardService{gw: gw}
}

// GetCardPools 获取卡池列表 (转发到card-service)
func (s *CardService) GetCardPools() ([]byte, error) {
        return s.gw.get("/api/v1/card/pools", nil)
}

// CreateCardPool 创建卡池 (转发到card-service)
func (s *CardService) CreateCardPool(pool interface{}) ([]byte, error) {
        return s.gw.post("/api/v1/card/pools", pool)
}

// UpdateCardPool 更新卡池 (转发到card-service)
func (s *CardService) UpdateCardPool(poolID string, pool interface{}) ([]byte, error) {
        return s.gw.put(fmt.Sprintf("/api/v1/card/pools/%s", poolID), pool)
}

// ToggleCardPoolStatus 切换卡池状态 (转发到card-service)
func (s *CardService) ToggleCardPoolStatus(poolID string) ([]byte, error) {
        return s.gw.put(fmt.Sprintf("/api/v1/card/pools/%s/status", poolID), nil)
}

// GetHeroes 获取英雄列表 (转发到card-service)
func (s *CardService) GetHeroes() ([]byte, error) {
        return s.gw.get("/api/v1/card/heroes", nil)
}

// CreateHero 创建英雄 (转发到card-service)
func (s *CardService) CreateHero(hero interface{}) ([]byte, error) {
        return s.gw.post("/api/v1/card/heroes", hero)
}

// UpdateHero 更新英雄 (转发到card-service)
func (s *CardService) UpdateHero(heroID string, hero interface{}) ([]byte, error) {
        return s.gw.put(fmt.Sprintf("/api/v1/card/heroes/%s", heroID), hero)
}

// GetGachaStats 获取抽卡统计 (转发到card-service)
func (s *CardService) GetGachaStats(startDate, endDate string) ([]byte, error) {
        return s.gw.get("/api/v1/card/gacha/stats", map[string]string{
                "start": startDate,
                "end":   endDate,
        })
}

// ==================== 地图服务代理 ====================

// MapService 地图管理服务代理
type MapService struct {
        gw *GatewayClient
}

// NewMapService 创建地图服务代理
func NewMapService(gw *GatewayClient) *MapService {
        return &MapService{gw: gw}
}

// GetCities 获取城池列表 (转发到map-service)
func (s *MapService) GetCities() ([]byte, error) {
        return s.gw.get("/api/v1/map/cities", nil)
}

// UpdateCity 更新城池 (转发到map-service)
func (s *MapService) UpdateCity(cityID string, data interface{}) ([]byte, error) {
        return s.gw.put(fmt.Sprintf("/api/v1/map/cities/%s", cityID), data)
}

// GetMarches 获取行军列表 (转发到map-service)
func (s *MapService) GetMarches() ([]byte, error) {
        return s.gw.get("/api/v1/map/marches", nil)
}

// CancelMarch 取消行军 (转发到map-service)
func (s *MapService) CancelMarch(marchID string) ([]byte, error) {
        return s.gw.delete(fmt.Sprintf("/api/v1/map/marches/%s", marchID))
}

// ResetMap 重置地图 (转发到map-service)
func (s *MapService) ResetMap() ([]byte, error) {
        return s.gw.post("/api/v1/map/reset", nil)
}

// ==================== 公会服务代理 ====================

// GuildService 公会管理服务代理
type GuildService struct {
        gw *GatewayClient
}

// NewGuildService 创建公会服务代理
func NewGuildService(gw *GatewayClient) *GuildService {
        return &GuildService{gw: gw}
}

// GetGuilds 获取公会列表 (转发到guild-service)
func (s *GuildService) GetGuilds() ([]byte, error) {
        return s.gw.get("/api/v1/guild/list", nil)
}

// GetGuildMembers 获取公会成员 (转发到guild-service)
func (s *GuildService) GetGuildMembers(guildID string) ([]byte, error) {
        return s.gw.get(fmt.Sprintf("/api/v1/guild/%s/members", guildID), nil)
}

// UpdateGuild 更新公会 (转发到guild-service)
func (s *GuildService) UpdateGuild(guildID string, data interface{}) ([]byte, error) {
        return s.gw.put(fmt.Sprintf("/api/v1/guild/%s", guildID), data)
}

// DisbandGuild 解散公会 (转发到guild-service)
func (s *GuildService) DisbandGuild(guildID string) ([]byte, error) {
        return s.gw.delete(fmt.Sprintf("/api/v1/guild/%s", guildID))
}

// ==================== 支付服务代理 ====================

// PaymentService 支付管理服务代理
type PaymentService struct {
        gw *GatewayClient
}

// NewPaymentService 创建支付服务代理
func NewPaymentService(gw *GatewayClient) *PaymentService {
        return &PaymentService{gw: gw}
}

// RefundOrder 退款 (转发到payment-service)
func (s *PaymentService) RefundOrder(orderNo string, reason string) ([]byte, error) {
        return s.gw.post(fmt.Sprintf("/api/v1/payment/orders/%s/refund", orderNo), map[string]interface{}{
                "reason": reason,
        })
}

// ManualDeliver 手动发货 (转发到payment-service)
func (s *PaymentService) ManualDeliver(orderNo string) ([]byte, error) {
        return s.gw.post(fmt.Sprintf("/api/v1/payment/orders/%s/deliver", orderNo), nil)
}

// GetPaymentStats 获取支付统计 (转发到payment-service)
func (s *PaymentService) GetPaymentStats(startDate, endDate string) ([]byte, error) {
        return s.gw.get("/api/v1/payment/stats", map[string]string{
                "start": startDate,
                "end":   endDate,
        })
}

// ==================== 全局实例 ====================

var (
        Gateway *GatewayClient
        Users   *UserService
        Cards   *CardService
        Maps    *MapService
        Guilds  *GuildService
        Payments *PaymentService
)

// InitServices 初始化所有服务代理
func InitServices(gatewayAddr string) {
        Gateway = NewGatewayClient(gatewayAddr)
        Users = NewUserService(Gateway)
        Cards = NewCardService(Gateway)
        Maps = NewMapService(Gateway)
        Guilds = NewGuildService(Gateway)
        Payments = NewPaymentService(Gateway)
}
