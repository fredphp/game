import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/quest/seed — 种子数据
export async function POST() {
  try {
    // 清空旧数据
    await db.coreFlowDailyStats.deleteMany()
    await db.playerQuestProgress.deleteMany()
    await db.achievement.deleteMany()
    await db.activityMilestone.deleteMany()
    await db.dailyTask.deleteMany()
    await db.quest.deleteMany()
    await db.chapter.deleteMany()
    await db.tutorialStep.deleteMany()

    // ── 新手引导 ──
    await db.tutorialStep.createMany({
      data: [
        { stepOrder: 1, stepKey: 'welcome', title: '欢迎来到九州', triggerType: 'level', isRequired: true, status: 1, dialogues: '[{"npc":"诸葛亮","text":"主公，欢迎来到九州乱世！","position":"left"}]', rewards: '{"gold":1000,"diamond":100}', uiTarget: 'main_city', description: '新手初始引导' },
        { stepOrder: 2, stepKey: 'recruit_hero', title: '招募第一位武将', triggerType: 'level', isRequired: true, status: 1, dialogues: '[{"npc":"诸葛亮","text":"主公需要招募武将才能征战天下","position":"left"}]', rewards: '{"gacha_ticket":1,"gold":500}', uiTarget: 'gacha_panel', description: '引导使用新手池' },
        { stepOrder: 3, stepKey: 'first_battle', title: '初次战斗', triggerType: 'battle', isRequired: true, status: 1, dialogues: '[{"npc":"诸葛亮","text":"让武将去体验第一次战斗吧","position":"left"}]', rewards: '{"exp":200,"gold":300}', uiTarget: 'battle_button', description: '引导完成关卡1-1' },
        { stepOrder: 4, stepKey: 'upgrade_building', title: '升级主城', triggerType: 'building', isRequired: true, status: 1, dialogues: '[{"npc":"诸葛亮","text":"主城升级可以解锁更多功能","position":"left"}]', rewards: '{"gold":2000,"building_material":10}', uiTarget: 'main_building', description: '引导升级主城至2级' },
        { stepOrder: 5, stepKey: 'join_guild', title: '加入联盟', triggerType: 'social', isRequired: false, status: 1, dialogues: '[{"npc":"诸葛亮","text":"联盟的力量不容小觑","position":"left"}]', rewards: '{"gold":500,"diamond":50}', uiTarget: 'guild_button', description: '引导加入联盟' },
        { stepOrder: 6, stepKey: 'first_10_pull', title: '十连召唤', triggerType: 'gacha', isRequired: false, status: 0, dialogues: '[{"npc":"诸葛亮","text":"十连召唤必出SR武将","position":"left"}]', rewards: '{"gacha_ticket":1}', uiTarget: 'gacha_10_pull', description: '引导十连抽卡' },
        { stepOrder: 7, stepKey: 'equip_hero', title: '装备武将', triggerType: 'quest', isRequired: true, status: 1, dialogues: '[{"npc":"诸葛亮","text":"为武将装备可以提升战力","position":"left"}]', rewards: '{"equip_scroll":3,"gold":500}', uiTarget: 'hero_detail', description: '引导为武将装备' },
        { stepOrder: 8, stepKey: 'daily_sign', title: '每日签到', triggerType: 'quest', isRequired: false, status: 1, dialogues: '[{"npc":"系统","text":"记得每天签到领取奖励哦","position":"center"}]', rewards: '{"diamond":20}', uiTarget: 'sign_button', description: '引导完成每日签到' },
      ],
    })

    // ── 主线章节 ──
    const ch1 = await db.chapter.create({ data: { chapterOrder: 1, title: '黄巾之乱', unlockLevel: 1, description: '黄巾起义席卷天下，各方诸侯纷纷起兵', status: 1 } })
    const ch2 = await db.chapter.create({ data: { chapterOrder: 2, title: '董卓乱政', unlockLevel: 10, description: '董卓祸乱朝纲，群雄讨伐', status: 1 } })
    const ch3 = await db.chapter.create({ data: { chapterOrder: 3, title: '群雄割据', unlockLevel: 20, description: '天下诸侯各据一方，逐鹿中原', status: 1 } })
    const ch4 = await db.chapter.create({ data: { chapterOrder: 4, title: '官渡之战', unlockLevel: 30, description: '曹操与袁绍的终极对决', status: 1 } })
    const ch5 = await db.chapter.create({ data: { chapterOrder: 5, title: '赤壁之战', unlockLevel: 40, description: '三分天下的决定性战役', status: 1 } })
    const ch6 = await db.chapter.create({ data: { chapterOrder: 6, title: '三国鼎立', unlockLevel: 50, description: '天下三分，最终争霸', status: 1 } })

    await db.quest.createMany({
      data: [
        { chapterId: ch1.id, questOrder: 1, title: '初出茅庐', questType: 'story', targetType: 'battle_win', targetCount: 1, energyCost: 5, rewards: '{"exp":100,"gold":200}', description: '完成第一场战斗', status: 1 },
        { chapterId: ch1.id, questOrder: 2, title: '讨伐黄巾', questType: 'battle', targetType: 'kill_enemy', targetCount: 50, energyCost: 8, rewards: '{"exp":200,"gold":500,"equip_scroll":1}', description: '击败50个黄巾军', status: 1 },
        { chapterId: ch1.id, questOrder: 3, title: '收集粮草', questType: 'collect', targetType: 'resource_food', targetCount: 100, energyCost: 0, rewards: '{"gold":300,"diamond":20}', description: '收集100单位粮草', status: 1 },
        { chapterId: ch2.id, questOrder: 1, title: '虎牢关之战', questType: 'battle', targetType: 'stage_clear', targetCount: 1, energyCost: 10, rewards: '{"exp":500,"gold":1000,"sr_fragment":5}', description: '通过虎牢关关卡', status: 1 },
        { chapterId: ch2.id, questOrder: 2, title: '联军建设', questType: 'explore', targetType: 'building_level', targetCount: 5, energyCost: 0, rewards: '{"gold":800,"diamond":50}', description: '将5个建筑升至2级', status: 1 },
        { chapterId: ch2.id, questOrder: 3, title: '火烧洛阳', questType: 'story', targetType: 'battle_win', targetCount: 3, energyCost: 12, rewards: '{"exp":600,"gold":1200}', description: '赢得3场洛阳战役', status: 1 },
        { chapterId: ch2.id, questOrder: 4, title: '护送百姓', questType: 'escort', targetType: 'escort_success', targetCount: 2, energyCost: 8, rewards: '{"gold":600,"food":200}', description: '成功护送百姓2次', status: 1 },
        { chapterId: ch3.id, questOrder: 1, title: '攻城略地', questType: 'battle', targetType: 'city_capture', targetCount: 1, energyCost: 15, rewards: '{"exp":800,"gold":2000,"diamond":100}', description: '攻占第一座城池', status: 1 },
        { chapterId: ch3.id, questOrder: 2, title: '招贤纳士', questType: 'collect', targetType: 'hero_recruit', targetCount: 10, energyCost: 0, rewards: '{"gacha_ticket":2,"diamond":80}', description: '招募10名武将', status: 1 },
        { chapterId: ch3.id, questOrder: 3, title: '防守城池', questType: 'defend', targetType: 'defend_success', targetCount: 3, energyCost: 10, rewards: '{"gold":1500,"equip_scroll":3}', description: '成功防守城池3次', status: 1 },
        { chapterId: ch4.id, questOrder: 1, title: '白马之围', questType: 'battle', targetType: 'battle_win', targetCount: 5, energyCost: 15, rewards: '{"exp":1200,"gold":3000,"diamond":150}', description: '赢得5场白马之战', status: 1 },
        { chapterId: ch4.id, questOrder: 2, title: '乌巢劫粮', questType: 'escort', targetType: 'escort_success', targetCount: 3, energyCost: 12, rewards: '{"exp":1000,"food":500}', description: '劫粮成功3次', status: 1 },
        { chapterId: ch5.id, questOrder: 1, title: '草船借箭', questType: 'explore', targetType: 'collect_item', targetCount: 20, energyCost: 0, rewards: '{"exp":1500,"gold":5000}', description: '收集20支火箭', status: 1 },
        { chapterId: ch5.id, questOrder: 2, title: '火烧赤壁', questType: 'battle', targetType: 'stage_clear', targetCount: 1, energyCost: 20, rewards: '{"exp":2000,"gold":8000,"diamond":300,"ssr_fragment":10}', description: '通过赤壁终极关卡', status: 1 },
        { chapterId: ch6.id, questOrder: 1, title: '三分天下', questType: 'story', targetType: 'city_capture', targetCount: 10, energyCost: 0, rewards: '{"exp":3000,"gold":15000,"diamond":500}', description: '攻占10座城池', status: 1 },
        { chapterId: ch6.id, questOrder: 2, title: '天下一统', questType: 'battle', targetType: 'battle_win', targetCount: 100, energyCost: 25, rewards: '{"exp":5000,"gold":50000,"diamond":1000,"ssr_select":1}', description: '赢得100场战斗，一统天下', status: 1 },
      ],
    })

    // ── 日常任务 ──
    await db.dailyTask.createMany({
      data: [
        { taskKey: 'daily_login', title: '每日登录', taskType: 'growth', targetCount: 1, refreshType: 'daily', activityPoints: 10, sortOrder: 1, status: 1 },
        { taskKey: 'daily_battle_3', title: '完成3场战斗', taskType: 'battle', targetCount: 3, refreshType: 'daily', activityPoints: 20, sortOrder: 2, status: 1 },
        { taskKey: 'daily_battle_10', title: '完成10场战斗', taskType: 'battle', targetCount: 10, refreshType: 'daily', activityPoints: 40, sortOrder: 3, status: 1 },
        { taskKey: 'daily_gacha_1', title: '进行1次抽卡', taskType: 'gacha', targetCount: 1, refreshType: 'daily', activityPoints: 15, sortOrder: 4, status: 1 },
        { taskKey: 'daily_gacha_10', title: '进行1次十连抽', taskType: 'gacha', targetCount: 1, refreshType: 'daily', activityPoints: 30, sortOrder: 5, status: 1 },
        { taskKey: 'daily_guild_donate', title: '联盟捐献', taskType: 'guild', targetCount: 1, refreshType: 'daily', activityPoints: 15, sortOrder: 6, status: 1 },
        { taskKey: 'daily_social_chat', title: '世界频道发言', taskType: 'social', targetCount: 1, refreshType: 'daily', activityPoints: 5, sortOrder: 7, status: 1 },
        { taskKey: 'daily_resource_collect', title: '采集资源', taskType: 'resource', targetCount: 5, refreshType: 'daily', activityPoints: 20, sortOrder: 8, status: 1 },
        { taskKey: 'daily_hero_upgrade', title: '升级武将', taskType: 'growth', targetCount: 3, refreshType: 'daily', activityPoints: 20, sortOrder: 9, status: 1 },
        { taskKey: 'daily_sign_in', title: '每日签到', taskType: 'growth', targetCount: 1, refreshType: 'daily', activityPoints: 10, sortOrder: 10, status: 1 },
        { taskKey: 'weekly_arena_10', title: '竞技场挑战10次', taskType: 'battle', targetCount: 10, refreshType: 'weekly', activityPoints: 50, sortOrder: 11, status: 1 },
        { taskKey: 'weekly_guild_war', title: '参加联盟战争', taskType: 'guild', targetCount: 1, refreshType: 'weekly', activityPoints: 40, sortOrder: 12, status: 1 },
        { taskKey: 'weekly_world_boss', title: '参与世界BOSS', taskType: 'battle', targetCount: 3, refreshType: 'weekly', activityPoints: 30, sortOrder: 13, status: 1 },
      ],
    })

    // ── 活跃度里程碑 ──
    await db.activityMilestone.createMany({
      data: [
        { requiredPoints: 30, rewards: '{"gold":1000,"diamond":50}', title: '铜牌奖励', sortOrder: 1 },
        { requiredPoints: 60, rewards: '{"gold":2000,"diamond":100,"gacha_ticket":1}', title: '银牌奖励', sortOrder: 2 },
        { requiredPoints: 100, rewards: '{"gold":5000,"diamond":200,"sr_fragment":10}', title: '金牌奖励', sortOrder: 3 },
        { requiredPoints: 150, rewards: '{"gold":8000,"diamond":300,"equip_scroll":5}', title: '钻石奖励', sortOrder: 4 },
        { requiredPoints: 200, rewards: '{"gold":10000,"diamond":500,"ssr_fragment":5}', title: '大师奖励', sortOrder: 5 },
      ],
    })

    // ── 成就 ──
    await db.achievement.createMany({
      data: [
        { title: '初出茅庐', description: '完成第1场战斗', category: 'battle', conditionType: 'battle_count', conditionParams: '{"count":1}', rewardPoints: 10, isHidden: false, sortOrder: 1, status: 1 },
        { title: '百战百胜', description: '赢得100场战斗', category: 'battle', conditionType: 'battle_win_count', conditionParams: '{"count":100}', rewardPoints: 50, isHidden: false, sortOrder: 2, status: 1 },
        { title: '千军万马', description: '赢得1000场战斗', category: 'battle', conditionType: 'battle_win_count', conditionParams: '{"count":1000}', rewardPoints: 200, isHidden: false, sortOrder: 3, status: 1 },
        { title: '天下无敌', description: '竞技场排名第一', category: 'battle', conditionType: 'arena_rank', conditionParams: '{"rank":1}', rewardPoints: 500, isHidden: true, sortOrder: 4, status: 1 },
        { title: '攻城英雄', description: '攻占50座城池', category: 'battle', conditionType: 'city_capture', conditionParams: '{"count":50}', rewardPoints: 150, isHidden: false, sortOrder: 5, status: 1 },
        { title: '初识天下', description: '招募第1位武将', category: 'collection', conditionType: 'hero_count', conditionParams: '{"count":1}', rewardPoints: 10, isHidden: false, sortOrder: 6, status: 1 },
        { title: '人才济济', description: '招募50位武将', category: 'collection', conditionType: 'hero_count', conditionParams: '{"count":50}', rewardPoints: 80, isHidden: false, sortOrder: 7, status: 1 },
        { title: 'SSR收藏家', description: '收集10位SSR武将', category: 'collection', conditionType: 'ssr_count', conditionParams: '{"count":10}', rewardPoints: 200, isHidden: false, sortOrder: 8, status: 1 },
        { title: '集齐全卡', description: '收集所有武将', category: 'collection', conditionType: 'hero_collect_all', conditionParams: '{}', rewardPoints: 1000, isHidden: true, sortOrder: 9, status: 1 },
        { title: '广结良缘', description: '添加10位好友', category: 'social', conditionType: 'friend_count', conditionParams: '{"count":10}', rewardPoints: 20, isHidden: false, sortOrder: 10, status: 1 },
        { title: '义薄云天', description: '赠送好友100次体力', category: 'social', conditionType: 'gift_stamina', conditionParams: '{"count":100}', rewardPoints: 30, isHidden: false, sortOrder: 11, status: 1 },
        { title: '城池兴旺', description: '主城达到30级', category: 'development', conditionType: 'building_level', conditionParams: '{"building":"main_city","level":30}', rewardPoints: 100, isHidden: false, sortOrder: 12, status: 1 },
        { title: '富甲一方', description: '累计获得100万金币', category: 'development', conditionType: 'total_gold', conditionParams: '{"count":1000000}', rewardPoints: 80, isHidden: false, sortOrder: 13, status: 1 },
        { title: '天下共主', description: '主城达到满级50级', category: 'development', conditionType: 'building_level', conditionParams: '{"building":"main_city","level":50}', rewardPoints: 500, isHidden: true, sortOrder: 14, status: 1 },
        { title: '联盟之星', description: '联盟排名第一', category: 'guild', conditionType: 'guild_rank', conditionParams: '{"rank":1}', rewardPoints: 500, isHidden: true, sortOrder: 15, status: 1 },
        { title: '攻城拔寨', description: '攻占10座城池', category: 'guild', conditionType: 'city_capture', conditionParams: '{"count":10}', rewardPoints: 150, isHidden: false, sortOrder: 16, status: 1 },
      ],
    })

    // ── 核心流程日统计 (14天) ──
    const statsData = Array.from({ length: 14 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (13 - i))
      const dateStr = d.toISOString().slice(0, 10)
      const newUsers = Math.floor(800 + Math.random() * 800)
      const tStart = Math.floor(newUsers * (0.95 + Math.random() * 0.05))
      const tComp = Math.floor(tStart * (0.7 + Math.random() * 0.2))
      return {
        date: dateStr,
        tutorialStarted: tStart,
        tutorialCompleted: tComp,
        tutorialDropStep: +(2 + Math.random() * 3).toFixed(1),
        tutorialCompleteRate: +((tComp / Math.max(1, tStart)) * 100).toFixed(1),
        questStarted: Math.floor(tComp * (0.85 + Math.random() * 0.1)),
        questAvgProgress: +(1.5 + Math.random() * 2).toFixed(1),
        quest7DayFinishRate: +(30 + Math.random() * 25).toFixed(1),
        dailyTaskAvgCount: +(4.5 + Math.random() * 3).toFixed(1),
        dailyTaskFullRate: +(25 + Math.random() * 20).toFixed(1),
        achievementAvgCount: +(6 + Math.random() * 8).toFixed(1),
        achievementPopRate: +(45 + Math.random() * 30).toFixed(1),
        day1WithTutorial: +(55 + Math.random() * 15).toFixed(1),
        day1WithoutTutorial: +(18 + Math.random() * 10).toFixed(1),
        day7WithQuest: +(32 + Math.random() * 15).toFixed(1),
      }
    })
    await db.coreFlowDailyStats.createMany({ data: statsData })

    // ── 玩家进度抽样 ──
    const progressTypes = ['tutorial', 'quest', 'daily', 'achievement']
    const progressData: Array<{
      userId: number
      progressType: string
      targetId: number
      status: number
      currentValue: number
      completedAt: Date | null
    }> = []
    for (let userId = 10001; userId <= 10080; userId++) {
      for (const pType of progressTypes) {
        const count = pType === 'tutorial' ? 8 : pType === 'quest' ? 16 : pType === 'daily' ? 10 : 10
        for (let tId = 1; tId <= count; tId++) {
          const rand = Math.random()
          let status = 0
          if (rand > 0.1) status = 2
          else if (rand > 0.05) status = 1
          const completedAt = status >= 2 ? new Date(Date.now() - Math.random() * 86400000 * 7) : null
          progressData.push({
            userId,
            progressType: pType,
            targetId: tId,
            status,
            currentValue: status >= 2 ? tId : Math.floor(tId * 0.5),
            completedAt,
          })
        }
      }
    }
    // Batch insert (SQLite limit 100)
    for (let i = 0; i < progressData.length; i += 100) {
      await db.playerQuestProgress.createMany({ data: progressData.slice(i, i + 100) })
    }

    return NextResponse.json({
      code: 0,
      message: '种子数据创建完成',
      data: {
        tutorialSteps: 8,
        chapters: 6,
        quests: 16,
        dailyTasks: 13,
        milestones: 5,
        achievements: 16,
        coreFlowStats: 14,
        playerProgress: progressData.length,
      },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '种子数据创建失败'
    return NextResponse.json({ code: -1, message: msg }, { status: 500 })
  }
}
