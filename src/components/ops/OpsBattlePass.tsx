'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Shield,
  Crown,
  Plus,
  Edit,
  Lock,
  Star,
  Trophy,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  Zap,
  Archive,
  Loader2,
  ScrollText,
} from 'lucide-react'
import { toast } from 'sonner'

// ─── Types ───────────────────────────────────────────────────────────────────

interface BattlePassLevel {
  id?: number
  passId?: number
  level: number
  requiredExp: number
  freeRewards: string
  premiumRewards: string
  title: string
  iconType: 'chest' | 'special'
}

interface BattlePass {
  id: number
  seasonKey: string
  title: string
  description: string
  startTime: string
  endTime: string
  price: number
  premiumPrice: number
  isPremium: number
  status: number // 1=active, 0=upcoming, 2=ended
  totalExp: number
  participants: number
  premiumUsers: number
  levels?: BattlePassLevel[]
  createdAt?: string
  updatedAt?: string
}

interface BattlePassStats {
  passId: number
  totalParticipants: number
  premiumCount: number
  avgLevel: number
  completionRate: number
  revenue: number
}

type PassFormLevel = Omit<BattlePassLevel, 'id' | 'passId'>

interface PassFormData {
  seasonKey: string
  title: string
  description: string
  startTime: string
  endTime: string
  price: number
  premiumPrice: number
  status: number
  totalExp: number
  isPremium: number
  participants: number
  premiumUsers: number
  levels: PassFormLevel[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_MAP: Record<number, { label: string; color: string; dotClass: string }> = {
  0: { label: '即将开放', color: 'text-sky-400', dotClass: 'bg-sky-400' },
  1: { label: '进行中', color: 'text-green-400', dotClass: 'bg-green-400 animate-pulse' },
  2: { label: '已结束', color: 'text-slate-400', dotClass: 'bg-slate-500' },
  3: { label: '已归档', color: 'text-amber-600', dotClass: 'bg-amber-600' },
}

const EXP_CURVE_BASE = 200
const EXP_CURVE_GROWTH = 1.15

function generateDefaultLevels(count: number): PassFormLevel[] {
  const freeRewardsPool = [
    '{"items":[{"name":"钻石","count":50}]}',
    '{"items":[{"name":"金币","count":5000}]}',
    '{"items":[{"name":"体力药水","count":2}]}',
    '{"items":[{"name":"经验书","count":3}]}',
    '{"items":[{"name":"强化石","count":5}]}',
    '{"items":[{"name":"突破丹","count":1}]}',
    '{"items":[{"name":"招募令","count":1}]}',
    '{"items":[{"name":"武将碎片","count":10}]}',
  ]
  const premiumRewardsPool = [
    '{"items":[{"name":"限定头像框","count":1}]}',
    '{"items":[{"name":"限定称号","count":1}]}',
    '{"items":[{"name":"钻石","count":200}]}',
    '{"items":[{"name":"SSR自选箱","count":1}]}',
    '{"items":[{"name":"限定皮肤","count":1}]}',
    '{"items":[{"name":"高级强化石","count":10}]}',
    '{"items":[{"name":"高级突破丹","count":5}]}',
    '{"items":[{"name":"SSR碎片","count":20}]}',
  ]

  return Array.from({ length: count }, (_, i) => {
    const lvl = i + 1
    return {
      level: lvl,
      requiredExp: Math.round(EXP_CURVE_BASE * Math.pow(EXP_CURVE_GROWTH, lvl - 1)),
      freeRewards: freeRewardsPool[i % freeRewardsPool.length],
      premiumRewards: premiumRewardsPool[i % premiumRewardsPool.length],
      title: lvl % 10 === 0 ? `里程碑等级 Lv.${lvl}` : `等级 ${lvl}`,
      iconType: lvl % 10 === 0 ? ('special' as const) : ('chest' as const),
    }
  })
}

function parseRewards(jsonStr: string): { name: string; count: number }[] {
  try {
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed?.items)) return parsed.items
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

// ─── Empty state illustration ────────────────────────────────────────────────

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 px-4"
    >
      <div className="relative mb-6">
        <div className="w-24 h-24 rounded-2xl bg-slate-800/60 border border-slate-700/40 flex items-center justify-center">
          <Shield className="w-10 h-10 text-slate-600" />
        </div>
        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
          <Plus className="w-4 h-4 text-amber-500" />
        </div>
      </div>
      <h3 className="text-lg font-semibold text-slate-300 mb-2">暂无战令赛季</h3>
      <p className="text-sm text-slate-500 mb-6 text-center max-w-sm">
        创建您的第一个战令赛季，为玩家设定精彩奖励路线和成长阶梯
      </p>
      <Button
        onClick={onCreate}
        className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/20 border-0"
      >
        <Plus className="w-4 h-4" />
        新建赛季
      </Button>
    </motion.div>
  )
}

