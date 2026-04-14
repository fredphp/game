'use client';

import { useState, useMemo } from 'react';
import {
  Coins,
  Wheat,
  TreePine,
  Mountain,
  Gem,
  Trophy,
  Calculator,
  TrendingUp,
  TrendingDown,
  ArrowDownUp,
  Clock,
  Shield,
  Sparkles,
  HelpCircle,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  AreaChart,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';

// ==================== Types ====================
interface ResourceConfig {
  key: string;
  name: string;
  nameEn: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  baseProduction: number;
  cityBonus: number;
  techBonus: number;
  vipBonus: number;
  globalMultiplier: number;
}

interface BuildingConfig {
  key: string;
  name: string;
  nameEn: string;
  baseCost: number;
  costGrowth: number;
  maxLevel: number;
}

// ==================== Initial Data ====================
const initialResources: ResourceConfig[] = [
  { key: 'gold', name: '金币', nameEn: 'Gold', icon: Coins, color: 'var(--color-amber-500)', baseProduction: 500, cityBonus: 0.12, techBonus: 0.02, vipBonus: 0.05, globalMultiplier: 1.0 },
  { key: 'food', name: '粮食', nameEn: 'Food', icon: Wheat, color: 'var(--color-emerald-500)', baseProduction: 300, cityBonus: 0.10, techBonus: 0.02, vipBonus: 0.03, globalMultiplier: 1.0 },
  { key: 'wood', name: '木材', nameEn: 'Wood', icon: TreePine, color: 'var(--color-lime-600)', baseProduction: 200, cityBonus: 0.10, techBonus: 0.02, vipBonus: 0.03, globalMultiplier: 1.0 },
  { key: 'iron', name: '铁矿', nameEn: 'Iron', icon: Mountain, color: 'var(--color-stone-500)', baseProduction: 100, cityBonus: 0.08, techBonus: 0.01, vipBonus: 0.02, globalMultiplier: 1.0 },
  { key: 'jade', name: '玉珏', nameEn: 'Jade', icon: Gem, color: 'var(--color-violet-500)', baseProduction: 5, cityBonus: 0.02, techBonus: 0.00, vipBonus: 0.01, globalMultiplier: 1.0 },
  { key: 'honor', name: '声望', nameEn: 'Honor', icon: Trophy, color: 'var(--color-rose-500)', baseProduction: 10, cityBonus: 0.05, techBonus: 0.01, vipBonus: 0.02, globalMultiplier: 1.0 },
];

const initialBuildings: BuildingConfig[] = [
  { key: 'castle', name: '主城', nameEn: 'Castle', baseCost: 1000, costGrowth: 1.18, maxLevel: 25 },
  { key: 'barracks', name: '兵营', nameEn: 'Barracks', baseCost: 500, costGrowth: 1.15, maxLevel: 20 },
  { key: 'forge', name: '铁匠铺', nameEn: 'Forge', baseCost: 400, costGrowth: 1.15, maxLevel: 15 },
  { key: 'granary', name: '粮仓', nameEn: 'Granary', baseCost: 300, costGrowth: 1.12, maxLevel: 20 },
  { key: 'lumber', name: '伐木场', nameEn: 'Lumber Mill', baseCost: 300, costGrowth: 1.12, maxLevel: 20 },
  { key: 'mine', name: '矿场', nameEn: 'Mine', baseCost: 350, costGrowth: 1.13, maxLevel: 15 },
  { key: 'academy', name: '研究院', nameEn: 'Academy', baseCost: 800, costGrowth: 1.20, maxLevel: 15 },
  { key: 'market', name: '市场', nameEn: 'Market', baseCost: 600, costGrowth: 1.16, maxLevel: 15 },
];

const gachaPricing = [
  { type: '单抽', currency: '钻石 Diamond', cost: 160, desc: '常规单抽' },
  { type: '十连', currency: '钻石 Diamond', cost: 1600, desc: '十连抽 (9+1)' },
  { type: '单抽', currency: '招募券 Ticket', cost: 1, desc: '免费券抽' },
  { type: '十连', currency: '招募券 Ticket', cost: 10, desc: '免费券十连' },
  { type: '限时单抽', currency: '玉珏 Jade', cost: 200, desc: '限定池单抽' },
];

const diamondSources = [
  { source: '每日签到', daily: 100, weeklyCap: 700, notes: '线性递增' },
  { source: '每日任务', daily: 60, weeklyCap: 420, notes: '基础30+活跃30' },
  { source: '竞技场排名', daily: 150, weeklyCap: 2100, notes: 'Top1=300, Top100=30' },
  { source: '攻城奖励', daily: 250, weeklyCap: 3500, notes: '根据排名' },
  { source: '月卡', daily: 300, weeklyCap: 9000, notes: '付费' },
  { source: '成长基金', daily: 0, weeklyCap: 8000, notes: '一次性8000, 付费' },
  { source: '活动产出', daily: 500, weeklyCap: 6000, notes: '周均' },
];

const resourceSinks = [
  { sink: '武将升级', type: 'Gold', dailyDrain: 50000, desc: '主要金币回收' },
  { sink: '装备强化', type: 'Gold + Iron', dailyDrain: 30000, desc: '' },
  { sink: '科技研究', type: 'Gold + Food', dailyDrain: 20000, desc: '' },
  { sink: '兵力训练', type: 'Food', dailyDrain: 15000, desc: '' },
  { sink: '行军消耗', type: 'Food + Gold', dailyDrain: 10000, desc: '' },
  { sink: '建筑升级', type: 'Gold', dailyDrain: 25000, desc: '阶段性' },
  { sink: '商店购买', type: 'Diamond', dailyDrain: 200, desc: '' },
  { sink: '竞技场刷新', type: 'Diamond', dailyDrain: 100, desc: '' },
];

const timeGates = [
  { type: '每日重置', cycle: '00:00', resets: '每日任务、竞技场次数、签到' },
  { type: '每周重置', cycle: '周一 00:00', resets: '竞技场赛季、联盟战' },
  { type: '每月重置', cycle: '每月1日 00:00', resets: '月卡奖励、排名奖励' },
];

const softCaps = [
  { resource: '金币 Gold', baseCap: 1000000, vipMult: 0.2 },
  { resource: '粮食 Food', baseCap: 500000, vipMult: 0.2 },
  { resource: '木材 Wood', baseCap: 400000, vipMult: 0.2 },
  { resource: '铁矿 Iron', baseCap: 300000, vipMult: 0.2 },
  { resource: '玉珏 Jade', baseCap: 5000, vipMult: 0.15 },
  { resource: '声望 Honor', baseCap: 10000, vipMult: 0.1 },
];

// ==================== Helper Functions ====================
function calcProduction(
  base: number,
  cityLvl: number,
  cityBonus: number,
  techLvl: number,
  techBonus: number,
  vipLvl: number,
  vipBonus: number,
  globalMult: number
) {
  return base * (1 + cityLvl * cityBonus) * (1 + techLvl * techBonus) * (1 + vipLvl * vipBonus) * globalMult;
}

function calcBuildingCost(base: number, growth: number, level: number) {
  return Math.floor(base * Math.pow(growth, level - 1));
}

function calcCumulativeCost(base: number, growth: number, maxLevel: number) {
  let total = 0;
  for (let i = 1; i <= maxLevel; i++) {
    total += calcBuildingCost(base, growth, i);
  }
  return total;
}

function calcHeroCost(baseCost: number, level: number, starLevel: number) {
  return Math.floor(baseCost * Math.pow(level, 1.5) * (1 + starLevel * 0.3));
}

function calcSSRRate(drawCount: number, softPity: number, baseRate: number) {
  const excess = Math.max(0, drawCount - softPity);
  const rate = baseRate + excess * 0.06;
  return Math.min(rate, 1.0);
}

function fmt(n: number) {
  return n.toLocaleString('zh-CN');
}

// ==================== Formula Block ====================
function FormulaBlock({ formula, description }: { formula: string; description: string }) {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
      <div className="flex items-center gap-2 text-xs font-medium text-amber-700 dark:text-amber-400">
        <Calculator className="h-3.5 w-3.5" />
        {description}
      </div>
      <code className="block text-sm font-mono text-foreground leading-relaxed break-all">
        {formula}
      </code>
    </div>
  );
}

