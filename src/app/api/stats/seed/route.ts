// ============================================================
// API Route: /api/stats/seed
// 初始化统计数据 (精简版，适配 SQLite)
// ============================================================
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST() {
  try {
    const existingStats = await db.dailyStats.count();
    if (existingStats > 0) {
      return NextResponse.json({ code: 0, message: `数据已存在 (${existingStats} 条)` });
    }

    const poolNames = ['常驻卡池', '吕布UP限定池', '蜀国阵营池', '新手池', '混合卡池'];
    const heroNames = ['吕布', '诸葛亮', '赵云', '关羽', '张飞', '曹操', '周瑜', '司马懿', '孙权', '刘备', '典韦', '马超'];
    const nicknames = ['吕布', '诸葛亮', '赵云', '关羽', '张飞', '曹操', '周瑜', '司马懿', '孙权', '刘备', '典韦', '马超', '黄忠', '甘宁', '张辽'];

    // 1. 60 天 DailyStats
    const dailyStatsData = [];
    for (let i = 59; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const dow = d.getDay();
      const wb = (dow === 0 || dow === 6) ? 1.15 : 1.0;
      const gf = 1 + (60 - i) * 0.004;
      const dau = Math.floor((80000 + Math.random() * 20000) * wb * gf);
      const rev = Math.floor((300000 + Math.random() * 150000) * wb * gf);
      dailyStatsData.push({
        date: fmtDate(d), dau,
        mau: Math.floor(dau * 2.6 + Math.random() * 20000),
        newUsers: Math.floor((800 + Math.random() * 800) * gf),
        revenue: rev,
        orders: Math.floor((4000 + Math.random() * 2000) * wb * gf),
        payRate: +(10 + Math.random() * 5).toFixed(1),
        arpu: +(rev / dau).toFixed(2),
        retention1: +(40 + Math.random() * 10).toFixed(1),
        retention7: +(25 + Math.random() * 8).toFixed(1),
        retention30: +(12 + Math.random() * 6).toFixed(1),
        draws: Math.floor((70000 + Math.random() * 30000) * wb * gf),
        battles: Math.floor((50000 + Math.random() * 20000) * wb * gf),
        avgOnline: Math.floor(90 + Math.random() * 60),
        peakOnline: Math.floor(dau * 0.6 + Math.random() * 5000),
      });
    }
    await db.dailyStats.createMany({ data: dailyStatsData });

    // 2. Retention Cohort (20 天)
    const cohortData = [];
    for (let i = 19; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const cs = Math.floor(800 + Math.random() * 800);
      cohortData.push({
        cohortDate: fmtDate(d), cohortSize: cs,
        day1: Math.floor(cs * (0.4 + Math.random() * 0.1)),
        day3: Math.floor(cs * (0.32 + Math.random() * 0.08)),
        day7: Math.floor(cs * (0.25 + Math.random() * 0.08)),
        day14: i <= 14 ? Math.floor(cs * (0.18 + Math.random() * 0.06)) : 0,
        day30: i <= 0 ? Math.floor(cs * (0.12 + Math.random() * 0.05)) : 0,
        retention1: +(40 + Math.random() * 10).toFixed(1),
        retention3: +(30 + Math.random() * 8).toFixed(1),
        retention7: +(22 + Math.random() * 8).toFixed(1),
        retention14: i <= 14 ? +(15 + Math.random() * 6).toFixed(1) : 0,
        retention30: i <= 0 ? +(10 + Math.random() * 5).toFixed(1) : 0,
      });
    }
    await db.retentionRecord.createMany({ data: cohortData });

    // 3. Gacha Records (7天 x 200条 = 1400条)
    const gachaRecords = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      for (let j = 0; j < 200; j++) {
        const rand = Math.random();
        const rarity = rand < 0.02 ? 'SSR' : rand < 0.12 ? 'SR' : 'R';
        const drawDate = new Date(d);
        drawDate.setHours(Math.floor(Math.random() * 24));
        drawDate.setMinutes(Math.floor(Math.random() * 60));
        gachaRecords.push({
          userId: 10001 + Math.floor(Math.random() * 50),
          poolId: Math.floor(Math.random() * 5) + 1,
          poolName: poolNames[Math.floor(Math.random() * poolNames.length)],
          heroId: Math.floor(Math.random() * 12) + 1,
          heroName: heroNames[Math.floor(Math.random() * heroNames.length)],
          rarity,
          drawType: Math.random() > 0.8 ? 'ten' : 'single',
          pityCount: rarity === 'SSR' ? Math.floor(Math.random() * 40) + 40 : Math.floor(Math.random() * 60),
          createdAt: drawDate,
        });
      }
    }
    await db.gachaRecord.createMany({ data: gachaRecords });

    // 4. Revenue Records (14天 x 80条 = 1120条)
    const products = [
      { type: 'diamond', name: '6元充值', amount: 6, diamond: 60 },
      { type: 'diamond', name: '30元充值', amount: 30, diamond: 330 },
      { type: 'diamond', name: '68元充值', amount: 68, diamond: 760 },
      { type: 'diamond', name: '128元充值', amount: 128, diamond: 1460 },
      { type: 'diamond', name: '328元充值', amount: 328, diamond: 3800 },
      { type: 'diamond', name: '648元充值', amount: 648, diamond: 7680 },
      { type: 'monthly', name: '月卡', amount: 30, diamond: 300 },
      { type: 'gift', name: '新手礼包', amount: 12, diamond: 120 },
      { type: 'gift', name: '成长礼包', amount: 68, diamond: 680 },
      { type: 'vip', name: 'VIP周卡', amount: 18, diamond: 180 },
    ];
    const payMethods = ['支付宝', '微信支付', '苹果支付'];
    const revenueRecords = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      for (let j = 0; j < 80; j++) {
        const p = products[Math.floor(Math.random() * products.length)];
        const status = Math.random() > 0.1 ? 2 : 0;
        const payDate = new Date(d);
        payDate.setHours(Math.floor(Math.random() * 16) + 8);
        payDate.setMinutes(Math.floor(Math.random() * 60));
        revenueRecords.push({
          orderNo: `PAY${fmtDate(d).replace(/-/g, '')}${String(10001 + j).padStart(6, '0')}`,
          userId: 10001 + Math.floor(Math.random() * 50),
          nickname: nicknames[Math.floor(Math.random() * nicknames.length)],
          productType: p.type, productName: p.name, amount: p.amount, diamond: p.diamond,
          payMethod: payMethods[Math.floor(Math.random() * payMethods.length)],
          status, paidAt: status >= 1 ? payDate : null, createdAt: payDate,
        });
      }
    }
    await db.revenueRecord.createMany({ data: revenueRecords });

    // 5. User Active Logs (2天 x 500条 = 1000条)
    const actions = ['login', 'battle', 'gacha', 'trade', 'guild'];
    const devices = ['iPhone 15', 'Samsung S24', 'Huawei Mate60', 'iPad Air'];
    const activeLogs = [];
    for (let i = 1; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      for (let j = 0; j < 500; j++) {
        const ld = new Date(d);
        ld.setHours(Math.floor(Math.random() * 18) + 6);
        ld.setMinutes(Math.floor(Math.random() * 60));
        activeLogs.push({
          userId: 10001 + Math.floor(Math.random() * 100),
          action: actions[Math.floor(Math.random() * actions.length)],
          duration: Math.floor(Math.random() * 3600) + 60,
          ip: `10.0.${Math.floor(Math.random() * 10)}.${100 + Math.floor(Math.random() * 156)}`,
          device: devices[Math.floor(Math.random() * devices.length)],
          createdAt: ld,
        });
      }
    }
    await db.userActiveLog.createMany({ data: activeLogs });

    return NextResponse.json({
      code: 0, message: '种子数据创建成功',
      data: { dailyStats: 60, retentionRecords: 20, gachaRecords: 1400, revenueRecords: 1120, userActiveLogs: 1000 },
    });
  } catch (error) {
    console.error('[Seed API] error:', error);
    return NextResponse.json({ code: -1, message: String(error) }, { status: 500 });
  }
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
