import { NextResponse } from 'next/server'

// GET /api/game/tutorial - Get tutorial steps
export async function GET() {
  return NextResponse.json({
    success: true,
    data: {
      steps: [
        { id: 1, stepKey: 'welcome', title: '欢迎来到九州', speaker: '诸葛亮', description: '主公，欢迎来到九州大陆！', targetUiPath: '', skippable: false, order: 1 },
        { id: 2, stepKey: 'recruit_hero', title: '招募第一位武将', speaker: '诸葛亮', description: '点击招募按钮，招揽第一位武将', targetUiPath: 'nav-gacha', skippable: false, order: 2 },
        { id: 3, stepKey: 'first_battle', title: '首次战斗', speaker: '诸葛亮', description: '点击战斗按钮，进入第一场战斗！', targetUiPath: 'nav-battle', skippable: false, order: 3 },
        { id: 4, stepKey: 'upgrade_building', title: '升级建筑', speaker: '诸葛亮', description: '升级主城可解锁更多功能', targetUiPath: 'building-command_center', skippable: false, order: 4 },
        { id: 5, stepKey: 'join_guild', title: '加入联盟', speaker: '诸葛亮', description: '与盟友并肩作战', targetUiPath: 'btn-guild', skippable: true, order: 5 },
        { id: 6, stepKey: 'daily_sign', title: '每日签到', speaker: '诸葛亮', description: '每日签到可领取丰厚奖励', targetUiPath: '', skippable: true, order: 6 },
      ],
      progress: { completed: 0, currentStepId: 1, isAllCompleted: false },
    },
  })
}

// POST /api/game/tutorial/complete - Mark tutorial step as complete
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { stepId } = body

    if (!stepId) {
      return NextResponse.json({ success: false, message: 'Missing stepId' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: { stepId, completed: true },
      message: `Tutorial step ${stepId} completed`,
    })
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid request' }, { status: 400 })
  }
}
