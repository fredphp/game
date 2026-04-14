'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Settings, Save, RotateCcw, Search, Edit, Clock, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import { mockConfigs, ConfigItem } from '@/lib/admin-data'

const groupColors: Record<string, { accent: string; bg: string; text: string }> = {
  '抽卡': { accent: 'border-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-700 dark:text-amber-400' },
  '地图': { accent: 'border-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/20', text: 'text-emerald-700 dark:text-emerald-400' },
  '战斗': { accent: 'border-sky-300', bg: 'bg-sky-50 dark:bg-sky-950/20', text: 'text-sky-700 dark:text-sky-400' },
  '全局': { accent: 'border-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/20', text: 'text-purple-700 dark:text-purple-400' },
  '活动': { accent: 'border-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/20', text: 'text-rose-700 dark:text-rose-400' },
  '支付': { accent: 'border-orange-300', bg: 'bg-orange-50 dark:bg-orange-950/20', text: 'text-orange-700 dark:text-orange-400' },
  'VIP': { accent: 'border-yellow-300', bg: 'bg-yellow-50 dark:bg-yellow-950/20', text: 'text-yellow-700 dark:text-yellow-400' },
  '联盟': { accent: 'border-teal-300', bg: 'bg-teal-50 dark:bg-teal-950/20', text: 'text-teal-700 dark:text-teal-400' },
}

