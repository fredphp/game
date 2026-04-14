'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Target,
  Flame,
  ChevronDown,
  ChevronUp,
  X,
  Filter,
  Sparkles,
  Swords,
  Users,
  Timer,
  Gift,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ==================== Types ====================
interface ActivityTask {
  id?: number
  sortOrder: number
  title: string
  description: string
  taskType: string
  targetType: string
  targetCount: number
  rewards: string
  status: number
}

interface Activity {
  id: number
  title: string
  description: string
  type: 'gacha' | 'battle' | 'collection' | 'social' | 'limited'
  status: 'draft' | 'active' | 'paused' | 'ended'
  startTime: string
  endTime: string
  rewards: string
  tasks: ActivityTask[]
}

interface ActivityFormData {
  title: string
  description: string
  type: Activity['type']
  status: Activity['status']
  startTime: string
  endTime: string
  rewards: string
  tasks: ActivityTask[]
}

interface TaskFormData {
  sortOrder: number
  title: string
  description: string
  taskType: string
  targetType: string
  targetCount: number
  rewards: string
  status: number
}

// ==================== Constants ====================
const ACTIVITY_TYPES: { value: Activity['type']; label: string; icon: typeof Flame }[] = [
  { value: 'gacha', label: '抽卡活动', icon: Sparkles },
  { value: 'battle', label: '战斗活动', icon: Swords },
  { value: 'collection', label: '收集活动', icon: Gift },
  { value: 'social', label: '社交活动', icon: Users },
  { value: 'limited', label: '限时活动', icon: Timer },
]

const ACTIVITY_STATUSES: { value: Activity['status']; label: string }[] = [
  { value: 'draft', label: '草稿' },
  { value: 'active', label: '进行中' },
  { value: 'paused', label: '已暂停' },
  { value: 'ended', label: '已结束' },
]

const STATUS_TABS = [
  { value: 'all', label: '全部' },
  { value: 'draft', label: '草稿' },
  { value: 'active', label: '进行中' },
  { value: 'paused', label: '已暂停' },
  { value: 'ended', label: '已结束' },
]

const TASK_TYPES = [
  'battle_win',
  'battle_count',
  'resource_collect',
  'hero_upgrade',
  'gacha_pull',
  'social_interact',
  'guild_donate',
  'stage_clear',
  'item_use',
  'login_days',
]

const TYPE_BADGE_CLASS: Record<string, string> = {
  gacha: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  battle: 'bg-red-500/15 text-red-400 border-red-500/30',
  collection: 'bg-green-500/15 text-green-400 border-green-500/30',
  social: 'bg-sky-500/15 text-sky-400 border-sky-500/30',
  limited: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
}

const TYPE_LABEL: Record<string, string> = {
  gacha: '抽卡',
  battle: '战斗',
  collection: '收集',
  social: '社交',
  limited: '限时',
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  draft: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  active: 'bg-green-500/15 text-green-400 border-green-500/30',
  paused: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  ended: 'bg-red-500/15 text-red-400 border-red-500/30',
}

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  active: '进行中',
  paused: '已暂停',
  ended: '已结束',
}

const TYPE_ICON_MAP: Record<string, typeof Flame> = {
  gacha: Sparkles,
  battle: Swords,
  collection: Gift,
  social: Users,
  limited: Timer,
}

const emptyFormData: ActivityFormData = {
  title: '',
  description: '',
  type: 'gacha',
  status: 'draft',
  startTime: '',
  endTime: '',
  rewards: '{}',
  tasks: [],
}

const emptyTaskForm: TaskFormData = {
  sortOrder: 1,
  title: '',
  description: '',
  taskType: 'battle_win',
  targetType: 'battle_win',
  targetCount: 1,
  rewards: '{}',
  status: 1,
}

// ==================== Animation Variants ====================
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
}

const cardHover = {
  rest: { scale: 1 },
  hover: { scale: 1.008, transition: { duration: 0.2 } },
}

