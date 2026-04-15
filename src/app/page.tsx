'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, Clock, Trophy, Map, Users, Gift, Play, Square,
  RefreshCw, ChevronRight, Plus, Trash2, AlertTriangle,
  TrendingUp, Award, Swords, Crown, Shield, Settings,
  BarChart3, Timer, Flag, Star, ArrowUpDown, Zap
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

/* ═══════════════════════════════════════════
   Design Tokens
   ═══════════════════════════════════════════ */
const COLORS = {
  bg: '#0a0b10',
  card: '#111318',
  cardHover: '#161922',
  border: '#1F2937',
  borderLight: '#2A2D3A',
  gold: '#C4973B',
  red: '#C23B22',
  jade: '#2E8B57',
  cinnabar: '#E74C3C',
  amber: '#D4A017',
  text: '#E5E7EB',
  textMuted: '#9CA3AF',
  textDim: '#6B7280',
};

const STATUS_CONFIG: Record<number, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  0: { label: '准备中', color: '#9CA3AF', bg: 'rgba(156,163,175,0.12)', icon: <Clock className="w-3.5 h-3.5" /> },
  1: { label: '进行中', color: '#10B981', bg: 'rgba(16,185,129,0.12)', icon: <Play className="w-3.5 h-3.5" /> },
  2: { label: '即将结束', color: '#F59E0B', bg: 'rgba(245,158,11,0.12)', icon: <AlertTriangle className="w-3.5 h-3.5" /> },
  3: { label: '结算中', color: '#8B5CF6', bg: 'rgba(139,92,246,0.12)', icon: <RefreshCw className="w-3.5 h-3.5" /> },
  4: { label: '已结束', color: '#6B7280', bg: 'rgba(107,114,128,0.12)', icon: <Square className="w-3.5 h-3.5" /> },
};

const REWARD_TYPES: Record<number, string> = {
  1: '金币',
  2: '钻石',
  3: '道具',
  4: '称号',
  5: '经验',
};

/* ═══════════════════════════════════════════
   Types
   ═══════════════════════════════════════════ */
interface Season {
  id: number;
  season_num: number;
  server_id: number;
  name: string;
  status: number;
  start_time: string;
  end_time: string;
  settled_at?: string;
  duration_days: number;
  player_count: number;
  guild_count: number;
  city_reset_count: number;
  reward_sent_count: number;
  settle_result?: string;
  created_at: string;
  updated_at: string;
  remain_days?: number;
  status_text?: string;
}

interface SeasonReward {
  id: number;
  season_num: number;
  rank_min: number;
  rank_max: number;
  reward_type: number;
  reward_id: number;
  amount: number;
  title: string;
}

interface Ranking {
  id: number;
  user_id: number;
  nickname: string;
  avatar: string;
  score: number;
  kill_count: number;
  city_count: number;
  rank: number;
}

/* ═══════════════════════════════════════════
   Animated Background
   ═══════════════════════════════════════════ */
function SeasonBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" style={{ background: COLORS.bg }}>
      {/* Radial gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-[0.04]"
        style={{ background: 'radial-gradient(circle, #C4973B, transparent 70%)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.03]"
        style={{ background: 'radial-gradient(circle, #2E8B57, transparent 70%)' }} />
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }} />
      {/* Floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-amber-400/20"
          style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.1, 0.4, 0.1],
          }}
          transition={{ duration: 4 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3 }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════
   Season System Dashboard
   ═══════════════════════════════════════════ */
export default function SeasonSystemPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null);
  const [rewards, setRewards] = useState<SeasonReward[]>([]);
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [rewardDialogOpen, setRewardDialogOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ label: string; action: () => void } | null>(null);
  const [newSeason, setNewSeason] = useState({ name: '', server_id: '0', duration_days: '60' });
  const [newReward, setNewReward] = useState({ season_num: '0', rank_min: '1', rank_max: '10', reward_type: '1', amount: '1000', title: '' });

  const fetchSeasons = useCallback(async () => {
    try {
      const res = await fetch('/api/season');
      const data = await res.json();
      if (data.code === 0 && data.data) {
        setSeasons(data.data.list || []);
      }
    } catch (e) {
      console.error('Failed to fetch seasons:', e);
    }
  }, []);

  const fetchCurrentSeason = useCallback(async () => {
    try {
      const res = await fetch('/api/season?action=current');
      const data = await res.json();
      if (data.code === 0 && data.data) {
        setCurrentSeason(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch current season:', e);
    }
  }, []);

  const fetchRewards = useCallback(async (seasonNum?: number) => {
    try {
      const num = seasonNum !== undefined ? seasonNum : 0;
      const res = await fetch(`/api/season?action=reward-config&season_num=${num}`);
      const data = await res.json();
      if (data.code === 0 && data.data) {
        setRewards(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch rewards:', e);
    }
  }, []);

  const fetchRankings = useCallback(async (seasonId: number) => {
    try {
      const res = await fetch(`/api/season?action=rankings&id=${seasonId}&page_size=50`);
      const data = await res.json();
      if (data.code === 0 && data.data) {
        setRankings(data.data.list || []);
      }
    } catch (e) {
      console.error('Failed to fetch rankings:', e);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchSeasons(), fetchCurrentSeason(), fetchRewards(0)]);
      setLoading(false);
    };
    init();
  }, [fetchSeasons, fetchCurrentSeason, fetchRewards]);

  const handleAction = async (action: string, payload: Record<string, unknown>) => {
    try {
      const res = await fetch('/api/season', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...payload }),
      });
      const data = await res.json();
      if (data.code === 0) {
        await fetchSeasons();
        await fetchCurrentSeason();
      }
      return data;
    } catch (e) {
      return { code: 10004, message: '操作失败' };
    }
  };

  const handleCreateSeason = async () => {
    if (!newSeason.name.trim()) return;
    const result = await handleAction('create', {
      name: newSeason.name,
      server_id: parseInt(newSeason.server_id),
      duration_days: parseInt(newSeason.duration_days),
    });
    if (result.code === 0) {
      setCreateDialogOpen(false);
      setNewSeason({ name: '', server_id: '0', duration_days: '60' });
    }
  };

  const handleCreateReward = async () => {
    const result = await handleAction('create-reward', {
      season_num: parseInt(newReward.season_num),
      rank_min: parseInt(newReward.rank_min),
      rank_max: parseInt(newReward.rank_max),
      reward_type: parseInt(newReward.reward_type),
      amount: parseInt(newReward.amount),
      title: newReward.title,
    });
    if (result.code === 0) {
      setRewardDialogOpen(false);
      fetchRewards(parseInt(newReward.season_num));
      setNewReward({ season_num: '0', rank_min: '1', rank_max: '10', reward_type: '1', amount: '1000', title: '' });
    }
  };

  const confirmAndExecute = (label: string, action: () => void) => {
    setConfirmAction({ label, action });
    setConfirmDialogOpen(true);
  };

  const executeConfirm = async () => {
    if (confirmAction) {
      await confirmAction.action();
      setConfirmDialogOpen(false);
      setConfirmAction(null);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  // Stats calculation
  const totalSeasons = seasons.length;
  const activeSeasons = seasons.filter(s => s.status === 1).length;
  const totalPlayers = seasons.reduce((acc, s) => acc + (s.player_count || 0), 0);
  const totalRewards = seasons.reduce((acc, s) => acc + (s.reward_sent_count || 0), 0);

  return (
    <div className="relative min-h-screen" style={{ color: COLORS.text }}>
      <SeasonBackground />

      {/* Header */}
      <header className="relative z-10 border-b" style={{ borderColor: COLORS.border, background: 'rgba(10,11,16,0.85)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <motion.div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #C4973B, #8B6914)' }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              <Calendar className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <h1 className="text-xl font-bold tracking-tight" style={{ color: COLORS.gold }}>赛季系统</h1>
              <p className="text-xs" style={{ color: COLORS.textDim }}>Season System · 九州争鼎</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => setRewardDialogOpen(true)}
              className="gap-2 text-xs"
              style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              <Gift className="w-3.5 h-3.5" /> 奖励配置
            </Button>
            <Button
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              className="gap-2 text-xs"
              style={{ background: 'linear-gradient(135deg, #C4973B, #8B6914)', color: 'white', border: 'none' }}
            >
              <Plus className="w-3.5 h-3.5" /> 创建赛季
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: <Calendar className="w-5 h-5" />, label: '总赛季数', value: totalSeasons, color: '#C4973B' },
            { icon: <Play className="w-5 h-5" />, label: '进行中', value: activeSeasons, color: '#10B981' },
            { icon: <Users className="w-5 h-5" />, label: '总参与玩家', value: totalPlayers, color: '#3B82F6' },
            { icon: <Gift className="w-5 h-5" />, label: '已发奖励', value: totalRewards, color: '#8B5CF6' },
          ].map((stat, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <Card className="border-none" style={{ background: COLORS.card, borderColor: COLORS.border }}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs" style={{ color: COLORS.textMuted }}>{stat.label}</span>
                    <div className="p-1.5 rounded-md" style={{ background: `${stat.color}15` }}>
                      <div style={{ color: stat.color }}>{stat.icon}</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Current Season Countdown */}
        {currentSeason && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="mb-6"
          >
            <Card className="border overflow-hidden" style={{ background: COLORS.card, borderColor: COLORS.border }}>
              <div className="absolute inset-0 opacity-5" style={{ background: 'linear-gradient(135deg, #C4973B, transparent)' }} />
              <CardContent className="p-5 relative">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black"
                      style={{ background: 'linear-gradient(135deg, #C4973B, #8B6914)', color: 'white' }}>
                      S{currentSeason.season_num}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold">{currentSeason.season_name || `第${currentSeason.season_num}赛季`}</h3>
                        <Badge className="gap-1 text-[10px]" style={{ background: STATUS_CONFIG[currentSeason.status]?.bg, color: STATUS_CONFIG[currentSeason.status]?.color, border: 'none' }}>
                          {STATUS_CONFIG[currentSeason.status]?.icon}
                          {currentSeason.status_text || STATUS_CONFIG[currentSeason.status]?.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs" style={{ color: COLORS.textMuted }}>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {currentSeason.total_days}天周期</span>
                        <span className="flex items-center gap-1"><Flag className="w-3 h-3" /> 剩余 {currentSeason.remain_days}天</span>
                        <span className="flex items-center gap-1"><Timer className="w-3 h-3" /> 剩余 {currentSeason.remain_hours}小时</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex-1 md:w-48">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span style={{ color: COLORS.textMuted }}>赛季进度</span>
                        <span style={{ color: COLORS.gold }}>{(currentSeason.progress * 100).toFixed(1)}%</span>
                      </div>
                      <Progress value={currentSeason.progress * 100} className="h-2"
                        style={{ '--progress-color': COLORS.gold } as React.CSSProperties} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Tabs Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 bg-transparent gap-2 p-0" style={{ borderBottom: `1px solid ${COLORS.border}` }}>
            {[
              { value: 'overview', label: '赛季总览', icon: <BarChart3 className="w-4 h-4" /> },
              { value: 'rewards', label: '奖励配置', icon: <Award className="w-4 h-4" /> },
              { value: 'rankings', label: '玩家排名', icon: <Trophy className="w-4 h-4" /> },
              { value: 'timeline', label: '结算流程', icon: <RefreshCw className="w-4 h-4" /> },
            ].map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="gap-2 rounded-t-lg px-4 py-2.5 text-sm data-[state=active]:border-b-2 data-[state=active]:border-amber-500 data-[state=active]:text-amber-400 data-[state=active]:bg-transparent"
                style={{ color: COLORS.textMuted, borderBottom: '2px solid transparent' }}
              >
                {tab.icon} {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ─── Overview Tab ─── */}
          <TabsContent value="overview">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-base font-semibold">赛季列表</h2>
                <Button size="sm" variant="ghost" className="gap-1 text-xs" style={{ color: COLORS.textMuted }} onClick={fetchSeasons}>
                  <RefreshCw className="w-3 h-3" /> 刷新
                </Button>
              </div>

              {loading ? (
                <div className="grid gap-3">{Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-24 rounded-xl animate-pulse" style={{ background: COLORS.card }} />
                ))}</div>
              ) : seasons.length === 0 ? (
                <Card className="border-none" style={{ background: COLORS.card }}>
                  <CardContent className="p-12 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: COLORS.textDim }} />
                    <p style={{ color: COLORS.textMuted }}>暂无赛季数据</p>
                    <p className="text-xs mt-1" style={{ color: COLORS.textDim }}>点击「创建赛季」开始第一个赛季</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {seasons.map((season, i) => (
                    <motion.div
                      key={season.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Card className="border group hover:border-amber-500/30 transition-all cursor-pointer"
                        style={{ background: COLORS.card, borderColor: COLORS.border }}
                        onClick={() => { setSelectedSeason(season); fetchRankings(season.id); }}
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg shrink-0"
                                style={{
                                  background: season.status === 1 ? 'linear-gradient(135deg, #C4973B, #8B6914)' : `${COLORS.border}`,
                                  color: season.status === 1 ? 'white' : COLORS.textMuted,
                                }}>
                                S{season.season_num}
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold">{season.name}</span>
                                  <Badge className="gap-1 text-[10px]" style={{ background: STATUS_CONFIG[season.status]?.bg, color: STATUS_CONFIG[season.status]?.color, border: 'none' }}>
                                    {STATUS_CONFIG[season.status]?.icon}
                                    {STATUS_CONFIG[season.status]?.label}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3 text-xs" style={{ color: COLORS.textDim }}>
                                  <span>{formatDate(season.start_time)} → {formatDate(season.end_time)}</span>
                                  <span>·</span>
                                  <span>{season.duration_days}天</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-6 text-xs shrink-0">
                              <div className="text-center">
                                <div className="font-bold text-sm" style={{ color: '#3B82F6' }}>{season.player_count}</div>
                                <div style={{ color: COLORS.textDim }}>玩家</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-sm" style={{ color: '#8B5CF6' }}>{season.guild_count}</div>
                                <div style={{ color: COLORS.textDim }}>联盟</div>
                              </div>
                              <div className="text-center">
                                <div className="font-bold text-sm" style={{ color: '#10B981' }}>{season.reward_sent_count}</div>
                                <div style={{ color: COLORS.textDim }}>奖励</div>
                              </div>
                              {season.status === 0 && (
                                <Button size="sm" className="gap-1 text-xs h-7"
                                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}
                                  onClick={(e) => { e.stopPropagation(); confirmAndExecute('启动赛季', () => handleAction('start', { season_id: season.id })); }}>
                                  <Play className="w-3 h-3" /> 启动
                                </Button>
                              )}
                              {(season.status === 1 || season.status === 2) && (
                                <Button size="sm" className="gap-1 text-xs h-7"
                                  style={{ background: 'rgba(239,68,68,0.15)', color: '#EF4444' }}
                                  onClick={(e) => { e.stopPropagation(); confirmAndExecute('手动结算赛季', () => handleAction('settle', { season_id: season.id })); }}>
                                  <Flag className="w-3 h-3" /> 结算
                                </Button>
                              )}
                              {season.status === 3 && (
                                <Badge className="text-[10px]" style={{ background: 'rgba(139,92,246,0.15)', color: '#8B5CF6' }}>
                                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> 结算中...
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ─── Rewards Tab ─── */}
          <TabsContent value="rewards">
            <Card className="border-none" style={{ background: COLORS.card }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">赛季奖励配置</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select defaultValue="0" onValueChange={(v) => fetchRewards(parseInt(v))}>
                      <SelectTrigger className="w-28 h-8 text-xs" style={{ background: COLORS.bg, borderColor: COLORS.border, color: COLORS.text }}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">通用模板</SelectItem>
                        {seasons.map(s => (
                          <SelectItem key={s.season_num} value={String(s.season_num)}>S{s.season_num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" className="gap-1 text-xs h-8" onClick={() => setRewardDialogOpen(true)}
                      style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                      <Plus className="w-3 h-3" /> 新增
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {rewards.length === 0 ? (
                  <div className="text-center py-8">
                    <Gift className="w-10 h-10 mx-auto mb-2" style={{ color: COLORS.textDim }} />
                    <p className="text-sm" style={{ color: COLORS.textMuted }}>暂无奖励配置</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {rewards.map((reward, i) => (
                      <motion.div
                        key={reward.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-lg border"
                        style={{ background: COLORS.bg, borderColor: COLORS.border }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                            style={{
                              background: reward.rank_max === 0 ? 'linear-gradient(135deg, #FFD700, #FF8C00)' : 'rgba(156,163,175,0.1)',
                              color: reward.rank_max === 0 ? 'white' : COLORS.textMuted,
                            }}>
                            {reward.rank_max === 0 ? '🏆' : `#${reward.rank_min}`}
                          </div>
                          <div>
                            <div className="text-sm font-medium">
                              第{reward.rank_min} ~ {reward.rank_max === 0 ? '∞' : reward.rank_max}名
                            </div>
                            <div className="text-xs" style={{ color: COLORS.textDim }}>
                              {REWARD_TYPES[reward.reward_type] || '未知'} × {reward.amount}
                              {reward.title && ` · ${reward.title}`}
                            </div>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" className="text-xs h-7"
                          style={{ color: '#EF4444' }}
                          onClick={() => confirmAndExecute('删除此奖励配置', async () => {
                            await fetch(`/api/season?reward_id=${reward.id}`, { method: 'DELETE' });
                            fetchRewards(reward.season_num);
                          })}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Rankings Tab ─── */}
          <TabsContent value="rankings">
            <Card className="border-none" style={{ background: COLORS.card }}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    {selectedSeason ? `S${selectedSeason.season_num} ${selectedSeason.name} · 玩家排名` : '玩家排名'}
                  </CardTitle>
                  {selectedSeason && (
                    <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => fetchRankings(selectedSeason.id)}>
                      <RefreshCw className="w-3 h-3" /> 刷新
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!selectedSeason ? (
                  <div className="text-center py-8">
                    <Trophy className="w-10 h-10 mx-auto mb-2" style={{ color: COLORS.textDim }} />
                    <p className="text-sm" style={{ color: COLORS.textMuted }}>请先在赛季列表中选择一个赛季</p>
                  </div>
                ) : rankings.length === 0 ? (
                  <div className="text-center py-8">
                    <Trophy className="w-10 h-10 mx-auto mb-2" style={{ color: COLORS.textDim }} />
                    <p className="text-sm" style={{ color: COLORS.textMuted }}>暂无排名数据</p>
                  </div>
                ) : (
                  <ScrollArea className="max-h-96">
                    <div className="space-y-1.5">
                      {rankings.map((r, i) => (
                        <motion.div
                          key={r.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex items-center justify-between p-3 rounded-lg"
                          style={{
                            background: r.rank <= 3 ? `linear-gradient(90deg, ${
                              r.rank === 1 ? 'rgba(255,215,0,0.08)' : r.rank === 2 ? 'rgba(192,192,192,0.06)' : 'rgba(205,127,50,0.06)'
                            }, transparent)` : COLORS.bg,
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                              style={{
                                background: r.rank === 1 ? '#FFD700' : r.rank === 2 ? '#C0C0C0' : r.rank === 3 ? '#CD7F32' : COLORS.border,
                                color: r.rank <= 3 ? '#000' : COLORS.textMuted,
                              }}>
                              {r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}
                            </div>
                            <div>
                              <span className="text-sm font-medium">{r.nickname || `玩家#${r.user_id}`}</span>
                              <div className="text-[10px]" style={{ color: COLORS.textDim }}>
                                攻城 {r.city_count} · 击杀 {r.kill_count}
                              </div>
                            </div>
                          </div>
                          <div className="text-sm font-bold" style={{ color: COLORS.gold }}>
                            {r.score.toLocaleString()} 分
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Settlement Flow Tab ─── */}
          <TabsContent value="timeline">
            <Card className="border-none" style={{ background: COLORS.card }}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">赛季结算流程</CardTitle>
                <CardDescription className="text-xs" style={{ color: COLORS.textDim }}>
                  每60天自动执行结算，包含5个阶段
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    {
                      phase: 'Phase 1', title: '计算赛季排名', icon: <Trophy className="w-5 h-5" />,
                      color: '#F59E0B', desc: '汇总玩家积分、攻城数、击杀数，使用 ROW_NUMBER() 窗口函数计算最终排名',
                      sql: 'UPDATE season_rankings SET rank = ROW_NUMBER() OVER (ORDER BY score DESC, city_count DESC, kill_count DESC)',
                    },
                    {
                      phase: 'Phase 2', title: '发放赛季奖励', icon: <Gift className="w-5 h-5" />,
                      color: '#8B5CF6', desc: '根据排名匹配奖励配置表，通过内部API调用 user-service 发放金币/钻石/经验',
                      sql: 'INSERT INTO season_reward_logs → POST /internal/user/add-gold (异步并发)',
                    },
                    {
                      phase: 'Phase 3', title: '地图重置（城池归属清空）', icon: <Map className="w-5 h-5" />,
                      color: '#EF4444', desc: '清空所有城池归属、行军订单、联盟领地，玩家保留武将但地图归零',
                      sql: 'DELETE FROM city_occupations, march_orders, alliance_territories, city_occupation_locks',
                    },
                    {
                      phase: 'Phase 4', title: '联盟重组', icon: <Users className="w-5 h-5" />,
                      color: '#3B82F6', desc: '取消所有战争、重置联盟统计/成员贡献、清除入盟申请、重置科技研究状态',
                      sql: 'UPDATE guilds SET city_count=0; UPDATE guild_members SET contribution=0; UPDATE guild_wars SET status=3',
                    },
                    {
                      phase: 'Phase 5', title: '清除缓存 + 自动创建新赛季', icon: <RefreshCw className="w-5 h-5" />,
                      color: '#10B981', desc: '清除 Redis 中赛季相关缓存（map:*, season:*），自动创建下一赛季',
                      sql: 'DEL map:* season:* → INSERT INTO seasons (S+1, status=0, start_time=+24h)',
                    },
                  ].map((step, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <div className="flex gap-4">
                        {/* Timeline line */}
                        <div className="flex flex-col items-center">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: `${step.color}20`, color: step.color }}>
                            {step.icon}
                          </div>
                          {i < 4 && (
                            <div className="w-px flex-1 my-2" style={{ background: `${step.color}30` }} />
                          )}
                        </div>
                        {/* Content */}
                        <div className="flex-1 pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="text-[10px]" style={{ background: `${step.color}20`, color: step.color, border: 'none' }}>
                              {step.phase}
                            </Badge>
                            <span className="font-semibold text-sm">{step.title}</span>
                          </div>
                          <p className="text-xs mb-2" style={{ color: COLORS.textMuted }}>{step.desc}</p>
                          <div className="p-2.5 rounded-lg text-[10px] font-mono" style={{ background: COLORS.bg, color: COLORS.textDim, border: `1px solid ${COLORS.border}` }}>
                            {step.sql}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <Separator className="my-6" style={{ background: COLORS.border }} />

                {/* Cron Config */}
                <div className="p-4 rounded-xl border" style={{ background: COLORS.bg, borderColor: COLORS.border }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-4 h-4" style={{ color: COLORS.gold }} />
                    <span className="text-sm font-semibold">定时任务配置</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                      { label: '检查间隔', value: '60 秒', icon: <Timer className="w-4 h-4" />, color: '#F59E0B' },
                      { label: '赛季周期', value: '60 天', icon: <Calendar className="w-4 h-4" />, color: '#3B82F6' },
                      { label: '预警时间', value: '24 小时', icon: <AlertTriangle className="w-4 h-4" />, color: '#EF4444' },
                    ].map((config, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: COLORS.card }}>
                        <div className="p-1.5 rounded-md" style={{ background: `${config.color}15`, color: config.color }}>
                          {config.icon}
                        </div>
                        <div>
                          <div className="text-xs" style={{ color: COLORS.textDim }}>{config.label}</div>
                          <div className="text-sm font-bold">{config.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 p-2.5 rounded-lg text-[11px]" style={{ background: `${COLORS.card}`, color: COLORS.textDim }}>
                    <strong style={{ color: COLORS.textMuted }}>实现方式：</strong>
                    Go goroutine ticker（非 cron 库）· 每60秒扫描 status IN (1,2,3) 的赛季 · CAS 状态转换防止并发冲突 · 异步执行结算（单任务锁）· 30分钟超时自动重试
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* ─── Create Season Dialog ─── */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="border-none max-w-md" style={{ background: COLORS.card }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4" style={{ color: COLORS.gold }} />
              创建新赛季
            </DialogTitle>
            <DialogDescription style={{ color: COLORS.textDim }}>新赛季默认明天开始，持续60天</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs" style={{ color: COLORS.textMuted }}>赛季名称</Label>
              <Input value={newSeason.name} onChange={(e) => setNewSeason({ ...newSeason, name: e.target.value })}
                placeholder="例如：逐鹿中原" className="mt-1"
                style={{ background: COLORS.bg, borderColor: COLORS.border, color: COLORS.text }} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs" style={{ color: COLORS.textMuted }}>区服ID</Label>
                <Input value={newSeason.server_id} onChange={(e) => setNewSeason({ ...newSeason, server_id: e.target.value })}
                  placeholder="0=全服" className="mt-1"
                  style={{ background: COLORS.bg, borderColor: COLORS.border, color: COLORS.text }} />
              </div>
              <div>
                <Label className="text-xs" style={{ color: COLORS.textMuted }}>持续天数</Label>
                <Input value={newSeason.duration_days} onChange={(e) => setNewSeason({ ...newSeason, duration_days: e.target.value })}
                  placeholder="60" className="mt-1"
                  style={{ background: COLORS.bg, borderColor: COLORS.border, color: COLORS.text }} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCreateDialogOpen(false)} style={{ color: COLORS.textMuted }}>取消</Button>
            <Button onClick={handleCreateSeason} disabled={!newSeason.name.trim()}
              style={{ background: 'linear-gradient(135deg, #C4973B, #8B6914)', color: 'white' }}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Create Reward Dialog ─── */}
      <Dialog open={rewardDialogOpen} onOpenChange={setRewardDialogOpen}>
        <DialogContent className="border-none max-w-md" style={{ background: COLORS.card }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Gift className="w-4 h-4" style={{ color: '#10B981' }} />
              创建奖励配置
            </DialogTitle>
            <DialogDescription style={{ color: COLORS.textDim }}>配置赛季结束后的排名奖励</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs" style={{ color: COLORS.textMuted }}>赛季编号</Label>
                <Select value={newReward.season_num} onValueChange={(v) => setNewReward({ ...newReward, season_num: v })}>
                  <SelectTrigger className="mt-1 h-9 text-xs" style={{ background: COLORS.bg, borderColor: COLORS.border, color: COLORS.text }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">通用模板</SelectItem>
                    {seasons.map(s => (
                      <SelectItem key={s.season_num} value={String(s.season_num)}>S{s.season_num}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs" style={{ color: COLORS.textMuted }}>奖励类型</Label>
                <Select value={newReward.reward_type} onValueChange={(v) => setNewReward({ ...newReward, reward_type: v })}>
                  <SelectTrigger className="mt-1 h-9 text-xs" style={{ background: COLORS.bg, borderColor: COLORS.border, color: COLORS.text }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(REWARD_TYPES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs" style={{ color: COLORS.textMuted }}>排名下限</Label>
                <Input type="number" value={newReward.rank_min} onChange={(e) => setNewReward({ ...newReward, rank_min: e.target.value })}
                  className="mt-1 h-9" style={{ background: COLORS.bg, borderColor: COLORS.border, color: COLORS.text }} />
              </div>
              <div>
                <Label className="text-xs" style={{ color: COLORS.textMuted }}>排名上限</Label>
                <Input type="number" value={newReward.rank_max} onChange={(e) => setNewReward({ ...newReward, rank_max: e.target.value })}
                  placeholder="0=不限" className="mt-1 h-9" style={{ background: COLORS.bg, borderColor: COLORS.border, color: COLORS.text }} />
              </div>
              <div>
                <Label className="text-xs" style={{ color: COLORS.textMuted }}>数量</Label>
                <Input type="number" value={newReward.amount} onChange={(e) => setNewReward({ ...newReward, amount: e.target.value })}
                  className="mt-1 h-9" style={{ background: COLORS.bg, borderColor: COLORS.border, color: COLORS.text }} />
              </div>
            </div>
            <div>
              <Label className="text-xs" style={{ color: COLORS.textMuted }}>称号名称（仅称号类型需要）</Label>
              <Input value={newReward.title} onChange={(e) => setNewReward({ ...newReward, title: e.target.value })}
                placeholder="例如：九州霸主" className="mt-1 h-9" style={{ background: COLORS.bg, borderColor: COLORS.border, color: COLORS.text }} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRewardDialogOpen(false)} style={{ color: COLORS.textMuted }}>取消</Button>
            <Button onClick={handleCreateReward} style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981' }}>
              创建
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Confirm Dialog ─── */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="border-none max-w-sm" style={{ background: COLORS.card }}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} />
              确认操作
            </DialogTitle>
            <DialogDescription style={{ color: COLORS.textMuted }}>
              确定要{confirmAction?.label}吗？此操作不可撤销。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmDialogOpen(false)} style={{ color: COLORS.textMuted }}>取消</Button>
            <Button onClick={executeConfirm} style={{ background: 'rgba(239,68,68,0.2)', color: '#EF4444' }}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="relative z-10 mt-12 border-t py-4 text-center text-xs"
        style={{ borderColor: COLORS.border, color: COLORS.textDim, background: 'rgba(10,11,16,0.8)' }}>
        九州争鼎 · 赛季系统管理面板 · Season Service Port 9008
      </footer>
    </div>
  );
}
