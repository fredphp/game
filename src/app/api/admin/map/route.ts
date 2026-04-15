import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/map — List cities & marches
// Supports ?type=cities|cities&status=1&page=1&pageSize=20 for cities
//          ?type=marches&status=marching for marches
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'cities'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const status = searchParams.get('status')
    const ownerId = searchParams.get('ownerId')

    if (type === 'marches') {
      // List march queues
      const where: Record<string, unknown> = {}
      if (status) where.status = status
      if (ownerId) where.playerId = Number(ownerId)

      const [marches, total] = await Promise.all([
        db.marchQueue.findMany({
          where,
          skip: (page - 1) * pageSize,
          take: pageSize,
          orderBy: { id: 'desc' },
        }),
        db.marchQueue.count({ where }),
      ])

      return NextResponse.json({
        success: true,
        data: {
          list: marches,
          pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        },
        message: `查询到 ${total} 条行军记录`,
      })
    }

    // Default: list cities
    const where: Record<string, unknown> = {}
    if (status !== null && status !== '') where.status = Number(status)
    if (ownerId) where.ownerId = Number(ownerId)

    const [cities, total] = await Promise.all([
      db.city.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'asc' },
      }),
      db.city.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        list: cities,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      },
      message: `查询到 ${total} 个城池`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '查询地图数据失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// POST /api/admin/map — Create city or march
// Body: { type: 'city', name, x, y, level, ownerId, ... }
//       { type: 'march', playerId, fromCityId, toCityId, heroIds, arrivalTime, ... }
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { type, ...data } = body

    // Auto-seed cities if empty
    const cityCount = await db.city.count()
    if (cityCount === 0 && (!type || type === 'city')) {
      const seedCities = [
        { name: '洛阳', x: 50, y: 50, level: 10, ownerId: null, resources: 10000, status: 1 },
        { name: '长安', x: 30, y: 25, level: 9, ownerId: null, resources: 8500, status: 1 },
        { name: '建业', x: 80, y: 70, level: 8, ownerId: 1, resources: 7200, status: 1 },
        { name: '成都', x: 20, y: 75, level: 8, ownerId: 3, resources: 6800, status: 1 },
        { name: '许昌', x: 55, y: 35, level: 7, ownerId: 4, resources: 5500, status: 1 },
        { name: '襄阳', x: 45, y: 55, level: 7, ownerId: null, resources: 5000, status: 1 },
        { name: '荆州', x: 48, y: 65, level: 6, ownerId: 6, resources: 4200, status: 1 },
        { name: '汉中', x: 28, y: 50, level: 6, ownerId: null, resources: 3800, status: 1 },
        { name: '徐州', x: 65, y: 25, level: 5, ownerId: 2, resources: 3200, status: 1 },
        { name: '会稽', x: 85, y: 60, level: 5, ownerId: null, resources: 2800, status: 1 },
        { name: '宛城', x: 52, y: 40, level: 4, ownerId: 7, resources: 2200, status: 1 },
        { name: '柴桑', x: 60, y: 65, level: 4, ownerId: null, resources: 2000, status: 1 },
        { name: '寿春', x: 70, y: 50, level: 3, ownerId: null, resources: 1500, status: 1 },
        { name: '上庸', x: 35, y: 58, level: 3, ownerId: null, resources: 1200, status: 1 },
        { name: '永安', x: 25, y: 68, level: 3, ownerId: 8, resources: 1000, status: 1 },
        { name: '北平', x: 40, y: 10, level: 4, ownerId: null, resources: 1800, status: 1 },
        { name: '下邳', x: 70, y: 30, level: 3, ownerId: 9, resources: 1300, status: 1 },
        { name: '新野', x: 50, y: 58, level: 2, ownerId: null, resources: 800, status: 1 },
      ]
      const seeded = await db.city.createMany({ data: seedCities })
      const all = await db.city.findMany({ orderBy: { id: 'asc' } })
      return NextResponse.json({
        success: true,
        data: { list: all, seeded: seeded.count },
        message: `城池表为空，已自动初始化 ${seeded.count} 个城池`,
      })
    }

    if (type === 'march') {
      const { id, ...marchData } = data as Record<string, unknown>
      const march = await db.marchQueue.create({
        data: {
          playerId: marchData.playerId ? Number(marchData.playerId) : undefined,
          fromCityId: marchData.fromCityId ? Number(marchData.fromCityId) : undefined,
          toCityId: marchData.toCityId ? Number(marchData.toCityId) : undefined,
          status: 'marching',
        },
      })
      return NextResponse.json({
        success: true,
        data: march,
        message: '行军创建成功',
      })
    }

    // Default: create city
    const { id, ...cityData } = data as Record<string, unknown>
    const city = await db.city.create({
      data: cityData as Record<string, unknown>,
    })

    return NextResponse.json({
      success: true,
      data: city,
      message: '城池创建成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '创建地图数据失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// PUT /api/admin/map — Update city ownership or manage marches
// Body: { type: 'city', id, ownerId?, level?, resources?, status? }
//       { type: 'march', id, status? }
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { type, id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少ID' }, { status: 400 })
    }

    if (type === 'march') {
      const march = await db.marchQueue.update({
        where: { id: Number(id) },
        data: updateData,
      })
      return NextResponse.json({
        success: true,
        data: march,
        message: '行军更新成功',
      })
    }

    // Default: update city
    const city = await db.city.update({
      where: { id: Number(id) },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: city,
      message: '城池更新成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '更新地图数据失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// DELETE /api/admin/map?type=city&id=1 or ?type=march&id=1
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))
    const type = searchParams.get('type') || 'city'

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少ID' }, { status: 400 })
    }

    if (type === 'march') {
      await db.marchQueue.delete({ where: { id } })
      return NextResponse.json({ success: true, message: '行军记录已删除' })
    }

    await db.city.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: '城池已删除',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '删除地图数据失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
