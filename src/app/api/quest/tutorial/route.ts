import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/quest/tutorial — 获取所有新手引导步骤
export async function GET() {
  try {
    const steps = await db.tutorialStep.findMany({ orderBy: { stepOrder: 'asc' } })
    return NextResponse.json({ code: 0, data: steps })
  } catch (e) {
    return NextResponse.json({ code: -1, message: '查询失败' }, { status: 500 })
  }
}

// POST /api/quest/tutorial — 创建新手引导步骤
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const step = await db.tutorialStep.create({ data: body })
    return NextResponse.json({ code: 0, data: step })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '创建失败'
    return NextResponse.json({ code: -1, message: msg }, { status: 500 })
  }
}

// PUT /api/quest/tutorial — 更新新手引导步骤
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    const step = await db.tutorialStep.update({ where: { id }, data })
    return NextResponse.json({ code: 0, data: step })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '更新失败'
    return NextResponse.json({ code: -1, message: msg }, { status: 500 })
  }
}

// DELETE /api/quest/tutorial?id=1
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))
    await db.tutorialStep.delete({ where: { id } })
    return NextResponse.json({ code: 0 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '删除失败'
    return NextResponse.json({ code: -1, message: msg }, { status: 500 })
  }
}
