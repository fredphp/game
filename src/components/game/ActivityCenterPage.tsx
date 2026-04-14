'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, formatNumber } from '@/stores/game-store'
import type { GameActivity, GameActivityTask, GameLimitedPool } from '@/stores/game-store'
import {
  Calendar, Clock, Users, TrendingUp, Gift, ChevronRight,
  ChevronDown, ChevronUp, Flame, Sparkles, Swords, Zap,
  ArrowRight, Trophy, Target, CircleDot, Star, Gem
} from 'lucide-react'

const ACTIVITY_TYPE_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof Flame }> = {
  gacha: { label: '抽卡', color: 'text-purple-400', bgColor: 'bg-purple-500', icon: Gem },
  battle: { label: '战斗', color: 'text-red-400', bgColor: 'bg-red-500', icon: Swords },
  collect: { label: '收集', color: 'text-green-400', bgColor: 'bg-green-500', icon: Target },
  social: { label: '社交', color: 'text-sky-400', bgColor: 'bg-sky-500', icon: Users },
  limited: { label: '限时', color: 'text-amber-400', bgColor: 'bg-amber-500', icon: Clock },
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  active: { label: '进行中', color: 'text-green-400', bgColor: 'bg-green-500' },
  upcoming: { label: '即将开始', color: 'text-amber-400', bgColor: 'bg-amber-500' },
  ended: { label: '已结束', color: 'text-slate-400', bgColor: 'bg-slate-500' },
}

function parseRewardPreview(rewards: string): string {
  try {
    const obj = JSON.parse(rewards)
    return Object.entries(obj)
      .map(([key, val]) => {
        const nameMap: Record<string, string> = { diamond: '钻石', gold: '金币', exp: '经验' }
        return `${nameMap[key] || key}×${val}`
      })
      .join('、')
  } catch {
    return rewards
  }
}

