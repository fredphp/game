// ============================================================
// API Route: /api/stats/overview
// 获取概览统计数据 (DAU/MAU/收入/新增/留存/在线)
// Redis 缓存 5 分钟, 数据库持久化
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { statsCache, CACHE_KEYS, CACHE_TTL } from '@/lib/stats-cache';

export async function GET(_request: NextRequest) {
  try {
    const cached = statsCache.get<Record<string, unknown>>(CACHE_KEYS.OVERVIEW);
    if (cached) {
      return NextResponse.json({ code: 0, message: 'ok', data: cached, fromCache: true });
    }

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const todayStr = fmtDate(today);
    const yesterdayStr = fmtDate(yesterday);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const [todayStats, yesterdayStats] = await Promise.all([
      db.dailyStats.findUnique({ where: { date: todayStr } }),
      db.dailyStats.findUnique({ where: { date: yesterdayStr } }),
    ]);

    // MAU: 本月去重活跃用户
    const mauRows = await db.userActiveLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: monthStart } },
      _count: true,
    });

    // 实时在线 (5 分钟内)
    const fiveMinAgo = new Date(today.getTime() - 5 * 60 * 1000);
    const onlineNow = await db.userActiveLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: fiveMinAgo } },
      _count: true,
    });

    // 今日活跃用户数
    const todayActive = await db.userActiveLog.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: new Date(todayStr) } },
      _count: true,
    });

    const dau = todayStats?.dau || todayActive.length || 0;
    const yDau = yesterdayStats?.dau || 0;
    const mau = mauRows.length || todayStats?.mau || 0;
    const yMau = yesterdayStats?.mau || 0;
    const newUsers = todayStats?.newUsers || 0;
    const yNew = yesterdayStats?.newUsers || 0;
    const revenue = todayStats?.revenue || 0;
    const yRev = yesterdayStats?.revenue || 0;

    const result = {
      onlineNow: onlineNow.length,
      onlineToday: todayActive.length,
      dau,
      dauChange: yDau > 0 ? +((dau - yDau) / yDau * 100).toFixed(1) : 0,
      mau,
      mauChange: yMau > 0 ? +((mau - yMau) / yMau * 100).toFixed(1) : 0,
      newUsers,
      newUsersChange: yNew > 0 ? +((newUsers - yNew) / yNew * 100).toFixed(1) : 0,
      revenue: +revenue.toFixed(2),
      revenueChange: yRev > 0 ? +((revenue - yRev) / yRev * 100).toFixed(1) : 0,
      arpu: dau > 0 ? +(revenue / dau).toFixed(2) : 0,
      payRate: todayStats?.payRate || 0,
      retention1: todayStats?.retention1 || 0,
      retention7: todayStats?.retention7 || 0,
      retention30: todayStats?.retention30 || 0,
      totalOrders: todayStats?.orders || 0,
      totalDraws: todayStats?.draws || 0,
      avgOnline: todayStats?.avgOnline || 0,
      serverCount: 4,
    };

    statsCache.set(CACHE_KEYS.OVERVIEW, result, CACHE_TTL.OVERVIEW);
    return NextResponse.json({ code: 0, message: 'ok', data: result, fromCache: false });
  } catch (error) {
    console.error('[Stats API] overview error:', error);
    return NextResponse.json({ code: -1, message: '服务器错误' }, { status: 500 });
  }
}

/** POST: 记录用户活跃 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action = 'login', duration = 0, ip = '', device = '' } = body;
    if (!userId) return NextResponse.json({ code: -1, message: '缺少 userId' }, { status: 400 });

    await db.userActiveLog.create({ data: { userId, action, duration, ip, device } });
    statsCache.incr(CACHE_KEYS.TODAY_DAU);
    if (action === 'gacha') statsCache.incr(CACHE_KEYS.TODAY_DRAWS);
    if (action === 'battle') statsCache.incr(CACHE_KEYS.TODAY_BATTLES);

    // 刷新在线人数
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const online = await db.userActiveLog.groupBy({ by: ['userId'], where: { createdAt: { gte: fiveMinAgo } }, _count: true });
    statsCache.set(CACHE_KEYS.ONLINE_NOW, online.length, CACHE_TTL.REALTIME);

    return NextResponse.json({ code: 0, message: '记录成功' });
  } catch (error) {
    console.error('[Stats API] record error:', error);
    return NextResponse.json({ code: -1, message: '服务器错误' }, { status: 500 });
  }
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
