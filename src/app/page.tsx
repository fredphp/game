'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, AlertTriangle, Network, GitBranch,
  Package, Map, Server, Shield, X, Menu, ChevronDown,
  CircleDot, ArrowRight, CheckCircle2, XCircle, AlertOctagon,
  ExternalLink, Zap, Clock, Target, Bug, Wrench,
  ChevronRight, Activity, Layers, Database, Lock,
  Gamepad2, Users, Swords, CreditCard, ScrollText, BarChart3,
  Crown, Fuel, UserPlus, RotateCcw, TrendingUp
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// ══════════════════════════════════════════════════════════════
// DATA DEFINITIONS
// ══════════════════════════════════════════════════════════════

type SectionId = 'overview' | 'issues' | 'dependency' | 'flow-breaks' | 'missing' | 'roadmap'

interface ServiceData {
  name: string
  port: number
  status: 'compile-fail' | 'compile-errors' | 'incomplete' | 'no-entry'
  statusLabel: string
  healthScore: number
  icon: typeof Server
  color: string
  gradientFrom: string
  gradientTo: string
  issues: string[]
}

interface CriticalIssue {
  service: string
  severity: 'critical' | 'high' | 'medium'
  category: string
  description: string
  file?: string
  line?: number
}

interface LogicBreak {
  id: number
  title: string
  icon: typeof Zap
  color: string
  gradient: string
  flowSteps: { label: string; status: 'ok' | 'broken' | 'missing'; detail: string }[]
  impact: string
}

interface MissingModule {
  service: string
  module: string
  status: 'missing' | 'partial' | 'stub'
  impact: string
  category: string
}

interface RoadmapItem {
  priority: number
  title: string
  services: string[]
  effort: 'S' | 'M' | 'L'
  impact: 'critical' | 'high' | 'medium'
  description: string
}

const SERVICES: ServiceData[] = [
  {
    name: 'user-service', port: 9001,
    status: 'compile-fail', statusLabel: '❌ Won\'t compile',
    healthScore: 35, icon: Users, color: 'text-red-400',
    gradientFrom: 'from-red-500/20', gradientTo: 'to-red-900/10',
    issues: [
      'jwtPkg.IsTokenBlacklisted doesn\'t exist in pkg/jwt (middleware/auth.go:34)',
      'pkgresponse.ErrUserNotFound is int, returned as error (service/user_service.go:184)',
      'ALL 9 internal API endpoints missing (/api/v1/internal/*)',
      '`food` column missing from schema but AddFood/DeductFood exist in DAO',
      '`power` field missing from model/schema but service client references it',
      'DeductGold doesn\'t check balance (unlike DeductDiamonds)',
      'AddExp claims "auto level-up" but has no level-up logic',
      'No refresh token endpoint',
      'Hardcoded TTL values ignore config',
    ],
  },
  {
    name: 'card-service', port: 9003,
    status: 'compile-fail', statusLabel: '❌ Won\'t compile',
    healthScore: 25, icon: Layers, color: 'text-red-400',
    gradientFrom: 'from-red-500/20', gradientTo: 'to-red-900/10',
    issues: [
      'ALL imports use `user-service/` instead of `card-service/` - won\'t compile',
      'Gacha pulls NEVER deduct diamonds - FREE unlimited pulls (economy exploit)',
      'No distributed transaction (partial failure = data corruption)',
      'Card creation not in DB transaction',
      'No card upgrade/level-up/merge system',
      'No deck management (no table, no code)',
      'UP card rate system is no-op',
      'Soft pity formula inverted (decreases instead of increases)',
      'Port conflict: serviceclient says 9002, config says 9003',
      'Gacha records saved async with errors silently discarded',
    ],
  },
  {
    name: 'battle-service', port: 9002,
    status: 'compile-fail', statusLabel: '❌ Won\'t compile',
    healthScore: 20, icon: Swords, color: 'text-red-400',
    gradientFrom: 'from-red-500/20', gradientTo: 'to-red-900/10',
    issues: [
      'ALL imports use `user-service/` - won\'t compile',
      'Missing pkg/ directory entirely',
      'NormalSkill never assigned → nil pointer panic on every attack',
      'Battle rewards NEVER distributed (no AddGold/AddExp calls)',
      'Hardcoded card data, never calls card-service',
      'Buff effects never expire properly (ATK/DEF/SPD permanently modified)',
      'Stun effect tracked but never enforced',
      'Shield buff has no damage reduction',
      'Debuff applied to ALL enemies, not just targets',
      'Speed permanently modified each round',
      'No PVP implementation',
      'Battle record save errors silently ignored',
    ],
  },
  {
    name: 'map-service', port: 9004,
    status: 'incomplete', statusLabel: '✅ Has pkg/ but incomplete',
    healthScore: 55, icon: Map, color: 'text-amber-400',
    gradientFrom: 'from-amber-500/20', gradientTo: 'to-amber-900/10',
    issues: [
      'Food cost calculated but NEVER deducted from user',
      'Resource refund on recall not implemented',
      'No march source city ownership validation',
      'BFS path algorithm doesn\'t prioritize by distance (not Dijkstra)',
      'N+1 query in GetMapOverview (36 cities = 36 queries)',
      'No internal API endpoints',
      'Missing go.sum',
      'Module path not importable',
    ],
  },
  {
    name: 'guild-service', port: 9005,
    status: 'compile-fail', statusLabel: '❌ Won\'t compile',
    healthScore: 40, icon: Shield, color: 'text-red-400',
    gradientFrom: 'from-red-500/20', gradientTo: 'to-red-900/10',
    issues: [
      '`e.dao.UpdateBattleContributors` doesn\'t exist → compile error (war_engine.go:192)',
      'Missing UpdateGuild handler (registered but not implemented)',
      'Missing DisbandGuild handler (registered but not implemented)',
      'ApproveApplication doesn\'t actually add member',
      'JWT doesn\'t set guild_id context → DeclareWar always fails',
      'Port swapped with map-service in serviceclient',
      'Technology system (schema + model) has zero implementation',
      'No guild creation cost (gold not deducted)',
      'No war cooldown enforcement',
      'Redis caching keys defined but never used',
    ],
  },
  {
    name: 'payment-service', port: 9006,
    status: 'compile-fail', statusLabel: '❌ Won\'t compile (undefined fn)',
    healthScore: 45, icon: CreditCard, color: 'text-red-400',
    gradientFrom: 'from-red-500/20', gradientTo: 'to-red-900/10',
    issues: [
      '`generateRefundNo()` undefined → won\'t compile',
      'Delivery NEVER calls user-service to add resources (diamonds/gold not credited)',
      'Callback endpoint has NO signature verification (forgery exploit)',
      'Diamond amount ALWAYS hardcoded to 100 regardless of product',
      'VIP level calculation wrong (levels 1-2 unreachable)',
      'Gift pack purchase limit not enforced',
      'Growth fund milestone claim has no level check',
      'Refund doesn\'t update order status or deduct resources',
    ],
  },
  {
    name: 'quest-service', port: 9007,
    status: 'no-entry', statusLabel: '❌ No entry point',
    healthScore: 10, icon: ScrollText, color: 'text-red-500',
    gradientFrom: 'from-red-600/20', gradientTo: 'to-red-900/10',
    issues: [
      'NO cmd/main.go entry point',
      'NO service layer, NO handler layer, NO router',
      'JWT IsTokenBlacklisted never assigned → all auth requests fail',
      'Achievement completion uses wrong field (RewardPoints instead of target)',
      'Daily task uniqueness key uses datetime instead of date',
      'JWT secret copy-pasted from user-service',
      'Not in serviceclient URL map',
    ],
  },
  {
    name: 'admin-service', port: 9100,
    status: 'compile-errors', statusLabel: '⚠️ Has compile errors',
    healthScore: 50, icon: BarChart3, color: 'text-amber-400',
    gradientFrom: 'from-amber-500/20', gradientTo: 'to-amber-900/10',
    issues: [
      'Duplicate function names in admin_handler + log_handler → compile error',
      'GetActionLogs parameter signature mismatch',
      'logwriter.Init() never called',
      'RBACCheck middleware is stub (no permission enforcement)',
      'GetDailyStats/GetRetentionStats return hardcoded sample data',
      'Redis initialized but never used',
      'Frontend NOT connected to Go backend (uses local SQLite)',
    ],
  },
]

