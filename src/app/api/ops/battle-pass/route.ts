import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/ops/battle-pass — List battle passes with levels
// GET /api/ops/battle-pass?stats=true&passId=1 — Get pass stats
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const isStats = searchParams.get('stats') === 'true'
    const passId = Number(searchParams.get('passId'))

    if (isStats && passId) {
      // Return stats for a specific battle pass
      const pass = await db.battlePass.findUnique({
        where: { id: passId },
        select: {
          id: true,
          seasonKey: true,
          title: true,
          participants: true,
          premiumUsers: true,
        },
      })

      if (!pass) {
        return NextResponse.json({ success: false, message: '战令不存在' }, { status: 404 })
      }

      // Count actual player progress records
      const participantCount = await db.playerBattlePass.count({
        where: { passId },
      })
      const premiumCount = await db.playerBattlePass.count({
        where: { passId, isPremium: true },
      })

      // Level distribution
      const levelDistribution = await db.playerBattlePass.groupBy({
        by: ['currentLevel'],
        where: { passId },
        _count: { currentLevel: true },
        orderBy: { currentLevel: 'asc' },
      })

      return NextResponse.json({
        success: true,
        data: {
          pass,
          participantCount,
          premiumCount,
          levelDistribution,
        },
        message: '战令统计查询成功',
      })
    }

    // List all battle passes with levels
    const passes = await db.battlePass.findMany({
      include: {
        levels: {
          orderBy: { level: 'asc' },
        },
      },
      orderBy: { id: 'desc' },
    })

    return NextResponse.json({
      success: true,
      data: passes,
      message: `查询到 ${passes.length} 个战令`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '查询战令失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// POST /api/ops/battle-pass — Create battle pass (with levels array)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { levels, ...passData } = body

    const pass = await db.battlePass.create({
      data: {
        ...passData,
        levels: levels
          ? {
              create: levels.map((level: Record<string, unknown>) => ({
                level: level.level,
                requiredExp: level.requiredExp,
                freeRewards: typeof level.freeRewards === 'string' ? level.freeRewards : JSON.stringify(level.freeRewards ?? {}),
                premiumRewards: typeof level.premiumRewards === 'string' ? level.premiumRewards : JSON.stringify(level.premiumRewards ?? {}),
                title: level.title ?? '',
                iconType: level.iconType ?? 'chest',
              })),
            }
          : undefined,
      },
      include: { levels: { orderBy: { level: 'asc' } } },
    })

    return NextResponse.json({
      success: true,
      data: pass,
      message: '战令创建成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '创建战令失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// PUT /api/ops/battle-pass — Upgrade or update battle pass
// Body: { action: 'upgrade', passId, userId, exp }
//   - Add exp to player battle pass, auto-level-up, mark levels as claimed in sequence
// Body: { id, ...passFields } — Update pass fields directly
export async function PUT(req: Request) {
  try {
    const body = await req.json()

    // ── Upgrade action ──
    if (body.action === 'upgrade') {
      const { passId, userId, exp } = body as { passId: number; userId: number; exp: number }

      if (!passId || !userId || !exp || exp <= 0) {
        return NextResponse.json({ success: false, message: '参数无效：需要 passId, userId, exp' }, { status: 400 })
      }

      // Verify battle pass exists and get level thresholds
      const pass = await db.battlePass.findUnique({
        where: { id: passId },
        include: { levels: { orderBy: { level: 'asc' } } },
      })

      if (!pass || pass.status !== 1) {
        return NextResponse.json({ success: false, message: '战令不存在或未开放' }, { status: 404 })
      }

      // Upsert player battle pass progress
      let playerPass = await db.playerBattlePass.findUnique({
        where: { userId_passId: { userId, passId } },
      })

      if (!playerPass) {
        playerPass = await db.playerBattlePass.create({
          data: {
            userId,
            passId,
            isPremium: false,
            currentLevel: 0,
            currentExp: 0,
            totalExpGained: 0,
            claimedLevels: '[]',
          },
        })
      }

      // Add exp
      let newExp = playerPass.currentExp + exp
      let newLevel = playerPass.currentLevel
      let totalExp = playerPass.totalExpGained + exp

      // Auto level-up
      const levels = pass.levels
      const newlyUnlockedLevels: number[] = []

      for (const lvl of levels) {
        if (newLevel < lvl.level && newExp >= lvl.requiredExp) {
          newLevel = lvl.level
          newlyUnlockedLevels.push(lvl.level)
        }
      }

      // Remaining exp carries over (if above max level, cap it)
      const maxRequiredExp = levels.length > 0 ? levels[levels.length - 1].requiredExp : 0
      if (newLevel >= levels.length) {
        newExp = Math.min(newExp, maxRequiredExp)
      }

      // Update player progress
      const updatedPass = await db.playerBattlePass.update({
        where: { userId_passId: { userId, passId } },
        data: {
          currentExp: newExp,
          currentLevel: newLevel,
          totalExpGained: totalExp,
        },
      })

      // Mark newly unlocked levels as claimed (auto-claim)
      // We update claimedLevels to include the new levels in sequence
      let claimedLevels: number[] = JSON.parse(playerPass.claimedLevels)
      for (const lvl of newlyUnlockedLevels) {
        if (!claimedLevels.includes(lvl)) {
          claimedLevels.push(lvl)
        }
      }
      claimedLevels.sort((a, b) => a - b)

      await db.playerBattlePass.update({
        where: { userId_passId: { userId, passId } },
        data: {
          claimedLevels: JSON.stringify(claimedLevels),
        },
      })

      // Update pass participant count if new player
      if (playerPass.totalExpGained === 0) {
        await db.battlePass.update({
          where: { id: passId },
          data: { participants: { increment: 1 } },
        })
      }

      return NextResponse.json({
        success: true,
        data: {
          ...updatedPass,
          claimedLevels,
          levelsGained: newlyUnlockedLevels,
          newLevel,
          newExp,
        },
        message: `获得 ${exp} 经验，当前等级 ${newLevel}`,
      })
    }

    // ── Direct update (no action) ──
    const { id, ...updateData } = body
    if (!id) {
      return NextResponse.json({ success: false, message: '缺少战令ID' }, { status: 400 })
    }

    const pass = await db.battlePass.update({
      where: { id },
      data: updateData,
      include: { levels: { orderBy: { level: 'asc' } } },
    })

    return NextResponse.json({
      success: true,
      data: pass,
      message: '战令更新成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '更新战令失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
