'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Copy, Check, ChevronDown, Database, Server, Shield, Swords,
  Zap, ArrowRight, Clock, FileCode, Target,
  Map, Castle, Navigation, Timer, Users, Route,
  Landmark, Crown, Flag, type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

function CodeBlock({ code, lang = 'go', filename }: { code: string; lang: string; filename: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div className="relative rounded-lg overflow-hidden border">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500/80" /><div className="w-3 h-3 rounded-full bg-yellow-500/80" /><div className="w-3 h-3 rounded-full bg-green-500/80" /></div>
          <span className="text-xs text-zinc-400 font-mono ml-2">{filename}</span>
        </div>
        <TooltipProvider><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="sm" className="h-7 px-2 text-zinc-400 hover:text-zinc-200" onClick={handleCopy}>{copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}</Button></TooltipTrigger><TooltipContent>{copied ? '已复制' : '复制'}</TooltipContent></Tooltip></TooltipProvider>
      </div>
      <SyntaxHighlighter language={lang} style={oneDark} customStyle={{ margin: 0, padding: '16px', fontSize: '12px', lineHeight: '1.6', background: '#1e1e2e' }} showLineNumbers lineNumberStyle={{ color: '#585b70', fontSize: '11px', minWidth: '3em' }}>{code}</SyntaxHighlighter>
    </div>
  )
}

const sourceFiles = [
  { name: 'main.go', desc: '服务入口 + 行军引擎启动' },
  { name: 'march_engine.go', desc: '行军引擎核心 (760+ 行)' },
  { name: 'map_model.go', desc: '数据模型 (10个结构体)' },
  { name: 'map_dao.go', desc: '数据访问层' },
  { name: 'map_service.go', desc: '业务逻辑 + 缓存' },
  { name: 'map_handler.go', desc: 'HTTP 处理器 (9个接口)' },
  { name: 'router.go', desc: '路由注册' },
  { name: 'schema.sql', desc: '数据库建表 (6张)' },
  { name: 'map_config.json', desc: '地图配置' },
  { name: 'auth.go', desc: 'JWT中间件' },
  { name: 'config.yaml', desc: '服务配置' },
  { name: 'mysql.go', desc: 'MySQL连接池' },
  { name: 'redis.go', desc: 'Redis连接池' },
  { name: 'response.go', desc: '统一响应' },
]

const engineCode = `// 行军引擎核心 - BFS 寻路 + Redis Stream 消费

// InitiateMarch 发起行军
func (e *MarchEngine) InitiateMarch(ctx context.Context, ...) (*MarchOrder, error) {
    // 1. 校验活跃行军数上限
    activeCount, _ := e.dao.CountUserActiveMarches(ctx, userID)
    if activeCount >= e.maxActivePerUser { return nil, errLimit }

    // 2. BFS 计算最短路径
    path, distance, _ := e.calculatePath(ctx, sourceCityID, targetCityID)

    // 3. 计算行军时间 = 距离 / 速度
    marchDuration := distance / marchSpeed * 3600 // 秒

    // 4. 写入 MySQL + 推入 Redis Stream
    e.dao.CreateMarch(ctx, march)
    go e.publishMarchEvent(marchID, arriveTime) // 异步
}

// calculatePath BFS 最短路径
func (e *MarchEngine) calculatePath(ctx, from, to int64) ([]int64, int, error) {
    queue := []queueItem{{cityID: from, path: []int64{from}}}
    visited := map[int64]bool{from: true}
    for len(queue) > 0 {
        current := queue[0]
        for _, neighbor := range city.Connections {
            if !visited[neighbor] {
                dist := abs(current.X - neighbor.X) + abs(current.Y - neighbor.Y)
                if neighbor == to { return newPath, newDist, nil }
                queue = append(queue, ...)
            }
        }
    }
}

// worker 消费者协程（5个并发）
func (e *MarchEngine) worker(ctx, workerID) {
    for {
        // 1. 检查已到达行军 → 并发处理
        arrived := e.dao.ListArrivedMarches(ctx, 50)
        var wg sync.WaitGroup
        for _, m := range arrived {
            wg.Add(1)
            go func(m) { e.ProcessArrival(ctx, m); wg.Done() }(m)
        }
        wg.Wait()
        // 2. 从 Redis Stream 消费新事件
        streams := myredis.RDB.XReadGroup(ctx, ...)
    }
}`

