'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import {
  Flame, PartyPopper, Plus, Edit, Trash2, Power, PowerOff, Calendar, Users, Trophy,
  RotateCcw, Search, Mail, Gift, ChevronDown, ChevronUp, Send, Eye, EyeOff,
  PackageOpen, Sparkles, Swords, Star, Zap, Clock, Crown, Shield, Target, MessageSquare,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import type { Activity, BattlePass, LimitedPool, GameMail, BattlePassLevel } from '@/lib/admin-data'

// ==================== Shared Colors ====================
const typeColors: Record<string, string> = {
  gacha: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  war: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  growth: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  festival: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  guild: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
}

const poolTypeColors: Record<string, string> = {
  limited: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  faction: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  mix: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  rateup: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
}

const poolTypeLabels: Record<string, string> = {
  limited: '限定', faction: '阵营', mix: '混合', rateup: '概率UP',
}

const mailCategoryColors: Record<string, string> = {
  system: 'bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300',
  reward: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  activity: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  notification: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  social: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  guild: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
}

const mailCategoryLabels: Record<string, string> = {
  system: '系统', reward: '奖励', activity: '活动', notification: '通知', social: '社交', guild: '联盟',
}

// ==================== Loading Skeletons ====================
function KpiSkeleton() {
  return (
    <Card className="border-dashed">
      <CardContent className="pt-4 pb-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-1">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-20" />
        </div>
      </CardContent>
    </Card>
  )
}

function CardSkeleton() {
  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-32 mb-2" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-2 w-full" />
      </CardContent>
    </Card>
  )
}

// ==================== Main Component ====================
export default function OperationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full bg-gradient-to-b from-rose-500 to-orange-500" />
          <div>
            <h2 className="text-2xl font-bold">运营系统</h2>
            <p className="text-sm text-muted-foreground">活动管理 · 战令配置 · 限时卡池 · 邮件推送</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="activity" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="activity" className="gap-1.5">
            <PartyPopper className="h-4 w-4 text-rose-500" />
            <span className="hidden sm:inline">活动系统</span>
            <span className="sm:hidden">活动</span>
          </TabsTrigger>
          <TabsTrigger value="battlepass" className="gap-1.5">
            <Crown className="h-4 w-4 text-amber-500" />
            <span className="hidden sm:inline">战令系统</span>
            <span className="sm:hidden">战令</span>
          </TabsTrigger>
          <TabsTrigger value="limitedpool" className="gap-1.5">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <span className="hidden sm:inline">限时卡池</span>
            <span className="sm:hidden">卡池</span>
          </TabsTrigger>
          <TabsTrigger value="mail" className="gap-1.5">
            <Mail className="h-4 w-4 text-sky-500" />
            <span className="hidden sm:inline">邮件系统</span>
            <span className="sm:hidden">邮件</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity"><ActivityTab /></TabsContent>
        <TabsContent value="battlepass"><BattlePassTab /></TabsContent>
        <TabsContent value="limitedpool"><LimitedPoolTab /></TabsContent>
        <TabsContent value="mail"><MailTab /></TabsContent>
      </Tabs>
    </div>
  )
}

