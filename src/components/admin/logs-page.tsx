'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ScrollText, Search, RotateCcw, Shield, UserCheck, UserX, AlertTriangle, Activity, FileText } from 'lucide-react'
import { mockGmLogs, mockLoginLogs } from '@/lib/admin-data'

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

const deviceColors: Record<string, string> = {
  'iPhone 15': 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  'iPhone 14': 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  'Samsung S24': 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  'Huawei Mate60': 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
  'iPad Air': 'bg-stone-100 text-stone-700 dark:bg-stone-950 dark:text-stone-300',
  'Xiaomi 14': 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
}

export default function LogsPage() {
  const [gmSearch, setGmSearch] = useState('')
  const [gmAction, setGmAction] = useState('all')
  const [loginSearch, setLoginSearch] = useState('')
  const [loginStatus, setLoginStatus] = useState('all')
  const [loginDevice, setLoginDevice] = useState('all')

  const filteredGmLogs = useMemo(() => {
    return mockGmLogs.filter(log => {
      const matchSearch = !gmSearch || log.operatorName.includes(gmSearch) || log.detail.includes(gmSearch) || log.targetId.toString().includes(gmSearch)
      const matchAction = gmAction === 'all' || log.action === gmAction
      return matchSearch && matchAction
    }).slice(0, 20)
  }, [gmSearch, gmAction])

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

  const uniqueActions = [...new Set(mockGmLogs.map(l => l.action))]
  const uniqueDevices = [...new Set(mockLoginLogs.map(l => l.device))]
  const uniqueChannels = [...new Set(mockLoginLogs.map(l => l.channel))]

  const actionDistribution = useMemo(() => {
    const counts: Record<string, number> = {}
    mockGmLogs.forEach(l => { counts[l.action] = (counts[l.action] || 0) + 1 })
    return Object.entries(counts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
  }, [])

  const PIE_COLORS = ['#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#64748b', '#14b8a6', '#a855f7']

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-amber-500 to-orange-600" />
        <div>
          <h2 className="text-2xl font-bold">日志系统</h2>
          <p className="text-sm text-muted-foreground">GM操作日志 / 用户登录日志 / 用户行为日志</p>
        </div>
      </div>

      <Tabs defaultValue="gm" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gm" className="gap-2"><Shield className="w-4 h-4" />GM操作日志</TabsTrigger>
          <TabsTrigger value="login" className="gap-2"><UserCheck className="w-4 h-4" />用户登录日志</TabsTrigger>
          <TabsTrigger value="action" className="gap-2"><Activity className="w-4 h-4" />用户行为日志</TabsTrigger>
        </TabsList>

        {/* GM操作日志 */}
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
                <Button variant="outline" onClick={() => { setGmSearch(''); setGmAction('all') }}><RotateCcw className="w-4 h-4 mr-1" />重置</Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">时间</TableHead>
                      <TableHead>操作人</TableHead>
                      <TableHead>目标类型</TableHead>
                      <TableHead>操作</TableHead>
                      <TableHead className="hidden md:table-cell">详情</TableHead>
                      <TableHead className="w-[130px]">IP</TableHead>
                    </TableRow>
                  </TableHeader>
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

        {/* 登录日志 */}
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
                <Button variant="outline" onClick={() => { setLoginSearch(''); setLoginStatus('all'); setLoginDevice('all') }}><RotateCcw className="w-4 h-4 mr-1" />重置</Button>
              </div>
            </CardHeader>
          </Card>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">时间</TableHead>
                      <TableHead>用户</TableHead>
                      <TableHead>IP</TableHead>
                      <TableHead className="hidden sm:table-cell">设备</TableHead>
                      <TableHead className="hidden md:table-cell">渠道</TableHead>
                      <TableHead>状态</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLoginLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.createdAt}</TableCell>
                        <TableCell className="font-medium">{log.nickname}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{log.ip}</TableCell>
                        <TableCell className="hidden sm:table-cell"><Badge className={`text-xs ${deviceColors[log.device] || 'bg-muted'}`}>{log.device}</Badge></TableCell>
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

        {/* 用户行为日志 */}
        <TabsContent value="action" className="space-y-4">
          <Card className="border-dashed border-amber-300 bg-amber-50/30 dark:bg-amber-950/10">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <FileText className="w-8 h-8 text-amber-500" />
                <div>
                  <p className="font-semibold">用户行为日志</p>
                  <p className="text-sm text-muted-foreground">记录所有用户在游戏中的关键操作行为，支持按用户、操作类型、时间范围筛选。数据存储在 log_db.user_action_log 表中（按月分表）。</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input placeholder="搜索用户名或ID" />
                <Select><SelectTrigger><SelectValue placeholder="操作类型" /></SelectTrigger><SelectContent><SelectItem value="login">登录</SelectItem><SelectItem value="battle">战斗</SelectItem><SelectItem value="gacha">抽卡</SelectItem><SelectItem value="trade">交易</SelectItem></SelectContent></Select>
                <Button variant="outline"><Search className="w-4 h-4 mr-1" />查询</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">行为日志表结构</CardTitle></CardHeader>
            <CardContent>
              <div className="rounded-lg border bg-muted/30 p-4">
                <pre className="text-xs font-mono text-muted-foreground overflow-x-auto">{`CREATE TABLE user_action_log (
  id          BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id     BIGINT NOT NULL,
  uid         VARCHAR(30) NOT NULL,
  action      VARCHAR(50) NOT NULL,
  detail      TEXT,
  ip          VARCHAR(45) DEFAULT '',
  created_at  DATETIME DEFAULT NOW(),
  INDEX idx_user (user_id),
  INDEX idx_action (action),
  INDEX idx_created (created_at)
) ENGINE=InnoDB;

-- 分表策略: 按月分表
-- user_action_log_2025_07
-- user_action_log_2025_08
-- ...`}</pre>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-sm font-semibold">监控告警规则</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { rule: '同一IP 1分钟内登录失败超过5次', level: '高', color: 'bg-red-100 text-red-700' },
                  { rule: '同一用户1分钟内抽卡超过100次', level: '高', color: 'bg-red-100 text-red-700' },
                  { rule: '单日充值金额超过10000元', level: '中', color: 'bg-amber-100 text-amber-700' },
                  { rule: '同一设备登录超过10个账号', level: '中', color: 'bg-amber-100 text-amber-700' },
                  { rule: '资源变动异常(单次超过10000)', level: '低', color: 'bg-sky-100 text-sky-700' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-lg border">
                    <AlertTriangle className={`w-4 h-4 flex-shrink-0 ${item.level === '高' ? 'text-red-500' : item.level === '中' ? 'text-amber-500' : 'text-sky-500'}`} />
                    <span className="text-sm flex-1">{item.rule}</span>
                    <Badge className={`text-xs ${item.color}`}>{item.level}风险</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
