// ============================================================
// 九州争鼎 - 后台管理系统 Mock 数据 & 类型定义
// ============================================================

// ==================== 通用类型 ====================
export interface PaginationParams {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// ==================== RBAC 权限系统 ====================
export interface AdminUser {
  id: number;
  username: string;
  realName: string;
  email: string;
  phone: string;
  avatar: string;
  roles: Role[];
  permissions: string[];
  status: number; // 1=启用 0=禁用
  lastLoginAt: string;
  lastLoginIp: string;
  createdAt: string;
}

export interface Role {
  id: number;
  name: string;
  code: string;
  description: string;
  permissions: Permission[];
  status: number;
  createdAt: string;
}

export interface Permission {
  id: number;
  name: string;
  code: string;
  type: 'menu' | 'button' | 'api';
  parentId: number;
  path?: string;
  icon?: string;
  sort: number;
  status: number;
}

// ==================== 用户管理 ====================
export interface GameUser {
  id: number;
  uid: string;
  nickname: string;
  level: number;
  vipLevel: number;
  power: number;
  diamond: number;
  gold: number;
  stamina: number;
  guildId: number | null;
  guildName: string;
  serverId: number;
  serverName: string;
  status: number; // 1=正常 0=封禁 2=冻结
  lastLoginAt: string;
  lastLoginIp: string;
  registerAt: string;
  totalRecharge: number;
  totalDiamond: number;
  heroCount: number;
  battleCount: number;
  winCount: number;
  cityCount: number;
}

export interface UserActionLog {
  id: number;
  userId: number;
  uid: string;
  nickname: string;
  category: string;
  action: string;
  detail: string;
  ip: string;
  device: string;
  createdAt: string;
}

export interface BattleLog {
  id: number;
  battleId: string;
  userId: number;
  uid: string;
  nickname: string;
  battleType: string;
  stageId: number;
  difficulty: number;
  attackerPower: number;
  defenderId: number;
  defenderName: string;
  defenderPower: number;
  result: number; // 0失败 1胜利 2平局
  starRating: number;
  turns: number;
  duration: number;
  heroUsed: string;
  damageTotal: number;
  damageTaken: number;
  healTotal: number;
  skillCasts: number;
  createdAt: string;
}

// ==================== 卡池管理 ====================
export interface CardPool {
  id: number;
  name: string;
  type: 'normal' | 'limited' | 'faction' | 'start' | 'mix';
  typeName: string;
  description: string;
  status: number; // 1=开启 0=关闭
  startTime: string;
  endTime: string;
  ssrRate: number;
  srRate: number;
  rRate: number;
  pityCount: number;
  hardPityCount: number;
  upHeroId: number | null;
  upHeroName: string;
  totalDraws: number;
  todayDraws: number;
  createdAt: string;
}

export interface Hero {
  id: number;
  name: string;
  title: string;
  rarity: 'SSR' | 'SR' | 'R';
  faction: 'wei' | 'shu' | 'wu' | 'qun';
  factionName: string;
  type: 'infantry' | 'cavalry' | 'archer' | 'strategist';
  typeName: string;
  baseAtk: number;
  baseDef: number;
  baseHp: number;
  baseSpeed: number;
  growthAtk: number;
  growthDef: number;
  growthHp: number;
  skillJson: string;
  description: string;
  status: number;
  drawCount: number;
  createdAt: string;
}

// ==================== 地图管理 ====================
export interface City {
  id: number;
  name: string;
  x: number;
  y: number;
  level: number;
  faction: string;
  ownerId: number | null;
  ownerName: string;
  guildId: number | null;
  guildName: string;
  resourceType: string;
  resourceLevel: number;
  defense: number;
  garrison: number;
  status: number;
}

export interface MarchQueue {
  id: number;
  userId: number;
  userName: string;
  fromCityId: number;
  fromCityName: string;
  toCityId: number;
  toCityName: string;
  troops: number;
  heroName: string;
  status: 'marching' | 'arrived' | 'returning' | 'cancelled';
  startTime: string;
  arriveTime: string;
  duration: number;
}

// ==================== 联盟管理 ====================
export interface Guild {
  id: number;
  name: string;
  leaderId: number;
  leaderName: string;
  memberCount: number;
  maxMembers: number;
  level: number;
  exp: number;
  notice: string;
  cityCount: number;
  totalPower: number;
  rank: number;
  status: number;
  createdAt: string;
}

export interface GuildMember {
  id: number;
  guildId: number;
  userId: number;
  nickname: string;
  level: number;
  power: number;
  role: 'leader' | 'vice_leader' | 'elder' | 'member';
  contribution: number;
  joinAt: string;
  lastActiveAt: string;
}

// ==================== 充值支付 ====================
export interface Order {
  id: number;
  orderNo: string;
  userId: number;
  nickname: string;
  productType: string;
  productName: string;
  amount: number;
  diamond: number;
  bonus: number;
  status: number;
  statusText: string;
  payMethod: string;
  tradeNo: string;
  paidAt: string;
  deliveredAt: string;
  createdAt: string;
}

// ==================== 数据统计 ====================
export interface DashboardStats {
  onlineNow: number;
  onlineToday: number;
  dau: number;
  dauChange: number;
  mau: number;
  mauChange: number;
  newUsers: number;
  newUsersChange: number;
  revenue: number;
  revenueChange: number;
  arpu: number;
  payRate: number;
  retention1: number;
  retention7: number;
  retention30: number;
  totalOrders: number;
  totalDraws: number;
  avgOnlineTime: number;
  serverCount: number;
}

export interface DailyStats {
  date: string;
  dau: number;
  newUsers: number;
  revenue: number;
  orders: number;
  payRate: number;
  arpu: number;
  retention1: number;
  draws: number;
  battles: number;
}

export interface GachaStats {
  date: string;
  totalDraws: number;
  ssrCount: number;
  ssrRate: number;
  srCount: number;
  srRate: number;
  revenue: number;
  hardPityCount: number;
}

// ==================== 操作日志 ====================
export interface GmLog {
  id: number;
  operatorId: number;
  operatorName: string;
  targetId: number;
  targetType: string;
  action: string;
  detail: string;
  ip: string;
  createdAt: string;
}

export interface LoginLog {
  id: number;
  userId: number;
  nickname: string;
  ip: string;
  device: string;
  channel: string;
  status: number;
  createdAt: string;
}

// ==================== 配置中心 ====================
export interface ConfigItem {
  id: number;
  key: string;
  name: string;
  value: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  group: string;
  description: string;
  updatedAt: string;
  updatedBy: string;
}

// ==================== 活动系统 ====================
export interface Activity {
  id: number;
  name: string;
  type: 'gacha' | 'war' | 'growth' | 'festival' | 'guild';
  typeName: string;
  description: string;
  startTime: string;
  endTime: string;
  status: 'upcoming' | 'active' | 'ended';
  rewards: string;
  participants: number;
  completionRate: number;
  createdAt: string;
}

// ==================== Mock 数据 ====================

export const mockAdminUser: AdminUser = {
  id: 1,
  username: 'admin',
  realName: '张运维',
  email: 'admin@jiuzhou.com',
  phone: '138****8888',
  avatar: '',
  roles: [{ id: 1, name: '超级管理员', code: 'super_admin', description: '拥有所有权限', permissions: [], status: 1, createdAt: '2025-01-01' }],
  permissions: ['*'],
  status: 1,
  lastLoginAt: '2025-07-10 14:30:00',
  lastLoginIp: '192.168.1.100',
  createdAt: '2025-01-01 00:00:00',
};

export const mockRoles: Role[] = [
  { id: 1, name: '超级管理员', code: 'super_admin', description: '拥有所有权限', permissions: [], status: 1, createdAt: '2025-01-01' },
  { id: 2, name: '运营管理员', code: 'ops_admin', description: '负责游戏运营相关功能', permissions: [], status: 1, createdAt: '2025-01-15' },
  { id: 3, name: '客服', code: 'customer_service', description: '处理用户问题、查看数据', permissions: [], status: 1, createdAt: '2025-02-01' },
  { id: 4, name: '数据分析师', code: 'data_analyst', description: '查看数据统计和报表', permissions: [], status: 1, createdAt: '2025-02-15' },
  { id: 5, name: '游戏策划', code: 'game_designer', description: '管理卡池、活动、配置', permissions: [], status: 1, createdAt: '2025-03-01' },
];

export const mockPermissions: Permission[] = [
  { id: 1, name: '仪表盘', code: 'dashboard', type: 'menu', parentId: 0, path: '/dashboard', icon: 'LayoutDashboard', sort: 1, status: 1 },
  { id: 2, name: '用户管理', code: 'users', type: 'menu', parentId: 0, path: '/users', icon: 'Users', sort: 2, status: 1 },
  { id: 3, name: '用户列表', code: 'users:list', type: 'button', parentId: 2, sort: 1, status: 1 },
  { id: 4, name: '封号操作', code: 'users:ban', type: 'button', parentId: 2, sort: 2, status: 1 },
  { id: 5, name: '修改资源', code: 'users:modify_resource', type: 'button', parentId: 2, sort: 3, status: 1 },
  { id: 6, name: '卡池管理', code: 'card_pool', type: 'menu', parentId: 0, path: '/card-pool', icon: 'Layers', sort: 3, status: 1 },
  { id: 7, name: '武将管理', code: 'heroes', type: 'menu', parentId: 0, path: '/heroes', icon: 'Sword', sort: 4, status: 1 },
  { id: 8, name: '地图控制台', code: 'map', type: 'menu', parentId: 0, path: '/map', icon: 'Map', sort: 5, status: 1 },
  { id: 9, name: '联盟管理', code: 'guilds', type: 'menu', parentId: 0, path: '/guilds', icon: 'Shield', sort: 6, status: 1 },
  { id: 10, name: '充值支付', code: 'payment', type: 'menu', parentId: 0, path: '/payment', icon: 'CreditCard', sort: 7, status: 1 },
  { id: 11, name: '数据统计', code: 'analytics', type: 'menu', parentId: 0, path: '/analytics', icon: 'BarChart3', sort: 8, status: 1 },
  { id: 12, name: '日志系统', code: 'logs', type: 'menu', parentId: 0, path: '/logs', icon: 'ScrollText', sort: 9, status: 1 },
  { id: 13, name: '配置中心', code: 'config', type: 'menu', parentId: 0, path: '/config', icon: 'Settings', sort: 10, status: 1 },
  { id: 14, name: '活动系统', code: 'activities', type: 'menu', parentId: 0, path: '/activities', icon: 'PartyPopper', sort: 11, status: 1 },
  { id: 15, name: '角色权限', code: 'roles', type: 'menu', parentId: 0, path: '/roles', icon: 'Lock', sort: 12, status: 1 },
];

// 用户列表数据
export const mockGameUsers: GameUser[] = Array.from({ length: 50 }, (_, i) => ({
  id: 10001 + i,
  uid: `UID${10001 + i}`,
  nickname: ['吕布', '诸葛亮', '赵云', '关羽', '张飞', '曹操', '周瑜', '司马懿', '孙权', '刘备', '典韦', '马超', '黄忠', '甘宁', '张辽'][i % 15] + (i >= 15 ? `${Math.floor(i / 15) + 1}` : ''),
  level: Math.floor(Math.random() * 80) + 20,
  vipLevel: Math.min(10, Math.floor(i / 5)),
  power: Math.floor(Math.random() * 500000) + 100000,
  diamond: Math.floor(Math.random() * 50000),
  gold: Math.floor(Math.random() * 2000000),
  stamina: Math.floor(Math.random() * 120),
  guildId: i % 3 === 0 ? null : (Math.floor(i / 10) + 1) * 100,
  guildName: i % 3 === 0 ? '无' : ['龙腾天下', '凤鸣九霄', '虎啸山林'][Math.floor(i / 10) % 3],
  serverId: Math.floor(i / 25) + 1,
  serverName: `九州${Math.floor(i / 25) + 1}区`,
  status: i === 5 ? 0 : i === 12 ? 2 : 1,
  lastLoginAt: `2025-07-${String(10 - Math.floor(i / 10)).padStart(2, '0')} ${String(8 + (i % 16)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00`,
  lastLoginIp: `192.168.${1 + (i % 10)}.${100 + i}`,
  registerAt: `2025-01-${String(1 + (i % 28)).padStart(2, '0')} ${String(8 + (i % 12)).padStart(2, '0')}:00:00`,
  totalRecharge: Math.floor(Math.random() * 50000),
  totalDiamond: Math.floor(Math.random() * 100000),
  heroCount: Math.floor(Math.random() * 30) + 5,
  battleCount: Math.floor(Math.random() * 500) + 10,
  winCount: Math.floor(Math.floor(Math.random() * 300) + 5),
  cityCount: Math.floor(Math.random() * 5),
}));

// 卡池数据
export const mockCardPools: CardPool[] = [
  { id: 1, name: '常驻卡池', type: 'normal', typeName: '常驻', description: '基础武将招募池', status: 1, startTime: '2025-01-01', endTime: '2099-12-31', ssrRate: 2.0, srRate: 10.0, rRate: 88.0, pityCount: 60, hardPityCount: 80, upHeroId: null, upHeroName: '-', totalDraws: 1256000, todayDraws: 15200, createdAt: '2025-01-01' },
  { id: 2, name: '吕布UP限定池', type: 'limited', typeName: '限定', description: '吕布限定概率UP', status: 1, startTime: '2025-07-01', endTime: '2025-07-31', ssrRate: 2.0, srRate: 10.0, rRate: 88.0, pityCount: 50, hardPityCount: 80, upHeroId: 1, upHeroName: '吕布', totalDraws: 856000, todayDraws: 8900, createdAt: '2025-06-28' },
  { id: 3, name: '蜀国阵营池', type: 'faction', typeName: '阵营', description: '蜀国武将概率UP', status: 1, startTime: '2025-07-05', endTime: '2025-08-05', ssrRate: 2.5, srRate: 12.0, rRate: 85.5, pityCount: 55, hardPityCount: 80, upHeroId: 3, upHeroName: '赵云', totalDraws: 432000, todayDraws: 5600, createdAt: '2025-07-01' },
  { id: 4, name: '新手池', type: 'start', typeName: '新手', description: '新手10连必出SR', status: 1, startTime: '2025-01-01', endTime: '2099-12-31', ssrRate: 5.0, srRate: 30.0, rRate: 65.0, pityCount: 10, hardPityCount: 10, upHeroId: null, upHeroName: '-', totalDraws: 2340000, todayDraws: 3200, createdAt: '2025-01-01' },
  { id: 5, name: '周瑜UP池', type: 'limited', typeName: '限定', description: '周瑜限定UP', status: 0, startTime: '2025-05-01', endTime: '2025-06-01', ssrRate: 2.0, srRate: 10.0, rRate: 88.0, pityCount: 60, hardPityCount: 80, upHeroId: 7, upHeroName: '周瑜', totalDraws: 623000, todayDraws: 0, createdAt: '2025-04-28' },
  { id: 6, name: '混合卡池', type: 'mix', typeName: '混合', description: '全武将混合概率', status: 1, startTime: '2025-06-15', endTime: '2025-09-15', ssrRate: 1.5, srRate: 15.0, rRate: 83.5, pityCount: 50, hardPityCount: 100, upHeroId: null, upHeroName: '-', totalDraws: 321000, todayDraws: 4100, createdAt: '2025-06-10' },
];

// 武将数据
export const mockHeroes: Hero[] = [
  { id: 1, name: '吕布', title: '天下无双', rarity: 'SSR', faction: 'qun', factionName: '群雄', type: 'cavalry', typeName: '骑兵', baseAtk: 320, baseDef: 180, baseHp: 2800, baseSpeed: 28, growthAtk: 12, growthDef: 6, growthHp: 100, skillJson: '[{"name":"无双","damage":200,"type":"aoe"}]', description: '三国第一猛将', status: 1, drawCount: 89500, createdAt: '2025-01-01' },
  { id: 2, name: '诸葛亮', title: '卧龙', rarity: 'SSR', faction: 'shu', factionName: '蜀国', type: 'strategist', typeName: '谋士', baseAtk: 180, baseDef: 150, baseHp: 2200, baseSpeed: 24, growthAtk: 8, growthDef: 5, growthHp: 80, skillJson: '[{"name":"火计","damage":250,"type":"aoe"}]', description: '卧龙先生', status: 1, drawCount: 72300, createdAt: '2025-01-01' },
  { id: 3, name: '赵云', title: '常胜将军', rarity: 'SSR', faction: 'shu', factionName: '蜀国', type: 'cavalry', typeName: '骑兵', baseAtk: 290, baseDef: 200, baseHp: 2600, baseSpeed: 30, growthAtk: 10, growthDef: 7, growthHp: 90, skillJson: '[{"name":"龙胆","damage":180,"type":"single"}]', description: '浑身是胆赵子龙', status: 1, drawCount: 68200, createdAt: '2025-01-01' },
  { id: 4, name: '关羽', title: '武圣', rarity: 'SSR', faction: 'shu', factionName: '蜀国', type: 'infantry', typeName: '步兵', baseAtk: 300, baseDef: 210, baseHp: 3000, baseSpeed: 20, growthAtk: 11, growthDef: 8, growthHp: 110, skillJson: '[{"name":"武圣斩","damage":220,"type":"single"}]', description: '义薄云天', status: 1, drawCount: 65800, createdAt: '2025-01-01' },
  { id: 5, name: '曹操', title: '魏武帝', rarity: 'SSR', faction: 'wei', factionName: '魏国', type: 'strategist', typeName: '谋士', baseAtk: 200, baseDef: 170, baseHp: 2500, baseSpeed: 26, growthAtk: 9, growthDef: 6, growthHp: 85, skillJson: '[{"name":"奸雄","damage":200,"type":"buff"}]', description: '治世之能臣', status: 1, drawCount: 61000, createdAt: '2025-01-01' },
  { id: 6, name: '周瑜', title: '美周郎', rarity: 'SSR', faction: 'wu', factionName: '吴国', type: 'strategist', typeName: '谋士', baseAtk: 210, baseDef: 140, baseHp: 2100, baseSpeed: 27, growthAtk: 9, growthDef: 4, growthHp: 75, skillJson: '[{"name":"火攻","damage":240,"type":"aoe"}]', description: '赤壁之战主将', status: 1, drawCount: 58700, createdAt: '2025-01-01' },
  { id: 7, name: '司马懿', title: '冢虎', rarity: 'SSR', faction: 'wei', factionName: '魏国', type: 'strategist', typeName: '谋士', baseAtk: 190, baseDef: 160, baseHp: 2400, baseSpeed: 25, growthAtk: 8, growthDef: 5, growthHp: 80, skillJson: '[{"name":"狼顾","damage":210,"type":"debuff"}]', description: '隐忍待时', status: 1, drawCount: 54300, createdAt: '2025-01-01' },
  { id: 8, name: '张飞', title: '万人敌', rarity: 'SR', faction: 'shu', factionName: '蜀国', type: 'infantry', typeName: '步兵', baseAtk: 260, baseDef: 170, baseHp: 2800, baseSpeed: 18, growthAtk: 9, growthDef: 5, growthHp: 95, skillJson: '[{"name":"怒吼","damage":150,"type":"aoe"}]', description: '燕人张翼德', status: 1, drawCount: 125000, createdAt: '2025-01-01' },
  { id: 9, name: '孙权', title: '碧眼儿', rarity: 'SR', faction: 'wu', factionName: '吴国', type: 'cavalry', typeName: '骑兵', baseAtk: 220, baseDef: 190, baseHp: 2400, baseSpeed: 22, growthAtk: 7, growthDef: 6, growthHp: 80, skillJson: '[{"name":"制衡","damage":120,"type":"buff"}]', description: '江东之主', status: 1, drawCount: 98000, createdAt: '2025-01-01' },
  { id: 10, name: '典韦', title: '古之恶来', rarity: 'SR', faction: 'wei', factionName: '魏国', type: 'infantry', typeName: '步兵', baseAtk: 280, baseDef: 150, baseHp: 2600, baseSpeed: 16, growthAtk: 10, growthDef: 4, growthHp: 90, skillJson: '[{"name":"狂暴","damage":160,"type":"single"}]', description: '曹操贴身护卫', status: 1, drawCount: 88000, createdAt: '2025-01-01' },
  { id: 11, name: '马超', title: '锦马超', rarity: 'SR', faction: 'shu', factionName: '蜀国', type: 'cavalry', typeName: '骑兵', baseAtk: 250, baseDef: 160, baseHp: 2200, baseSpeed: 32, growthAtk: 8, growthDef: 5, growthHp: 75, skillJson: '[{"name":"铁骑","damage":140,"type":"charge"}]', description: '西凉锦马超', status: 1, drawCount: 82000, createdAt: '2025-01-01' },
  { id: 12, name: '黄忠', title: '神射', rarity: 'R', faction: 'shu', factionName: '蜀国', type: 'archer', typeName: '弓兵', baseAtk: 230, baseDef: 120, baseHp: 1800, baseSpeed: 20, growthAtk: 7, growthDef: 3, growthHp: 60, skillJson: '[{"name":"百步穿杨","damage":130,"type":"single"}]', description: '老当益壮', status: 1, drawCount: 210000, createdAt: '2025-01-01' },
];

// 城池数据
export const mockCities: City[] = Array.from({ length: 36 }, (_, i) => ({
  id: i + 1,
  name: ['洛阳', '长安', '建业', '成都', '邺城', '许昌', '襄阳', '汉中', '荆州', '徐州', '宛城', '汝南', '陈留', '渤海', '庐江', '柴桑', '长沙', '桂阳', '零陵', '武陵', '永安', '上庸', '天水', '南安', '安定', '武威', '敦煌', '交趾', '南海', '会稽', '吴郡', '庐陵', '豫章', '江夏', '新野', '襄阳'][i] || `城池${i + 1}`,
  x: (i % 6) * 100 + 50,
  y: Math.floor(i / 6) * 100 + 50,
  level: [5, 5, 4, 4, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1][i],
  faction: ['群雄', '魏国', '蜀国', '吴国', '中立', '中立'][Math.floor(Math.random() * 6)],
  ownerId: i % 4 === 0 ? null : 10001 + i,
  ownerName: i % 4 === 0 ? '无' : mockGameUsers[i % 50]?.nickname || '玩家',
  guildId: i % 4 === 0 ? null : (Math.floor(i / 12) + 1) * 100,
  guildName: i % 4 === 0 ? '无' : ['龙腾天下', '凤鸣九霄', '虎啸山林'][Math.floor(i / 12) % 3],
  resourceType: ['粮食', '木材', '铁矿', '金币'][i % 4],
  resourceLevel: Math.min(5, Math.floor(Math.random() * 5) + 1),
  defense: Math.floor(Math.random() * 10000) + 1000,
  garrison: Math.floor(Math.random() * 5000),
  status: 1,
}));

// 行军队列
export const mockMarches: MarchQueue[] = Array.from({ length: 15 }, (_, i) => ({
  id: i + 1,
  userId: 10001 + i,
  userName: mockGameUsers[i]?.nickname || '玩家',
  fromCityId: (i % 36) + 1,
  fromCityName: mockCities[i % 36]?.name || '城池',
  toCityId: ((i + 5) % 36) + 1,
  toCityName: mockCities[(i + 5) % 36]?.name || '城池',
  troops: Math.floor(Math.random() * 3000) + 500,
  heroName: mockHeroes[i % 12]?.name || '武将',
  status: (['marching', 'arrived', 'returning', 'cancelled'] as const)[i % 4],
  startTime: '2025-07-10 14:00:00',
  arriveTime: '2025-07-10 15:30:00',
  duration: Math.floor(Math.random() * 120) + 30,
}));

// 联盟数据
export const mockGuilds: Guild[] = [
  { id: 100, name: '龙腾天下', leaderId: 10001, leaderName: '吕布', memberCount: 48, maxMembers: 50, level: 15, exp: 85000, notice: '周二四六晚上8点攻城', cityCount: 12, totalPower: 8500000, rank: 1, status: 1, createdAt: '2025-01-05' },
  { id: 200, name: '凤鸣九霄', leaderId: 10015, leaderName: '诸葛亮', memberCount: 45, maxMembers: 50, level: 14, exp: 72000, notice: '联盟活动积极参加', cityCount: 10, totalPower: 7200000, rank: 2, status: 1, createdAt: '2025-01-08' },
  { id: 300, name: '虎啸山林', leaderId: 10030, leaderName: '张飞', memberCount: 42, maxMembers: 50, level: 13, exp: 68000, notice: '欢迎新成员加入', cityCount: 8, totalPower: 6800000, rank: 3, status: 1, createdAt: '2025-01-12' },
  { id: 400, name: '天命玄鸟', leaderId: 10005, leaderName: '曹操', memberCount: 38, maxMembers: 50, level: 11, exp: 52000, notice: '称霸九州!', cityCount: 6, totalPower: 5200000, rank: 4, status: 1, createdAt: '2025-02-01' },
  { id: 500, name: '烽火连城', leaderId: 10020, leaderName: '周瑜', memberCount: 35, maxMembers: 50, level: 10, exp: 45000, notice: '攻城掠地', cityCount: 5, totalPower: 4500000, rank: 5, status: 1, createdAt: '2025-02-15' },
  { id: 600, name: '逍遥游', leaderId: 10045, leaderName: '赵云', memberCount: 28, maxMembers: 50, level: 8, exp: 32000, notice: '休闲联盟', cityCount: 3, totalPower: 3200000, rank: 6, status: 1, createdAt: '2025-03-10' },
];

// 联盟成员
export const mockGuildMembers: GuildMember[] = Array.from({ length: 48 }, (_, i) => ({
  id: i + 1,
  guildId: 100,
  userId: 10001 + i,
  nickname: mockGameUsers[i]?.nickname || '玩家',
  level: Math.floor(Math.random() * 80) + 20,
  power: Math.floor(Math.random() * 500000) + 100000,
  role: i === 0 ? 'leader' as const : i < 3 ? 'vice_leader' as const : i < 6 ? 'elder' as const : 'member' as const,
  contribution: Math.floor(Math.random() * 10000),
  joinAt: `2025-01-${String(5 + Math.floor(i / 10)).padStart(2, '0')} 10:00:00`,
  lastActiveAt: '2025-07-10 14:00:00',
}));

// 订单数据
export const mockOrders: Order[] = Array.from({ length: 100 }, (_, i) => {
  const types = ['diamond', 'diamond', 'diamond', 'monthly', 'gift', 'vip'];
  const type = types[i % 6];
  const amounts = [6, 30, 68, 128, 328, 648];
  const diamonds = [60, 330, 760, 1460, 3800, 7680];
  const bonuses = [0, 30, 60, 180, 680, 1680];
  const idx = i % 6;
  const statusIdx = i % 10 === 0 ? 0 : i % 10 === 1 ? 4 : i % 10 < 9 ? 1 : 2;
  return {
    id: 10001 + i,
    orderNo: `PAY202507${String(10 - Math.floor(i / 20)).padStart(2, '0')}${String(10001 + i)}`,
    userId: 10001 + (i % 50),
    nickname: mockGameUsers[i % 50]?.nickname || '玩家',
    productType: type,
    productName: type === 'diamond' ? `${amounts[idx]}元充值` : type === 'monthly' ? '月卡' : type === 'gift' ? '新手礼包' : 'VIP礼包',
    amount: type === 'monthly' ? 30 : amounts[idx],
    diamond: type === 'monthly' ? 300 : diamonds[idx],
    bonus: type === 'monthly' ? 0 : bonuses[idx],
    status: statusIdx,
    statusText: ['待支付', '已支付', '已发货', '已退款', '已关闭'][statusIdx],
    payMethod: ['支付宝', '微信', '苹果支付'][i % 3],
    tradeNo: statusIdx >= 1 ? `TXN${Date.now()}${i}` : '',
    paidAt: statusIdx >= 1 ? `2025-07-${String(10 - Math.floor(i / 20)).padStart(2, '0')} ${String(10 + (i % 14)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00` : '',
    deliveredAt: statusIdx === 2 ? `2025-07-${String(10 - Math.floor(i / 20)).padStart(2, '0')} ${String(10 + (i % 14)).padStart(2, '0')}:${String((i + 1) % 60).padStart(2, '0')}:00` : '',
    createdAt: `2025-07-${String(10 - Math.floor(i / 20)).padStart(2, '0')} ${String(8 + (i % 12)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:00`,
  };
});

// 仪表盘统计
export const mockDashboardStats: DashboardStats = {
  onlineNow: 12856,
  onlineToday: 45632,
  dau: 89245,
  dauChange: 5.2,
  mau: 234567,
  mauChange: 3.8,
  newUsers: 1234,
  newUsersChange: -2.1,
  revenue: 356800,
  revenueChange: 8.5,
  arpu: 4.0,
  payRate: 12.5,
  retention1: 45.2,
  retention7: 28.6,
  retention30: 15.3,
  totalOrders: 15678,
  totalDraws: 2345678,
  avgOnlineTime: 125,
  serverCount: 4,
};

// 每日统计（30天）
export const mockDailyStats: DailyStats[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(2025, 5, 10 - (29 - i));
  return {
    date: `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`,
    dau: Math.floor(80000 + Math.random() * 20000),
    newUsers: Math.floor(800 + Math.random() * 800),
    revenue: Math.floor(300000 + Math.random() * 150000),
    orders: Math.floor(4000 + Math.random() * 2000),
    payRate: +(10 + Math.random() * 5).toFixed(1),
    arpu: +(3 + Math.random() * 2).toFixed(1),
    retention1: +(40 + Math.random() * 10).toFixed(1),
    draws: Math.floor(70000 + Math.random() * 30000),
    battles: Math.floor(50000 + Math.random() * 20000),
  };
});

