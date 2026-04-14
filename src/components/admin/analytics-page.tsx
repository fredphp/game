'use client';

import { useMemo } from 'react';
import {
  Timer,
  Swords,
  Sparkles,
  Wifi,
  TrendingUp,
  ChevronDown,
  Gem,
  CreditCard,
  Crown,
  Gift,
  Users,
  GraduationCap,
  Shield,
  Trophy,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  BarChart,
  ComposedChart,
  PieChart,
  Pie,
  Line,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import {
  mockDailyStats,
  mockGachaStats,
  mockDashboardStats,
} from '@/lib/admin-data';

// ==================== Chart Configs ====================
const retentionChartConfig = {
  retention1: { label: '1日留存', color: 'var(--color-emerald-500)' },
  retention7: { label: '7日留存', color: 'var(--color-amber-500)' },
  retention30: { label: '30日留存', color: 'var(--color-rose-400)' },
};

const gachaChartConfig = {
  totalDraws: { label: '抽卡次数', color: 'var(--color-violet-500)' },
  ssrRate: { label: 'SSR概率 (%)', color: 'var(--color-amber-500)' },
};

const revenuePieConfig = {
  diamond: { label: '钻石充值', color: 'var(--color-amber-500)' },
  monthly: { label: '月卡', color: 'var(--color-emerald-500)' },
  gift: { label: '礼包', color: 'var(--color-violet-500)' },
  vip: { label: 'VIP', color: 'var(--color-rose-400)' },
};

// ==================== Pie Chart Colors ====================
const PIE_COLORS = [
  'var(--color-amber-500)',
  'var(--color-emerald-500)',
  'var(--color-violet-500)',
  'var(--color-rose-400)',
];

// ==================== Revenue Breakdown Data ====================
const revenueBreakdownData = [
  { name: '钻石充值', value: 60, fill: PIE_COLORS[0] },
  { name: '月卡', value: 15, fill: PIE_COLORS[1] },
  { name: '礼包', value: 15, fill: PIE_COLORS[2] },
  { name: 'VIP', value: 10, fill: PIE_COLORS[3] },
];

// ==================== Funnel Data ====================
const funnelData = [
  { label: '注册', value: 100000, icon: Users, pct: 100 },
  { label: '完成新手引导', value: 78000, icon: GraduationCap, pct: 78 },
  { label: '首次战斗', value: 65000, icon: Swords, pct: 65 },
  { label: '首次充值', value: 12000, icon: CreditCard, pct: 12 },
  { label: '7日留存', value: 28000, icon: Trophy, pct: 28 },
];

const funnelColors = [
  'bg-sky-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-violet-500',
  'bg-rose-500',
];

// ==================== Real-time Metrics ====================
const realtimeMetrics = [
  {
    label: '峰值并发',
    value: '45,632',
    icon: Wifi,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10',
  },
  {
    label: '平均会话时长',
    value: '42min',
    icon: Timer,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10',
  },
  {
    label: '今日战斗总数',
    value: '1,523,456',
    icon: Swords,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10',
  },
  {
    label: '今日抽卡次数',
    value: '2,345,678',
    icon: Sparkles,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10',
  },
];

// ==================== Component ====================
export default function AnalyticsPage() {
  // Retention data: augment dailyStats with generated retention7/retention30
  const retentionChartData = useMemo(
    () =>
      mockDailyStats.map((d) => ({
        date: d.date,
        retention1: d.retention1,
        retention7: +(d.retention1 * 0.63).toFixed(1), // ~28.5% of 45%
        retention30: +(d.retention1 * 0.34).toFixed(1), // ~15.3% of 45%
      })),
    []
  );

  // Gacha data: compose chart data
  const gachaChartData = useMemo(
    () =>
      mockGachaStats.map((d) => ({
        date: d.date,
        totalDraws: d.totalDraws,
        ssrRate: d.ssrRate,
      })),
    []
  );

  // Funnel max for width calculation
  const funnelMax = funnelData[0].value;

  // Revenue breakdown with labels for pie
  const pieData = useMemo(
    () =>
      revenueBreakdownData.map((d) => ({
        ...d,
        name: `${d.name} ${d.value}%`,
      })),
    []
  );

  return (
    <div className="space-y-6">
      {/* ===== Retention Chart ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Timer className="h-4 w-4 text-emerald-500" />
            留存率趋势
            <span className="text-xs font-normal text-muted-foreground">
              近30天
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={retentionChartConfig}
            className="h-[320px] w-full"
          >
            <LineChart
              data={retentionChartData}
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
                domain={[0, 60]}
                tickFormatter={(v) => `${v}%`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => [`${value}%`]}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey="retention1"
                stroke="var(--color-emerald-500)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="retention7"
                stroke="var(--color-amber-500)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
              <Line
                type="monotone"
                dataKey="retention30"
                stroke="var(--color-rose-400)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* ===== Gacha Statistics Chart ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            抽卡统计
            <span className="text-xs font-normal text-muted-foreground">
              近14天
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={gachaChartConfig}
            className="h-[320px] w-full"
          >
            <ComposedChart
              data={gachaChartData}
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
                yAxisId="left"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                fontSize={11}
                domain={[0, 5]}
                tickFormatter={(v) => `${v}%`}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => {
                      if (name === 'ssrRate')
                        return [`${value}%`, 'SSR概率'];
                      return [Number(value).toLocaleString(), '抽卡次数'];
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar
                yAxisId="left"
                dataKey="totalDraws"
                fill="var(--color-violet-500)"
                radius={[3, 3, 0, 0]}
                maxBarSize={24}
                opacity={0.85}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="ssrRate"
                stroke="var(--color-amber-500)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* ===== Revenue Breakdown + Real-time Metrics ===== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-amber-500" />
              收入构成
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={revenuePieConfig}
              className="h-[280px] w-full"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value) => [`${value}%`, '占比']}
                    />
                  }
                />
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            {/* Legend below pie */}
            <div className="flex items-center justify-center gap-4 pt-2 flex-wrap">
              {revenueBreakdownData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: PIE_COLORS[i] }}
                  />
                  <span className="text-xs text-muted-foreground">
                    {item.name}
                  </span>
                  <span className="text-xs font-semibold">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Real-time Metrics */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              实时指标
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {realtimeMetrics.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div
                    key={metric.label}
                    className="flex items-start gap-3 rounded-xl border border-border/50 bg-muted/30 p-4"
                  >
                    <div className={`rounded-lg p-2 ${metric.bg}`}>
                      <Icon className={`h-4 w-4 ${metric.color}`} />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {metric.label}
                      </p>
                      <p className="text-lg font-bold tracking-tight">
                        {metric.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ===== User Funnel ===== */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            用户转化漏斗
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {funnelData.map((step, i) => {
              const Icon = step.icon;
              const widthPct = (step.value / funnelMax) * 100;
              const dropOff =
                i > 0
                  ? ((1 - step.value / funnelData[i - 1].value) * 100).toFixed(
                      1
                    )
                  : null;

              return (
                <div key={step.label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium">{step.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold">
                        {step.value.toLocaleString()}
                      </span>
                      <Badge
                        variant="outline"
                        className="text-[10px] border-border/50"
                      >
                        {step.pct}%
                      </Badge>
                      {dropOff && (
                        <span className="text-[10px] text-muted-foreground">
                          -{dropOff}%
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Funnel bar */}
                  <div className="relative h-8 rounded-lg bg-muted/40 overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-lg ${funnelColors[i]} transition-all duration-500 flex items-center px-3`}
                      style={{ width: `${widthPct}%`, opacity: 0.85 }}
                    >
                      {/* Chevron between bars */}
                      {i < funnelData.length - 1 && (
                        <ChevronDown
                          className="absolute -bottom-4 left-1/2 -translate-x-1/2 h-3 w-3 text-muted-foreground/40"
                        />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
