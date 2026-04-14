'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import {
  Flame,
  Shield,
  Sparkles,
  Mail,
  ArrowRight,
  Clock,
  Zap,
} from 'lucide-react'
import { motion } from 'framer-motion'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OpsDashboardProps {
  onNavigate: (module: string) => void
}

interface Activity {
  id: number | string
  name: string
  startTime?: string
  endTime?: string
  status?: string
}

interface BattlePass {
  id: number | string
  name: string
  startTime?: string
  endTime?: string
  status?: string
}

interface LimitedPool {
  id: number | string
  name: string
  startTime?: string
  endTime?: string
  status?: number
}

interface MailItem {
  id: number | string
  title?: string
  sender?: string
  createdAt?: string
  content?: string
}

interface DashboardData {
  activities: Activity[]
  battlePasses: BattlePass[]
  limitedPools: LimitedPool[]
  mails: MailItem[]
}

interface RecentItem {
  id: number | string
  label: string
  description: string
  time: string
  type: 'activity' | 'battle-pass' | 'pool' | 'mail'
}

// ---------------------------------------------------------------------------
// Stat card configuration
// ---------------------------------------------------------------------------

const STAT_CARDS = [
  {
    key: 'activities' as const,
    title: '活动管理',
    subtitle: 'Activities',
    icon: Flame,
    gradient: 'from-amber-500/20 to-orange-600/20',
    iconColor: 'text-amber-400',
    ringColor: 'ring-amber-500/30',
    countPath: 'activities',
    module: 'activity',
  },
  {
    key: 'battlePasses' as const,
    title: '战令系统',
    subtitle: 'Battle Pass',
    icon: Shield,
    gradient: 'from-emerald-500/20 to-green-600/20',
    iconColor: 'text-emerald-400',
    ringColor: 'ring-emerald-500/30',
    countPath: 'battlePasses',
    module: 'battle-pass',
  },
  {
    key: 'limitedPools' as const,
    title: '限时卡池',
    subtitle: 'Limited Pools',
    icon: Sparkles,
    gradient: 'from-violet-500/20 to-purple-600/20',
    iconColor: 'text-violet-400',
    ringColor: 'ring-violet-500/30',
    countPath: 'limitedPools',
    module: 'limited-pool',
  },
  {
    key: 'mails' as const,
    title: '邮件系统',
    subtitle: 'Mail',
    icon: Mail,
    gradient: 'from-sky-500/20 to-cyan-600/20',
    iconColor: 'text-sky-400',
    ringColor: 'ring-sky-500/30',
    countPath: 'mails',
    module: 'mail',
  },
]

const QUICK_ACTIONS = [
  { key: 'activity', label: '活动管理', icon: Flame, color: 'text-amber-400 hover:bg-amber-500/10 border-amber-500/20' },
  { key: 'battle-pass', label: '战令系统', icon: Shield, color: 'text-emerald-400 hover:bg-emerald-500/10 border-emerald-500/20' },
  { key: 'limited-pool', label: '限时卡池', icon: Sparkles, color: 'text-violet-400 hover:bg-violet-500/10 border-violet-500/20' },
  { key: 'mail', label: '邮件系统', icon: Mail, color: 'text-sky-400 hover:bg-sky-500/10 border-sky-500/20' },
]

const TYPE_LABELS: Record<string, string> = {
  activity: '活动',
  'battle-pass': '战令',
  pool: '卡池',
  mail: '邮件',
}

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
}

// ---------------------------------------------------------------------------
// Helper: format timestamp to a short readable string
// ---------------------------------------------------------------------------

