// Package dao 提供九州争鼎后台管理服务的数据访问层。
// 基于GORM v2，包含admin_db和log_db的所有CRUD操作，以及分表辅助函数。
package dao

import (
        "fmt"
        "time"

        "admin-service/internal/model"
        "admin-service/pkg/mysql"

        "gorm.io/gorm"
)

// ==================== 分表工具函数 ====================

// GetOrderTableName 根据时间获取订单分表名
// 订单按月分表: orders_YYYY_MM
func GetOrderTableName(t time.Time) string {
        return fmt.Sprintf("orders_%d_%02d", t.Year(), t.Month())
}

// GetGmLogTableName 根据时间获取GM操作日志分表名
// GM日志按月分表: gm_operation_log_YYYY_MM
func GetGmLogTableName(t time.Time) string {
        return fmt.Sprintf("gm_operation_log_%d_%02d", t.Year(), t.Month())
}

// GetUserActionLogTableName 根据时间获取用户行为日志分表名
// 行为日志按月分表: user_action_log_YYYY_MM
func GetUserActionLogTableName(t time.Time) string {
        return fmt.Sprintf("user_action_log_%d_%02d", t.Year(), t.Month())
}

// GetLoginLogTableName 根据时间获取登录日志分表名
// 登录日志按日分表: login_log_YYYY_MM_DD
func GetLoginLogTableName(t time.Time) string {
        return fmt.Sprintf("login_log_%d_%02d_%02d", t.Year(), t.Month(), t.Day())
}

// ParseMonthTableName 从分表名中解析出月份
// 返回该月的第一天和最后一天
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
                // 删除角色-权限关联
                if err := tx.Exec("DELETE FROM admin_role_permission WHERE role_id = ?", id).Error; err != nil {
                        return err
                }
                // 删除角色-用户关联
                if err := tx.Exec("DELETE FROM admin_user_role WHERE role_id = ?", id).Error; err != nil {
                        return err
                }
                // 删除角色
                if err := tx.Delete(&model.Role{}, id).Error; err != nil {
                        return err
                }
                return nil
        })
}

// SetRolePermissions 设置角色权限(全量替换)
func SetRolePermissions(roleID int64, permissionIDs []int64) error {
        return mysql.AdminDB.Transaction(func(tx *gorm.DB) error {
                // 先清空旧关联
                if err := tx.Exec("DELETE FROM admin_role_permission WHERE role_id = ?", roleID).Error; err != nil {
                        return err
                }
                // 批量插入新关联
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
                // 清空旧关联
                if err := tx.Exec("DELETE FROM admin_user_role WHERE user_id = ?", userID).Error; err != nil {
                        return err
                }
                // 批量插入
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

// ==================== Log DAO (分表) ====================

// GetGmLogs 从分表查询GM操作日志
func GetGmLogs(start, end time.Time, page, pageSize int) ([]model.GmOperationLog, int64, error) {
        tableName := GetGmLogTableName(start)
        var logs []model.GmOperationLog
        var total int64

        // 确保表存在，不存在则使用主表
        if !mysql.LogDB.Migrator().HasTable(tableName) {
                tableName = "gm_operation_log"
        }

        db := mysql.LogDB.Table(tableName)
        if !start.IsZero() && !end.IsZero() {
                db = db.Where("created_at BETWEEN ? AND ?", start, end)
        }
        db.Count(&total)

        offset := (page - 1) * pageSize
        err := db.Order("id DESC").Offset(offset).Limit(pageSize).Find(&logs).Error
        return logs, total, err
}

// CreateGmLog 写入GM操作日志
func CreateGmLog(log *model.GmOperationLog) error {
        tableName := GetGmLogTableName(time.Now())
        if !mysql.LogDB.Migrator().HasTable(tableName) {
                tableName = "gm_operation_log"
        }
        return mysql.LogDB.Table(tableName).Create(log).Error
}

// GetLoginLogs 从分表查询登录日志
func GetLoginLogs(start, end time.Time, page, pageSize int) ([]model.LoginLog, int64, error) {
        // 登录日志按日分表，这里使用主表查询(跨日)
        var logs []model.LoginLog
        var total int64

        db := mysql.LogDB.Model(&model.LoginLog{})
        if !start.IsZero() && !end.IsZero() {
                db = db.Where("created_at BETWEEN ? AND ?", start, end)
        }
        db.Count(&total)

        offset := (page - 1) * pageSize
        err := db.Order("id DESC").Offset(offset).Limit(pageSize).Find(&logs).Error
        return logs, total, err
}

// GetActionLogs 从分表查询用户行为日志
func GetActionLogs(start, end time.Time, action string, page, pageSize int) ([]model.UserActionLog, int64, error) {
        tableName := GetUserActionLogTableName(start)
        var logs []model.UserActionLog
        var total int64

        if !mysql.LogDB.Migrator().HasTable(tableName) {
                tableName = "user_action_log"
        }

        db := mysql.LogDB.Table(tableName)
        if !start.IsZero() && !end.IsZero() {
                db = db.Where("created_at BETWEEN ? AND ?", start, end)
        }
        if action != "" {
                db = db.Where("action = ?", action)
        }
        db.Count(&total)

        offset := (page - 1) * pageSize
        err := db.Order("id DESC").Offset(offset).Limit(pageSize).Find(&logs).Error
        return logs, total, err
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
                "totalOrders": totalOrders,
                "paidOrders":  paidOrders,
                "totalRevenue": totalRevenue, // 分
        }, nil
}

// ListOrderShardTables 列出所有订单分表
func ListOrderShardTables() ([]string, error) {
        var tables []string
        err := mysql.LogDB.Raw("SHOW TABLES LIKE 'orders_%'").Scan(&tables).Error
        return tables, err
}