// 抽卡统计
export const mockGachaStats: GachaStats[] = Array.from({ length: 14 }, (_, i) => {
  const d = new Date(2025, 6, 10 - (13 - i));
  return {
    date: `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, '0')}`,
    totalDraws: Math.floor(150000 + Math.random() * 50000),
    ssrCount: Math.floor(2800 + Math.random() * 800),
    ssrRate: +(1.8 + Math.random() * 0.5).toFixed(2),
    srCount: Math.floor(14000 + Math.random() * 4000),
    srRate: +(9.5 + Math.random() * 1.5).toFixed(1),
    revenue: Math.floor(500000 + Math.random() * 200000),
    hardPityCount: Math.floor(100 + Math.random() * 80),
  };
});

// GM操作日志
export const mockGmLogs: GmLog[] = Array.from({ length: 50 }, (_, i) => ({
  id: 10001 + i,
  operatorId: 1,
  operatorName: ['admin', 'ops_zhang', 'ops_li', 'cs_wang', 'gm_zhao'][i % 5],
  targetId: 10001 + (i % 50),
  targetType: ['用户', '订单', '卡池', '武将', '联盟', '配置'][i % 6],
  action: ['封号', '解封', '修改钻石', '修改等级', '补单', '退款', '修改卡池概率', '修改武将属性', '创建活动', '修改配置'][i % 10],
  detail: `操作详情: ${['封禁用户3天', '解封用户', '钻石+10000', '等级调整为50', '补发订单', '退款68元', 'SSR概率调整为2.5%', '攻击力+50', '创建充值活动', '行军速度x1.5'][i % 10]}`,
  ip: `192.168.1.${10 + (i % 10)}`,
  createdAt: `2025-07-${String(10 - Math.floor(i / 10)).padStart(2, '0')} ${String(9 + (i % 10)).padStart(2, '0')}:${String(i * 3 % 60).padStart(2, '0')}:00`,
}));