// ==================== Editable Number Cell ====================
function EditableCell({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 99999,
  className = '',
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  className?: string;
}) {
  return (
    <Input
      type="number"
      value={value}
      onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
      step={step}
      min={min}
      max={max}
      className={`h-8 w-24 text-xs font-mono text-center ${className}`}
    />
  );
}

// ==================== Main Component ====================
export default function EconomyPage() {
  // --- State ---
  const [resources, setResources] = useState<ResourceConfig[]>(initialResources);
  const [buildings, setBuildings] = useState<BuildingConfig[]>(initialBuildings);

  // Calculator state
  const [cityLevel, setCityLevel] = useState(10);
  const [techLevel, setTechLevel] = useState(5);
  const [vipLevel, setVipLevel] = useState(3);

  // March calculator
  const [marchTroops, setMarchTroops] = useState(1000);
  const [marchDistance, setMarchDistance] = useState(5);

  // Hero calculator
  const [heroLevel, setHeroLevel] = useState(5);
  const [heroStar, setHeroStar] = useState(1);

  // Pity settings
  const [softPity, setSoftPity] = useState(60);
  const [hardPity, setHardPity] = useState(80);
  const [baseSSRRate, setBaseSSRRate] = useState(2);

  // Formula calculator
  const [formulaType, setFormulaType] = useState('production');
  const [calcInputs, setCalcInputs] = useState<Record<string, number>>({
    base: 500, cityLevel: 10, techLevel: 5, vipLevel: 3,
    cityBonus: 0.12, techBonus: 0.02, vipBonus: 0.05, globalMult: 1.0,
    baseCost: 1000, costGrowth: 1.18, level: 10, starLevel: 1,
    heroBase: 3000, troops: 1000, distance: 5, drawCount: 60,
  });

  // --- Derived Data ---
  // Tab 1: Production preview
  const productionPreview = useMemo(() => {
    return resources.map((r) => {
      const hourly = calcProduction(r.baseProduction, cityLevel, r.cityBonus, techLevel, r.techBonus, vipLevel, r.vipBonus, r.globalMultiplier);
      return {
        ...r,
        hourly,
        daily: hourly * 24,
        monthly: Math.floor(hourly * 24 * 30),
      };
    });
  }, [resources, cityLevel, techLevel, vipLevel]);

  // Tab 1: Production curve data (gold over city levels)
  const productionCurveData = useMemo(() => {
    const vipLevels = [0, 5, 10];
    return Array.from({ length: 25 }, (_, i) => {
      const lvl = i + 1;
      const entry: Record<string, number> = { cityLevel: lvl };
      const goldRes = resources[0];
      vipLevels.forEach((v) => {
        entry[`vip${v}`] = calcProduction(goldRes.baseProduction, lvl, goldRes.cityBonus, techLevel, goldRes.techBonus, v, goldRes.vipBonus, goldRes.globalMultiplier);
      });
      return entry;
    });
  }, [resources, techLevel]);

  const productionCurveConfig = useMemo(() => ({
    vip0: { label: 'VIP 0', color: 'var(--color-stone-400)' },
    vip5: { label: 'VIP 5', color: 'var(--color-amber-500)' },
    vip10: { label: 'VIP 10', color: 'var(--color-rose-500)' },
  }), []);

  // Tab 2: Castle cumulative cost
  const castleCumulativeData = useMemo(() => {
    const castle = buildings[0];
    const data: { level: number; singleCost: number; cumulative: number }[] = [];
    let sum = 0;
    for (let i = 0; i < castle.maxLevel; i++) {
      const lvl = i + 1;
      const singleCost = calcBuildingCost(castle.baseCost, castle.costGrowth, lvl);
      sum += singleCost;
      data.push({ level: lvl, singleCost, cumulative: sum });
    }
    return data;
  }, [buildings]);

  const castleChartConfig = useMemo(() => ({
    singleCost: { label: '单级消耗', color: 'var(--color-amber-500)' },
    cumulative: { label: '累计消耗', color: 'var(--color-rose-500)' },
  }), []);

  // Tab 2: Hero upgrade costs
  const heroCostData = useMemo(() => {
    const rarities = [
      { name: 'R', baseCost: 1000, color: 'var(--color-stone-500)' },
      { name: 'SR', baseCost: 3000, color: 'var(--color-violet-500)' },
      { name: 'SSR', baseCost: 10000, color: 'var(--color-amber-500)' },
    ];
    return Array.from({ length: 10 }, (_, i) => {
      const lvl = i + 1;
      const entry: Record<string, number> = { level: lvl };
      rarities.forEach((r) => {
        entry[r.name] = calcHeroCost(r.baseCost, lvl, heroStar);
      });
      return entry;
    });
  }, [heroStar]);

  const heroChartConfig = useMemo(() => ({
    R: { label: 'R 稀有', color: 'var(--color-stone-500)' },
    SR: { label: 'SR 超稀有', color: 'var(--color-violet-500)' },
    SSR: { label: 'SSR 超超稀有', color: 'var(--color-amber-500)' },
  }), []);

  // Tab 2: March cost
  const marchCost = useMemo(() => {
    const foodCost = marchTroops * marchDistance * 0.5;
    const goldCost = marchTroops * 0.1;
    const siegeFoodCost = foodCost * 2;
    const siegeGoldCost = goldCost * 2;
    return { foodCost, goldCost, siegeFoodCost, siegeGoldCost };
  }, [marchTroops, marchDistance]);

  // Tab 3: Pity probability curve
  const pityData = useMemo(() => {
    return Array.from({ length: hardPity }, (_, i) => {
      const n = i + 1;
      const rate = calcSSRRate(n, softPity, baseSSRRate / 100);
      return {
        draw: n,
        rate: Math.round(rate * 10000) / 100,
        isSoftPity: n >= softPity,
      };
    });
  }, [softPity, hardPity, baseSSRRate]);

  const pityChartConfig = useMemo(() => ({
    rate: { label: 'SSR概率 (%)', color: 'var(--color-violet-500)' },
  }), []);

  // Tab 3: Diamond economy summary
  const diamondSummary = useMemo(() => {
    const freeDaily = 100 + 60 + 150 + 250;
    const paidDaily = freeDaily + 300;
    const freeMonthly = freeDaily * 30;
    const paidMonthly = paidDaily * 30 + 8000;
    const tenPullCost = 1600;
    const freeTenPulls = Math.floor(freeMonthly / tenPullCost);
    const paidTenPulls = Math.floor(paidMonthly / tenPullCost);
    const pityCost = hardPity * 160;
    const freeMonthsToSSR = pityCost / freeMonthly;
    const expectedSSRPerTenPull = 0.65;
    return { freeDaily, paidDaily, freeMonthly, paidMonthly, tenPullCost, freeTenPulls, paidTenPulls, pityCost, freeMonthsToSSR, expectedSSRPerTenPull };
  }, [hardPity]);

  // Tab 4: Production vs Consumption
  const prodConsData = useMemo(() => {
    const goldProd = calcProduction(resources[0].baseProduction, cityLevel, resources[0].cityBonus, techLevel, resources[0].techBonus, vipLevel, resources[0].vipBonus, resources[0].globalMultiplier) * 24;
    const foodProd = calcProduction(resources[1].baseProduction, cityLevel, resources[1].cityBonus, techLevel, resources[1].techBonus, vipLevel, resources[1].vipBonus, resources[1].globalMultiplier) * 24;
    return [
      { resource: '金币 Gold', production: goldProd, consumption: 140000 },
      { resource: '粮食 Food', production: foodProd, consumption: 15000 },
      { resource: '木材 Wood', production: calcProduction(resources[2].baseProduction, cityLevel, resources[2].cityBonus, techLevel, resources[2].techBonus, vipLevel, resources[2].vipBonus, resources[2].globalMultiplier) * 24, consumption: 8000 },
      { resource: '铁矿 Iron', production: calcProduction(resources[3].baseProduction, cityLevel, resources[3].cityBonus, techLevel, resources[3].techBonus, vipLevel, resources[3].vipBonus, resources[3].globalMultiplier) * 24, consumption: 10000 },
    ];
  }, [resources, cityLevel, techLevel, vipLevel]);

  const prodConsChartConfig = useMemo(() => ({
    production: { label: '产出', color: 'var(--color-emerald-500)' },
    consumption: { label: '消耗', color: 'var(--color-rose-500)' },
  }), []);

  // Tab 4: Soft cap preview
  const softCapData = useMemo(() => {
    return softCaps.map((sc) => ({
      ...sc,
      cap: Math.floor(sc.baseCap * (1 + vipLevel * sc.vipMult)),
    }));
  }, [vipLevel]);

  // Tab 5: Formula calculator result
  const formulaResult = useMemo(() => {
    const { base, cityLevel: cl, techLevel: tl, vipLevel: vl, cityBonus: cb, techBonus: tb, vipBonus: vb, globalMult: gm, baseCost, costGrowth: cg, level, starLevel: sl, heroBase, troops, distance, drawCount } = calcInputs;
    switch (formulaType) {
      case 'production':
        return { label: '每小时产出', value: calcProduction(base, cl, cb, tl, tb, vl, vb, gm) };
      case 'dailyProduction':
        return { label: '每日产出', value: calcProduction(base, cl, cb, tl, tb, vl, vb, gm) * 24 };
      case 'buildingCost':
        return { label: '升级消耗', value: calcBuildingCost(baseCost, cg, level) };
      case 'cumulativeCost':
        return { label: '累计总消耗', value: calcCumulativeCost(baseCost, cg, level) };
      case 'heroCost':
        return { label: '武将升级消耗', value: calcHeroCost(heroBase, level, sl) };
      case 'marchCost':
        return { label: '行军消耗 (粮食)', value: Math.floor(troops * distance * 0.5) };
      case 'siegeCost':
        return { label: '攻城消耗 (粮食)', value: Math.floor(troops * distance * 0.5 * 2) };
      case 'ssrRate':
        return { label: 'SSR概率 (%)', value: Math.round(calcSSRRate(drawCount, softPity, baseSSRRate / 100) * 10000) / 100 };
      case 'softCap':
        return { label: '资源上限', value: Math.floor(base * (1 + vl * 0.2)) };
      default:
        return { label: '-', value: 0 };
    }
  }, [formulaType, calcInputs, softPity, baseSSRRate]);

  const updateCalcInput = (key: string, val: number) => {
    setCalcInputs((prev) => ({ ...prev, [key]: val }));
  };

  // Resource update helper
  const updateResource = (idx: number, field: keyof ResourceConfig, val: number) => {
    setResources((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: val };
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-amber-500/10 p-2">
          <ArrowDownUp className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">经济设计系统</h1>
          <p className="text-sm text-muted-foreground">SLG 经济公式、消耗模型、抽卡货币控制与通胀控制</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="production" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="production" className="gap-1.5">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <span className="hidden sm:inline">资源产出</span>
            <span className="sm:hidden">产出</span>
          </TabsTrigger>
          <TabsTrigger value="consumption" className="gap-1.5">
            <TrendingDown className="h-4 w-4 text-rose-500" />
            <span className="hidden sm:inline">资源消耗</span>
            <span className="sm:hidden">消耗</span>
          </TabsTrigger>
          <TabsTrigger value="gacha" className="gap-1.5">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <span className="hidden sm:inline">抽卡货币</span>
            <span className="sm:hidden">抽卡</span>
          </TabsTrigger>
          <TabsTrigger value="inflation" className="gap-1.5">
            <Shield className="h-4 w-4 text-sky-500" />
            <span className="hidden sm:inline">通胀控制</span>
            <span className="sm:hidden">通胀</span>
          </TabsTrigger>
          <TabsTrigger value="calculator" className="gap-1.5">
            <Calculator className="h-4 w-4 text-amber-500" />
            <span className="hidden sm:inline">公式计算器</span>
            <span className="sm:hidden">计算器</span>
          </TabsTrigger>
        </TabsList>

        {/* ==================== TAB 1: Resource Production ==================== */}
        <TabsContent value="production" className="space-y-6">
          {/* 1.1 Base Production Formula */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Coins className="h-4 w-4 text-amber-500" />
                1.1 基础产出公式
              </CardTitle>
              <CardDescription>配置每种资源的基础产出参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormulaBlock
                description="产出公式"
                formula="每小时产出 = BaseProduction × (1 + CityLevel × CityBonus) × (1 + TechLevel × TechBonus) × (1 + VIPLevel × VIPBonus) × GlobalMultiplier"
              />
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>资源</TableHead>
                      <TableHead className="text-right">基础产出/h</TableHead>
                      <TableHead className="text-right">城市加成</TableHead>
                      <TableHead className="text-right">科技加成</TableHead>
                      <TableHead className="text-right">VIP加成</TableHead>
                      <TableHead className="text-right">全局倍率</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resources.map((r, idx) => {
                      const Icon = r.icon;
                      return (
                        <TableRow key={r.key}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" style={{ color: r.color }} />
                              <span className="font-medium text-sm">{r.name}</span>
                              <span className="text-xs text-muted-foreground hidden sm:inline">({r.nameEn})</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <EditableCell value={r.baseProduction} onChange={(v) => updateResource(idx, 'baseProduction', v)} />
                          </TableCell>
                          <TableCell className="text-right">
                            <EditableCell value={r.cityBonus} onChange={(v) => updateResource(idx, 'cityBonus', v)} step={0.01} max={1} />
                          </TableCell>
                          <TableCell className="text-right">
                            <EditableCell value={r.techBonus} onChange={(v) => updateResource(idx, 'techBonus', v)} step={0.01} max={1} />
                          </TableCell>
                          <TableCell className="text-right">
                            <EditableCell value={r.vipBonus} onChange={(v) => updateResource(idx, 'vipBonus', v)} step={0.01} max={1} />
                          </TableCell>
                          <TableCell className="text-right">
                            <EditableCell value={r.globalMultiplier} onChange={(v) => updateResource(idx, 'globalMultiplier', v)} step={0.1} max={10} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 1.2 Production Preview Calculator */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                1.2 产出倍率预览
              </CardTitle>
              <CardDescription>调节参数，实时查看各资源产出</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm font-medium">城池等级: <span className="text-amber-600 dark:text-amber-400 font-bold">{cityLevel}</span></Label>
                  <Slider value={[cityLevel]} onValueChange={([v]) => setCityLevel(v)} min={1} max={25} step={1} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1</span><span>25</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium">科技等级: <span className="text-amber-600 dark:text-amber-400 font-bold">{techLevel}</span></Label>
                  <Slider value={[techLevel]} onValueChange={([v]) => setTechLevel(v)} min={1} max={10} step={1} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1</span><span>10</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <Label className="text-sm font-medium">VIP等级: <span className="text-amber-600 dark:text-amber-400 font-bold">{vipLevel}</span></Label>
                  <Slider value={[vipLevel]} onValueChange={([v]) => setVipLevel(v)} min={0} max={10} step={1} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0</span><span>10</span>
                  </div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>资源</TableHead>
                      <TableHead className="text-right">每小时</TableHead>
                      <TableHead className="text-right">每日</TableHead>
                      <TableHead className="text-right">每月</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productionPreview.map((r) => {
                      const Icon = r.icon;
                      return (
                        <TableRow key={r.key}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" style={{ color: r.color }} />
                              <span className="font-medium text-sm">{r.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmt(Math.floor(r.hourly))}</TableCell>
                          <TableCell className="text-right font-mono text-sm">{fmt(Math.floor(r.daily))}</TableCell>
                          <TableCell className="text-right font-mono text-sm font-semibold">{fmt(r.monthly)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 1.3 Production Curve Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                1.3 产出曲线图
              </CardTitle>
              <CardDescription>金币产出随城池等级变化趋势（科技等级 {techLevel}）</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={productionCurveConfig} className="h-[300px] w-full">
                <LineChart data={productionCurveData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="cityLevel" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} label={{ value: '城池等级', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="vip0" stroke="var(--color-stone-400)" strokeWidth={2} dot={false} strokeDasharray="4 2" />
                  <Line type="monotone" dataKey="vip5" stroke="var(--color-amber-500)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="vip10" stroke="var(--color-rose-500)" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TAB 2: Resource Consumption ==================== */}
        <TabsContent value="consumption" className="space-y-6">
          {/* 2.1 Building Upgrade Formula */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-rose-500" />
                2.1 建筑升级公式
              </CardTitle>
              <CardDescription>指数增长消耗模型</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormulaBlock
                description="升级消耗公式"
                formula="Cost(level) = BaseCost × CostGrowth^(level-1) × RarityMultiplier"
              />
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>建筑</TableHead>
                      <TableHead className="text-right">基础消耗</TableHead>
                      <TableHead className="text-right">增长率</TableHead>
                      <TableHead className="text-right">满级</TableHead>
                      <TableHead className="text-right hidden sm:table-cell">25级消耗</TableHead>
                      <TableHead className="text-right hidden md:table-cell">累计总消耗</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {buildings.map((b) => (
                      <TableRow key={b.key}>
                        <TableCell>
                          <span className="font-medium text-sm">{b.name}</span>
                          <span className="text-xs text-muted-foreground ml-1">({b.nameEn})</span>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(b.baseCost)}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{b.costGrowth.toFixed(2)}x</TableCell>
                        <TableCell className="text-right font-mono text-sm">Lv.{b.maxLevel}</TableCell>
                        <TableCell className="text-right font-mono text-sm hidden sm:table-cell">
                          {fmt(calcBuildingCost(b.baseCost, b.costGrowth, Math.min(25, b.maxLevel)))}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm hidden md:table-cell font-semibold text-rose-600 dark:text-rose-400">
                          {fmt(calcCumulativeCost(b.baseCost, b.costGrowth, b.maxLevel))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 2.2 Consumption Curve Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-rose-500" />
                2.2 消耗曲线图
              </CardTitle>
              <CardDescription>主城 1~25 级升级消耗指数增长曲线</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={castleChartConfig} className="h-[300px] w-full">
                <ComposedChart data={castleCumulativeData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="level" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} label={{ value: '等级', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                  <YAxis yAxisId="left" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`} />
                  <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={(v) => `${(v / 100000000).toFixed(1)}亿`} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar yAxisId="left" dataKey="singleCost" fill="var(--color-amber-500)" radius={[3, 3, 0, 0]} maxBarSize={20} opacity={0.7} />
                  <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="var(--color-rose-500)" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* 2.3 Hero Upgrade Cost */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                2.3 武将升级消耗
              </CardTitle>
              <CardDescription>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">GoldCost = BaseCost[rarity] × level^1.5 × (1 + starLevel × 0.3)</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-6 flex-wrap">
                <div className="space-y-1">
                  <Label className="text-sm">武将等级: <span className="font-bold text-violet-600 dark:text-violet-400">{heroLevel}</span></Label>
                  <Slider value={[heroLevel]} onValueChange={([v]) => setHeroLevel(v)} min={1} max={10} step={1} className="w-48" />
                </div>
                <div className="space-y-1">
                  <Label className="text-sm">星级: <span className="font-bold text-amber-600 dark:text-amber-400">{heroStar}</span></Label>
                  <Slider value={[heroStar]} onValueChange={([v]) => setHeroStar(v)} min={0} max={6} step={1} className="w-48" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="rounded-lg bg-stone-500/10 border border-stone-500/20 p-3 text-center">
                  <div className="text-xs text-muted-foreground">R 稀有</div>
                  <div className="text-lg font-bold font-mono text-stone-600 dark:text-stone-400">{fmt(calcHeroCost(1000, heroLevel, heroStar))}</div>
                </div>
                <div className="rounded-lg bg-violet-500/10 border border-violet-500/20 p-3 text-center">
                  <div className="text-xs text-muted-foreground">SR 超稀有</div>
                  <div className="text-lg font-bold font-mono text-violet-600 dark:text-violet-400">{fmt(calcHeroCost(3000, heroLevel, heroStar))}</div>
                </div>
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-center">
                  <div className="text-xs text-muted-foreground">SSR 超超稀有</div>
                  <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">{fmt(calcHeroCost(10000, heroLevel, heroStar))}</div>
                </div>
              </div>
              <ChartContainer config={heroChartConfig} className="h-[250px] w-full">
                <LineChart data={heroCostData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="level" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} label={{ value: '等级', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : fmt(v)} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Line type="monotone" dataKey="R" stroke="var(--color-stone-500)" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="SR" stroke="var(--color-violet-500)" strokeWidth={2} dot />
                  <Line type="monotone" dataKey="SSR" stroke="var(--color-amber-500)" strokeWidth={2} dot />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* 2.4 March Cost */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-sky-500" />
                2.4 行军消耗
              </CardTitle>
              <CardDescription>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">MarchCost = troops × distance × 0.5 (food) + troops × 0.1 (gold) &nbsp;|&nbsp; SiegeCost = MarchCost × 2.0</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">兵力: <span className="text-sky-600 dark:text-sky-400 font-bold">{fmt(marchTroops)}</span></Label>
                  <Slider value={[marchTroops]} onValueChange={([v]) => setMarchTroops(v)} min={100} max={50000} step={100} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>100</span><span>50,000</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">距离: <span className="text-sky-600 dark:text-sky-400 font-bold">{marchDistance}</span></Label>
                  <Slider value={[marchDistance]} onValueChange={([v]) => setMarchDistance(v)} min={1} max={20} step={1} />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>1</span><span>20</span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Wheat className="h-3 w-3 text-emerald-500" /> 行军粮食</div>
                  <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400">{fmt(Math.floor(marchCost.foodCost))}</div>
                </div>
                <div className="rounded-lg border p-3 text-center">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Coins className="h-3 w-3 text-amber-500" /> 行军金币</div>
                  <div className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400">{fmt(Math.floor(marchCost.goldCost))}</div>
                </div>
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-center">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Wheat className="h-3 w-3 text-emerald-500" /> 攻城粮食</div>
                  <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">{fmt(Math.floor(marchCost.siegeFoodCost))}</div>
                </div>
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-center">
                  <div className="text-xs text-muted-foreground flex items-center justify-center gap-1"><Coins className="h-3 w-3 text-amber-500" /> 攻城金币</div>
                  <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400">{fmt(Math.floor(marchCost.siegeGoldCost))}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TAB 3: Gacha Currency Control ==================== */}
        <TabsContent value="gacha" className="space-y-6">
          {/* 3.1 Gacha Pricing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                3.1 抽卡价格体系
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>抽卡类型</TableHead>
                    <TableHead>货币</TableHead>
                    <TableHead className="text-right">消耗</TableHead>
                    <TableHead className="hidden sm:table-cell">说明</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gachaPricing.map((g, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{g.type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{g.currency}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold">{fmt(g.cost)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{g.desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* 3.2 Diamond Sources */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Gem className="h-4 w-4 text-violet-500" />
                3.2 钻石获取途径与产出控制
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>来源</TableHead>
                      <TableHead className="text-right">每日产出</TableHead>
                      <TableHead className="text-right">周上限</TableHead>
                      <TableHead className="hidden sm:table-cell">备注</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {diamondSources.map((s, i) => (
                      <TableRow key={i} className={s.notes === '付费' ? 'bg-violet-500/5' : ''}>
                        <TableCell className="font-medium text-sm">{s.source}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{s.daily > 0 ? fmt(s.daily) : '-'}</TableCell>
                        <TableCell className="text-right font-mono text-sm">{fmt(s.weeklyCap)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-xs text-muted-foreground">{s.notes}</span>
                          {s.notes === '付费' && <Badge className="ml-2 text-xs bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20">付费</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Summary rows */}
                    <TableRow className="bg-emerald-500/5 font-semibold">
                      <TableCell className="text-sm">合计 (免费)</TableCell>
                      <TableCell className="text-right font-mono text-sm text-emerald-600 dark:text-emerald-400">~{fmt(diamondSummary.freeDaily)}/日</TableCell>
                      <TableCell className="text-right font-mono text-sm">~{fmt(diamondSummary.freeMonthly)}/月</TableCell>
                      <TableCell />
                    </TableRow>
                    <TableRow className="bg-violet-500/5 font-semibold">
                      <TableCell className="text-sm">合计 (付费)</TableCell>
                      <TableCell className="text-right font-mono text-sm text-violet-600 dark:text-violet-400">~{fmt(diamondSummary.paidDaily)}/日</TableCell>
                      <TableCell className="text-right font-mono text-sm">~{fmt(diamondSummary.paidMonthly)}/月</TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">含月卡</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 3.3 Pity Mechanism + Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-violet-500" />
                3.3 保底机制
              </CardTitle>
              <CardDescription>软保底与硬保底概率曲线</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormulaBlock
                description="保底概率公式"
                formula={`SSR_Rate(n) = ${baseSSRRate}% + max(0, (n - ${softPity})) × 6%  // 软保底后每抽增加\nHardPity = ${hardPity} 抽 → 必出SSR\nExpected SSR per 10-pull ≈ 0.65`}
              />
              <div className="grid grid-cols-3 gap-4 mb-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">软保底位置</Label>
                  <Input type="number" value={softPity} onChange={(e) => setSoftPity(Math.max(1, Math.min(hardPity - 1, Number(e.target.value))))} className="h-8 w-20 font-mono text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">硬保底位置</Label>
                  <Input type="number" value={hardPity} onChange={(e) => setHardPity(Math.max(softPity + 1, Number(e.target.value)))} className="h-8 w-20 font-mono text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">基础SSR率 (%)</Label>
                  <Input type="number" value={baseSSRRate} onChange={(e) => setBaseSSRRate(Math.max(0.1, Number(e.target.value)))} className="h-8 w-20 font-mono text-sm" step={0.1} />
                </div>
              </div>
              <ChartContainer config={pityChartConfig} className="h-[300px] w-full">
                <AreaChart data={pityData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="draw" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} label={{ value: '抽数', position: 'insideBottom', offset: -5, fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <ReferenceArea x1={softPity} x2={hardPity} fill="var(--color-violet-500)" fillOpacity={0.06} />
                  <ReferenceLine x={softPity} stroke="var(--color-amber-500)" strokeDasharray="3 3" label={{ value: `软保底 (${softPity})`, position: 'top', fontSize: 10, fill: 'var(--color-amber-500)' }} />
                  <ReferenceLine x={hardPity} stroke="var(--color-rose-500)" strokeDasharray="3 3" label={{ value: `硬保底 (${hardPity})`, position: 'top', fontSize: 10, fill: 'var(--color-rose-500)' }} />
                  <Area type="stepAfter" dataKey="rate" stroke="var(--color-violet-500)" strokeWidth={2} fill="var(--color-violet-500)" fillOpacity={0.15} />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* 3.4 Diamond Economy Balance */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ArrowDownUp className="h-4 w-4 text-amber-500" />
                3.4 钻石经济平衡
              </CardTitle>
              <CardDescription>关键经济指标一览</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="text-xs text-muted-foreground mb-1">免费月产出</div>
                  <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400">{fmt(diamondSummary.freeMonthly)} 钻石</div>
                  <div className="text-xs text-muted-foreground mt-1">≈ {fmt(diamondSummary.freeDaily)}/日</div>
                </div>
                <div className="rounded-lg border border-violet-500/20 bg-violet-500/5 p-4">
                  <div className="text-xs text-muted-foreground mb-1">十连消耗</div>
                  <div className="text-xl font-bold font-mono text-violet-600 dark:text-violet-400">{fmt(diamondSummary.tenPullCost)} 钻石</div>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="text-xs text-muted-foreground mb-1">月免费十连</div>
                  <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">{diamondSummary.freeTenPulls} 次</div>
                  <div className="text-xs text-muted-foreground mt-1">≈ {diamondSummary.freeTenPulls * 10} 抽</div>
                </div>
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
                  <div className="text-xs text-muted-foreground mb-1">保底SSR周期</div>
                  <div className="text-xl font-bold font-mono text-rose-600 dark:text-rose-400">{hardPity} 抽 = {Math.ceil(hardPity / 10)} 次十连</div>
                  <div className="text-xs text-muted-foreground mt-1">= {fmt(diamondSummary.pityCost)} 钻石</div>
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="text-xs text-muted-foreground mb-1">免费玩家保底SSR</div>
                  <div className="text-xl font-bold font-mono text-amber-600 dark:text-amber-400">~{diamondSummary.freeMonthsToSSR.toFixed(1)} 个月</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Info className="h-3 w-3" /> 设计合理区间</div>
                </div>
                <div className="rounded-lg border border-sky-500/20 bg-sky-500/5 p-4">
                  <div className="text-xs text-muted-foreground mb-1">期望SSR (每十连)</div>
                  <div className="text-xl font-bold font-mono text-sky-600 dark:text-sky-400">{diamondSummary.expectedSSRPerTenPull}</div>
                  <div className="text-xs text-muted-foreground mt-1">长期均值</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TAB 4: Inflation Control ==================== */}
        <TabsContent value="inflation" className="space-y-6">
          {/* 4.1 Resource Sink */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-rose-500" />
                4.1 资源回收机制
              </CardTitle>
              <CardDescription>每日资源回收池估算</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>回收项</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead className="text-right">每日回收估算</TableHead>
                      <TableHead className="hidden sm:table-cell">说明</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {resourceSinks.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium text-sm">{s.sink}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{s.type}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold text-rose-600 dark:text-rose-400">
                          {fmt(s.dailyDrain)}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{s.desc}</TableCell>
                      </TableRow>
                    ))}
                    {/* Summary */}
                    <TableRow className="bg-rose-500/5 font-semibold">
                      <TableCell className="text-sm">合计 Gold</TableCell>
                      <TableCell />
                      <TableCell className="text-right font-mono text-sm text-rose-600 dark:text-rose-400">
                        ~{fmt(resourceSinks.filter(s => s.type.includes('Gold')).reduce((a, s) => a + s.dailyDrain, 0))}/日
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    <TableRow className="bg-violet-500/5 font-semibold">
                      <TableCell className="text-sm">合计 Diamond</TableCell>
                      <TableCell />
                      <TableCell className="text-right font-mono text-sm text-violet-600 dark:text-violet-400">
                        ~{fmt(resourceSinks.filter(s => s.type.includes('Diamond')).reduce((a, s) => a + s.dailyDrain, 0))}/日
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* 4.2 Production vs Consumption Chart */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ArrowDownUp className="h-4 w-4 text-amber-500" />
                4.2 产出/消耗比
              </CardTitle>
              <CardDescription>目标比例 1.1:1（微盈余让玩家有成就感）</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={prodConsChartConfig} className="h-[300px] w-full">
                <BarChart data={prodConsData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} tickFormatter={(v) => v >= 10000 ? `${(v / 10000).toFixed(0)}万` : fmt(v)} />
                  <YAxis type="category" dataKey="resource" tickLine={false} axisLine={false} tickMargin={8} fontSize={11} width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="production" fill="var(--color-emerald-500)" radius={[0, 3, 3, 0]} maxBarSize={20} />
                  <Bar dataKey="consumption" fill="var(--color-rose-500)" radius={[0, 3, 3, 0]} maxBarSize={20} />
                </BarChart>
              </ChartContainer>
              <div className="mt-3 flex items-center gap-4 flex-wrap">
                {prodConsData.map((d) => {
                  const ratio = d.production / d.consumption;
                  const isBalanced = ratio >= 1.0 && ratio <= 1.5;
                  return (
                    <div key={d.resource} className="flex items-center gap-1.5 text-xs">
                      <span className="text-muted-foreground">{d.resource.split(' ')[0]}:</span>
                      <Badge variant={isBalanced ? 'outline' : 'destructive'} className={`text-xs ${isBalanced ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5' : ''}`}>
                        {ratio.toFixed(2)}:1
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* 4.3 Soft Cap Mechanism */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Shield className="h-4 w-4 text-sky-500" />
                4.3 软上限 (Soft Cap) 机制
              </CardTitle>
              <CardDescription>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">ResourceCap(baseCap, vipLevel) = baseCap × (1 + vipLevel × 0.2)</code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Label className="text-sm font-medium">VIP等级: <span className="text-sky-600 dark:text-sky-400 font-bold">{vipLevel}</span></Label>
                <Slider value={[vipLevel]} onValueChange={([v]) => setVipLevel(v)} min={0} max={10} step={1} className="w-48" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {softCapData.map((sc) => (
                  <div key={sc.resource} className="rounded-lg border p-3 space-y-1">
                    <div className="text-xs text-muted-foreground">{sc.resource}</div>
                    <div className="text-lg font-bold font-mono text-sky-600 dark:text-sky-400">{fmt(sc.cap)}</div>
                    <div className="text-xs text-muted-foreground">基础: {fmt(sc.baseCap)} × {((1 + vipLevel * sc.vipMult)).toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 4.4 Time Gating */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" />
                4.4 时间门控
              </CardTitle>
              <CardDescription>定期重置机制，控制玩家进度节奏</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>重置类型</TableHead>
                    <TableHead>周期</TableHead>
                    <TableHead>重置内容</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeGates.map((tg, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{tg.type}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs font-mono">{tg.cycle}</Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tg.resets}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TAB 5: Formula Calculator ==================== */}
        <TabsContent value="calculator" className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Calculator className="h-4 w-4 text-amber-500" />
                公式计算器
              </CardTitle>
              <CardDescription>选择公式并输入参数，实时计算结果</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Formula Selector */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">选择公式</Label>
                <Select value={formulaType} onValueChange={setFormulaType}>
                  <SelectTrigger className="w-full sm:w-80">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="production">资源产出 (每小时)</SelectItem>
                    <SelectItem value="dailyProduction">资源产出 (每日)</SelectItem>
                    <SelectItem value="buildingCost">建筑升级消耗</SelectItem>
                    <SelectItem value="cumulativeCost">建筑累计总消耗</SelectItem>
                    <SelectItem value="heroCost">武将升级消耗</SelectItem>
                    <SelectItem value="marchCost">行军消耗</SelectItem>
                    <SelectItem value="siegeCost">攻城消耗</SelectItem>
                    <SelectItem value="ssrRate">SSR概率计算</SelectItem>
                    <SelectItem value="softCap">资源上限计算</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {(formulaType === 'production' || formulaType === 'dailyProduction') && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">基础产出 (BaseProduction)</Label>
                      <Input type="number" value={calcInputs.base} onChange={(e) => updateCalcInput('base', Number(e.target.value))} className="h-8 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">城池等级</Label>
                      <Input type="number" value={calcInputs.cityLevel} onChange={(e) => updateCalcInput('cityLevel', Number(e.target.value))} min={1} max={25} className="h-8 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">科技等级</Label>
                      <Input type="number" value={calcInputs.techLevel} onChange={(e) => updateCalcInput('techLevel', Number(e.target.value))} min={1} max={10} className="h-8 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">VIP等级</Label>
                      <Input type="number" value={calcInputs.vipLevel} onChange={(e) => updateCalcInput('vipLevel', Number(e.target.value))} min={0} max={10} className="h-8 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">城市加成 (CityBonus)</Label>
                      <Input type="number" value={calcInputs.cityBonus} onChange={(e) => updateCalcInput('cityBonus', Number(e.target.value))} step={0.01} className="h-8 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">科技加成 (TechBonus)</Label>
                      <Input type="number" value={calcInputs.techBonus} onChange={(e) => updateCalcInput('techBonus', Number(e.target.value))} step={0.01} className="h-8 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">VIP加成 (VIPBonus)</Label>
                      <Input type="number" value={calcInputs.vipBonus} onChange={(e) => updateCalcInput('vipBonus', Number(e.target.value))} step={0.01} className="h-8 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">全局倍率 (GlobalMult)</Label>
                      <Input type="number" value={calcInputs.globalMult} onChange={(e) => updateCalcInput('globalMult', Number(e.target.value))} step={0.1} className="h-8 font-mono text-sm" />
                    </div>
                  </>
                )}
                {(formulaType === 'buildingCost' || formulaType === 'cumulativeCost') && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">基础消耗 (BaseCost)</Label>
                      <Input type="number" value={calcInputs.baseCost} onChange={(e) => updateCalcInput('baseCost', Number(e.target.value))} className="h-8 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">增长率 (CostGrowth)</Label>
                      <Input type="number" value={calcInputs.costGrowth} onChange={(e) => updateCalcInput('costGrowth', Number(e.target.value))} step={0.01} className="h-8 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">目标等级</Label>
                      <Input type="number" value={calcInputs.level} onChange={(e) => updateCalcInput('level', Number(e.target.value))} min={1} max={30} className="h-8 font-mono text-sm" />
                    </div>
                  </>
                )}
                {formulaType === 'heroCost' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">基础消耗 (BaseCost by rarity)</Label>
                      <Input type="number" value={calcInputs.heroBase} onChange={(e) => updateCalcInput('heroBase', Number(e.target.value))} className="h-8 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">武将等级</Label>
                      <Input type="number" value={calcInputs.level} onChange={(e) => updateCalcInput('level', Number(e.target.value))} min={1} max={10} className="h-8 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">星级</Label>
                      <Input type="number" value={calcInputs.starLevel} onChange={(e) => updateCalcInput('starLevel', Number(e.target.value))} min={0} max={6} className="h-8 font-mono text-sm" />
                    </div>
                  </>
                )}
                {(formulaType === 'marchCost' || formulaType === 'siegeCost') && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">兵力 (Troops)</Label>
                      <Input type="number" value={calcInputs.troops} onChange={(e) => updateCalcInput('troops', Number(e.target.value))} className="h-8 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">距离 (Distance)</Label>
                      <Input type="number" value={calcInputs.distance} onChange={(e) => updateCalcInput('distance', Number(e.target.value))} min={1} max={20} className="h-8 font-mono text-sm" />
                    </div>
                  </>
                )}
                {formulaType === 'ssrRate' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">当前抽数</Label>
                      <Input type="number" value={calcInputs.drawCount} onChange={(e) => updateCalcInput('drawCount', Number(e.target.value))} min={1} max={100} className="h-8 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">软保底位置: {softPity}</Label>
                      <Input type="number" value={softPity} onChange={(e) => setSoftPity(Math.max(1, Number(e.target.value)))} className="h-8 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">基础SSR率: {baseSSRRate}%</Label>
                      <Input type="number" value={baseSSRRate} onChange={(e) => setBaseSSRRate(Math.max(0.1, Number(e.target.value)))} step={0.1} className="h-8 font-mono text-sm" />
                    </div>
                  </>
                )}
                {formulaType === 'softCap' && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">基础上限 (baseCap)</Label>
                      <Input type="number" value={calcInputs.base} onChange={(e) => updateCalcInput('base', Number(e.target.value))} className="h-8 font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">VIP等级</Label>
                      <Input type="number" value={calcInputs.vipLevel} onChange={(e) => updateCalcInput('vipLevel', Number(e.target.value))} min={0} max={10} className="h-8 font-mono text-sm" />
                    </div>
                  </>
                )}
              </div>

              {/* Formula Display */}
              <FormulaBlock
                description="当前公式"
                formula={
                  formulaType === 'production' || formulaType === 'dailyProduction'
                    ? `产出 = ${calcInputs.base} × (1 + ${calcInputs.cityLevel} × ${calcInputs.cityBonus}) × (1 + ${calcInputs.techLevel} × ${calcInputs.techBonus}) × (1 + ${calcInputs.vipLevel} × ${calcInputs.vipBonus}) × ${calcInputs.globalMult}${formulaType === 'dailyProduction' ? ' × 24' : ''}`
                    : formulaType === 'buildingCost'
                      ? `Cost(${calcInputs.level}) = ${calcInputs.baseCost} × ${calcInputs.costGrowth}^(${calcInputs.level}-1)`
                      : formulaType === 'cumulativeCost'
                        ? `Σ Cost(1..${calcInputs.level}) = ${calcInputs.baseCost} × Σ(${calcInputs.costGrowth}^(i-1))`
                        : formulaType === 'heroCost'
                          ? `Cost = ${calcInputs.heroBase} × ${calcInputs.level}^1.5 × (1 + ${calcInputs.starLevel} × 0.3)`
                          : formulaType === 'marchCost'
                            ? `Food = ${calcInputs.troops} × ${calcInputs.distance} × 0.5`
                            : formulaType === 'siegeCost'
                              ? `Food = ${calcInputs.troops} × ${calcInputs.distance} × 0.5 × 2.0`
                              : formulaType === 'ssrRate'
                                ? `Rate = ${baseSSRRate}% + max(0, (${calcInputs.drawCount} - ${softPity})) × 6%`
                                : formulaType === 'softCap'
                                  ? `Cap = ${calcInputs.base} × (1 + ${calcInputs.vipLevel} × 0.2)`
                                  : '-'
                }
              />

              {/* Result */}
              <div className="rounded-xl border-2 border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-6 text-center">
                <div className="text-sm text-muted-foreground mb-2">{formulaResult.label}</div>
                <div className="text-3xl font-bold font-mono text-amber-600 dark:text-amber-400">
                  {formulaType === 'ssrRate'
                    ? `${formulaResult.value}%`
                    : fmt(Math.floor(formulaResult.value))
                  }
                </div>
              </div>

              {/* Quick Reference */}
              <div className="rounded-lg border bg-muted/30 p-4">
                <div className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  常用参考值
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <div className="flex justify-between"><span>R 武将基础消耗</span><span className="font-mono font-medium text-foreground">1,000</span></div>
                  <div className="flex justify-between"><span>SR 武将基础消耗</span><span className="font-mono font-medium text-foreground">3,000</span></div>
                  <div className="flex justify-between"><span>SSR 武将基础消耗</span><span className="font-mono font-medium text-foreground">10,000</span></div>
                  <div className="flex justify-between"><span>主城基础消耗</span><span className="font-mono font-medium text-foreground">1,000 (1.18x)</span></div>
                  <div className="flex justify-between"><span>兵营基础消耗</span><span className="font-mono font-medium text-foreground">500 (1.15x)</span></div>
                  <div className="flex justify-between"><span>研究院基础消耗</span><span className="font-mono font-medium text-foreground">800 (1.20x)</span></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
