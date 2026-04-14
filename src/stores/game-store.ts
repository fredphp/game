import { create } from 'zustand'

// ==================== Types ====================
export interface PlayerData {
  name: string
  level: number
  vipLevel: number
  gold: number
  diamonds: number
  stamina: number
  maxStamina: number
  prestige: number
  power: number
  avatarUrl: string
}

export interface Building {
  id: string
  name: string
  icon: string
  level: number
  maxLevel: number
  description: string
  upgrading: boolean
  remainingSeconds: number
}

export interface CardPool {
  id: string
  name: string
  type: 'normal' | 'limited' | 'rateup' | 'faction' | 'newbie'
  displayName: string
  banner: string
  description: string
}

export interface GachaCard {
  id: string
  name: string
  rarity: 3 | 4 | 5
  element: string
  faction: string
  isNew: boolean
}

export interface ShopItem {
  id: string
  name: string
  price: number
  originalPrice?: number
  currency: 'cny' | 'diamond' | 'gold'
  badge?: string
  badgeColor?: string
  description: string
  type: 'recharge' | 'monthly' | 'gift' | 'battlepass' | 'fund'
  remaining?: number
  duration?: number
  soldOut?: boolean
}

export interface TutorialStep {
  id: number
  stepKey: string
  title: string
  npcName: string
  npcAvatar: string
  dialogText: string
  targetId?: string
  isRequired: boolean
  reward: string
}

export type GameView = 'main-city' | 'gacha' | 'heroes' | 'battle' | 'shop' | 'more'

// ==================== Mock Data ====================
const MOCK_PLAYER: PlayerData = {
  name: '九州·曹操',
  level: 32,
  vipLevel: 5,
  gold: 1_258_000,
  diamonds: 3680,
  stamina: 86,
  maxStamina: 120,
  prestige: 12850,
  power: 85600,
  avatarUrl: '/game-hero-portrait.png',
}

const MOCK_BUILDINGS: Building[] = [
  { id: 'command_center', name: '主城', icon: '🏯', level: 8, maxLevel: 25, description: '城池核心，升级可解锁更多功能', upgrading: false, remainingSeconds: 0 },
  { id: 'barracks', name: '兵营', icon: '⚔️', level: 6, maxLevel: 20, description: '训练步兵、骑兵、弓兵', upgrading: true, remainingSeconds: 4520 },
  { id: 'academy', name: '书院', icon: '📜', level: 5, maxLevel: 20, description: '研究科技，提升全属性', upgrading: false, remainingSeconds: 0 },
  { id: 'blacksmith', name: '铁匠铺', icon: '🔨', level: 4, maxLevel: 15, description: '打造和升级装备', upgrading: false, remainingSeconds: 0 },
  { id: 'warehouse', name: '仓库', icon: '📦', level: 7, maxLevel: 20, description: '存储资源，升级提升容量', upgrading: true, remainingSeconds: 1800 },
  { id: 'tavern', name: '酒馆', icon: '🍶', level: 3, maxLevel: 10, description: '招募武将，每日免费招募', upgrading: false, remainingSeconds: 0 },
]

const MOCK_POOLS: CardPool[] = [
  { id: 'p1', name: 'hero_pool_1', type: 'limited', displayName: '天命·龙吟', banner: '/game-city-banner.png', description: 'UP! SSR关羽 概率提升' },
  { id: 'p2', name: 'hero_pool_2', type: 'rateup', displayName: '群雄逐鹿', banner: '/game-city-banner.png', description: 'UP! SR赵云 概率提升' },
  { id: 'p3', name: 'hero_pool_3', type: 'normal', displayName: '常驻招募', banner: '/game-city-banner.png', description: '全武将常驻卡池' },
  { id: 'p4', name: 'hero_pool_4', type: 'newbie', displayName: '新手福利池', banner: '/game-city-banner.png', description: '前20抽必出SSR' },
]

