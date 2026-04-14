'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Plus, Pencil, Trash2, Search, GripVertical, Eye, BookOpen,
  Swords, Calendar, Trophy, ChevronDown, ChevronRight, Target,
  Star, Award, Activity, Users, TrendingUp, RefreshCw, Loader2,
} from 'lucide-react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

// ==================== Types ====================
interface TutorialStep {
  id: number
  stepOrder: number
  stepKey: string
  title: string
  triggerType: 'level' | 'building' | 'battle' | 'gacha' | 'quest' | 'social'
  isRequired: boolean
  status: number
  dialogues: string
  rewards: string
  uiTarget: string
  description: string
}

interface Quest {
  id: number
  questOrder: number
  title: string
  questType: 'story' | 'battle' | 'collect' | 'explore' | 'escort' | 'defend'
  targetType: string
  targetCount: number
  energyCost: number
  rewards: string
  description: string
  status: number
}

interface Chapter {
  id: number
  chapterOrder: number
  title: string
  unlockLevel: number
  description: string
  quests: Quest[]
}

interface DailyTask {
  id: number
  taskKey: string
  title: string
  taskType: 'battle' | 'gacha' | 'social' | 'guild' | 'resource' | 'growth'
  targetCount: number
  refreshType: 'daily' | 'weekly'
  activityPoints: number
  sortOrder: number
  status: number
}

interface ActivityMilestone {
  id: number
  requiredPoints: number
  rewards: string
  title: string
}

interface Achievement {
  id: number
  title: string
  description: string
  category: 'battle' | 'collection' | 'social' | 'development' | 'guild'
  conditionType: string
  conditionParams: string
  rewardPoints: number
  isHidden: boolean
  sortOrder: number
  status: number
}

interface CoreFlowKPI {
  tutorialCompleteRate: number
  questAvgProgress: number
  dailyTaskAvgCount: number
  dailyTaskFullRate: number
  achievementAvgCount: number
  retentionLift: number
}

interface CoreFlowData {
  kpi: CoreFlowKPI
  tutorialFunnel: { step: number; title: string; stepKey: string; completionRate: number; isRequired: boolean }[]
  retentionComparison: { date: string; day1WithTutorial: number; day1WithoutTutorial: number; day7WithQuest: number }[]
  questProgressDist: { chapter: string; title: string; playerCount: number; completionRate: number; questCount: number }[]
  dailyCompletion: { taskKey: string; title: string; taskType: string; completionRate: number; avgPoints: number }[]
  achievementUnlock: { id: number; title: string; category: string; unlockRate: number; rewardPoints: number }[]
}