const CRITICAL_ISSUES: CriticalIssue[] = SERVICES.flatMap(s =>
  s.issues.map((desc, i) => {
    const isCompile = desc.toLowerCase().includes('compile') || desc.toLowerCase().includes("won't compile") || desc.toLowerCase().includes('undefined')
    const isEconomy = desc.toLowerCase().includes('deduct') || desc.toLowerCase().includes('credit') || desc.toLowerCase().includes('free') || desc.toLowerCase().includes('hardcoded')
    const isSecurity = desc.toLowerCase().includes('verification') || desc.toLowerCase().includes('forgery') || desc.toLowerCase().includes('rbac') || desc.toLowerCase().includes('permission')
    const isData = desc.toLowerCase().includes('never distributed') || desc.toLowerCase().includes('n+1') || desc.toLowerCase().includes('transaction')

    let severity: CriticalIssue['severity'] = 'medium'
    let category = 'logic'
    if (isCompile || desc.toLowerCase().includes("doesn't exist") || desc.toLowerCase().includes('undefined')) {
      severity = 'critical'
      category = 'compile'
    } else if (isSecurity) {
      severity = 'critical'
      category = 'security'
    } else if (isEconomy || isData) {
      severity = 'high'
      category = 'economy'
    } else if (desc.toLowerCase().includes('missing') || desc.toLowerCase().includes('no ') || desc.toLowerCase().includes('not implemented') || desc.toLowerCase().includes('stub')) {
      severity = 'high'
      category = 'missing'
    } else if (desc.toLowerCase().includes('never') || desc.toLowerCase().includes("doesn't")) {
      severity = 'high'
      category = 'logic'
    } else {
      category = 'logic'
    }
    return { service: s.name, severity, category, description: desc }
  })
)

const LOGIC_BREAKS: LogicBreak[] = [
  {
    id: 1, title: '抽卡 → 未扣费', icon: Zap,
    color: 'text-red-400', gradient: 'from-red-500/10 to-red-900/5',
    impact: '经济系统崩溃，无限免费抽卡',
    flowSteps: [
      { label: '玩家发起抽卡', status: 'ok', detail: '前端调用 gacha API' },
      { label: 'card-service 抽卡', status: 'ok', detail: '生成卡牌实例' },
      { label: '扣除钻石', status: 'broken', detail: 'NEVER calls user-service deduct' },
      { label: '写入记录', status: 'ok', detail: '异步保存（错误被忽略）' },
    ],
  },
  {
    id: 2, title: '战斗 → 无奖励', icon: Swords,
    color: 'text-orange-400', gradient: 'from-orange-500/10 to-orange-900/5',
    impact: '玩家战斗无收益，核心玩法崩溃',
    flowSteps: [
      { label: '玩家发起战斗', status: 'ok', detail: '进入战斗流程' },
      { label: '执行战斗逻辑', status: 'broken', detail: 'NormalSkill 未赋值 → nil panic' },
      { label: '战斗结算', status: 'missing', detail: 'NEVER calls AddGold/AddExp' },
      { label: '保存记录', status: 'ok', detail: '保存（错误被忽略）' },
    ],
  },
  {
    id: 3, title: '充值 → 未到账', icon: CreditCard,
    color: 'text-red-400', gradient: 'from-red-500/10 to-red-900/5',
    impact: '付费玩家无法收到资源，法律风险',
    flowSteps: [
      { label: '玩家支付', status: 'ok', detail: '第三方支付回调' },
      { label: '签名验证', status: 'broken', detail: 'NO verification (forgery)' },
      { label: '发放资源', status: 'missing', detail: 'NEVER calls user-service add' },
      { label: '写钱包日志', status: 'ok', detail: '写本地假日志（非真实到账）' },
    ],
  },
  {
    id: 4, title: '行军 → 未消耗粮草', icon: Fuel,
    color: 'text-amber-400', gradient: 'from-amber-500/10 to-amber-900/5',
    impact: '粮草经济无效，行军无成本',
    flowSteps: [
      { label: '发起行军', status: 'ok', detail: '计算路径和粮草消耗' },
      { label: '扣除粮草', status: 'broken', detail: '计算但NEVER调用 user-service' },
      { label: '行军执行', status: 'ok', detail: '移动部队到目标城市' },
      { label: '资源退还', status: 'missing', detail: '撤军无退还逻辑' },
    ],
  },
  {
    id: 5, title: '入会 → 未扣金', icon: Crown,
    color: 'text-amber-400', gradient: 'from-amber-500/10 to-amber-900/5',
    impact: '创建联盟无成本，联盟泛滥',
    flowSteps: [
      { label: '发起创建', status: 'ok', detail: '验证名称等信息' },
      { label: '扣除金币', status: 'missing', detail: '配置有费用但NEVER扣除' },
      { label: '创建联盟', status: 'ok', detail: '写入数据库' },
      { label: '设置会长', status: 'ok', detail: '创建者为会长' },
    ],
  },
  {
    id: 6, title: '升级 → 无经验', icon: TrendingUp,
    color: 'text-orange-400', gradient: 'from-orange-500/10 to-orange-900/5',
    impact: '经验增长但等级不变，养成系统失效',
    flowSteps: [
      { label: '获取经验', status: 'ok', detail: 'AddExp 增加经验值' },
      { label: '检查升级', status: 'broken', detail: '无升级阈值判断逻辑' },
      { label: '执行升级', status: 'missing', detail: '无等级提升代码' },
      { label: '更新属性', status: 'missing', detail: '属性不变' },
    ],
  },
  {
    id: 7, title: '审批 → 未加成员', icon: UserPlus,
    color: 'text-red-400', gradient: 'from-red-500/10 to-red-900/5',
    impact: '申请永远无法通过，联盟无法扩员',
    flowSteps: [
      { label: '提交申请', status: 'ok', detail: '创建申请记录' },
      { label: '审批处理', status: 'ok', detail: '会长/副会长审批' },
      { label: '添加成员', status: 'broken', detail: 'ApproveApplication 未调用 doAddMember' },
      { label: '更新权限', status: 'missing', detail: '成员权限未生效' },
    ],
  },
  {
    id: 8, title: '退款 → 无回滚', icon: RotateCcw,
    color: 'text-red-400', gradient: 'from-red-500/10 to-red-900/5',
    impact: '退款后资源不扣除，双重获利',
    flowSteps: [
      { label: '发起退款', status: 'ok', detail: '创建退款记录' },
      { label: '更新订单', status: 'broken', detail: '订单状态未更新' },
      { label: '扣除资源', status: 'missing', detail: '已发放资源未回收' },
      { label: '退款完成', status: 'ok', detail: '记录已创建（假完成）' },
    ],
  },
]

