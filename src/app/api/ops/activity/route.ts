import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/ops/activity — List activities with tasks
// Supports ?status=active&type=gacha
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (type) where.type = type

    const activities = await db.activity.findMany({
      where,
      include: {
        tasks: {
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { id: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: activities,
      message: `查询到 ${activities.length} 个活动`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '查询活动失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// POST /api/ops/activity — Create activity (with tasks array in body)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { tasks, ...activityData } = body

    const activity = await db.activity.create({
      data: {
        ...activityData,
        tasks: tasks
          ? {
              create: tasks.map((task: Record<string, unknown>, index: number) => ({
                ...task,
                sortOrder: task.sortOrder ?? index + 1,
              })),
            }
          : undefined,
      },
      include: { tasks: { orderBy: { sortOrder: 'asc' } } },
    })

    return NextResponse.json({
      success: true,
      data: activity,
      message: '活动创建成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '创建活动失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// PUT /api/ops/activity — Update activity status or edit fields
// Body: { id, status?, ...activityFields }
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少活动ID' }, { status: 400 })
    }

    const activity = await db.activity.update({
      where: { id },
      data: updateData,
      include: { tasks: { orderBy: { sortOrder: 'asc' } } },
    })

    return NextResponse.json({
      success: true,
      data: activity,
      message: '活动更新成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '更新活动失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// DELETE /api/ops/activity?id=1 — Delete activity by id
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少活动ID' }, { status: 400 })
    }

    // Delete tasks first (child records), then activity
    await db.activityTask.deleteMany({ where: { activityId: id } })
    await db.activity.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: '活动删除成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '删除活动失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
