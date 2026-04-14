'use client'

import { useState } from 'react'
import {
  Shield, Users, Crown, Eye, Pencil, Trash2, Castle, Swords,
  Trophy, Megaphone,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mockGuilds, mockGuildMembers, type Guild, type GuildMember } from '@/lib/admin-data'

// --- Role badge ---
function RoleBadge({ role }: { role: GuildMember['role'] }) {
  const styles: Record<string, string> = {
    leader: 'bg-amber-500/15 text-amber-700 border-amber-400 font-bold',
    vice_leader: 'bg-purple-500/15 text-purple-700 border-purple-400 font-bold',
    elder: 'bg-sky-500/15 text-sky-600 border-sky-300',
    member: 'bg-stone-500/15 text-stone-500 border-stone-300',
  }
  const labels: Record<string, string> = {
    leader: '盟主',
    vice_leader: '副盟主',
    elder: '长老',
    member: '成员',
  }
  return <Badge variant="outline" className={styles[role] || ''}>{labels[role] || role}</Badge>
}

// --- Rank badge ---
function RankBadge({ rank }: { rank: number }) {
  if (rank <= 3) {
    const colors = ['bg-amber-500 text-amber-950', 'bg-stone-400 text-stone-950', 'bg-amber-700 text-amber-950']
    return (
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${colors[rank - 1]}`}>
        {rank}
      </span>
    )
  }
  return <span className="inline-flex items-center justify-center w-6 h-6 text-xs text-muted-foreground">{rank}</span>
}

// --- Guild Detail Dialog ---
function GuildDetailDialog({
  open, onOpenChange, guild,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  guild: Guild | null
}) {
  if (!guild) return null

  // Get mock members (filter by guild id, fallback to first guild's members)
  const members = mockGuildMembers.filter((m) => m.guildId === guild.id)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            {guild.name}
          </DialogTitle>
          <DialogDescription>联盟详细信息与成员列表</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh]">
          <div className="space-y-4">
            {/* Overview Card */}
            <Card className="bg-muted/30">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: '排名', value: `#${guild.rank}`, icon: Trophy, color: 'text-amber-600' },
                    { label: '等级', value: `Lv.${guild.level}`, icon: Castle, color: 'text-purple-600' },
                    { label: '成员', value: `${guild.memberCount}/${guild.maxMembers}`, icon: Users, color: 'text-sky-600' },
                    { label: '城池', value: `${guild.cityCount}座`, icon: Swords, color: 'text-red-600' },
                    { label: '总战力', value: `${(guild.totalPower / 10000).toFixed(0)}万`, icon: Crown, color: 'text-emerald-600' },
                    { label: '经验', value: guild.exp.toLocaleString(), icon: Trophy, color: 'text-amber-500' },
                    { label: '盟主', value: guild.leaderName, icon: Crown, color: 'text-amber-600' },
                    { label: '创建', value: guild.createdAt, icon: Megaphone, color: 'text-stone-500' },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <item.icon className={`w-4 h-4 mx-auto ${item.color}`} />
                      <p className="text-[10px] text-muted-foreground mt-1">{item.label}</p>
                      <p className={`text-sm font-bold font-mono mt-0.5 ${item.color}`}>{item.value}</p>
                    </div>
                  ))}
                </div>
                {guild.notice && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Megaphone className="w-3 h-3" /> 公告
                    </p>
                    <p className="text-xs mt-0.5">{guild.notice}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Separator />

            {/* Member List */}
            <div>
              <p className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                成员列表
                <Badge variant="secondary" className="text-xs">{members.length}</Badge>
              </p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>昵称</TableHead>
                      <TableHead className="text-center">等级</TableHead>
                      <TableHead className="text-right">战力</TableHead>
                      <TableHead>职位</TableHead>
                      <TableHead className="text-right">贡献</TableHead>
                      <TableHead>最近活跃</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium text-sm">{member.nickname}</TableCell>
                        <TableCell className="text-center font-mono text-xs">{member.level}</TableCell>
                        <TableCell className="text-right font-mono text-xs">{member.power.toLocaleString()}</TableCell>
                        <TableCell><RoleBadge role={member.role} /></TableCell>
                        <TableCell className="text-right font-mono text-xs">{member.contribution.toLocaleString()}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{member.lastActiveAt}</TableCell>
                      </TableRow>
                    ))}
                    {members.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-20 text-center text-muted-foreground text-sm">
                          暂无成员数据
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// --- Guild Edit Dialog ---
function GuildEditDialog({
  open, onOpenChange, guild,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  guild: Guild | null
}) {
  const [form, setForm] = useState({
    level: guild?.level.toString() ?? '',
    maxMembers: guild?.maxMembers.toString() ?? '',
    notice: guild?.notice ?? '',
    leaderName: guild?.leaderName ?? '',
  })

  if (!guild) return null

  const handleSave = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>编辑联盟 — {guild.name}</DialogTitle>
          <DialogDescription>修改联盟配置参数</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">联盟等级</Label>
              <Input
                type="number"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="h-8 text-sm font-mono"
                min={1}
                max={30}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">最大人数</Label>
              <Input
                type="number"
                value={form.maxMembers}
                onChange={(e) => setForm({ ...form, maxMembers: e.target.value })}
                className="h-8 text-sm font-mono"
                min={10}
                max={100}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">联盟公告</Label>
            <Textarea
              value={form.notice}
              onChange={(e) => setForm({ ...form, notice: e.target.value })}
              className="text-sm min-h-[80px]"
              placeholder="输入联盟公告..."
            />
          </div>

          <Separator />

          <div className="space-y-1.5">
            <Label className="text-xs">转让盟主</Label>
            <div className="flex items-center gap-2">
              <Input
                value={form.leaderName}
                onChange={(e) => setForm({ ...form, leaderName: e.target.value })}
                className="h-8 text-sm"
                placeholder="输入新城主名称"
              />
              <Badge variant="outline" className="text-xs whitespace-nowrap">当前: {guild.leaderName}</Badge>
            </div>
            <p className="text-[10px] text-red-500 mt-1">注意：转让盟主不可撤销，请谨慎操作</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
          <Button onClick={handleSave}>保存修改</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// --- Main Component ---
export default function GuildsPage() {
  const [guilds] = useState<Guild[]>(mockGuilds)
  const [detailGuild, setDetailGuild] = useState<Guild | null>(null)
  const [editGuild, setEditGuild] = useState<Guild | null>(null)
  const [disbandTarget, setDisbandTarget] = useState<Guild | null>(null)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">联盟管理</h2>
        <p className="text-sm text-muted-foreground mt-1">
          管理游戏联盟、查看成员和调整配置
          <Badge variant="secondary" className="ml-2 text-xs">{guilds.length} 个联盟</Badge>
        </p>
      </div>

      {/* Guild Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">排名</TableHead>
                  <TableHead>联盟名</TableHead>
                  <TableHead>盟主</TableHead>
                  <TableHead className="text-center">成员</TableHead>
                  <TableHead className="text-center">等级</TableHead>
                  <TableHead className="text-center">城池</TableHead>
                  <TableHead className="text-right">总战力</TableHead>
                  <TableHead className="max-w-[150px]">公告</TableHead>
                  <TableHead className="text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {guilds.map((guild) => (
                  <TableRow key={guild.id} className="group">
                    <TableCell>
                      <RankBadge rank={guild.rank} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-amber-500 flex-shrink-0" />
                        <span className="font-semibold text-sm">{guild.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-500" />
                        {guild.leaderName}
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-xs font-mono">
                      {guild.memberCount}/{guild.maxMembers}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-300 text-[10px]">
                        Lv.{guild.level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center text-xs">{guild.cityCount}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {(guild.totalPower / 10000).toFixed(0)}万
                    </TableCell>
                    <TableCell className="max-w-[150px]">
                      <p className="text-xs text-muted-foreground truncate">{guild.notice}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={() => setDetailGuild(guild)}
                          title="查看成员"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="sm" className="h-7 w-7 p-0"
                          onClick={() => setEditGuild(guild)}
                          title="编辑"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog open={!!disbandTarget && disbandTarget.id === guild.id} onOpenChange={(v) => { if (!v) setDisbandTarget(null) }}>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                              title="解散"
                              onClick={() => setDisbandTarget(guild)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>确认解散联盟「{guild.name}」?</AlertDialogTitle>
                              <AlertDialogDescription>
                                此操作将解散联盟，所有成员将被移出，联盟城池和资产将被清空。此操作无法撤销。
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              <AlertDialogAction className="bg-red-500 hover:bg-red-600" onClick={() => setDisbandTarget(null)}>
                                确认解散
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Guild Detail Dialog */}
      <GuildDetailDialog
        open={!!detailGuild}
        onOpenChange={(v) => { if (!v) setDetailGuild(null) }}
        guild={detailGuild}
      />

      {/* Guild Edit Dialog */}
      <GuildEditDialog
        open={!!editGuild}
        onOpenChange={(v) => { if (!v) setEditGuild(null) }}
        guild={editGuild}
      />
    </div>
  )
}