const MISSING_MODULES: MissingModule[] = [
  { service: 'user-service', module: 'Internal API Endpoints (/api/v1/internal/*)', status: 'missing', impact: '所有服务间调用全部失败', category: 'API' },
  { service: 'user-service', module: 'Refresh Token Endpoint', status: 'missing', impact: 'Token 过期后必须重新登录', category: 'Auth' },
  { service: 'user-service', module: 'Schema: food column, power field', status: 'missing', impact: '粮草系统和战力系统不可用', category: 'Schema' },
  { service: 'user-service', module: 'Level-up Logic in AddExp', status: 'missing', impact: '玩家永远无法升级', category: 'Logic' },
  { service: 'user-service', module: 'Balance Check in DeductGold', status: 'missing', impact: '金币可扣为负数', category: 'Economy' },
  { service: 'card-service', module: 'Diamond Deduction in Gacha', status: 'missing', impact: '免费无限抽卡，经济崩坏', category: 'Economy' },
  { service: 'card-service', module: 'Distributed Transaction', status: 'missing', impact: '部分失败导致数据不一致', category: 'Data' },
  { service: 'card-service', module: 'Card Upgrade/Level-up/Merge', status: 'missing', impact: '卡牌养成不可用', category: 'Feature' },
  { service: 'card-service', module: 'Deck Management (table + code)', status: 'missing', impact: '无法组队/切换卡组', category: 'Feature' },
  { service: 'card-service', module: 'Correct Import Paths', status: 'missing', impact: '整个服务无法编译', category: 'Compile' },
  { service: 'battle-service', module: 'pkg/ Directory', status: 'missing', impact: '无公共工具包', category: 'Compile' },
  { service: 'battle-service', module: 'Correct Import Paths', status: 'missing', impact: '整个服务无法编译', category: 'Compile' },
  { service: 'battle-service', module: 'NormalSkill Assignment', status: 'missing', impact: '每次攻击 nil panic', category: 'Logic' },
  { service: 'battle-service', module: 'Battle Reward Distribution', status: 'missing', impact: '战斗无收益', category: 'Economy' },
  { service: 'battle-service', module: 'Card Data from card-service', status: 'missing', impact: '使用硬编码数据', category: 'Integration' },
  { service: 'battle-service', module: 'Buff/Debuff Expiry & Enforcement', status: 'missing', impact: '属性永久修改', category: 'Logic' },
  { service: 'battle-service', module: 'PVP Implementation', status: 'missing', impact: '无玩家对战', category: 'Feature' },
  { service: 'map-service', module: 'Food Deduction via user-service', status: 'missing', impact: '行军无粮草消耗', category: 'Integration' },
  { service: 'map-service', module: 'Resource Refund on Recall', status: 'missing', impact: '撤军不退资源', category: 'Logic' },
  { service: 'map-service', module: 'Internal API Endpoints', status: 'missing', impact: '其他服务无法调用', category: 'API' },
  { service: 'guild-service', module: 'UpdateGuild Handler', status: 'missing', impact: '路由注册但无实现', category: 'API' },
  { service: 'guild-service', module: 'DisbandGuild Handler', status: 'missing', impact: '路由注册但无实现', category: 'API' },
  { service: 'guild-service', module: 'doAddMember Call in ApproveApplication', status: 'missing', impact: '审批无效', category: 'Logic' },
  { service: 'guild-service', module: 'Technology System Implementation', status: 'missing', impact: '科技树不可用', category: 'Feature' },
  { service: 'guild-service', module: 'Guild Creation Cost Deduction', status: 'missing', impact: '免费创建联盟', category: 'Economy' },
  { service: 'payment-service', module: 'generateRefundNo Function', status: 'missing', impact: '无法编译', category: 'Compile' },
  { service: 'payment-service', module: 'Resource Delivery via user-service', status: 'missing', impact: '充值不到账', category: 'Integration' },
  { service: 'payment-service', module: 'Callback Signature Verification', status: 'missing', impact: '可伪造支付回调', category: 'Security' },
  { service: 'payment-service', module: 'Dynamic Diamond Amount', status: 'missing', impact: '所有商品只给100钻', category: 'Economy' },
  { service: 'quest-service', module: 'cmd/main.go Entry Point', status: 'missing', impact: '服务完全无法启动', category: 'Compile' },
  { service: 'quest-service', module: 'Service/Handler/Router Layers', status: 'missing', impact: '无业务代码', category: 'Architecture' },
  { service: 'admin-service', module: 'RBAC Permission Enforcement', status: 'stub', impact: '任何人都可访问所有功能', category: 'Security' },
  { service: 'admin-service', module: 'Real Stats Data (not hardcoded)', status: 'stub', impact: '数据统计无效', category: 'Data' },
  { service: 'admin-service', module: 'Go Backend Connection', status: 'missing', impact: '前端用本地SQLite', category: 'Integration' },
]

