-- ============================================================
-- 九州争鼎 - 卡牌系统数据库表结构
-- Database: jiuzhou  |  Engine: InnoDB  |  Charset: utf8mb4
-- ============================================================

USE `jiuzhou`;

-- ─────────────────────────────────────────────────────
-- 卡牌定义表（配置表，由GM/策划导入）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `card_definitions`;
CREATE TABLE `card_definitions` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '卡牌ID',
    `name`            VARCHAR(64)  NOT NULL                COMMENT '武将名',
    `title`           VARCHAR(128) DEFAULT ''              COMMENT '称号',
    `rarity`          TINYINT      NOT NULL                COMMENT '稀有度 3=R 4=SR 5=SSR',
    `element`         VARCHAR(20)  NOT NULL DEFAULT 'fire' COMMENT '元素类型',
    `faction`         VARCHAR(20)  NOT NULL DEFAULT 'qun'  COMMENT '阵营 wei/shu/wu/qun',
    `role`            VARCHAR(20)  NOT NULL DEFAULT 'warrior' COMMENT '定位',
    `base_hp`         INT          NOT NULL DEFAULT 1000   COMMENT '基础生命值',
    `base_atk`        INT          NOT NULL DEFAULT 100    COMMENT '基础攻击力',
    `base_def`        INT          NOT NULL DEFAULT 50     COMMENT '基础防御力',
    `skill_id`        INT          DEFAULT NULL            COMMENT '技能ID',
    `lead_skill_id`   INT          DEFAULT NULL            COMMENT '主帅技能ID',
    `description`     TEXT         DEFAULT NULL            COMMENT '卡牌描述/背景故事',
    `obtain_from`     VARCHAR(128) DEFAULT ''              COMMENT '获取途径说明',
    `is_limited`      TINYINT(1)   NOT NULL DEFAULT 0      COMMENT '是否限定卡 0=否 1=是',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_rarity`  (`rarity`),
    KEY `idx_element` (`element`),
    KEY `idx_faction` (`faction`),
    KEY `idx_role`    (`role`),
    KEY `idx_limited` (`is_limited`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='卡牌定义表';

-- ─────────────────────────────────────────────────────
-- 卡池配置表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `card_pools`;
CREATE TABLE `card_pools` (
    `id`             BIGINT      NOT NULL AUTO_INCREMENT COMMENT '卡池ID',
    `name`           VARCHAR(64) NOT NULL                COMMENT '卡池标识名',
    `display_name`   VARCHAR(128) NOT NULL               COMMENT '卡池展示名',
    `type`           VARCHAR(20) NOT NULL DEFAULT 'normal' COMMENT 'normal/limited/rateup',
    `start_time`     DATETIME    NOT NULL                COMMENT '开放时间',
    `end_time`       DATETIME    NOT NULL                COMMENT '结束时间',
    `status`         TINYINT     NOT NULL DEFAULT 1      COMMENT '1=开放 0=关闭',
    `config`         JSON        NOT NULL                COMMENT '卡池配置(JSON: 概率/保底/卡牌列表)',
    `created_at`     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_name` (`name`),
    KEY `idx_status_time` (`status`, `start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='卡池配置表';

-- ─────────────────────────────────────────────────────
-- 玩家卡牌表（用户持有的卡牌实例）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `user_cards`;
CREATE TABLE `user_cards` (
    `id`             BIGINT      NOT NULL AUTO_INCREMENT COMMENT '实例ID',
    `user_id`        BIGINT      NOT NULL                COMMENT '玩家ID',
    `card_id`        BIGINT      NOT NULL                COMMENT '卡牌定义ID',
    `star`           TINYINT     NOT NULL DEFAULT 1      COMMENT '星级 1~6',
    `level`          INT         NOT NULL DEFAULT 1      COMMENT '等级 1~100',
    `exp`            BIGINT      NOT NULL DEFAULT 0      COMMENT '经验值',
    `is_locked`      TINYINT(1)  NOT NULL DEFAULT 0      COMMENT '是否锁定',
    `obtain_time`    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '获取时间',
    `obtain_from`    VARCHAR(64) DEFAULT ''              COMMENT '获取来源',
    `create_time`    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time`    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_user_id`     (`user_id`),
    KEY `idx_card_id`     (`card_id`),
    KEY `idx_user_card`   (`user_id`, `card_id`),
    KEY `idx_rarity_lock` (`user_id`, `is_locked`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='玩家卡牌表';

-- ─────────────────────────────────────────────────────
-- 抽卡记录表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `gacha_records`;
CREATE TABLE `gacha_records` (
    `id`             BIGINT      NOT NULL AUTO_INCREMENT COMMENT '记录ID',
    `user_id`        BIGINT      NOT NULL                COMMENT '玩家ID',
    `pool_id`        BIGINT      NOT NULL                COMMENT '卡池ID',
    `card_id`        BIGINT      NOT NULL                COMMENT '获得的卡牌ID',
    `rarity`         TINYINT     NOT NULL                COMMENT '稀有度 3/4/5',
    `is_new`         TINYINT(1)  NOT NULL DEFAULT 0      COMMENT '是否首次获得',
    `is_pity`        TINYINT(1)  NOT NULL DEFAULT 0      COMMENT '是否保底触发',
    `pull_index`     INT         NOT NULL                COMMENT '第几抽（本池累计）',
    `created_at`     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_user_pool`    (`user_id`, `pool_id`),
    KEY `idx_user_time`    (`user_id`, `created_at`),
    KEY `idx_pool_time`    (`pool_id`, `created_at`),
    KEY `idx_rarity`       (`rarity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='抽卡记录表';

-- ─────────────────────────────────────────────────────
-- 玩家抽卡统计表（保底计数持久化）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `user_gacha_stats`;
CREATE TABLE `user_gacha_stats` (
    `id`              BIGINT  NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `user_id`         BIGINT  NOT NULL               COMMENT '玩家ID',
    `pool_id`         BIGINT  NOT NULL               COMMENT '卡池ID',
    `total_pulls`     INT     NOT NULL DEFAULT 0     COMMENT '总抽数',
    `ssr_pity_counter` INT    NOT NULL DEFAULT 0     COMMENT '距上次SSR已抽数',
    `sr_pity_counter`  INT    NOT NULL DEFAULT 0     COMMENT '距上次SR已抽数',
    `updated_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_at`      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_pool` (`user_id`, `pool_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='玩家抽卡统计表';
