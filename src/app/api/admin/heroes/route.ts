import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/admin/heroes — List heroes with pagination & filters
// Supports ?page=1&pageSize=20&rarity=SSR&faction=魏&type=tank&status=1
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const rarity = searchParams.get('rarity')
    const faction = searchParams.get('faction')
    const heroType = searchParams.get('type')
    const status = searchParams.get('status')

    const where: Record<string, unknown> = {}
    if (rarity) where.rarity = rarity
    if (faction) where.faction = faction
    if (heroType) where.type = heroType
    if (status !== null && status !== '') where.status = Number(status)

    const [heroes, total] = await Promise.all([
      db.hero.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sortOrder: 'asc' },
      }),
      db.hero.count({ where }),
    ])

    return NextResponse.json({
      success: true,
      data: {
        list: heroes,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      },
      message: `查询到 ${total} 个武将`,
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '查询武将失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// POST /api/admin/heroes — Create a hero
// Body: { name, title, rarity, faction, type, baseHp, baseAtk, baseDef, ... }
export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Auto-seed: if table is empty, seed mock data
    const count = await db.hero.count()
    if (count === 0) {
      const seedData = [
        { name: '关羽', title: '武圣', rarity: 'SSR', faction: '蜀', type: 'warrior', baseHp: 8500, baseAtk: 920, baseDef: 680, skill1: '青龙偃月斩', skill2: '忠义护盾', ultimate: '武圣降临', description: '义薄云天，武勇冠绝三军', avatar: 'hero_guanyu', status: 1, sortOrder: 1 },
        { name: '诸葛亮', title: '卧龙', rarity: 'SSR', faction: '蜀', type: 'mage', baseHp: 6200, baseAtk: 1050, baseDef: 520, skill1: '东风破', skill2: '八卦阵', ultimate: '卧龙出山', description: '未出茅庐已知三分天下', avatar: 'hero_zhugeliang', status: 1, sortOrder: 2 },
        { name: '吕布', title: '飞将', rarity: 'SSR', faction: '群', type: 'assassin', baseHp: 7800, baseAtk: 1100, baseDef: 480, skill1: '方天画戟', skill2: '无双乱舞', ultimate: '天下无双', description: '人中吕布，马中赤兔', avatar: 'hero_lvbu', status: 1, sortOrder: 3 },
        { name: '曹操', title: '乱世奸雄', rarity: 'SSR', faction: '魏', type: 'mage', baseHp: 7200, baseAtk: 980, baseDef: 600, skill1: '倚天剑诀', skill2: '魏武挥鞭', ultimate: '天下归心', description: '治世之能臣，乱世之奸雄', avatar: 'hero_caocao', status: 1, sortOrder: 4 },
        { name: '司马懿', title: '冢虎', rarity: 'SSR', faction: '魏', type: 'mage', baseHp: 6500, baseAtk: 1020, baseDef: 560, skill1: '鹰视狼顾', skill2: '隐忍', ultimate: '司马昭之心', description: '隐忍数十年，终成大事', avatar: 'hero_simayi', status: 1, sortOrder: 5 },
        { name: '赵云', title: '常山赵子龙', rarity: 'SR', faction: '蜀', type: 'warrior', baseHp: 7200, baseAtk: 780, baseDef: 620, skill1: '龙胆', skill2: '七进七出', ultimate: '银龙破阵', description: '一身是胆，长坂坡单骑救主', avatar: 'hero_zhaoyun', status: 1, sortOrder: 6 },
        { name: '周瑜', title: '美周郎', rarity: 'SR', faction: '吴', type: 'mage', baseHp: 5800, baseAtk: 860, baseDef: 480, skill1: '火攻', skill2: '琴音乱心', ultimate: '赤壁烈焰', description: '谈笑间，樯橹灰飞烟灭', avatar: 'hero_zhouyu', status: 1, sortOrder: 7 },
        { name: '张飞', title: '万人敌', rarity: 'SR', faction: '蜀', type: 'tank', baseHp: 9500, baseAtk: 680, baseDef: 850, skill1: '怒吼', skill2: '据水断桥', ultimate: '燕人张翼德', description: '一声怒吼退百万曹兵', avatar: 'hero_zhangfei', status: 1, sortOrder: 8 },
        { name: '华佗', title: '神医', rarity: 'SR', faction: '群', type: 'support', baseHp: 5500, baseAtk: 520, baseDef: 600, skill1: '青囊书', skill2: '麻沸散', ultimate: '妙手回春', description: '悬壶济世，起死回生', avatar: 'hero_huatuo', status: 1, sortOrder: 9 },
        { name: '貂蝉', title: '倾国倾城', rarity: 'SR', faction: '群', type: 'support', baseHp: 4800, baseAtk: 620, baseDef: 420, skill1: '闭月', skill2: '离间计', ultimate: '凤仪亭', description: '连环计策，颠覆董卓', avatar: 'hero_diaochan', status: 1, sortOrder: 10 },
        { name: '黄忠', title: '老当益壮', rarity: 'R', faction: '蜀', type: 'warrior', baseHp: 6000, baseAtk: 650, baseDef: 500, skill1: '百步穿杨', skill2: '老骥伏枥', ultimate: '定军山', description: '宝刀未老，箭无虚发', avatar: 'hero_huangzhong', status: 1, sortOrder: 11 },
        { name: '大乔', title: '国色天香', rarity: 'R', faction: '吴', type: 'support', baseHp: 4500, baseAtk: 480, baseDef: 380, skill1: '流风回雪', skill2: '天香', ultimate: '江东双乔', description: '铜雀春深锁二乔', avatar: 'hero_daqiao', status: 1, sortOrder: 12 },
        { name: '吕蒙', title: '白衣渡江', rarity: 'R', faction: '吴', type: 'assassin', baseHp: 5200, baseAtk: 600, baseDef: 450, skill1: '奇袭', skill2: '白衣渡江', ultimate: '士别三日', description: '吴下阿蒙，刮目相看', avatar: 'hero_lvmeng', status: 1, sortOrder: 13 },
        { name: '典韦', title: '古之恶来', rarity: 'R', faction: '魏', type: 'tank', baseHp: 8800, baseAtk: 580, baseDef: 780, skill1: '双戟', skill2: '死战', ultimate: '恶来咆哮', description: '古之恶来，舍命护主', avatar: 'hero_dianwei', status: 1, sortOrder: 14 },
        { name: '甘宁', title: '锦帆贼', rarity: 'R', faction: '吴', type: 'assassin', baseHp: 5400, baseAtk: 620, baseDef: 430, skill1: '百铃', skill2: '夜袭', ultimate: '锦帆渡江', description: '百铃鸣响，夜袭曹营', avatar: 'hero_ganning', status: 1, sortOrder: 15 },
      ]
      const seeded = await db.hero.createMany({ data: seedData })
      const all = await db.hero.findMany({ orderBy: { sortOrder: 'asc' } })
      return NextResponse.json({
        success: true,
        data: { list: all, seeded: seeded.count },
        message: `武将表为空，已自动初始化 ${seeded.count} 条种子数据`,
      })
    }

    const { id, ...createData } = body
    const hero = await db.hero.create({
      data: createData,
    })

    return NextResponse.json({
      success: true,
      data: hero,
      message: '武将创建成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '创建武将失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// PUT /api/admin/heroes — Update hero
// Body: { id, name?, rarity?, baseHp?, baseAtk?, status?, ... }
export async function PUT(req: Request) {
  try {
    const body = await req.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少武将ID' }, { status: 400 })
    }

    const hero = await db.hero.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({
      success: true,
      data: hero,
      message: '武将更新成功',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '更新武将失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}

// DELETE /api/admin/heroes?id=1 — Disable hero (set status=0)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const id = Number(searchParams.get('id'))

    if (!id) {
      return NextResponse.json({ success: false, message: '缺少武将ID' }, { status: 400 })
    }

    const hero = await db.hero.update({
      where: { id },
      data: { status: 0 },
    })

    return NextResponse.json({
      success: true,
      data: hero,
      message: '武将已禁用(status=0)',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '禁用武将失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