// 登录日志
export const mockLoginLogs: LoginLog[] = Array.from({ length: 50 }, (_, i) => ({
  id: 10001 + i,
  userId: 10001 + (i % 50),
  nickname: mockGameUsers[i % 50]?.nickname || '玩家',
  ip: `10.0.${Math.floor(i / 10)}.${100 + (i % 256)}`,
  device: ['iPhone 15', 'iPhone 14', 'Samsung S24', 'Huawei Mate60', 'iPad Air', 'Xiaomi 14'][i % 6],
  channel: ['App Store', '官网', 'TapTap', 'Bilibili'][i % 4],
  status: i % 20 === 0 ? 0 : 1,
  createdAt: `2025-07-10 ${String(8 + (i % 14)).padStart(2, '0')}:${String(i * 2 % 60).padStart(2, '0')}:${String(i * 7 % 60).padStart(2, '0')}`,
}));

// 战斗日志
export const mockBattleLogs: BattleLog[] = Array.from({ length: 60 }, (_, i) => {
  const battleTypes = ['pve', 'pvp', 'arena', 'siege', 'world_boss'];
  const battleType = battleTypes[i % 5];
  const heroNames = ['吕布', '诸葛亮', '赵云', '关羽', '张飞', '曹操', '周瑜', '司马懿', '孙权', '刘备'];
  const heroes = heroNames.slice(0, 3 + (i % 3)).join(',');
  const isWin = Math.random() > 0.4;
  const result = isWin ? 1 : Math.random() > 0.5 ? 0 : 2;
  const stars = result === 1 ? Math.floor(Math.random() * 3) + 1 : 0;
  return {
    id: 20001 + i,
    battleId: `BTL${Date.now() - i * 60000}${String(i).padStart(4, '0')}`,
    userId: 10001 + (i % 50),
    uid: `UID${10001 + (i % 50)}`,
    nickname: mockGameUsers[i % 50]?.nickname || '玩家',
    battleType,
    stageId: battleType === 'pve' ? (i % 30) + 1 : 0,
    difficulty: Math.min(5, Math.floor(i / 12) + 1),
    attackerPower: Math.floor(Math.random() * 300000) + 100000,
    defenderId: battleType === 'pvp' ? 10001 + ((i + 7) % 50) : 0,
    defenderName: battleType === 'pvp' ? (mockGameUsers[(i + 7) % 50]?.nickname || '对手') : '',
    defenderPower: battleType === 'pvp' ? Math.floor(Math.random() * 300000) + 100000 : 0,
    result,
    starRating: stars,
    turns: Math.floor(Math.random() * 12) + 3,
    duration: Math.floor(Math.random() * 180) + 10,
    heroUsed: heroes,
    damageTotal: Math.floor(Math.random() * 50000) + 5000,
    damageTaken: Math.floor(Math.random() * 30000) + 2000,
    healTotal: Math.floor(Math.random() * 10000),
    skillCasts: Math.floor(Math.random() * 15) + 1,
    createdAt: `2025-07-${String(10 - Math.floor(i / 15)).padStart(2, '0')} ${String(8 + (i % 16)).padStart(2, '0')}:${String(i * 4 % 60).padStart(2, '0')}:00`,
  };
});

