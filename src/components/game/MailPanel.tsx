'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, formatNumber } from '@/stores/game-store'
import type { GameMail } from '@/stores/game-store'
import {
  Mail, MailOpen, Gift, Bell, Send, Trash2, CheckCheck,
  ChevronRight, X, Clock, Users, Sparkles, Shield,
  AlertCircle, Inbox, Pencil, Search, Filter, Tag,
  ArrowLeft, Star, Trophy, Heart, MessageSquare, Crown
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'

const CATEGORY_TABS = [
  { id: 'all', label: '全部', icon: Inbox },
  { id: 'system', label: '系统', icon: Shield },
  { id: 'reward', label: '奖励', icon: Gift },
  { id: 'activity', label: '活动', icon: Trophy },
  { id: 'social', label: '社交', icon: Heart },
  { id: 'guild', label: '联盟', icon: Crown },
] as const

type CategoryTab = (typeof CATEGORY_TABS)[number]['id']

const CATEGORY_STYLE: Record<string, { color: string; gradient: string; icon: string }> = {
  system: { color: 'text-sky-400', gradient: 'from-sky-500 to-blue-600', icon: '⚙️' },
  reward: { color: 'text-amber-400', gradient: 'from-amber-500 to-amber-600', icon: '🎁' },
  activity: { color: 'text-green-400', gradient: 'from-green-500 to-emerald-600', icon: '🎉' },
  notification: { color: 'text-slate-400', gradient: 'from-slate-500 to-slate-600', icon: '📢' },
  social: { color: 'text-pink-400', gradient: 'from-pink-500 to-rose-600', icon: '💬' },
  guild: { color: 'text-purple-400', gradient: 'from-purple-500 to-violet-600', icon: '🏰' },
}

function getCategoryStyle(category: string) {
  return CATEGORY_STYLE[category] || CATEGORY_STYLE.system
}

function formatMailTime(dateStr: string): string {
  const date = new Date(dateStr.replace(' ', 'T'))
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${Math.max(1, diffMins)}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  if (diffDays < 7) return `${diffDays}天前`
  return dateStr.slice(5, 11)
}

export default function MailPanel() {
  const {
    mails, unreadMailCount, rewardMailCount,
    readMail, claimMailReward, deleteMail, batchReadMails,
    showNotification,
  } = useGameStore()

  const [activeCategory, setActiveCategory] = useState<CategoryTab>('all')
  const [selectedMail, setSelectedMail] = useState<GameMail | null>(null)
  const [showCompose, setShowCompose] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showBatchBar, setShowBatchBar] = useState(false)

  const filteredMails = useMemo(() => {
    let result = [...mails]

    // Category filter
    if (activeCategory !== 'all') {
      result = result.filter((m) => m.category === activeCategory)
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.content.toLowerCase().includes(q) ||
          m.senderName.toLowerCase().includes(q)
      )
    }

    // Sort: unread first, then by time
    result.sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return result
  }, [mails, activeCategory, searchQuery])

  const unreadMails = filteredMails.filter((m) => !m.isRead)
  const claimableMails = filteredMails.filter((m) => m.category === 'reward' && !m.isClaimed)

  const handleBatchReadAll = useCallback(() => {
    const ids = filteredMails.filter((m) => !m.isRead).map((m) => m.id)
    if (ids.length === 0) {
      showNotification('没有未读邮件')
      return
    }
    batchReadMails(ids)
    showNotification(`已标记 ${ids.length} 封邮件为已读`)
  }, [filteredMails, batchReadMails, showNotification])

  const handleClaimAllRewards = useCallback(() => {
    const rewardMails = filteredMails.filter((m) => m.category === 'reward' && !m.isClaimed)
    if (rewardMails.length === 0) {
      showNotification('没有可领取的奖励')
      return
    }
    rewardMails.forEach((m) => claimMailReward(m.id))
    showNotification(`已领取 ${rewardMails.length} 个奖励`)
  }, [filteredMails, claimMailReward, showNotification])

  const handleMailClick = (mail: GameMail) => {
    setSelectedMail(mail)
    if (!mail.isRead) {
      readMail(mail.id)
    }
  }

  const handleDeleteMail = (mailId: number) => {
    deleteMail(mailId)
    if (selectedMail?.id === mailId) {
      setSelectedMail(null)
    }
    showNotification('邮件已删除')
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-900/80">
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-amber-400" />
          <span className="text-base font-bold text-slate-200">邮件</span>
          {unreadMailCount > 0 && (
            <motion.span
              key={unreadMailCount}
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              className="min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center"
            >
              {unreadMailCount}
            </motion.span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowBatchBar(!showBatchBar)}
            className={`p-2 rounded-lg transition-colors ${showBatchBar ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:bg-slate-800'}`}
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowCompose(true)}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-amber-400 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Batch Actions Bar */}
      <AnimatePresence>
        {showBatchBar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 px-3 py-2">
              <button
                onClick={handleBatchReadAll}
                disabled={unreadMails.length === 0}
                className="flex-1 py-2 bg-slate-800/80 rounded-lg text-[10px] text-slate-300 hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                全部已读
                {unreadMails.length > 0 && (
                  <span className="text-amber-400">({unreadMails.length})</span>
                )}
              </button>
              <button
                onClick={handleClaimAllRewards}
                disabled={claimableMails.length === 0}
                className="flex-1 py-2 bg-gradient-to-r from-amber-500/20 to-amber-600/20 rounded-lg text-[10px] text-amber-400 hover:from-amber-500/30 hover:to-amber-600/30 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed border border-amber-500/20"
              >
                <Gift className="w-3.5 h-3.5" />
                一键领取
                {claimableMails.length > 0 && (
                  <span className="text-amber-300">({claimableMails.length})</span>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Tabs */}
      <div className="flex gap-1 px-3 pb-2 flex-shrink-0 overflow-x-auto scrollbar-none">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              activeCategory === tab.id
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/20'
                : 'bg-slate-800/60 text-slate-400 hover:bg-slate-700/60'
            }`}
          >
            <tab.icon className="w-3 h-3" />
            <span>{tab.label}</span>
            {tab.id === 'reward' && rewardMailCount > 0 && (
              <span className="min-w-[14px] h-[14px] px-0.5 bg-red-500 rounded-full text-[8px] text-white font-bold flex items-center justify-center">
                {rewardMailCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Search Bar */}
      <div className="px-3 pb-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索邮件..."
            className="w-full pl-8 pr-3 py-2 bg-slate-800/60 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 border border-slate-700/30 focus:outline-none focus:border-amber-500/40 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mail List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredMails.length === 0 ? (
          <EmptyMailState />
        ) : (
          <div className="px-3 pb-4 space-y-1.5">
            <AnimatePresence mode="popLayout">
              {filteredMails.map((mail, index) => (
                <MailItem
                  key={mail.id}
                  mail={mail}
                  index={index}
                  onClick={() => handleMailClick(mail)}
                  onDelete={() => handleDeleteMail(mail.id)}
                  onClaim={() => {
                    claimMailReward(mail.id)
                    showNotification('奖励领取成功！')
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Mail Detail Dialog */}
      <AnimatePresence>
        {selectedMail && (
          <MailDetailDialog
            mail={selectedMail}
            onClose={() => setSelectedMail(null)}
            onDelete={() => handleDeleteMail(selectedMail.id)}
            onClaim={() => {
              claimMailReward(selectedMail.id)
              showNotification('奖励领取成功！')
            }}
          />
        )}
      </AnimatePresence>

      {/* Compose Dialog */}
      <AnimatePresence>
        {showCompose && (
          <ComposeDialog onClose={() => setShowCompose(false)} />
        )}
      </AnimatePresence>
    </div>
  )
}

function MailItem({
  mail, index, onClick, onDelete, onClaim,
}: {
  mail: GameMail
  index: number
  onClick: () => void
  onDelete: () => void
  onClaim: () => void
}) {
  const categoryStyle = getCategoryStyle(mail.category)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative p-3 rounded-xl border transition-all cursor-pointer group ${
        mail.isRead
          ? 'bg-slate-800/40 border-slate-700/20 hover:bg-slate-800/60'
          : 'bg-gradient-to-r from-slate-800/80 to-slate-800/60 border-amber-500/15 hover:border-amber-500/30'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${categoryStyle.gradient} flex items-center justify-center flex-shrink-0 text-lg shadow-sm`}>
          {categoryStyle.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-sm truncate ${mail.isRead ? 'text-slate-400' : 'text-slate-200 font-medium'}`}>
              {mail.title}
            </span>
            {/* Unread dot */}
            {!mail.isRead && (
              <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0 animate-pulse" />
            )}
            {/* Reward indicator */}
            {mail.category === 'reward' && !mail.isClaimed && (
              <span className="flex-shrink-0">
                <Gift className="w-3.5 h-3.5 text-amber-400" />
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] text-slate-500">{mail.senderName}</span>
            <span className="text-[10px] text-slate-600">·</span>
            <span className="text-[10px] text-slate-500">{formatMailTime(mail.createdAt)}</span>
          </div>

          <p className={`text-[11px] truncate ${mail.isRead ? 'text-slate-500' : 'text-slate-400'}`}>
            {mail.content}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />

          {/* Quick Claim Button for reward mails */}
          {mail.category === 'reward' && !mail.isClaimed && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation()
                onClaim()
              }}
              className="px-2 py-1 bg-gradient-to-r from-amber-500 to-amber-600 rounded text-[9px] text-white font-bold flex items-center gap-0.5 shadow-sm"
            >
              <Gift className="w-2.5 h-2.5" />
              领取
            </motion.button>
          )}

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            className="p-1 rounded text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Expire indicator */}
      {mail.expireAt && !mail.isClaimed && (
        <div className="flex items-center gap-1 mt-2 pt-2 border-t border-slate-700/20">
          <Clock className="w-3 h-3 text-slate-600" />
          <span className="text-[9px] text-slate-600">有效期至 {mail.expireAt.slice(5, 10)}</span>
        </div>
      )}
    </motion.div>
  )
}

function MailDetailDialog({
  mail, onClose, onDelete, onClaim,
}: {
  mail: GameMail
  onClose: () => void
  onDelete: () => void
  onClaim: () => void
}) {
  const categoryStyle = getCategoryStyle(mail.category)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700/50 overflow-hidden max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-700/30 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${categoryStyle.gradient} flex items-center justify-center text-lg shadow-sm`}>
              {categoryStyle.icon}
            </div>
            <div>
              <div className="text-sm font-medium text-slate-200">{mail.senderName}</div>
              <div className="text-[10px] text-slate-500">{formatMailTime(mail.createdAt)}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-base font-bold text-slate-200 mb-3">{mail.title}</h3>

          <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/20 mb-4">
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{mail.content}</p>
          </div>

          {/* Category Badge */}
          <div className="flex items-center gap-2 mb-3">
            <Tag className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-[10px] text-slate-500">
              类型: <span className={categoryStyle.color}>{mail.senderType}</span>
            </span>
          </div>

          {/* Expire Info */}
          {mail.expireAt && (
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] text-slate-500">有效期至: {mail.expireAt}</span>
            </div>
          )}

          {/* Attachments placeholder */}
          {mail.attachments && mail.attachments.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5 text-amber-400" />
                附件
              </div>
              <div className="flex flex-wrap gap-2">
                {mail.attachments.map((att, i) => (
                  <div key={i} className="px-3 py-2 bg-slate-800/60 rounded-lg border border-slate-700/20 text-[10px] text-slate-400">
                    {att}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reward Claim Section */}
          {mail.category === 'reward' && (
            <div className="p-3 bg-amber-500/5 rounded-xl border border-amber-500/15">
              <div className="flex items-center gap-2 mb-2">
                <Gift className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-amber-300">邮件奖励</span>
              </div>
              <p className="text-xs text-slate-300 mb-2">{mail.content}</p>
              {mail.isClaimed ? (
                <div className="flex items-center gap-1.5 text-[10px] text-green-400">
                  <Sparkles className="w-3.5 h-3.5" />
                  已领取
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onClaim}
                  className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg text-xs text-white font-medium flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <Gift className="w-3.5 h-3.5" />
                  领取奖励
                </motion.button>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2 p-4 border-t border-slate-700/30 flex-shrink-0">
          <button
            onClick={() => {
              onDelete()
              onClose()
            }}
            className="py-2.5 px-4 bg-slate-700 rounded-xl text-xs text-slate-300 hover:bg-slate-600 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            删除
          </button>
          {mail.category === 'reward' && !mail.isClaimed && (
            <button
              onClick={() => {
                onClaim()
                onClose()
              }}
              className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl text-xs text-white font-medium flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              <Gift className="w-3.5 h-3.5" />
              领取奖励
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function ComposeDialog({ onClose }: { onClose: () => void }) {
  const { showNotification } = useGameStore()
  const [recipient, setRecipient] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')

  const handleSend = () => {
    if (!recipient.trim() || !content.trim()) {
      showNotification('请填写收件人和内容')
      return
    }
    showNotification('邮件已发送')
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-gradient-to-b from-slate-800 to-slate-900 rounded-t-2xl sm:rounded-2xl border border-slate-700/50 overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 flex items-center justify-between border-b border-slate-700/30">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-slate-200">撰写邮件</span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">收件人</label>
            <input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="输入玩家名称"
              className="w-full px-3 py-2 bg-slate-800/60 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 border border-slate-700/30 focus:outline-none focus:border-amber-500/40 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">主题</label>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="邮件主题"
              className="w-full px-3 py-2 bg-slate-800/60 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 border border-slate-700/30 focus:outline-none focus:border-amber-500/40 transition-colors"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 mb-1 block">内容</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="输入邮件内容..."
              rows={5}
              className="w-full px-3 py-2 bg-slate-800/60 rounded-lg text-xs text-slate-200 placeholder:text-slate-500 border border-slate-700/30 focus:outline-none focus:border-amber-500/40 transition-colors resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-slate-700/30">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-slate-700 rounded-xl text-sm text-slate-300 hover:bg-slate-600 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSend}
            className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl text-sm font-medium text-white shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all flex items-center justify-center gap-1.5"
          >
            <Send className="w-3.5 h-3.5" />
            发送
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function EmptyMailState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
        className="w-20 h-20 rounded-full bg-slate-800/80 flex items-center justify-center mb-4 border border-slate-700/40"
      >
        <Mail className="w-8 h-8 text-slate-500" />
      </motion.div>
      <p className="text-sm text-slate-400 mb-1">暂无邮件</p>
      <p className="text-xs text-slate-500">所有邮件都已处理完毕</p>
    </motion.div>
  )
}
