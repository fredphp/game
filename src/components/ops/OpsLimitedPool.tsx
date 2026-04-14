'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Star,
  Edit,
  Trash2,
  Plus,
  Clock,
  Swords,
  Shield,
  Zap,
  Users,
  Eye,
  EyeOff,
  AlertCircle,
  Gem,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────
interface LimitedPool {
  id: number
  poolKey: string
  name: string
  type: 'limited' | 'faction' | 'mix' | 'rateup'
  description: string
  bannerUrl: string
  startTime: string
  endTime: string
  ssrRate: number
  srRate: number
  rRate: number
  pityCount: number
  hardPityCount: number
  upHeroId: number
  upRate: number
  totalDraws: number
  todayDraws: number
  status: number // 1=open, 0=closed
  sort: number
}

interface PoolFormData {
  poolKey: string
  name: string
  type: string
  description: string
  bannerUrl: string
  startTime: string
  endTime: string
  ssrRate: number
  srRate: number
  rRate: number
  pityCount: number
  hardPityCount: number
  upHeroId: number
  upRate: number
  totalDraws: number
  todayDraws: number
  status: number
  sort: number
}

// ─── Helpers ─────────────────────────────────────────────────────────
function formatNumber(n: number): string {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿'
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return n.toLocaleString()
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '--'
  const d = new Date(dateStr)
  return d.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const TYPE_CONFIG: Record<
  string,
  {
    label: string
    color: string
    badge: string
    gradient: string
    icon: React.ReactNode
  }
> = {
  limited: {
    label: '限定',
    color: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    gradient: 'from-red-900/40 via-red-800/20 to-transparent',
    icon: <Sparkles className="size-4 text-red-400" />,
  },
  faction: {
    label: '阵营',
    color: 'text-sky-400',
    badge: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    gradient: 'from-sky-900/40 via-sky-800/20 to-transparent',
    icon: <Users className="size-4 text-sky-400" />,
  },
  mix: {
    label: '混合',
    color: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    gradient: 'from-amber-900/40 via-amber-800/20 to-transparent',
    icon: <Zap className="size-4 text-amber-400" />,
  },
  rateup: {
    label: '概率UP',
    color: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    gradient: 'from-purple-900/40 via-purple-800/20 to-transparent',
    icon: <Star className="size-4 text-purple-400" />,
  },
}

const emptyForm: PoolFormData = {
  poolKey: '',
  name: '',
  type: 'limited',
  description: '',
  bannerUrl: '',
  startTime: '',
  endTime: '',
  ssrRate: 1.5,
  srRate: 8.5,
  rRate: 90,
  pityCount: 90,
  hardPityCount: 100,
  upHeroId: 0,
  upRate: 50,
  totalDraws: 0,
  todayDraws: 0,
  status: 1,
  sort: 0,
}

// ─── Component ───────────────────────────────────────────────────────
export default function OpsLimitedPool() {
  const [pools, setPools] = useState<LimitedPool[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 1 | 0>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPool, setEditingPool] = useState<LimitedPool | null>(null)
  const [form, setForm] = useState<PoolFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  // ─── Fetch pools ───────────────────────────────────────────────────
  const fetchPools = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', String(statusFilter))
      const res = await fetch(`/api/ops/limited-pool?${params}`)
      const json = await res.json()
      if (json.success) {
        setPools(json.data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchPools()
  }, [fetchPools])

  // ─── Filtered pools ────────────────────────────────────────────────
  const filteredPools = pools.filter(
    (p) => typeFilter === 'all' || p.type === typeFilter
  )

  // ─── Dialog helpers ────────────────────────────────────────────────
  const openCreate = () => {
    setEditingPool(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  const openEdit = (pool: LimitedPool) => {
    setEditingPool(pool)
    setForm({
      poolKey: pool.poolKey,
      name: pool.name,
      type: pool.type,
      description: pool.description,
      bannerUrl: pool.bannerUrl,
      startTime: pool.startTime,
      endTime: pool.endTime,
      ssrRate: pool.ssrRate,
      srRate: pool.srRate,
      rRate: pool.rRate,
      pityCount: pool.pityCount,
      hardPityCount: pool.hardPityCount,
      upHeroId: pool.upHeroId,
      upRate: pool.upRate,
      totalDraws: pool.totalDraws,
      todayDraws: pool.todayDraws,
      status: pool.status,
      sort: pool.sort,
    })
    setDialogOpen(true)
  }

  // ─── Save pool (create / update) ──────────────────────────────────
  const handleSave = async () => {
    setSaving(true)
    try {
      const url = '/api/ops/limited-pool'
      const body = editingPool ? { id: editingPool.id, ...form } : form
      const res = await fetch(url, {
        method: editingPool ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (json.success) {
        setDialogOpen(false)
        fetchPools()
      }
    } catch {
      // silently fail
    } finally {
      setSaving(false)
    }
  }

  // ─── Toggle status ─────────────────────────────────────────────────
  const handleToggle = async (pool: LimitedPool) => {
    const newStatus = pool.status === 1 ? 0 : 1
    try {
      await fetch('/api/ops/limited-pool', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: pool.id, status: newStatus }),
      })
      fetchPools()
    } catch {
      // silently fail
    }
  }

  // ─── Delete pool ───────────────────────────────────────────────────
  const handleDelete = async (id: number) => {
    try {
      await fetch(`/api/ops/limited-pool?id=${id}`, { method: 'DELETE' })
      setDeleteConfirm(null)
      fetchPools()
    } catch {
      // silently fail
    }
  }

  // ─── Rate sum check ────────────────────────────────────────────────
  const rateSum = form.ssrRate + form.srRate + form.rRate
  const rateValid = Math.abs(rateSum - 100) < 0.01

  // ─── Form setter ───────────────────────────────────────────────────
  const updateForm = <K extends keyof PoolFormData>(
    key: K,
    value: PoolFormData[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  // ─── Status tabs ───────────────────────────────────────────────────
  const statusTabs: { label: string; value: 'all' | 1 | 0; icon: React.ReactNode }[] = [
    { label: '全部', value: 'all', icon: <Gem className="size-3.5" /> },
    { label: '已开启', value: 1, icon: <Eye className="size-3.5" /> },
    { label: '已关闭', value: 0, icon: <EyeOff className="size-3.5" /> },
  ]

  // ─── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10">
            <Sparkles className="size-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">限时卡池</h2>
            <p className="text-sm text-slate-400">
              管理所有限时召唤卡池的配置与状态
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
        >
          <Plus className="size-4" />
          新建卡池
        </Button>
      </div>

      {/* ── Filters ───────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Status tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-slate-800/60 p-1">
          {statusTabs.map((tab) => (
            <button
              key={String(tab.value)}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                statusFilter === tab.value
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Type filter */}
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[140px] border-slate-700 bg-slate-800/60 text-slate-300">
            <SelectValue placeholder="卡池类型" />
          </SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-800">
            <SelectItem value="all" className="text-slate-200">
              全部类型
            </SelectItem>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <SelectItem key={key} value={key} className="text-slate-200">
                <span className="flex items-center gap-2">
                  {cfg.icon}
                  {cfg.label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto text-sm text-slate-500">
          共 {filteredPools.length} 个卡池
        </div>
      </div>

      {/* ── Pool cards grid ───────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-80 animate-pulse rounded-xl bg-slate-900"
            />
          ))}
        </div>
      ) : filteredPools.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-slate-700 bg-slate-900/30 py-20"
        >
          <div className="flex size-16 items-center justify-center rounded-full bg-slate-800">
            <Sparkles className="size-7 text-slate-500" />
          </div>
          <p className="text-slate-400">暂无卡池数据</p>
          <Button
            variant="outline"
            onClick={openCreate}
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
          >
            <Plus className="size-4" />
            创建第一个卡池
          </Button>
        </motion.div>
      ) : (
        <motion.div
          layout
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          <AnimatePresence mode="popLayout">
            {filteredPools.map((pool, index) => (
              <PoolCard
                key={pool.id}
                pool={pool}
                index={index}
                onToggle={() => handleToggle(pool)}
                onEdit={() => openEdit(pool)}
                onDelete={() => setDeleteConfirm(pool.id)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* ── Create / Edit Dialog ──────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-700 bg-[#0f1117] sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingPool ? '编辑卡池' : '新建卡池'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {/* Basic info */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                基本信息
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">卡池标识 (poolKey)</Label>
                  <Input
                    value={form.poolKey}
                    onChange={(e) => updateForm('poolKey', e.target.value)}
                    placeholder="limited_20240101"
                    className="border-slate-700 bg-slate-800/60 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">卡池名称</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => updateForm('name', e.target.value)}
                    placeholder="九州风云·限定"
                    className="border-slate-700 bg-slate-800/60 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">卡池类型</Label>
                  <Select
                    value={form.type}
                    onValueChange={(v) => updateForm('type', v)}
                  >
                    <SelectTrigger className="w-full border-slate-700 bg-slate-800/60 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-800">
                      {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key} className="text-slate-200">
                          <span className="flex items-center gap-2">
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">排序权重</Label>
                  <Input
                    type="number"
                    value={form.sort}
                    onChange={(e) => updateForm('sort', Number(e.target.value))}
                    className="border-slate-700 bg-slate-800/60 text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300">描述</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  placeholder="卡池描述信息..."
                  rows={2}
                  className="border-slate-700 bg-slate-800/60 text-slate-200 placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300">Banner URL</Label>
                <Input
                  value={form.bannerUrl}
                  onChange={(e) => updateForm('bannerUrl', e.target.value)}
                  placeholder="https://cdn.example.com/banner.png"
                  className="border-slate-700 bg-slate-800/60 text-slate-200 placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Time range */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                <Clock className="size-3.5" />
                时间范围
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">开始时间</Label>
                  <Input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => updateForm('startTime', e.target.value)}
                    className="border-slate-700 bg-slate-800/60 text-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">结束时间</Label>
                  <Input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => updateForm('endTime', e.target.value)}
                    className="border-slate-700 bg-slate-800/60 text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Rate configuration */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                <Star className="size-3.5" />
                概率配置
              </h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label className="text-amber-400">SSR 概率 (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.ssrRate}
                    onChange={(e) => updateForm('ssrRate', Number(e.target.value))}
                    className="border-slate-700 bg-slate-800/60 text-amber-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-purple-400">SR 概率 (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.srRate}
                    onChange={(e) => updateForm('srRate', Number(e.target.value))}
                    className="border-slate-700 bg-slate-800/60 text-purple-300"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sky-400">R 概率 (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.rRate}
                    onChange={(e) => updateForm('rRate', Number(e.target.value))}
                    className="border-slate-700 bg-slate-800/60 text-sky-300"
                  />
                </div>
              </div>
              <div
                className={cn(
                  'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                  rateValid
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                )}
              >
                {rateValid ? (
                  <Star className="size-4" />
                ) : (
                  <AlertCircle className="size-4" />
                )}
                当前总概率：{rateSum.toFixed(1)}%
                {!rateValid && '（建议总和为 100%）'}
              </div>
            </div>

            {/* Pity configuration */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                <Shield className="size-3.5" />
                保底配置
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">软保底抽数</Label>
                  <Input
                    type="number"
                    value={form.pityCount}
                    onChange={(e) => updateForm('pityCount', Number(e.target.value))}
                    className="border-slate-700 bg-slate-800/60 text-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">硬保底抽数</Label>
                  <Input
                    type="number"
                    value={form.hardPityCount}
                    onChange={(e) =>
                      updateForm('hardPityCount', Number(e.target.value))
                    }
                    className="border-slate-700 bg-slate-800/60 text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* UP hero */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                <Swords className="size-3.5" />
                UP 英雄
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">UP 英雄 ID</Label>
                  <Input
                    type="number"
                    value={form.upHeroId}
                    onChange={(e) => updateForm('upHeroId', Number(e.target.value))}
                    placeholder="0 = 无UP"
                    className="border-slate-700 bg-slate-800/60 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">UP 概率占比 (%)</Label>
                  <Input
                    type="number"
                    value={form.upRate}
                    onChange={(e) => updateForm('upRate', Number(e.target.value))}
                    className="border-slate-700 bg-slate-800/60 text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="space-y-4">
              <h4 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
                <Gem className="size-3.5" />
                抽卡统计
              </h4>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">总抽数</Label>
                  <Input
                    type="number"
                    value={form.totalDraws}
                    onChange={(e) => updateForm('totalDraws', Number(e.target.value))}
                    className="border-slate-700 bg-slate-800/60 text-slate-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">今日抽数</Label>
                  <Input
                    type="number"
                    value={form.todayDraws}
                    onChange={(e) => updateForm('todayDraws', Number(e.target.value))}
                    className="border-slate-700 bg-slate-800/60 text-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Status toggle */}
            <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/40 px-4 py-3">
              <div>
                <Label className="text-slate-200">卡池状态</Label>
                <p className="text-xs text-slate-500">
                  {form.status === 1 ? '已开启 - 玩家可进行抽卡' : '已关闭 - 卡池不可见'}
                </p>
              </div>
              <Switch
                checked={form.status === 1}
                onCheckedChange={(checked) =>
                  updateForm('status', checked ? 1 : 0)
                }
                className="data-[state=checked]:bg-emerald-600"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {saving ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="size-4 rounded-full border-2 border-white/30 border-t-white"
                />
              ) : null}
              {editingPool ? '保存修改' : '创建卡池'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation ───────────────────────────────────── */}
      <Dialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <DialogContent className="border-slate-700 bg-[#0f1117] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">确认删除</DialogTitle>
          </DialogHeader>
          <p className="text-slate-400">
            此操作将永久删除该卡池配置，无法恢复。确定要继续吗？
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              <Trash2 className="size-4" />
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Pool Card Sub-component ─────────────────────────────────────────
function PoolCard({
  pool,
  index,
  onToggle,
  onEdit,
  onDelete,
}: {
  pool: LimitedPool
  index: number
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const typeCfg = TYPE_CONFIG[pool.type] || TYPE_CONFIG.limited
  const isOpen = pool.status === 1
  const rateTotal = pool.ssrRate + pool.srRate + pool.rRate

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <div
        className={cn(
          'group relative overflow-hidden rounded-xl border transition-all duration-300',
          isOpen
            ? 'border-slate-700/80 bg-slate-900 shadow-lg shadow-black/20'
            : 'border-slate-800 bg-slate-900/60 opacity-70'
        )}
      >
        {/* Banner gradient area */}
        <div
          className={cn(
            'relative bg-gradient-to-br p-5 pb-4',
            typeCfg.gradient
          )}
        >
          {/* Type badge */}
          <div className="flex items-center justify-between">
            <Badge
              className={cn('gap-1 text-xs', typeCfg.badge)}
            >
              {typeCfg.icon}
              {typeCfg.label}
            </Badge>
            <div className="flex items-center gap-2">
              {isOpen && (
                <motion.div
                  className="size-2 rounded-full bg-emerald-400"
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
              <span
                className={cn(
                  'text-xs font-medium',
                  isOpen ? 'text-emerald-400' : 'text-slate-500'
                )}
              >
                {isOpen ? '进行中' : '已关闭'}
              </span>
            </div>
          </div>

          {/* Pool name & key */}
          <h3 className="mt-3 text-lg font-bold text-white">{pool.name}</h3>
          <p className="mt-0.5 text-xs text-slate-400">
            {pool.poolKey}
          </p>

          {/* UP hero */}
          {pool.upHeroId > 0 && (
            <div className="mt-2 flex items-center gap-1.5 rounded-md bg-white/5 px-2 py-1">
              <Swords className="size-3 text-amber-400" />
              <span className="text-xs text-amber-300">
                UP英雄 #{pool.upHeroId}
              </span>
              <span className="text-xs text-slate-400">({pool.upRate}%)</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="space-y-4 p-5">
          {/* Description */}
          {pool.description && (
            <p className="line-clamp-2 text-sm text-slate-400">
              {pool.description}
            </p>
          )}

          {/* Rate bars */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-8 font-semibold text-amber-400">SSR</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(pool.ssrRate / rateTotal) * 100}%` }}
                  transition={{ duration: 0.8, delay: index * 0.05 + 0.2 }}
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                />
              </div>
              <span className="w-14 text-right text-slate-400">
                {pool.ssrRate}%
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-8 font-semibold text-purple-400">SR</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(pool.srRate / rateTotal) * 100}%` }}
                  transition={{ duration: 0.8, delay: index * 0.05 + 0.3 }}
                  className="h-full rounded-full bg-gradient-to-r from-purple-500 to-purple-400"
                />
              </div>
              <span className="w-14 text-right text-slate-400">
                {pool.srRate}%
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="w-8 font-semibold text-sky-400">R</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(pool.rRate / rateTotal) * 100}%` }}
                  transition={{ duration: 0.8, delay: index * 0.05 + 0.4 }}
                  className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400"
                />
              </div>
              <span className="w-14 text-right text-slate-400">
                {pool.rRate}%
              </span>
            </div>
          </div>

          {/* Pity info */}
          <div className="flex items-center gap-4 rounded-lg bg-slate-800/50 px-3 py-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Shield className="size-3.5" />
              <span>软保底</span>
              <span className="font-semibold text-slate-200">
                {pool.pityCount}
              </span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Shield className="size-3.5" />
              <span>硬保底</span>
              <span className="font-semibold text-slate-200">
                {pool.hardPityCount}
              </span>
            </div>
          </div>

          {/* Draw stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-slate-800/50 px-3 py-2">
              <div className="text-xs text-slate-500">总抽数</div>
              <div className="mt-0.5 text-sm font-bold text-white">
                {formatNumber(pool.totalDraws)}
              </div>
            </div>
            <div className="rounded-lg bg-slate-800/50 px-3 py-2">
              <div className="text-xs text-slate-500">今日抽数</div>
              <div className="mt-0.5 text-sm font-bold text-emerald-400">
                {formatNumber(pool.todayDraws)}
              </div>
            </div>
          </div>

          {/* Time range */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Clock className="size-3.5 shrink-0" />
            <span>
              {formatDate(pool.startTime)} ~ {formatDate(pool.endTime)}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-3">
            <Switch
              checked={isOpen}
              onCheckedChange={onToggle}
              className="data-[state=checked]:bg-emerald-600"
            />
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={onEdit}
                className="h-8 gap-1 text-slate-400 hover:text-amber-400 hover:bg-amber-400/10"
              >
                <Edit className="size-3.5" />
                <span className="text-xs">编辑</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onDelete}
                className="h-8 gap-1 text-slate-400 hover:text-red-400 hover:bg-red-400/10"
              >
                <Trash2 className="size-3.5" />
                <span className="text-xs">删除</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