// ==================== Badge Configs ====================
const triggerTypeMap: Record<string, { text: string; cls: string }> = {
  level:     { text: '等级',     cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300' },
  building:  { text: '建筑',     cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300' },
  battle:    { text: '战斗',     cls: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-300' },
  gacha:     { text: '抽卡',     cls: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-300' },
  quest:     { text: '任务',     cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-300' },
  social:    { text: '社交',     cls: 'bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-300' },
}

const questTypeMap: Record<string, { text: string; cls: string }> = {
  story:    { text: '剧情', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300' },
  battle:   { text: '战斗', cls: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-300' },
  collect:  { text: '收集', cls: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-300' },
  explore:  { text: '探索', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300' },
  escort:   { text: '护送', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-300' },
  defend:   { text: '防守', cls: 'bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-300' },
}

const dailyTypeMap: Record<string, { text: string; cls: string }> = {
  battle:   { text: '战斗', cls: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-300' },
  gacha:    { text: '抽卡', cls: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-300' },
  social:   { text: '社交', cls: 'bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-300' },
  guild:    { text: '联盟', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300' },
  resource: { text: '资源', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300' },
  growth:   { text: '成长', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-300' },
}

const achievementCategoryMap: Record<string, { text: string; cls: string }> = {
  battle:     { text: '战斗', cls: 'bg-red-500/15 text-red-700 dark:text-red-400 border-red-300' },
  collection: { text: '收集', cls: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-300' },
  social:     { text: '社交', cls: 'bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-300' },
  development:{ text: '发展', cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300' },
  guild:      { text: '联盟', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300' },
}

const refreshTypeMap: Record<string, { text: string; cls: string }> = {
  daily:  { text: '每日', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-300' },
  weekly: { text: '每周', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300' },
}

// ==================== Mock Data (fallbacks) ====================
const mockTutorialSteps: TutorialStep[] = [
  { id: 1, stepOrder: 1, stepKey: 'welcome', title: '欢迎来到九州', triggerType: 'level', isRequired: true, status: 1, dialogues: '[{"npc":"诸葛亮","text":"主公，欢迎来到九州乱世！","position":"left"}]', rewards: '{"gold":1000,"diamond":100}', uiTarget: 'main_city', description: '新手初始引导' },
  { id: 2, stepOrder: 2, stepKey: 'recruit_hero', title: '招募第一位武将', triggerType: 'level', isRequired: true, status: 1, dialogues: '[{"npc":"诸葛亮","text":"主公需要招募武将才能征战天下","position":"left"}]', rewards: '{"gacha_ticket":1,"gold":500}', uiTarget: 'gacha_panel', description: '引导使用新手池' },
  { id: 3, stepOrder: 3, stepKey: 'first_battle', title: '初次战斗', triggerType: 'battle', isRequired: true, status: 1, dialogues: '[{"npc":"诸葛亮","text":"让武将去体验第一次战斗吧","position":"left"}]', rewards: '{"exp":200,"gold":300}', uiTarget: 'battle_button', description: '引导完成关卡1-1' },
  { id: 4, stepOrder: 4, stepKey: 'upgrade_building', title: '升级主城', triggerType: 'building', isRequired: true, status: 1, dialogues: '[{"npc":"诸葛亮","text":"主城升级可以解锁更多功能","position":"left"}]', rewards: '{"gold":2000,"building_material":10}', uiTarget: 'main_building', description: '引导升级主城至2级' },
  { id: 5, stepOrder: 5, stepKey: 'join_guild', title: '加入联盟', triggerType: 'social', isRequired: false, status: 1, dialogues: '[{"npc":"诸葛亮","text":"联盟的力量不容小觑","position":"left"}]', rewards: '{"gold":500,"diamond":50}', uiTarget: 'guild_button', description: '引导加入联盟' },
  { id: 6, stepOrder: 6, stepKey: 'first_10_pull', title: '十连召唤', triggerType: 'gacha', isRequired: false, status: 0, dialogues: '[{"npc":"诸葛亮","text":"十连召唤必出SR武将","position":"left"}]', rewards: '{"gacha_ticket":1}', uiTarget: 'gacha_10_pull', description: '引导十连抽卡' },
  { id: 7, stepOrder: 7, stepKey: 'equip_hero', title: '装备武将', triggerType: 'quest', isRequired: true, status: 1, dialogues: '[{"npc":"诸葛亮","text":"为武将装备可以提升战力","position":"left"}]', rewards: '{"equip_scroll":3,"gold":500}', uiTarget: 'hero_detail', description: '引导为武将装备' },
  { id: 8, stepOrder: 8, stepKey: 'daily_sign', title: '每日签到', triggerType: 'quest', isRequired: false, status: 1, dialogues: '[{"npc":"系统","text":"记得每天签到领取奖励哦","position":"center"}]', rewards: '{"diamond":20}', uiTarget: 'sign_button', description: '引导完成每日签到' },
]

const mockChapters: Chapter[] = [
  { id: 1, chapterOrder: 1, title: '黄巾之乱', unlockLevel: 1, description: '黄巾起义席卷天下，各方诸侯纷纷起兵', quests: [
    { id: 101, questOrder: 1, title: '初出茅庐', questType: 'story', targetType: 'battle_win', targetCount: 1, energyCost: 5, rewards: '{"exp":100,"gold":200}', description: '完成第一场战斗', status: 1 },
    { id: 102, questOrder: 2, title: '讨伐黄巾', questType: 'battle', targetType: 'kill_enemy', targetCount: 50, energyCost: 8, rewards: '{"exp":200,"gold":500,"equip_scroll":1}', description: '击败50个黄巾军', status: 1 },
    { id: 103, questOrder: 3, title: '收集粮草', questType: 'collect', targetType: 'resource_food', targetCount: 100, energyCost: 0, rewards: '{"gold":300,"diamond":20}', description: '收集100单位粮草', status: 1 },
  ]},
  { id: 2, chapterOrder: 2, title: '董卓乱政', unlockLevel: 10, description: '董卓祸乱朝纲，群雄讨伐', quests: [
    { id: 201, questOrder: 1, title: '虎牢关之战', questType: 'battle', targetType: 'stage_clear', targetCount: 1, energyCost: 10, rewards: '{"exp":500,"gold":1000,"sr_fragment":5}', description: '通过虎牢关关卡', status: 1 },
    { id: 202, questOrder: 2, title: '联军建设', questType: 'explore', targetType: 'building_level', targetCount: 5, energyCost: 0, rewards: '{"gold":800,"diamond":50}', description: '将5个建筑升至2级', status: 1 },
    { id: 203, questOrder: 3, title: '火烧洛阳', questType: 'story', targetType: 'battle_win', targetCount: 3, energyCost: 12, rewards: '{"exp":600,"gold":1200}', description: '赢得3场洛阳战役', status: 1 },
    { id: 204, questOrder: 4, title: '护送百姓', questType: 'escort', targetType: 'escort_success', targetCount: 2, energyCost: 8, rewards: '{"gold":600,"food":200}', description: '成功护送百姓2次', status: 1 },
  ]},
  { id: 3, chapterOrder: 3, title: '群雄割据', unlockLevel: 20, description: '天下诸侯各据一方，逐鹿中原', quests: [
    { id: 301, questOrder: 1, title: '攻城略地', questType: 'battle', targetType: 'city_capture', targetCount: 1, energyCost: 15, rewards: '{"exp":800,"gold":2000,"diamond":100}', description: '攻占第一座城池', status: 1 },
    { id: 302, questOrder: 2, title: '招贤纳士', questType: 'collect', targetType: 'hero_recruit', targetCount: 10, energyCost: 0, rewards: '{"gacha_ticket":2,"diamond":80}', description: '招募10名武将', status: 1 },
    { id: 303, questOrder: 3, title: '防守城池', questType: 'defend', targetType: 'defend_success', targetCount: 3, energyCost: 10, rewards: '{"gold":1500,"equip_scroll":3}', description: '成功防守城池3次', status: 1 },
  ]},
]

const mockDailyTasks: DailyTask[] = [
  { id: 1, taskKey: 'daily_login', title: '每日登录', taskType: 'growth', targetCount: 1, refreshType: 'daily', activityPoints: 10, sortOrder: 1, status: 1 },
  { id: 2, taskKey: 'daily_battle_3', title: '完成3场战斗', taskType: 'battle', targetCount: 3, refreshType: 'daily', activityPoints: 20, sortOrder: 2, status: 1 },
  { id: 3, taskKey: 'daily_battle_10', title: '完成10场战斗', taskType: 'battle', targetCount: 10, refreshType: 'daily', activityPoints: 40, sortOrder: 3, status: 1 },
  { id: 4, taskKey: 'daily_gacha_1', title: '进行1次抽卡', taskType: 'gacha', targetCount: 1, refreshType: 'daily', activityPoints: 15, sortOrder: 4, status: 1 },
  { id: 5, taskKey: 'daily_gacha_10', title: '进行1次十连抽', taskType: 'gacha', targetCount: 1, refreshType: 'daily', activityPoints: 30, sortOrder: 5, status: 1 },
  { id: 6, taskKey: 'daily_guild_donate', title: '联盟捐献', taskType: 'guild', targetCount: 1, refreshType: 'daily', activityPoints: 15, sortOrder: 6, status: 1 },
  { id: 7, taskKey: 'daily_social_chat', title: '世界频道发言', taskType: 'social', targetCount: 1, refreshType: 'daily', activityPoints: 5, sortOrder: 7, status: 1 },
  { id: 8, taskKey: 'daily_resource_collect', title: '采集资源', taskType: 'resource', targetCount: 5, refreshType: 'daily', activityPoints: 20, sortOrder: 8, status: 1 },
  { id: 9, taskKey: 'daily_hero_upgrade', title: '升级武将', taskType: 'growth', targetCount: 3, refreshType: 'daily', activityPoints: 20, sortOrder: 9, status: 1 },
  { id: 10, taskKey: 'weekly_arena_10', title: '竞技场挑战10次', taskType: 'battle', targetCount: 10, refreshType: 'weekly', activityPoints: 50, sortOrder: 10, status: 1 },
  { id: 11, taskKey: 'weekly_guild_war', title: '参加联盟战争', taskType: 'guild', targetCount: 1, refreshType: 'weekly', activityPoints: 40, sortOrder: 11, status: 1 },
]

const mockMilestones: ActivityMilestone[] = [
  { id: 1, requiredPoints: 30, rewards: '{"gold":1000,"diamond":50}', title: '铜牌奖励' },
  { id: 2, requiredPoints: 60, rewards: '{"gold":2000,"diamond":100,"gacha_ticket":1}', title: '银牌奖励' },
  { id: 3, requiredPoints: 100, rewards: '{"gold":5000,"diamond":200,"sr_fragment":10}', title: '金牌奖励' },
  { id: 4, requiredPoints: 150, rewards: '{"gold":8000,"diamond":300,"equip_scroll":5}', title: '钻石奖励' },
  { id: 5, requiredPoints: 200, rewards: '{"gold":10000,"diamond":500,"ssr_fragment":5}', title: '大师奖励' },
]

const mockAchievements: Achievement[] = [
  { id: 1, title: '初出茅庐', description: '完成第1场战斗', category: 'battle', conditionType: 'battle_count', conditionParams: '{"count":1}', rewardPoints: 10, isHidden: false, sortOrder: 1, status: 1 },
  { id: 2, title: '百战百胜', description: '赢得100场战斗', category: 'battle', conditionType: 'battle_win_count', conditionParams: '{"count":100}', rewardPoints: 50, isHidden: false, sortOrder: 2, status: 1 },
  { id: 3, title: '千军万马', description: '赢得1000场战斗', category: 'battle', conditionType: 'battle_win_count', conditionParams: '{"count":1000}', rewardPoints: 200, isHidden: false, sortOrder: 3, status: 1 },
  { id: 4, title: '天下无敌', description: '竞技场排名第一', category: 'battle', conditionType: 'arena_rank', conditionParams: '{"rank":1}', rewardPoints: 500, isHidden: true, sortOrder: 4, status: 1 },
  { id: 5, title: '初识天下', description: '招募第1位武将', category: 'collection', conditionType: 'hero_count', conditionParams: '{"count":1}', rewardPoints: 10, isHidden: false, sortOrder: 5, status: 1 },
  { id: 6, title: '人才济济', description: '招募50位武将', category: 'collection', conditionType: 'hero_count', conditionParams: '{"count":50}', rewardPoints: 80, isHidden: false, sortOrder: 6, status: 1 },
  { id: 7, title: '集齐全卡', description: '收集所有武将', category: 'collection', conditionType: 'hero_collect_all', conditionParams: '{}', rewardPoints: 1000, isHidden: true, sortOrder: 7, status: 1 },
  { id: 8, title: '广结良缘', description: '添加10位好友', category: 'social', conditionType: 'friend_count', conditionParams: '{"count":10}', rewardPoints: 20, isHidden: false, sortOrder: 8, status: 1 },
  { id: 9, title: '义薄云天', description: '赠送好友100次体力', category: 'social', conditionType: 'gift_stamina', conditionParams: '{"count":100}', rewardPoints: 30, isHidden: false, sortOrder: 9, status: 1 },
  { id: 10, title: '城池兴旺', description: '主城达到30级', category: 'development', conditionType: 'building_level', conditionParams: '{"building":"main_city","level":30}', rewardPoints: 100, isHidden: false, sortOrder: 10, status: 1 },
  { id: 11, title: '富甲一方', description: '累计获得100万金币', category: 'development', conditionType: 'total_gold', conditionParams: '{"count":1000000}', rewardPoints: 80, isHidden: false, sortOrder: 11, status: 1 },
  { id: 12, title: '称霸一方', description: '联盟排名第一', category: 'guild', conditionType: 'guild_rank', conditionParams: '{"rank":1}', rewardPoints: 500, isHidden: true, sortOrder: 12, status: 1 },
  { id: 13, title: '攻城拔寨', description: '攻占10座城池', category: 'guild', conditionType: 'city_capture', conditionParams: '{"count":10}', rewardPoints: 150, isHidden: false, sortOrder: 13, status: 1 },
]

// ==================== Custom scrollbar style ====================
const scrollbarStyle = (
  <style>{`
    .quest-scroll::-webkit-scrollbar { width: 6px; }
    .quest-scroll::-webkit-scrollbar-track { background: transparent; }
    .quest-scroll::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 3px; }
    .quest-scroll::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)); }
  `}</style>
)

// ==================== Helper: Skeleton Loader ====================
function SkeletonCard() {
  return (
    <Card className="p-4">
      <div className="animate-pulse space-y-2">
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="h-6 w-24 rounded bg-muted" />
        <div className="h-3 w-16 rounded bg-muted" />
      </div>
    </Card>
  )
}

function SkeletonChart() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="animate-pulse h-4 w-32 rounded bg-muted" />
      </CardHeader>
      <CardContent>
        <div className="animate-pulse h-[250px] rounded bg-muted/50" />
      </CardContent>
    </Card>
  )
}

// ==================== Main Component ====================
export default function QuestPage() {
  // ────────────────────── Core Flow State ──────────────────────
  const [coreFlow, setCoreFlow] = useState<CoreFlowData | null>(null)
  const [coreFlowLoading, setCoreFlowLoading] = useState(true)

  // ────────────────────── Tutorial State ──────────────────────
  const [tutorials, setTutorials] = useState<TutorialStep[]>(mockTutorialSteps)
  const [tutorialLoading, setTutorialLoading] = useState(true)
  const [tutorialSearch, setTutorialSearch] = useState('')
  const [tutorialDialogOpen, setTutorialDialogOpen] = useState(false)
  const [editingTutorial, setEditingTutorial] = useState<TutorialStep | null>(null)
  const [deleteTutorial, setDeleteTutorial] = useState<TutorialStep | null>(null)
  const [tutorialDetailOpen, setTutorialDetailOpen] = useState(false)
  const [viewingTutorial, setViewingTutorial] = useState<TutorialStep | null>(null)
  const [tStepOrder, setTStepOrder] = useState(0)
  const [tStepKey, setTStepKey] = useState('')
  const [tTitle, setTTitle] = useState('')
  const [tTriggerType, setTTriggerType] = useState<TutorialStep['triggerType']>('level')
  const [tIsRequired, setTIsRequired] = useState(true)
  const [tStatus, setTStatus] = useState(true)
  const [tDialogues, setTDialogues] = useState('')
  const [tRewards, setTRewards] = useState('')
  const [tUiTarget, setTUiTarget] = useState('')
  const [tDescription, setTDescription] = useState('')

  // ────────────────────── Main Quest State ──────────────────────
  const [chapters, setChapters] = useState<Chapter[]>(mockChapters)
  const [chaptersLoading, setChaptersLoading] = useState(true)
  const [expandedChapters, setExpandedChapters] = useState<Set<number>>(new Set([1]))
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null)
  const [deleteChapter, setDeleteChapter] = useState<Chapter | null>(null)
  const [questDialogOpen, setQuestDialogOpen] = useState(false)
  const [editingQuest, setEditingQuest] = useState<{ chapterId: number; quest: Quest } | null>(null)
  const [deleteQuest, setDeleteQuest] = useState<{ chapterId: number; quest: Quest } | null>(null)
  const [cOrder, setCOrder] = useState(0)
  const [cTitle, setCTitle] = useState('')
  const [cUnlockLevel, setCUnlockLevel] = useState(1)
  const [cDescription, setCDescription] = useState('')
  const [qChapterId, setQChapterId] = useState(0)
  const [qOrder, setQOrder] = useState(0)
  const [qTitle, setQTitle] = useState('')
  const [qType, setQType] = useState<Quest['questType']>('story')
  const [qTargetType, setQTargetType] = useState('')
  const [qTargetCount, setQTargetCount] = useState(1)
  const [qEnergyCost, setQEnergyCost] = useState(5)
  const [qRewards, setQRewards] = useState('{}')
  const [qDescription, setQDescription] = useState('')

  // ────────────────────── Daily Tasks State ──────────────────────
  const [dailyTasks, setDailyTasks] = useState<DailyTask[]>(mockDailyTasks)
  const [dailyLoading, setDailyLoading] = useState(true)
  const [dailySearch, setDailySearch] = useState('')
  const [dailyDialogOpen, setDailyDialogOpen] = useState(false)
  const [editingDaily, setEditingDaily] = useState<DailyTask | null>(null)
  const [deleteDaily, setDeleteDaily] = useState<DailyTask | null>(null)
  const [milestones, setMilestones] = useState<ActivityMilestone[]>(mockMilestones)
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<ActivityMilestone | null>(null)
  const [deleteMilestone, setDeleteMilestone] = useState<ActivityMilestone | null>(null)
  const [dTaskKey, setDTaskKey] = useState('')
  const [dTitle, setDTitle] = useState('')
  const [dTaskType, setDTaskType] = useState<DailyTask['taskType']>('battle')
  const [dTargetCount, setDTargetCount] = useState(1)
  const [dRefreshType, setDRefreshType] = useState<DailyTask['refreshType']>('daily')
  const [dActivityPoints, setDActivityPoints] = useState(10)
  const [dSortOrder, setDSortOrder] = useState(0)
  const [mRequiredPoints, setMRequiredPoints] = useState(0)
  const [mRewards, setMRewards] = useState('{}')
  const [mTitle, setMTitle] = useState('')

  // ────────────────────── Achievement State ──────────────────────
  const [achievements, setAchievements] = useState<Achievement[]>(mockAchievements)
  const [achievementLoading, setAchievementLoading] = useState(true)
  const [achievementSearch, setAchievementSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [achievementDialogOpen, setAchievementDialogOpen] = useState(false)
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null)
  const [deleteAchievement, setDeleteAchievement] = useState<Achievement | null>(null)
  const [aTitle, setATitle] = useState('')
  const [aDescription, setADescription] = useState('')
  const [aCategory, setACategory] = useState<Achievement['category']>('battle')
  const [aConditionType, setAConditionType] = useState('')
  const [aConditionParams, setAConditionParams] = useState('{}')
  const [aRewardPoints, setARewardPoints] = useState(10)
  const [aIsHidden, setAIsHidden] = useState(false)
  const [aSortOrder, setASortOrder] = useState(0)

  // ────────────────────── API Fetch ──────────────────────
  const fetchCoreFlow = useCallback(async () => {
    try {
      setCoreFlowLoading(true)
      const res = await fetch('/api/quest/core-flow')
      const json = await res.json()
      if (json.code === 0 && json.data) setCoreFlow(json.data)
    } catch { /* keep null, will show fallback */ }
    finally { setCoreFlowLoading(false) }
  }, [])

  const fetchTutorials = useCallback(async () => {
    try {
      setTutorialLoading(true)
      const res = await fetch('/api/quest/tutorial')
      const json = await res.json()
      if (json.code === 0 && json.data) setTutorials(json.data)
    } catch { /* fallback to mock */ }
    finally { setTutorialLoading(false) }
  }, [])

  const fetchChapters = useCallback(async () => {
    try {
      setChaptersLoading(true)
      const res = await fetch('/api/quest/chapters')
      const json = await res.json()
      if (json.code === 0 && json.data) setChapters(json.data)
    } catch { /* fallback to mock */ }
    finally { setChaptersLoading(false) }
  }, [])

  const fetchDaily = useCallback(async () => {
    try {
      setDailyLoading(true)
      const res = await fetch('/api/quest/daily')
      const json = await res.json()
      if (json.code === 0 && json.data) {
        setDailyTasks(json.data.tasks || [])
        setMilestones(json.data.milestones || [])
      }
    } catch { /* fallback to mock */ }
    finally { setDailyLoading(false) }
  }, [])

  const fetchAchievements = useCallback(async () => {
    try {
      setAchievementLoading(true)
      const res = await fetch('/api/quest/achievements')
      const json = await res.json()
      if (json.code === 0 && json.data) setAchievements(json.data)
    } catch { /* fallback to mock */ }
    finally { setAchievementLoading(false) }
  }, [])

  useEffect(() => { fetchCoreFlow() }, [fetchCoreFlow])
  useEffect(() => { fetchTutorials() }, [fetchTutorials])
  useEffect(() => { fetchChapters() }, [fetchChapters])
  useEffect(() => { fetchDaily() }, [fetchDaily])
  useEffect(() => { fetchAchievements() }, [fetchAchievements])

  // ────────────────────── Computed Filters ──────────────────────
  const filteredTutorials = useMemo(() => {
    if (!tutorialSearch.trim()) return tutorials
    const s = tutorialSearch.toLowerCase()
    return tutorials.filter(
      (t) => t.title.toLowerCase().includes(s) || t.stepKey.toLowerCase().includes(s) || t.triggerType.includes(s),
    )
  }, [tutorials, tutorialSearch])

  const filteredDailyTasks = useMemo(() => {
    if (!dailySearch.trim()) return dailyTasks
    const s = dailySearch.toLowerCase()
    return dailyTasks.filter(
      (t) => t.title.toLowerCase().includes(s) || t.taskKey.toLowerCase().includes(s) || t.taskType.includes(s),
    )
  }, [dailyTasks, dailySearch])

  const filteredAchievements = useMemo(() => {
    let result = achievements
    if (categoryFilter !== 'all') result = result.filter((a) => a.category === categoryFilter)
    if (achievementSearch.trim()) {
      const s = achievementSearch.toLowerCase()
      result = result.filter((a) => a.title.toLowerCase().includes(s) || a.conditionType.includes(s))
    }
    return result
  }, [achievements, categoryFilter, achievementSearch])

  // ────────────────────── Tutorial Handlers ──────────────────────
  const openCreateTutorial = () => {
    setEditingTutorial(null)
    setTStepOrder(tutorials.length + 1); setTStepKey(''); setTTitle('')
    setTTriggerType('level'); setTIsRequired(true); setTStatus(true)
    setTDialogues('[{"npc":"","text":"","position":"left"}]'); setTRewards('{}')
    setTUiTarget(''); setTDescription('')
    setTutorialDialogOpen(true)
  }

  const openEditTutorial = (t: TutorialStep) => {
    setEditingTutorial(t)
    setTStepOrder(t.stepOrder); setTStepKey(t.stepKey); setTTitle(t.title)
    setTTriggerType(t.triggerType); setTIsRequired(t.isRequired); setTStatus(t.status === 1)
    setTDialogues(t.dialogues); setTRewards(t.rewards); setTUiTarget(t.uiTarget); setTDescription(t.description)
    setTutorialDialogOpen(true)
  }

  const handleSaveTutorial = async () => {
    if (!tTitle.trim() || !tStepKey.trim()) return
    const payload = { stepOrder: tStepOrder, stepKey: tStepKey, title: tTitle, triggerType: tTriggerType, isRequired: tIsRequired, status: tStatus ? 1 : 0, dialogues: tDialogues, rewards: tRewards, uiTarget: tUiTarget, description: tDescription }
    try {
      if (editingTutorial) {
        await fetch('/api/quest/tutorial', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingTutorial.id, ...payload }) })
        setTutorials((prev) => prev.map((t) => t.id === editingTutorial.id ? { ...t, ...payload } : t))
      } else {
        const res = await fetch('/api/quest/tutorial', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const json = await res.json()
        const newId = json.code === 0 && json.data?.id ? json.data.id : Math.max(...tutorials.map((t) => t.id), 0) + 1
        setTutorials((prev) => [...prev, { id: newId, ...payload }])
      }
    } catch { /* optimistic update already done above */ }
    setTutorialDialogOpen(false)
  }

  const toggleTutorialStatus = async (t: TutorialStep) => {
    const newStatus = t.status === 1 ? 0 : 1
    setTutorials((prev) => prev.map((s) => (s.id === t.id ? { ...s, status: newStatus } : s)))
    try { await fetch('/api/quest/tutorial', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: t.id, status: newStatus }) }) } catch { /* ignore */ }
  }

  const handleDeleteTutorial = async () => {
    if (!deleteTutorial) return
    setTutorials((prev) => prev.filter((t) => t.id !== deleteTutorial.id))
    try { await fetch(`/api/quest/tutorial?id=${deleteTutorial.id}`, { method: 'DELETE' }) } catch { /* ignore */ }
    setDeleteTutorial(null)
  }

  // ────────────────────── Chapter Handlers ──────────────────────
  const toggleChapter = (id: number) => {
    setExpandedChapters((prev) => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }

  const openCreateChapter = () => {
    setEditingChapter(null); setCOrder(chapters.length + 1); setCTitle(''); setCUnlockLevel(1); setCDescription('')
    setChapterDialogOpen(true)
  }

  const openEditChapter = (ch: Chapter) => {
    setEditingChapter(ch); setCOrder(ch.chapterOrder); setCTitle(ch.title); setCUnlockLevel(ch.unlockLevel); setCDescription(ch.description)
    setChapterDialogOpen(true)
  }

  const handleSaveChapter = async () => {
    if (!cTitle.trim()) return
    const payload = { chapterOrder: cOrder, title: cTitle, unlockLevel: cUnlockLevel, description: cDescription }
    try {
      if (editingChapter) {
        await fetch('/api/quest/chapters', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingChapter.id, ...payload }) })
        setChapters((prev) => prev.map((ch) => ch.id === editingChapter.id ? { ...ch, ...payload } : ch))
      } else {
        const res = await fetch('/api/quest/chapters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const json = await res.json()
        const newId = json.code === 0 && json.data?.id ? json.data.id : Math.max(...chapters.map((ch) => ch.id), 0) + 1
        setChapters((prev) => [...prev, { id: newId, ...payload, quests: [] }])
      }
    } catch { /* optimistic */ }
    setChapterDialogOpen(false)
  }

  const handleDeleteChapter = async () => {
    if (!deleteChapter) return
    setChapters((prev) => prev.filter((ch) => ch.id !== deleteChapter.id))
    try { await fetch(`/api/quest/chapters?id=${deleteChapter.id}`, { method: 'DELETE' }) } catch { /* ignore */ }
    setDeleteChapter(null)
  }

  // ────────────────────── Quest Handlers ──────────────────────
  const openCreateQuest = (chapterId: number) => {
    const chapter = chapters.find((ch) => ch.id === chapterId)
    setEditingQuest(null); setQChapterId(chapterId); setQOrder((chapter?.quests.length ?? 0) + 1)
    setQTitle(''); setQType('story'); setQTargetType(''); setQTargetCount(1); setQEnergyCost(5); setQRewards('{}'); setQDescription('')
    setQuestDialogOpen(true)
  }

  const openEditQuest = (chapterId: number, q: Quest) => {
    setEditingQuest({ chapterId, quest: q }); setQChapterId(chapterId); setQOrder(q.questOrder)
    setQTitle(q.title); setQType(q.questType); setQTargetType(q.targetType); setQTargetCount(q.targetCount)
    setQEnergyCost(q.energyCost); setQRewards(q.rewards); setQDescription(q.description)
    setQuestDialogOpen(true)
  }

  const handleSaveQuest = async () => {
    if (!qTitle.trim()) return
    const payload = { chapterId: qChapterId, questOrder: qOrder, title: qTitle, questType: qType, targetType: qTargetType, targetCount: qTargetCount, energyCost: qEnergyCost, rewards: qRewards, description: qDescription }
    try {
      if (editingQuest) {
        await fetch('/api/quest/chapters', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_quest', id: editingQuest.quest.id, ...payload }) })
        setChapters((prev) => prev.map((ch) => ch.id !== qChapterId ? ch : { ...ch, quests: ch.quests.map((q) => q.id === editingQuest.quest.id ? { ...q, ...payload } : q) }))
      } else {
        const res = await fetch('/api/quest/chapters', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create_quest', ...payload }) })
        const json = await res.json()
        const newId = json.code === 0 && json.data?.id ? json.data.id : Date.now()
        setChapters((prev) => prev.map((ch) => ch.id !== qChapterId ? ch : { ...ch, quests: [...ch.quests, { id: newId, ...payload, status: 1 }] }))
      }
    } catch { /* optimistic */ }
    setQuestDialogOpen(false)
  }

  const handleDeleteQuest = async () => {
    if (!deleteQuest) return
    setChapters((prev) => prev.map((ch) => ch.id === deleteQuest.chapterId ? { ...ch, quests: ch.quests.filter((q) => q.id !== deleteQuest.quest.id) } : ch))
    try { await fetch('/api/quest/chapters', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'delete_quest', id: deleteQuest.quest.id }) }) } catch { /* ignore */ }
    setDeleteQuest(null)
  }

  // ────────────────────── Daily Handlers ──────────────────────
  const openCreateDaily = () => {
    setEditingDaily(null); setDTaskKey(''); setDTitle(''); setDTaskType('battle'); setDTargetCount(1)
    setDRefreshType('daily'); setDActivityPoints(10); setDSortOrder(dailyTasks.length + 1)
    setDailyDialogOpen(true)
  }

  const openEditDaily = (t: DailyTask) => {
    setEditingDaily(t); setDTaskKey(t.taskKey); setDTitle(t.title); setDTaskType(t.taskType)
    setDTargetCount(t.targetCount); setDRefreshType(t.refreshType); setDActivityPoints(t.activityPoints); setDSortOrder(t.sortOrder)
    setDailyDialogOpen(true)
  }

  const handleSaveDaily = async () => {
    if (!dTitle.trim() || !dTaskKey.trim()) return
    const payload = { taskKey: dTaskKey, title: dTitle, taskType: dTaskType, targetCount: dTargetCount, refreshType: dRefreshType, activityPoints: dActivityPoints, sortOrder: dSortOrder }
    try {
      if (editingDaily) {
        await fetch('/api/quest/daily', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_task', id: editingDaily.id, ...payload }) })
        setDailyTasks((prev) => prev.map((t) => t.id === editingDaily.id ? { ...t, ...payload } : t))
      } else {
        const res = await fetch('/api/quest/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const json = await res.json()
        const newId = json.code === 0 && json.data?.id ? json.data.id : Math.max(...dailyTasks.map((t) => t.id), 0) + 1
        setDailyTasks((prev) => [...prev, { id: newId, ...payload, status: 1 }])
      }
    } catch { /* optimistic */ }
    setDailyDialogOpen(false)
  }

  const handleDeleteDaily = async () => {
    if (!deleteDaily) return
    setDailyTasks((prev) => prev.filter((t) => t.id !== deleteDaily.id))
    try { await fetch(`/api/quest/daily?type=task&id=${deleteDaily.id}`, { method: 'DELETE' }) } catch { /* ignore */ }
    setDeleteDaily(null)
  }

  // ────────────────────── Milestone Handlers ──────────────────────
  const openCreateMilestone = () => {
    setEditingMilestone(null); setMRequiredPoints(0); setMRewards('{}'); setMTitle('')
    setMilestoneDialogOpen(true)
  }

  const openEditMilestone = (m: ActivityMilestone) => {
    setEditingMilestone(m); setMRequiredPoints(m.requiredPoints); setMRewards(m.rewards); setMTitle(m.title)
    setMilestoneDialogOpen(true)
  }

  const handleSaveMilestone = async () => {
    if (!mTitle.trim()) return
    const payload = { requiredPoints: mRequiredPoints, rewards: mRewards, title: mTitle }
    try {
      if (editingMilestone) {
        await fetch('/api/quest/daily', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'update_milestone', id: editingMilestone.id, ...payload }) })
        setMilestones((prev) => prev.map((m) => m.id === editingMilestone.id ? { ...m, ...payload } : m))
      } else {
        const res = await fetch('/api/quest/daily', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'create_milestone', ...payload }) })
        const json = await res.json()
        const newId = json.code === 0 && json.data?.id ? json.data.id : Math.max(...milestones.map((m) => m.id), 0) + 1
        setMilestones((prev) => [...prev, { id: newId, ...payload }])
      }
    } catch { /* optimistic */ }
    setMilestoneDialogOpen(false)
  }

  const handleDeleteMilestone = async () => {
    if (!deleteMilestone) return
    setMilestones((prev) => prev.filter((m) => m.id !== deleteMilestone.id))
    try { await fetch(`/api/quest/daily?type=milestone&id=${deleteMilestone.id}`, { method: 'DELETE' }) } catch { /* ignore */ }
    setDeleteMilestone(null)
  }

  // ────────────────────── Achievement Handlers ──────────────────────
  const openCreateAchievement = () => {
    setEditingAchievement(null); setATitle(''); setADescription(''); setACategory('battle')
    setAConditionType(''); setAConditionParams('{}'); setARewardPoints(10); setAIsHidden(false); setASortOrder(achievements.length + 1)
    setAchievementDialogOpen(true)
  }

  const openEditAchievement = (a: Achievement) => {
    setEditingAchievement(a); setATitle(a.title); setADescription(a.description); setACategory(a.category)
    setAConditionType(a.conditionType); setAConditionParams(a.conditionParams); setARewardPoints(a.rewardPoints); setAIsHidden(a.isHidden); setASortOrder(a.sortOrder)
    setAchievementDialogOpen(true)
  }

  const handleSaveAchievement = async () => {
    if (!aTitle.trim() || !aConditionType.trim()) return
    const payload = { title: aTitle, description: aDescription, category: aCategory, conditionType: aConditionType, conditionParams: aConditionParams, rewardPoints: aRewardPoints, isHidden: aIsHidden, sortOrder: aSortOrder }
    try {
      if (editingAchievement) {
        await fetch('/api/quest/achievements', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editingAchievement.id, ...payload }) })
        setAchievements((prev) => prev.map((a) => a.id === editingAchievement.id ? { ...a, ...payload } : a))
      } else {
        const res = await fetch('/api/quest/achievements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
        const json = await res.json()
        const newId = json.code === 0 && json.data?.id ? json.data.id : Math.max(...achievements.map((a) => a.id), 0) + 1
        setAchievements((prev) => [...prev, { id: newId, ...payload, status: 1 }])
      }
    } catch { /* optimistic */ }
    setAchievementDialogOpen(false)
  }

  const handleDeleteAchievement = async () => {
    if (!deleteAchievement) return
    setAchievements((prev) => prev.filter((a) => a.id !== deleteAchievement.id))
    try { await fetch(`/api/quest/achievements?id=${deleteAchievement.id}`, { method: 'DELETE' }) } catch { /* ignore */ }
    setDeleteAchievement(null)
  }

  // ────────────────────── Core Flow KPI Config ──────────────────────
  const kpiCards = coreFlow ? [
    { label: '引导完成率', value: `${coreFlow.kpi.tutorialCompleteRate}%`, icon: BookOpen, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-l-amber-500' },
    { label: '平均主线进度', value: `${coreFlow.kpi.questAvgProgress} 章`, icon: Swords, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-l-red-500' },
    { label: '人均日常完成', value: `${coreFlow.kpi.dailyTaskAvgCount} 个`, icon: Calendar, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-l-emerald-500' },
    { label: '日常全勤率', value: `${coreFlow.kpi.dailyTaskFullRate}%`, icon: Activity, color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-l-sky-500' },
    { label: '人均成就数', value: `${coreFlow.kpi.achievementAvgCount}`, icon: Trophy, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-l-purple-500' },
    { label: '留存提升', value: `${coreFlow.kpi.retentionLift}%`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-l-emerald-500' },
  ] : []

  // ────────────────────── Sorted daily completion for chart ──────────────────────
  const sortedDailyCompletion = useMemo(() => {
    if (!coreFlow?.dailyCompletion) return []
    return [...coreFlow.dailyCompletion].sort((a, b) => b.completionRate - a.completionRate)
  }, [coreFlow?.dailyCompletion])

  // ==================== Render ====================
  return (
    <div className="space-y-6">
      {scrollbarStyle}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-5 w-5 text-amber-500" />
            任务系统
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">管理新手引导、主线任务、日常任务和成就系统</p>
        </div>
      </div>

      <Tabs defaultValue="core-flow">
        <TabsList className="grid w-full grid-cols-5 h-9">
          <TabsTrigger value="core-flow" className="text-xs gap-1.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400">
            <Activity className="h-3.5 w-3.5 hidden sm:block" />
            <span className="hidden sm:inline">核心流程概览</span>
            <span className="sm:hidden">概览</span>
          </TabsTrigger>
          <TabsTrigger value="tutorial" className="text-xs gap-1.5 data-[state=active]:bg-amber-500/10 data-[state=active]:text-amber-700 dark:data-[state=active]:text-amber-400">
            <BookOpen className="h-3.5 w-3.5 hidden sm:block" />
            <span className="hidden sm:inline">新手引导</span>
            <span className="sm:hidden">引导</span>
          </TabsTrigger>
          <TabsTrigger value="main-quest" className="text-xs gap-1.5 data-[state=active]:bg-red-500/10 data-[state=active]:text-red-700 dark:data-[state=active]:text-red-400">
            <Swords className="h-3.5 w-3.5 hidden sm:block" />
            <span className="hidden sm:inline">主线任务</span>
            <span className="sm:hidden">主线</span>
          </TabsTrigger>
          <TabsTrigger value="daily-task" className="text-xs gap-1.5 data-[state=active]:bg-emerald-500/10 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400">
            <Calendar className="h-3.5 w-3.5 hidden sm:block" />
            <span className="hidden sm:inline">日常任务</span>
            <span className="sm:hidden">日常</span>
          </TabsTrigger>
          <TabsTrigger value="achievement" className="text-xs gap-1.5 data-[state=active]:bg-purple-500/10 data-[state=active]:text-purple-700 dark:data-[state=active]:text-purple-400">
            <Trophy className="h-3.5 w-3.5 hidden sm:block" />
            <span className="hidden sm:inline">成就系统</span>
            <span className="sm:hidden">成就</span>
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════ Tab 0: 核心流程概览 ═══════════════════ */}
        <TabsContent value="core-flow" className="space-y-4">
          {/* Refresh button */}
          <div className="flex items-center justify-end">
            <Button size="sm" variant="outline" onClick={fetchCoreFlow} disabled={coreFlowLoading}>
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${coreFlowLoading ? 'animate-spin' : ''}`} />
              刷新数据
            </Button>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {coreFlowLoading ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />) :
              kpiCards.map((kpi) => (
                <Card key={kpi.label} className={`border-l-4 ${kpi.border}`}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                      <span className="text-xs text-muted-foreground">{kpi.label}</span>
                    </div>
                    <p className="text-xl font-bold tracking-tight">{kpi.value}</p>
                  </CardContent>
                </Card>
              ))
            }
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Chart 1: Tutorial Funnel */}
            {coreFlowLoading ? <SkeletonChart /> : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-amber-500" />
                    新手引导漏斗
                  </CardTitle>
                  <CardDescription className="text-xs">每步完成率，按必选/可选着色</CardDescription>
                </CardHeader>
                <CardContent>
                  {coreFlow?.tutorialFunnel && coreFlow.tutorialFunnel.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={coreFlow.tutorialFunnel} layout="vertical" margin={{ left: 60, right: 20, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                        <YAxis type="category" dataKey="title" width={80} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v: number) => [`${v}%`, '完成率']} />
                        <Bar dataKey="completionRate" radius={[0, 4, 4, 0]}>
                          {coreFlow.tutorialFunnel.map((entry, idx) => (
                            <Cell key={idx} fill={entry.isRequired ? '#f59e0b' : '#9ca3af'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-muted-foreground text-center py-10">暂无数据</p>}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500 inline-block" /> 必选步骤</span>
                    <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-400 inline-block" /> 可选步骤</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chart 2: Retention Comparison */}
            {coreFlowLoading ? <SkeletonChart /> : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-500" />
                    留存对比趋势
                  </CardTitle>
                  <CardDescription className="text-xs">有引导/无引导/有主线留存对比</CardDescription>
                </CardHeader>
                <CardContent>
                  {coreFlow?.retentionComparison && coreFlow.retentionComparison.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={coreFlow.retentionComparison} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} unit="%" />
                        <Tooltip formatter={(v: number) => [`${v}%`]} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="day1WithTutorial" stroke="#f59e0b" name="有引导D1" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="day1WithoutTutorial" stroke="#ef4444" name="无引导D1" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="day7WithQuest" stroke="#10b981" name="有主线D7" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-muted-foreground text-center py-10">暂无数据</p>}
                </CardContent>
              </Card>
            )}

            {/* Chart 3: Quest Progress Distribution */}
            {coreFlowLoading ? <SkeletonChart /> : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Swords className="h-4 w-4 text-red-500" />
                    主线进度分布
                  </CardTitle>
                  <CardDescription className="text-xs">每章玩家数与完成率</CardDescription>
                </CardHeader>
                <CardContent>
                  {coreFlow?.questProgressDist && coreFlow.questProgressDist.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={coreFlow.questProgressDist} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="chapter" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="playerCount" fill="#ef4444" name="玩家数" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="completionRate" fill="#fb923c" name="完成率(%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-muted-foreground text-center py-10">暂无数据</p>}
                </CardContent>
              </Card>
            )}

            {/* Chart 4: Daily Task Completion */}
            {coreFlowLoading ? <SkeletonChart /> : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-emerald-500" />
                    日常任务完成率
                  </CardTitle>
                  <CardDescription className="text-xs">各日常任务完成率排名</CardDescription>
                </CardHeader>
                <CardContent>
                  {sortedDailyCompletion.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={sortedDailyCompletion} layout="vertical" margin={{ left: 90, right: 20, top: 5, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                        <YAxis type="category" dataKey="title" width={85} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(v: number) => [`${v}%`, '完成率']} />
                        <Bar dataKey="completionRate" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-muted-foreground text-center py-10">暂无数据</p>}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Achievement Unlock Table */}
          {!coreFlowLoading && coreFlow?.achievementUnlock && coreFlow.achievementUnlock.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Award className="h-4 w-4 text-purple-500" />
                  成就解锁率 TOP 10
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto quest-scroll max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">排名</TableHead>
                        <TableHead className="text-xs">成就名称</TableHead>
                        <TableHead className="text-xs">分类</TableHead>
                        <TableHead className="text-xs text-right">解锁率</TableHead>
                        <TableHead className="text-xs text-right">奖励积分</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {coreFlow.achievementUnlock.map((a, idx) => {
                        const cat = achievementCategoryMap[a.category]
                        return (
                          <TableRow key={a.id} className="text-sm">
                            <TableCell>
                              <span className={`font-bold ${idx < 3 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                {idx === 0 && '🥇'}{idx === 1 && '🥈'}{idx === 2 && '🥉'}{idx > 2 && `#${idx + 1}`}
                              </span>
                            </TableCell>
                            <TableCell className="font-medium">{a.title}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={`text-xs px-2 py-0.5 border ${cat?.cls || ''}`}>{cat?.text || a.category}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                  <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min(100, a.unlockRate)}%` }} />
                                </div>
                                <span className="font-mono text-xs">{a.unlockRate}%</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">{a.rewardPoints}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════ Tab 1: 新手引导 ═══════════════════ */}
        <TabsContent value="tutorial" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="搜索步骤名称或Key..." value={tutorialSearch} onChange={(e) => setTutorialSearch(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fetchTutorials} disabled={tutorialLoading}>
                {tutorialLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                刷新
              </Button>
              <Button size="sm" onClick={openCreateTutorial}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                添加步骤
              </Button>
            </div>
          </div>

          {tutorialLoading ? (
            <Card><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[520px] overflow-y-auto quest-scroll">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs w-10"></TableHead>
                        <TableHead className="text-xs">序号</TableHead>
                        <TableHead className="text-xs">步骤Key</TableHead>
                        <TableHead className="text-xs">标题</TableHead>
                        <TableHead className="text-xs">触发类型</TableHead>
                        <TableHead className="text-xs">必须完成</TableHead>
                        <TableHead className="text-xs">状态</TableHead>
                        <TableHead className="text-xs text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTutorials.map((t) => {
                        const tt = triggerTypeMap[t.triggerType]
                        return (
                          <TableRow key={t.id} className="text-sm">
                            <TableCell className="w-10"><GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" /></TableCell>
                            <TableCell className="font-mono text-xs">{t.stepOrder}</TableCell>
                            <TableCell className="font-mono text-xs">{t.stepKey}</TableCell>
                            <TableCell className="font-medium whitespace-nowrap">{t.title}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant="outline" className={`text-xs px-2 py-0.5 border ${tt.cls}`}>{tt.text}</Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant={t.isRequired ? 'default' : 'secondary'} className={`text-xs px-2 py-0.5 ${t.isRequired ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 border' : 'bg-stone-500/10 text-stone-500 border border-stone-300'}`}>
                                {t.isRequired ? '是' : '否'}
                              </Badge>
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Switch checked={t.status === 1} onCheckedChange={() => toggleTutorialStatus(t)} className="scale-75" />
                            </TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setViewingTutorial(t); setTutorialDetailOpen(true) }}><Eye className="h-3.5 w-3.5" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditTutorial(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteTutorial(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {filteredTutorials.length === 0 && (
                        <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-sm">暂无引导步骤数据</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════ Tab 2: 主线任务 ═══════════════════ */}
        <TabsContent value="main-quest" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold flex items-center gap-2">
              <Swords className="h-4 w-4 text-red-500" />
              章节列表
              <Badge variant="secondary" className="text-xs font-normal">{chapters.length} 章节</Badge>
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fetchChapters} disabled={chaptersLoading}>
                {chaptersLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                刷新
              </Button>
              <Button size="sm" onClick={openCreateChapter}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                添加章节
              </Button>
            </div>
          </div>

          {chaptersLoading ? (
            <Card><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
          ) : (
            <div className="space-y-3">
              {chapters.map((chapter) => {
                const isExpanded = expandedChapters.has(chapter.id)
                return (
                  <Card key={chapter.id} className="overflow-hidden">
                    <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleChapter(chapter.id)}>
                      <div className="flex items-center gap-3">
                        {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs font-mono px-1.5 py-0 bg-red-500/10 text-red-700 dark:text-red-400 border-red-300">第{chapter.chapterOrder}章</Badge>
                            <span className="font-semibold text-sm">{chapter.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{chapter.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="secondary" className="text-xs">{chapter.quests.length} 任务</Badge>
                        <Badge variant="outline" className="text-xs">Lv.{chapter.unlockLevel} 解锁</Badge>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditChapter(chapter)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteChapter(chapter)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="border-t">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent bg-muted/20">
                                <TableHead className="text-xs">序号</TableHead>
                                <TableHead className="text-xs">任务标题</TableHead>
                                <TableHead className="text-xs">类型</TableHead>
                                <TableHead className="text-xs">目标类型</TableHead>
                                <TableHead className="text-xs text-right">目标数量</TableHead>
                                <TableHead className="text-xs text-right">体力消耗</TableHead>
                                <TableHead className="text-xs">奖励</TableHead>
                                <TableHead className="text-xs text-right">操作</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {chapter.quests.map((quest) => {
                                const qt = questTypeMap[quest.questType]
                                return (
                                  <TableRow key={quest.id} className="text-sm">
                                    <TableCell className="font-mono text-xs">{quest.questOrder}</TableCell>
                                    <TableCell className="font-medium whitespace-nowrap">{quest.title}</TableCell>
                                    <TableCell className="whitespace-nowrap"><Badge variant="outline" className={`text-xs px-2 py-0.5 border ${qt.cls}`}>{qt.text}</Badge></TableCell>
                                    <TableCell className="font-mono text-xs">{quest.targetType}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">{quest.targetCount}</TableCell>
                                    <TableCell className="text-right font-mono text-xs">{quest.energyCost}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate" title={quest.rewards}>{quest.rewards}</TableCell>
                                    <TableCell className="text-right whitespace-nowrap">
                                      <div className="flex items-center justify-end gap-1">
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditQuest(chapter.id, quest)}><Pencil className="h-3.5 w-3.5" /></Button>
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteQuest({ chapterId: chapter.id, quest })}><Trash2 className="h-3.5 w-3.5" /></Button>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                              {chapter.quests.length === 0 && (
                                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-6 text-sm">暂无任务</TableCell></TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </div>
                        <div className="p-3 border-t">
                          <Button size="sm" variant="outline" onClick={() => openCreateQuest(chapter.id)}><Plus className="h-3.5 w-3.5 mr-1.5" />添加任务</Button>
                        </div>
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══════════════════ Tab 3: 日常任务 ═══════════════════ */}
        <TabsContent value="daily-task" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="搜索任务名称或Key..." value={dailySearch} onChange={(e) => setDailySearch(e.target.value)} className="pl-8 h-8 text-xs" />
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fetchDaily} disabled={dailyLoading}>
                {dailyLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                刷新
              </Button>
              <Button size="sm" onClick={openCreateDaily}>
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                添加任务
              </Button>
            </div>
          </div>

          {dailyLoading ? (
            <Card><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
          ) : (
            <>
              <Card>
                <CardContent className="p-0">
                  <div className="overflow-x-auto max-h-[420px] overflow-y-auto quest-scroll">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs">任务Key</TableHead>
                          <TableHead className="text-xs">标题</TableHead>
                          <TableHead className="text-xs">类型</TableHead>
                          <TableHead className="text-xs text-right">目标数量</TableHead>
                          <TableHead className="text-xs">刷新周期</TableHead>
                          <TableHead className="text-xs text-right">活跃度</TableHead>
                          <TableHead className="text-xs">排序</TableHead>
                          <TableHead className="text-xs text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDailyTasks.map((t) => {
                          const dt = dailyTypeMap[t.taskType]
                          const rt = refreshTypeMap[t.refreshType]
                          return (
                            <TableRow key={t.id} className="text-sm">
                              <TableCell className="font-mono text-xs">{t.taskKey}</TableCell>
                              <TableCell className="font-medium whitespace-nowrap">{t.title}</TableCell>
                              <TableCell className="whitespace-nowrap"><Badge variant="outline" className={`text-xs px-2 py-0.5 border ${dt.cls}`}>{dt.text}</Badge></TableCell>
                              <TableCell className="text-right font-mono text-xs">{t.targetCount}</TableCell>
                              <TableCell className="whitespace-nowrap"><Badge variant="outline" className={`text-xs px-2 py-0.5 border ${rt.cls}`}>{rt.text}</Badge></TableCell>
                              <TableCell className="text-right"><Badge variant="outline" className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300">{t.activityPoints} 点</Badge></TableCell>
                              <TableCell className="font-mono text-xs text-muted-foreground">{t.sortOrder}</TableCell>
                              <TableCell className="text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditDaily(t)}><Pencil className="h-3.5 w-3.5" /></Button>
                                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteDaily(t)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                        {filteredDailyTasks.length === 0 && (
                          <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8 text-sm">暂无日常任务数据</TableCell></TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Activity Milestones */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Star className="h-4 w-4 text-amber-500" />
                      活跃度奖励
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={openCreateMilestone}><Plus className="h-3.5 w-3.5 mr-1.5" />添加奖励</Button>
                  </div>
                  <CardDescription className="text-xs">玩家每日/每周累计活跃度达到指定数值可领取奖励</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-xs">奖励名称</TableHead>
                          <TableHead className="text-xs text-right">所需活跃度</TableHead>
                          <TableHead className="text-xs">奖励内容</TableHead>
                          <TableHead className="text-xs text-right">操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {milestones.map((m) => (
                          <TableRow key={m.id} className="text-sm">
                            <TableCell className="font-medium whitespace-nowrap">{m.title}</TableCell>
                            <TableCell className="text-right"><Badge variant="outline" className="text-xs px-2 py-0.5 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300">{m.requiredPoints} 点</Badge></TableCell>
                            <TableCell className="font-mono text-xs max-w-[200px] truncate" title={m.rewards}>{m.rewards}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditMilestone(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteMilestone(m)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ═══════════════════ Tab 4: 成就系统 ═══════════════════ */}
        <TabsContent value="achievement" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="搜索成就名称..." value={achievementSearch} onChange={(e) => setAchievementSearch(e.target.value)} className="pl-8 h-8 text-xs" />
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'all', text: '全部' }, { key: 'battle', text: '战斗' }, { key: 'collection', text: '收集' },
                  { key: 'social', text: '社交' }, { key: 'development', text: '发展' }, { key: 'guild', text: '联盟' },
                ].map((cat) => (
                  <Button key={cat.key} size="sm" variant={categoryFilter === cat.key ? 'default' : 'outline'}
                    className={`text-xs h-7 px-2.5 ${categoryFilter === cat.key ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
                    onClick={() => setCategoryFilter(cat.key)}>{cat.text}</Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={fetchAchievements} disabled={achievementLoading}>
                {achievementLoading ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1.5" />}
                刷新
              </Button>
              <Button size="sm" onClick={openCreateAchievement}><Plus className="h-3.5 w-3.5 mr-1.5" />添加成就</Button>
            </div>
          </div>

          {achievementLoading ? (
            <Card><CardContent className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto max-h-[520px] overflow-y-auto quest-scroll">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-xs">成就名称</TableHead>
                        <TableHead className="text-xs">分类</TableHead>
                        <TableHead className="text-xs">条件类型</TableHead>
                        <TableHead className="text-xs text-right">奖励积分</TableHead>
                        <TableHead className="text-xs">隐藏</TableHead>
                        <TableHead className="text-xs">排序</TableHead>
                        <TableHead className="text-xs text-right">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAchievements.map((a) => {
                        const cat = achievementCategoryMap[a.category]
                        return (
                          <TableRow key={a.id} className="text-sm">
                            <TableCell className="font-medium whitespace-nowrap">
                              <div className="flex items-center gap-1.5">{a.isHidden && <Eye className="h-3 w-3 text-muted-foreground" />}{a.title}</div>
                            </TableCell>
                            <TableCell className="whitespace-nowrap"><Badge variant="outline" className={`text-xs px-2 py-0.5 border ${cat.cls}`}>{cat.text}</Badge></TableCell>
                            <TableCell className="font-mono text-xs">{a.conditionType}</TableCell>
                            <TableCell className="text-right"><Badge variant="outline" className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300">{a.rewardPoints} 分</Badge></TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge variant={a.isHidden ? 'secondary' : 'outline'} className={`text-xs px-2 py-0.5 ${a.isHidden ? 'bg-stone-500/10 text-stone-500 border border-stone-300' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-300'}`}>
                                {a.isHidden ? '隐藏' : '显示'}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{a.sortOrder}</TableCell>
                            <TableCell className="text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEditAchievement(a)}><Pencil className="h-3.5 w-3.5" /></Button>
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => setDeleteAchievement(a)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                      {filteredAchievements.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">暂无成就数据</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* ═══════════════════ Tutorial: Create/Edit Dialog ═══════════════════ */}
      <Dialog open={tutorialDialogOpen} onOpenChange={setTutorialDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-amber-500" />
              {editingTutorial ? '编辑引导步骤' : '添加引导步骤'}
            </DialogTitle>
            <DialogDescription>配置新手引导步骤的触发条件和奖励</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">步骤序号 <span className="text-red-500">*</span></Label><Input type="number" value={tStepOrder} onChange={(e) => setTStepOrder(Number(e.target.value))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">步骤Key <span className="text-red-500">*</span></Label><Input placeholder="例: welcome" value={tStepKey} onChange={(e) => setTStepKey(e.target.value)} disabled={!!editingTutorial} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">步骤标题 <span className="text-red-500">*</span></Label><Input placeholder="例: 欢迎来到九州" value={tTitle} onChange={(e) => setTTitle(e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">触发类型</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={tTriggerType} onChange={(e) => setTTriggerType(e.target.value as TutorialStep['triggerType'])}>
                  <option value="level">等级触发</option><option value="building">建筑触发</option><option value="battle">战斗触发</option><option value="gacha">抽卡触发</option><option value="quest">任务触发</option><option value="social">社交触发</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">UI目标</Label><Input placeholder="例: main_city, gacha_panel" value={tUiTarget} onChange={(e) => setTUiTarget(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">对话内容 (JSON)</Label><Textarea placeholder='[{"npc":"诸葛亮","text":"欢迎","position":"left"}]' value={tDialogues} onChange={(e) => setTDialogues(e.target.value)} rows={4} className="font-mono text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-xs">奖励配置 (JSON)</Label><Textarea placeholder='{"gold":1000,"diamond":100}' value={tRewards} onChange={(e) => setTRewards(e.target.value)} rows={3} className="font-mono text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-xs">描述</Label><Input placeholder="步骤描述..." value={tDescription} onChange={(e) => setTDescription(e.target.value)} /></div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2"><Switch checked={tIsRequired} onCheckedChange={setTIsRequired} /><Label className="text-xs">必须完成</Label></div>
              <div className="flex items-center gap-2"><Switch checked={tStatus} onCheckedChange={setTStatus} /><Label className="text-xs">{tStatus ? '启用' : '禁用'}</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTutorialDialogOpen(false)}>取消</Button>
            <Button disabled={!tTitle.trim() || !tStepKey.trim()} onClick={handleSaveTutorial}>{editingTutorial ? '保存修改' : '添加步骤'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ Tutorial: Detail View Dialog ═══════════════════ */}
      <Dialog open={tutorialDetailOpen} onOpenChange={setTutorialDetailOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4 text-amber-500" />{viewingTutorial?.title}</DialogTitle>
          </DialogHeader>
          {viewingTutorial && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><span className="text-xs text-muted-foreground">步骤Key</span><p className="text-sm font-mono">{viewingTutorial.stepKey}</p></div>
                <div className="space-y-1"><span className="text-xs text-muted-foreground">步骤序号</span><p className="text-sm font-mono">{viewingTutorial.stepOrder}</p></div>
                <div className="space-y-1"><span className="text-xs text-muted-foreground">触发类型</span><Badge variant="outline" className={`text-xs px-2 py-0.5 border ${triggerTypeMap[viewingTutorial.triggerType]?.cls}`}>{triggerTypeMap[viewingTutorial.triggerType]?.text}</Badge></div>
                <div className="space-y-1"><span className="text-xs text-muted-foreground">UI目标</span><p className="text-sm font-mono">{viewingTutorial.uiTarget}</p></div>
              </div>
              <Separator />
              <div className="space-y-1"><span className="text-xs text-muted-foreground">对话内容</span><pre className="text-xs font-mono bg-muted p-2 rounded max-h-32 overflow-y-auto">{viewingTutorial.dialogues}</pre></div>
              <div className="space-y-1"><span className="text-xs text-muted-foreground">奖励配置</span><pre className="text-xs font-mono bg-muted p-2 rounded">{viewingTutorial.rewards}</pre></div>
              <div className="space-y-1"><span className="text-xs text-muted-foreground">描述</span><p className="text-sm">{viewingTutorial.description}</p></div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setTutorialDetailOpen(false)}>关闭</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ Tutorial: Delete Dialog ═══════════════════ */}
      <AlertDialog open={!!deleteTutorial} onOpenChange={() => setDeleteTutorial(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除引导步骤</AlertDialogTitle>
            <AlertDialogDescription>确定要删除「{deleteTutorial?.title}」吗？此操作不可撤销。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteTutorial}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════ Chapter: Create/Edit Dialog ═══════════════════ */}
      <Dialog open={chapterDialogOpen} onOpenChange={setChapterDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Swords className="h-4 w-4 text-red-500" />{editingChapter ? '编辑章节' : '添加章节'}</DialogTitle>
            <DialogDescription>{editingChapter ? '修改章节信息' : '创建新的主线章节'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">章节顺序</Label><Input type="number" value={cOrder} onChange={(e) => setCOrder(Number(e.target.value))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">解锁等级</Label><Input type="number" value={cUnlockLevel} onChange={(e) => setCUnlockLevel(Number(e.target.value))} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">章节标题 <span className="text-red-500">*</span></Label><Input placeholder="例: 黄巾之乱" value={cTitle} onChange={(e) => setCTitle(e.target.value)} /></div>
            <div className="space-y-1.5"><Label className="text-xs">章节描述</Label><Textarea placeholder="章节描述..." value={cDescription} onChange={(e) => setCDescription(e.target.value)} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setChapterDialogOpen(false)}>取消</Button>
            <Button disabled={!cTitle.trim()} onClick={handleSaveChapter}>{editingChapter ? '保存修改' : '添加章节'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ Chapter: Delete Dialog ═══════════════════ */}
      <AlertDialog open={!!deleteChapter} onOpenChange={() => setDeleteChapter(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除章节</AlertDialogTitle>
            <AlertDialogDescription>确定要删除「第{deleteChapter?.chapterOrder}章 {deleteChapter?.title}」及其所有任务吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteChapter}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════ Quest: Create/Edit Dialog ═══════════════════ */}
      <Dialog open={questDialogOpen} onOpenChange={setQuestDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Swords className="h-4 w-4 text-red-500" />{editingQuest ? '编辑任务' : '添加任务'}</DialogTitle>
            <DialogDescription>配置主线任务的类型、目标和奖励</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">任务顺序</Label><Input type="number" value={qOrder} onChange={(e) => setQOrder(Number(e.target.value))} /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">任务类型</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={qType} onChange={(e) => setQType(e.target.value as Quest['questType'])}>
                  <option value="story">剧情</option><option value="battle">战斗</option><option value="collect">收集</option><option value="explore">探索</option><option value="escort">护送</option><option value="defend">防守</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">任务标题 <span className="text-red-500">*</span></Label><Input placeholder="例: 初出茅庐" value={qTitle} onChange={(e) => setQTitle(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">目标类型</Label><Input placeholder="例: battle_win" value={qTargetType} onChange={(e) => setQTargetType(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">目标数量</Label><Input type="number" value={qTargetCount} onChange={(e) => setQTargetCount(Number(e.target.value))} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">体力消耗</Label><Input type="number" value={qEnergyCost} onChange={(e) => setQEnergyCost(Number(e.target.value))} /></div>
            <div className="space-y-1.5"><Label className="text-xs">奖励配置 (JSON)</Label><Textarea placeholder='{"exp":100,"gold":200}' value={qRewards} onChange={(e) => setQRewards(e.target.value)} rows={3} className="font-mono text-xs" /></div>
            <div className="space-y-1.5"><Label className="text-xs">描述</Label><Input placeholder="任务描述..." value={qDescription} onChange={(e) => setQDescription(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestDialogOpen(false)}>取消</Button>
            <Button disabled={!qTitle.trim()} onClick={handleSaveQuest}>{editingQuest ? '保存修改' : '添加任务'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ Quest: Delete Dialog ═══════════════════ */}
      <AlertDialog open={!!deleteQuest} onOpenChange={() => setDeleteQuest(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除任务</AlertDialogTitle>
            <AlertDialogDescription>确定要删除「{deleteQuest?.quest.title}」吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteQuest}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════ Daily Task: Create/Edit Dialog ═══════════════════ */}
      <Dialog open={dailyDialogOpen} onOpenChange={setDailyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Calendar className="h-4 w-4 text-emerald-500" />{editingDaily ? '编辑日常任务' : '添加日常任务'}</DialogTitle>
            <DialogDescription>配置日常任务的目标和活跃度奖励</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">任务Key <span className="text-red-500">*</span></Label><Input placeholder="例: daily_battle_3" value={dTaskKey} onChange={(e) => setDTaskKey(e.target.value)} disabled={!!editingDaily} /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">任务类型</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={dTaskType} onChange={(e) => setDTaskType(e.target.value as DailyTask['taskType'])}>
                  <option value="battle">战斗</option><option value="gacha">抽卡</option><option value="social">社交</option><option value="guild">联盟</option><option value="resource">资源</option><option value="growth">成长</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">任务标题 <span className="text-red-500">*</span></Label><Input placeholder="例: 完成3场战斗" value={dTitle} onChange={(e) => setDTitle(e.target.value)} /></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">目标数量</Label><Input type="number" value={dTargetCount} onChange={(e) => setDTargetCount(Number(e.target.value))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">活跃度</Label><Input type="number" value={dActivityPoints} onChange={(e) => setDActivityPoints(Number(e.target.value))} /></div>
              <div className="space-y-1.5"><Label className="text-xs">排序</Label><Input type="number" value={dSortOrder} onChange={(e) => setDSortOrder(Number(e.target.value))} /></div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">刷新周期</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={dRefreshType} onChange={(e) => setDRefreshType(e.target.value as DailyTask['refreshType'])}>
                <option value="daily">每日刷新</option><option value="weekly">每周刷新</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDailyDialogOpen(false)}>取消</Button>
            <Button disabled={!dTitle.trim() || !dTaskKey.trim()} onClick={handleSaveDaily}>{editingDaily ? '保存修改' : '添加任务'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ Daily Task: Delete Dialog ═══════════════════ */}
      <AlertDialog open={!!deleteDaily} onOpenChange={() => setDeleteDaily(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除日常任务</AlertDialogTitle>
            <AlertDialogDescription>确定要删除「{deleteDaily?.title}」吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteDaily}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════ Milestone: Create/Edit Dialog ═══════════════════ */}
      <Dialog open={milestoneDialogOpen} onOpenChange={setMilestoneDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Star className="h-4 w-4 text-amber-500" />{editingMilestone ? '编辑活跃度奖励' : '添加活跃度奖励'}</DialogTitle>
            <DialogDescription>配置活跃度里程碑的奖励内容</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">奖励名称</Label><Input placeholder="例: 金牌奖励" value={mTitle} onChange={(e) => setMTitle(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">所需活跃度</Label><Input type="number" value={mRequiredPoints} onChange={(e) => setMRequiredPoints(Number(e.target.value))} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">奖励内容 (JSON)</Label><Textarea placeholder='{"gold":5000,"diamond":200}' value={mRewards} onChange={(e) => setMRewards(e.target.value)} rows={3} className="font-mono text-xs" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMilestoneDialogOpen(false)}>取消</Button>
            <Button disabled={!mTitle.trim()} onClick={handleSaveMilestone}>{editingMilestone ? '保存修改' : '添加奖励'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ Milestone: Delete Dialog ═══════════════════ */}
      <AlertDialog open={!!deleteMilestone} onOpenChange={() => setDeleteMilestone(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除活跃度奖励</AlertDialogTitle>
            <AlertDialogDescription>确定要删除「{deleteMilestone?.title}」吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteMilestone}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═══════════════════ Achievement: Create/Edit Dialog ═══════════════════ */}
      <Dialog open={achievementDialogOpen} onOpenChange={setAchievementDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trophy className="h-4 w-4 text-purple-500" />{editingAchievement ? '编辑成就' : '添加成就'}</DialogTitle>
            <DialogDescription>配置成就的条件、分类和奖励</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">成就名称 <span className="text-red-500">*</span></Label><Input placeholder="例: 百战百胜" value={aTitle} onChange={(e) => setATitle(e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label className="text-xs">分类</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" value={aCategory} onChange={(e) => setACategory(e.target.value as Achievement['category'])}>
                  <option value="battle">战斗</option><option value="collection">收集</option><option value="social">社交</option><option value="development">发展</option><option value="guild">联盟</option>
                </select>
              </div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">描述</Label><Input placeholder="成就描述..." value={aDescription} onChange={(e) => setADescription(e.target.value)} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">条件类型 <span className="text-red-500">*</span></Label><Input placeholder="例: battle_win_count" value={aConditionType} onChange={(e) => setAConditionType(e.target.value)} /></div>
              <div className="space-y-1.5"><Label className="text-xs">奖励积分</Label><Input type="number" value={aRewardPoints} onChange={(e) => setARewardPoints(Number(e.target.value))} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">条件参数 (JSON)</Label><Textarea placeholder='{"count":100}' value={aConditionParams} onChange={(e) => setAConditionParams(e.target.value)} rows={3} className="font-mono text-xs" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label className="text-xs">排序</Label><Input type="number" value={aSortOrder} onChange={(e) => setASortOrder(Number(e.target.value))} /></div>
              <div className="flex items-center gap-2 pt-5"><Switch checked={aIsHidden} onCheckedChange={setAIsHidden} /><Label className="text-xs">隐藏成就</Label></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAchievementDialogOpen(false)}>取消</Button>
            <Button disabled={!aTitle.trim() || !aConditionType.trim()} onClick={handleSaveAchievement}>{editingAchievement ? '保存修改' : '添加成就'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════ Achievement: Delete Dialog ═══════════════════ */}
      <AlertDialog open={!!deleteAchievement} onOpenChange={() => setDeleteAchievement(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除成就</AlertDialogTitle>
            <AlertDialogDescription>确定要删除「{deleteAchievement?.title}」吗？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleDeleteAchievement}>删除</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