const MOCK_HEROES: GachaCard[] = [
  { id: 'c1', name: '关羽', rarity: 5, element: '火', faction: '蜀', isNew: true },
  { id: 'c2', name: '赵云', rarity: 4, element: '风', faction: '蜀', isNew: false },
  { id: 'c3', name: '诸葛亮', rarity: 5, element: '雷', faction: '蜀', isNew: false },
  { id: 'c4', name: '吕布', rarity: 5, element: '暗', faction: '群', isNew: true },
  { id: 'c5', name: '曹操', rarity: 5, element: '水', faction: '魏', isNew: false },
  { id: 'c6', name: '周瑜', rarity: 4, element: '火', faction: '吴', isNew: false },
  { id: 'c7', name: '张飞', rarity: 4, element: '地', faction: '蜀', isNew: true },
  { id: 'c8', name: '司马懿', rarity: 5, element: '暗', faction: '魏', isNew: false },
  { id: 'c9', name: '黄忠', rarity: 3, element: '地', faction: '蜀', isNew: true },
  { id: 'c10', name: '大乔', rarity: 3, element: '风', faction: '吴', isNew: false },
  { id: 'c11', name: '华佗', rarity: 4, element: '水', faction: '群', isNew: true },
  { id: 'c12', name: '貂蝉', rarity: 4, element: '火', faction: '群', isNew: false },
  { id: 'c13', name: '吕蒙', rarity: 3, element: '水', faction: '吴', isNew: true },
  { id: 'c14', name: '典韦', rarity: 3, element: '地', faction: '魏', isNew: false },
  { id: 'c15', name: '甘宁', rarity: 3, element: '风', faction: '吴', isNew: true },
]

const MOCK_SHOP_ITEMS: ShopItem[] = [
  { id: 's1', name: '6元首充', price: 6, currency: 'cny', badge: 'HOT', badgeColor: '#DC2626', description: 'SSR碎片×10 + 钻石×300', type: 'recharge' },
  { id: 's2', name: '30元月卡', price: 30, currency: 'cny', badge: '推荐', badgeColor: '#16A34A', description: '每日领取300钻石，持续30天', type: 'monthly' },
  { id: 's3', name: '68元成长基金', price: 68, currency: 'cny', badge: '限时', badgeColor: '#D97706', description: '升级即领奖励，最高6800钻石', type: 'fund' },
  { id: 's4', name: '128元至尊礼包', price: 128, currency: 'cny', badge: 'SSR自选', badgeColor: '#D4A017', description: 'SSR武将自选 + 资源大礼包', type: 'gift' },
  { id: 's5', name: '328元创世礼包', price: 328, currency: 'cny', description: '全SSR阵容碎片 + 顶级资源', type: 'gift' },
  { id: 's6', name: '648元至尊通行证', price: 648, currency: 'cny', badge: '最超值', badgeColor: '#DC2626', description: '解锁战令全部奖励 + 限定皮肤', type: 'battlepass' },
  { id: 's7', name: '60钻石礼包', price: 60, currency: 'diamond', originalPrice: 100, description: '金币×50000 + 体力药水×5', type: 'gift' },
  { id: 's8', name: '新手超值礼包', price: 6, currency: 'cny', badge: '新手', badgeColor: '#7C3AED', description: '30钻石 + 经验药水×5', type: 'gift', remaining: 1 },
  { id: 's9', name: '七日登录礼', price: 0, currency: 'cny', badge: '免费', badgeColor: '#16A34A', description: '每日登录领取钻石奖励', type: 'gift', duration: 604800 },
  { id: 's10', name: '阵营礼包·魏', price: 6800, currency: 'diamond', description: '随机魏国SR卡×1', type: 'gift', duration: 86400 },
]

const MOCK_TUTORIAL_STEPS: TutorialStep[] = [
  { id: 1, stepKey: 'welcome', title: '欢迎来到九州', npcName: '诸葛亮', npcAvatar: '🧙‍♂️', dialogText: '主公，欢迎来到九州大陆！天下大乱，群雄并起，正是英雄用武之时。让我们开始征战吧！', isRequired: true, reward: '金币×1000' },
  { id: 2, stepKey: 'recruit_hero', title: '招募第一位武将', npcName: '诸葛亮', npcAvatar: '🧙‍♂️', dialogText: '兵马未动，粮草先行。不过主公，我们更需要的是猛将！点击招募按钮，招揽第一位武将吧。', targetId: 'nav-gacha', isRequired: true, reward: '钻石×100' },
  { id: 3, stepKey: 'first_battle', title: '首次战斗', npcName: '诸葛亮', npcAvatar: '🧙‍♂️', dialogText: '武将已就位，是时候一展身手了！点击战斗按钮，进入第一场战斗！', targetId: 'nav-battle', isRequired: true, reward: '体力×50 + 经验×200' },
  { id: 4, stepKey: 'upgrade_building', title: '升级建筑', npcName: '诸葛亮', npcAvatar: '🧙‍♂️', dialogText: '主公大胜！城池是根基，升级主城可解锁更多功能。点击建筑面板，先升级主城吧。', targetId: 'building-command_center', isRequired: true, reward: '金币×500' },
  { id: 5, stepKey: 'join_guild', title: '加入联盟', npcName: '诸葛亮', npcAvatar: '🧙‍♂️', dialogText: '独木难支，众志成城。加入一个联盟，与志同道合的盟友并肩作战，攻城略地！', targetId: 'btn-guild', isRequired: false, reward: '金币×300' },
  { id: 6, stepKey: 'daily_sign', title: '每日签到', npcName: '诸葛亮', npcAvatar: '🧙‍♂️', dialogText: '每日签到可领取丰厚奖励，连续签到还有额外惊喜！别忘了每天来看看哦。', isRequired: false, reward: '金币×200 + 钻石×20' },
]

