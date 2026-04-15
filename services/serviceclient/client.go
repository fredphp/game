package serviceclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// ServiceURLs 各服务内部地址
var ServiceURLs = map[string]string{
	"user":     "http://127.0.0.1:9001",
	"card":     "http://127.0.0.1:9002",
	"battle":   "http://127.0.0.1:9003",
	"map":      "http://127.0.0.1:9005",
	"guild":    "http://127.0.0.1:9004",
	"payment":  "http://127.0.0.1:9006",
}

var httpClient = &http.Client{Timeout: 5 * time.Second}

// Get 发起 GET 请求
func Get(ctx context.Context, svc, path string, out interface{}) error {
	url := ServiceURLs[svc] + path
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("http get %s%s: %w", svc, path, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("http get %s%s status=%d body=%s", svc, path, resp.StatusCode, string(body))
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

// Post 发起 POST 请求
func Post(ctx context.Context, svc, path string, body interface{}, out interface{}) error {
	data, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshal body: %w", err)
	}
	url := ServiceURLs[svc] + path
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("http post %s%s: %w", svc, path, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("http post %s%s status=%d body=%s", svc, path, resp.StatusCode, string(respBody))
	}
	if out != nil {
		return json.NewDecoder(resp.Body).Decode(out)
	}
	return nil
}

// ──────────────────────────────────────────────
// User Service 调用
// ──────────────────────────────────────────────

// DeductDiamonds 扣除用户钻石
func DeductDiamonds(ctx context.Context, userID int64, amount int, reason string) error {
	return Post(ctx, "user", "/api/v1/internal/deduct-diamonds", map[string]interface{}{
		"user_id": userID, "amount": amount, "reason": reason,
	}, nil)
}

// AddGold 给用户加金币
func AddGold(ctx context.Context, userID int64, gold int, reason string) error {
	return Post(ctx, "user", "/api/v1/internal/add-gold", map[string]interface{}{
		"user_id": userID, "gold": gold, "reason": reason,
	}, nil)
}

// AddDiamonds 给用户加钻石
func AddDiamonds(ctx context.Context, userID int64, diamonds int, reason string) error {
	return Post(ctx, "user", "/api/v1/internal/add-diamonds", map[string]interface{}{
		"user_id": userID, "diamond": diamonds, "reason": reason,
	}, nil)
}

// AddExp 给用户加经验
func AddExp(ctx context.Context, userID int64, exp int64, reason string) error {
	return Post(ctx, "user", "/api/v1/internal/add-exp", map[string]interface{}{
		"user_id": userID, "exp": exp, "reason": reason,
	}, nil)
}

// DeductFood 扣除粮食
func DeductFood(ctx context.Context, userID int64, food int, reason string) error {
	return Post(ctx, "user", "/api/v1/internal/deduct-food", map[string]interface{}{
		"user_id": userID, "food": food, "reason": reason,
	}, nil)
}

// AddFood 增加粮食
func AddFood(ctx context.Context, userID int64, food int, reason string) error {
	return Post(ctx, "user", "/api/v1/internal/add-food", map[string]interface{}{
		"user_id": userID, "food": food, "reason": reason,
	}, nil)
}

// UpdateVIPLevel 更新VIP等级
func UpdateVIPLevel(ctx context.Context, userID int64, level int) error {
	return Post(ctx, "user", "/api/v1/internal/update-vip", map[string]interface{}{
		"user_id": userID, "vip_level": level,
	}, nil)
}

// UpdateUserPower 更新用户战力
func UpdateUserPower(ctx context.Context, userID int64, power int64) error {
	return Post(ctx, "user", "/api/v1/internal/update-power", map[string]interface{}{
		"user_id": userID, "power": power,
	}, nil)
}

// GetUserProfileBrief 获取用户简要信息
type UserProfileBrief struct {
	UserID  int64  `json:"user_id"`
	Gold    int    `json:"gold"`
	Diamond int    `json:"diamond"`
	Food    int    `json:"food"`
	Level   int    `json:"level"`
	VIPLevel int   `json:"vip_level"`
	Power   int64  `json:"power"`
}

func GetUserProfileBrief(ctx context.Context, userID int64) (*UserProfileBrief, error) {
	var p UserProfileBrief
	err := Get(ctx, "user", fmt.Sprintf("/api/v1/internal/profile/%d", userID), &p)
	return &p, err
}

// ──────────────────────────────────────────────
// Card Service 调用
// ──────────────────────────────────────────────

type UserCardBrief struct {
	ID     int64 `json:"id"`
	CardID int64 `json:"card_id"`
	Star   int   `json:"star"`
	Level  int   `json:"level"`
}

type UserCardsListResponse struct {
	List  []UserCardBrief `json:"list"`
	Total int64          `json:"total"`
}

// GetUserCardList 获取用户卡牌列表
func GetUserCardList(ctx context.Context, userID int64) ([]UserCardBrief, error) {
	var resp UserCardsListResponse
	err := Get(ctx, "card", fmt.Sprintf("/api/v1/internal/user-cards/%d", userID), &resp)
	return resp.List, err
}

// ──────────────────────────────────────────────
// Map Service 调用
// ──────────────────────────────────────────────

// OccupyCity 占领城池
func OccupyCity(ctx context.Context, guildID, ownerID int64, ownerType, ownerName, cityID int64, power int64) error {
	return Post(ctx, "map", "/api/v1/internal/occupy-city", map[string]interface{}{
		"guild_id": guildID, "owner_type": ownerType, "owner_id": ownerID,
		"owner_name": ownerName, "city_id": cityID, "power": power,
	}, nil)
}

// ──────────────────────────────────────────────
// Guild Service 调用
// ──────────────────────────────────────────────

// NotifyMemberChange 联盟成员变更通知
func NotifyMemberChange(ctx context.Context, guildID, userID int64, action string, power int64) error {
	return Post(ctx, "guild", "/api/v1/internal/member-change", map[string]interface{}{
		"guild_id": guildID, "user_id": userID, "action": action, "power": power,
	}, nil)
}
