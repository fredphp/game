// ============================================================
// 九州争鼎 - Redis 风格内存缓存服务
// ============================================================
// 提供带 TTL 的内存缓存，模拟 Redis 的 GET/SET/HSET/HGET 等操作
// 支持统计数据的实时更新与快速读取

interface CacheEntry<T = unknown> {
  value: T;
  expiresAt: number; // timestamp in ms
}

class MemoryCache {
  private store: Map<string, CacheEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // 每 60 秒清理过期缓存
    this.cleanupInterval = setInterval(() => this.cleanup(), 60_000);
  }

  /** 设置缓存，ttl 单位秒 */
  set<T>(key: string, value: T, ttlSeconds: number = 300): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
  }

  /** 获取缓存，过期返回 null */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  /** 删除缓存 */
  del(key: string): void {
    this.store.delete(key);
  }

  /** 按前缀删除 */
  delByPrefix(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  /** 递增 */
  incr(key: string, amount: number = 1): number {
    const current = this.get<number>(key) || 0;
    const newValue = current + amount;
    this.set(key, newValue, 86400); // 24h TTL for counters
    return newValue;
  }

  /** 获取或设置（缓存穿透保护） */
  async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;
    const value = await factory();
    this.set(key, value, ttlSeconds);
    return value;
  }

  /** 检查是否存在且未过期 */
  has(key: string): boolean {
    return this.get(key) !== null;
  }

  /** 获取所有匹配前缀的 key */
  keysByPrefix(prefix: string): string[] {
    const result: string[] = [];
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) result.push(key);
    }
    return result;
  }

  /** 清理过期条目 */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /** 销毁实例 */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }

  /** 缓存统计信息 */
  get stats() {
    let expired = 0;
    const now = Date.now();
    for (const entry of this.store.values()) {
      if (now > entry.expiresAt) expired++;
    }
    return {
      total: this.store.size,
      expired,
      active: this.store.size - expired,
    };
  }
}

// 单例导出
export const statsCache = new MemoryCache();

// ==================== 统计缓存 Key 常量 ====================
export const CACHE_KEYS = {
  // 概览数据 (5分钟刷新)
  OVERVIEW: 'stats:overview',
  // DAU/MAU 趋势 (10分钟刷新)
  DAU_MAU_TREND: 'stats:dau_mau_trend',
  // 留存率数据 (30分钟刷新)
  RETENTION: 'stats:retention',
  // 抽卡统计 (10分钟刷新)
  GACHA: 'stats:gacha',
  // 收入统计 (10分钟刷新)
  REVENUE: 'stats:revenue',
  // 收入构成 (30分钟刷新)
  REVENUE_BREAKDOWN: 'stats:revenue_breakdown',
  // 实时在线人数 (30秒刷新)
  ONLINE_NOW: 'stats:realtime:online',
  // 今日实时计数器
  TODAY_DAU: 'stats:today:dau',
  TODAY_DRAWS: 'stats:today:draws',
  TODAY_BATTLES: 'stats:today:battles',
  TODAY_REVENUE: 'stats:today:revenue',
  TODAY_ORDERS: 'stats:today:orders',
  TODAY_NEW_USERS: 'stats:today:new_users',
} as const;

// ==================== TTL 常量 ====================
export const CACHE_TTL = {
  OVERVIEW: 300,      // 5分钟
  TREND: 600,         // 10分钟
  RETENTION: 1800,    // 30分钟
  GACHA: 600,         // 10分钟
  REVENUE: 600,       // 10分钟
  REALTIME: 30,       // 30秒
  BREAKDOWN: 1800,    // 30分钟
  DAY: 86400,         // 24小时
} as const;
