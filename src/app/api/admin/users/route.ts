import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/users — List game players with pagination & filters
// Supports ?page=1&pageSize=20&nickname=xxx&status=1&serverId=1
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const nickname = searchParams.get('nickname')
    const status = searchParams.get('status')
    const serverId = searchParams.get('serverId')

    const where: Record<string, unknown> = {}
    if (nickname) where.nickname = { contains: nickname }
    if (status !== null && status !== '') where.status = Number(status)
    if (serverId) where.serverId = Number(serverId)

    const [players, total] = await Promise.all([
      db.gamePlayer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },
      }),
      db.gamePlayer.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        list: players,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
      message: `查询到 ${total} 个玩家`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '查询玩家失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// POST /api/admin/users — Create a game player
// Body: { uid, nickname, avatar, level, gold, diamond, stamina, serverId, ... }
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Auto-seed: if table is empty, seed mock data
    const count = await db.gamePlayer.count()
    if (count === 0) {
      const seedData = [
        { uid: '10001', nickname: '赵子龙', avatar: 'hero_zhaoyun', level: 45, exp: 12800, gold: 356000, diamond: 2200, stamina: 120, power: 89500, vipLevel: 5, serverId: 1, status: 1 },
        { uid: '10002', nickname: '小乔流水', avatar: 'hero_xiaoqiao', level: 38, exp: 9200, gold: 178000, diamond: 800, stamina: 86, power: 65200, vipLevel: 3, serverId: 1, status: 1 },
        { uid: '10003', nickname: '乱世枭雄', avatar: 'hero_caocao', level: 52, exp: 22100, gold: 892000, diamond: 5600, stamina: 150, power: 132000, vipLevel: 8, serverId: 1, status: 1 },
        { uid: '10004', nickname: '凤雏先生', avatar: 'hero_pangtong', level: 29, exp: 5600, gold: 89000, diamond: 350, stamina: 60, power: 42100, vipLevel: 1, serverId: 2, status: 1 },
        { uid: '10005', nickname: '赤壁周郎', avatar: 'hero_zhouyu', level: 41, exp: 15200, gold: 245000, diamond: 1800, stamina: 110, power: 78600, vipLevel: 6, serverId: 1, status: 0 },
        { uid: '10006', nickname: '卧龙先生', avatar: 'hero_zhugeliang', level: 50, exp: 19800, gold: 567000, diamond: 4200, stamina: 140, power: 118000, vipLevel: 7, serverId: 2, status: 1 },
        { uid: '10007', nickname: '锦马超', avatar: 'hero_machao', level: 33, exp: 7800, gold: 134000, diamond: 600, stamina: 72, power: 55300, vipLevel: 2, serverId: 1, status: 1 },
        { uid: '10008', nickname: '鬼谷子', avatar: 'hero_guiguzi', level: 27, exp: 4200, gold: 67000, diamond: 200, stamina: 55, power: 38200, vipLevel: 0, serverId: 2, status: 1 },
        { uid: '10009', nickname: '张三丰', avatar: 'hero_zhangsanfeng', level: 15, exp: 1800, gold: 23000, diamond: 100, stamina: 30, power: 18500, vipLevel: 0, serverId: 1, status: 1 },
        { uid: '10010', nickname: '疑似外挂', avatar: 'default', level: 60, exp: 35000, gold: 9999000, diamond: 99999, stamina: 200, power: 999999, vipLevel: 10, serverId: 1, status: 0 },
      ]
      const seeded = await db.gamePlayer.createMany({ data: seedData })
      const all = await db.gamePlayer.findMany({ orderBy: { id: 'desc' } })
      return NextResponse.json({
        success: true,
        data: { list: all, seeded: seeded.count },
        message: `玩家表为空，已自动初始化 ${seeded.count} 条种子数据`,
      })
    }

    const { id, ...createData } = body
    const player = await db.gamePlayer.create({
      data: createData,
    })

    return NextResponse.json({
      success: true,
      data: player,
      message: '玩家创建成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '创建玩家失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// PUT /api/admin/users — Update game player
// Body: { id, nickname?, gold?, diamond?, stamina?, status?, level?, ... }
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少玩家ID' }, { status: 400 })
    }

    const player = await db.gamePlayer.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: player,
      message: '玩家更新成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '更新玩家失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// DELETE /api/admin/users?id=1 — Soft delete player (set status=0)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少玩家ID' }, { status: 400 })
    }

    const player = await db.gamePlayer.update({
      where: { id },
      data: { status: 0 },
    })

    return NextResponse.json({
      success: true,
      data: player,
      message: '玩家已封禁(status=0)',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '封禁玩家失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