const ROADMAP: RoadmapItem[] = [
  { priority: 1, title: '修复全部编译错误', services: ['card-service', 'battle-service', 'payment-service', 'quest-service'], effort: 'L', impact: 'critical', description: '修正import路径、添加缺失函数、创建entry point。这是所有后续工作的前提。' },
  { priority: 2, title: '实现 user-service Internal API', services: ['user-service'], effort: 'L', impact: 'critical', description: '实现全部9个internal端点，使其他服务能正常调用用户操作（扣钻、加经验等）。' },
  { priority: 3, title: '修复支付回调安全验证', services: ['payment-service'], effort: 'M', impact: 'critical', description: '添加签名验证，修复钻石发放逻辑，动态读取商品金额。' },
  { priority: 4, title: '修复抽卡扣费 + 分布式事务', services: ['card-service', 'user-service'], effort: 'L', impact: 'critical', description: '抽卡时调用user-service扣钻，添加事务保护。' },
  { priority: 5, title: '修复战斗核心逻辑', services: ['battle-service'], effort: 'L', impact: 'critical', description: '修复NormalSkill、添加奖励发放、修复Buff/Debuff系统。' },
  { priority: 6, title: '修复联盟审批 + 宣战逻辑', services: ['guild-service'], effort: 'M', impact: 'high', description: 'ApproveApplication调用doAddMember，JWT设置guild_id。' },
  { priority: 7, title: '实现卡牌养成系统', services: ['card-service'], effort: 'L', impact: 'high', description: '实现卡牌升级、突破、合并，以及卡组管理。' },
  { priority: 8, title: '修复map-service资源联动', services: ['map-service', 'user-service'], effort: 'M', impact: 'high', description: '行军扣粮草、撤军退资源、N+1查询优化。' },
  { priority: 9, title: '实现 quest-service 完整架构', services: ['quest-service'], effort: 'L', impact: 'high', description: '创建service/handler/router层，修复daily task唯一键。' },
  { priority: 10, title: '加固 admin-service 安全', services: ['admin-service'], effort: 'M', impact: 'medium', description: 'RBAC权限 enforcement，连接Go后端替换SQLite。' },
  { priority: 11, title: '实现联盟科技系统', services: ['guild-service'], effort: 'L', impact: 'medium', description: '技术系统已有schema/model，需要完整业务实现。' },
  { priority: 12, title: '实现 PVP 战斗模式', services: ['battle-service'], effort: 'L', impact: 'medium', description: '玩家对战、排行榜、匹配系统。' },
]

const NAV_SECTIONS = [
  { id: 'overview' as SectionId, label: '系统概览', icon: LayoutDashboard },
  { id: 'issues' as SectionId, label: '关键问题', icon: AlertTriangle },
  { id: 'dependency' as SectionId, label: '依赖图谱', icon: Network },
  { id: 'flow-breaks' as SectionId, label: '逻辑断链', icon: GitBranch },
  { id: 'missing' as SectionId, label: '缺失模块', icon: Package },
  { id: 'roadmap' as SectionId, label: '修复路线图', icon: Target },
]