const nineProvinces = [
  { name: '冀州', desc: '北方粮仓，沃野千里', terrain: '平原', coords: '(180, 60)', icon: Landmark, color: 'border-amber-300 bg-amber-50/30 dark:bg-amber-950/10', badgeColor: 'bg-amber-500/10 text-amber-600 border-amber-200' },
  { name: '兖州', desc: '中原腹地，四战之地', terrain: '平原', coords: '(160, 120)', icon: Map, color: 'border-orange-300 bg-orange-50/30 dark:bg-orange-950/10', badgeColor: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  { name: '青州', desc: '东方沿海，商贸发达', terrain: '沿海', coords: '(220, 100)', icon: Flag, color: 'border-cyan-300 bg-cyan-50/30 dark:bg-cyan-950/10', badgeColor: 'bg-cyan-500/10 text-cyan-600 border-cyan-200' },
  { name: '徐州', desc: '东南沃野，物产丰饶', terrain: '平原', coords: '(210, 160)', icon: Landmark, color: 'border-green-300 bg-green-50/30 dark:bg-green-950/10', badgeColor: 'bg-green-500/10 text-green-600 border-green-200' },
  { name: '豫州', desc: '天下之中，交通枢纽', terrain: '平原', coords: '(150, 180)', icon: Crown, color: 'border-yellow-300 bg-yellow-50/30 dark:bg-yellow-950/10', badgeColor: 'bg-yellow-500/10 text-yellow-600 border-yellow-200' },
  { name: '荆州', desc: '南方重镇，兵家必争', terrain: '丘陵', coords: '(130, 250)', icon: Castle, color: 'border-red-300 bg-red-50/30 dark:bg-red-950/10', badgeColor: 'bg-red-500/10 text-red-600 border-red-200' },
  { name: '扬州', desc: '东南繁华，鱼米之乡', terrain: '水乡', coords: '(220, 230)', icon: Flag, color: 'border-teal-300 bg-teal-50/30 dark:bg-teal-950/10', badgeColor: 'bg-teal-500/10 text-teal-600 border-teal-200' },
  { name: '梁州', desc: '西方屏障，蜀道天险', terrain: '山地', coords: '(80, 200)', icon: Map, color: 'border-stone-300 bg-stone-50/30 dark:bg-stone-950/10', badgeColor: 'bg-stone-500/10 text-stone-600 border-stone-200' },
  { name: '雍州', desc: '西北铁骑，大漠苍茫', terrain: '荒漠', coords: '(60, 100)', icon: Castle, color: 'border-rose-300 bg-rose-50/30 dark:bg-rose-950/10', badgeColor: 'bg-rose-500/10 text-rose-600 border-rose-200' },
]

const cityLevels = [
  { level: 'Lv1', name: '小城', defense: '+0%', resource: '×1.0', garrison: '500', color: 'border-stone-300 bg-stone-50/30 dark:bg-stone-950/10', textColor: 'text-stone-500' },
  { level: 'Lv2', name: '县城', defense: '+10%', resource: '×1.2', garrison: '1,000', color: 'border-green-300 bg-green-50/30 dark:bg-green-950/10', textColor: 'text-green-500' },
  { level: 'Lv3', name: '郡城', defense: '+20%', resource: '×1.5', garrison: '3,000', color: 'border-blue-300 bg-blue-50/30 dark:bg-blue-950/10', textColor: 'text-blue-500' },
  { level: 'Lv4', name: '州城', defense: '+35%', resource: '×2.0', garrison: '8,000', color: 'border-purple-300 bg-purple-50/30 dark:bg-purple-950/10', textColor: 'text-purple-500' },
  { level: 'Lv5', name: '京城', defense: '+50%', resource: '×3.0', garrison: '20,000', color: 'border-amber-300 bg-amber-50/30 dark:bg-amber-950/10', textColor: 'text-amber-500' },
]

const marchTypes = [
  { type: '进攻', en: 'Attack', color: 'bg-red-500', textColor: 'text-red-500', speed: '×1.0', food: '100%', desc: '攻打敌方城池' },
  { type: '增援', en: 'Reinforce', color: 'bg-green-500', textColor: 'text-green-500', speed: '×1.2', food: '80%', desc: '增援友方城池' },
  { type: '侦查', en: 'Scout', color: 'bg-blue-500', textColor: 'text-blue-500', speed: '×1.5', food: '30%', desc: '侦查城池情报' },
  { type: '撤退', en: 'Retreat', color: 'bg-gray-500', textColor: 'text-gray-500', speed: '×1.3', food: '50%', desc: '撤回部队' },
  { type: '迁城', en: 'Relocate', color: 'bg-orange-500', textColor: 'text-orange-500', speed: '×0.5', food: '200%', desc: '迁移主城' },
]

export default function Home() {
  const [activeTab, setActiveTab] = useState(1)

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 md:py-12 space-y-12">

          {/* ===== Hero ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-card/80 p-8 md:p-12">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-yellow-500/10 via-amber-500/5 to-transparent blur-3xl" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">Map Service</Badge>
                <Badge variant="outline" className="border-orange-500/30 text-orange-600 dark:text-orange-400 bg-orange-500/5">九州地图</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-black">
                <span className="bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-500 bg-clip-text text-transparent">地图系统微服务</span>
              </h1>
              <p className="mt-2 text-lg text-muted-foreground font-medium">Map Service — 九州地图 · 行军引擎 · 联盟领土</p>
              <p className="mt-3 text-sm text-muted-foreground/80 max-w-2xl leading-relaxed">
                基于 Go + Redis Stream 的高并发地图系统。九大区域、36 座城池、BFS 最短路径寻路、
                异步行军引擎、联盟领土管理、城池占领与战斗记录等核心功能。
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['九大区域', '36座城池', 'Redis Stream行军', 'BFS寻路', '联盟领土', '城池占领', '高并发', '延迟模拟',
                ].map((t) => (<Badge key={t} variant="secondary" className="text-xs px-2.5 py-1">{t}</Badge>))}
              </div>
            </div>
          </motion.section>

          {/* ===== 九州地图总览 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-amber-500 to-orange-600" />
              九州地图总览
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {nineProvinces.map((prov) => (
                <Card key={prov.name} className={`border ${prov.color} hover:shadow-sm transition-shadow`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <prov.icon className={`w-4 h-4 text-amber-600`} />
                        {prov.name}
                      </CardTitle>
                      <Badge className={`text-[10px] ${prov.badgeColor}`}>{prov.terrain}</Badge>
                    </div>
                    <CardDescription className="text-xs">{prov.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs">
                      <Navigation className="w-3 h-3 text-muted-foreground" />
                      <code className="text-muted-foreground font-mono">中心坐标 {prov.coords}</code>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== 城池等级系统 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-orange-500 to-red-600" />
              城池等级系统
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {cityLevels.map((city) => (
                <Card key={city.level} className={`border ${city.color} hover:shadow-sm transition-shadow`}>
                  <CardContent className="pt-4 pb-4 text-center">
                    <Badge variant="outline" className={`text-xs font-bold mb-2 ${city.textColor}`}>{city.level}</Badge>
                    <p className="font-bold text-sm">{city.name}</p>
                    <div className="mt-2 space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">防御加成</span>
                        <span className="font-mono font-bold text-green-600">{city.defense}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">资源倍率</span>
                        <span className="font-mono font-bold text-amber-600">{city.resource}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">最大驻军</span>
                        <span className="font-mono font-bold">{city.garrison}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== 行军系统 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-yellow-500 to-amber-600" />
              行军系统
            </h2>

            {/* March Flow */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { icon: Flag, title: '1. 发起行军', desc: '选择目标城池\n配置行军类型和兵力', color: 'text-amber-500' },
                { icon: Route, title: '2. BFS寻路', desc: '广度优先搜索\n计算最短路径', color: 'text-orange-500' },
                { icon: Timer, title: '3. Stream队列', desc: '推入 Redis Stream\n异步事件驱动', color: 'text-yellow-500' },
                { icon: Clock, title: '4. 进度更新', desc: '5 Worker 并发消费\n实时更新行军进度', color: 'text-stone-500' },
                { icon: Target, title: '5. 到达处理', desc: '战斗/增援/侦查\n结果写入 MySQL', color: 'text-red-500' },
              ].map((step) => (
                <Card key={step.title} className="hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><step.icon className={`w-4 h-4 ${step.color}`} />{step.title}</CardTitle></CardHeader>
                  <CardContent><p className="text-xs text-muted-foreground whitespace-pre-line">{step.desc}</p></CardContent>
                </Card>
              ))}
            </div>

            {/* March Types */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {marchTypes.map((march) => (
                <Card key={march.type} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${march.color}`} />
                      <span className="font-bold text-sm">{march.type}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{march.en}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mb-2">{march.desc}</p>
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-muted-foreground">速度 </span>
                        <span className={`font-mono font-bold ${march.textColor}`}>{march.speed}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">粮草 </span>
                        <span className="font-mono font-bold">{march.food}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== Redis Stream 高并发架构 ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-stone-500 to-amber-600" />
              Redis Stream 高并发架构
            </h2>
            <Card className="border-dashed bg-amber-50/30 dark:bg-amber-950/10">
              <CardContent className="pt-6 space-y-6">
                {/* Architecture Diagram */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6">
                  {/* March Producer */}
                  <Card className="w-full md:w-auto border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
                    <CardContent className="pt-4 pb-4 text-center px-6">
                      <Flag className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
                      <p className="text-xs font-bold">行军请求</p>
                      <p className="text-[10px] text-muted-foreground">HTTP Handler</p>
                    </CardContent>
                  </Card>

                  <ArrowRight className="w-5 h-5 text-amber-500 hidden md:block" />
                  <ArrowRight className="w-5 h-5 text-amber-500 md:hidden rotate-90" />

                  {/* Redis Stream */}
                  <Card className="w-full md:w-auto border-red-200 bg-red-50/50 dark:bg-red-950/20">
                    <CardContent className="pt-4 pb-4 text-center px-6">
                      <Zap className="w-6 h-6 text-red-500 mx-auto mb-1.5" />
                      <p className="text-xs font-bold">Redis Stream</p>
                      <p className="text-[10px] text-muted-foreground">行军事件队列</p>
                    </CardContent>
                  </Card>

                  <ArrowRight className="w-5 h-5 text-amber-500 hidden md:block" />
                  <ArrowRight className="w-5 h-5 text-amber-500 md:hidden rotate-90" />

                  {/* Worker Pool */}
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    <div className="flex gap-2">
                      {[1, 2, 3].map((n) => (
                        <Card key={n} className="flex-1 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                          <CardContent className="pt-3 pb-3 text-center px-3">
                            <Users className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                            <p className="text-[10px] font-bold">Worker {n}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="flex gap-2 justify-center">
                      {[4, 5].map((n) => (
                        <Card key={n} className="flex-1 max-w-[100px] border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
                          <CardContent className="pt-3 pb-3 text-center px-2">
                            <Users className="w-4 h-4 text-orange-500 mx-auto mb-1" />
                            <p className="text-[10px] font-bold">Worker {n}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <p className="text-[10px] text-center text-muted-foreground">5 个消费者协程</p>
                  </div>

                  <ArrowRight className="w-5 h-5 text-amber-500 hidden md:block" />
                  <ArrowRight className="w-5 h-5 text-amber-500 md:hidden rotate-90" />

                  {/* Progress Updater + MySQL */}
                  <div className="flex flex-col gap-2 w-full md:w-auto">
                    <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20">
                      <CardContent className="pt-3 pb-3 text-center px-4">
                        <Clock className="w-5 h-5 text-green-500 mx-auto mb-1" />
                        <p className="text-[10px] font-bold">进度更新协程</p>
                      </CardContent>
                    </Card>
                    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
                      <CardContent className="pt-3 pb-3 text-center px-4">
                        <Database className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                        <p className="text-[10px] font-bold">MySQL 持久化</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <Separator />

                {/* Architecture Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {[
                    { label: 'Worker 数量', value: '5 协程', color: 'text-orange-500' },
                    { label: '批量处理', value: '50 条/轮', color: 'text-amber-500' },
                    { label: '到达检测', value: '并发处理', color: 'text-green-500' },
                    { label: '事件队列', value: 'Redis Stream', color: 'text-red-500' },
                  ].map((item) => (
                    <div key={item.label} className="p-2.5 rounded-lg bg-card border">
                      <p className="font-semibold text-muted-foreground">{item.label}</p>
                      <p className={`font-bold font-mono mt-0.5 ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>

                <CodeBlock code={`// Worker 消费者协程（5个并发）
func (e *MarchEngine) worker(ctx context.Context, workerID int) {
    for {
        select {
        case <-ctx.Done():
            return
        default:
            // 1. 检查已到达行军 → 并发处理
            arrived, _ := e.dao.ListArrivedMarches(ctx, 50)
            var wg sync.WaitGroup
            for _, m := range arrived {
                wg.Add(1)
                go func(march *MarchOrder) {
                    defer wg.Done()
                    e.ProcessArrival(ctx, march)
                }(m)
            }
            wg.Wait()

            // 2. 从 Redis Stream 消费新事件 (XREADGROUP)
            streams, err := myredis.RDB.XReadGroup(ctx, &redis.XReadGroupArgs{
                Group:    "march-workers",
                Consumer: fmt.Sprintf("worker-%d", workerID),
                Streams:  []string{"march:events", ">"},
                Count:    10,
                Block:    5 * time.Second,
            })
            // 3. 逐条处理
            for _, stream := range streams {
                for _, msg := range stream.Messages {
                    e.handleMarchEvent(ctx, msg)
                }
            }
        }
    }
}`} lang="go" filename="march_engine.go" />
              </CardContent>
            </Card>
          </motion.section>

          {/* ===== REST API ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-blue-500 to-cyan-600" />
              REST API
            </h2>
            {[
              { method: 'GET', path: '/api/v1/map/overview', auth: false, desc: '地图总览', color: 'bg-blue-500',
                res: `{\n  "code": 0,\n  "data": {\n    "regions": [\n      { "region_id": 1, "name": "冀州", "terrain": "平原", "city_count": 4 },\n      { "region_id": 2, "name": "兖州", "terrain": "平原", "city_count": 4 }\n    ],\n    "total_cities": 36,\n    "occupied_cities": 15\n  }\n}` },
              { method: 'POST', path: '/api/v1/map/march', auth: true, desc: '发起行军', color: 'bg-red-500',
                req: `{\n  "source_city_id": 1,\n  "target_city_id": 5,\n  "march_type": 1,\n  "army_power": 5000\n}`,
                res: `{\n  "code": 0,\n  "data": {\n    "march_id": "march_a1b2c3d4",\n    "status": "marching",\n    "path": [1, 2, 3, 5],\n    "distance": 3,\n    "speed_multiplier": 1.0,\n    "march_duration_secs": 10800,\n    "arrive_time": "2025-01-15T10:30:00Z",\n    "army_power": 5000,\n    "food_cost": 500\n  }\n}` },
              { method: 'GET', path: '/api/v1/map/march/:marchId/progress', auth: true, desc: '行军进度', color: 'bg-amber-500',
                res: `{\n  "code": 0,\n  "data": {\n    "march_id": "march_a1b2c3d4",\n    "status": "marching",\n    "progress": 0.65,\n    "remain_secs": 3780,\n    "current_path_index": 2,\n    "arrive_time": "2025-01-15T10:30:00Z"\n  }\n}` },
              { method: 'POST', path: '/api/v1/map/march/:marchId/recall', auth: true, desc: '撤回行军', color: 'bg-gray-500',
                req: `{\n  "march_id": "march_a1b2c3d4"\n}`,
                res: `{\n  "code": 0,\n  "data": {\n    "march_id": "march_a1b2c3d4",\n    "status": "recalled",\n    "recalled_army": 5000,\n    "refund_food": 250\n  }\n}` },
              { method: 'GET', path: '/api/v1/map/city/:id', auth: false, desc: '城池详情', color: 'bg-green-500',
                res: `{\n  "code": 0,\n  "data": {\n    "city_id": 5,\n    "name": "许昌",\n    "level": 4,\n    "region_id": 2,\n    "region_name": "豫州",\n    "coordinates": { "x": 150, "y": 180 },\n    "terrain": "平原",\n    "defense_bonus": 0.35,\n    "resource_multiplier": 2.0,\n    "max_garrison": 8000,\n    "connections": [3, 6, 8, 11],\n    "occupation": {\n      "alliance_id": 100,\n      "alliance_name": "龙图阁",\n      "owner_id": 5001,\n      "garrison": 3000,\n      "wall_hp": 15000,\n      "wall_max_hp": 20000\n    }\n  }\n}` },
              { method: 'GET', path: '/api/v1/map/alliance/:allianceId/territory', auth: true, desc: '联盟领土', color: 'bg-purple-500',
                res: `{\n  "code": 0,\n  "data": {\n    "alliance_id": 100,\n    "alliance_name": "龙图阁",\n    "total_cities": 8,\n    "territories": [\n      {\n        "city_id": 5, "city_name": "许昌", "level": 4,\n        "garrison": 3000, "wall_hp": 15000\n      }\n    ],\n    "territory_buffs": {\n      "attack_bonus": 0.05,\n      "defense_bonus": 0.08,\n      "resource_bonus": 0.10\n    },\n    "total_resource_bonus": 0.10\n  }\n}` },
            ].map((api) => (
              <Collapsible key={api.path}>
                <Card className="hover:shadow-sm transition-shadow">
                  <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-md text-white text-xs font-bold font-mono ${api.color}`}>{api.method}</span>
                        <code className="text-sm font-mono font-semibold">{api.path}</code>
                        {api.auth && <Badge variant="outline" className="text-[10px] gap-1 border-amber-300 text-amber-600 dark:text-amber-400"><Shield className="w-3 h-3" />JWT</Badge>}
                        <span className="text-xs text-muted-foreground ml-auto">{api.desc}</span>
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4"><Separator />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {api.req && <div><p className="text-xs font-semibold text-muted-foreground mb-2">→ Request</p><CodeBlock code={api.req} lang="json" filename="request.json" /></div>}
                        {api.res && <div><p className="text-xs font-semibold text-muted-foreground mb-2">← Response</p><CodeBlock code={api.res} lang="json" filename="response.json" /></div>}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </motion.section>

          {/* ===== Database ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-amber-500 to-orange-600" />
              数据库（6 张表）
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { name: 'map_regions', desc: '九大区域', fields: ['region_id (主键)', 'name (冀州/兖州/...)', 'terrain (地形类型)', 'description (区域描述)', 'center_x / center_y', 'city_count'] },
                { name: 'map_cities', desc: '36座城池', fields: ['city_id (主键)', 'region_id → map_regions', 'name (城池名称)', 'level (1~5)', 'coord_x / coord_y', 'terrain / defense_bonus', 'resource_multiplier', 'connections (JSON邻接)'] },
                { name: 'city_occupations', desc: '占领状态', fields: ['id (主键)', 'city_id → map_cities', 'alliance_id (联盟)', 'owner_id (城主)', 'garrison (驻军)', 'wall_hp / wall_max_hp', 'occupied_at'] },
                { name: 'march_orders', desc: '行军令', fields: ['march_id (UUID主键)', 'user_id (发起者)', 'source_city / target_city', 'march_type (5种)', 'army_power / food_cost', 'path_json (BFS路径)', 'speed_multiplier', 'duration_secs / progress', 'status / arrive_time'] },
                { name: 'alliance_territories', desc: '联盟领土汇总', fields: ['id (主键)', 'alliance_id (联盟)', 'city_count (领土数)', 'attack_bonus / defense_bonus', 'resource_bonus', 'updated_at'] },
                { name: 'city_battle_logs', desc: '城池战斗记录', fields: ['id (主键)', 'city_id (城池)', 'attacker_alliance', 'defender_alliance', 'attacker_power / defender_power', 'result (胜/负/平)', 'detail_json', 'created_at'] },
              ].map((t) => (
                <Card key={t.name}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><Database className="w-4 h-4 text-muted-foreground" /><code className="font-mono">{t.name}</code></CardTitle><CardDescription className="text-xs">{t.desc}</CardDescription></CardHeader>
                  <CardContent><ul className="space-y-1">{t.fields.map((f) => (<li key={f} className="text-[11px] font-mono text-muted-foreground flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-current flex-shrink-0" />{f}</li>))}</ul></CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== Source Code ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-amber-600 to-stone-600" />
              核心源码（14 个文件）
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Card className="lg:col-span-1 p-0 overflow-hidden">
                <div className="p-3 border-b bg-muted/30"><p className="text-xs font-semibold flex items-center gap-1.5"><Map className="w-3.5 h-3.5 text-amber-500" />map-service/</p></div>
                <ScrollArea className="h-[400px]"><div className="p-1 space-y-0.5">{sourceFiles.map((f, i) => (
                  <button key={f.name} onClick={() => setActiveTab(i)} className={`w-full text-left px-3 py-2 rounded-md text-xs flex items-center gap-2 transition-colors ${activeTab === i ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                    <FileCode className={`w-3.5 h-3.5 flex-shrink-0 ${activeTab === i ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                    <div className="min-w-0"><p className="font-medium truncate">{f.name}</p><p className={`text-[10px] truncate ${activeTab === i ? 'text-primary-foreground/70' : 'text-muted-foreground/60'}`}>{f.desc}</p></div>
                  </button>
                ))}</div></ScrollArea>
              </Card>
              <Card className="lg:col-span-3 p-0 overflow-hidden">
                <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-muted-foreground" />
                  <code className="text-sm font-mono font-semibold">{sourceFiles[activeTab].name}</code>
                  <Badge variant="outline" className="text-[10px]">{sourceFiles[activeTab].desc}</Badge>
                </div>
                <ScrollArea className="h-[400px]"><div className="p-4">
                  <CodeBlock code={
                    activeTab === 1 ? engineCode
                    : activeTab === 7 ? `-- 九州地图数据库建表脚本\n-- 6 张表：区域、城池、占领、行军、联盟领土、战斗记录\n\nCREATE TABLE map_regions (\n  region_id INT PRIMARY KEY AUTO_INCREMENT,\n  name VARCHAR(20) NOT NULL COMMENT '区域名称',\n  terrain VARCHAR(20) NOT NULL COMMENT '地形类型',\n  description TEXT COMMENT '区域描述',\n  center_x INT NOT NULL,\n  center_y INT NOT NULL,\n  city_count INT DEFAULT 0\n);\n\nCREATE TABLE map_cities (\n  city_id INT PRIMARY KEY AUTO_INCREMENT,\n  region_id INT NOT NULL,\n  name VARCHAR(30) NOT NULL,\n  level TINYINT DEFAULT 1,\n  coord_x INT NOT NULL,\n  coord_y INT NOT NULL,\n  terrain VARCHAR(20),\n  defense_bonus DECIMAL(3,2) DEFAULT 0,\n  resource_multiplier DECIMAL(3,1) DEFAULT 1.0,\n  connections JSON,\n  FOREIGN KEY (region_id) REFERENCES map_regions(region_id)\n);\n\nCREATE TABLE city_occupations (\n  id BIGINT PRIMARY KEY AUTO_INCREMENT,\n  city_id INT NOT NULL,\n  alliance_id BIGINT,\n  owner_id BIGINT,\n  garrison INT DEFAULT 0,\n  wall_hp INT DEFAULT 0,\n  wall_max_hp INT DEFAULT 0,\n  occupied_at DATETIME,\n  FOREIGN KEY (city_id) REFERENCES map_cities(city_id)\n);\n\nCREATE TABLE march_orders (\n  march_id VARCHAR(64) PRIMARY KEY,\n  user_id BIGINT NOT NULL,\n  source_city_id INT,\n  target_city_id INT,\n  march_type TINYINT NOT NULL,\n  army_power INT DEFAULT 0,\n  food_cost INT DEFAULT 0,\n  path_json JSON,\n  speed_multiplier DECIMAL(3,1) DEFAULT 1.0,\n  duration_secs INT DEFAULT 0,\n  progress DECIMAL(5,4) DEFAULT 0,\n  status VARCHAR(20) DEFAULT 'marching',\n  arrive_time DATETIME,\n  created_at DATETIME DEFAULT NOW()\n);\n\nCREATE TABLE alliance_territories (\n  id BIGINT PRIMARY KEY AUTO_INCREMENT,\n  alliance_id BIGINT NOT NULL,\n  city_count INT DEFAULT 0,\n  attack_bonus DECIMAL(4,3) DEFAULT 0,\n  defense_bonus DECIMAL(4,3) DEFAULT 0,\n  resource_bonus DECIMAL(4,3) DEFAULT 0,\n  updated_at DATETIME DEFAULT NOW()\n);\n\nCREATE TABLE city_battle_logs (\n  id BIGINT PRIMARY KEY AUTO_INCREMENT,\n  city_id INT NOT NULL,\n  attacker_alliance BIGINT,\n  defender_alliance BIGINT,\n  attacker_power INT DEFAULT 0,\n  defender_power INT DEFAULT 0,\n  result VARCHAR(10),\n  detail_json JSON,\n  created_at DATETIME DEFAULT NOW()\n);`
                    : activeTab === 8 ? `{\n  "regions": [\n    { "id": 1, "name": "冀州", "terrain": "平原", "center": [180, 60] },\n    { "id": 2, "name": "兖州", "terrain": "平原", "center": [160, 120] },\n    { "id": 3, "name": "青州", "terrain": "沿海", "center": [220, 100] },\n    { "id": 4, "name": "徐州", "terrain": "平原", "center": [210, 160] },\n    { "id": 5, "name": "豫州", "terrain": "平原", "center": [150, 180] },\n    { "id": 6, "name": "荆州", "terrain": "丘陵", "center": [130, 250] },\n    { "id": 7, "name": "扬州", "terrain": "水乡", "center": [220, 230] },\n    { "id": 8, "name": "梁州", "terrain": "山地", "center": [80, 200] },\n    { "id": 9, "name": "雍州", "terrain": "荒漠", "center": [60, 100] }\n  ],\n  "march_types": {\n    "1": { "name": "进攻", "speed": 1.0, "food_ratio": 1.0 },\n    "2": { "name": "增援", "speed": 1.2, "food_ratio": 0.8 },\n    "3": { "name": "侦查", "speed": 1.5, "food_ratio": 0.3 },\n    "4": { "name": "撤退", "speed": 1.3, "food_ratio": 0.5 },\n    "5": { "name": "迁城", "speed": 0.5, "food_ratio": 2.0 }\n  },\n  "city_levels": {\n    "1": { "name": "小城", "defense": 0, "resource": 1.0, "garrison": 500 },\n    "2": { "name": "县城", "defense": 0.1, "resource": 1.2, "garrison": 1000 },\n    "3": { "name": "郡城", "defense": 0.2, "resource": 1.5, "garrison": 3000 },\n    "4": { "name": "州城", "defense": 0.35, "resource": 2.0, "garrison": 8000 },\n    "5": { "name": "京城", "defense": 0.5, "resource": 3.0, "garrison": 20000 }\n  },\n  "worker_pool_size": 5,\n  "max_active_per_user": 5,\n  "base_march_speed": 3.0\n}`
                    : activeTab === 10 ? `server:\n  port: 9004\n  mode: release\n\ndatabase:\n  host: 127.0.0.1\n  port: 3306\n  user: root\n  password: ""\n  dbname: jiuzhou_map\n  max_open_conns: 20\n  max_idle_conns: 10\n\nredis:\n  addr: 127.0.0.1:6379\n  password: ""\n  db: 0\n  pool_size: 10\n\njwt:\n  secret: "your-jwt-secret-key"\n  expire_hours: 24\n\nmarch_engine:\n  worker_pool_size: 5\n  max_active_per_user: 5\n  base_march_speed: 3.0\n  arrive_check_interval: 1s\n  progress_update_interval: 5s\n  batch_size: 50\n\nlog:\n  level: info\n  file: logs/map-service.log`
                    : `// 完整源码位于 map-service/ 目录\n// 14 个文件，包含地图引擎核心实现\n// march_engine.go 包含 BFS 寻路、Redis Stream 消费、行军处理等`
                  } lang={
                    activeTab === 7 ? 'sql' : activeTab === 8 ? 'json' : activeTab === 10 ? 'yaml' : 'go'
                  } filename={sourceFiles[activeTab].name} />
                </div></ScrollArea>
              </Card>
            </div>
          </motion.section>

          {/* ===== Quick Start ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-emerald-500 to-green-600" />
              快速启动
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">1</span>建库建表</CardTitle></CardHeader><CardContent><CodeBlock code={`mysql -u root -p < map-service/docs/schema.sql\n\n# 创建数据库 + 6 张表\n# map_regions, map_cities, city_occupations\n# march_orders, alliance_territories, city_battle_logs`} lang="bash" filename="terminal" /></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">2</span>导入初始数据</CardTitle></CardHeader><CardContent><CodeBlock code={`# 导入 9 大区域 + 36 座城池\nmysql -u root -p jiuzhou_map \\\n  < map-service/docs/init_data.sql\n\n# 导入地图配置（城池等级/行军类型）\ncp map-service/config/map_config.json ./`} lang="bash" filename="terminal" /></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-bold">3</span>启动服务</CardTitle></CardHeader><CardContent><CodeBlock code={`cd map-service\ngo mod tidy\ngo run cmd/main.go\n# → http://localhost:9004\n# 行军引擎启动 (5 Workers)\n# Redis Stream 消费就绪`} lang="bash" filename="terminal" /></CardContent></Card>
            </div>
          </motion.section>

        </main>

        <footer className="border-t bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>九州争鼎 — 地图系统微服务 · Go + Redis Stream + BFS寻路</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Map className="w-3 h-3" />Map</span>
              <span className="flex items-center gap-1"><Zap className="w-3 h-3" />Redis Stream</span>
              <span className="flex items-center gap-1"><Route className="w-3 h-3" />BFS</span>
              <span className="flex items-center gap-1"><Server className="w-3 h-3" />Port 9004</span>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}
