-- ============================================================
-- 九州争鼎 - 任务系统数据库 (quest-service)
-- Port: 9007, Redis DB: 4
-- ============================================================

-- 新手引导步骤配置
CREATE TABLE IF NOT EXISTS tutorial_steps (
    id INT AUTO_INCREMENT PRIMARY KEY,
    step_order INT NOT NULL DEFAULT 0,
    step_key VARCHAR(64) NOT NULL UNIQUE COMMENT '步骤标识，如 first_login, first_battle',
    title VARCHAR(128) NOT NULL COMMENT '步骤标题',
    description TEXT COMMENT '步骤描述',
    trigger_type VARCHAR(32) NOT NULL DEFAULT 'manual' COMMENT '触发方式: manual/auto/condition',
    trigger_condition VARCHAR(256) COMMENT '触发条件表达式',
    ui_target VARCHAR(128) COMMENT 'UI目标路径，如 MainCityPanel/BuildButton',
    dialogues JSON COMMENT '对话内容列表 [{speaker, content, avatar}]',
    rewards JSON COMMENT '奖励 [{type, id, amount}]',
    is_required TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否必须完成',
    status TINYINT(1) NOT NULL DEFAULT 1 COMMENT '1:启用 0:禁用',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_step_order (step_order),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='新手引导步骤配置';

-- 用户新手引导进度
CREATE TABLE IF NOT EXISTS user_tutorial_progress (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    step_id INT NOT NULL,
    status ENUM('pending','completed','skipped') NOT NULL DEFAULT 'pending',
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_step (user_id, step_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户新手引导进度';

-- 主线章节
CREATE TABLE IF NOT EXISTS main_chapters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chapter_order INT NOT NULL DEFAULT 0,
    title VARCHAR(128) NOT NULL COMMENT '章节名称',
    description TEXT COMMENT '章节描述',
    unlock_level INT NOT NULL DEFAULT 1 COMMENT '解锁所需等级',
    unlock_condition VARCHAR(256) COMMENT '额外解锁条件',
    background_image VARCHAR(256) COMMENT '章节背景图',
    rewards JSON COMMENT '章节通关奖励',
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_chapter_order (chapter_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='主线章节';

-- 主线任务
CREATE TABLE IF NOT EXISTS main_quests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    chapter_id INT NOT NULL,
    quest_order INT NOT NULL DEFAULT 0,
    title VARCHAR(128) NOT NULL,
    description TEXT,
    quest_type VARCHAR(32) NOT NULL COMMENT '任务类型: battle/collect/explore/gather/talk',
    target_type VARCHAR(64) NOT NULL COMMENT '目标类型: monster_id/item_id/map_id/hero_count',
    target_count INT NOT NULL DEFAULT 1 COMMENT '目标数量',
    energy_cost INT NOT NULL DEFAULT 0 COMMENT '体力消耗',
    rewards JSON COMMENT '任务奖励 [{type, id, name, amount, rarity}]',
    unlock_condition VARCHAR(256) COMMENT '解锁条件',
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_chapter_id (chapter_id),
    INDEX idx_quest_order (quest_order),
    FOREIGN KEY (chapter_id) REFERENCES main_chapters(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='主线任务';

-- 用户主线任务进度
CREATE TABLE IF NOT EXISTS user_main_quest_progress (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    quest_id INT NOT NULL,
    progress INT NOT NULL DEFAULT 0 COMMENT '当前进度',
    status ENUM('locked','in_progress','completed','claimed') NOT NULL DEFAULT 'locked',
    best_record INT NOT NULL DEFAULT 0 COMMENT '最佳记录（如战斗评分）',
    completed_at DATETIME,
    claimed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_quest (user_id, quest_id),
    INDEX idx_user_status (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户主线任务进度';

-- 日常任务模板
CREATE TABLE IF NOT EXISTS daily_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_key VARCHAR(64) NOT NULL UNIQUE COMMENT '任务标识',
    title VARCHAR(128) NOT NULL,
    description TEXT,
    task_type VARCHAR(32) NOT NULL COMMENT 'login/battle/gacha/collect/guild/map',
    target_type VARCHAR(64) NOT NULL,
    target_count INT NOT NULL DEFAULT 1,
    refresh_type ENUM('daily','weekly') NOT NULL DEFAULT 'daily',
    sort_order INT NOT NULL DEFAULT 0,
    activity_points INT NOT NULL DEFAULT 0 COMMENT '活跃度奖励',
    rewards JSON COMMENT '完成奖励',
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_refresh_type (refresh_type),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='日常任务模板';

-- 用户日常任务进度
CREATE TABLE IF NOT EXISTS user_daily_progress (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    task_id INT NOT NULL,
    progress INT NOT NULL DEFAULT 0,
    status ENUM('in_progress','completed','claimed') NOT NULL DEFAULT 'in_progress',
    claimed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_task_date (user_id, task_id, created_at),
    INDEX idx_user_date (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户日常任务进度';

-- 活跃度奖励配置
CREATE TABLE IF NOT EXISTS activity_rewards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    required_points INT NOT NULL COMMENT '所需活跃度',
    rewards JSON NOT NULL COMMENT '奖励内容',
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活跃度奖励配置';

-- 成就定义
CREATE TABLE IF NOT EXISTS achievements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    category VARCHAR(32) NOT NULL COMMENT '分类: battle/collection/social/development/guild',
    achievement_key VARCHAR(64) NOT NULL UNIQUE,
    title VARCHAR(128) NOT NULL,
    description TEXT,
    icon VARCHAR(128),
    condition_type VARCHAR(64) NOT NULL COMMENT '条件类型',
    condition_params JSON COMMENT '条件参数',
    reward_points INT NOT NULL DEFAULT 0 COMMENT '成就点数',
    rewards JSON COMMENT '奖励',
    is_hidden TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否隐藏成就',
    sort_order INT NOT NULL DEFAULT 0,
    status TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_sort_order (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='成就定义';

-- 用户成就进度
CREATE TABLE IF NOT EXISTS user_achievement_progress (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    achievement_id INT NOT NULL,
    progress BIGINT NOT NULL DEFAULT 0,
    status ENUM('in_progress','completed','claimed') NOT NULL DEFAULT 'in_progress',
    completed_at DATETIME,
    claimed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_achievement (user_id, achievement_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户成就进度';


-- ============================================================
-- 种子数据
-- ============================================================

-- ──────────────────────────────────────
-- 新手引导步骤 (22条)
-- ──────────────────────────────────────
INSERT INTO tutorial_steps (step_order, step_key, title, description, trigger_type, ui_target, dialogues, rewards, is_required, status) VALUES
(1, 'welcome', '欢迎来到九州', '初次进入游戏，了解世界观', 'auto', null,
 '[{"speaker":"系统", "content":"天下大乱，群雄并起！将军，九州苍生等待您的拯救！", "avatar":"system"}]',
 '[{"type":"gold", "id":0, "amount":500}]', 1, 1),

(2, 'first_claim', '领取新手礼包', '领取注册赠送的新手礼包', 'auto', 'MainCityPanel/MailButton',
 '[{"speaker":"军师", "content":"主公，朝廷特赐新手礼包，请速领取！", "avatar":"advisor"}]',
 '[{"type":"diamond", "id":0, "amount":100}, {"type":"item", "id":1001, "amount":5}]', 1, 1),

(3, 'build_command', '建造指挥中心', '建造你的第一座建筑', 'manual', 'MainCityPanel/BuildButton',
 '[{"speaker":"军师", "content":"主公，治军先治本，先建造指挥中心统领三军！", "avatar":"advisor"}]',
 '[{"type":"gold", "id":0, "amount":200}, {"type":"exp", "id":0, "amount":50}]', 1, 1),

(4, 'build_barracks', '建造兵营', '训练士兵的第一步', 'manual', 'MainCityPanel/BuildButton',
 '[{"speaker":"武将", "content":"兵者，国之大事也！主公当速建军营！", "avatar":"general"}]',
 '[{"type":"gold", "id":0, "amount":200}, {"type":"exp", "id":0, "amount":50}]', 1, 1),

(5, 'first_recruit', '首次招募武将', '打开卡池招募你的第一位武将', 'manual', 'MainCityPanel/CardButton',
 '[{"speaker":"军师", "content":"千军易得，一将难求！主公请试试招募武将吧！", "avatar":"advisor"}]',
 '[{"type":"diamond", "id":0, "amount":50}, {"type":"gacha_ticket", "id":0, "amount":1}]', 1, 1),

(6, 'form_team', '编组出战阵容', '选择武将组建你的第一支队伍', 'manual', 'DeckEditPanel/ConfirmButton',
 '[{"speaker":"军师", "content":"良将已得，主公当排兵布阵，以成大事！", "avatar":"advisor"}]',
 '[{"type":"gold", "id":0, "amount":300}, {"type":"exp", "id":0, "amount":100}]', 1, 1),

(7, 'first_battle', '完成首次战斗', '体验你的第一场战斗', 'manual', 'BattlePanel/StartButton',
 '[{"speaker":"武将", "content":"杀敌报国，建功立业！主公，随我出征！", "avatar":"general"}]',
 '[{"type":"gold", "id":0, "amount":500}, {"type":"exp", "id":0, "amount":200}]', 1, 1),

(8, 'upgrade_hero', '强化武将', '提升你的武将实力', 'manual', 'CardCollectionPanel/UpgradeButton',
 '[{"speaker":"军师", "content":"磨刀不误砍柴工，先提升武将实力再征天下吧！", "avatar":"advisor"}]',
 '[{"type":"exp", "id":0, "amount":150}, {"type":"gold", "id":0, "amount":200}]', 1, 1),

(9, 'open_map', '打开世界地图', '了解九州格局', 'manual', 'MainCityPanel/MapButton',
 '[{"speaker":"谋士", "content":"九州大地，虎踞龙盘。主公且看天下大势！", "avatar":"strategist"}]',
 '[{"type":"exp", "id":0, "amount":80}]', 1, 1),

(10, 'view_city', '查看城池信息', '了解城池资源与驻军', 'manual', 'WorldMapPanel/CityInfo',
 '[{"speaker":"谋士", "content":"知己知彼，百战不殆。先了解敌我城池的情况吧！", "avatar":"strategist"}]',
 '[{"type":"exp", "id":0, "amount":80}]', 0, 1),

(11, 'first_march', '首次行军', '派遣军队向目标城池进发', 'manual', 'MarchPanel/MarchButton',
 '[{"speaker":"武将", "content":"大军整装待发，主公下令吧！", "avatar":"general"}]',
 '[{"type":"gold", "id":0, "amount":300}, {"type":"exp", "id":0, "amount":200}]', 1, 1),

(12, 'build_academy', '建造书院', '提升研究能力', 'manual', 'MainCityPanel/BuildButton',
 '[{"speaker":"军师", "content":"兵法有云，上兵伐谋。建造书院研习兵法吧！", "avatar":"advisor"}]',
 '[{"type":"gold", "id":0, "amount":200}, {"type":"exp", "id":0, "amount":50}]', 1, 1),

(13, 'daily_quest', '查看日常任务', '了解每日可完成的任务', 'manual', 'MainCityPanel/QuestButton',
 '[{"speaker":"系统", "content":"每日任务可以获取大量资源和活跃度奖励哦！", "avatar":"system"}]',
 '[{"type":"exp", "id":0, "amount":50}]', 0, 1),

(14, 'achievement_view', '查看成就系统', '了解成就与奖励', 'manual', 'MainCityPanel/AchievementButton',
 '[{"speaker":"系统", "content":"完成各类成就，获取丰厚奖励和成就点数！", "avatar":"system"}]',
 '[{"type":"exp", "id":0, "amount":50}]', 0, 1),

(15, 'ten_pull', '十连招募', '进行一次十连招募', 'manual', 'GachaPanel/TenPullButton',
 '[{"speaker":"军师", "content":":十连招募必出稀有武将！主公何不一试？", "avatar":"advisor"}]',
 '[{"type":"gacha_ticket", "id":0, "amount":1}, {"type":"gold", "id":0, "amount":1000}]', 1, 1),

(16, 'first_win', '获得首场胜利', '在战斗中获得胜利', 'condition', 'battle.win_count >= 1',
 '[{"speaker":"武将", "content":"旗开得胜！主公威武！", "avatar":"general"}]',
 '[{"type":"gold", "id":0, "amount":800}, {"type":"diamond", "id":0, "amount":50}]', 1, 1),

(17, 'level_5', '达到5级', '将主公等级提升到5级', 'condition', 'user.level >= 5',
 '[{"speaker":"系统", "content":"主公实力大增！前方解锁更多功能！", "avatar":"system"}]',
 '[{"type":"diamond", "id":0, "amount":100}, {"type":"stamina", "id":0, "amount":50}]', 1, 1),

(18, 'level_10', '达到10级', '将主公等级提升到10级', 'condition', 'user.level >= 10',
 '[{"speaker":"系统", "content":"主公已是一方霸主！天下指日可待！", "avatar":"system"}]',
 '[{"type":"diamond", "id":0, "amount":200}, {"type":"gacha_ticket", "id":0, "amount":3}]', 1, 1),

(19, 'collect_10_heroes', '收集10名武将', '你的武将图鉴达到10人', 'condition', 'user.hero_count >= 10',
 '[{"speaker":"谋士", "content":"主公帐下猛将如云，实力日益壮大！", "avatar":"strategist"}]',
 '[{"type":"gold", "id":0, "amount":1000}, {"type":"exp", "id":0, "amount":300}]', 0, 1),

(20, 'build_all_basic', '建造所有基础建筑', '建造指挥中心、兵营、书院、仓库、铁匠铺', 'condition', 'user.build_count >= 5',
 '[{"speaker":"军师", "content":"基础设施完备，主公基业已成！", "avatar":"advisor"}]',
 '[{"type":"diamond", "id":0, "amount":150}, {"type":"exp", "id":0, "amount":500}]', 0, 1),

(21, 'first_guild', '了解联盟', '查看联盟功能介绍', 'manual', 'MainCityPanel/GuildButton',
 '[{"speaker":"系统", "content":"加入联盟，与志同道合的玩家一起征战九州！", "avatar":"system"}]',
 '[{"type":"exp", "id":0, "amount":100}]', 0, 1),

(22, 'tutorial_complete', '新手引导完成', '恭喜完成所有新手引导！', 'condition', 'tutorial.completed_steps >= 20',
 '[{"speaker":"系统", "content":"恭喜主公完成新手引导！前方征途漫漫，愿主公立下不世之功！", "avatar":"system"}]',
 '[{"type":"diamond", "id":0, "amount":300}, {"type":"gacha_ticket", "id":0, "amount":5}, {"type":"gold", "id":0, "amount":2000}]', 1, 1);


-- ──────────────────────────────────────
-- 主线章节 (7章)
-- ──────────────────────────────────────
INSERT INTO main_chapters (chapter_order, title, description, unlock_level, background_image, rewards) VALUES
(1, '第一章：黄巾之乱', '天下大乱，黄巾贼四起，太守刘焉招募义兵。你作为一名将领，开始你的征途。', 1, 'chapters/huangjin.jpg',
 '[{"type":"diamond", "id":0, "amount":200}, {"type":"gold", "id":0, "amount":5000}, {"type":"gacha_ticket", "id":0, "amount":3}]'),

(2, '第二章：诸侯割据', '董卓祸乱朝纲，十八路诸侯起兵讨伐。天下格局初现端倪。', 5, 'chapters/zhuhou.jpg',
 '[{"type":"diamond", "id":0, "amount":300}, {"type":"gold", "id":0, "amount":8000}, {"type":"gacha_ticket", "id":0, "amount":5}]'),

(3, '第三章：官渡之战', '曹操与袁绍决战官渡，以少胜多，奠定北方霸业。', 10, 'chapters/guandu.jpg',
 '[{"type":"diamond", "id":0, "amount":500}, {"type":"gold", "id":0, "amount":12000}, {"type":"gacha_ticket", "id":0, "amount":8}]'),

(4, '第四章：赤壁烽火', '孙刘联军火烧赤壁，曹操百万大军灰飞烟灭。三国鼎立之势已成。', 15, 'chapters/chibi.jpg',
 '[{"type":"diamond", "id":0, "amount":800}, {"type":"gold", "id":0, "amount":18000}, {"type":"gacha_ticket", "id":0, "amount":10}]'),

(5, '第五章：西川取蜀', '刘备率军入川，张鲁投降，益州纳入版图。', 20, 'chapters/xichuan.jpg',
 '[{"type":"diamond", "id":0, "amount":1000}, {"type":"gold", "id":0, "amount":25000}, {"type":"gacha_ticket", "id":0, "amount":12}]'),

(6, '第六章：北伐中原', '诸葛亮六出祁山，鞠躬尽瘁。北伐之路充满艰辛。', 25, 'chapters/beifa.jpg',
 '[{"type":"diamond", "id":0, "amount":1500}, {"type":"gold", "id":0, "amount":35000}, {"type":"gacha_ticket", "id":0, "amount":15}]'),

(7, '第七章：天下归一', '最终决战！一统九州，建立新王朝。故事即将迎来终章。', 30, 'chapters/tianxia.jpg',
 '[{"type":"diamond", "id":0, "amount":3000}, {"type":"gold", "id":0, "amount":50000}, {"type":"gacha_ticket", "id":0, "amount":20}]');


-- ──────────────────────────────────────
-- 主线任务 (每章4个, 共28条)
-- ──────────────────────────────────────
-- 第一章
INSERT INTO main_quests (chapter_id, quest_order, title, description, quest_type, target_type, target_count, energy_cost, rewards) VALUES
(1, 1, '黄巾初阵', '消灭城外的黄巾贼兵', 'battle', 'monster_id', 1, 5,
 '[{"type":"gold", "id":0, "amount":200}, {"type":"exp", "id":0, "amount":100}, {"type":"item", "id":2001, "amount":2}]'),
(1, 2, '兵粮先行', '收集军粮补给前线', 'gather', 'item_id', 5, 3,
 '[{"type":"gold", "id":0, "amount":300}, {"type":"exp", "id":0, "amount":120}]'),
(1, 3, '剿匪安民', '清剿黄巾据点', 'battle', 'monster_id', 3, 8,
 '[{"type":"gold", "id":0, "amount":500}, {"type":"exp", "id":0, "amount":200}, {"type":"gacha_ticket", "id":0, "amount":1}]'),
(1, 4, '首战告捷', '击败黄巾首领张宝', 'battle', 'monster_id', 1, 10,
 '[{"type":"diamond", "id":0, "amount":50}, {"type":"gold", "id":0, "amount":1000}, {"type":"exp", "id":0, "amount":300}]');

-- 第二章
INSERT INTO main_quests (chapter_id, quest_order, title, description, quest_type, target_type, target_count, energy_cost, rewards) VALUES
(2, 1, '虎牢关前', '在虎牢关迎战华雄', 'battle', 'monster_id', 1, 8,
 '[{"type":"gold", "id":0, "amount":500}, {"type":"exp", "id":0, "amount":250}]'),
(2, 2, '三英战吕布', '联合义兄弟围攻吕布', 'battle', 'monster_id', 1, 12,
 '[{"type":"gold", "id":0, "amount":800}, {"type":"exp", "id":0, "amount":400}, {"type":"gacha_ticket", "id":0, "amount":1}]'),
(2, 3, '洛阳大火', '从董卓手中夺回洛阳', 'battle', 'map_id', 1, 15,
 '[{"type":"gold", "id":0, "amount":1000}, {"type":"exp", "id":0, "amount":500}]'),
(2, 4, '诸侯会盟', '与各路诸侯会面商讨大计', 'talk', 'hero_count', 3, 0,
 '[{"type":"diamond", "id":0, "amount":100}, {"type":"gold", "id":0, "amount":1500}, {"type":"exp", "id":0, "amount":600}]');

-- 第三章
INSERT INTO main_quests (chapter_id, quest_order, title, description, quest_type, target_type, target_count, energy_cost, rewards) VALUES
(3, 1, '白马之围', '解救白马城之围', 'battle', 'map_id', 1, 12,
 '[{"type":"gold", "id":0, "amount":800}, {"type":"exp", "id":0, "amount":400}]'),
(3, 2, '延津之战', '在延津阻击袁绍先锋', 'battle', 'monster_id', 5, 15,
 '[{"type":"gold", "id":0, "amount":1000}, {"type":"exp", "id":0, "amount":500}, {"type":"item", "id":3001, "amount":1}]'),
(3, 3, '乌巢劫粮', '夜袭乌巢烧毁袁军粮草', 'battle', 'map_id', 1, 18,
 '[{"type":"gold", "id":0, "amount":1500}, {"type":"exp", "id":0, "amount":600}]'),
(3, 4, '官渡大捷', '击败袁绍主力军', 'battle', 'monster_id', 1, 20,
 '[{"type":"diamond", "id":0, "amount":200}, {"type":"gold", "id":0, "amount":3000}, {"type":"gacha_ticket", "id":0, "amount":2}]');

-- 第四章
INSERT INTO main_quests (chapter_id, quest_order, title, description, quest_type, target_type, target_count, energy_cost, rewards) VALUES
(4, 1, '舌战群儒', '说服东吴群臣联合抗曹', 'talk', 'hero_count', 5, 0,
 '[{"type":"gold", "id":0, "amount":1200}, {"type":"exp", "id":0, "amount":600}]'),
(4, 2, '草船借箭', '获取大量箭矢备战', 'collect', 'item_id', 10, 5,
 '[{"type":"gold", "id":0, "amount":1500}, {"type":"exp", "id":0, "amount":700}]'),
(4, 3, '火烧赤壁', '发动火攻大破曹军', 'battle', 'map_id', 1, 22,
 '[{"type":"diamond", "id":0, "amount":300}, {"type":"gold", "id":0, "amount":4000}, {"type":"exp", "id":0, "amount":1000}]'),
(4, 4, '华容道上', '在华容道截击曹操', 'battle', 'monster_id', 1, 25,
 '[{"type":"diamond", "id":0, "amount":400}, {"type":"gold", "id":0, "amount":5000}, {"type":"gacha_ticket", "id":0, "amount":3}]');

-- 第五章
INSERT INTO main_quests (chapter_id, quest_order, title, description, quest_type, target_type, target_count, energy_cost, rewards) VALUES
(5, 1, '入川之路', '穿越险峻蜀道', 'explore', 'map_id', 3, 10,
 '[{"type":"gold", "id":0, "amount":1500}, {"type":"exp", "id":0, "amount":800}]'),
(5, 2, '收服马超', '与锦马超一决高下', 'battle', 'monster_id', 1, 25,
 '[{"type":"gold", "id":0, "amount":2000}, {"type":"exp", "id":0, "amount":1000}, {"type":"gacha_ticket", "id":0, "amount":2}]'),
(5, 3, '夺取成都', '攻下益州治所成都', 'battle', 'map_id', 1, 28,
 '[{"type":"gold", "id":0, "amount":3000}, {"type":"exp", "id":0, "amount":1200}]'),
(5, 4, '汉中称王', '在汉中建立根据地', 'battle', 'map_id', 1, 30,
 '[{"type":"diamond", "id":0, "amount":500}, {"type":"gold", "id":0, "amount":5000}, {"type":"gacha_ticket", "id":0, "amount":3}]');

-- 第六章
INSERT INTO main_quests (chapter_id, quest_order, title, description, quest_type, target_type, target_count, energy_cost, rewards) VALUES
(6, 1, '出师表', '整军备战准备北伐', 'collect', 'hero_count', 8, 0,
 '[{"type":"gold", "id":0, "amount":2000}, {"type":"exp", "id":0, "amount":1200}]'),
(6, 2, '街亭之战', '守住街亭要塞', 'battle', 'map_id', 1, 30,
 '[{"type":"gold", "id":0, "amount":3000}, {"type":"exp", "id":0, "amount":1500}]'),
(6, 3, '祁山突围', '突破敌军包围圈', 'battle', 'monster_id', 10, 35,
 '[{"type":"diamond", "id":0, "amount":600}, {"type":"gold", "id":0, "amount":5000}, {"type":"gacha_ticket", "id":0, "amount":3}]'),
(6, 4, '五丈原', '最终决战五丈原', 'battle', 'monster_id', 1, 40,
 '[{"type":"diamond", "id":0, "amount":800}, {"type":"gold", "id":0, "amount":8000}, {"type":"gacha_ticket", "id":0, "amount":5}]');

-- 第七章
INSERT INTO main_quests (chapter_id, quest_order, title, description, quest_type, target_type, target_count, energy_cost, rewards) VALUES
(7, 1, '平定东吴', '渡江攻打东吴', 'battle', 'map_id', 3, 35,
 '[{"type":"gold", "id":0, "amount":5000}, {"type":"exp", "id":0, "amount":2000}]'),
(7, 2, '攻克许昌', '攻占魏国都城许昌', 'battle', 'map_id', 1, 40,
 '[{"type":"diamond", "id":0, "amount":1000}, {"type":"gold", "id":0, "amount":8000}]'),
(7, 3, '一统九州', '统一所有州郡', 'explore', 'map_id', 9, 50,
 '[{"type":"diamond", "id":0, "amount":2000}, {"type":"gold", "id":0, "amount":15000}]'),
(7, 4, '天下太平', '最终BOSS战', 'battle', 'monster_id', 1, 60,
 '[{"type":"diamond", "id":0, "amount":5000}, {"type":"gold", "id":0, "amount":30000}, {"type":"gacha_ticket", "id":0, "amount":10}]');


-- ──────────────────────────────────────
-- 日常任务 (14条)
-- ──────────────────────────────────────
INSERT INTO daily_tasks (task_key, title, description, task_type, target_type, target_count, refresh_type, sort_order, activity_points, rewards) VALUES
('daily_login', '每日登录', '每天登录游戏', 'login', 'login', 1, 'daily', 1, 5,
 '[{"type":"gold", "id":0, "amount":100}]'),
('daily_battle_3', '完成3场战斗', '参与3次任何战斗', 'battle', 'battle_count', 3, 'daily', 2, 10,
 '[{"type":"gold", "id":0, "amount":200}, {"type":"exp", "id":0, "amount":50}]'),
('daily_battle_5', '完成5场战斗', '参与5次任何战斗', 'battle', 'battle_count', 5, 'daily', 3, 20,
 '[{"type":"gold", "id":0, "amount":300}, {"type":"exp", "id":0, "amount":100}]'),
('daily_gacha_1', '招募1次', '进行1次武将招募', 'gacha', 'gacha_count', 1, 'daily', 4, 10,
 '[{"type":"gold", "id":0, "amount":200}]'),
('daily_gacha_3', '招募3次', '进行3次武将招募', 'gacha', 'gacha_count', 3, 'daily', 5, 20,
 '[{"type":"gold", "id":0, "amount":500}, {"type":"gacha_ticket", "id":0, "amount":1}]'),
('daily_upgrade_hero', '强化武将1次', '对任意武将进行1次强化', 'collect', 'upgrade_count', 1, 'daily', 6, 10,
 '[{"type":"exp", "id":0, "amount":80}, {"type":"gold", "id":0, "amount":100}]'),
('daily_collect_resource', '收集资源3次', '进行3次资源收集', 'collect', 'collect_count', 3, 'daily', 7, 10,
 '[{"type":"gold", "id":0, "amount":300}]'),
('daily_main_quest', '完成1个主线任务', '完成任意1个主线任务', 'battle', 'main_quest_count', 1, 'daily', 8, 15,
 '[{"type":"exp", "id":0, "amount":150}, {"type":"gold", "id":0, "amount":300}]'),
('daily_map_explore', '探索地图2次', '在世界地图上探索2次', 'map', 'explore_count', 2, 'daily', 9, 10,
 '[{"type":"gold", "id":0, "amount":200}, {"type":"exp", "id":0, "amount":50}]'),
('daily_share', '分享给好友', '分享游戏到社交平台', 'collect', 'share_count', 1, 'daily', 10, 5,
 '[{"type":"diamond", "id":0, "amount":10}]'),
('weekly_battle_20', '每周战斗20场', '一周内完成20场战斗', 'battle', 'battle_count', 20, 'weekly', 11, 30,
 '[{"type":"gold", "id":0, "amount":1000}, {"type":"diamond", "id":0, "amount":30}]'),
('weekly_gacha_10', '每周招募10次', '一周内招募10次武将', 'gacha', 'gacha_count', 10, 'weekly', 12, 30,
 '[{"type":"gold", "id":0, "amount":1500}, {"type":"gacha_ticket", "id":0, "amount":3}]'),
('weekly_guild_contribute', '每周联盟贡献5次', '一周内向联盟贡献5次', 'guild', 'guild_contribute_count', 5, 'weekly', 13, 25,
 '[{"type":"gold", "id":0, "amount":800}, {"type":"exp", "id":0, "amount":200}]'),
('weekly_hero_5', '每周收集5名武将', '一周内获得5名新武将', 'collect', 'hero_collect_count', 5, 'weekly', 14, 30,
 '[{"type":"diamond", "id":0, "amount":50}, {"type":"gacha_ticket", "id":0, "amount":2}]');


-- ──────────────────────────────────────
-- 活跃度奖励 (10条)
-- ──────────────────────────────────────
INSERT INTO activity_rewards (required_points, rewards) VALUES
(10, '[{"type":"gold", "id":0, "amount":500}]'),
(20, '[{"type":"exp", "id":0, "amount":200}, {"type":"gold", "id":0, "amount":500}]'),
(30, '[{"type":"gacha_ticket", "id":0, "amount":1}, {"type":"gold", "id":0, "amount":500}]'),
(40, '[{"type":"diamond", "id":0, "amount":20}, {"type":"exp", "id":0, "amount":200}]'),
(50, '[{"type":"gacha_ticket", "id":0, "amount":2}, {"type":"gold", "id":0, "amount":1000}]'),
(60, '[{"type":"diamond", "id":0, "amount":50}, {"type":"exp", "id":0, "amount":500}]'),
(70, '[{"type":"gacha_ticket", "id":0, "amount":3}, {"type":"gold", "id":0, "amount":1500}]'),
(80, '[{"type":"diamond", "id":0, "amount":80}, {"type":"item", "id":4001, "amount":1}]'),
(90, '[{"type":"gacha_ticket", "id":0, "amount":5}, {"type":"diamond", "id":0, "amount":100}]'),
(100, '[{"type":"diamond", "id":0, "amount":200}, {"type":"gacha_ticket", "id":0, "amount":10}, {"type":"gold", "id":0, "amount":5000}]');


-- ──────────────────────────────────────
-- 成就定义 (35条)
-- ──────────────────────────────────────
-- 战斗类 (8)
INSERT INTO achievements (category, achievement_key, title, description, icon, condition_type, condition_params, reward_points, rewards, is_hidden, sort_order) VALUES
('battle', 'first_blood', '初战告捷', '完成第一场战斗', 'achievement_first_blood', '{"type":"battle_wins","target":1}', 5, '[{"type":"gold","amount":200}]', 0, 1),
('battle', 'battle_10', '百战之师', '累计赢得10场战斗', 'achievement_battle10', '{"type":"battle_wins","target":10}', 10, '[{"type":"gold","amount":500}]', 0, 2),
('battle', 'battle_50', '久经沙场', '累计赢得50场战斗', 'achievement_battle50', '{"type":"battle_wins","target":50}', 20, '[{"type":"diamond","amount":50}]', 0, 3),
('battle', 'battle_100', '百战百胜', '累计赢得100场战斗', 'achievement_battle100', '{"type":"battle_wins","target":100}', 50, '[{"type":"diamond","amount":200}]', 0, 4),
('battle', 'battle_500', '战神降世', '累计赢得500场战斗', 'achievement_battle500', '{"type":"battle_wins","target":500}', 100, '[{"type":"diamond","amount":500},{"type":"title","id":"war_god"}]', 1, 5),
('battle', 'perfect_clear', '完美通关', '以三星评价通关任一主线关卡', 'achievement_perfect', '{"type":"perfect_clear","target":1}', 15, '[{"type":"diamond","amount":30}]', 0, 6),
('battle', 'no_damage', '毫发无伤', '零损失通过一场战斗', 'achievement_no_damage', '{"type":"no_damage","target":1}', 30, '[{"type":"diamond","amount":100}]', 0, 7),
('battle', 'counter_win', '以弱胜强', '战力低于对手50%仍获得胜利', 'achievement_counter', '{"type":"counter_win","target":1}', 25, '[{"type":"diamond","amount":80}]', 0, 8);

-- 收集类 (7)
INSERT INTO achievements (category, achievement_key, title, description, icon, condition_type, condition_params, reward_points, rewards, is_hidden, sort_order) VALUES
('collection', 'hero_5', '初识英才', '收集5名武将', 'achievement_hero5', '{"type":"hero_count","target":5}', 5, '[{"type":"gold","amount":300}]', 0, 1),
('collection', 'hero_20', '将星云集', '收集20名武将', 'achievement_hero20', '{"type":"hero_count","target":20}', 15, '[{"type":"diamond","amount":50}]', 0, 2),
('collection', 'hero_50', '群英荟萃', '收集50名武将', 'achievement_hero50', '{"type":"hero_count","target":50}', 30, '[{"type":"diamond","amount":150}]', 0, 3),
('collection', 'hero_100', '武将大全', '收集100名武将', 'achievement_hero100', '{"type":"hero_count","target":100}', 80, '[{"type":"diamond","amount":500}]', 0, 4),
('collection', 'ssr_1', '天命之人', '获得第一张SSR武将', 'achievement_ssr1', '{"type":"ssr_count","target":1}', 10, '[{"type":"diamond","amount":50}]', 0, 5),
('collection', 'ssr_10', '天命将星', '获得10张SSR武将', 'achievement_ssr10', '{"type":"ssr_count","target":10}', 40, '[{"type":"diamond","amount":200}]', 0, 6),
('collection', 'all_factions', '四方来朝', '收集齐魏蜀吴群四大阵营武将各3人', 'achievement_all_factions', '{"type":"faction_collect","target":3}', 60, '[{"type":"diamond","amount":300}]', 0, 7);

-- 社交类 (5)
INSERT INTO achievements (category, achievement_key, title, description, icon, condition_type, condition_params, reward_points, rewards, is_hidden, sort_order) VALUES
('social', 'first_friend', '初结善缘', '添加第一位好友', 'achievement_friend1', '{"type":"friend_count","target":1}', 5, '[{"type":"gold","amount":100}]', 0, 1),
('social', 'friends_20', '广结良缘', '好友达到20人', 'achievement_friends20', '{"type":"friend_count","target":20}', 15, '[{"type":"diamond","amount":30}]', 0, 2),
('social', 'join_guild', '聚义天下', '加入一个联盟', 'achievement_join_guild', '{"type":"guild_join","target":1}', 10, '[{"type":"gold","amount":500}]', 0, 3),
('social', 'guild_level5', '联盟崛起', '联盟等级达到5级', 'achievement_guild_lv5', '{"type":"guild_level","target":5}', 30, '[{"type":"diamond","amount":100}]', 0, 4),
('social', 'share_5', '名扬四海', '分享游戏5次', 'achievement_share5', '{"type":"share_count","target":5}', 10, '[{"type":"gacha_ticket","amount":2}]', 0, 5);

-- 成长类 (8)
INSERT INTO achievements (category, achievement_key, title, description, icon, condition_type, condition_params, reward_points, rewards, is_hidden, sort_order) VALUES
('development', 'level_10', '崭露头角', '主公等级达到10级', 'achievement_lv10', '{"type":"level","target":10}', 10, '[{"type":"diamond","amount":30}]', 0, 1),
('development', 'level_20', '小有所成', '主公等级达到20级', 'achievement_lv20', '{"type":"level","target":20}', 20, '[{"type":"diamond","amount":80}]', 0, 2),
('development', 'level_30', '一方霸主', '主公等级达到30级', 'achievement_lv30', '{"type":"level","target":30}', 40, '[{"type":"diamond","amount":200}]', 0, 3),
('development', 'level_50', '天下无敌', '主公等级达到50级', 'achievement_lv50', '{"type":"level","target":50}', 80, '[{"type":"diamond","amount":500},{"type":"title","id":"supreme"}]', 1, 4),
('development', 'power_10k', '初具实力', '战力达到10000', 'achievement_power10k', '{"type":"power","target":10000}', 10, '[{"type":"gold","amount":500}]', 0, 5),
('development', 'power_50k', '实力雄厚', '战力达到50000', 'achievement_power50k', '{"type":"power","target":50000}', 30, '[{"type":"diamond","amount":150}]', 0, 6),
('development', 'build_max', '匠心独运', '任意建筑升至满级', 'achievement_build_max', '{"type":"build_max_level","target":1}', 25, '[{"type":"diamond","amount":100}]', 0, 7),
('development', 'chapter_all', '征途终章', '通过所有主线章节', 'achievement_chapter_all', '{"type":"chapters_cleared","target":7}', 100, '[{"type":"diamond","amount":1000},{"type":"title","id":"conqueror"}]', 0, 8);

-- 联盟类 (7)
INSERT INTO achievements (category, achievement_key, title, description, icon, condition_type, condition_params, reward_points, rewards, is_hidden, sort_order) VALUES
('guild', 'guild_founder', '开宗立派', '创建一个联盟', 'achievement_guild_found', '{"type":"guild_found","target":1}', 20, '[{"type":"diamond","amount":50}]', 0, 1),
('guild', 'member_50', '门客盈门', '联盟成员达到50人', 'achievement_member50', '{"type":"guild_members","target":50}', 30, '[{"type":"diamond","amount":100}]', 0, 2),
('guild', 'city_5', '开疆拓土', '联盟占领5座城池', 'achievement_city5', '{"type":"guild_cities","target":5}', 30, '[{"type":"diamond","amount":100}]', 0, 3),
('guild', 'city_20', '割据一方', '联盟占领20座城池', 'achievement_city20', '{"type":"guild_cities","target":20}', 60, '[{"type":"diamond","amount":300}]', 0, 4),
('guild', 'donate_1000', '慷慨解囊', '累计联盟贡献达到1000', 'achievement_donate1k', '{"type":"guild_donate","target":1000}', 15, '[{"type":"gold","amount":1000}]', 0, 5),
('guild', 'donate_10000', '倾尽家财', '累计联盟贡献达到10000', 'achievement_donate10k', '{"type":"guild_donate","target":10000}', 40, '[{"type":"diamond","amount":200}]', 0, 6),
('guild', 'guild_war_win', '联盟之战', '赢得一场联盟战争', 'achievement_guild_war', '{"type":"guild_war_wins","target":1}', 50, '[{"type":"diamond","amount":300}]', 1, 7);