// ==================== Tab 1: Activity System ====================
function ActivityTab() {
  const { toast } = useToast()
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editActivity, setEditActivity] = useState<Activity | null>(null)
  const [deleteActivity, setDeleteActivity] = useState<Activity | null>(null)
  const [formData, setFormData] = useState({ name: '', type: 'gacha', description: '', startTime: '', endTime: '', rewards: '' })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ops/activity')
      const json = await res.json()
      if (json.code === 0) setActivities(json.data)
    } catch {
      toast({ title: '加载失败', description: '无法获取活动数据', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredActivities = useMemo(() => {
    return activities.filter(a => {
      const matchSearch = !searchTerm || a.name.includes(searchTerm) || a.description.includes(searchTerm)
      const matchType = typeFilter === 'all' || a.type === typeFilter
      const matchStatus = statusFilter === 'all' || a.status === statusFilter
      return matchSearch && matchType && matchStatus
    })
  }, [activities, searchTerm, typeFilter, statusFilter])

  const stats = useMemo(() => ({
    active: activities.filter(a => a.status === 'active').length,
    participants: activities.reduce((s, a) => s + a.participants, 0),
    avgCompletion: activities.filter(a => a.status !== 'upcoming').length > 0
      ? (activities.filter(a => a.status !== 'upcoming').reduce((s, a) => s + a.completionRate, 0) / activities.filter(a => a.status !== 'upcoming').length).toFixed(1)
      : '0'
  }), [activities])

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/ops/activity', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      const json = await res.json()
      if (json.code === 0) {
        toast({ title: '创建成功', description: `活动「${formData.name}」已创建` })
        setCreateDialogOpen(false); resetForm(); fetchData()
      } else { toast({ title: '创建失败', description: json.message, variant: 'destructive' }) }
    } catch { toast({ title: '错误', description: '网络异常', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  const handleEdit = async () => {
    if (!editActivity) return
    setSaving(true)
    try {
      const res = await fetch('/api/ops/activity', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editActivity.id, ...formData }) })
      const json = await res.json()
      if (json.code === 0) {
        toast({ title: '更新成功' }); setEditActivity(null); resetForm(); fetchData()
      } else { toast({ title: '更新失败', description: json.message, variant: 'destructive' }) }
    } catch { toast({ title: '错误', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  const handleToggle = async (activity: Activity) => {
    const newStatus = activity.status === 'active' ? 'ended' : 'active'
    try {
      await fetch('/api/ops/activity', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: activity.id, status: newStatus }) })
      toast({ title: newStatus === 'active' ? '已开启' : '已关闭' })
      fetchData()
    } catch { toast({ title: '操作失败', variant: 'destructive' }) }
  }

  const handleDelete = async () => {
    if (!deleteActivity) return
    try {
      await fetch(`/api/ops/activity?id=${deleteActivity.id}`, { method: 'DELETE' })
      toast({ title: '删除成功' }); setDeleteActivity(null); fetchData()
    } catch { toast({ title: '删除失败', variant: 'destructive' }) }
  }

  const openEdit = (a: Activity) => { setFormData({ name: a.name, type: a.type, description: a.description, startTime: a.startTime, endTime: a.endTime, rewards: a.rewards }); setEditActivity(a) }
  const resetForm = () => setFormData({ name: '', type: 'gacha', description: '', startTime: '', endTime: '', rewards: '' })

  if (loading) return <div className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[0,1,2].map(i=><KpiSkeleton key={i}/>)}</div><div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[0,1,2,3].map(i=><CardSkeleton key={i}/>)}</div></div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20"><CardContent className="pt-4 pb-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50"><PartyPopper className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold text-emerald-600">{stats.active}</p><p className="text-xs text-muted-foreground">进行中活动</p></div></CardContent></Card>
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20"><CardContent className="pt-4 pb-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50"><Users className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold text-amber-600">{stats.participants.toLocaleString()}</p><p className="text-xs text-muted-foreground">参与人次</p></div></CardContent></Card>
        <Card className="border-sky-200 bg-sky-50/50 dark:bg-sky-950/20"><CardContent className="pt-4 pb-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/50"><Trophy className="w-5 h-5 text-sky-600" /></div><div><p className="text-2xl font-bold text-sky-600">{stats.avgCompletion}%</p><p className="text-xs text-muted-foreground">平均完成率</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="搜索活动名称..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <Select value={typeFilter} onValueChange={setTypeFilter}><SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="类型" /></SelectTrigger><SelectContent><SelectItem value="all">全部类型</SelectItem><SelectItem value="gacha">抽卡活动</SelectItem><SelectItem value="war">战争活动</SelectItem><SelectItem value="growth">成长活动</SelectItem><SelectItem value="festival">节日活动</SelectItem><SelectItem value="guild">联盟活动</SelectItem></SelectContent></Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="状态" /></SelectTrigger><SelectContent><SelectItem value="all">全部状态</SelectItem><SelectItem value="active">进行中</SelectItem><SelectItem value="upcoming">即将开始</SelectItem><SelectItem value="ended">已结束</SelectItem></SelectContent></Select>
            <Button variant="outline" onClick={() => { setSearchTerm(''); setTypeFilter('all'); setStatusFilter('all') }}><RotateCcw className="w-4 h-4 mr-1" />重置</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}><Plus className="w-4 h-4 mr-1" />创建活动</Button></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredActivities.map(activity => (
          <Card key={activity.id} className={`hover:shadow-md transition-all ${activity.status === 'ended' ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-bold">{activity.name}</CardTitle>
                    <Badge className={`text-xs border ${typeColors[activity.type]}`}>{activity.typeName}</Badge>
                    <Badge className={`text-xs ${activity.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : activity.status === 'upcoming' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' : 'bg-stone-100 text-stone-600 dark:bg-stone-900 dark:text-stone-400'}`}>{activity.status === 'active' ? '进行中' : activity.status === 'upcoming' ? '即将开始' : '已结束'}</Badge>
                  </div>
                  <CardDescription className="mt-1">{activity.description}</CardDescription>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => openEdit(activity)}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => handleToggle(activity)}>
                    {activity.status === 'active' ? <PowerOff className="w-3.5 h-3.5 text-red-500" /> : <Power className="w-3.5 h-3.5 text-emerald-500" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => setDeleteActivity(activity)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="w-3.5 h-3.5" /><span>{activity.startTime} ~ {activity.endTime}</span></div>
              <div className="rounded-lg bg-muted/30 p-3"><p className="text-xs text-muted-foreground mb-1">奖励配置</p><p className="text-sm">{activity.rewards}</p></div>
              {activity.status !== 'upcoming' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">参与人数</span><span className="font-semibold">{activity.participants.toLocaleString()}</span></div>
                  <div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">完成率</span><span className="font-semibold">{activity.completionRate}%</span></div>
                  <Progress value={activity.completionRate} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredActivities.length === 0 && (<Card className="border-dashed"><CardContent className="pt-10 pb-10 text-center"><PartyPopper className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" /><p className="text-muted-foreground">没有匹配的活动</p></CardContent></Card>)}

      <Dialog open={createDialogOpen || !!editActivity} onOpenChange={open => { setCreateDialogOpen(false); setEditActivity(null); resetForm() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editActivity ? '编辑活动' : '创建活动'}</DialogTitle><DialogDescription>{editActivity ? '修改活动配置信息' : '创建新的游戏活动'}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>活动名称</Label><Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="输入活动名称" /></div>
            <div className="space-y-2"><Label>活动类型</Label><Select value={formData.type} onValueChange={v => setFormData(p => ({ ...p, type: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="gacha">抽卡活动</SelectItem><SelectItem value="war">战争活动</SelectItem><SelectItem value="growth">成长活动</SelectItem><SelectItem value="festival">节日活动</SelectItem><SelectItem value="guild">联盟活动</SelectItem></SelectContent></Select></div>
            <div className="space-y-2"><Label>活动描述</Label><Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="输入活动描述" rows={3} /></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>开始时间</Label><Input type="datetime-local" value={formData.startTime} onChange={e => setFormData(p => ({ ...p, startTime: e.target.value }))} /></div><div className="space-y-2"><Label>结束时间</Label><Input type="datetime-local" value={formData.endTime} onChange={e => setFormData(p => ({ ...p, endTime: e.target.value }))} /></div></div>
            <div className="space-y-2"><Label>奖励配置</Label><Textarea value={formData.rewards} onChange={e => setFormData(p => ({ ...p, rewards: e.target.value }))} placeholder="输入奖励配置" rows={3} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setCreateDialogOpen(false); setEditActivity(null); resetForm() }}>取消</Button><Button onClick={editActivity ? handleEdit : handleCreate} disabled={!formData.name || saving}>{saving ? '处理中...' : editActivity ? '保存' : '创建'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteActivity} onOpenChange={() => setDeleteActivity(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>确认删除活动</AlertDialogTitle><AlertDialogDescription>确定要删除活动「{deleteActivity?.name}」吗？此操作不可撤销。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">确认删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ==================== Tab 2: Battle Pass ====================
function BattlePassTab() {
  const { toast } = useToast()
  const [passes, setPasses] = useState<BattlePass[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [levels, setLevels] = useState<BattlePassLevel[]>([])
  const [levelsLoading, setLevelsLoading] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({ title: '', description: '', startTime: '', endTime: '', freePrice: 0, premiumPrice: 328, totalExp: 50000 })
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ops/battle-pass')
      const json = await res.json()
      if (json.code === 0) setPasses(json.data)
    } catch { toast({ title: '加载失败', variant: 'destructive' }) }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const handleToggleExpand = async (pass: BattlePass) => {
    if (expandedId === pass.id) { setExpandedId(null); return }
    setExpandedId(pass.id)
    setLevelsLoading(true)
    try {
      const res = await fetch(`/api/ops/battle-pass?passId=${pass.id}`)
      const json = await res.json()
      if (json.code === 0) setLevels(json.data.levels || [])
    } catch { toast({ title: '加载等级失败', variant: 'destructive' }) }
    finally { setLevelsLoading(false) }
  }

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/ops/battle-pass', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      const json = await res.json()
      if (json.code === 0) { toast({ title: '创建成功' }); setCreateDialogOpen(false); resetForm(); fetchData() }
      else toast({ title: '创建失败', description: json.message, variant: 'destructive' })
    } catch { toast({ title: '错误', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  const resetForm = () => setFormData({ title: '', description: '', startTime: '', endTime: '', freePrice: 0, premiumPrice: 328, totalExp: 50000 })

  const stats = useMemo(() => ({
    active: passes.filter(p => p.status === 1).length,
    participants: passes.reduce((s, p) => s + p.participants, 0),
    premiumRate: passes.filter(p => p.participants > 0).length > 0
      ? (passes.reduce((s, p) => s + p.premiumUsers, 0) / passes.reduce((s, p) => s + p.participants, 0) * 100).toFixed(1)
      : '0'
  }), [passes])

  if (loading) return <div className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[0,1,2].map(i=><KpiSkeleton key={i}/>)}</div><div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[0,1].map(i=><CardSkeleton key={i}/>)}</div></div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-violet-200 bg-violet-50/50 dark:bg-violet-950/20"><CardContent className="pt-4 pb-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/50"><Crown className="w-5 h-5 text-violet-600" /></div><div><p className="text-2xl font-bold text-violet-600">{stats.active}</p><p className="text-xs text-muted-foreground">进行中赛季</p></div></CardContent></Card>
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20"><CardContent className="pt-4 pb-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50"><Users className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold text-amber-600">{stats.participants.toLocaleString()}</p><p className="text-xs text-muted-foreground">总参与人数</p></div></CardContent></Card>
        <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/20"><CardContent className="pt-4 pb-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50"><Star className="w-5 h-5 text-rose-600" /></div><div><p className="text-2xl font-bold text-rose-600">{stats.premiumRate}%</p><p className="text-xs text-muted-foreground">高级战令率</p></div></CardContent></Card>
      </div>

      <div className="flex justify-end"><Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}><Plus className="w-4 h-4 mr-1" />创建战令</Button></div>

      <div className="space-y-4">
        {passes.map(pass => (
          <Card key={pass.id} className="hover:shadow-md transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-bold">{pass.title}</CardTitle>
                    <Badge className={`text-xs ${pass.status === 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-stone-100 text-stone-600 dark:bg-stone-900 dark:text-stone-400'}`}>{pass.status === 1 ? '进行中' : '已结束'}</Badge>
                  </div>
                  <CardDescription className="mt-1">{pass.description}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleToggleExpand(pass)} className="ml-2 gap-1">
                  {expandedId === pass.id ? <><ChevronUp className="w-3.5 h-3.5" />收起</> : <><ChevronDown className="w-3.5 h-3.5" />展开等级</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{pass.startTime} ~ {pass.endTime}</span>
                <span className="flex items-center gap-1"><Gift className="w-3.5 h-3.5" />免费 · 免费版: ¥{pass.freePrice}</span>
                <span className="flex items-center gap-1"><Crown className="w-3.5 h-3.5 text-amber-500" />高级版: ¥{pass.premiumPrice}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted/30 p-3 text-center"><p className="text-xs text-muted-foreground">参与人数</p><p className="text-lg font-bold">{pass.participants.toLocaleString()}</p></div>
                <div className="rounded-lg bg-muted/30 p-3 text-center"><p className="text-xs text-muted-foreground">高级用户</p><p className="text-lg font-bold text-amber-600">{pass.premiumUsers.toLocaleString()}</p></div>
                <div className="rounded-lg bg-muted/30 p-3 text-center"><p className="text-xs text-muted-foreground">总经验值</p><p className="text-lg font-bold">{pass.totalExp.toLocaleString()}</p></div>
              </div>
              {pass.participants > 0 && <div className="space-y-2"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">参与进度</span><span className="font-semibold">{pass.participants.toLocaleString()} 人</span></div><Progress value={Math.min(100, pass.participants / 1000)} className="h-2" /></div>}

              {expandedId === pass.id && levelsLoading && <div className="space-y-2 pt-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>}

              {expandedId === pass.id && !levelsLoading && levels.length > 0 && (
                <div className="pt-4 border-t">
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader><TableRow><TableHead className="w-16">等级</TableHead><TableHead className="w-24">所需经验</TableHead><TableHead>免费奖励</TableHead><TableHead>高级奖励</TableHead></TableRow></TableHeader>
                      <TableBody>
                        {levels.map(lvl => (
                          <TableRow key={lvl.id}>
                            <TableCell className="font-mono text-center font-semibold">{lvl.level}</TableCell>
                            <TableCell className="font-mono text-center text-xs">{lvl.requiredExp.toLocaleString()}</TableCell>
                            <TableCell className="text-xs">{lvl.freeRewards}</TableCell>
                            <TableCell className="text-xs text-amber-600 dark:text-amber-400 font-medium">{lvl.premiumRewards}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {passes.length === 0 && (<Card className="border-dashed"><CardContent className="pt-10 pb-10 text-center"><Crown className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" /><p className="text-muted-foreground">暂无战令数据</p></CardContent></Card>)}

      <Dialog open={createDialogOpen} onOpenChange={open => { setCreateDialogOpen(false); resetForm() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>创建战令赛季</DialogTitle><DialogDescription>创建新的战令赛季并配置奖励</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>赛季标题</Label><Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="如: S4·赛季名称" /></div>
            <div className="space-y-2"><Label>赛季描述</Label><Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>开始时间</Label><Input type="datetime-local" value={formData.startTime} onChange={e => setFormData(p => ({ ...p, startTime: e.target.value }))} /></div><div className="space-y-2"><Label>结束时间</Label><Input type="datetime-local" value={formData.endTime} onChange={e => setFormData(p => ({ ...p, endTime: e.target.value }))} /></div></div>
            <div className="grid grid-cols-3 gap-3"><div className="space-y-2"><Label>免费价格 (¥)</Label><Input type="number" value={formData.freePrice} onChange={e => setFormData(p => ({ ...p, freePrice: Number(e.target.value) }))} /></div><div className="space-y-2"><Label>高级价格 (¥)</Label><Input type="number" value={formData.premiumPrice} onChange={e => setFormData(p => ({ ...p, premiumPrice: Number(e.target.value) }))} /></div><div className="space-y-2"><Label>总经验值</Label><Input type="number" value={formData.totalExp} onChange={e => setFormData(p => ({ ...p, totalExp: Number(e.target.value) }))} /></div></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm() }}>取消</Button><Button onClick={handleCreate} disabled={!formData.title || saving}>{saving ? '处理中...' : '创建'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ==================== Tab 3: Limited Pools ====================
function LimitedPoolTab() {
  const { toast } = useToast()
  const [pools, setPools] = useState<LimitedPool[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editPool, setEditPool] = useState<LimitedPool | null>(null)
  const [deletePool, setDeletePool] = useState<LimitedPool | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({ name: '', type: 'limited' as LimitedPool['type'], description: '', poolKey: '', startTime: '', endTime: '', ssrRate: 2.0, srRate: 10.0, rRate: 88.0, pityCount: 60, hardPityCount: 80, upHeroId: 0, upRate: 50, status: 0 })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ops/limited-pool')
      const json = await res.json()
      if (json.code === 0) setPools(json.data)
    } catch { toast({ title: '加载失败', variant: 'destructive' }) }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const stats = useMemo(() => ({
    active: pools.filter(p => p.status === 1).length,
    todayDraws: pools.reduce((s, p) => s + p.todayDraws, 0),
    avgSSR: pools.filter(p => p.status === 1).length > 0 ? (pools.filter(p => p.status === 1).reduce((s, p) => s + p.ssrRate, 0) / pools.filter(p => p.status === 1).length).toFixed(2) : '0',
  }), [pools])

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/ops/limited-pool', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      const json = await res.json()
      if (json.code === 0) { toast({ title: '创建成功' }); setCreateDialogOpen(false); resetForm(); fetchData() }
      else toast({ title: '创建失败', variant: 'destructive' })
    } catch { toast({ title: '错误', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  const handleEdit = async () => {
    if (!editPool) return
    setSaving(true)
    try {
      const res = await fetch('/api/ops/limited-pool', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editPool.id, ...formData }) })
      const json = await res.json()
      if (json.code === 0) { toast({ title: '更新成功' }); setEditPool(null); resetForm(); fetchData() }
      else toast({ title: '更新失败', variant: 'destructive' })
    } catch { toast({ title: '错误', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  const handleToggle = async (pool: LimitedPool) => {
    const newStatus = pool.status === 1 ? 0 : 1
    try {
      await fetch('/api/ops/limited-pool', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: pool.id, status: newStatus }) })
      toast({ title: newStatus === 1 ? '已开启' : '已关闭' }); fetchData()
    } catch { toast({ title: '操作失败', variant: 'destructive' }) }
  }

  const handleDelete = async () => {
    if (!deletePool) return
    try {
      await fetch(`/api/ops/limited-pool?id=${deletePool.id}`, { method: 'DELETE' })
      toast({ title: '删除成功' }); setDeletePool(null); fetchData()
    } catch { toast({ title: '删除失败', variant: 'destructive' }) }
  }

  const openEdit = (p: LimitedPool) => { setFormData({ name: p.name, type: p.type, description: p.description, poolKey: p.poolKey, startTime: p.startTime, endTime: p.endTime, ssrRate: p.ssrRate, srRate: p.srRate, rRate: p.rRate, pityCount: p.pityCount, hardPityCount: p.hardPityCount, upHeroId: p.upHeroId, upRate: p.upRate, status: p.status }); setEditPool(p) }
  const resetForm = () => setFormData({ name: '', type: 'limited', description: '', poolKey: '', startTime: '', endTime: '', ssrRate: 2.0, srRate: 10.0, rRate: 88.0, pityCount: 60, hardPityCount: 80, upHeroId: 0, upRate: 50, status: 0 })

  if (loading) return <div className="space-y-4"><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[0,1,2].map(i=><KpiSkeleton key={i}/>)}</div><div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{[0,1,2].map(i=><CardSkeleton key={i}/>)}</div></div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-violet-200 bg-violet-50/50 dark:bg-violet-950/20"><CardContent className="pt-4 pb-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-violet-100 dark:bg-violet-900/50"><Sparkles className="w-5 h-5 text-violet-600" /></div><div><p className="text-2xl font-bold text-violet-600">{stats.active}</p><p className="text-xs text-muted-foreground">活跃卡池</p></div></CardContent></Card>
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20"><CardContent className="pt-4 pb-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50"><Zap className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold text-amber-600">{stats.todayDraws.toLocaleString()}</p><p className="text-xs text-muted-foreground">今日抽数</p></div></CardContent></Card>
        <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/20"><CardContent className="pt-4 pb-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50"><Flame className="w-5 h-5 text-rose-600" /></div><div><p className="text-2xl font-bold text-rose-600">{stats.avgSSR}%</p><p className="text-xs text-muted-foreground">平均SSR率</p></div></CardContent></Card>
      </div>

      <div className="flex justify-end"><Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}><Plus className="w-4 h-4 mr-1" />创建卡池</Button></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {pools.map(pool => (
          <Card key={pool.id} className={`hover:shadow-md transition-all ${pool.status === 0 ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-bold">{pool.name}</CardTitle>
                    <Badge className={`text-xs border ${poolTypeColors[pool.type]}`}>{poolTypeLabels[pool.type]}</Badge>
                    <Badge className={`text-xs ${pool.status === 1 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-stone-100 text-stone-600 dark:bg-stone-900 dark:text-stone-400'}`}>{pool.status === 1 ? '开启' : '关闭'}</Badge>
                  </div>
                  <CardDescription className="mt-1">{pool.description}</CardDescription>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => openEdit(pool)}><Edit className="w-3.5 h-3.5" /></Button>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => handleToggle(pool)}>
                    {pool.status === 1 ? <PowerOff className="w-3.5 h-3.5 text-red-500" /> : <Power className="w-3.5 h-3.5 text-emerald-500" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7" onClick={() => setDeletePool(pool)}><Trash2 className="w-3.5 h-3.5 text-red-500" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Calendar className="w-3.5 h-3.5" /><span>{pool.startTime} ~ {pool.endTime}</span></div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-muted/30 p-2 text-center"><p className="text-[10px] text-muted-foreground">总抽数</p><p className="text-sm font-bold font-mono">{(pool.totalDraws / 10000).toFixed(1)}万</p></div>
                <div className="rounded-lg bg-muted/30 p-2 text-center"><p className="text-[10px] text-muted-foreground">今日</p><p className="text-sm font-bold font-mono text-amber-600">{pool.todayDraws.toLocaleString()}</p></div>
                <div className="rounded-lg bg-muted/30 p-2 text-center"><p className="text-[10px] text-muted-foreground">UP概率</p><p className="text-sm font-bold font-mono text-rose-600">{pool.upRate}%</p></div>
              </div>

              <Separator />

              <div className="grid grid-cols-3 gap-2 text-center">
                <div><p className="text-[10px] text-muted-foreground">SSR</p><p className="text-sm font-bold text-amber-600 font-mono">{pool.ssrRate}%</p></div>
                <div><p className="text-[10px] text-muted-foreground">SR</p><p className="text-sm font-bold text-violet-600 font-mono">{pool.srRate}%</p></div>
                <div><p className="text-[10px] text-muted-foreground">R</p><p className="text-sm font-bold text-stone-600 font-mono">{pool.rRate}%</p></div>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>保底: {pool.pityCount}抽 / 硬保底: {pool.hardPityCount}抽</span>
                {pool.upHeroId > 0 && <span className="text-rose-600 font-medium">UP英雄 ID: {pool.upHeroId}</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pools.length === 0 && (<Card className="border-dashed"><CardContent className="pt-10 pb-10 text-center"><Sparkles className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" /><p className="text-muted-foreground">暂无卡池数据</p></CardContent></Card>)}

      <Dialog open={createDialogOpen || !!editPool} onOpenChange={open => { setCreateDialogOpen(false); setEditPool(null); resetForm() }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editPool ? '编辑卡池' : '创建卡池'}</DialogTitle><DialogDescription>{editPool ? '修改卡池配置' : '创建新的限时卡池'}</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>卡池名称</Label><Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>卡池类型</Label><Select value={formData.type} onValueChange={v => setFormData(p => ({ ...p, type: v as LimitedPool['type'] }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="limited">限定</SelectItem><SelectItem value="faction">阵营</SelectItem><SelectItem value="mix">混合</SelectItem><SelectItem value="rateup">概率UP</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>卡池标识</Label><Input value={formData.poolKey} onChange={e => setFormData(p => ({ ...p, poolKey: e.target.value }))} placeholder="pool_key" /></div>
            </div>
            <div className="space-y-2"><Label>描述</Label><Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
            <div className="grid grid-cols-2 gap-3"><div className="space-y-2"><Label>开始时间</Label><Input type="datetime-local" value={formData.startTime} onChange={e => setFormData(p => ({ ...p, startTime: e.target.value }))} /></div><div className="space-y-2"><Label>结束时间</Label><Input type="datetime-local" value={formData.endTime} onChange={e => setFormData(p => ({ ...p, endTime: e.target.value }))} /></div></div>
            <div className="grid grid-cols-3 gap-3"><div className="space-y-2"><Label>SSR率 (%)</Label><Input type="number" step="0.1" value={formData.ssrRate} onChange={e => setFormData(p => ({ ...p, ssrRate: Number(e.target.value) }))} /></div><div className="space-y-2"><Label>SR率 (%)</Label><Input type="number" step="0.1" value={formData.srRate} onChange={e => setFormData(p => ({ ...p, srRate: Number(e.target.value) }))} /></div><div className="space-y-2"><Label>R率 (%)</Label><Input type="number" step="0.1" value={formData.rRate} onChange={e => setFormData(p => ({ ...p, rRate: Number(e.target.value) }))} /></div></div>
            <div className="grid grid-cols-3 gap-3"><div className="space-y-2"><Label>软保底</Label><Input type="number" value={formData.pityCount} onChange={e => setFormData(p => ({ ...p, pityCount: Number(e.target.value) }))} /></div><div className="space-y-2"><Label>硬保底</Label><Input type="number" value={formData.hardPityCount} onChange={e => setFormData(p => ({ ...p, hardPityCount: Number(e.target.value) }))} /></div><div className="space-y-2"><Label>UP英雄ID</Label><Input type="number" value={formData.upHeroId} onChange={e => setFormData(p => ({ ...p, upHeroId: Number(e.target.value) }))} /></div></div>
            <div className="space-y-2"><Label>UP概率 (%)</Label><Input type="number" step="0.1" value={formData.upRate} onChange={e => setFormData(p => ({ ...p, upRate: Number(e.target.value) }))} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setCreateDialogOpen(false); setEditPool(null); resetForm() }}>取消</Button><Button onClick={editPool ? handleEdit : handleCreate} disabled={!formData.name || saving}>{saving ? '处理中...' : editPool ? '保存' : '创建'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePool} onOpenChange={() => setDeletePool(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>确认删除卡池</AlertDialogTitle><AlertDialogDescription>确定要删除卡池「{deletePool?.name}」吗？</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">确认删除</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ==================== Tab 4: Mail System ====================
function MailTab() {
  const { toast } = useToast()
  const [mails, setMails] = useState<GameMail[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [readFilter, setReadFilter] = useState('all')
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sendForm, setSendForm] = useState({ receiverIds: '', title: '', content: '', category: 'system', senderType: 'system', attachments: '{}' })

  const [stats, setStats] = useState({ total: 0, unread: 0, rewardPending: 0, todaySent: 0 })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/ops/mail')
      const json = await res.json()
      if (json.code === 0) {
        setMails(json.data.mails)
        setStats(json.data.stats)
      }
    } catch { toast({ title: '加载失败', variant: 'destructive' }) }
    finally { setLoading(false) }
  }, [toast])

  useEffect(() => { fetchData() }, [fetchData])

  const filteredMails = useMemo(() => {
    return mails.filter(m => {
      if (m.isDeleted) return false
      const matchSearch = !searchTerm || m.title.includes(searchTerm) || m.content.includes(searchTerm) || m.senderName.includes(searchTerm)
      const matchCategory = categoryFilter === 'all' || m.category === categoryFilter
      const matchRead = readFilter === 'all' || (readFilter === 'read' ? m.isRead : !m.isRead)
      return matchSearch && matchCategory && matchRead
    })
  }, [mails, searchTerm, categoryFilter, readFilter])

  const handleMarkRead = async (mail: GameMail) => {
    if (mail.isRead) return
    try {
      await fetch('/api/ops/mail', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: mail.id, action: 'markRead' }) })
      toast({ title: '已标记为已读' }); fetchData()
    } catch { toast({ title: '操作失败', variant: 'destructive' }) }
  }

  const handleClaim = async (mail: GameMail) => {
    if (mail.isClaimed) return
    try {
      await fetch('/api/ops/mail', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: mail.id, action: 'claimReward' }) })
      toast({ title: '奖励已领取' }); fetchData()
    } catch { toast({ title: '操作失败', variant: 'destructive' }) }
  }

  const handleDelete = async (mail: GameMail) => {
    try {
      await fetch(`/api/ops/mail?id=${mail.id}`, { method: 'DELETE' })
      toast({ title: '已删除' }); fetchData()
    } catch { toast({ title: '删除失败', variant: 'destructive' }) }
  }

  const handleBatchSend = async () => {
    setSaving(true)
    const receiverIds = sendForm.receiverIds.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
    if (receiverIds.length === 0 || !sendForm.title || !sendForm.content) {
      toast({ title: '请填写完整信息', description: '至少一个接收者ID、标题和内容', variant: 'destructive' })
      setSaving(false); return
    }
    try {
      const res = await fetch('/api/ops/mail', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'batchSend', receiverIds, title: sendForm.title, content: sendForm.content, category: sendForm.category, senderType: sendForm.senderType, attachments: sendForm.attachments }) })
      const json = await res.json()
      if (json.code === 0) { toast({ title: '发送成功', description: json.message }); setSendDialogOpen(false); setSendForm({ receiverIds: '', title: '', content: '', category: 'system', senderType: 'system', attachments: '{}' }); fetchData() }
      else toast({ title: '发送失败', description: json.message, variant: 'destructive' })
    } catch { toast({ title: '错误', variant: 'destructive' }) }
    finally { setSaving(false) }
  }

  if (loading) return <div className="space-y-4"><div className="grid grid-cols-2 sm:grid-cols-4 gap-4">{[0,1,2,3].map(i=><KpiSkeleton key={i}/>)}</div><div><CardSkeleton /></div></div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="border-sky-200 bg-sky-50/50 dark:bg-sky-950/20"><CardContent className="pt-4 pb-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/50"><Mail className="w-5 h-5 text-sky-600" /></div><div><p className="text-2xl font-bold text-sky-600">{stats.total}</p><p className="text-xs text-muted-foreground">总邮件</p></div></CardContent></Card>
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20"><CardContent className="pt-4 pb-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50"><EyeOff className="w-5 h-5 text-amber-600" /></div><div><p className="text-2xl font-bold text-amber-600">{stats.unread}</p><p className="text-xs text-muted-foreground">未读邮件</p></div></CardContent></Card>
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20"><CardContent className="pt-4 pb-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50"><Gift className="w-5 h-5 text-emerald-600" /></div><div><p className="text-2xl font-bold text-emerald-600">{stats.rewardPending}</p><p className="text-xs text-muted-foreground">待领奖励</p></div></CardContent></Card>
        <Card className="border-rose-200 bg-rose-50/50 dark:bg-rose-950/20"><CardContent className="pt-4 pb-4 flex items-center gap-3"><div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50"><Send className="w-5 h-5 text-rose-600" /></div><div><p className="text-2xl font-bold text-rose-600">{stats.todaySent}</p><p className="text-xs text-muted-foreground">今日发送</p></div></CardContent></Card>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="搜索标题/内容/发送者..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}><SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="分类" /></SelectTrigger><SelectContent><SelectItem value="all">全部分类</SelectItem><SelectItem value="system">系统</SelectItem><SelectItem value="reward">奖励</SelectItem><SelectItem value="activity">活动</SelectItem><SelectItem value="notification">通知</SelectItem><SelectItem value="social">社交</SelectItem><SelectItem value="guild">联盟</SelectItem></SelectContent></Select>
            <Select value={readFilter} onValueChange={setReadFilter}><SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="状态" /></SelectTrigger><SelectContent><SelectItem value="all">全部状态</SelectItem><SelectItem value="read">已读</SelectItem><SelectItem value="unread">未读</SelectItem></SelectContent></Select>
            <Button variant="outline" onClick={() => { setSearchTerm(''); setCategoryFilter('all'); setReadFilter('all') }}><RotateCcw className="w-4 h-4 mr-1" />重置</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end"><Button onClick={() => setSendDialogOpen(true)} className="gap-1"><Send className="w-4 h-4 mr-1" />批量发送邮件</Button></div>

      <Card>
        <CardContent className="p-0">
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader><TableRow><TableHead className="w-[280px]">标题</TableHead><TableHead className="hidden sm:table-cell">发送者</TableHead><TableHead className="hidden md:table-cell">分类</TableHead><TableHead className="hidden lg:table-cell">内容预览</TableHead><TableHead className="hidden md:table-cell">时间</TableHead><TableHead className="w-[120px]">状态</TableHead><TableHead className="w-[100px] text-right">操作</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredMails.map(mail => (
                  <TableRow key={mail.id} className="group">
                    <TableCell>
                      <div className="flex items-center gap-2 min-w-0">
                        {!mail.isRead && <div className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0" />}
                        <span className="truncate text-sm font-medium">{mail.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{mail.senderName}</TableCell>
                    <TableCell className="hidden md:table-cell"><Badge className={`text-xs border ${mailCategoryColors[mail.category] || ''}`}>{mailCategoryLabels[mail.category] || mail.category}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell"><p className="text-xs text-muted-foreground truncate max-w-[200px]">{mail.content}</p></TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground whitespace-nowrap">{mail.createdAt}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {mail.isRead ? <Badge variant="outline" className="text-[10px] px-1.5 py-0">已读</Badge> : <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 text-[10px] px-1.5 py-0">未读</Badge>}
                        {mail.attachments !== '{}' && !mail.isClaimed && <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 text-[10px] px-1.5 py-0">待领</Badge>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!mail.isRead && <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleMarkRead(mail)} title="标记已读"><Eye className="w-3.5 h-3.5" /></Button>}
                        {mail.attachments !== '{}' && !mail.isClaimed && <Button size="sm" variant="ghost" className="h-7 px-2 text-amber-600" onClick={() => handleClaim(mail)} title="领取奖励"><PackageOpen className="w-3.5 h-3.5" /></Button>}
                        <Button size="sm" variant="ghost" className="h-7 px-2 text-red-500" onClick={() => handleDelete(mail)} title="删除"><Trash2 className="w-3.5 h-3.5" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredMails.length === 0 && <TableRow><TableCell colSpan={7} className="text-center py-10 text-muted-foreground"><Mail className="w-8 h-8 mx-auto mb-2 opacity-30" /><p>没有匹配的邮件</p></TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={sendDialogOpen} onOpenChange={open => { if (!open) { setSendDialogOpen(false); setSendForm({ receiverIds: '', title: '', content: '', category: 'system', senderType: 'system', attachments: '{}' }) } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>批量发送邮件</DialogTitle><DialogDescription>向指定用户发送系统邮件</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>接收者ID (逗号分隔)</Label><Input value={sendForm.receiverIds} onChange={e => setSendForm(p => ({ ...p, receiverIds: e.target.value }))} placeholder="10001, 10002, 10003" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>分类</Label><Select value={sendForm.category} onValueChange={v => setSendForm(p => ({ ...p, category: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="system">系统</SelectItem><SelectItem value="reward">奖励</SelectItem><SelectItem value="activity">活动</SelectItem><SelectItem value="notification">通知</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>发送者类型</Label><Select value={sendForm.senderType} onValueChange={v => setSendForm(p => ({ ...p, senderType: v }))}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="system">系统</SelectItem><SelectItem value="admin">管理员</SelectItem><SelectItem value="guild">联盟</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label>邮件标题</Label><Input value={sendForm.title} onChange={e => setSendForm(p => ({ ...p, title: e.target.value }))} placeholder="输入邮件标题" /></div>
            <div className="space-y-2"><Label>邮件内容</Label><Textarea value={sendForm.content} onChange={e => setSendForm(p => ({ ...p, content: e.target.value }))} rows={4} placeholder="输入邮件内容" /></div>
            <div className="space-y-2"><Label>附件 (JSON)</Label><Textarea value={sendForm.attachments} onChange={e => setSendForm(p => ({ ...p, attachments: e.target.value }))} rows={2} placeholder='{"diamond":1000,"gold":5000}' /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => { setSendDialogOpen(false); setSendForm({ receiverIds: '', title: '', content: '', category: 'system', senderType: 'system', attachments: '{}' }) }}>取消</Button><Button onClick={handleBatchSend} disabled={saving}><Send className="w-4 h-4 mr-1" />{saving ? '发送中...' : '发送'}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
