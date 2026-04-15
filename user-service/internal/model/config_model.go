package model

import "time"

// =============================================================================
// 客户端功能检测系统 — 数据模型
// =============================================================================

// ──────────────────────────────────────
// 客户端版本管理
// ──────────────────────────────────────

// ClientVersion 客户端版本
type ClientVersion struct {
	ID                  uint64     `json:"id" gorm:"column:id;primaryKey;autoIncrement"`
	Platform            string     `json:"platform" gorm:"column:platform;type:varchar(20);not null"`
	VersionCode         string     `json:"version_code" gorm:"column:version_code;type:varchar(32);not null"`
	VersionName         string     `json:"version_name" gorm:"column:version_name;type:varchar(64);not null"`
	MinSupportedVersion string     `json:"min_supported_version" gorm:"column:min_supported_version;type:varchar(32);default:'1.0.0'"`
	BuildNumber         int        `json:"build_number" gorm:"column:build_number;type:int unsigned;default:1"`
	IsForceUpdate       bool       `json:"is_force_update" gorm:"column:is_force_update;type:tinyint(1);default:0"`
	UpdateTitle         string     `json:"update_title" gorm:"column:update_title;type:varchar(128)"`
	UpdateDescription   string     `json:"update_description" gorm:"column:update_description;type:text"`
	DownloadURL         string     `json:"download_url" gorm:"column:download_url;type:varchar(512)"`
	FileSize            int64      `json:"file_size" gorm:"column:file_size;type:bigint unsigned;default:0"`
	FileHash            string     `json:"file_hash" gorm:"column:file_hash;type:varchar(64)"`
	Status              int8       `json:"status" gorm:"column:status;type:tinyint;default:1"`
	PublishedAt         *time.Time `json:"published_at" gorm:"column:published_at"`
	CreatedAt           time.Time  `json:"created_at" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt           time.Time  `json:"updated_at" gorm:"column:updated_at;autoUpdateTime"`
}

// TableName 指定表名
func (ClientVersion) TableName() string { return "client_versions" }

// VersionCheckRequest 版本检查请求
type VersionCheckRequest struct {
	Platform    string `json:"platform" binding:"required,oneof=android ios windows"`
	VersionCode string `json:"version_code" binding:"required,min=1,max=32"`
	BuildNumber int    `json:"build_number"`
}

// VersionCheckResponse 版本检查响应
type VersionCheckResponse struct {
	LatestVersion       string `json:"latest_version"`
	MinSupportedVersion string `json:"min_supported_version"`
	NeedUpdate          bool   `json:"need_update"`
	ForceUpdate         bool   `json:"force_update"`
	UpdateTitle         string `json:"update_title,omitempty"`
	UpdateDescription   string `json:"update_description,omitempty"`
	DownloadURL         string `json:"download_url,omitempty"`
	FileSize            int64  `json:"file_size,omitempty"`
	FileHash            string `json:"file_hash,omitempty"`
	ServerTime          int64  `json:"server_time"`
}

// ──────────────────────────────────────
// 功能开关
// ──────────────────────────────────────

// FeatureFlag 功能开关
type FeatureFlag struct {
	ID                uint64    `json:"id" gorm:"column:id;primaryKey;autoIncrement"`
	FlagKey           string    `json:"flag_key" gorm:"column:flag_key;type:varchar(64);uniqueIndex;not null"`
	FlagName          string    `json:"flag_name" gorm:"column:flag_name;type:varchar(128);not null"`
	Description       string    `json:"description" gorm:"column:description;type:text"`
	FlagType          int8      `json:"flag_type" gorm:"column:flag_type;type:tinyint;default:0"`
	IsEnabled         bool      `json:"is_enabled" gorm:"column:is_enabled;type:tinyint(1);default:0"`
	RolloutPercentage int       `json:"rollout_percentage" gorm:"column:rollout_percentage;type:int unsigned;default:100"`
	TargetPlatforms   string    `json:"target_platforms" gorm:"column:target_platforms;type:varchar(100);default:'android,ios,windows'"`
	MinVersion        string    `json:"min_version" gorm:"column:min_version;type:varchar(32)"`
	MaxVersion        string    `json:"max_version" gorm:"column:max_version;type:varchar(32)"`
	TargetRegions     string    `json:"target_regions" gorm:"column:target_regions;type:varchar(200)"`
	TargetUserGroups  string    `json:"target_user_groups" gorm:"column:target_user_groups;type:varchar(100)"`
	ConfigValue       string    `json:"config_value" gorm:"column:config_value;type:text"`
	Priority          int       `json:"priority" gorm:"column:priority;default:0"`
	Status            int8      `json:"status" gorm:"column:status;type:tinyint;default:1"`
	CreatedAt         time.Time `json:"created_at" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt         time.Time `json:"updated_at" gorm:"column:updated_at;autoUpdateTime"`
}

// TableName 指定表名
func (FeatureFlag) TableName() string { return "feature_flags" }

