-- ============================================================
-- 区服系统数据库设计
-- ============================================================

-- 区服表
CREATE TABLE IF NOT EXISTS servers (
    id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(64)  NOT NULL COMMENT '区服名称，如：S1-烽火连天',
    server_id   INT          NOT NULL COMMENT '区服编号，如：1, 2, 3',
    status      TINYINT      NOT NULL DEFAULT 0 COMMENT '状态: 0=维护中, 1=正常运行, 2=即将开服, 3=已关闭',
    open_time   DATETIME     NOT NULL COMMENT '开服时间',
    close_time  DATETIME     NULL     COMMENT '关服时间',
    host        VARCHAR(128) NULL     COMMENT '区服实例地址，如：s1.jiuzhou.game:9001',
    region      VARCHAR(32)  NOT NULL DEFAULT 'cn' COMMENT '大区：cn=国服, tw=台服, sea=东南亚',
    max_players INT          NOT NULL DEFAULT 50000 COMMENT '最大玩家数',
    online_count INT         NOT NULL DEFAULT 0 COMMENT '当前在线人数',
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_server_id (server_id),
    UNIQUE KEY uk_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='区服表';

-- 用户区服绑定表
CREATE TABLE IF NOT EXISTS user_servers (
    id          BIGINT   NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT   NOT NULL COMMENT '用户ID',
    server_id   INT      NOT NULL COMMENT '区服编号',
    last_login  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后登录区服时间',
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_server (user_id, server_id),
    KEY idx_user_id (user_id),
    KEY idx_server_id (server_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户区服绑定表';

-- 在 users 表增加 server_id 字段
ALTER TABLE users ADD COLUMN server_id INT NULL DEFAULT NULL COMMENT '当前所在区服编号';
ALTER TABLE users ADD KEY idx_server_id (server_id);
