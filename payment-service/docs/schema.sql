-- ============================================================
-- 九州争鼎 - 支付系统数据库表结构
-- Database: jiuzhou  |  Engine: InnoDB  |  Charset: utf8mb4
-- ============================================================

USE `jiuzhou`;

-- ─────────────────────────────────────────────────────
-- 充值订单表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `payment_orders`;
CREATE TABLE `payment_orders` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '订单ID',
    `order_no`        VARCHAR(64)  NOT NULL                COMMENT '订单号(业务唯一)',
    `user_id`         BIGINT       NOT NULL                COMMENT '用户ID',
    `product_type`    TINYINT      NOT NULL                COMMENT '商品类型 1=钻石充值 2=月卡 3=礼包 4=VIP礼包',
    `product_key`     VARCHAR(32)  NOT NULL DEFAULT ''      COMMENT '商品标识 recharge_6/gift_starter 等',
    `product_name`    VARCHAR(64)  NOT NULL                COMMENT '商品名称',
    `amount`          INT          NOT NULL DEFAULT 0      COMMENT '支付金额(分)',
    `amount_yuan`     DECIMAL(10,2) NOT NULL DEFAULT 0    COMMENT '支付金额(元)',
    `currency`        VARCHAR(8)   NOT NULL DEFAULT 'CNY' COMMENT '货币 CNY/USD',
    `channel`         VARCHAR(16)  NOT NULL DEFAULT ''      COMMENT '支付渠道 wechat/alipay/appstore',
    `channel_trade_no` VARCHAR(128) DEFAULT ''             COMMENT '第三方交易号',
    `status`          TINYINT      NOT NULL DEFAULT 0      COMMENT '0=待支付 1=已支付 2=已发货 3=已关闭 4=已退款',
    `ip`              VARCHAR(45)  DEFAULT ''              COMMENT '下单IP',
    `device_id`       VARCHAR(64)  DEFAULT ''              COMMENT '设备ID',
    `paid_at`         DATETIME     DEFAULT NULL            COMMENT '支付时间',
    `delivered_at`    DATETIME     DEFAULT NULL            COMMENT '发货时间',
    `closed_at`       DATETIME     DEFAULT NULL            COMMENT '关闭时间',
    `expire_at`       DATETIME     NOT NULL                COMMENT '过期时间',
    `retry_count`     TINYINT      NOT NULL DEFAULT 0      COMMENT '回调重试次数',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_order_no` (`order_no`),
    KEY `idx_user_id`     (`user_id`),
    KEY `idx_user_status` (`user_id`, `status`),
    KEY `idx_status_time` (`status`, `created_at`),
    KEY `idx_channel_trade` (`channel_trade_no`),
    KEY `idx_expire`       (`expire_at`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='充值订单表';

-- ─────────────────────────────────────────────────────
-- 支付回调日志表（防重放）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `payment_callbacks`;
CREATE TABLE `payment_callbacks` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `callback_id`     VARCHAR(128) NOT NULL                COMMENT '回调唯一ID(第三方notify_id)',
    `order_no`        VARCHAR(64)  NOT NULL                COMMENT '关联订单号',
    `channel`         VARCHAR(16)  NOT NULL                COMMENT '支付渠道',
    `raw_data`        TEXT         NOT NULL                COMMENT '原始回调数据',
    `signature`       VARCHAR(256) DEFAULT ''             COMMENT '签名',
    `status`          TINYINT      NOT NULL DEFAULT 0      COMMENT '0=待处理 1=成功 2=失败',
    `retry_count`     TINYINT      NOT NULL DEFAULT 0      COMMENT '重试次数',
    `processed_at`    DATETIME     DEFAULT NULL            COMMENT '处理时间',
    `error_msg`       VARCHAR(256) DEFAULT ''             COMMENT '错误信息',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_callback_id` (`callback_id`),
    KEY `idx_order_no`    (`order_no`),
    KEY `idx_status`      (`status`),
    KEY `idx_created`     (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='支付回调日志表';

-- ─────────────────────────────────────────────────────
-- 月卡用户表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `user_monthly_cards`;
CREATE TABLE `user_monthly_cards` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `user_id`         BIGINT       NOT NULL                COMMENT '用户ID',
    `order_no`        VARCHAR(64)  NOT NULL                COMMENT '购买订单号',
    `start_date`      DATE         NOT NULL                COMMENT '开始日期',
    `end_date`        DATE         NOT NULL                COMMENT '结束日期',
    `status`          TINYINT      NOT NULL DEFAULT 1      COMMENT '1=生效中 2=已过期',
    `total_days`      INT          NOT NULL DEFAULT 30     COMMENT '总天数',
    `claimed_days`    INT          NOT NULL DEFAULT 0      COMMENT '已领天数',
    `last_claim_date` DATE         DEFAULT NULL            COMMENT '上次领取日期',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_user_status` (`user_id`, `status`),
    KEY `idx_end_date`    (`end_date`, `status`),
    KEY `idx_last_claim`  (`user_id`, `last_claim_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='月卡用户表';

-- ─────────────────────────────────────────────────────
-- 礼包购买记录表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `user_gift_purchases`;
CREATE TABLE `user_gift_purchases` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `user_id`         BIGINT       NOT NULL                COMMENT '用户ID',
    `gift_key`        VARCHAR(32)  NOT NULL                COMMENT '礼包标识',
    `order_no`        VARCHAR(64)  NOT NULL                COMMENT '购买订单号',
    `purchase_time`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '购买时间',
    `reset_next`      DATE         DEFAULT NULL            COMMENT '下次重置日期(周期性礼包)',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_gift_once` (`user_id`, `gift_key`, `purchase_time`),
    KEY `idx_user_key`     (`user_id`, `gift_key`),
    KEY `idx_reset_next`   (`user_id`, `reset_next`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='礼包购买记录表';

-- ─────────────────────────────────────────────────────
-- VIP记录表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `user_vip_records`;
CREATE TABLE `user_vip_records` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `user_id`         BIGINT       NOT NULL                COMMENT '用户ID',
    `vip_level`       TINYINT      NOT NULL                COMMENT 'VIP等级 1~5',
    `exp`             BIGINT       NOT NULL DEFAULT 0      COMMENT 'VIP经验值',
    `expire_at`       DATETIME     DEFAULT NULL            COMMENT 'VIP到期时间(NULL=永久)',
    `order_no`        VARCHAR(64)  DEFAULT ''              COMMENT '升级订单号',
    `source`          VARCHAR(20)  NOT NULL DEFAULT 'purchase' COMMENT '来源 purchase/gift/event',
    `last_daily_claim` DATE         DEFAULT NULL            COMMENT '上次每日奖励领取日期',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user` (`user_id`),
    KEY `idx_vip_level` (`vip_level`),
    KEY `idx_expire`    (`expire_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='VIP记录表';

-- ─────────────────────────────────────────────────────
-- 用户钱包流水表（支付发货记录）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `user_wallet_logs`;
CREATE TABLE `user_wallet_logs` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `user_id`         BIGINT       NOT NULL                COMMENT '用户ID',
    `order_no`        VARCHAR(64)  DEFAULT ''              COMMENT '关联订单号',
    `currency`        VARCHAR(16)  NOT NULL                COMMENT '货币 diamond/gold/food/wood/iron',
    `change_amount`   INT          NOT NULL                COMMENT '变动数量(正=增加 负=减少)',
    `balance_before`  INT          NOT NULL DEFAULT 0      COMMENT '变动前余额',
    `balance_after`   INT          NOT NULL DEFAULT 0      COMMENT '变动后余额',
    `reason`          VARCHAR(32)  NOT NULL DEFAULT ''      COMMENT '变动原因 recharge/monthly/gift/vip/refund',
    `detail`          VARCHAR(128) DEFAULT ''              COMMENT '详细说明',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_user_currency` (`user_id`, `currency`),
    KEY `idx_user_time`     (`user_id`, `created_at`),
    KEY `idx_order_no`      (`order_no`),
    KEY `idx_created`       (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户钱包流水表';

-- ─────────────────────────────────────────────────────
-- 成长基金里程碑表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `growth_fund_milestones`;
CREATE TABLE `growth_fund_milestones` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `user_id`         BIGINT       NOT NULL                COMMENT '用户ID',
    `order_no`        VARCHAR(64)  NOT NULL                COMMENT '购买订单号',
    `level`           INT          NOT NULL DEFAULT 10     COMMENT '等级门槛',
    `reward_currency` VARCHAR(16)  NOT NULL DEFAULT 'diamond' COMMENT '奖励货币',
    `reward_amount`   INT          NOT NULL DEFAULT 0      COMMENT '奖励数量',
    `status`          TINYINT      NOT NULL DEFAULT 0      COMMENT '0=未达成 1=已领取',
    `claimed_at`      DATETIME     DEFAULT NULL            COMMENT '领取时间',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_order_level` (`user_id`, `order_no`, `level`),
    KEY `idx_user_status` (`user_id`, `status`),
    KEY `idx_order_no`     (`order_no`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='成长基金里程碑表';

-- ─────────────────────────────────────────────────────
-- 退款记录表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `refund_records`;
CREATE TABLE `refund_records` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `refund_no`       VARCHAR(64)  NOT NULL                COMMENT '退款单号',
    `order_no`        VARCHAR(64)  NOT NULL                COMMENT '原订单号',
    `user_id`         BIGINT       NOT NULL                COMMENT '用户ID',
    `refund_amount`   INT          NOT NULL                COMMENT '退款金额(分)',
    `reason`          VARCHAR(256) DEFAULT ''              COMMENT '退款原因',
    `channel_refund_no` VARCHAR(128) DEFAULT ''          COMMENT '渠道退款单号',
    `status`          TINYINT      NOT NULL DEFAULT 0      COMMENT '0=申请中 1=已退款 2=已拒绝',
    `reviewer_id`     BIGINT       DEFAULT NULL            COMMENT '审批人',
    `review_note`     VARCHAR(256) DEFAULT ''              COMMENT '审批备注',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `processed_at`    DATETIME     DEFAULT NULL            COMMENT '处理时间',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_refund_no` (`refund_no`),
    UNIQUE KEY `uk_order_no`   (`order_no`),
    KEY `idx_user_status` (`user_id`, `status`),
    KEY `idx_created`     (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='退款记录表';