// ==================== Game Store ====================
interface GameState {
  player: PlayerData
  setPlayer: (p: Partial<PlayerData>) => void
  addResource: (type: keyof Pick<PlayerData, 'gold' | 'diamonds' | 'stamina' | 'prestige'>, amount: number) => void

  currentView: GameView
  setView: (view: GameView) => void
  previousView: GameView | null

  buildings: Building[]
  upgradeBuilding: (id: string) => void

  cardPools: CardPool[]
  selectedPool: CardPool
  setSelectedPool: (pool: CardPool) => void
  heroCollection: GachaCard[]
  gachaResults: GachaCard[]
  pityCounter: number
  isGachaAnimating: boolean
  setIsGachaAnimating: (v: boolean) => void
  performGacha: (count: 1 | 10) => void
  gachaHistory: GachaCard[]

  shopItems: ShopItem[]
  purchaseItem: (id: string) => void

  tutorialSteps: TutorialStep[]
  tutorialStepIndex: number
  tutorialActive: boolean
  startTutorial: () => void
  nextTutorialStep: () => void
  skipTutorial: () => void
  tutorialCompleted: boolean

  showBuildingInfo: string | null
  setShowBuildingInfo: (id: string | null) => void
  showShopConfirm: ShopItem | null
  setShowShopConfirm: (item: ShopItem | null) => void
  showGachaResult: boolean
  setShowGachaResult: (v: boolean) => void
  notification: string | null
  showNotification: (msg: string) => void

  staminaTimer: number
  tickStamina: () => void
}

