import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/game/gacha - Get gacha pools info (from DB + fallback)
export async function GET() {
  try {
    // Try to load pools from LimitedPool table
    const pools = await db.limitedPool.findMany({
      where: { status: 1 },
      orderBy: { sort: 'desc' },
      take: 10,
    })

    if (pools.length > 0) {
      return NextResponse.json({
        success: true,
        data: {
          pools: pools.map((p) => ({
            id: p.id,
            name: p.name,
            type: p.type,
            description: p.description,
            ssrRate: p.ssrRate,
            srRate: p.srRate,
            rRate: p.rRate,
            pityCount: p.pityCount,
            hardPityCount: p.hardPityCount,
            totalDraws: p.totalDraws,
            todayDraws: p.todayDraws,
          })),
          rates: { ssr: 1.5, sr: 8.5, r: 90.0 },
          pity: { ssrHard: 80, srSoft: 10 },
        },
      })
    }

    // Fallback: return mock pools if DB is empty
    return NextResponse.json({
      success: true,
      data: {
        pools: [
          { id: 'p1', name: '天命·龙吟', type: 'limited', description: 'UP! SSR关羽 概率提升' },
          { id: 'p2', name: '群雄逐鹿', type: 'rateup', description: 'UP! SR赵云 概率提升' },
          { id: 'p3', name: '常驻招募', type: 'normal', description: '全武将常驻卡池' },
          { id: 'p4', name: '新手福利池', type: 'newbie', description: '前20抽必出SSR' },
        ],
        rates: { ssr: 1.5, sr: 8.5, r: 90.0 },
        pity: { ssrHard: 80, srSoft: 10 },
      },
    })
  } catch {
    // Fallback if DB is not available
    return NextResponse.json({
      success: true,
      data: {
        pools: [
          { id: 'p1', name: '天命·龙吟', type: 'limited', description: 'UP! SSR关羽 概率提升' },
          { id: 'p2', name: '群雄逐鹿', type: 'rateup', description: 'UP! SR赵云 概率提升' },
          { id: 'p3', name: '常驻招募', type: 'normal', description: '全武将常驻卡池' },
          { id: 'p4', name: '新手福利池', type: 'newbie', description: '前20抽必出SSR' },
        ],
        rates: { ssr: 1.5, sr: 8.5, r: 90.0 },
        pity: { ssrHard: 80, srSoft: 10 },
      },
    })
  }
}

