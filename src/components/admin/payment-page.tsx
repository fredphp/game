'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Search, RotateCcw, Eye, RefreshCw, Package, DollarSign,
  ShoppingCart, AlertCircle, Download, ChevronLeft, ChevronRight,
  TrendingUp, CreditCard,
} from 'lucide-react'
import { mockOrders, Order } from '@/lib/admin-data'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'

const PAGE_SIZE = 10

const orderStatusMap: Record<number, { text: string; className: string }> = {
  0: { text: '待支付', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300' },
  1: { text: '已支付', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300' },
  2: { text: '已发货', className: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-300' },
  3: { text: '已退款', className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-300' },
  4: { text: '已关闭', className: 'bg-stone-500/15 text-stone-600 dark:text-stone-400 border-stone-300' },
}

// 7-day revenue data
const revenueData = [
  { date: '7/4', revenue: 28500 },
  { date: '7/5', revenue: 32100 },
  { date: '7/6', revenue: 30800 },
  { date: '7/7', revenue: 35680 },
  { date: '7/8', revenue: 29400 },
  { date: '7/9', revenue: 33200 },
  { date: '7/10', revenue: 35680 },
]

export default function PaymentPage() {
  // --- Filters ---
  const [startDate, setStartDate] = useState('2025-07-01')
  const [endDate, setEndDate] = useState('2025-07-10')
  const [statusFilter, setStatusFilter] = useState('all')
  const [productFilter, setProductFilter] = useState('all')
  const [orderSearch, setOrderSearch] = useState('')
  const [page, setPage] = useState(1)

  // --- Detail Dialog ---
  const [detailOrder, setDetailOrder] = useState<Order | null>(null)

  // --- Filtered data ---
  const filtered = useMemo(() => {
    let list = [...mockOrders]
    if (statusFilter !== 'all') {
      list = list.filter((o) => o.status === Number(statusFilter))
    }
    if (productFilter !== 'all') {
      list = list.filter((o) => o.productType === productFilter)
    }
    if (orderSearch.trim()) {
      const q = orderSearch.trim().toLowerCase()
      list = list.filter((o) => o.orderNo.toLowerCase().includes(q))
    }
    return list
  }, [statusFilter, productFilter, orderSearch])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleReset = useCallback(() => {
    setStartDate('2025-07-01')
    setEndDate('2025-07-10')
    setStatusFilter('all')
    setProductFilter('all')
    setOrderSearch('')
    setPage(1)
  }, [])

  // --- Pagination ---
  const pageNums = useMemo(() => {
    const total = totalPages
    const current = safePage
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages: number[] = [1]
    if (current > 3) pages.push(-1)
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 2) pages.push(-1)
    if (total > 1) pages.push(total)
    return pages
  }, [totalPages, safePage])

  return (
    <div className="space-y-6">
      {/* ===== Summary Cards ===== */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          title="今日收入"
          value="¥35,680"
          icon={DollarSign}
          trend="+8.5%"
          trendUp
          color="text-emerald-600 dark:text-emerald-400"
          bg="bg-emerald-500/10"
        />
        <SummaryCard
          title="今日订单"
          value="1,567"
          icon={ShoppingCart}
          trend="+5.2%"
          trendUp
          color="text-amber-600 dark:text-amber-400"
          bg="bg-amber-500/10"
        />
        <SummaryCard
          title="待处理"
          value="12"
          icon={AlertCircle}
          trend=""
          color="text-rose-600 dark:text-rose-400"
          bg="bg-rose-500/10"
        />
        <SummaryCard
          title="退款率"
          value="0.3%"
          icon={RefreshCw}
          trend="-0.1%"
          trendUp
          color="text-purple-600 dark:text-purple-400"
          bg="bg-purple-500/10"
        />
      </div>

      {/* ===== Main Content Tabs ===== */}
      <Tabs defaultValue="orders">
        <TabsList>
          <TabsTrigger value="orders">订单管理</TabsTrigger>
          <TabsTrigger value="revenue">收入统计</TabsTrigger>
        </TabsList>

        {/* ===== Orders Tab ===== */}
        <TabsContent value="orders" className="space-y-4">
          {/* Filter Bar */}
          <Card>
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">开始日期</label>
                  <Input type="date" className="h-9 w-[150px]" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">结束日期</label>
                  <Input type="date" className="h-9 w-[150px]" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">订单状态</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-[120px]"><SelectValue placeholder="全部" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部状态</SelectItem>
                      <SelectItem value="0">待支付</SelectItem>
                      <SelectItem value="1">已支付</SelectItem>
                      <SelectItem value="2">已发货</SelectItem>
                      <SelectItem value="3">已退款</SelectItem>
                      <SelectItem value="4">已关闭</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">商品类型</label>
                  <Select value={productFilter} onValueChange={setProductFilter}>
                    <SelectTrigger className="h-9 w-[120px]"><SelectValue placeholder="全部" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部类型</SelectItem>
                      <SelectItem value="diamond">钻石充值</SelectItem>
                      <SelectItem value="monthly">月卡</SelectItem>
                      <SelectItem value="gift">礼包</SelectItem>
                      <SelectItem value="vip">VIP礼包</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted-foreground">订单号</label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="搜索订单号"
                      className="pl-8 h-9 w-[200px]"
                      value={orderSearch}
                      onChange={(e) => { setOrderSearch(e.target.value); setPage(1) }}
                    />
                  </div>
                </div>
                <Button size="sm" variant="outline" className="h-9" onClick={handleReset}>
                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                  重置
                </Button>
                <Button size="sm" variant="outline" className="h-9 ml-auto">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  导出
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs whitespace-nowrap">订单号</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">用户</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">商品</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">金额(¥)</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">钻石</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">状态</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">支付方式</TableHead>
                      <TableHead className="text-xs whitespace-nowrap">时间</TableHead>
                      <TableHead className="text-xs whitespace-nowrap text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pageData.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                          暂无匹配订单
                        </TableCell>
                      </TableRow>
                    ) : (
                      pageData.map((order) => {
                        const st = orderStatusMap[order.status]
                        return (
                          <TableRow key={order.id} className="text-sm">
                            <TableCell className="font-mono text-xs whitespace-nowrap">{order.orderNo}</TableCell>
                            <TableCell className="whitespace-nowrap">{order.nickname}</TableCell>
                            <TableCell className="whitespace-nowrap max-w-[120px] truncate">{order.productName}</TableCell>
                            <TableCell className="font-mono text-xs whitespace-nowrap font-medium">¥{order.amount}</TableCell>
                            <TableCell className="font-mono text-xs whitespace-nowrap text-emerald-600 dark:text-emerald-400">
                              {order.diamond}{order.bonus > 0 ? <span className="text-amber-500">+{order.bonus}</span> : ''}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant="outline" className={`text-xs px-2 py-0.5 border ${st.className}`}>
                                {st.text}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs whitespace-nowrap">{order.payMethod}</TableCell>
                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{order.createdAt}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailOrder(order)} title="查看">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                                {order.status === 1 && (
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600" title="退款">
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                                {order.status === 1 && (
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600" title="手动发货">
                                    <Package className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-xs text-muted-foreground">
                  共 {filtered.length} 条记录，第 {safePage}/{totalPages} 页
                </span>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  {pageNums.map((p, i) =>
                    p === -1 ? (
                      <span key={`e-${i}`} className="px-1 text-xs text-muted-foreground">...</span>
                    ) : (
                      <Button key={p} size="sm" variant={safePage === p ? 'default' : 'outline'} className="h-7 w-7 p-0 text-xs" onClick={() => setPage(p)}>
                        {p}
                      </Button>
                    )
                  )}
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Revenue Tab ===== */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                近7日收入趋势
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={{ stroke: 'hsl(var(--border))' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `¥${(v / 10000).toFixed(1)}万`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                      formatter={(value: number) => [`¥${value.toLocaleString()}`, '收入']}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#10b981"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={50}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="text-center p-3 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">7日总收入</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">¥225,360</p>
                </div>
                <div className="text-center p-3 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">日均收入</p>
                  <p className="text-lg font-bold">¥32,194</p>
                </div>
                <div className="text-center p-3 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">最高单日</p>
                  <p className="text-lg font-bold">¥35,680</p>
                </div>
                <div className="text-center p-3 rounded-md bg-muted/30">
                  <p className="text-xs text-muted-foreground">7日增长率</p>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+25.2%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== Order Detail Dialog ===== */}
      <Dialog open={!!detailOrder} onOpenChange={() => setDetailOrder(null)}>
        <DialogContent className="sm:max-w-lg">
          {detailOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                  订单详情
                </DialogTitle>
                <DialogDescription>查看订单完整信息</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem label="订单号" value={detailOrder.orderNo} mono />
                  <DetailItem label="用户" value={detailOrder.nickname} />
                  <DetailItem label="商品" value={detailOrder.productName} />
                  <DetailItem label="商品类型" value={detailOrder.productType} mono />
                  <DetailItem label="金额" value={`¥${detailOrder.amount}`} highlight />
                  <DetailItem label="钻石" value={`${detailOrder.diamond} 颗${detailOrder.bonus > 0 ? ` + ${detailOrder.bonus} 赠送` : ''}`} highlight />
                  <DetailItem label="状态">
                    <Badge variant="outline" className={`text-xs px-2 py-0.5 border ${orderStatusMap[detailOrder.status].className}`}>
                      {orderStatusMap[detailOrder.status].text}
                    </Badge>
                  </DetailItem>
                  <DetailItem label="支付方式" value={detailOrder.payMethod} />
                  <DetailItem label="第三方流水" value={detailOrder.tradeNo || '-'} mono />
                  <DetailItem label="创建时间" value={detailOrder.createdAt} />
                  <DetailItem label="支付时间" value={detailOrder.paidAt || '-'} />
                  <DetailItem label="发货时间" value={detailOrder.deliveredAt || '-'} />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ===== Sub-components =====

function SummaryCard({ title, value, icon: Icon, trend, trendUp, color, bg }: {
  title: string
  value: string
  icon: React.ElementType
  trend: string
  trendUp?: boolean
  color: string
  bg: string
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="text-xl font-bold mt-1">{value}</p>
            {trend && (
              <p className={`text-xs mt-1 ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {trendUp ? '↑' : '↓'} {trend}
              </p>
            )}
          </div>
          <div className={`p-2 rounded-lg ${bg}`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function DetailItem({ label, value, mono, highlight, children }: {
  label: string
  value?: string
  mono?: boolean
  highlight?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-md border p-2.5 bg-muted/20">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      {children ?? (
        <p className={`text-sm font-medium ${mono ? 'font-mono text-xs' : ''} ${highlight ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
          {value ?? '-'}
        </p>
      )}
    </div>
  )
}
