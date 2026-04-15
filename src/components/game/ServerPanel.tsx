'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Server,
  Plus,
  Globe,
  Users,
  Activity,
  Clock,
  ArrowRight,
  Wifi,
  WifiOff,
  Wrench,
  Hourglass,
  ChevronRight,
  Database,
  Network,
  Shield,
  Key,
  Zap,
  Layers,
  MonitorDot,
  Play,
  Eye,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';

// ─── Types ────────────────────────────────────────────────────────
interface GameServer {
  id: number;
  name: string;
  status: number;
  statusText: string;
  openTime: string;
  region: string;
  regionText: string;
  host: string;
  maxPlayers: number;
  onlineCount: number;
  playerCount: number;
}

// ─── Design tokens ────────────────────────────────────────────────
const THEME = {
  bg: '#0a0b10',
  card: '#111318',
  border: '#1F2937',
  gold: '#C4973B',
  red: '#C23B22',
  jade: '#2E8B57',
  surface: '#161922',
  surfaceHover: '#1c2030',
  textPrimary: '#e5e7eb',
  textSecondary: '#9ca3af',
  textMuted: '#6b7280',
};

// ─── Status helpers ───────────────────────────────────────────────
const statusConfig: Record<
  number,
  { color: string; dot: string; icon: React.ElementType; label: string }
> = {
  0: {
    color: THEME.red,
    dot: 'bg-[#C23B22]',
    icon: Wrench,
    label: '维护中',
  },
  1: {
    color: THEME.jade,
    dot: 'bg-[#2E8B57]',
    icon: Wifi,
    label: '正常运行',
  },
  2: {
    color: THEME.gold,
    dot: 'bg-[#C4973B]',
    icon: Hourglass,
    label: '即将开服',
  },
  3: {
    color: '#6b7280',
    dot: 'bg-gray-500',
    icon: WifiOff,
    label: '已关闭',
  },
};

function regionColor(region: string) {
  switch (region) {
    case 'cn':
      return 'border-[#C23B22]/40 text-[#C23B22] bg-[#C23B22]/10';
    case 'tw':
      return 'border-[#3B82F6]/40 text-[#3B82F6] bg-[#3B82F6]/10';
    case 'sea':
      return 'border-[#2E8B57]/40 text-[#2E8B57] bg-[#2E8B57]/10';
    default:
      return 'border-gray-500/40 text-gray-400 bg-gray-500/10';
  }
}

// ─── Animations ───────────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
      ease: [0.25, 0.46, 0.45, 0.94],
    },
  }),
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