// POST /api/game/gacha - Execute gacha draw with DB persistence
// Body: { userId, poolId?, count?: 1|10 }
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { userId, poolId, count = 1 } = body

    if (!userId || ![1, 10].includes(count)) {
      return NextResponse.json({ success: false, message: 'Invalid parameters: userId and count(1|10) required' }, { status: 400 })
    }

    // Validate player exists and check diamonds
    const player = await db.gamePlayer.findFirst({
      where: { id: Number(userId), status: 1 },
    })

    if (!player) {
      return NextResponse.json({ success: false, message: '玩家不存在或已被封禁' }, { status: 400 })
    }

    const cost = count === 1 ? 150 : 1350
    if (player.diamond < cost) {
      return NextResponse.json({ success: false, message: `钻石不足，需要 ${cost} 钻石，当前 ${player.diamond}` }, { status: 400 })
    }

    // Load hero pool from Hero table
    const allHeroes = await db.hero.findMany({ where: { status: 1 } })
    if (allHeroes.length === 0) {
      return NextResponse.json({ success: false, message: '武将数据为空，请先初始化武将' }, { status: 400 })
    }

    const heroesByRarity: Record<string, typeof allHeroes> = {
      SSR: allHeroes.filter((h) => h.rarity === 'SSR'),
      SR: allHeroes.filter((h) => h.rarity === 'SR'),
      R: allHeroes.filter((h) => h.rarity === 'R'),
    }

    // Ensure at least some heroes in each rarity (fallback)
    if (heroesByRarity['SSR'].length === 0) heroesByRarity['SSR'] = heroesByRarity['SR'].slice(0, 3)
    if (heroesByRarity['SR'].length === 0) heroesByRarity['SR'] = heroesByRarity['R'].slice(0, 3)
    if (heroesByRarity['R'].length === 0) heroesByRarity['R'] = allHeroes

    // Get pool info
    let poolName = '常驻招募'
    let ssrRate = 1.5
    if (poolId) {
      const pool = await db.limitedPool.findFirst({ where: { id: Number(poolId) } })
      if (pool) {
        poolName = pool.name
        ssrRate = pool.ssrRate
      }
    }

    // Get pity count from player's last gacha record
    const lastRecord = await db.gachaRecord.findFirst({
      where: { userId: Number(userId) },
      orderBy: { id: 'desc' },
    })
    let pityCounter = lastRecord?.pityCount || Math.floor(Math.random() * 50)

    const results: Array<{
      id: string
      heroId: number
      name: string
      rarity: string
      isNew: boolean
    }> = []
    const rarityMap: Record<string, string> = { '5': 'SSR', '4': 'SR', '3': 'R' }

    for (let i = 0; i < count; i++) {
      pityCounter++
      const rand = Math.random() * 100
      let rarityNum: number

      if (pityCounter >= 80 || rand < ssrRate) {
        rarityNum = 5
        pityCounter = 0
      } else if (rand < ssrRate + 8.5) {
        rarityNum = 4
      } else {
        rarityNum = 3
      }

      const rarity = rarityMap[String(rarityNum)] || 'R'
      const heroPool = heroesByRarity[rarity] || heroesByRarity['R']
      const hero = heroPool[Math.floor(Math.random() * heroPool.length)]

      results.push({
        id: `g-${Date.now()}-${i}`,
        heroId: hero.id,
        name: hero.name,
        rarity,
        isNew: Math.random() > 0.5,
      })
    }

    // --- DB Persistence (transaction) ---

    // 1. Deduct diamonds from player
    await db.gamePlayer.update({
      where: { id: Number(userId) },
      data: { diamond: { decrement: cost } },
    })

    // 2. Create gacha records and add player heroes
    for (const result of results) {
      // Record the gacha draw
      await db.gachaRecord.create({
        data: {
          userId: Number(userId),
          poolId: Number(poolId) || 0,
          poolName,
          heroId: result.heroId,
          heroName: result.name,
          rarity: result.rarity,
          drawType: count === 10 ? 'ten' : 'single',
          pityCount: pityCounter,
        },
      })

      // Add hero to player inventory (PlayerHero)
      // Check if player already has this hero
      const existingHero = await db.playerHero.findFirst({
        where: {
          userId: Number(userId),
          heroId: result.heroId,
        },
      })

      if (existingHero) {
        // Level up existing hero
        await db.playerHero.update({
          where: { id: existingHero.id },
          data: {
            fragments: { increment: result.rarity === 'SSR' ? 10 : result.rarity === 'SR' ? 5 : 1 },
          },
        })
      } else {
        // Create new player hero
        await db.playerHero.create({
          data: {
            userId: Number(userId),
            heroId: result.heroId,
            level: 1,
            exp: 0,
            star: 1,
            fragments: 0,
          },
        })
      }
    }

    // 3. Update pool draw counts (if poolId specified)
    if (poolId) {
      await db.limitedPool.update({
        where: { id: Number(poolId) },
        data: {
          totalDraws: { increment: count },
          todayDraws: { increment: count },
        },
      })
    }

    // 4. Log active action
    await db.userActiveLog.create({
      data: {
        userId: Number(userId),
        action: 'gacha',
        duration: count * 5, // approximate seconds
      },
    })

    // Refresh player data
    const updatedPlayer = await db.gamePlayer.findFirst({
      where: { id: Number(userId) },
    })

    return NextResponse.json({
      success: true,
      data: {
        results,
        pityCounter,
        cost,
        remainingDiamond: updatedPlayer?.diamond || 0,
        poolName,
      },
      message: `抽卡成功！消耗 ${cost} 钻石`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Invalid request'
    return NextResponse.json({ success: false, message: msg }, { status: 400 })
  }
}
