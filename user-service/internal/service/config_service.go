package service

import (
	"context"
	"encoding/json"
	"fmt"
	"hash/fnv"
	"strconv"
	"strings"
	"time"

	"user-service/internal/model"
	"user-service/pkg/mysql"

	"gorm.io/gorm"
)

// =============================================================================
// 客户端功能检测服务 — 版本校验、功能开关、热更新检测
// =============================================================================

// ConfigService 配置检测服务
type ConfigService struct {
	db *gorm.DB
}

// NewConfigService 创建配置服务实例
func NewConfigService() *ConfigService {
	return &ConfigService{db: mysql.GetDB()}
}

// ──────────────────────────────────────
// 版本检查
// ──────────────────────────────────────

// CheckVersion 检查客户端版本
// 对比客户端版本与服务端最新版本，返回是否需要更新及更新信息。
func (s *ConfigService) CheckVersion(ctx context.Context, req *model.VersionCheckRequest) (*model.VersionCheckResponse, error) {
	var latest model.ClientVersion
	err := s.db.WithContext(ctx).
		Where("platform = ? AND status = 1", req.Platform).
		Order("build_number DESC, created_at DESC").
		First(&latest).Error
	if err != nil {
		return nil, fmt.Errorf("获取最新版本失败: %w", err)
	}

	// 语义化版本比较
	needUpdate := s.compareVersions(req.VersionCode, latest.VersionCode) < 0
	forceUpdate := s.compareVersions(req.VersionCode, latest.MinSupportedVersion) < 0

	resp := &model.VersionCheckResponse{
		LatestVersion:       latest.VersionCode,
		MinSupportedVersion: latest.MinSupportedVersion,
		NeedUpdate:          needUpdate,
		ForceUpdate:         forceUpdate || latest.IsForceUpdate,
		ServerTime:          time.Now().Unix(),
	}

	// 仅在有更新时填充下载信息
	if needUpdate {
		resp.UpdateTitle = latest.UpdateTitle
		resp.UpdateDescription = latest.UpdateDescription
		resp.DownloadURL = latest.DownloadURL
		resp.FileSize = latest.FileSize
		resp.FileHash = latest.FileHash
	}

	return resp, nil
}

// ──────────────────────────────────────
// 功能开关
// ──────────────────────────────────────

// GetFeatureFlags 获取客户端功能开关列表
// 根据平台、版本、区服、用户等信息过滤出适用的功能开关。
func (s *ConfigService) GetFeatureFlags(ctx context.Context, req *model.FeatureFlagsRequest) ([]model.FeatureFlagItem, error) {
	var flags []model.FeatureFlag
	err := s.db.WithContext(ctx).
		Where("status = 1").
		Order("priority DESC").
		Find(&flags).Error
	if err != nil {
		return nil, fmt.Errorf("查询功能开关失败: %w", err)
	}

	items := make([]model.FeatureFlagItem, 0, len(flags))
	for _, flag := range flags {
		if s.shouldEnableFlag(flag, req) {
			item := model.FeatureFlagItem{
				FlagKey:   flag.FlagKey,
				FlagName:  flag.FlagName,
				IsEnabled: flag.IsEnabled,
			}
			// 解析 JSON 配置值
			if flag.ConfigValue != "" {
				var config interface{}
				if json.Unmarshal([]byte(flag.ConfigValue), &config) == nil {
					item.ConfigValue = config
				}
			}
			items = append(items, item)
		}
	}

	return items, nil
}

// IsFeatureEnabled 检查单个功能是否启用（供中间件调用）
func (s *ConfigService) IsFeatureEnabled(ctx context.Context, flagKey string, platform, versionCode string, userID int64, vipLevel, userLevel int) bool {
	var flag model.FeatureFlag
	err := s.db.WithContext(ctx).
		Where("flag_key = ? AND status = 1", flagKey).
		First(&flag).Error
	if err != nil {
		return false
	}

	req := &model.FeatureFlagsRequest{
		Platform:    platform,
		VersionCode: versionCode,
		UserID:      userID,
		VIPLevel:    vipLevel,
		UserLevel:   userLevel,
	}

	return s.shouldEnableFlag(flag, req) && flag.IsEnabled
}

