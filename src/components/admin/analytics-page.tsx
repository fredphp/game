'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Users,
  DollarSign,
  UserPlus,
  Wifi,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Database,
  Sparkles,
  Timer,
  CreditCard,
  Crown,
  Trophy,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import {
  AreaChart,
  LineChart,
  ComposedChart,
  PieChart,
  Pie,
  Area,
  Line,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// ==================== Types ====================
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  fromCache: boolean;
}

interface OverviewData {
  onlineNow: number;
  onlineToday: number;
  dau: number;
  dauChange: number;
  mau: number;
  mauChange: number;
  newUsers: number;
  newUsersChange: number;
  revenue: number;
  revenueChange: number;
  arpu: number;
  payRate: number;
  retention1: number;
  retention7: number;
  retention30: number;
  totalOrders: number;
  totalDraws: number;
  avgOnline: number;
  serverCount: number;
}

interface DauMauItem {
  date: string;
  dau: number;
  mau: number;
  newUsers: number;
}

interface RetentionTrendItem {
  date: string;
  retention1: number;
  retention7: number;
  retention30: number;
}

interface CohortRow {
  cohortDate: string;
  cohortSize: number;
  day1: number;
  day3: number;
  day7: number;
  day14: number;
  day30: number;
}

interface RetentionData {
  trend: RetentionTrendItem[];
  cohortTable: CohortRow[];
  average: { retention1: number; retention7: number; retention30: number };
}

interface GachaTrendItem {
  date: string;
  totalDraws: number;
  ssrCount: number;
  srCount: number;
  ssrRate: number;
  srRate: number;
}

interface GachaData {
  trend: GachaTrendItem[];
  rarityDistribution: { name: string; count: number; rate: number; color: string }[];
  poolDistribution: { poolName: string; draws: number }[];
  heroRanking: { heroName: string; rarity: string; count: number }[];
  pityStats: { avgPity: number; hardPityCount: number; totalSamples: number };
  summary: { totalDraws: number; totalSSR: number; totalSR: number; totalR: number };
}

interface RevenueTrendItem {
  date: string;
  revenue: number;
  orders: number;
  payRate: number;
  arpu: number;
}

interface RevenueData {
  trend: RevenueTrendItem[];
  breakdown: { type: string; name: string; count: number; amount: number; percentage: number }[];
  pieData: { type: string; name: string; count: number; amount: number; percentage: number; fill: string }[];
  methodDistribution: { method: string; amount: number }[];
  topSpenders: { userId: number; nickname: string; totalAmount: number; totalDiamond: number; orderCount: number }[];
  summary: {
    totalRevenue: number;
    dailyAvgRevenue: number;
    totalOrders: number;
    avgOrderAmount: number;
    avgArpu: number;
    avgPayRate: number;
  };
}

// ==================== Chart Configs ====================
const dauMauConfig = {
  dau: { label: 'DAU', color: 'hsl(38, 92%, 50%)' },
  mau: { label: 'MAU', color: 'hsl(25, 95%, 53%)' },
  newUsers: { label: '新增用户', color: 'hsl(142, 71%, 45%)' },
};

const retentionConfig = {
  retention1: { label: '1日留存', color: 'hsl(350, 89%, 60%)' },
  retention7: { label: '7日留存', color: 'hsl(25, 95%, 53%)' },
  retention30: { label: '30日留存', color: 'hsl(38, 92%, 50%)' },
};

const gachaConfig = {
  totalDraws: { label: '抽卡次数', color: 'hsl(263, 70%, 58%)' },
  ssrRate: { label: 'SSR概率 (%)', color: 'hsl(38, 92%, 50%)' },
};

const gachaPieConfig = {
  SSR: { label: 'SSR', color: 'hsl(38, 92%, 50%)' },
  SR: { label: 'SR', color: 'hsl(263, 70%, 58%)' },
  R: { label: 'R', color: 'hsl(0, 0%, 59%)' },
};

const revenueAreaConfig = {
  revenue: { label: '收入 (¥)', color: 'hsl(142, 71%, 45%)' },
};

