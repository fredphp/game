-- =============================================================================
-- 客户端功能检测系统 - 数据库 Schema
-- =============================================================================
-- 描述：版本校验、功能开关、热更新检测、审计日志四张表。
--       需要在 user-service 数据库中执行。
-- =============================================================================

-- ──────────────────────────────────────
-- 客户端版本管理表
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_versions (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    platform        VARCHAR(20)  NOT NULL COMMENT '平台: android/ios/windows',
    version_code    VARCHAR(32)  NOT NULL COMMENT '版本号(语义化: 1.2.0)',
    version_name    VARCHAR(64)  NOT NULL COMMENT '版本名称(展示用: v1.2.0 烽火连天)',
    min_supported_version VARCHAR(32) NOT NULL DEFAULT '1.0.0' COMMENT '最低支持版本',
    build_number    INT UNSIGNED NOT NULL DEFAULT 1 COMMENT '构建号(自增)',
    is_force_update TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否强制更新: 0否 1是',
    update_title    VARCHAR(128) DEFAULT '' COMMENT '更新标题',
    update_description TEXT COMMENT '更新说明(支持换行)',
    download_url    VARCHAR(512) DEFAULT '' COMMENT '下载地址',
    file_size       BIGINT UNSIGNED DEFAULT 0 COMMENT '安装包大小(字节)',
    file_hash       VARCHAR(64)  DEFAULT '' COMMENT '文件MD5校验',
    status          TINYINT      NOT NULL DEFAULT 1 COMMENT '状态: 0禁用 1启用',
    published_at    DATETIME     DEFAULT NULL COMMENT '发布时间',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_platform_version (platform, version_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户端版本管理';

-- ──────────────────────────────────────
-- 功能开关表
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_flags (
    id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    flag_key          VARCHAR(64)  NOT NULL COMMENT '功能标识(唯一): battle_pvp_mode',
    flag_name         VARCHAR(128) NOT NULL COMMENT '功能名称: PVP对战模式',
    description       TEXT COMMENT '功能描述',
    flag_type         TINYINT      NOT NULL DEFAULT 0 COMMENT '类型: 0功能开关 1灰度测试 2AB测试',
    is_enabled        TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否启用',
    rollout_percentage INT UNSIGNED NOT NULL DEFAULT 100 COMMENT '灰度百分比(0-100)',
    target_platforms  VARCHAR(100) DEFAULT 'android,ios,windows' COMMENT '目标平台(逗号分隔)',
    min_version       VARCHAR(32)  DEFAULT '' COMMENT '最低版本要求',
    max_version       VARCHAR(32)  DEFAULT '' COMMENT '最高版本限制(空=不限)',
    target_regions    VARCHAR(200) DEFAULT '' COMMENT '目标区服ID(逗号分隔,空=全服)',
    target_user_groups VARCHAR(100) DEFAULT '' COMMENT '目标用户组: vip_level>=5,level>=10',
    config_value      TEXT COMMENT '功能配置(JSON)',
    priority          INT NOT NULL DEFAULT 0 COMMENT '优先级(越大越优先)',
    status            TINYINT      NOT NULL DEFAULT 1 COMMENT '状态: 0禁用 1启用',
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_flag_key (flag_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='功能开关管理';

-- ──────────────────────────────────────
-- 热更新资源版本表
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS hot_updates (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    platform        VARCHAR(20)  NOT NULL COMMENT '平台',
    resource_version VARCHAR(32) NOT NULL COMMENT '资源版本号',
    base_version    VARCHAR(32)  NOT NULL COMMENT '基准版本(以此版本为起点可更新)',
    update_type     TINYINT      NOT NULL DEFAULT 0 COMMENT '更新类型: 0普通 1紧急 2预载',
    total_size      BIGINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '总大小(字节)',
    file_count      INT UNSIGNED NOT NULL DEFAULT 0 COMMENT '文件数量',
    description     TEXT COMMENT '更新说明',
    download_base_url VARCHAR(512) NOT NULL COMMENT '下载基础URL',
    manifest_url    VARCHAR(512) DEFAULT '' COMMENT '清单文件地址',
    manifest_hash   VARCHAR(64)  DEFAULT '' COMMENT '清单文件MD5',
    is_force_update TINYINT(1)   NOT NULL DEFAULT 0 COMMENT '是否强制更新',
    status          TINYINT      NOT NULL DEFAULT 1 COMMENT '状态: 0禁用 1启用',
    published_at    DATETIME     DEFAULT NULL COMMENT '发布时间',
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_platform_version (platform, resource_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='热更新资源版本';

-- ──────────────────────────────────────
-- 客户端审计日志表
-- ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS client_audit_logs (
    id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id          BIGINT UNSIGNED DEFAULT NULL COMMENT '用户ID(未登录时为NULL)',
    platform         VARCHAR(20)  NOT NULL,
    app_version      VARCHAR(32)  NOT NULL COMMENT '客户端版本',
    resource_version VARCHAR(32)  DEFAULT '' COMMENT '资源版本',
    device_id        VARCHAR(128) DEFAULT '' COMMENT '设备唯一标识',
    os_version       VARCHAR(64)  DEFAULT '' COMMENT '操作系统版本',
    check_type       VARCHAR(32)  NOT NULL COMMENT '检查类型: version/feature/hotupdate',
    check_result     TINYINT      NOT NULL COMMENT '结果: 0通过 1需要更新 2被拒绝',
    detail           TEXT COMMENT '详情(JSON)',
    ip_address       VARCHAR(45)  DEFAULT '',
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_platform_version (platform, app_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='客户端审计日志';
