'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import {
  Copy, Check, ChevronDown, Database, Server, Shield, Swords,
  Zap, ArrowRight, Layers, HardDrive, BadgeCheck, Star, Target,
  TrendingUp, Clock, Flame, Heart, ShieldHalf, Sparkles, FileCode,
  SwordsIcon, Crown, Skull, RotateCcw, type LucideIcon,
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
  { name: 'main.go', desc: '服务入口' },
  { name: 'battle_engine.go', desc: '战斗引擎核心 (350+ 行)' },
  { name: 'battle_model.go', desc: '数据模型' },
  { name: 'battle_service.go', desc: '业务逻辑' },
  { name: 'battle_dao.go', desc: '数据访问层' },
  { name: 'battle_handler.go', desc: 'HTTP 处理器' },
  { name: 'schema.sql', desc: '数据库建表 (3张)' },
  { name: 'skills_config.json', desc: '技能配置 (7个技能)' },
]

const engineCode = `// 战斗引擎核心 - Execute 方法
func (e *BattleEngine) Execute(attackers, defenders []*BattleUnit) *BattleResult {
    for turn := 1; turn <= MaxTurns; turn++ {
        // 1. 构建行动队列（速度排序 + ±10% 浮动）
        actionQueue := e.buildActionQueue(attackers, defenders)

        for _, unit := range actionQueue {
            if !unit.Alive { continue }

            // 2. 处理 Buff/Debuff 回合计时
            e.processBuffTick(unit, &battleTurn)

            // 3. 检查技能CD，选择技能或普攻
            if unit.ActiveSkill != nil && unit.SkillCD <= 0 {
                actions = e.executeSkill(unit, unit.ActiveSkill, enemies, allies)
            } else {
                actions = e.executeNormalAttack(unit, enemies)
            }

            // 4. 检查胜负
            if len(getAliveEnemies(unit)) == 0 {
                winner = 1; break
            }
        }

        if winner != 0 { break }
    }
    return result
}

// 伤害计算公式
func (e *BattleEngine) calcDamage(atk, def int, ratio, counterMul float64, isCrit bool) int {
    baseDmg := float64(atk) * ratio          // 基础伤害 = ATK × 技能倍率
    reduction := float64(def) * 0.5           // 减伤 = DEF × 50%
    damage := math.Max(baseDmg - reduction, 1) // 最低1点伤害
    damage *= counterMul                       // 阵营克制加成
    damage *= 0.95 + randomFloat()*0.1         // ±5% 浮动
    if isCrit { damage *= 1.5 }                // 暴击 ×1.5
    return int(math.Round(damage))
}`

const counterRelations = [
  { atk: '魏', atkColor: 'text-blue-500', def: '蜀', defColor: 'text-emerald-500', arrow: '→' },
  { atk: '蜀', atkColor: 'text-emerald-500', def: '吴', defColor: 'text-red-500', arrow: '→' },
  { atk: '吴', atkColor: 'text-red-500', def: '魏', defColor: 'text-blue-500', arrow: '→' },
]

