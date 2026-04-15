import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/payment — List game orders with pagination & filters
// Supports ?page=1&pageSize=20&status=1&productType=diamond&userId=1
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const status = searchParams.get('status')
    const productType = searchParams.get('productType')
    const userId = searchParams.get('userId')

    const where: Record<string, unknown> = {}
    if (status !== null && status !== '') where.status = Number(status)
    if (productType) where.productType = productType
    if (userId) where.userId = Number(userId)

    const [orders, total] = await Promise.all([
      db.gameOrder.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { id: 'desc' },
      }),
      db.gameOrder.count({ where }),
    ])

    // Summary stats
    const stats = await db.gameOrder.aggregate({
      _sum: { amount: true, diamond: true },
      _count: { id: true },
      where: {
        ...(status !== null && status !== '' ? { status: Number(status) } : {}),
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        list: orders,
        pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
        stats: {
          totalOrders: stats._count.id,
          totalAmount: stats._sum.amount || 0,
          totalDiamond: stats._sum.diamond || 0,
        },
      },
      message: `查询到 ${total} 条订单`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '查询订单失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// POST /api/admin/payment — Create a game order (manually)
// Body: { userId, productType, productName, amount, diamond, platform?, ... }
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Auto-seed: if table is empty, seed mock data
    const count = await db.gameOrder.count()
    if (count === 0) {
      const seedOrders = [
        { orderNo: 'ORD20250101001', userId: 1, productType: 'diamond', productName: '钻石x648', amount: 648, diamond: 6480, platform: 'wechat', status: 2, paidAt: new Date('2025-01-01T10:30:00Z') },
        { orderNo: 'ORD20250101002', userId: 3, productType: 'monthly', productName: '月卡·元宝', amount: 30, diamond: 3000, platform: 'alipay', status: 2, paidAt: new Date('2025-01-01T11:00:00Z') },
        { orderNo: 'ORD20250102001', userId: 2, productType: 'gift', productName: '新手超值礼包', amount: 6, diamond: 680, platform: 'wechat', status: 2, paidAt: new Date('2025-01-02T09:15:00Z') },
        { orderNo: 'ORD20250102002', userId: 6, productType: 'diamond', productName: '钻石x328', amount: 328, diamond: 3280, platform: 'alipay', status: 2, paidAt: new Date('2025-01-02T14:20:00Z') },
        { orderNo: 'ORD20250103001', userId: 1, productType: 'vip', productName: '至尊月卡', amount: 128, diamond: 12800, platform: 'wechat', status: 2, paidAt: new Date('2025-01-03T08:45:00Z') },
        { orderNo: 'ORD20250103002', userId: 3, productType: 'diamond', productName: '钻石x648', amount: 648, diamond: 6480, platform: 'wechat', status: 2, paidAt: new Date('2025-01-03T16:30:00Z') },
        { orderNo: 'ORD20250104001', userId: 7, productType: 'monthly', productName: '月卡·元宝', amount: 30, diamond: 3000, platform: 'alipay', status: 1, paidAt: new Date('2025-01-04T10:00:00Z') },
        { orderNo: 'ORD20250104002', userId: 2, productType: 'gift', productName: '成长基金', amount: 68, diamond: 6800, platform: 'wechat', status: 2, paidAt: new Date('2025-01-04T13:15:00Z') },
        { orderNo: 'ORD20250105001', userId: 9, productType: 'diamond', productName: '钻石x68', amount: 68, diamond: 680, platform: 'alipay', status: 0 },
        { orderNo: 'ORD20250105002', userId: 4, productType: 'diamond', productName: '钻石x328', amount: 328, diamond: 3280, platform: 'wechat', status: 3, paidAt: new Date('2025-01-05T09:00:00Z') },
        { orderNo: 'ORD20250105003', userId: 6, productType: 'gift', productName: '限时战令礼包', amount: 98, diamond: 9800, platform: 'wechat', status: 2, paidAt: new Date('2025-01-05T11:30:00Z') },
        { orderNo: 'ORD20250106001', userId: 1, productType: 'diamond', productName: '首充双倍', amount: 6, diamond: 120, platform: 'alipay', status: 2, paidAt: new Date('2025-01-06T07:20:00Z') },
      ]
      const seeded = await db.gameOrder.createMany({ data: seedOrders })
      const all = await db.gameOrder.findMany({ orderBy: { id: 'desc' } })
      return NextResponse.json({
        success: true,
        data: { list: all, seeded: seeded.count },
        message: `订单表为空，已自动初始化 ${seeded.count} 条订单数据`,
      })
    }

    const { id, ...createData } = body
    const order = await db.gameOrder.create({
      data: createData,
    })

    return NextResponse.json({
      success: true,
      data: order,
      message: '订单创建成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '创建订单失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// PUT /api/admin/payment — Update order status (refund, deliver, etc.)
// Body: { id, status, ... }
// status: 0=pending, 1=paid, 2=delivered, 3=refunded
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少订单ID' }, { status: 400 })
    }

    const order = await db.gameOrder.update({
      where: { id },
      data: updateData,
    })

    const statusLabels: Record<number, string> = {
      0: '待支付',
      1: '已支付',
      2: '已发货',
      3: '已退款',
    }
    const statusLabel = statusLabels[order.status as number] || '未知'

    return NextResponse.json({
      success: true,
      data: order,
      message: `订单状态已更新为: ${statusLabel}`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '更新订单失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// DELETE /api/admin/payment?id=1 — Delete order (admin use)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少订单ID' }, { status: 400 })
    }

    await db.gameOrder.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: '订单已删除',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '删除订单失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
