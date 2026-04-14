-- ============================================================
-- 九州争鼎 - 战斗系统数据库表结构
-- ============================================================

USE `jiuzhou`;

-- ─────────────────────────────────────────────────────
-- 战斗记录表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `battle_records`;
CREATE TABLE `battle_records` (
    `id`           BIGINT       NOT NULL AUTO_INCREMENT COMMENT '记录ID',
    `battle_id`    VARCHAR(64)  NOT NULL                COMMENT '战斗唯一ID',
    `attacker_id`  BIGINT       NOT NULL                COMMENT '进攻方玩家ID',
    `defender_id`  BIGINT       NOT NULL                COMMENT '防守方玩家ID (PVP) / 0(PVE)',
    `attacker_win` TINYINT(1)   NOT NULL                COMMENT '进攻方是否胜利',
    `type`         VARCHAR(20)  NOT NULL DEFAULT 'pve'  COMMENT 'pve/pvp/guild_war',
    `stage_id`     INT          DEFAULT 0               COMMENT '关卡ID (PVE)',
    `turn_count`   INT          NOT NULL                COMMENT '战斗回合数',
    `result_json`  JSON         DEFAULT NULL            COMMENT '完整战斗结果JSON',
    `duration_ms`  BIGINT       NOT NULL DEFAULT 0      COMMENT '战斗耗时(毫秒)',
    `created_at`   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_battle_id` (`battle_id`),
    KEY `idx_attacker`   (`attacker_id`, `created_at`),
    KEY `idx_defender`   (`defender_id`),
    KEY `idx_type`       (`type`),
    KEY `idx_created`    (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='战斗记录表';

-- ─────────────────────────────────────────────────────
-- 技能定义表（配置表）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `skill_definitions`;
CREATE TABLE `skill_definitions` (
    `id`            BIGINT       NOT NULL AUTO_INCREMENT COMMENT '技能ID',
    `name`          VARCHAR(64)  NOT NULL                COMMENT '技能名',
    `type`          VARCHAR(20)  NOT NULL DEFAULT 'active' COMMENT 'normal/active/passive',
    `target_type`   VARCHAR(30)  NOT NULL DEFAULT 'single' COMMENT 'single/enemy_all/ally_lowest_hp/self/enemy_back',
    `damage_type`   VARCHAR(20)  NOT NULL DEFAULT 'physical' COMMENT 'physical/magical/true',
    `damage_ratio`  DECIMAL(5,2) NOT NULL DEFAULT 1.00  COMMENT '伤害倍率',
    `base_damage`   INT          NOT NULL DEFAULT 0      COMMENT '固定伤害',
    `cd`            INT          NOT NULL DEFAULT 0      COMMENT '冷却回合',
    `special`       VARCHAR(20)  DEFAULT NULL            COMMENT '特殊效果 heal/shield/revive',
    `heal_ratio`    DECIMAL(5,2) DEFAULT 0.00           COMMENT '治疗倍率',
    `buffs_json`    JSON         DEFAULT NULL            COMMENT '附加Buff配置',
    `description`   VARCHAR(256) DEFAULT ''              COMMENT '技能描述',
    `created_at`    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='技能定义表';

-- ─────────────────────────────────────────────────────
-- PVE 关卡配置表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `stage_definitions`;
CREATE TABLE `stage_definitions` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '关卡ID',
    `chapter`         INT          NOT NULL                COMMENT '章节',
    `stage_num`       INT          NOT NULL                COMMENT '关卡编号',
    `name`            VARCHAR(64)  NOT NULL                COMMENT '关卡名',
    `difficulty`      TINYINT      NOT NULL DEFAULT 1      COMMENT '难度 1~5',
    `enemy_team_json` JSON         NOT NULL                COMMENT '敌方阵容JSON',
    `rewards_json`    JSON         DEFAULT NULL            COMMENT '奖励配置JSON',
    `first_reward_json` JSON       DEFAULT NULL            COMMENT '首通奖励JSON',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_chapter_stage` (`chapter`, `stage_num`),
    KEY `idx_difficulty` (`difficulty`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='PVE关卡配置表';
