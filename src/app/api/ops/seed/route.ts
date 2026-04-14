import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/ops/seed — Seed all operations data
export async function GET() {
  try {
    // ── Clean existing data (respect FK order) ──
    await db.playerBattlePass.deleteMany()
    await db.battlePassLevel.deleteMany()
    await db.battlePass.deleteMany()
    await db.limitedPool.deleteMany()
    await db.playerActivityProgress.deleteMany()
    await db.activityTask.deleteMany()
    await db.activity.deleteMany()
    await db.mailStats.deleteMany()
    await db.mail.deleteMany()

    // ── 2 BattlePass seasons × 10 levels each ──
    const bp1 = await db.battlePass.create({
      data: {
        seasonKey: 'S2025S1',
        title: '春日远征',
        description: '春季限定赛季，收集远征令牌解锁丰厚奖励',
        startTime: '2025-03-01 00:00:00',
        endTime: '2025-05-31 23:59:59',
        price: 0,
        premiumPrice: 1280,
        isPremium: false,
        status: 1,
        totalExp: 10000,
        participants: 12580,
        premiumUsers: 3420,
        levels: {
          create: Array.from({ length: 10 }, (_, i) => ({
            level: i + 1,
            requiredExp: (i + 1) * 1000,
            freeRewards: JSON.stringify({ gold: (i + 1) * 500, diamond: (i + 1) * 20 }),
            premiumRewards: JSON.stringify({ gold: (i + 1) * 1000, diamond: (i + 1) * 50, gacha_ticket: i < 5 ? 1 : 2 }),
            title: `春日·第${i + 1}阶`,
            iconType: i % 3 === 2 ? 'special' : 'chest',
          })),
        },
      },
      include: { levels: true },
    })

    const bp2 = await db.battlePass.create({
      data: {
        seasonKey: 'S2025S2',
        title: '夏日激战',
        description: '炎炎夏日，热血激战赛季开启',
        startTime: '2025-06-01 00:00:00',
        endTime: '2025-08-31 23:59:59',
        price: 0,
        premiumPrice: 1280,
        isPremium: true,
        status: 1,
        totalExp: 12000,
        participants: 8960,
        premiumUsers: 2100,
        levels: {
          create: Array.from({ length: 10 }, (_, i) => ({
            level: i + 1,
            requiredExp: (i + 1) * 1200,
            freeRewards: JSON.stringify({ gold: (i + 1) * 600, diamond: (i + 1) * 30 }),
            premiumRewards: JSON.stringify({ gold: (i + 1) * 1200, diamond: (i + 1) * 60, sr_fragment: i < 5 ? 5 : 10 }),
            title: `激战·第${i + 1}阶`,
            iconType: i % 3 === 2 ? 'special' : 'chest',
          })),
        },
      },
      include: { levels: true },
    })

    // ── 3 LimitedPools ──
    const lp1 = await db.limitedPool.create({
      data: {
        poolKey: 'limited_spring_2025',
        name: '春日限定UP池',
        type: 'limited',
        description: 'SSR武将·诸葛亮限定概率UP',
        bannerUrl: '/banners/spring_2025.png',
        startTime: '2025-03-01 00:00:00',
        endTime: '2025-03-31 23:59:59',
        ssrRate: 2.5,
        srRate: 8.5,
        rRate: 89.0,
        pityCount: 50,
        hardPityCount: 80,
        upHeroId: 1001,
        upRate: 1.0,
        totalDraws: 45230,
        todayDraws: 1230,
        status: 1,
        sort: 10,
      },
    })

    const lp2 = await db.limitedPool.create({
      data: {
        poolKey: 'faction_wei_2025',
        name: '魏国阵营池',
        type: 'faction',
        description: '魏国武将出现概率提升',
        bannerUrl: '/banners/wei_2025.png',
        startTime: '2025-04-01 00:00:00',
        endTime: '2025-04-30 23:59:59',
        ssrRate: 1.5,
        srRate: 10.0,
        rRate: 88.5,
        pityCount: 60,
        hardPityCount: 100,
        upHeroId: 0,
        upRate: 0,
        totalDraws: 28760,
        todayDraws: 860,
        status: 1,
        sort: 8,
      },
    })

    const lp3 = await db.limitedPool.create({
      data: {
        poolKey: 'mix_festival_2025',
        name: '节日混合池',
        type: 'mix',
        description: '全武将随机池，节日额外奖励',
        bannerUrl: '/banners/festival_2025.png',
        startTime: '2025-05-01 00:00:00',
        endTime: '2025-05-07 23:59:59',
        ssrRate: 3.0,
        srRate: 12.0,
        rRate: 85.0,
        pityCount: 40,
        hardPityCount: 70,
        upHeroId: 2001,
        upRate: 1.5,
        totalDraws: 67800,
        todayDraws: 3450,
        status: 0,
        sort: 15,
      },
    })

    // ── 1 Activity with 4 tasks ──
    const activity = await db.activity.create({
      data: {
        title: '春日签到活动',
        description: '连续签到7天领取丰厚奖励',
        type: 'gacha',
        status: 'active',
        startTime: '2025-03-01 00:00:00',
        endTime: '2025-03-31 23:59:59',
        rewards: JSON.stringify({ diamond: 500, gacha_ticket: 3 }),
        tasks: {
          create: [
            {
              sortOrder: 1,
              title: '每日签到',
              description: '每天登录游戏完成签到',
              taskType: 'login',
              targetType: 'login_day',
              targetCount: 7,
              rewards: JSON.stringify({ diamond: 200, gold: 3000 }),
              status: 1,
            },
            {
              sortOrder: 2,
              title: '完成3场战斗',
              description: '每日完成3场竞技场战斗',
              taskType: 'battle',
              targetType: 'battle_win',
              targetCount: 3,
              rewards: JSON.stringify({ diamond: 100, equip_scroll: 2 }),
              status: 1,
            },
            {
              sortOrder: 3,
              title: '抽卡1次',
              description: '在任意卡池进行1次抽卡',
              taskType: 'gacha',
              targetType: 'gacha_count',
              targetCount: 1,
              rewards: JSON.stringify({ diamond: 50, gacha_ticket: 1 }),
              status: 1,
            },
            {
              sortOrder: 4,
              title: '分享给好友',
              description: '将活动分享给1位好友',
              taskType: 'social',
              targetType: 'share_count',
              targetCount: 1,
              rewards: JSON.stringify({ diamond: 150, sr_fragment: 5 }),
              status: 1,
            },
          ],
        },
      },
      include: { tasks: true },
    })

    // ── 5 sample mails (2 reward, 2 system, 1 guild) ──
    const mail1 = await db.mail.create({
      data: {
        mailUid: 'mail_rwd_001',
        senderType: 'system',
        senderName: '系统奖励',
        receiverId: 10001,
        category: 'reward',
        title: '新手七日奖励',
        content: '恭喜主公完成七日登录，请查收您的奖励！',
        attachments: JSON.stringify([
          { type: 'diamond', id: 0, name: '钻石', count: 500 },
          { type: 'gacha_ticket', id: 0, name: '招募券', count: 3 },
        ]),
        isRead: false,
        isClaimed: false,
      },
    })

    const mail2 = await db.mail.create({
      data: {
        mailUid: 'mail_rwd_002',
        senderType: 'system',
        senderName: '系统奖励',
        receiverId: 10002,
        category: 'reward',
        title: '竞技场赛季结算奖励',
        content: '恭喜您在竞技场赛季中获得第3名，奖励已发放。',
        attachments: JSON.stringify([
          { type: 'diamond', id: 0, name: '钻石', count: 1000 },
          { type: 'gold', id: 0, name: '金币', count: 50000 },
          { type: 'sr_fragment', id: 0, name: 'SR碎片', count: 20 },
        ]),
        isRead: false,
        isClaimed: false,
      },
    })

    const mail3 = await db.mail.create({
      data: {
        mailUid: 'mail_sys_001',
        senderType: 'system',
        senderName: '系统公告',
        receiverId: 10001,
        category: 'system',
        title: '版本更新公告 v2.5.0',
        content: '亲爱的主公，v2.5.0版本已更新：新增魏国阵营卡池、优化战斗性能、修复已知BUG。',
        attachments: '[]',
        isRead: true,
        isClaimed: false,
      },
    })

    const mail4 = await db.mail.create({
      data: {
        mailUid: 'mail_sys_002',
        senderType: 'gm',
        senderId: 1,
        senderName: 'GM小助手',
        receiverId: 10001,
        category: 'system',
        title: '服务器维护通知',
        content: '服务器将于2025-06-15 02:00-06:00进行维护升级，届时将无法登录，请提前做好准备。',
        attachments: '[]',
        isRead: false,
        isClaimed: false,
      },
    })

    const mail5 = await db.mail.create({
      data: {
        mailUid: 'mail_gld_001',
        senderType: 'guild',
        senderId: 2001,
        senderName: '天下盟',
        receiverId: 10003,
        category: 'guild',
        title: '联盟战争动员令',
        content: '各位成员，本周六20:00联盟战争即将开始，请各位提前准备兵力和物资。联盟商店已补给完毕。',
        attachments: JSON.stringify([
          { type: 'food', id: 0, name: '粮草', count: 5000 },
        ]),
        isRead: false,
        isClaimed: false,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        battlePasses: 2,
        battlePassLevels: bp1.levels.length + bp2.levels.length,
        limitedPools: 3,
        activities: 1,
        activityTasks: activity.tasks.length,
        mails: 5,
        mailBreakdown: { reward: 2, system: 2, guild: 1 },
      },
      message: '运营系统种子数据创建完成',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '种子数据创建失败'
    return NextResponse.json({ success: false, message: msg }, { status: 500 })
  }
}
