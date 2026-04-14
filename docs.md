# 九州争鼎 (Jiuzhou Zhengding) — 项目完整文档

> **SLG 策略卡牌游戏** | Go 微服务后端 + Unity 客户端 + Next.js 文档站
>
> GitHub: `https://github.com/fredphp/game.git` (branch: main)

---

## 目录

- [一、项目架构总览](#一项目架构总览)
- [二、项目目录结构](#二项目目录结构)
- [三、微服务矩阵](#三微服务矩阵)
- [四、MySQL 数据库结构](#四mysql-数据库结构)
- [五、REST API 全量端点](#五rest-api-全量端点)
- [六、核心业务逻辑](#六核心业务逻辑)
- [七、Unity 客户端架构](#七unity-客户端架构)
- [八、Redis 缓存策略](#八redis-缓存策略)
- [九、商业化设计概要](#九商业化设计概要)
- [十、技术栈清单](#十技术栈清单)

---

## 一、项目架构总览

```
                         ┌──────────────┐
                         │   Unity 客户端  │ (C# / 37文件 / 19,162行)
                         │  HTTP + WSocket │
                         └──────┬───────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
             ┌──────────┐ ┌──────────┐ ┌──────────┐
             │ Caddy    │ │ Caddy    │ │ Caddy    │  反向代理网关
             │ :3000    │ │ :3000    │ │ :3000    │  (XTransformPort)
             └────┬─────┘ └────┬─────┘ └────┬─────┘
                  │            │            │
    ┌─────────────┼────────────┼────────────┼─────────────┐
    ▼             ▼            ▼            ▼             ▼
┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐
│ user   │  │ card   │  │battle  │  │ map    │  │ guild  │  │payment │
│ :9001  │  │ :9002  │  │ :9003  │  │ :9004  │  │ :9005  │  │ :9006  │
│ DB:0   │  │ DB:0   │  │ DB:0   │  │ DB:1   │  │ DB:2   │  │ DB:3   │
└───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘  └───┬────┘
    │           │           │           │           │           │
    └───────────┴───────────┴─────┬─────┴───────────┴───────────┘
                                 │
                    ┌────────────┼────────────┐
                    ▼                         ▼
             ┌────────────┐           ┌────────────┐
             │  MySQL 8.0 │           │  Redis 7.0 │
             │  jiuzhou DB│           │  DB 0~3    │
             └────────────┘           └────────────┘
```

### 设计原则

| 原则 | 实现 |
|------|------|
| **微服务隔离** | 每个服务独立进程、独立端口、独立 Redis DB |
| **JWT 双令牌** | Access Token (2h) + Refresh Token (7d) |
| **Cache-Aside** | 先查 Redis 缓存，未命中再查 MySQL |
| **高并发** | Redis Stream 消费者组 + Goroutine Worker Pool |
| **统一响应** | `{code, message, data}` 标准格式 |

---

## 二、项目目录结构

```
game/
├── 📁 user-service/                    # 用户系统微服务
│   ├── cmd/main.go                     # 入口
│   ├── config/config.yaml              # 配置 (port:9001, redis:db0)
│   ├── docs/schema.sql                 # 数据库表 (1表)
│   ├── internal/
│   │   ├── model/user_model.go         # 用户模型
│   │   ├── dao/user_dao.go             # 数据访问层
│   │   ├── service/user_service.go     # 业务逻辑层
│   │   ├── handler/user_handler.go     # HTTP处理层 (6接口)
│   │   ├── router/router.go            # 路由注册
│   │   └── middleware/auth.go          # JWT中间件
│   └── pkg/{jwt,mysql,redis,response}  # 公共包
│
├── 📁 card-service/                    # 卡牌系统微服务
│   ├── cmd/main.go                     # 入口
│   ├── config/config.yaml              # 配置 (port:9002, redis:db0)
│   ├── docs/
│   │   ├── schema.sql                  # 数据库表 (5表)
│   │   └── pool_config_example.json    # 卡池配置示例
│   ├── internal/
│   │   ├── model/card_model.go         # 卡牌模型 + PoolConfig
│   │   ├── engine/gacha_engine.go      # ★抽卡引擎 (软/硬保底, crypto/rand)
│   │   ├── dao/card_dao.go             # 数据访问层
│   │   ├── service/card_service.go     # 业务逻辑 + Redis缓存
│   │   ├── handler/card_handler.go     # HTTP处理层 (6接口)
│   │   ├── router/router.go            # 路由注册
│   │   └── middleware/auth.go
│   └── pkg/
│
├── 📁 battle-service/                  # 战斗系统微服务
│   ├── cmd/main.go                     # 入口
│   ├── config/config.yaml              # 配置 (port:9003, redis:db0)
│   ├── docs/
│   │   ├── schema.sql                  # 数据库表 (3表)
│   │   └── skills_config.json          # 技能配置
│   ├── internal/
│   │   ├── model/battle_model.go       # 战斗模型
│   │   ├── engine/battle_engine.go     # ★战斗引擎 (回合制, 技能, 阵营克制)
│   │   ├── dao/battle_dao.go           # 数据访问层
│   │   ├── service/battle_service.go   # 业务逻辑
│   │   ├── handler/battle_handler.go   # HTTP处理层 (3接口)
│   │   ├── router/router.go
│   │   └── middleware/auth.go
│   └── pkg/
│
├── 📁 map-service/                     # 地图系统微服务
│   ├── cmd/main.go                     # 入口
│   ├── config/config.yaml              # 配置 (port:9004, redis:db1)
│   ├── docs/
│   │   ├── schema.sql                  # 数据库表 (6表 + 初始数据)
│   │   └── map_config_example.json     # 地图配置示例
│   ├── internal/
│   │   ├── model/map_model.go          # 地图模型 (10结构体)
│   │   ├── engine/march_engine.go      # ★行军引擎 (BFS寻路, Redis Stream, Worker池)
│   │   ├── dao/map_dao.go              # 数据访问层 (30+方法)
│   │   ├── service/map_service.go      # 业务逻辑 + 6层Redis缓存
│   │   ├── handler/map_handler.go      # HTTP处理层 (9接口)
│   │   ├── router/router.go
│   │   └── middleware/auth.go
│   └── pkg/
│
├── 📁 guild-service/                   # 联盟系统微服务
│   ├── cmd/main.go                     # 入口
│   ├── config/config.yaml              # 配置 (port:9005, redis:db2)
│   ├── docs/schema.sql                 # 数据库表 (7表 + 科技定义)
│   ├── internal/
│   │   ├── model/guild_model.go        # 联盟模型
│   │   ├── engine/war_engine.go        # ★战争引擎 (协作战斗, 领土计算)
│   │   ├── dao/guild_dao.go            # 数据访问层
│   │   ├── service/guild_service.go    # 业务逻辑 + Redis缓存
│   │   ├── handler/guild_handler.go    # HTTP处理层 (20接口)
│   │   ├── router/router.go
│   │   └── middleware/auth.go
│   └── pkg/
│
├── 📁 payment-service/                 # 支付系统微服务
│   ├── cmd/main.go                     # 入口
│   ├── config/config.yaml              # 配置 (port:9006, redis:db3)
│   ├── docs/schema.sql                 # 数据库表 (8表)
│   ├── internal/
│   │   ├── model/payment_model.go      # 支付模型
│   │   ├── engine/payment_engine.go    # ★支付引擎 (订单/发货/回调)
│   │   ├── dao/payment_dao.go          # 数据访问层
│   │   ├── service/payment_service.go  # 业务逻辑
│   │   ├── handler/payment_handler.go  # HTTP处理层
│   │   ├── router/router.go
│   │   └── middleware/auth.go
│   └── pkg/
│
├── 📁 unity-client/                    # Unity C# 客户端
│   └── Assets/Scripts/
│       ├── GameEntry.cs                # Unity入口点
│       ├── Core/                       # 核心框架 (14文件)
│       │   ├── Base/Singleton.cs       # 泛型单例基类
│       │   ├── Utils/{Constants,EventBus,JsonHelper}.cs
│       │   ├── Network/{HttpClient,WebSocketClient,ApiResult}.cs
│       │   ├── Network/Api/{User,Card,Battle,Map,Guild}Api.cs
│       │   ├── UI/{UIBase,UILayer}.cs
│       │   └── Manager/{Game,UI,Network,Audio}Manager.cs
│       ├── Data/                       # 数据模型 (5文件)
│       │   └── {User,Card,Battle,Map,Guild}Model.cs
│       └── Module/                     # 业务模块 (13文件)
│           ├── Login/{Login,Register}Panel.cs
│           ├── MainCity/{MainCity,BuildingInfo}Panel.cs
│           ├── Card/{CardCollection,Gacha,DeckEdit}Panel.cs
│           ├── Battle/{BattleManager,Battle,BattleResult}Panel.cs
│           └── Map/{WorldMap,CityInfo,March}Panel.cs
│
├── 📁 docs/design/commercial/          # 商业化设计文档
│   ├── 01_vip_system.md               # VIP体系
│   ├── 02_gacha_model.md              # 抽卡模型
│   ├── 03_battle_pass.md              # 战令系统
│   ├── 04_event_system.md             # 活动运营
│   ├── 05_retention_design.md         # 留存设计
│   └── 06_numerical_model.md          # 数值模型
│
├── 📁 src/                             # Next.js 文档站 (项目展示页)
├── Caddyfile                          # 网关配置
├── worklog.md                         # 开发工作日志
└── README.md
```

---

## 三、微服务矩阵

| 服务 | 端口 | Redis DB | Go文件数 | 核心引擎 | API接口数 |
|------|------|----------|---------|---------|----------|
| **user-service** | 9001 | 0 | 6 | — | 6 |
| **card-service** | 9002 | 0 | 6 | GachaEngine (抽卡) | 6 |
| **battle-service** | 9003 | 0 | 6 | BattleEngine (战斗) | 3 |
| **map-service** | 9004 | 1 | 8 | MarchEngine (行军) | 9 |
| **guild-service** | 9005 | 2 | 6 | WarEngine (战争) | 20 |
| **payment-service** | 9006 | 3 | 6 | PaymentEngine (支付) | — |
| **合计** | — | 0~3 | **38** | **4个核心引擎** | **44+** |

### 共享技术组件 (每个服务的 `pkg/`)

| 包 | 功能 |
|----|------|
| `pkg/mysql/` | GORM MySQL 连接池管理 |
| `pkg/redis/` | go-redis Redis 客户端 |
| `pkg/jwt/` | JWT Access+Refresh 双令牌签发/验证 |
| `pkg/response/` | 统一 `{code, message, data}` 响应格式 |

---

## 四、MySQL 数据库结构

> 数据库: `jiuzhou` | 引擎: InnoDB | 字符集: utf8mb4

### 4.1 用户系统 (user-service) — 1 表

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `users` | 用户主表 | id, username, password(bcrypt), nickname, vip_level, gold, diamond, level, experience |

### 4.2 卡牌系统 (card-service) — 5 表

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `card_definitions` | 卡牌定义(配置表) | id, name, rarity(3/4/5), faction(wei/shu/wu/qun), base_hp/atk/def, skill_id, is_limited |
| `card_pools` | 卡池配置 | id, name, type(normal/limited/rateup), config(JSON:概率/保底/卡牌列表) |
| `user_cards` | 玩家持有卡牌 | id, user_id, card_id, star(1~6), level, exp, is_locked |
| `gacha_records` | 抽卡记录 | id, user_id, pool_id, card_id, rarity, is_new, is_pity, pull_index |
| `user_gacha_stats` | 抽卡统计(保底计数) | user_id, pool_id, total_pulls, ssr_pity_counter, sr_pity_counter |

### 4.3 战斗系统 (battle-service) — 3 表

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `battle_records` | 战斗记录 | battle_id, attacker_id, defender_id, type(pve/pvp/guild_war), turn_count, result_json |
| `skill_definitions` | 技能定义(配置表) | id, name, type(normal/active/passive), target_type, damage_ratio, cd, special(heal/shield) |
| `stage_definitions` | PVE关卡(配置表) | id, chapter, stage_num, name, difficulty(1~5), enemy_team_json, rewards_json |

### 4.4 地图系统 (map-service) — 6 表 + 初始数据

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `map_regions` | 九州九大区域 | id, name(冀/兖/青/徐/豫/荆/扬/梁/雍), center_x/y, terrain_type |
| `map_cities` | 36座城池 | id, name, region_id, pos_x/y, level(1~5), defense_base, food/wood/iron/gold_output, connections(JSON) |
| `city_occupations` | 城池占领状态 | city_id, owner_type(中立/玩家/联盟), owner_id, garrison_power, defense_walls |
| `march_orders` | 行军令 | march_id(UUID), user_id, source/target_city_id, march_type, army_power, path(JSON), status(6种), progress |
| `alliance_territories` | 联盟领土汇总 | alliance_id, city_count, capital_count, total_food/wood/iron/gold, territory_level |
| `city_battle_logs` | 城池战斗日志 | city_id, march_id, attacker/defender, attacker/defender_win, result_detail |

**初始数据**: 9个区域(九州) + 36座城池(含邻接关系)

### 4.5 联盟系统 (guild-service) — 7 表

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `guilds` | 联盟主表 | id, name, tag, leader_id, level(1~5), member_count, max_members, total_power, city_count |
| `guild_members` | 联盟成员 | guild_id, user_id, role(盟主/副盟主/长老/成员), power, contribution, kick_cooldown |
| `guild_applications` | 入盟申请 | guild_id, user_id, status(待审批/通过/拒绝/取消), reviewer_id |
| `guild_wars` | 联盟战争 | war_id, attacker/defender_guild, target_city_id, status(准备/进行/结束), attacker/defender_score |
| `guild_war_battles` | 战争协作战斗 | battle_id, war_id, city_id, leader_id, contributors(JSON), total_army, coop_bonus |
| `guild_log` | 联盟操作日志 | guild_id, user_id, action(create/join/leave/kick/declare_war/donate等) |
| `guild_technologies` | 联盟科技 | guild_id, tech_key, level(0~5), researching, research_start/end |

### 4.6 支付系统 (payment-service) — 8 表

| 表名 | 说明 | 关键字段 |
|------|------|---------|
| `payment_orders` | 充值订单 | order_no, user_id, product_type(1~4), amount(分), channel(wechat/alipay/appstore), status(5种) |
| `payment_callbacks` | 支付回调(防重放) | callback_id, order_no, raw_data, signature, status |
| `user_monthly_cards` | 月卡 | user_id, order_no, start/end_date, status, claimed_days |
| `user_gift_purchases` | 礼包购买记录 | user_id, gift_key, order_no, reset_next |
| `user_vip_records` | VIP记录 | user_id, vip_level(1~5), exp, expire_at, last_daily_claim |
| `user_wallet_logs` | 钱包流水 | user_id, currency, change_amount, balance_before/after, reason |
| `growth_fund_milestones` | 成长基金里程碑 | user_id, order_no, level, reward_currency/amount, status |
| `refund_records` | 退款记录 | refund_no, order_no, refund_amount, status(申请/退款/拒绝) |

### 数据库总计

| 系统 | 表数量 | 核心功能 |
|------|--------|---------|
| user-service | 1 | 用户账号、资源、VIP |
| card-service | 5 | 卡牌定义、卡池、玩家背包、抽卡记录 |
| battle-service | 3 | 战斗记录、技能定义、PVE关卡 |
| map-service | 6 | 九州区域、36城池、占领状态、行军、领土、战报 |
| guild-service | 7 | 联盟管理、成员、申请、战争、协作战斗、科技 |
| payment-service | 8 | 订单、回调、月卡、礼包、VIP、钱包、基金、退款 |
| **合计** | **30 表** | — |

---

## 五、REST API 全量端点

### Base URL: `http://localhost:{port}/api/v1`

#### 5.1 用户系统 `:9001`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/user/register` | ❌ | 注册 {username, password, nickname} |
| POST | `/user/login` | ❌ | 登录 {username, password} → {user, token} |
| GET | `/user/profile` | ✅ | 获取个人信息 |
| PUT | `/user/profile` | ✅ | 更新资料 {nickname, avatar} |
| PUT | `/user/password` | ✅ | 修改密码 {old_password, new_password} |
| POST | `/user/logout` | ✅ | 登出(加入Token黑名单) |

#### 5.2 卡牌系统 `:9002`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/card/pools` | ❌ | 获取所有开放卡池 |
| POST | `/card/gacha` | ✅ | 抽卡 {pool_id, count(1/10)} |
| GET | `/card/list` | ✅ | 我的卡牌列表 ?page&pageSize |
| PUT | `/card/:id/lock` | ✅ | 锁定/解锁卡牌 {locked} |
| GET | `/card/gacha/history` | ✅ | 抽卡历史 ?page |
| GET | `/card/gacha/stats` | ✅ | 抽卡统计(各稀有度数量) |

#### 5.3 战斗系统 `:9003`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| POST | `/battle/pve` | ✅ | PVE战斗 {deck_cards, stage_id} |
| GET | `/battle/replay/:id` | ✅ | 战斗回放 |
| GET | `/battle/history` | ✅ | 战斗历史 ?page |

#### 5.4 地图系统 `:9004`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/map/overview` | ❌ | 九州地图总览 |
| GET | `/map/regions` | ❌ | 九大区域列表 |
| GET | `/map/region/:regionId/cities` | ❌ | 区域城池列表 |
| GET | `/map/city/:id` | ❌ | 城池详情 |
| GET | `/map/city/:id/logs` | ❌ | 城池战报 |
| POST | `/map/march` | ✅ | 发起行军 {target_city_id, troop_type, troop_count} |
| GET | `/map/march/list` | ✅ | 我的行军列表 |
| GET | `/map/march/:marchId/progress` | ✅ | 行军进度 |
| POST | `/map/march/:marchId/recall` | ✅ | 撤回行军 |
| GET | `/map/alliance/:allianceId/territory` | ✅ | 联盟领土 |

#### 5.5 联盟系统 `:9005`

| 方法 | 路径 | 认证 | 说明 |
|------|------|------|------|
| GET | `/guild/list` | ❌ | 联盟列表 ?page&search |
| GET | `/guild/:id` | ❌ | 联盟详情 |
| GET | `/guild/:id/members` | ❌ | 成员列表 |
| GET | `/guild/:id/logs` | ❌ | 联盟日志 |
| GET | `/guild/war/:warId` | ❌ | 战争详情 |
| POST | `/guild/create` | ✅ | 创建联盟 {name, announcement} |
| GET | `/guild/my` | ✅ | 我的联盟 |
| POST | `/guild/join` | ✅ | 申请加入 {guild_id} |
| POST | `/guild/leave` | ✅ | 退出联盟 {guild_id} |
| PUT | `/guild/:id` | ✅ | 更新联盟 {name, announcement, icon} |
| POST | `/guild/:id/disband` | ✅ | 解散联盟 |
| POST | `/guild/:id/kick/:userId` | ✅ | 踢出成员 |
| PUT | `/guild/:id/role/:userId/:role` | ✅ | 晋升降职 |
| GET | `/guild/:id/applications` | ✅ | 待审批列表 |
| POST | `/guild/:id/approve/:appId` | ✅ | 审批申请 {approved} |
| POST | `/guild/war/declare` | ✅ | 宣战 {target_guild_id} |
| GET | `/guild/:id/wars` | ✅ | 战争列表 |
| POST | `/guild/:id/war/:warId/surrender` | ✅ | 投降 |
| POST | `/guild/war/coop/initiate` | ✅ | 发起协作战斗 {city_id, troop_count} |
| POST | `/guild/war/coop/join` | ✅ | 加入协作 {battle_id, troop_count} |
| POST | `/guild/war/coop/:battleId/start` | ✅ | 强制开战 |

---

## 六、核心业务逻辑

### 6.1 抽卡引擎 (GachaEngine)

```
输入: 卡池配置 + 玩家保底计数
输出: 单张卡牌结果

流程:
  1. 检查硬保底 → SSR累计80抽必出
  2. 检查SR硬保底 → SR累计10抽必出
  3. 计算软保底概率:
     - 0~59抽: 基础概率 2.0%
     - 60~74抽: 线性提升至 12.0%
     - 75~79抽: 指数增长至 ~100%
  4. crypto/rand 概率抽取 (万分之一精度)
  5. SSR命中 → 50%概率出UP角色, 保底时75%
  6. 更新保底计数器
```

**概率分布**: R 86% | SR 12% | SSR 2% (含软保底，期望52~58抽出SSR)

### 6.2 行军引擎 (MarchEngine)

```
输入: 玩家行军请求
处理: Redis Stream 消费者模型

架构:
  Producer → Redis Stream (XADD)
              ↓
  Consumer Group (5 Workers) ← XREADGROUP 阻塞读取
              ↓
  处理行军 → BFS最短路径计算 → 写入进度
              ↓
  Progress Updater (独立协程) → 定时更新行军进度
              ↓
  行军到达 → 自动触发战斗 → 更新城池占领

行军类型: 进攻 / 增援 / 侦查 / 撤退 / 迁城
行军限制: 单用户最大3个同时行军
撤回规则: 返还80%消耗资源
```

### 6.3 战斗引擎 (BattleEngine)

```
回合制自动战斗 (5v5):

每回合:
  1. 速度排序 → 决定出手顺序
  2. 选目标 → 优先攻击敌方速度最高
  3. 判定技能 → 冷却完毕50%概率使用
  4. 计算伤害:
     基础伤害 = ATK × 技能倍率 × 随机(0.9~1.1)
     暴击: 10%概率, 1.5×伤害
     克制: 魏>蜀>吴>群>魏, 20%额外加成
     减防: - DEF × 0.5
  5. 应用伤害 → 检查死亡 → 检查胜负

胜负判定:
  - 一方全灭 → 另一方胜
  - 超过30回合 → 判负
  - 星级: 全员存活=3星, 60%+=2星, 有存活=1星
```

### 6.4 战争引擎 (WarEngine)

```
联盟战争流程:
  1. 宣战 → 消耗1000金币, 进入2小时准备期
  2. 准备期 → 双方部署防守, 协作组队
  3. 战斗期(24h) → 多次协作攻城
  4. 协作战斗:
     - 发起者 + 最多5名协作者
     - 协作加成: 每人+8%战力, 发起者+15%
     - 加入窗口: 10分钟
  5. 结算 → 攻防积分比较, 城池变更, 战利品分配
```

### 6.5 支付引擎 (PaymentEngine)

```
支付流程:
  1. 创建订单 → 生成唯一order_no, 30分钟过期
  2. 发起支付 → 调用微信/支付宝/AppStore
  3. 回调处理:
     - 验签 + 幂等性检查(payment_callbacks)
     - 更新订单状态 → 发货
     - 记录钱包流水(user_wallet_logs)
  4. 失败重试 → 最多3次, 间隔5秒

商品类型:
  - 钻石充值: 6档 (¥6~648)
  - 月卡: ¥30, 每日100钻, 30天
  - 礼包: 新手/成长基金/每周特惠
  - VIP: 5级累充
```

---

## 七、Unity 客户端架构

### 7.1 分层架构

```
┌───────────────────────────────────────────────┐
│                  Module 业务层                   │
│  Login | MainCity | Card | Battle | Map       │
├───────────────────────────────────────────────┤
│                  Data 数据层                     │
│  UserModel | CardModel | BattleModel | ...    │
├───────────────────────────────────────────────┤
│              Core/Network 网络层                 │
│  HttpClient | WebSocket | ApiResult | Token   │
├───────────────────────────────────────────────┤
│               Core/UI 界面层                     │
│  UIManager (6层Canvas) | UIBase (生命周期)     │
├───────────────────────────────────────────────┤
│              Core/Manager 管理层                 │
│  GameManager | NetworkManager | AudioManager  │
├───────────────────────────────────────────────┤
│               Core/Base 基础层                   │
│  Singleton<T> | EventBus | Constants           │
└───────────────────────────────────────────────┘
```

### 7.2 UI 六层 Canvas 系统

| 层级 | 名称 | SortingOrder | 用途 |
|------|------|-------------|------|
| 0 | Background | 0 | 全屏背景图 |
| 100 | Scene | 100 | 3D场景/地图 |
| 200 | Main | 200 | 主界面面板 |
| 300 | Popup | 300 | 弹窗/对话框 |
| 400 | Top | 400 | 顶部状态栏 |
| 500 | Guide | 500 | 新手引导/遮罩 |

### 7.3 37个 C# 文件清单

| 分类 | 文件 | 行数 | 功能 |
|------|------|------|------|
| **入口** | GameEntry.cs | 240 | 游戏启动、Token检查、生命周期 |
| **基础** | Singleton.cs | 131 | 泛型单例(双重检查锁) |
| **工具** | Constants.cs | 422 | 端口/端点/事件常量 |
| **工具** | EventBus.cs | 347 | 线程安全事件总线 |
| **工具** | JsonHelper.cs | 340 | JSON序列化(List支持) |
| **网络** | ApiResult.cs | 375 | 响应包装 + TokenHolder |
| **网络** | HttpClient.cs | 483 | UnityWebRequest HTTP封装 |
| **网络** | WebSocketClient.cs | 519 | 长轮询实时通信 |
| **网络** | UserApi.cs | 199 | 用户API (6端点) |
| **网络** | CardApi.cs | 271 | 卡牌API (6端点) |
| **网络** | BattleApi.cs | 94 | 战斗API (3端点) |
| **网络** | MapApi.cs | 236 | 地图API (10端点) |
| **网络** | GuildApi.cs | 513 | 联盟API (20端点) |
| **UI** | UIBase.cs | 510 | 面板基类(生命周期+动画) |
| **UI** | UILayer.cs | 95 | 6层枚举 |
| **管理** | GameManager.cs | 683 | 游戏状态机 |
| **管理** | UIManager.cs | 622 | 面板管理(Canvas系统) |
| **管理** | NetworkManager.cs | 609 | 网络编排+Token刷新 |
| **管理** | AudioManager.cs | 498 | 音频管理 |
| **数据** | UserModel.cs | 167 | 用户模型 |
| **数据** | CardModel.cs | 542 | 卡牌模型 |
| **数据** | BattleModel.cs | 212 | 战斗模型 |
| **数据** | MapModel.cs | 373 | 地图模型 |
| **数据** | GuildModel.cs | 564 | 联盟模型 |
| **模块** | LoginPanel.cs | 431 | 登录界面 |
| **模块** | RegisterPanel.cs | 297 | 注册界面 |
| **模块** | MainCityPanel.cs | 444 | 主城界面 |
| **模块** | BuildingInfoPanel.cs | 536 | 建筑详情 |
| **模块** | CardCollectionPanel.cs | 478 | 卡牌图鉴 |
| **模块** | GachaPanel.cs | 565 | 抽卡界面 |
| **模块** | DeckEditPanel.cs | 734 | 编队界面 |
| **模块** | BattleManager.cs | 1021 | ★战斗引擎 |
| **模块** | BattlePanel.cs | 1183 | 战斗界面 |
| **模块** | BattleResultPanel.cs | 924 | 战斗结算 |
| **模块** | WorldMapPanel.cs | 1278 | 世界地图 |
| **模块** | CityInfoPanel.cs | 977 | 城池详情 |
| **模块** | MarchPanel.cs | 1249 | 行军面板 |

**总计: 37文件, 19,162行C#代码**

---

## 八、Redis 缓存策略

| 服务 | DB | Key模式 | TTL | 策略 |
|------|-----|---------|-----|------|
| user-service | 0 | `user:info:{userId}` | 30min | Cache-Aside |
| card-service | 0 | `card:pool:{poolId}` | 10min | Cache-Aside |
| card-service | 0 | `card:inventory:{userId}` | 5min | Write-Through |
| card-service | 0 | `card:gacha:stats:{userId}:{poolId}` | 持久 | Counter |
| battle-service | 0 | `battle:replay:{battleId}` | 1h | Cache-Aside |
| map-service | 1 | `map:overview` | 2min | 定时刷新 |
| map-service | 1 | `map:city:{cityId}` | 30min | Cache-Aside |
| map-service | 1 | `map:progress:{marchId}` | 30s | 实时更新 |
| map-service | 1 | `map:march:stream` | — | **Redis Stream** (消费者组) |
| guild-service | 2 | `guild:info:{guildId}` | 10min | Cache-Aside |
| guild-service | 2 | `guild:members:{guildId}` | 5min | Cache-Aside |
| payment-service | 3 | `payment:order:{orderNo}` | 30min | Cache-Aside |

---

## 九、商业化设计概要

### 收入模型

| 来源 | 占比 | 月千人收入 |
|------|------|-----------|
| 抽卡 (限定池+保底) | 45% | ¥48,600 |
| 战令 (42天赛季) | 20% | ¥21,600 |
| 月卡 (订阅) | 15% | ¥16,200 |
| 礼包 (限时/成长) | 12% | ¥12,960 |
| 其他 (皮肤/改名) | 8% | ¥8,640 |

### 核心指标

| 指标 | 数值 |
|------|------|
| SSR基础概率 | 2.0% + 软保底(60抽起) |
| SSR硬保底 | 80抽必出 |
| UP角色概率 | 正常50% / 大保底100% |
| 月ARPU | ¥606/千人 |
| D1/D7/D30留存 | 55% / 35% / 25% |
| 免费月钻石 | ~12,000 (6.7十连) |
| 付费/免费差距 | 2.3× |

> 详细数值模型见 `docs/design/commercial/` 目录6份文档

---

## 十、技术栈清单

| 层级 | 技术 | 版本 |
|------|------|------|
| **后端语言** | Go | 1.21+ |
| **Web框架** | Gin | latest |
| **ORM** | GORM | latest |
| **数据库** | MySQL | 8.0 |
| **缓存** | Redis | 7.0 |
| **认证** | JWT (golang-jwt) | Access 2h + Refresh 7d |
| **随机数** | crypto/rand | 安全随机(抽卡) |
| **消息队列** | Redis Stream | 消费者组模型 |
| **客户端** | Unity + C# | .NET Standard 2.1 |
| **网络请求** | UnityWebRequest | Coroutine异步 |
| **文档站** | Next.js 16 + React | TypeScript |
| **UI组件** | shadcn/ui + Tailwind CSS 4 | New York |
| **网关** | Caddy | 反向代理 (XTransformPort) |
| **版本控制** | Git | GitHub |

---

> 📅 文档生成时间: 2025年 | 总计30张MySQL表 | 6个Go微服务 | 37个C#客户端文件