const revenuePieConfig = {
  diamond: { label: '钻石充值', color: 'hsl(38, 92%, 50%)' },
  monthly: { label: '月卡', color: 'hsl(142, 71%, 45%)' },
  gift: { label: '礼包', color: 'hsl(263, 70%, 58%)' },
  vip: { label: 'VIP', color: 'hsl(350, 89%, 60%)' },
};

// ==================== Animation Variants ====================
const fadeInUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: 'easeOut' },
};

// ==================== Helper: Change Badge ====================
function ChangeBadge({ value }: { value: number }) {
  if (value === 0)
    return (
      <Badge variant="secondary" className="text-xs font-medium px-1.5 py-0">
        --
      </Badge>
    );
  const isUp = value > 0;
  return (
    <Badge
      variant="secondary"
      className={`text-xs font-medium px-1.5 py-0 ${
        isUp
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
          : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
      }`}
    >
      {isUp ? (
        <TrendingUp className="h-3 w-3 mr-0.5" />
      ) : (
        <TrendingDown className="h-3 w-3 mr-0.5" />
      )}
      {isUp ? '+' : ''}
      {value}%
    </Badge>
  );
}

// ==================== Helper: Cache Badge ====================
function CacheBadge({ fromCache }: { fromCache: boolean }) {
  if (!fromCache) return null;
  return (
    <Badge
      variant="outline"
      className="text-[10px] font-normal px-1.5 py-0 text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5"
    >
      <Database className="h-2.5 w-2.5 mr-0.5" />
      缓存
    </Badge>
  );
}

