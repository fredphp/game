'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Flame, Shield, Sparkles, Mail,
  Menu, X, ChevronLeft, Gamepad2, RefreshCw,
  Users, Sword, Map, CreditCard, BarChart3, Target,
  ScrollText, Settings, PartyPopper, Lock, ArrowDownUp,
  Swords, ChevronDown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

// ── Ops Components (connected to real APIs) ──
import OpsDashboard from '@/components/ops/OpsDashboard'
import OpsActivity from '@/components/ops/OpsActivity'
import OpsBattlePass from '@/components/ops/OpsBattlePass'
import OpsLimitedPool from '@/components/ops/OpsLimitedPool'
import OpsMail from '@/components/ops/OpsMail'

// ── Admin Components (connected to real APIs) ──
import DashboardPage from '@/components/admin/dashboard-page'
import UsersPage from '@/components/admin/users-page'
import CardPoolPage from '@/components/admin/card-pool-page'
import HeroesPage from '@/components/admin/heroes-page'
import MapPage from '@/components/admin/map-page'
import GuildsPage from '@/components/admin/guilds-page'
import PaymentPage from '@/components/admin/payment-page'
import AnalyticsPage from '@/components/admin/analytics-page'
import QuestPage from '@/components/admin/quest-page'
import LogsPage from '@/components/admin/logs-page'
import ConfigPage from '@/components/admin/config-page'
import ActivitiesPage from '@/components/admin/activities-page'
import RolesPage from '@/components/admin/roles-page'
import EconomyPage from '@/components/admin/economy-page'
import OperationsPage from '@/components/admin/operations-page'

// ── Placeholder for Battle module ──
function BattlePlaceholder() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6">
      <div className="relative">
        <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-600/20 border border-red-500/30 flex items-center justify-center">
          <Swords className="w-10 h-10 text-red-400" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
          <span className="text-sm">⚔️</span>
        </div>
      </div>
      <div className="text-center space-y-2">
        <h3 className="text-xl font-bold text-white">战斗系统</h3>
        <p className="text-sm text-slate-400 max-w-md">
          战斗数据统计、PVE/PVP记录、竞技场排名、Boss战日志等核心战斗管理功能
        </p>
        <div className="flex items-center gap-3 mt-4">
          <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-400">
            PVE 副本
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-400">
            PVP 竞技
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-400">
            攻城战
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-400">
            世界Boss
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-600 mt-2">模块开发中，敬请期待...</p>
    </div>
  )
}

// ==================== Types ====================

type Module =
  | 'dashboard' | 'users' | 'roles' | 'card-pool' | 'heroes' | 'battle'
  | 'map' | 'guilds' | 'mail' | 'payment' | 'economy'
  | 'analytics' | 'quest' | 'logs' | 'config'
  | 'activity' | 'battlepass' | 'limited-pool' | 'activities' | 'operations'

interface NavItem {
  id: Module
  label: string
  icon: typeof LayoutDashboard
  color: string
  description: string
  group: string
}

interface NavGroup {
  key: string
  label: string
  items: NavItem[]
}

