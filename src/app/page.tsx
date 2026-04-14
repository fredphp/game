'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Flame, Shield, Sparkles, Mail,
  Menu, X, ChevronLeft, Gamepad2, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import OpsDashboard from '@/components/ops/OpsDashboard'
import OpsActivity from '@/components/ops/OpsActivity'
import OpsBattlePass from '@/components/ops/OpsBattlePass'
import OpsLimitedPool from '@/components/ops/OpsLimitedPool'
import OpsMail from '@/components/ops/OpsMail'

type Module = 'dashboard' | 'activity' | 'battlepass' | 'limitedpool' | 'mail'

interface NavItem {
  id: Module
  label: string
  icon: typeof LayoutDashboard
  color: string
  description: string
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: '运营总览', icon: LayoutDashboard, color: 'text-slate-300', description: '数据总览' },
  { id: 'activity', label: '活动系统', icon: Flame, color: 'text-amber-400', description: '运营活动' },
  { id: 'battlepass', label: '战令系统', icon: Shield, color: 'text-emerald-400', description: '赛季管理' },
  { id: 'limitedpool', label: '限时卡池', icon: Sparkles, color: 'text-violet-400', description: '卡池配置' },
  { id: 'mail', label: '邮件系统', icon: Mail, color: 'text-sky-400', description: '邮件管理' },
]

const MODULE_TITLES: Record<Module, string> = {
  dashboard: '运营总览',
  activity: '活动管理',
  battlepass: '战令管理',
  limitedpool: '限时卡池',
  mail: '邮件管理',
}

const MODULE_DESCRIPTIONS: Record<Module, string> = {
  dashboard: '九州争鼎 · 游戏运营管理中心',
  activity: '创建和管理游戏运营活动',
  battlepass: '赛季战令配置与数据监控',
  limitedpool: '限定卡池概率与开放管理',
  mail: '系统邮件发送与管理',
}

export default function OpsPage() {
  const [activeModule, setActiveModule] = useState<Module>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const handleNavigate = useCallback((module: string) => {
    setActiveModule(module as Module)
    setSidebarOpen(false)
  }, [])

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <OpsDashboard onNavigate={handleNavigate} />
      case 'activity':
        return <OpsActivity key={refreshKey} />
      case 'battlepass':
        return <OpsBattlePass key={refreshKey} />
      case 'limitedpool':
        return <OpsLimitedPool key={refreshKey} />
      case 'mail':
        return <OpsMail key={refreshKey} />
    }
  }

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
              <div className="text-[10px] text-slate-500">运营管理系统 v1.0</div>
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
        <nav className="flex-1 overflow-y-auto py-3 px-3 scrollbar-thin">
          <div className="text-[10px] font-medium text-slate-600 uppercase tracking-wider px-3 mb-2">
            运营模块
          </div>
          <div className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const isActive = activeModule === item.id
              const Icon = item.icon
              return (
                <motion.button
                  key={item.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleNavigate(item.id)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-200 relative overflow-hidden
                    ${isActive
                      ? 'bg-gradient-to-r from-amber-500/15 to-amber-600/5 text-amber-100 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }
                  `}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-amber-500 rounded-r-full"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                    />
                  )}

                  <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'text-amber-400' : item.color}`} />
                  <div className="text-left min-w-0">
                    <div className="truncate">{item.label}</div>
                    <div className={`text-[10px] ${isActive ? 'text-amber-500/60' : 'text-slate-600'}`}>
                      {item.description}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
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
                <span className="hidden sm:inline text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">
                  {NAV_ITEMS.find((n) => n.id === activeModule)?.description}
                </span>
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

        {/* Bottom bar (mobile) */}
        <nav className="lg:hidden flex-shrink-0 bg-[#0d0f15]/90 backdrop-blur-xl border-t border-slate-800/60">
          <div className="flex items-center justify-around px-1 pt-1 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            {NAV_ITEMS.map((item) => {
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
                    {item.label.slice(0, 2)}
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