// ─── Season Card ─────────────────────────────────────────────────────────────

function SeasonCard({
  pass,
  isExpanded,
  onToggle,
  onEdit,
  onArchive,
}: {
  pass: BattlePass
  isExpanded: boolean
  onToggle: () => void
  onEdit: () => void
  onArchive: () => void
}) {
  const status = STATUS_MAP[pass.status] || STATUS_MAP[2]
  const levelCount = pass.levels?.length || 0

  const gradientBg = useMemo(() => {
    switch (pass.status) {
      case 1:
        return 'from-amber-600/30 via-amber-800/20 to-slate-900/80'
      case 0:
        return 'from-sky-600/20 via-sky-800/15 to-slate-900/80'
      case 3:
        return 'from-slate-600/15 via-slate-700/10 to-slate-900/80'
      default:
        return 'from-slate-700/20 via-slate-800/15 to-slate-900/80'
    }
  }, [pass.status])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-slate-700/40 bg-slate-900 overflow-hidden shadow-lg shadow-black/20"
    >
      {/* Season Banner */}
      <div className={cn('relative bg-gradient-to-br p-5', gradientBg)}>
        {/* Decorative circles */}
        <div className="absolute top-3 right-3 w-16 h-16 border border-amber-500/10 rounded-full" />
        <div className="absolute bottom-2 left-2 w-24 h-24 border border-amber-500/5 rounded-full" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl opacity-10 select-none">
          🐉
        </div>

        {/* Badge row */}
        <div className="relative flex items-center gap-2 mb-3 flex-wrap">
          <Badge className="bg-amber-500/90 text-white border-amber-400/50 text-[11px] font-semibold">
            {pass.seasonKey}
          </Badge>
          <Badge
            variant="outline"
            className={cn('gap-1.5 text-[11px]', status.color, 'border-current/20')}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', status.dotClass)} />
            {status.label}
          </Badge>
        </div>

        {/* Title */}
        <div className="relative flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-amber-50 tracking-wide mb-1 truncate">
              {pass.title}
            </h3>
            <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
              {pass.description || '暂无描述'}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10"
              onClick={(e) => {
                e.stopPropagation()
                onEdit()
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
            {pass.status !== 3 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-amber-500 hover:bg-amber-500/10"
                onClick={(e) => {
                  e.stopPropagation()
                  onArchive()
                }}
              >
                <Archive className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Time & Price */}
        <div className="relative flex items-center gap-4 mt-3 flex-wrap text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {pass.startTime} ~ {pass.endTime}
          </span>
          <span className="flex items-center gap-1 text-amber-500/70">
            <Crown className="w-3 h-3" />
            ¥{pass.premiumPrice}
          </span>
        </div>

        {/* Stats row */}
        <div className="relative flex items-center gap-5 mt-3">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-sm font-medium text-slate-300">{pass.participants.toLocaleString()}</span>
            <span className="text-[11px] text-slate-500">参与者</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5 text-amber-500/60" />
            <span className="text-sm font-medium text-amber-300">{pass.premiumUsers.toLocaleString()}</span>
            <span className="text-[11px] text-slate-500">尊享</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-sm font-medium text-slate-300">{levelCount}</span>
            <span className="text-[11px] text-slate-500">等级</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500/60" />
            <span className="text-sm font-medium text-slate-300">{pass.totalExp.toLocaleString()}</span>
            <span className="text-[11px] text-slate-500">总经验</span>
          </div>
        </div>
      </div>

      {/* Expand toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-slate-500 hover:text-amber-400 hover:bg-slate-800/60 transition-colors border-t border-slate-700/30"
      >
        <ScrollText className="w-3.5 h-3.5" />
        <span>{isExpanded ? '收起奖励列表' : '展开奖励列表'}</span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </motion.div>
      </button>

      {/* Expanded level grid */}
      <AnimatePresence initial={false}>
        {isExpanded && pass.levels && pass.levels.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-slate-700/30 bg-slate-900/80">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-medium text-slate-300">等级奖励一览</span>
                <span className="text-[11px] text-slate-500">
                  Lv.1 - {pass.levels.length}
                </span>
              </div>

              <div className="max-h-96 overflow-y-auto pr-1">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {pass.levels.map((lvl) => (
                    <LevelCard key={lvl.level} level={lvl} />
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {isExpanded && (!pass.levels || pass.levels.length === 0) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="overflow-hidden"
          >
            <div className="p-8 border-t border-slate-700/30 flex flex-col items-center justify-center text-slate-500">
              <Trophy className="w-8 h-8 mb-2 opacity-40" />
              <span className="text-sm">该赛季暂无等级奖励数据</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Level Card ──────────────────────────────────────────────────────────────

function LevelCard({ level }: { level: BattlePassLevel }) {
  const isMilestone = level.level % 10 === 0
  const freeItems = parseRewards(level.freeRewards)
  const premiumItems = parseRewards(level.premiumRewards)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, delay: (level.level % 10) * 0.02 }}
      className={cn(
        'relative rounded-lg border p-2.5 transition-all group',
        isMilestone
          ? 'bg-gradient-to-b from-amber-900/30 to-amber-950/30 border-amber-500/30 shadow-md shadow-amber-500/5'
          : 'bg-slate-800/50 border-slate-700/30 hover:border-slate-600/50'
      )}
    >
      {/* Milestone glow */}
      {isMilestone && (
        <div className="absolute inset-0 rounded-lg bg-amber-500/5 pointer-events-none" />
      )}

      {/* Level number */}
      <div className="flex items-center justify-between mb-2 relative">
        <span
          className={cn(
            'text-xs font-bold',
            isMilestone ? 'text-amber-300' : 'text-slate-400'
          )}
        >
          Lv.{level.level}
        </span>
        {isMilestone ? (
          <Trophy className="w-3.5 h-3.5 text-amber-400" />
        ) : (
          <div className="w-3.5 h-3.5 rounded bg-slate-700/60 flex items-center justify-center">
            <span className="text-[9px]">🎁</span>
          </div>
        )}
      </div>

      {/* Required EXP */}
      <div className="flex items-center gap-1 mb-2 text-[10px] text-slate-500 relative">
        <Zap className="w-3 h-3 text-amber-500/50" />
        <span>{level.requiredExp.toLocaleString()} EXP</span>
      </div>

      {/* Title */}
      <p className="text-[10px] text-slate-500 mb-2 truncate">{level.title}</p>

      {/* Free rewards */}
      <div className="mb-1.5">
        <div className="flex items-center gap-1 mb-1">
          <Shield className="w-2.5 h-2.5 text-slate-500" />
          <span className="text-[9px] text-slate-500 uppercase tracking-wider">Free</span>
        </div>
        <div className="space-y-0.5">
          {freeItems.slice(0, 2).map((item, idx) => (
            <div key={idx} className="text-[10px] text-slate-400 truncate">
              {item.name} ×{item.count}
            </div>
          ))}
          {freeItems.length > 2 && (
            <span className="text-[9px] text-slate-600">+{freeItems.length - 2} more</span>
          )}
        </div>
      </div>

      {/* Premium rewards */}
      <div>
        <div className="flex items-center gap-1 mb-1">
          <Crown className="w-2.5 h-2.5 text-amber-500/60" />
          <span className="text-[9px] text-amber-500/60 uppercase tracking-wider">Premium</span>
        </div>
        <div className="space-y-0.5">
          {premiumItems.slice(0, 2).map((item, idx) => (
            <div key={idx} className="text-[10px] text-amber-300/80 truncate">
              {item.name} ×{item.count}
            </div>
          ))}
          {premiumItems.length > 2 && (
            <span className="text-[9px] text-amber-700">+{premiumItems.length - 2} more</span>
          )}
        </div>
      </div>

      {/* Icon type badge */}
      {level.iconType === 'special' && (
        <Badge className="absolute top-1.5 right-1.5 bg-amber-500/20 text-amber-400 border-amber-500/30 text-[8px] px-1 py-0 h-4">
          Special
        </Badge>
      )}
    </motion.div>
  )
}

// ─── Create / Edit Dialog ────────────────────────────────────────────────────

function PassDialog({
  open,
  onClose,
  editingPass,
  onSave,
}: {
  open: boolean
  onClose: () => void
  editingPass: BattlePass | null
  onSave: (data: PassFormData, id?: number) => Promise<void>
}) {
  const isEditing = !!editingPass
  const [saving, setSaving] = useState(false)
  const [levelCount, setLevelCount] = useState(10)
  const [activeTab, setActiveTab] = useState<'basic' | 'levels'>('basic')

  const [form, setForm] = useState<PassFormData>({
    seasonKey: '',
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    price: 0,
    premiumPrice: 68,
    status: 0,
    totalExp: 0,
    isPremium: 0,
    participants: 0,
    premiumUsers: 0,
    levels: generateDefaultLevels(10),
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab('basic')
      if (editingPass) {
        setForm({
          seasonKey: editingPass.seasonKey,
          title: editingPass.title,
          description: editingPass.description || '',
          startTime: editingPass.startTime,
          endTime: editingPass.endTime,
          price: editingPass.price,
          premiumPrice: editingPass.premiumPrice,
          status: editingPass.status,
          totalExp: editingPass.totalExp,
          isPremium: editingPass.isPremium,
          participants: editingPass.participants,
          premiumUsers: editingPass.premiumUsers,
          levels: (editingPass.levels || []).map((l) => ({
            level: l.level,
            requiredExp: l.requiredExp,
            freeRewards: l.freeRewards,
            premiumRewards: l.premiumRewards,
            title: l.title,
            iconType: l.iconType,
          })),
        })
        setLevelCount(editingPass.levels?.length || 10)
      } else {
        const now = new Date()
        const startStr = now.toISOString().slice(0, 16)
        const end = new Date(now)
        end.setMonth(end.getMonth() + 2)
        const endStr = end.toISOString().slice(0, 16)
        setForm({
          seasonKey: '',
          title: '',
          description: '',
          startTime: startStr,
          endTime: endStr,
          price: 0,
          premiumPrice: 68,
          status: 0,
          totalExp: 0,
          isPremium: 0,
          participants: 0,
          premiumUsers: 0,
          levels: generateDefaultLevels(10),
        })
        setLevelCount(10)
      }
    }
  }, [open, editingPass])

  const updateField = useCallback(
    <K extends keyof PassFormData>(key: K, value: PassFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  const regenerateLevels = useCallback(
    (count: number) => {
      const preservedLevels = form.levels
        .filter((l) => l.level <= count)
      const newLevels = generateDefaultLevels(count)
      // Merge: keep manually edited levels, generate new ones
      const merged = newLevels.map((nl) => {
        const existing = preservedLevels.find((pl) => pl.level === nl.level)
        return existing || nl
      })
      setForm((prev) => ({ ...prev, levels: merged }))
      setLevelCount(count)
    },
    [form.levels]
  )

  const updateLevel = useCallback(
    (index: number, field: keyof PassFormLevel, value: string | number) => {
      setForm((prev) => {
        const levels = [...prev.levels]
        levels[index] = { ...levels[index], [field]: value }
        return { ...prev, levels }
      })
    },
    []
  )

  const handleSave = async () => {
    if (!form.seasonKey.trim()) {
      toast.error('请填写赛季标识（如 S2025S1）')
      return
    }
    if (!form.title.trim()) {
      toast.error('请填写赛季标题')
      return
    }
    if (!form.startTime || !form.endTime) {
      toast.error('请填写开始和结束时间')
      return
    }
    if (form.levels.length === 0) {
      toast.error('请至少设置一个等级')
      return
    }

    setSaving(true)
    try {
      const totalExp = form.levels.reduce((sum, l) => sum + l.requiredExp, 0)
      const data = { ...form, totalExp }
      await onSave(data, editingPass?.id)
      onClose()
    } catch {
      toast.error('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700/50 p-0">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-amber-600/20 via-amber-800/10 to-slate-900 px-6 py-5 border-b border-slate-700/30">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-amber-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-400" />
              {isEditing ? '编辑赛季' : '新建赛季'}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              {isEditing
                ? `正在编辑：${editingPass?.title}`
                : '配置新的战令赛季，设置奖励路线'}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-700/30 px-6">
          <button
            onClick={() => setActiveTab('basic')}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'basic'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            )}
          >
            基本信息
          </button>
          <button
            onClick={() => setActiveTab('levels')}
            className={cn(
              'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'levels'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-500 hover:text-slate-300'
            )}
          >
            等级奖励
            <Badge className="ml-2 bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">
              {form.levels.length}
            </Badge>
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === 'basic' ? (
              <motion.div
                key="basic"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Row 1: seasonKey + status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">
                      赛季标识 <span className="text-amber-500">*</span>
                    </Label>
                    <Input
                      value={form.seasonKey}
                      onChange={(e) => updateField('seasonKey', e.target.value)}
                      placeholder="如 S2025S1"
                      className="bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder:text-slate-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">赛季状态</Label>
                    <Select
                      value={String(form.status)}
                      onValueChange={(v) => updateField('status', Number(v))}
                    >
                      <SelectTrigger className="w-full bg-slate-800/50 border-slate-700/50 text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700/50">
                        <SelectItem value="0" className="text-sky-400">即将开放</SelectItem>
                        <SelectItem value="1" className="text-green-400">进行中</SelectItem>
                        <SelectItem value="2" className="text-slate-400">已结束</SelectItem>
                        <SelectItem value="3" className="text-amber-500">已归档</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Row 2: title */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">
                    赛季标题 <span className="text-amber-500">*</span>
                  </Label>
                  <Input
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    placeholder="如：龙吟九州·第一赛季"
                    className="bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder:text-slate-600"
                  />
                </div>

                {/* Row 3: description */}
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm">赛季描述</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                    placeholder="赛季介绍和主题描述..."
                    rows={3}
                    className="bg-slate-800/50 border-slate-700/50 text-slate-200 placeholder:text-slate-600 resize-none"
                  />
                </div>

                {/* Row 4: time range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">
                      开始时间 <span className="text-amber-500">*</span>
                    </Label>
                    <Input
                      type="datetime-local"
                      value={form.startTime}
                      onChange={(e) => updateField('startTime', e.target.value)}
                      className="bg-slate-800/50 border-slate-700/50 text-slate-200 [color-scheme:dark]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">
                      结束时间 <span className="text-amber-500">*</span>
                    </Label>
                    <Input
                      type="datetime-local"
                      value={form.endTime}
                      onChange={(e) => updateField('endTime', e.target.value)}
                      className="bg-slate-800/50 border-slate-700/50 text-slate-200 [color-scheme:dark]"
                    />
                  </div>
                </div>

                {/* Row 5: pricing */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">基础价格</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.price}
                      onChange={(e) => updateField('price', Number(e.target.value))}
                      className="bg-slate-800/50 border-slate-700/50 text-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">尊享价格</Label>
                    <Input
                      type="number"
                      min={0}
                      value={form.premiumPrice}
                      onChange={(e) => updateField('premiumPrice', Number(e.target.value))}
                      className="bg-slate-800/50 border-slate-700/50 text-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm">是否尊享</Label>
                    <Select
                      value={String(form.isPremium)}
                      onValueChange={(v) => updateField('isPremium', Number(v))}
                    >
                      <SelectTrigger className="w-full bg-slate-800/50 border-slate-700/50 text-slate-200">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700/50">
                        <SelectItem value="0">否</SelectItem>
                        <SelectItem value="1">是</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="levels"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Level count control */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-slate-300">等级奖励配置</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-slate-400">等级数量</Label>
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={levelCount}
                      onChange={(e) => {
                        const val = Math.min(50, Math.max(1, Number(e.target.value) || 1))
                        regenerateLevels(val)
                      }}
                      className="w-20 h-8 bg-slate-800/50 border-slate-700/50 text-slate-200 text-sm text-center"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs bg-slate-800/50 border-slate-700/50 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                      onClick={() => regenerateLevels(levelCount)}
                    >
                      <Zap className="w-3 h-3" />
                      重新生成
                    </Button>
                  </div>
                </div>

                {/* Levels table */}
                <div className="max-h-[400px] overflow-y-auto rounded-lg border border-slate-700/30">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-800/80 sticky top-0 z-10">
                      <tr className="text-left text-xs text-slate-400">
                        <th className="px-3 py-2 font-medium w-16">等级</th>
                        <th className="px-3 py-2 font-medium w-24">所需EXP</th>
                        <th className="px-3 py-2 font-medium">标题</th>
                        <th className="px-3 py-2 font-medium">免费奖励 (JSON)</th>
                        <th className="px-3 py-2 font-medium">尊享奖励 (JSON)</th>
                        <th className="px-3 py-2 font-medium w-20">图标类型</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/20">
                      {form.levels.map((lvl, idx) => (
                        <tr
                          key={lvl.level}
                          className={cn(
                            'group hover:bg-slate-800/30 transition-colors',
                            lvl.level % 10 === 0 && 'bg-amber-900/10 hover:bg-amber-900/20'
                          )}
                        >
                          <td className="px-3 py-2">
                            <span
                              className={cn(
                                'text-xs font-bold',
                                lvl.level % 10 === 0 ? 'text-amber-300' : 'text-slate-400'
                              )}
                            >
                              {lvl.level % 10 === 0 && '🏆 '}
                              Lv.{lvl.level}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min={0}
                              value={lvl.requiredExp}
                              onChange={(e) =>
                                updateLevel(idx, 'requiredExp', Number(e.target.value))
                              }
                              className="h-7 text-xs bg-transparent border-slate-700/30 text-slate-200 px-2"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={lvl.title}
                              onChange={(e) => updateLevel(idx, 'title', e.target.value)}
                              className="h-7 text-xs bg-transparent border-slate-700/30 text-slate-200 px-2"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={lvl.freeRewards}
                              onChange={(e) => updateLevel(idx, 'freeRewards', e.target.value)}
                              className="h-7 text-xs bg-transparent border-slate-700/30 text-slate-300 px-2 font-mono"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              value={lvl.premiumRewards}
                              onChange={(e) => updateLevel(idx, 'premiumRewards', e.target.value)}
                              className="h-7 text-xs bg-transparent border-slate-700/30 text-amber-300/80 px-2 font-mono"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Select
                              value={lvl.iconType}
                              onValueChange={(v) =>
                                updateLevel(idx, 'iconType', v)
                              }
                            >
                              <SelectTrigger className="h-7 text-xs bg-transparent border-slate-700/30 text-slate-300 px-1 w-[80px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-700/50">
                                <SelectItem value="chest">📦 Chest</SelectItem>
                                <SelectItem value="special">⭐ Special</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary */}
                <div className="flex items-center gap-4 text-xs text-slate-500 bg-slate-800/40 rounded-lg px-4 py-3">
                  <span>共 {form.levels.length} 个等级</span>
                  <span>
                    总经验：
                    <span className="text-amber-400 font-medium">
                      {form.levels
                        .reduce((sum, l) => sum + l.requiredExp, 0)
                        .toLocaleString()}
                    </span>
                  </span>
                  <span>
                    里程碑：
                    <span className="text-amber-400 font-medium">
                      {form.levels.filter((l) => l.level % 10 === 0).length} 个
                    </span>
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-700/30 bg-slate-900/50">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            取消
          </Button>
          {activeTab === 'basic' && !isEditing && (
            <Button
              variant="outline"
              onClick={() => setActiveTab('levels')}
              className="bg-slate-800/50 border-slate-700/50 text-slate-300 hover:text-amber-300"
            >
              下一步：配置等级
              <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
            </Button>
          )}
          {activeTab === 'levels' && (
            <Button
              variant="outline"
              onClick={() => setActiveTab('basic')}
              className="bg-slate-800/50 border-slate-700/50 text-slate-300"
            >
              <ChevronUp className="w-4 h-4 rotate-[-90deg]" />
              上一步
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/20 border-0 min-w-[100px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                保存中...
              </>
            ) : isEditing ? (
              <>
                <Edit className="w-4 h-4" />
                更新赛季
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                创建赛季
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OpsBattlePass() {
  const [passes, setPasses] = useState<BattlePass[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPass, setEditingPass] = useState<BattlePass | null>(null)
  const [stats, setStats] = useState<Record<number, BattlePassStats>>({})

  // Fetch all battle passes
  const fetchPasses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ops/battle-pass')
      const json = await res.json()
      if (json.success && json.data) {
        setPasses(json.data)
      } else {
        toast.error('获取战令列表失败')
      }
    } catch {
      toast.error('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPasses()
  }, [fetchPasses])

  // Fetch stats for a specific pass
  const fetchStats = useCallback(async (passId: number) => {
    try {
      const res = await fetch(`/api/ops/battle-pass?stats=true&passId=${passId}`)
      const json = await res.json()
      if (json.success && json.data) {
        setStats((prev) => ({ ...prev, [passId]: json.data }))
      }
    } catch {
      // Stats are optional, don't show error
    }
  }, [])

  // Handle save (create or update)
  const handleSave = useCallback(
    async (data: PassFormData, id?: number) => {
      const url = '/api/ops/battle-pass'
      const method = id ? 'PUT' : 'POST'

      const body: Record<string, unknown> = id
        ? {
            id,
            seasonKey: data.seasonKey,
            title: data.title,
            description: data.description,
            startTime: data.startTime,
            endTime: data.endTime,
            price: data.price,
            premiumPrice: data.premiumPrice,
            status: data.status,
            totalExp: data.totalExp,
            isPremium: data.isPremium,
            participants: data.participants,
            premiumUsers: data.premiumUsers,
            levels: data.levels.map((l) => ({
              level: l.level,
              requiredExp: l.requiredExp,
              freeRewards: l.freeRewards,
              premiumRewards: l.premiumRewards,
              title: l.title,
              iconType: l.iconType,
            })),
          }
        : {
            seasonKey: data.seasonKey,
            title: data.title,
            description: data.description,
            startTime: data.startTime,
            endTime: data.endTime,
            price: data.price,
            premiumPrice: data.premiumPrice,
            status: data.status,
            totalExp: data.totalExp,
            isPremium: data.isPremium,
            participants: data.participants,
            premiumUsers: data.premiumUsers,
            levels: data.levels.map((l) => ({
              level: l.level,
              requiredExp: l.requiredExp,
              freeRewards: l.freeRewards,
              premiumRewards: l.premiumRewards,
              title: l.title,
              iconType: l.iconType,
            })),
          }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (json.success) {
        toast.success(id ? '赛季已更新' : '赛季已创建')
        await fetchPasses()
      } else {
        toast.error(json.error || '操作失败')
      }
    },
    [fetchPasses]
  )

  // Handle archive (set status to 3)
  const handleArchive = useCallback(
    async (pass: BattlePass) => {
      try {
        const res = await fetch('/api/ops/battle-pass', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: pass.id, status: 3 }),
        })
        const json = await res.json()
        if (json.success) {
          toast.success(`"${pass.title}" 已归档`)
          await fetchPasses()
          if (expandedId === pass.id) setExpandedId(null)
        } else {
          toast.error('归档失败')
        }
      } catch {
        toast.error('网络错误，请重试')
      }
    },
    [fetchPasses, expandedId]
  )

  // Handle toggle expand
  const handleToggle = useCallback(
    (id: number) => {
      setExpandedId((prev) => {
        const next = prev === id ? null : id
        if (next !== null) {
          fetchStats(id)
        }
        return next
      })
    },
    [fetchStats]
  )

  // Sort passes: active first, then upcoming, then ended, then archived
  const sortedPasses = useMemo(() => {
    const priority: Record<number, number> = { 1: 0, 0: 1, 2: 2, 3: 3 }
    return [...passes].sort((a, b) => {
      const pa = priority[a.status] ?? 4
      const pb = priority[b.status] ?? 4
      if (pa !== pb) return pa - pb
      return (b.createdAt || '').localeCompare(a.createdAt || '')
    })
  }, [passes])

  return (
    <div className="min-h-screen bg-[#0f1117]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0f1117]/90 backdrop-blur-md border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-700/30 border border-amber-500/30 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-amber-50 tracking-wide">战令管理</h1>
              <p className="text-xs text-slate-500">九州争鼎 · 赛季战令配置与运营</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs text-slate-400 border-slate-700/50">
              <Trophy className="w-3 h-3 mr-1" />
              {passes.length} 个赛季
            </Badge>
            <Button
              onClick={() => {
                setEditingPass(null)
                setDialogOpen(true)
              }}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/20 border-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">新建赛季</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-amber-400 animate-spin mb-4" />
            <p className="text-sm text-slate-500">加载战令数据中...</p>
          </div>
        ) : sortedPasses.length === 0 ? (
          <EmptyState onCreate={() => setDialogOpen(true)} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {sortedPasses.map((pass) => (
                <SeasonCard
                  key={pass.id}
                  pass={pass}
                  isExpanded={expandedId === pass.id}
                  onToggle={() => handleToggle(pass.id)}
                  onEdit={() => {
                    setEditingPass(pass)
                    setDialogOpen(true)
                  }}
                  onArchive={() => handleArchive(pass)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Create/Edit Dialog */}
      <PassDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingPass(null)
        }}
        editingPass={editingPass}
        onSave={handleSave}
      />
    </div>
  )
}
