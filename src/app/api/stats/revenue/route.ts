// ============================================================
// API Route: /api/stats/revenue
// 收入统计: 日收入趋势、收入构成、ARPU、付费率、TOP用户
// ============================================================
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { statsCache, CACHE_KEYS, CACHE_TTL } from '@/lib/stats-cache';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30', 10);

    const cacheKey = `${CACHE_KEYS.REVENUE}:${days}`;
    const cached = statsCache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return NextResponse.json({ code: 0, message: 'ok', data: cached, fromCache: true });
    }

    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - days);
    const startStr = fmtDate(start);
    const endStr = fmtDate(end);

    // 1. 每日收入趋势 (DailyStats)
    const dailyStats = await db.dailyStats.findMany({
      where: { date: { gte: startStr, lte: endStr } },
      orderBy: { date: 'asc' },
    });

    const trendData = dailyStats.map((d) => ({
      date: d.date.slice(5),
      revenue: d.revenue,
      orders: d.orders,
      payRate: d.payRate,
      arpu: d.arpu,
    }));

    // 2. 收入构成 (从 RevenueRecord 统计)
    const revenueRecords = await db.revenueRecord.findMany({
      where: {
        status: { in: [1, 2] }, // 已支付 / 已发货
        paidAt: { gte: start, lte: end },
      },
    });

    const totalRevenue = revenueRecords.reduce((sum, r) => sum + r.amount, 0);
    const paidOrders = revenueRecords.length;

    // 按商品类型分类
    const byType: Record<string, { count: number; amount: number }> = {};
    for (const r of revenueRecords) {
      if (!byType[r.productType]) byType[r.productType] = { count: 0, amount: 0 };
      byType[r.productType].count++;
      byType[r.productType].amount += r.amount;
    }

    const typeLabels: Record<string, string> = {
      diamond: '钻石充值',
      monthly: '月卡',
      gift: '礼包',
      vip: 'VIP',
    };

    const breakdown = Object.entries(byType).map(([type, data]) => ({
      type,
      name: typeLabels[type] || type,
      count: data.count,
      amount: +data.amount.toFixed(2),
      percentage: totalRevenue > 0 ? +(data.amount / totalRevenue * 100).toFixed(1) : 0,
    })).sort((a, b) => b.amount - a.amount);

    // 饼图数据
    const pieData = breakdown.map((b, i) => {
      const colors = ['var(--color-amber-500)', 'var(--color-emerald-500)', 'var(--color-violet-500)', 'var(--color-rose-400)'];
      return { ...b, fill: colors[i % colors.length] };
    });

    // 3. 支付方式分布
    const byMethod: Record<string, number> = {};
    for (const r of revenueRecords) {
      if (r.payMethod) byMethod[r.payMethod] = (byMethod[r.payMethod] || 0) + r.amount;
    }

    const methodDistribution = Object.entries(byMethod)
      .map(([method, amount]) => ({ method, amount: +amount.toFixed(2) }))
      .sort((a, b) => b.amount - a.amount);

    // 4. TOP 充值用户
    const topUsers = await db.revenueRecord.groupBy({
      by: ['userId', 'nickname'],
      _sum: { amount: true, diamond: true },
      _count: true,
      where: {
        status: { in: [1, 2] },
        paidAt: { gte: start, lte: end },
      },
      orderBy: { _sum: { amount: 'desc' } },
      take: 10,
    });

    const topSpenders = topUsers.map(u => ({
      userId: u.userId,
      nickname: u.nickname,
      totalAmount: +(u._sum.amount || 0).toFixed(2),
      totalDiamond: u._sum.diamond || 0,
      orderCount: u._count,
    }));

    // 5. 汇总数据
    const totalDays = dailyStats.length || 1;
    const summary = {
      totalRevenue: +totalRevenue.toFixed(2),
      dailyAvgRevenue: +(totalRevenue / totalDays).toFixed(2),
      totalOrders: paidOrders,
      avgOrderAmount: paidOrders > 0 ? +(totalRevenue / paidOrders).toFixed(2) : 0,
      avgArpu: +(dailyStats.reduce((s, d) => s + d.arpu, 0) / totalDays).toFixed(2),
      avgPayRate: +(dailyStats.reduce((s, d) => s + d.payRate, 0) / totalDays).toFixed(1),
    };

    const result = {
      trend: trendData,
      breakdown,
      pieData,
      methodDistribution,
      topSpenders,
      summary,
    };

    statsCache.set(cacheKey, result, CACHE_TTL.REVENUE);
    return NextResponse.json({ code: 0, message: 'ok', data: result, fromCache: false });
  } catch (error) {
    console.error('[Stats API] revenue error:', error);
    return NextResponse.json({ code: -1, message: '服务器错误' }, { status: 500 });
  }
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
