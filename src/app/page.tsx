'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Route,
  User,
  Swords,
  Layers,
  Shield,
  MessageCircle,
  Trophy,
  Mail,
  Calendar,
  CreditCard,
  Settings,
  Database,
  Server,
  Globe,
  ArrowRight,
  ChevronDown,
  Zap,
  Lock,
  Wifi,
  Activity,
  Container,
  HardDrive,
  Search,
  ArrowDown,
  ShieldCheck,
  RefreshCw,
  Eye,
  RotateCcw,
  type LucideIcon,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import DirectoryTree from '@/components/directory-tree'
import {
  goBackendTree,
  unityClientTree,
  backendModules,
  gatewayDesign,
  dockerServices,
  databaseTables,
  type ModuleInfo,
  type DockerService,
} from '@/lib/project-data'

const iconMap: Record<string, LucideIcon> = {
  Route, User, Swords, Layers, Shield, MessageCircle, Trophy,
  Mail, Calendar, CreditCard, Settings,
}

// ==================== Hero Section ====================
function HeroSection() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-card/80 p-8 md:p-12 lg:p-16"
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-red-500/10 via-rose-500/5 to-transparent blur-3xl" />
        {/* Pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      <div className="relative z-10 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-3 mb-6"
        >
          <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 px-3 py-1 text-xs font-medium">
            SLG Strategy Card Game
          </Badge>
          <Badge variant="outline" className="border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/5 px-3 py-1 text-xs font-medium">
            Go + Unity
          </Badge>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight"
        >
          <span className="bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 bg-clip-text text-transparent">
            九州争鼎
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-3 text-lg md:text-xl text-muted-foreground font-medium tracking-wide"
        >
          Jiuzhou Zhengding — 完整微服务架构项目结构
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-4 text-sm md:text-base text-muted-foreground/80 max-w-2xl leading-relaxed"
        >
          基于Go微服务 + Unity客户端的全栈SLG卡牌游戏架构方案。
          涵盖 11 个核心微服务、Protobuf通信协议、MySQL+Redis数据层、
          Docker/K8s容器化部署、Nginx网关接入层等完整生产级设计。
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex flex-wrap gap-3"
        >
          {[
            { label: '11 个微服务', color: 'text-amber-600 dark:text-amber-400' },
            { label: 'Protobuf 协议', color: 'text-emerald-600 dark:text-emerald-400' },
            { label: 'MySQL + Redis', color: 'text-purple-600 dark:text-purple-400' },
            { label: 'Docker 部署', color: 'text-blue-600 dark:text-blue-400' },
            { label: 'API 网关', color: 'text-orange-600 dark:text-orange-400' },
          ].map((tag) => (
            <span
              key={tag.label}
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border bg-card ${tag.color} border-current/20`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {tag.label}
            </span>
          ))}
        </motion.div>
      </div>
    </motion.section>
  )
}

// ==================== Architecture Overview ====================
function ArchitectureOverview() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-amber-500 to-orange-600" />
        <div>
          <h2 className="text-2xl font-bold">系统架构总览</h2>
          <p className="text-sm text-muted-foreground mt-1">Go微服务后端 + Unity客户端 + 网关接入 + 数据层</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Client Layer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-blue-500" />
            <h3 className="font-bold text-lg">客户端层</h3>
          </div>
          <Card className="border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20">
            <CardContent className="p-4 space-y-2">
              {['Unity 客户端 (C#)', 'Protobuf 通信协议', 'Addressable 热更新', 'MVC UI 框架'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <ArrowRight className="w-3 h-3 text-blue-500" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Service Layer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <Server className="w-5 h-5 text-emerald-500" />
            <h3 className="font-bold text-lg">微服务层</h3>
          </div>
          <Card className="border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardContent className="p-4 space-y-2">
              {['API 网关 (Nginx+Go)', '11 个核心微服务', 'gRPC 内部通信', 'Consul 服务发现'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <ArrowRight className="w-3 h-3 text-emerald-500" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Data Layer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-purple-500" />
            <h3 className="font-bold text-lg">数据层</h3>
          </div>
          <Card className="border-purple-200 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-950/20">
            <CardContent className="p-4 space-y-2">
              {['MySQL 8.0 (持久化)', 'Redis 7.0 (缓存+排行榜)', 'Protobuf (序列化)', 'Prometheus (监控)'].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <ArrowRight className="w-3 h-3 text-purple-500" />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Request Flow */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
      >
        <Card className="border-dashed">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowDown className="w-4 h-4 text-amber-500" />
              请求流转链路
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              {[
                'Unity客户端',
                'TCP/WebSocket',
                'Nginx',
                'API网关',
                'JWT鉴权',
                '服务发现',
                'gRPC',
                '目标微服务',
                'MySQL/Redis',
              ].map((step, i) => (
                <span key={step} className="flex items-center gap-2">
                  <Badge variant="secondary" className="px-2.5 py-1 text-xs font-mono">
                    {step}
                  </Badge>
                  {i < 8 && (
                    <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                  )}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  )
}

// ==================== Module Cards ====================
function ModuleCards() {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-emerald-500 to-teal-600" />
        <div>
          <h2 className="text-2xl font-bold">微服务模块详解</h2>
          <p className="text-sm text-muted-foreground mt-1">11个核心微服务的职责、技术栈与通信协议</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {backendModules.map((mod, idx) => {
          const IconComp = iconMap[mod.icon] || Server
          const id = mod.name
          const isExpanded = expandedId === id

          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
            >
              <Collapsible open={isExpanded} onOpenChange={(open) => setExpandedId(open ? id : null)}>
                <Card className={`group cursor-pointer transition-all duration-300 hover:shadow-md ${isExpanded ? 'ring-1 ring-primary/20 shadow-md' : ''}`}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center shadow-sm`}>
                            <IconComp className="w-5 h-5 text-white" />
                          </div>
                          <div className="text-left">
                            <CardTitle className="text-sm font-bold leading-tight">{mod.name}</CardTitle>
                            <CardDescription className="text-[10px] font-mono mt-0.5">{mod.nameEn}</CardDescription>
                          </div>
                        </div>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">{mod.description}</p>
                      {mod.port && (
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-[10px] px-2 py-0">
                            {mod.port}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-2 py-0">
                            {mod.protocol}
                          </Badge>
                        </div>
                      )}
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 space-y-4">
                      <Separator />
                      <div>
                        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                          <Activity className="w-3 h-3" />
                          核心职责
                        </h4>
                        <ul className="space-y-1.5">
                          {mod.responsibilities.map((r) => (
                            <li key={r} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <span className="w-1 h-1 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                              {r}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-semibold text-foreground mb-2 flex items-center gap-1.5">
                          <HardDrive className="w-3 h-3" />
                          技术栈
                        </h4>
                        <div className="flex flex-wrap gap-1.5">
                          {mod.techStack.map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px] px-2 py-0 font-mono">
                              {t}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

// ==================== Gateway Design ====================
function GatewaySection() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-orange-500 to-red-600" />
        <div>
          <h2 className="text-2xl font-bold">网关架构设计</h2>
          <p className="text-sm text-muted-foreground mt-1">多层网关架构，从接入到服务的完整链路</p>
        </div>
      </div>

      <div className="space-y-3">
        {gatewayDesign.layers.map((layer, idx) => (
          <motion.div
            key={layer.name}
            initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
          >
            <Card className={`border-l-4 ${layer.color}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  {idx === 0 && <Globe className="w-4 h-4" />}
                  {idx === 1 && <Server className="w-4 h-4" />}
                  {idx === 2 && <Route className="w-4 h-4" />}
                  {idx === 3 && <Zap className="w-4 h-4" />}
                  {idx === 4 && <Database className="w-4 h-4" />}
                  {layer.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {layer.items.map((item) => (
                    <Badge key={item} variant="outline" className="text-xs px-2.5 py-1">
                      {item}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Gateway Filters Detail */}
      <Card className="border-dashed bg-amber-50/30 dark:bg-amber-950/10">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            网关过滤器链
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { icon: Lock, name: '鉴权过滤器', desc: 'JWT Token校验与黑名单检查，未授权请求直接拦截' },
              { icon: Activity, name: '限流过滤器', desc: '令牌桶+滑动窗口双限流，按用户/IP/接口维度' },
              { icon: RefreshCw, name: '熔断降级器', desc: 'Hystrix模式熔断，失败率超阈值自动降级返回缓存' },
              { icon: Eye, name: '链路追踪', desc: 'OpenTelemetry集成，TraceID透传全链路追踪' },
              { icon: Search, name: '服务发现', desc: 'Consul/Etcd注册中心，动态感知服务上下线' },
              { icon: RotateCcw, name: '负载均衡', desc: '轮询/加权/一致性哈希多种策略，自动剔除异常节点' },
            ].map(({ icon: Icon, name, desc }) => (
              <div key={name} className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-accent/30 transition-colors">
                <Icon className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-semibold">{name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

// ==================== Docker Deployment ====================
function DockerDeployment() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-blue-500 to-cyan-600" />
        <div>
          <h2 className="text-2xl font-bold">Docker 部署方案</h2>
          <p className="text-sm text-muted-foreground mt-1">容器化部署架构，支持Docker Compose与Kubernetes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {dockerServices.map((svc, idx) => (
          <motion.div
            key={svc.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.03 }}
          >
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Container className="w-4 h-4 text-blue-500" />
                    {svc.name}
                  </CardTitle>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {svc.port}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    镜像: <code className="text-[10px] font-mono bg-muted px-1 rounded">{svc.image.split(':')[0]}</code>
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  实例: <span className="font-medium text-foreground">{svc.replicas}</span>
                </p>
                {svc.depends_on && (
                  <p className="text-xs text-muted-foreground">
                    依赖: <span className="font-mono text-[10px]">{svc.depends_on.join(', ')}</span>
                  </p>
                )}
                <div className="flex flex-wrap gap-1 mt-2">
                  {svc.env.map((e) => (
                    <Badge key={e} variant="secondary" className="text-[9px] px-1.5 py-0 font-mono">
                      {e.split('=')[0]}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ==================== Database Design ====================
function DatabaseSection() {
  return (
    <section className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 rounded-full bg-gradient-to-b from-purple-500 to-violet-600" />
        <div>
          <h2 className="text-2xl font-bold">数据库设计</h2>
          <p className="text-sm text-muted-foreground mt-1">核心数据表结构与索引设计</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {databaseTables.map((table, idx) => (
          <motion.div
            key={table.name}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="h-full hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-500" />
                  <CardTitle className="text-sm font-bold font-mono">{table.name}</CardTitle>
                </div>
                <CardDescription className="text-xs">{table.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">字段</p>
                  <div className="flex flex-wrap gap-1">
                    {table.keyFields.map((f) => (
                      <Badge key={f} variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                        {f}
                      </Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">索引</p>
                  <div className="flex flex-wrap gap-1">
                    {table.indexes.map((idx) => (
                      <Badge key={idx} variant="secondary" className="text-[10px] px-1.5 py-0 font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800">
                        {idx}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ==================== Footer ====================
function FooterSection() {
  return (
    <footer className="border-t bg-muted/30">
      <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <p>《九州争鼎》SLG卡牌游戏 — Go + Unity 微服务架构方案</p>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <Server className="w-3 h-3" />
            Go 1.21+
          </span>
          <span className="flex items-center gap-1">
            <Globe className="w-3 h-3" />
            Unity 2022 LTS
          </span>
          <span className="flex items-center gap-1">
            <Database className="w-3 h-3" />
            MySQL 8.0 + Redis 7.0
          </span>
          <span className="flex items-center gap-1">
            <Container className="w-3 h-3" />
            Docker + K8s
          </span>
        </div>
      </div>
    </footer>
  )
}

// ==================== Main Page ====================
export default function Home() {
  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 md:py-12 space-y-16">
          {/* Hero */}
          <HeroSection />

          {/* Architecture Overview */}
          <ArchitectureOverview />

          {/* Module Cards */}
          <ModuleCards />

          {/* Directory Trees */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-violet-500 to-purple-600" />
              <div>
                <h2 className="text-2xl font-bold">完整目录结构</h2>
                <p className="text-sm text-muted-foreground mt-1">Go后端与Unity客户端的完整项目文件树</p>
              </div>
            </div>

            <Tabs defaultValue="backend" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="backend" className="gap-2">
                  <Server className="w-3.5 h-3.5" />
                  Go 后端
                </TabsTrigger>
                <TabsTrigger value="client" className="gap-2">
                  <Globe className="w-3.5 h-3.5" />
                  Unity 客户端
                </TabsTrigger>
              </TabsList>
              <TabsContent value="backend" className="mt-4">
                <DirectoryTree
                  data={goBackendTree}
                  title="jiuzhou-server/ — Go微服务后端"
                  accentColor="text-cyan-600 dark:text-cyan-400"
                />
              </TabsContent>
              <TabsContent value="client" className="mt-4">
                <DirectoryTree
                  data={unityClientTree}
                  title="jiuzhou-client/ — Unity客户端"
                  accentColor="text-green-600 dark:text-green-400"
                />
              </TabsContent>
            </Tabs>
          </section>

          {/* Gateway Design */}
          <GatewaySection />

          {/* Docker Deployment */}
          <DockerDeployment />

          {/* Database Design */}
          <DatabaseSection />
        </main>

        <FooterSection />
      </div>
    </TooltipProvider>
  )
}