export const useGameStore = create<GameState>((set, get) => ({
  player: MOCK_PLAYER,
  setPlayer: (p) => set((s) => ({ player: { ...s.player, ...p } })),
  addResource: (type, amount) => set((s) => {
    const newVal = s.player[type] + amount
    if (type === 'stamina') return { player: { ...s.player, stamina: Math.min(newVal, s.player.maxStamina) } }
    return { player: { ...s.player, [type]: Math.max(0, newVal) } }
  }),

  currentView: 'main-city',
  setView: (view) => set((s) => ({ previousView: s.currentView, currentView: view })),
  previousView: null,

  buildings: MOCK_BUILDINGS,
  upgradeBuilding: (id) => set((s) => ({
    buildings: s.buildings.map((b) =>
      b.id === id ? { ...b, level: b.level + 1, upgrading: false, remainingSeconds: 0 } : b
    ),
  })),

  cardPools: MOCK_POOLS,
  selectedPool: MOCK_POOLS[0],
  setSelectedPool: (pool) => set({ selectedPool: pool }),
  heroCollection: [...MOCK_HEROES],
  gachaResults: [],
  pityCounter: 42,
  isGachaAnimating: false,
  setIsGachaAnimating: (v) => set({ isGachaAnimating: v }),
  gachaHistory: [],

  performGacha: (count) => {
    const state = get()
    const cost = count === 1 ? 150 : 1350
    if (state.player.diamonds < cost) {
      get().showNotification('钻石不足！')
      return
    }

    set({ isGachaAnimating: true, player: { ...state.player, diamonds: state.player.diamonds - cost } })

    const results: GachaCard[] = []
    let newPity = state.pityCounter

    for (let i = 0; i < count; i++) {
      newPity++
      const rand = Math.random()
      let rarity: 3 | 4 | 5

      if (newPity >= 80 || rand < 0.015) {
        rarity = 5
        newPity = 0
      } else if (rand < 0.085) {
        rarity = 4
      } else {
        rarity = 3
      }

      const pool = rarity === 5
        ? MOCK_HEROES.filter((h) => h.rarity === 5)
        : rarity === 4
          ? MOCK_HEROES.filter((h) => h.rarity === 4)
          : MOCK_HEROES.filter((h) => h.rarity === 3)

      const hero = pool[Math.floor(Math.random() * pool.length)]
      results.push({ ...hero, id: `g-${Date.now()}-${i}`, isNew: Math.random() > 0.5 })
    }

    set((s) => ({
      gachaResults: results,
      pityCounter: newPity,
      gachaHistory: [...results, ...s.gachaHistory].slice(0, 100),
      heroCollection: [...results, ...s.heroCollection],
    }))

    setTimeout(() => {
      set({ isGachaAnimating: false, showGachaResult: true })
    }, 1500)
  },

  shopItems: MOCK_SHOP_ITEMS,
  purchaseItem: (id) => {
    const item = get().shopItems.find((i) => i.id === id)
    if (!item) return
    if (item.currency === 'diamond' && get().player.diamonds < item.price) {
      get().showNotification('钻石不足！')
      return
    }
    if (item.currency === 'diamond') {
      set((s) => ({ player: { ...s.player, diamonds: s.player.diamonds - item.price } }))
    }
    get().showNotification(`购买成功: ${item.name}`)
    get().setShowShopConfirm(null)
  },

  tutorialSteps: MOCK_TUTORIAL_STEPS,
  tutorialStepIndex: 0,
  tutorialActive: false,
  tutorialCompleted: false,
  startTutorial: () => set({ tutorialActive: true, tutorialStepIndex: 0 }),
  nextTutorialStep: () => {
    const { tutorialStepIndex, tutorialSteps } = get()
    if (tutorialStepIndex >= tutorialSteps.length - 1) {
      set({ tutorialActive: false, tutorialCompleted: true })
    } else {
      set({ tutorialStepIndex: tutorialStepIndex + 1 })
    }
  },
  skipTutorial: () => set({ tutorialActive: false, tutorialCompleted: true }),

  showBuildingInfo: null,
  setShowBuildingInfo: (id) => set({ showBuildingInfo: id }),
  showShopConfirm: null,
  setShowShopConfirm: (item) => set({ showShopConfirm: item }),
  showGachaResult: false,
  setShowGachaResult: (v) => set({ showGachaResult: v }),
  notification: null,
  showNotification: (msg) => {
    set({ notification: msg })
    setTimeout(() => set({ notification: null }), 2500)
  },

  staminaTimer: 300,
  tickStamina: () => {
    const { player, staminaTimer } = get()
    if (player.stamina >= player.maxStamina) return
    const newTimer = staminaTimer - 1
    if (newTimer <= 0) {
      set((s) => ({
        player: { ...s.player, stamina: Math.min(s.player.stamina + 1, s.player.maxStamina) },
        staminaTimer: 300,
      }))
    } else {
      set({ staminaTimer: newTimer })
    }
  },
}))

// ==================== Utilities ====================
export function formatNumber(n: number): string {
  if (n >= 100000000) return (n / 100000000).toFixed(1) + '亿'
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return n.toLocaleString()
}

export function formatStaminaTimer(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function getRarityColor(rarity: 3 | 4 | 5): string {
  switch (rarity) {
    case 5: return 'text-amber-400'
    case 4: return 'text-purple-400'
    case 3: return 'text-sky-400'
  }
}

export function getRarityBg(rarity: 3 | 4 | 5): string {
  switch (rarity) {
    case 5: return 'from-amber-500/30 to-amber-700/50 border-amber-400'
    case 4: return 'from-purple-500/30 to-purple-700/50 border-purple-400'
    case 3: return 'from-sky-500/20 to-sky-700/40 border-sky-400'
  }
}

export function getRarityLabel(rarity: 3 | 4 | 5): string {
  switch (rarity) {
    case 5: return 'SSR'
    case 4: return 'SR'
    case 3: return 'R'
  }
}

export function getPoolBadge(type: CardPool['type']): { label: string; color: string } {
  switch (type) {
    case 'limited': return { label: '限定', color: 'bg-red-500' }
    case 'rateup': return { label: 'UP', color: 'bg-amber-500' }
    case 'normal': return { label: '常驻', color: 'bg-green-600' }
    case 'faction': return { label: '阵营', color: 'bg-sky-600' }
    case 'newbie': return { label: '新手', color: 'bg-purple-600' }
  }
}

export function getElementIcon(el: string): string {
  const map: Record<string, string> = { '火': '🔥', '水': '💧', '风': '🌪️', '地': '🪨', '雷': '⚡', '暗': '🌑' }
  return map[el] || '✨'
}
