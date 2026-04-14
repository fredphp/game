'use client'

import { useState, useMemo } from 'react'
import {
  Plus, Pencil, Search, Swords, Eye, Sparkles,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mockHeroes, type Hero } from '@/lib/admin-data'

// --- Rarity badge ---
function RarityBadge({ rarity }: { rarity: Hero['rarity'] }) {
  const styles: Record<string, string> = {
    SSR: 'bg-amber-500/15 text-amber-700 border-amber-400 font-bold',
    SR: 'bg-purple-500/15 text-purple-700 border-purple-400 font-bold',
    R: 'bg-stone-500/15 text-stone-600 border-stone-400',
  }
  return (
    <Badge variant="outline" className={styles[rarity] || ''}>{rarity}</Badge>
  )
}

// --- Faction badge ---
function FactionBadge({ factionName }: { factionName: string }) {
  const styles: Record<string, string> = {
    '魏国': 'bg-sky-500/10 text-sky-600 border-sky-300',
    '蜀国': 'bg-emerald-500/10 text-emerald-600 border-emerald-300',
    '吴国': 'bg-red-500/10 text-red-600 border-red-300',
    '群雄': 'bg-stone-500/10 text-stone-600 border-stone-300',
  }
  return (
    <Badge variant="outline" className={styles[factionName] || ''}>{factionName}</Badge>
  )
}

