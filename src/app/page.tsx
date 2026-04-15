'use client';

import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Palette, Layers, Swords, Sparkles, Shield, Map, FileTree,
  ChevronRight, Star, Crown, Gem, Zap, Eye, Mountain,
  Droplets, Castle, Hexagon, BookOpen, ScrollText, LayoutGrid,
  TreePine, Code2, FolderTree, ArrowDownRight, CircleDot,
  Flame, ShieldCheck, Crosshair, Home, User, Package,
  Swords as SwordIcon, MapPin, ShoppingBag, Users, Compass
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════
   Constants & Design Tokens
   ═══════════════════════════════════════════ */

const COLORS = {
  InkPaper: '#F5F0E8',
  InkDark: '#1A1A2E',
  CinnabarRed: '#C23B22',
  BronzeGold: '#C4973B',
  LacquerBlack: '#0A0B10',
  BambooYellow: '#D4A017',
  SilkWhite: '#FAF8F5',
  JadeGreen: '#2E8B57',
  AmberOrange: '#D97706',
};

const RARITY_COLORS = {
  SSR: { primary: '#FFD700', border: '#DAA520', glow: '#FFD70080', particle: '#FFECB3' },
  SR:  { primary: '#9B59B6', border: '#8E44AD', glow: '#9B59B680', particle: '#D7BDE2' },
  R:   { primary: '#2E8B57', border: '#27AE60', glow: '#2E8B5780', particle: '#A9DFBF' },
  良:  { primary: '#3498DB', border: '#2980B9', glow: '#3498DB80', particle: '#AED6F1' },
  凡:  { primary: '#95A5A6', border: '#7F8C8D', glow: '#95A5A640', particle: '#D5D8DC' },
};

const FACTION_COLORS = {
  魏: { primary: '#3498DB', light: '#5DADE2', desc: '#AED6F1' },
  蜀: { primary: '#E74C3C', light: '#EC7063', desc: '#F5B7B1' },
  吴: { primary: '#27AE60', light: '#52BE80', desc: '#A9DFBF' },
  群: { primary: '#8E44AD', light: '#A569BD', desc: '#D7BDE2' },
};

const LAYER_INFO = [
  { name: 'Background', z: 0, icon: Layers, desc: '背景层：场景背景、环境特效', color: '#4A5568' },
  { name: 'Scene', z: 100, icon: Mountain, desc: '场景层：3D场景、世界地图', color: '#5B8C5A' },
  { name: 'Main', z: 200, icon: Home, desc: '主界面：主城、功能面板', color: '#C4973B' },
  { name: 'Popup', z: 300, icon: Package, desc: '弹窗层：对话框、提示框', color: '#C23B22' },
  { name: 'Top', z: 400, icon: Eye, desc: '顶层：加载、断线重连', color: '#9B59B6' },
  { name: 'Guide', z: 500, icon: Compass, desc: '引导层：新手引导、提示', color: '#D97706' },
];

const ANIMATIONS = [
  { name: 'InkFadeIn', cn: '水墨淡入', desc: '宣纸展开效果，元素从透明渐变为可见', duration: '0.6s', tag: '通用' },
  { name: 'StampPress', cn: '印章盖压', desc: '先放大后弹回，模拟盖章按压质感', duration: '0.4s', tag: '通用' },
  { name: 'GoldShimmer', cn: '金光闪烁', desc: '暗色蓄力→金光爆发→稳定，SSR专属', duration: '1.2s', tag: 'SSR' },
  { name: 'PurpleMist', cn: '紫雾弥漫', desc: '紫雾渐入→稳定呼吸循环，SR专属', duration: '0.8s', tag: 'SR' },
  { name: 'BorderBreathe', cn: '边框呼吸', desc: '持续循环发光效果，高亮重点元素', duration: '循环', tag: '通用' },
  { name: 'BambooSlide', cn: '竹简滑入', desc: '从侧面滑入展开，模拟竹简卷轴', duration: '0.5s', tag: '面板' },
  { name: 'SealStamp', cn: '印章盖章', desc: '缩放+旋转+色变三段动画', duration: '0.6s', tag: '标记' },
];

const FILE_TREE = [
  { name: 'Assets/Scripts/', type: 'folder' },
  { name: '  Core/', type: 'folder', status: 'existing' },
  { name: '    GameEntry.cs', type: 'file', status: 'existing' },
  { name: '    EventBus.cs', type: 'file', status: 'existing' },
  { name: '    UI/', type: 'folder', status: 'new' },
  { name: '      UIStyleConfig.cs', type: 'file', status: 'new', desc: '全局样式配置' },
  { name: '      InkWashEffect.cs', type: 'file', status: 'new', desc: '水墨特效组件' },
  { name: '      HeroCardRenderer.cs', type: 'file', status: 'new', desc: '武将卡渲染' },
  { name: '      UIBase.cs', type: 'file', status: 'existing' },
  { name: '      UILayer.cs', type: 'file', status: 'existing' },
  { name: '      UIManager.cs', type: 'file', status: 'existing' },
  { name: '  Module/', type: 'folder', status: 'existing' },
  { name: '    Login/', type: 'folder', status: 'existing' },
  { name: '      LoginPanel.cs', type: 'file', status: 'existing' },
  { name: '    MainCity/', type: 'folder', status: 'refactored' },
  { name: '      MainCityPanel.cs', type: 'file', status: 'refactored', desc: '主城重构' },
  { name: '    Card/', type: 'folder', status: 'existing' },
  { name: '      CardCollectionPanel.cs', type: 'file', status: 'existing' },
  { name: '      GachaPanel.cs', type: 'file', status: 'existing' },
  { name: '      DeckEditPanel.cs', type: 'file', status: 'existing' },
  { name: '    Battle/', type: 'folder', status: 'existing' },
  { name: '      BattlePanel.cs', type: 'file', status: 'existing' },
  { name: '    Map/', type: 'folder', status: 'refactored' },
  { name: '      HexMapRenderer.cs', type: 'file', status: 'refactored', desc: '六角地图' },
  { name: '      MapPanel.cs', type: 'file', status: 'existing' },
  { name: '    Quest/', type: 'folder', status: 'existing' },
  { name: '      QuestPanel.cs', type: 'file', status: 'existing' },
  { name: '    Shop/', type: 'folder', status: 'existing' },
  { name: '      ShopPanel.cs', type: 'file', status: 'existing' },
  { name: '    Guild/', type: 'folder', status: 'existing' },
  { name: '      GuildPanel.cs', type: 'file', status: 'existing' },
  { name: '  Data/', type: 'folder', status: 'existing' },
  { name: '    User.cs', type: 'file', status: 'existing' },
  { name: '    CardModel.cs', type: 'file', status: 'existing' },
  { name: '    MapModel.cs', type: 'file', status: 'existing' },
  { name: '    BattleModel.cs', type: 'file', status: 'existing' },
];