// ─── Main Component ───────────────────────────────────────────────
export default function ServerPanel() {
  const [servers, setServers] = useState<GameServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServer, setSelectedServer] = useState<GameServer | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // ── New server form ──
  const [newName, setNewName] = useState('');
  const [newOpenTime, setNewOpenTime] = useState('');
  const [newRegion, setNewRegion] = useState('cn');
  const [newMaxPlayers, setNewMaxPlayers] = useState('50000');
  const [creating, setCreating] = useState(false);

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch('/api/servers');
      const data = await res.json();
      setServers(data.servers || []);
    } catch {
      console.error('Failed to fetch servers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName || undefined,
          openTime: newOpenTime || undefined,
          region: newRegion,
          maxPlayers: parseInt(newMaxPlayers, 10) || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreateOpen(false);
        setNewName('');
        setNewOpenTime('');
        setNewRegion('cn');
        setNewMaxPlayers('50000');
        fetchServers();
      }
    } catch {
      console.error('Failed to create server');
    } finally {
      setCreating(false);
    }
  };

  const openDetail = (server: GameServer) => {
    setSelectedServer(server);
    setDetailOpen(true);
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // ── Computed ──
  const totalOnline = servers.reduce((a, s) => a + s.onlineCount, 0);
  const totalPlayers = servers.reduce((a, s) => a + s.playerCount, 0);
  const activeServers = servers.filter(s => s.status === 1).length;

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ backgroundColor: THEME.bg }}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div
                className="flex size-10 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${THEME.gold}20` }}
              >
                <Server className="size-5" style={{ color: THEME.gold }} />
              </div>
              <div>
                <h1
                  className="text-2xl font-bold tracking-tight sm:text-3xl"
                  style={{ color: THEME.textPrimary }}
                >
                  区服系统
                </h1>
                <p className="text-sm" style={{ color: THEME.textSecondary }}>
                  九州争鼎 · 服务器管理面板
                </p>
              </div>
            </div>
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button
                  className="gap-2 font-medium shadow-lg"
                  style={{
                    backgroundColor: THEME.gold,
                    color: '#0a0b10',
                    border: 'none',
                  }}
                >
                  <Plus className="size-4" />
                  开设新区
                </Button>
              </DialogTrigger>
              <DialogContent
                className="max-w-md"
                style={{ backgroundColor: THEME.card, borderColor: THEME.border }}
              >
                <DialogHeader>
                  <DialogTitle style={{ color: THEME.textPrimary }}>
                    开设新服务器
                  </DialogTitle>
                  <DialogDescription style={{ color: THEME.textSecondary }}>
                    填写以下信息创建一个新的游戏服务器
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-4 py-2">
                  <div className="flex flex-col gap-2">
                    <Label style={{ color: THEME.textSecondary }}>服务器名称</Label>
                    <Input
                      placeholder="例如: S7-乱世群雄"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="bg-transparent"
                      style={{
                        borderColor: THEME.border,
                        color: THEME.textPrimary,
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label style={{ color: THEME.textSecondary }}>开服时间</Label>
                    <Input
                      type="datetime-local"
                      value={newOpenTime}
                      onChange={(e) => setNewOpenTime(e.target.value)}
                      className="bg-transparent"
                      style={{
                        borderColor: THEME.border,
                        color: THEME.textPrimary,
                        colorScheme: 'dark',
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label style={{ color: THEME.textSecondary }}>所属区域</Label>
                    <Select value={newRegion} onValueChange={setNewRegion}>
                      <SelectTrigger
                        className="w-full bg-transparent"
                        style={{
                          borderColor: THEME.border,
                          color: THEME.textPrimary,
                        }}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent
                        style={{ backgroundColor: THEME.card, borderColor: THEME.border }}
                      >
                        <SelectItem value="cn">国服</SelectItem>
                        <SelectItem value="tw">台服</SelectItem>
                        <SelectItem value="sea">东南亚</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Label style={{ color: THEME.textSecondary }}>最大玩家数</Label>
                    <Input
                      type="number"
                      value={newMaxPlayers}
                      onChange={(e) => setNewMaxPlayers(e.target.value)}
                      className="bg-transparent"
                      style={{
                        borderColor: THEME.border,
                        color: THEME.textPrimary,
                      }}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setCreateOpen(false)}
                    style={{ borderColor: THEME.border, color: THEME.textSecondary }}
                  >
                    取消
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={creating}
                    className="gap-2"
                    style={{ backgroundColor: THEME.gold, color: '#0a0b10' }}
                  >
                    {creating ? (
                      <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    确认开服
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* ── Stats Overview ── */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4"
        >
          {[
            {
              icon: Server,
              label: '服务器总数',
              value: servers.length,
              color: THEME.gold,
            },
            {
              icon: Activity,
              label: '运行中',
              value: activeServers,
              color: THEME.jade,
            },
            {
              icon: Users,
              label: '总注册玩家',
              value: totalPlayers.toLocaleString(),
              color: '#8B5CF6',
            },
            {
              icon: Wifi,
              label: '当前在线',
              value: totalOnline.toLocaleString(),
              color: '#3B82F6',
            },
          ].map((stat) => (
            <Card
              key={stat.label}
              className="py-4"
              style={{
                backgroundColor: THEME.card,
                borderColor: THEME.border,
                borderRadius: 12,
              }}
            >
              <CardContent className="flex items-center gap-3 p-4">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${stat.color}15` }}
                >
                  <stat.icon className="size-4" style={{ color: stat.color }} />
                </div>
                <div className="min-w-0">
                  <p
                    className="truncate text-lg font-bold tabular-nums"
                    style={{ color: THEME.textPrimary }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs" style={{ color: THEME.textMuted }}>
                    {stat.label}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* ── Tabs: Server List / Architecture ── */}
        <Tabs defaultValue="servers" className="w-full">
          <TabsList
            className="mb-6"
            style={{
              backgroundColor: THEME.surface,
            }}
          >
            <TabsTrigger
              value="servers"
              className="gap-1.5 px-4"
              style={{ color: THEME.textSecondary }}
            >
              <MonitorDot className="size-4" />
              服务器列表
            </TabsTrigger>
            <TabsTrigger
              value="architecture"
              className="gap-1.5 px-4"
              style={{ color: THEME.textSecondary }}
            >
              <Layers className="size-4" />
              架构总览
            </TabsTrigger>
          </TabsList>

          {/* ────────── Server List Tab ────────── */}
          <TabsContent value="servers">
            {loading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-5"
                    style={{ backgroundColor: THEME.card, borderColor: THEME.border, border: `1px solid ${THEME.border}` }}
                  >
                    <Skeleton className="mb-3 h-5 w-32" />
                    <Skeleton className="mb-2 h-4 w-20" />
                    <Skeleton className="mb-3 h-2 w-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <motion.div
                className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
                initial="hidden"
                animate="visible"
              >
                {servers.map((server, i) => {
                  const sc = statusConfig[server.status] || statusConfig[3];
                  const onlinePercent =
                    server.maxPlayers > 0
                      ? Math.round((server.onlineCount / server.maxPlayers) * 100)
                      : 0;
                  const StatusIcon = sc.icon;

                  return (
                    <motion.div
                      key={server.id}
                      custom={i}
                      variants={cardVariants}
                      className="group cursor-pointer"
                      whileHover={{ y: -4, transition: { duration: 0.2 } }}
                      onClick={() => openDetail(server)}
                    >
                      <Card
                        className="relative overflow-hidden py-0 gap-0"
                        style={{
                          backgroundColor: THEME.card,
                          borderColor: THEME.border,
                          borderRadius: 12,
                          borderWidth: 1,
                        }}
                      >
                        {/* Status glow bar at top */}
                        <div
                          className="absolute left-0 top-0 h-[2px] w-full"
                          style={{
                            background: `linear-gradient(90deg, transparent, ${sc.color}, transparent)`,
                          }}
                        />

                        <CardHeader className="pb-0 pt-5 px-5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <CardTitle
                                className="truncate text-base font-bold"
                                style={{ color: THEME.textPrimary }}
                              >
                                {server.name}
                              </CardTitle>
                              <CardDescription className="mt-0.5 flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0 font-mono"
                                  style={{ borderColor: THEME.border, color: THEME.textMuted }}
                                >
                                  #{server.id}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5 py-0"
                                  style={Object.assign(
                                    { fontSize: 10 },
                                    (() => {
                                      const base: React.CSSProperties = regionColor(server.region);
                                      return base;
                                    })()
                                  )}
                                >
                                  <Globe className="mr-0.5 size-3" />
                                  {server.regionText}
                                </Badge>
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span
                                className="relative flex size-2.5"
                              >
                                <span
                                  className={cn(
                                    'absolute inline-flex size-full animate-ping rounded-full opacity-75',
                                    sc.dot
                                  )}
                                />
                                <span
                                  className={cn(
                                    'relative inline-flex size-full rounded-full',
                                    sc.dot
                                  )}
                                />
                              </span>
                              <span
                                className="text-xs font-medium whitespace-nowrap"
                                style={{ color: sc.color }}
                              >
                                {sc.label}
                              </span>
                            </div>
                          </div>
                        </CardHeader>

                        <CardContent className="px-5 pt-4 pb-2">
                          {/* Online bar */}
                          <div className="mb-3">
                            <div className="mb-1.5 flex items-center justify-between text-xs">
                              <span style={{ color: THEME.textMuted }}>
                                <StatusIcon className="mr-1 inline size-3" style={{ color: sc.color }} />
                                在线人数
                              </span>
                              <span
                                className="tabular-nums font-medium"
                                style={{ color: THEME.textPrimary }}
                              >
                                {server.onlineCount.toLocaleString()}
                                <span style={{ color: THEME.textMuted }}> / {server.maxPlayers.toLocaleString()}</span>
                              </span>
                            </div>
                            <div
                              className="relative h-1.5 w-full overflow-hidden rounded-full"
                              style={{ backgroundColor: `${THEME.border}` }}
                            >
                              <motion.div
                                className="h-full rounded-full"
                                style={{ backgroundColor: sc.color }}
                                initial={{ width: 0 }}
                                animate={{ width: `${onlinePercent}%` }}
                                transition={{ delay: i * 0.08 + 0.3, duration: 0.8, ease: 'easeOut' }}
                              />
                            </div>
                            <p className="mt-1 text-right text-[10px] tabular-nums" style={{ color: THEME.textMuted }}>
                              {onlinePercent}% 负载
                            </p>
                          </div>

                          {/* Stats row */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1" style={{ color: THEME.textSecondary }}>
                              <Users className="size-3" />
                              <span className="tabular-nums">{server.playerCount.toLocaleString()}</span>
                              <span style={{ color: THEME.textMuted }}>注册</span>
                            </div>
                            <div className="flex items-center gap-1" style={{ color: THEME.textSecondary }}>
                              <Clock className="size-3" />
                              <span style={{ color: THEME.textMuted }}>
                                {new Date(server.openTime).toLocaleDateString('zh-CN')}
                              </span>
                            </div>
                          </div>
                        </CardContent>

                        <CardFooter className="px-5 pt-2 pb-4">
                          <AnimatePresence>
                            <div className="flex w-full items-center gap-2">
                              {server.status === 1 && (
                                <Button
                                  size="sm"
                                  className="flex-1 gap-1.5 text-xs"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                  style={{
                                    backgroundColor: `${THEME.jade}20`,
                                    color: THEME.jade,
                                    border: `1px solid ${THEME.jade}40`,
                                  }}
                                >
                                  <Play className="size-3" />
                                  进入
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="flex-1 gap-1.5 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetail(server);
                                }}
                                style={{ color: THEME.textSecondary }}
                              >
                                <Eye className="size-3" />
                                详情
                                <ChevronRight className="size-3" />
                              </Button>
                            </div>
                          </AnimatePresence>
                        </CardFooter>
                      </Card>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </TabsContent>

          {/* ────────── Architecture Tab ────────── */}
          <TabsContent value="architecture">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeIn}
              className="flex flex-col gap-6"
            >
              {/* Architecture title */}
              <div>
                <h2
                  className="text-xl font-bold"
                  style={{ color: THEME.textPrimary }}
                >
                  区服隔离架构
                </h2>
                <p className="mt-1 text-sm" style={{ color: THEME.textSecondary }}>
                  每个游戏服务器（区服）在数据层和网络层完全隔离，确保不同区服间数据互不干扰。
                </p>
              </div>

              {/* Architecture cards */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* Gateway Routing */}
                <Card
                  className="gap-0 py-0"
                  style={{
                    backgroundColor: THEME.card,
                    borderColor: THEME.border,
                    borderRadius: 12,
                    borderWidth: 1,
                  }}
                >
                  <CardHeader className="px-5 pt-5 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex size-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${THEME.gold}15` }}
                      >
                        <Network className="size-4" style={{ color: THEME.gold }} />
                      </div>
                      <CardTitle
                        className="text-sm font-semibold"
                        style={{ color: THEME.textPrimary }}
                      >
                        Gateway 网关路由
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <p className="mb-4 text-xs leading-relaxed" style={{ color: THEME.textSecondary }}>
                      客户端连接统一网关入口，通过 <code className="rounded bg-white/5 px-1.5 py-0.5 text-[11px]" style={{ color: THEME.gold }}>server_id</code> 路由到对应后端实例。
                    </p>
                    <div
                      className="rounded-lg p-3 text-xs font-mono leading-6"
                      style={{ backgroundColor: THEME.bg, border: `1px solid ${THEME.border}` }}
                    >
                      <div style={{ color: THEME.textMuted }}>{'// Gateway routing table'}</div>
                      <div><span style={{ color: THEME.gold }}>server_id</span><span style={{ color: THEME.textMuted }}> → </span><span style={{ color: THEME.jade }}>s1.jiuzhou.game:9001</span></div>
                      <div><span style={{ color: THEME.gold }}>server_id</span><span style={{ color: THEME.textMuted }}> → </span><span style={{ color: THEME.jade }}>s2.jiuzhou.game:9001</span></div>
                      <div><span style={{ color: THEME.gold }}>server_id</span><span style={{ color: THEME.textMuted }}> → </span><span style={{ color: THEME.jade }}>s3.jiuzhou.game:9001</span></div>
                      <div style={{ color: THEME.textMuted }}>...</div>
                    </div>
                    {/* Simple routing diagram */}
                    <div className="mt-4 flex items-center justify-center gap-2">
                      <div
                        className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-center"
                        style={{ backgroundColor: `${THEME.gold}10`, border: `1px dashed ${THEME.gold}30` }}
                      >
                        <Zap className="size-4" style={{ color: THEME.gold }} />
                        <span className="text-[10px] font-medium" style={{ color: THEME.gold }}>Client</span>
                      </div>
                      <ArrowRight className="size-4" style={{ color: THEME.textMuted }} />
                      <div
                        className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-center"
                        style={{ backgroundColor: `${THEME.gold}15`, border: `1px solid ${THEME.gold}30` }}
                      >
                        <Network className="size-4" style={{ color: THEME.gold }} />
                        <span className="text-[10px] font-medium" style={{ color: THEME.gold }}>Gateway</span>
                      </div>
                      <ArrowRight className="size-4" style={{ color: THEME.textMuted }} />
                      <div
                        className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-center"
                        style={{ backgroundColor: `${THEME.jade}10`, border: `1px solid ${THEME.jade}30` }}
                      >
                        <Server className="size-4" style={{ color: THEME.jade }} />
                        <span className="text-[10px] font-medium" style={{ color: THEME.jade }}>S1 / S2 / S3</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Redis Isolation */}
                <Card
                  className="gap-0 py-0"
                  style={{
                    backgroundColor: THEME.card,
                    borderColor: THEME.border,
                    borderRadius: 12,
                    borderWidth: 1,
                  }}
                >
                  <CardHeader className="px-5 pt-5 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex size-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${THEME.red}15` }}
                      >
                        <Database className="size-4" style={{ color: THEME.red }} />
                      </div>
                      <CardTitle
                        className="text-sm font-semibold"
                        style={{ color: THEME.textPrimary }}
                      >
                        Redis 键隔离
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <p className="mb-4 text-xs leading-relaxed" style={{ color: THEME.textSecondary }}>
                      所有 Redis 键使用 <code className="rounded bg-white/5 px-1.5 py-0.5 text-[11px]" style={{ color: THEME.red }}>server_id</code> 作为命名空间前缀，实现区服级别的数据隔离。
                    </p>
                    <div
                      className="space-y-1.5 rounded-lg p-3 text-xs font-mono"
                      style={{ backgroundColor: THEME.bg, border: `1px solid ${THEME.border}` }}
                    >
                      <div style={{ color: THEME.textMuted }}>{'// Key pattern examples'}</div>
                      <div className="flex items-center gap-1">
                        <Key className="size-3 shrink-0" style={{ color: THEME.jade }} />
                        <span style={{ color: THEME.jade }}>s1:</span><span style={{ color: THEME.textSecondary }}>player:{uid}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Key className="size-3 shrink-0" style={{ color: THEME.jade }} />
                        <span style={{ color: THEME.jade }}>s1:</span><span style={{ color: THEME.textSecondary }}>session:{token}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Key className="size-3 shrink-0" style={{ color: THEME.jade }} />
                        <span style={{ color: THEME.jade }}>s1:</span><span style={{ color: THEME.textSecondary }}>rank:arena</span>
                      </div>
                      <Separator className="my-1.5" />
                      <div className="flex items-center gap-1">
                        <Key className="size-3 shrink-0" style={{ color: THEME.gold }} />
                        <span style={{ color: THEME.gold }}>s2:</span><span style={{ color: THEME.textSecondary }}>player:{uid}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Key className="size-3 shrink-0" style={{ color: THEME.gold }} />
                        <span style={{ color: THEME.gold }}>s2:</span><span style={{ color: THEME.textSecondary }}>session:{token}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Key className="size-3 shrink-0" style={{ color: THEME.gold }} />
                        <span style={{ color: THEME.gold }}>s2:</span><span style={{ color: THEME.textSecondary }}>rank:arena</span>
                      </div>
                    </div>
                    {/* Isolation diagram */}
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <div
                        className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-center"
                        style={{ backgroundColor: `${THEME.jade}10`, border: `1px solid ${THEME.jade}25` }}
                      >
                        <Database className="size-4" style={{ color: THEME.jade }} />
                        <span className="text-[10px] font-medium" style={{ color: THEME.jade }}>s1:* 命名空间</span>
                      </div>
                      <Shield className="size-4" style={{ color: THEME.textMuted }} />
                      <div
                        className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-center"
                        style={{ backgroundColor: `${THEME.gold}10`, border: `1px solid ${THEME.gold}25` }}
                      >
                        <Database className="size-4" style={{ color: THEME.gold }} />
                        <span className="text-[10px] font-medium" style={{ color: THEME.gold }}>s2:* 命名空间</span>
                      </div>
                      <Shield className="size-4" style={{ color: THEME.textMuted }} />
                      <div
                        className="flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-center"
                        style={{ backgroundColor: `${THEME.red}10`, border: `1px solid ${THEME.red}25` }}
                      >
                        <Database className="size-4" style={{ color: THEME.red }} />
                        <span className="text-[10px] font-medium" style={{ color: THEME.red }}>s3:* 命名空间</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Database Isolation */}
                <Card
                  className="gap-0 py-0"
                  style={{
                    backgroundColor: THEME.card,
                    borderColor: THEME.border,
                    borderRadius: 12,
                    borderWidth: 1,
                  }}
                >
                  <CardHeader className="px-5 pt-5 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex size-8 items-center justify-center rounded-lg"
                        style={{ backgroundColor: `${THEME.jade}15` }}
                      >
                        <Layers className="size-4" style={{ color: THEME.jade }} />
                      </div>
                      <CardTitle
                        className="text-sm font-semibold"
                        style={{ color: THEME.textPrimary }}
                      >
                        数据库隔离
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-5 pb-5">
                    <p className="mb-4 text-xs leading-relaxed" style={{ color: THEME.textSecondary }}>
                      每个区服使用独立的数据库 Schema，所有表包含 <code className="rounded bg-white/5 px-1.5 py-0.5 text-[11px]" style={{ color: THEME.jade }}>server_id</code> 字段，从根源隔离数据。
                    </p>
                    <div
                      className="rounded-lg p-3 text-xs font-mono leading-6"
                      style={{ backgroundColor: THEME.bg, border: `1px solid ${THEME.border}` }}
                    >
                      <div style={{ color: THEME.textMuted }}>-- Schema: jiuzhou_s1</div>
                      <div><span style={{ color: '#8B5CF6' }}>CREATE TABLE</span> <span style={{ color: THEME.jade }}>players</span> (</div>
                      <div style={{ color: THEME.textMuted }}>  id BIGINT PRIMARY KEY,</div>
                      <div style={{ color: THEME.textMuted }}>  <span style={{ color: THEME.gold }}>server_id</span> INT NOT NULL,</div>
                      <div style={{ color: THEME.textMuted }}>  name VARCHAR(64),</div>
                      <div style={{ color: THEME.textMuted }}>  level INT DEFAULT 1,</div>
                      <div style={{ color: THEME.textMuted }}>  ...</div>
                      <div style={{ color: THEME.textMuted }}>);</div>
                      <div className="mt-2" style={{ color: THEME.textMuted }}>-- UNIQUE(server_id, name)</div>
                    </div>
                    {/* DB diagram */}
                    <div className="mt-4 flex flex-col items-center gap-2">
                      <div
                        className="w-full rounded-lg p-2 text-center"
                        style={{ backgroundColor: THEME.bg, border: `1px dashed ${THEME.border}` }}
                      >
                        <div className="text-[10px] font-medium mb-1.5" style={{ color: THEME.textMuted }}>Database Instances</div>
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          {['jiuzhou_s1', 'jiuzhou_s2', 'jiuzhou_s3'].map((db, idx) => {
                            const colors = [THEME.jade, THEME.gold, THEME.red];
                            return (
                              <div
                                key={db}
                                className="flex items-center gap-1 rounded-md px-2 py-1"
                                style={{ backgroundColor: `${colors[idx]}10`, border: `1px solid ${colors[idx]}30` }}
                              >
                                <Database className="size-3" style={{ color: colors[idx] }} />
                                <span className="text-[10px] font-mono" style={{ color: colors[idx] }}>
                                  {db}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Isolation Principle */}
              <Card
                className="gap-0 py-0"
                style={{
                  backgroundColor: THEME.card,
                  borderColor: THEME.border,
                  borderRadius: 12,
                  borderWidth: 1,
                }}
              >
                <CardHeader className="px-5 pt-5 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="flex size-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: '#8B5CF615' }}
                    >
                      <Shield className="size-4" style={{ color: '#8B5CF6' }} />
                    </div>
                    <CardTitle
                      className="text-sm font-semibold"
                      style={{ color: THEME.textPrimary }}
                    >
                      隔离原则
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-5 pb-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {[
                      {
                        title: '网络层隔离',
                        desc: '每个区服独立端口，Gateway 根据 server_id 路由至对应实例，互不通信。',
                        color: THEME.gold,
                      },
                      {
                        title: '缓存层隔离',
                        desc: 'Redis 键统一添加 server_id 前缀，保证不同区服缓存完全独立，无交叉访问。',
                        color: THEME.red,
                      },
                      {
                        title: '持久层隔离',
                        desc: '数据库按区服分 Schema，所有表带 server_id 字段并设置联合唯一索引。',
                        color: THEME.jade,
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-lg p-3"
                        style={{
                          backgroundColor: `${item.color}08`,
                          border: `1px solid ${item.color}20`,
                        }}
                      >
                        <h4
                          className="mb-1 text-xs font-semibold"
                          style={{ color: item.color }}
                        >
                          {item.title}
                        </h4>
                        <p className="text-[11px] leading-relaxed" style={{ color: THEME.textSecondary }}>
                          {item.desc}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ── Server Detail Dialog ── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent
          className="max-w-lg"
          style={{ backgroundColor: THEME.card, borderColor: THEME.border }}
        >
          {selectedServer && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div
                    className="flex size-10 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: `${statusConfig[selectedServer.status].color}15`,
                    }}
                  >
                    <Server
                      className="size-5"
                      style={{ color: statusConfig[selectedServer.status].color }}
                    />
                  </div>
                  <div>
                    <DialogTitle style={{ color: THEME.textPrimary }}>
                      {selectedServer.name}
                    </DialogTitle>
                    <DialogDescription className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{ borderColor: THEME.border, color: THEME.textMuted }}
                      >
                        #{selectedServer.id}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={regionColor(selectedServer.region)}
                      >
                        {selectedServer.regionText}
                      </Badge>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="max-h-[60vh] pr-2">
                <div className="flex flex-col gap-4">
                  {/* Server info grid */}
                  <div
                    className="grid grid-cols-2 gap-3 rounded-lg p-4"
                    style={{ backgroundColor: THEME.bg, border: `1px solid ${THEME.border}` }}
                  >
                    {[
                      {
                        label: '状态',
                        value: selectedServer.statusText,
                        color: statusConfig[selectedServer.status].color,
                      },
                      {
                        label: '开服时间',
                        value: new Date(selectedServer.openTime).toLocaleString('zh-CN'),
                        color: THEME.textPrimary,
                      },
                      {
                        label: '服务器地址',
                        value: selectedServer.host || '无',
                        color: THEME.jade,
                      },
                      {
                        label: '最大容量',
                        value: selectedServer.maxPlayers.toLocaleString(),
                        color: THEME.textPrimary,
                      },
                      {
                        label: '注册玩家',
                        value: selectedServer.playerCount.toLocaleString(),
                        color: THEME.gold,
                      },
                      {
                        label: '当前在线',
                        value: selectedServer.onlineCount.toLocaleString(),
                        color: selectedServer.status === 1 ? THEME.jade : THEME.textMuted,
                      },
                    ].map((item) => (
                      <div key={item.label} className="flex flex-col gap-0.5">
                        <span className="text-[10px]" style={{ color: THEME.textMuted }}>
                          {item.label}
                        </span>
                        <span className="text-sm font-medium" style={{ color: item.color }}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Online progress */}
                  <div>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span style={{ color: THEME.textSecondary }}>服务器负载</span>
                      <span
                        className="tabular-nums font-medium"
                        style={{ color: THEME.textPrimary }}
                      >
                        {selectedServer.maxPlayers > 0
                          ? Math.round(
                              (selectedServer.onlineCount / selectedServer.maxPlayers) * 100
                            )
                          : 0}
                        %
                      </span>
                    </div>
                    <Progress
                      value={
                        selectedServer.maxPlayers > 0
                          ? (selectedServer.onlineCount / selectedServer.maxPlayers) * 100
                          : 0
                      }
                      className="h-2"
                    />
                  </div>

                  <Separator style={{ backgroundColor: THEME.border }} />

                  {/* Redis key preview */}
                  <div>
                    <h4
                      className="mb-2 flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: THEME.textPrimary }}
                    >
                      <Key className="size-3.5" style={{ color: THEME.gold }} />
                      Redis 键隔离预览
                    </h4>
                    <div
                      className="rounded-lg p-3 font-mono text-xs"
                      style={{ backgroundColor: THEME.bg, border: `1px solid ${THEME.border}` }}
                    >
                      {[
                        `s${selectedServer.id}:player:{uid}`,
                        `s${selectedServer.id}:session:{token}`,
                        `s${selectedServer.id}:rank:arena`,
                        `s${selectedServer.id}:guild:{gid}`,
                        `s${selectedServer.id}:mail:{uid}`,
                      ].map((key) => (
                        <div
                          key={key}
                          className="flex items-center gap-2 py-0.5"
                        >
                          <span style={{ color: THEME.textSecondary }}>
                            <Key className="mr-1 inline size-3" style={{ color: THEME.jade }} />
                            <span style={{ color: THEME.jade }}>
                              s{selectedServer.id}:
                            </span>
                            {key.split(':')[1]}
                          </span>
                          <button
                            onClick={() => copyKey(key)}
                            className="ml-auto shrink-0 rounded p-0.5 transition-colors hover:bg-white/5"
                          >
                            {copiedKey === key ? (
                              <Check className="size-3" style={{ color: THEME.jade }} />
                            ) : (
                              <Copy className="size-3" style={{ color: THEME.textMuted }} />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Gateway routing info */}
                  <div>
                    <h4
                      className="mb-2 flex items-center gap-1.5 text-xs font-semibold"
                      style={{ color: THEME.textPrimary }}
                    >
                      <Network className="size-3.5" style={{ color: THEME.gold }} />
                      网关路由信息
                    </h4>
                    <div
                      className="rounded-lg p-3 text-xs"
                      style={{ backgroundColor: THEME.bg, border: `1px solid ${THEME.border}` }}
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between">
                          <span style={{ color: THEME.textMuted }}>路由键</span>
                          <span className="font-mono" style={{ color: THEME.jade }}>
                            server_id = {selectedServer.id}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: THEME.textMuted }}>目标地址</span>
                          <span className="font-mono" style={{ color: THEME.gold }}>
                            {selectedServer.host || 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: THEME.textMuted }}>所属区域</span>
                          <span style={{ color: THEME.textPrimary }}>
                            {selectedServer.regionText} ({selectedServer.region})
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span style={{ color: THEME.textMuted }}>连接协议</span>
                          <span className="font-mono" style={{ color: THEME.textPrimary }}>
                            WebSocket / TCP
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>

              <DialogFooter>
                {selectedServer.status === 1 && (
                  <Button
                    className="gap-1.5"
                    style={{ backgroundColor: THEME.jade, color: '#fff' }}
                  >
                    <Play className="size-4" />
                    进入服务器
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setDetailOpen(false)}
                  style={{ borderColor: THEME.border, color: THEME.textSecondary }}
                >
                  关闭
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
