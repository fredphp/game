'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts'
import { Search, RotateCcw, Shield, UserCheck, UserX, Swords, Activity, Trophy, Clock, Target, Zap, Star } from 'lucide-react'
import { mockGmLogs, mockLoginLogs, mockBattleLogs, mockUserActionLogs } from '@/lib/admin-data'
import type { BattleLog } from '@/lib/admin-data'

// ==================== 颜色映射 ====================

const actionColors: Record<string, string> = {
  '封号': 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  '解封': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  '修改钻石': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  '修改等级': 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  '补单': 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  '退款': 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  '修改卡池概率': 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  '修改武将属性': 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
  '创建活动': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  '修改配置': 'bg-stone-100 text-stone-700 dark:bg-stone-950 dark:text-stone-300',
}

const battleTypeColors: Record<string, string> = {
  pve: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  pvp: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  arena: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  siege: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  world_boss: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
}

const battleTypeNames: Record<string, string> = {
  pve: 'PVE关卡',
  pvp: 'PVP对战',
  arena: '竞技场',
  siege: '攻城战',
  world_boss: '世界BOSS',
}

const categoryColors: Record<string, string> = {
  battle: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  gacha: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  trade: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  social: 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  system: 'bg-stone-100 text-stone-700 dark:bg-stone-950 dark:text-stone-300',
  guild: 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  map: 'bg-teal-100 text-teal-700 dark:bg-teal-950 dark:text-teal-300',
}

const categoryNames: Record<string, string> = {
  battle: '战斗', gacha: '抽卡', trade: '交易', social: '社交', system: '系统', guild: '联盟', map: '地图',
}

const PIE_COLORS = ['#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#64748b', '#14b8a6', '#a855f7']