// shouldEnableFlag 判断功能开关是否应对该用户/设备启用
// 过滤链：启用状态 → 平台匹配 → 版本范围 → 区服过滤 → 用户组过滤 → 灰度百分比
func (s *ConfigService) shouldEnableFlag(flag model.FeatureFlag, req *model.FeatureFlagsRequest) bool {
	// 1. 基本启用检查
	if !flag.IsEnabled {
		return false
	}

	// 2. 平台过滤
	platforms := strings.Split(flag.TargetPlatforms, ",")
	platformMatch := false
	for _, p := range platforms {
		if strings.TrimSpace(p) == req.Platform {
			platformMatch = true
			break
		}
	}
	if !platformMatch {
		return false
	}

	// 3. 版本范围过滤
	if flag.MinVersion != "" && s.compareVersions(req.VersionCode, flag.MinVersion) < 0 {
		return false
	}
	if flag.MaxVersion != "" && s.compareVersions(req.VersionCode, flag.MaxVersion) > 0 {
		return false
	}

	// 4. 区服过滤
	if flag.TargetRegions != "" {
		regions := strings.Split(flag.TargetRegions, ",")
		regionMatch := false
		for _, r := range regions {
			trimmed := strings.TrimSpace(r)
			if trimmed == "" {
				continue
			}
			rid, err := strconv.ParseInt(trimmed, 10, 64)
			if err == nil && rid == req.RegionID {
				regionMatch = true
				break
			}
		}
		if !regionMatch {
			return false
		}
	}

	// 5. 用户组过滤（VIP等级、玩家等级）
	if flag.TargetUserGroups != "" {
		rules := strings.Split(flag.TargetUserGroups, ",")
		for _, rule := range rules {
			rule = strings.TrimSpace(rule)
			if rule == "" {
				continue
			}

			if strings.HasPrefix(rule, "vip_level>=") {
				minVIP, _ := strconv.Atoi(strings.TrimPrefix(rule, "vip_level>="))
				if req.VIPLevel < minVIP {
					return false
				}
			} else if strings.HasPrefix(rule, "vip_level>") {
				minVIP, _ := strconv.Atoi(strings.TrimPrefix(rule, "vip_level>"))
				if req.VIPLevel <= minVIP {
					return false
				}
			} else if strings.HasPrefix(rule, "level>=") {
				minLevel, _ := strconv.Atoi(strings.TrimPrefix(rule, "level>="))
				if req.UserLevel < minLevel {
					return false
				}
			} else if strings.HasPrefix(rule, "level>") {
				minLevel, _ := strconv.Atoi(strings.TrimPrefix(rule, "level>"))
				if req.UserLevel <= minLevel {
					return false
				}
			}
		}
	}

	// 6. 灰度百分比（基于用户ID哈希，保证同一用户结果一致）
	if flag.RolloutPercentage < 100 && req.UserID > 0 {
		hash := fnv.New32a()
		hash.Write([]byte(fmt.Sprintf("%s:%d", flag.FlagKey, req.UserID)))
		hashVal := hash.Sum32() % 100
		if int(hashVal) >= flag.RolloutPercentage {
			return false
		}
	}

	return true
}

// ──────────────────────────────────────
// 热更新检测
// ──────────────────────────────────────

// CheckHotUpdate 检查热更新
// 对比客户端资源版本与服务端最新版本，返回增量更新信息。
func (s *ConfigService) CheckHotUpdate(ctx context.Context, req *model.HotUpdateCheckRequest) (*model.HotUpdateCheckResponse, error) {
	var latest model.HotUpdate
	err := s.db.WithContext(ctx).
		Where("platform = ? AND status = 1", req.Platform).
		Order("created_at DESC").
		First(&latest).Error
	if err != nil {
		// 没有可用的热更新资源，视为无需更新
		return &model.HotUpdateCheckResponse{
			HasUpdate: false,
		}, nil
	}

	// 客户端资源版本已是最新
	if req.ResourceVersion == latest.ResourceVersion {
		return &model.HotUpdateCheckResponse{
			HasUpdate: false,
		}, nil
	}

	// 基准版本兼容性检查：客户端APP版本必须 >= 热更新的基准版本
	if s.compareVersions(req.AppVersion, latest.BaseVersion) < 0 {
		return &model.HotUpdateCheckResponse{
			HasUpdate:     false,
			LatestVersion: latest.ResourceVersion,
		}, nil
	}

	return &model.HotUpdateCheckResponse{
		HasUpdate:       true,
		ForceUpdate:     latest.IsForceUpdate,
		LatestVersion:   latest.ResourceVersion,
		UpdateType:      latest.UpdateType,
		TotalSize:       latest.TotalSize,
		FileCount:       latest.FileCount,
		Description:     latest.Description,
		DownloadBaseURL: latest.DownloadBaseURL,
		ManifestURL:     latest.ManifestURL,
		ManifestHash:    latest.ManifestHash,
	}, nil
}

// ──────────────────────────────────────
// 审计日志
// ──────────────────────────────────────

// RecordAuditLog 记录客户端审计日志
func (s *ConfigService) RecordAuditLog(log *model.ClientAuditLog) error {
	return s.db.Create(log).Error
}

// ──────────────────────────────────────
// 工具方法
// ──────────────────────────────────────

// compareVersions 比较语义化版本号
// 返回: -1 (a < b), 0 (a == b), 1 (a > b)
// 支持 "1.2.0" 和 "v1.2.0" 格式
func (s *ConfigService) compareVersions(a, b string) int {
	// 去除可能的 "v" 前缀
	aParts := strings.Split(strings.TrimPrefix(a, "v"), ".")
	bParts := strings.Split(strings.TrimPrefix(b, "v"), ".")

	maxLen := len(aParts)
	if len(bParts) > maxLen {
		maxLen = len(bParts)
	}

	for i := 0; i < maxLen; i++ {
		aVal := 0
		bVal := 0
		if i < len(aParts) {
			aVal, _ = strconv.Atoi(aParts[i])
		}
		if i < len(bParts) {
			bVal, _ = strconv.Atoi(bParts[i])
		}

		if aVal < bVal {
			return -1
		}
		if aVal > bVal {
			return 1
		}
	}

	return 0
}
