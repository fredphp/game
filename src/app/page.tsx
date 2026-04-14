'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Home, Swords, Sparkles, Users, ShoppingBag, Menu,
  Coins, Gem, Zap, Crown, Settings, HelpCircle, MessageSquare, Star, Bell
} from 'lucide-react'
import { useGameStore, formatNumber, formatStaminaTimer } from '@/stores/game-store'
import MainCity from '@/components/game/MainCity'
import GachaPanel from '@/components/game/GachaPanel'
import HeroesPanel from '@/components/game/HeroesPanel'
import BattlePanel from '@/components/game/BattlePanel'
import ShopPanel from '@/components/game/ShopPanel'
import TutorialOverlay from '@/components/game/TutorialOverlay'

type GameView = 'main-city' | 'gacha' | 'heroes' | 'battle' | 'shop' | 'more'

const navItems: { id: GameView; label: string; icon: typeof Home; badge?: string }[] = [
  { id: 'main-city', label: '主城', icon: Home },
  { id: 'gacha', label: '招募', icon: Sparkles, badge: 'NEW' },
  { id: 'heroes', label: '武将', icon: Users },
  { id: 'battle', label: '战斗', icon: Swords },
  { id: 'shop', label: '商城', icon: ShoppingBag, badge: '优惠' },
  { id: 'more', label: '更多', icon: Menu },
]

const panelComponents: Record<GameView, React.ComponentType> = {
  'main-city': MainCity,
  'gacha': GachaPanel,
  'heroes': HeroesPanel,
  'battle': BattlePanel,
  'shop': ShopPanel,
  'more': MorePanel,
}

