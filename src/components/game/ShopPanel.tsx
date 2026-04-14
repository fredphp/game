'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, formatNumber } from '@/stores/game-store'
import {
  Gem, Coins, Crown, Gift, Shield, TrendingUp, Clock,
  ChevronRight, Sparkles, Star, Tag, HelpCircle, Ticket, Zap
} from 'lucide-react'

const shopTabs = [
  { id: 'recharge' as const, label: '充值', icon: Gem },
  { id: 'monthly' as const, label: '月卡', icon: Crown },
  { id: 'gift' as const, label: '礼包', icon: Gift },
  { id: 'battlepass' as const, label: '战令', icon: Shield },
  { id: 'fund' as const, label: '基金', icon: TrendingUp },
]

const banners = [
  { text: '新版本庆典·累充送SSR', sub: '活动时间：即日起至月底', color: 'from-red-600 to-red-800' },
  { text: '月卡限时特惠·双倍返还', sub: '首购即享超值奖励', color: 'from-amber-600 to-amber-800' },
  { text: '新手七日礼包·限时开放', sub: '每日登录领取钻石', color: 'from-purple-600 to-purple-800' },
]

export default function ShopPanel() {
  const { shopItems, player, showShopConfirm, setShowShopConfirm, purchaseItem, showNotification } = useGameStore()
  const [activeTab, setActiveTab] = useState<string>('recharge')
  const [bannerIdx, setBannerIdx] = useState(0)
  const [countdowns, setCountdowns] = useState<Record<string, number>>({})

  // Banner rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setBannerIdx((i) => (i + 1) % banners.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  // Countdown timer for limited items
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdowns((prev) => {
        const next = { ...prev }
        for (const item of shopItems) {
          if (item.duration) {
            const current = next[item.id] ?? item.duration
            next[item.id] = Math.max(0, current - 1)
          }
        }
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [shopItems])

  const filteredItems = useMemo(() => {
    if (activeTab === 'recharge') return shopItems.filter(i => i.type === 'recharge' || i.type === 'monthly' || i.type === 'fund')
    if (activeTab === 'monthly') return shopItems.filter(i => i.type === 'monthly')
    if (activeTab === 'gift') return shopItems.filter(i => i.type === 'gift')
    if (activeTab === 'battlepass') return shopItems.filter(i => i.type === 'battlepass')
    if (activeTab === 'fund') return shopItems.filter(i => i.type === 'fund')
    return shopItems
  }, [activeTab, shopItems])

  const currentBanner = banners[bannerIdx]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Banner */}
      <div className="relative h-36 flex-shrink-0 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={bannerIdx}
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -100, opacity: 0 }}
            transition={{ duration: 0.4 }}
            className={`absolute inset-0 bg-gradient-to-br ${currentBanner.color}`}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-lg font-bold text-white drop-shadow-lg tracking-wider">{currentBanner.text}</div>
              <div className="text-xs text-white/70 mt-1">{currentBanner.sub}</div>
            </div>
            {/* Decorative */}
            <div className="absolute top-3 left-3 w-16 h-16 border border-white/10 rounded-full" />
            <div className="absolute bottom-3 right-3 w-24 h-24 border border-white/10 rounded-full" />
          </motion.div>
        </AnimatePresence>
        {/* Dots */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((_, i) => (
            <div key={i} className={`h-1 rounded-full transition-all ${i === bannerIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`} />
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 p-1 mx-3 mt-2 bg-slate-800/80 rounded-lg flex-shrink-0">
        {shopTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-xs transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Items List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2">
        <div className="grid grid-cols-1 gap-2">
          {filteredItems.map((item) => (
            <ShopItemCard
              key={item.id}
              item={item}
              countdown={countdowns[item.id]}
              onBuy={() => setShowShopConfirm(item)}
            />
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex gap-2 mx-3 mb-2 flex-shrink-0">
        <button
          onClick={() => showNotification('兑换码功能开发中')}
          className="flex-1 py-2.5 bg-slate-800 rounded-xl text-xs text-slate-400 hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
        >
          <Ticket className="w-3.5 h-3.5" />
          兑换码
        </button>
        <button
          onClick={() => showNotification('充值帮助')}
          className="flex-1 py-2.5 bg-slate-800 rounded-xl text-xs text-slate-400 hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          充值帮助
        </button>
      </div>

      {/* Purchase Confirm Dialog */}
      <AnimatePresence>
        {showShopConfirm && <PurchaseConfirmDialog />}
      </AnimatePresence>
    </div>
  )
}

function ShopItemCard({ item, countdown, onBuy }: {
  item: ReturnType<typeof useGameStore.getState>['shopItems'][0]
  countdown?: number
  onBuy: () => void
}) {
  const priceLabel = item.price === 0 ? '免费' : item.currency === 'cny' ? `¥${item.price}` : `${item.price}💎`
  const hasCountdown = item.duration && countdown !== undefined

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={onBuy}
      className={`relative p-3 bg-gradient-to-r from-slate-800/90 to-slate-900/90 rounded-xl border border-slate-700/40 hover:border-amber-500/30 transition-all cursor-pointer ${
        item.price === 0 ? 'border-green-500/40' : ''
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${
          item.type === 'recharge' ? 'from-red-500/20 to-red-700/20 border-red-500/30' :
          item.type === 'monthly' ? 'from-amber-500/20 to-amber-700/20 border-amber-500/30' :
          item.type === 'gift' ? 'from-purple-500/20 to-purple-700/20 border-purple-500/30' :
          item.type === 'battlepass' ? 'from-emerald-500/20 to-emerald-700/20 border-emerald-500/30' :
          'from-sky-500/20 to-sky-700/20 border-sky-500/30'
        } border flex items-center justify-center text-2xl flex-shrink-0`}>
          {item.type === 'recharge' ? '💎' :
           item.type === 'monthly' ? '👑' :
           item.type === 'gift' ? '🎁' :
           item.type === 'battlepass' ? '🛡️' : '📈'}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-slate-200 truncate">{item.name}</span>
            {item.badge && (
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: item.badgeColor || '#6B7280' }}
              >
                {item.badge}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5 truncate">{item.description}</p>
          {hasCountdown && (
            <div className="flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-red-400" />
              <span className="text-[10px] text-red-400 font-mono">
                {countdown! >= 86400
                  ? `${Math.floor(countdown! / 86400)}天${Math.floor((countdown! % 86400) / 3600)}时`
                  : `${Math.floor(countdown! / 3600).toString().padStart(2, '0')}:${Math.floor((countdown! % 3600) / 60).toString().padStart(2, '0')}:${(countdown! % 60).toString().padStart(2, '0')}`}
              </span>
            </div>
          )}
        </div>

        {/* Price & Buy */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-1">
            {item.originalPrice && (
              <span className="text-xs text-slate-500 line-through">¥{item.originalPrice}</span>
            )}
            <span className={`text-sm font-bold ${item.price === 0 ? 'text-green-400' : item.currency === 'cny' ? 'text-amber-400' : 'text-sky-400'}`}>
              {priceLabel}
            </span>
          </div>
          <div className={`px-3 py-1 rounded-lg text-[10px] font-medium transition-colors ${
            item.price === 0
              ? 'bg-green-500 text-white'
              : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
          }`}>
            {item.price === 0 ? '免费领取' : '购买'}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function PurchaseConfirmDialog() {
  const { showShopConfirm, setShowShopConfirm, purchaseItem, player } = useGameStore()
  if (!showShopConfirm) return null

  const item = showShopConfirm
  const canAfford = item.currency === 'cny' || item.price === 0 || player.diamonds >= item.price
  const priceLabel = item.price === 0 ? '免费' : item.currency === 'cny' ? `¥${item.price}` : `${item.price}💎`

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={() => setShowShopConfirm(null)}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-amber-500/30 overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-slate-700/50">
          <h3 className="text-lg font-bold text-amber-200">确认购买</h3>
        </div>

        {/* Item Info */}
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-amber-700/20 rounded-xl border border-amber-500/30 flex items-center justify-center text-3xl">
              {item.type === 'recharge' ? '💎' : item.type === 'gift' ? '🎁' : item.type === 'battlepass' ? '🛡️' : '👑'}
            </div>
            <div>
              <div className="text-base font-medium text-slate-200">{item.name}</div>
              <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
            </div>
          </div>

          {/* Price */}
          <div className="p-3 bg-slate-800/80 rounded-lg flex items-center justify-between mb-4">
            <span className="text-sm text-slate-400">价格</span>
            <span className={`text-lg font-bold ${item.price === 0 ? 'text-green-400' : 'text-amber-400'}`}>{priceLabel}</span>
          </div>

          {/* Balance info */}
          {item.currency === 'diamond' && (
            <div className="text-xs text-slate-500 mb-3">
              当前钻石: {player.diamonds} {player.diamonds < item.price && '(余额不足)'}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 bg-slate-900/50 border-t border-slate-700/30">
          <button
            onClick={() => setShowShopConfirm(null)}
            className="flex-1 py-2.5 bg-slate-700 rounded-xl text-sm text-slate-300 hover:bg-slate-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={() => purchaseItem(item.id)}
            disabled={!canAfford}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all ${
              canAfford
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white hover:from-amber-400 hover:to-amber-500 shadow-lg shadow-amber-500/30'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            确认购买
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
