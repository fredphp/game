'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, getRequiredExp, formatNumber } from '@/stores/game-store'
import type { BattlePassSeason } from '@/stores/game-store'
import {
  Shield, Crown, Lock, Check, ChevronRight, Star,
  Gift, Zap, Sparkles, Clock, ArrowLeft, Trophy
} from 'lucide-react'

// Generate battle pass reward mock data for levels 1-50
function generateRewards() {
  const rewards: { level: number; freeIcon: string; freeLabel: string; premiumIcon: string; premiumLabel: string }[] = []
  const freeIcons = ['💎', '💰', '⚔️', '🛡️', '📜', '🧪', '🔮', '🏅']
  const premiumIcons = ['👑', '🌟', '💎', '🐉', '🏆', '⚔️', '🛡️', '🔮']
  const freeLabels = ['钻石×50', '金币×5000', '体力药水×2', '经验书×3', '强化石×5', '突破丹×1', '招募令×1', '武将碎片×10']
  const premiumLabels = ['限定头像框', '限定称号', '钻石×200', 'SSR自选箱', '限定皮肤', '高级强化石×10', '高级突破丹×5', 'SSR碎片×20']

  for (let i = 1; i <= 50; i++) {
    const freeIdx = (i - 1) % freeIcons.length
    const premIdx = (i - 1) % premiumIcons.length
    rewards.push({
      level: i,
      freeIcon: freeIcons[freeIdx],
      freeLabel: freeLabels[freeIdx],
      premiumIcon: premiumIcons[premIdx],
      premiumLabel: premiumLabels[premIdx],
    })
  }
  return rewards
}

const REWARDS = generateRewards()

