// Package dao 提供九州争鼎后台管理服务的数据访问层。
// 基于GORM v2，包含admin_db和log_db的所有CRUD操作，以及分表辅助函数。
// 日志体系: 用户行为日志、战斗日志、GM操作日志、登录日志
package dao

import (
	"fmt"
	"strings"
	"time"

	"admin-service/internal/model"
	"admin-service/pkg/mysql"

	"gorm.io/gorm"
)

// ==================== 分表工具函数 ====================

// GetOrderTableName 根据时间获取订单分表名: orders_YYYY_MM
func GetOrderTableName(t time.Time) string {
	return fmt.Sprintf("orders_%d_%02d", t.Year(), t.Month())
}

// GetGmLogTableName 根据时间获取GM操作日志分表名: gm_operation_log_YYYY_MM
func GetGmLogTableName(t time.Time) string {
	return fmt.Sprintf("gm_operation_log_%d_%02d", t.Year(), t.Month())
}

// GetUserActionLogTableName 根据时间获取用户行为日志分表名: user_action_log_YYYY_MM
func GetUserActionLogTableName(t time.Time) string {
	return fmt.Sprintf("user_action_log_%d_%02d", t.Year(), t.Month())
}

// GetBattleLogTableName 根据时间获取战斗日志分表名: battle_log_YYYY_MM
func GetBattleLogTableName(t time.Time) string {
	return fmt.Sprintf("battle_log_%d_%02d", t.Year(), t.Month())
}

// GetLoginLogTableName 根据时间获取登录日志分表名: login_log_YYYY_MM_DD
func GetLoginLogTableName(t time.Time) string {
	return fmt.Sprintf("login_log_%d_%02d_%02d", t.Year(), t.Month(), t.Day())
}

// ParseMonthTableName 从分表名中解析出月份范围
func ParseMonthTableName(prefix, tableName string) (time.Time, time.Time, error) {
	var year, month int
	_, err := fmt.Sscanf(tableName, prefix+"_%d_%02d", &year, &month)
	if err != nil {
		return time.Time{}, time.Time{}, err
	}
	start := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	end := start.AddDate(0, 1, 0).Add(-time.Second)
	return start, end, nil
}

// GetMonthTableNames 获取时间范围内所有月份分表名
func GetMonthTableNames(prefix string, start, end time.Time) []string {
	var tables []string
	current := time.Date(start.Year(), start.Month(), 1, 0, 0, 0, 0, time.Local)
	endMonth := time.Date(end.Year(), end.Month(), 1, 0, 0, 0, 0, time.Local)
	for current.Before(endMonth) || current.Equal(endMonth) {
		tableName := fmt.Sprintf("%s_%d_%02d", prefix, current.Year(), current.Month())
		tables = append(tables, tableName)
		current = current.AddDate(0, 1, 0)
	}
	return tables
}

// EnsureShardTable 确保分表存在，不存在则使用主表
func EnsureShardTable(tableName, fallback string) string {
	if mysql.LogDB.Migrator().HasTable(tableName) {
		return tableName
	}
	return fallback
}

// ==================== AdminUser DAO ====================