// FeatureFlagsRequest 获取功能开关列表请求
type FeatureFlagsRequest struct {
	Platform    string `json:"platform" binding:"required,oneof=android ios windows"`
	VersionCode string `json:"version_code" binding:"required,min=1,max=32"`
	RegionID    int64  `json:"region_id"`
	UserID      int64  `json:"user_id"`
	VIPLevel    int    `json:"vip_level"`
	UserLevel   int    `json:"user_level"`
}

// FeatureFlagItem 返回给客户端的功能开关项
type FeatureFlagItem struct {
	FlagKey     string      `json:"flag_key"`
	FlagName    string      `json:"flag_name"`
	IsEnabled   bool        `json:"is_enabled"`
	ConfigValue interface{} `json:"config_value,omitempty"`
}

// ──────────────────────────────────────
// 热更新
// ──────────────────────────────────────

// HotUpdate 热更新资源版本
type HotUpdate struct {
	ID              uint64     `json:"id" gorm:"column:id;primaryKey;autoIncrement"`
	Platform        string     `json:"platform" gorm:"column:platform;type:varchar(20);not null"`
	ResourceVersion string     `json:"resource_version" gorm:"column:resource_version;type:varchar(32);not null"`
	BaseVersion     string     `json:"base_version" gorm:"column:base_version;type:varchar(32);not null"`
	UpdateType      int8       `json:"update_type" gorm:"column:update_type;type:tinyint;default:0"`
	TotalSize       int64      `json:"total_size" gorm:"column:total_size;type:bigint unsigned;default:0"`
	FileCount       int        `json:"file_count" gorm:"column:file_count;type:int unsigned;default:0"`
	Description     string     `json:"description" gorm:"column:description;type:text"`
	DownloadBaseURL string     `json:"download_base_url" gorm:"column:download_base_url;type:varchar(512);not null"`
	ManifestURL     string     `json:"manifest_url" gorm:"column:manifest_url;type:varchar(512)"`
	ManifestHash    string     `json:"manifest_hash" gorm:"column:manifest_hash;type:varchar(64)"`
	IsForceUpdate   bool       `json:"is_force_update" gorm:"column:is_force_update;type:tinyint(1);default:0"`
	Status          int8       `json:"status" gorm:"column:status;type:tinyint;default:1"`
	PublishedAt     *time.Time `json:"published_at" gorm:"column:published_at"`
	CreatedAt       time.Time  `json:"created_at" gorm:"column:created_at;autoCreateTime"`
	UpdatedAt       time.Time  `json:"updated_at" gorm:"column:updated_at;autoUpdateTime"`
}

// TableName 指定表名
func (HotUpdate) TableName() string { return "hot_updates" }

// HotUpdateCheckRequest 热更新检查请求
type HotUpdateCheckRequest struct {
	Platform        string `json:"platform" binding:"required,oneof=android ios windows"`
	ResourceVersion string `json:"resource_version" binding:"required,min=1,max=32"`
	AppVersion      string `json:"app_version" binding:"required,min=1,max=32"`
}

// HotUpdateCheckResponse 热更新检查响应
type HotUpdateCheckResponse struct {
	HasUpdate       bool   `json:"has_update"`
	ForceUpdate     bool   `json:"force_update"`
	LatestVersion   string `json:"latest_version"`
	UpdateType      int8   `json:"update_type"`
	TotalSize       int64  `json:"total_size"`
	FileCount       int    `json:"file_count"`
	Description     string `json:"description,omitempty"`
	DownloadBaseURL string `json:"download_base_url"`
	ManifestURL     string `json:"manifest_url"`
	ManifestHash    string `json:"manifest_hash"`
}

// ──────────────────────────────────────
// 审计日志
// ──────────────────────────────────────

// ClientAuditLog 客户端审计日志
type ClientAuditLog struct {
	ID             uint64    `json:"id" gorm:"column:id;primaryKey;autoIncrement"`
	UserID         *int64    `json:"user_id" gorm:"column:user_id;index"`
	Platform       string    `json:"platform" gorm:"column:platform;type:varchar(20);not null"`
	AppVersion     string    `json:"app_version" gorm:"column:app_version;type:varchar(32);not null"`
	ResourceVersion string   `json:"resource_version" gorm:"column:resource_version;type:varchar(32)"`
	DeviceID       string    `json:"device_id" gorm:"column:device_id;type:varchar(128)"`
	OSVersion      string    `json:"os_version" gorm:"column:os_version;type:varchar(64)"`
	CheckType      string    `json:"check_type" gorm:"column:check_type;type:varchar(32);not null"`
	CheckResult    int8      `json:"check_result" gorm:"column:check_result;type:tinyint;not null"`
	Detail         string    `json:"detail" gorm:"column:detail;type:text"`
	IPAddress      string    `json:"ip_address" gorm:"column:ip_address;type:varchar(45)"`
	CreatedAt      time.Time `json:"created_at" gorm:"column:created_at;autoCreateTime;index"`
}

// TableName 指定表名
func (ClientAuditLog) TableName() string { return "client_audit_logs" }
