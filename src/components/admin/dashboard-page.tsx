'use client';

import { useMemo } from 'react';
import {
  Users,
  DollarSign,
  UserPlus,
  Wifi,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Swords,
  Sparkles,
  Timer,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  mockDashboardStats,
  mockDailyStats,
  mockGmLogs,
} from '@/lib/admin-data';

// ==================== Chart Configs ====================
const dauChartConfig = {
  dau: { label: 'DAU', color: 'var(--color-amber-500)' },
};

const revenueChartConfig = {
  revenue: { label: '收入 (¥)', color: 'var(--color-emerald-500)' },
};

// ==================== Stats Card Definitions ====================
const statsCards = [
  {
    key: 'dau',
    label: '日活 (DAU)',
    value: mockDashboardStats.dau,
    change: mockDashboardStats.dauChange,
    icon: Users,
    gradient: 'from-amber-500/10 via-orange-500/5 to-transparent',
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    borderColor: 'border-amber-500/20',
  },
  {
    key: 'revenue',
    label: '今日收入',
    value: mockDashboardStats.revenue,
    change: mockDashboardStats.revenueChange,
    prefix: '¥',
    icon: DollarSign,
    gradient: 'from-emerald-500/10 via-green-500/5 to-transparent',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    borderColor: 'border-emerald-500/20',
  },
  {
    key: 'newUsers',
    label: '新增用户',
    value: mockDashboardStats.newUsers,
    change: mockDashboardStats.newUsersChange,
    icon: UserPlus,
    gradient: 'from-sky-500/10 via-cyan-500/5 to-transparent',
    iconBg: 'bg-sky-500/10',
    iconColor: 'text-sky-600 dark:text-sky-400',
    borderColor: 'border-sky-500/20',
  },
  {
    key: 'online',
    label: '在线人数',
    value: mockDashboardStats.onlineNow,
    icon: Wifi,
    gradient: 'from-violet-500/10 via-purple-500/5 to-transparent',
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-600 dark:text-violet-400',
    borderColor: 'border-violet-500/20',
    live: true,
  },
];

// ==================== Quick Stats Definitions ====================
const retentionStats = [
  { label: '1日留存', value: '45.2%', color: 'text-emerald-600 dark:text-emerald-400' },
  { label: '7日留存', value: '28.6%', color: 'text-amber-600 dark:text-amber-400' },
  { label: '30日留存', value: '15.3%', color: 'text-rose-600 dark:text-rose-400' },
];

const paymentStats = [
  { label: 'ARPU', value: `¥${mockDashboardStats.arpu}` },
  { label: '付费率', value: `${mockDashboardStats.payRate}%` },
  { label: '订单数', value: mockDashboardStats.totalOrders.toLocaleString() },
];

const gameStats = [
  { label: '抽卡次数', value: '2.3M' },
  { label: '战斗次数', value: '1.5M' },
  { label: '平均在线', value: '125min' },
];

// ==================== Component ====================
export default function DashboardPage() {
  // Chart data from mock
  const dauChartData = useMemo(() => mockDailyStats.map((d) => ({
    date: d.date,
    dau: d.dau,
  })), []);

  const revenueChartData = useMemo(() => mockDailyStats.map((d) => ({
    date: d.date,
    revenue: d.revenue,
  })), []);

  // Last 5 GM logs
  const recentLogs = useMemo(() => mockGmLogs.slice(0, 5), []);

  return (
    <div className="space-y-6">
      {/* ===== Stats Cards Row ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          const isPositive = stat.change !== undefined && stat.change >= 0;
          return (
            <Card
              key={stat.key}
              className={`relative overflow-hidden border ${stat.borderColor}`}
            >
              {/* Subtle gradient background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} pointer-events-none`}
              />
              <CardContent className="relative p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold tracking-tight">
                      {stat.prefix}
                      {stat.value.toLocaleString()}
                    </p>
                  </div>
                  <div className={`rounded-lg p-2.5 ${stat.iconBg}`}>
                    <Icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                </div>
                {/* Change badge or live indicator */}
                <div className="mt-3 flex items-center gap-2">
                  {stat.live ? (
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-violet-500" />
                      </span>
                      <span className="text-xs font-medium text-violet-600 dark:text-violet-400">
                        实时在线
                      </span>
                    </div>
                  ) : stat.change !== undefined ? (
                    <Badge
                      variant="outline"
                      className={`text-xs gap-1 ${
                        isPositive
                          ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5'
                          : 'border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5'
                      }`}
                    >
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {isPositive ? '+' : ''}
                      {stat.change}%
                    </Badge>
                  ) : null}
                  {!stat.live && stat.change !== undefined && (
                    <span className="text-xs text-muted-foreground">较昨日</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ===== Charts Section ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* DAU Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              DAU 趋势
              <span className="text-xs font-normal text-muted-foreground">
                近30天
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={dauChartConfig} className="h-[280px] w-full">
              <LineChart
                data={dauChartData}
                margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [`${Number(value).toLocaleString()}`, 'DAU']}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  type="monotone"
                  dataKey="dau"
                  stroke="var(--color-amber-500)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Revenue Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              收入趋势
              <span className="text-xs font-normal text-muted-foreground">
                近30天
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="h-[280px] w-full">
              <BarChart
                data={revenueChartData}
                margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  fontSize={11}
                  tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [`¥${Number(value).toLocaleString()}`, '收入']}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="revenue"
                  fill="var(--color-emerald-500)"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* ===== Quick Stats Grid ===== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Retention */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Timer className="h-4 w-4 text-amber-500" />
              留存率
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {retentionStats.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-muted-foreground">
                    {item.label}
                  </span>
                  <span className={`text-sm font-bold ${item.color}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              付费指标
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {paymentStats.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="text-sm font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Game Activity */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Swords className="h-4 w-4 text-violet-500" />
              游戏数据
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {gameStats.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="text-sm font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== Recent Activity Table ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            最近 GM 操作
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[140px]">时间</TableHead>
                <TableHead>操作员</TableHead>
                <TableHead>操作</TableHead>
                <TableHead>目标</TableHead>
                <TableHead className="hidden sm:table-cell">详情</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground font-mono">
                    {log.createdAt.split(' ')[1]}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
                      {log.operatorName}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium text-sm">
                    {log.action}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {log.targetType}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-xs text-muted-foreground max-w-[240px] truncate">
                    {log.detail}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
