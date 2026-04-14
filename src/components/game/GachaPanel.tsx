'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, getRarityColor, getRarityLabel, getRarityBg, getElementIcon, getPoolBadge, formatNumber } from '@/stores/game-store'
import { Sparkles, Gem, Swords, SkipForward, X, Clock, Star, Trophy, Filter } from 'lucide-react'

export default function GachaPanel() {
  const {
    cardPools, selectedPool, setSelectedPool,
    player, performGacha, isGachaAnimating,
    pityCounter, gachaResults, showGachaResult, setShowGachaResult,
    gachaHistory, setView
  } = useGameStore()

  const [poolIdx, setPoolIdx] = useState(0)
  const [showHistory, setShowHistory] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<'all' | 'ssr' | 'sr' | 'r'>('all')

  useEffect(() => {
    if (cardPools.length > 0) {
      setSelectedPool(cardPools[poolIdx])
    }
  }, [poolIdx, cardPools, setSelectedPool])

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return gachaHistory
    const rarityMap = { ssr: 5, sr: 4, r: 3 } as const
    return gachaHistory.filter(c => c.rarity === rarityMap[historyFilter])
  }, [gachaHistory, historyFilter])

  const badge = getPoolBadge(selectedPool.type)

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Pool Banner Carousel */}
      <div className="relative flex-shrink-0">
        <div className="relative h-44 overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          {/* Banner BG */}
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedPool.id}
              initial={{ scale: 1.1, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="absolute inset-0 bg-gradient-to-br from-red-900/40 via-amber-900/30 to-slate-900"
            />
          </AnimatePresence>

          {/* Decorative elements */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-4 left-4 w-20 h-20 border border-amber-400 rounded-full" />
            <div className="absolute bottom-4 right-4 w-32 h-32 border border-red-400 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-amber-300/20 rounded-full" />
          </div>

          {/* Pool Info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 ${badge.color} text-white text-[10px] font-bold rounded`}>
                {badge.label}
              </span>
              <h2 className="text-xl font-bold text-amber-200 tracking-wider">{selectedPool.displayName}</h2>
            </div>
            <p className="text-xs text-slate-300">{selectedPool.description}</p>
          </div>

          {/* Nav arrows */}
          <button
            onClick={() => setPoolIdx((i) => (i - 1 + cardPools.length) % cardPools.length)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 backdrop-blur rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <span className="text-white text-sm">‹</span>
          </button>
          <button
            onClick={() => setPoolIdx((i) => (i + 1) % cardPools.length)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 bg-black/40 backdrop-blur rounded-full flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <span className="text-white text-sm">›</span>
          </button>
        </div>

        {/* Dots */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {cardPools.map((_, i) => (
            <div
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${i === poolIdx ? 'w-5 bg-amber-400' : 'w-1.5 bg-white/40'}`}
            />
          ))}
        </div>
      </div>

      {/* Pity Progress */}
      <div className="mx-3 mt-2 p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/50 flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-slate-300">SSR保底进度</span>
          </div>
          <span className="text-xs font-mono text-amber-400">{pityCounter}/80</span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden relative">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{
              width: `${(pityCounter / 80) * 100}%`,
              background: pityCounter >= 70
                ? 'linear-gradient(90deg, #DC2626, #EF4444)'
                : pityCounter >= 50
                  ? 'linear-gradient(90deg, #D97706, #F59E0B)'
                  : 'linear-gradient(90deg, #16A34A, #22C55E)',
            }}
            transition={{ duration: 0.5 }}
          />
          {/* Markers */}
          <div className="absolute top-0 left-[62.5%] w-px h-full bg-amber-400/40" />
          <div className="absolute top-0 right-0 w-px h-full bg-red-400/40" />
        </div>
        <div className="flex justify-between mt-0.5">
          <span className="text-[9px] text-slate-500">50抽小保底</span>
          <span className="text-[9px] text-slate-500">80抽必出SSR</span>
        </div>
      </div>

      {/* Gacha Buttons */}
      <div className="mx-3 mt-3 grid grid-cols-2 gap-2 flex-shrink-0">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => performGacha(1)}
          disabled={isGachaAnimating || player.diamonds < 150}
          className="py-3 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl font-medium text-sm text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>单抽 ×1</span>
          </div>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <Gem className="w-3 h-3 text-amber-200" />
            <span className="text-xs text-amber-200">150</span>
          </div>
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => performGacha(10)}
          disabled={isGachaAnimating || player.diamonds < 1350}
          className="py-3 bg-gradient-to-br from-red-500 to-red-700 rounded-xl font-medium text-sm text-white shadow-lg shadow-red-500/20 hover:shadow-red-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-center gap-1.5">
            <Swords className="w-4 h-4" />
            <span>十连 ×10</span>
          </div>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <Gem className="w-3 h-3 text-red-200" />
            <span className="text-xs text-red-200">1350</span>
          </div>
        </motion.button>
      </div>

      {/* History Toggle */}
      <div className="mx-3 mt-2 flex-shrink-0">
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-300 transition-colors"
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>抽卡记录 ({gachaHistory.length})</span>
          <Filter className="w-3 h-3" />
        </button>
      </div>

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mx-3 mt-1 overflow-hidden flex-shrink-0"
          >
            <div className="p-2 bg-slate-800/80 rounded-lg border border-slate-700/50 max-h-40 overflow-y-auto scrollbar-thin">
              <div className="flex gap-1 mb-2">
                {(['all', 'ssr', 'sr', 'r'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setHistoryFilter(f)}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors ${
                      historyFilter === f
                        ? 'bg-amber-500 text-white'
                        : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                    }`}
                  >
                    {f === 'all' ? '全部' : f.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1">
                {filteredHistory.slice(0, 50).map((card, i) => (
                  <div key={`${card.id}-${i}`} className={`px-1.5 py-0.5 rounded text-[10px] ${getRarityColor(card.rarity)} bg-slate-700/60`}>
                    {getRarityLabel(card.rarity)} {card.name} {card.isNew ? '🆕' : ''}
                  </div>
                ))}
                {filteredHistory.length === 0 && (
                  <div className="text-xs text-slate-500">暂无记录</div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gacha Result Overlay */}
      <AnimatePresence>
        {showGachaResult && gachaResults.length > 0 && <GachaResultOverlay />}
      </AnimatePresence>

      {/* Gacha Animation Overlay */}
      <AnimatePresence>
        {isGachaAnimating && <GachaAnimationOverlay />}
      </AnimatePresence>
    </div>
  )
}

function GachaAnimationOverlay() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/80 overflow-hidden"
    >
      {/* Particles */}
      <motion.div
        animate={{ rotate: 360, scale: [1, 1.5, 1] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute w-32 h-32 rounded-full border-2 border-amber-400/30"
      />
      <motion.div
        animate={{ rotate: -360, scale: [1.5, 1, 1.5] }}
        transition={{ repeat: Infinity, duration: 3 }}
        className="absolute w-48 h-48 rounded-full border border-purple-400/20"
      />
      <motion.div
        animate={{ rotate: 360, scale: [1, 2, 1] }}
        transition={{ repeat: Infinity, duration: 2.5 }}
        className="absolute w-64 h-64 rounded-full border border-red-400/10"
      />

      {/* Central card */}
      <motion.div
        animate={{
          rotateY: [0, 180, 360],
          scale: [0.5, 1.2, 0.8],
        }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="relative w-24 h-32 rounded-xl bg-gradient-to-br from-amber-600 to-amber-900 border-2 border-amber-400 shadow-2xl shadow-amber-500/50 flex items-center justify-center"
      >
        <span className="text-3xl">🐉</span>
      </motion.div>

      {/* Flash effects */}
      <motion.div
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 0.5 }}
        className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-400/20 to-transparent"
      />
    </motion.div>
  )
}

function GachaResultOverlay() {
  const { gachaResults, setShowGachaResult } = useGameStore()
  const [revealedCount, setRevealedCount] = useState(0)
  const hasSSR = gachaResults.some(c => c.rarity === 5)
  const hasSR = gachaResults.some(c => c.rarity === 4)

  const ssrCount = gachaResults.filter(c => c.rarity === 5).length
  const srCount = gachaResults.filter(c => c.rarity === 4).length
  const rCount = gachaResults.filter(c => c.rarity === 3).length

  useEffect(() => {
    const interval = setInterval(() => {
      setRevealedCount((c) => {
        if (c >= gachaResults.length) {
          clearInterval(interval)
          return c
        }
        return c + 1
      })
    }, gachaResults.length > 1 ? 200 : 0)
    return () => clearInterval(interval)
  }, [gachaResults.length])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 flex flex-col bg-black/90 overflow-y-auto"
    >
      {/* Background effects */}
      {hasSSR && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.5, 0.3] }}
          className="absolute inset-0 bg-gradient-to-b from-amber-600/20 via-transparent to-amber-600/20"
        />
      )}

      {/* Title */}
      <div className="relative pt-6 pb-3 text-center">
        <motion.h2
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className={`text-xl font-bold tracking-wider ${
            hasSSR ? 'text-amber-400' : hasSR ? 'text-purple-400' : 'text-sky-400'
          }`}
        >
          {hasSSR ? '恭喜获得SSR！' : hasSR ? '不错哦！' : '招募完成'}
        </motion.h2>
        {/* Summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-2 mt-2"
        >
          {ssrCount > 0 && (
            <span className="px-2 py-0.5 bg-amber-500/20 rounded text-xs text-amber-400">SSR×{ssrCount}</span>
          )}
          {srCount > 0 && (
            <span className="px-2 py-0.5 bg-purple-500/20 rounded text-xs text-purple-400">SR×{srCount}</span>
          )}
          {rCount > 0 && (
            <span className="px-2 py-0.5 bg-sky-500/20 rounded text-xs text-sky-400">R×{rCount}</span>
          )}
        </motion.div>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 px-4 pb-4">
        <div className={`grid gap-2 ${
          gachaResults.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : 'grid-cols-2 sm:grid-cols-5'
        }`}>
          {gachaResults.map((card, i) => (
            <GachaResultCard key={card.id} card={card} revealed={i < revealedCount} index={i} />
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="p-4 bg-gradient-to-t from-black/80 to-transparent"
      >
        <button
          onClick={() => setShowGachaResult(false)}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl text-sm font-medium text-white hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg"
        >
          确认
        </button>
      </motion.div>
    </motion.div>
  )
}

function GachaResultCard({ card, revealed, index }: { card: ReturnType<typeof useGameStore.getState>['gachaResults'][0]; revealed: boolean; index: number }) {
  const rarityColors = {
    5: 'border-amber-400 bg-gradient-to-b from-amber-500/20 to-amber-900/40 shadow-amber-500/40',
    4: 'border-purple-400 bg-gradient-to-b from-purple-500/20 to-purple-900/40 shadow-purple-500/40',
    3: 'border-sky-400/60 bg-gradient-to-b from-sky-500/10 to-sky-900/30',
  }

  return (
    <motion.div
      initial={{ scale: 0, rotateY: 180, opacity: 0 }}
      animate={revealed ? {
        scale: card.rarity === 5 ? [0, 1.3, 1] : [0, 1],
        rotateY: 0,
        opacity: 1,
      } : { scale: 0, rotateY: 180, opacity: 0 }}
      transition={{
        delay: index * 0.15,
        duration: card.rarity === 5 ? 0.6 : 0.4,
        type: 'spring',
        stiffness: 200,
      }}
      className={`relative p-3 rounded-xl border-2 ${rarityColors[card.rarity]} shadow-xl`}
    >
      {/* Glow for SSR */}
      {card.rarity === 5 && (
        <motion.div
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="absolute -inset-1 bg-amber-400/20 rounded-xl blur-sm"
        />
      )}

      <div className="relative">
        {/* Rarity Badge */}
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-bold ${getRarityColor(card.rarity)}`}>
            {getRarityLabel(card.rarity)}
          </span>
          {card.isNew && (
            <span className="px-1.5 py-0.5 bg-green-500 rounded text-[9px] text-white font-bold">NEW</span>
          )}
        </div>

        {/* Card Art Placeholder */}
        <div className={`w-full aspect-[3/4] rounded-lg bg-gradient-to-br ${getRarityBg(card.rarity)} border flex items-center justify-center mb-2`}>
          <span className="text-3xl">
            {card.rarity === 5 ? '🐉' : card.rarity === 4 ? '⚔️' : '🛡️'}
          </span>
        </div>

        {/* Card Info */}
        <div className="text-center">
          <div className="text-sm font-bold text-slate-200">{card.name}</div>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <span className="text-xs">{getElementIcon(card.element)}</span>
            <span className="text-[10px] text-slate-400">{card.faction}国</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
