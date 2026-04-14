// ============================================================
// API Route: /api/stats/gacha
// 抽卡统计: 每日抽卡次数、SSR/SR 出率、卡池分布、保底统计
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { statsCache, CACHE_KEYS, CACHE_TTL } from '@/lib/stats-cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '14', 10);

    const cacheKey = `${CACHE_KEYS.GACHA}:${days}`;
    const cached = statsCache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json({ code: 0, message: 'ok', data: cached, fromCache: true });
    }

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    const startStr = fmtDate(start);
    const endStr = fmtDate(end);

    // 1. 每日抽卡趋势 (从 DailyStats)
    const dailyStats = await db.dailyStats.findMany({
      where: { date: { gte: startStr, lte: endStr } },
      orderBy: { date: 'asc' },
      select: { date: true, draws: true },
    });

    // 从 GachaRecord 统计每日 SSR/SR 次数和出率
    const gachaRecords = await db.gachaRecord.findMany({
      where: { createdAt: { gte: start, lte: end } },
    });

    // 按日期分组
    const byDate: Record<string, { total: number; ssr: number; sr: number; r: number }> = {};
    for (const r of gachaRecords) {
      const dateKey = fmtDate(r.createdAt);
      if (!byDate[dateKey]) byDate[dateKey] = { total: 0, ssr: 0, sr: 0, r: 0 };
      byDate[dateKey].total++;
      if (r.rarity === 'SSR') byDate[dateKey].ssr++;
      else if (r.rarity === 'SR') byDate[dateKey].sr++;
      else byDate[dateKey].r++;
    }

    // 趋势图数据
    const trendData = dailyStats.map((d) => {
      const g = byDate[d.date] || { total: 0, ssr: 0, sr: 0, r: 0 };
      return {
        date: d.date.slice(5),
        totalDraws: d.draws,
        ssrCount: g.ssr,
        srCount: g.sr,
        ssrRate: g.total > 0 ? +(g.ssr / g.total * 100).toFixed(2) : 0,
        srRate: g.total > 0 ? +(g.sr / g.total * 100).toFixed(1) : 0,
      };
    });

    // 2. 品质分布 (总览)
    const totalDraws = gachaRecords.length;
    const totalSSR = gachaRecords.filter(r => r.rarity === 'SSR').length;
    const totalSR = gachaRecords.filter(r => r.rarity === 'SR').length;
    const totalR = gachaRecords.filter(r => r.rarity === 'R').length;

    const rarityDistribution = [
      { name: 'SSR', count: totalSSR, rate: totalDraws > 0 ? +(totalSSR / totalDraws * 100).toFixed(2) : 0, color: 'var(--color-amber-500)' },
      { name: 'SR', count: totalSR, rate: totalDraws > 0 ? +(totalSR / totalDraws * 100).toFixed(1) : 0, color: 'var(--color-violet-500)' },
      { name: 'R', count: totalR, rate: totalDraws > 0 ? +(totalR / totalDraws * 100).toFixed(1) : 0, color: 'var(--color-sky-500)' },
    ];

    // 3. 卡池分布
    const poolStats = await db.gachaRecord.groupBy({
      by: ['poolName'],
      _count: true,
      where: { createdAt: { gte: start, lte: end } },
    });

    const poolDistribution = poolStats.map(p => ({
      poolName: p.poolName,
      draws: p._count,
    })).sort((a, b) => b.draws - a.draws);

    // 4. 武将热度 TOP 10
    const heroStats = await db.gachaRecord.groupBy({
      by: ['heroName', 'rarity'],
      _count: true,
      where: { createdAt: { gte: start, lte: end }, heroId: { gt: 0 } },
    });

    const heroRanking = heroStats
      .sort((a, b) => b._count - a._count)
      .slice(0, 10)
      .map(h => ({ heroName: h.heroName, rarity: h.rarity, count: h._count }));

    // 5. 保底统计
    const pityRecords = await db.gachaRecord.findMany({
      where: {
        createdAt: { gte: start, lte: end },
        pityCount: { gt: 0 },
      },
      select: { pityCount: true },
    });

    const avgPity = pityRecords.length > 0
      ? +(pityRecords.reduce((sum, r) => sum + r.pityCount, 0) / pityRecords.length).toFixed(1)
      : 0;

    const hardPityCount = pityRecords.filter(r => r.pityCount >= 75).length;

    const result = {
      trend: trendData,
      rarityDistribution,
      poolDistribution,
      heroRanking,
      pityStats: { avgPity, hardPityCount, totalSamples: pityRecords.length },
      summary: {
        totalDraws,
        totalSSR,
        totalSR,
        totalR,
      },
    };

    statsCache.set(cacheKey, result, CACHE_TTL.GACHA);
    return NextResponse.json({ code: 0, message: 'ok', data: result, fromCache: false });
  } catch (error) {
    console.error('[Stats API] gacha error:', error);
    return NextResponse.json({ code: -1, message: '服务器错误' }, { status: 500 });
  }
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