// --- Avatar placeholder ---
function HeroAvatar({ rarity, name }: { rarity: Hero['rarity']; name: string }) {
  const colors: Record<string, string> = {
    SSR: 'bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950',
    SR: 'bg-gradient-to-br from-purple-400 to-purple-600 text-purple-950',
    R: 'bg-gradient-to-br from-stone-400 to-stone-500 text-stone-950',
  }
  return (
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${colors[rarity] || colors.R}`}>
      {name.slice(0, 1)}
    </div>
  )
}

// --- Filter Bar ---
function FilterBar({ filters, onChange }: {
  filters: { search: string; rarity: string; faction: string; type: string }
  onChange: (f: typeof filters) => void
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索武将名称..."
              value={filters.search}
              onChange={(e) => onChange({ ...filters, search: e.target.value })}
              className="h-8 pl-8 text-sm"
            />
          </div>
          <Select value={filters.rarity} onValueChange={(v) => onChange({ ...filters, rarity: v })}>
            <SelectTrigger className="h-8 w-[100px] text-sm">
              <SelectValue placeholder="稀有度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="SSR">SSR</SelectItem>
              <SelectItem value="SR">SR</SelectItem>
              <SelectItem value="R">R</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.faction} onValueChange={(v) => onChange({ ...filters, faction: v })}>
            <SelectTrigger className="h-8 w-[100px] text-sm">
              <SelectValue placeholder="阵营" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="wei">魏</SelectItem>
              <SelectItem value="shu">蜀</SelectItem>
              <SelectItem value="wu">吴</SelectItem>
              <SelectItem value="qun">群</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.type} onValueChange={(v) => onChange({ ...filters, type: v })}>
            <SelectTrigger className="h-8 w-[100px] text-sm">
              <SelectValue placeholder="兵种" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="infantry">步兵</SelectItem>
              <SelectItem value="cavalry">骑兵</SelectItem>
              <SelectItem value="archer">弓兵</SelectItem>
              <SelectItem value="strategist">谋士</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}

// --- Hero Edit Dialog ---
function HeroFormDialog({
  open, onOpenChange, hero,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  hero: Hero | null
}) {
  const isEdit = hero !== null

  const [form, setForm] = useState({
    name: hero?.name || '',
    title: hero?.title || '',
    faction: hero?.faction || 'wei',
    type: hero?.type || 'infantry',
    rarity: hero?.rarity || 'R',
    baseAtk: hero?.baseAtk?.toString() || '200',
    baseDef: hero?.baseDef?.toString() || '150',
    baseHp: hero?.baseHp?.toString() || '2000',
    baseSpeed: hero?.baseSpeed?.toString() || '22',
    growthAtk: hero?.growthAtk?.toString() || '8',
    growthDef: hero?.growthDef?.toString() || '5',
    growthHp: hero?.growthHp?.toString() || '80',
    skillJson: hero?.skillJson || '[]',
    status: hero?.status ?? 1,
  })

  const [skillTab, setSkillTab] = useState<'form' | 'json'>('form')

  const handleSave = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? '编辑武将' : '创建武将'}</DialogTitle>
          <DialogDescription>
            {isEdit ? `修改 ${hero?.name} 的属性配置` : '添加新武将到游戏'}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-3">
          <div className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">武将名称 *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">称号</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="h-8 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">稀有度 *</Label>
                <Select value={form.rarity} onValueChange={(v) => setForm({ ...form, rarity: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SSR">SSR</SelectItem>
                    <SelectItem value="SR">SR</SelectItem>
                    <SelectItem value="R">R</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">阵营 *</Label>
                <Select value={form.faction} onValueChange={(v) => setForm({ ...form, faction: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="wei">魏</SelectItem>
                    <SelectItem value="shu">蜀</SelectItem>
                    <SelectItem value="wu">吴</SelectItem>
                    <SelectItem value="qun">群</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">兵种 *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="infantry">步兵</SelectItem>
                    <SelectItem value="cavalry">骑兵</SelectItem>
                    <SelectItem value="archer">弓兵</SelectItem>
                    <SelectItem value="strategist">谋士</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Base Stats */}
            <div>
              <Label className="text-xs font-semibold">基础属性</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                {[
                  { key: 'baseAtk' as const, label: '攻击力', color: 'text-red-500' },
                  { key: 'baseDef' as const, label: '防御力', color: 'text-sky-500' },
                  { key: 'baseHp' as const, label: '生命值', color: 'text-emerald-500' },
                  { key: 'baseSpeed' as const, label: '速度', color: 'text-amber-500' },
                ].map((s) => (
                  <div key={s.key} className="space-y-1.5">
                    <Label className={`text-xs ${s.color}`}>{s.label}</Label>
                    <Input
                      type="number"
                      value={form[s.key]}
                      onChange={(e) => setForm({ ...form, [s.key]: e.target.value })}
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Growth */}
            <div>
              <Label className="text-xs font-semibold">成长值</Label>
              <div className="grid grid-cols-3 gap-3 mt-2">
                {[
                  { key: 'growthAtk' as const, label: '攻击成长', color: 'text-red-500' },
                  { key: 'growthDef' as const, label: '防御成长', color: 'text-sky-500' },
                  { key: 'growthHp' as const, label: '生命成长', color: 'text-emerald-500' },
                ].map((s) => (
                  <div key={s.key} className="space-y-1.5">
                    <Label className={`text-xs ${s.color}`}>{s.label}</Label>
                    <Input
                      type="number"
                      value={form[s.key]}
                      onChange={(e) => setForm({ ...form, [s.key]: e.target.value })}
                      className="h-8 text-sm font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Skills */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">技能配置</Label>
                <Tabs value={skillTab} onValueChange={(v) => setSkillTab(v as 'form' | 'json')}>
                  <TabsList className="h-7">
                    <TabsTrigger value="form" className="text-xs px-3 h-6">表单</TabsTrigger>
                    <TabsTrigger value="json" className="text-xs px-3 h-6">JSON</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
              {skillTab === 'json' ? (
                <Textarea
                  value={form.skillJson}
                  onChange={(e) => setForm({ ...form, skillJson: e.target.value })}
                  className="font-mono text-xs min-h-[120px] bg-muted/30"
                  placeholder='[{"name":"技能名","damage":200,"type":"single"}]'
                />
              ) : (
                <Card className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="text-xs text-muted-foreground space-y-1.5">
                      <div className="flex items-center gap-2">
                        <Swords className="w-3.5 h-3.5 text-amber-500" />
                        <span>技能编辑请切换到 JSON 模式进行详细配置</span>
                      </div>
                      <pre className="mt-2 p-2 rounded bg-background/50 text-[11px] font-mono overflow-x-auto">
                        {(() => {
                          try { return JSON.stringify(JSON.parse(form.skillJson), null, 2) }
                          catch { return form.skillJson }
                        })()}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* Status */}
            <div className="flex items-center justify-between">
              <Label className="text-xs">状态</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{form.status === 1 ? '启用' : '禁用'}</span>
                <Switch
                  checked={form.status === 1}
                  onCheckedChange={(checked) => setForm({ ...form, status: checked ? 1 : 0 })}
                />
              </div>
            </div>
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave}>{isEdit ? '保存' : '创建'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Skills Viewer Dialog ---
function SkillsViewer({
  open, onOpenChange, hero,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  hero: Hero | null
}) {
  if (!hero) return null
  let skills: Array<{ name: string; damage: number; type: string }> = []
  try {
    skills = JSON.parse(hero.skillJson)
  } catch {
    /* ignore */
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            {hero.name} — 技能详情
          </DialogTitle>
          <DialogDescription>{hero.title} ({hero.factionName} · {hero.typeName})</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {skills.map((skill, i) => (
            <Card key={i} className="border-amber-500/20 bg-amber-500/5">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                  <Swords className="w-5 h-5 text-amber-950" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{skill.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>伤害: <span className="font-mono text-red-500">{skill.damage}</span></span>
                    <span>类型: <Badge variant="outline" className="text-[10px] h-5 px-1.5">{skill.type}</Badge></span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {skills.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">暂无技能数据</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// --- Main Component ---
export default function HeroesPage() {
  const [heroes, setHeroes] = useState<Hero[]>(mockHeroes)
  const [filters, setFilters] = useState({ search: '', rarity: 'all', faction: 'all', type: 'all' })
  const [editHero, setEditHero] = useState<Hero | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [viewSkillsHero, setViewSkillsHero] = useState<Hero | null>(null)

  const filtered = useMemo(() => {
    return heroes.filter((h) => {
      if (filters.search && !h.name.includes(filters.search) && !h.title.includes(filters.search)) return false
      if (filters.rarity !== 'all' && h.rarity !== filters.rarity) return false
      if (filters.faction !== 'all' && h.faction !== filters.faction) return false
      if (filters.type !== 'all' && h.type !== filters.type) return false
      return true
    })
  }, [heroes, filters])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">武将管理</h2>
          <p className="text-sm text-muted-foreground mt-1">
            管理武将属性、技能、稀有度和阵营配置
            <Badge variant="secondary" className="ml-2 text-xs">{filtered.length} 位武将</Badge>
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" /> 新建武将
        </Button>
      </div>

      {/* Filter Bar */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Hero Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">头像</TableHead>
                  <TableHead>名称</TableHead>
                  <TableHead>称号</TableHead>
                  <TableHead>稀有度</TableHead>
                  <TableHead>阵营</TableHead>
                  <TableHead>兵种</TableHead>
                  <TableHead className="text-center">攻击</TableHead>
                  <TableHead className="text-center">防御</TableHead>
                  <TableHead className="text-center">生命</TableHead>
                  <TableHead className="text-center">速度</TableHead>
                  <TableHead className="text-center">成长</TableHead>
                  <TableHead className="text-right">抽卡数</TableHead>
                  <TableHead className="text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((hero) => (
                  <TableRow key={hero.id} className="group">
                    <TableCell>
                      <HeroAvatar rarity={hero.rarity} name={hero.name} />
                    </TableCell>
                    <TableCell className="font-semibold">{hero.name}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{hero.title}</TableCell>
                    <TableCell><RarityBadge rarity={hero.rarity} /></TableCell>
                    <TableCell><FactionBadge factionName={hero.factionName} /></TableCell>
                    <TableCell className="text-xs">{hero.typeName}</TableCell>
                    <TableCell className="text-center font-mono text-xs text-red-500">{hero.baseAtk}</TableCell>
                    <TableCell className="text-center font-mono text-xs text-sky-500">{hero.baseDef}</TableCell>
                    <TableCell className="text-center font-mono text-xs text-emerald-500">{hero.baseHp}</TableCell>
                    <TableCell className="text-center font-mono text-xs text-amber-500">{hero.baseSpeed}</TableCell>
                    <TableCell className="text-center">
                      <span className="text-[10px] font-mono text-muted-foreground">
                        +{hero.growthAtk}/{hero.growthDef}/{hero.growthHp}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{hero.drawCount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setViewSkillsHero(hero)}>
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setEditHero(hero)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="h-24 text-center text-muted-foreground">
                      未找到匹配的武将
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      {editHero && (
        <HeroFormDialog
          open={!!editHero}
          onOpenChange={(v) => { if (!v) setEditHero(null) }}
          hero={editHero}
        />
      )}

      {/* Create Dialog */}
      <HeroFormDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        hero={null}
      />

      {/* Skills Viewer */}
      <SkillsViewer
        open={!!viewSkillsHero}
        onOpenChange={(v) => { if (!v) setViewSkillsHero(null) }}
        hero={viewSkillsHero}
      />
    </div>
  )
}