export default function ActivityCenterPage() {
  const {
    activities, limitedPools, claimActivityReward, showNotification,
  } = useGameStore()

  const [expandedActivities, setExpandedActivities] = useState<Set<number>>(new Set([1]))
  const [activeTab, setActiveTab] = useState<'activities' | 'pools'>('activities')

  const toggleExpanded = (id: number) => {
    setExpandedActivities((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-900/80">
      {/* Header Tabs */}
      <div className="flex gap-1 p-3 pb-2 flex-shrink-0">
        <button
          onClick={() => setActiveTab('activities')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'activities'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20'
              : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/80'
          }`}
        >
          <Flame className="w-4 h-4" />
          活动
          {activities.length > 0 && (
            <span className="px-1.5 py-0.5 bg-white/20 rounded text-[10px]">{activities.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('pools')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
            activeTab === 'pools'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/20'
              : 'bg-slate-800/80 text-slate-400 hover:bg-slate-700/80'
          }`}
        >
          <Star className="w-4 h-4" />
          卡池
          {limitedPools.length > 0 && (
            <span className="px-1.5 py-0.5 bg-white/20 rounded text-[10px]">{limitedPools.length}</span>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pb-4">
        <AnimatePresence mode="wait">
          {activeTab === 'activities' ? (
            <motion.div
              key="activities"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {activities.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="暂无活动"
                  description="当前没有进行中的活动，敬请期待"
                />
              ) : (
                activities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    expanded={expandedActivities.has(activity.id)}
                    onToggle={() => toggleExpanded(activity.id)}
                    onClaimReward={(taskId) => {
                      claimActivityReward(activity.id, taskId)
                      showNotification('奖励领取成功！')
                    }}
                  />
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="pools"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-3"
            >
              {limitedPools.length === 0 ? (
                <EmptyState
                  icon={Gem}
                  title="暂无限定卡池"
                  description="当前没有开放的限定卡池"
                />
              ) : (
                limitedPools.map((pool) => (
                  <PoolCard key={pool.id} pool={pool} />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ActivityCard({
  activity, expanded, onToggle, onClaimReward,
}: {
  activity: GameActivity
  expanded: boolean
  onToggle: () => void
  onClaimReward: (taskId: number) => void
}) {
  const typeConfig = ACTIVITY_TYPE_CONFIG[activity.type] || ACTIVITY_TYPE_CONFIG.limited
  const statusConfig = STATUS_CONFIG[activity.status] || STATUS_CONFIG.ended
  const TypeIcon = typeConfig.icon

  return (
    <motion.div
      layout
      className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-slate-700/40 overflow-hidden"
    >
      {/* Activity Header */}
      <motion.div
        whileTap={{ scale: 0.99 }}
        onClick={onToggle}
        className="p-4 cursor-pointer"
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${typeConfig.bgColor}/20 border border-${typeConfig.bgColor}/30 flex items-center justify-center flex-shrink-0`}>
            <TypeIcon className={`w-5 h-5 ${typeConfig.color}`} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-slate-200 truncate">{activity.name}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white flex-shrink-0 ${statusConfig.bgColor}`}>
                {statusConfig.label}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-1.5">
              <span className={`text-[10px] font-medium ${typeConfig.color}`}>{activity.typeName}</span>
              <span className="text-[10px] text-slate-500">|</span>
              <span className="text-[10px] text-slate-500">{activity.description}</span>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Clock className="w-3 h-3" />
                <span>{activity.startTime.slice(5)} ~ {activity.endTime.slice(5)}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                <Users className="w-3 h-3" />
                <span>{formatNumber(activity.participants)}人参与</span>
              </div>
            </div>
          </div>

          {/* Expand Icon */}
          <div className="flex-shrink-0 mt-1">
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </div>
        </div>

        {/* Completion Rate */}
        {activity.status === 'active' && (
          <div className="mt-3 pt-3 border-t border-slate-700/30">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] text-slate-500">参与进度</span>
              <span className="text-[10px] text-amber-400">{activity.completionRate}%</span>
            </div>
            <div className="h-1.5 bg-slate-700/60 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${activity.completionRate}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
              />
            </div>
          </div>
        )}
      </motion.div>

      {/* Tasks */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-slate-700/30">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-slate-300">活动任务</span>
                <span className="text-[10px] text-slate-500">
                  ({activity.tasks.filter(t => t.status === 2).length}/{activity.tasks.length} 已完成)
                </span>
              </div>

              <div className="space-y-2">
                {activity.tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    onClaim={() => onClaimReward(task.id)}
                  />
                ))}
              </div>

              {/* Total Rewards */}
              <div className="mt-3 p-2.5 bg-amber-500/5 rounded-lg border border-amber-500/10 flex items-center gap-2">
                <Gift className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] text-amber-300/70">总奖励: {activity.rewards}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function TaskItem({ task, onClaim }: {
  task: GameActivityTask
  onClaim: () => void
}) {
  const progressPercent = Math.min((task.progress / task.targetCount) * 100, 100)
  const isCompleted = task.progress >= task.targetCount
  const isClaimed = task.status === 2
  const rewardPreview = parseRewardPreview(task.rewards)

  return (
    <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700/20">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-200 truncate">{task.title}</span>
            {isCompleted && !isClaimed && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="px-1.5 py-0.5 bg-amber-500 rounded text-[8px] text-white font-bold flex-shrink-0"
              >
                可领取
              </motion.span>
            )}
            {isClaimed && (
              <span className="px-1.5 py-0.5 bg-green-500/20 rounded text-[8px] text-green-400 flex-shrink-0">已领取</span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5 truncate">{task.description}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-2 bg-slate-700/60 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className={`h-full rounded-full ${isCompleted ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-gradient-to-r from-amber-500 to-amber-400'}`}
          />
        </div>
        <span className="text-[10px] text-slate-400 flex-shrink-0 w-16 text-right">
          {task.progress}/{task.targetCount}
        </span>
      </div>

      {/* Bottom Row: Reward + Claim */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 text-[10px] text-amber-400/70">
          <Gift className="w-3 h-3" />
          <span>{rewardPreview}</span>
        </div>
        {isCompleted && !isClaimed && (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClaim}
            className="px-3 py-1 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg text-[10px] text-white font-medium flex items-center gap-1 shadow-sm shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all"
          >
            <Sparkles className="w-3 h-3" />
            领取
          </motion.button>
        )}
      </div>
    </div>
  )
}

function PoolCard({ pool }: { pool: GameLimitedPool }) {
  const typeConfig = pool.type === 'limited'
    ? { label: '限定', color: 'text-red-400', bgColor: 'bg-red-500' }
    : { label: 'UP', color: 'text-amber-400', bgColor: 'bg-amber-500' }

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 rounded-xl border border-slate-700/40 overflow-hidden"
    >
      {/* Pool Banner */}
      <div className="h-24 bg-gradient-to-br from-purple-900/40 via-slate-800/60 to-slate-900/80 relative overflow-hidden">
        <div className="absolute top-2 left-2 w-16 h-16 border border-white/5 rounded-full" />
        <div className="absolute bottom-1 right-1 w-20 h-20 border border-white/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl opacity-15">
          {pool.type === 'limited' ? '🐉' : '⚔️'}
        </div>

        {/* Badge */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-0.5 ${typeConfig.bgColor} rounded text-[9px] font-bold text-white`}>
            {typeConfig.label}
          </span>
        </div>

        {/* Pool Name */}
        <div className="absolute bottom-2 left-3 right-3">
          <div className="text-sm font-bold text-slate-200">{pool.name}</div>
          <div className="text-[10px] text-slate-400">{pool.description}</div>
        </div>
      </div>

      {/* Pool Info */}
      <div className="p-3">
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center p-2 bg-slate-800/60 rounded-lg">
            <div className="text-xs font-bold text-amber-300">{pool.ssrRate}%</div>
            <div className="text-[9px] text-slate-500">SSR概率</div>
          </div>
          <div className="text-center p-2 bg-slate-800/60 rounded-lg">
            <div className="text-xs font-bold text-purple-300">{pool.srRate}%</div>
            <div className="text-[9px] text-slate-500">SR概率</div>
          </div>
          <div className="text-center p-2 bg-slate-800/60 rounded-lg">
            <div className="text-xs font-bold text-sky-300">{pool.pityCount}</div>
            <div className="text-[9px] text-slate-500">保底次数</div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1 text-[10px] text-slate-500">
            <Clock className="w-3 h-3" />
            <span>{pool.startTime.slice(5)} ~ {pool.endTime.slice(5)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[10px] text-slate-500">
            今日 <span className="text-amber-400">{formatNumber(pool.todayDraws)}</span> 次抽取
          </div>
          <button className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg text-[10px] text-white font-medium flex items-center gap-1 shadow-sm shadow-amber-500/20">
            前往抽取
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

function EmptyState({ icon: Icon, title, description }: {
  icon: typeof Calendar
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="w-20 h-20 rounded-full bg-slate-800/80 flex items-center justify-center mb-4 border border-slate-700/40"
      >
        <Icon className="w-8 h-8 text-slate-500" />
      </motion.div>
      <p className="text-sm text-slate-400 mb-1">{title}</p>
      <p className="text-xs text-slate-500 text-center">{description}</p>
    </div>
  )
}
