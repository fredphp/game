'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, formatNumber, formatStaminaTimer } from '@/stores/game-store'
import {
  ChevronRight, ChevronLeft, Zap, Coins, Gem, Crown, Swords, Map, Users,
  Gift, CalendarDays, Bell, Castle, Shield, Scroll
} from 'lucide-react'

const announcements = [
  '🔥 新版本「天下大势」已上线！SSR吕布限时UP池开放',
  '🎉 累计签到7天送SSR自选券，快来参与！',
  '⚔️ 跨服争霸赛季开启，丰厚奖励等你来拿',
  '📢 服务器将于今晚22:00-23:00进行维护更新',
]

const quickActions = [
  { id: 'quest', label: '任务', icon: Scroll, color: 'from-amber-500 to-amber-700', badge: '!' },
  { id: 'daily_sign', label: '签到', icon: CalendarDays, color: 'from-green-500 to-green-700', badge: '!' },
  { id: 'activity', label: '活动', icon: Gift, color: 'from-red-500 to-red-700', badge: '' },
  { id: 'guild', label: '联盟', icon: Users, color: 'from-sky-500 to-sky-700', badge: '' },
  { id: 'battle', label: '战斗', icon: Swords, color: 'from-orange-500 to-red-600', badge: '3' },
  { id: 'map', label: '地图', icon: Map, color: 'from-emerald-500 to-teal-700', badge: '' },
]