export default function ConfigPage() {
  const [configs, setConfigs] = useState<ConfigItem[]>(mockConfigs)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(Object.keys(groupColors)))
  const [jsonDialogKey, setJsonDialogKey] = useState<string | null>(null)
  const [jsonValue, setJsonValue] = useState('')

  const filteredConfigs = useMemo(() => {
    if (!searchTerm) return configs
    return configs.filter(c =>
      c.name.includes(searchTerm) ||
      c.key.includes(searchTerm) ||
      c.group.includes(searchTerm) ||
      c.description.includes(searchTerm)
    )
  }, [configs, searchTerm])

  const groupedConfigs = useMemo(() => {
    const groups: Record<string, ConfigItem[]> = {}
    filteredConfigs.forEach(c => {
      if (!groups[c.group]) groups[c.group] = []
      groups[c.group].push(c)
    })
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [filteredConfigs])

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  const startEdit = (config: ConfigItem) => {
    setEditingId(config.id)
    setEditValue(config.value)
  }

  const saveEdit = (id: number) => {
    setConfigs(prev => prev.map(c => c.id === id ? { ...c, value: editValue, updatedAt: new Date().toLocaleString(), updatedBy: 'admin' } : c))
    setEditingId(null)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const formatJsonValue = (value: string) => {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }

  const renderValue = (config: ConfigItem) => {
    if (editingId === config.id) {
      return (
        <div className="flex items-center gap-2">
          {config.type === 'boolean' ? (
            <Switch checked={editValue === 'true'} onCheckedChange={checked => setEditValue(String(checked))} />
          ) : config.type === 'json' ? (
            <Button size="sm" variant="outline" onClick={() => { setJsonDialogKey(config.key); setJsonValue(formatJsonValue(config.value)) }}>
              <Edit className="w-3 h-3 mr-1" />编辑JSON
            </Button>
          ) : config.type === 'number' ? (
            <Input type="number" value={editValue} onChange={e => setEditValue(e.target.value)} className="h-8 w-32 text-sm" />
          ) : (
            <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-8 w-48 text-sm" />
          )}
          <Button size="sm" variant="default" className="h-8" onClick={() => saveEdit(config.id)}><Save className="w-3 h-3 mr-1" />保存</Button>
          <Button size="sm" variant="ghost" className="h-8" onClick={cancelEdit}>取消</Button>
        </div>
      )
    }

    if (config.type === 'boolean') {
      return (
        <div className="flex items-center gap-2">
          <Switch checked={config.value === 'true'} disabled />
          <Badge variant="outline" className={`text-xs ${config.value === 'true' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300' : 'bg-stone-100 text-stone-700 dark:bg-stone-950 dark:text-stone-300 border-stone-300'}`}>
            {config.value === 'true' ? '开启' : '关闭'}
          </Badge>
        </div>
      )
    }

    if (config.type === 'json') {
      return (
        <div className="flex items-center gap-2">
          <code className="text-xs bg-muted px-2 py-1 rounded max-w-[200px] truncate">{config.value}</code>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setJsonDialogKey(config.key); setJsonValue(formatJsonValue(config.value)) }}>查看</Button>
        </div>
      )
    }

    return (
      <div className="flex items-center gap-2">
        <code className="text-sm font-semibold">{config.value}</code>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1 h-8 rounded-full bg-gradient-to-b from-purple-500 to-violet-600" />
          <div>
            <h2 className="text-2xl font-bold">配置中心</h2>
            <p className="text-sm text-muted-foreground">全局配置管理 · 活动开关 · 参数调整</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{configs.length} 个配置项</Badge>
          <Badge variant="outline" className="text-xs">{Object.keys(groupColors).length} 个分组</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="搜索配置名/Key/分组/描述..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <Button variant="outline" onClick={() => setSearchTerm('')}><RotateCcw className="w-4 h-4 mr-1" />重置</Button>
          </div>
        </CardContent>
      </Card>

      {groupedConfigs.map(([group, items]) => {
        const colors = groupColors[group] || { accent: 'border-gray-300', bg: 'bg-gray-50', text: 'text-gray-700' }
        const isExpanded = expandedGroups.has(group)

        return (
          <Card key={group} className={`border ${colors.accent} ${isExpanded ? colors.bg : ''} transition-colors`}>
            <CardHeader
              className="pb-3 cursor-pointer hover:bg-muted/30 rounded-t-lg -mx-6 -mt-6 px-6 transition-colors"
              onClick={() => toggleGroup(group)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  <CardTitle className={`text-sm font-semibold ${colors.text}`}>{group}</CardTitle>
                  <Badge variant="outline" className="text-xs">{items.length}</Badge>
                </div>
                <Settings className={`w-4 h-4 ${colors.text} opacity-50`} />
              </div>
            </CardHeader>
            {isExpanded && (
              <CardContent className="pt-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[200px]">配置Key</TableHead>
                      <TableHead className="w-[120px]">名称</TableHead>
                      <TableHead className="w-[140px]">当前值</TableHead>
                      <TableHead className="w-[80px]">类型</TableHead>
                      <TableHead className="hidden md:table-cell">描述</TableHead>
                      <TableHead className="hidden lg:table-cell w-[180px]">更新信息</TableHead>
                      <TableHead className="w-[80px]">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(config => (
                      <TableRow key={config.id}>
                        <TableCell><code className="text-xs font-mono bg-muted/50 px-1.5 py-0.5 rounded">{config.key}</code></TableCell>
                        <TableCell className="font-medium text-sm">{config.name}</TableCell>
                        <TableCell>{renderValue(config)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {config.type === 'boolean' ? '开关' : config.type === 'json' ? 'JSON' : config.type === 'number' ? '数值' : '字符串'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{config.description}</TableCell>
                        <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                          <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{config.updatedAt}</div>
                          <div className="text-xs">{config.updatedBy}</div>
                        </TableCell>
                        <TableCell>
                          {editingId !== config.id && (
                            <Button size="sm" variant="ghost" className="h-7" onClick={() => startEdit(config)}>
                              <Edit className="w-3 h-3" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            )}
          </Card>
        )
      })}

      {/* JSON Editor Dialog */}
      <Dialog open={!!jsonDialogKey} onOpenChange={() => setJsonDialogKey(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑 JSON 配置</DialogTitle>
            <DialogDescription>{jsonDialogKey}</DialogDescription>
          </DialogHeader>
          <Textarea
            value={jsonValue}
            onChange={e => setJsonValue(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
            placeholder="输入有效的JSON..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setJsonDialogKey(null)}>取消</Button>
            <Button onClick={() => {
              try {
                JSON.parse(jsonValue)
                setConfigs(prev => prev.map(c => c.key === jsonDialogKey ? { ...c, value: jsonValue.replace(/\n/g, ''), updatedAt: new Date().toLocaleString(), updatedBy: 'admin' } : c))
                setJsonDialogKey(null)
              } catch {
                alert('JSON格式错误，请检查')
              }
            }}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            最近配置变更记录
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              { time: '2025-07-10 14:30:22', operator: 'admin', key: 'gacha.ssr_base_rate', old: '1.8', new: '2.0' },
              { time: '2025-07-10 11:15:08', operator: 'ops_zhang', key: 'map.march_speed', old: '1.0', new: '1.5' },
              { time: '2025-07-08 15:42:33', operator: 'admin', key: 'global.server_maintenance', old: 'false', new: 'true' },
              { time: '2025-07-08 15:50:01', operator: 'admin', key: 'global.server_maintenance', old: 'true', new: 'false' },
              { time: '2025-07-05 09:20:15', operator: 'gm_zhao', key: 'battle.exp_bonus', old: '1.0', new: '2.0' },
            ].map((log, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 text-sm">
                <span className="text-xs font-mono text-muted-foreground w-[160px] flex-shrink-0">{log.time}</span>
                <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{log.operator}</code>
                <code className="text-xs font-mono">{log.key}</code>
                <span className="text-red-500 line-through">{log.old}</span>
                <span className="text-muted-foreground">→</span>
                <span className="text-emerald-600 font-medium">{log.new}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
