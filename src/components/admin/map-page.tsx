'use client'

import { useState, useMemo } from 'react'
import {
  RotateCcw, MapPin, Swords, Shield, Users, Mountain, Castle,
  Clock, X, ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { mockCities, mockMarches, type City, type MarchQueue } from '@/lib/admin-data'

// --- Helpers ---
const factionColors: Record<string, string> = {
  '魏国': 'border-sky-400 bg-sky-500/10',
  '蜀国': 'border-emerald-400 bg-emerald-500/10',
  '吴国': 'border-red-400 bg-red-500/10',
  '群雄': 'border-amber-400 bg-amber-500/10',
  '中立': 'border-stone-300 bg-stone-100',
}

const levelColors: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: 'bg-stone-100', text: 'text-stone-600', border: 'border-stone-300' },
  2: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-300' },
  3: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  4: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  5: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
}

const levelStars = (level: number) => '★'.repeat(level) + '☆'.repeat(5 - level)

const statusStyles: Record<string, string> = {
  marching: 'bg-amber-500/10 text-amber-600 border-amber-300',
  arrived: 'bg-emerald-500/10 text-emerald-600 border-emerald-300',
  returning: 'bg-sky-500/10 text-sky-600 border-sky-300',
  cancelled: 'bg-stone-500/10 text-stone-500 border-stone-300',
}

const statusLabels: Record<string, string> = {
  marching: '行军中',
  arrived: '已到达',
  returning: '返回中',
  cancelled: '已取消',
}