// 用户行为日志 (增强版)
export const mockUserActionLogs: UserActionLog[] = Array.from({ length: 60 }, (_, i) => {
  const categories = ['battle', 'gacha', 'trade', 'social', 'system', 'guild', 'map'];
  const actions: Record<string, string[]> = {
    battle: ['pve_battle', 'pvp_battle', 'arena_battle', 'siege_battle'],
    gacha: ['gacha_single', 'gacha_ten', 'pity_trigger'],
    trade: ['purchase', 'consume', 'gift'],
    social: ['chat', 'friend_add', 'mail_send'],
    system: ['login', 'logout', 'register', 'settings'],
    guild: ['guild_join', 'guild_donate', 'guild_war'],
    map: ['march_start', 'city_attack', 'collect_resource'],
  };
  const category = categories[i % 7];
  const action = actions[category][i % actions[category].length];
  const details: Record<string, string[]> = {
    pve_battle: ['关卡3-5 胜利, 获得经验+500, 金币+200', '关卡5-2 失败, 武将阵亡', '竞技场匹配 对手:诸葛亮战队'],
    pvp_battle: ['竞技场排名战, 对手:吕布战队, 胜利', '攻城战 攻击洛阳城, 失败'],
    gacha_single: ['常驻池单抽, 获得SR张飞', '限定池单抽, 未中'],
    gacha_ten: ['十连抽, 获得SSR诸葛亮+2个SR', '新手池十连, 必出SR关羽'],
    purchase: ['购买30元充值包, 获得330钻石', '购买月卡, 获得300钻石'],
    consume: ['升级武将赵云, 消耗金币5000', '强化装备, 消耗铁矿100'],
    login: ['登录游戏, IP:192.168.1.100', '自动登录'],
    guild_join: ['加入联盟:龙腾天下'],
    march_start: ['行军出发 → 洛阳, 兵力2000'],
  };
  const detail = details[action]?.[i % (details[action]?.length || 1)] || `${action} 操作`;
  return {
    id: 30001 + i,
    userId: 10001 + (i % 50),
    uid: `UID${10001 + (i % 50)}`,
    nickname: mockGameUsers[i % 50]?.nickname || '玩家',
    category,
    action,
    detail,
    ip: `10.0.${Math.floor(i / 10)}.${100 + (i % 256)}`,
    device: ['iPhone 15', 'iPhone 14', 'Samsung S24', 'Huawei Mate60', 'iPad Air'][i % 5],
    createdAt: `2025-07-10 ${String(8 + (i % 14)).padStart(2, '0')}:${String(i * 3 % 60).padStart(2, '0')}:${String(i * 7 % 60).padStart(2, '0')}`,
  };
});