// ==================== Skeleton: KPI Cards ====================
function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="rounded-xl border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="h-8 w-28 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ==================== Skeleton: Chart ====================
function ChartSkeleton() {
  return (
    <Card className="rounded-xl border-border/50">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-5 w-24" />
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[300px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

// ==================== Table Skeleton ====================
function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className="h-8 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

// ==================== KPI Card Component ====================
function KpiCard({
  title,
  value,
  subtitle,
  change,
  icon: Icon,
  iconBg,
  iconColor,
  borderClass,
  gradientBg,
}: {
  title: string;
  value: string;
  subtitle?: string;
  change: number;
  icon: React.ComponentType<{ className?: string }>;
  iconBg: string;
  iconColor: string;
  borderClass: string;
  gradientBg: string;
}) {
  return (
    <motion.div {...fadeInUp}>
      <Card className={`rounded-xl ${borderClass} border-l-4 overflow-hidden`}>
        <div className={`absolute inset-0 ${gradientBg} opacity-30 pointer-events-none`} style={{ position: 'absolute' }} />
        <CardContent className="p-4 relative">
          <div className="flex items-start justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">{title}</span>
            <div className={`rounded-lg p-2 ${iconBg}`}>
              <Icon className={`h-4 w-4 ${iconColor}`} />
            </div>
          </div>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-2xl font-bold tracking-tight">{value}</span>
            <ChangeBadge value={change} />
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ==================== Custom Scrollbar Styles ====================
const scrollbarStyle = (
  <style>{`
    .analytics-scroll::-webkit-scrollbar { width: 6px; }
    .analytics-scroll::-webkit-scrollbar-track { background: transparent; }
    .analytics-scroll::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 3px; }
    .analytics-scroll::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)); }
  `}</style>
);

// ==================== Main Component ====================
export default function AnalyticsPage() {
  // Data states
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [overviewCache, setOverviewCache] = useState(false);
  const [dauMauData, setDauMauData] = useState<DauMauItem[]>([]);
  const [dauMauCache, setDauMauCache] = useState(false);
  const [retentionData, setRetentionData] = useState<RetentionData | null>(null);
  const [retentionCache, setRetentionCache] = useState(false);
  const [gachaData, setGachaData] = useState<GachaData | null>(null);
  const [gachaCache, setGachaCache] = useState(false);
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null);
  const [revenueCache, setRevenueCache] = useState(false);

  // Loading states
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingDauMau, setLoadingDauMau] = useState(true);
  const [loadingRetention, setLoadingRetention] = useState(true);
  const [loadingGacha, setLoadingGacha] = useState(true);
  const [loadingRevenue, setLoadingRevenue] = useState(true);

  // Auto-refresh
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Async fetch helper (plain function, no hooks)
  async function fetchJson<T,>(url: string): Promise<ApiResponse<T> | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  // Data fetching: uses only stable state setters, so empty deps is safe
  const doFetchAll = useCallback(function doFetchAll(): Promise<void> {
    return Promise.all([
      fetchJson<OverviewData>('/api/stats/overview'),
      fetchJson<DauMauItem[]>('/api/stats/dau-mau?days=30'),
      fetchJson<RetentionData>('/api/stats/retention?days=30'),
      fetchJson<GachaData>('/api/stats/gacha?days=14'),
      fetchJson<RevenueData>('/api/stats/revenue?days=30'),
    ]).then(([overviewRes, dauMauRes, retentionRes, gachaRes, revenueRes]) => {
      if (overviewRes?.code === 0 && overviewRes.data) {
        setOverview(overviewRes.data);
        setOverviewCache(overviewRes.fromCache);
      }
      setLoadingOverview(false);

      if (dauMauRes?.code === 0 && dauMauRes.data) {
        setDauMauData(dauMauRes.data);
        setDauMauCache(dauMauRes.fromCache);
      }
      setLoadingDauMau(false);

      if (retentionRes?.code === 0 && retentionRes.data) {
        setRetentionData(retentionRes.data);
        setRetentionCache(retentionRes.fromCache);
      }
      setLoadingRetention(false);

      if (gachaRes?.code === 0 && gachaRes.data) {
        setGachaData(gachaRes.data);
        setGachaCache(gachaRes.fromCache);
      }
      setLoadingGacha(false);

      if (revenueRes?.code === 0 && revenueRes.data) {
        setRevenueData(revenueRes.data);
        setRevenueCache(revenueRes.fromCache);
      }
      setLoadingRevenue(false);
      setRefreshing(false);
    });
  }, []);

  // Ref to hold latest fetch fn for interval callback
  const doFetchAllRef = useRef<() => Promise<void>>();
  useEffect(() => {
    doFetchAllRef.current = doFetchAll;
  }, [doFetchAll]);

  // Initial data fetch on mount
  useEffect(() => {
    doFetchAll();
  }, [doFetchAll]);

  // Auto-refresh interval
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        doFetchAllRef.current?.();
      }, 30000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh]);

  // ==================== Render ====================
  return (
    <div className="space-y-6">
      {scrollbarStyle}

      {/* ===== Header with Auto-refresh ===== */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        {...fadeInUp}
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight">数据分析</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            全维度游戏运营数据看板 · 实时更新
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={autoRefresh ? 'default' : 'outline'}
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className="text-xs h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''} ${autoRefresh ? 'animate-pulse' : ''}`} />
            {autoRefresh ? '自动刷新中 (30s)' : '自动刷新'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setRefreshing(true); doFetchAll(); }}
            disabled={refreshing}
            className="text-xs h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
            手动刷新
          </Button>
        </div>
      </motion.div>

      {/* ===== Section 1: KPI Cards ===== */}
      {loadingOverview ? (
        <KpiSkeleton />
      ) : overview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="日活跃用户 (DAU)"
            value={overview.dau.toLocaleString()}
            subtitle={`MAU: ${overview.mau.toLocaleString()}`}
            change={overview.dauChange}
            icon={Users}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-600 dark:text-amber-400"
            borderClass="border-l-amber-500"
            gradientBg="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20"
          />
          <KpiCard
            title="今日收入"
            value={`¥${overview.revenue.toLocaleString()}`}
            subtitle={`ARPU: ¥${overview.arpu}`}
            change={overview.revenueChange}
            icon={DollarSign}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-600 dark:text-emerald-400"
            borderClass="border-l-emerald-500"
            gradientBg="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20"
          />
          <KpiCard
            title="新增用户"
            value={overview.newUsers.toLocaleString()}
            subtitle={`付费率: ${overview.payRate}%`}
            change={overview.newUsersChange}
            icon={UserPlus}
            iconBg="bg-rose-500/10"
            iconColor="text-rose-600 dark:text-rose-400"
            borderClass="border-l-rose-500"
            gradientBg="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-950/20 dark:to-pink-950/20"
          />
          <KpiCard
            title="当前在线"
            value={overview.onlineNow.toLocaleString()}
            subtitle={`今日累计: ${overview.onlineToday.toLocaleString()}`}
            change={0}
            icon={Wifi}
            iconBg="bg-violet-500/10"
            iconColor="text-violet-600 dark:text-violet-400"
            borderClass="border-l-violet-500"
            gradientBg="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20"
          />
        </div>
      ) : null}

      {/* ===== Section 2: Tabbed Charts ===== */}
      <motion.div {...fadeInUp}>
        <Tabs defaultValue="dau" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4 h-9">
            <TabsTrigger value="dau" className="text-xs gap-1.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400">
              <Activity className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">DAU/MAU</span>
              <span className="sm:hidden">用户</span>
            </TabsTrigger>
            <TabsTrigger value="retention" className="text-xs gap-1.5 data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-700 dark:data-[state=active]:text-rose-400">
              <Timer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">留存率</span>
              <span className="sm:hidden">留存</span>
            </TabsTrigger>
            <TabsTrigger value="gacha" className="text-xs gap-1.5 data-[state=active]:bg-violet-500/10 data-[state=active]:text-violet-700 dark:data-[state=active]:text-violet-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">抽卡统计</span>
              <span className="sm:hidden">抽卡</span>
            </TabsTrigger>
            <TabsTrigger value="revenue" className="text-xs gap-1.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400">
              <CreditCard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">收入统计</span>
              <span className="sm:hidden">收入</span>
            </TabsTrigger>
          </TabsList>

          {/* ===== Tab 1: DAU/MAU 趋势 ===== */}
          <TabsContent value="dau" className="space-y-4">
            {loadingDauMau ? (
              <ChartSkeleton />
            ) : dauMauData.length > 0 ? (
              <>
                <Card className="rounded-xl border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4 text-amber-500" />
                        DAU / MAU 趋势
                        <span className="text-xs font-normal text-muted-foreground">
                          近30天
                        </span>
                      </CardTitle>
                      <CacheBadge fromCache={dauMauCache} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={dauMauConfig} className="h-[300px] w-full">
                      <ComposedChart
                        data={dauMauData}
                        margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="dauGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.02} />
                          </linearGradient>
                          <linearGradient id="mauGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="hsl(25, 95%, 53%)" stopOpacity={0.02} />
                          </linearGradient>
                        </defs>
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
                          tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${(v / 1000).toFixed(0)}k`}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tickLine={false}
                          axisLine={false}
                          tickMargin={8}
                          fontSize={11}
                          tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${(v / 1000).toFixed(0)}k`}
                        />
                        <ChartTooltip
                          content={
                            <ChartTooltipContent
                              formatter={(value, name) => {
                                const v = Number(value);
                                const label = name === 'dau' ? 'DAU' : name === 'mau' ? 'MAU' : '新增用户';
                                return [v.toLocaleString(), label];
                              }}
                            />
                          }
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="dau"
                          stroke="hsl(38, 92%, 50%)"
                          strokeWidth={2}
                          fill="url(#dauGradient)"
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                        <Area
                          yAxisId="right"
                          type="monotone"
                          dataKey="mau"
                          stroke="hsl(25, 95%, 53%)"
                          strokeWidth={2}
                          fill="url(#mauGradient)"
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="newUsers"
                          fill="hsl(142, 71%, 45%)"
                          radius={[2, 2, 0, 0]}
                          maxBarSize={16}
                          opacity={0.6}
                        />
                      </ComposedChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Quick Stats */}
                {dauMauData.length > 0 && (
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      {
                        label: '平均 DAU',
                        value: Math.round(dauMauData.reduce((s, d) => s + d.dau, 0) / dauMauData.length).toLocaleString(),
                        icon: Users,
                        color: 'text-amber-600 dark:text-amber-400',
                        bg: 'bg-amber-500/10',
                      },
                      {
                        label: '平均 MAU',
                        value: Math.round(dauMauData.reduce((s, d) => s + d.mau, 0) / dauMauData.length).toLocaleString(),
                        icon: Layers,
                        color: 'text-orange-600 dark:text-orange-400',
                        bg: 'bg-orange-500/10',
                      },
                      {
                        label: 'DAU/MAU 比',
                        value: `${(dauMauData.reduce((s, d) => s + d.dau, 0) / dauMauData.reduce((s, d) => s + d.mau, 0) * 100).toFixed(1)}%`,
                        icon: TrendingUp,
                        color: 'text-emerald-600 dark:text-emerald-400',
                        bg: 'bg-emerald-500/10',
                      },
                      {
                        label: '累计新增',
                        value: dauMauData.reduce((s, d) => s + d.newUsers, 0).toLocaleString(),
                        icon: UserPlus,
                        color: 'text-rose-600 dark:text-rose-400',
                        bg: 'bg-rose-500/10',
                      },
                    ].map((stat) => {
                      const Icon = stat.icon;
                      return (
                        <Card key={stat.label} className="rounded-xl border-border/50">
                          <CardContent className="p-3 flex items-center gap-3">
                            <div className={`rounded-lg p-2 ${stat.bg}`}>
                              <Icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                            <div>
                              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                              <p className="text-sm font-bold">{stat.value}</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </>
            ) : (
              <Card className="rounded-xl border-border/50">
                <CardContent className="p-8 text-center text-muted-foreground text-sm">
                  暂无数据，请先通过 API 录入统计信息
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== Tab 2: 留存率分析 ===== */}
          <TabsContent value="retention" className="space-y-4">
            {loadingRetention ? (
              <>
                <ChartSkeleton />
                <Card className="rounded-xl border-border/50">
                  <CardContent className="p-4">
                    <TableSkeleton rows={5} cols={6} />
                  </CardContent>
                </Card>
              </>
            ) : retentionData ? (
              <>
                {/* Retention Chart */}
                <Card className="rounded-xl border-border/50">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Timer className="h-4 w-4 text-rose-500" />
                        留存率趋势
                        <span className="text-xs font-normal text-muted-foreground">
                          近30天
                        </span>
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <CacheBadge fromCache={retentionCache} />
                        {retentionData.average && (
                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <span className="text-rose-500 font-semibold">
                              1日 {retentionData.average.retention1}%
                            </span>
                            <span>·</span>
                            <span className="text-amber-500 font-semibold">
                              7日 {retentionData.average.retention7}%
                            </span>
                            <span>·</span>
                            <span className="text-orange-500 font-semibold">
                              30日 {retentionData.average.retention30}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ChartContainer config={retentionConfig} className="h-[300px] w-full">
                      <LineChart
                        data={retentionData.trend}
                        margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
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
                          stroke="hsl(350, 89%, 60%)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="retention7"
                          stroke="hsl(25, 95%, 53%)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="retention30"
                          stroke="hsl(38, 92%, 50%)"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4, strokeWidth: 0 }}
                        />
                      </LineChart>
                    </ChartContainer>
                  </CardContent>
                </Card>

                {/* Cohort Table */}
                {retentionData.cohortTable.length > 0 && (
                  <Card className="rounded-xl border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Layers className="h-4 w-4 text-rose-500" />
                        群组留存分析 (Cohort)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-96 overflow-y-auto analytics-scroll rounded-lg border border-border/50">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-xs sticky top-0 bg-background z-10">注册批次</TableHead>
                              <TableHead className="text-xs text-right sticky top-0 bg-background z-10">用户数</TableHead>
                              <TableHead className="text-xs text-right sticky top-0 bg-background z-10">1日留存</TableHead>
                              <TableHead className="text-xs text-right sticky top-0 bg-background z-10">3日留存</TableHead>
                              <TableHead className="text-xs text-right sticky top-0 bg-background z-10">7日留存</TableHead>
                              <TableHead className="text-xs text-right sticky top-0 bg-background z-10">14日留存</TableHead>
                              <TableHead className="text-xs text-right sticky top-0 bg-background z-10">30日留存</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {retentionData.cohortTable.map((row) => (
                              <TableRow key={row.cohortDate}>
                                <TableCell className="text-xs font-medium">{row.cohortDate}</TableCell>
                                <TableCell className="text-xs text-right">{row.cohortSize.toLocaleString()}</TableCell>
                                <TableCell className="text-xs text-right">
                                  <span className={row.day1 >= 50 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : row.day1 >= 30 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}>
                                    {row.day1}%
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  <span className={row.day3 >= 30 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : row.day3 >= 15 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}>
                                    {row.day3}%
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  <span className={row.day7 >= 25 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : row.day7 >= 10 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}>
                                    {row.day7}%
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  <span className={row.day14 >= 15 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : row.day14 >= 8 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}>
                                    {row.day14}%
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs text-right">
                                  <span className={row.day30 >= 15 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : row.day30 >= 8 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}>
                                    {row.day30}%
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="rounded-xl border-border/50">
                <CardContent className="p-8 text-center text-muted-foreground text-sm">
                  暂无留存数据
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== Tab 3: 抽卡统计 ===== */}
          <TabsContent value="gacha" className="space-y-4">
            {loadingGacha ? (
              <>
                <ChartSkeleton />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card className="rounded-xl border-border/50 lg:col-span-1">
                    <CardContent className="p-4">
                      <Skeleton className="h-[280px] w-full rounded-lg" />
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl border-border/50 lg:col-span-2">
                    <CardContent className="p-4">
                      <TableSkeleton rows={6} cols={4} />
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : gachaData ? (
              <>
                {/* Gacha Trend + Rarity Pie */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Composed Chart */}
                  <Card className="rounded-xl border-border/50 lg:col-span-2">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-violet-500" />
                          抽卡趋势 & SSR概率
                          <span className="text-xs font-normal text-muted-foreground">
                            近14天
                          </span>
                        </CardTitle>
                        <CacheBadge fromCache={gachaCache} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={gachaConfig} className="h-[300px] w-full">
                        <ComposedChart
                          data={gachaData.trend}
                          margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="gachaBarGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(263, 70%, 58%)" stopOpacity={0.9} />
                              <stop offset="95%" stopColor="hsl(263, 70%, 58%)" stopOpacity={0.4} />
                            </linearGradient>
                          </defs>
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
                            tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : `${(v / 1000).toFixed(0)}k`}
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
                                  if (name === 'ssrRate') return [`${value}%`, 'SSR概率'];
                                  return [Number(value).toLocaleString(), '抽卡次数'];
                                }}
                              />
                            }
                          />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Bar
                            yAxisId="left"
                            dataKey="totalDraws"
                            fill="url(#gachaBarGrad)"
                            radius={[3, 3, 0, 0]}
                            maxBarSize={24}
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="ssrRate"
                            stroke="hsl(38, 92%, 50%)"
                            strokeWidth={2.5}
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                          />
                        </ComposedChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Rarity Pie */}
                  <Card className="rounded-xl border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        品质分布
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={gachaPieConfig} className="h-[200px] w-full">
                        <PieChart>
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value, name) => [Number(value).toLocaleString(), `${name}`]}
                              />
                            }
                          />
                          <Pie
                            data={gachaData.rarityDistribution}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="name"
                            stroke="none"
                          >
                            {gachaData.rarityDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ChartContainer>
                      {/* Legend */}
                      <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                        {gachaData.rarityDistribution.map((item) => (
                          <div key={item.name} className="flex items-center gap-1.5">
                            <div
                              className="h-2.5 w-2.5 rounded-sm"
                              style={{ backgroundColor: item.color }}
                            />
                            <span className="text-xs text-muted-foreground">{item.name}</span>
                            <span className="text-xs font-semibold">{item.rate}%</span>
                          </div>
                        ))}
                      </div>

                      {/* Pity Stats */}
                      {gachaData.pityStats.totalSamples > 0 && (
                        <div className="mt-3 space-y-2 pt-3 border-t border-border/50">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">平均保底抽数</span>
                            <span className="font-semibold">{gachaData.pityStats.avgPity}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">触发硬保底次数</span>
                            <span className="font-semibold text-amber-600 dark:text-amber-400">
                              {gachaData.pityStats.hardPityCount}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">样本数</span>
                            <span className="font-semibold">{gachaData.pityStats.totalSamples}</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: '总抽卡次数', value: gachaData.summary.totalDraws.toLocaleString(), icon: Sparkles, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
                    { label: 'SSR 总数', value: gachaData.summary.totalSSR.toLocaleString(), icon: Crown, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
                    { label: 'SR 总数', value: gachaData.summary.totalSR.toLocaleString(), icon: Trophy, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
                    { label: 'R 总数', value: gachaData.summary.totalR.toLocaleString(), icon: Layers, color: 'text-muted-foreground', bg: 'bg-muted' },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <Card key={stat.label} className="rounded-xl border-border/50">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={`rounded-lg p-2 ${stat.bg}`}>
                            <Icon className={`h-4 w-4 ${stat.color}`} />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                            <p className="text-sm font-bold">{stat.value}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Hero Ranking */}
                {gachaData.heroRanking.length > 0 && (
                  <Card className="rounded-xl border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-amber-500" />
                        武将抽取排行 TOP 10
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-96 overflow-y-auto analytics-scroll rounded-lg border border-border/50">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-xs w-12 sticky top-0 bg-background z-10">排名</TableHead>
                              <TableHead className="text-xs sticky top-0 bg-background z-10">武将</TableHead>
                              <TableHead className="text-xs sticky top-0 bg-background z-10">品质</TableHead>
                              <TableHead className="text-xs text-right sticky top-0 bg-background z-10">抽取次数</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {gachaData.heroRanking.map((hero, i) => (
                              <TableRow key={`${hero.heroName}-${i}`}>
                                <TableCell className="text-xs">
                                  <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    i === 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                                    i === 1 ? 'bg-stone-400/20 text-stone-500' :
                                    i === 2 ? 'bg-orange-500/20 text-orange-600' :
                                    'bg-muted text-muted-foreground'
                                  }`}>
                                    {i + 1}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs font-medium">{hero.heroName || '--'}</TableCell>
                                <TableCell className="text-xs">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-medium ${
                                      hero.rarity === 'SSR' ? 'border-amber-500/50 text-amber-600 dark:text-amber-400 bg-amber-500/5' :
                                      hero.rarity === 'SR' ? 'border-violet-500/50 text-violet-600 dark:text-violet-400 bg-violet-500/5' :
                                      'border-border/50 text-muted-foreground'
                                    }`}
                                  >
                                    {hero.rarity}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-xs text-right font-semibold">{hero.count.toLocaleString()}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="rounded-xl border-border/50">
                <CardContent className="p-8 text-center text-muted-foreground text-sm">
                  暂无抽卡数据
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== Tab 4: 收入统计 ===== */}
          <TabsContent value="revenue" className="space-y-4">
            {loadingRevenue ? (
              <>
                <ChartSkeleton />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <Card className="rounded-xl border-border/50 lg:col-span-1">
                    <CardContent className="p-4">
                      <Skeleton className="h-[280px] w-full rounded-lg" />
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl border-border/50 lg:col-span-2">
                    <CardContent className="p-4">
                      <TableSkeleton rows={6} cols={4} />
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : revenueData ? (
              <>
                {/* Revenue Trend + Breakdown Pie */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Revenue Area Chart */}
                  <Card className="rounded-xl border-border/50 lg:col-span-2">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-emerald-500" />
                          日收入趋势
                          <span className="text-xs font-normal text-muted-foreground">
                            近30天
                          </span>
                        </CardTitle>
                        <CacheBadge fromCache={revenueCache} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={revenueAreaConfig} className="h-[300px] w-full">
                        <AreaChart
                          data={revenueData.trend}
                          margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.35} />
                              <stop offset="95%" stopColor="hsl(142, 71%, 45%)" stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
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
                            tickFormatter={(v) => `¥${v >= 10000 ? `${(v / 10000).toFixed(1)}万` : v.toLocaleString()}`}
                          />
                          <ChartTooltip
                            content={
                              <ChartTooltipContent
                                formatter={(value) => [`¥${Number(value).toLocaleString()}`, '收入']}
                              />
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="hsl(142, 71%, 45%)"
                            strokeWidth={2}
                            fill="url(#revenueGradient)"
                            dot={false}
                            activeDot={{ r: 4, strokeWidth: 0 }}
                          />
                        </AreaChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Revenue Breakdown Pie */}
                  <Card className="rounded-xl border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-emerald-500" />
                        收入构成
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {revenueData.pieData.length > 0 ? (
                        <>
                          <ChartContainer config={revenuePieConfig} className="h-[200px] w-full">
                            <PieChart>
                              <ChartTooltip
                                content={
                                  <ChartTooltipContent
                                    formatter={(value, name) => [`¥${Number(value).toLocaleString()}`, name as string]}
                                  />
                                }
                              />
                              <Pie
                                data={revenueData.pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={80}
                                paddingAngle={3}
                                dataKey="amount"
                                nameKey="name"
                                stroke="none"
                              >
                                {revenueData.pieData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ChartContainer>
                          {/* Legend */}
                          <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
                            {revenueData.pieData.map((item) => (
                              <div key={item.type} className="flex items-center gap-1.5">
                                <div
                                  className="h-2.5 w-2.5 rounded-sm"
                                  style={{ backgroundColor: item.fill }}
                                />
                                <span className="text-xs text-muted-foreground">{item.name}</span>
                                <span className="text-xs font-semibold">{item.percentage}%</span>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-xs">
                          暂无收入构成数据
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { label: '总收入', value: `¥${revenueData.summary.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: '日均收入', value: `¥${revenueData.summary.dailyAvgRevenue.toLocaleString()}`, icon: TrendingUp, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' },
                    { label: '平均订单额', value: `¥${revenueData.summary.avgOrderAmount}`, icon: CreditCard, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-500/10' },
                    { label: '平均 ARPU', value: `¥${revenueData.summary.avgArpu}`, icon: Zap, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-500/10' },
                  ].map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <Card key={stat.label} className="rounded-xl border-border/50">
                        <CardContent className="p-3 flex items-center gap-3">
                          <div className={`rounded-lg p-2 ${stat.bg}`}>
                            <Icon className={`h-4 w-4 ${stat.color}`} />
                          </div>
                          <div>
                            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
                            <p className="text-sm font-bold">{stat.value}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Additional Stats Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <Card className="rounded-xl border-border/50">
                    <CardContent className="p-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">总订单数</span>
                      <span className="text-sm font-bold">{revenueData.summary.totalOrders.toLocaleString()}</span>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl border-border/50">
                    <CardContent className="p-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">平均付费率</span>
                      <span className="text-sm font-bold">{revenueData.summary.avgPayRate}%</span>
                    </CardContent>
                  </Card>
                  <Card className="rounded-xl border-border/50">
                    <CardContent className="p-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">收入来源</span>
                      <div className="flex items-center gap-1.5">
                        {revenueData.breakdown.slice(0, 3).map((b) => (
                          <Badge key={b.type} variant="outline" className="text-[10px] px-1.5 py-0">
                            {b.name} {b.percentage}%
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Top Spenders Table */}
                {revenueData.topSpenders.length > 0 && (
                  <Card className="rounded-xl border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <Crown className="h-4 w-4 text-amber-500" />
                        高消费用户排行 TOP 10
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="max-h-96 overflow-y-auto analytics-scroll rounded-lg border border-border/50">
                        <Table>
                          <TableHeader>
                            <TableRow className="hover:bg-transparent">
                              <TableHead className="text-xs w-12 sticky top-0 bg-background z-10">排名</TableHead>
                              <TableHead className="text-xs sticky top-0 bg-background z-10">用户</TableHead>
                              <TableHead className="text-xs text-right sticky top-0 bg-background z-10">消费金额</TableHead>
                              <TableHead className="text-xs text-right sticky top-0 bg-background z-10">钻石</TableHead>
                              <TableHead className="text-xs text-right sticky top-0 bg-background z-10">订单数</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {revenueData.topSpenders.map((spender, i) => (
                              <TableRow key={spender.userId}>
                                <TableCell className="text-xs">
                                  <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                                    i === 0 ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' :
                                    i === 1 ? 'bg-stone-400/20 text-stone-500' :
                                    i === 2 ? 'bg-orange-500/20 text-orange-600' :
                                    'bg-muted text-muted-foreground'
                                  }`}>
                                    {i + 1}
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs">
                                  <div>
                                    <p className="font-medium">{spender.nickname || `UID:${spender.userId}`}</p>
                                    <p className="text-[10px] text-muted-foreground">UID: {spender.userId}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-right font-semibold text-emerald-600 dark:text-emerald-400">
                                  ¥{spender.totalAmount.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-xs text-right">{spender.totalDiamond.toLocaleString()}</TableCell>
                                <TableCell className="text-xs text-right">{spender.orderCount}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="rounded-xl border-border/50">
                <CardContent className="p-8 text-center text-muted-foreground text-sm">
                  暂无收入数据
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
