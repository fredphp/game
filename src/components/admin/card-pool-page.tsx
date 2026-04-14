'use client'

import { useState } from 'react'
import {
  Plus, Pencil, Eye, Power, PowerOff, TrendingUp, Clock, Zap, Users,
  ChevronDown, ChevronUp, BarChart3, X,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { mockCardPools, mockHeroes, type CardPool } from '@/lib/admin-data'

// --- Mock 7-day draw history ---
function generateDrawHistory() {
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
  return days.map((day) => ({
    day,
    draws: Math.floor(Math.random() * 8000) + 3000,
  }))
}

// --- Probability bar ---
function ProbabilityBar({ label, rate, color }: { label: string; rate: number; color: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 text-muted-foreground font-medium">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-muted/50 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(rate * 3, 100)}%` }}
        />
      </div>
      <span className="w-12 text-right font-mono font-medium">{rate}%</span>
    </div>
  )
}

// --- Pool Card ---
function PoolCard({
  pool, onEdit, onToggle, onExpand,
}: {
  pool: CardPool
  onEdit: () => void
  onToggle: () => void
  onExpand: () => void
}) {
  const typeColors: Record<string, string> = {
    normal: 'bg-stone-500/10 text-stone-600 border-stone-300',
    limited: 'bg-amber-500/10 text-amber-600 border-amber-300',
    faction: 'bg-emerald-500/10 text-emerald-600 border-emerald-300',
    start: 'bg-sky-500/10 text-sky-600 border-sky-300',
    mix: 'bg-purple-500/10 text-purple-600 border-purple-300',
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <CardTitle className="text-base font-bold">{pool.name}</CardTitle>
            <Badge variant="outline" className={typeColors[pool.type] || ''}>
              {pool.typeName}
            </Badge>
            <Badge
              variant="outline"
              className={pool.status === 1
                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-300'
                : 'bg-stone-500/10 text-stone-500 border-stone-300'
              }
            >
              <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${pool.status === 1 ? 'bg-emerald-500' : 'bg-stone-400'}`} />
              {pool.status === 1 ? '开启' : '关闭'}
            </Badge>
          </div>
        </div>
        <CardDescription className="text-xs flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {pool.startTime} ~ {pool.endTime}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Probability display */}
        <div className="space-y-1.5">
          <ProbabilityBar label="SSR" rate={pool.ssrRate} color="bg-amber-500" />
          <ProbabilityBar label="SR" rate={pool.srRate} color="bg-purple-500" />
          <ProbabilityBar label="R" rate={pool.rRate} color="bg-stone-400" />
        </div>

        {/* UP Hero */}
        {pool.upHeroName !== '-' && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium">UP: </span>
            <span className="text-sm font-bold text-amber-600">{pool.upHeroName}</span>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            <span>总抽: <span className="font-mono font-medium text-foreground">{(pool.totalDraws / 10000).toFixed(1)}万</span></span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>今日: <span className="font-mono font-medium text-foreground">{pool.todayDraws.toLocaleString()}</span></span>
          </div>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={onExpand}>
            <Eye className="w-3.5 h-3.5 mr-1" /> 详情
          </Button>
          <Button variant="outline" size="sm" className="flex-1 h-8 text-xs" onClick={onEdit}>
            <Pencil className="w-3.5 h-3.5 mr-1" /> 编辑
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`h-8 px-3 ${pool.status === 1 ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50'}`}
            onClick={onToggle}
          >
            {pool.status === 1 ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Pool Detail Panel ---
function PoolDetail({ pool, onClose }: { pool: CardPool; onClose: () => void }) {
  const drawHistory = generateDrawHistory()
  const maxDraws = Math.max(...drawHistory.map((d) => d.draws))

  return (
    <Card className="border-amber-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            <CardTitle className="text-base">{pool.name} — 详细数据</CardTitle>
          </div>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: '总抽数', value: pool.totalDraws.toLocaleString(), color: 'text-amber-600' },
            { label: '今日抽', value: pool.todayDraws.toLocaleString(), color: 'text-emerald-600' },
            { label: '软保底', value: `${pool.pityCount}抽`, color: 'text-purple-600' },
            { label: '硬保底', value: `${pool.hardPityCount}抽`, color: 'text-red-600' },
          ].map((s) => (
            <div key={s.label} className="rounded-lg bg-muted/50 p-3 text-center">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-lg font-bold font-mono mt-1 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <Separator />

        {/* 7-day draw chart */}
        <div>
          <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            近7日抽卡趋势
          </p>
          <div className="flex items-end gap-2 h-32">
            {drawHistory.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] font-mono text-muted-foreground">{(d.draws / 1000).toFixed(1)}k</span>
                <div className="w-full rounded-t-md bg-gradient-to-t from-amber-500 to-amber-400 transition-all"
                  style={{ height: `${(d.draws / maxDraws) * 100}%`, minHeight: '4px' }}
                />
                <span className="text-[10px] text-muted-foreground">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Create/Edit Dialog ---
function PoolFormDialog({
  open, onOpenChange, pool,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  pool: CardPool | null
}) {
  const isEdit = pool !== null

  const [form, setForm] = useState({
    name: pool?.name || '',
    type: pool?.type || 'normal',
    description: pool?.description || '',
    ssrRate: pool?.ssrRate?.toString() || '2.0',
    srRate: pool?.srRate?.toString() || '10.0',
    rRate: pool?.rRate?.toString() || '88.0',
    pityCount: pool?.pityCount?.toString() || '60',
    hardPityCount: pool?.hardPityCount?.toString() || '80',
    upHeroId: pool?.upHeroId?.toString() || 'none',
    startTime: pool?.startTime || '2025-01-01',
    endTime: pool?.endTime || '2099-12-31',
    status: pool?.status ?? 1,
  })

  const [rateError, setRateError] = useState('')

  const totalRate = parseFloat(form.ssrRate || '0') + parseFloat(form.srRate || '0') + parseFloat(form.rRate || '0')

  const handleSave = () => {
    if (Math.abs(totalRate - 100) > 0.01) {
      setRateError('概率总和必须等于 100%')
      return
    }
    setRateError('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑卡池' : '创建卡池'}</DialogTitle>
          <DialogDescription>
            {isEdit ? '修改卡池配置参数' : '创建一个新的招募卡池'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-3">
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">卡池名称 *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="输入卡池名称"
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">卡池类型 *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">常驻</SelectItem>
                    <SelectItem value="limited">限定</SelectItem>
                    <SelectItem value="faction">阵营</SelectItem>
                    <SelectItem value="start">新手</SelectItem>
                    <SelectItem value="mix">混合</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">描述</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="卡池描述..."
                className="text-sm min-h-[60px]"
              />
            </div>

            <Separator />

            {/* Probability */}
            <div>
              <Label className="text-xs font-semibold">概率配置</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs text-amber-600">SSR率 (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.ssrRate}
                    onChange={(e) => setForm({ ...form, ssrRate: e.target.value })}
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-purple-600">SR率 (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.srRate}
                    onChange={(e) => setForm({ ...form, srRate: e.target.value })}
                    className="h-8 text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-stone-500">R率 (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={form.rRate}
                    onChange={(e) => setForm({ ...form, rRate: e.target.value })}
                    className="h-8 text-sm font-mono"
                  />
                </div>
              </div>
              <div className={`mt-2 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-xs font-mono ${Math.abs(totalRate - 100) < 0.01 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
                合计: {totalRate.toFixed(1)}%
                {Math.abs(totalRate - 100) >= 0.01 && ' (需等于100%)'}
              </div>
              {rateError && (
                <Alert variant="destructive" className="mt-2 py-2">
                  <AlertDescription className="text-xs">{rateError}</AlertDescription>
                </Alert>
              )}
            </div>

            <Separator />

            {/* Pity Settings */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">软保底 (抽)</Label>
                <Input
                  type="number"
                  value={form.pityCount}
                  onChange={(e) => setForm({ ...form, pityCount: e.target.value })}
                  className="h-8 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">硬保底 (抽)</Label>
                <Input
                  type="number"
                  value={form.hardPityCount}
                  onChange={(e) => setForm({ ...form, hardPityCount: e.target.value })}
                  className="h-8 text-sm font-mono"
                />
              </div>
            </div>

            {/* UP Hero */}
            <div className="space-y-1.5">
              <Label className="text-xs">UP武将</Label>
              <Select value={form.upHeroId} onValueChange={(v) => setForm({ ...form, upHeroId: v })}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">无</SelectItem>
                  {mockHeroes.filter((h) => h.rarity === 'SSR').map((h) => (
                    <SelectItem key={h.id} value={h.id.toString()}>
                      {h.name} ({h.factionName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">开始时间</Label>
                <Input
                  type="date"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">结束时间</Label>
                <Input
                  type="date"
                  value={form.endTime}
                  onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center justify-between">
              <Label className="text-xs">状态</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{form.status === 1 ? '开启' : '关闭'}</span>
                <Switch
                  checked={form.status === 1}
                  onCheckedChange={(checked) => setForm({ ...form, status: checked ? 1 : 0 })}
                />
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave}>{isEdit ? '保存' : '创建'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Main Component ---
export default function CardPoolPage() {
  const [pools, setPools] = useState<CardPool[]>(mockCardPools)
  const [editPool, setEditPool] = useState<CardPool | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [expandedPoolId, setExpandedPoolId] = useState<number | null>(null)

  const handleToggle = (id: number) => {
    setPools((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: p.status === 1 ? 0 : 1 } : p))
    )
  }

  const handleEdit = (pool: CardPool) => {
    setEditPool(pool)
  }

  const expandedPool = pools.find((p) => p.id === expandedPoolId)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">卡池管理</h2>
          <p className="text-sm text-muted-foreground mt-1">管理招募卡池配置、概率、保底和UP武将</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> 新建卡池
        </Button>
      </div>

      {/* Pool Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pools.map((pool) => (
          <div key={pool.id} className="space-y-3">
            <PoolCard
              pool={pool}
              onEdit={() => handleEdit(pool)}
              onToggle={() => handleToggle(pool.id)}
              onExpand={() => setExpandedPoolId(expandedPoolId === pool.id ? null : pool.id)}
            />
            {/* Expanded Detail */}
            {expandedPoolId === pool.id && (
              <PoolDetail pool={pool} onClose={() => setExpandedPoolId(null)} />
            )}
          </div>
        ))}
      </div>

      {/* Edit Dialog */}
      {editPool && (
        <PoolFormDialog
          open={!!editPool}
          onOpenChange={(v) => { if (!v) setEditPool(null) }}
          pool={editPool}
        />
      )}

      {/* Create Dialog */}
      <PoolFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        pool={null}
      />
    </div>
  )
}
