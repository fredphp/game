'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Copy, Check, ChevronDown, Database, Server, Shield, Swords,
  Zap, ArrowRight, Clock, FileCode, Target,
  Crown, Users, User, Star, ShieldCheck, Award, ScrollText,
  Flame, Timer, Flag, Handshake, TrendingUp, Rocket,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

function CodeBlock({ code, lang = 'go', filename }: { code: string; lang: string; filename: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div className="relative rounded-lg overflow-hidden border">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/80" /><div className="w-3 h-3 rounded-full bg-yellow-500/80" /><div className="w-3 h-3 rounded-full bg-green-500/80" /></div>
          <span className="text-xs text-zinc-400 font-mono ml-2">{filename}</span>
        </div>
        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 px-2 text-zinc-400 hover:text-zinc-200" onClick={handleCopy}>{copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}</Button></TooltipTrigger><TooltipContent>{copied ? '已复制' : '复制'}</TooltipContent></Tooltip></TooltipProvider>
      </div>
      <SyntaxHighlighter language={lang} style={oneDark} customStyle={{ margin: 0, padding: '16px', fontSize: '12px', lineHeight: '1.6', background: '#1e1e2e' }} showLineNumbers lineNumberStyle={{ color: '#585b70', fontSize: '11px', minWidth: '3em' }}>{code}</SyntaxHighlighter>
    </div>
  )
}