const SEVERITY_CONFIG = {
  critical: { label: '致命', color: 'bg-red-500/15 text-red-400 border-red-500/30', dot: 'bg-red-500' },
  high: { label: '严重', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-500' },
  medium: { label: '中等', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-500' },
}

const STATUS_CONFIG = {
  'compile-fail': { label: '编译失败', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
  'compile-errors': { label: '编译错误', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  'incomplete': { label: '不完整', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  'no-entry': { label: '无入口', color: 'bg-red-600/15 text-red-500 border-red-600/30' },
}

const CATEGORY_LABELS: Record<string, string> = {
  compile: '编译', economy: '经济', security: '安全', logic: '逻辑', missing: '缺失', data: '数据', integration: '集成', feature: '功能', auth: '认证', schema: 'Schema', api: 'API', architecture: '架构',
}

const MODULE_STATUS_CONFIG = {
  missing: { label: '未实现', color: 'text-red-400', bg: 'bg-red-500/10' },
  partial: { label: '部分', color: 'text-amber-400', bg: 'bg-amber-500/10' },
  stub: { label: '空桩', color: 'text-orange-400', bg: 'bg-orange-500/10' },
}

// ══════════════════════════════════════════════════════════════
// SVG DEPENDENCY GRAPH DATA
// ══════════════════════════════════════════════════════════════

interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  healthScore: number
  color: string
}

interface GraphEdge {
  from: string
  to: string
  label: string
  status: 'working' | 'broken' | 'missing'
}

const GRAPH_NODES: GraphNode[] = [
  { id: 'user', label: 'user-service\n:9001', x: 400, y: 60, healthScore: 35, color: '#ef4444' },
  { id: 'card', label: 'card-service\n:9003', x: 180, y: 190, healthScore: 25, color: '#ef4444' },
  { id: 'battle', label: 'battle-service\n:9002', x: 620, y: 190, healthScore: 20, color: '#ef4444' },
  { id: 'map', label: 'map-service\n:9004', x: 100, y: 340, healthScore: 55, color: '#f59e0b' },
  { id: 'guild', label: 'guild-service\n:9005', x: 320, y: 340, healthScore: 40, color: '#ef4444' },
  { id: 'payment', label: 'payment-service\n:9006', x: 540, y: 340, healthScore: 45, color: '#ef4444' },
  { id: 'quest', label: 'quest-service\n:9007', x: 180, y: 470, healthScore: 10, color: '#dc2626' },
  { id: 'admin', label: 'admin-service\n:9100', x: 520, y: 470, healthScore: 50, color: '#f59e0b' },
]

const GRAPH_EDGES: GraphEdge[] = [
  { from: 'card', to: 'user', label: '扣钻石(抽卡)', status: 'missing' },
  { from: 'battle', to: 'user', label: '加金币/经验', status: 'missing' },
  { from: 'battle', to: 'card', label: '获取卡组', status: 'broken' },
  { from: 'payment', to: 'user', label: '加钻石/金币', status: 'missing' },
  { from: 'map', to: 'user', label: '扣/加粮草', status: 'missing' },
  { from: 'guild', to: 'user', label: '更新战力', status: 'missing' },
  { from: 'guild', to: 'map', label: '城市占领', status: 'missing' },
  { from: 'quest', to: 'user', label: '加经验', status: 'missing' },
  { from: 'admin', to: 'user', label: '代理', status: 'broken' },
  { from: 'admin', to: 'card', label: '卡池管理', status: 'missing' },
  { from: 'admin', to: 'map', label: '城市管理', status: 'missing' },
  { from: 'admin', to: 'guild', label: '联盟管理', status: 'missing' },
  { from: 'admin', to: 'payment', label: '订单管理', status: 'missing' },
]

const EDGE_COLORS = {
  working: '#22c55e',
  broken: '#ef4444',
  missing: '#6b7280',
}

// ══════════════════════════════════════════════════════════════
// ANIMATION VARIANTS
// ══════════════════════════════════════════════════════════════

const fadeIn = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

const stagger = {
  animate: { transition: { staggerChildren: 0.04 } },
}

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
}

// ══════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ══════════════════════════════════════════════════════════════

function HealthRing({ score, size = 64 }: { score: number; size?: number }) {
  const radius = (size - 6) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 60 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={3} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none"
        stroke={color} strokeWidth={3}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  )
}

function ScoreDisplay({ score }: { score: number }) {
  return (
    <div className="relative">
      <HealthRing score={score} size={64} />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-white">{score}</span>
      </div>
    </div>
  )
}

// ── Section 1: System Overview ──

function SystemOverview() {
  const avgScore = Math.round(SERVICES.reduce((a, s) => a + s.healthScore, 0) / SERVICES.length)
  const compileCount = SERVICES.filter(s => s.status === 'compile-fail').length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '平均健康分', value: `${avgScore}/100`, icon: Activity, color: avgScore < 40 ? 'text-red-400' : 'text-amber-400', bg: 'bg-slate-800/50' },
          { label: '编译失败', value: `${compileCount}/8`, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/5' },
          { label: '关键问题', value: `${CRITICAL_ISSUES.filter(i => i.severity === 'critical').length}`, icon: AlertOctagon, color: 'text-red-400', bg: 'bg-red-500/5' },
          { label: '缺失模块', value: `${MISSING_MODULES.length}`, icon: Package, color: 'text-amber-400', bg: 'bg-amber-500/5' },
        ].map((stat, i) => (
          <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.05 }}>
            <Card className="bg-slate-900/60 border-slate-800/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-500">{stat.label}</span>
                  <stat.icon className={cn('w-4 h-4', stat.color)} />
                </div>
                <span className={cn('text-xl font-bold', stat.color)}>{stat.value}</span>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Service Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {SERVICES.map((svc, i) => {
          const Icon = svc.icon
          return (
            <motion.div key={svc.name} {...fadeIn} transition={{ delay: i * 0.05 }}>
              <Card className="bg-slate-900/60 border-slate-800/60 hover:border-slate-700/80 transition-all duration-300 group">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn('w-9 h-9 rounded-lg bg-gradient-to-br flex items-center justify-center', svc.gradientFrom, svc.gradientTo)}>
                        <Icon className={cn('w-4 h-4', svc.color)} />
                      </div>
                      <div>
                        <CardTitle className="text-sm font-semibold text-slate-200">{svc.name}</CardTitle>
                        <CardDescription className="text-[11px] text-slate-500">:{svc.port}</CardDescription>
                      </div>
                    </div>
                    <ScoreDisplay score={svc.healthScore} />
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div>
                    <Badge variant="outline" className={cn('text-[10px]', STATUS_CONFIG[svc.status].color)}>
                      {STATUS_CONFIG[svc.status].label}
                    </Badge>
                  </div>
                  <Progress
                    value={svc.healthScore}
                    className={cn('h-1.5', svc.healthScore >= 60 ? '[&>div]:bg-emerald-500' : svc.healthScore >= 40 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500')}
                  />
                  <div className="text-[11px] text-slate-500 group-hover:text-slate-400 transition-colors">
                    {svc.issues.length} 个问题
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ── Section 2: Critical Issues ──

function CriticalIssues() {
  const [filterService, setFilterService] = useState<string>('all')
  const [filterSeverity, setFilterSeverity] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')

  const categories = [...new Set(CRITICAL_ISSUES.map(i => i.category))]

  const filtered = CRITICAL_ISSUES.filter(i => {
    if (filterService !== 'all' && i.service !== filterService) return false
    if (filterSeverity !== 'all' && i.severity !== filterSeverity) return false
    if (filterCategory !== 'all' && i.category !== filterCategory) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card className="bg-slate-900/60 border-slate-800/60">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-medium mr-1">筛选:</span>
            <select
              value={filterService}
              onChange={e => setFilterService(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            >
              <option value="all">全部服务</option>
              {SERVICES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <select
              value={filterSeverity}
              onChange={e => setFilterSeverity(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            >
              <option value="all">全部级别</option>
              <option value="critical">致命</option>
              <option value="high">严重</option>
              <option value="medium">中等</option>
            </select>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="text-xs bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
            >
              <option value="all">全部类型</option>
              {categories.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
            </select>
            <Badge variant="outline" className="text-[10px] text-slate-400 border-slate-700 ml-auto">
              {filtered.length} / {CRITICAL_ISSUES.length} 条
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Issues List */}
      <ScrollArea className="max-h-[600px]">
        <div className="space-y-1.5 pr-3">
          {filtered.map((issue, i) => {
            const sev = SEVERITY_CONFIG[issue.severity]
            const svc = SERVICES.find(s => s.name === issue.service)
            return (
              <motion.div
                key={`${issue.service}-${i}`}
                {...fadeIn}
                transition={{ delay: Math.min(i * 0.02, 0.5) }}
              >
                <Card className="bg-slate-900/40 border-slate-800/40 hover:border-slate-700/60 transition-all duration-200">
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className={cn('w-2 h-2 rounded-full mt-1.5 flex-shrink-0', sev.dot)} />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn('text-[9px]', sev.color)}>{sev.label}</Badge>
                        <Badge variant="outline" className="text-[9px] bg-slate-800/50 text-slate-400 border-slate-700">
                          {CATEGORY_LABELS[issue.category] || issue.category}
                        </Badge>
                        <span className="text-[10px] text-slate-500 font-mono">{issue.service}</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{issue.description}</p>
                    </div>
                    {svc && (
                      <div className="flex-shrink-0 text-right">
                        <span className={cn('text-xs font-bold', svc.healthScore < 40 ? 'text-red-400' : 'text-amber-400')}>
                          {svc.healthScore}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

// ── Section 3: Dependency Graph ──

function DependencyGraph() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const getNode = (id: string) => GRAPH_NODES.find(n => n.id === id)!
  const getConnectedEdges = (nodeId: string) =>
    GRAPH_EDGES.filter(e => e.from === nodeId || e.to === nodeId)

  const selectedEdges = selectedNode ? getConnectedEdges(selectedNode) : []

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-2">
        {[
          { color: '#22c55e', label: '正常' },
          { color: '#ef4444', label: '异常' },
          { color: '#6b7280', label: '缺失' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-4 h-0.5 rounded" style={{ backgroundColor: l.color }} />
            <span className="text-[10px] text-slate-500">{l.label}</span>
          </div>
        ))}
        <span className="text-[10px] text-slate-600 ml-auto">点击节点查看详情</span>
      </div>

      <Card className="bg-slate-900/60 border-slate-800/60">
        <CardContent className="p-2 overflow-x-auto">
          <svg ref={svgRef} viewBox="0 0 720 530" className="w-full min-w-[600px] h-auto">
            <defs>
              <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="currentColor" className="text-slate-600" />
              </marker>
              <marker id="arrowhead-highlight" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
                <polygon points="0 0, 8 3, 0 6" fill="currentColor" className="text-amber-400" />
              </marker>
            </defs>

            {/* Edges */}
            {GRAPH_EDGES.map((edge, i) => {
              const fromNode = getNode(edge.from)
              const toNode = getNode(edge.to)
              const isHighlighted = selectedNode && (edge.from === selectedNode || edge.to === selectedNode)
              const edgeColor = EDGE_COLORS[edge.status]

              const midX = (fromNode.x + toNode.x) / 2
              const midY = (fromNode.y + toNode.y) / 2
              const dx = toNode.x - fromNode.x
              const dy = toNode.y - fromNode.y
              const perpX = -dy * 0.12
              const perpY = dx * 0.12

              const cpX = midX + perpX
              const cpY = midY + perpY

              return (
                <g key={i}>
                  <path
                    d={`M ${fromNode.x} ${fromNode.y} Q ${cpX} ${cpY} ${toNode.x} ${toNode.y}`}
                    fill="none"
                    stroke={isHighlighted ? edgeColor : 'rgba(107,114,128,0.3)'}
                    strokeWidth={isHighlighted ? 2.5 : 1}
                    strokeDasharray={edge.status === 'missing' ? '6 3' : 'none'}
                    markerEnd={isHighlighted ? 'url(#arrowhead-highlight)' : 'url(#arrowhead)'}
                    className="transition-all duration-300"
                    opacity={selectedNode && !isHighlighted ? 0.1 : 1}
                  />
                  {isHighlighted && (
                    <text
                      x={cpX} y={cpY - 8}
                      textAnchor="middle"
                      className="fill-amber-400 text-[9px] font-medium"
                    >
                      {edge.label}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Nodes */}
            {GRAPH_NODES.map(node => {
              const isSelected = selectedNode === node.id
              const isDimmed = selectedNode && selectedNode !== node.id

              return (
                <g
                  key={node.id}
                  className={cn('cursor-pointer transition-all duration-300', isDimmed && 'opacity-30')}
                  onClick={() => setSelectedNode(prev => prev === node.id ? null : node.id)}
                >
                  {/* Glow */}
                  {isSelected && (
                    <circle cx={node.x} cy={node.y} r={48} fill="none" stroke="#f59e0b" strokeWidth={1} opacity={0.3}>
                      <animate attributeName="r" from="42" to="52" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" from="0.4" to="0.1" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  {/* Node circle */}
                  <circle
                    cx={node.x} cy={node.y}
                    r={isSelected ? 40 : 36}
                    fill="#0f1117"
                    stroke={isSelected ? '#f59e0b' : node.color}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    className="transition-all duration-300"
                  />
                  {/* Score ring */}
                  <circle
                    cx={node.x} cy={node.y}
                    r={36}
                    fill="none"
                    stroke={node.color}
                    strokeWidth={2.5}
                    strokeDasharray={`${node.healthScore * 2.26} 999`}
                    strokeDashoffset="0"
                    transform={`rotate(-90 ${node.x} ${node.y})`}
                    strokeLinecap="round"
                    opacity={0.8}
                  />
                  {/* Label */}
                  {node.label.split('\n').map((line, li) => (
                    <text
                      key={li}
                      x={node.x} y={node.y + (li === 0 ? -5 : 9)}
                      textAnchor="middle"
                      className={cn(
                        'text-[10px] font-medium pointer-events-none',
                        li === 0 ? 'fill-slate-300' : 'fill-slate-500'
                      )}
                    >
                      {line}
                    </text>
                  ))}
                </g>
              )
            })}
          </svg>
        </CardContent>
      </Card>

      {/* Selected Node Details */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div {...fadeIn} transition={{ duration: 0.2 }}>
            <Card className="bg-slate-900/60 border-amber-500/30">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CircleDot className="w-4 h-4 text-amber-400" />
                    <CardTitle className="text-sm text-slate-200">{getNode(selectedNode).label.replace('\n', ' ')}</CardTitle>
                    <Badge variant="outline" className="text-[10px] bg-slate-800/50 text-slate-400 border-slate-700">
                      {getNode(selectedNode).healthScore}/100
                    </Badge>
                  </div>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setSelectedNode(null)}>
                    <X className="w-3 h-3 text-slate-500" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-0 space-y-2">
                <span className="text-xs text-slate-500 font-medium">依赖关系:</span>
                <div className="space-y-1.5">
                  {selectedEdges.map((edge, i) => {
                    const isFrom = edge.from === selectedNode
                    const otherNode = getNode(isFrom ? edge.to : edge.from)
                    const edgeColor = EDGE_COLORS[edge.status]
                    return (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="text-slate-400">{isFrom ? '→ 调用' : '← 被调用'}</span>
                        <span className="text-slate-300 font-medium">{otherNode.label.split('\n')[0]}</span>
                        <span className="text-slate-500">({edge.label})</span>
                        <Badge
                          variant="outline"
                          className={cn('text-[9px] ml-auto',
                            edge.status === 'missing' ? 'bg-slate-800/50 text-slate-500 border-slate-700'
                            : edge.status === 'broken' ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          )}
                        >
                          {edge.status === 'missing' ? '缺失' : edge.status === 'broken' ? '异常' : '正常'}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Section 4: Logic Flow Breaks ──

function FlowBreaks() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {LOGIC_BREAKS.map((brk, i) => {
        const Icon = brk.icon
        return (
          <motion.div key={brk.id} {...fadeIn} transition={{ delay: i * 0.05 }}>
            <Card className={cn('bg-gradient-to-br border border-slate-800/60 overflow-hidden', brk.gradient)}>
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center gap-2.5">
                  <div className={cn('w-8 h-8 rounded-lg bg-slate-800/80 flex items-center justify-center', brk.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-sm font-semibold text-slate-200">{brk.title}</CardTitle>
                    <CardDescription className="text-[11px] text-red-400/80">{brk.impact}</CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-400 border-red-500/30">
                    断链 #{brk.id}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                <div className="space-y-0">
                  {brk.flowSteps.map((step, si) => (
                    <div key={si} className="flex items-start gap-2">
                      {/* Vertical connector */}
                      <div className="flex flex-col items-center">
                        <div className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center border text-[10px] font-bold flex-shrink-0',
                          step.status === 'ok'
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                            : step.status === 'broken'
                              ? 'bg-red-500/10 border-red-500/40 text-red-400'
                              : 'bg-slate-700/50 border-slate-600/40 text-slate-500'
                        )}>
                          {step.status === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5" />
                            : step.status === 'broken' ? <XCircle className="w-3.5 h-3.5" />
                              : <span className="text-[8px]">∅</span>}
                        </div>
                        {si < brk.flowSteps.length - 1 && (
                          <div className={cn(
                            'w-0.5 h-4',
                            step.status === 'broken' ? 'bg-red-500/30' : 'bg-slate-700/50'
                          )} />
                        )}
                      </div>
                      <div className="pt-0.5 pb-3">
                        <span className={cn(
                          'text-xs font-medium',
                          step.status === 'ok' ? 'text-slate-300'
                            : step.status === 'broken' ? 'text-red-300'
                              : 'text-slate-500'
                        )}>
                          {step.label}
                        </span>
                        <p className="text-[10px] text-slate-600 mt-0.5">{step.detail}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )
      })}
    </div>
  )
}

// ── Section 5: Missing Modules ──

function MissingModules() {
  const [expandedService, setExpandedService] = useState<string | null>(null)
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set())

  const toggleCheck = (key: string) => {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const groupedByService = MISSING_MODULES.reduce<Record<string, MissingModule[]>>((acc, mod) => {
    if (!acc[mod.service]) acc[mod.service] = []
    acc[mod.service].push(mod)
    return acc
  }, {})

  const totalModules = MISSING_MODULES.length
  const checkedCount = checkedItems.size

  return (
    <div className="space-y-4">
      {/* Progress summary */}
      <Card className="bg-slate-900/60 border-slate-800/60">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">修复进度</span>
            <span className="text-xs text-slate-500">{checkedCount} / {totalModules} 已处理</span>
          </div>
          <Progress value={(checkedCount / totalModules) * 100} className="h-2 [&>div]:bg-emerald-500" />
        </CardContent>
      </Card>

      <ScrollArea className="max-h-[600px]">
        <div className="space-y-2 pr-3">
          {Object.entries(groupedByService).map(([service, modules]) => {
            const isExpanded = expandedService === service
            const svc = SERVICES.find(s => s.name === service)!
            const Icon = svc.icon
            const checkedInGroup = modules.filter(m => checkedItems.has(`${service}-${m.module}`)).length

            return (
              <motion.div key={service} {...scaleIn}>
                <Card className="bg-slate-900/40 border-slate-800/40">
                  <button
                    onClick={() => setExpandedService(prev => prev === service ? null : service)}
                    className="w-full p-3 flex items-center gap-3 text-left"
                  >
                    <Icon className={cn('w-4 h-4 flex-shrink-0', svc.color)} />
                    <span className="text-sm font-medium text-slate-300 flex-1">{service}</span>
                    <Badge variant="outline" className="text-[9px] text-slate-400 border-slate-700">
                      {checkedInGroup}/{modules.length}
                    </Badge>
                    <ChevronDown className={cn('w-4 h-4 text-slate-500 transition-transform', isExpanded && 'rotate-180')} />
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <Separator className="bg-slate-800/60" />
                        <div className="p-3 space-y-1">
                          {modules.map(mod => {
                            const key = `${service}-${mod.module}`
                            const isChecked = checkedItems.has(key)
                            const statusConf = MODULE_STATUS_CONFIG[mod.status]
                            return (
                              <div key={mod.module} className="flex items-start gap-2.5 py-1.5 px-1 rounded-lg hover:bg-slate-800/30 transition-colors">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => toggleCheck(key)}
                                  className="mt-0.5 w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/30 focus:ring-offset-0 cursor-pointer"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={cn('text-xs font-medium', isChecked ? 'text-slate-500 line-through' : 'text-slate-300')}>
                                      {mod.module}
                                    </span>
                                    <Badge variant="outline" className={cn('text-[9px]', statusConf.bg, statusConf.color, 'border-transparent')}>
                                      {statusConf.label}
                                    </Badge>
                                  </div>
                                  <p className="text-[10px] text-slate-600 mt-0.5">{mod.impact}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            )
          })}
        </div>
      </ScrollArea>
    </div>
  )
}

// ── Section 6: Roadmap ──

function FixRoadmap() {
  const effortConfig = { S: { label: '小', color: 'text-emerald-400' }, M: { label: '中', color: 'text-amber-400' }, L: { label: '大', color: 'text-red-400' } }

  const impactConfig = {
    critical: { label: '致命', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
    high: { label: '严重', color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
    medium: { label: '中等', color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  }

  return (
    <div className="space-y-4">
      {/* Priority Matrix Header */}
      <Card className="bg-slate-900/60 border-slate-800/60">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-6 text-xs">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-400">工作量:</span>
              <span className="text-emerald-400">S=小</span>
              <span className="text-amber-400">M=中</span>
              <span className="text-red-400">L=大</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-400">影响:</span>
              <Badge variant="outline" className="text-[9px] bg-red-500/15 text-red-400 border-red-500/30">致命</Badge>
              <Badge variant="outline" className="text-[9px] bg-orange-500/15 text-orange-400 border-orange-500/30">严重</Badge>
              <Badge variant="outline" className="text-[9px] bg-amber-500/15 text-amber-400 border-amber-500/30">中等</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roadmap Items */}
      <div className="space-y-3">
        {ROADMAP.map((item, i) => {
          const eff = effortConfig[item.effort]
          const imp = impactConfig[item.impact]
          return (
            <motion.div key={i} {...fadeIn} transition={{ delay: i * 0.04 }}>
              <Card className={cn(
                'bg-slate-900/40 border-slate-800/40 hover:border-slate-700/60 transition-all',
                item.impact === 'critical' && 'hover:border-red-500/30'
              )}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Priority Number */}
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0',
                      item.priority <= 3 ? 'bg-red-500/15 text-red-400'
                        : item.priority <= 6 ? 'bg-orange-500/15 text-orange-400'
                          : item.priority <= 9 ? 'bg-amber-500/15 text-amber-400'
                            : 'bg-slate-800/50 text-slate-500'
                    )}>
                      {item.priority}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-semibold text-slate-200">{item.title}</h4>
                        <Badge variant="outline" className={cn('text-[9px]', eff.color, 'border-transparent bg-slate-800/50')}>
                          {eff.label}
                        </Badge>
                        <Badge variant="outline" className={cn('text-[9px]', imp.color)}>
                          {imp.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{item.description}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.services.map(svc => {
                          const s = SERVICES.find(x => x.name === svc)
                          return (
                            <Badge key={svc} variant="outline" className="text-[9px] bg-slate-800/50 text-slate-500 border-slate-700/50">
                              {svc}
                              <span className={cn('ml-1 font-mono', s && s.healthScore < 40 ? 'text-red-400' : 'text-amber-400')}>
                                {s?.healthScore || '?'}
                              </span>
                            </Badge>
                          )
                        })}
                      </div>
                    </div>

                    {/* Arrow indicator */}
                    <ChevronRight className="w-4 h-4 text-slate-700 flex-shrink-0 mt-1" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ══════════════════════════════════════════════════════════════

export default function IntegrityDashboard() {
  const [activeSection, setActiveSection] = useState<SectionId>('overview')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const mainRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<SectionId, HTMLDivElement | null>>({
    overview: null, issues: null, dependency: null,
    'flow-breaks': null, missing: null, roadmap: null,
  })

  const scrollToSection = useCallback((sectionId: SectionId) => {
    setActiveSection(sectionId)
    setSidebarOpen(false)
    const el = sectionRefs.current[sectionId]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  // Intersection observer for active section tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const id = entry.target.id as SectionId
            if (NAV_SECTIONS.some(s => s.id === id)) {
              setActiveSection(id)
            }
          }
        }
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    )

    Object.values(sectionRefs.current).forEach(el => {
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  return (
    <div className="h-screen w-full flex bg-[#0a0b10] text-white overflow-hidden">
      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-50 w-60 bg-[#0d0f15] border-r border-slate-800/60 flex flex-col transform transition-transform duration-300 ease-in-out',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-100 tracking-wide">九州争鼎</div>
              <div className="text-[10px] text-slate-500">系统完整性分析</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {NAV_SECTIONS.map((section) => {
            const isActive = activeSection === section.id
            const Icon = section.icon
            const issueCount = section.id === 'issues' ? CRITICAL_ISSUES.length : undefined
            return (
              <motion.button
                key={section.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative overflow-hidden',
                  isActive
                    ? 'bg-gradient-to-r from-amber-500/15 to-amber-600/5 text-amber-100 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="integrity-nav-active"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-500 rounded-r-full"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-amber-400' : 'text-slate-500')} />
                <span className="truncate text-[13px]">{section.label}</span>
                {issueCount !== undefined && (
                  <Badge variant="outline" className="ml-auto text-[9px] bg-red-500/10 text-red-400 border-red-500/30 px-1.5">
                    {issueCount}
                  </Badge>
                )}
              </motion.button>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-slate-800/60">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-500">系统总体评分</span>
              <span className="text-red-400 font-bold">
                {Math.round(SERVICES.reduce((a, s) => a + s.healthScore, 0) / SERVICES.length)}/100
              </span>
            </div>
            <Progress
              value={Math.round(SERVICES.reduce((a, s) => a + s.healthScore, 0) / SERVICES.length)}
              className="h-1.5 [&>div]:bg-red-500"
            />
            <p className="text-[9px] text-slate-600 text-center">⚠️ 6/8 服务无法编译</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex-shrink-0 h-14 bg-[#0d0f15]/80 backdrop-blur-xl border-b border-slate-800/60 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-100">系统完整性分析</h1>
                <Badge variant="outline" className="text-[9px] bg-red-500/10 text-red-400 border-red-500/30 hidden sm:inline-flex">
                  <AlertOctagon className="w-2.5 h-2.5 mr-1" />
                  {SERVICES.filter(s => s.healthScore < 30).length} 项严重
                </Badge>
              </div>
              <p className="text-[10px] text-slate-600 hidden sm:block">九州争鼎 · SLG 卡牌游戏 · 后端微服务架构分析报告</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-red-500/5 border border-red-500/20 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[10px] text-red-400/80">系统存在严重问题</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main ref={mainRef} className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 space-y-10">
            {/* Section 1: System Overview */}
            <section id="overview" ref={el => { sectionRefs.current.overview = el }} className="scroll-mt-20">
              <SectionHeader id="overview" icon={LayoutDashboard} title="系统概览" subtitle="8 个微服务的健康状态总览" />
              <SystemOverview />
            </section>

            <Separator className="bg-slate-800/40" />

            {/* Section 2: Critical Issues */}
            <section id="issues" ref={el => { sectionRefs.current.issues = el }} className="scroll-mt-20">
              <SectionHeader id="issues" icon={AlertTriangle} title="关键问题" subtitle={`${CRITICAL_ISSUES.length} 个已识别的问题，可按服务/级别/类型筛选`} />
              <CriticalIssues />
            </section>

            <Separator className="bg-slate-800/40" />

            {/* Section 3: Dependency Graph */}
            <section id="dependency" ref={el => { sectionRefs.current.dependency = el }} className="scroll-mt-20">
              <SectionHeader id="dependency" icon={Network} title="服务依赖图谱" subtitle="微服务间的调用关系与连接状态" />
              <DependencyGraph />
            </section>

            <Separator className="bg-slate-800/40" />

            {/* Section 4: Logic Flow Breaks */}
            <section id="flow-breaks" ref={el => { sectionRefs.current['flow-breaks'] = el }} className="scroll-mt-20">
              <SectionHeader id="flow-breaks" icon={GitBranch} title="逻辑断链" subtitle="8 条核心业务流程中的断链分析" />
              <FlowBreaks />
            </section>

            <Separator className="bg-slate-800/40" />

            {/* Section 5: Missing Modules */}
            <section id="missing" ref={el => { sectionRefs.current.missing = el }} className="scroll-mt-20">
              <SectionHeader id="missing" icon={Package} title="缺失模块" subtitle={`${MISSING_MODULES.length} 个未实现或不完整的模块`} />
              <MissingModules />
            </section>

            <Separator className="bg-slate-800/40" />

            {/* Section 6: Roadmap */}
            <section id="roadmap" ref={el => { sectionRefs.current.roadmap = el }} className="scroll-mt-20">
              <SectionHeader id="roadmap" icon={Target} title="修复路线图" subtitle="按优先级排列的修复建议（P1 → P12）" />
              <FixRoadmap />
            </section>

            {/* Footer */}
            <footer className="pt-4 pb-8 text-center">
              <Separator className="bg-slate-800/40 mb-4" />
              <p className="text-[10px] text-slate-600">
                九州争鼎 · 系统完整性分析仪表盘 · 自动生成报告
              </p>
              <p className="text-[9px] text-slate-700 mt-1">
                数据基于后端 Go 微服务代码静态分析 · 更新时间: {new Date().toLocaleDateString('zh-CN')}
              </p>
            </footer>
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="lg:hidden flex-shrink-0 bg-[#0d0f15]/90 backdrop-blur-xl border-t border-slate-800/60">
          <div className="flex items-center justify-around px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            {NAV_SECTIONS.slice(0, 5).map(section => {
              const isActive = activeSection === section.id
              const Icon = section.icon
              return (
                <button
                  key={section.id}
                  onClick={() => scrollToSection(section.id)}
                  className="relative flex flex-col items-center justify-center py-1.5 px-2 min-w-[44px] rounded-lg transition-all"
                >
                  <Icon className={cn('w-4.5 h-4.5 transition-colors', isActive ? 'text-amber-400' : 'text-slate-600')} />
                  <span className={cn('text-[9px] mt-0.5 transition-colors', isActive ? 'text-amber-400 font-medium' : 'text-slate-600')}>
                    {section.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="integrity-mobile-indicator"
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-amber-500 rounded-full"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}

// ── Section Header ──

function SectionHeader({ id, icon: Icon, title, subtitle }: { id: SectionId; icon: typeof LayoutDashboard; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/15 to-amber-600/5 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-amber-400" />
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-200">{title}</h2>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
    </div>
  )
}
