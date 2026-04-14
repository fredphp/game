# 九州争鼎 — 战令（Battle Pass）系统设计文档 v2.0

## 一、系统概述

### 1.1 设计目标
| 目标 | KPI |
|------|-----|
| 付费转化率 | 免费玩家中 30% 购买进阶战令 |
| 日活提升 | 战令持有者 DAU 提升 40% |
| 人均消费 | 每赛季人均战令收入 ¥68~128 |
| 留存提升 | 购买战令用户次月留存率 > 85% |

### 1.2 赛季周期
```
每个赛季 = 42天（6周）
├── 第1周: 赛季开启 + 新内容上线
├── 第2~4周: 正常推进期
├── 第5周: 冲刺期（双倍经验活动）
├── 第6周: 赛季末倒计时 + 下赛季预告
└── 赛季结束后: 未领取奖励保留7天
```

---

## 二、战令等级与经验

### 2.1 经验获取表

| 行为 | 经验值 | 每日上限 | 说明 |
|------|--------|---------|------|
| 完成日常任务(6个) | 300 | 300 | 基础日常 |
| 完成周常任务(3个) | 500 | — | 每周重置 |
| 竞技场胜利 | 10 | 100 | 最多10场 |
| 世界地图占领城池 | 50 | 200 | 新占领才算 |
| PVE通关关卡 | 20 | 200 | 首通额外+50 |
| 联盟捐献 | 30 | 150 | 每日1次 |
| 抽卡(每10连) | 15 | — | 鼓励抽卡 |
| 完成副本挑战 | 25 | 150 | 每日6次 |
| 参与联盟战 | 100 | — | 每周1次 |
| 签到 | 50 | 50 | 每日签到 |

### 2.2 每日经验产出模型

| 玩家类型 | 日均经验 | 42天总经验 | 可达等级 | 占比 |
|---------|---------|-----------|---------|------|
| 休闲玩家 | 400 | 16,800 | ~35级 | 30% |
| 活跃玩家 | 700 | 29,400 | ~55级 | 45% |
| 重度玩家 | 1,100 | 46,200 | ~80级 | 20% |
| 全勤肝帝 | 1,500 | 63,000 | ~100级 | 5% |

> **设计意图**: 休闲玩家也能到35级(70%奖励)，活跃玩家可达55级(满奖励)

### 2.3 战令等级表（共100级）

| 等级区间 | 免费奖励 | 进阶奖励 | 里程碑 |
|---------|---------|---------|--------|
| 1~10级 | 金币+体力 | 钻石+抽卡券 | 10级: SR自选券(免费) |
| 11~20级 | 金币+材料 | 钻石+SSR碎片 | 20级: 限定头像框(进阶) |
| 21~30级 | 体力+经验书 | 十连券+突破石 | 30级: 限定称号(免费) |
| 31~40级 | 金币+金币 | 钻石+SR碎片×10 | 40级: 限定皮肤碎片(进阶) |
| 41~50级 | 体力+扫荡券 | 十连券×2+SSR碎片 | **50级: 限定SR角色(进阶)** |
| 51~60级 | 金币+材料 | 钻石+突破石×20 | 60级: 限定称号(进阶) |
| 61~70级 | 体力+经验书 | 十连券+SSR碎片×15 | 70级: 城池皮肤(进阶) |
| 71~80级 | 金币+金币 | 钻石+UR武器碎片 | **80级: 限定SSR角色(进阶)** |
| 81~90级 | 扫荡券+材料 | 十连券×3+UR碎片 | 90级: 专属特效(进阶) |
| 91~100级 | 金币+钻石 | 终极宝箱×10 | **100级: 赛季限定UR(进阶)** |

---

## 三、战令等级详细奖励表

### 3.1 完整100级奖励配置

```json
{
  "season_id": "S001",
  "theme": "赤壁烽火",
  "max_level": 100,
  "levels": [
    {
      "level": 1,
      "free": {"gold": 5000, "stamina": 20},
      "premium": {"diamond": 30, "recruit_ticket": 1}
    },
    {
      "level": 2,
      "free": {"gold": 5000, "exp_book": 5},
      "premium": {"diamond": 30, "sr_fragment": 5}
    },
    // ... (每级都有奖励)
    {
      "level": 10,
      "free": {"gold": 10000, "sr_select_ticket": 1},
      "premium": {"diamond": 300, "ten_pull_ticket": 1, "title": "赤壁新锐"}
    },
    {
      "level": 25,
      "free": {"stamina": 60, "gold": 20000},
      "premium": {"diamond": 500, "ten_pull_ticket": 1, "ssr_fragment": 10}
    },
    {
      "level": 50,
      "free": {"gold": 50000, "sweep_ticket": 20},
      "premium": {"diamond": 1000, "ten_pull_ticket": 2, "hero": "limited_sr_001"}
    },
    {
      "level": 80,
      "free": {"gold": 100000, "stamina": 120},
      "premium": {"diamond": 2000, "ten_pull_ticket": 3, "hero": "limited_ssr_001"}
    },
    {
      "level": 100,
      "free": {"diamond": 500, "gold": 200000},
      "premium": {"diamond": 5000, "ultimate_chest": 10, "hero": "limited_ur_001", "skin": "season_exclusive"}
    }
  ]
}
```