// ===== Section 2: 联盟角色系统 =====
const guildRoles = [
  { role: '盟主', en: 'Leader', icon: Crown, color: 'border-amber-400 bg-amber-50/40 dark:bg-amber-950/10', iconColor: 'text-amber-500', badgeColor: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300', permissions: ['解散联盟', '转让盟主', '任命/罢免副盟主', '联盟宣战/停战', '联盟科技升级', '修改公告/宣言', '审批/拒绝入盟', '驱逐成员'] },
  { role: '副盟主', en: 'Vice Leader', icon: ShieldCheck, color: 'border-purple-400 bg-purple-50/40 dark:bg-purple-950/10', iconColor: 'text-purple-500', badgeColor: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300', permissions: ['审批/拒绝入盟', '修改联盟公告', '任命/罢免长老', '发起联盟战争', '联盟科技管理', '驱逐成员', '编辑联盟信息'] },
  { role: '长老', en: 'Elder', icon: Star, color: 'border-sky-400 bg-sky-50/40 dark:bg-sky-950/10', iconColor: 'text-sky-500', badgeColor: 'bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-300', permissions: ['审批/拒绝入盟', '修改联盟公告', '推荐成员入盟', '查看联盟日志', '联盟外交协助'] },
  { role: '成员', en: 'Member', icon: User, color: 'border-stone-400 bg-stone-50/40 dark:bg-stone-950/10', iconColor: 'text-stone-500', badgeColor: 'bg-stone-500/10 text-stone-700 dark:text-stone-400 border-stone-300', permissions: ['查看联盟信息', '退出联盟', '参与联盟战争', '发起/加入协作战斗', '查看个人贡献', '申请升级'] },
]

// ===== Section 3: 联盟管理流程 =====
const manageFlow = [
  { step: 1, icon: Rocket, title: '创建联盟', desc: '输入联盟名称、标签\n撰写联盟宣言', color: 'text-amber-500' },
  { step: 2, icon: Users, title: '招募成员', desc: '开放招募/邀请模式\n设置入盟条件', color: 'text-purple-500' },
  { step: 3, icon: ShieldCheck, title: '审批加入', desc: '长老以上角色审批\n自动审批模式可选', color: 'text-sky-500' },
  { step: 4, icon: Crown, title: '角色管理', desc: '任命副盟主/长老\n权限分层管理', color: 'text-orange-500' },
  { step: 5, icon: TrendingUp, title: '联盟升级', desc: '积累联盟经验\n解锁成员上限', color: 'text-emerald-500' },
]

// ===== Section 4: 联盟战争 =====
const warPhases = [
  { phase: '宣战', en: 'Declaration', icon: Flag, duration: '2小时准备', desc: '向目标联盟发起宣战，选择争夺城池，进入2小时准备期', color: 'text-red-500', bgColor: 'border-red-200 bg-red-50/40 dark:bg-red-950/10' },
  { phase: '战斗', en: 'Battle', icon: Swords, duration: '24小时', desc: '双方联盟成员可对目标城池发起协作战斗，争夺城池控制权', color: 'text-orange-500', bgColor: 'border-orange-200 bg-orange-50/40 dark:bg-orange-950/10' },
  { phase: '结算', en: 'Settlement', icon: Award, duration: '即时结算', desc: '计算双方总积分，高分方获得城池控制权，分配战争奖励', color: 'text-emerald-500', bgColor: 'border-emerald-200 bg-emerald-50/40 dark:bg-emerald-950/10' },
]

// ===== Section 5: 战斗协作机制 =====
const coopFlow = [
  { step: 1, icon: Handshake, title: '发起协作', desc: '选择战争中的目标城池\n投入兵力发起协作', color: 'text-purple-500' },
  { step: 2, icon: Users, title: '组队协作', desc: '最多5人加入协作\n每人投入兵力', color: 'text-sky-500' },
  { step: 3, icon: TrendingUp, title: '协作加成', desc: '发起者+15% / 协作者+8%\n5人满编最高+47%', color: 'text-emerald-500' },
  { step: 4, icon: Zap, title: '开战触发', desc: '满3人30秒自动开战\n超时10分钟强制开战', color: 'text-amber-500' },
  { step: 5, icon: Award, title: '结算分配', desc: '按兵力比例分配贡献\n贡献转化战争积分', color: 'text-orange-500' },
]

// ===== Section 6: 联盟等级 =====
const guildLevels = [
  { level: 'Lv1', name: '初创联盟', members: 30, exp: 0, color: 'border-stone-300 bg-stone-50/40 dark:bg-stone-950/10', textColor: 'text-stone-500' },
  { level: 'Lv2', name: '成长联盟', members: 35, exp: 1000, color: 'border-green-300 bg-green-50/40 dark:bg-green-950/10', textColor: 'text-green-500' },
  { level: 'Lv3', name: '精英联盟', members: 40, exp: 5000, color: 'border-sky-300 bg-sky-50/40 dark:bg-sky-950/10', textColor: 'text-sky-500' },
  { level: 'Lv4', name: '霸主联盟', members: 45, exp: 15000, color: 'border-purple-300 bg-purple-50/40 dark:bg-purple-950/10', textColor: 'text-purple-500' },
  { level: 'Lv5', name: '帝王联盟', members: 50, exp: 50000, color: 'border-amber-300 bg-amber-50/40 dark:bg-amber-950/10', textColor: 'text-amber-500' },
]

// ===== Section 7: 联盟科技 =====
const guildTechs = [
  { key: 'attack_boost', name: '攻击强化', desc: '全体成员攻击力提升', levels: ['+2%', '+4%', '+6%', '+8%', '+10%'] },
  { key: 'defense_boost', name: '防御强化', desc: '全体成员防御力提升', levels: ['+2%', '+4%', '+6%', '+8%', '+10%'] },
  { key: 'march_speed', name: '行军加速', desc: '全体成员行军速度提升', levels: ['+3%', '+6%', '+9%', '+12%', '+15%'] },
  { key: 'resource_boost', name: '资源增产', desc: '联盟领地产出提升', levels: ['+5%', '+10%', '+15%', '+20%', '+25%'] },
  { key: 'recruit_speed', name: '征兵加速', desc: '全体成员征兵速度提升', levels: ['+3%', '+6%', '+9%', '+12%', '+15%'] },
  { key: 'garrison_limit', name: '驻军扩充', desc: '联盟城池最大驻军提升', levels: ['+10%', '+20%', '+30%', '+40%', '+50%'] },
  { key: 'scout_range', name: '侦查强化', desc: '侦查获取更多情报', levels: ['Lv1', 'Lv2', 'Lv3', 'Lv4', 'Lv5'] },
  { key: 'war_bonus', name: '战争增益', desc: '联盟战争积分加成', levels: ['+5%', '+10%', '+15%', '+20%', '+25%'] },
]

// ===== Section 8: REST API =====
const apiList = [
  { method: 'POST', path: '/api/v1/guild/create', auth: true, desc: '创建联盟', color: 'bg-purple-500',
    req: `{\n  "name": "魏武天下",\n  "tag": "魏武",\n  "declaration": "挟天子以令诸侯"\n}`,
    res: `{\n  "code": 0,\n  "data": {\n    "guild_id": 1001,\n    "name": "魏武天下",\n    "tag": "魏武",\n    "declaration": "挟天子以令诸侯",\n    "level": 1,\n    "member_count": 1,\n    "max_members": 30,\n    "experience": 0,\n    "creator_id": 5001,\n    "created_at": "2025-01-15T10:00:00Z"\n  }\n}` },
  { method: 'GET', path: '/api/v1/guild/list', auth: false, desc: '联盟列表', color: 'bg-sky-500',
    res: `{\n  "code": 0,\n  "data": {\n    "guilds": [\n      {\n        "guild_id": 1001,\n        "name": "魏武天下",\n        "tag": "魏武",\n        "level": 3,\n        "member_count": 28,\n        "max_members": 40,\n        "declaration": "挟天子以令诸侯"\n      }\n    ],\n    "total": 42,\n    "page": 1,\n    "page_size": 20\n  }\n}` },
  { method: 'POST', path: '/api/v1/guild/join', auth: true, desc: '加入联盟', color: 'bg-green-500',
    req: `{\n  "guild_id": 1001,\n  "message": "久仰大名，请求加入"\n}`,
    res: `{\n  "code": 0,\n  "data": {\n    "application_id": 8001,\n    "guild_id": 1001,\n    "user_id": 5002,\n    "status": "pending",\n    "message": "久仰大名，请求加入",\n    "created_at": "2025-01-15T10:30:00Z"\n  }\n}` },
  { method: 'POST', path: '/api/v1/guild/war/declare', auth: true, desc: '宣战', color: 'bg-red-500',
    req: `{\n  "target_guild_id": 2,\n  "target_city_id": 5\n}`,
    res: `{\n  "code": 0,\n  "data": {\n    "war_id": "WAR-20250115-001",\n    "attacker_guild_id": 1001,\n    "defender_guild_id": 2,\n    "target_city_id": 5,\n    "status": "preparation",\n    "start_time": "2025-01-15T12:00:00Z",\n    "end_time": "2025-01-16T12:00:00Z",\n    "prep_end_time": "2025-01-15T14:00:00Z"\n  }\n}` },
  { method: 'POST', path: '/api/v1/guild/war/coop/initiate', auth: true, desc: '发起协作战斗', color: 'bg-orange-500',
    req: `{\n  "war_id": "WAR-20250115-001",\n  "city_id": 5,\n  "army_power": 3000\n}`,
    res: `{\n  "code": 0,\n  "data": {\n    "battle_id": "BTL-20250115-001",\n    "war_id": "WAR-20250115-001",\n    "city_id": 5,\n    "status": "gathering",\n    "initiator_id": 5001,\n    "initiator_power": 3000,\n    "current_bonus": 0.15,\n    "participant_count": 1,\n    "max_participants": 5,\n    "auto_start_time": null\n  }\n}` },
  { method: 'POST', path: '/api/v1/guild/war/coop/join', auth: true, desc: '加入协作', color: 'bg-amber-500',
    req: `{\n  "battle_id": "BTL-20250115-001",\n  "army_power": 2000\n}`,
    res: `{\n  "code": 0,\n  "data": {\n    "battle_id": "BTL-20250115-001",\n    "participant_count": 2,\n    "current_bonus": 0.23,\n    "total_army_power": 5000,\n    "effective_power": 6150\n  }\n}` },
  { method: 'GET', path: '/api/v1/guild/:id/logs', auth: false, desc: '联盟日志', color: 'bg-stone-500',
    res: `{\n  "code": 0,\n  "data": {\n    "guild_id": 1001,\n    "logs": [\n      {\n        "log_id": 9001,\n        "action": "member_join",\n        "operator_id": 5001,\n        "target_id": 5002,\n        "detail": "成员 曹操(5002) 加入联盟",\n        "created_at": "2025-01-15T10:35:00Z"\n      },\n      {\n        "log_id": 9002,\n        "action": "war_declare",\n        "operator_id": 5001,\n        "detail": "向联盟 蜀汉忠义(2) 宣战",\n        "created_at": "2025-01-15T12:00:00Z"\n      }\n    ],\n    "total": 256\n  }\n}` },
]

// ===== Section 9: 数据库 =====
const dbTables = [
  { name: 'guilds', desc: '联盟表', fields: ['guild_id (主键)', 'name (联盟名称)', 'tag (联盟标签)', 'declaration (联盟宣言)', 'level (1~5)', 'member_count / max_members', 'experience (经验值)', 'creator_id (创建者)', 'announcement (公告)'] },
  { name: 'guild_members', desc: '成员表', fields: ['id (主键)', 'guild_id → guilds', 'user_id (用户)', 'role (leader/vice/elder/member)', 'join_time (加入时间)', 'contribution (贡献值)', 'last_active'] },
  { name: 'guild_applications', desc: '入盟申请', fields: ['id (主键)', 'guild_id → guilds', 'user_id (申请人)', 'status (pending/approved/rejected)', 'message (申请留言)', 'reviewer_id (审批人)', 'created_at'] },
  { name: 'guild_wars', desc: '联盟战争', fields: ['war_id (UUID主键)', 'attacker_guild / defender_guild', 'target_city_id (目标城池)', 'status (preparation/active/settled)', 'attacker_score / defender_score', 'start_time / end_time', 'prep_end_time', 'result'] },
  { name: 'guild_war_battles', desc: '协作战斗', fields: ['battle_id (UUID主键)', 'war_id → guild_wars', 'city_id (城池)', 'status (gathering/fighting/settled)', 'initiator_id (发起者)', 'coop_bonus (协作加成)', 'attacker_power / defender_power', 'result (胜/负)', 'contributions_json'] },
  { name: 'guild_log', desc: '操作日志', fields: ['log_id (主键)', 'guild_id → guilds', 'action (操作类型)', 'operator_id (操作者)', 'target_id (目标对象)', 'detail (详情JSON)', 'created_at'] },
  { name: 'guild_technologies', desc: '联盟科技', fields: ['id (主键)', 'guild_id → guilds', 'tech_key (科技标识)', 'level (1~5)', 'unlocked (是否解锁)', 'unlock_time', 'updated_at'] },
]

// ===== Section 10: 核心源码 =====
const sourceFiles = [
  { name: 'main.go', desc: '服务入口 + 战争引擎启动' },
  { name: 'war_engine.go', desc: '战争引擎核心 (350+ 行)' },
  { name: 'guild_model.go', desc: '数据模型 (15个结构体)' },
  { name: 'guild_dao.go', desc: '数据访问层 (40+方法)' },
  { name: 'guild_service.go', desc: '业务逻辑' },
  { name: 'guild_handler.go', desc: 'HTTP处理器 (18个接口)' },
  { name: 'router.go', desc: '路由注册' },
  { name: 'auth.go', desc: 'JWT中间件' },
  { name: 'schema.sql', desc: '数据库建表 (7张)' },
  { name: 'config.yaml', desc: '服务配置' },
  { name: 'mysql.go', desc: 'MySQL连接池' },
  { name: 'redis.go', desc: 'Redis连接池' },
  { name: 'jwt.go', desc: 'JWT工具' },
  { name: 'response.go', desc: '统一响应' },
]

const warEngineCode = `// ExecuteCoopBattle 协作战斗计算
func (e *WarEngine) ExecuteCoopBattle(ctx context.Context, battleID string) error {
    battle, _ := e.dao.GetBattle(ctx, battleID)

    // 1. 计算协作加成
    coopBonus := 0.15 // 发起者 +15%
    coopBonus += float64(len(battle.Participants)-1) * 0.08 // 每个协作者 +8%

    // 2. 进攻方有效战力 = 总兵力 × (1 + 协作加成)
    totalArmy := battle.InitiatorPower + battle.TotalParticipantPower
    attackerEffective := float64(totalArmy) * (1.0 + coopBonus)

    // 3. 防守方有效战力 = 驻军 + 城防×50%
    city, _ := e.mapDAO.GetCity(ctx, battle.CityID)
    defenderPower := city.Garrison
    cityDefense := float64(city.DefenseBonus * 10000)
    defenderEffective := float64(defenderPower) + cityDefense*0.5

    // 4. ±10% 随机浮动
    randFactor := 0.90 + randomFloat()*0.20
    attackerEffective *= randFactor
    defenderEffective *= 0.90 + randomFloat()*0.20

    // 5. 判定胜负
    attackerWin := attackerEffective > defenderEffective
    damageDealt := int(math.Min(attackerEffective, defenderEffective))

    // 6. 胜利额外 +50 分
    baseScore := damageDealt / 100
    if attackerWin {
        baseScore += 50
    }

    // 7. 按贡献比例分配分数
    for _, c := range battle.Contributors {
        ratio := float64(c.Power) / float64(totalArmy)
        score := int(float64(baseScore) * ratio)
        e.dao.UpdateContribution(ctx, c.UserID, score)
    }
}`

const schemaSQL = `-- 联盟系统数据库建表脚本
-- 7 张表：联盟、成员、申请、战争、协作战斗、日志、科技

CREATE TABLE guilds (
  guild_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(30) NOT NULL COMMENT '联盟名称',
  tag VARCHAR(10) NOT NULL COMMENT '联盟标签',
  declaration TEXT COMMENT '联盟宣言',
  level TINYINT DEFAULT 1 COMMENT '联盟等级 1~5',
  member_count INT DEFAULT 1,
  max_members INT DEFAULT 30,
  experience BIGINT DEFAULT 0,
  creator_id BIGINT NOT NULL,
  announcement TEXT COMMENT '联盟公告',
  status TINYINT DEFAULT 1 COMMENT '1正常 0解散',
  created_at DATETIME DEFAULT NOW(),
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW()
);

CREATE TABLE guild_members (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  guild_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role VARCHAR(20) DEFAULT 'member' COMMENT 'leader/vice/elder/member',
  contribution INT DEFAULT 0,
  join_time DATETIME DEFAULT NOW(),
  last_active DATETIME,
  UNIQUE KEY uk_guild_user (guild_id, user_id)
);

CREATE TABLE guild_applications (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  guild_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' COMMENT 'pending/approved/rejected',
  message TEXT,
  reviewer_id BIGINT,
  created_at DATETIME DEFAULT NOW(),
  reviewed_at DATETIME
);

CREATE TABLE guild_wars (
  war_id VARCHAR(64) PRIMARY KEY,
  attacker_guild BIGINT NOT NULL,
  defender_guild BIGINT NOT NULL,
  target_city_id INT NOT NULL,
  status VARCHAR(20) DEFAULT 'preparation',
  attacker_score INT DEFAULT 0,
  defender_score INT DEFAULT 0,
  start_time DATETIME,
  end_time DATETIME,
  prep_end_time DATETIME,
  result VARCHAR(20),
  created_at DATETIME DEFAULT NOW()
);

CREATE TABLE guild_war_battles (
  battle_id VARCHAR(64) PRIMARY KEY,
  war_id VARCHAR(64) NOT NULL,
  city_id INT NOT NULL,
  status VARCHAR(20) DEFAULT 'gathering',
  initiator_id BIGINT NOT NULL,
  initiator_power INT DEFAULT 0,
  coop_bonus DECIMAL(4,3) DEFAULT 0,
  total_participant_power INT DEFAULT 0,
  participant_count INT DEFAULT 1,
  attacker_power INT DEFAULT 0,
  defender_power INT DEFAULT 0,
  result VARCHAR(10),
  contributions_json JSON,
  auto_start_time DATETIME,
  created_at DATETIME DEFAULT NOW()
);

CREATE TABLE guild_log (
  log_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  guild_id BIGINT NOT NULL,
  action VARCHAR(50) NOT NULL,
  operator_id BIGINT,
  target_id BIGINT,
  detail JSON,
  created_at DATETIME DEFAULT NOW(),
  INDEX idx_guild_time (guild_id, created_at)
);

CREATE TABLE guild_technologies (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  guild_id BIGINT NOT NULL,
  tech_key VARCHAR(30) NOT NULL,
  level TINYINT DEFAULT 0,
  unlocked TINYINT DEFAULT 0,
  unlock_time DATETIME,
  updated_at DATETIME DEFAULT NOW() ON UPDATE NOW(),
  UNIQUE KEY uk_guild_tech (guild_id, tech_key)
);`

const configYaml = `server:
  port: 9005
  mode: release

database:
  host: 127.0.0.1
  port: 3306
  user: root
  password: ""
  dbname: jiuzhou_guild
  max_open_conns: 20
  max_idle_conns: 10

redis:
  addr: 127.0.0.1:6379
  password: ""
  db: 0
  pool_size: 10

jwt:
  secret: "your-jwt-secret-key"
  expire_hours: 24

guild:
  max_name_length: 30
  max_tag_length: 10
  max_declaration_length: 200
  default_max_members: 30
  cooldown_after_leave: 24h
  auto_approve: false

war:
  preparation_duration: 2h
  battle_duration: 24h
  max_concurrent_wars: 3
  war_cooldown: 48h
  surrender_enabled: true

coop:
  max_participants: 5
  initiator_bonus: 0.15
  participant_bonus: 0.08
  auto_start_min: 3
  auto_start_delay: 30s
  force_start_timeout: 10m

log:
  level: info
  file: logs/guild-service.log`

export default function Home() {
  const [activeTab, setActiveTab] = useState(1)

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 md:py-12 space-y-12">

          {/* ===== 1. Hero ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-card/80 p-8 md:p-12">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-fuchsia-500/10 via-violet-500/5 to-transparent blur-3xl" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="border-violet-500/30 text-violet-600 dark:text-violet-400 bg-violet-500/5">Guild Service</Badge>
                <Badge variant="outline" className="border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">联盟系统</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-black">
                <span className="bg-gradient-to-r from-violet-500 via-purple-400 to-fuchsia-500 bg-clip-text text-transparent">联盟系统微服务</span>
              </h1>
              <p className="mt-2 text-lg text-muted-foreground font-medium">Guild Service — 联盟管理 · 战争协作 · 领土争夺</p>
              <p className="mt-3 text-sm text-muted-foreground/80 max-w-2xl leading-relaxed">
                基于 Go + 战争引擎的联盟协作系统。4种角色权限体系、5级联盟等级、协作战斗机制、
                联盟战争宣战-战斗-结算全流程、8种联盟科技、城池争夺等核心功能。
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['创建联盟', '角色权限', '联盟战争', '协作攻城', '入盟审批', '联盟科技', '5级等级', '4种角色'].map((t) => (
                  <Badge key={t} variant="secondary" className="text-xs px-2.5 py-1">{t}</Badge>
                ))}
              </div>
            </div>
          </motion.section>

          {/* ===== 2. 联盟角色系统 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-violet-500 to-purple-600" />
              联盟角色系统
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {guildRoles.map((r) => (
                <Card key={r.role} className={`border ${r.color} hover:shadow-sm transition-shadow`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <r.icon className={`w-4 h-4 ${r.iconColor}`} />
                        {r.role}
                        <span className="text-[10px] text-muted-foreground font-normal font-mono">{r.en}</span>
                      </CardTitle>
                      <Badge className={`text-[10px] ${r.badgeColor}`}>{r.role}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1.5">
                      {r.permissions.map((p) => (
                        <li key={p} className="text-xs text-muted-foreground flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-current flex-shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== 3. 联盟管理流程 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-purple-500 to-fuchsia-600" />
              联盟管理流程
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {manageFlow.map((step) => (
                <Card key={step.title} className="hover:shadow-sm transition-shadow relative">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400 flex items-center justify-center text-[10px] font-bold">{step.step}</span>
                      <step.icon className={`w-4 h-4 ${step.color}`} />
                      {step.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{step.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== 4. 联盟战争 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-red-500 to-orange-600" />
              <h2 className="text-2xl font-bold">联盟战争</h2>
              <Badge variant="outline" className="border-red-300 text-red-600 dark:text-red-400 bg-red-500/5 text-xs">核心功能</Badge>
            </div>

            {/* War Phases */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {warPhases.map((w) => (
                <Card key={w.phase} className={`border ${w.bgColor} hover:shadow-sm transition-shadow`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <w.icon className={`w-4 h-4 ${w.color}`} />
                        {w.phase}
                        <span className="text-[10px] text-muted-foreground font-normal font-mono">{w.en}</span>
                      </CardTitle>
                      <Badge variant="outline" className={`text-[10px] ${w.color} border-current/30`}>{w.duration}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground leading-relaxed">{w.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* War Rules + Score */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-dashed border-purple-300 bg-violet-50/30 dark:bg-violet-950/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ScrollText className="w-4 h-4 text-purple-500" />
                    战争规则
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {[
                      { label: '同时战争上限', value: '最多 3 场同时进行' },
                      { label: '战争冷却', value: '48 小时冷却期' },
                      { label: '投降机制', value: '防御方可主动投降' },
                      { label: '城池争夺', value: '指定目标城池争夺控制权' },
                      { label: '准备阶段', value: '2小时准备期内可撤回宣战' },
                    ].map((r) => (
                      <li key={r.label} className="text-xs flex items-start gap-2">
                        <div className="w-1 h-1 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                        <span><span className="font-semibold text-muted-foreground">{r.label}：</span><span className="text-muted-foreground">{r.value}</span></span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-dashed border-amber-300 bg-amber-50/30 dark:bg-amber-950/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-500" />
                    积分系统
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-card border text-xs">
                      <p className="font-semibold text-muted-foreground mb-1">基础得分</p>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-amber-600 font-bold">伤害 / 100 = 基础分</code>
                      </div>
                      <p className="text-muted-foreground mt-1">战斗造成伤害除以100为本次得分</p>
                    </div>
                    <div className="p-3 rounded-lg bg-card border text-xs">
                      <p className="font-semibold text-muted-foreground mb-1">胜利奖励</p>
                      <div className="flex items-center gap-2">
                        <code className="font-mono text-emerald-600 font-bold">胜方额外 +50 分</code>
                      </div>
                      <p className="text-muted-foreground mt-1">进攻方胜利额外获得50积分奖励</p>
                    </div>
                    <div className="p-3 rounded-lg bg-card border text-xs">
                      <p className="font-semibold text-muted-foreground mb-1">结算规则</p>
                      <p className="text-muted-foreground">24h结束时对比双方总分，高分方获得城池控制权</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          {/* ===== 5. 战斗协作机制 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-fuchsia-500 to-violet-600" />
              <h2 className="text-2xl font-bold">战斗协作机制</h2>
              <Badge variant="outline" className="border-fuchsia-300 text-fuchsia-600 dark:text-fuchsia-400 bg-fuchsia-500/5 text-xs">核心创新</Badge>
            </div>

            {/* Coop Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {coopFlow.map((step) => (
                <Card key={step.title} className="hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-fuchsia-100 dark:bg-fuchsia-950 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center text-[10px] font-bold">{step.step}</span>
                      <step.icon className={`w-4 h-4 ${step.color}`} />
                      {step.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{step.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Formula + Auto-start */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border-dashed border-fuchsia-300 bg-fuchsia-50/30 dark:bg-fuchsia-950/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-fuchsia-500" />
                    协作加成公式
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-card border">
                    <code className="text-xs font-mono text-fuchsia-600 font-bold block leading-relaxed">
                      进攻有效战力 = 总兵力 × (1 + 协作加成系数)
                    </code>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: '发起者', value: '+15%', desc: '发起协作的玩家获得', color: 'text-amber-500' },
                      { label: '每个协作者', value: '+8%', desc: '每个加入协作的成员', color: 'text-purple-500' },
                      { label: '5人满编', value: '+47%', desc: '最高总协作加成', color: 'text-fuchsia-500' },
                    ].map((b) => (
                      <div key={b.label} className="flex items-center justify-between p-2.5 rounded-lg bg-card border text-xs">
                        <div>
                          <span className="font-semibold text-muted-foreground">{b.label}</span>
                          <span className="text-muted-foreground ml-1.5">{b.desc}</span>
                        </div>
                        <code className={`font-mono font-bold ${b.color}`}>{b.value}</code>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 rounded-lg bg-card border">
                    <p className="text-[11px] text-muted-foreground">
                      <span className="font-semibold">贡献分配：</span>按每个成员投入兵力占总兵力的比例分配战斗得分
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-dashed border-amber-300 bg-amber-50/30 dark:bg-amber-950/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    自动开战规则
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="p-3 rounded-lg bg-card border text-xs">
                    <p className="font-semibold text-muted-foreground mb-1">满员快速开战</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-sky-500/10 text-sky-600 border-sky-300 text-[10px]">满 3 人</Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Badge className="bg-amber-500/10 text-amber-600 border-amber-300 text-[10px]">30 秒倒计时</Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Badge className="bg-red-500/10 text-red-600 border-red-300 text-[10px]">自动开战</Badge>
                    </div>
                    <p className="text-muted-foreground mt-2">达到3人参与后，30秒倒计时自动开战</p>
                  </div>
                  <div className="p-3 rounded-lg bg-card border text-xs">
                    <p className="font-semibold text-muted-foreground mb-1">超时强制开战</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge className="bg-stone-500/10 text-stone-600 border-stone-300 text-[10px]">发起后</Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Badge className="bg-orange-500/10 text-orange-600 border-orange-300 text-[10px]">10 分钟</Badge>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <Badge className="bg-red-500/10 text-red-600 border-red-300 text-[10px]">强制开战</Badge>
                    </div>
                    <p className="text-muted-foreground mt-2">超时10分钟无论人数，强制开始战斗</p>
                  </div>
                  <div className="p-3 rounded-lg bg-card border text-xs">
                    <p className="font-semibold text-muted-foreground mb-1">手动开战</p>
                    <p className="text-muted-foreground">发起者可随时点击手动开战按钮（≥2人时）</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          {/* ===== 6. 联盟等级 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-emerald-500 to-sky-600" />
              联盟等级
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {guildLevels.map((lv) => (
                <Card key={lv.level} className={`border ${lv.color} hover:shadow-sm transition-shadow`}>
                  <CardContent className="pt-4 pb-4 text-center">
                    <Badge variant="outline" className={`text-xs font-bold mb-2 ${lv.textColor}`}>{lv.level}</Badge>
                    <p className="font-bold text-sm">{lv.name}</p>
                    <div className="mt-2 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">成员上限</span>
                        <span className="font-mono font-bold text-purple-600">{lv.members}人</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">升级经验</span>
                        <span className="font-mono font-bold text-amber-600">{lv.exp > 0 ? `${lv.exp.toLocaleString()}` : '—'}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== 7. 联盟科技 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-sky-500 to-purple-600" />
              联盟科技
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {guildTechs.map((t) => (
                <Card key={t.key} className="hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xs font-bold flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-sky-500" />
                        {t.name}
                      </CardTitle>
                      <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground">{t.key}</Badge>
                    </div>
                    <CardDescription className="text-[11px]">{t.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-5 gap-1">
                      {t.levels.map((lv, i) => (
                        <div key={i} className="text-center p-1 rounded bg-muted/50">
                          <p className="text-[9px] text-muted-foreground">Lv{i + 1}</p>
                          <p className="text-[10px] font-mono font-bold text-sky-600">{lv}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== 8. REST API ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-purple-500 to-violet-600" />
              REST API
            </h2>
            {apiList.map((api) => (
              <Collapsible key={api.path}>
                <Card className="hover:shadow-sm transition-shadow">
                  <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-md text-white text-xs font-bold font-mono ${api.color}`}>{api.method}</span>
                        <code className="text-sm font-mono font-semibold">{api.path}</code>
                        {api.auth && <Badge variant="outline" className="text-[10px] gap-1 border-violet-300 text-violet-600 dark:text-violet-400"><Shield className="w-3 h-3" />JWT</Badge>}
                        <span className="text-xs text-muted-foreground ml-auto">{api.desc}</span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {api.req && <div><p className="text-xs font-semibold text-muted-foreground mb-2">→ Request</p><CodeBlock code={api.req} lang="json" filename="request.json" /></div>}
                        {api.res && <div><p className="text-xs font-semibold text-muted-foreground mb-2">← Response</p><CodeBlock code={api.res} lang="json" filename="response.json" /></div>}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </motion.section>

          {/* ===== 9. 数据库 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-violet-500 to-purple-600" />
              数据库（7 张表）
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dbTables.map((t) => (
                <Card key={t.name}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2"><Database className="w-4 h-4 text-muted-foreground" /><code className="font-mono">{t.name}</code></CardTitle>
                    <CardDescription className="text-xs">{t.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {t.fields.map((f) => (
                        <li key={f} className="text-[11px] font-mono text-muted-foreground flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-current flex-shrink-0" />{f}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== 10. 核心源码 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-fuchsia-600 to-stone-600" />
              核心源码（14 个文件）
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Card className="lg:col-span-1 p-0 overflow-hidden">
                <div className="p-3 border-b bg-muted/30">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <Server className="w-3.5 h-3.5 text-violet-500" />
                    guild-service/
                  </p>
                </div>
                <ScrollArea className="h-[450px]">
                  <div className="p-1 space-y-0.5">
                    {sourceFiles.map((f, i) => (
                      <button key={f.name} onClick={() => setActiveTab(i)} className={`w-full text-left px-3 py-2 rounded-md text-xs flex items-center gap-2 transition-colors ${activeTab === i ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                        <FileCode className={`w-3.5 h-3.5 flex-shrink-0 ${activeTab === i ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{f.name}</p>
                          <p className={`text-[10px] truncate ${activeTab === i ? 'text-primary-foreground/70' : 'text-muted-foreground/60'}`}>{f.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </Card>
              <Card className="lg:col-span-3 p-0 overflow-hidden">
                <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-muted-foreground" />
                  <code className="text-sm font-mono font-semibold">{sourceFiles[activeTab].name}</code>
                  <Badge variant="outline" className="text-[10px]">{sourceFiles[activeTab].desc}</Badge>
                </div>
                <ScrollArea className="h-[450px]">
                  <div className="p-4">
                    <CodeBlock
                      code={
                        activeTab === 1 ? warEngineCode
                        : activeTab === 8 ? schemaSQL
                        : activeTab === 9 ? configYaml
                        : `// 完整源码位于 guild-service/ 目录\n// 14 个文件，包含联盟系统核心实现\n// war_engine.go 包含协作战斗计算、自动开战、积分结算等\n// guild_handler.go 提供 18 个 HTTP 接口\n// guild_dao.go 包含 40+ 数据访问方法`
                      }
                      lang={
                        activeTab === 8 ? 'sql' : activeTab === 9 ? 'yaml' : 'go'
                      }
                      filename={sourceFiles[activeTab].name}
                    />
                  </div>
                </ScrollArea>
              </Card>
            </div>
          </motion.section>

          {/* ===== 11. 快速启动 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-emerald-500 to-green-600" />
              快速启动
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-violet-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                    建库建表
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock code={`mysql -u root -p < guild-service/docs/schema.sql\n\n# 创建数据库 + 7 张表\n# guilds, guild_members, guild_applications\n# guild_wars, guild_war_battles\n# guild_log, guild_technologies`} lang="bash" filename="terminal" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-violet-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                    创建联盟
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock code={`# 创建联盟\ncurl -X POST http://localhost:9005/api/v1/guild/create \\\n  -H "Authorization: Bearer <token>" \\\n  -d '{"name":"魏武天下","tag":"魏武",\n       "declaration":"挟天子以令诸侯"}'\n\n# 返回 guild_id，创建者自动成为盟主`} lang="bash" filename="terminal" />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-violet-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                    发起战争
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock code={`# 宣战\ncurl -X POST http://localhost:9005/api/v1/guild/war/declare \\\n  -H "Authorization: Bearer <token>" \\\n  -d '{"target_guild_id":2,"target_city_id":5}'\n\n# 发起协作战斗\ncurl -X POST http://localhost:9005/api/v1/guild/war/coop/initiate \\\n  -H "Authorization: Bearer <token>" \\\n  -d '{"war_id":"WAR-xxx","city_id":5,"army_power":3000}'`} lang="bash" filename="terminal" />
                </CardContent>
              </Card>
            </div>
          </motion.section>

        </main>

        {/* ===== 12. Footer ===== */}
        <footer className="border-t bg-muted/30 mt-auto">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Swords className="w-5 h-5 text-violet-500" />
                <p className="text-sm font-semibold">九州争鼎 — 联盟系统微服务</p>
                <span className="text-xs text-muted-foreground">Go + 战争引擎 + 协作战斗</span>
              </div>
              <div className="flex items-center gap-2">
                {['Guild', 'War', 'Coop', 'Port 9005'].map((tag) => (
                  <Badge key={tag} variant="outline" className="text-[10px] border-violet-200 text-violet-600 dark:text-violet-400 bg-violet-500/5">{tag}</Badge>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}