export default function GameClient() {
  const {
    currentView, setView, player, staminaTimer, tickStamina,
    notification, tutorialActive, startTutorial, tutorialCompleted,
  } = useGameStore()

  // Stamina regen timer
  useEffect(() => {
    const interval = setInterval(tickStamina, 1000)
    return () => clearInterval(interval)
  }, [tickStamina])

  // Show tutorial on first visit
  useEffect(() => {
    if (!tutorialCompleted && !tutorialActive) {
      const timer = setTimeout(() => startTutorial(), 1500)
      return () => clearTimeout(timer)
    }
  }, [tutorialCompleted, tutorialActive, startTutorial])

  const ActivePanel = panelComponents[currentView]

  const staminaPercent = (player.stamina / player.maxStamina) * 100

  return (
    <div className="h-screen w-full flex flex-col bg-[#0a0a14] text-white overflow-hidden select-none">
      {/* Top Resource Bar */}
      <header className="flex-shrink-0 bg-gradient-to-b from-[#12122a] to-[#0a0a14] border-b border-slate-800/50">
        <div className="flex items-center justify-between px-3 py-2">
          {/* Player Info */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/30 to-amber-700/30 border border-amber-500/40 overflow-hidden flex-shrink-0">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-400/10 to-transparent" />
              <div className="flex items-center justify-center h-full text-lg">👑</div>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-amber-200 truncate">{player.name}</span>
                <span className="px-1 py-0 bg-gradient-to-r from-amber-500 to-amber-600 rounded text-[8px] text-white font-bold flex-shrink-0">
                  VIP{player.vipLevel}
                </span>
              </div>
              <span className="text-[10px] text-slate-400">Lv.{player.level}</span>
            </div>
          </div>

          {/* Resources */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Gold */}
            <button className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 rounded-lg hover:bg-slate-700/80 transition-colors">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] font-medium text-amber-200">{formatNumber(player.gold)}</span>
            </button>

            {/* Diamonds */}
            <button onClick={() => setView('shop')} className="flex items-center gap-1 px-2 py-1 bg-slate-800/80 rounded-lg hover:bg-slate-700/80 transition-colors">
              <Gem className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px] font-medium text-sky-200">{formatNumber(player.diamonds)}</span>
            </button>

            {/* Stamina */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-800/80 rounded-lg">
              <Zap className="w-3.5 h-3.5 text-green-400" />
              <span className="text-[11px] font-medium text-green-200">{player.stamina}/{player.maxStamina}</span>
              {player.stamina < player.maxStamina && (
                <span className="text-[9px] text-slate-500">{formatStaminaTimer(staminaTimer)}</span>
              )}
            </div>

            {/* Power */}
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-800/80 rounded-lg">
              <Star className="w-3.5 h-3.5 text-red-400" />
              <span className="text-[11px] font-medium text-red-200">{formatNumber(player.power)}</span>
            </div>

            {/* Notification bell */}
            <button className="relative p-1.5 bg-slate-800/80 rounded-lg hover:bg-slate-700/80 transition-colors">
              <Bell className="w-4 h-4 text-slate-400" />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#12122a]" />
            </button>
          </div>
        </div>

        {/* Mobile stamina bar */}
        <div className="sm:hidden px-3 pb-1.5">
          <div className="flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-green-400 flex-shrink-0" />
            <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                animate={{ width: `${staminaPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-[9px] text-slate-500 flex-shrink-0">
              {player.stamina}/{player.maxStamina}
              {player.stamina < player.maxStamina && ` ${formatStaminaTimer(staminaTimer)}`}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <ActivePanel />
          </motion.div>
        </AnimatePresence>

        {/* Tutorial Overlay */}
        <TutorialOverlay />
      </main>

      {/* Bottom Navigation */}
      <nav className="flex-shrink-0 bg-gradient-to-t from-[#0a0a14] via-[#12122a] to-[#12122a] border-t border-slate-800/50">
        <div className="flex items-center justify-around px-1 pt-1 pb-1">
          {navItems.map((item) => {
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                id={item.id === 'gacha' ? 'nav-gacha' : item.id === 'battle' ? 'nav-battle' : undefined}
                onClick={() => setView(item.id)}
                className="relative flex flex-col items-center justify-center py-1.5 px-2 min-w-[52px] rounded-lg transition-all"
              >
                <div className="relative">
                  <item.icon className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-amber-400' : 'text-slate-500'
                  }`} />
                  {item.badge && (
                    <span className="absolute -top-1.5 -right-3 px-1 py-0 bg-red-500 rounded text-[7px] text-white font-bold leading-none">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] mt-0.5 transition-colors ${
                  isActive ? 'text-amber-400 font-medium' : 'text-slate-500'
                }`}>
                  {item.label}
                </span>
                {/* Active indicator */}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-amber-400 rounded-full"
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Safe area spacer for mobile */}
        <div className="h-safe-area-inset-bottom" />
      </nav>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 bg-slate-800/95 backdrop-blur rounded-xl border border-amber-500/30 shadow-xl"
          >
            <span className="text-sm text-amber-200">{notification}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ==================== More Panel ====================
function MorePanel() {
  const { showNotification, setView, startTutorial, tutorialCompleted } = useGameStore()
  const menuItems = [
    { label: '设置', icon: Settings, color: 'from-slate-500 to-slate-700', action: () => showNotification('设置面板开发中') },
    { label: '帮助与反馈', icon: HelpCircle, color: 'from-sky-500 to-sky-700', action: () => showNotification('帮助面板开发中') },
    { label: '社区', icon: MessageSquare, color: 'from-purple-500 to-purple-700', action: () => showNotification('社区功能开发中') },
    { label: '排行榜', icon: Star, color: 'from-amber-500 to-amber-700', action: () => showNotification('排行榜开发中') },
    { label: '客服', icon: MessageSquare, color: 'from-green-500 to-green-700', action: () => showNotification('客服功能开发中') },
    { label: '重玩新手引导', icon: HelpCircle, color: 'from-red-500 to-red-700', action: () => startTutorial() },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="mx-3 mt-3 p-4 bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-slate-700/40 flex-shrink-0">
        <div className="text-center mb-4">
          <div className="text-3xl mb-1">🏯</div>
          <div className="text-sm text-slate-300">九州争鼎 v2.1.0</div>
          <div className="text-xs text-slate-500 mt-0.5">天下大势 · 合久必分</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2">
        <div className="flex flex-col gap-1.5">
          {menuItems.map((item, i) => (
            <motion.button
              key={item.label}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={item.action}
              className="flex items-center gap-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/30 hover:border-amber-500/20 transition-colors"
            >
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center`}>
                <item.icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-slate-300">{item.label}</span>
              <div className="ml-auto text-slate-600">›</div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}
