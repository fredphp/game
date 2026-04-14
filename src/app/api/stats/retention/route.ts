// ============================================================
// API Route: /api/stats/retention
// 留存率数据 (Cohort 分析), 支持 1/3/7/14/30 日留存
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { statsCache, CACHE_KEYS, CACHE_TTL } from '@/lib/stats-cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const cacheKey = `${CACHE_KEYS.RETENTION}:${days}`;
    const cached = statsCache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json({ code: 0, message: 'ok', data: cached, fromCache: true });
    }

    // 查询最近 N 天的留存数据
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - days);
    const recentDateStr = fmtDate(recentDate);

    // 每日留存率趋势 (从 DailyStats 获取)
    const dailyRetention = await db.dailyStats.findMany({
      where: { date: { gte: recentDateStr } },
      orderBy: { date: 'asc' },
      select: { date: true, retention1: true, retention7: true, retention30: true },
    });

    // 留存率趋势图数据
    const trendData = dailyRetention.map((d) => ({
      date: d.date.slice(5),
      retention1: d.retention1,
      retention7: d.retention7,
      retention30: d.retention30,
    }));

    // Cohort 留存数据 (最近 7 个 cohort)
    const cohortData = await db.retentionRecord.findMany({
      where: { cohortDate: { gte: recentDateStr } },
      orderBy: { cohortDate: 'desc' },
      take: 14,
    });

    const cohortTable = cohortData.map((c) => ({
      cohortDate: c.cohortDate.slice(5),
      cohortSize: c.cohortSize,
      day1: c.retention1,
      day3: c.retention3,
      day7: c.retention7,
      day14: c.retention14,
      day30: c.retention30,
    }));

    // 计算平均留存率
    const avgRetention1 = dailyRetention.length > 0
      ? +(dailyRetention.reduce((sum, d) => sum + d.retention1, 0) / dailyRetention.length).toFixed(1)
      : 0;
    const avgRetention7 = dailyRetention.length > 0
      ? +(dailyRetention.reduce((sum, d) => sum + d.retention7, 0) / dailyRetention.length).toFixed(1)
      : 0;
    const avgRetention30 = dailyRetention.length > 0
      ? +(dailyRetention.reduce((sum, d) => sum + d.retention30, 0) / dailyRetention.length).toFixed(1)
      : 0;

    const result = {
      trend: trendData,
      cohortTable,
      average: {
        retention1: avgRetention1,
        retention7: avgRetention7,
        retention30: avgRetention30,
      },
    };

    statsCache.set(cacheKey, result, CACHE_TTL.RETENTION);
    return NextResponse.json({ code: 0, message: 'ok', data: result, fromCache: false });
  } catch (error) {
    console.error('[Stats API] retention error:', error);
    return NextResponse.json({ code: -1, message: '服务器错误' }, { status: 500 });
  }
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