/* ═══════════════════════════════════════════
   Animation Keyframes (CSS)
   ═══════════════════════════════════════════ */

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
  }),
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

/* ═══════════════════════════════════════════
   Hexagon SVG Component
   ═══════════════════════════════════════════ */

function HexCell({ x, y, size = 28, fill, stroke, strokeW = 1.5, label, isCapital, terrain, className }: {
  x: number; y: number; size?: number; fill: string; stroke?: string;
  strokeW?: number; label?: string; isCapital?: boolean; terrain?: 'mountain' | 'river' | 'city' | 'normal'; className?: string;
}) {
  const w = size * Math.sqrt(3);
  const h = size * 2;
  return (
    <g className={cn('transition-transform hover:scale-110', className)}>
      <polygon
        points={`${x},${y - size} ${x + w / 2},${y - size / 2} ${x + w / 2},${y + size / 2} ${x},${y + size} ${x - w / 2},${y + size / 2} ${x - w / 2},${y - size / 2}`}
        fill={fill} stroke={stroke || '#2A2D3A'} strokeWidth={strokeW}
      />
      {isCapital && (
        <polygon
          points={`${x},${y - size - 3} ${x + w / 2 + 3},${y - size / 2} ${x + w / 2 + 3},${y + size / 2} ${x},${y + size + 3} ${x - w / 2 - 3},${y + size / 2} ${x - w / 2 - 3},${y - size / 2}`}
          fill="none" stroke={COLORS.BronzeGold} strokeWidth={2.5}
          className="animate-pulse"
        />
      )}
      {terrain === 'mountain' && (
        <text x={x} y={y + 4} textAnchor="middle" fill="#8B7355" fontSize="10">⛰</text>
      )}
      {terrain === 'river' && (
        <text x={x} y={y + 4} textAnchor="middle" fill="#5DADE2" fontSize="10">〰</text>
      )}
      {terrain === 'city' && !isCapital && (
        <text x={x} y={y + 4} textAnchor="middle" fill="#D5D8DC" fontSize="9">城</text>
      )}
      {label && (
        <text x={x} y={y + (isCapital ? size + 14 : 3)} textAnchor="middle" fill="#9CA3AF" fontSize="7">{label}</text>
      )}
    </g>
  );
}

/* ═══════════════════════════════════════════
   Animated Preview Components
   ═══════════════════════════════════════════ */

function InkFadeInPreview() {
  return (
    <div className="relative w-full h-16 rounded-lg overflow-hidden bg-[#0d0e14]">
      <motion.div
        className="absolute inset-0 flex items-center justify-center text-sm text-[#F5F0E8] font-medium"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: [0, 0, 1, 1, 0], scale: [0.9, 0.9, 1, 1, 0.9] }}
        transition={{ duration: 3, repeat: Infinity, times: [0, 0.1, 0.3, 0.7, 1] }}
      >
        水墨淡入
      </motion.div>
    </div>
  );
}