const taskRowVariants = {
  hidden: { opacity: 0, x: -12 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  exit: { opacity: 0, x: 12, transition: { duration: 0.15 } },
}

// ==================== Custom Scrollbar Style ====================
const scrollbarStyle = (
  <style>{`
    .ops-activity-scroll::-webkit-scrollbar { width: 5px; }
    .ops-activity-scroll::-webkit-scrollbar-track { background: transparent; }
    .ops-activity-scroll::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
    .ops-activity-scroll::-webkit-scrollbar-thumb:hover { background: #475569; }
  `}</style>
)

// ==================== Loading Skeletons ====================
function CardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-40 rounded bg-slate-800" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-14 rounded-full bg-slate-800" />
            <Skeleton className="h-5 w-14 rounded-full bg-slate-800" />
          </div>
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-8 w-8 rounded-md bg-slate-800" />
          <Skeleton className="h-8 w-8 rounded-md bg-slate-800" />
        </div>
      </div>
      <Skeleton className="h-4 w-full rounded bg-slate-800" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-3 w-4 rounded bg-slate-800" />
        <Skeleton className="h-3 w-48 rounded bg-slate-800" />
      </div>
    </div>
  )
}

// ==================== Format Helpers ====================
function formatDateTime(dt: string) {
  if (!dt) return '--'
  try {
    const d = new Date(dt)
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dt
  }
}

