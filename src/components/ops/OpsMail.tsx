"use client"

import React, { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Mail,
  MailOpen,
  Gift,
  Send,
  Trash2,
  Plus,
  RefreshCw,
  CheckCheck,
  Clock,
  Shield,
  Trophy,
  Heart,
  Crown,
  Bell,
  Eye,
  Pencil,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Label } from "@/components/ui/label"

// ─── Types ───────────────────────────────────────────────────────────────────

interface MailAttachment {
  itemId: number
  itemName: string
  count: number
  [key: string]: unknown
}

interface Mail {
  id: number
  mailUid: string
  senderType: "system" | "gm" | "guild" | "personal"
  senderId: number
  senderName: string
  receiverId: number
  category: "system" | "reward" | "activity" | "notification" | "social" | "guild"
  title: string
  content: string
  attachments: string // JSON string
  isRead: boolean
  isClaimed: boolean
  isDeleted: boolean
  expireAt: string | null
  createdAt: string
  updatedAt: string
}

interface MailStats {
  total: number
  unread: number
  rewardPending: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  Mail["category"],
  { label: string; color: string; bg: string; border: string; icon: React.ElementType }
> = {
  system: {
    label: "系统",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    border: "border-sky-400/30",
    icon: Shield,
  },
  reward: {
    label: "奖励",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/30",
    icon: Trophy,
  },
  activity: {
    label: "活动",
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/30",
    icon: Heart,
  },
  notification: {
    label: "通知",
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    border: "border-slate-400/30",
    icon: Bell,
  },
  social: {
    label: "社交",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    border: "border-pink-400/30",
    icon: Users,
  },
  guild: {
    label: "联盟",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/30",
    icon: Crown,
  },
}

const SENDER_TYPE_LABELS: Record<Mail["senderType"], string> = {
  system: "系统",
  gm: "GM",
  guild: "联盟",
  personal: "个人",
}

const CATEGORY_TABS = [
  { key: "all", label: "全部" },
  { key: "system", label: "系统" },
  { key: "reward", label: "奖励" },
  { key: "activity", label: "活动" },
  { key: "notification", label: "通知" },
  { key: "social", label: "社交" },
  { key: "guild", label: "联盟" },
] as const

type CategoryFilter = (typeof CATEGORY_TABS)[number]["key"]
type ReadFilter = "all" | "unread" | "read"

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${Math.max(1, diffMins)}分钟前`
  const diffHours = Math.floor(diffMs / 3600000)
  if (diffHours < 24) return `${diffHours}小时前`
  const diffDays = Math.floor(diffMs / 86400000)
  if (diffDays < 30) return `${diffDays}天前`
  return date.toLocaleDateString("zh-CN")
}

function parseAttachments(jsonStr: string): MailAttachment[] {
  try {
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed)) return parsed
    return []
  } catch {
    return []
  }
}

function truncate(str: string, max: number): string {
  if (str.length <= max) return str
  return str.slice(0, max) + "..."
}

function formatExpireDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function OpsMail() {
  // ── State ──
  const [mails, setMails] = useState<Mail[]>([])
  const [stats, setStats] = useState<MailStats>({ total: 0, unread: 0, rewardPending: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all")
  const [readFilter, setReadFilter] = useState<ReadFilter>("all")

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  const [composeOpen, setComposeOpen] = useState(false)
  const [detailMail, setDetailMail] = useState<Mail | null>(null)

  const [composeForm, setComposeForm] = useState({
    receiverIds: "",
    title: "",
    content: "",
    category: "system" as Mail["category"],
    senderType: "gm" as Mail["senderType"],
    senderName: "GM管理员",
    attachments: "[]",
    expireAt: "",
  })
  const [sending, setSending] = useState(false)

  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())

  // ── Data Fetching ──

  const fetchMails = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const [mailRes, statsRes] = await Promise.all([
        fetch("/api/ops/mail?userId=10001"),
        fetch("/api/ops/mail?stats=true&userId=10001"),
      ])

      const mailData = await mailRes.json()
      const statsData = await statsRes.json()

      if (mailData.success) setMails(mailData.data)
      if (statsData.success) setStats(statsData.data)
    } catch (err) {
      console.error("Failed to fetch mails:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchMails()
  }, [fetchMails])

  // ── Actions ──

  async function markRead(mailId: number) {
    const key = `read-${mailId}`
    setActionLoading((prev) => new Set(prev).add(key))
    try {
      await fetch("/api/ops/mail", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", mailId }),
      })
      setMails((prev) =>
        prev.map((m) => (m.id === mailId ? { ...m, isRead: true } : m))
      )
      setStats((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }))
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  async function batchRead() {
    if (selectedIds.size === 0) return
    const ids = Array.from(selectedIds)
    setActionLoading((prev) => new Set(prev).add("batch-read"))
    try {
      await fetch("/api/ops/mail", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "batch_read", mailIds: ids }),
      })
      setMails((prev) =>
        prev.map((m) => (ids.includes(m.id) ? { ...m, isRead: true } : m))
      )
      const unreadCount = ids.filter(
        (id) => mails.find((m) => m.id === id)?.isRead === false
      ).length
      setStats((prev) => ({
        ...prev,
        unread: Math.max(0, prev.unread - unreadCount),
      }))
      setSelectedIds(new Set())
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev)
        next.delete("batch-read")
        return next
      })
    }
  }

  async function claimReward(mailId: number) {
    const key = `claim-${mailId}`
    setActionLoading((prev) => new Set(prev).add(key))
    try {
      await fetch("/api/ops/mail", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "claim", mailId }),
      })
      setMails((prev) =>
        prev.map((m) => (m.id === mailId ? { ...m, isClaimed: true } : m))
      )
      setStats((prev) => ({ ...prev, rewardPending: Math.max(0, prev.rewardPending - 1) }))
      if (detailMail?.id === mailId) {
        setDetailMail((prev) => (prev ? { ...prev, isClaimed: true } : null))
      }
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  async function deleteMails(ids: number[]) {
    if (ids.length === 0) return
    const key = "delete"
    setActionLoading((prev) => new Set(prev).add(key))
    try {
      await fetch("/api/ops/mail", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "soft_delete", mailIds: ids }),
      })
      setMails((prev) => prev.filter((m) => !ids.includes(m.id)))
      const deletingUnread = ids.filter(
        (id) => mails.find((m) => m.id === id)?.isRead === false
      ).length
      const deletingPending = ids.filter(
        (id) => {
          const m = mails.find((m2) => m2.id === id)
          return m && m.category === "reward" && !m.isClaimed
        }
      ).length
      setStats((prev) => ({
        ...prev,
        total: Math.max(0, prev.total - ids.length),
        unread: Math.max(0, prev.unread - deletingUnread),
        rewardPending: Math.max(0, prev.rewardPending - deletingPending),
      }))
      setSelectedIds(new Set())
      if (detailMail && ids.includes(detailMail.id)) {
        setDetailMail(null)
      }
    } finally {
      setActionLoading((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  async function sendMail() {
    const { receiverIds, title, content, category, senderType, senderName, attachments, expireAt } =
      composeForm

    if (!receiverIds.trim() || !title.trim() || !content.trim()) return

    const ids = receiverIds
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !isNaN(n))

    if (ids.length === 0) return

    setSending(true)
    try {
      const res = await fetch("/api/ops/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverIds: ids,
          title,
          content,
          category,
          senderType,
          senderName: senderName || SENDER_TYPE_LABELS[senderType],
          senderId: 0,
          attachments,
          expireAt: expireAt || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setComposeOpen(false)
        setComposeForm({
          receiverIds: "",
          title: "",
          content: "",
          category: "system",
          senderType: "gm",
          senderName: "GM管理员",
          attachments: "[]",
          expireAt: "",
        })
        fetchMails()
      }
    } finally {
      setSending(false)
    }
  }

  // ── Selection ──

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    const visibleIds = filteredMails.map((m) => m.id)
    if (visibleIds.every((id) => selectedIds.has(id))) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(visibleIds))
    }
  }

  // ── Computed ──

  const filteredMails = mails.filter((m) => {
    if (categoryFilter !== "all" && m.category !== categoryFilter) return false
    if (readFilter === "unread" && m.isRead) return false
    if (readFilter === "read" && !m.isRead) return false
    return true
  })

  const allVisibleSelected =
    filteredMails.length > 0 && filteredMails.every((m) => selectedIds.has(m.id))

  const hasAttachments = (m: Mail) => {
    const atts = parseAttachments(m.attachments)
    return atts.length > 0
  }

  const isRewardClaimable = (m: Mail) =>
    m.category === "reward" && hasAttachments(m) && !m.isClaimed

  // ── Render ──

  return (
    <div className="min-h-screen bg-[#0f1117] p-4 md:p-6">
      {/* ─── Header ─── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-500/10">
            <Mail className="h-5 w-5 text-sky-400" />
          </div>
          <h1 className="text-xl font-bold text-white md:text-2xl">邮件管理</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchMails(true)}
            disabled={refreshing}
            className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", refreshing && "animate-spin")} />
            刷新
          </Button>
          <Button
            size="sm"
            onClick={() => setComposeOpen(true)}
            className="bg-sky-600 text-white hover:bg-sky-700"
          >
            <Plus className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">撰写邮件</span>
            <span className="sm:hidden">撰写</span>
          </Button>
        </div>
      </motion.div>

      {/* ─── Stats Bar ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mb-6 grid grid-cols-3 gap-3 md:gap-4"
      >
        <StatCard
          icon={<Mail className="h-4 w-4 text-sky-400" />}
          label="全部邮件"
          value={stats.total}
          iconBg="bg-sky-400/10"
        />
        <StatCard
          icon={<MailOpen className="h-4 w-4 text-blue-400" />}
          label="未读邮件"
          value={stats.unread}
          iconBg="bg-blue-400/10"
          highlight={stats.unread > 0}
        />
        <StatCard
          icon={<Gift className="h-4 w-4 text-amber-400" />}
          label="待领奖励"
          value={stats.rewardPending}
          iconBg="bg-amber-400/10"
          highlight={stats.rewardPending > 0}
        />
      </motion.div>

      {/* ─── Filters ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="mb-4 flex flex-col gap-3"
      >
        {/* Category Tabs */}
        <div className="flex gap-1 overflow-x-auto rounded-lg bg-slate-900/80 p-1 scrollbar-thin">
          {CATEGORY_TABS.map((tab) => {
            const catKey = tab.key === "all" ? null : CATEGORY_CONFIG[tab.key as Mail["category"]]
            return (
              <button
                key={tab.key}
                onClick={() => setCategoryFilter(tab.key)}
                className={cn(
                  "relative flex-shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition-colors md:text-sm",
                  categoryFilter === tab.key
                    ? catKey
                      ? `${catKey.bg} ${catKey.color}`
                      : "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
                )}
              >
                {tab.label}
                {categoryFilter === tab.key && (
                  <motion.div
                    layoutId="category-indicator"
                    className="absolute inset-0 rounded-md ring-1 ring-inset ring-white/20"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Read Status Filter + Batch Actions */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1">
            {([
              { key: "all", label: "全部状态" },
              { key: "unread", label: "未读" },
              { key: "read", label: "已读" },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setReadFilter(f.key)}
                className={cn(
                  "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  readFilter === f.key
                    ? "bg-white/10 text-white"
                    : "text-slate-400 hover:bg-white/5 hover:text-slate-300"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Batch Actions */}
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex items-center gap-2"
            >
              <span className="text-xs text-slate-400">
                已选 {selectedIds.size} 封
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={batchRead}
                disabled={actionLoading.has("batch-read")}
                className="h-7 border-slate-700 bg-slate-800 px-2 text-xs text-slate-300 hover:bg-slate-700"
              >
                <CheckCheck className="mr-1 h-3 w-3" />
                标为已读
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => deleteMails(Array.from(selectedIds))}
                disabled={actionLoading.has("delete")}
                className="h-7 border-red-900/50 bg-red-950/30 px-2 text-xs text-red-400 hover:bg-red-900/30"
              >
                <Trash2 className="mr-1 h-3 w-3" />
                批量删除
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ─── Mail List ─── */}
      <div className="space-y-2">
        {/* Select All (desktop) */}
        {filteredMails.length > 0 && (
          <div className="hidden items-center gap-2 px-2 md:flex">
            <Checkbox
              checked={allVisibleSelected}
              onCheckedChange={toggleSelectAll}
              className="border-slate-600 data-[state=checked]:bg-sky-600 data-[state=checked]:border-sky-600"
            />
            <span className="text-xs text-slate-500">全选</span>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <RefreshCw className="h-8 w-8 animate-spin text-slate-500" />
            <p className="text-sm text-slate-500">加载邮件中...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredMails.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900/50 py-16"
          >
            <Mail className="h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-500">暂无邮件</p>
          </motion.div>
        )}

        {/* Mail Items */}
        <AnimatePresence mode="popLayout">
          {filteredMails.map((mail, index) => {
            const catConfig = CATEGORY_CONFIG[mail.category]
            const CatIcon = catConfig.icon
            const attachments = parseAttachments(mail.attachments)
            const claimable = isRewardClaimable(mail)
            const isLoading =
              actionLoading.has(`read-${mail.id}`) ||
              actionLoading.has(`claim-${mail.id}`) ||
              actionLoading.has("delete")

            return (
              <motion.div
                key={mail.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                layout
              >
                <Card
                  className={cn(
                    "group cursor-pointer border-slate-800 bg-slate-900 transition-colors hover:border-slate-700 hover:bg-slate-800/80",
                    !mail.isRead && "border-l-2 border-l-sky-500/60",
                    selectedIds.has(mail.id) && "ring-1 ring-inset ring-sky-500/30",
                    isLoading && "pointer-events-none opacity-60"
                  )}
                  onClick={() => {
                    if (!mail.isRead) markRead(mail.id)
                    setDetailMail(mail)
                  }}
                >
                  <CardContent className="flex items-start gap-3 p-3 md:p-4">
                    {/* Checkbox (desktop) */}
                    <div className="hidden pt-1 md:block">
                      <Checkbox
                        checked={selectedIds.has(mail.id)}
                        onCheckedChange={() => toggleSelect(mail.id)}
                        className="border-slate-600 data-[state=checked]:bg-sky-600 data-[state=checked]:border-sky-600"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>

                    {/* Category Icon */}
                    <div
                      className={cn(
                        "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg",
                        catConfig.bg
                      )}
                    >
                      <CatIcon className={cn("h-4 w-4", catConfig.color)} />
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {/* Title Row */}
                          <div className="flex items-center gap-2">
                            {/* Unread Dot */}
                            {!mail.isRead && (
                              <span className="relative flex h-2 w-2 flex-shrink-0">
                                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                              </span>
                            )}
                            <span
                              className={cn(
                                "truncate text-sm",
                                mail.isRead ? "text-slate-300" : "font-semibold text-white"
                              )}
                            >
                              {mail.title}
                            </span>
                            {/* Reward Badge */}
                            {claimable && (
                              <Badge
                                className="flex-shrink-0 gap-0.5 border-amber-500/30 bg-amber-500/10 text-amber-400"
                                variant="outline"
                              >
                                <Gift className="h-3 w-3" />
                                <span className="hidden sm:inline">奖励</span>
                              </Badge>
                            )}
                          </div>

                          {/* Preview */}
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {truncate(mail.content, 60)}
                          </p>

                          {/* Meta Row (desktop) */}
                          <div className="mt-1.5 hidden flex-wrap items-center gap-2 md:flex">
                            <span className="text-xs text-slate-500">{mail.senderName}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                "gap-1 text-[10px] px-1.5 py-0",
                                catConfig.border,
                                catConfig.color
                              )}
                            >
                              {catConfig.label}
                            </Badge>
                            {attachments.length > 0 && (
                              <span className="text-[10px] text-slate-500">
                                {attachments.length}个附件
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-[10px] text-slate-600">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(mail.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Right Side Actions (desktop) */}
                        <div className="hidden flex-shrink-0 items-center gap-1 md:flex">
                          {!mail.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-slate-400 hover:bg-slate-700 hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation()
                                markRead(mail.id)
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {claimable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-amber-400 hover:bg-amber-500/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                claimReward(mail.id)
                              }}
                            >
                              <Gift className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:bg-red-500/10 hover:text-red-400"
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteMails([mail.id])
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Meta Row (mobile) */}
                      <div className="mt-2 flex items-center justify-between md:hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{mail.senderName}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1 text-[10px] px-1.5 py-0",
                              catConfig.border,
                              catConfig.color
                            )}
                          >
                            {catConfig.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          {claimable && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-amber-400"
                              onClick={(e) => {
                                e.stopPropagation()
                                claimReward(mail.id)
                              }}
                            >
                              <Gift className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <span className="flex items-center gap-1 text-[10px] text-slate-600">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(mail.createdAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* ─── Compose Dialog ─── */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-slate-800 bg-[#13151e] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-white">
              <Pencil className="h-4 w-4 text-sky-400" />
              撰写邮件
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              向指定玩家发送游戏内邮件
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Receiver IDs */}
            <div className="grid gap-2">
              <Label className="text-sm text-slate-300">接收者ID</Label>
              <Input
                placeholder="输入玩家ID，多个用逗号分隔 (如: 10001, 10002)"
                value={composeForm.receiverIds}
                onChange={(e) =>
                  setComposeForm((f) => ({ ...f, receiverIds: e.target.value }))
                }
                className="border-slate-700 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
              />
            </div>

            {/* Title */}
            <div className="grid gap-2">
              <Label className="text-sm text-slate-300">邮件标题</Label>
              <Input
                placeholder="输入邮件标题"
                value={composeForm.title}
                onChange={(e) =>
                  setComposeForm((f) => ({ ...f, title: e.target.value }))
                }
                className="border-slate-700 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
              />
            </div>

            {/* Content */}
            <div className="grid gap-2">
              <Label className="text-sm text-slate-300">邮件内容</Label>
              <Textarea
                placeholder="输入邮件正文内容..."
                rows={4}
                value={composeForm.content}
                onChange={(e) =>
                  setComposeForm((f) => ({ ...f, content: e.target.value }))
                }
                className="border-slate-700 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
              />
            </div>

            {/* Category & Sender Type Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-sm text-slate-300">邮件分类</Label>
                <Select
                  value={composeForm.category}
                  onValueChange={(v) =>
                    setComposeForm((f) => ({ ...f, category: v as Mail["category"] }))
                  }
                >
                  <SelectTrigger className="w-full border-slate-700 bg-slate-800/50 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-[#1a1c28]">
                    {Object.entries(CATEGORY_CONFIG).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        <span className="flex items-center gap-2">
                          <cfg.icon className={cn("h-3.5 w-3.5", cfg.color)} />
                          {cfg.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label className="text-sm text-slate-300">发送者类型</Label>
                <Select
                  value={composeForm.senderType}
                  onValueChange={(v) =>
                    setComposeForm((f) => ({
                      ...f,
                      senderType: v as Mail["senderType"],
                    }))
                  }
                >
                  <SelectTrigger className="w-full border-slate-700 bg-slate-800/50 text-slate-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-slate-700 bg-[#1a1c28]">
                    {Object.entries(SENDER_TYPE_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sender Name */}
            <div className="grid gap-2">
              <Label className="text-sm text-slate-300">发送者名称</Label>
              <Input
                placeholder="发送者显示名称"
                value={composeForm.senderName}
                onChange={(e) =>
                  setComposeForm((f) => ({ ...f, senderName: e.target.value }))
                }
                className="border-slate-700 bg-slate-800/50 text-slate-200 placeholder:text-slate-500"
              />
            </div>

            {/* Attachments JSON */}
            <div className="grid gap-2">
              <Label className="text-sm text-slate-300">
                附件 (JSON格式)
              </Label>
              <Textarea
                placeholder='[{"itemId":1,"itemName":"金币","count":1000}]'
                rows={3}
                value={composeForm.attachments}
                onChange={(e) =>
                  setComposeForm((f) => ({ ...f, attachments: e.target.value }))
                }
                className="border-slate-700 bg-slate-800/50 font-mono text-xs text-slate-200 placeholder:text-slate-500"
              />
            </div>

            {/* Expire Date */}
            <div className="grid gap-2">
              <Label className="text-sm text-slate-300">过期时间</Label>
              <Input
                type="datetime-local"
                value={composeForm.expireAt}
                onChange={(e) =>
                  setComposeForm((f) => ({ ...f, expireAt: e.target.value }))
                }
                className="border-slate-700 bg-slate-800/50 text-slate-200"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setComposeOpen(false)}
              className="border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700"
            >
              取消
            </Button>
            <Button
              onClick={sendMail}
              disabled={
                sending ||
                !composeForm.receiverIds.trim() ||
                !composeForm.title.trim() ||
                !composeForm.content.trim()
              }
              className="bg-sky-600 text-white hover:bg-sky-700"
            >
              {sending ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              发送邮件
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Mail Detail Sheet ─── */}
      <Sheet open={!!detailMail} onOpenChange={(open) => !open && setDetailMail(null)}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto border-slate-800 bg-[#0f1117] sm:max-w-md"
        >
          {detailMail && (
            <>
              <SheetHeader className="pr-8">
                <SheetTitle className="text-white">
                  {detailMail.title}
                </SheetTitle>
                <SheetDescription className="flex items-center gap-2 text-slate-400">
                  <span>{detailMail.senderName}</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1 text-[10px]",
                      CATEGORY_CONFIG[detailMail.category].border,
                      CATEGORY_CONFIG[detailMail.category].color
                    )}
                  >
                    {CATEGORY_CONFIG[detailMail.category].label}
                  </Badge>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6 pb-8">
                {/* Sender Info */}
                <div className="flex items-center gap-3 rounded-lg bg-slate-900 p-4">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      CATEGORY_CONFIG[detailMail.category].bg
                    )}
                  >
                    {React.createElement(CATEGORY_CONFIG[detailMail.category].icon, {
                      className: cn(
                        "h-5 w-5",
                        CATEGORY_CONFIG[detailMail.category].color
                      ),
                    })}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {detailMail.senderName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {SENDER_TYPE_LABELS[detailMail.senderType]} · 接收者: {detailMail.receiverId}
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                    邮件内容
                  </h4>
                  <div className="whitespace-pre-wrap rounded-lg bg-slate-900 p-4 text-sm leading-relaxed text-slate-300">
                    {detailMail.content}
                  </div>
                </div>

                {/* Attachments */}
                {parseAttachments(detailMail.attachments).length > 0 && (
                  <div>
                    <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                      附件奖励
                    </h4>
                    <div className="space-y-2">
                      {parseAttachments(detailMail.attachments).map((att, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center gap-3 rounded-lg border p-3",
                            detailMail.isClaimed
                              ? "border-slate-800 bg-slate-900"
                              : "border-amber-500/20 bg-amber-500/5"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-9 w-9 items-center justify-center rounded-md",
                              detailMail.isClaimed
                                ? "bg-slate-800"
                                : "bg-amber-500/10"
                            )}
                          >
                            <Gift
                              className={cn(
                                "h-4 w-4",
                                detailMail.isClaimed ? "text-slate-500" : "text-amber-400"
                              )}
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm text-slate-200">{att.itemName}</p>
                            <p className="text-xs text-slate-500">
                              ID: {att.itemId} · 数量: {att.count}
                            </p>
                          </div>
                          {detailMail.isClaimed && (
                            <Badge
                              variant="outline"
                              className="border-green-500/30 bg-green-500/10 text-green-400"
                            >
                              <CheckCheck className="mr-1 h-3 w-3" />
                              已领取
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Claim Button */}
                {isRewardClaimable(detailMail) && (
                  <Button
                    className="w-full bg-amber-600 text-white hover:bg-amber-700"
                    size="lg"
                    onClick={() => claimReward(detailMail.id)}
                    disabled={actionLoading.has(`claim-${detailMail.id}`)}
                  >
                    {actionLoading.has(`claim-${detailMail.id}`) ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Gift className="mr-2 h-4 w-4" />
                    )}
                    领取奖励
                  </Button>
                )}

                {/* Meta Info */}
                <div className="space-y-2 rounded-lg bg-slate-900 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">发送时间</span>
                    <span className="text-slate-300">
                      {formatExpireDate(detailMail.createdAt)}
                    </span>
                  </div>
                  {detailMail.expireAt && (
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">过期时间</span>
                      <span className="text-slate-300">
                        {formatExpireDate(detailMail.expireAt)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">阅读状态</span>
                    <span className={detailMail.isRead ? "text-green-400" : "text-sky-400"}>
                      {detailMail.isRead ? "已读" : "未读"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">邮件UID</span>
                    <span className="font-mono text-slate-400">{detailMail.mailUid}</span>
                  </div>
                </div>

                {/* Delete Button */}
                <Button
                  variant="outline"
                  className="w-full border-red-900/50 text-red-400 hover:bg-red-900/20"
                  onClick={() => {
                    deleteMails([detailMail.id])
                    setDetailMail(null)
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除邮件
                </Button>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}

// ─── Sub-Components ──────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  iconBg,
  highlight = false,
}: {
  icon: React.ReactNode
  label: string
  value: number
  iconBg: string
  highlight?: boolean
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 p-3 md:p-4">
      <div className="flex items-center gap-3">
        <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", iconBg)}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-slate-500">{label}</p>
          <p className={cn("text-lg font-bold md:text-xl", highlight ? "text-white" : "text-slate-200")}>
            {value}
          </p>
        </div>
      </div>
      {highlight && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="pointer-events-none absolute -right-2 -top-2 h-12 w-12 rounded-full bg-sky-500/20 blur-xl"
        />
      )}
    </div>
  )
}
