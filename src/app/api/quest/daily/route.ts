import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/quest/daily — 获取日常任务和里程碑
export async function GET() {
  try {
    const [tasks, milestones] = await Promise.all([
      db.dailyTask.findMany({ orderBy: { sortOrder: 'asc' } }),
      db.activityMilestone.findMany({ orderBy: { requiredPoints: 'asc' } }),
    ])
    return NextResponse.json({ code: 0, data: { tasks, milestones } })
  } catch {
    return NextResponse.json({ code: -1, message: '查询失败' }, { status: 500 })
  }
}

// POST /api/quest/daily — 创建日常任务
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { action, ...data } = body
    if (action === 'create_milestone') {
      const milestone = await db.activityMilestone.create({ data: data as never })
      return NextResponse.json({ code: 0, data: milestone })
    }
    const task = await db.dailyTask.create({ data })
    return NextResponse.json({ code: 0, data: task })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '创建失败'
    return NextResponse.json({ code: -1, message: msg }, { status: 500 })
  }
}

// PUT /api/quest/daily — 更新
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { action, id, ...data } = body
    if (action === 'update_milestone') {
      const milestone = await db.activityMilestone.update({ where: { id }, data })
      return NextResponse.json({ code: 0, data: milestone })
    }
    const task = await db.dailyTask.update({ where: { id }, data })
    return NextResponse.json({ code: 0, data: task })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '更新失败'
    return NextResponse.json({ code: -1, message: msg }, { status: 500 })
  }
}

// DELETE /api/quest/daily?type=task&id=1 或 type=milestone&id=1
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'task'
    const id = Number(searchParams.get('id'))
    if (type === 'milestone') {
      await db.activityMilestone.delete({ where: { id } })
    } else {
      await db.dailyTask.delete({ where: { id } })
    }
    return NextResponse.json({ code: 0 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '删除失败'
    return NextResponse.json({ code: -1, message: msg }, { status: 500 })
  }
}