// ==================== Navigation Config ====================

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'overview',
    label: '数据看板',
    items: [
      { id: 'dashboard', label: '数据看板', icon: LayoutDashboard, color: 'text-slate-300', description: '全局总览', group: 'overview' },
    ],
  },
  {
    key: 'user',
    label: '用户管理',
    items: [
      { id: 'users', label: '玩家管理', icon: Users, color: 'text-emerald-400', description: '用户/封禁', group: 'user' },
      { id: 'roles', label: '角色权限', icon: Lock, color: 'text-amber-400', description: 'RBAC', group: 'user' },
    ],
  },
  {
    key: 'game',
    label: '游戏内容',
    items: [
      { id: 'card-pool', label: '卡池管理', icon: Sparkles, color: 'text-violet-400', description: '卡池/概率', group: 'game' },
      { id: 'heroes', label: '武将管理', icon: Sword, color: 'text-red-400', description: '武将/属性', group: 'game' },
      { id: 'map', label: '地图控制台', icon: Map, color: 'text-cyan-400', description: '城池/行军', group: 'game' },
      { id: 'battle', label: '战斗系统', icon: Swords, color: 'text-orange-400', description: '战斗/竞技', group: 'game' },
    ],
  },
  {
    key: 'social',
    label: '社交系统',
    items: [
      { id: 'guilds', label: '联盟管理', icon: Shield, color: 'text-emerald-400', description: '联盟/成员', group: 'social' },
      { id: 'mail', label: '邮件系统', icon: Mail, color: 'text-sky-400', description: '邮件管理', group: 'social' },
    ],
  },
  {
    key: 'biz',
    label: '商业化',
    items: [
      { id: 'payment', label: '充值支付', icon: CreditCard, color: 'text-green-400', description: '订单/充值', group: 'biz' },
      { id: 'economy', label: '经济系统', icon: ArrowDownUp, color: 'text-amber-400', description: '资源/产出', group: 'biz' },
    ],
  },
  {
    key: 'ops',
    label: '运营系统',
    items: [
      { id: 'activity', label: '活动管理', icon: Flame, color: 'text-amber-400', description: '运营活动', group: 'ops' },
      { id: 'battlepass', label: '战令管理', icon: Shield, color: 'text-emerald-400', description: '赛季管理', group: 'ops' },
      { id: 'limited-pool', label: '限时卡池', icon: Sparkles, color: 'text-violet-400', description: '卡池配置', group: 'ops' },
      { id: 'quest', label: '任务系统', icon: Target, color: 'text-orange-400', description: '主线/日常', group: 'ops' },
    ],
  },
  {
    key: 'data',
    label: '数据统计',
    items: [
      { id: 'analytics', label: '数据分析', icon: BarChart3, color: 'text-blue-400', description: 'DAU/留存', group: 'data' },
      { id: 'logs', label: '操作日志', icon: ScrollText, color: 'text-slate-400', description: 'GM日志', group: 'data' },
    ],
  },
  {
    key: 'sys',
    label: '系统管理',
    items: [
      { id: 'config', label: '配置中心', icon: Settings, color: 'text-slate-400', description: '系统配置', group: 'sys' },
    ],
  },
]

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items)

const MODULE_TITLES: Record<Module, string> = {
  dashboard: '数据看板',
  users: '玩家管理',
  roles: '角色权限',
  'card-pool': '卡池管理',
  heroes: '武将管理',
  battle: '战斗系统',
  map: '地图控制台',
  guilds: '联盟管理',
  mail: '邮件系统',
  payment: '充值支付',
  economy: '经济系统',
  analytics: '数据分析',
  quest: '任务系统',
  logs: '操作日志',
  config: '配置中心',
  activity: '活动管理',
  battlepass: '战令管理',
  'limited-pool': '限时卡池',
  activities: '活动列表',
  operations: '运营总览',
}

const MODULE_DESCRIPTIONS: Record<Module, string> = {
  dashboard: '九州争鼎 · 游戏运营全局数据总览',
  users: '管理游戏玩家信息、封禁/解封、资源调整',
  roles: '管理后台角色与权限分配',
  'card-pool': '管理常驻和限时召唤卡池配置',
  heroes: '管理武将属性、技能、兵种配置',
  battle: '战斗数据统计与战斗记录管理',
  map: '城池分布、占领状态、行军队列管理',
  guilds: '联盟创建、成员管理、联盟战争',
  mail: '系统邮件发送与玩家邮件管理',
  payment: '充值订单管理与退款操作',
  economy: '游戏内经济产出与消耗监控',
  analytics: 'DAU/MAU、留存率、收入分析',
  quest: '主线任务、日常任务、成就配置',
  logs: 'GM操作日志、用户行为日志查询',
  config: '游戏参数配置与版本管理',
  activity: '创建和管理游戏运营活动',
  battlepass: '赛季战令配置与数据监控',
  'limited-pool': '限定卡池概率与开放管理',
  activities: '活动列表与数据总览',
  operations: '运营系统模块总览',
}

// ==================== Component ====================