export default function BattlePassPage() {
  const {
    battlePassSeasons, currentBPPremium, battlePassLevel, battlePassExp,
    battlePassClaimed, setBattlePassPremium, addBattlePassExp, claimBPReward,
    showNotification,
  } = useGameStore()

  const [selectedSeasonId, setSelectedSeasonId] = useState(1)
  const [showPremiumDialog, setShowPremiumDialog] = useState(false)
  const [viewMode, setViewMode] = useState<'free' | 'premium'>('free')

  const currentSeason = useMemo(
    () => battlePassSeasons.find(s => s.id === selectedSeasonId) || battlePassSeasons[0],
    [battlePassSeasons, selectedSeasonId]
  )

  const requiredExp = getRequiredExp(battlePassLevel)
  const expProgress = Math.min((battlePassExp / requiredExp) * 100, 100)
  const nextClaimableLevel = useMemo(() => {
    for (let i = 1; i <= battlePassLevel; i++) {
      if (!battlePassClaimed.includes(i)) return i
    }
    return null
  }, [battlePassLevel, battlePassClaimed])

  const activeSeasons = battlePassSeasons.filter(s => s.status === 1)
  const isInactive = currentSeason.status !== 1

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-900/80">
      {/* Season Selector Tabs */}
      <div className="flex gap-1.5 px-3 pt-3 pb-2 flex-shrink-0">
        {battlePassSeasons.map((season) => (
          <button
            key={season.id}
            onClick={() => setSelectedSeasonId(season.id)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-all relative overflow-hidden ${
              selectedSeasonId === season.id
                ? season.status === 1
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20'
                  : 'bg-slate-700 text-slate-400'
                : 'bg-slate-800/80 text-slate-500 hover:bg-slate-700/80'
            }`}
          >
            <span>{season.title}</span>
            {season.status === 1 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            )}
          </button>
        ))}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Season Banner Card */}
        <div className="mx-3 mb-3">
          <div className={`relative rounded-2xl overflow-hidden ${
            isInactive ? 'opacity-60' : ''
          }`}>
            {/* Banner Background */}
            <div className="h-40 bg-gradient-to-br from-amber-600/40 via-amber-800/30 to-slate-900/90 relative">
              {/* Decorative Elements */}
              <div className="absolute top-4 left-4 w-20 h-20 border border-amber-500/20 rounded-full" />
              <div className="absolute bottom-2 right-2 w-28 h-28 border border-amber-500/10 rounded-full" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl opacity-20">
                🐉
              </div>

              {/* Season Info */}
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <span className="text-lg font-bold text-amber-100 tracking-wider">{currentSeason.title}</span>
                  {currentSeason.status === 0 && (
                    <span className="px-2 py-0.5 bg-slate-600/80 rounded-full text-[10px] text-slate-300">即将开放</span>
                  )}
                  {currentSeason.status === 1 && (
                    <span className="px-2 py-0.5 bg-green-500/80 rounded-full text-[10px] text-white">进行中</span>
                  )}
                </div>
                <p className="text-xs text-amber-200/60">{currentSeason.description}</p>
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{currentSeason.startTime} ~ {currentSeason.endTime}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {isInactive ? (
          /* Inactive Season Message */
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="w-20 h-20 rounded-full bg-slate-800/80 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-sm text-slate-400">该赛季尚未开放</p>
            <p className="text-xs text-slate-500 mt-1">敬请期待</p>
          </div>
        ) : (
          <>
            {/* Level Progress Section */}
            <div className="mx-3 mb-4">
              <div className="bg-gradient-to-r from-slate-800/90 to-slate-900/90 rounded-xl p-4 border border-slate-700/40">
                {/* Level Display */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/30 border border-amber-500/30 flex items-center justify-center">
                      <Trophy className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-bold text-amber-300">{battlePassLevel}</span>
                        <span className="text-xs text-slate-500">/ 50</span>
                      </div>
                      <span className="text-[10px] text-slate-500">当前等级</span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => addBattlePassExp(1500)}
                      className="px-3 py-1.5 bg-amber-500/15 rounded-lg text-[10px] text-amber-400 hover:bg-amber-500/25 transition-colors flex items-center gap-1"
                    >
                      <Zap className="w-3 h-3" />
                      +经验
                    </button>
                  </div>
                </div>

                {/* EXP Progress Bar */}
                <div className="relative">
                  <div className="h-3 bg-slate-700/60 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${expProgress}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full relative"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
                    </motion.div>
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[10px] text-slate-500">
                      EXP: {formatNumber(battlePassExp)} / {formatNumber(requiredExp)}
                    </span>
                    <span className="text-[10px] text-amber-500/70">
                      升级还需 {formatNumber(Math.max(0, requiredExp - battlePassExp))}
                    </span>
                  </div>
                </div>

                {/* Auto Claim Button */}
                <AnimatePresence>
                  {nextClaimableLevel && (
                    <motion.button
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      onClick={() => {
                        claimBPReward(nextClaimableLevel)
                        showNotification(`已领取 Lv.${nextClaimableLevel} 奖励`)
                      }}
                      className="w-full mt-3 py-2 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
                    >
                      <Gift className="w-4 h-4" />
                      领取 Lv.{nextClaimableLevel} 奖励
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Free / Premium Toggle */}
            <div className="mx-3 mb-3">
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('free')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    viewMode === 'free'
                      ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-white border border-slate-500/50'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 border border-transparent'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  免费版
                </button>
                <button
                  onClick={() => setViewMode('premium')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 relative overflow-hidden ${
                    viewMode === 'premium'
                      ? currentBPPremium
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border border-amber-400/50 shadow-lg shadow-amber-500/20'
                        : 'bg-gradient-to-r from-slate-600 to-slate-700 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800/50 text-slate-400 hover:bg-slate-700/50 border border-transparent'
                  }`}
                >
                  {currentBPPremium && (
                    <motion.div
                      layoutId="premium-glow"
                      className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-amber-600/10"
                      transition={{ type: 'spring', bounce: 0.2 }}
                    />
                  )}
                  <Crown className="w-4 h-4 relative z-10" />
                  <span className="relative z-10">尊享版</span>
                  {!currentBPPremium && (
                    <span className="relative z-10 ml-1 px-1.5 py-0.5 bg-amber-500/20 rounded text-[9px] text-amber-400">
                      ¥{currentSeason.premiumPrice}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Premium Purchase Dialog */}
            <AnimatePresence>
              {showPremiumDialog && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                  onClick={() => setShowPremiumDialog(false)}
                >
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-sm bg-gradient-to-b from-slate-800 to-slate-900 rounded-2xl border border-amber-500/30 overflow-hidden"
                  >
                    <div className="p-5 bg-gradient-to-r from-amber-500/10 to-transparent border-b border-slate-700/50">
                      <div className="flex items-center gap-2">
                        <Crown className="w-5 h-5 text-amber-400" />
                        <h3 className="text-lg font-bold text-amber-200">解锁尊享战令</h3>
                      </div>
                    </div>
                    <div className="p-5">
                      <p className="text-sm text-slate-300 mb-4">
                        解锁尊享版战令，即可获得全部50级尊享奖励，包含限定皮肤、SSR碎片等珍贵道具！
                      </p>
                      <div className="p-3 bg-slate-800/80 rounded-lg flex items-center justify-between">
                        <span className="text-sm text-slate-400">价格</span>
                        <span className="text-lg font-bold text-amber-400">¥{currentSeason.premiumPrice}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 p-4 bg-slate-900/50 border-t border-slate-700/30">
                      <button
                        onClick={() => setShowPremiumDialog(false)}
                        className="flex-1 py-2.5 bg-slate-700 rounded-xl text-sm text-slate-300 hover:bg-slate-600 transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => {
                          setBattlePassPremium(true)
                          setShowPremiumDialog(false)
                          showNotification('尊享战令已解锁！')
                        }}
                        className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl text-sm font-medium text-white shadow-lg shadow-amber-500/30 hover:from-amber-400 hover:to-amber-500 transition-all"
                      >
                        立即解锁
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Unlock Premium Prompt */}
            {!currentBPPremium && viewMode === 'premium' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mx-3 mb-3"
              >
                <div
                  onClick={() => setShowPremiumDialog(true)}
                  className="p-4 bg-gradient-to-r from-amber-500/10 to-amber-600/5 rounded-xl border border-amber-500/20 cursor-pointer hover:border-amber-500/40 transition-colors flex items-center gap-3"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/30 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-200">解锁尊享版</p>
                    <p className="text-[10px] text-amber-200/50">解锁全部尊享奖励，获取限定道具</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-400/60" />
                </div>
              </motion.div>
            )}

            {/* Rewards Grid */}
            <div className="mx-3 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-slate-300">奖励一览</span>
                <span className="text-[10px] text-slate-500">Lv.1 - 50</span>
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {REWARDS.map((reward) => {
                  const isLevelUnlocked = battlePassLevel >= reward.level
                  const isClaimed = battlePassClaimed.includes(reward.level)
                  const isPremiumLocked = viewMode === 'premium' && !currentBPPremium

                  let bgClass = 'bg-slate-800/40 border-slate-700/30'
                  let borderHover = 'hover:border-slate-600/50'

                  if (viewMode === 'premium') {
                    if (isPremiumLocked) {
                      bgClass = 'bg-slate-800/30 border-slate-700/20'
                      borderHover = ''
                    } else if (isClaimed) {
                      bgClass = 'bg-gradient-to-b from-amber-900/40 to-amber-950/40 border-amber-700/30'
                    } else if (isLevelUnlocked) {
                      bgClass = 'bg-gradient-to-b from-amber-500/20 to-amber-700/30 border-amber-500/40'
                      borderHover = 'hover:border-amber-400/60'
                    } else {
                      bgClass = 'bg-gradient-to-b from-amber-900/20 to-amber-950/20 border-amber-800/20'
                    }
                  } else {
                    if (isClaimed) {
                      bgClass = 'bg-gradient-to-b from-slate-700/40 to-slate-800/40 border-slate-600/30'
                    } else if (isLevelUnlocked) {
                      bgClass = 'bg-gradient-to-b from-slate-600/30 to-slate-700/30 border-slate-500/40'
                      borderHover = 'hover:border-amber-500/40'
                    }
                  }

                  return (
                    <motion.div
                      key={reward.level}
                      whileTap={isLevelUnlocked && !isClaimed && !isPremiumLocked ? { scale: 0.95 } : undefined}
                      onClick={() => {
                        if (isLevelUnlocked && !isClaimed && !isPremiumLocked) {
                          claimBPReward(reward.level)
                          showNotification(`已领取 Lv.${reward.level} ${viewMode === 'premium' ? '尊享' : '免费'}奖励`)
                        }
                      }}
                      className={`relative rounded-lg border p-1.5 text-center transition-all ${bgClass} ${borderHover} ${
                        isLevelUnlocked && !isClaimed && !isPremiumLocked ? 'cursor-pointer' : ''
                      } ${!isLevelUnlocked ? 'opacity-50' : ''}`}
                    >
                      {/* Level Number */}
                      <div className="text-[9px] text-slate-500 mb-1">Lv.{reward.level}</div>

                      {/* Reward Icon */}
                      <div className="text-xl mb-1 relative">
                        {isPremiumLocked ? (
                          <Lock className="w-4 h-4 text-slate-600 mx-auto mt-1.5" />
                        ) : (
                          <span>{viewMode === 'premium' ? reward.premiumIcon : reward.freeIcon}</span>
                        )}
                        {/* Claimed Checkmark */}
                        {isClaimed && !isPremiumLocked && (
                          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                        {/* Claimable Indicator */}
                        {isLevelUnlocked && !isClaimed && !isPremiumLocked && (
                          <div className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 flex items-center justify-center animate-pulse">
                            <Sparkles className="w-2 h-2 text-white" />
                          </div>
                        )}
                      </div>

                      {/* Reward Label */}
                      <div className="text-[8px] text-slate-400 truncate leading-tight">
                        {isPremiumLocked ? '尊享' : viewMode === 'premium' ? reward.premiumLabel : reward.freeLabel}
                      </div>

                      {/* Milestone levels highlight */}
                      {reward.level % 10 === 0 && !isPremiumLocked && (
                        <div className="absolute inset-0 rounded-lg border border-amber-500/20 pointer-events-none" />
                      )}
                    </motion.div>
                  )
                })}
              </div>
            </div>

            {/* Premium Only Notice */}
            {!currentBPPremium && (
              <div className="mx-3 mb-6 p-3 bg-slate-800/50 rounded-xl border border-slate-700/30">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-amber-400/50" />
                  <span className="text-[10px] text-slate-500">
                    购买尊享版可解锁全部金色奖励栏
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
