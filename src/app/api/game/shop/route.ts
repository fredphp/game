import { NextResponse } from 'next/server'

// GET /api/game/shop - Get shop items
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      items: [
        { id: 's1', name: '6元首充', price: 6, currency: 'cny', badge: 'HOT', description: 'SSR碎片×10 + 钻石×300', type: 'recharge' },
        { id: 's2', name: '30元月卡', price: 30, currency: 'cny', badge: '推荐', description: '每日领取300钻石，持续30天', type: 'monthly' },
        { id: 's3', name: '68元成长基金', price: 68, currency: 'cny', badge: '限时', description: '升级即领奖励，最高6800钻石', type: 'fund' },
        { id: 's4', name: '128元至尊礼包', price: 128, currency: 'cny', badge: 'SSR自选', description: 'SSR武将自选 + 资源大礼包', type: 'gift' },
        { id: 's6', name: '648元至尊通行证', price: 648, currency: 'cny', badge: '最超值', description: '解锁战令全部奖励 + 限定皮肤', type: 'battlepass' },
      ],
      banners: [
        { text: '新版本庆典·累充送SSR', sub: '活动时间：即日起至月底' },
        { text: '月卡限时特惠·双倍返还', sub: '首购即享超值奖励' },
        { text: '新手七日礼包·限时开放', sub: '每日登录领取钻石' },
      ],
    },
  })
}

// POST /api/game/shop/purchase - Purchase item
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { itemId } = body

    if (!itemId) {
      return NextResponse.json({ success: false, message: 'Missing itemId' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId: `ORD-${Date.now()}`,
        itemId,
        status: 'success',
        purchasedAt: new Date().toISOString(),
      },
      message: 'Purchase successful',
    })
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 })
  }
}
