'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Search, RotateCcw, Eye, Ban, ShieldOff, Gem,
  ChevronLeft, ChevronRight, MoreHorizontal, User,
} from 'lucide-react'
import { mockGameUsers, GameUser } from '@/lib/admin-data'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

const PAGE_SIZE = 10

const statusMap: Record<number, { text: string; variant: 'default' | 'destructive' | 'secondary'; className: string }> = {
  1: { text: '正常', variant: 'default', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300' },
  0: { text: '封禁', variant: 'destructive', className: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-300' },
  2: { text: '冻结', variant: 'secondary', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300' },
}

export default function UsersPage() {
  // --- Filters ---
  const [search, setSearch] = useState('')
  const [serverFilter, setServerFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [vipFilter, setVipFilter] = useState('all')
  const [page, setPage] = useState(1)

  // --- Dialogs ---
  const [detailUser, setDetailUser] = useState<GameUser | null>(null)
  const [editUser, setEditUser] = useState<GameUser | null>(null)
  const [banUser, setBanUser] = useState<GameUser | null>(null)

  // --- Edit form ---
  const [editDiamond, setEditDiamond] = useState('')
  const [editGold, setEditGold] = useState('')
  const [editStamina, setEditStamina] = useState('')
  const [editReason, setEditReason] = useState('')

  // --- Filtered data ---
  const filtered = useMemo(() => {
    let list = [...mockGameUsers]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((u) => u.nickname.toLowerCase().includes(q) || u.uid.toLowerCase().includes(q))
    }
    if (serverFilter !== 'all') {
      list = list.filter((u) => u.serverId === Number(serverFilter))
    }
    if (statusFilter !== 'all') {
      list = list.filter((u) => u.status === Number(statusFilter))
    }
    if (vipFilter !== 'all') {
      list = list.filter((u) => u.vipLevel === Number(vipFilter))
    }
    return list
  }, [search, serverFilter, statusFilter, vipFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageData = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleReset = useCallback(() => {
    setSearch('')
    setServerFilter('all')
    setStatusFilter('all')
    setVipFilter('all')
    setPage(1)
  }, [])

  const handleSearch = useCallback(() => setPage(1), [])

  const openEdit = (user: GameUser) => {
    setEditUser(user)
    setEditDiamond(String(user.diamond))
    setEditGold(String(user.gold))
    setEditStamina(String(user.stamina))
    setEditReason('')
  }

  const winRate = (w: number, t: number) => (t > 0 ? ((w / t) * 100).toFixed(1) : '0.0')

  // --- Pagination numbers ---
  const pageNums = useMemo(() => {
    const total = totalPages
    const current = safePage
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
    const pages: number[] = [1]
    if (current > 3) pages.push(-1)
    const start = Math.max(2, current - 1)
    const end = Math.min(total - 1, current + 1)
    for (let i = start; i <= end; i++) pages.push(i)
    if (current < total - 2) pages.push(-1)
    if (total > 1) pages.push(total)
    return pages
  }, [totalPages, safePage])

  return (
    <div className="space-y-6">
      {/* ===== Search / Filter Bar ===== */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-emerald-600" />
            用户管理
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">搜索 (昵称/UID)</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="输入昵称或UID"
                  className="pl-8 h-9 w-[200px]"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">服务器</Label>
              <Select value={serverFilter} onValueChange={setServerFilter}>
                <SelectTrigger className="h-9 w-[130px]">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部服务器</SelectItem>
                  <SelectItem value="1">九州1区</SelectItem>
                  <SelectItem value="2">九州2区</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">状态</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[110px]">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="1">正常</SelectItem>
                  <SelectItem value="0">封禁</SelectItem>
                  <SelectItem value="2">冻结</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs text-muted-foreground">VIP等级</Label>
              <Select value={vipFilter} onValueChange={setVipFilter}>
                <SelectTrigger className="h-9 w-[110px]">
                  <SelectValue placeholder="全部" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部VIP</SelectItem>
                  {Array.from({ length: 11 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>VIP {i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="h-9" onClick={handleSearch}>
                <Search className="h-3.5 w-3.5 mr-1.5" />
                搜索
              </Button>
              <Button size="sm" variant="outline" className="h-9" onClick={handleReset}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                重置
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== Data Table ===== */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs whitespace-nowrap">UID</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">昵称</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">等级</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">VIP</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">战力</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">钻石</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">金币</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">联盟</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">服务器</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">状态</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">最后登录</TableHead>
                  <TableHead className="text-xs whitespace-nowrap text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                      暂无匹配数据
                    </TableCell>
                  </TableRow>
                ) : (
                  pageData.map((user) => {
                    const st = statusMap[user.status]
                    return (
                      <TableRow key={user.id} className="text-sm">
                        <TableCell className="font-mono text-xs whitespace-nowrap">{user.uid}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{user.nickname}</TableCell>
                        <TableCell className="whitespace-nowrap">Lv.{user.level}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className="text-xs px-1.5 py-0 font-mono">
                            {user.vipLevel}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap">{user.power.toLocaleString()}</TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap text-emerald-600 dark:text-emerald-400">{user.diamond.toLocaleString()}</TableCell>
                        <TableCell className="font-mono text-xs whitespace-nowrap text-amber-600 dark:text-amber-400">{user.gold.toLocaleString()}</TableCell>
                        <TableCell className="whitespace-nowrap max-w-[100px] truncate">{user.guildName}</TableCell>
                        <TableCell className="whitespace-nowrap text-xs">{user.serverName}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant={st.variant} className={`text-xs px-2 py-0.5 border ${st.className}`}>
                            {st.text}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{user.lastLoginAt}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setDetailUser(user)} title="查看详情">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-7 w-7 p-0 ${user.status === 0 ? 'text-emerald-600' : 'text-red-600'}`}
                              onClick={() => setBanUser(user)}
                              title={user.status === 0 ? '解封' : '封禁'}
                            >
                              {user.status === 0 ? <ShieldOff className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(user)} title="修改资源">
                              <Gem className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <span className="text-xs text-muted-foreground">
              共 {filtered.length} 条记录，第 {safePage}/{totalPages} 页
            </span>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={safePage <= 1} onClick={() => setPage(1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
                <ChevronLeft className="h-3.5 w-3.5 -ml-2" />
              </Button>
              <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={safePage <= 1} onClick={() => setPage(safePage - 1)}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              {pageNums.map((p, i) =>
                p === -1 ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">...</span>
                ) : (
                  <Button
                    key={p}
                    size="sm"
                    variant={safePage === p ? 'default' : 'outline'}
                    className="h-7 w-7 p-0 text-xs"
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                )
              )}
              <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={safePage >= totalPages} onClick={() => setPage(safePage + 1)}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" className="h-7 w-7 p-0" disabled={safePage >= totalPages} onClick={() => setPage(totalPages)}>
                <ChevronRight className="h-3.5 w-3.5" />
                <ChevronRight className="h-3.5 w-3.5 -ml-2" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ===== User Detail Dialog ===== */}
      <Dialog open={!!detailUser} onOpenChange={() => setDetailUser(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-4 w-4 text-emerald-600" />
                  用户详情
                </DialogTitle>
                <DialogDescription>查看用户完整信息</DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Basic Info */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <InfoItem label="昵称" value={detailUser.nickname} />
                  <InfoItem label="UID" value={detailUser.uid} mono />
                  <InfoItem label="等级" value={`Lv.${detailUser.level}`} />
                  <InfoItem label="VIP" value={`VIP ${detailUser.vipLevel}`} />
                  <InfoItem label="服务器" value={detailUser.serverName} />
                  <InfoItem label="联盟" value={detailUser.guildName} />
                  <InfoItem label="状态">
                    <Badge variant={statusMap[detailUser.status].variant} className={`text-xs px-2 py-0.5 border ${statusMap[detailUser.status].className}`}>
                      {statusMap[detailUser.status].text}
                    </Badge>
                  </InfoItem>
                  <InfoItem label="最后登录" value={detailUser.lastLoginAt} />
                  <InfoItem label="注册时间" value={detailUser.registerAt} />
                </div>

                {/* Resources */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">资源</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <ResourceCard label="钻石" value={detailUser.diamond} color="text-emerald-600 dark:text-emerald-400" />
                    <ResourceCard label="金币" value={detailUser.gold} color="text-amber-600 dark:text-amber-400" />
                    <ResourceCard label="体力" value={detailUser.stamina} color="text-rose-600 dark:text-rose-400" />
                    <ResourceCard label="战力" value={detailUser.power} color="text-purple-600 dark:text-purple-400" />
                  </div>
                </div>

                {/* Hero Collection */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">武将收藏</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <InfoItem label="武将总数" value={`${detailUser.heroCount} 个`} />
                    <InfoItem label="累计充值" value={`¥${detailUser.totalRecharge.toLocaleString()}`} />
                    <InfoItem label="累计钻石" value={detailUser.totalDiamond.toLocaleString()} mono />
                  </div>
                </div>

                {/* Battle Stats */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">战斗统计</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <InfoItem label="总战斗" value={`${detailUser.battleCount} 场`} />
                    <InfoItem label="胜场" value={`${detailUser.winCount} 场`} />
                    <InfoItem label="胜率" value={`${winRate(detailUser.winCount, detailUser.battleCount)}%`} />
                    <InfoItem label="城池" value={`${detailUser.cityCount} 座`} />
                  </div>
                </div>

                {/* Login History */}
                <div>
                  <h4 className="text-sm font-semibold mb-2">登录历史</h4>
                  <div className="rounded-md border p-3 text-sm space-y-2 bg-muted/30">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">最后登录 IP</span>
                      <span className="font-mono">{detailUser.lastLoginIp}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">最后登录时间</span>
                      <span>{detailUser.lastLoginAt}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">注册时间</span>
                      <span>{detailUser.registerAt}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Edit Resources Dialog ===== */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="sm:max-w-md">
          {editUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Gem className="h-4 w-4 text-emerald-600" />
                  修改资源
                </DialogTitle>
                <DialogDescription>
                  修改用户 {editUser.nickname} ({editUser.uid}) 的资源
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground bg-muted/30 rounded-md p-3">
                  <span>当前钻石: <b className="text-emerald-600">{editUser.diamond.toLocaleString()}</b></span>
                  <span>当前金币: <b className="text-amber-600">{editUser.gold.toLocaleString()}</b></span>
                  <span>当前体力: <b className="text-rose-600">{editUser.stamina}</b></span>
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">钻石 (增量，正数增加负数减少)</Label>
                    <Input
                      type="number"
                      placeholder="例: +10000 或 -5000"
                      value={editDiamond}
                      onChange={(e) => setEditDiamond(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">金币 (增量)</Label>
                    <Input
                      type="number"
                      placeholder="例: +100000"
                      value={editGold}
                      onChange={(e) => setEditGold(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">体力 (增量)</Label>
                    <Input
                      type="number"
                      placeholder="例: +50"
                      value={editStamina}
                      onChange={(e) => setEditStamina(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">
                      操作原因 <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      placeholder="请填写修改原因（必填）"
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setEditUser(null)}>取消</Button>
                <Button disabled={!editReason.trim()}>确认修改</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Ban / Unban AlertDialog ===== */}
      <AlertDialog open={!!banUser} onOpenChange={() => setBanUser(null)}>
        <AlertDialogContent>
          {banUser && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {banUser.status === 0 ? '解封用户' : '封禁用户'}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {banUser.status === 0
                    ? `确定要解封用户 ${banUser.nickname} (${banUser.uid}) 吗？解封后用户可正常登录游戏。`
                    : `确定要封禁用户 ${banUser.nickname} (${banUser.uid}) 吗？封禁后用户将无法登录游戏。`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  className={banUser.status === 0 ? '' : 'bg-red-600 hover:bg-red-700'}
                >
                  {banUser.status === 0 ? '确认解封' : '确认封禁'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ===== Sub-components =====

function InfoItem({ label, value, mono, children }: { label: string; value?: string; mono?: boolean; children?: React.ReactNode }) {
  return (
    <div className="rounded-md border p-2.5 bg-muted/20">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      {children ?? (
        <p className={`text-sm font-medium ${mono ? 'font-mono' : ''}`}>
          {value ?? '-'}
        </p>
      )}
    </div>
  )
}

function ResourceCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-md border p-2.5 bg-muted/20 text-center">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-base font-bold font-mono ${color}`}>{value.toLocaleString()}</p>
    </div>
  )
}
