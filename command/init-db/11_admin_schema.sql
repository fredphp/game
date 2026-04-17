-- ============================================================
-- 九州争鼎 Admin Database Schema
-- Database: admin_db
-- Description: 后台管理系统数据库 - RBAC权限、全局配置、活动配置
-- ============================================================

CREATE DATABASE IF NOT EXISTS admin_db;
USE admin_db;

-- 1. admin_user (后台用户)
CREATE TABLE admin_user (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL COMMENT 'bcrypt hash',
  real_name VARCHAR(50) DEFAULT '',
  email VARCHAR(100) DEFAULT '',
  phone VARCHAR(20) DEFAULT '',
  avatar VARCHAR(255) DEFAULT '',
  status TINYINT DEFAULT 1 COMMENT '1=启用 0=禁用',
  last_login_at DATETIME,
  last_login_ip VARCHAR(45) DEFAULT '',
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  INDEX idx_username (username),
  INDEX idx_status (status)
);

-- 2. admin_role
CREATE TABLE admin_role (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  description VARCHAR(200) DEFAULT '',
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  INDEX idx_code (code)
);

-- 3. admin_permission
CREATE TABLE admin_permission (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) NOT NULL,
  code VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL COMMENT 'menu/button/api',
  parent_id BIGINT DEFAULT 0,
  path VARCHAR(200) DEFAULT '',
  icon VARCHAR(50) DEFAULT '',
  sort INT DEFAULT 0,
  status TINYINT DEFAULT 1,
  created_at DATETIME DEFAULT NOW()
);

-- 4. admin_role_permission (RBAC mapping)
CREATE TABLE admin_role_permission (
  role_id BIGINT NOT NULL,
  permission_id BIGINT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  INDEX idx_role (role_id),
  INDEX idx_permission (permission_id)
);

-- 5. admin_user_role (user-role mapping)
CREATE TABLE admin_user_role (
  user_id BIGINT NOT NULL,
  role_id BIGINT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  INDEX idx_user (user_id),
  INDEX idx_role (role_id)
);

-- 6. global_config (配置中心)
CREATE TABLE global_config (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_name VARCHAR(100) NOT NULL,
  config_value TEXT NOT NULL,
  value_type VARCHAR(20) DEFAULT 'string' COMMENT 'string/number/boolean/json',
  config_group VARCHAR(50) DEFAULT 'global',
  description VARCHAR(500) DEFAULT '',
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  updated_by VARCHAR(50) DEFAULT '',
  INDEX idx_group (config_group),
  INDEX idx_key (config_key)
);

-- 7. activity_config (活动配置)
CREATE TABLE activity_config (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(30) NOT NULL COMMENT 'gacha/war/growth/festival/guild',
  description TEXT,
  start_time DATETIME NOT NULL,
  end_time DATETIME NOT NULL,
  rewards_json JSON NOT NULL,
  status TINYINT DEFAULT 1 COMMENT '1=active 0=inactive',
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  INDEX idx_type_status (type, status),
  INDEX idx_time (start_time, end_time)
);

-- ============================================================
-- Initial Data
-- ============================================================

-- Insert default super admin (password: admin123 bcrypt hash)
INSERT INTO admin_user (username, password_hash, real_name, email, phone, status) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '超级管理员', 'admin@jiuzhou.com', '13800000000', 1);

-- Insert default roles
INSERT INTO admin_role (name, code, description) VALUES
('超级管理员', 'super_admin', '拥有所有权限'),
('运营管理员', 'ops_admin', '游戏运营相关功能'),
('客服', 'customer_service', '处理用户问题'),
('数据分析师', 'data_analyst', '查看数据报表'),
('游戏策划', 'game_designer', '管理卡池、活动、配置');

-- Assign super admin role to default user
INSERT INTO admin_user_role (user_id, role_id) VALUES (1, 1);

-- Insert default permissions (menu tree)
INSERT INTO admin_permission (name, code, type, parent_id, path, icon, sort) VALUES
('仪表盘', 'dashboard', 'menu', 0, '/dashboard', 'DashboardOutlined', 1),
('用户管理', 'user_manage', 'menu', 0, '/users', 'UserOutlined', 2),
('卡池管理', 'card_pool', 'menu', 0, '/card-pools', 'AppstoreOutlined', 3),
('英雄管理', 'hero_manage', 'menu', 0, '/heroes', 'StarOutlined', 4),
('地图管理', 'map_manage', 'menu', 0, '/map', 'GlobalOutlined', 5),
('公会管理', 'guild_manage', 'menu', 0, '/guilds', 'TeamOutlined', 6),
('充值管理', 'payment', 'menu', 0, '/payment', 'PayCircleOutlined', 7),
('数据分析', 'analytics', 'menu', 0, '/analytics', 'BarChartOutlined', 8),
('日志查看', 'logs', 'menu', 0, '/logs', 'FileTextOutlined', 9),
('配置中心', 'config_center', 'menu', 0, '/configs', 'SettingOutlined', 10),
('活动管理', 'activity', 'menu', 0, '/activities', 'CalendarOutlined', 11),
('系统管理', 'system', 'menu', 0, '/system', 'ToolOutlined', 12),
('用户封禁', 'user_ban', 'button', 2, '', '', 1),
('资源修改', 'user_resources', 'button', 2, '', '', 2),
('卡池创建', 'card_pool_create', 'button', 3, '', '', 1),
('卡池编辑', 'card_pool_edit', 'button', 3, '', '', 2),
('英雄创建', 'hero_create', 'button', 4, '', '', 1),
('地图重置', 'map_reset', 'button', 5, '', '', 1),
('公会解散', 'guild_disband', 'button', 6, '', '', 1),
('退款操作', 'order_refund', 'button', 7, '', '', 1),
('手动发货', 'order_deliver', 'button', 7, '', '', 2),
('GM操作日志', 'gm_log', 'api', 9, '', '', 1),
('登录日志', 'login_log', 'api', 9, '', '', 2),
('行为日志', 'action_log', 'api', 9, '', '', 3),
('角色管理', 'role_manage', 'menu', 12, '/system/roles', '', 1),
('管理员管理', 'admin_manage', 'menu', 12, '/system/admins', '', 2);

-- Assign all permissions to super_admin role
INSERT INTO admin_role_permission (role_id, permission_id)
SELECT 1, id FROM admin_permission;
