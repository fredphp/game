import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/quest/chapters — 获取所有章节(含任务)
export async function GET() {
  try {
    const chapters = await db.chapter.findMany({
      orderBy: { chapterOrder: 'asc' },
      include: { quests: { orderBy: { questOrder: 'asc' } } },
    })
    return NextResponse.json({ code: 0, data: chapters })
  } catch {
    return NextResponse.json({ code: -1, message: '查询失败' }, { status: 500 })
  }
}

// POST /api/quest/chapters — 创建章节
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const chapter = await db.chapter.create({ data: body })
    return NextResponse.json({ code: 0, data: chapter })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '创建失败'
    return NextResponse.json({ code: -1, message: msg }, { status: 500 })
  }
}

// PUT /api/quest/chapters — 更新章节
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    const chapter = await db.chapter.update({ where: { id }, data })
    return NextResponse.json({ code: 0, data: chapter })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '更新失败'
    return NextResponse.json({ code: -1, message: msg }, { status: 500 })
  }
}

// DELETE /api/quest/chapters?id=1
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))
    await db.quest.deleteMany({ where: { chapterId: id } })
    await db.chapter.delete({ where: { id } })
    return NextResponse.json({ code: 0 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '删除失败'
    return NextResponse.json({ code: -1, message: msg }, { status: 500 })
  }
}

// POST /api/quest/chapters/quest — 创建任务
export async function PATCH(req: Request) {
  try {
    const body = await req.json()
    const { action, ...data } = body
    if (action === 'create_quest') {
      const quest = await db.quest.create({ data: data as never })
      return NextResponse.json({ code: 0, data: quest })
    }
    if (action === 'update_quest') {
      const { id, ...qData } = data as { id: number }
      const quest = await db.quest.update({ where: { id }, data: qData })
      return NextResponse.json({ code: 0, data: quest })
    }
    if (action === 'delete_quest') {
      await db.quest.delete({ where: { id: (data as { id: number }).id } })
      return NextResponse.json({ code: 0 })
    }
    return NextResponse.json({ code: -1, message: '无效操作' }, { status: 400 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '操作失败'
    return NextResponse.json({ code: -1, message: msg }, { status: 500 })
  }
}
