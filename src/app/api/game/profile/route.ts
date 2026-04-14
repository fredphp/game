import { NextResponse } from 'next/server'

// GET /api/game/profile - Get player profile (mock for demo)
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      id: 10001,
      name: '九州·曹操',
      level: 32,
      vipLevel: 5,
      gold: 1_258_000,
      diamonds: 3680,
      stamina: 86,
      maxStamina: 120,
      prestige: 12850,
      power: 85600,
      serverId: 's1',
      serverName: '九州1区',
      lastLoginAt: new Date().toISOString(),
    },
  })
}

// POST /api/game/profile/resource - Update resources
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, amount } = body

    if (!type || typeof amount !== 'number') {
      return NextResponse.json({ success: false, message: 'Invalid parameters' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: { type, newAmount: amount },
      message: `Resource ${type} updated`,
    })
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 })
  }
}