// GetAdminUserByUsername 根据用户名查询后台用户
func GetAdminUserByUsername(username string) (*model.AdminUser, error) {
	var user model.AdminUser
	err := mysql.AdminDB.Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetAdminUserByID 根据ID查询后台用户(含角色)
func GetAdminUserByID(id int64) (*model.AdminUser, error) {
	var user model.AdminUser
	err := mysql.AdminDB.Preload("Roles").Where("id = ?", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetAdminUsers 分页查询后台用户列表
func GetAdminUsers(page, pageSize int) ([]model.AdminUser, int64, error) {
	var users []model.AdminUser
	var total int64

	db := mysql.AdminDB.Model(&model.AdminUser{})
	db.Count(&total)

	offset := (page - 1) * pageSize
	err := db.Preload("Roles").
		Order("id DESC").
		Offset(offset).Limit(pageSize).
		Find(&users).Error
	if err != nil {
		return nil, 0, err
	}
	return users, total, nil
}

// UpdateAdminUserLastLogin 更新用户最后登录时间和IP
func UpdateAdminUserLastLogin(id int64, ip string) error {
	return mysql.AdminDB.Model(&model.AdminUser{}).Where("id = ?", id).Updates(map[string]interface{}{
		"last_login_at": time.Now(),
		"last_login_ip": ip,
	}).Error
}

// ==================== Role DAO ====================

// GetRoles 查询所有角色
func GetRoles() ([]model.Role, error) {
	var roles []model.Role
	err := mysql.AdminDB.Preload("Permissions").Where("status = 1").Find(&roles).Error
	return roles, err
}

// GetRoleByID 根据ID查询角色(含权限)
func GetRoleByID(id int64) (*model.Role, error) {
	var role model.Role
	err := mysql.AdminDB.Preload("Permissions").Where("id = ?", id).First(&role).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

// GetRoleByCode 根据code查询角色
func GetRoleByCode(code string) (*model.Role, error) {
	var role model.Role
	err := mysql.AdminDB.Where("code = ?", code).First(&role).Error
	if err != nil {
		return nil, err
	}
	return &role, nil
}

// CreateRole 创建角色
func CreateRole(role *model.Role) error {
	return mysql.AdminDB.Create(role).Error
}

// UpdateRole 更新角色基本信息
func UpdateRole(role *model.Role) error {
	return mysql.AdminDB.Model(role).Updates(map[string]interface{}{
		"name":        role.Name,
		"description": role.Description,
		"status":      role.Status,
	}).Error
}

// DeleteRole 删除角色
func DeleteRole(id int64) error {
	return mysql.AdminDB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("DELETE FROM admin_role_permission WHERE role_id = ?", id).Error; err != nil {
			return err
		}
		if err := tx.Exec("DELETE FROM admin_user_role WHERE role_id = ?", id).Error; err != nil {
			return err
		}
		if err := tx.Delete(&model.Role{}, id).Error; err != nil {
			return err
		}
		return nil
	})
}

// SetRolePermissions 设置角色权限(全量替换)
func SetRolePermissions(roleID int64, permissionIDs []int64) error {
	return mysql.AdminDB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("DELETE FROM admin_role_permission WHERE role_id = ?", roleID).Error; err != nil {
			return err
		}
		if len(permissionIDs) > 0 {
			for _, pid := range permissionIDs {
				if err := tx.Exec("INSERT INTO admin_role_permission (role_id, permission_id) VALUES (?, ?)", roleID, pid).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
}

// AssignAdminUserRoles 设置用户的角色(全量替换)
func AssignAdminUserRoles(userID int64, roleIDs []int64) error {
	return mysql.AdminDB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Exec("DELETE FROM admin_user_role WHERE user_id = ?", userID).Error; err != nil {
			return err
		}
		if len(roleIDs) > 0 {
			for _, rid := range roleIDs {
				if err := tx.Exec("INSERT INTO admin_user_role (user_id, role_id) VALUES (?, ?)", userID, rid).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
}

// ==================== Permission DAO ====================

// GetPermissions 查询所有权限(按sort排序)
func GetPermissions() ([]model.Permission, error) {
	var perms []model.Permission
	err := mysql.AdminDB.Where("status = 1").Order("sort ASC, id ASC").Find(&perms).Error
	return perms, err
}

// GetPermissionsByUserID 获取用户的所有权限code列表
func GetPermissionsByUserID(userID int64) ([]string, error) {
	var codes []string
	err := mysql.AdminDB.Raw(`
		SELECT DISTINCT p.code FROM admin_permission p
		INNER JOIN admin_role_permission rp ON p.id = rp.permission_id
		INNER JOIN admin_user_role ur ON rp.role_id = ur.role_id
		WHERE ur.user_id = ? AND p.status = 1
	`, userID).Pluck("code", &codes).Error
	return codes, err
}

// ==================== GlobalConfig DAO ====================

// GetConfigs 查询所有配置，可按group过滤
func GetConfigs(group string) ([]model.GlobalConfig, error) {
	var configs []model.GlobalConfig
	db := mysql.AdminDB.Model(&model.GlobalConfig{})
	if group != "" {
		db = db.Where("config_group = ?", group)
	}
	err := db.Order("config_group, id ASC").Find(&configs).Error
	return configs, err
}

// GetConfigByID 根据ID查询配置
func GetConfigByID(id int64) (*model.GlobalConfig, error) {
	var config model.GlobalConfig
	err := mysql.AdminDB.Where("id = ?", id).First(&config).Error
	if err != nil {
		return nil, err
	}
	return &config, nil
}

// GetConfigByKey 根据key查询配置
func GetConfigByKey(key string) (*model.GlobalConfig, error) {
	var config model.GlobalConfig
	err := mysql.AdminDB.Where("config_key = ?", key).First(&config).Error
	if err != nil {
		return nil, err
	}
	return &config, nil
}

// UpdateConfig 更新配置
func UpdateConfig(id int64, value, updatedBy string) error {
	return mysql.AdminDB.Model(&model.GlobalConfig{}).Where("id = ?", id).Updates(map[string]interface{}{
		"config_value": value,
		"updated_by":   updatedBy,
	}).Error
}

// ==================== ActivityConfig DAO ====================

// GetActivities 查询活动列表，可按type和status过滤
func GetActivities(actType string, status *int8) ([]model.ActivityConfig, error) {
	var activities []model.ActivityConfig
	db := mysql.AdminDB.Model(&model.ActivityConfig{})
	if actType != "" {
		db = db.Where("type = ?", actType)
	}
	if status != nil {
		db = db.Where("status = ?", *status)
	}
	err := db.Order("id DESC").Find(&activities).Error
	return activities, err
}

// GetActivityByID 根据ID查询活动
func GetActivityByID(id int64) (*model.ActivityConfig, error) {
	var activity model.ActivityConfig
	err := mysql.AdminDB.Where("id = ?", id).First(&activity).Error
	if err != nil {
		return nil, err
	}
	return &activity, nil
}

// CreateActivity 创建活动
func CreateActivity(activity *model.ActivityConfig) error {
	return mysql.AdminDB.Create(activity).Error
}

// UpdateActivity 更新活动
func UpdateActivity(activity *model.ActivityConfig, updates map[string]interface{}) error {
	return mysql.AdminDB.Model(activity).Updates(updates).Error
}

// DeleteActivity 删除活动(软删除-设置status=0)
func DeleteActivity(id int64) error {
	return mysql.AdminDB.Model(&model.ActivityConfig{}).Where("id = ?", id).Update("status", 0).Error
}

// ==================== GM操作日志 DAO (分表) ====================

// CreateGmLog 写入GM操作日志
func CreateGmLog(log *model.GmOperationLog) error {
	tableName := EnsureShardTable(GetGmLogTableName(time.Now()), "gm_operation_log")
	return mysql.LogDB.Table(tableName).Create(log).Error
}

// GetGmLogs 从分表查询GM操作日志
func GetGmLogs(start, end time.Time, page, pageSize int, filters map[string]interface{}) ([]model.GmOperationLog, int64, error) {
	tableName := EnsureShardTable(GetGmLogTableName(start), "gm_operation_log")
	var logs []model.GmOperationLog
	var total int64

	db := mysql.LogDB.Table(tableName)
	if !start.IsZero() && !end.IsZero() {
		db = db.Where("created_at BETWEEN ? AND ?", start, end)
	}
	for k, v := range filters {
		db = db.Where(k, v)
	}
	db.Count(&total)

	offset := (page - 1) * pageSize
	err := db.Order("id DESC").Offset(offset).Limit(pageSize).Find(&logs).Error
	return logs, total, err
}

// GetGmLogsCrossMonth 跨月查询GM操作日志(UNION多个分表)
func GetGmLogsCrossMonth(start, end time.Time, page, pageSize int, filters map[string]interface{}) ([]model.GmOperationLog, int64, error) {
	tableNames := GetMonthTableNames("gm_operation_log", start, end)
	if len(tableNames) == 0 {
		return nil, 0, nil
	}

	// 验证表是否存在
	var validTables []string
	for _, t := range tableNames {
		if mysql.LogDB.Migrator().HasTable(t) {
			validTables = append(validTables, t)
		}
	}
	if len(validTables) == 0 {
		// 回退到主表
		return GetGmLogs(start, end, page, pageSize, filters)
	}

	var logs []model.GmOperationLog
	var total int64

	// 构建UNION ALL查询
	var unionParts []string
	for _, t := range validTables {
		query := fmt.Sprintf("(SELECT * FROM %s WHERE created_at BETWEEN ? AND ?", t)
		for k, v := range filters {
			query += fmt.Sprintf(" AND %s = ?", strings.TrimPrefix(k, "AND "))
			// 需要参数占位，在后面补充
		}
		query += ")"
		unionParts = append(unionParts, query)
	}

	// 使用简单方式：逐表查询后合并排序
	var allLogs []model.GmOperationLog
	for _, t := range validTables {
		db := mysql.LogDB.Table(t)
		db = db.Where("created_at BETWEEN ? AND ?", start, end)
		for k, v := range filters {
			db = db.Where(k, v)
		}
		var tableLogs []model.GmOperationLog
		if err := db.Order("id DESC").Find(&tableLogs).Error; err == nil {
			allLogs = append(allLogs, tableLogs...)
		}
	}

	total = int64(len(allLogs))

	// 内存分页
	startIdx := (page - 1) * pageSize
	endIdx := startIdx + pageSize
	if startIdx > int(total) {
		return nil, total, nil
	}
	if endIdx > int(total) {
		endIdx = int(total)
	}
	logs = allLogs[startIdx:endIdx]

	return logs, total, nil
}

// GetGmLogStats 获取GM日志统计
func GetGmLogStats(start, end time.Time) (map[string]interface{}, error) {
	tableName := EnsureShardTable(GetGmLogTableName(start), "gm_operation_log")

	var totalCount int64
	var todayCount int64
	var highRiskCount int64

	mysql.LogDB.Table(tableName).Where("created_at BETWEEN ? AND ?", start, end).Count(&totalCount)
	mysql.LogDB.Table(tableName).Where("DATE(created_at) = CURDATE()").Count(&todayCount)
	mysql.LogDB.Table(tableName).Where("level >= 3 AND created_at BETWEEN ? AND ?", start, end).Count(&highRiskCount)

	return map[string]interface{}{
		"totalCount":    totalCount,
		"todayCount":    todayCount,
		"highRiskCount": highRiskCount,
	}, nil
}

// ==================== 用户行为日志 DAO (分表) ====================

// CreateUserActionLog 写入用户行为日志
func CreateUserActionLog(log *model.UserActionLog) error {
	tableName := EnsureShardTable(GetUserActionLogTableName(time.Now()), "user_action_log")
	return mysql.LogDB.Table(tableName).Create(log).Error
}

// GetActionLogs 从分表查询用户行为日志
func GetActionLogs(start, end time.Time, page, pageSize int, filters map[string]interface{}) ([]model.UserActionLog, int64, error) {
	tableName := EnsureShardTable(GetUserActionLogTableName(start), "user_action_log")
	var logs []model.UserActionLog
	var total int64

	db := mysql.LogDB.Table(tableName)
	if !start.IsZero() && !end.IsZero() {
		db = db.Where("created_at BETWEEN ? AND ?", start, end)
	}
	for k, v := range filters {
		db = db.Where(k, v)
	}
	db.Count(&total)

	offset := (page - 1) * pageSize
	err := db.Order("id DESC").Offset(offset).Limit(pageSize).Find(&logs).Error
	return logs, total, err
}

// GetActionLogsCrossMonth 跨月查询用户行为日志
func GetActionLogsCrossMonth(start, end time.Time, page, pageSize int, filters map[string]interface{}) ([]model.UserActionLog, int64, error) {
	tableNames := GetMonthTableNames("user_action_log", start, end)
	if len(tableNames) == 0 {
		return nil, 0, nil
	}

	var allLogs []model.UserActionLog
	for _, t := range tableNames {
		if !mysql.LogDB.Migrator().HasTable(t) {
			continue
		}
		db := mysql.LogDB.Table(t)
		db = db.Where("created_at BETWEEN ? AND ?", start, end)
		for k, v := range filters {
			db = db.Where(k, v)
		}
		var tableLogs []model.UserActionLog
		if err := db.Order("id DESC").Find(&tableLogs).Error; err == nil {
			allLogs = append(allLogs, tableLogs...)
		}
	}

	total := int64(len(allLogs))
	startIdx := (page - 1) * pageSize
	endIdx := startIdx + pageSize
	if startIdx > int(total) {
		return nil, total, nil
	}
	if endIdx > int(total) {
		endIdx = int(total)
	}

	return allLogs[startIdx:endIdx], total, nil
}

// GetActionStats 获取用户行为统计(按分类+操作分组)
func GetActionStats(start, end time.Time) ([]model.ActionStats, error) {
	tableName := EnsureShardTable(GetUserActionLogTableName(start), "user_action_log")

	var stats []model.ActionStats
	err := mysql.LogDB.Table(tableName).
		Select("category, action, COUNT(*) as count").
		Where("created_at BETWEEN ? AND ?", start, end).
		Group("category, action").
		Order("count DESC").
		Find(&stats).Error
	return stats, err
}

// GetUserActionCount 获取指定用户的操作次数统计
func GetUserActionCount(userID int64, start, end time.Time) (map[string]int64, error) {
	tableName := EnsureShardTable(GetUserActionLogTableName(start), "user_action_log")

	type countResult struct {
		Category string `gorm:"column:category"`
		Count    int64  `gorm:"column:count"`
	}
	var results []countResult

	err := mysql.LogDB.Table(tableName).
		Select("category, COUNT(*) as count").
		Where("user_id = ? AND created_at BETWEEN ? AND ?", userID, start, end).
		Group("category").
		Find(&results).Error
	if err != nil {
		return nil, err
	}

	counts := make(map[string]int64)
	for _, r := range results {
		counts[r.Category] = r.Count
	}
	return counts, nil
}

// ==================== 战斗日志 DAO (分表) ====================

// CreateBattleLog 写入战斗日志
func CreateBattleLog(log *model.BattleLog) error {
	tableName := EnsureShardTable(GetBattleLogTableName(time.Now()), "battle_log")
	return mysql.LogDB.Table(tableName).Create(log).Error
}

// GetBattleLogs 从分表查询战斗日志
func GetBattleLogs(start, end time.Time, page, pageSize int, filters map[string]interface{}) ([]model.BattleLog, int64, error) {
	tableName := EnsureShardTable(GetBattleLogTableName(start), "battle_log")
	var logs []model.BattleLog
	var total int64

	db := mysql.LogDB.Table(tableName)
	if !start.IsZero() && !end.IsZero() {
		db = db.Where("created_at BETWEEN ? AND ?", start, end)
	}
	for k, v := range filters {
		db = db.Where(k, v)
	}
	db.Count(&total)

	offset := (page - 1) * pageSize
	err := db.Order("id DESC").Offset(offset).Limit(pageSize).Find(&logs).Error
	return logs, total, err
}

// GetBattleLogByBattleID 根据战斗ID查询战斗日志
func GetBattleLogByBattleID(battleID string, t time.Time) (*model.BattleLog, error) {
	tableName := EnsureShardTable(GetBattleLogTableName(t), "battle_log")
	var log model.BattleLog
	err := mysql.LogDB.Table(tableName).Where("battle_id = ?", battleID).First(&log).Error
	if err != nil {
		return nil, err
	}
	return &log, nil
}

// GetBattleLogsByUserID 查询指定用户的战斗记录
func GetBattleLogsByUserID(userID int64, start, end time.Time, page, pageSize int) ([]model.BattleLog, int64, error) {
	return GetBattleLogs(start, end, page, pageSize, map[string]interface{}{
		"user_id": userID,
	})
}

// GetBattleDailyStats 获取每日战斗统计(按类型分组)
func GetBattleDailyStats(start, end time.Time) ([]model.BattleDailyStats, error) {
	tableName := EnsureShardTable(GetBattleLogTableName(start), "battle_log")

	type rawStat struct {
		Date         string  `gorm:"column:date"`
		BattleType   string  `gorm:"column:battle_type"`
		TotalBattles int64   `gorm:"column:total"`
		Wins         int64   `gorm:"column:wins"`
		AvgDuration  float64 `gorm:"column:avg_dur"`
		AvgTurns     float64 `gorm:"column:avg_turns"`
		AvgDamage    float64 `gorm:"column:avg_dmg"`
	}

	var rawStats []rawStat
	err := mysql.LogDB.Table(tableName).
		Select(`DATE(created_at) as date, battle_type,
			COUNT(*) as total,
			SUM(CASE WHEN result = 1 THEN 1 ELSE 0 END) as wins,
			AVG(duration) as avg_dur,
			AVG(turns) as avg_turns,
			AVG(damage_total) as avg_dmg`).
		Where("created_at BETWEEN ? AND ?", start, end).
		Group("DATE(created_at), battle_type").
		Order("date DESC, battle_type").
		Find(&rawStats).Error
	if err != nil {
		return nil, err
	}

	var stats []model.BattleDailyStats
	for _, r := range rawStats {
		winRate := 0.0
		if r.TotalBattles > 0 {
			winRate = float64(r.Wins) / float64(r.TotalBattles) * 100
		}
		stats = append(stats, model.BattleDailyStats{
			Date:         r.Date,
			BattleType:   r.BattleType,
			TotalBattles: r.TotalBattles,
			Wins:         r.Wins,
			WinRate:      winRate,
			AvgDuration:  r.AvgDuration,
			AvgTurns:     r.AvgTurns,
			AvgDamage:    r.AvgDamage,
		})
	}
	return stats, nil
}

// GetHeroPickRate 获取武将使用率统计
func GetHeroPickRate(start, end time.Time, limit int) ([]model.HeroPickRate, error) {
	tableName := EnsureShardTable(GetBattleLogTableName(start), "battle_log")

	type rawPick struct {
		HeroUsed string `gorm:"column:hero_used"`
		Count    int64  `gorm:"column:count"`
	}

	// 简化统计: 通过hero_used字段(逗号分隔的ID列表)统计
	var rawPicks []rawPick
	err := mysql.LogDB.Table(tableName).
		Select("hero_used, COUNT(*) as count").
		Where("created_at BETWEEN ? AND ? AND hero_used != ''", start, end).
		Group("hero_used").
		Order("count DESC").
		Limit(limit).
		Find(&rawPicks).Error
	if err != nil {
		return nil, err
	}

	// 解析武将使用次数
	heroCount := make(map[string]int64)
	for _, rp := range rawPicks {
		heroIDs := strings.Split(rp.HeroUsed, ",")
		perHero := rp.Count / int64(len(heroIDs))
		for _, id := range heroIDs {
			id = strings.TrimSpace(id)
			if id != "" {
				heroCount[id] += perHero
			}
		}
	}

	var pickRates []model.HeroPickRate
	for heroID, count := range heroCount {
		pickRates = append(pickRates, model.HeroPickRate{
			HeroID:   0,
			HeroName: heroID,
			PickRate: count,
		})
	}

	return pickRates, nil
}

// GetBattleTypeStats 获取各战斗类型统计
func GetBattleTypeStats(start, end time.Time) ([]map[string]interface{}, error) {
	tableName := EnsureShardTable(GetBattleLogTableName(start), "battle_log")

	type typeStat struct {
		BattleType   string  `gorm:"column:battle_type"`
		TotalCount   int64   `gorm:"column:total"`
		WinCount     int64   `gorm:"column:wins"`
		AvgDuration  float64 `gorm:"column:avg_dur"`
		AvgPower     float64 `gorm:"column:avg_power"`
		TotalDamage  int64   `gorm:"column:total_dmg"`
	}

	var typeStats []typeStat
	err := mysql.LogDB.Table(tableName).
		Select(`battle_type,
			COUNT(*) as total,
			SUM(CASE WHEN result = 1 THEN 1 ELSE 0 END) as wins,
			AVG(duration) as avg_dur,
			AVG(attacker_power) as avg_power,
			SUM(damage_total) as total_dmg`).
		Where("created_at BETWEEN ? AND ?", start, end).
		Group("battle_type").
		Find(&typeStats).Error
	if err != nil {
		return nil, err
	}

	var result []map[string]interface{}
	for _, ts := range typeStats {
		winRate := 0.0
		if ts.TotalCount > 0 {
			winRate = float64(ts.WinCount) / float64(ts.TotalCount) * 100
		}
		result = append(result, map[string]interface{}{
			"battleType":   ts.BattleType,
			"totalCount":   ts.TotalCount,
			"winCount":     ts.WinCount,
			"winRate":      fmt.Sprintf("%.1f%%", winRate),
			"avgDuration":  fmt.Sprintf("%.1f", ts.AvgDuration),
			"avgPower":     fmt.Sprintf("%.0f", ts.AvgPower),
			"totalDamage":  ts.TotalDamage,
		})
	}
	return result, nil
}

// ==================== 登录日志 DAO (分表) ====================

// GetLoginLogs 从分表查询登录日志
func GetLoginLogs(start, end time.Time, page, pageSize int, filters map[string]interface{}) ([]model.LoginLog, int64, error) {
	// 登录日志按日分表，跨日查询使用UNION
	var allLogs []model.LoginLog

	current := time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, time.Local)
	endDay := time.Date(end.Year(), end.Month(), end.Day(), 0, 0, 0, 0, time.Local)

	for current.Before(endDay) || current.Equal(endDay) {
		tableName := GetLoginLogTableName(current)
		if mysql.LogDB.Migrator().HasTable(tableName) {
			db := mysql.LogDB.Table(tableName)
			if !start.IsZero() && !end.IsZero() {
				db = db.Where("created_at BETWEEN ? AND ?", start, end)
			}
			for k, v := range filters {
				db = db.Where(k, v)
			}
			var dayLogs []model.LoginLog
			if err := db.Order("id DESC").Find(&dayLogs).Error; err == nil {
				allLogs = append(allLogs, dayLogs...)
			}
		}
		current = current.AddDate(0, 0, 1)

		// 防止无限循环，最多查90天
		if len(allLogs) > 10000 {
			break
		}
	}

	total := int64(len(allLogs))
	startIdx := (page - 1) * pageSize
	endIdx := startIdx + pageSize
	if startIdx > int(total) {
		return nil, total, nil
	}
	if endIdx > int(total) {
		endIdx = int(total)
	}

	return allLogs[startIdx:endIdx], total, nil
}

// CreateLoginLog 写入登录日志
func CreateLoginLog(log *model.LoginLog) error {
	tableName := GetLoginLogTableName(time.Now())
	if !mysql.LogDB.Migrator().HasTable(tableName) {
		// 自动创建当日分表
		mysql.LogDB.Exec(fmt.Sprintf("CREATE TABLE IF NOT EXISTS %s LIKE login_log", tableName))
	}
	return mysql.LogDB.Table(tableName).Create(log).Error
}

// ==================== Order DAO (分表) ====================

// GetOrdersFromShard 从指定分表查询订单
func GetOrdersFromShard(tableName string, page, pageSize int, filters map[string]interface{}) ([]model.Order, int64, error) {
	var orders []model.Order
	var total int64

	db := mysql.LogDB.Table(tableName)
	for k, v := range filters {
		db = db.Where(k, v)
	}
	db.Count(&total)

	offset := (page - 1) * pageSize
	err := db.Order("created_at DESC").Offset(offset).Limit(pageSize).Find(&orders).Error
	return orders, total, err
}

// GetOrderByNo 从指定分表根据订单号查询
func GetOrderByNo(tableName, orderNo string) (*model.Order, error) {
	var order model.Order
	err := mysql.LogDB.Table(tableName).Where("order_no = ?", orderNo).First(&order).Error
	if err != nil {
		return nil, err
	}
	return &order, nil
}

// UpdateOrderStatus 更新指定分表中的订单状态
func UpdateOrderStatus(tableName, orderNo string, status int8, statusText string) error {
	updates := map[string]interface{}{
		"status":      status,
		"status_text": statusText,
	}
	if status == 1 {
		updates["paid_at"] = time.Now()
	}
	if status == 2 {
		updates["delivered_at"] = time.Now()
	}
	return mysql.LogDB.Table(tableName).Where("order_no = ?", orderNo).Updates(updates).Error
}

// GetOrderStats 获取指定分表的订单统计
func GetOrderStats(tableName string) (map[string]interface{}, error) {
	var totalOrders int64
	var totalRevenue int64
	var paidOrders int64

	mysql.LogDB.Table(tableName).Count(&totalOrders)
	mysql.LogDB.Table(tableName).Where("status IN (1, 2)").Count(&paidOrders)
	mysql.LogDB.Table(tableName).Where("status IN (1, 2)").Select("COALESCE(SUM(amount), 0)").Scan(&totalRevenue)

	return map[string]interface{}{
		"totalOrders":  totalOrders,
		"paidOrders":   paidOrders,
		"totalRevenue": totalRevenue,
	}, nil
}

// ListOrderShardTables 列出所有订单分表
func ListOrderShardTables() ([]string, error) {
	var tables []string
	err := mysql.LogDB.Raw("SHOW TABLES LIKE 'orders_%'").Scan(&tables).Error
	return tables, err
}
