'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/stores/game-store'
import { Swords, Zap, Shield, Heart, Clock, Trophy, ChevronRight } from 'lucide-react'

const battleStages = [
  { id: 1, name: '黄巾之乱', difficulty: '简单', stars: 3, rewards: '金币×5000', energy: 5, unlocked: true },
  { id: 2, name: '虎牢关', difficulty: '普通', stars: 2, rewards: '经验×2000', energy: 8, unlocked: true },
  { id: 3, name: '官渡之战', difficulty: '困难', stars: 1, rewards: 'SR碎片×5', energy: 10, unlocked: true },
  { id: 4, name: '赤壁之战', difficulty: '噩梦', stars: 0, rewards: 'SSR碎片×3', energy: 15, unlocked: true },
  { id: 5, name: '五丈原', difficulty: '地狱', stars: 0, rewards: 'SSR自选券×1', energy: 20, unlocked: false },
  { id: 6, name: '天下归一', difficulty: '传说', stars: 0, rewards: '限定武将', energy: 25, unlocked: false },
]

const difficultyColors: Record<string, string> = {
  '简单': 'text-green-400 bg-green-500/20',
  '普通': 'text-sky-400 bg-sky-500/20',
  '困难': 'text-amber-400 bg-amber-500/20',
  '噩梦': 'text-red-400 bg-red-500/20',
  '地狱': 'text-purple-400 bg-purple-500/20',
  '传说': 'text-amber-300 bg-amber-500/30',
}

export default function BattlePanel() {
  const { player, showNotification } = useGameStore()
  const [battleState, setBattleState] = useState<'select' | 'fighting' | 'result'>('select')
  const [selectedStage, setSelectedStage] = useState<typeof battleStages[0] | null>(null)
  const [battleProgress, setBattleProgress] = useState(0)
  const [battleResult, setBattleResult] = useState<'victory' | 'defeat' | null>(null)

  const startBattle = (stage: typeof battleStages[0]) => {
    if (player.stamina < stage.energy) {
      showNotification('体力不足！')
      return
    }
    setSelectedStage(stage)
    setBattleState('fighting')
    setBattleProgress(0)
    setBattleResult(null)

    // Simulate battle progress
    const duration = 3000
    const interval = setInterval(() => {
      setBattleProgress((p) => {
        if (p >= 100) {
          clearInterval(interval)
          const victory = stage.difficulty === '简单' ? Math.random() > 0.1
            : stage.difficulty === '普通' ? Math.random() > 0.25
            : stage.difficulty === '困难' ? Math.random() > 0.4
            : Math.random() > 0.6
          setTimeout(() => {
            setBattleResult(victory ? 'victory' : 'defeat')
            setBattleState('result')
            if (victory) showNotification(`胜利！获得: ${stage.rewards}`)
            else showNotification('战斗失败，再试一次！')
          }, 500)
          return 100
        }
        return p + 2
      })
    }, duration / 50)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Battle Status */}
      <div className="mx-3 mt-2 p-3 bg-gradient-to-r from-red-900/40 to-slate-900/80 rounded-xl border border-red-500/20 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-red-400" />
            <span className="text-sm font-bold text-red-300">战斗</span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-slate-400">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>体力: {player.stamina}/{player.maxStamina}</span>
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>战力: {player.power.toLocaleString()}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Battle Animation */}
      {battleState === 'fighting' && selectedStage && (
        <div className="mx-3 mt-3 p-6 bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl border border-red-500/30 flex-shrink-0">
          <div className="text-center mb-4">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 0.5 }}
              className="text-5xl mb-2"
            >
              ⚔️
            </motion.div>
            <div className="text-sm text-slate-300">{selectedStage.name}</div>
          </div>
          {/* HP bars */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex-1">
              <div className="text-[10px] text-green-400 mb-1">我方</div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${Math.max(20, 100 - battleProgress * 0.7)}%` }}
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                />
              </div>
            </div>
            <span className="text-xs text-slate-500 font-bold">VS</span>
            <div className="flex-1">
              <div className="text-[10px] text-red-400 mb-1 text-right">敌方</div>
              <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                <motion.div
                  animate={{ width: `${Math.max(0, 100 - battleProgress)}%` }}
                  className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full float-right"
                />
              </div>
            </div>
          </div>
          {/* Progress */}
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${battleProgress}%` }}
              className="h-full bg-gradient-to-r from-red-500 to-amber-500 rounded-full"
            />
          </div>
        </div>
      )}

      {/* Result Screen */}
      {battleState === 'result' && battleResult && selectedStage && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mx-3 mt-3 p-5 rounded-xl border flex-shrink-0 text-center"
          style={{
            background: battleResult === 'victory'
              ? 'linear-gradient(to bottom, rgba(234,179,8,0.15), rgba(30,41,59,0.9))'
              : 'linear-gradient(to bottom, rgba(239,68,68,0.15), rgba(30,41,59,0.9))',
            borderColor: battleResult === 'victory' ? 'rgba(234,179,8,0.3)' : 'rgba(239,68,68,0.3)',
          }}
        >
          <div className="text-4xl mb-2">{battleResult === 'victory' ? '🏆' : '💀'}</div>
          <div className={`text-xl font-bold ${battleResult === 'victory' ? 'text-amber-400' : 'text-red-400'}`}>
            {battleResult === 'victory' ? '胜利！' : '失败'}
          </div>
          {battleResult === 'victory' && (
            <div className="mt-2 text-xs text-amber-300">获得: {selectedStage.rewards}</div>
          )}
          <button
            onClick={() => setBattleState('select')}
            className="mt-3 px-6 py-2 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg text-sm text-white font-medium"
          >
            返回关卡
          </button>
        </motion.div>
      )}

      {/* Stage List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-2">
        <div className="text-xs text-slate-500 mb-2 px-1">主线关卡</div>
        <div className="flex flex-col gap-2">
          {battleStages.map((stage, i) => (
            <motion.button
              key={stage.id}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => stage.unlocked && startBattle(stage)}
              disabled={!stage.unlocked || battleState !== 'select'}
              className={`relative p-3 rounded-xl border transition-all ${
                stage.unlocked
                  ? 'bg-gradient-to-r from-slate-800/90 to-slate-900/90 border-slate-700/40 hover:border-red-500/30 cursor-pointer'
                  : 'bg-slate-900/50 border-slate-800/30 opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-red-500/20 to-red-700/20 rounded-lg border border-red-500/20 flex items-center justify-center text-lg">
                  {stage.unlocked ? `🗡️` : '🔒'}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-200">{stage.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${difficultyColors[stage.difficulty]}`}>
                      {stage.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                      <Zap className="w-3 h-3" />{stage.energy}
                    </span>
                    <span className="text-[10px] text-amber-400/70">{stage.rewards}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex gap-0.5">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <Star key={j} filled={j < stage.stars} />
                    ))}
                  </div>
                  {stage.unlocked && battleState === 'select' && (
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  )}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  )
}

function Star({ filled }: { filled: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1" className={filled ? 'text-amber-400' : 'text-slate-600'}>
      <path d="M6 1L7.5 4.5L11 5L8.5 7.5L9 11L6 9L3 11L3.5 7.5L1 5L4.5 4.5L6 1Z" />
    </svg>
  )
}
