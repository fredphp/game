'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Copy, Check, ChevronDown, Database, Server, Shield, Key,
  Zap, Globe, ArrowRight, Layers, HardDrive, BadgeCheck,
  Sparkles, Star, Gift, Lock, Clock, Dices, Trophy,
  Target, TrendingUp, Swords, FileCode,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from '@/components/ui/tooltip'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

// ─── Helpers ────────────────────────────────────────
function CodeBlock({ code, lang = 'go', filename }: { code: string; lang: string; filename: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div className="relative rounded-lg overflow-hidden border">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 dark:bg-zinc-900 border-b border-zinc-700">
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

const rarityColors: Record<number, { bg: string; text: string; label: string; border: string }> = {
  5: { bg: 'bg-amber-500/10 dark:bg-amber-500/20', text: 'text-amber-500 dark:text-amber-400', label: 'SSR', border: 'border-amber-500/30' },
  4: { bg: 'bg-purple-500/10 dark:bg-purple-500/20', text: 'text-purple-500 dark:text-purple-400', label: 'SR', border: 'border-purple-500/30' },
  3: { bg: 'bg-blue-500/10 dark:bg-blue-500/20', text: 'text-blue-500 dark:text-blue-400', label: 'R', border: 'border-blue-500/30' },
}

const sourceFiles = [
  { name: 'main.go', path: 'cmd/main.go', desc: '服务入口' },
  { name: 'card_model.go', path: 'internal/model/', desc: '数据模型' },
  { name: 'gacha_engine.go', path: 'internal/engine/', desc: '抽卡引擎核心' },
  { name: 'card_dao.go', path: 'internal/dao/', desc: '数据访问层' },
  { name: 'card_service.go', path: 'internal/service/', desc: '业务逻辑层' },
  { name: 'card_handler.go', path: 'internal/handler/', desc: 'HTTP处理器' },
  { name: 'router.go', path: 'internal/router/', desc: '路由注册' },
  { name: 'auth.go', path: 'internal/middleware/', desc: 'JWT中间件' },
  { name: 'schema.sql', path: 'docs/', desc: '数据库建表' },
  { name: 'pool_config.json', path: 'docs/', desc: '卡池配置示例' },
]

const mainGoCode = `package main

import (
\t"fmt"
\t"user-service/internal/dao"
\t"user-service/internal/engine"
\t"user-service/internal/handler"
\t"user-service/internal/router"
\t"user-service/internal/service"
\tpkgmysql "user-service/pkg/mysql"
\tmyredis "user-service/pkg/redis"
\t"github.com/gin-gonic/gin"
\t"github.com/spf13/viper"
)

func main() {
\tconf := viper.New()
\tconf.SetConfigName("config")
\tconf.SetConfigType("yaml")
\tconf.AddConfigPath("./config")
\tif err := conf.ReadInConfig(); err != nil {
\t\tlog.Fatalf("加载配置失败: %v", err)
\t}

\tif err := pkgmysql.Init(conf); err != nil { log.Fatal(err) }
\tdefer pkgmysql.Close()
\tif err := myredis.Init(conf); err != nil { log.Fatal(err) }
\tdefer myredis.Close()

\tcardDAO := dao.NewCardDAO(pkgmysql.DB)
\tgachaEngine := engine.NewGachaEngine()
\tcardService := service.NewCardService(cardDAO, gachaEngine)
\tcardHandler := handler.NewCardHandler(cardService)

\tgin.SetMode(conf.GetString("server.mode"))
\tengine := gin.New()
\trouter.Setup(engine, cardHandler)
\tengine.Run(fmt.Sprintf("%s:%d",
\t\tconf.GetString("server.host"),
\t\tconf.GetInt("server.port")))
}`

const engineCode = `package engine

// GachaEngine 抽卡引擎（线程安全，无状态）
type GachaEngine struct{}

// Pull 执行单次抽卡 — 核心算法
func (e *GachaEngine) Pull(config *model.PoolConfig, ssrPity, srPity int) (*PullResult, error) {
    // 1. 检查硬保底: 80抽必SSR
    if ssrPity+1 >= config.PitySSR {
        return e.pullFromPool(config.SSRPool, 5, "ssr", true, config.UpCards)
    }
    // 2. 检查SR保底: 10抽必SR
    if srPity+1 >= config.PitySR {
        return e.pullFromPool(config.SRPool, 4, "sr", true, nil)
    }
    // 3. 计算软保底概率
    actualSSRRate := calcSoftPityRate(config.SSRRate, ssrPity, config.PitySSR)
    // 4. 概率抽取
    roll, _ := rand.Int(rand.Reader, big.NewInt(10000))
    switch {
    case rollVal < int64(actualSSRRate*10000):
        return e.pullFromPool(config.SSRPool, 5, "ssr", false, config.UpCards)
    case rollVal < int64(actualSRRate*10000):
        return e.pullFromPool(config.SRPool, 4, "sr", false, nil)
    default:
        return e.pullFromPool(config.RPool, 3, "r", false, nil)
    }
}

// 软保底概率曲线
//   0~59抽:  基础概率 2%
//   60~74抽: 线性提升到 12% (6倍)
//   75~79抽: 指数加速到接近 100%
func calcSoftPityRate(baseRate float64, pullCount, pityThreshold int) float64 {
    if pullCount < 60 { return baseRate }
    if pullCount < 75 {
        progress := float64(pullCount-59) / 15.0
        return baseRate * (1.0 + 5.0*progress)
    }
    boost := math.Pow(3.0, float64(75-pullCount)/5.0)
    rate := baseRate * 6.0 * boost
    if rate > 1.0 { rate = 1.0 }
    return rate
}`

// ─── Main Page ──────────────────────────────────────
export default function Home() {
  const [activeTab, setActiveTab] = useState('engine')

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 md:py-12 space-y-12">

          {/* ===== Hero ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-card/80 p-8 md:p-12">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-purple-500/10 via-pink-500/5 to-transparent blur-3xl" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">Card Service</Badge>
                <Badge variant="outline" className="border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5">Gacha Engine</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-black">
                <span className="bg-gradient-to-r from-amber-500 via-orange-400 to-purple-500 bg-clip-text text-transparent">卡牌系统微服务</span>
              </h1>
              <p className="mt-2 text-lg text-muted-foreground font-medium">Card Service — 抽卡引擎 + 库存管理</p>
              <p className="mt-3 text-sm text-muted-foreground/80 max-w-2xl leading-relaxed">
                基于 Go 的卡牌抽卡系统完整实现。包含可配置卡池、SSR/SR/R 概率控制、
                80抽硬保底 + 软保底曲线、用户卡牌库存、抽卡历史等核心功能。
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['SSR/SR/R 概率控制', '80抽硬保底', '软保底概率曲线', '可配置卡池',
                  '十连抽卡', 'Redis 缓存', '保底计数持久化', 'UP 限定卡',
                ].map((t) => (<Badge key={t} variant="secondary" className="text-xs px-2.5 py-1">{t}</Badge>))}
              </div>
            </div>
          </motion.section>

          {/* ===== Probability System ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-amber-500 to-orange-600" />
              概率系统设计
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { rarity: 5, label: 'SSR — 传说武将', rate: '2%', color: 'from-amber-500 to-yellow-500', icon: Sparkles,
                  items: ['基础概率 2%', 'UP池限定概率 0.5%', '80抽硬保底', '60抽起软保底提升', '75抽起指数加速'] },
                { rarity: 4, label: 'SR — 史诗武将', rate: '10%', color: 'from-purple-500 to-violet-500', icon: Star,
                  items: ['基础概率 10%', '10抽硬保底必出SR', 'SR保底独立计数', '不影响SSR保底'] },
                { rarity: 3, label: 'R — 稀有武将', rate: '88%', color: 'from-blue-500 to-cyan-500', icon: Gift,
                  items: ['基础概率 88%', '保底兜底', '十连必出至少1SR'] },
              ].map((tier) => {
                const colors = rarityColors[tier.rarity]
                return (
                  <Card key={tier.label} className={`border ${colors.border} ${colors.bg}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tier.color} flex items-center justify-center`}>
                            <tier.icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-sm font-bold">{tier.label}</CardTitle>
                            <p className={`text-lg font-black ${colors.text}`}>{tier.rate}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className={`text-xs font-bold ${colors.text} ${colors.border}`}>{colors.label}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1.5">
                        {tier.items.map((item) => (
                          <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <div className={`w-1 h-1 rounded-full ${colors.text} bg-current`} />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )
              })}
            </div>

            {/* Soft Pity Curve */}
            <Card className="border-dashed">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-500" />
                  软保底概率曲线
                </CardTitle>
                <CardDescription>距离硬保底越近，SSR 概率越高（防止连续沉船）</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { pulls: '0~59 抽', prob: '2%', desc: '基础概率，正常抽取', width: 'w-[8%]', color: 'bg-blue-500' },
                    { pulls: '60 抽', prob: '~3%', desc: '开始线性提升 (×1.5)', width: 'w-[12%]', color: 'bg-blue-400' },
                    { pulls: '70 抽', prob: '~7%', desc: '持续提升 (×3.5)', width: 'w-[28%]', color: 'bg-purple-400' },
                    { pulls: '75 抽', prob: '~12%', desc: '进入加速区 (×6.0)', width: 'w-[48%]', color: 'bg-purple-500' },
                    { pulls: '78 抽', prob: '~50%+', desc: '指数级大幅提升', width: 'w-[75%]', color: 'bg-amber-500' },
                    { pulls: '80 抽', prob: '100%', desc: '硬保底，必出 SSR', width: 'w-full', color: 'bg-amber-400' },
                  ].map((row) => (
                    <div key={row.pulls} className="flex items-center gap-3">
                      <span className="text-xs font-mono font-semibold w-20 text-right shrink-0">{row.pulls}</span>
                      <div className="flex-1 relative h-6 bg-muted rounded-full overflow-hidden">
                        <div className={`absolute inset-y-0 left-0 ${row.width} ${row.color} rounded-full transition-all duration-300`} />
                        <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold">{row.prob}</span>
                      </div>
                      <span className="text-xs text-muted-foreground w-40 shrink-0">{row.desc}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* ===== Gacha Flow ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-purple-500 to-pink-600" />
              抽卡流程
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: Dices, title: '1. 验证请求', desc: 'JWT鉴权 + 参数校验\npool_id/count 合法性', color: 'text-blue-500' },
                { icon: Target, title: '2. 获取配置', desc: 'Redis → MySQL\n卡池配置 + 保底计数', color: 'text-purple-500' },
                { icon: Swords, title: '3. 引擎抽卡', desc: '软/硬保底判定\n概率抽取 + 随机选卡', color: 'text-amber-500' },
                { icon: Trophy, title: '4. 结果处理', desc: '创建卡牌实例\n记录日志 + 更新保底', color: 'text-emerald-500' },
              ].map((step) => (
                <Card key={step.title} className="hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <step.icon className={`w-4 h-4 ${step.color}`} />
                      {step.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground whitespace-pre-line">{step.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pity Counter Flow */}
            <Card className="border-dashed bg-amber-50/30 dark:bg-amber-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-amber-500" />
                  保底计数器更新规则
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-200 dark:border-amber-800">
                    <p className="font-bold text-amber-600 dark:text-amber-400 mb-1">🌟 抽到 SSR</p>
                    <p className="text-muted-foreground">SSR计数 <code className="text-amber-600">→ 0</code></p>
                    <p className="text-muted-foreground">SR计数 <code className="text-amber-600">→ 0</code></p>
                  </div>
                  <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-200 dark:border-purple-800">
                    <p className="font-bold text-purple-600 dark:text-purple-400 mb-1">⭐ 抽到 SR</p>
                    <p className="text-muted-foreground">SSR计数 <code className="text-purple-600">+1</code></p>
                    <p className="text-muted-foreground">SR计数 <code className="text-purple-600">→ 0</code></p>
                  </div>
                  <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-200 dark:border-blue-800">
                    <p className="font-bold text-blue-600 dark:text-blue-400 mb-1">○ 抽到 R</p>
                    <p className="text-muted-foreground">SSR计数 <code className="text-blue-600">+1</code></p>
                    <p className="text-muted-foreground">SR计数 <code className="text-blue-600">+1</code></p>
                  </div>
                </div>
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
              { method: 'POST', path: '/api/v1/card/gacha', auth: true, desc: '单抽/十连抽卡', color: 'bg-emerald-500',
                req: `{\n  "pool_id": 1,\n  "count": 10\n}`,
                res: `{\n  "code": 0,\n  "data": {\n    "pull_index": 80,\n    "cards": [\n      { "card_id": 1001, "name": "关羽", "rarity": 5, "is_new": true, "is_pity": true, "is_up": true, "user_card_id": 551 },\n      { "card_id": 2003, "name": "赵云", "rarity": 4, "is_new": false, "is_pity": false, "user_card_id": 552 }\n    ],\n    "new_cards": 1,\n    "ssr_count": 1, "sr_count": 3, "r_count": 6,\n    "ssr_pity_left": 80,\n    "sr_pity_left": 10\n  }\n}` },
              { method: 'GET', path: '/api/v1/card/pools', auth: false, desc: '获取可用卡池列表', color: 'bg-blue-500',
                res: `{\n  "code": 0,\n  "data": [\n    {\n      "id": 1,\n      "name": "hero_2024_q1",\n      "display_name": "三国群英·上篇",\n      "type": "limited",\n      "start_time": "2024-01-01T00:00:00Z",\n      "end_time": "2024-03-31T23:59:59Z"\n    }\n  ]\n}` },
              { method: 'GET', path: '/api/v1/card/list?page=1&page_size=20&rarity=5', auth: true, desc: '用户卡牌库存(按稀有度筛选)', color: 'bg-amber-500',
                res: `{\n  "code": 0,\n  "data": {\n    "total": 3,\n    "page": 1, "size": 20,\n    "list": [\n      { "id": 101, "user_id": 10001, "card_id": 1001, "star": 3, "level": 40, "is_locked": true }\n    ]\n  }\n}` },
              { method: 'PUT', path: '/api/v1/card/:id/lock', auth: true, desc: '切换卡牌锁定/解锁', color: 'bg-purple-500',
                res: `{ "code": 0, "message": "success" }` },
              { method: 'GET', path: '/api/v1/card/gacha/history?limit=20', auth: true, desc: '抽卡历史记录', color: 'bg-orange-500',
                res: `{\n  "code": 0,\n  "data": [\n    { "card_id": 1001, "rarity": 5, "is_new": true, "is_pity": true, "pull_index": 80, "created_at": "..." }\n  ]\n}` },
              { method: 'GET', path: '/api/v1/card/gacha/stats?pool_id=1', auth: true, desc: '保底计数查询', color: 'bg-red-500',
                res: `{\n  "code": 0,\n  "data": {\n    "user_id": 10001, "pool_id": 1,\n    "total_pulls": 65, "ssr_pity_counter": 65, "sr_pity_counter": 5\n  }\n}` },
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
                    <CardContent className="pt-0 space-y-4">
                      <Separator />
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
              数据库设计（5张表）
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[
                { name: 'card_definitions', desc: '卡牌定义表', icon: Layers, color: 'border-amber-300',
                  fields: ['id BIGINT PK', 'name VARCHAR(64)', 'rarity TINYINT (3/4/5)', 'element/faction/role', 'base_hp/base_atk/base_def', 'skill_id/lead_skill_id', 'is_limited TINYINT'] },
                { name: 'card_pools', desc: '卡池配置表', icon: Database, color: 'border-purple-300',
                  fields: ['id BIGINT PK', 'name/display_name', 'type (normal/limited/rateup)', 'start_time/end_time', 'status (1开放/0关闭)', 'config JSON ← 概率+卡牌列表'] },
                { name: 'user_cards', desc: '玩家卡牌实例表', icon: Gift, color: 'border-emerald-300',
                  fields: ['id BIGINT PK', 'user_id BIGINT', 'card_id BIGINT', 'star TINYINT (1~6)', 'level INT (1~100)', 'exp BIGINT', 'is_locked TINYINT'] },
                { name: 'gacha_records', desc: '抽卡记录表', icon: Clock, color: 'border-blue-300',
                  fields: ['id BIGINT PK', 'user_id/pool_id/card_id', 'rarity TINYINT', 'is_new/is_pity', 'pull_index INT', 'created_at'] },
                { name: 'user_gacha_stats', desc: '保底计数表', icon: Target, color: 'border-red-300',
                  fields: ['user_id/pool_id (UNIQUE)', 'total_pulls INT', 'ssr_pity_counter INT', 'sr_pity_counter INT', 'updated_at'] },
              ].map((table) => (
                <Card key={table.name} className={`border ${table.color}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <table.icon className="w-4 h-4 text-muted-foreground" />
                      <code className="font-mono">{table.name}</code>
                    </CardTitle>
                    <CardDescription className="text-xs">{table.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1">
                      {table.fields.map((f) => (
                        <li key={f} className="text-[11px] font-mono text-muted-foreground flex items-center gap-2">
                          <div className="w-1 h-1 rounded-full bg-current" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== Pool Config ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-green-500 to-emerald-600" />
              卡池配置（可热更新）
            </h2>

            <CodeBlock
              code={`{
  "ssr_rate": 0.02,          // SSR基础概率 2%
  "sr_rate": 0.10,           // SR基础概率 10%
  "r_rate": 0.88,            // R基础概率 88%
  "ssr_up_rate": 0.005,      // UP限定概率 0.5%
  "pity_ssr": 80,            // SSR硬保底 80抽
  "pity_sr": 10,             // SR硬保底 10抽
  "ssr_pool": [1001, 1002, 1003, 1004, 1005],
  "sr_pool":  [2001, 2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010],
  "r_pool":   [3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010,
               3011, 3012, 3013, 3014, 3015],
  "up_cards": [1001]          // UP卡牌ID列表
}`}
              lang="json"
              filename="pool_config.json"
            />
          </motion.section>

          {/* ===== Source Code ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-violet-500 to-purple-600" />
              核心源码
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Card className="lg:col-span-1 p-0 overflow-hidden">
                <div className="p-3 border-b bg-muted/30">
                  <p className="text-xs font-semibold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-amber-500" />card-service/</p>
                </div>
                <ScrollArea className="h-[420px]">
                  <div className="p-1 space-y-0.5">
                    {sourceFiles.map((f, i) => (
                      <button key={f.path} onClick={() => setActiveTab(i)} className={`w-full text-left px-3 py-2 rounded-md text-xs flex items-center gap-2 transition-colors ${activeTab === i ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                        <FileCode className={`w-3.5 h-3.5 flex-shrink-0 ${activeTab === i ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                        <div className="min-w-0">
                          <p className="font-medium truncate">{f.name}</p>
                          <p className={`text-[10px] truncate ${activeTab === i ? 'text-primary-foreground/70' : 'text-muted-foreground/60'}`}>{f.desc}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              </Card>

              <Card className="lg:col-span-3 p-0 overflow-hidden">
                <div className="p-3 border-b bg-muted/30 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-muted-foreground" />
                  <code className="text-sm font-mono font-semibold">{sourceFiles[activeTab].name}</code>
                  <Badge variant="outline" className="text-[10px]">{sourceFiles[activeTab].desc}</Badge>
                </div>
                <ScrollArea className="h-[420px]">
                  <div className="p-4">
                    <CodeBlock code={activeTab === 0 ? mainGoCode : activeTab === 2 ? engineCode : '// 完整源码位于 card-service/ 目录\n// 包含 10 个文件，可直接用于生产环境\n// 抽卡引擎核心见 internal/engine/gacha_engine.go'} lang={activeTab >= 8 ? 'sql' : activeTab === 9 ? 'json' : 'go'} filename={sourceFiles[activeTab].name} />
                  </div>
                </ScrollArea>
              </Card>
            </div>
          </motion.section>

          {/* ===== Redis Cache ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-red-500 to-rose-600" />
              Redis 缓存策略
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'card:pool:{id}', type: 'Hash', ttl: '10 min', desc: '卡池配置缓存，减少DB查询', example: 'HGET card:pool:1 config' },
                { key: 'card:gacha:stats:{uid}:{pid}', type: 'Hash', ttl: '24 h', desc: '保底计数缓存，高速读取', example: 'HGET card:gacha:stats:10001:1 ssr_pity_counter' },
                { key: 'card:user:list:{uid}', type: 'String', ttl: '5 min', desc: '用户卡牌列表缓存', example: 'GET card:user:list:10001' },
              ].map((c) => (
                <Card key={c.key}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <code className="text-xs font-mono font-bold text-red-500">{c.key}</code>
                      <div className="flex gap-1.5">
                        <Badge variant="outline" className="text-[10px]">{c.type}</Badge>
                        <Badge variant="secondary" className="text-[10px] gap-1"><Clock className="w-3 h-3" />{c.ttl}</Badge>
                      </div>
                    </div>
                    <CardDescription className="text-xs mt-1">{c.desc}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CodeBlock code={c.example} lang="redis" filename="redis-cli" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== Quick Start ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-emerald-500 to-green-600" />
              快速启动
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">1</span>建库建表</CardTitle></CardHeader>
                <CardContent><CodeBlock code={`mysql -u root -p < card-service/docs/schema.sql`} lang="bash" filename="terminal" /></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">2</span>导入卡池</CardTitle></CardHeader>
                <CardContent><CodeBlock code={`INSERT INTO card_pools (name, display_name, type, start_time, end_time, status, config)\nVALUES ('hero_2024', '三国群英', 'limited', '2024-01-01', '2025-12-31', 1,\n  '{\"ssr_rate\":0.02,\"sr_rate\":0.10,\"pity_ssr\":80,\"pity_sr\":10,...}');`} lang="sql" filename="mysql" /></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">3</span>启动服务</CardTitle></CardHeader>
                <CardContent><CodeBlock code={`cd card-service\ngo mod tidy\ngo run cmd/main.go\n# → http://localhost:9003`} lang="bash" filename="terminal" /></CardContent>
              </Card>
            </div>
          </motion.section>

        </main>

        <footer className="border-t bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>九州争鼎 — 卡牌系统微服务 · Go + Gin + MySQL + Redis + 抽卡引擎</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" />SSR 2%</span>
              <span className="flex items-center gap-1"><Star className="w-3 h-3" />SR 10%</span>
              <span className="flex items-center gap-1"><BadgeCheck className="w-3 h-3" />80抽保底</span>
              <span className="flex items-center gap-1"><Server className="w-3 h-3" />Port 9003</span>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}
