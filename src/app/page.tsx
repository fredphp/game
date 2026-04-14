'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  FileCode,
  Database,
  Server,
  Shield,
  Key,
  Clock,
  Zap,
  Globe,
  Lock,
  UserPlus,
  LogIn,
  LogOut,
  UserCog,
  RefreshCw,
  Eye,
  Edit,
  Activity,
  ArrowRight,
  Layers,
  HardDrive,
  type LucideIcon,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
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

// ==================== Source Code Map ====================
const sourceFiles: { name: string; path: string; lang: string; icon: LucideIcon; desc: string }[] = [
  { name: 'main.go', path: 'cmd/main.go', lang: 'go', icon: Server, desc: '服务启动入口 — 加载配置、初始化依赖、注册路由' },
  { name: 'user_handler.go', path: 'internal/handler/user_handler.go', lang: 'go', icon: Globe, desc: 'HTTP 请求处理器 — 注册/登录/Profile/密码/登出' },
  { name: 'user_service.go', path: 'internal/service/user_service.go', lang: 'go', icon: Zap, desc: '业务逻辑层 — 核心业务规则、Redis 缓存、黑名单' },
  { name: 'user_dao.go', path: 'internal/dao/user_dao.go', lang: 'go', icon: Database, desc: '数据访问层 — MySQL CRUD 操作' },
  { name: 'user_model.go', path: 'internal/model/user_model.go', lang: 'go', icon: Layers, desc: '数据模型 — User/Request/Response 结构体' },
  { name: 'auth.go', path: 'internal/middleware/auth.go', lang: 'go', icon: Shield, desc: '中间件 — JWT 鉴权、CORS 跨域' },
  { name: 'router.go', path: 'internal/router/router.go', lang: 'go', icon: Activity, desc: '路由注册 — 公开接口 + 鉴权接口' },
  { name: 'jwt.go', path: 'pkg/jwt/jwt.go', lang: 'go', icon: Key, desc: 'JWT 工具包 — 生成/解析/刷新 Token' },
  { name: 'response.go', path: 'pkg/response/response.go', lang: 'go', icon: Layers, desc: '统一响应 — 错误码、响应结构' },
  { name: 'mysql.go', path: 'pkg/mysql/mysql.go', lang: 'go', icon: Database, desc: 'MySQL 连接池初始化' },
  { name: 'redis.go', path: 'pkg/redis/redis.go', lang: 'go', icon: HardDrive, desc: 'Redis 连接池初始化' },
  { name: 'config.yaml', path: 'config/config.yaml', lang: 'yaml', icon: FileCode, desc: '服务配置 — MySQL/Redis/JWT/缓存TTL' },
  { name: 'schema.sql', path: 'docs/schema.sql', lang: 'sql', icon: Database, desc: 'MySQL 建表语句' },
  { name: 'go.mod', path: 'go.mod', lang: 'go', icon: FileCode, desc: 'Go 模块依赖声明' },
]

// ==================== API Endpoints ====================
interface ApiEndpoint {
  method: string
  path: string
  auth: boolean
  desc: string
  handler: string
  icon: LucideIcon
  color: string
  reqBody?: string
  resBody?: string
}

