import { NextResponse } from 'next/server'

// GET /api/game/gacha - Get gacha pools info
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      pools: [
        { id: 'p1', name: '天命·龙吟', type: 'limited', description: 'UP! SSR关羽 概率提升' },
        { id: 'p2', name: '群雄逐鹿', type: 'rateup', description: 'UP! SR赵云 概率提升' },
        { id: 'p3', name: '常驻招募', type: 'normal', description: '全武将常驻卡池' },
        { id: 'p4', name: '新手福利池', type: 'newbie', description: '前20抽必出SSR' },
      ],
      rates: { ssr: 1.5, sr: 7, r: 91.5 },
      pity: { ssrHard: 80, srSoft: 10 },
    },
  })
}

// POST /api/game/gacha/draw - Execute gacha draw
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { poolId, count = 1 } = body

    if (!poolId || ![1, 10].includes(count)) {
      return NextResponse.json({ success: false, message: 'Invalid parameters' }, { status: 400 })
    }

    const results = []
    let pityCounter = Math.floor(Math.random() * 50) + 10

    for (let i = 0; i < count; i++) {
      pityCounter++
      const rand = Math.random()
      let rarity: number

      if (pityCounter >= 80 || rand < 0.015) {
        rarity = 5
        pityCounter = 0
      } else if (rand < 0.085) {
        rarity = 4
      } else {
        rarity = 3
      }

      const heroes: Record<number, string[]> = {
        5: ['关羽', '诸葛亮', '吕布', '曹操', '司马懿'],
        4: ['赵云', '周瑜', '张飞', '华佗', '貂蝉'],
        3: ['黄忠', '大乔', '吕蒙', '典韦', '甘宁'],
      }

      const pool = heroes[rarity] || heroes[3]
      results.push({
        id: `g-${Date.now()}-${i}`,
        name: pool[Math.floor(Math.random() * pool.length)],
        rarity,
        isNew: Math.random() > 0.5,
      })
    }

    return NextResponse.json({
      success: true,
      data: { results, pityCounter, cost: count === 1 ? 150 : 1350 },
    })
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 })
  }
}
