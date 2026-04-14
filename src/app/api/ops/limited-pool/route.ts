import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/ops/limited-pool — List limited pools
// Supports ?status=1&type=limited
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    const where: Record<string, unknown> = {}
    if (status !== null) where.status = Number(status)
    if (type) where.type = type

    const pools = await db.limitedPool.findMany({
      where,
      orderBy: { sort: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: pools,
      message: `查询到 ${pools.length} 个卡池`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '查询卡池失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// POST /api/ops/limited-pool — Create limited pool
export async function POST(req: Request) {
  try {
    const body = await req.json()

    const pool = await db.limitedPool.create({
      data: body,
    })

    return NextResponse.json({
      success: true,
      data: pool,
      message: '卡池创建成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '创建卡池失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// PUT /api/ops/limited-pool — Update pool (open/close, modify rates)
// Body: { id, status?, ssrRate?, srRate?, ... }
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少卡池ID' }, { status: 400 })
    }

    const pool = await db.limitedPool.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: pool,
      message: '卡池更新成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '更新卡池失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// DELETE /api/ops/limited-pool?id=1 — Delete pool by id
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少卡池ID' }, { status: 400 })
    }

    await db.limitedPool.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: '卡池删除成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '删除卡池失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