const elementRelations = [
  { atk: '🔥 火', def: '❄️ 冰' },
  { atk: '❄️ 冰', def: '🌀 风' },
  { atk: '🌀 风', def: '🔥 火' },
  { atk: '⚡ 雷', def: '💧 水' },
  { atk: '💧 水', def: '🔥 火' },
  { atk: '✨ 光', def: '🌑 暗' },
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
              <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-gradient-to-br from-red-500/10 via-orange-500/5 to-transparent blur-3xl" />
              <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-gradient-to-tr from-blue-500/10 via-purple-500/5 to-transparent blur-3xl" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline" className="border-red-500/30 text-red-600 dark:text-red-400 bg-red-500/5">Battle Service</Badge>
                <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5">5v5 Auto</Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-black">
                <span className="bg-gradient-to-r from-red-500 via-orange-400 to-amber-500 bg-clip-text text-transparent">战斗系统微服务</span>
              </h1>
              <p className="mt-2 text-lg text-muted-foreground font-medium">Battle Service — 回合制 5v5 自动战斗引擎</p>
              <p className="mt-3 text-sm text-muted-foreground/80 max-w-2xl leading-relaxed">
                基于 Go 的完整回合制战斗引擎。5v5 自动战斗、技能释放、阵营克制、
                Buff/Debuff 系统、暴击机制、战斗回放等核心功能。
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['5v5 回合制', '自动战斗 AI', '7 种技能', '阵营克制', 'Buff/Debuff',
                  '暴击/浮动', '战斗回放', 'JSON 技能配置', 'PVE + PVP',
                ].map((t) => (<Badge key={t} variant="secondary" className="text-xs px-2.5 py-1">{t}</Badge>))}
              </div>
            </div>
          </motion.section>

          {/* ===== Battle Flow ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-red-500 to-orange-600" />
              战斗流程
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                { icon: Swords, title: '1. 组建阵容', desc: '5张卡牌上阵\n选择阵位 0~4', color: 'text-red-500' },
                { icon: Target, title: '2. 速度排序', desc: '全体单位按速度降序\n±10% 随机浮动', color: 'text-blue-500' },
                { icon: Zap, title: '3. 依次行动', desc: 'CD好→放技能\n否则普通攻击', color: 'text-amber-500' },
                { icon: Flame, title: '4. 伤害结算', desc: '克制/暴击/浮动\nBuff/Debuff', color: 'text-orange-500' },
                { icon: Crown, title: '5. 胜负判定', desc: '一方全灭即败\n最多30回合', color: 'text-emerald-500' },
              ].map((step) => (
                <Card key={step.title} className="hover:shadow-sm transition-shadow">
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><step.icon className={`w-4 h-4 ${step.color}`} />{step.title}</CardTitle></CardHeader>
                  <CardContent><p className="text-xs text-muted-foreground whitespace-pre-line">{step.desc}</p></CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== Damage Formula ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-orange-500 to-red-600" />
              伤害计算公式
            </h2>
            <Card className="border-dashed bg-orange-50/30 dark:bg-orange-950/10">
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-sm font-mono">
                  <Badge variant="secondary" className="px-2 py-1">最终伤害</Badge>
                  <span className="text-muted-foreground">=</span>
                  <Badge className="px-2 py-1 bg-blue-500/10 text-blue-600 border-blue-200">ATK × 技能倍率</Badge>
                  <span className="text-muted-foreground">−</span>
                  <Badge className="px-2 py-1 bg-purple-500/10 text-purple-600 border-purple-200">DEF × 50%</Badge>
                  <span className="text-muted-foreground">×</span>
                  <Badge className="px-2 py-1 bg-amber-500/10 text-amber-600 border-amber-200">克制系数</Badge>
                  <span className="text-muted-foreground">×</span>
                  <Badge className="px-2 py-1 bg-red-500/10 text-red-600 border-red-200">暴击(1.5)</Badge>
                  <span className="text-muted-foreground">×</span>
                  <Badge className="px-2 py-1 bg-gray-500/10 text-gray-600 border-gray-200">随机(0.95~1.05)</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  {[
                    { label: '克制伤害', value: '×1.3 (+30%)', color: 'text-green-500' },
                    { label: '被克制伤害', value: '×0.7 (-30%)', color: 'text-red-500' },
                    { label: '暴击率', value: '角色暴击率 + 5%', color: 'text-amber-500' },
                    { label: '暴击伤害', value: '×150%', color: 'text-orange-500' },
                  ].map((item) => (
                    <div key={item.label} className="p-2.5 rounded-lg bg-card border">
                      <p className="font-semibold text-muted-foreground">{item.label}</p>
                      <p className={`font-bold font-mono mt-0.5 ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.section>

          {/* ===== Faction Counter ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-blue-500 to-indigo-600" />
              阵营克制 + 元素克制
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">⚔️ 阵营克制</CardTitle><CardDescription>魏→蜀→吴→魏 · 群雄特殊</CardDescription></CardHeader>
                <CardContent>
                  <div className="flex items-center justify-center gap-6">
                    <div className="text-center space-y-1">
                      <div className="w-14 h-14 rounded-xl bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center text-lg font-bold text-blue-600">魏</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-green-500" />
                    <div className="text-center space-y-1">
                      <div className="w-14 h-14 rounded-xl bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-lg font-bold text-emerald-600">蜀</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-green-500" />
                    <div className="text-center space-y-1">
                      <div className="w-14 h-14 rounded-xl bg-red-500/20 border-2 border-red-400 flex items-center justify-center text-lg font-bold text-red-600">吴</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-green-500" />
                    <div className="text-center space-y-1">
                      <div className="w-14 h-14 rounded-xl bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center text-lg font-bold text-blue-600">魏</div>
                    </div>
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-3">群雄与所有阵营形成半克制关系</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm font-bold">🔮 元素克制</CardTitle><CardDescription>火→冰→风→火 · 光↔暗</CardDescription></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-2">
                    {elementRelations.map(({ atk, def }) => (
                      <div key={atk} className="text-center p-2 rounded-lg bg-muted/50 text-xs">
                        <p className="font-bold">{atk}</p>
                        <p className="text-muted-foreground">→</p>
                        <p className="font-bold">{def}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-center text-muted-foreground mt-3">克制方伤害 +30%，被克制方伤害 -30%</p>
                </CardContent>
              </Card>
            </div>
          </motion.section>

          {/* ===== Skills ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-purple-500 to-pink-600" />
              技能系统（JSON 可配置）
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {[
                { name: '青龙偃月刀', char: '关羽', target: '全体敌人', ratio: '180%', type: '物理', cd: 4, buff: '降防15%×2回合', color: 'border-red-300 bg-red-50/30 dark:bg-red-950/10' },
                { name: '龙胆枪法', char: '赵云', target: '单体', ratio: '350%', type: '物理', cd: 5, buff: '加攻20%×3回合', color: 'border-emerald-300 bg-emerald-50/30 dark:bg-emerald-950/10' },
                { name: '火烧连营', char: '陆逊', target: '全体敌人', ratio: '200%', type: '法术', cd: 5, buff: '灼烧DOT 5%/×3回合', color: 'border-orange-300 bg-orange-50/30 dark:bg-orange-950/10' },
                { name: '倾国倾城', char: '貂蝉', target: '敌方后排', ratio: '250%', type: '法术', cd: 4, buff: '降速20%×2回合', color: 'border-pink-300 bg-pink-50/30 dark:bg-pink-950/10' },
                { name: '妙手回春', char: '华佗', target: '最低血量队友', ratio: '250%治疗', type: '治疗', cd: 3, buff: 'HOT 3%/×3回合', color: 'border-green-300 bg-green-50/30 dark:bg-green-950/10' },
                { name: '天下无双', char: '吕布', target: '单体', ratio: '500%', type: '物理', cd: 6, buff: '加攻30%×2回合', color: 'border-amber-300 bg-amber-50/30 dark:bg-amber-950/10' },
                { name: '铁壁防御', char: '曹操/张飞', target: '自身', ratio: '-', type: '防御', cd: 4, buff: '加防40%×2回合', color: 'border-blue-300 bg-blue-50/30 dark:bg-blue-950/10' },
              ].map((skill) => (
                <Card key={skill.name} className={`border ${skill.color}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold">{skill.name}</CardTitle>
                      <Badge variant="outline" className="text-[10px]">CD:{skill.cd}</Badge>
                    </div>
                    <CardDescription className="text-xs">{skill.char} · {skill.target} · {skill.type}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="secondary" className="font-bold">{skill.ratio}</Badge>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-muted-foreground">{skill.buff}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <CodeBlock code={`{
  "id": 1001,
  "name": "青龙偃月刀",
  "type": "active",
  "target_type": "enemy_all",     // single/enemy_all/ally_lowest_hp/self/enemy_back
  "damage_type": "physical",      // physical/magical/true
  "damage_ratio": 1.8,            // 180% 伤害倍率
  "base_damage": 200,             // 固定伤害
  "cd": 4,                        // 冷却回合
  "buffs": [{
    "type": "def_down",           // atk_up/def_up/spd_up/dot/hot/shield/stun
    "value": 0.15,
    "duration": 2,
    "is_debuff": true
  }]
}`} lang="json" filename="skill_config.json" />
          </motion.section>

          {/* ===== Buff System ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-green-500 to-emerald-600" />
              Buff / Debuff 系统
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { type: 'atk_up', label: '攻击提升', desc: 'ATK × (1 + value)', icon: TrendingUp, color: 'text-red-500 bg-red-50/30' },
                { type: 'def_up', label: '防御提升', desc: 'DEF × (1 + value)', icon: ShieldHalf, color: 'text-blue-500 bg-blue-50/30' },
                { type: 'spd_up', label: '速度提升', desc: 'SPD × (1 + value)', icon: Zap, color: 'text-amber-500 bg-amber-50/30' },
                { type: 'dot', label: '持续伤害', desc: '每回合 MaxHP × value', icon: Flame, color: 'text-orange-500 bg-orange-50/30' },
                { type: 'hot', label: '持续治疗', desc: '每回合回复 MaxHP × value', icon: Heart, color: 'text-green-500 bg-green-50/30' },
                { type: 'atk_down', label: '攻击降低', desc: 'ATK × (1 - value)', icon: TrendingUp, color: 'text-red-300 bg-red-50/20' },
                { type: 'def_down', label: '防御降低', desc: 'DEF × (1 - value)', icon: ShieldHalf, color: 'text-blue-300 bg-blue-50/20' },
                { type: 'spd_down', label: '速度降低', desc: 'SPD × (1 - value)', icon: Zap, color: 'text-amber-300 bg-amber-50/20' },
              ].map((buff) => (
                <Card key={buff.type} className="hover:shadow-sm transition-shadow">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <buff.icon className={`w-4 h-4 ${buff.color} rounded`} />
                      <code className="text-xs font-bold font-mono">{buff.type}</code>
                    </div>
                    <p className="text-xs font-semibold">{buff.label}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{buff.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== REST API ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-blue-500 to-cyan-600" />
              REST API
            </h2>
            {[
              { method: 'POST', path: '/api/v1/battle/pve', auth: true, desc: 'PVE 战斗', color: 'bg-red-500',
                req: `{\n  "type": "pve",\n  "stage_id": 1,\n  "team": [\n    { "card_id": 1001, "slot": 0 },\n    { "card_id": 1002, "slot": 1 },\n    { "card_id": 1005, "slot": 2 },\n    { "card_id": 1007, "slot": 3 },\n    { "card_id": 1003, "slot": 4 }\n  ]\n}`,
                res: `{\n  "code": 0,\n  "data": {\n    "battle_id": "a1b2c3d4-1234567",\n    "winner": 1,\n    "turn_count": 8,\n    "turns": [{ "turn_number": 1, "actions": [...] }],\n    "units": [\n      { "unit_id": 1, "name": "关羽", "alive": true, "hp_remain": 1200, "total_damage": 8500, "kills": 2 }\n    ],\n    "duration_ms": 12\n  }\n}` },
              { method: 'GET', path: '/api/v1/battle/replay/:id', auth: true, desc: '战斗回放', color: 'bg-blue-500', res: `{\n  "code": 0,\n  "data": {\n    "battle_id": "a1b2c3d4",\n    "turns": [{ "turn_number": 1, "actions": [\n      {\n        "actor_id": 1, "actor_name": "关羽",\n        "target_id": 6, "target_name": "吕布",\n        "action_type": "skill", "skill_name": "青龙偃月刀",\n        "damage": 1520, "is_crit": true, "is_counter": true,\n        "hp_after": 3980\n      }\n    ]}]\n  }\n}` },
              { method: 'GET', path: '/api/v1/battle/history?limit=20', auth: true, desc: '战斗历史', color: 'bg-amber-500', res: `{\n  "code": 0,\n  "data": [{\n    "battle_id": "a1b2c3d4",\n    "attacker_id": 10001,\n    "attacker_win": true,\n    "type": "pve",\n    "turn_count": 8,\n    "duration_ms": 12\n  }]\n}` },
            ].map((api) => (
              <Collapsible key={api.path}>
                <Card className="hover:shadow-sm transition-shadow">
                  <CollapsibleTrigger className="w-full text-left">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-md text-white text-xs font-bold font-mono ${api.color}`}>{api.method}</span>
                        <code className="text-sm font-mono font-semibold">{api.path}</code>
                        <Badge variant="outline" className="text-[10px] gap-1 border-amber-300 text-amber-600 dark:text-amber-400"><Shield className="w-3 h-3" />JWT</Badge>
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
              数据库（3 张表）
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { name: 'battle_records', desc: '战斗记录表', fields: ['battle_id (唯一)', 'attacker_id/defender_id', 'attacker_win (BOOL)', 'type (pve/pvp/guild_war)', 'turn_count', 'result_json (完整回放)', 'duration_ms'] },
                { name: 'skill_definitions', desc: '技能定义表', fields: ['name (唯一)', 'type (normal/active/passive)', 'target_type (5种)', 'damage_ratio / base_damage', 'cd', 'buffs_json', 'special (heal/shield)'] },
                { name: 'stage_definitions', desc: 'PVE关卡配置', fields: ['chapter + stage_num (唯一)', 'difficulty (1~5)', 'enemy_team_json', 'rewards_json', 'first_reward_json'] },
              ].map((t) => (
                <Card key={t.name}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><Database className="w-4 h-4 text-muted-foreground" /><code className="font-mono">{t.name}</code></CardTitle><CardDescription className="text-xs">{t.desc}</CardDescription></CardHeader>
                  <CardContent><ul className="space-y-1">{t.fields.map((f) => (<li key={f} className="text-[11px] font-mono text-muted-foreground flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-current" />{f}</li>))}</ul></CardContent>
                </Card>
              ))}
            </div>
          </motion.section>

          {/* ===== Source Code ===== */}
          <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="space-y-4">
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-gradient-to-b from-violet-500 to-purple-600" />
              核心源码（12 个文件）
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              <Card className="lg:col-span-1 p-0 overflow-hidden">
                <div className="p-3 border-b bg-muted/30"><p className="text-xs font-semibold flex items-center gap-1.5"><Swords className="w-3.5 h-3.5 text-red-500" />battle-service/</p></div>
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
                  <CodeBlock code={activeTab === 1 ? engineCode : '// 完整源码位于 battle-service/ 目录\n// 12 个文件，包含战斗引擎核心实现\n// battle_engine.go 包含伤害计算、技能释放、Buff系统等'} lang={activeTab >= 6 ? 'sql' : activeTab === 7 ? 'json' : 'go'} filename={sourceFiles[activeTab].name} />
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
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">1</span>建库建表</CardTitle></CardHeader><CardContent><CodeBlock code={`mysql -u root -p < battle-service/docs/schema.sql`} lang="bash" filename="terminal" /></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">2</span>导入技能+关卡</CardTitle></CardHeader><CardContent><CodeBlock code={`INSERT INTO skill_definitions (name, type, target_type, damage_ratio, cd)\nVALUES ('青龙偃月刀', 'active', 'enemy_all', 1.80, 4);\n\nINSERT INTO stage_definitions (chapter, stage_num, name, enemy_team_json)\nVALUES (1, 1, '黄巾之乱', '[{"card_id":1006,"slot":0,"level":5,"star":1},...]');`} lang="sql" filename="mysql" /></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-bold flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold">3</span>启动服务</CardTitle></CardHeader><CardContent><CodeBlock code={`cd battle-service\ngo mod tidy\ngo run cmd/main.go\n# → http://localhost:9002`} lang="bash" filename="terminal" /></CardContent></Card>
            </div>
          </motion.section>

        </main>

        <footer className="border-t bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <p>九州争鼎 — 战斗系统微服务 · Go + 回合制引擎 + 技能系统</p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1"><Swords className="w-3 h-3" />5v5</span>
              <span className="flex items-center gap-1"><Target className="w-3 h-3" />30回合</span>
              <span className="flex items-center gap-1"><RotateCcw className="w-3 h-3" />CD系统</span>
              <span className="flex items-center gap-1"><Server className="w-3 h-3" />Port 9002</span>
            </div>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  )
}