// 配置项
export const mockConfigs: ConfigItem[] = [
  { id: 1, key: 'gacha.ssr_base_rate', name: 'SSR基础概率', value: '2.0', type: 'number', group: '抽卡', description: 'SSR武将基础掉落概率(%)', updatedAt: '2025-07-10 10:00:00', updatedBy: 'admin' },
  { id: 2, key: 'gacha.sr_base_rate', name: 'SR基础概率', value: '10.0', type: 'number', group: '抽卡', description: 'SR武将基础掉落概率(%)', updatedAt: '2025-07-10 10:00:00', updatedBy: 'admin' },
  { id: 3, key: 'gacha.pity_count', name: '软保底次数', value: '60', type: 'number', group: '抽卡', description: '抽卡软保底触发次数', updatedAt: '2025-07-08 15:00:00', updatedBy: 'ops_zhang' },
  { id: 4, key: 'gacha.hard_pity_count', name: '硬保底次数', value: '80', type: 'number', group: '抽卡', description: '抽卡硬保底触发次数', updatedAt: '2025-07-08 15:00:00', updatedBy: 'ops_zhang' },
  { id: 5, key: 'map.march_speed', name: '行军速度倍率', value: '1.0', type: 'number', group: '地图', description: '行军速度倍率(1.0=正常)', updatedAt: '2025-07-05 09:00:00', updatedBy: 'admin' },
  { id: 6, key: 'map.war_tax_rate', name: '战争税率', value: '0.1', type: 'number', group: '地图', description: '攻城战争税率(0-1)', updatedAt: '2025-07-01 10:00:00', updatedBy: 'admin' },
  { id: 7, key: 'battle.exp_bonus', name: '战斗经验倍率', value: '1.0', type: 'number', group: '战斗', description: '战斗经验获取倍率', updatedAt: '2025-07-10 08:00:00', updatedBy: 'admin' },
  { id: 8, key: 'battle.drop_bonus', name: '掉落倍率', value: '1.0', type: 'number', group: '战斗', description: '战斗掉落倍率', updatedAt: '2025-07-10 08:00:00', updatedBy: 'admin' },
  { id: 9, key: 'global.register_open', name: '开放注册', value: 'true', type: 'boolean', group: '全局', description: '是否开放新用户注册', updatedAt: '2025-07-10 00:00:00', updatedBy: 'admin' },
  { id: 10, key: 'global.server_maintenance', name: '服务器维护', value: 'false', type: 'boolean', group: '全局', description: '服务器是否处于维护状态', updatedAt: '2025-07-10 00:00:00', updatedBy: 'admin' },
  { id: 11, key: 'activity.event_switch', name: '活动总开关', value: 'true', type: 'boolean', group: '活动', description: '所有活动的总开关', updatedAt: '2025-07-10 00:00:00', updatedBy: 'admin' },
  { id: 12, key: 'payment.first_recharge_bonus', name: '首充双倍', value: 'true', type: 'boolean', group: '支付', description: '首次充值是否双倍钻石', updatedAt: '2025-06-01 00:00:00', updatedBy: 'admin' },
  { id: 13, key: 'vip.daily_diamond', name: 'VIP每日钻石', value: '{"1":10,"2":20,"3":50,"4":100,"5":200}', type: 'json', group: 'VIP', description: 'VIP每日可领取钻石(VIP等级:数量)', updatedAt: '2025-01-01 00:00:00', updatedBy: 'admin' },
  { id: 14, key: 'guild.max_members', name: '联盟最大人数', value: '50', type: 'number', group: '联盟', description: '联盟最大成员数量', updatedAt: '2025-01-01 00:00:00', updatedBy: 'admin' },
  { id: 15, key: 'guild.war_reward', name: '联盟战争奖励', value: '{"1":{"diamond":100,"gold":1000},"2":{"diamond":500,"gold":5000},"3":{"diamond":1000,"gold":10000}}', type: 'json', group: '联盟', description: '联盟战争排名奖励', updatedAt: '2025-01-01 00:00:00', updatedBy: 'admin' },
];

