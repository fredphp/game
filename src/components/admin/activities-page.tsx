'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Progress } from '@/components/ui/progress'
import { PartyPopper, Plus, Edit, Trash2, Power, PowerOff, Calendar, Users, Trophy, RotateCcw, Search } from 'lucide-react'
import { mockActivities, Activity } from '@/lib/admin-data'

const typeColors: Record<string, string> = {
  gacha: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
  war: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 border-red-300',
  growth: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300',
  festival: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-300',
  guild: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border-sky-300',
}

const statusColors: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  upcoming: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  ended: 'bg-stone-100 text-stone-600 dark:bg-stone-950 dark:text-stone-400',
}

const statusLabels: Record<string, string> = { active: '进行中', upcoming: '即将开始', ended: '已结束' }

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>(mockActivities)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editActivity, setEditActivity] = useState<Activity | null>(null)
  const [deleteActivity, setDeleteActivity] = useState<Activity | null>(null)
  const [formData, setFormData] = useState({ name: '', type: 'gacha', description: '', startTime: '', endTime: '', rewards: '' })

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

  const handleCreate = () => {
    const newActivity: Activity = {
      id: activities.length + 100,
      name: formData.name,
      type: formData.type as Activity['type'],
      typeName: { gacha: '抽卡活动', war: '战争活动', growth: '成长活动', festival: '节日活动', guild: '联盟活动' }[formData.type],
      description: formData.description,
      startTime: formData.startTime,
      endTime: formData.endTime,
      status: 'upcoming',
      rewards: formData.rewards,
      participants: 0,
      completionRate: 0,
      createdAt: new Date().toISOString().split('T')[0],
    }
    setActivities(prev => [newActivity, ...prev])
    setCreateDialogOpen(false)
    resetForm()
  }

  const handleEdit = () => {
    if (!editActivity) return
    setActivities(prev => prev.map(a => a.id === editActivity.id ? { ...editActivity, ...formData } : a))
    setEditActivity(null)
    resetForm()
  }

  const handleToggle = (activity: Activity) => {
    const newStatus = activity.status === 'active' ? 'ended' : 'active'
    setActivities(prev => prev.map(a => a.id === activity.id ? { ...a, status: newStatus } : a))
  }

  const handleDelete = () => {
    if (!deleteActivity) return
    setActivities(prev => prev.filter(a => a.id !== deleteActivity.id))
    setDeleteActivity(null)
  }

  const openEdit = (activity: Activity) => {
    setFormData({
      name: activity.name,
      type: activity.type,
      description: activity.description,
      startTime: activity.startTime,
      endTime: activity.endTime,
      rewards: activity.rewards,
    })
    setEditActivity(activity)
  }

  const resetForm = () => {
    setFormData({ name: '', type: 'gacha', description: '', startTime: '', endTime: '', rewards: '' })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full bg-gradient-to-b from-rose-500 to-pink-600" />
          <div>
            <h2 className="text-2xl font-bold">活动系统</h2>
            <p className="text-sm text-muted-foreground">活动创建与管理 · 时间控制 · 奖励配置</p>
          </div>
        </div>
        <Button onClick={() => { resetForm(); setCreateDialogOpen(true) }}><Plus className="w-4 h-4 mr-1" />创建活动</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50"><PartyPopper className="w-5 h-5 text-emerald-600" /></div>
            <div>
              <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
              <p className="text-xs text-muted-foreground">进行中活动</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50"><Users className="w-5 h-5 text-amber-600" /></div>
            <div>
              <p className="text-2xl font-bold text-amber-600">{stats.participants.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">参与人次</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-sky-200 bg-sky-50/50 dark:bg-sky-950/20">
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/50"><Trophy className="w-5 h-5 text-sky-600" /></div>
            <div>
              <p className="text-2xl font-bold text-sky-600">{stats.avgCompletion}%</p>
              <p className="text-xs text-muted-foreground">平均完成率</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="搜索活动名称..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="类型" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部类型</SelectItem>
                <SelectItem value="gacha">抽卡活动</SelectItem>
                <SelectItem value="war">战争活动</SelectItem>
                <SelectItem value="growth">成长活动</SelectItem>
                <SelectItem value="festival">节日活动</SelectItem>
                <SelectItem value="guild">联盟活动</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="状态" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">进行中</SelectItem>
                <SelectItem value="upcoming">即将开始</SelectItem>
                <SelectItem value="ended">已结束</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => { setSearchTerm(''); setTypeFilter('all'); setStatusFilter('all') }}><RotateCcw className="w-4 h-4 mr-1" />重置</Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredActivities.map(activity => (
          <Card key={activity.id} className={`hover:shadow-sm transition-shadow ${activity.status === 'ended' ? 'opacity-60' : ''}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-bold">{activity.name}</CardTitle>
                    <Badge className={`text-xs ${typeColors[activity.type]}`}>{activity.typeName}</Badge>
                    <Badge className={`text-xs ${statusColors[activity.status]}`}>{statusLabels[activity.status]}</Badge>
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{activity.startTime} ~ {activity.endTime}</span>
              </div>
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground mb-1">奖励配置</p>
                <p className="text-sm">{activity.rewards}</p>
              </div>
              {activity.status !== 'upcoming' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">参与人数</span>
                    <span className="font-semibold">{activity.participants.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">完成率</span>
                    <span className="font-semibold">{activity.completionRate}%</span>
                  </div>
                  <Progress value={activity.completionRate} className="h-2" />
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredActivities.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-10 pb-10 text-center">
            <PartyPopper className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">没有匹配的活动</p>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen || !!editActivity} onOpenChange={open => { setCreateDialogOpen(false); setEditActivity(null); resetForm() }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editActivity ? '编辑活动' : '创建活动'}</DialogTitle>
            <DialogDescription>{editActivity ? '修改活动配置信息' : '创建新的游戏活动'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>活动名称</Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="输入活动名称" />
            </div>
            <div className="space-y-2">
              <Label>活动类型</Label>
              <Select value={formData.type} onValueChange={v => setFormData(p => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="gacha">抽卡活动</SelectItem>
                  <SelectItem value="war">战争活动</SelectItem>
                  <SelectItem value="growth">成长活动</SelectItem>
                  <SelectItem value="festival">节日活动</SelectItem>
                  <SelectItem value="guild">联盟活动</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>活动描述</Label>
              <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="输入活动描述" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>开始时间</Label>
                <Input type="datetime-local" value={formData.startTime} onChange={e => setFormData(p => ({ ...p, startTime: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>结束时间</Label>
                <Input type="datetime-local" value={formData.endTime} onChange={e => setFormData(p => ({ ...p, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>奖励配置</Label>
              <Textarea value={formData.rewards} onChange={e => setFormData(p => ({ ...p, rewards: e.target.value }))} placeholder="输入奖励配置 (JSON格式)" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); setEditActivity(null); resetForm() }}>取消</Button>
            <Button onClick={editActivity ? handleEdit : handleCreate} disabled={!formData.name}>{editActivity ? '保存' : '创建'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteActivity} onOpenChange={() => setDeleteActivity(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除活动</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除活动「{deleteActivity?.name}」吗？此操作不可撤销。如果活动正在进行中，删除将立即结束活动。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
