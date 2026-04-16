-- ============================================================
-- 九州争鼎 - 卡牌 + 技能系统数据库表结构（重构版 v2）
-- Database: jiuzhou  |  Engine: InnoDB  |  Charset: utf8mb4
--
-- 重构说明:
--   1. 英雄只保留 1 个天生技能（innate_skill_id）
--   2. 技能独立为技能表，不再绑定英雄
--   3. 装备系统：每位英雄最多装备 3 个额外技能
--   4. 抽卡/分解：技能通过抽卡获取，重复技能可分解
-- ============================================================

USE `jiuzhou`;

-- ─────────────────────────────────────────────────────
-- 卡牌定义表（配置表，由GM/策划导入）
-- 【重构】移除 lead_skill_id，skill_id 重命名为 innate_skill_id（天生技能）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `card_definitions`;
CREATE TABLE `card_definitions` (
    `id`                BIGINT       NOT NULL AUTO_INCREMENT COMMENT '卡牌ID',
    `name`              VARCHAR(64)  NOT NULL                COMMENT '武将名',
    `title`             VARCHAR(128) DEFAULT ''              COMMENT '称号',
    `rarity`            TINYINT      NOT NULL                COMMENT '稀有度 3=R 4=SR 5=SSR',
    `element`           VARCHAR(20)  NOT NULL DEFAULT 'fire' COMMENT '元素类型',
    `faction`           VARCHAR(20)  NOT NULL DEFAULT 'qun'  COMMENT '阵营 wei/shu/wu/qun',
    `role`              VARCHAR(20)  NOT NULL DEFAULT 'warrior' COMMENT '定位 tank/warrior/mage/assassin/support',
    `base_hp`           INT          NOT NULL DEFAULT 1000   COMMENT '基础生命值',
    `base_atk`          INT          NOT NULL DEFAULT 100    COMMENT '基础攻击力',
    `base_def`          INT          NOT NULL DEFAULT 50     COMMENT '基础防御力',
    `innate_skill_id`   INT          DEFAULT NULL            COMMENT '天生技能ID（仅1个，不可卸下）',
    `description`       TEXT         DEFAULT NULL            COMMENT '卡牌描述/背景故事',
    `obtain_from`       VARCHAR(128) DEFAULT ''              COMMENT '获取途径说明',
    `is_limited`        TINYINT(1)   NOT NULL DEFAULT 0      COMMENT '是否限定卡 0=否 1=是',
    `created_at`        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_rarity`  (`rarity`),
    KEY `idx_element` (`element`),
    KEY `idx_faction` (`faction`),
    KEY `idx_role`    (`role`),
    KEY `idx_limited` (`is_limited`),
    KEY `idx_innate_skill` (`innate_skill_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='卡牌定义表（v2: 仅保留天生技能）';

-- ─────────────────────────────────────────────────────
-- 技能定义表（独立配置表，不再绑定英雄）
-- 【新增】技能独立表，支持稀有度、等级配置、分类
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `skill_definitions`;
CREATE TABLE `skill_definitions` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '技能ID',
    `name`            VARCHAR(64)  NOT NULL                COMMENT '技能名',
    `type`            VARCHAR(20)  NOT NULL DEFAULT 'active' COMMENT '技能类型: active=主动被动/passive=被动',
    `target_type`     VARCHAR(30)  NOT NULL DEFAULT 'single' COMMENT '目标类型: single/enemy_all/ally_all/ally_lowest_hp/self/enemy_back',
    `damage_type`     VARCHAR(20)  NOT NULL DEFAULT 'physical' COMMENT '伤害类型: physical/magical/true',
    `damage_ratio`    DECIMAL(5,2) NOT NULL DEFAULT 1.00  COMMENT '基础伤害倍率（1级时）',
    `base_damage`     INT          NOT NULL DEFAULT 0      COMMENT '固定伤害值',
    `cd`              INT          NOT NULL DEFAULT 0      COMMENT '冷却回合数',
    `special`         VARCHAR(20)  DEFAULT NULL            COMMENT '特殊效果: heal/shield/revive/stun',
    `heal_ratio`      DECIMAL(5,2) DEFAULT 0.00           COMMENT '治疗倍率',
    `buffs_json`      JSON         DEFAULT NULL            COMMENT '附加Buff配置 [{type,value,duration,is_debuff}]',
    `rarity`          TINYINT      NOT NULL DEFAULT 3      COMMENT '技能稀有度: 3=R 4=SR 5=SSR',
    `category`        VARCHAR(30)  NOT NULL DEFAULT 'attack' COMMENT '技能分类: attack/defense/support/control/utility',
    `icon`            VARCHAR(128) DEFAULT ''              COMMENT '技能图标路径',
    `description`     VARCHAR(512) DEFAULT ''              COMMENT '技能描述（含公式说明）',
    `level_config`    JSON         DEFAULT NULL            COMMENT '技能等级配置 [{level, damage_ratio, base_damage, heal_ratio, cd, buffs}]',
    `is_obtainable`   TINYINT(1)   NOT NULL DEFAULT 1      COMMENT '是否可通过抽卡获得: 0=否（天生/限定） 1=是',
    `max_level`       TINYINT      NOT NULL DEFAULT 10     COMMENT '最大等级',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_name` (`name`),
    KEY `idx_rarity`   (`rarity`),
    KEY `idx_category` (`category`),
    KEY `idx_type`     (`type`),
    KEY `idx_obtainable` (`is_obtainable`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技能定义表（v2: 独立技能表）';

-- ─────────────────────────────────────────────────────
-- 卡池配置表（英雄卡池）
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='英雄卡池配置表';

-- ─────────────────────────────────────────────────────
-- 技能卡池配置表
-- 【新增】独立技能抽卡池
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `skill_pools`;
CREATE TABLE `skill_pools` (
    `id`             BIGINT      NOT NULL AUTO_INCREMENT COMMENT '技能卡池ID',
    `name`           VARCHAR(64) NOT NULL                COMMENT '卡池标识名',
    `display_name`   VARCHAR(128) NOT NULL               COMMENT '卡池展示名',
    `type`           VARCHAR(20) NOT NULL DEFAULT 'normal' COMMENT 'normal/limited/rateup',
    `start_time`     DATETIME    NOT NULL                COMMENT '开放时间',
    `end_time`       DATETIME    NOT NULL                COMMENT '结束时间',
    `status`         TINYINT     NOT NULL DEFAULT 1      COMMENT '1=开放 0=关闭',
    `config`         JSON        NOT NULL                COMMENT '技能池配置(JSON: {ssr_rate, sr_rate, r_rate, pity_ssr, pity_sr, ssr_pool, sr_pool, r_pool, up_skills})',
    `created_at`     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_name` (`name`),
    KEY `idx_status_time` (`status`, `start_time`, `end_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技能卡池配置表';

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
-- 玩家技能背包表
-- 【新增】玩家持有的技能实例（通过抽卡获取）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `user_skills`;
CREATE TABLE `user_skills` (
    `id`              BIGINT      NOT NULL AUTO_INCREMENT COMMENT '实例ID',
    `user_id`         BIGINT      NOT NULL                COMMENT '玩家ID',
    `skill_id`        BIGINT      NOT NULL                COMMENT '技能定义ID',
    `level`           TINYINT     NOT NULL DEFAULT 1      COMMENT '技能等级 1~max_level',
    `count`           INT         NOT NULL DEFAULT 1      COMMENT '持有数量（重复技能叠加，用于分解）',
    `is_locked`       TINYINT(1)  NOT NULL DEFAULT 0      COMMENT '是否锁定（不可分解）',
    `is_equipped`     TINYINT(1)  NOT NULL DEFAULT 0      COMMENT '是否已装备（冗余字段，加速查询）',
    `obtain_time`     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '获取时间',
    `obtain_from`     VARCHAR(64) DEFAULT ''              COMMENT '获取来源',
    `create_time`     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time`     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_user_id`     (`user_id`),
    KEY `idx_user_skill`  (`user_id`, `skill_id`),
    KEY `idx_rarity_lock` (`user_id`, `is_locked`),
    KEY `idx_equipped`    (`user_id`, `is_equipped`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='玩家技能背包表';

-- ─────────────────────────────────────────────────────
-- 英雄技能装备表（核心：每位英雄最多装备3个技能）
-- 【新增】将技能装备到英雄身上
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `hero_skill_equipments`;
CREATE TABLE `hero_skill_equipments` (
    `id`              BIGINT      NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `user_id`         BIGINT      NOT NULL                COMMENT '玩家ID',
    `user_card_id`    BIGINT      NOT NULL                COMMENT '玩家卡牌实例ID',
    `user_skill_id`   BIGINT      NOT NULL                COMMENT '玩家技能实例ID',
    `slot`            TINYINT     NOT NULL                COMMENT '装备槽位: 1=技能槽1 2=技能槽2 3=技能槽3',
    `equip_time`      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '装备时间',
    `create_time`     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `update_time`     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_card_slot` (`user_card_id`, `slot`),
    UNIQUE KEY `uk_user_skill_equipped` (`user_skill_id`),
    KEY `idx_user_id`    (`user_id`),
    KEY `idx_user_skill` (`user_skill_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='英雄技能装备表（每英雄最多3个）';

-- ─────────────────────────────────────────────────────
-- 英雄卡池抽卡记录表
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='英雄抽卡记录表';

-- ─────────────────────────────────────────────────────
-- 玩家英雄抽卡统计表（保底计数持久化）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `user_gacha_stats`;
CREATE TABLE `user_gacha_stats` (
    `id`               BIGINT   NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `user_id`          BIGINT   NOT NULL               COMMENT '玩家ID',
    `pool_id`          BIGINT   NOT NULL               COMMENT '卡池ID',
    `total_pulls`      INT      NOT NULL DEFAULT 0     COMMENT '总抽数',
    `ssr_pity_counter` INT      NOT NULL DEFAULT 0     COMMENT '距上次SSR已抽数',
    `sr_pity_counter`  INT      NOT NULL DEFAULT 0     COMMENT '距上次SR已抽数',
    `updated_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_pool` (`user_id`, `pool_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='玩家英雄抽卡统计表';

-- ─────────────────────────────────────────────────────
-- 技能抽卡记录表
-- 【新增】技能抽卡历史
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `skill_gacha_records`;
CREATE TABLE `skill_gacha_records` (
    `id`             BIGINT      NOT NULL AUTO_INCREMENT COMMENT '记录ID',
    `user_id`        BIGINT      NOT NULL                COMMENT '玩家ID',
    `pool_id`        BIGINT      NOT NULL                COMMENT '技能卡池ID',
    `skill_id`       BIGINT      NOT NULL                COMMENT '获得的技能ID',
    `rarity`         TINYINT     NOT NULL                COMMENT '技能稀有度 3/4/5',
    `is_new`         TINYINT(1)  NOT NULL DEFAULT 0      COMMENT '是否首次获得该技能',
    `is_pity`        TINYINT(1)  NOT NULL DEFAULT 0      COMMENT '是否保底触发',
    `pull_index`     INT         NOT NULL                COMMENT '第几抽（本池累计）',
    `created_at`     DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_user_pool` (`user_id`, `pool_id`),
    KEY `idx_user_time` (`user_id`, `created_at`),
    KEY `idx_pool_time` (`pool_id`, `created_at`),
    KEY `idx_rarity`    (`rarity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技能抽卡记录表';

-- ─────────────────────────────────────────────────────
-- 玩家技能抽卡统计表（保底计数持久化）
-- 【新增】
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `user_skill_gacha_stats`;
CREATE TABLE `user_skill_gacha_stats` (
    `id`               BIGINT   NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `user_id`          BIGINT   NOT NULL               COMMENT '玩家ID',
    `pool_id`          BIGINT   NOT NULL               COMMENT '技能卡池ID',
    `total_pulls`      INT      NOT NULL DEFAULT 0     COMMENT '总抽数',
    `ssr_pity_counter` INT      NOT NULL DEFAULT 0     COMMENT '距上次SSR已抽数',
    `sr_pity_counter`  INT      NOT NULL DEFAULT 0     COMMENT '距上次SR已抽数',
    `updated_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_at`       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_pool` (`user_id`, `pool_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='玩家技能抽卡统计表';

-- ─────────────────────────────────────────────────────
-- 技能分解记录表
-- 【新增】重复技能分解为碎片
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `skill_decompose_records`;
CREATE TABLE `skill_decompose_records` (
    `id`              BIGINT      NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `user_id`         BIGINT      NOT NULL                COMMENT '玩家ID',
    `user_skill_id`   BIGINT      NOT NULL                COMMENT '玩家技能实例ID',
    `skill_id`        BIGINT      NOT NULL                COMMENT '技能定义ID',
    `skill_name`      VARCHAR(64) NOT NULL                COMMENT '技能名',
    `rarity`          TINYINT     NOT NULL                COMMENT '技能稀有度',
    `level`           TINYINT     NOT NULL                COMMENT '技能等级',
    `decompose_count` INT         NOT NULL DEFAULT 1      COMMENT '分解数量',
    `reward_type`     VARCHAR(20) NOT NULL DEFAULT 'skill_fragment' COMMENT '奖励类型: skill_fragment/gold',
    `reward_amount`   INT         NOT NULL DEFAULT 0      COMMENT '获得碎片/金币数量',
    `created_at`      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技能分解记录表';

-- ─────────────────────────────────────────────────────
-- 技能升级记录表
-- 【新增】技能升级消耗碎片
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `skill_upgrade_records`;
CREATE TABLE `skill_upgrade_records` (
    `id`              BIGINT      NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `user_id`         BIGINT      NOT NULL                COMMENT '玩家ID',
    `user_skill_id`   BIGINT      NOT NULL                COMMENT '玩家技能实例ID',
    `skill_id`        BIGINT      NOT NULL                COMMENT '技能定义ID',
    `before_level`    TINYINT     NOT NULL                COMMENT '升级前等级',
    `after_level`     TINYINT     NOT NULL                COMMENT '升级后等级',
    `cost_fragments`  INT         NOT NULL DEFAULT 0      COMMENT '消耗碎片数量',
    `created_at`      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技能升级记录表';