// --- City Cell ---
function CityCell({ city, onClick }: { city: City; onClick: () => void }) {
  const lc = levelColors[city.level] || levelColors[1]
  const fc = factionColors[city.faction] || factionColors['中立']

  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center p-1.5 rounded-lg border transition-all hover:shadow-md hover:scale-[1.03] active:scale-[0.98] min-h-[72px] ${fc}`}
    >
      {/* Level indicator */}
      <Badge variant="outline" className={`absolute top-1 right-1 text-[9px] h-4 px-1 ${lc.bg} ${lc.text} ${lc.border}`}>
        Lv.{city.level}
      </Badge>

      {/* Faction dot */}
      <div className={`w-2 h-2 rounded-full mb-1 ${
        city.faction === '魏国' ? 'bg-sky-500' :
        city.faction === '蜀国' ? 'bg-emerald-500' :
        city.faction === '吴国' ? 'bg-red-500' :
        city.faction === '群雄' ? 'bg-amber-500' : 'bg-stone-400'
      }`} />

      {/* City name */}
      <span className="text-xs font-bold leading-tight text-center">{city.name}</span>

      {/* Stars */}
      <span className={`text-[8px] leading-none mt-0.5 ${lc.text}`}>{levelStars(city.level)}</span>

      {/* Owner indicator */}
      {city.ownerName !== '无' && (
        <span className="text-[8px] text-muted-foreground truncate max-w-[60px]">
          {city.ownerName}
        </span>
      )}
    </button>
  )
}

// --- City Detail Panel ---
function CityDetailPanel({
  city, onClose,
}: {
  city: City
  onClose: () => void
}) {
  const [action, setAction] = useState<string | null>(null)

  return (
    <Dialog open={!!city} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-500" />
            {city.name}
            <Badge variant="outline" className={
              levelColors[city.level]
                ? `${levelColors[city.level].bg} ${levelColors[city.level].text} ${levelColors[city.level].border}`
                : ''
            }>
              Lv.{city.level}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {city.faction} · 坐标 ({city.x}, {city.y})
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4">
            {/* Faction */}
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={factionColors[city.faction] || ''}>
                {city.faction}
              </Badge>
            </div>

            {/* Owner & Guild */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-muted/30">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">城主</p>
                  <p className="text-sm font-semibold mt-0.5">{city.ownerName}</p>
                </CardContent>
              </Card>
              <Card className="bg-muted/30">
                <CardContent className="p-3">
                  <p className="text-xs text-muted-foreground">联盟</p>
                  <p className="text-sm font-semibold mt-0.5">{city.guildName}</p>
                </CardContent>
              </Card>
            </div>

            {/* Resources & Defense */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: '资源类型', value: city.resourceType, icon: Mountain, color: 'text-emerald-600' },
                { label: '资源等级', value: `${city.resourceLevel}级`, icon: Castle, color: 'text-amber-600' },
                { label: '城防值', value: city.defense.toLocaleString(), icon: Shield, color: 'text-sky-600' },
                { label: '驻军数', value: city.garrison.toLocaleString(), icon: Users, color: 'text-purple-600' },
              ].map((item) => (
                <Card key={item.label} className="bg-muted/30">
                  <CardContent className="p-3 text-center">
                    <item.icon className={`w-4 h-4 mx-auto ${item.color}`} />
                    <p className="text-[10px] text-muted-foreground mt-1">{item.label}</p>
                    <p className={`text-sm font-bold font-mono mt-0.5 ${item.color}`}>{item.value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator />

            {/* Actions */}
            <div>
              <Label className="text-xs font-semibold mb-2 block">管理操作</Label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '更换城主', key: 'owner' },
                  { label: '修改资源', key: 'resource' },
                  { label: '调整等级', key: 'level' },
                ].map((a) => (
                  <Button
                    key={a.key}
                    variant={action === a.key ? 'default' : 'outline'}
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setAction(action === a.key ? null : a.key)}
                  >
                    {a.label}
                  </Button>
                ))}
              </div>
              {action && (
                <Card className="mt-3 bg-muted/30">
                  <CardContent className="p-3 space-y-2">
                    {action === 'owner' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">新城主ID</Label>
                        <Input placeholder="输入玩家ID" className="h-8 text-sm" />
                      </div>
                    )}
                    {action === 'resource' && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1.5">
                          <Label className="text-xs">资源类型</Label>
                          <Select defaultValue={city.resourceType}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="粮食">粮食</SelectItem>
                              <SelectItem value="木材">木材</SelectItem>
                              <SelectItem value="铁矿">铁矿</SelectItem>
                              <SelectItem value="金币">金币</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">资源等级</Label>
                          <Input type="number" defaultValue={city.resourceLevel} min={1} max={5} className="h-8 text-sm font-mono" />
                        </div>
                      </div>
                    )}
                    {action === 'level' && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">城池等级</Label>
                        <Select defaultValue={city.level.toString()}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5].map((l) => (
                              <SelectItem key={l} value={l.toString()}>Lv.{l} {levelStars(l)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <Button size="sm" className="w-full h-7 text-xs" onClick={() => setAction(null)}>确认修改</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

// --- Main Component ---
export default function MapPage() {
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [marches] = useState<MarchQueue[]>(mockMarches)

  // Build 6x6 grid
  const cityGrid = useMemo(() => {
    const grid: (City | null)[][] = []
    for (let row = 0; row < 6; row++) {
      const rowArr: (City | null)[] = []
      for (let col = 0; col < 6; col++) {
        const city = mockCities.find((c) => c.x === col * 100 + 50 && c.y === row * 100 + 50)
        rowArr.push(city || null)
      }
      grid.push(rowArr)
    }
    return grid
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">地图控制台</h2>
        <p className="text-sm text-muted-foreground mt-1">查看九州地图、管理城池和行军队列</p>
      </div>

      {/* Map Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-amber-300 text-amber-600 bg-amber-500/5 gap-1">
                <Clock className="w-3 h-3" /> 赛季 S3
              </Badge>
              <Badge variant="outline" className="border-emerald-300 text-emerald-600 bg-emerald-500/5">
                剩余 28 天
              </Badge>
              <span className="text-xs text-muted-foreground">城池 36/36</span>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> 重置地图
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认重置地图?</AlertDialogTitle>
                  <AlertDialogDescription>
                    此操作将重置所有城池归属、清空行军队列，且无法撤销。建议先备份数据。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>取消</AlertDialogCancel>
                  <AlertDialogAction className="bg-red-500 hover:bg-red-600">确认重置</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Map Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-500" />
            九州地图
          </CardTitle>
          <CardDescription className="text-xs">点击城池查看详情 · 颜色代表阵营归属 · 星级代表城池等级</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 mb-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-500" /> 魏</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> 蜀</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> 吴</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 群</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-stone-400" /> 中立</span>
            <Separator orientation="vertical" className="h-3" />
            <span>★ 等级 1~5</span>
          </div>

          {/* 6x6 Grid */}
          <div className="grid grid-cols-6 gap-1.5 sm:gap-2">
            {cityGrid.map((row, rowIdx) =>
              row.map((city, colIdx) =>
                city ? (
                  <CityCell
                    key={city.id}
                    city={city}
                    onClick={() => setSelectedCity(city)}
                  />
                ) : (
                  <div key={`empty-${rowIdx}-${colIdx}`} className="min-h-[72px] rounded-lg border border-dashed border-stone-200 bg-stone-50/50" />
                )
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* March Queue */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-500" />
            行军队列
            <Badge variant="secondary" className="text-xs">{marches.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>玩家</TableHead>
                  <TableHead>出发 → 目标</TableHead>
                  <TableHead className="text-right">兵力</TableHead>
                  <TableHead>武将</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>到达时间</TableHead>
                  <TableHead className="text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marches.map((march) => (
                  <TableRow key={march.id}>
                    <TableCell className="text-xs font-medium">{march.userName}</TableCell>
                    <TableCell className="text-xs">
                      <span className="flex items-center gap-1">
                        {march.fromCityName}
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                        {march.toCityName}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{march.troops.toLocaleString()}</TableCell>
                    <TableCell className="text-xs">{march.heroName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusStyles[march.status]}>
                        {statusLabels[march.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">{march.arriveTime}</TableCell>
                    <TableCell className="text-center">
                      {march.status === 'marching' && (
                        <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-50">
                          取消行军
                        </Button>
                      )}
                      {march.status !== 'marching' && (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* City Detail */}
      {selectedCity && (
        <CityDetailPanel
          city={selectedCity}
          onClose={() => setSelectedCity(null)}
        />
      )}
    </div>
  )
}