---

## 四、战令定价与变体

### 4.1 产品矩阵

| 产品 | 价格 | 内容 | 定位 |
|------|------|------|------|
| 战令·基础 | ¥68 | 解锁全部进阶奖励(1~100级) | 标准付费 |
| 战令·豪华 | ¥128 | 基础战令 + 立即升20级 + 限定头像框 | 中R加速 |
| 战令·至尊 | ¥328 | 豪华战令 + 立即升50级 + 限定称号+皮肤 | 大R速满 |
| 战令·等级包 | ¥6×N | 每次购买升5级，最多购买20次 | 渐进式追加 |

> **追加购买设计**: 玩家可以随时付费补等级，但总花费不超过至尊战令

### 4.2 进阶战令总价值计算

| 奖励类型 | 免费线总量 | 进阶线额外 | 进阶线总价值(¥) |
|---------|-----------|-----------|---------------|
| 钻石 | 3,500 | 20,000 | ¥200 |
| 十连券 | 0 | 15张 | ¥270 |
| SSR碎片 | 0 | 80片 | ~¥160 |
| 限定角色 | 0 | 1SR+1SSR | ~¥300 |
| 材料/体力 | 大量 | 大量 | ~¥100 |
| 皮肤/特效 | 0 | 3件 | ~¥200 |
| **合计** | — | — | **~¥1,230** |

> **性价比话术**: "¥68 获得 ¥1,230 价值，超值18倍！"

---

## 五、数据库设计

```sql
-- 战令赛季配置表
CREATE TABLE `battle_pass_seasons` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT COMMENT '赛季ID',
    `season_no`       VARCHAR(16)  NOT NULL                COMMENT '赛季编号 S001/S002',
    `theme`           VARCHAR(64)  NOT NULL                COMMENT '赛季主题名',
    `start_time`      DATETIME     NOT NULL                COMMENT '开始时间',
    `end_time`        DATETIME     NOT NULL                COMMENT '结束时间',
    `reward_end_time` DATETIME     NOT NULL                COMMENT '奖励领取截止时间',
    `max_level`       INT          NOT NULL DEFAULT 100     COMMENT '最大等级',
    `level_config`    JSON         NOT NULL                COMMENT '等级奖励配置JSON',
    `status`          TINYINT      NOT NULL DEFAULT 1      COMMENT '1=进行中 0=已结束',
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_season_no` (`season_no`)
) COMMENT='战令赛季配置表';

-- 用户战令进度表
CREATE TABLE `user_battle_pass` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT,
    `user_id`         BIGINT       NOT NULL                COMMENT '用户ID',
    `season_id`       BIGINT       NOT NULL                COMMENT '赛季ID',
    `level`           INT          NOT NULL DEFAULT 0      COMMENT '当前等级',
    `exp`             INT          NOT NULL DEFAULT 0      COMMENT '当前等级经验',
    `total_exp`       BIGINT       NOT NULL DEFAULT 0      COMMENT '累计获得经验',
    `is_premium`      TINYINT(1)   NOT NULL DEFAULT 0      COMMENT '是否购买进阶 0=免费 1=进阶 2=豪华 3=至尊',
    `premium_order_no` VARCHAR(64) DEFAULT ''              COMMENT '进阶购买订单号',
    `bought_levels`   INT          NOT NULL DEFAULT 0      COMMENT '付费购买的等级数',
    `free_claimed`    VARCHAR(512) NOT NULL DEFAULT ''      COMMENT '已领取的免费等级(位图)',
    `premium_claimed` VARCHAR(512) NOT NULL DEFAULT ''      COMMENT '已领取的进阶等级(位图)',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_user_season` (`user_id`, `season_id`),
    KEY `idx_season_level` (`season_id`, `level`)
) COMMENT='用户战令进度表';

-- 战令经验日志表
CREATE TABLE `battle_pass_exp_logs` (
    `id`              BIGINT       NOT NULL AUTO_INCREMENT,
    `user_id`         BIGINT       NOT NULL,
    `season_id`       BIGINT       NOT NULL,
    `source`          VARCHAR(32)  NOT NULL                COMMENT '经验来源 daily/weekly/pvp/pve/gacha/... ',
    `source_detail`   VARCHAR(128) DEFAULT ''              COMMENT '来源详情',
    `exp_gain`        INT          NOT NULL                COMMENT '获得经验',
    `level_before`    INT          NOT NULL                COMMENT '升级前等级',
    `level_after`     INT          NOT NULL                COMMENT '升级后等级',
    `created_at`      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_season` (`user_id`, `season_id`),
    KEY `idx_created` (`created_at`)
) COMMENT='战令经验日志表';
```

---

## 六、战令运营节奏

```
     第1周              第2~4周            第5周             第6周
  ┌──────────┐    ┌──────────────┐    ┌──────────┐    ┌──────────┐
  │ 开服福利  │    │  常规推进     │    │ 双倍经验  │    │ 倒计时   │
  │ 首日双倍  │    │  周任务更新   │    │ 冲刺活动  │    │ 最终奖励 │
  │ 登录送10级 │    │  中期礼包上架 │    │ 等级追赶包 │    │ 下赛季预 │
  └──────────┘    └──────────────┘    └──────────┘    └──────────┘
```
