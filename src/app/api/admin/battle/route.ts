import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/battle — Battle statistics & recent battles
// Reads from GachaRecord and UserActiveLog as proxy for battle data
// Supports ?type=stats|recent|by-rarity&page=1&pageSize=20&days=7
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'stats'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const days = parseInt(searchParams.get('days') || '7')

    const since = new Date()
    since.setDate(since.getDate() - days)

    if (type === 'recent') {
      // Recent gacha draws (proxy for recent game activity)
      const [records, total] = await Promise.all([
        db.gachaRecord.findMany({
          where: { createdAt: { gte: since } },
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { id: 'desc' },
        }),
        db.gachaRecord.count({ where: { createdAt: { gte: since } } }),
      ])

      return NextResponse.json({
        success: true,
        data: {
          list: records,
          pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        },
        message: `查询到 ${total} 条近期记录`,
      })
    }

    if (type === 'by-rarity') {
      // Gacha rarity distribution (proxy for battle win rates)
      const rarityStats = await db.gachaRecord.groupBy({
        by: ['rarity'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
        _sum: { pityCount: true },
      })

      const totalDraws = rarityStats.reduce((sum, r) => sum + r._count.id, 0)

      return NextResponse.json({
        success: true,
        data: rarityStats.map((r) => ({
          rarity: r.rarity,
          count: r._count.id,
          rate: totalDraws > 0 ? ((r._count.id / totalDraws) * 100).toFixed(2) : '0',
          avgPity: r._count.id > 0 ? ((r._sum.pityCount || 0) / r._count.id).toFixed(1) : '0',
        })),
        message: '品级分布统计',
      })
    }

    // Default: overall battle/gacha stats
    const [
      totalGachaRecords,
      recentGachaRecords,
      recentActiveLogs,
      topUsers,
      dailyStats,
    ] = await Promise.all([
      db.gachaRecord.count(),
      db.gachaRecord.count({ where: { createdAt: { gte: since } } }),
      db.userActiveLog.count({ where: { createdAt: { gte: since } } }),
      db.gachaRecord.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: since } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 10,
      }),
      db.dailyStats.findMany({
        where: { date: { gte: since.toISOString().slice(0, 10) } },
        orderBy: { date: 'desc' },
        take: days,
      }),
    ])

    // Rarity breakdown
    const rarityBreakdown = await db.gachaRecord.groupBy({
      by: ['rarity'],
      _count: { id: true },
    })

    // Draw type breakdown
    const drawTypeBreakdown = await db.gachaRecord.groupBy({
      by: ['drawType'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    })

    // Recent action breakdown
    const actionBreakdown = await db.userActiveLog.groupBy({
      by: ['action'],
      where: { createdAt: { gte: since } },
      _count: { id: true },
    })

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          totalRecords: totalGachaRecords,
          recentRecords: recentGachaRecords,
          recentActiveActions: recentActiveLogs,
          periodDays: days,
        },
        rarityBreakdown: rarityBreakdown.map((r) => ({
          rarity: r.rarity,
          count: r._count.id,
        })),
        drawTypeBreakdown: drawTypeBreakdown.map((d) => ({
          type: d.drawType,
          count: d._count.id,
        })),
        actionBreakdown: actionBreakdown.map((a) => ({
          action: a.action,
          count: a._count.id,
        })),
        topActiveUsers: topUsers.map((u) => ({
          userId: u.userId,
          recordsCount: u._count.id,
        })),
        dailyTrend: dailyStats,
      },
      message: '战斗/抽卡统计概览',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '查询战斗统计失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
