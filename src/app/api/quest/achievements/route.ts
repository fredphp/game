import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/quest/achievements — 获取所有成就
export async function GET() {
  try {
    const achievements = await db.achievement.findMany({ orderBy: { sortOrder: 'asc' } })
    return NextResponse.json({ code: 0, data: achievements })
  } catch {
    return NextResponse.json({ code: -1, message: '查询失败' }, { status: 500 })
  }
}

// POST /api/quest/achievements — 创建成就
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const achievement = await db.achievement.create({ data: body })
    return NextResponse.json({ code: 0, data: achievement })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '创建失败'
    return NextResponse.json({ code: -1, message: msg }, { status: 500 })
  }
}

// PUT /api/quest/achievements — 更新成就
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    const achievement = await db.achievement.update({ where: { id }, data })
    return NextResponse.json({ code: 0, data: achievement })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '更新失败'
    return NextResponse.json({ code: -1, message: msg }, { status: 500 })
  }
}

// DELETE /api/quest/achievements?id=1
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))
    await db.achievement.delete({ where: { id } })
    return NextResponse.json({ code: 0 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '删除失败'
    return NextResponse.json({ code: -1, message: msg }, { status: 500 })
  }
}
