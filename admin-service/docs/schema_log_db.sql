-- ============================================================
-- 九州争鼎 Log Database Schema
-- Database: log_db
-- Description: 日志与订单数据库 - 支持按月/日分表
-- ============================================================

CREATE DATABASE IF NOT EXISTS log_db;
USE log_db;

-- GM操作日志 (按月分表)
CREATE TABLE gm_operation_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  operator_id BIGINT NOT NULL,
  operator_name VARCHAR(50) NOT NULL,
  target_id BIGINT NOT NULL,
  target_type VARCHAR(30) NOT NULL,
  action VARCHAR(50) NOT NULL,
  detail TEXT,
  ip VARCHAR(45) DEFAULT '',
  created_at DATETIME DEFAULT NOW(),
  INDEX idx_operator (operator_id),
  INDEX idx_target (target_id, target_type),
  INDEX idx_created (created_at),
  INDEX idx_action (action)
);

-- 用户行为日志 (按月分表)
CREATE TABLE user_action_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  uid VARCHAR(30) NOT NULL,
  action VARCHAR(50) NOT NULL,
  detail TEXT,
  ip VARCHAR(45) DEFAULT '',
  created_at DATETIME DEFAULT NOW(),
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- 登录日志 (按日分表)
CREATE TABLE login_log (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  nickname VARCHAR(50) DEFAULT '',
  ip VARCHAR(45) DEFAULT '',
  device VARCHAR(100) DEFAULT '',
  channel VARCHAR(30) DEFAULT '',
  status TINYINT DEFAULT 1 COMMENT '1=success 0=fail',
  created_at DATETIME DEFAULT NOW(),
  INDEX idx_user_time (user_id, created_at),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- 分表: 支付订单 (按月分表)
-- 命名规则: orders_YYYY_MM
-- ============================================================

CREATE TABLE orders_2025_07 (
  order_no VARCHAR(64) PRIMARY KEY,
  user_id BIGINT NOT NULL,
  product_type VARCHAR(20) NOT NULL,
  product_name VARCHAR(100) NOT NULL,
  amount INT NOT NULL COMMENT '金额(分)',
  diamond INT NOT NULL DEFAULT 0,
  bonus INT NOT NULL DEFAULT 0,
  status TINYINT DEFAULT 0 COMMENT '0待付1已付2已发3退4关',
  status_text VARCHAR(20) DEFAULT '',
  pay_method VARCHAR(30) DEFAULT '',
  trade_no VARCHAR(128) DEFAULT '',
  paid_at DATETIME,
  delivered_at DATETIME,
  created_at DATETIME DEFAULT NOW(),
  INDEX idx_user_status (user_id, status),
  INDEX idx_created (created_at),
  INDEX idx_status (status),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB;

CREATE TABLE orders_2025_08 LIKE orders_2025_07;

CREATE TABLE orders_2025_09 LIKE orders_2025_07;

-- ============================================================
-- 分表存储过程: 自动创建下月订单表
-- 建议通过 cron 每月28号执行
-- ============================================================

DELIMITER //
CREATE PROCEDURE create_monthly_order_table(IN target_month VARCHAR(7))
BEGIN
  DECLARE tbl_name VARCHAR(64);
  SET tbl_name = CONCAT('orders_', target_month);
  SET @sql = CONCAT(
    'CREATE TABLE IF NOT EXISTS ', tbl_name, ' LIKE orders_2025_07'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END //
DELIMITER ;

-- ============================================================
-- 分表存储过程: 自动创建按月GM日志分表
-- ============================================================

DELIMITER //
CREATE PROCEDURE create_monthly_gm_log_table(IN target_month VARCHAR(7))
BEGIN
  DECLARE tbl_name VARCHAR(64);
  SET tbl_name = CONCAT('gm_operation_log_', target_month);
  SET @sql = CONCAT(
    'CREATE TABLE IF NOT EXISTS ', tbl_name, ' LIKE gm_operation_log'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END //
DELIMITER ;

-- ============================================================
-- 分表存储过程: 自动创建按月用户行为日志分表
-- ============================================================

DELIMITER //
CREATE PROCEDURE create_monthly_user_action_log_table(IN target_month VARCHAR(7))
BEGIN
  DECLARE tbl_name VARCHAR(64);
  SET tbl_name = CONCAT('user_action_log_', target_month);
  SET @sql = CONCAT(
    'CREATE TABLE IF NOT EXISTS ', tbl_name, ' LIKE user_action_log'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END //
DELIMITER ;

-- ============================================================
-- 分表存储过程: 自动创建按日登录日志分表
-- ============================================================

DELIMITER //
CREATE PROCEDURE create_daily_login_log_table(IN target_day VARCHAR(10))
BEGIN
  DECLARE tbl_name VARCHAR(64);
  SET tbl_name = CONCAT('login_log_', REPLACE(target_day, '-', '_'));
  SET @sql = CONCAT(
    'CREATE TABLE IF NOT EXISTS ', tbl_name, ' LIKE login_log'
  );
  PREPARE stmt FROM @sql;
  EXECUTE stmt;
  DEALLOCATE PREPARE stmt;
END //
DELIMITER ;