const apiEndpoints: ApiEndpoint[] = [
  {
    method: 'POST',
    path: '/api/v1/user/register',
    auth: false,
    desc: '用户注册，创建新账号',
    handler: 'UserHandler.Register',
    icon: UserPlus,
    color: 'bg-emerald-500',
    reqBody: `{
  "username": "zhangsan",
  "password": "123456",
  "nickname": "张三",
  "phone": "+8613800138000",
  "email": "zhangsan@example.com"
}`,
    resBody: `{
  "code": 0,
  "message": "success",
  "data": {
    "user_id": 10001,
    "username": "zhangsan"
  }
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/user/login',
    auth: false,
    desc: '用户名+密码登录，返回JWT',
    handler: 'UserHandler.Login',
    icon: LogIn,
    color: 'bg-blue-500',
    reqBody: `{
  "username": "zhangsan",
  "password": "123456"
}`,
    resBody: `{
  "code": 0,
  "message": "success",
  "data": {
    "user_id": 10001,
    "username": "zhangsan",
    "nickname": "张三",
    "avatar": "",
    "vip_level": 0,
    "access_token": "eyJhbGciOiJI...",
    "refresh_token": "eyJhbGciOiJI...",
    "expires_in": 7200
  }
}`,
  },
  {
    method: 'GET',
    path: '/api/v1/user/profile',
    auth: true,
    desc: '获取当前登录用户详细信息',
    handler: 'UserHandler.GetProfile',
    icon: Eye,
    color: 'bg-amber-500',
    resBody: `{
  "code": 0,
  "message": "success",
  "data": {
    "id": 10001,
    "username": "zhangsan",
    "nickname": "张三",
    "avatar": "https://...",
    "vip_level": 3,
    "vip_expire_time": "2025-12-31T00:00:00Z",
    "gold": 10000,
    "diamond": 500,
    "level": 25,
    "experience": 15000,
    "status": 1,
    "created_at": "2024-01-01T00:00:00Z"
  }
}`,
  },
  {
    method: 'PUT',
    path: '/api/v1/user/profile',
    auth: true,
    desc: '更新昵称/头像/手机/邮箱',
    handler: 'UserHandler.UpdateProfile',
    icon: Edit,
    color: 'bg-purple-500',
    reqBody: `{
  "nickname": "三哥",
  "avatar": "https://cdn.example.com/avatar/10001.png"
}`,
    resBody: `{
  "code": 0,
  "message": "success",
  "data": null
}`,
  },
  {
    method: 'PUT',
    path: '/api/v1/user/password',
    auth: true,
    desc: '修改密码（需验证旧密码）',
    handler: 'UserHandler.UpdatePassword',
    icon: RefreshCw,
    color: 'bg-orange-500',
    reqBody: `{
  "old_password": "123456",
  "new_password": "654321"
}`,
    resBody: `{
  "code": 0,
  "message": "success",
  "data": null
}`,
  },
  {
    method: 'POST',
    path: '/api/v1/user/logout',
    auth: true,
    desc: '登出，Token加入黑名单',
    handler: 'UserHandler.Logout',
    icon: LogOut,
    color: 'bg-red-500',
    resBody: `{
  "code": 0,
  "message": "success",
  "data": null
}`,
  },
]

// ==================== Redis Cache Design ====================
interface CacheItem {
  key: string
  type: string
  ttl: string
  desc: string
  example: string
}

const redisCacheDesign: CacheItem[] = [
  {
    key: 'user:info:{user_id}',
    type: 'Hash',
    ttl: '30 min',
    desc: '用户基本信息缓存，减少DB查询',
    example: `HSET user:info:10001 id 10001 username "zhangsan" nickname "张三" vip_level 3 gold 10000
HEXISTS user:info:10001`,
  },
  {
    key: 'user:session:{token}',
    type: 'String',
    ttl: '2 hours',
    desc: 'Token → UserID 映射，用于快速鉴权',
    example: `SET user:session:eyJhbGciOiJI... 10001 EX 7200
GET user:session:eyJhbGciOiJI...`,
  },
  {
    key: 'user:blacklist:{token}',
    type: 'String',
    ttl: '2 hours',
    desc: '已注销的 Token 黑名单，TTL = 剩余有效期',
    example: `SET user:blacklist:eyJhbGciOiJI... 1 EX 3600
EXISTS user:blacklist:eyJhbGciOiJI...`,
  },
  {
    key: 'user:login:cnt:{username}',
    type: 'String',
    ttl: '15 min',
    desc: '登录失败次数，超过5次锁定15分钟',
    example: `INCR user:login:cnt:zhangsan
EXPIRE user:login:cnt:zhangsan 900
GET user:login:cnt:zhangsan`,
  },
]

// ==================== Code Viewer Component ====================
function CodeBlock({ code, lang = 'go', filename }: { code: string; lang: string; filename: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [code])

  return (
    <div className="relative rounded-lg overflow-hidden border">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 dark:bg-zinc-900 border-b border-zinc-700">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs text-zinc-400 font-mono ml-2">{filename}</span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-zinc-400 hover:text-zinc-200"
                onClick={handleCopy}
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{copied ? '已复制' : '复制代码'}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <SyntaxHighlighter
        language={lang}
        style={oneDark}
        customStyle={{
          margin: 0,
          padding: '16px',
          fontSize: '12px',
          lineHeight: '1.6',
          background: '#1e1e2e',
        }}
        showLineNumbers
        lineNumberStyle={{ color: '#585b70', fontSize: '11px', minWidth: '3em' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
}

// ==================== Source Code Files Content ====================
// We'll lazy-load the actual source code
function getSourceContent(path: string): string {
  const contents: Record<string, string> = {
    'cmd/main.go': `package main

import (
\t"fmt"
\t"log"

\t"user-service/internal/dao"
\t"user-service/internal/handler"
\t"user-service/internal/router"
\t"user-service/internal/service"
\tpkgmysql "user-service/pkg/mysql"
\tmyredis "user-service/pkg/redis"
\tpkgresponse "user-service/pkg/response"

\t"github.com/gin-gonic/gin"
\t"github.com/spf13/viper"
)

func main() {
\t// 1. 加载配置
\tconf := viper.New()
\tconf.SetConfigName("config")
\tconf.SetConfigType("yaml")
\tconf.AddConfigPath("./config")
\tconf.AddConfigPath(".")
\tif err := conf.ReadInConfig(); err != nil {
\t\tlog.Fatalf("加载配置文件失败: %v", err)
\t}

\t// 2. 初始化 MySQL
\tif err := pkgmysql.Init(conf); err != nil {
\t\tlog.Fatalf("MySQL 初始化失败: %v", err)
\t}
\tdefer pkgmysql.Close()

\t// 3. 初始化 Redis
\tif err := myredis.Init(conf); err != nil {
\t\tlog.Fatalf("Redis 初始化失败: %v", err)
\t}
\tdefer myredis.Close()

\t// 4. 初始化依赖层（DAO → Service → Handler）
\tuserDAO := dao.NewUserDAO(pkgmysql.DB)
\tuserService := service.NewUserService(userDAO)
\tuserHandler := handler.NewUserHandler(userService)

\t// 5. 启动 HTTP 服务
\tgin.SetMode(conf.GetString("server.mode"))
\tengine := gin.New()
\trouter.Setup(engine, userHandler)

\taddr := fmt.Sprintf("%s:%d",
\t\tconf.GetString("server.host"),
\t\tconf.GetInt("server.port"),
\t)
\t_ = pkgresponse.GetMessage(0)

\tfmt.Printf("用户服务启动 → http://%s\\n", addr)
\tengine.Run(addr)
}`,
  }
  return contents[path] || '// 查看下方文件树中的源代码'
}

// ==================== Main Page ====================
export default function Home() {
  const [activeFile, setActiveFile] = useState(0)
  const [apiTab, setApiTab] = useState(0)

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col bg-background">
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8 md:py-12 space-y-12">

          {/* ===== Hero ===== */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-card via-card to-card/80 p-8 md:p-12"
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-cyan-500/10 via-emerald-500/5 to-transparent blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-amber-500/10 via-orange-500/5 to-transparent blur-3xl" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="border-cyan-500/30 text-cyan-600 dark:text-cyan-400 bg-cyan-500/5">
                  Go Microservice
                </Badge>
                <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5">
                  REST API
                </Badge>
                <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5">
                  JWT Auth
                </Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-black">
                <span className="bg-gradient-to-r from-cyan-600 via-emerald-500 to-amber-500 bg-clip-text text-transparent">
                  用户系统微服务
                </span>
              </h1>
              <p className="mt-2 text-lg text-muted-foreground font-medium">User Service — 完整实现</p>
              <p className="mt-3 text-sm text-muted-foreground/80 max-w-2xl leading-relaxed">
                基于 Gin + MySQL + Redis + JWT 的用户系统微服务完整实现。
                涵盖注册登录、Token认证、信息管理、VIP等级、缓存策略、防暴力破解等生产级功能。
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  '注册 / 登录', 'JWT 双Token', 'VIP 等级', 'Redis 多级缓存',
                  'Token 黑名单', '登录限流', 'bcrypt 加密', '统一响应',
                ].map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs px-2.5 py-1">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </motion.section>

          {/* ===== Architecture Layers ===== */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-cyan-500 to-emerald-600" />
              分层架构
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { name: 'Handler 层', desc: 'HTTP 请求处理、参数校验、响应封装', color: 'border-blue-300 bg-blue-50/50 dark:bg-blue-950/20' },
                { name: 'Service 层', desc: '业务逻辑、Redis 缓存、Token 黑名单', color: 'border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20' },
                { name: 'DAO 层', desc: 'MySQL CRUD、SQL 编写、错误处理', color: 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' },
                { name: 'Middleware', desc: 'JWT 鉴权、CORS 跨域、异常恢复', color: 'border-purple-300 bg-purple-50/50 dark:bg-purple-950/20' },
              ].map((layer) => (
                <Card key={layer.name} className={`border ${layer.color}`}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold">{layer.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground">{layer.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== REST API ===== */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-blue-500 to-cyan-600" />
              REST API 设计
            </h2>

            <div className="space-y-3">
              {apiEndpoints.map((api, idx) => {
                const Icon = api.icon
                return (
                  <Collapsible key={api.path}>
                    <Card className="hover:shadow-sm transition-shadow">
                      <CollapsibleTrigger className="w-full text-left">
                        <CardHeader className="pb-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className={`px-2.5 py-1 rounded-md text-white text-xs font-bold font-mono ${api.color}`}>
                              {api.method}
                            </span>
                            <code className="text-sm font-mono font-semibold">{api.path}</code>
                            {api.auth && (
                              <Badge variant="outline" className="text-[10px] gap-1 border-amber-300 text-amber-600 dark:text-amber-400">
                                <Lock className="w-3 h-3" /> JWT
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground ml-auto">{api.desc}</span>
                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          <Separator />
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {api.reqBody && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                  <ArrowRight className="w-3 h-3" /> Request Body
                                </p>
                                <CodeBlock code={api.reqBody} lang="json" filename="request.json" />
                              </div>
                            )}
                            {api.resBody && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                  <ArrowRight className="w-3 h-3 rotate-180" /> Response Body
                                </p>
                                <CodeBlock code={api.resBody} lang="json" filename="response.json" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Card>
                  </Collapsible>
                )
              })}
            </div>

            {/* Error Codes */}
            <Card className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold">统一错误码</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {[
                    { code: 0, msg: '成功' },
                    { code: 10001, msg: '参数错误' },
                    { code: 10002, msg: '认证失败' },
                    { code: 10003, msg: 'Token无效' },
                    { code: 10004, msg: '服务器错误' },
                    { code: 10007, msg: '用户名已存在' },
                    { code: 10008, msg: '密码错误' },
                    { code: 10009, msg: '用户不存在' },
                    { code: 10010, msg: '账号已被禁用' },
                  ].map(({ code, msg }) => (
                    <div key={code} className="flex items-center gap-2 p-1.5 rounded bg-muted/50">
                      <code className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">{code}</code>
                      <span className="text-xs text-muted-foreground">{msg}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* ===== MySQL Schema ===== */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-amber-500 to-orange-600" />
              MySQL 表结构
            </h2>

            {/* Fields Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-500" />
                  users 表
                </CardTitle>
                <CardDescription>引擎: InnoDB | 字符集: utf8mb4 | 索引: 主键 + 3个唯一键 + 4个普通键</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="py-2 px-2 font-semibold text-muted-foreground">字段</th>
                        <th className="py-2 px-2 font-semibold text-muted-foreground">类型</th>
                        <th className="py-2 px-2 font-semibold text-muted-foreground">默认</th>
                        <th className="py-2 px-2 font-semibold text-muted-foreground">约束</th>
                        <th className="py-2 px-2 font-semibold text-muted-foreground">说明</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {[
                        ['id', 'BIGINT', 'AUTO_INCREMENT', 'PK', '用户ID'],
                        ['username', 'VARCHAR(64)', "''", 'UNIQUE NOT NULL', '用户名'],
                        ['password', 'VARCHAR(255)', "''", 'NOT NULL', '密码(bcrypt)'],
                        ['nickname', 'VARCHAR(64)', "''", '', '昵称'],
                        ['avatar', 'VARCHAR(512)', "''", '', '头像URL'],
                        ['phone', 'VARCHAR(20)', 'NULL', 'UNIQUE', '手机号'],
                        ['email', 'VARCHAR(128)', 'NULL', 'UNIQUE', '邮箱'],
                        ['vip_level', 'TINYINT', '0', 'NOT NULL', 'VIP等级(0~15)'],
                        ['vip_expire_time', 'DATETIME', 'NULL', '', 'VIP过期时间'],
                        ['gold', 'BIGINT', '0', 'NOT NULL', '金币'],
                        ['diamond', 'BIGINT', '0', 'NOT NULL', '钻石'],
                        ['level', 'INT', '1', 'NOT NULL', '用户等级'],
                        ['experience', 'BIGINT', '0', 'NOT NULL', '经验值'],
                        ['last_login_at', 'DATETIME', 'NULL', '', '最后登录时间'],
                        ['status', 'TINYINT', '1', 'NOT NULL', '1=正常 0=禁用'],
                        ['created_at', 'DATETIME', 'NOW()', 'NOT NULL', '创建时间'],
                        ['updated_at', 'DATETIME', 'NOW()', 'NOT NULL', '更新时间(自动)'],
                      ].map(([field, type, def, constraint, desc]) => (
                        <tr key={field} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-1.5 px-2 font-semibold text-cyan-700 dark:text-cyan-400">{field}</td>
                          <td className="py-1.5 px-2 text-purple-600 dark:text-purple-400">{type}</td>
                          <td className="py-1.5 px-2 text-muted-foreground">{def}</td>
                          <td className="py-1.5 px-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-sans font-medium ${
                              constraint.includes('PK') ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                              constraint.includes('UNIQUE') ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                              constraint.includes('NOT NULL') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {constraint || '-'}
                            </span>
                          </td>
                          <td className="py-1.5 px-2 font-sans text-muted-foreground">{desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* ===== Redis Cache ===== */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-red-500 to-rose-600" />
              Redis 缓存设计
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {redisCacheDesign.map((cache, idx) => (
                <motion.div
                  key={cache.key}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                >
                  <Card className="h-full">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <code className="text-sm font-mono font-bold text-red-600 dark:text-red-400">{cache.key}</code>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">{cache.type}</Badge>
                          <Badge variant="secondary" className="text-[10px] gap-1">
                            <Clock className="w-3 h-3" /> {cache.ttl}
                          </Badge>
                        </div>
                      </div>
                      <CardDescription className="text-xs mt-1">{cache.desc}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <CodeBlock code={cache.example} lang="redis" filename="redis-cli" />
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Auth Flow */}
            <Card className="border-dashed bg-red-50/30 dark:bg-red-950/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-500" />
                  JWT 认证流程
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {[
                    '客户端发请求',
                    '携带 Bearer Token',
                    'JWT中间件拦截',
                    '检查黑名单',
                    '解析Token',
                    '注入user_id到Context',
                    'Handler处理业务',
                  ].map((step, i) => (
                    <span key={step} className="flex items-center gap-2">
                      <Badge variant="secondary" className="px-2 py-1 text-xs">{step}</Badge>
                      {i < 6 && <ArrowRight className="w-3 h-3 text-muted-foreground/40" />}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* ===== Project Files ===== */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-violet-500 to-purple-600" />
              完整源码
              <span className="text-xs text-muted-foreground font-normal ml-1">（14个文件）</span>
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* File Tree Sidebar */}
              <Card className="lg:col-span-1 p-0 overflow-hidden">
                <div className="p-3 border-b bg-muted/30">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                    user-service/
                  </p>
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="p-1">
                    {sourceFiles.map((file, idx) => {
                      const Icon = file.icon
                      const isActive = activeFile === idx
                      return (
                        <button
                          key={file.path}
                          onClick={() => setActiveFile(idx)}
                          className={`w-full text-left px-3 py-2 rounded-md text-xs flex items-center gap-2 transition-colors ${
                            isActive
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                          <div className="min-w-0">
                            <p className="font-medium truncate">{file.name}</p>
                            <p className={`text-[10px] truncate ${isActive ? 'text-primary-foreground/70' : 'text-muted-foreground/60'}`}>
                              {file.path}
                            </p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </ScrollArea>
              </Card>

              {/* Code Viewer */}
              <Card className="lg:col-span-3 p-0 overflow-hidden">
                <div className="p-3 border-b bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-muted-foreground" />
                    <code className="text-sm font-mono font-semibold">{sourceFiles[activeFile].path}</code>
                  </div>
                  <Badge variant="outline" className="text-[10px]">{sourceFiles[activeFile].desc}</Badge>
                </div>
                <ScrollArea className="h-[500px]">
                  <div className="p-4">
                    <CodeBlock
                      code={getSourceContent(sourceFiles[activeFile].path)}
                      lang={sourceFiles[activeFile].lang}
                      filename={sourceFiles[activeFile].name}
                    />
                    <div className="mt-4 p-3 rounded-lg bg-muted/50">
                      <p className="text-xs text-muted-foreground">
                        📁 完整源码位于 <code className="font-mono text-amber-600 dark:text-amber-400">user-service/</code> 目录下，
                        共 14 个文件，可直接用于生产环境。
                      </p>
                    </div>
                  </div>
                </ScrollArea>
              </Card>
            </div>
          </motion.section>

          {/* ===== Quick Start ===== */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-green-500 to-emerald-600" />
              快速启动
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                    建库建表
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    code={`mysql -u root -p < docs/schema.sql`}
                    lang="bash"
                    filename="terminal"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                    修改配置
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    code={`# config/config.yaml
mysql:
  host: "127.0.0.1"
  password: "your_password"
redis:
  host: "127.0.0.1"
  password: "your_redis_pwd"`}
                    lang="yaml"
                    filename="config.yaml"
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                    启动服务
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    code={`cd user-service
go mod tidy
go run cmd/main.go

# 服务启动于 http://localhost:9001`}
                    lang="bash"
                    filename="terminal"
                  />
                </CardContent>
              </Card>
            </div>
          </motion.section>

        </main>

        {/* ===== Footer ===== */}
        <footer className="border-t bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>九州争鼎 — 用户系统微服务 · Go + Gin + MySQL + Redis + JWT</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Server className="w-3 h-3" />Gin Framework</span>
              <span className="flex items-center gap-1"><Database className="w-3 h-3" />MySQL 8.0</span>
              <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />Redis 7.0</span>
              <span className="flex items-center gap-1"><Key className="w-3 h-3" />JWT HS256</span>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}
