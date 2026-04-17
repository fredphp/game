-- ============================================================
-- 九州争鼎 - 地图系统数据库表结构
-- Database: jiuzhou  |  Engine: InnoDB  |  Charset: utf8mb4
-- ============================================================

USE `jiuzhou`;

-- ─────────────────────────────────────────────────────
-- 地图区域表（九州九大区域）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `map_regions`;
CREATE TABLE `map_regions` (
    `id`              INT          NOT NULL AUTO_INCREMENT COMMENT '区域ID',
    `name`            VARCHAR(32)  NOT NULL                COMMENT '区域名称(冀/兖/青/徐/豫/荆/扬/梁/雍)',
    `display_name`    VARCHAR(64)  NOT NULL                COMMENT '展示名',
    `description`     VARCHAR(256) DEFAULT ''              COMMENT '区域描述',
    `center_x`        INT          NOT NULL DEFAULT 0      COMMENT '中心X坐标',
    `center_y`        INT          NOT NULL DEFAULT 0      COMMENT '中心Y坐标',
    `terrain_type`    VARCHAR(20)  NOT NULL DEFAULT 'plain' COMMENT '地形 plain/mountain/river/coast',
    `resource_bonus`  JSON         DEFAULT NULL            COMMENT '资源加成(JSON)',
    `sort_order`      INT          NOT NULL DEFAULT 0      COMMENT '排序权重',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_name` (`name`),
    KEY `idx_terrain` (`terrain_type`),
    KEY `idx_sort`    (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='地图区域表';

-- ─────────────────────────────────────────────────────
-- 城池定义表（所有城池基础数据）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `map_cities`;
CREATE TABLE `map_cities` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '城池ID',
    `name`            VARCHAR(64)  NOT NULL                COMMENT '城池名',
    `region_id`       INT          NOT NULL                COMMENT '所属区域ID',
    `pos_x`           INT          NOT NULL                COMMENT '地图X坐标',
    `pos_y`           INT          NOT NULL                COMMENT '地图Y坐标',
    `level`           TINYINT      NOT NULL DEFAULT 1      COMMENT '城池等级 1~5',
    `terrain`         VARCHAR(20)  NOT NULL DEFAULT 'plain' COMMENT '地形类型',
    `defense_base`    INT          NOT NULL DEFAULT 100    COMMENT '基础防御值',
    `food_output`     INT          NOT NULL DEFAULT 100    COMMENT '粮食产出/小时',
    `wood_output`     INT          NOT NULL DEFAULT 80     COMMENT '木材产出/小时',
    `iron_output`     INT          NOT NULL DEFAULT 60     COMMENT '铁矿产出/小时',
    `gold_output`     INT          NOT NULL DEFAULT 40     COMMENT '金币产出/小时',
    `is_capital`      TINYINT(1)   NOT NULL DEFAULT 0      COMMENT '是否州城 0=否 1=是',
    `description`     VARCHAR(256) DEFAULT ''              COMMENT '城池描述',
    `connections`     JSON         DEFAULT NULL            COMMENT '相邻城池ID列表 [2,3,5]',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_region`      (`region_id`),
    KEY `idx_level`       (`level`),
    KEY `idx_position`    (`pos_x`, `pos_y`),
    KEY `idx_capital`     (`is_capital`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='城池定义表';

-- ─────────────────────────────────────────────────────
-- 城池占领表（实时占领状态）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `city_occupations`;
CREATE TABLE `city_occupations` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '记录ID',
    `city_id`         BIGINT       NOT NULL                COMMENT '城池ID',
    `owner_type`      TINYINT      NOT NULL DEFAULT 0      COMMENT '占领类型 0=中立 1=玩家 2=联盟',
    `owner_id`        BIGINT       NOT NULL DEFAULT 0      COMMENT '占领者ID(玩家ID或联盟ID)',
    `alliance_id`     BIGINT       DEFAULT NULL            COMMENT '所属联盟ID',
    `garrison_power`  INT          NOT NULL DEFAULT 0      COMMENT '驻军战力',
    `occupy_time`     DATETIME     NOT NULL                COMMENT '占领时间',
    `defense_walls`   INT          NOT NULL DEFAULT 100    COMMENT '城墙耐久(0~100)',
    `resource_stored` JSON         DEFAULT NULL            COMMENT '存储资源(JSON)',
    `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_city` (`city_id`),
    KEY `idx_owner`       (`owner_type`, `owner_id`),
    KEY `idx_alliance`    (`alliance_id`),
    KEY `idx_occupy_time` (`occupy_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='城池占领表';

-- ─────────────────────────────────────────────────────
-- 行军令表（行军记录）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `march_orders`;
CREATE TABLE `march_orders` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '行军ID',
    `march_id`        VARCHAR(64)  NOT NULL                COMMENT '行军唯一标识(UUID)',
    `user_id`         BIGINT       NOT NULL                COMMENT '发起者ID',
    `alliance_id`     BIGINT       DEFAULT NULL            COMMENT '所属联盟',
    `source_city_id`  BIGINT       NOT NULL                COMMENT '出发城池ID',
    `target_city_id`  BIGINT       NOT NULL                COMMENT '目标城池ID',
    `march_type`      TINYINT      NOT NULL DEFAULT 1      COMMENT '1=进攻 2=增援 3=侦查 4=撤退 5=迁城',
    `army_power`      INT          NOT NULL DEFAULT 0      COMMENT '出征战力',
    `army_info`       JSON         DEFAULT NULL            COMMENT '出征部队详情(JSON)',
    `path`            JSON         DEFAULT NULL            COMMENT '行军路径 [city_id,...]',
    `total_distance`  INT          NOT NULL DEFAULT 0      COMMENT '总距离',
    `march_speed`     INT          NOT NULL DEFAULT 10     COMMENT '行军速度(格/小时)',
    `status`          TINYINT      NOT NULL DEFAULT 1      COMMENT '1=行军中 2=已到达 3=战斗中 4=已返回 5=已撤回 6=已失败',
    `start_time`      DATETIME     NOT NULL                COMMENT '出发时间',
    `arrive_time`     DATETIME     NOT NULL                COMMENT '预计到达时间',
    `actual_arrive`   DATETIME     DEFAULT NULL            COMMENT '实际到达时间',
    `progress`        INT          NOT NULL DEFAULT 0      COMMENT '行军进度 0~100(百分比)',
    `battle_result`   JSON         DEFAULT NULL            COMMENT '战斗结果(JSON)',
    `consume_food`    INT          NOT NULL DEFAULT 0      COMMENT '消耗粮食',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_march_id` (`march_id`),
    KEY `idx_user_status`    (`user_id`, `status`),
    KEY `idx_target_status`  (`target_city_id`, `status`),
    KEY `idx_alliance`       (`alliance_id`),
    KEY `idx_arrive_time`    (`arrive_time`, `status`),
    KEY `idx_start_time`     (`start_time`),
    KEY `idx_processing`     (`status`, `arrive_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='行军令表';

-- ─────────────────────────────────────────────────────
-- 联盟领土表（联盟领地汇总）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `alliance_territories`;
CREATE TABLE `alliance_territories` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `alliance_id`     BIGINT       NOT NULL                COMMENT '联盟ID',
    `city_count`      INT          NOT NULL DEFAULT 0      COMMENT '拥有城池数',
    `capital_count`   INT          NOT NULL DEFAULT 0      COMMENT '拥有州城数',
    `total_food`      BIGINT       NOT NULL DEFAULT 0      COMMENT '总粮食产出/小时',
    `total_wood`      BIGINT       NOT NULL DEFAULT 0      COMMENT '总木材产出/小时',
    `total_iron`      BIGINT       NOT NULL DEFAULT 0      COMMENT '总铁矿产出/小时',
    `total_gold`      BIGINT       NOT NULL DEFAULT 0      COMMENT '总金币产出/小时',
    `territory_level` INT          NOT NULL DEFAULT 1      COMMENT '领土等级',
    `buff_config`     JSON         DEFAULT NULL            COMMENT '领土增益配置(JSON)',
    `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_alliance` (`alliance_id`),
    KEY `idx_city_count`   (`city_count`),
    KEY `idx_territory_lv` (`territory_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='联盟领土表';

-- ─────────────────────────────────────────────────────
-- 行军检查点表（心跳与断线恢复）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `march_checkpoints`;
CREATE TABLE `march_checkpoints` (
    `march_id`        VARCHAR(64)  NOT NULL                COMMENT '行军ID',
    `worker_id`       VARCHAR(32)  NOT NULL DEFAULT ''      COMMENT '处理者标识(实例+协程)',
    `progress`        INT          NOT NULL DEFAULT 0      COMMENT '检查点进度 0~100',
    `status`          TINYINT      NOT NULL DEFAULT 1      COMMENT '1=处理中 2=已完成 3=异常中断',
    `heartbeat_at`    DATETIME     NOT NULL                COMMENT '最后心跳时间',
    `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`march_id`),
    KEY `idx_status`       (`status`),
    KEY `idx_heartbeat`    (`heartbeat_at`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='行军检查点表';

-- ─────────────────────────────────────────────────────
-- 城池占领锁表（防重复占领分布式锁）
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `city_occupation_locks`;
CREATE TABLE `city_occupation_locks` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT 'ID',
    `city_id`         BIGINT       NOT NULL                COMMENT '城池ID',
    `march_id`        VARCHAR(64)  NOT NULL                COMMENT '当前处理行军ID',
    `owner_before`    JSON         DEFAULT NULL            COMMENT '占领前状态快照(JSON)',
    `lock_status`     TINYINT      NOT NULL DEFAULT 1      COMMENT '1=锁定中 2=已提交 3=已释放 4=超时释放',
    `locked_at`       DATETIME     NOT NULL                COMMENT '锁定时间',
    `expire_at`       DATETIME     NOT NULL                COMMENT '锁过期时间',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_city` (`city_id`),
    KEY `idx_march`        (`march_id`),
    KEY `idx_lock_status`  (`lock_status`, `expire_at`),
    KEY `idx_expire`       (`expire_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='城池占领锁表';

-- ─────────────────────────────────────────────────────
-- 城池战斗记录表
-- ─────────────────────────────────────────────────────
DROP TABLE IF EXISTS `city_battle_logs`;
CREATE TABLE `city_battle_logs` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '日志ID',
    `city_id`         BIGINT       NOT NULL                COMMENT '城池ID',
    `march_id`        VARCHAR(64)  DEFAULT NULL            COMMENT '关联行军ID',
    `attacker_id`     BIGINT       NOT NULL                COMMENT '进攻方ID',
    `attacker_name`   VARCHAR(64)  DEFAULT ''              COMMENT '进攻方名',
    `defender_id`     BIGINT       NOT NULL DEFAULT 0      COMMENT '防守方ID(0=中立)',
    `defender_name`   VARCHAR(64)  DEFAULT ''              COMMENT '防守方名',
    `attacker_power`  INT          NOT NULL DEFAULT 0      COMMENT '进攻方战力',
    `defender_power`  INT          NOT NULL DEFAULT 0      COMMENT '防守方战力',
    `attacker_win`    TINYINT(1)   NOT NULL DEFAULT 0      COMMENT '进攻方是否胜利',
    `result_detail`   JSON         DEFAULT NULL            COMMENT '战斗详情(JSON)',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    KEY `idx_city_time`    (`city_id`, `created_at`),
    KEY `idx_attacker`     (`attacker_id`),
    KEY `idx_defender`     (`defender_id`),
    KEY `idx_march`        (`march_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='城池战斗记录表';

-- ============================================================
-- 初始数据：九州九大区域
-- ============================================================
INSERT INTO `map_regions` (`name`, `display_name`, `description`, `center_x`, `center_y`, `terrain_type`, `sort_order`) VALUES
('ji',     '冀州', '北方粮仓，地势平坦，易守难攻',     200, 100, 'plain',    1),
('yan',    '兖州', '中原腹地，兵家必争之地',         300, 200, 'plain',    2),
('qing',   '青州', '东方沿海，商贸繁荣',             400, 150, 'coast',    3),
('xu',     '徐州', '东南沃野，鱼米之乡',             350, 300, 'plain',    4),
('yu',     '豫州', '天下之中，四通八达',             250, 280, 'plain',    5),
('jing',   '荆州', '南方重镇，兵精粮足',             220, 400, 'river',    6),
('yang',   '扬州', '东南繁华，人文荟萃',             380, 420, 'river',    7),
('liang',  '梁州', '西方屏障，蜀道险峻',             100, 350, 'mountain', 8),
('yong',   '雍州', '西北铁骑，军事要塞',             80,  180, 'mountain', 9);

-- ============================================================
-- 初始数据：部分城池（共36城）
-- ============================================================
INSERT INTO `map_cities` (`name`, `region_id`, `pos_x`, `pos_y`, `level`, `terrain`, `defense_base`, `food_output`, `wood_output`, `iron_output`, `gold_output`, `is_capital`, `description`, `connections`) VALUES
-- 冀州 (4城)
('邺城',   1, 180, 80,  5, 'plain',    500, 500, 400, 300, 200, 1, '冀州州城，曹操发家之地', '[2,3,11,12]'),
('蓟城',   1, 220, 60,  3, 'plain',    200, 200, 150, 120, 100, 0, '北方重镇，抵御游牧', '[1,3]'),
('南皮',   1, 160, 120, 2, 'plain',    120, 150, 120,  80,  60, 0, '冀南小城', '[1,4,11]'),
('平原',   1, 240, 110, 1, 'plain',     80, 100,  80,  60,  40, 0, '平原小邑', '[1,2,10]'),

-- 兖州 (4城)
('许昌',   2, 300, 200, 5, 'plain',    500, 480, 380, 280, 250, 1, '兖州州城，汉帝所在', '[5,6,14,15]'),
('陈留',   2, 260, 180, 3, 'plain',    200, 220, 180, 140, 120, 0, '曹操起兵之地', '[5,11]'),
('濮阳',   2, 330, 170, 2, 'plain',    120, 160, 130,  90,  70, 0, '黄巾之乱战场', '[5,10,14]'),
('济阴',   2, 280, 220, 1, 'plain',     80, 100,  80,  60,  40, 0, '兖州小城', '[5,6,15]'),

-- 青州 (4城)
('北海',   3, 400, 150, 4, 'coast',    350, 300, 250, 200, 180, 0, '青州治所，孔融领地', '[9,10,17,18]'),
('下邳',   3, 420, 190, 3, 'plain',    200, 180, 200, 150, 130, 0, '陶谦旧部', '[8,10,14]'),
('东莱',   3, 440, 120, 2, 'coast',    120, 140, 160,  80,  90, 0, '沿海港口', '[8]'),
('琅琊',   3, 380, 200, 1, 'plain',     80,  90,  80,  60,  50, 0, '诸葛故居', '[8,14]'),

-- 徐州 (4城)
('广陵',   4, 350, 300, 4, 'plain',    350, 320, 280, 200, 160, 0, '徐州治所', '[13,14,21,22]'),
('寿春',   4, 310, 320, 3, 'plain',    200, 200, 180, 130, 110, 0, '袁术旧都', '[13,15,22]'),
('彭城',   4, 370, 270, 2, 'plain',    120, 140, 120,  90,  70, 0, '项羽故里', '[13,10,17]'),
('下蔡',   4, 330, 340, 1, 'plain',     80, 100,  80,  60,  40, 0, '淮北小邑', '[13,22]'),

-- 豫州 (4城)
('汝南',   5, 250, 280, 4, 'plain',    350, 340, 260, 200, 170, 0, '豫州治所', '[17,18,25,26]'),
('宛城',   5, 210, 260, 3, 'plain',    200, 220, 170, 140, 110, 0, '张绣之地', '[17,11,25]'),
('陈国',   5, 270, 290, 2, 'plain',    120, 160, 130,  90,  70, 0, '豫东平原', '[17,18,26]'),
('新野',   5, 230, 310, 1, 'plain',     80, 100,  80,  60,  40, 0, '刘备驻军', '[17,19,26]'),

-- 荆州 (4城)
('襄阳',   6, 220, 400, 5, 'river',    500, 460, 360, 300, 220, 1, '荆州州城，刘表基业', '[21,22,29,30]'),
('江陵',   6, 190, 380, 3, 'river',    200, 200, 180, 160, 140, 0, '荆州要塞', '[21,25,29]'),
('江夏',   6, 260, 410, 2, 'river',    120, 160, 130,  90,  80, 0, '长江重镇', '[21,26,30]'),
('武陵',   6, 180, 440, 1, 'mountain', 80, 120, 100,  60,  50, 0, '蛮荒之地', '[21,29]'),

-- 扬州 (4城)
('建业',   7, 380, 420, 5, 'river',    500, 420, 380, 260, 280, 1, '扬州州城，孙吴都城', '[25,26,33,34]'),
('吴郡',   7, 410, 440, 3, 'river',    200, 180, 200, 140, 160, 0, '江东腹地', '[25,34]'),
('会稽',   7, 430, 460, 2, 'coast',    120, 140, 160,  80,  90, 0, '东南沿海', '[25]'),
('庐江',   7, 360, 400, 1, 'plain',     80, 100,  80,  60,  40, 0, '淮西小邑', '[25,26,30]'),

-- 梁州 (4城)
('汉中',   8, 100, 350, 4, 'mountain', 350, 300, 220, 260, 180, 0, '蜀道咽喉', '[29,30,14,15]'),
('成都',   8, 80,  380, 5, 'plain',    500, 450, 350, 280, 240, 1, '蜀汉都城，天府之国', '[29,31,32]'),
('上庸',   8, 120, 330, 2, 'mountain', 120, 140, 100, 100,  70, 0, '汉水上游', '[29]'),
('永安',   8, 130, 400, 1, 'mountain', 80,  90,  80,  60,  50, 0, '白帝城', '[29,30]'),

-- 雍州 (4城)
('长安',   9, 80,  180, 5, 'plain',    500, 440, 340, 320, 260, 1, '雍州州城，汉唐故都', '[33,34,5,6]'),
('天水',   9, 60,  140, 3, 'mountain', 200, 200, 150, 180, 120, 0, '姜维故里', '[33,35]'),
('西凉',   9, 40,  200, 2, 'plain',    120, 160, 120, 140,  90, 0, '马超领地', '[33]'),
('陈仓',   9, 100, 220, 1, 'mountain', 80,  90,  80,  80,  50, 0, '诸葛北伐要道', '[33,31]');

-- ============================================================
-- 初始化联盟领土表（占位，正式由业务层写入）
-- ============================================================
-- INSERT INTO `alliance_territories` (alliance_id) VALUES (0);
