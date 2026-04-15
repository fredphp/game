-- ================================================================
-- 赛季系统数据库表设计 (Season System Schema)
-- Database: jiuzhou
-- ================================================================

-- 赛季表
CREATE TABLE IF NOT EXISTS `seasons` (
    `id`              BIGINT       AUTO_INCREMENT PRIMARY KEY,
    `season_num`      INT          NOT NULL DEFAULT 0      COMMENT '赛季编号（S1, S2...）',
    `server_id`       BIGINT       NOT NULL DEFAULT 0      COMMENT '区服ID（0=全服）',
    `name`            VARCHAR(128) NOT NULL DEFAULT ''     COMMENT '赛季名称',
    `status`          TINYINT      NOT NULL DEFAULT 0      COMMENT '状态: 0=准备中 1=进行中 2=即将结束 3=结算中 4=已结束',
    `start_time`      DATETIME     NOT NULL                COMMENT '开始时间',
    `end_time`        DATETIME     NOT NULL                COMMENT '结束时间',
    `settled_at`      DATETIME     NULL                    COMMENT '结算时间',
    `duration_days`   INT          NOT NULL DEFAULT 60     COMMENT '持续天数',
    `player_count`    INT          NOT NULL DEFAULT 0      COMMENT '参与玩家数',
    `guild_count`     INT          NOT NULL DEFAULT 0      COMMENT '参与联盟数',
    `city_reset_count`INT          NOT NULL DEFAULT 0      COMMENT '重置城池数',
    `reward_sent_count`INT         NOT NULL DEFAULT 0      COMMENT '发放奖励数',
    `settle_result`   TEXT         NULL                    COMMENT '结算结果JSON',
    `created_at`      DATETIME     DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_server_season` (`server_id`, `season_num`),
    KEY `idx_status` (`status`),
    KEY `idx_end_time` (`end_time`),
    KEY `idx_server_status` (`server_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='赛季表';

-- 赛季奖励配置表
CREATE TABLE IF NOT EXISTS `season_rewards` (
    `id`           BIGINT       AUTO_INCREMENT PRIMARY KEY,
    `season_num`   INT          NOT NULL DEFAULT 0       COMMENT '赛季编号（0=通用模板）',
    `rank_min`     INT          NOT NULL DEFAULT 1       COMMENT '排名下限',
    `rank_max`     INT          NOT NULL DEFAULT 0       COMMENT '排名上限（0=无上限）',
    `reward_type`  TINYINT      NOT NULL DEFAULT 1       COMMENT '奖励类型: 1=金币 2=钻石 3=道具 4=称号 5=经验',
    `reward_id`    BIGINT       NOT NULL DEFAULT 0       COMMENT '奖励物品ID',
    `amount`       INT          NOT NULL DEFAULT 0       COMMENT '奖励数量',
    `title`        VARCHAR(64)  NOT NULL DEFAULT ''      COMMENT '称号名称',
    `created_at`   DATETIME     DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_season_num` (`season_num`),
    KEY `idx_rank_range` (`rank_min`, `rank_max`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='赛季奖励配置表';

-- 赛季玩家排名表
CREATE TABLE IF NOT EXISTS `season_rankings` (
    `id`           BIGINT       AUTO_INCREMENT PRIMARY KEY,
    `season_id`    BIGINT       NOT NULL                COMMENT '赛季ID',
    `server_id`    BIGINT       NOT NULL DEFAULT 0      COMMENT '区服ID',
    `user_id`      BIGINT       NOT NULL                COMMENT '用户ID',
    `guild_id`     BIGINT       NOT NULL DEFAULT 0      COMMENT '联盟ID',
    `nickname`     VARCHAR(64)  NOT NULL DEFAULT ''     COMMENT '昵称',
    `avatar`       VARCHAR(256) NOT NULL DEFAULT ''     COMMENT '头像',
    `score`        BIGINT       NOT NULL DEFAULT 0      COMMENT '总积分',
    `kill_count`   INT          NOT NULL DEFAULT 0      COMMENT '击杀数',
    `city_count`   INT          NOT NULL DEFAULT 0      COMMENT '攻城数',
    `rank`         INT          NOT NULL DEFAULT 0      COMMENT '最终排名',
    `created_at`   DATETIME     DEFAULT CURRENT_TIMESTAMP,
    `updated_at`   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY `uk_season_user` (`season_id`, `user_id`),
    KEY `idx_season_score` (`season_id`, `score` DESC),
    KEY `idx_server_season` (`server_id`, `season_id`),
    KEY `idx_user_season` (`user_id`, `season_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='赛季玩家排名表';

-- 赛季奖励发放记录表
CREATE TABLE IF NOT EXISTS `season_reward_logs` (
    `id`           BIGINT       AUTO_INCREMENT PRIMARY KEY,
    `season_id`    BIGINT       NOT NULL                COMMENT '赛季ID',
    `user_id`      BIGINT       NOT NULL                COMMENT '用户ID',
    `rank`         INT          NOT NULL DEFAULT 0      COMMENT '排名',
    `reward_type`  TINYINT      NOT NULL DEFAULT 0      COMMENT '奖励类型',
    `reward_id`    BIGINT       NOT NULL DEFAULT 0      COMMENT '奖励物品ID',
    `amount`       INT          NOT NULL DEFAULT 0      COMMENT '奖励数量',
    `status`       TINYINT      NOT NULL DEFAULT 0      COMMENT '状态: 0=待发放 1=已发放 2=发放失败',
    `created_at`   DATETIME     DEFAULT CURRENT_TIMESTAMP,
    `sent_at`      DATETIME     NULL                    COMMENT '发放时间',
    KEY `idx_season_id` (`season_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_status` (`status`),
    KEY `idx_season_status` (`season_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='赛季奖励发放记录表';

-- 赛季结算日志表（记录每个结算步骤的执行情况）
CREATE TABLE IF NOT EXISTS `season_settle_logs` (
    `id`           BIGINT       AUTO_INCREMENT PRIMARY KEY,
    `season_id`    BIGINT       NOT NULL                COMMENT '赛季ID',
    `phase`        VARCHAR(32)  NOT NULL DEFAULT ''     COMMENT '结算阶段',
    `action`       VARCHAR(64)  NOT NULL DEFAULT ''     COMMENT '执行动作',
    `status`       TINYINT      NOT NULL DEFAULT 0      COMMENT '状态: 0=执行中 1=成功 2=失败',
    `detail`       TEXT         NULL                    COMMENT '执行详情JSON',
    `error_msg`    TEXT         NULL                    COMMENT '错误信息',
    `duration_ms`  INT          NOT NULL DEFAULT 0      COMMENT '执行耗时(毫秒)',
    `created_at`   DATETIME     DEFAULT CURRENT_TIMESTAMP,
    KEY `idx_season_id` (`season_id`),
    KEY `idx_phase` (`season_id`, `phase`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='赛季结算日志表';