export default function MainCity() {
  const { player, buildings, showBuildingInfo, setShowBuildingInfo, upgradeBuilding,
    staminaTimer, tickStamina, setView, showNotification } = useGameStore()
  const scrollRef = useRef<HTMLDivElement>(null)
  const [scrollPos, setScrollPos] = useState(0)
  const [bannerIdx, setBannerIdx] = useState(0)
  const bannerBgs = [
    'from-red-900/80 via-red-800/60 to-transparent',
    'from-amber-900/80 via-amber-800/60 to-transparent',
    'from-emerald-900/80 via-emerald-800/60 to-transparent',
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      tickStamina()
    }, 1000)
    return () => clearInterval(interval)
  }, [tickStamina])

  useEffect(() => {
    const interval = setInterval(() => {
      setBannerIdx((i) => (i + 1) % bannerBgs.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const staminaPercent = (player.stamina / player.maxStamina) * 100

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Announcement Banner */}
      <div className="relative h-8 bg-gradient-to-r from-red-900/90 via-red-800/80 to-red-900/90 flex items-center px-2 overflow-hidden flex-shrink-0">
        <Bell className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mr-2 animate-pulse" />
        <div className="overflow-hidden flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={bannerIdx}
              initial={{ x: 200, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -200, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="text-xs text-amber-100 whitespace-nowrap"
            >
              {announcements[bannerIdx]}
            </motion.div>
          </AnimatePresence>
        </div>
        <span className="ml-2 px-1.5 py-0.5 bg-red-500 rounded text-[10px] text-white font-bold flex-shrink-0">NEW</span>
      </div>

      {/* City Scene Banner */}
      <div className="relative h-36 flex-shrink-0 overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-b ${bannerBgs[bannerIdx]} transition-all duration-700`} />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center z-10">
            <div className="text-2xl font-bold text-amber-200 drop-shadow-lg tracking-wider">九 州 争 鼎</div>
            <div className="text-xs text-amber-300/80 mt-1 tracking-widest">天下大势 · 合久必分 · 分久必合</div>
          </div>
        </div>
        {/* Decorative corners */}
        <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-500/50 rounded-tl-sm" />
        <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-500/50 rounded-tr-sm" />
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0f0f1a] to-transparent" />
      </div>

      {/* Building Queue */}
      <div className="mx-3 mt-2 p-2 bg-gradient-to-r from-slate-800/80 to-slate-900/80 rounded-lg border border-slate-700/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Castle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-300">建造队列</span>
          </div>
          <button
            onClick={() => showNotification('全部加速完成！')}
            className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 transition-colors"
          >
            全部加速
          </button>
        </div>
        <div className="flex gap-2">
          {buildings.filter(b => b.upgrading).map(b => (
            <BuildingQueueSlot key={b.id} building={b} />
          ))}
          {buildings.filter(b => b.upgrading).length === 0 && (
            <div className="text-xs text-slate-500">暂无建造中的建筑</div>
          )}
        </div>
      </div>

      {/* Buildings Grid */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2">
        <div className="grid grid-cols-3 gap-2">
          {buildings.map((building) => (
            <motion.button
              key={building.id}
              id={`building-${building.id}`}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowBuildingInfo(building.id)}
              className="relative p-2 bg-gradient-to-b from-slate-800/90 to-slate-900/90 rounded-xl border border-slate-700/50 hover:border-amber-500/50 transition-all group"
            >
              <div className="text-2xl mb-1">{building.icon}</div>
              <div className="text-xs font-medium text-slate-200 truncate">{building.name}</div>
              <div className="text-[10px] text-amber-400 mt-0.5">Lv.{building.level}</div>
              {/* Level Progress */}
              <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                  style={{ width: `${(building.level / building.maxLevel) * 100}%` }}
                />
              </div>
              {/* Upgrade indicator */}
              {building.upgrading && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <Zap className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mx-3 mb-2 p-2 bg-slate-900/80 rounded-lg border border-slate-700/40 flex-shrink-0">
        <div className="grid grid-cols-6 gap-1.5">
          {quickActions.map((action) => (
            <button
              key={action.id}
              id={action.id === 'guild' ? 'btn-guild' : undefined}
              onClick={() => {
                if (action.id === 'battle') setView('battle')
                if (action.id === 'quest') showNotification('任务面板打开')
              }}
              className="flex flex-col items-center gap-0.5 p-1 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <div className="relative">
                <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg`}>
                  <action.icon className="w-4 h-4 text-white" />
                </div>
                {action.badge && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-[8px] text-white font-bold">{action.badge}</span>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-slate-400">{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Building Info Modal */}
      <AnimatePresence>
        {showBuildingInfo && (
          <BuildingInfoModal />
        )}
      </AnimatePresence>
    </div>
  )
}

function BuildingQueueSlot({ building }: { building: ReturnType<typeof useGameStore.getState>['buildings'][0] }) {
  const [time, setTime] = useState(building.remainingSeconds)

  useEffect(() => {
    const interval = setInterval(() => {
      setTime((t) => Math.max(0, t - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const h = Math.floor(time / 3600)
  const m = Math.floor((time % 3600) / 60)
  const s = time % 60

  return (
    <div className="flex-1 p-1.5 bg-slate-800/60 rounded-lg border border-green-500/30">
      <div className="text-[10px] text-green-300 flex items-center gap-1">
        <span>{building.icon}</span>
        <span className="truncate">{building.name}</span>
        <span className="text-green-400">Lv.{building.level + 1}</span>
      </div>
      <div className="text-[10px] text-amber-400 mt-0.5 font-mono">
        {h > 0 ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}` : `${m}:${s.toString().padStart(2, '0')}`}
      </div>
    </div>
  )
}

function BuildingInfoModal() {
  const { showBuildingInfo, buildings, setShowBuildingInfo, upgradeBuilding, player, showNotification } = useGameStore()
  const building = buildings.find(b => b.id === showBuildingInfo)
  if (!building) return null

  const upgradeCost = building.level * 500
  const canUpgrade = player.gold >= upgradeCost && !building.upgrading

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60"
      onClick={() => setShowBuildingInfo(null)}
    >
      <motion.div
        initial={{ y: 300 }}
        animate={{ y: 0 }}
        exit={{ y: 300 }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-2xl border-t border-amber-500/50 p-5"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500/20 to-amber-700/20 rounded-xl flex items-center justify-center text-3xl border border-amber-500/30">
            {building.icon}
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-200">{building.name}</h3>
            <p className="text-sm text-slate-400">Lv.{building.level} / {building.maxLevel}</p>
          </div>
          {building.upgrading && (
            <div className="ml-auto px-2 py-1 bg-green-500/20 rounded-lg">
              <span className="text-xs text-green-400 flex items-center gap-1">
                <Zap className="w-3 h-3" />建造中
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-slate-300 mb-4">{building.description}</p>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-2.5 bg-slate-800/80 rounded-lg">
            <div className="text-xs text-slate-500">当前等级</div>
            <div className="text-lg font-bold text-amber-300">Lv.{building.level}</div>
          </div>
          <div className="p-2.5 bg-slate-800/80 rounded-lg">
            <div className="text-xs text-slate-500">升级费用</div>
            <div className="text-lg font-bold text-amber-300 flex items-center gap-1">
              <Coins className="w-4 h-4" />{formatNumber(upgradeCost)}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowBuildingInfo(null)}
            className="flex-1 py-2.5 bg-slate-700 rounded-xl text-sm text-slate-300 hover:bg-slate-600 transition-colors"
          >
            关闭
          </button>
          <button
            onClick={() => {
              if (canUpgrade) {
                upgradeBuilding(building.id)
                showNotification(`${building.name}升级到 Lv.${building.level + 1}！`)
                setShowBuildingInfo(null)
              }
            }}
            disabled={!canUpgrade}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              canUpgrade
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/30'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {building.upgrading ? '建造中...' : '升级'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
