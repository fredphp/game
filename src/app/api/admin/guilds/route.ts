import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/guilds — List guilds with members, pagination
// Supports ?page=1&pageSize=20&name=xxx&status=1
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const name = searchParams.get('name')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (name) where.name = { contains: name }
    if (status !== null && status !== '') where.status = Number(status)

    const [guilds, total] = await Promise.all([
      db.guild.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },
        include: {
          members: {
            orderBy: { role: 'asc' },
          },
        },
      }),
      db.guild.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        list: guilds,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
      message: `查询到 ${total} 个公会`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '查询公会失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// POST /api/admin/guilds — Create guild
// Body: { name, leaderId, announcement, maxMembers?, members?: [{userId, role}] }
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Auto-seed: if table is empty, seed mock data
    const count = await db.guild.count()
    if (count === 0) {
      const seedGuilds = [
        {
          name: '龙图霸业',
          leaderId: 1,
          announcement: '征途天下，龙图霸业！招募活跃玩家，每日打卡必做。',
          level: 8,
          exp: 15600,
          memberCount: 28,
          maxMembers: 50,
          notice: '周三攻城战全体参加！',
          status: 1,
          members: {
            create: [
              { userId: 1, role: 'leader', contribution: 15800 },
              { userId: 2, role: 'vice_leader', contribution: 12300 },
              { userId: 3, role: 'elder', contribution: 9800 },
              { userId: 6, role: 'member', contribution: 7200 },
              { userId: 7, role: 'member', contribution: 5400 },
            ],
          },
        },
        {
          name: '蜀汉兴复',
          leaderId: 3,
          announcement: '兴复汉室，还于旧都！蜀国阵营专属公会。',
          level: 6,
          exp: 9200,
          memberCount: 22,
          maxMembers: 50,
          notice: '本周六军团战，请提前准备',
          status: 1,
          members: {
            create: [
              { userId: 3, role: 'leader', contribution: 18200 },
              { userId: 1, role: 'member', contribution: 6800 },
              { userId: 7, role: 'member', contribution: 4500 },
            ],
          },
        },
        {
          name: '铜雀台',
          leaderId: 4,
          announcement: '揽二乔于东南兮，乐朝夕之与共。',
          level: 5,
          exp: 6800,
          memberCount: 18,
          maxMembers: 40,
          notice: '新成员请完成入会任务',
          status: 1,
          members: {
            create: [
              { userId: 4, role: 'leader', contribution: 8900 },
              { userId: 2, role: 'member', contribution: 3200 },
              { userId: 9, role: 'member', contribution: 2100 },
            ],
          },
        },
        {
          name: '天下无双',
          leaderId: 6,
          announcement: '天下英雄，唯使君与操耳。',
          level: 4,
          exp: 4500,
          memberCount: 15,
          maxMembers: 30,
          notice: '暂无公告',
          status: 1,
          members: {
            create: [
              { userId: 6, role: 'leader', contribution: 7600 },
              { userId: 8, role: 'member', contribution: 2800 },
            ],
          },
        },
      ]
      const seeded = []
      for (const g of seedGuilds) {
        const { members, ...guildData } = g
        const created = await db.guild.create({
          data: { ...guildData, members: { create: members } },
          include: { members: true },
        })
        seeded.push(created)
      }
      return NextResponse.json({
        success: true,
        data: { list: seeded, seeded: seeded.length },
        message: `公会表为空，已自动初始化 ${seeded.length} 个公会`,
      })
    }

    const { members, ...guildData } = body
    const guild = await db.guild.create({
      data: {
        ...guildData,
        memberCount: members?.length || 1,
        members: members
          ? {
              create: members.map((m: Record<string, unknown>, _i: number) => ({
                userId: m.userId,
                role: m.role || 'member',
                contribution: m.contribution || 0,
              })),
            }
          : undefined,
      },
      include: { members: true },
    })

    return NextResponse.json({
      success: true,
      data: guild,
      message: '公会创建成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '创建公会失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// PUT /api/admin/guilds — Update guild info or manage members
// Body: { id, name?, announcement?, ... } OR { id, action: 'addMember'|'removeMember'|'setRole', userId?, role? }
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, action, userId, role, ...updateData } = body

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少公会ID' }, { status: 400 })
    }

    // Member management actions
    if (action === 'addMember' && userId) {
      // Check if already a member
      const existing = await db.guildMember.findFirst({
        where: { guildId: id, userId: Number(userId) },
      })
      if (existing) {
        return NextResponse.json({ success: false, message: '该玩家已是公会成员' }, { status: 400 })
      }

      const member = await db.guildMember.create({
        data: {
          guildId: id,
          userId: Number(userId),
          role: role || 'member',
          contribution: 0,
        },
      })

      // Update member count
      const memberCount = await db.guildMember.count({ where: { guildId: id } })
      await db.guild.update({ where: { id }, data: { memberCount } })

      return NextResponse.json({
        success: true,
        data: member,
        message: '成员添加成功',
      })
    }

    if (action === 'removeMember' && userId) {
      await db.guildMember.deleteMany({
        where: { guildId: id, userId: Number(userId) },
      })

      // Update member count
      const memberCount = await db.guildMember.count({ where: { guildId: id } })
      await db.guild.update({ where: { id }, data: { memberCount } })

      return NextResponse.json({
        success: true,
        message: '成员移除成功',
      })
    }

    if (action === 'setRole' && userId && role) {
      const member = await db.guildMember.updateMany({
        where: { guildId: id, userId: Number(userId) },
        data: { role },
      })

      return NextResponse.json({
        success: true,
        data: { count: member.count },
        message: '成员角色更新成功',
      })
    }

    // Default: update guild fields
    const guild = await db.guild.update({
      where: { id },
      data: updateData,
      include: { members: true },
    })

    return NextResponse.json({
      success: true,
      data: guild,
      message: '公会更新成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '更新公会失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// DELETE /api/admin/guilds?id=1 — Dissolve guild (delete members + guild)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少公会ID' }, { status: 400 })
    }

    // Delete members first, then guild
    await db.guildMember.deleteMany({ where: { guildId: id } })
    await db.guild.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: '公会已解散',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '解散公会失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