export default function OpsPage() {
  const [activeModule, setActiveModule] = useState<Module>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const handleNavigate = useCallback((module: string) => {
    setActiveModule(module as Module)
    setSidebarOpen(false)
  }, [])

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const toggleGroup = useCallback((key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const renderModule = () => {
    switch (activeModule) {
      // ── 数据看板 ──
      case 'dashboard':
        return <DashboardPage key={refreshKey} />

      // ── 用户管理 ──
      case 'users':
        return <UsersPage key={refreshKey} />
      case 'roles':
        return <RolesPage key={refreshKey} />

      // ── 游戏内容 ──
      case 'card-pool':
        return <CardPoolPage key={refreshKey} />
      case 'heroes':
        return <HeroesPage key={refreshKey} />
      case 'battle':
        return <BattlePlaceholder />
      case 'map':
        return <MapPage key={refreshKey} />

      // ── 社交系统 ──
      case 'guilds':
        return <GuildsPage key={refreshKey} />
      case 'mail':
        return <OpsMail key={refreshKey} />

      // ── 商业化 ──
      case 'payment':
        return <PaymentPage key={refreshKey} />
      case 'economy':
        return <EconomyPage key={refreshKey} />

      // ── 运营系统 ──
      case 'activity':
        return <OpsActivity key={refreshKey} />
      case 'battlepass':
        return <OpsBattlePass key={refreshKey} />
      case 'limited-pool':
        return <OpsLimitedPool key={refreshKey} />
      case 'quest':
        return <QuestPage key={refreshKey} />

      // ── 数据统计 ──
      case 'analytics':
        return <AnalyticsPage key={refreshKey} />
      case 'logs':
        return <LogsPage key={refreshKey} />

      // ── 系统管理 ──
      case 'config':
        return <ConfigPage key={refreshKey} />

      // ── Legacy ──
      case 'activities':
        return <ActivitiesPage key={refreshKey} />
      case 'operations':
        return <OperationsPage key={refreshKey} />
      default:
        return <DashboardPage key={refreshKey} />
    }
  }

  const currentNavItem = ALL_ITEMS.find((n) => n.id === activeModule)

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
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-64 bg-[#0d0f15] border-r border-slate-800/60
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo Section */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Gamepad2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-100 tracking-wide">九州争鼎</div>
              <div className="text-[10px] text-slate-500">运营管理系统 v2.0</div>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {NAV_GROUPS.map((group) => {
            const isCollapsed = collapsedGroups.has(group.key)
            return (
              <div key={group.key}>
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.key)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[10px] font-medium text-slate-600 uppercase tracking-wider hover:text-slate-400 transition-colors"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn(
                      'w-3 h-3 transition-transform duration-200',
                      isCollapsed && '-rotate-90'
                    )}
                  />
                </button>

                {/* Group Items */}
                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const isActive = activeModule === item.id
                      const Icon = item.icon
                      return (
                        <motion.button
                          key={item.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleNavigate(item.id)}
                          className={`
                            w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                            transition-all duration-200 relative overflow-hidden
                            ${isActive
                              ? 'bg-gradient-to-r from-amber-500/15 to-amber-600/5 text-amber-100 shadow-sm'
                              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                            }
                          `}
                        >
                          {isActive && (
                            <motion.div
                              layoutId="sidebar-active"
                              className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-amber-500 rounded-r-full"
                              transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                            />
                          )}
                          <Icon className={cn('w-4 h-4 flex-shrink-0', isActive ? 'text-amber-400' : item.color)} />
                          <span className="truncate text-[13px]">{item.label}</span>
                        </motion.button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
              OP
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-slate-300 truncate">运营管理员</div>
              <div className="text-[10px] text-slate-600">admin@jiuzhou.game</div>
            </div>
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
                <h1 className="text-base font-bold text-slate-100">
                  {MODULE_TITLES[activeModule]}
                </h1>
                {currentNavItem && (
                  <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">
                    {currentNavItem.description}
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-600 hidden sm:block">
                {MODULE_DESCRIPTIONS[activeModule]}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-slate-400 hover:text-amber-400 hover:bg-slate-800/50 h-8 px-2.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline ml-1.5 text-xs">刷新</span>
            </Button>

            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-slate-500">系统运行正常</span>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeModule}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="h-full"
            >
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Bottom bar (mobile) - Quick access to top modules */}
        <nav className="lg:hidden flex-shrink-0 bg-[#0d0f15]/90 backdrop-blur-xl border-t border-slate-800/60">
          <div className="flex items-center justify-around px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            {[
              { id: 'dashboard', icon: LayoutDashboard, label: '看板' },
              { id: 'users', icon: Users, label: '用户' },
              { id: 'heroes', icon: Sword, label: '武将' },
              { id: 'activity', icon: Flame, label: '活动' },
              { id: 'payment', icon: CreditCard, label: '支付' },
            ].map((item) => {
              const isActive = activeModule === item.id
              const Icon = item.icon
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className="relative flex flex-col items-center justify-center py-1.5 px-2 min-w-[48px] rounded-lg transition-all"
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                  <span className={`text-[10px] mt-0.5 transition-colors ${isActive ? 'text-amber-400 font-medium' : 'text-slate-500'}`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-nav-indicator"
                      className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-amber-500 rounded-full"
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