function formatTime(raw?: string): string {
  if (!raw) return '—'
  try {
    const d = new Date(raw)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${month}-${day} ${hours}:${minutes}`
  } catch {
    return '—'
  }
}

// ---------------------------------------------------------------------------
// Skeleton loaders (no shadcn dependency)
// ---------------------------------------------------------------------------

function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-800" />
          <div className="h-9 w-12 animate-pulse rounded bg-slate-800" />
          <div className="h-3 w-20 animate-pulse rounded bg-slate-800/60" />
        </div>
        <div className="h-12 w-12 animate-pulse rounded-xl bg-slate-800" />
      </div>
    </div>
  )
}

function RecentItemSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-lg px-4 py-3">
      <div className="h-10 w-10 animate-pulse rounded-lg bg-slate-800" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-40 animate-pulse rounded bg-slate-800" />
        <div className="h-3 w-28 animate-pulse rounded bg-slate-800/60" />
      </div>
      <div className="h-3 w-20 animate-pulse rounded bg-slate-800/60" />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function OpsDashboard({ onNavigate }: OpsDashboardProps) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [recentItems, setRecentItems] = useState<RecentItem[]>([])

  // ---- Fetch data on mount ----
  useEffect(() => {
    async function fetchData() {
      try {
        const [activitiesRes, battlePassesRes, poolsRes, mailsRes] =
          await Promise.allSettled([
            fetch('/api/ops/activity?status=active').then((r) => r.json()),
            fetch('/api/ops/battle-pass').then((r) => r.json()),
            fetch('/api/ops/limited-pool?status=1').then((r) => r.json()),
            fetch('/api/ops/mail?userId=10001').then((r) => r.json()),
          ])

        const activities: Activity[] =
          activitiesRes.status === 'fulfilled' && activitiesRes.value?.data
            ? activitiesRes.value.data
            : []
        const battlePasses: BattlePass[] =
          battlePassesRes.status === 'fulfilled' && battlePassesRes.value?.data
            ? battlePassesRes.value.data
            : []
        const limitedPools: LimitedPool[] =
          poolsRes.status === 'fulfilled' && poolsRes.value?.data
            ? poolsRes.value.data
            : []
        const mails: MailItem[] =
          mailsRes.status === 'fulfilled' && mailsRes.value?.data
            ? mailsRes.value.data
            : []

        const dashboardData: DashboardData = {
          activities,
          battlePasses,
          limitedPools,
          mails,
        }
        setData(dashboardData)

        // Build recent items list
        const recent: RecentItem[] = []

        activities.slice(0, 3).forEach((a) => {
          recent.push({
            id: a.id,
            label: a.name,
            description: `活动 · ${TYPE_LABELS.activity}`,
            time: formatTime(a.startTime),
            type: 'activity',
          })
        })

        battlePasses.slice(0, 3).forEach((bp) => {
          recent.push({
            id: bp.id,
            label: bp.name,
            description: `战令 · ${TYPE_LABELS['battle-pass']}`,
            time: formatTime(bp.startTime),
            type: 'battle-pass',
          })
        })

        limitedPools.slice(0, 3).forEach((lp) => {
          recent.push({
            id: lp.id,
            label: lp.name,
            description: `卡池 · ${TYPE_LABELS.pool}`,
            time: formatTime(lp.startTime),
            type: 'pool',
          })
        })

        mails.slice(0, 3).forEach((m) => {
          recent.push({
            id: m.id,
            label: m.title ?? m.content ?? '无标题',
            description: `邮件 · ${m.sender ?? '系统'}`,
            time: formatTime(m.createdAt),
            type: 'mail',
          })
        })

        // Sort by time descending (most recent first)
        recent.sort((a, b) => {
          if (a.time === '—') return 1
          if (b.time === '—') return -1
          return b.time.localeCompare(a.time)
        })

        setRecentItems(recent.slice(0, 8))
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // ---- Derived counts ----
  const counts = data
    ? {
        activities: data.activities.length,
        battlePasses: data.battlePasses.length,
        limitedPools: data.limitedPools.length,
        mails: data.mails.length,
      }
    : null

  // ---- Get icon + color config for a recent item type ----
  function getTypeIcon(type: string) {
    switch (type) {
      case 'activity':
        return { Icon: Flame, color: 'text-amber-400 bg-amber-500/10' }
      case 'battle-pass':
        return { Icon: Shield, color: 'text-emerald-400 bg-emerald-500/10' }
      case 'pool':
        return { Icon: Sparkles, color: 'text-violet-400 bg-violet-500/10' }
      case 'mail':
        return { Icon: Mail, color: 'text-sky-400 bg-sky-500/10' }
      default:
        return { Icon: Clock, color: 'text-slate-400 bg-slate-500/10' }
    }
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8"
    >
      {/* ===== Header ===== */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-white sm:text-3xl">
          运营总览
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          九州争鼎 · 游戏运营管理中心
        </p>
      </motion.div>

      {/* ===== Stat Cards ===== */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {STAT_CARDS.map((card) => {
          const Icon = card.icon
          const count = counts?.[card.countPath] ?? null

          return (
            <motion.div key={card.key} variants={itemVariants}>
              {loading ? (
                <StatCardSkeleton />
              ) : (
                <button
                  type="button"
                  onClick={() => onNavigate(card.module)}
                  className="group w-full text-left"
                >
                  <Card
                    className={cn(
                      'cursor-pointer border-slate-800 bg-slate-950/50 transition-all duration-200',
                      'hover:scale-[1.02] hover:border-slate-700 hover:shadow-lg',
                      'ring-1 ring-inset',
                      card.ringColor
                    )}
                  >
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 sm:space-y-2">
                          <p className="text-xs font-medium text-slate-400 sm:text-sm">
                            {card.title}
                          </p>
                          <p
                            className={cn(
                              'text-2xl font-bold sm:text-3xl',
                              card.iconColor
                            )}
                          >
                            {count}
                          </p>
                          <p className="hidden text-xs text-slate-500 sm:block">
                            {card.subtitle}
                          </p>
                        </div>
                        <div
                          className={cn(
                            'flex h-10 w-10 items-center justify-center rounded-xl sm:h-12 sm:w-12',
                            `bg-gradient-to-br ${card.gradient}`,
                            'transition-transform duration-200 group-hover:scale-110'
                          )}
                        >
                          <Icon className={cn('h-5 w-5 sm:h-6 sm:w-6', card.iconColor)} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              )}
            </motion.div>
          )
        })}
      </motion.div>

      {/* ===== Quick Actions ===== */}
      <motion.div variants={itemVariants}>
        <Card className="border-slate-800 bg-slate-950/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white sm:text-lg">
              <Zap className="h-4 w-4 text-amber-400" />
              快捷操作
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon
                return (
                  <button
                    key={action.key}
                    type="button"
                    onClick={() => onNavigate(action.key)}
                    className={cn(
                      'flex items-center gap-2.5 rounded-xl border px-3 py-3 sm:gap-3 sm:px-4 sm:py-3.5',
                      'transition-all duration-200 active:scale-95',
                      'text-sm font-medium text-slate-300',
                      action.color
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                    <span className="truncate">{action.label}</span>
                    <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ===== Recent Activities ===== */}
      <motion.div variants={itemVariants}>
        <Card className="border-slate-800 bg-slate-950/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-white sm:text-lg">
              <Clock className="h-4 w-4 text-slate-400" />
              最近动态
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-4 sm:px-4 sm:pb-6">
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <RecentItemSkeleton key={i} />
                ))}
              </div>
            ) : recentItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Clock className="mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm">暂无数据</p>
              </div>
            ) : (
              <div className="max-h-96 space-y-1 overflow-y-auto pr-1">
                {recentItems.map((item) => {
                  const { Icon, color } = getTypeIcon(item.type)
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors duration-150 hover:bg-slate-800/40 sm:gap-4 sm:px-4 sm:py-3"
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10',
                          color
                        )}
                      >
                        <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>

                      {/* Content */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-200">
                          {item.label}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {item.description}
                        </p>
                      </div>

                      {/* Time */}
                      <span className="hidden shrink-0 text-xs text-slate-500 sm:block">
                        {item.time}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
