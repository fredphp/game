import { NextResponse } from 'next/server';

const skillTypes = [
  {
    id: 'AOE',
    name: '群体攻击',
    nameEn: 'Area of Effect',
    icon: 'Explosion',
    color: '#FF6B35',
    gradient: 'from-orange-500 to-red-600',
    description: '对范围内所有敌人造成伤害，适合清除大量敌军',
    particleStyle: '爆炸扩散型粒子，从中心向外辐射',
    animationStyle: '大力挥击 → 冲击波扩散 → 地面裂痕',
    soundStyle: '重击音效 → 爆炸声 → 回响衰减',
    config: {
      particleCount: 200,
      expandSpeed: 15,
      maxRadius: 8,
      damageMultiplier: 0.8,
    },
  },
  {
    id: 'SingleBurst',
    name: '单体爆发',
    nameEn: 'Single Target Burst',
    icon: 'Crosshair',
    color: '#FFD700',
    gradient: 'from-yellow-400 to-amber-600',
    description: '对单一目标造成极高伤害，适合击杀关键敌人',
    particleStyle: '聚焦光束型粒子，高速穿透效果',
    animationStyle: '蓄力 → 闪现/冲锋 → 暴击打击 → 击飞',
    soundStyle: '蓄力嗡鸣 → 破空声 → 暴击音效 → 回响',
    config: {
      beamSpeed: 30,
      beamLength: 5,
      trailCount: 50,
      damageMultiplier: 2.0,
    },
  },
  {
    id: 'Control',
    name: '控制技能',
    nameEn: 'Control',
    icon: 'Shield',
    color: '#00BFFF',
    gradient: 'from-blue-400 to-cyan-600',
    description: '限制敌人行动能力，包括眩晕、减速、冰冻等效果',
    particleStyle: '束缚型粒子，链条/冰晶/暗雾环绕',
    animationStyle: '施法 → 控制场展开 → 目标被束缚 → 挣扎反馈',
    soundStyle: '施法吟唱 → 束缚声 → 控制持续音 → 解除声',
    config: {
      controlRadius: 6,
      controlDuration: 3,
      slowFactor: 0.5,
      damageMultiplier: 0.5,
    },
  },
  {
    id: 'Buff',
    name: '增益技能',
    nameEn: 'Buff',
    icon: 'Sparkles',
    color: '#00FF88',
    gradient: 'from-green-400 to-emerald-600',
    description: '强化自身或友军能力，提升属性或赋予特殊效果',
    particleStyle: '上升型粒子，光圈/光环/符文环绕',
    animationStyle: '施法 → 光环展开 → 属性提升视觉 → 持续发光',
    soundStyle: '神圣音效 → 强化激活 → 持续低音 → 消散',
    config: {
      buffDuration: 10,
      attackBoost: 1.3,
      defenseBoost: 1.2,
      speedBoost: 1.15,
    },
  },
];

const skillElements = [
  { id: 'Fire', name: '火', nameEn: 'Fire', color: '#FF4500', particleColor: '红橙渐变', lightColor: '暖橙色' },
  { id: 'Ice', name: '冰', nameEn: 'Ice', color: '#00BFFF', particleColor: '蓝白渐变', lightColor: '冷蓝色' },
  { id: 'Thunder', name: '雷', nameEn: 'Thunder', color: '#9B59B6', particleColor: '紫黄闪电', lightColor: '紫色' },
  { id: 'Wind', name: '风', nameEn: 'Wind', color: '#2ECC71', particleColor: '青绿旋风', lightColor: '绿色' },
  { id: 'Dark', name: '暗', nameEn: 'Dark', color: '#2C3E50', particleColor: '暗紫黑雾', lightColor: '暗紫色' },
  { id: 'Light', name: '光', nameEn: 'Light', color: '#F1C40F', particleColor: '金白光芒', lightColor: '金色' },
  { id: 'Poison', name: '毒', nameEn: 'Poison', color: '#27AE60', particleColor: '绿紫腐蚀', lightColor: '绿色' },
];

export async function GET() {
  return NextResponse.json({ skillTypes, skillElements });
}
