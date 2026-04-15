import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/config — List game configs with optional group filter
// Supports ?group=gacha&status=1&configKey=xxx
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const group = searchParams.get('group')
    const status = searchParams.get('status')
    const configKey = searchParams.get('configKey')

    const where: Record<string, unknown> = {}
    if (group) where.group = group
    if (status !== null && status !== '') where.status = Number(status)
    if (configKey) where.configKey = configKey

    const configs = await db.gameConfig.findMany({
      where,
      orderBy: { group: 'asc' },
    })

    // Group configs by category
    const grouped: Record<string, typeof configs> = {}
    for (const c of configs) {
      const g = c.group || 'default'
      if (!grouped[g]) grouped[g] = []
      grouped[g].push(c)
    }

    return NextResponse.json({
      success: true,
      data: {
        list: configs,
        grouped,
      },
      message: `查询到 ${configs.length} 条配置`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '查询配置失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// POST /api/admin/config — Create a game config
// Body: { configKey, configValue, group, description, status? }
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Auto-seed: if table is empty, seed mock data
    const count = await db.gameConfig.count()
    if (count === 0) {
      const seedConfigs = [
        // Gacha configs
        { configKey: 'gacha_ssr_rate', configValue: '1.5', group: 'gacha', description: 'SSR基础概率(%)', status: 1 },
        { configKey: 'gacha_sr_rate', configValue: '8.5', group: 'gacha', description: 'SR基础概率(%)', status: 1 },
        { configKey: 'gacha_r_rate', configValue: '90.0', group: 'gacha', description: 'R基础概率(%)', status: 1 },
        { configKey: 'gacha_ssr_pity', configValue: '80', group: 'gacha', description: 'SSR硬保底抽数', status: 1 },
        { configKey: 'gacha_sr_pity', configValue: '10', group: 'gacha', description: 'SR软保底抽数', status: 1 },
        { configKey: 'gacha_single_cost', configValue: '150', group: 'gacha', description: '单抽钻石消耗', status: 1 },
        { configKey: 'gacha_ten_cost', configValue: '1350', group: 'gacha', description: '十连钻石消耗', status: 1 },
        { configKey: 'gacha_free_daily', configValue: '1', group: 'gacha', description: '每日免费抽卡次数', status: 1 },

        // Resource configs
        { configKey: 'stamina_max', configValue: '150', group: 'resource', description: '体力上限', status: 1 },
        { configKey: 'stamina_regen', configValue: '6', group: 'resource', description: '每6分钟恢复1点体力', status: 1 },
        { configKey: 'stamina_refill_cost', configValue: '50', group: 'resource', description: '体力丹价格(钻石)', status: 1 },
        { configKey: 'gold_max', configValue: '99999999', group: 'resource', description: '金币上限', status: 1 },
        { configKey: 'diamond_max', configValue: '999999', group: 'resource', description: '钻石上限', status: 1 },

        // Battle configs
        { configKey: 'battle_energy_cost', configValue: '5', group: 'battle', description: '每场战斗体力消耗', status: 1 },
        { configKey: 'battle_max_team', configValue: '6', group: 'battle', description: '最大上阵人数', status: 1 },
        { configKey: 'battle_speed_bonus', configValue: '1.0', group: 'battle', description: '战斗速度倍率', status: 1 },
        { configKey: 'pvp_season_duration', configValue: '30', group: 'battle', description: 'PVP赛季天数', status: 1 },

        // Guild configs
        { configKey: 'guild_create_level', configValue: '20', group: 'guild', description: '创建公会所需等级', status: 1 },
        { configKey: 'guild_create_cost', configValue: '500', group: 'guild', description: '创建公会消耗金币', status: 1 },
        { configKey: 'guild_max_members', configValue: '50', group: 'guild', description: '公会最大成员数', status: 1 },
        { configKey: 'guild_rename_cost', configValue: '1000', group: 'guild', description: '公会改名消耗钻石', status: 1 },
        { configKey: 'guild_donate_daily_limit', configValue: '10', group: 'guild', description: '每日捐献次数上限', status: 1 },

        // System configs
        { configKey: 'server_maintenance', configValue: 'false', group: 'system', description: '服务器维护开关', status: 1 },
        { configKey: 'newbie_gift_sent', configValue: 'true', group: 'system', description: '新手礼包是否已发送', status: 1 },
        { configKey: 'announce_content', configValue: '欢迎来到三国争霸！新版本已更新。', group: 'system', description: '全服公告内容', status: 1 },
        { configKey: 'announce_interval', configValue: '300', group: 'system', description: '公告轮播间隔(秒)', status: 1 },
        { configKey: 'version_code', configValue: '1.2.0', group: 'system', description: '当前客户端版本号', status: 1 },
        { configKey: 'force_update_version', configValue: '1.0.0', group: 'system', description: '强制更新最低版本', status: 1 },
      ]
      const seeded = await db.gameConfig.createMany({ data: seedConfigs })
      const all = await db.gameConfig.findMany({ orderBy: { group: 'asc' } })
      return NextResponse.json({
        success: true,
        data: { list: all, seeded: seeded.count },
        message: `配置表为空，已自动初始化 ${seeded.count} 条配置`,
      })
    }

    const { id, ...createData } = body
    const config = await db.gameConfig.create({
      data: createData,
    })

    return NextResponse.json({
      success: true,
      data: config,
      message: '配置创建成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '创建配置失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// PUT /api/admin/config — Update config value
// Body: { id, configValue?, description?, status?, ... }
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少配置ID' }, { status: 400 })
    }

    const config = await db.gameConfig.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: config,
      message: '配置更新成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '更新配置失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// DELETE /api/admin/config?id=1 — Delete config
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少配置ID' }, { status: 400 })
    }

    await db.gameConfig.delete({ where: { id } })

    return NextResponse.json({
      success: true,
      message: '配置已删除',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '删除配置失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
