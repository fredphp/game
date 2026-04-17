-- ============================================================
-- 九州争鼎 Log Database Schema (Enhanced)
-- Database: log_db
-- Description: 日志与订单数据库 - 支持按月/日分表
-- 三大日志体系: 用户行为日志、战斗日志、GM操作日志
-- ============================================================

CREATE DATABASE IF NOT EXISTS log_db;
USE log_db;

-- ============================================================
-- 1. 用户行为日志 (按月分表)
-- 记录用户在游戏中的所有关键操作行为
-- ============================================================
CREATE TABLE user_action_log (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT NOT NULL,
  uid         VARCHAR(30) NOT NULL,
  nickname    VARCHAR(50) DEFAULT '',
  category    VARCHAR(30) NOT NULL COMMENT '行为大类: battle/gacha/trade/social/system/guild/map',
  action      VARCHAR(50) NOT NULL COMMENT '具体行为: login/logout/gacha_draw/battle_win/...',
  detail      TEXT COMMENT '行为详情(JSON格式)',
  extra_data  JSON DEFAULT NULL COMMENT '扩展数据(JSON)',
  ip          VARCHAR(45) DEFAULT '',
  device      VARCHAR(100) DEFAULT '',
  server_id   INT DEFAULT 0,
  created_at  DATETIME DEFAULT NOW(),
  INDEX idx_user (user_id),
  INDEX idx_uid (uid),
  INDEX idx_category (category),
  INDEX idx_action (action),
  INDEX idx_created (created_at),
  INDEX idx_category_action (category, action),
  INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB COMMENT='用户行为日志(按月分表)';

-- ============================================================
-- 2. 战斗日志 (按月分表)
-- 记录所有PVE/PVP战斗的详细过程和结果
-- ============================================================
CREATE TABLE battle_log (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  battle_id       VARCHAR(64) NOT NULL COMMENT '战斗唯一ID',
  user_id         BIGINT NOT NULL,
  uid             VARCHAR(30) NOT NULL,
  nickname        VARCHAR(50) DEFAULT '',
  battle_type     VARCHAR(20) NOT NULL COMMENT '战斗类型: pve/pvp/arena/siege/world_boss',
  stage_id        INT DEFAULT 0 COMMENT '关卡ID(PVE)',
  difficulty      TINYINT DEFAULT 1 COMMENT '难度1-5',
  attacker_power  INT DEFAULT 0 COMMENT '攻击方战力',
  defender_id     BIGINT DEFAULT 0 COMMENT '防守方用户ID(PVP)',
  defender_name   VARCHAR(50) DEFAULT '',
  defender_power  INT DEFAULT 0 COMMENT '防守方战力',
  result          TINYINT DEFAULT 0 COMMENT '0失败 1胜利 2平局',
  star_rating     TINYINT DEFAULT 0 COMMENT '星级评价0-3',
  turns           INT DEFAULT 0 COMMENT '战斗回合数',
  duration        INT DEFAULT 0 COMMENT '战斗耗时(秒)',
  hero_used       VARCHAR(500) DEFAULT '' COMMENT '上阵武将ID列表(逗号分隔)',
  hero_detail     JSON DEFAULT NULL COMMENT '武将详细数据(JSON数组)',
  reward_json     JSON DEFAULT NULL COMMENT '奖励数据(JSON)',
  damage_total    INT DEFAULT 0 COMMENT '总输出伤害',
  damage_taken    INT DEFAULT 0 COMMENT '总承受伤害',
  heal_total      INT DEFAULT 0 COMMENT '总治疗量',
  skill_casts     INT DEFAULT 0 COMMENT '技能释放次数',
  ip              VARCHAR(45) DEFAULT '',
  server_id       INT DEFAULT 0,
  created_at      DATETIME DEFAULT NOW(),
  UNIQUE INDEX idx_battle_id (battle_id),
  INDEX idx_user (user_id),
  INDEX idx_user_created (user_id, created_at),
  INDEX idx_type (battle_type),
  INDEX idx_result (result),
  INDEX idx_created (created_at),
  INDEX idx_stage (stage_id),
  INDEX idx_defender (defender_id),
  INDEX idx_type_result (battle_type, result),
  INDEX idx_power (attacker_power)
) ENGINE=InnoDB COMMENT='战斗日志(按月分表)';

-- ============================================================
-- 3. GM操作日志 (按月分表)
-- 记录后台管理人员的所有关键操作
-- ============================================================
CREATE TABLE gm_operation_log (
  id            BIGINT PRIMARY KEY AUTO_INCREMENT,
  operator_id   BIGINT NOT NULL,
  operator_name VARCHAR(50) NOT NULL,
  target_id     BIGINT NOT NULL,
  target_type   VARCHAR(30) NOT NULL COMMENT '目标类型: user/guild/order/card_pool/hero/config/map/activity',
  action        VARCHAR(50) NOT NULL COMMENT '操作: ban/unban/modify_resources/refund/create/edit/delete/...',
  detail        TEXT,
  before_data   JSON DEFAULT NULL COMMENT '操作前数据(JSON)',
  after_data    JSON DEFAULT NULL COMMENT '操作后数据(JSON)',
  level         TINYINT DEFAULT 1 COMMENT '风险等级: 1=低 2=中 3=高 4=危险',
  result        TINYINT DEFAULT 1 COMMENT '操作结果: 0=失败 1=成功',
  ip            VARCHAR(45) DEFAULT '',
  user_agent    VARCHAR(255) DEFAULT '',
  created_at    DATETIME DEFAULT NOW(),
  INDEX idx_operator (operator_id),
  INDEX idx_target (target_id, target_type),
  INDEX idx_action (action),
  INDEX idx_level (level),
  INDEX idx_created (created_at),
  INDEX idx_operator_created (operator_id, created_at),
  INDEX idx_action_created (action, created_at)
) ENGINE=InnoDB COMMENT='GM操作日志(按月分表)';

-- ============================================================
-- 4. 登录日志 (按日分表)
-- ============================================================
CREATE TABLE login_log (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT NOT NULL,
  nickname    VARCHAR(50) DEFAULT '',
  ip          VARCHAR(45) DEFAULT '',
  device      VARCHAR(100) DEFAULT '',
  channel     VARCHAR(30) DEFAULT '',
  os_version  VARCHAR(50) DEFAULT '',
  app_version VARCHAR(30) DEFAULT '',
  status      TINYINT DEFAULT 1 COMMENT '1=success 0=fail',
  fail_reason VARCHAR(100) DEFAULT '' COMMENT '失败原因',
  created_at  DATETIME DEFAULT NOW(),
  INDEX idx_user_time (user_id, created_at),
  INDEX idx_created (created_at),
  INDEX idx_ip (ip),
  INDEX idx_channel (channel)
) ENGINE=InnoDB COMMENT='登录日志(按日分表)';

-- ============================================================
-- 5. 行为分类参考表
-- ============================================================
CREATE TABLE action_category (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  category    VARCHAR(30) NOT NULL UNIQUE,
  name        VARCHAR(50) NOT NULL COMMENT '分类中文名',
  description VARCHAR(200) DEFAULT '',
  actions     JSON DEFAULT NULL COMMENT '该分类下的所有action列表',
  is_monitored TINYINT DEFAULT 0 COMMENT '是否监控告警',
  created_at  DATETIME DEFAULT NOW()
) ENGINE=InnoDB COMMENT='行为分类参考表';

-- 插入行为分类初始数据
INSERT INTO action_category (category, name, description, actions, is_monitored) VALUES
('battle', '战斗', '所有战斗相关行为', '["pve_battle","pvp_battle","arena_battle","siege_battle","world_boss","battle_result","battle_replay"]', 1),
('gacha', '抽卡', '所有抽卡相关行为', '["gacha_single","gacha_ten","gacha_history","pity_trigger"]', 1),
('trade', '交易', '所有交易和资源相关行为', '["purchase","consume","gift","exchange","market"]', 1),
('social', '社交', '所有社交互动行为', '["chat","friend_add","friend_remove","guild_join","guild_leave","mail_send"]', 0),
('system', '系统', '系统功能使用行为', '["login","logout","register","settings","bind_phone","feedback"]', 0),
('guild', '联盟', '联盟相关行为', '["guild_create","guild_donate","guild_tech","guild_war","guild_march"]', 0),
('map', '地图', '地图和城池相关行为', '["march_start","march_arrive","city_attack","city_defend","collect_resource"]', 0);

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
-- 分表初始化: 当月分表
-- ============================================================
CREATE TABLE user_action_log_2025_07 LIKE user_action_log;
CREATE TABLE battle_log_2025_07 LIKE battle_log;
CREATE TABLE gm_operation_log_2025_07 LIKE gm_operation_log;

-- ============================================================
-- 分表存储过程: 自动创建下月所有日志分表
-- 建议通过 cron 每月28号执行
-- ============================================================

DELIMITER //
CREATE PROCEDURE create_all_monthly_tables(IN target_month VARCHAR(7))
BEGIN
  -- 订单分表
  DECLARE order_tbl VARCHAR(64);
  SET order_tbl = CONCAT('orders_', target_month);
  SET @sql = CONCAT('CREATE TABLE IF NOT EXISTS ', order_tbl, ' LIKE orders_2025_07');
  PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

  -- 用户行为日志分表
  DECLARE action_tbl VARCHAR(64);
  SET action_tbl = CONCAT('user_action_log_', target_month);
  SET @sql = CONCAT('CREATE TABLE IF NOT EXISTS ', action_tbl, ' LIKE user_action_log');
  PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

  -- 战斗日志分表
  DECLARE battle_tbl VARCHAR(64);
  SET battle_tbl = CONCAT('battle_log_', target_month);
  SET @sql = CONCAT('CREATE TABLE IF NOT EXISTS ', battle_tbl, ' LIKE battle_log');
  PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

  -- GM操作日志分表
  DECLARE gm_tbl VARCHAR(64);
  SET gm_tbl = CONCAT('gm_operation_log_', target_month);
  SET @sql = CONCAT('CREATE TABLE IF NOT EXISTS ', gm_tbl, ' LIKE gm_operation_log');
  PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
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

-- ============================================================
-- 跨月查询视图: 合并最近3个月GM日志 (示例)
-- ============================================================
CREATE OR REPLACE VIEW v_gm_log_recent AS
SELECT '2025-07' AS shard, * FROM gm_operation_log_2025_07
UNION ALL
SELECT '2025-06' AS shard, * FROM gm_operation_log_2025_06
UNION ALL
SELECT '2025-05' AS shard, * FROM gm_operation_log_2025_05;

-- ============================================================
-- 数据归档存储过程: 将90天前的分表导出并可选删除
-- ============================================================

DELIMITER //
CREATE PROCEDURE archive_old_shards(IN months_to_keep INT)
BEGIN
  -- 查找需要归档的月份分表(保留最近N个月)
  -- 实际生产中应配合文件导出逻辑
  SELECT CONCAT('Archive tables older than ', months_to_keep, ' months') AS info;
END //
DELIMITER ;

-- ============================================================
-- 常用查询: 战斗统计 (按月分表需替换表名)
-- ============================================================

-- 每日战斗统计
-- SELECT DATE(created_at) as date, battle_type, COUNT(*) as total,
--        SUM(CASE WHEN result=1 THEN 1 ELSE 0 END) as wins,
--        ROUND(SUM(CASE WHEN result=1 THEN 1 ELSE 0 END)/COUNT(*)*100, 1) as win_rate,
--        AVG(duration) as avg_duration, AVG(turns) as avg_turns
-- FROM battle_log_2025_07
-- GROUP BY DATE(created_at), battle_type
-- ORDER BY date DESC;

-- 武将使用率统计
-- SELECT hero_id, hero_name, COUNT(*) as pick_rate
-- FROM battle_log_2025_07, JSON_TABLE(hero_detail, '$[*]' COLUMNS (
--   hero_id INT PATH '$.id',
--   hero_name VARCHAR(50) PATH '$.name'
-- )) AS heroes
-- GROUP BY hero_id, hero_name
-- ORDER BY pick_rate DESC LIMIT 20;
