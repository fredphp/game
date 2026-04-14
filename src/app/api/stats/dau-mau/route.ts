// ============================================================
// API Route: /api/stats/dau-mau
// DAU/MAU 趋势图表数据, 支持日期范围查询
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { statsCache, CACHE_KEYS, CACHE_TTL } from '@/lib/stats-cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // 构建查询日期范围
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end);
    start.setDate(start.getDate() - (days - 1));

    const cacheKey = `${CACHE_KEYS.DAU_MAU_TREND}:${fmtDate(start)}:${fmtDate(end)}`;

    const cached = statsCache.get<Array<{
      date: string;
      dau: number;
      mau: number;
      newUsers: number;
    }>>(cacheKey);

    if (cached) {
      return NextResponse.json({ code: 0, message: 'ok', data: cached, fromCache: true });
    }

    // 查询日期范围内的日统计
    const dailyStatsList = await db.dailyStats.findMany({
      where: {
        date: { gte: fmtDate(start), lte: fmtDate(end) },
      },
      orderBy: { date: 'asc' },
    });

    // 计算每天的 MAU (滚动 30 天)
    const result = dailyStatsList.map((stat) => ({
      date: stat.date.slice(5), // MM-DD 格式
      dau: stat.dau,
      mau: stat.mau,
      newUsers: stat.newUsers,
    }));

    statsCache.set(cacheKey, result, CACHE_TTL.TREND);
    return NextResponse.json({ code: 0, message: 'ok', data: result, fromCache: false });
  } catch (error) {
    console.error('[Stats API] dau-mau error:', error);
    return NextResponse.json({ code: -1, message: '服务器错误' }, { status: 500 });
  }
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
