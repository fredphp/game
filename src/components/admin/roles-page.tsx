'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  Plus, Pencil, Trash2, Shield, Users, Key, CheckCircle, XCircle,
  Lock, Eye,
} from 'lucide-react'
import { mockRoles, mockPermissions, mockAdminUser, type Role, type Permission } from '@/lib/admin-data'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// =================== Permission Module Grouping ===================
const permissionModules = [
  {
    label: '仪表盘',
    permissions: mockPermissions.filter((p) => p.parentId === 0 && p.code === 'dashboard'),
  },
  {
    label: '用户管理',
    permissions: mockPermissions.filter((p) => p.parentId === 0 && p.code === 'users'),
    children: mockPermissions.filter((p) => p.parentId === 2),
  },
  {
    label: '卡池管理',
    permissions: mockPermissions.filter((p) => p.parentId === 0 && p.code === 'card_pool'),
  },
  {
    label: '武将管理',
    permissions: mockPermissions.filter((p) => p.parentId === 0 && p.code === 'heroes'),
  },
  {
    label: '地图控制台',
    permissions: mockPermissions.filter((p) => p.parentId === 0 && p.code === 'map'),
  },
  {
    label: '联盟管理',
    permissions: mockPermissions.filter((p) => p.parentId === 0 && p.code === 'guilds'),
  },
  {
    label: '充值支付',
    permissions: mockPermissions.filter((p) => p.parentId === 0 && p.code === 'payment'),
  },
  {
    label: '数据统计',
    permissions: mockPermissions.filter((p) => p.parentId === 0 && p.code === 'analytics'),
  },
  {
    label: '日志系统',
    permissions: mockPermissions.filter((p) => p.parentId === 0 && p.code === 'logs'),
  },
  {
    label: '配置中心',
    permissions: mockPermissions.filter((p) => p.parentId === 0 && p.code === 'config'),
  },
  {
    label: '活动系统',
    permissions: mockPermissions.filter((p) => p.parentId === 0 && p.code === 'activities'),
  },
  {
    label: '角色权限',
    permissions: mockPermissions.filter((p) => p.parentId === 0 && p.code === 'roles'),
  },
]

// =================== Mock Admin Users ===================
const mockAdminUsers = [
  { id: 1, username: 'admin', realName: '张运维', email: 'admin@jiuzhou.com', status: 1, roles: ['超级管理员'], lastLoginAt: '2025-07-10 14:30:00' },
  { id: 2, username: 'ops_zhang', realName: '张运营', email: 'zhang@jiuzhou.com', status: 1, roles: ['运营管理员'], lastLoginAt: '2025-07-10 13:20:00' },
  { id: 3, username: 'ops_li', realName: '李运营', email: 'li@jiuzhou.com', status: 1, roles: ['运营管理员'], lastLoginAt: '2025-07-10 12:00:00' },
  { id: 4, username: 'cs_wang', realName: '王客服', email: 'wang@jiuzhou.com', status: 1, roles: ['客服'], lastLoginAt: '2025-07-10 11:00:00' },
  { id: 5, username: 'gm_zhao', realName: '赵策划', email: 'zhao@jiuzhou.com', status: 0, roles: ['游戏策划'], lastLoginAt: '2025-07-09 18:00:00' },
  { id: 6, username: 'data_chen', realName: '陈数据', email: 'chen@jiuzhou.com', status: 1, roles: ['数据分析师'], lastLoginAt: '2025-07-10 10:30:00' },
]

