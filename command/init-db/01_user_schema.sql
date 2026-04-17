-- ============================================================
-- 九州争鼎 - 用户系统数据库表结构
-- Database: jiuzhou  |  Engine: InnoDB  |  Charset: utf8mb4
-- ============================================================

-- 创建数据库
CREATE DATABASE IF NOT EXISTS `jiuzhou`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `jiuzhou`;

-- ─────────────────────────────────────────────────────
-- 用户表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '用户ID（主键）',
    `username`        VARCHAR(64)  NOT NULL                COMMENT '用户名（登录名）',
    `password`        VARCHAR(255) NOT NULL                COMMENT '密码（bcrypt哈希）',
    `nickname`        VARCHAR(64)  DEFAULT ''              COMMENT '昵称',
    `avatar`          VARCHAR(512) DEFAULT ''              COMMENT '头像URL',
    `phone`           VARCHAR(20)  DEFAULT NULL            COMMENT '手机号',
    `email`           VARCHAR(128) DEFAULT NULL            COMMENT '邮箱',
    `vip_level`       TINYINT      NOT NULL DEFAULT 0      COMMENT 'VIP等级（0=非VIP, 1~15=VIP等级）',
    `vip_expire_time` DATETIME     DEFAULT NULL            COMMENT 'VIP过期时间',
    `gold`            BIGINT       NOT NULL DEFAULT 0      COMMENT '金币',
    `diamond`         BIGINT       NOT NULL DEFAULT 0      COMMENT '钻石',
    `level`           INT          NOT NULL DEFAULT 1      COMMENT '用户等级',
    `experience`      BIGINT       NOT NULL DEFAULT 0      COMMENT '经验值',
    `last_login_at`   DATETIME     DEFAULT NULL            COMMENT '最后登录时间',
    `status`          TINYINT      NOT NULL DEFAULT 1      COMMENT '账号状态 1=正常 0=禁用',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`),
    UNIQUE KEY `uk_phone`    (`phone`),
    UNIQUE KEY `uk_email`    (`email`),
    KEY          `idx_vip_level` (`vip_level`),
    KEY          `idx_level`     (`level`),
    KEY          `idx_status`    (`status`),
    KEY          `idx_created`   (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';