// ==================== Main Component ====================
export default function OpsActivity() {
  // ───── Data State ─────
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  // ───── Filter State ─────
  const [statusTab, setStatusTab] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  // ───── UI State ─────
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Activity | null>(null)
  const [saving, setSaving] = useState(false)

  // ───── Form State ─────
  const [formData, setFormData] = useState<ActivityFormData>({ ...emptyFormData })

  // ───── Task Form State (for add task dialog) ─────
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null)
  const [taskForm, setTaskForm] = useState<TaskFormData>({ ...emptyTaskForm })

  // ==================== Data Fetching ====================
  const fetchActivities = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusTab !== 'all') params.set('status', statusTab)
      if (typeFilter !== 'all') params.set('type', typeFilter)
      const qs = params.toString()
      const url = `/api/ops/activity${qs ? `?${qs}` : ''}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.success) {
        setActivities(json.data || [])
      }
    } catch {
      // silent fail - show empty state
    } finally {
      setLoading(false)
    }
  }, [statusTab, typeFilter])

  useEffect(() => {
    fetchActivities()
  }, [fetchActivities])

  // ==================== Filtered Data ====================
  const filteredActivities = useMemo(() => {
    return activities.filter((a) => {
      if (statusTab !== 'all' && a.status !== statusTab) return false
      if (typeFilter !== 'all' && a.type !== typeFilter) return false
      return true
    })
  }, [activities, statusTab, typeFilter])

  // ==================== Toggle Expand ====================
  const toggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // ==================== Form Helpers ====================
  const resetForm = useCallback(() => {
    setFormData({ ...emptyFormData, tasks: [] })
  }, [])

  const openCreateDialog = useCallback(() => {
    setEditingActivity(null)
    resetForm()
    setDialogOpen(true)
  }, [resetForm])

  const openEditDialog = useCallback((activity: Activity) => {
    setEditingActivity(activity)
    setFormData({
      title: activity.title,
      description: activity.description,
      type: activity.type,
      status: activity.status,
      startTime: activity.startTime,
      endTime: activity.endTime,
      rewards: activity.rewards || '{}',
      tasks: activity.tasks
        ? activity.tasks.map((t) => ({
            sortOrder: t.sortOrder,
            title: t.title,
            description: t.description || '',
            taskType: t.taskType || '',
            targetType: t.targetType || '',
            targetCount: t.targetCount || 0,
            rewards: t.rewards || '{}',
            status: t.status ?? 1,
          }))
        : [],
    })
    setDialogOpen(true)
  }, [])

  // ==================== Task Form Helpers ====================
  const openAddTask = useCallback(() => {
    setEditingTaskIndex(null)
    setTaskForm({
      ...emptyTaskForm,
      sortOrder: formData.tasks.length + 1,
    })
    setTaskDialogOpen(true)
  }, [formData.tasks.length])

  const openEditTask = useCallback((index: number) => {
    const t = formData.tasks[index]
    if (!t) return
    setEditingTaskIndex(index)
    setTaskForm({ ...t })
    setTaskDialogOpen(true)
  }, [formData.tasks])

  const saveTask = useCallback(() => {
    if (!taskForm.title.trim()) return
    const newTask: ActivityTask = {
      sortOrder: taskForm.sortOrder,
      title: taskForm.title.trim(),
      description: taskForm.description,
      taskType: taskForm.taskType,
      targetType: taskForm.targetType,
      targetCount: taskForm.targetCount,
      rewards: taskForm.rewards || '{}',
      status: taskForm.status,
    }
    setFormData((prev) => {
      const tasks = [...prev.tasks]
      if (editingTaskIndex !== null) {
        tasks[editingTaskIndex] = { ...newTask, id: prev.tasks[editingTaskIndex]?.id }
      } else {
        tasks.push(newTask)
      }
      // Re-calculate sort orders
      return { ...prev, tasks }
    })
    setTaskDialogOpen(false)
  }, [taskForm, editingTaskIndex])

  const removeTask = useCallback((index: number) => {
    setFormData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index),
    }))
  }, [])

  // ==================== CRUD Handlers ====================
  const handleSave = useCallback(async () => {
    if (!formData.title.trim()) return
    setSaving(true)
    try {
      const tasksPayload = formData.tasks.map((t, idx) => ({
        sortOrder: idx + 1,
        title: t.title,
        description: t.description,
        taskType: t.taskType,
        targetType: t.targetType,
        targetCount: t.targetCount,
        rewards: t.rewards || '{}',
        status: t.status,
      }))

      if (editingActivity) {
        // Update
        const res = await fetch('/api/ops/activity', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingActivity.id,
            title: formData.title,
            description: formData.description,
            type: formData.type,
            status: formData.status,
            startTime: formData.startTime,
            endTime: formData.endTime,
            rewards: formData.rewards || '{}',
            tasks: tasksPayload,
          }),
        })
        const json = await res.json()
        if (json.success) {
          setActivities((prev) =>
            prev.map((a) =>
              a.id === editingActivity.id
                ? { ...a, ...json.data }
                : a
            )
          )
          setDialogOpen(false)
          resetForm()
        }
      } else {
        // Create
        const res = await fetch('/api/ops/activity', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formData.title,
            description: formData.description,
            type: formData.type,
            status: formData.status,
            startTime: formData.startTime,
            endTime: formData.endTime,
            rewards: formData.rewards || '{}',
            tasks: tasksPayload,
          }),
        })
        const json = await res.json()
        if (json.success) {
          setActivities((prev) => [json.data, ...prev])
          setDialogOpen(false)
          resetForm()
        }
      }
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }, [formData, editingActivity, resetForm])

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return
    try {
      const res = await fetch(`/api/ops/activity?id=${deleteTarget.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()
      if (json.success) {
        setActivities((prev) => prev.filter((a) => a.id !== deleteTarget.id))
        setExpandedIds((prev) => {
          const next = new Set(prev)
          next.delete(deleteTarget.id)
          return next
        })
      }
    } catch {
      // silent
    }
    setDeleteTarget(null)
  }, [deleteTarget])

  // ==================== Stats ====================
  const stats = useMemo(() => {
    const active = activities.filter((a) => a.status === 'active').length
    const draft = activities.filter((a) => a.status === 'draft').length
    const totalTasks = activities.reduce((s, a) => s + (a.tasks?.length || 0), 0)
    return { active, draft, total: activities.length, totalTasks }
  }, [activities])

  // ==================== Render ====================
  return (
    <div className="min-h-screen bg-[#0f1117] text-slate-100">
      {scrollbarStyle}

      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:p-8">
        {/* ─── Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/15">
              <Flame className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">活动管理</h1>
              <p className="text-sm text-slate-500">九州争鼎 · 活动配置与任务管理</p>
            </div>
          </div>
          <Button
            onClick={openCreateDialog}
            className="gap-2 bg-amber-500 text-black hover:bg-amber-400"
          >
            <Plus className="h-4 w-4" />
            新建活动
          </Button>
        </motion.div>

        {/* ─── Stats Cards ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.08 }}
          className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            {
              label: '活动总数',
              value: stats.total,
              icon: Flame,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10',
            },
            {
              label: '进行中',
              value: stats.active,
              icon: Target,
              color: 'text-green-400',
              bg: 'bg-green-500/10',
            },
            {
              label: '草稿',
              value: stats.draft,
              icon: Edit,
              color: 'text-slate-400',
              bg: 'bg-slate-500/10',
            },
            {
              label: '总任务数',
              value: stats.totalTasks,
              icon: Clock,
              color: 'text-sky-400',
              bg: 'bg-sky-500/10',
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <div
                className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg',
                  stat.bg
                )}
              >
                <stat.icon className={cn('h-4 w-4', stat.color)} />
              </div>
              <div>
                <p className="text-xl font-bold">{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* ─── Filter Bar ─── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.14 }}
          className="space-y-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
        >
          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            <Filter className="mr-1 h-4 w-4 text-slate-500" />
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStatusTab(tab.value)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  statusTab === tab.value
                    ? 'bg-amber-500/15 text-amber-400'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                )}
              >
                {tab.label}
                {tab.value !== 'all' && (
                  <span className="ml-1.5 text-[10px] opacity-60">
                    (
                    {activities.filter(
                      (a) => tab.value === 'all' || a.status === tab.value
                    ).length}
                    )
                  </span>
                )}
                {tab.value === 'all' && (
                  <span className="ml-1.5 text-[10px] opacity-60">
                    ({stats.total})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">类型:</span>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="h-8 w-[140px] border-slate-700 bg-slate-800 text-xs text-slate-300 focus:ring-amber-500/30">
                <SelectValue placeholder="全部类型" />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-900">
                <SelectItem value="all" className="text-slate-300">
                  全部类型
                </SelectItem>
                {ACTIVITY_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value} className="text-slate-300">
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* ─── Activity List ─── */}
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-700 bg-slate-900/50 py-16"
          >
            <Flame className="mb-4 h-12 w-12 text-slate-700" />
            <p className="text-sm font-medium text-slate-500">暂无活动数据</p>
            <p className="mt-1 text-xs text-slate-600">
              点击「新建活动」开始创建
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={listVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            <AnimatePresence>
              {filteredActivities.map((activity) => {
                const isExpanded = expandedIds.has(activity.id)
                const TypeIcon = TYPE_ICON_MAP[activity.type] || Flame
                const taskCount = activity.tasks?.length || 0

                return (
                  <motion.div
                    key={activity.id}
                    variants={itemVariants}
                    layout
                    initial="rest"
                    whileHover="hover"
                  >
                    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900 transition-colors hover:border-slate-700">
                      {/* Card Header Row */}
                      <div
                        className="cursor-pointer px-5 py-4"
                        onClick={() => toggleExpand(activity.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          {/* Left: Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <div
                                className={cn(
                                  'flex h-7 w-7 items-center justify-center rounded-md',
                                  TYPE_BADGE_CLASS[activity.type]
                                )}
                              >
                                <TypeIcon className="h-3.5 w-3.5" />
                              </div>
                              <h3 className="truncate text-sm font-semibold text-slate-100">
                                {activity.title}
                              </h3>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] border',
                                  TYPE_BADGE_CLASS[activity.type]
                                )}
                              >
                                {TYPE_LABEL[activity.type] || activity.type}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'text-[10px] border',
                                  STATUS_BADGE_CLASS[activity.status]
                                )}
                              >
                                {STATUS_LABEL[activity.status] || activity.status}
                              </Badge>
                            </div>
                            {activity.description && (
                              <p className="mt-1.5 truncate text-xs text-slate-500">
                                {activity.description}
                              </p>
                            )}
                            <div className="mt-2 flex items-center gap-4 flex-wrap">
                              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <Calendar className="h-3 w-3" />
                                {formatDateTime(activity.startTime)}
                                <span className="mx-0.5 text-slate-600">~</span>
                                {formatDateTime(activity.endTime)}
                              </span>
                              <span className="flex items-center gap-1 text-[11px] text-slate-500">
                                <Target className="h-3 w-3" />
                                {taskCount} 个任务
                              </span>
                            </div>
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditDialog(activity)
                              }}
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteTarget(activity)
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                            <div className="ml-1 flex h-7 w-7 items-center justify-center rounded-md text-slate-500">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Expanded Tasks */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="border-t border-slate-800 bg-[#0c0e14] px-5 py-4">
                              <div className="mb-3 flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-slate-400">
                                  任务列表
                                </h4>
                                <span className="text-[10px] text-slate-600">
                                  共 {taskCount} 个任务
                                </span>
                              </div>

                              {taskCount === 0 ? (
                                <div className="flex flex-col items-center py-6">
                                  <Target className="mb-2 h-8 w-8 text-slate-700" />
                                  <p className="text-xs text-slate-600">
                                    暂无任务，请在编辑中添加
                                  </p>
                                </div>
                              ) : (
                                <div className="max-h-72 space-y-2 overflow-y-auto ops-activity-scroll pr-1">
                                  {activity.tasks.map((task, idx) => (
                                    <motion.div
                                      key={task.id || idx}
                                      variants={taskRowVariants}
                                      initial="hidden"
                                      animate="visible"
                                      exit="exit"
                                      className="flex items-start gap-3 rounded-lg border border-slate-800 bg-slate-900 p-3"
                                    >
                                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-400">
                                        {task.sortOrder || idx + 1}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-slate-200">
                                          {task.title}
                                        </p>
                                        {task.description && (
                                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                                            {task.description}
                                          </p>
                                        )}
                                        <div className="mt-1.5 flex items-center gap-3 text-[10px] text-slate-600">
                                          <span className="rounded bg-slate-800 px-1.5 py-0.5">
                                            {task.taskType}
                                          </span>
                                          <span>
                                            目标: {task.targetType} × {task.targetCount}
                                          </span>
                                        </div>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={cn(
                                          'flex-shrink-0 text-[10px] border',
                                          task.status === 1
                                            ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                            : 'bg-slate-500/10 text-slate-500 border-slate-500/20'
                                        )}
                                      >
                                        {task.status === 1 ? '启用' : '禁用'}
                                      </Badge>
                                    </motion.div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* ─── Create/Edit Dialog ─── */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setDialogOpen(false)
            setEditingActivity(null)
            resetForm()
          }
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-700 bg-[#12141c] ops-activity-scroll sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              {editingActivity ? '编辑活动' : '新建活动'}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {editingActivity
                ? '修改活动配置信息与任务'
                : '创建新的游戏活动并配置任务'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">活动标题 *</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="输入活动名称"
                className="border-slate-700 bg-slate-800 text-slate-200 placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-amber-500/20"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">活动描述</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="输入活动描述"
                rows={3}
                className="border-slate-700 bg-slate-800 text-slate-200 placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-amber-500/20 resize-none"
              />
            </div>

            {/* Type & Status Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">活动类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: v as Activity['type'],
                    }))
                  }
                >
                  <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-200 focus:border-amber-500/50 focus:ring-amber-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-900">
                    {ACTIVITY_TYPES.map((t) => (
                      <SelectItem
                        key={t.value}
                        value={t.value}
                        className="text-slate-300"
                      >
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">活动状态</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: v as Activity['status'],
                    }))
                  }
                >
                  <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-200 focus:border-amber-500/50 focus:ring-amber-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-900">
                    {ACTIVITY_STATUSES.map((s) => (
                      <SelectItem
                        key={s.value}
                        value={s.value}
                        className="text-slate-300"
                      >
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">开始时间</Label>
                <Input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      startTime: e.target.value,
                    }))
                  }
                  className="border-slate-700 bg-slate-800 text-slate-200 focus:border-amber-500/50 focus:ring-amber-500/20 [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">结束时间</Label>
                <Input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      endTime: e.target.value,
                    }))
                  }
                  className="border-slate-700 bg-slate-800 text-slate-200 focus:border-amber-500/50 focus:ring-amber-500/20 [color-scheme:dark]"
                />
              </div>
            </div>

            {/* Rewards JSON */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">
                奖励配置 (JSON)
              </Label>
              <Textarea
                value={formData.rewards}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, rewards: e.target.value }))
                }
                placeholder='{"gold": 1000, "diamond": 100}'
                rows={2}
                className="border-slate-700 bg-slate-800 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-amber-500/20 resize-none"
              />
            </div>

            {/* ─── Tasks Section ─── */}
            <div className="space-y-3 rounded-lg border border-slate-800 bg-[#0c0e14] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-amber-400" />
                  <h4 className="text-sm font-medium text-slate-300">
                    任务列表
                  </h4>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-slate-500 border-slate-700"
                  >
                    {formData.tasks.length}
                  </Badge>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 gap-1 text-xs text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                  onClick={openAddTask}
                >
                  <Plus className="h-3 w-3" />
                  添加任务
                </Button>
              </div>

              {formData.tasks.length === 0 ? (
                <div className="flex flex-col items-center py-6">
                  <Target className="mb-2 h-8 w-8 text-slate-700" />
                  <p className="text-xs text-slate-600">
                    暂无任务，点击上方按钮添加
                  </p>
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto ops-activity-scroll pr-1">
                  <AnimatePresence>
                    {formData.tasks.map((task, idx) => (
                      <motion.div
                        key={idx}
                        variants={taskRowVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        layout
                        className="group flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-900 p-3"
                      >
                        <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-[10px] font-bold text-amber-400">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-200">
                            {task.title}
                          </p>
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
                            <span className="rounded bg-slate-800 px-1.5 py-0.5">
                              {task.taskType}
                            </span>
                            <span>
                              {task.targetType} × {task.targetCount}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-slate-500 hover:text-amber-400 hover:bg-amber-500/10"
                            onClick={() => openEditTask(idx)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => removeTask(idx)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false)
                setEditingActivity(null)
                resetForm()
              }}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={!formData.title.trim() || saving}
              className="gap-2 bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                    className="h-3.5 w-3.5 rounded-full border-2 border-black/30 border-t-black"
                  />
                  保存中...
                </>
              ) : editingActivity ? (
                '保存修改'
              ) : (
                '创建活动'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Task Add/Edit Dialog ─── */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="border-slate-700 bg-[#12141c] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-slate-100">
              {editingTaskIndex !== null ? '编辑任务' : '添加任务'}
            </DialogTitle>
            <DialogDescription className="text-slate-500">
              {editingTaskIndex !== null
                ? '修改任务配置信息'
                : '为活动添加新任务'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Task Title */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">任务标题 *</Label>
              <Input
                value={taskForm.title}
                onChange={(e) =>
                  setTaskForm((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="输入任务标题"
                className="border-slate-700 bg-slate-800 text-slate-200 placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-amber-500/20"
              />
            </div>

            {/* Task Description */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">任务描述</Label>
              <Textarea
                value={taskForm.description}
                onChange={(e) =>
                  setTaskForm((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="输入任务描述"
                rows={2}
                className="border-slate-700 bg-slate-800 text-slate-200 placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-amber-500/20 resize-none"
              />
            </div>

            {/* Task Type & Target Count */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">任务类型</Label>
                <Select
                  value={taskForm.taskType}
                  onValueChange={(v) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      taskType: v,
                      targetType: v,
                    }))
                  }
                >
                  <SelectTrigger className="border-slate-700 bg-slate-800 text-slate-200 focus:border-amber-500/50 focus:ring-amber-500/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-slate-900">
                    {TASK_TYPES.map((t) => (
                      <SelectItem
                        key={t}
                        value={t}
                        className="text-slate-300"
                      >
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-slate-400">目标数量</Label>
                <Input
                  type="number"
                  min={1}
                  value={taskForm.targetCount}
                  onChange={(e) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      targetCount: parseInt(e.target.value) || 1,
                    }))
                  }
                  className="border-slate-700 bg-slate-800 text-slate-200 focus:border-amber-500/50 focus:ring-amber-500/20"
                />
              </div>
            </div>

            {/* Task Rewards */}
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-400">
                任务奖励 (JSON)
              </Label>
              <Textarea
                value={taskForm.rewards}
                onChange={(e) =>
                  setTaskForm((prev) => ({
                    ...prev,
                    rewards: e.target.value,
                  }))
                }
                placeholder='{"gold": 500, "exp": 200}'
                rows={2}
                className="border-slate-700 bg-slate-800 font-mono text-xs text-slate-200 placeholder:text-slate-600 focus:border-amber-500/50 focus:ring-amber-500/20 resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTaskDialogOpen(false)}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100"
            >
              取消
            </Button>
            <Button
              onClick={saveTask}
              disabled={!taskForm.title.trim()}
              className="gap-2 bg-amber-500 text-black hover:bg-amber-400 disabled:opacity-50"
            >
              {editingTaskIndex !== null ? '保存修改' : '添加任务'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete Confirmation ─── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent className="border-slate-700 bg-[#12141c]">
          <AlertDialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/15">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <AlertDialogTitle className="text-slate-100">
                  确认删除活动
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-500">
                  确定要删除活动「{deleteTarget?.title}」吗？此操作不可撤销。
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-slate-100">
              取消
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500/30"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