function StampPressPreview() {
  return (
    <div className="relative w-full h-16 rounded-lg overflow-hidden bg-[#0d0e14] flex items-center justify-center">
      <motion.div
        className="w-10 h-10 rounded-sm border-2 border-[#C23B22] flex items-center justify-center text-[#C23B22] text-xs font-bold bg-[#C23B22]/10"
        animate={{ scale: [1.3, 0.95, 1.05, 1], rotate: [-5, 2, -1, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
      >
        印
      </motion.div>
    </div>
  );
}

function GoldShimmerPreview() {
  return (
    <div className="relative w-full h-16 rounded-lg overflow-hidden bg-[#0d0e14] flex items-center justify-center">
      <motion.div
        className="w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xs font-bold"
        style={{ borderColor: RARITY_COLORS.SSR.border, color: RARITY_COLORS.SSR.primary }}
        animate={{
          boxShadow: [
            '0 0 2px #FFD70020',
            '0 0 20px #FFD70060',
            '0 0 40px #FFD70080',
            '0 0 12px #FFD70040',
            '0 0 2px #FFD70020',
          ],
          backgroundColor: ['transparent', '#FFD70015', '#FFD70025', '#FFD70010', 'transparent'],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        SSR
      </motion.div>
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1.5 }}
      />
    </div>
  );
}

function PurpleMistPreview() {
  return (
    <div className="relative w-full h-16 rounded-lg overflow-hidden bg-[#0d0e14] flex items-center justify-center">
      <motion.div
        className="w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xs font-bold"
        style={{ borderColor: RARITY_COLORS.SR.border, color: RARITY_COLORS.SR.primary }}
        animate={{
          boxShadow: [
            '0 0 2px #9B59B620',
            '0 0 25px #9B59B660',
            '0 0 15px #9B59B640',
            '0 0 25px #9B59B660',
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        SR
      </motion.div>
      <motion.div
        className="absolute inset-0 bg-purple-500/5 rounded-lg"
        animate={{ opacity: [0, 0.3, 0.1, 0.3, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      />
    </div>
  );
}

function BorderBreathePreview() {
  return (
    <div className="relative w-full h-16 rounded-lg overflow-hidden bg-[#0d0e14] flex items-center justify-center">
      <motion.div
        className="w-24 h-8 rounded border"
        animate={{
          borderColor: ['#C4973B30', '#C4973B', '#C4973B', '#C4973B30'],
          boxShadow: ['0 0 2px transparent', '0 0 8px #C4973B40', '0 0 8px #C4973B40', '0 0 2px transparent'],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="w-full h-full flex items-center justify-center text-xs text-[#C4973B]">呼吸边框</div>
      </motion.div>
    </div>
  );
}

function BambooSlidePreview() {
  return (
    <div className="relative w-full h-16 rounded-lg overflow-hidden bg-[#0d0e14]">
      <motion.div
        className="absolute top-0 bottom-0 w-3/4 bg-gradient-to-r from-[#D4A017]/20 to-[#D4A017]/5 flex items-center justify-center text-xs text-[#D4A017]"
        initial={{ x: '-100%' }}
        animate={{ x: ['-100%', '0%', '0%', '-100%'] }}
        transition={{ duration: 2.5, repeat: Infinity, times: [0, 0.3, 0.7, 1] }}
      >
        竹简滑入 ▸
      </motion.div>
    </div>
  );
}

function SealStampPreview() {
  return (
    <div className="relative w-full h-16 rounded-lg overflow-hidden bg-[#0d0e14] flex items-center justify-center">
      <motion.div
        className="w-10 h-10 rounded-sm flex items-center justify-center text-xs font-bold"
        animate={{
          scale: [0, 1.4, 1, 1, 1],
          rotate: [0, -15, 5, -2, 0],
          backgroundColor: ['#C23B2200', '#C23B2230', '#C23B2260', '#C23B2260', '#C23B2200'],
          color: ['#C23B2200', '#C23B22', '#C23B22', '#C23B22', '#C23B2200'],
        }}
        transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
      >
        赏
      </motion.div>
    </div>
  );
}

const ANIM_PREVIEWS: Record<string, React.ReactNode> = {
  InkFadeIn: <InkFadeInPreview />,
  StampPress: <StampPressPreview />,
  GoldShimmer: <GoldShimmerPreview />,
  PurpleMist: <PurpleMistPreview />,
  BorderBreathe: <BorderBreathePreview />,
  BambooSlide: <BambooSlidePreview />,
  SealStamp: <SealStampPreview />,
};

/* ═══════════════════════════════════════════
   Section Wrapper
   ═══════════════════════════════════════════ */

function Section({ id, title, subtitle, icon: Icon, children }: {
  id: string; title: string; subtitle: string; icon: React.ElementType; children: React.ReactNode;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <motion.section
      id={id}
      ref={ref}
      className="scroll-mt-24"
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={staggerContainer}
    >
      <motion.div variants={fadeInUp} custom={0} className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg bg-[#C4973B]/10 border border-[#C4973B]/20 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#C4973B]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[#F5F0E8] tracking-wide">{title}</h2>
          <p className="text-sm text-[#6B7280]">{subtitle}</p>
        </div>
      </motion.div>
      <motion.div variants={fadeInUp} custom={1}>
        <Separator className="bg-[#C4973B]/20 mb-8" />
      </motion.div>
      <div>{children}</div>
    </motion.section>
  );
}

/* ═══════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════ */

export default function UnityUIDiagram() {
  return (
    <div className="min-h-screen bg-[#0a0b10] text-[#E5E7EB]">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 bg-[#0a0b10]/90 backdrop-blur-xl border-b border-[#1F2937]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#C23B22] to-[#C4973B] flex items-center justify-center shadow-lg shadow-[#C23B22]/20">
              <Swords className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#F5F0E8] tracking-wider">战国·楚汉争霸</h1>
              <p className="text-[10px] text-[#6B7280] tracking-widest">UNITY CLIENT UI ARCHITECTURE</p>
            </div>
          </div>
          <Badge variant="outline" className="border-[#C4973B]/40 text-[#C4973B] text-xs hidden sm:inline-flex">
            v2.0 · Refactored
          </Badge>
        </div>
        {/* Nav */}
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 overflow-x-auto">
          <div className="flex gap-1 min-w-max">
            {[
              { label: '设计理念', id: 'philosophy' },
              { label: '色彩体系', id: 'colors' },
              { label: 'UI结构图', id: 'structure' },
              { label: '卡牌布局', id: 'card' },
              { label: '世界地图', id: 'map' },
              { label: '动效目录', id: 'animations' },
              { label: '文件架构', id: 'files' },
            ].map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className="px-3 py-1.5 text-xs text-[#9CA3AF] hover:text-[#F5F0E8] hover:bg-[#1F2937] rounded-md transition-colors whitespace-nowrap"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      </header>

      {/* ─── Main Content ─── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-20">
        {/* ═══ Section 1: Design Philosophy ═══ */}
        <Section id="philosophy" title="设计理念" subtitle="四大核心设计支柱" icon={Sparkles}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                title: '水墨风',
                subtitle: 'Ink Wash Style',
                icon: Droplets,
                desc: '以中国传统水墨画为灵感，宣纸质感底色、墨色渐变效果，打造沉浸式古风视觉体验。',
                colors: ['#F5F0E8', '#1A1A2E', '#4A5568', '#2D3748'],
                accent: '#4A5568',
              },
              {
                title: '金属质感',
                subtitle: 'Metallic Texture',
                icon: Shield,
                desc: '青铜与鎏金质感贯穿全局，边框、按钮、装饰元素均采用金属氧化色系。',
                colors: ['#C4973B', '#D4A017', '#B8860B', '#DAA520'],
                accent: '#C4973B',
              },
              {
                title: '战国楚汉',
                subtitle: 'Warring States Theme',
                icon: Crown,
                desc: '深度还原战国至楚汉历史美学，朱砂红、漆黑、竹简黄等传统色彩系统。',
                colors: ['#C23B22', '#0A0B10', '#D4A017', '#2E8B57'],
                accent: '#C23B22',
              },
              {
                title: '动画过渡',
                subtitle: 'Animation Transitions',
                icon: Zap,
                desc: '7种定制动画效果：水墨淡入、印章盖压、金光闪烁等，每个交互都充满仪式感。',
                colors: ['#FFD700', '#9B59B6', '#C23B22', '#D4A017'],
                accent: '#FFD700',
              },
            ].map((pillar, i) => (
              <motion.div key={pillar.title} variants={fadeInUp} custom={i}>
                <Card className="bg-[#111318] border-[#1F2937]/60 hover:border-[#2A2D3A] transition-colors group h-full">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110"
                        style={{ backgroundColor: `${pillar.accent}15`, border: `1px solid ${pillar.accent}30` }}
                      >
                        <pillar.icon className="w-5 h-5" style={{ color: pillar.accent }} />
                      </div>
                      <span className="text-[10px] text-[#4A5568] font-mono tracking-wider">{pillar.subtitle}</span>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-[#F5F0E8] mb-1">{pillar.title}</h3>
                      <p className="text-xs text-[#6B7280] leading-relaxed">{pillar.desc}</p>
                    </div>
                    <div className="flex gap-2">
                      {pillar.colors.map((c) => (
                        <div key={c} className="w-6 h-6 rounded-full border border-white/10 shadow-inner" style={{ backgroundColor: c }} />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ═══ Section 2: Color System ═══ */}
        <Section id="colors" title="色彩体系" subtitle="UIStyleConfig 全局颜色配置" icon={Palette}>
          <Tabs defaultValue="base" className="w-full">
            <TabsList className="bg-[#111318] border border-[#1F2937]/60">
              <TabsTrigger value="base" className="text-xs data-[state=active]:bg-[#C4973B]/15 data-[state=active]:text-[#C4973B]">基础色板</TabsTrigger>
              <TabsTrigger value="rarity" className="text-xs data-[state=active]:bg-[#C4973B]/15 data-[state=active]:text-[#C4973B]">品质色阶</TabsTrigger>
              <TabsTrigger value="faction" className="text-xs data-[state=active]:bg-[#C4973B]/15 data-[state=active]:text-[#C4973B]">势力色彩</TabsTrigger>
            </TabsList>
            <TabsContent value="base">
              <Card className="bg-[#111318] border-[#1F2937]/60 mt-4">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-[#9CA3AF]">Base Color Palette</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-4">
                    {Object.entries(COLORS).map(([name, hex]) => (
                      <div key={name} className="group cursor-pointer">
                        <div
                          className="w-full aspect-square rounded-xl border border-white/5 shadow-lg transition-transform group-hover:scale-105 mb-2 flex items-end p-2"
                          style={{ backgroundColor: hex }}
                        >
                          <span className="text-[9px] font-mono opacity-60" style={{ color: hex === '#F5F0E8' || hex === '#FAF8F5' || hex === '#D4A017' || hex === '#D97706' ? '#000' : '#fff' }}>
                            {hex}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[#D1D5DB] truncate">{name}</p>
                        <p className="text-[10px] text-[#6B7280] truncate">{getChineseColorName(name)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="rarity">
              <Card className="bg-[#111318] border-[#1F2937]/60 mt-4">
                <CardContent className="p-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {(['SSR', 'SR', 'R', '良', '凡'] as const).map((rarity) => {
                      const r = RARITY_COLORS[rarity];
                      return (
                        <div key={rarity} className="space-y-3">
                          {/* Mini card frame */}
                          <motion.div
                            className="relative w-full aspect-[3/4] rounded-xl overflow-hidden"
                            style={{
                              border: `2px solid ${r.border}`,
                              boxShadow: `0 0 20px ${r.glow}, inset 0 0 20px ${r.glow}`,
                            }}
                            whileHover={{ scale: 1.03 }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e]/80 to-[#0a0b10]" />
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                              <span className="text-2xl font-black" style={{ color: r.primary }}>{rarity}</span>
                              <div className="mt-2 flex gap-1">
                                {rarity === 'SSR' ? <><Star className="w-3 h-3 fill-[#FFD700]" /><Star className="w-3 h-3 fill-[#FFD700]" /><Star className="w-3 h-3 fill-[#FFD700]" /><Star className="w-3 h-3 fill-[#FFD700]" /><Star className="w-3 h-3 fill-[#FFD700]" /></> :
                                 rarity === 'SR' ? <><Star className="w-3 h-3 fill-[#9B59B6]" /><Star className="w-3 h-3 fill-[#9B59B6]" /><Star className="w-3 h-3 fill-[#9B59B6]" /><Star className="w-3 h-3 fill-[#9B59B6]" /></> :
                                 rarity === 'R' ? <><Star className="w-3 h-3 fill-[#2E8B57]" /><Star className="w-3 h-3 fill-[#2E8B57]" /><Star className="w-3 h-3 fill-[#2E8B57]" /></> :
                                 rarity === '良' ? <><Star className="w-3 h-3 fill-[#3498DB]" /><Star className="w-3 h-3 fill-[#3498DB]" /></> :
                                 <Star className="w-3 h-3 fill-[#95A5A6]" />}
                              </div>
                            </div>
                            {rarity === 'SSR' && (
                              <motion.div
                                className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent"
                                animate={{ x: ['-100%', '200%'] }}
                                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
                              />
                            )}
                          </motion.div>
                          {/* Color swatches */}
                          <div className="grid grid-cols-4 gap-1.5">
                            {[
                              { label: '主色', c: r.primary },
                              { label: '边框', c: r.border },
                              { label: '光效', c: r.glow },
                              { label: '粒子', c: r.particle },
                            ].map((s) => (
                              <div key={s.label} className="text-center">
                                <div className="w-full aspect-square rounded-md border border-white/5" style={{ backgroundColor: s.c }} />
                                <span className="text-[9px] text-[#6B7280]">{s.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="faction">
              <Card className="bg-[#111318] border-[#1F2937]/60 mt-4">
                <CardContent className="p-5">
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                    {Object.entries(FACTION_COLORS).map(([faction, colors]) => (
                      <div key={faction} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black border-2 shadow-lg"
                            style={{ borderColor: colors.primary, backgroundColor: `${colors.primary}15`, color: colors.primary, boxShadow: `0 0 15px ${colors.primary}30` }}
                          >
                            {faction}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#F5F0E8]">{getFactionName(faction)}</p>
                            <p className="text-[10px] text-[#6B7280]">Faction Color</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: '主色', c: colors.primary },
                            { label: '浅色', c: colors.light },
                            { label: '描述', c: colors.desc },
                          ].map((s) => (
                            <div key={s.label}>
                              <div className="w-full aspect-square rounded-lg border border-white/5" style={{ backgroundColor: s.c }} />
                              <p className="text-[9px] text-[#6B7280] text-center mt-1">{s.label}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </Section>

        {/* ═══ Section 3: UI Structure Diagram ═══ */}
        <Section id="structure" title="UI结构图" subtitle=" UIManager 层级与面板架构" icon={LayoutGrid}>
          <div className="space-y-6">
            {/* Layer Structure */}
            <Card className="bg-[#111318] border-[#1F2937]/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-[#9CA3AF]">Canvas Layer Stack</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {LAYER_INFO.map((layer, i) => (
                  <motion.div
                    key={layer.name}
                    className="flex items-center gap-4 group"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.08 }}
                  >
                    <Badge variant="outline" className="w-14 justify-center text-[10px] font-mono border-[#4A5568]/50 text-[#6B7280]">
                      Z:{layer.z}
                    </Badge>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors group-hover:scale-110"
                      style={{ backgroundColor: `${layer.color}15`, border: `1px solid ${layer.color}30` }}
                    >
                      <layer.icon className="w-4 h-4" style={{ color: layer.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#D1D5DB]">{layer.name}</p>
                      <p className="text-[10px] text-[#6B7280]">{layer.desc}</p>
                    </div>
                    {/* Layer bar */}
                    <div className="hidden sm:block w-32 h-2 rounded-full overflow-hidden bg-[#1a1b23]">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ backgroundColor: layer.color }}
                        initial={{ width: 0 }}
                        whileInView={{ width: `${((layer.z + 100) / 600) * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.08, duration: 0.5 }}
                      />
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>

            {/* Panel Tree */}
            <Card className="bg-[#111318] border-[#1F2937]/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-[#9CA3AF]">Panel Architecture</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <svg viewBox="0 0 880 380" className="w-full min-w-[700px]" xmlns="http://www.w3.org/2000/svg">
                    {/* Background grid */}
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1F293760" strokeWidth="0.5" />
                      </pattern>
                      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#C4973B" />
                        <stop offset="100%" stopColor="#D4A017" />
                      </linearGradient>
                    </defs>
                    <rect width="880" height="380" fill="url(#grid)" rx="8" />

                    {/* GameEntry */}
                    <rect x="340" y="12" width="200" height="40" rx="6" fill="#C4973B20" stroke="#C4973B" strokeWidth="1.5" />
                    <text x="440" y="37" textAnchor="middle" fill="#C4973B" fontSize="13" fontWeight="bold">GameEntry</text>

                    {/* Line down */}
                    <line x1="440" y1="52" x2="440" y2="72" stroke="#C4973B60" strokeWidth="1.5" />
                    <polygon points="436,72 444,72 440,78" fill="#C4973B60" />

                    {/* UIManager */}
                    <rect x="340" y="78" width="200" height="40" rx="6" fill="#C23B2220" stroke="#C23B22" strokeWidth="1.5" />
                    <text x="440" y="103" textAnchor="middle" fill="#C23B22" fontSize="13" fontWeight="bold">UIManager (Singleton)</text>

                    {/* Line down to Login */}
                    <line x1="440" y1="118" x2="440" y2="148" stroke="#C4973B40" strokeWidth="1" />
                    <polygon points="436,148 444,148 440,154" fill="#C4973B40" />

                    {/* LoginPanel */}
                    <rect x="365" y="154" width="150" height="34" rx="5" fill="#1F2937" stroke="#4A5568" strokeWidth="1" />
                    <text x="440" y="176" textAnchor="middle" fill="#D1D5DB" fontSize="11">LoginPanel</text>

                    {/* Arrow down */}
                    <line x1="440" y1="188" x2="440" y2="212" stroke="#C4973B40" strokeWidth="1" />
                    <polygon points="436,212 444,212 440,218" fill="#C4973B40" />

                    {/* MainCityPanel (large) */}
                    <rect x="310" y="218" width="260" height="42" rx="6" fill="#2E8B5720" stroke="#2E8B57" strokeWidth="2" />
                    <text x="440" y="244" textAnchor="middle" fill="#2E8B57" fontSize="13" fontWeight="bold">MainCityPanel (主城)</text>

                    {/* Branches from MainCity */}
                    {/* Branch lines */}
                    <line x1="340" y1="260" x2="120" y2="300" stroke="#4A556840" strokeWidth="1" strokeDasharray="4,2" />
                    <line x1="380" y1="260" x2="270" y2="300" stroke="#4A556840" strokeWidth="1" strokeDasharray="4,2" />
                    <line x1="440" y1="260" x2="440" y2="300" stroke="#4A556840" strokeWidth="1" strokeDasharray="4,2" />
                    <line x1="500" y1="260" x2="600" y2="300" stroke="#4A556840" strokeWidth="1" strokeDasharray="4,2" />
                    <line x1="540" y1="260" x2="740" y2="300" stroke="#4A556840" strokeWidth="1" strokeDasharray="4,2" />

                    {/* Child panels */}
                    {[
                      { x: 50, label: 'QuestPanel', icon: '📋', color: '#D4A017' },
                      { x: 200, label: 'BattlePanel', icon: '⚔️', color: '#C23B22' },
                      { x: 370, label: 'MapPanel', icon: '🗺️', color: '#3498DB' },
                      { x: 530, label: 'ShopPanel', icon: '🏪', color: '#D97706' },
                      { x: 670, label: 'GuildPanel', icon: '🏛️', color: '#9B59B6' },
                    ].map((panel) => (
                      <g key={panel.label}>
                        <rect x={panel.x} y="300" width="150" height="34" rx="5" fill="#1F2937" stroke={panel.color} strokeWidth="1" />
                        <text x={panel.x + 20} y={322} textAnchor="start" fill="#D1D5DB" fontSize="11">{panel.icon} {panel.label}</text>
                      </g>
                    ))}

                    {/* Card system branch */}
                    <line x1="600" y1="317" x2="660" y2="317" stroke="#FFD70040" strokeWidth="1" strokeDasharray="3,2" />
                    <line x1="660" y1="317" x2="660" y2="352" stroke="#FFD70040" strokeWidth="1" strokeDasharray="3,2" />

                    {/* Card sub-panels */}
                    <rect x="560" y="350" width="100" height="24" rx="4" fill="#FFD70010" stroke="#FFD70060" strokeWidth="0.8" />
                    <text x="610" y="366" textAnchor="middle" fill="#DAA520" fontSize="9">CardCollection</text>
                    <rect x="670" y="350" width="70" height="24" rx="4" fill="#9B59B610" stroke="#9B59B660" strokeWidth="0.8" />
                    <text x="705" y="366" textAnchor="middle" fill="#A569BD" fontSize="9">Gacha</text>
                    <rect x="750" y="350" width="70" height="24" rx="4" fill="#2E8B5710" stroke="#2E8B5760" strokeWidth="0.8" />
                    <text x="785" y="366" textAnchor="middle" fill="#52BE80" fontSize="9">DeckEdit</text>
                  </svg>
                </div>
              </CardContent>
            </Card>

            {/* MainCity Breakdown */}
            <Card className="bg-[#111318] border-[#1F2937]/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-[#9CA3AF]">MainCityPanel 子组件</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {[
                    { name: 'ResourceBar', desc: '资源栏（卷轴）', icon: Package },
                    { name: 'BuildingQueue', desc: '建筑队列', icon: Castle },
                    { name: 'CityMap', desc: '城市地图', icon: MapPin },
                    { name: 'QuickActions', desc: '快捷操作', icon: Zap },
                    { name: 'Navigation', desc: '导航按钮', icon: Compass },
                    { name: 'Announcement', desc: '公告面板', icon: ScrollText },
                  ].map((comp) => (
                    <motion.div
                      key={comp.name}
                      className="p-3 rounded-lg bg-[#0d0e14] border border-[#1F2937]/60 text-center hover:border-[#C4973B]/30 transition-colors group"
                      whileHover={{ y: -2 }}
                    >
                      <comp.icon className="w-5 h-5 text-[#6B7280] mx-auto mb-2 group-hover:text-[#C4973B] transition-colors" />
                      <p className="text-xs font-medium text-[#D1D5DB]">{comp.name}</p>
                      <p className="text-[10px] text-[#4A5568] mt-0.5">{comp.desc}</p>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </Section>

        {/* ═══ Section 4: Hero Card Layout ═══ */}
        <Section id="card" title="武将卡牌布局" subtitle="HeroCardRenderer 70/30 分栏设计" icon={ShieldCheck}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* SSR Card */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-[#FFD70020] text-[#FFD700] border-[#FFD700]/30 text-xs">SSR 品质</Badge>
                <span className="text-xs text-[#6B7280]">金光流动 + 粒子特效</span>
              </div>
              <motion.div
                className="relative w-full max-w-xs mx-auto aspect-[2.5/3.5] rounded-2xl overflow-hidden"
                style={{
                  border: '2.5px solid #DAA520',
                  boxShadow: '0 0 30px #FFD70040, 0 0 60px #FFD70015, inset 0 0 20px #FFD70010',
                }}
              >
                {/* Portrait Area 70% */}
                <div className="relative w-full h-[70%] bg-gradient-to-b from-[#1a1a2e] to-[#0f1020] overflow-hidden">
                  {/* Placeholder portrait */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-5xl opacity-30">🎭</div>
                  </div>
                  {/* Gold shimmer overlay */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-400/25 to-transparent"
                    animate={{ x: ['-120%', '120%'] }}
                    transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
                  />
                  {/* Faction badge */}
                  <div className="absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold bg-[#C23B22]/80 text-white">
                    蜀
                  </div>
                  {/* NEW tag */}
                  <div className="absolute top-3 right-3 px-2 py-0.5 rounded text-[10px] font-bold bg-[#2E8B57] text-white animate-pulse">
                    NEW
                  </div>
                  {/* Stars */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-3.5 h-3.5 fill-[#FFD700] text-[#FFD700]" />
                    ))}
                  </div>
                  {/* Quality label */}
                  <div className="absolute bottom-2 right-2 text-[10px] font-mono font-bold text-[#FFD700] bg-black/50 px-1.5 py-0.5 rounded">
                    SSR
                  </div>
                </div>

                {/* Info Area 30% */}
                <div className="relative w-full h-[30%] bg-gradient-to-b from-[#111827] to-[#0a0b10] p-3">
                  <p className="text-sm font-bold text-[#F5F0E8] truncate">诸葛亮</p>
                  <p className="text-[10px] text-[#9CA3AF]">卧龙先生 · 蜀国军师</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#6B7280]">Lv.</span>
                      <span className="text-xs font-bold text-[#D4A017]">80</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame className="w-3 h-3 text-[#C23B22]" />
                      <span className="text-xs font-bold text-[#C23B22]">15,820</span>
                    </div>
                  </div>
                  {/* Seal stamp */}
                  <motion.div
                    className="absolute bottom-2 right-2 w-7 h-7 rounded-sm border-2 border-[#C23B22]/60 flex items-center justify-center text-[8px] text-[#C23B22] font-bold bg-[#C23B22]/10"
                    animate={{ rotate: [-2, 2, -2] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    蜀印
                  </motion.div>
                </div>
              </motion.div>
            </div>

            {/* Card Structure Breakdown */}
            <div className="space-y-4">
              <div className="text-xs text-[#9CA3AF]">布局结构说明</div>
              <div className="space-y-3">
                {[
                  { label: '立绘区域', ratio: '70%', desc: '武将立绘、势力徽章、星级、品质标签、NEW标记', color: '#C4973B' },
                  { label: '信息区域', ratio: '30%', desc: '姓名、称号、势力、等级、战力、印章', color: '#9CA3AF' },
                  { label: '品质边框', ratio: '自适应', desc: 'SSR金框+流光 / SR紫框+雾气 / R绿框+微光', color: '#FFD700' },
                  { label: '动效层级', ratio: '覆盖层', desc: '金光流动(SSR) / 紫雾弥漫(SR) / 翠光微闪(R)', color: '#9B59B6' },
                ].map((item) => (
                  <div key={item.label} className="flex gap-3 items-start">
                    <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: item.color }} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#D1D5DB]">{item.label}</span>
                        <Badge variant="outline" className="text-[9px] py-0 border-[#4A5568]/50 text-[#6B7280]">{item.ratio}</Badge>
                      </div>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="bg-[#1F2937]" />
              <div className="text-xs text-[#9CA3AF]">品质视觉效果对比</div>
              <div className="grid grid-cols-4 gap-2">
                {(['SSR', 'SR', 'R', '良'] as const).map((r) => {
                  const c = RARITY_COLORS[r];
                  return (
                    <div key={r} className="text-center">
                      <motion.div
                        className="w-full aspect-square rounded-lg mb-1"
                        style={{ border: `2px solid ${c.border}`, boxShadow: `0 0 15px ${c.glow}` }}
                        whileHover={{ scale: 1.08 }}
                      >
                        <div className="w-full h-full flex items-center justify-center text-lg font-black bg-[#111318]" style={{ color: c.primary }}>
                          {r}
                        </div>
                      </motion.div>
                      <span className="text-[10px] text-[#6B7280]">{r}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Section>

        {/* ═══ Section 5: World Map Grid ═══ */}
        <Section id="map" title="世界地图网格" subtitle="HexMapRenderer 平顶六角格 · 9×7" icon={Map}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hex Grid Visual */}
            <Card className="bg-[#111318] border-[#1F2937]/60 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-[#9CA3AF]">Hex Grid Layout (9×7)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full overflow-x-auto">
                  <svg viewBox="0 0 560 420" className="w-full min-w-[420px]" xmlns="http://www.w3.org/2000/svg">
                    <rect width="560" height="420" fill="#0a0b10" rx="8" />

                    {/* Grid - flat-top hexagons, offset rows */}
                    {/* Row 0 */}
                    <HexCell x={60} y={50} fill="#1a2a1a" stroke="#2E8B57" terrain="city" label="许昌" />
                    <HexCell x={120} y={50} fill="#1a1a2e" />
                    <HexCell x={180} y={50} fill="#1a2a1a" stroke="#3498DB" terrain="city" label="洛阳" />
                    <HexCell x={240} y={50} fill="#1a1a2e" />
                    <HexCell x={300} y={50} fill="#2a1a1a" stroke="#C23B22" terrain="city" label="长安" />
                    <HexCell x={360} y={50} fill="#1a1a2e" />
                    <HexCell x={420} y={50} fill="#1a2a1a" terrain="mountain" />
                    <HexCell x={480} y={50} fill="#1a1a2e" />
                    <HexCell x={540} y={50} fill="#1a1a2e" />

                    {/* Row 1 (offset) */}
                    <HexCell x={90} y={100} fill="#1a1a2e" terrain="river" />
                    <HexCell x={150} y={100} fill="#1a1a2e" />
                    <HexCell x={210} y={100} fill="#1a1a2a" terrain="mountain" />
                    <HexCell x={270} y={100} fill="#1a2a1a" />
                    <HexCell x={330} y={100} fill="#1a1a2e" terrain="river" />
                    <HexCell x={390} y={100} fill="#1a1a2e" />
                    <HexCell x={450} y={100} fill="#1a2a1a" />
                    <HexCell x={510} y={100} fill="#2a2a1a" stroke="#D4A017" terrain="city" label="建业" isCapital />

                    {/* Row 2 */}
                    <HexCell x={60} y={150} fill="#1a1a2e" />
                    <HexCell x={120} y={150} fill="#1a1a2e" terrain="mountain" />
                    <HexCell x={180} y={150} fill="#1a1a2e" />
                    <HexCell x={240} y={150} fill="#1a2a1a" stroke="#2E8B57" />
                    <HexCell x={300} y={150} fill="#1a1a2e" />
                    <HexCell x={360} y={150} fill="#1a1a2e" />
                    <HexCell x={420} y={150} fill="#1a1a2e" />
                    <HexCell x={480} y={150} fill="#1a2a1a" />
                    <HexCell x={540} y={150} fill="#1a1a2e" />

                    {/* Row 3 (offset) */}
                    <HexCell x={90} y={200} fill="#1a1a2e" terrain="river" />
                    <HexCell x={150} y={200} fill="#1a2a1a" stroke="#2E8B57" />
                    <HexCell x={210} y={200} fill="#1a1a2e" />
                    <HexCell x={270} y={200} fill="#2a1a1a" stroke="#C23B22" />
                    <HexCell x={330} y={200} fill="#1a1a2e" />
                    <HexCell x={390} y={200} fill="#1a2a1a" stroke="#2E8B57" />
                    <HexCell x={450} y={200} fill="#1a1a2e" />
                    <HexCell x={510} y={200} fill="#1a1a2e" />

                    {/* Row 4 */}
                    <HexCell x={60} y={250} fill="#1a1a2e" />
                    <HexCell x={120} y={250} fill="#1a1a2e" />
                    <HexCell x={180} y={250} fill="#1a2a1a" stroke="#3498DB" terrain="city" label="成都" />
                    <HexCell x={240} y={250} fill="#1a1a2e" terrain="river" />
                    <HexCell x={300} y={250} fill="#1a1a2e" terrain="mountain" />
                    <HexCell x={360} y={250} fill="#1a1a2e" />
                    <HexCell x={420} y={250} fill="#1a2a1a" />
                    <HexCell x={480} y={250} fill="#1a1a2e" />
                    <HexCell x={540} y={250} fill="#1a1a2e" />

                    {/* Row 5 (offset) */}
                    <HexCell x={90} y={300} fill="#1a1a2e" />
                    <HexCell x={150} y={300} fill="#1a1a2e" />
                    <HexCell x={210} y={300} fill="#1a1a2e" />
                    <HexCell x={270} y={300} fill="#1a1a2e" terrain="river" />
                    <HexCell x={330} y={300} fill="#1a1a2e" />
                    <HexCell x={390} y={300} fill="#1a1a2e" terrain="mountain" />
                    <HexCell x={450} y={300} fill="#2a2a1a" stroke="#D4A017" terrain="city" label="襄阳" isCapital />
                    <HexCell x={510} y={300} fill="#1a1a2e" />

                    {/* Row 6 */}
                    <HexCell x={60} y={350} fill="#1a1a2e" terrain="mountain" />
                    <HexCell x={120} y={350} fill="#1a1a2e" />
                    <HexCell x={180} y={350} fill="#1a2a1a" stroke="#2E8B57" terrain="city" label="荆州" />
                    <HexCell x={240} y={350} fill="#1a1a2e" />
                    <HexCell x={300} y={350} fill="#1a1a2e" />
                    <HexCell x={360} y={350} fill="#1a1a2e" />
                    <HexCell x={420} y={350} fill="#1a1a2e" />
                    <HexCell x={480} y={350} fill="#1a1a2a" terrain="mountain" />
                    <HexCell x={540} y={350} fill="#1a1a2e" />

                    {/* Region Labels (watermark style) */}
                    <text x="130" y="130" textAnchor="middle" fill="#1F2937" fontSize="22" fontWeight="bold" opacity="0.5">中原</text>
                    <text x="420" y="180" textAnchor="middle" fill="#1F2937" fontSize="22" fontWeight="bold" opacity="0.5">江东</text>
                    <text x="180" y="290" textAnchor="middle" fill="#1F2937" fontSize="22" fontWeight="bold" opacity="0.5">巴蜀</text>
                    <text x="350" y="360" textAnchor="middle" fill="#1F2937" fontSize="18" fontWeight="bold" opacity="0.5">荆楚</text>

                    {/* Legend */}
                    <rect x="10" y="388" width="540" height="24" rx="4" fill="#111318" />
                    <text x="20" y="404" fill="#6B7280" fontSize="9">图例:</text>
                    {[
                      { color: '#2E8B57', label: '己方' },
                      { color: '#C23B22', label: '敌方' },
                      { color: '#3498DB', label: '联盟' },
                      { color: '#D4A017', label: '都城' },
                    ].map((item, idx) => (
                      <g key={item.label}>
                        <rect x={55 + idx * 75} y={395} width={10} height={10} rx="2" fill={item.color} opacity={0.7} />
                        <text x={70 + idx * 75} y={404} fill="#9CA3AF" fontSize="9">{item.label}</text>
                      </g>
                    ))}
                    <text x={360} y={404} fill="#8B7355" fontSize="10">⛰</text>
                    <text x={374} y={404} fill="#9CA3AF" fontSize="9">山脉</text>
                    <text x={415} y={404} fill="#5DADE2" fontSize="10">〰</text>
                    <text x={430} y={404} fill="#9CA3AF" fontSize="9">河流</text>
                  </svg>
                </div>
              </CardContent>
            </Card>

            {/* Map Info */}
            <div className="space-y-4">
              <Card className="bg-[#111318] border-[#1F2937]/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#9CA3AF]">地图配置</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: '网格尺寸', value: '9 × 7 (63格)' },
                    { label: '六角类型', value: 'Flat-Top (平顶)' },
                    { label: '坐标系统', value: 'Offset Coordinates' },
                    { label: '地形类型', value: '山脉 / 河流 / 城市 / 平原' },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between text-xs">
                      <span className="text-[#6B7280]">{item.label}</span>
                      <span className="text-[#D1D5DB] font-mono">{item.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="bg-[#111318] border-[#1F2937]/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#9CA3AF]">占领状态色</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[
                    { label: '中立', color: '#4A5568', desc: '无归属领地' },
                    { label: '己方', color: '#2E8B57', desc: '绿色边框' },
                    { label: '联盟', color: '#3498DB', desc: '蓝色边框' },
                    { label: '敌方', color: '#C23B22', desc: '红色边框' },
                    { label: '争夺中', color: '#D4A017', desc: '金色脉冲动画' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="w-4 h-4 rounded-sm shrink-0" style={{ backgroundColor: item.color, border: '1px solid #2A2D3A' }} />
                      <div>
                        <p className="text-xs text-[#D1D5DB]">{item.label}</p>
                        <p className="text-[10px] text-[#4A5568]">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card className="bg-[#111318] border-[#1F2937]/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-[#9CA3AF]">都城标记</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-10 h-10 flex items-center justify-center"
                      animate={{ boxShadow: ['0 0 2px #D4A01730', '0 0 12px #D4A01760', '0 0 2px #D4A01730'] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Hexagon className="w-8 h-8 text-[#D4A017]" strokeWidth={1.5} />
                    </motion.div>
                    <div>
                      <p className="text-xs text-[#D1D5DB]">青铜边框 + 脉冲光效</p>
                      <p className="text-[10px] text-[#4A5568]">更大的六角格 + 动态呼吸</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Section>

        {/* ═══ Section 6: Animation Catalog ═══ */}
        <Section id="animations" title="动效目录" subtitle="InkWashEffect 7种定制动画" icon={Zap}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ANIMATIONS.map((anim, i) => (
              <motion.div
                key={anim.name}
                className="group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
              >
                <Card className="bg-[#111318] border-[#1F2937]/60 hover:border-[#2A2D3A] transition-colors h-full">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#F5F0E8]">{anim.cn}</span>
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] py-0',
                            anim.tag === 'SSR' && 'border-[#FFD700]/40 text-[#FFD700]',
                            anim.tag === 'SR' && 'border-[#9B59B6]/40 text-[#9B59B6]',
                            anim.tag === '面板' && 'border-[#D4A017]/40 text-[#D4A017]',
                            anim.tag === '标记' && 'border-[#C23B22]/40 text-[#C23B22]',
                            anim.tag === '通用' && 'border-[#4A5568]/40 text-[#6B7280]',
                          )}
                        >
                          {anim.tag}
                        </Badge>
                      </div>
                      <Badge variant="outline" className="text-[9px] py-0 border-[#4A5568]/30 text-[#4A5568] font-mono">
                        {anim.duration}
                      </Badge>
                    </div>
                    {/* Preview */}
                    <div className="rounded-lg overflow-hidden">
                      {ANIM_PREVIEWS[anim.name]}
                    </div>
                    <div>
                      <p className="text-[11px] font-mono text-[#6B7280] mb-0.5">{anim.name}</p>
                      <p className="text-[11px] text-[#9CA3AF] leading-relaxed">{anim.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <Card className="bg-[#111318] border-[#1F2937]/60 mt-6">
            <CardContent className="p-5">
              <h4 className="text-sm font-medium text-[#D1D5DB] mb-3">自定义缓动函数</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { name: 'EaseInkSpread', cn: '水墨扩散', desc: 'ease-out cubic' },
                  { name: 'EaseStampPress', cn: '印章按压', desc: 'spring(1.2, 8)' },
                  { name: 'EaseBambooUnroll', cn: '竹简展开', desc: 'ease-in-out back' },
                  { name: 'EaseGoldFlow', cn: '金光流动', desc: 'linear infinite' },
                ].map((easing) => (
                  <div key={easing.name} className="p-3 rounded-lg bg-[#0d0e14] border border-[#1F2937]/60">
                    <p className="text-xs font-medium text-[#D1D5DB]">{easing.cn}</p>
                    <p className="text-[10px] font-mono text-[#6B7280]">{easing.name}</p>
                    <p className="text-[10px] text-[#4A5568] mt-1">{easing.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </Section>

        {/* ═══ Section 7: File Architecture ═══ */}
        <Section id="files" title="文件架构" subtitle="Unity C# 项目文件树" icon={FolderTree}>
          <Card className="bg-[#111318] border-[#1F2937]/60">
            <CardContent className="p-5">
              <ScrollArea className="max-h-[560px] pr-4">
                <div className="space-y-0.5 font-mono text-xs">
                  {FILE_TREE.map((item, i) => {
                    const indent = (item.name.match(/^(\s*)/)?.[1].length || 0) / 2;
                    const name = item.name.trim();
                    const isNew = item.status === 'new';
                    const isRefactored = item.status === 'refactored';
                    const isFolder = item.type === 'folder';
                    const fileName = name.endsWith('/') ? name : name.replace('.cs', '.cs');

                    return (
                      <motion.div
                        key={i}
                        className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#1a1b23] transition-colors group"
                        style={{ paddingLeft: `${indent * 20 + 8}px` }}
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: i * 0.015 }}
                      >
                        {isFolder ? (
                          <TreePine className="w-3.5 h-3.5 text-[#6B7280] shrink-0" />
                        ) : (
                          <Code2 className="w-3.5 h-3.5 text-[#4A5568] shrink-0" />
                        )}
                        <span className={cn(
                          isFolder ? 'text-[#D1D5DB] font-medium' : 'text-[#9CA3AF]',
                        )}>
                          {fileName}
                        </span>
                        {item.desc && (
                          <span className="text-[9px] text-[#4A5568] hidden sm:inline">— {item.desc}</span>
                        )}
                        {isNew && (
                          <Badge className="ml-auto bg-[#2E8B5715] text-[#2E8B57] border-[#2E8B57]/30 text-[9px] py-0 px-1.5 shrink-0">
                            NEW
                          </Badge>
                        )}
                        {isRefactored && (
                          <Badge className="ml-auto bg-[#D4A01715] text-[#D4A017] border-[#D4A017]/30 text-[9px] py-0 px-1.5 shrink-0">
                            REFACTORED
                          </Badge>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* File Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { label: '新建文件', value: '3', color: '#2E8B57', icon: FileTree },
              { label: '重构文件', value: '2', color: '#D4A017', icon: FileTree },
              { label: '现有文件', value: '15', color: '#6B7280', icon: FileTree },
              { label: '模块总数', value: '8', color: '#3498DB', icon: FileTree },
            ].map((stat) => (
              <Card key={stat.label} className="bg-[#111318] border-[#1F2937]/60">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${stat.color}15`, border: `1px solid ${stat.color}30` }}>
                    <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p className="text-lg font-bold text-[#F5F0E8]">{stat.value}</p>
                    <p className="text-[10px] text-[#6B7280]">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </Section>
      </main>

      {/* ─── Footer ─── */}
      <footer className="border-t border-[#1F2937]/60 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-[#C4973B]" />
              <span className="text-sm text-[#6B7280]">战国·楚汉争霸 — Unity Client UI Architecture</span>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-[#4A5568]">
              <span>UIStyleConfig</span>
              <span>·</span>
              <span>InkWashEffect</span>
              <span>·</span>
              <span>HeroCardRenderer</span>
              <span>·</span>
              <span>HexMapRenderer</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Helper Functions
   ═══════════════════════════════════════════ */

function getChineseColorName(name: string): string {
  const map: Record<string, string> = {
    InkPaper: '宣纸色',
    InkDark: '墨色',
    CinnabarRed: '朱砂红',
    BronzeGold: '青铜金',
    LacquerBlack: '漆黑',
    BambooYellow: '竹简黄',
    SilkWhite: '丝帛白',
    JadeGreen: '翡翠绿',
    AmberOrange: '琥珀橙',
  };
  return map[name] || name;
}

function getFactionName(faction: string): string {
  const map: Record<string, string> = {
    魏: '曹魏',
    蜀: '蜀汉',
    吴: '东吴',
    群: '群雄',
  };
  return map[faction] || faction;
}
