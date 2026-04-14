-- ============================================================
-- 九州争鼎 - 联盟系统数据库表结构
-- Database: jiuzhou  |  Engine: InnoDB  |  Charset: utf8mb4
-- ============================================================

USE `jiuzhou`;

-- ─────────────────────────────────────────────────────
-- 联盟表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `guilds`;
CREATE TABLE `guilds` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '联盟ID',
    `name`            VARCHAR(24)  NOT NULL                COMMENT '联盟名称',
    `tag`             VARCHAR(8)   NOT NULL                COMMENT '联盟标签(2~4字符)',
    `declaration`     VARCHAR(128) DEFAULT ''              COMMENT '联盟宣言',
    `leader_id`       BIGINT       NOT NULL                COMMENT '盟主用户ID',
    `level`           TINYINT      NOT NULL DEFAULT 1      COMMENT '联盟等级 1~5',
    `exp`             BIGINT       NOT NULL DEFAULT 0      COMMENT '联盟经验值',
    `member_count`    INT          NOT NULL DEFAULT 1      COMMENT '当前成员数',
    `max_members`     INT          NOT NULL DEFAULT 30     COMMENT '成员上限',
    `total_power`     BIGINT       NOT NULL DEFAULT 0      COMMENT '联盟总战力',
    `city_count`      INT          NOT NULL DEFAULT 0      COMMENT '拥有城池数',
    `notice`          VARCHAR(256) DEFAULT ''              COMMENT '联盟公告',
    `language`        VARCHAR(20)  NOT NULL DEFAULT 'zh'   COMMENT '联盟语言',
    `auto_join`       TINYINT(1)   NOT NULL DEFAULT 0      COMMENT '自动加入 0=需审批 1=自由加入',
    `min_join_level`  INT          NOT NULL DEFAULT 10     COMMENT '入盟最低等级',
    `status`          TINYINT      NOT NULL DEFAULT 1      COMMENT '1=正常 2=解散中 3=已解散',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `disbanded_at`    DATETIME     DEFAULT NULL            COMMENT '解散时间',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_name` (`name`),
    UNIQUE KEY `uk_tag` (`tag`),
    KEY `idx_leader` (`leader_id`),
    KEY `idx_level`  (`level`),
    KEY `idx_power`  (`total_power`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='联盟表';

-- ─────────────────────────────────────────────────────
-- 联盟成员表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `guild_members`;
CREATE TABLE `guild_members` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '记录ID',
    `guild_id`        BIGINT       NOT NULL                COMMENT '联盟ID',
    `user_id`         BIGINT       NOT NULL                COMMENT '用户ID',
    `role`            TINYINT      NOT NULL DEFAULT 4      COMMENT '角色 1=盟主 2=副盟主 3=长老 4=成员',
    `nickname`        VARCHAR(64)  DEFAULT ''              COMMENT '成员昵称',
    `power`           INT          NOT NULL DEFAULT 0      COMMENT '成员战力',
    `contribution`    BIGINT       NOT NULL DEFAULT 0      COMMENT '贡献值',
    `total_donate`    BIGINT       NOT NULL DEFAULT 0      COMMENT '累计捐赠',
    `week_donate`     INT          NOT NULL DEFAULT 0      COMMENT '本周捐赠',
    `join_time`       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
    `last_active`     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '最后活跃时间',
    `kick_cooldown`   DATETIME     DEFAULT NULL            COMMENT '被踢冷却截止时间',
    `status`          TINYINT      NOT NULL DEFAULT 1      COMMENT '1=正常 2=已退出 3=已踢出',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_guild_user` (`guild_id`, `user_id`),
    UNIQUE KEY `uk_user_active` (`user_id`, `guild_id`),
    KEY `idx_role`       (`guild_id`, `role`),
    KEY `idx_contribution` (`guild_id`, `contribution`),
    KEY `idx_join_time`  (`join_time`),
    KEY `idx_status`     (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='联盟成员表';

-- ─────────────────────────────────────────────────────
-- 入盟申请表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `guild_applications`;
CREATE TABLE `guild_applications` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '申请ID',
    `guild_id`        BIGINT       NOT NULL                COMMENT '申请的联盟ID',
    `user_id`         BIGINT       NOT NULL                COMMENT '申请人ID',
    `message`         VARCHAR(256) DEFAULT ''              COMMENT '申请附言',
    `status`          TINYINT      NOT NULL DEFAULT 0      COMMENT '0=待审批 1=已通过 2=已拒绝 3=已取消',
    `reviewer_id`     BIGINT       DEFAULT NULL            COMMENT '审批人ID',
    `review_time`     DATETIME     DEFAULT NULL            COMMENT '审批时间',
    `review_note`     VARCHAR(128) DEFAULT ''              COMMENT '审批备注',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '申请时间',

    PRIMARY KEY (`id`),
    KEY `idx_guild_status` (`guild_id`, `status`),
    KEY `idx_user_status` (`user_id`, `status`),
    KEY `idx_created`     (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='入盟申请表';

-- ─────────────────────────────────────────────────────
-- 联盟战争表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `guild_wars`;
CREATE TABLE `guild_wars` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '战争ID',
    `war_id`          VARCHAR(64)  NOT NULL                COMMENT '战争唯一标识',
    `attacker_guild`  BIGINT       NOT NULL                COMMENT '进攻方联盟ID',
    `defender_guild`  BIGINT       NOT NULL                COMMENT '防守方联盟ID',
    `target_city_id`  BIGINT       DEFAULT NULL            COMMENT '争夺目标城池ID(可选)',
    `status`          TINYINT      NOT NULL DEFAULT 0      COMMENT '0=准备中 1=进行中 2=已结束 3=已取消',
    `phase`           TINYINT      NOT NULL DEFAULT 0      COMMENT '阶段 0=宣战 1=准备 2=战斗 3=结算',
    `declare_time`    DATETIME     NOT NULL                COMMENT '宣战时间',
    `start_time`      DATETIME     NOT NULL                COMMENT '开战时间',
    `end_time`        DATETIME     NOT NULL                COMMENT '结束时间',
    `attacker_score`  INT          NOT NULL DEFAULT 0      COMMENT '进攻方得分',
    `defender_score`  INT          NOT NULL DEFAULT 0      COMMENT '防守方得分',
    `attacker_deaths` INT          NOT NULL DEFAULT 0      COMMENT '进攻方战损',
    `defender_deaths` INT          NOT NULL DEFAULT 0      COMMENT '防守方战损',
    `cities_changed`  INT          NOT NULL DEFAULT 0      COMMENT '城池变更数',
    `winner`          TINYINT      DEFAULT NULL            COMMENT '胜方 1=进攻方 2=防守方 3=平局',
    `surrender_guild` BIGINT       DEFAULT NULL            COMMENT '投降方联盟ID',
    `war_config`      JSON         DEFAULT NULL            COMMENT '战争配置(JSON)',
    `result_detail`   JSON         DEFAULT NULL            COMMENT '战争结果详情(JSON)',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_war_id` (`war_id`),
    KEY `idx_attacker`  (`attacker_guild`, `status`),
    KEY `idx_defender`  (`defender_guild`, `status`),
    KEY `idx_status`    (`status`, `start_time`),
    KEY `idx_guilds`    (`attacker_guild`, `defender_guild`),
    KEY `idx_end_time`  (`end_time`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='联盟战争表';

-- ─────────────────────────────────────────────────────
-- 战争协作战斗表（多人协作攻城）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `guild_war_battles`;
CREATE TABLE `guild_war_battles` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '战斗ID',
    `battle_id`       VARCHAR(64)  NOT NULL                COMMENT '战斗唯一标识',
    `war_id`          VARCHAR(64)  NOT NULL                COMMENT '所属战争ID',
    `city_id`         BIGINT       NOT NULL                COMMENT '目标城池ID',
    `attacker_guild`  BIGINT       NOT NULL                COMMENT '进攻方联盟ID',
    `defender_guild`  BIGINT       NOT NULL DEFAULT 0      COMMENT '防守方联盟ID(0=中立)',
    `leader_id`       BIGINT       NOT NULL                COMMENT '发起者用户ID',
    `contributors`    JSON         DEFAULT NULL            COMMENT '协作者列表 [{user_id, power, join_time}]',
    `total_army`      INT          NOT NULL DEFAULT 0      COMMENT '总出兵量',
    `coop_bonus`      FLOAT        NOT NULL DEFAULT 0      COMMENT '协作加成系数',
    `defender_power`  INT          NOT NULL DEFAULT 0      COMMENT '防守方总战力',
    `city_defense`    INT          NOT NULL DEFAULT 0      COMMENT '城池防御加成',
    `attacker_win`    TINYINT(1)   NOT NULL DEFAULT 0      COMMENT '进攻方是否胜利',
    `damage_dealt`    INT          NOT NULL DEFAULT 0      COMMENT '造成伤害',
    `damage_taken`    INT          NOT NULL DEFAULT 0      COMMENT '承受伤害',
    `loot`            JSON         DEFAULT NULL            COMMENT '战利品(JSON)',
    `result_detail`   JSON         DEFAULT NULL            COMMENT '战斗详情(JSON)',
    `status`          TINYINT      NOT NULL DEFAULT 0      COMMENT '0=组队中 1=战斗中 2=已结束 3=已取消',
    `start_time`      DATETIME     DEFAULT NULL            COMMENT '战斗开始时间',
    `end_time`        DATETIME     DEFAULT NULL            COMMENT '战斗结束时间',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发起时间',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_battle_id` (`battle_id`),
    KEY `idx_war_id`    (`war_id`),
    KEY `idx_city_id`   (`city_id`),
    KEY `idx_leader`    (`leader_id`),
    KEY `idx_status`    (`status`, `start_time`),
    KEY `idx_guilds`    (`attacker_guild`, `defender_guild`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='战争协作战斗表';

-- ─────────────────────────────────────────────────────
-- 联盟操作日志
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `guild_log`;
CREATE TABLE `guild_log` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '日志ID',
    `guild_id`        BIGINT       NOT NULL                COMMENT '联盟ID',
    `user_id`         BIGINT       NOT NULL                COMMENT '操作人ID',
    `target_id`       BIGINT       DEFAULT NULL            COMMENT '操作对象ID',
    `action`          VARCHAR(32)  NOT NULL                COMMENT '操作类型 create/join/leave/kick/promote/demote/declare_war/donate/upgrade/disband/rename',
    `detail`          VARCHAR(512) DEFAULT ''              COMMENT '操作详情',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '操作时间',

    PRIMARY KEY (`id`),
    KEY `idx_guild_time`  (`guild_id`, `created_at`),
    KEY `idx_user_time`   (`user_id`, `created_at`),
    KEY `idx_action`      (`action`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='联盟操作日志';

-- ─────────────────────────────────────────────────────
-- 联盟科技表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `guild_technologies`;
CREATE TABLE `guild_technologies` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `guild_id`        BIGINT       NOT NULL                COMMENT '联盟ID',
    `tech_key`        VARCHAR(32)  NOT NULL                COMMENT '科技标识符',
    `level`           TINYINT      NOT NULL DEFAULT 0      COMMENT '当前等级 0=未研究',
    `researching`     TINYINT(1)   NOT NULL DEFAULT 0      COMMENT '是否正在研究中',
    `research_start`  DATETIME     DEFAULT NULL            COMMENT '研究开始时间',
    `research_end`    DATETIME     DEFAULT NULL            COMMENT '研究完成时间',
    `contributions`   JSON         DEFAULT NULL            COMMENT '成员贡献 [{user_id, amount}]',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_guild_tech` (`guild_id`, `tech_key`),
    KEY `idx_researching` (`guild_id`, `researching`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='联盟科技表';

-- ============================================================
-- 联盟科技定义数据（配置表）
-- ============================================================
-- tech_key 定义:
--   attack_boost    : 联盟攻击加成 (+5%/级)
--   defense_boost   : 联盟防御加成 (+5%/级)
--   march_speed     : 行军速度加成 (+8%/级)
--   resource_boost  : 资源产出加成 (+10%/级)
--   recruit_speed   : 招募速度加成 (+10%/级)
--   garrison_limit  : 驻军上限加成 (+15%/级)
--   scout_range     : 侦查范围 +1/级
--   war_bonus       : 战争额外加成 (+8%/级)

-- 每项科技最高等级为5级