const permissionTypeMap: Record<string, { text: string; className: string }> = {
  menu: { text: '菜单', className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300' },
  button: { text: '按钮', className: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300' },
  api: { text: '接口', className: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-300' },
}

export default function RolesPage() {
  // --- Role Dialog State ---
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [roleName, setRoleName] = useState('')
  const [roleCode, setRoleCode] = useState('')
  const [roleDesc, setRoleDesc] = useState('')
  const [roleStatus, setRoleStatus] = useState(true)
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set())

  // --- Delete Confirmation ---
  const [deleteRole, setDeleteRole] = useState<Role | null>(null)

  // --- Permission Dialog State ---
  const [permDialogOpen, setPermDialogOpen] = useState(false)
  const [editingPerm, setEditingPerm] = useState<Permission | null>(null)
  const [permName, setPermName] = useState('')
  const [permCode, setPermCode] = useState('')
  const [permType, setPermType] = useState<'menu' | 'button' | 'api'>('button')
  const [permParent, setPermParent] = useState('0')

  // --- Delete Permission ---
  const [deletePerm, setDeletePerm] = useState<Permission | null>(null)

  const openCreateRole = () => {
    setEditingRole(null)
    setRoleName('')
    setRoleCode('')
    setRoleDesc('')
    setRoleStatus(true)
    setSelectedPermissions(new Set())
    setRoleDialogOpen(true)
  }

  const openEditRole = (role: Role) => {
    setEditingRole(role)
    setRoleName(role.name)
    setRoleCode(role.code)
    setRoleDesc(role.description)
    setRoleStatus(role.status === 1)
    setSelectedPermissions(new Set(role.permissions.map((p) => p.id)))
    setRoleDialogOpen(true)
  }

  const openCreatePerm = () => {
    setEditingPerm(null)
    setPermName('')
    setPermCode('')
    setPermType('button')
    setPermParent('0')
    setPermDialogOpen(true)
  }

  const openEditPerm = (perm: Permission) => {
    setEditingPerm(perm)
    setPermName(perm.name)
    setPermCode(perm.code)
    setPermType(perm.type)
    setPermParent(String(perm.parentId))
    setPermDialogOpen(true)
  }

  const togglePermission = (id: number) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Top-level permissions for parent selector
  const topLevelPerms = mockPermissions.filter((p) => p.parentId === 0 && p.type === 'menu')

  return (
    <div className="space-y-6">
      <Tabs defaultValue="roles">
        <TabsList>
          <TabsTrigger value="roles">角色管理</TabsTrigger>
          <TabsTrigger value="permissions">权限管理</TabsTrigger>
          <TabsTrigger value="admins">管理员列表</TabsTrigger>
        </TabsList>

        {/* ===== Roles Tab ===== */}
        <TabsContent value="roles" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              角色列表
            </h3>
            <Button size="sm" onClick={openCreateRole}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              创建角色
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockRoles.map((role) => (
              <Card key={role.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-sm">{role.name}</h4>
                        <Badge variant="outline" className="text-xs font-mono px-1.5 py-0">
                          {role.code}
                        </Badge>
                        <Badge variant={role.status === 1 ? 'default' : 'secondary'} className={`text-xs px-2 py-0.5 border ${role.status === 1 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300' : 'bg-stone-500/15 text-stone-600 border-stone-300'}`}>
                          {role.status === 1 ? '启用' : '禁用'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Key className="h-3 w-3" />
                          {role.permissions.length} 个权限
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {role.code === 'super_admin' ? 1 : role.code === 'ops_admin' ? 2 : role.code === 'customer_service' ? 1 : role.code === 'data_analyst' ? 1 : 1} 人
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditRole(role)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteRole(role)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ===== Permissions Tab ===== */}
        <TabsContent value="permissions" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-600" />
              权限列表
            </h3>
            <Button size="sm" onClick={openCreatePerm}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              添加权限
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[520px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">名称</TableHead>
                      <TableHead className="text-xs">编码</TableHead>
                      <TableHead className="text-xs">类型</TableHead>
                      <TableHead className="text-xs">父级</TableHead>
                      <TableHead className="text-xs">排序</TableHead>
                      <TableHead className="text-xs">状态</TableHead>
                      <TableHead className="text-xs text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockPermissions.map((perm) => {
                      const parent = mockPermissions.find((p) => p.id === perm.parentId)
                      const pt = permissionTypeMap[perm.type]
                      return (
                        <TableRow key={perm.id} className="text-sm">
                          <TableCell className="font-medium whitespace-nowrap">{perm.name}</TableCell>
                          <TableCell className="font-mono text-xs whitespace-nowrap">{perm.code}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="outline" className={`text-xs px-2 py-0.5 border ${pt.className}`}>
                              {pt.text}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {parent ? parent.name : '无'}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{perm.sort}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            <Badge variant="outline" className={`text-xs px-2 py-0.5 border ${perm.status === 1 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300' : 'bg-stone-500/15 text-stone-600 border-stone-300'}`}>
                              {perm.status === 1 ? '启用' : '禁用'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditPerm(perm)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeletePerm(perm)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== Admin Users Tab ===== */}
        <TabsContent value="admins" className="space-y-4">
          <h3 className="text-base font-semibold flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600" />
            管理员列表
          </h3>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">用户名</TableHead>
                      <TableHead className="text-xs">姓名</TableHead>
                      <TableHead className="text-xs">邮箱</TableHead>
                      <TableHead className="text-xs">分配角色</TableHead>
                      <TableHead className="text-xs">状态</TableHead>
                      <TableHead className="text-xs">最后登录</TableHead>
                      <TableHead className="text-xs text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockAdminUsers.map((admin) => (
                      <TableRow key={admin.id} className="text-sm">
                        <TableCell className="font-mono text-xs whitespace-nowrap">{admin.username}</TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{admin.realName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{admin.email}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {admin.roles.map((r) => (
                              <Badge key={r} variant="outline" className="text-xs px-1.5 py-0 border-emerald-300 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Badge variant="outline" className={`text-xs px-2 py-0.5 border ${admin.status === 1 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300' : 'bg-stone-500/15 text-stone-600 border-stone-300'}`}>
                            {admin.status === 1 ? '正常' : '禁用'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{admin.lastLoginAt}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="分配角色">
                              <Shield className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-7 w-7 p-0 ${admin.status === 1 ? 'text-red-500' : 'text-emerald-600'}`}
                              title={admin.status === 1 ? '禁用' : '启用'}
                            >
                              {admin.status === 1 ? <XCircle className="h-3.5 w-3.5" /> : <CheckCircle className="h-3.5 w-3.5" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ===== Create/Edit Role Dialog ===== */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-emerald-600" />
              {editingRole ? '编辑角色' : '创建角色'}
            </DialogTitle>
            <DialogDescription>{editingRole ? '修改角色信息和权限' : '创建新的系统角色'}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">角色名称 <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="例: 运营管理员"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">角色编码 <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="例: ops_admin"
                  value={roleCode}
                  onChange={(e) => setRoleCode(e.target.value)}
                  disabled={!!editingRole}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">角色描述</Label>
              <Textarea
                placeholder="角色职责描述..."
                value={roleDesc}
                onChange={(e) => setRoleDesc(e.target.value)}
                rows={2}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={roleStatus} onCheckedChange={setRoleStatus} />
              <Label className="text-xs">{roleStatus ? '启用' : '禁用'}</Label>
            </div>

            {/* Permission Tree */}
            <div>
              <Label className="text-xs font-semibold mb-2 block">权限配置</Label>
              <div className="border rounded-lg p-4 space-y-4 max-h-[300px] overflow-y-auto bg-muted/20">
                {permissionModules.map((mod) => (
                  <div key={mod.label}>
                    <div className="flex items-center gap-2 mb-1">
                      <Checkbox
                        checked={mod.permissions.some((p) => selectedPermissions.has(p.id))}
                        onCheckedChange={() => {
                          const allIds = [
                            ...mod.permissions.map((p) => p.id),
                            ...(mod.children?.map((p) => p.id) ?? []),
                          ]
                          const allChecked = allIds.every((id) => selectedPermissions.has(id))
                          setSelectedPermissions((prev) => {
                            const next = new Set(prev)
                            if (allChecked) allIds.forEach((id) => next.delete(id))
                            else allIds.forEach((id) => next.add(id))
                            return next
                          })
                        }}
                      />
                      <span className="text-sm font-medium">{mod.label}</span>
                      <span className="text-xs text-muted-foreground">
                        ({mod.permissions.length + (mod.children?.length ?? 0)})
                      </span>
                    </div>
                    {mod.children && mod.children.length > 0 && (
                      <div className="ml-6 space-y-1">
                        {mod.children.map((child) => (
                          <div key={child.id} className="flex items-center gap-2">
                            <Checkbox
                              checked={selectedPermissions.has(child.id)}
                              onCheckedChange={() => togglePermission(child.id)}
                            />
                            <span className="text-xs text-muted-foreground">{child.name}</span>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${permissionTypeMap[child.type].className}`}>
                              {permissionTypeMap[child.type].text}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                已选择 {selectedPermissions.size} 个权限
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleDialogOpen(false)}>取消</Button>
            <Button disabled={!roleName.trim() || !roleCode.trim()}>
              {editingRole ? '保存修改' : '创建角色'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Role AlertDialog ===== */}
      <AlertDialog open={!!deleteRole} onOpenChange={() => setDeleteRole(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除角色</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除角色「{deleteRole?.name}」({deleteRole?.code}) 吗？此操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ===== Add/Edit Permission Dialog ===== */}
      <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-4 w-4 text-emerald-600" />
              {editingPerm ? '编辑权限' : '添加权限'}
            </DialogTitle>
            <DialogDescription>{editingPerm ? '修改权限信息' : '创建新的权限项'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">权限名称 <span className="text-red-500">*</span></Label>
              <Input placeholder="例: 用户列表" value={permName} onChange={(e) => setPermName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">权限编码 <span className="text-red-500">*</span></Label>
              <Input placeholder="例: users:list" value={permCode} onChange={(e) => setPermCode(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">类型</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={permType}
                  onChange={(e) => setPermType(e.target.value as 'menu' | 'button' | 'api')}
                >
                  <option value="menu">菜单</option>
                  <option value="button">按钮</option>
                  <option value="api">接口</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">父级权限</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  value={permParent}
                  onChange={(e) => setPermParent(e.target.value)}
                >
                  <option value="0">无 (顶级)</option>
                  {topLevelPerms.map((p) => (
                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermDialogOpen(false)}>取消</Button>
            <Button disabled={!permName.trim() || !permCode.trim()}>
              {editingPerm ? '保存' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Delete Permission AlertDialog ===== */}
      <AlertDialog open={!!deletePerm} onOpenChange={() => setDeletePerm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除权限</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除权限「{deletePerm?.name}」({deletePerm?.code}) 吗？
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700">确认删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