export default function LogsPage() {
  // GM日志状态
  const [gmSearch, setGmSearch] = useState('')
  const [gmAction, setGmAction] = useState('all')

  // 登录日志状态
  const [loginSearch, setLoginSearch] = useState('')
  const [loginStatus, setLoginStatus] = useState('all')
  const [loginDevice, setLoginDevice] = useState('all')

  // 战斗日志状态
  const [battleSearch, setBattleSearch] = useState('')
  const [battleType, setBattleType] = useState('all')
  const [battleResult, setBattleResult] = useState('all')

  // 行为日志状态
  const [actionSearch, setActionSearch] = useState('')
  const [actionCategory, setActionCategory] = useState('all')

  // ==================== GM日志 ====================
  const filteredGmLogs = useMemo(() => {
    return mockGmLogs.filter(log => {
      const matchSearch = !gmSearch || log.operatorName.includes(gmSearch) || log.detail.includes(gmSearch) || log.targetId.toString().includes(gmSearch)
      const matchAction = gmAction === 'all' || log.action === gmAction
      return matchSearch && matchAction
    }).slice(0, 20)
  }, [gmSearch, gmAction])

  const uniqueActions = [...new Set(mockGmLogs.map(l => l.action))]
  const actionDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    mockGmLogs.forEach(l => { counts[l.action] = (counts[l.action] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [])

  // ==================== 登录日志 ====================
  const filteredLoginLogs = useMemo(() => {
    return mockLoginLogs.filter(log => {
      const matchSearch = !loginSearch || log.nickname.includes(loginSearch) || log.userId.toString().includes(loginSearch) || log.ip.includes(loginSearch)
      const matchStatus = loginStatus === 'all' || (loginStatus === 'success' ? log.status === 1 : log.status === 0)
      const matchDevice = loginDevice === 'all' || log.device === loginDevice
      return matchSearch && matchStatus && matchDevice
    }).slice(0, 20)
  }, [loginSearch, loginStatus, loginDevice])

  const loginSuccessRate = useMemo(() => {
    const total = mockLoginLogs.length
    const success = mockLoginLogs.filter(l => l.status === 1).length
    return ((success / total) * 100).toFixed(1)
  }, [])

  const uniqueDevices = [...new Set(mockLoginLogs.map(l => l.device))]

  // ==================== 战斗日志 ====================
  const filteredBattleLogs = useMemo(() => {
    return mockBattleLogs.filter(log => {
      const matchSearch = !battleSearch || log.nickname.includes(battleSearch) || log.battleId.includes(battleSearch) || log.defenderName.includes(battleSearch)
      const matchType = battleType === 'all' || log.battleType === battleType
      const matchResult = battleResult === 'all' || log.result === parseInt(battleResult)
      return matchSearch && matchType && matchResult
    }).slice(0, 20)
  }, [battleSearch, battleType, battleResult])

  const battleStats = useMemo(() => {
    const total = mockBattleLogs.length
    const wins = mockBattleLogs.filter(l => l.result === 1).length
    const avgTurns = (mockBattleLogs.reduce((sum, l) => sum + l.turns, 0) / total).toFixed(1)
    const avgDuration = (mockBattleLogs.reduce((sum, l) => sum + l.duration, 0) / total).toFixed(0)
    const totalDmg = mockBattleLogs.reduce((sum, l) => sum + l.damageTotal, 0)
    return { total, wins, winRate: ((wins / total) * 100).toFixed(1), avgTurns, avgDuration, totalDmg }
  }, [])

  const battleTypeDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    mockBattleLogs.forEach(l => { counts[l.battleType] = (counts[l.battleType] || 0) + 1 })
    return Object.entries(counts).map(([type, value]) => ({
      name: battleTypeNames[type] || type,
      value,
      fill: PIE_COLORS[Object.keys(counts).indexOf(type) % PIE_COLORS.length],
    }))
  }, [])

  // 每日战斗趋势 (最近7天)
  const battleDailyTrend = useMemo(() => {
    const dailyData: Record<string, { total: number; wins: number }> = {}
    mockBattleLogs.forEach(l => {
      const day = l.createdAt.split(' ')[0]?.slice(5) || '07-10'
      if (!dailyData[day]) dailyData[day] = { total: 0, wins: 0 }
      dailyData[day].total++
      if (l.result === 1) dailyData[day].wins++
    })
    return Object.entries(dailyData).map(([date, data]) => ({
      date,
      battles: data.total,
      winRate: +((data.wins / data.total) * 100).toFixed(1),
    })).sort((a, b) => a.date.localeCompare(b.date)).slice(-7)
  }, [])

  // ==================== 行为日志 ====================
  const filteredActionLogs = useMemo(() => {
    return mockUserActionLogs.filter(log => {
      const matchSearch = !actionSearch || log.nickname.includes(actionSearch) || log.detail.includes(actionSearch) || log.userId.toString().includes(actionSearch)
      const matchCategory = actionCategory === 'all' || log.category === actionCategory
      return matchSearch && matchCategory
    }).slice(0, 20)
  }, [actionSearch, actionCategory])

  const actionCategoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    mockUserActionLogs.forEach(l => { counts[l.category] = (counts[l.category] || 0) + 1 })
    return Object.entries(counts).map(([cat, value]) => ({
      name: categoryNames[cat] || cat,
      value,
      fill: PIE_COLORS[Object.keys(counts).indexOf(cat) % PIE_COLORS.length],
    }))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-amber-500 to-orange-600" />
        <div>
          <h2 className="text-2xl font-bold">日志系统</h2>
          <p className="text-sm text-muted-foreground">GM操作日志 / 登录日志 / 战斗日志 / 用户行为日志 · log_db 独立数据库 · 按月分表</p>
        </div>
      </div>

      <Tabs defaultValue="gm" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="gm" className="gap-1.5 text-xs sm:text-sm"><Shield className="w-4 h-4" /><span className="hidden sm:inline">GM操作</span></TabsTrigger>
          <TabsTrigger value="login" className="gap-1.5 text-xs sm:text-sm"><UserCheck className="w-4 h-4" /><span className="hidden sm:inline">登录日志</span></TabsTrigger>
          <TabsTrigger value="battle" className="gap-1.5 text-xs sm:text-sm"><Swords className="w-4 h-4" /><span className="hidden sm:inline">战斗日志</span></TabsTrigger>
          <TabsTrigger value="action" className="gap-1.5 text-xs sm:text-sm"><Activity className="w-4 h-4" /><span className="hidden sm:inline">行为日志</span></TabsTrigger>
        </TabsList>

        {/* ==================== GM操作日志 ==================== */}
        <TabsContent value="gm" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="搜索操作人/详情/目标ID..." className="pl-9" value={gmSearch} onChange={e => setGmSearch(e.target.value)} />
                </div>
                <Select value={gmAction} onValueChange={setGmAction}>
                  <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="操作类型" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部操作</SelectItem>
                    {uniqueActions.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => { setGmSearch(''); setGmAction('all') }}><RotateCcw className="w-4 h-4 mr-1" />重置</Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="w-[160px]">时间</TableHead>
                    <TableHead>操作人</TableHead>
                    <TableHead>目标</TableHead>
                    <TableHead>操作</TableHead>
                    <TableHead className="hidden md:table-cell">详情</TableHead>
                    <TableHead className="w-[130px]">IP</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredGmLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.createdAt}</TableCell>
                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{log.operatorName}</code></TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{log.targetType}</Badge></TableCell>
                        <TableCell><Badge className={`text-xs ${actionColors[log.action] || 'bg-muted'}`}>{log.action}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[200px] truncate">{log.detail}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.ip}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">操作分布</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <PieChart>
                    <Pie data={actionDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {actionDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">操作频次</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <BarChart data={actionDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== 登录日志 ==================== */}
        <TabsContent value="login" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold text-emerald-600">{loginSuccessRate}%</p>
                <p className="text-xs text-muted-foreground">登录成功率</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold text-red-600">{mockLoginLogs.filter(l => l.status === 0).length}</p>
                <p className="text-xs text-muted-foreground">登录失败</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold text-amber-600">{mockLoginLogs.length}</p>
                <p className="text-xs text-muted-foreground">总登录次数</p>
              </CardContent>
            </Card>
            <Card className="border-sky-200 bg-sky-50/50 dark:bg-sky-950/20">
              <CardContent className="pt-4 pb-4 text-center">
                <p className="text-2xl font-bold text-sky-600">{uniqueDevices.length}</p>
                <p className="text-xs text-muted-foreground">设备类型</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="搜索用户名/ID/IP..." className="pl-9" value={loginSearch} onChange={e => setLoginSearch(e.target.value)} />
                </div>
                <Select value={loginStatus} onValueChange={setLoginStatus}>
                  <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="状态" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="success">成功</SelectItem>
                    <SelectItem value="fail">失败</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={loginDevice} onValueChange={setLoginDevice}>
                  <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="设备" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部设备</SelectItem>
                    {uniqueDevices.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => { setLoginSearch(''); setLoginStatus('all'); setLoginDevice('all') }}><RotateCcw className="w-4 h-4 mr-1" />重置</Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="w-[160px]">时间</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead className="hidden sm:table-cell">设备</TableHead>
                    <TableHead className="hidden md:table-cell">渠道</TableHead>
                    <TableHead>状态</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredLoginLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.createdAt}</TableCell>
                        <TableCell className="font-medium">{log.nickname}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.ip}</TableCell>
                        <TableCell className="hidden sm:table-cell"><Badge className={`text-xs ${categoryColors[log.device] || 'bg-muted'}`}>{log.device}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-xs">{log.channel}</Badge></TableCell>
                        <TableCell>
                          {log.status === 1 ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs gap-1"><UserCheck className="w-3 h-3" />成功</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-xs gap-1"><UserX className="w-3 h-3" />失败</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== 战斗日志 ==================== */}
        <TabsContent value="battle" className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
              <CardContent className="pt-4 pb-4 text-center">
                <Swords className="w-5 h-5 mx-auto text-amber-500 mb-1" />
                <p className="text-2xl font-bold text-amber-600">{battleStats.total}</p>
                <p className="text-xs text-muted-foreground">总战斗次数</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
              <CardContent className="pt-4 pb-4 text-center">
                <Trophy className="w-5 h-5 mx-auto text-emerald-500 mb-1" />
                <p className="text-2xl font-bold text-emerald-600">{battleStats.winRate}%</p>
                <p className="text-xs text-muted-foreground">胜率</p>
              </CardContent>
            </Card>
            <Card className="border-sky-200 bg-sky-50/50 dark:bg-sky-950/20">
              <CardContent className="pt-4 pb-4 text-center">
                <Clock className="w-5 h-5 mx-auto text-sky-500 mb-1" />
                <p className="text-2xl font-bold text-sky-600">{battleStats.avgDuration}s</p>
                <p className="text-xs text-muted-foreground">平均时长</p>
              </CardContent>
            </Card>
            <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
              <CardContent className="pt-4 pb-4 text-center">
                <Target className="w-5 h-5 mx-auto text-purple-500 mb-1" />
                <p className="text-2xl font-bold text-purple-600">{battleStats.avgTurns}</p>
                <p className="text-xs text-muted-foreground">平均回合</p>
              </CardContent>
            </Card>
            <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20">
              <CardContent className="pt-4 pb-4 text-center">
                <Zap className="w-5 h-5 mx-auto text-red-500 mb-1" />
                <p className="text-2xl font-bold text-red-600">{(battleStats.totalDmg / 10000).toFixed(1)}万</p>
                <p className="text-xs text-muted-foreground">总输出伤害</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="搜索玩家名/战斗ID/对手..." className="pl-9" value={battleSearch} onChange={e => setBattleSearch(e.target.value)} />
                </div>
                <Select value={battleType} onValueChange={setBattleType}>
                  <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="战斗类型" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="pve">PVE关卡</SelectItem>
                    <SelectItem value="pvp">PVP对战</SelectItem>
                    <SelectItem value="arena">竞技场</SelectItem>
                    <SelectItem value="siege">攻城战</SelectItem>
                    <SelectItem value="world_boss">世界BOSS</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={battleResult} onValueChange={setBattleResult}>
                  <SelectTrigger className="w-full sm:w-28"><SelectValue placeholder="结果" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="1">胜利</SelectItem>
                    <SelectItem value="0">失败</SelectItem>
                    <SelectItem value="2">平局</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => { setBattleSearch(''); setBattleType('all'); setBattleResult('all') }}><RotateCcw className="w-4 h-4 mr-1" />重置</Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="w-[140px]">时间</TableHead>
                    <TableHead>玩家</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>对手</TableHead>
                    <TableHead className="hidden md:table-cell">武将</TableHead>
                    <TableHead>结果</TableHead>
                    <TableHead className="hidden sm:table-cell">回合</TableHead>
                    <TableHead className="hidden lg:table-cell">时长</TableHead>
                    <TableHead className="hidden lg:table-cell">伤害</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredBattleLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.createdAt}</TableCell>
                        <TableCell className="font-medium">{log.nickname}</TableCell>
                        <TableCell><Badge className={`text-xs ${battleTypeColors[log.battleType] || 'bg-muted'}`}>{battleTypeNames[log.battleType] || log.battleType}</Badge></TableCell>
                        <TableCell className="text-xs">{log.defenderName || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[150px] truncate">{log.heroUsed}</TableCell>
                        <TableCell>
                          {log.result === 1 && <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 text-xs gap-1"><Trophy className="w-3 h-3" />胜{log.starRating > 0 && <span className="ml-0.5">{'★'.repeat(log.starRating)}</span>}</Badge>}
                          {log.result === 0 && <Badge className="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 text-xs">失败</Badge>}
                          {log.result === 2 && <Badge className="bg-stone-100 text-stone-700 dark:bg-stone-950 dark:text-stone-300 text-xs">平局</Badge>}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs">{log.turns}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs">{log.duration}s</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-red-600 font-medium">{log.damageTotal.toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">战斗类型分布</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <PieChart>
                    <Pie data={battleTypeDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name} ${value}`}>
                      {battleTypeDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">每日战斗趋势</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <LineChart data={battleDailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="battles" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="战斗次数" />
                    <Line yAxisId="right" type="monotone" dataKey="winRate" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" name="胜率(%)" />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== 用户行为日志 ==================== */}
        <TabsContent value="action" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="搜索用户名/ID/详情..." className="pl-9" value={actionSearch} onChange={e => setActionSearch(e.target.value)} />
                </div>
                <Select value={actionCategory} onValueChange={setActionCategory}>
                  <SelectTrigger className="w-full sm:w-36"><SelectValue placeholder="行为分类" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部分类</SelectItem>
                    <SelectItem value="battle">战斗</SelectItem>
                    <SelectItem value="gacha">抽卡</SelectItem>
                    <SelectItem value="trade">交易</SelectItem>
                    <SelectItem value="social">社交</SelectItem>
                    <SelectItem value="system">系统</SelectItem>
                    <SelectItem value="guild">联盟</SelectItem>
                    <SelectItem value="map">地图</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => { setActionSearch(''); setActionCategory('all') }}><RotateCcw className="w-4 h-4 mr-1" />重置</Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="w-[140px]">时间</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>分类</TableHead>
                    <TableHead>操作</TableHead>
                    <TableHead className="hidden md:table-cell">详情</TableHead>
                    <TableHead className="hidden lg:table-cell">IP</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {filteredActionLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.createdAt}</TableCell>
                        <TableCell className="font-medium">{log.nickname}</TableCell>
                        <TableCell><Badge className={`text-xs ${categoryColors[log.category] || 'bg-muted'}`}>{categoryNames[log.category] || log.category}</Badge></TableCell>
                        <TableCell><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{log.action}</code></TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[250px] truncate">{log.detail}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs font-mono text-muted-foreground">{log.ip}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">行为分类分布</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <PieChart>
                    <Pie data={actionCategoryDistribution} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {actionCategoryDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold">分类频次</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={{}} className="h-[250px] w-full">
                  <BarChart data={actionCategoryDistribution} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={60} tick={{ fontSize: 11 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {actionCategoryDistribution.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