// 活动数据
export const mockActivities: Activity[] = [
  { id: 1, name: '夏日抽卡狂欢', type: 'gacha', typeName: '抽卡活动', description: '限定UP卡池开启，SSR概率UP', startTime: '2025-07-01', endTime: '2025-07-31', status: 'active', rewards: 'SSR武将选择箱x1, 钻石x10000', participants: 45600, completionRate: 65.3, createdAt: '2025-06-25' },
  { id: 2, name: '九州争霸赛季', type: 'war', typeName: '战争活动', description: '跨服攻城战', startTime: '2025-07-15', endTime: '2025-08-15', status: 'upcoming', rewards: '限定称号, 钻石x50000, SSR碎片x100', participants: 0, completionRate: 0, createdAt: '2025-07-01' },
  { id: 3, name: '新手成长计划', type: 'growth', typeName: '成长活动', description: '7天新手成长任务', startTime: '2025-01-01', endTime: '2099-12-31', status: 'active', rewards: '钻石x5000, SR武将自选x1, 金币x100000', participants: 89245, completionRate: 72.1, createdAt: '2025-01-01' },
  { id: 4, name: '周年庆典', type: 'festival', typeName: '节日活动', description: '游戏周年庆典活动', startTime: '2025-06-01', endTime: '2025-06-30', status: 'ended', rewards: '限定皮肤, 钻石x20000, SSR武将自选x1', participants: 78000, completionRate: 58.7, createdAt: '2025-05-20' },
  { id: 5, name: '联盟攻城战', type: 'guild', typeName: '联盟活动', description: '每周联盟攻城战', startTime: '2025-07-07', endTime: '2025-07-14', status: 'active', rewards: '联盟资金x10000, 个人钻石x5000', participants: 28000, completionRate: 80.5, createdAt: '2025-07-01' },
  { id: 6, name: '中秋月饼节', type: 'festival', typeName: '节日活动', description: '中秋限时活动', startTime: '2025-09-15', endTime: '2025-09-22', status: 'upcoming', rewards: '限定头像框, 钻石x8000, 月饼礼包x10', participants: 0, completionRate: 0, createdAt: '2025-07-10' },
];

// 菜单配置
export const menuItems = [
  { id: 'dashboard', name: '数据看板', icon: 'LayoutDashboard' },
  { id: 'users', name: '用户管理', icon: 'Users' },
  { id: 'card-pool', name: '卡池管理', icon: 'Layers' },
  { id: 'heroes', name: '武将管理', icon: 'Sword' },
  { id: 'map', name: '地图控制台', icon: 'Map' },
  { id: 'guilds', name: '联盟管理', icon: 'Shield' },
  { id: 'payment', name: '充值支付', icon: 'CreditCard' },
  { id: 'analytics', name: '数据统计', icon: 'BarChart3' },
  { id: 'logs', name: '日志系统', icon: 'ScrollText' },
  { id: 'config', name: '配置中心', icon: 'Settings' },
  { id: 'activities', name: '活动系统', icon: 'PartyPopper' },
  { id: 'roles', name: '角色权限', icon: 'Lock' },
];
