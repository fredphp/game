'use client';

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Swords, Shield, Sparkles, Zap, Target, Lock, Crown, Star,
  Copy, Check, ChevronRight, Eye, Flame, Snowflake, Wind,
  Skull, Users, Sword, Wand2, Heart, Scroll, Code2, Gamepad2,
  Volume2, Play, Pause, RotateCcw, Maximize2, Info, X,
  ArrowRight, Layers, Cpu, Palette, Grid3X3, Braces, Radio
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/* ═══════════════════════════════════════════
   Design Tokens
   ═══════════════════════════════════════════ */
const COLORS = {
  bg: '#0a0b10',
  card: '#111318',
  cardHover: '#161922',
  border: '#1F2937',
  borderLight: '#2A2D3A',
  gold: '#C4973B',
  red: '#C23B22',
  jade: '#2E8B57',
  cinnabar: '#E74C3C',
  amber: '#D4A017',
  text: '#E5E7EB',
  textMuted: '#9CA3AF',
  textDim: '#6B7280',
};

const RARITY = {
  SSR: { color: '#FFD700', border: '#DAA520', glow: 'rgba(255,215,0,0.25)', bg: 'rgba(255,215,0,0.08)' },
  SR: { color: '#C77DFF', border: '#9B59B6', glow: 'rgba(155,89,182,0.25)', bg: 'rgba(155,89,182,0.08)' },
};

const FACTION = {
  楚: { color: '#E74C3C', bg: 'rgba(231,76,60,0.12)', label: '西楚' },
  汉: { color: '#3498DB', bg: 'rgba(52,152,219,0.12)', label: '大汉' },
  群: { color: '#8E44AD', bg: 'rgba(142,68,173,0.12)', label: '群雄' },
  秦: { color: '#95A5A6', bg: 'rgba(149,165,166,0.12)', label: '大秦' },
};

const SKILL_TYPES = {
  AOE: { label: '群体攻击', icon: Flame, color: '#EF4444', gradient: 'from-red-500/20 to-orange-500/20', borderColor: '#EF444450' },
  Single: { label: '单体爆发', icon: Target, color: '#F59E0B', gradient: 'from-amber-500/20 to-yellow-500/20', borderColor: '#F59E0B50' },
  Control: { label: '控制', icon: Lock, color: '#3B82F6', gradient: 'from-blue-500/20 to-cyan-500/20', borderColor: '#3B82F650' },
  Buff: { label: '增益', icon: Sparkles, color: '#10B981', gradient: 'from-emerald-500/20 to-green-500/20', borderColor: '#10B98150' },
};

/* ═══════════════════════════════════════════
   Hero Data
   ═══════════════════════════════════════════ */
interface HeroSkill {
  name: string;
  type: keyof typeof SKILL_TYPES;
  desc: string;
  damage?: string;
  cooldown?: string;
}

interface Hero {
  id: string;
  name: string;
  title: string;
  rarity: 'SSR' | 'SR';
  faction: '楚' | '汉' | '群' | '秦';
  role: string;
  portrait: string;
  sdPrompt: string;
  keywords: string[];
  skills: HeroSkill[];
}

const HEROES: Hero[] = [
  {
    id: 'xiang_yu',
    name: '项羽',
    title: '西楚霸王',
    rarity: 'SSR',
    faction: '楚',
    role: '战士',
    portrait: '/heroes/xiang_yu.png',
    sdPrompt: 'Chinese ancient warrior general Xiang Yu, Hegemon-King of Western Chu, imposing figure wearing heavy dark iron armor with bronze dragon motifs, holding a massive halberd spear, flowing red cape, battlefield background with burning flags, dramatic lighting, warring states period, epic fantasy art style, highly detailed, 8k quality, cinematic composition, dark moody atmosphere',
    keywords: ['霸气', '重甲', '霸王枪', '战场背景'],
    skills: [
      { name: '霸王击', type: 'AOE', desc: '以霸王枪横扫千军，对前方扇形区域造成大量伤害', damage: '280%', cooldown: '8s' },
      { name: '破釜沉舟', type: 'Buff', desc: '破釜沉舟，提升自身攻击力50%，持续5回合', cooldown: '12s' },
      { name: '四面楚歌', type: 'Control', desc: '四面楚歌使敌军士气崩溃，降低敌方全体防御力30%', cooldown: '15s' },
    ],
  },
  {
    id: 'liu_bang',
    name: '刘邦',
    title: '汉高祖',
    rarity: 'SSR',
    faction: '汉',
    role: '辅助/统帅',
    portrait: '/heroes/liu_bang.png',
    sdPrompt: 'Chinese ancient emperor Liu Bang, founder of Han Dynasty, regal noble figure wearing golden dragon robe with jade accessories, seated on ornate throne, divine imperial aura, warm golden light emanating, ancient Chinese palace interior, warring states period art style, majestic composition, 8k quality',
    keywords: ['帝王之气', '龙袍', '金光', '宫殿'],
    stars: 5,
    skills: [
      { name: '天命所归', type: 'Buff', desc: '天命所归，为全体友方提供护盾，吸收最大生命值30%的伤害', cooldown: '18s' },
      { name: '知人善任', type: 'Buff', desc: '知人善任，提升全体友方攻击力和速度各20%', cooldown: '15s' },
      { name: '约法三章', type: 'Control', desc: '约法三章，束缚敌方行动，有概率使其跳过下一回合', cooldown: '12s' },
    ],
  },
  {
    id: 'han_xin',
    name: '韩信',
    title: '兵仙',
    rarity: 'SSR',
    faction: '汉',
    role: '刺客/策略',
    portrait: '/heroes/han_xin.png',
    sdPrompt: 'Chinese ancient military genius Han Xin, the God of War, young handsome general in sleek dark armor with silver accents, holding a strategic bamboo scroll, standing on a cliff overlooking vast army formations, cool blue energy aura, warring states period, strategic mastermind, epic fantasy art, highly detailed face, 8k quality, cinematic lighting',
    keywords: ['冷峻', '银甲', '兵书', '蓝光'],
    skills: [
      { name: '背水一战', type: 'AOE', desc: '背水列阵，以残血状态激发全军战意，造成巨额范围伤害', damage: '320%', cooldown: '10s' },
      { name: '暗度陈仓', type: 'Single', desc: '暗度陈仓，突袭敌方后排关键单位，造成极高单体伤害', damage: '450%', cooldown: '6s' },
      { name: '十面埋伏', type: 'Control', desc: '十面埋伏，困住敌方全体2回合，期间降低敌方速度50%', cooldown: '16s' },
    ],
  },
  {
    id: 'jing_ke',
    name: '荆轲',
    title: '刺客',
    rarity: 'SR',
    faction: '群',
    role: '刺客',
    portrait: '/heroes/jing_ke.png',
    sdPrompt: 'Chinese ancient assassin Jing Ke, legendary assassin of warring states, lean muscular figure in dark leather assassin garb, carrying a poisoned dagger concealed in a map scroll, rooftop scene at night, moonlight shadows, mysterious and dangerous aura, warring states period, dark fantasy art, dramatic lighting, 8k quality',
    keywords: ['刺客', '匕首', '暗夜', '匕首藏图'],
    skills: [
      { name: '图穷匕见', type: 'Single', desc: '图穷匕见，出其不意突刺要害，对单体造成致命伤害', damage: '380%', cooldown: '5s' },
      { name: '易水寒', type: 'Control', desc: '易水寒气浸入骨髓，冻结目标2回合，期间无法行动', cooldown: '10s' },
      { name: '燕赵悲歌', type: 'Buff', desc: '燕赵慷慨悲歌激发战斗意志，提升自身暴击率40%，持续3回合', cooldown: '14s' },
    ],
  },
  {
    id: 'bai_qi',
    name: '白起',
    title: '战神',
    rarity: 'SSR',
    faction: '秦',
    role: '战士/AOE',
    portrait: '/heroes/bai_qi.png',
    sdPrompt: 'Chinese ancient god of war Bai Qi, the Butcher General of Qin state, intimidating tall figure in blood-red heavy armor with skull helmet decorations, wielding a massive battle axe dripping with dark energy, standing among fallen enemies on a battlefield, dark crimson aura, fearsome presence, warring states period, dark fantasy art, 8k quality',
    keywords: ['嗜血', '重斧', '骷髅铠', '血色光环'],
    skills: [
      { name: '长平之战', type: 'AOE', desc: '重现长平之战的恐怖屠杀，对全体敌方造成毁灭性伤害', damage: '350%', cooldown: '12s' },
      { name: '杀神降临', type: 'Buff', desc: '杀神降临，每次击杀恢复自身15%最大生命值，并叠加攻击力', cooldown: '被动' },
      { name: '人屠', type: 'Single', desc: '人屠之威，对生命值低于30%的目标造成双倍伤害', damage: '500%', cooldown: '8s' },
    ],
  },
  {
    id: 'zhang_liang',
    name: '张良',
    title: '谋圣',
    rarity: 'SR',
    faction: '汉',
    role: '策略/辅助',
    portrait: '/heroes/zhang_liang.png',
    sdPrompt: 'Chinese ancient strategist Zhang Liang, brilliant scholar strategist of Han Dynasty, elegant figure in flowing white and blue scholar robes, holding a jade fan, surrounded by floating holographic battle strategy maps and ancient Chinese calligraphy symbols, divine wisdom aura, serene mountain temple background, warring states period, mystical fantasy art, 8k quality, soft ethereal lighting',
    keywords: ['仙风道骨', '羽扇', '全息兵法', '水墨'],
    skills: [
      { name: '运筹帷幄', type: 'Control', desc: '运筹帷幄，预判敌方行动并设置陷阱，降低敌方全体命中率40%', cooldown: '14s' },
      { name: '明修栈道', type: 'Buff', desc: '明修栈道暗度陈仓，为全体友方提供闪避率提升30%', cooldown: '12s' },
      { name: '暗度陈仓', type: 'Single', desc: '精准计算弱点，对单体造成策略性高额伤害，附带沉默效果', damage: '300%', cooldown: '7s' },
    ],
  },
];

/* ═══════════════════════════════════════════
   Unity C# Code Data
   ═══════════════════════════════════════════ */
const UNITY_FILES = [
  {
    name: 'HeroPerformanceSystem.cs',
    desc: '武将表现系统主控制器',
    code: `using UnityEngine;
using System.Collections.Generic;

namespace Game.SkillSystem
{
    /// <summary>
    /// 武将表现系统 - 主控制器
    /// 管理所有武将的技能特效、动画、音效
    /// </summary>
    public class HeroPerformanceSystem : MonoBehaviour
    {
        public static HeroPerformanceSystem Instance { get; private set; }

        [Header("系统配置")]
        [SerializeField] private SkillConfigDatabase skillDatabase;
        [SerializeField] private ParticleSystemPool particlePool;
        [SerializeField] private AudioController audioController;
        [SerializeField] private AnimationController animController;

        private Dictionary<string, SkillPerformance> _activePerformances = new();

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);

            InitializeSystem();
        }

        private void InitializeSystem()
        {
            particlePool.Initialize();
            audioController.Initialize();
            animController.Initialize();
            Debug.Log("[HeroPerformanceSystem] 武将表现系统初始化完成");
        }

        /// <summary>
        /// 播放技能表现
        /// </summary>
        public void PlaySkillPerformance(string skillId, Vector3 position, Transform caster)
        {
            var config = skillDatabase.GetSkillConfig(skillId);
            if (config == null)
            {
                Debug.LogError(\$"[HeroPerformanceSystem] 找不到技能配置: {skillId}");
                return;
            }

            var performance = new SkillPerformance(config, caster);
            _activePerformances[skillId] = performance;

            // 按序播放: 音效 → 动画 → 粒子
            audioController.PlaySkillSound(config.SoundEffect, config.Volume);
            animController.PlaySkillAnimation(caster, config.AnimationName, config.AnimationDuration);

            float delay = config.StartDelay;
            foreach (var particleData in config.ParticleEffects)
            {
                StartCoroutine(DelayedSpawn(particleData, position, delay));
                delay += particleData.Delay;
            }

            StartCoroutine(CompletePerformance(skillId, config.TotalDuration));
        }

        private System.Collections.IEnumerator DelayedSpawn(
            ParticleEffectData data, Vector3 position, float delay)
        {
            yield return new WaitForSeconds(delay);
            var particles = particlePool.GetParticle(data.ParticlePrefab);
            particles.transform.position = position;
            particles.Play();

            StartCoroutine(ReturnToPool(particles, data.Duration));
        }

        private System.Collections.IEnumerator ReturnToPool(
            ParticleSystem particles, float duration)
        {
            yield return new WaitForSeconds(duration);
            particlePool.ReturnParticle(particles);
        }

        private System.Collections.IEnumerator CompletePerformance(
            string skillId, float totalDuration)
        {
            yield return new WaitForSeconds(totalDuration);
            _activePerformances.Remove(skillId);
        }

        public bool IsSkillPlaying(string skillId)
        {
            return _activePerformances.ContainsKey(skillId);
        }
    }
}`,
  },
  {
    name: 'SkillTypes.cs',
    desc: '技能类型与数据结构定义',
    code: `namespace Game.SkillSystem
{
    public enum SkillType
    {
        /// <summary>群体攻击 - AOE范围伤害</summary>
        AOE,
        /// <summary>单体爆发 - 高额单点伤害</summary>
        SingleBurst,
        /// <summary>控制 - 眩晕/减速/冰冻</summary>
        Control_Stun,
        Control_Slow,
        Control_Freeze,
        /// <summary>增益 - 自身/友方强化</summary>
        Buff_Attack,
        Buff_Defense,
        Buff_Speed,
        /// <summary>召唤 - 召唤单位协助</summary>
        Summon,
        /// <summary>治疗 - 回复生命值</summary>
        Heal
    }

    public enum SkillElement
    {
        Fire,   // 火 - 红橙粒子
        Ice,    // 冰 - 蓝白粒子
        Thunder,// 雷 - 紫黄闪电
        Wind,   // 风 - 青绿旋风
        Dark,   // 暗 - 暗紫黑雾
        Light,  // 光 - 金白光芒
        Poison  // 毒 - 绿紫腐蚀
    }

    [System.Serializable]
    public class SkillConfig
    {
        public string SkillId;
        public string SkillName;
        public string HeroName;
        public SkillType SkillType;
        public SkillElement Element;
        public float DamageMultiplier;
        public float Cooldown;
        public float Range;
        public float Duration;

        [Header("表现配置")]
        public string AnimationName;
        public float AnimationDuration;
        public float StartDelay;
        public float TotalDuration;
        public List<ParticleEffectData> ParticleEffects;
        public SoundEffectData SoundEffect;
        [Range(0f, 1f)] public float Volume = 0.8f;

        [Header("屏幕效果")]
        public ScreenEffectData ScreenEffect;
    }

    [System.Serializable]
    public class ParticleEffectData
    {
        public string Name;
        public ParticleSystem ParticlePrefab;
        public float Delay;
        public float Duration;
        public float Scale = 1f;
        public Vector3 Offset;
        public bool FollowCaster;
    }

    [System.Serializable]
    public class SoundEffectData
    {
        public AudioClip Clip;
        public bool Loop;
        public float Pitch = 1f;
        public float SpatialBlend = 1f;
    }

    [System.Serializable]
    public class ScreenEffectData
    {
        public bool Enable;
        public float ShakeIntensity;
        public float ShakeDuration;
        public float SlowMotionFactor;
        public float SlowMotionDuration;
    }
}`,
  },
  {
    name: 'ParticleEffectFactory.cs',
    desc: '粒子特效工厂 — AOE/单体/控制效果创建',
    code: `using UnityEngine;
using System.Collections;

namespace Game.SkillSystem
{
    /// <summary>
    /// 粒子特效工厂 - 创建各种技能粒子效果
    /// </summary>
    public class ParticleEffectFactory : MonoBehaviour
    {
        [Header("AOE配置")]
        [SerializeField] private float aoeExpandSpeed = 15f;
        [SerializeField] private float aoeMaxRadius = 8f;
        [SerializeField] private Gradient aoeColorGradient;
        [SerializeField] private int aoeParticleCount = 200;

        [Header("单体爆发配置")]
        [SerializeField] private float burstSpeed = 30f;
        [SerializeField] private float burstLength = 5f;
        [SerializeField] private Gradient burstColorGradient;
        [SerializeField] private int burstTrailCount = 50;

        [Header("控制效果配置")]
        [SerializeField] private float controlRadius = 6f;
        [SerializeField] private float controlDuration = 3f;
        [SerializeField] private Gradient controlColorGradient;

        /// <summary>
        /// 创建AOE爆炸粒子
        /// </summary>
        public ParticleSystem CreateAOEExplosion(SkillElement element)
        {
            var go = new GameObject("AOE_Explosion");
            var ps = go.AddComponent<ParticleSystem>();

            var main = ps.main;
            main.duration = 1.5f;
            main.loop = false;
            main.startLifetime = 1.2f;
            main.startSpeed = aoeExpandSpeed;
            main.startSize = 0.5f;
            main.gravityModifier = -0.5f;
            main.maxParticles = aoeParticleCount;

            var shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Cone;
            shape.angle = 360f;
            shape.radius = 0.5f;

            var colorOverLifetime = ps.colorOverLifetime;
            colorOverLifetime.enabled = true;
            colorOverLifetime.color = GetElementGradient(element);

            // 发光效果
            var lights = ps.lights;
            lights.enabled = true;
            lights.light = GetElementLight(element);
            lights.ratio = 0.1f;
            lights.range = 10f;
            lights.intensity = 2f;

            // 子粒子 - 火花
            CreateSparkSubEmitter(ps, element);

            return ps;
        }

        /// <summary>
        /// 创建单体爆发光束
        /// </summary>
        public ParticleSystem CreateSingleBurstBeam(SkillElement element)
        {
            var go = new GameObject("Single_Burst_Beam");
            var ps = go.AddComponent<ParticleSystem>();

            var main = ps.main;
            main.duration = 0.8f;
            main.loop = false;
            main.startLifetime = 0.5f;
            main.startSpeed = burstSpeed;
            main.startSize = 0.3f;
            main.gravityModifier = 0f;
            main.maxParticles = burstTrailCount;

            var shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.SingleLine;
            shape.lineLength = burstLength;

            var colorOverLifetime = ps.colorOverLifetime;
            colorOverLifetime.enabled = true;
            colorOverLifetime.color = GetElementGradient(element);

            // 拖尾效果
            var trails = ps.trails;
            trails.enabled = true;
            trails.lifetime = 0.3f;
            trails.widthOverTrail = new ParticleSystem.MinMaxCurve(1f, 0f);

            return ps;
        }

        /// <summary>
        /// 创建控制效果(冰冻/眩晕)
        /// </summary>
        public ParticleSystem CreateControlEffect(SkillType type, SkillElement element)
        {
            var go = new GameObject(\$"Control_{type}");
            var ps = go.AddComponent<ParticleSystem>();

            var main = ps.main;
            main.duration = controlDuration;
            main.loop = true;
            main.startLifetime = 2f;
            main.startSpeed = 2f;
            main.startSize = 0.8f;
            main.gravityModifier = -0.2f;
            main.maxParticles = 100;

            var shape = ps.shape;
            shape.shapeType = ParticleSystemShapeType.Sphere;
            shape.radius = 0.5f;

            switch (type)
            {
                case SkillType.Control_Stun:
                    CreateStunIndicators(ps);
                    break;
                case SkillType.Control_Slow:
                    CreateSlowField(ps);
                    break;
                case SkillType.Control_Freeze:
                    CreateFreezeEffect(ps);
                    break;
            }

            return ps;
        }

        private void CreateSparkSubEmitter(ParticleSystem parent, SkillElement element)
        {
            var subEmitter = new ParticleSystem.SubEmitter();
            var subGo = new GameObject("Sparks");
            var subPs = subGo.AddComponent<ParticleSystem>();

            var main = subPs.main;
            main.startLifetime = 0.4f;
            main.startSpeed = 8f;
            main.startSize = 0.1f;
            main.gravityModifier = 2f;

            var emission = subPs.emission;
            emission.rateOverTime = 30;

            subEmitter.particles = subPs;
            subEmitter.type = ParticleSystemSubEmitterType.Birth;
            subEmitter.properties = ParticleSystemSubEmitterProperties.InheritNothing;

            parent.AddSubEmitter(subEmitter);
        }

        private void CreateStunIndicators(ParticleSystem ps)
        {
            var rotationOverLifetime = ps.rotationOverLifetime;
            rotationOverLifetime.enabled = true;
            rotationOverLifetime.angularVelocity = 360f;
        }

        private void CreateSlowField(ParticleSystem ps)
        {
            var trails = ps.trails;
            trails.enabled = true;
            trails.lifetime = 0.5f;
        }

        private void CreateFreezeEffect(ParticleSystem ps)
        {
            var main = ps.main;
            main.startColor = new Color(0.7f, 0.9f, 1f, 0.8f);
        }

        private Gradient GetElementGradient(SkillElement element)
        {
            var gradient = new Gradient();
            switch (element)
            {
                case SkillElement.Fire:
                    gradient.SetKeys(
                        new[] { new GradientColorKey(Color.red, 0f),
                                new GradientColorKey(new Color(1f, 0.6f, 0f), 0.5f),
                                new GradientColorKey(Color.yellow, 1f) },
                        new[] { new GradientAlphaKey(1f, 0f),
                                new GradientAlphaKey(0.8f, 0.5f),
                                new GradientAlphaKey(0f, 1f) }
                    );
                    break;
                case SkillElement.Ice:
                    gradient.SetKeys(
                        new[] { new GradientColorKey(new Color(0.5f, 0.8f, 1f), 0f),
                                new GradientColorKey(Color.white, 0.5f),
                                new GradientColorKey(new Color(0.7f, 0.9f, 1f, 0f), 1f) },
                        new[] { new GradientAlphaKey(1f, 0f),
                                new GradientAlphaKey(0.6f, 0.5f),
                                new GradientAlphaKey(0f, 1f) }
                    );
                    break;
                default:
                    gradient.SetKeys(
                        new[] { new GradientColorKey(Color.white, 0f),
                                new GradientColorKey(Color.gray, 1f) },
                        new[] { new GradientAlphaKey(1f, 0f),
                                new GradientAlphaKey(0f, 1f) }
                    );
                    break;
            }
            return gradient;
        }

        private Light GetElementLight(SkillElement element)
        {
            var lightGO = new GameObject("ParticleLight");
            var light = lightGO.AddComponent<Light>();

            switch (element)
            {
                case SkillElement.Fire:
                    light.color = new Color(1f, 0.4f, 0.1f);
                    light.intensity = 3f;
                    break;
                case SkillElement.Ice:
                    light.color = new Color(0.5f, 0.8f, 1f);
                    light.intensity = 2f;
                    break;
                case SkillElement.Thunder:
                    light.color = new Color(0.7f, 0.5f, 1f);
                    light.intensity = 4f;
                    break;
                default:
                    light.color = Color.white;
                    light.intensity = 2f;
                    break;
            }

            lightGO.transform.SetParent(transform);
            return light;
        }
    }
}`,
  },
  {
    name: 'SkillAudioController.cs',
    desc: '技能音效控制器',
    code: `using UnityEngine;
using System.Collections.Generic;

namespace Game.SkillSystem
{
    /// <summary>
    /// 技能音效控制器 - 管理所有技能音效的播放
    /// </summary>
    public class SkillAudioController : MonoBehaviour
    {
        private Dictionary<string, AudioClip> _soundCache = new();
        private List<AudioSource> _audioSources = new();
        private int _maxSources = 10;

        [Header("全局设置")]
        [SerializeField] private float globalVolume = 1f;
        [SerializeField] private float masterPitch = 1f;

        [Header("混响配置")]
        [SerializeField] private AudioReverbPreset reverbPreset =
            AudioReverbPreset.Plain;

        public void Initialize()
        {
            for (int i = 0; i < _maxSources; i++)
            {
                var go = new GameObject(\$"AudioSource_{i}");
                go.transform.SetParent(transform);
                var source = go.AddComponent<AudioSource>();
                source.playOnAwake = false;
                source.spatialBlend = 1f;
                source.rolloffMode = AudioRolloffMode.Linear;
                source.maxDistance = 30f;
                _audioSources.Add(source);
            }
        }

        /// <summary>
        /// 播放技能音效
        /// </summary>
        public void PlaySkillSound(SoundEffectData data, float volume = 0.8f)
        {
            if (data.Clip == null) return;

            var source = GetAvailableSource();
            if (source == null) return;

            source.clip = data.Clip;
            source.volume = volume * globalVolume;
            source.pitch = data.Pitch * masterPitch;
            source.loop = data.Loop;
            source.spatialBlend = data.SpatialBlend;
            source.Play();

            if (!data.Loop)
            {
                StartCoroutine(ReleaseSource(source, data.Clip.length));
            }
        }

        /// <summary>
        /// 播放连击音效（递增音调）
        /// </summary>
        public void PlayComboSound(
            AudioClip clip, int comboCount, float baseVolume = 0.6f)
        {
            var source = GetAvailableSource();
            if (source == null) return;

            source.clip = clip;
            source.volume = baseVolume * globalVolume;
            source.pitch = masterPitch * (1f + comboCount * 0.05f);
            source.Play();

            StartCoroutine(ReleaseSource(source, clip.length));
        }

        private AudioSource GetAvailableSource()
        {
            foreach (var source in _audioSources)
            {
                if (!source.isPlaying) return source;
            }
            Debug.LogWarning("[SkillAudio] 所有音效源已占用，回收最旧源");
            var oldest = _audioSources[0];
            oldest.Stop();
            return oldest;
        }

        private System.Collections.IEnumerator ReleaseSource(
            AudioSource source, float clipLength)
        {
            yield return new WaitForSeconds(clipLength);
            source.Stop();
            source.clip = null;
        }
    }
}`,
  },
  {
    name: 'SkillAnimationController.cs',
    desc: '技能动画控制器',
    code: `using UnityEngine;
using System.Collections;

namespace Game.SkillSystem
{
    /// <summary>
    /// 技能动画控制器 - 管理武将技能释放动画
    /// </summary>
    public class SkillAnimationController : MonoBehaviour
    {
        [Header("配置")]
        [SerializeField] private float animationBlendSpeed = 0.15f;
        [SerializeField] private float cameraShakeIntensity = 0.5f;

        public void Initialize()
        {
            Debug.Log("[SkillAnimationController] 动画控制器初始化完成");
        }

        /// <summary>
        /// 播放技能释放动画
        /// </summary>
        public void PlaySkillAnimation(
            Transform caster, string animName, float duration)
        {
            if (caster == null) return;

            var animator = caster.GetComponentInChildren<Animator>();
            if (animator == null)
            {
                Debug.LogWarning(
                    \$"[SkillAnimation] {caster.name} 没有Animator组件");
                return;
            }

            animator.CrossFade(animName, animationBlendSpeed);
            StartCoroutine(CameraShake(cameraShakeIntensity, duration * 0.5f));
            StartCoroutine(ReturnToIdle(animator, duration));
        }

        /// <summary>
        /// 播放控制效果动画
        /// </summary>
        public void PlayControlledAnimation(
            Transform target, SkillType controlType, float duration)
        {
            if (target == null) return;

            var animator = target.GetComponentInChildren<Animator>();
            if (animator == null) return;

            switch (controlType)
            {
                case SkillType.Control_Stun:
                    animator.CrossFade("Stunned", 0.1f);
                    ShowStunIndicator(target, duration);
                    break;
                case SkillType.Control_Freeze:
                    animator.CrossFade("Frozen", 0.1f);
                    ApplyFreezeMaterial(target);
                    break;
                case SkillType.Control_Slow:
                    animator.speed = 0.3f;
                    StartCoroutine(RestoreSpeed(animator, duration));
                    break;
            }
        }

        private IEnumerator CameraShake(float intensity, float duration)
        {
            var camera = Camera.main;
            if (camera == null) yield break;

            var originalPos = camera.transform.localPosition;
            var elapsed = 0f;

            while (elapsed < duration)
            {
                var randomOffset = Random.insideUnitSphere * intensity;
                randomOffset.z = 0;
                camera.transform.localPosition = originalPos + randomOffset;

                elapsed += Time.deltaTime;
                intensity *= 0.95f;
                yield return null;
            }

            camera.transform.localPosition = originalPos;
        }

        private IEnumerator ReturnToIdle(Animator animator, float delay)
        {
            yield return new WaitForSeconds(delay);
            if (animator != null)
            {
                animator.CrossFade("Idle", 0.3f);
            }
        }

        private IEnumerator RestoreSpeed(Animator animator, float duration)
        {
            yield return new WaitForSeconds(duration);
            if (animator != null) animator.speed = 1f;
        }

        private void ShowStunIndicator(Transform target, float duration)
        {
            var indicator = new GameObject("StunIndicator");
            indicator.transform.SetParent(target);
            indicator.transform.localPosition = new Vector3(0, 2.5f, 0);
            StartCoroutine(RotateIndicator(indicator.transform, duration));
            Destroy(indicator, duration);
        }

        private IEnumerator RotateIndicator(Transform indicator, float duration)
        {
            var elapsed = 0f;
            while (elapsed < duration)
            {
                indicator.Rotate(Vector3.up, 120f * Time.deltaTime);
                indicator.localPosition = new Vector3(
                    0, 2.5f + Mathf.Sin(elapsed * 3f) * 0.2f, 0
                );
                elapsed += Time.deltaTime;
                yield return null;
            }
        }

        private void ApplyFreezeMaterial(Transform target)
        {
            var renderers = target.GetComponentsInChildren<Renderer>();
            foreach (var renderer in renderers)
            {
                foreach (var mat in renderer.materials)
                {
                    mat.SetFloat("_FreezeAmount", 1f);
                }
            }
        }
    }
}`,
  },
];

/* ═══════════════════════════════════════════
   Animation Variants
   ═══════════════════════════════════════════ */
const fadeInUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

/* ═══════════════════════════════════════════
   Copy Button Component
   ═══════════════════════════════════════════ */
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs gap-1.5 text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-white/5"
      onClick={handleCopy}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-emerald-400">{label ? `${label} 已复制` : '已复制'}</span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5" />
          <span>{label || '复制'}</span>
        </>
      )}
    </Button>
  );
}

/* ═══════════════════════════════════════════
   Skill Type Animated Demo Components
   ═══════════════════════════════════════════ */
function AOEDemo() {
  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden bg-[#0d0e14] border border-[#1F2937]">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle, #ffffff15 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }} />
      {/* Center point */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="w-3 h-3 rounded-full bg-red-500 shadow-lg shadow-red-500/50"
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        {/* Expanding rings */}
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-red-500/40"
            initial={{ width: 0, height: 0, opacity: 0.8 }}
            animate={{ width: [0, 200 + i * 60], height: [0, 200 + i * 60], opacity: [0.8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.6, ease: 'easeOut' }}
          />
        ))}
        {/* Particles */}
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          return (
            <motion.div
              key={`p-${i}`}
              className="absolute w-1.5 h-1.5 rounded-full bg-orange-400 shadow-lg shadow-orange-400/50"
              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
              animate={{
                x: Math.cos(angle) * 90,
                y: Math.sin(angle) * 90,
                opacity: [1, 1, 0],
                scale: [1, 0.5, 0],
              }}
              transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.05, ease: 'easeOut' }}
            />
          );
        })}
      </div>
      {/* Damage numbers */}
      {['-1284', '-956', '-1567'].map((dmg, i) => (
        <motion.span
          key={dmg}
          className="absolute text-red-400 font-bold text-sm"
          initial={{ opacity: 1, y: 60 + i * 20 }}
          animate={{ opacity: [1, 1, 0], y: [60 + i * 20, 20 + i * 20, -20 + i * 10] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
          style={{ left: `${35 + i * 18}%` }}
        >
          {dmg}
        </motion.span>
      ))}
      {/* Label */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">AOE</Badge>
        <span className="text-[10px] text-[#6B7280]">群体攻击 · 火焰爆炸</span>
      </div>
    </div>
  );
}

function SingleBurstDemo() {
  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden bg-[#0d0e14] border border-[#1F2937]">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle, #ffffff15 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }} />
      {/* Beam from left to right */}
      <motion.div
        className="absolute top-1/2 left-0 h-1 -translate-y-1/2"
        style={{ background: 'linear-gradient(90deg, transparent, #F59E0B, #EF4444, transparent)' }}
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: ['0%', '100%', '100%', '0%'], opacity: [0, 1, 0.8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />
      {/* Second beam */}
      <motion.div
        className="absolute top-1/2 left-0 h-[2px] -translate-y-1/2"
        style={{ background: 'linear-gradient(90deg, transparent, #FBBF24, transparent)' }}
        initial={{ width: 0, opacity: 0 }}
        animate={{ width: ['0%', '80%', '80%', '0%'], opacity: [0, 1, 0.6, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.15, ease: 'easeInOut' }}
      />
      {/* Impact flash */}
      <motion.div
        className="absolute right-[20%] top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-yellow-400/50 blur-sm"
        animate={{ scale: [0, 3, 0], opacity: [0, 1, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
      />
      {/* Critical hit text */}
      <motion.div
        className="absolute right-[18%] top-[30%]"
        initial={{ opacity: 0, scale: 0.5, y: 0 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 1.5, 1.2, 1], y: [0, -10, -20, -40] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.6 }}
      >
        <span className="text-amber-400 font-black text-lg drop-shadow-lg">-4567</span>
        <span className="block text-[10px] text-amber-300 font-bold text-center">暴击!</span>
      </motion.div>
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[10px]">SINGLE</Badge>
        <span className="text-[10px] text-[#6B7280]">单体爆发 · 贯穿光束</span>
      </div>
    </div>
  );
}

function ControlDemo() {
  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden bg-[#0d0e14] border border-[#1F2937]">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle, #ffffff15 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }} />
      {/* Center frozen target */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="w-16 h-16 rounded-xl border-2 border-blue-400/50 bg-blue-900/20 flex items-center justify-center"
          animate={{ borderColor: ['#3B82F650', '#60A5FA', '#3B82F650'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-2xl opacity-40">🧊</span>
        </motion.div>
        {/* Ice crystals floating around */}
        {Array.from({ length: 6 }).map((_, i) => {
          const angle = (i / 6) * Math.PI * 2;
          const r = 45;
          return (
            <motion.div
              key={`ice-${i}`}
              className="absolute w-2 h-2 bg-blue-300/60 rounded-sm rotate-45"
              animate={{
                x: Math.cos(angle) * r,
                y: Math.sin(angle) * r,
                opacity: [0.3, 0.8, 0.3],
                rotate: [45, 90, 135],
              }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
            />
          );
        })}
        {/* Chain circles */}
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-blue-400/20"
          animate={{ width: [30, 120, 30], height: [30, 120, 30], opacity: [0.4, 0, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        {/* Stun stars */}
        {Array.from({ length: 3 }).map((_, i) => (
          <motion.div
            key={`star-${i}`}
            className="absolute text-yellow-300 text-xs"
            animate={{
              y: [-50, -55 - Math.sin(i * 2) * 8, -50],
              rotate: [0, 120, 240],
              opacity: [0.6, 1, 0.6],
            }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
            style={{ left: `${-15 + i * 15}px`, top: '-40px' }}
          >
            ✦
          </motion.div>
        ))}
      </div>
      {/* Status text */}
      <motion.div
        className="absolute top-6 left-1/2 -translate-x-1/2"
        animate={{ opacity: [0, 1, 0.8, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <span className="text-blue-300 text-xs font-bold tracking-widest">❄ 冰冻 2回合 ❄</span>
      </motion.div>
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px]">CONTROL</Badge>
        <span className="text-[10px] text-[#6B7280]">控制 · 冰冻禁锢</span>
      </div>
    </div>
  );
}

function BuffDemo() {
  return (
    <div className="relative w-full h-48 rounded-xl overflow-hidden bg-[#0d0e14] border border-[#1F2937]">
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'radial-gradient(circle, #ffffff15 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }} />
      {/* Center hero */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <motion.div
          className="w-16 h-16 rounded-xl border-2 border-emerald-400/40 bg-emerald-900/10 flex items-center justify-center"
          animate={{ boxShadow: ['0 0 0px transparent', '0 0 30px #10B98130', '0 0 0px transparent'] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <span className="text-2xl opacity-40">⚔️</span>
        </motion.div>
        {/* Rising particles */}
        {Array.from({ length: 8 }).map((_, i) => (
          <motion.div
            key={`rise-${i}`}
            className="absolute w-1 h-1 rounded-full bg-emerald-400/70"
            initial={{ x: (i - 4) * 8, y: 20, opacity: 0 }}
            animate={{
              y: [-30, -60],
              opacity: [0, 0.8, 0],
              scale: [0.5, 1.2, 0],
            }}
            transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.25 }}
          />
        ))}
        {/* Aura rings */}
        {[0, 1].map((i) => (
          <motion.div
            key={`aura-${i}`}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{ border: '1px solid rgba(16,185,129,0.3)' }}
            animate={{
              width: [40, 100 + i * 40, 40],
              height: [40, 100 + i * 40, 40],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 1 }}
          />
        ))}
      </div>
      {/* Stat boost indicators */}
      {[
        { label: 'ATK +50%', color: '#EF4444', x: '15%', y: '25%' },
        { label: 'DEF +30%', color: '#3B82F6', x: '70%', y: '25%' },
        { label: 'SPD +20%', color: '#F59E0B', x: '15%', y: '75%' },
      ].map((stat, i) => (
        <motion.div
          key={stat.label}
          className="absolute flex items-center gap-1 px-2 py-1 rounded-md border text-[10px] font-bold"
          style={{
            borderColor: `${stat.color}30`,
            backgroundColor: `${stat.color}10`,
            color: stat.color,
            left: stat.x,
            top: stat.y,
          }}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 1, 1, 0], scale: [0.8, 1, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.5 }}
        >
          <ArrowRight className="w-3 h-3" />
          {stat.label}
        </motion.div>
      ))}
      <div className="absolute bottom-3 left-3 flex items-center gap-2">
        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">BUFF</Badge>
        <span className="text-[10px] text-[#6B7280]">增益 · 全属性提升</span>
      </div>
    </div>
  );
}

const SKILL_DEMOS: Record<string, React.ReactNode> = {
  AOE: <AOEDemo />,
  Single: <SingleBurstDemo />,
  Control: <ControlDemo />,
  Buff: <BuffDemo />,
};

/* ═══════════════════════════════════════════
   Hero Detail Dialog
   ═══════════════════════════════════════════ */
function HeroDetailDialog({ hero, open, onOpenChange }: { hero: Hero; open: boolean; onOpenChange: (o: boolean) => void }) {
  const r = RARITY[hero.rarity];
  const f = FACTION[hero.faction];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto bg-[#111318] border-[#1F2937] p-0">
        <div className="relative">
          {/* Portrait Header */}
          <div className="relative h-56 sm:h-64 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#111318]" />
            <motion.img
              src={hero.portrait}
              alt={hero.name}
              className="w-full h-full object-cover object-top"
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Overlay badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              <Badge className="text-xs font-bold px-2.5 py-1" style={{
                backgroundColor: r.bg, color: r.color, borderColor: `${r.color}40`,
                border: `1px solid ${r.color}40`,
              }}>
                {hero.rarity}
              </Badge>
              <Badge className="text-xs px-2.5 py-1" style={{
                backgroundColor: f.bg, color: f.color, borderColor: `${f.color}40`,
                border: `1px solid ${f.color}40`,
              }}>
                {f.label}
              </Badge>
            </div>
            <div className="absolute top-4 right-4">
              <Badge variant="outline" className="text-xs bg-black/30 text-[#E5E7EB] border-white/10 backdrop-blur-sm">
                {hero.role}
              </Badge>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 -mt-8 relative z-10 space-y-5">
            {/* Name & Title */}
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-black tracking-wide" style={{ color: r.color }}>{hero.name}</h2>
                <span className="text-sm text-[#9CA3AF]">·</span>
                <span className="text-sm text-[#9CA3AF]">{hero.title}</span>
              </div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {hero.keywords.map((kw) => (
                  <Badge key={kw} variant="outline" className="text-[10px] border-[#2A2D3A] text-[#9CA3AF] bg-[#0d0e14]">
                    {kw}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator className="bg-[#1F2937]" />

            {/* Skills */}
            <div>
              <h3 className="text-sm font-bold text-[#E5E7EB] mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C4973B]" />
                技能列表
              </h3>
              <div className="space-y-3">
                {hero.skills.map((skill) => {
                  const st = SKILL_TYPES[skill.type];
                  return (
                    <motion.div
                      key={skill.name}
                      className="p-3 rounded-lg border bg-[#0d0e14] group hover:bg-[#161922] transition-colors"
                      style={{ borderColor: st.borderColor }}
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-md flex items-center justify-center bg-gradient-to-br" style={{
                            background: `linear-gradient(135deg, ${st.color}20, ${st.color}08)`,
                          }}>
                            <st.icon className="w-3.5 h-3.5" style={{ color: st.color }} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-[#E5E7EB]">{skill.name}</span>
                              <Badge className="text-[9px] px-1.5 py-0 h-4" style={{
                                backgroundColor: `${st.color}15`, color: st.color,
                                border: `1px solid ${st.color}30`,
                              }}>
                                {st.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-[#6B7280] mt-0.5">{skill.desc}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          {skill.damage && (
                            <span className="text-xs font-bold text-[#EF4444]">伤害 {skill.damage}</span>
                          )}
                          {skill.cooldown && (
                            <span className="text-[10px] text-[#6B7280]">CD: {skill.cooldown}</span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <Separator className="bg-[#1F2937]" />

            {/* SD Prompt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-[#E5E7EB] flex items-center gap-2">
                  <Palette className="w-4 h-4 text-[#C4973B]" />
                  Stable Diffusion Prompt
                </h3>
                <CopyButton text={hero.sdPrompt} label="Prompt" />
              </div>
              <div className="p-3 rounded-lg bg-[#0d0e14] border border-[#1F2937]">
                <p className="text-xs text-[#9CA3AF] leading-relaxed font-mono">{hero.sdPrompt}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ═══════════════════════════════════════════
   Hero Card Component
   ═══════════════════════════════════════════ */
function HeroCard({ hero, index }: { hero: Hero; index: number }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const r = RARITY[hero.rarity];
  const f = FACTION[hero.faction];

  return (
    <>
      <motion.div
        variants={fadeInUp}
        className="group cursor-pointer"
        onClick={() => setDialogOpen(true)}
        whileHover={{ y: -6, transition: { duration: 0.3 } }}
      >
        <div
          className="relative rounded-xl overflow-hidden border transition-all duration-300"
          style={{
            borderColor: `${r.color}30`,
            boxShadow: `0 0 0px transparent`,
          }}
        >
          {/* Glow on hover */}
          <div
            className="absolute -inset-px rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-sm"
            style={{ background: `linear-gradient(135deg, ${r.color}30, transparent, ${r.color}15)` }}
          />
          <Card className="bg-[#111318] border-0 overflow-hidden">
            {/* Portrait */}
            <div className="relative aspect-[3/4] overflow-hidden">
              <img
                src={hero.portrait}
                alt={hero.name}
                className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-110"
              />
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#111318] via-[#111318]/20 to-transparent" />
              {/* Rarity shimmer */}
              {hero.rarity === 'SSR' && (
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(105deg, transparent 40%, rgba(255,215,0,0.12) 45%, rgba(255,215,0,0.18) 50%, rgba(255,215,0,0.12) 55%, transparent 60%)',
                  }}
                  animate={{ x: ['-200%', '200%'] }}
                  transition={{ duration: 3, repeat: Infinity, repeatDelay: 2.5 }}
                />
              )}
              {/* Badges */}
              <div className="absolute top-2.5 left-2.5 flex gap-1.5">
                <Badge className="text-[10px] font-bold px-2 py-0.5 backdrop-blur-sm" style={{
                  backgroundColor: `${r.color}25`, color: r.color,
                  border: `1px solid ${r.color}40`,
                }}>
                  {hero.rarity}
                </Badge>
                <Badge className="text-[10px] px-2 py-0.5 backdrop-blur-sm" style={{
                  backgroundColor: `${f.color}25`, color: f.color,
                  border: `1px solid ${f.color}40`,
                }}>
                  {f.label}
                </Badge>
              </div>
              {/* Role */}
              <div className="absolute top-2.5 right-2.5">
                <Badge variant="outline" className="text-[9px] bg-black/40 text-white/70 border-white/10 backdrop-blur-sm">
                  {hero.role}
                </Badge>
              </div>
              {/* Stars */}
              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex gap-0.5">
                {Array.from({ length: hero.rarity === 'SSR' ? 5 : 4 }).map((_, i) => (
                  <Star key={i} className="w-3 h-3 fill-current" style={{ color: r.color }} />
                ))}
              </div>
              {/* Name */}
              <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                <h3 className="text-lg font-black tracking-wide" style={{ color: r.color }}>{hero.name}</h3>
                <p className="text-[10px] text-[#9CA3AF]">{hero.title}</p>
              </div>
            </div>
            {/* Keywords */}
            <CardContent className="p-3 pt-2">
              <div className="flex flex-wrap gap-1.5">
                {hero.keywords.map((kw) => (
                  <span key={kw} className="text-[10px] px-2 py-0.5 rounded-full bg-[#0d0e14] text-[#6B7280] border border-[#1F2937]">
                    {kw}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
      <HeroDetailDialog hero={hero} open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}

/* ═══════════════════════════════════════════
   Prompt Template Builder
   ═══════════════════════════════════════════ */
function PromptTemplateBuilder() {
  const [selectedHero, setSelectedHero] = useState(0);
  const [style, setStyle] = useState('epic fantasy art');
  const [quality, setQuality] = useState('8k quality');
  const [lighting, setLighting] = useState('cinematic lighting');

  const hero = HEROES[selectedHero];
  const customPrompt = `${hero.sdPrompt}, ${style}, ${quality}, ${lighting}`;

  return (
    <Card className="bg-[#111318] border-[#1F2937]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-[#9CA3AF] flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-[#C4973B]" />
          Prompt 模板构建器
        </CardTitle>
        <CardDescription className="text-xs text-[#6B7280]">选择武将 + 风格 + 画质 + 光照，自动生成完整Prompt</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hero select */}
        <div>
          <label className="text-xs text-[#9CA3AF] mb-1.5 block">选择武将</label>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {HEROES.map((h, i) => (
              <button
                key={h.id}
                onClick={() => setSelectedHero(i)}
                className={cn(
                  'shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                  selectedHero === i
                    ? 'border-[#C4973B]/50 bg-[#C4973B]/10 text-[#C4973B]'
                    : 'border-[#1F2937] text-[#6B7280] hover:text-[#E5E7EB] hover:border-[#2A2D3A]'
                )}
              >
                {h.name}
              </button>
            ))}
          </div>
        </div>

        {/* Style options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: '艺术风格', value: style, options: ['epic fantasy art', 'dark fantasy art', 'realistic art', 'anime art style', 'ink wash painting'], setter: setStyle },
            { label: '画质', value: quality, options: ['8k quality', '4k quality', 'highly detailed', 'ultra HD', 'masterpiece'], setter: setQuality },
            { label: '光照', value: lighting, options: ['cinematic lighting', 'dramatic lighting', 'soft ethereal lighting', 'golden hour lighting', 'moonlight'], setter: setLighting },
          ].map(({ label, value, options, setter }) => (
            <div key={label}>
              <label className="text-xs text-[#9CA3AF] mb-1.5 block">{label}</label>
              <select
                value={value}
                onChange={(e) => setter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-[#0d0e14] border border-[#1F2937] text-xs text-[#E5E7EB] focus:outline-none focus:border-[#C4973B]/50 appearance-none cursor-pointer"
              >
                {options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          ))}
        </div>

        {/* Generated prompt */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs text-[#9CA3AF]">生成结果</label>
            <CopyButton text={customPrompt} label="Prompt" />
          </div>
          <div className="p-3 rounded-lg bg-[#0d0e14] border border-[#1F2937]">
            <p className="text-xs text-[#9CA3AF] leading-relaxed font-mono break-words">{customPrompt}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════
   Skill Tree Visualization
   ═══════════════════════════════════════════ */
function SkillTreeView() {
  return (
    <Card className="bg-[#111318] border-[#1F2937]">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-[#9CA3AF] flex items-center gap-2">
          <Grid3X3 className="w-4 h-4 text-[#C4973B]" />
          全武将技能树概览
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            {/* Header row */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              <div className="text-[10px] text-[#6B7280] text-center">武将</div>
              <div className="text-[10px] text-[#6B7280] text-center">势力</div>
              <div className="text-[10px] text-[#6B7280] text-center">品质</div>
              {HEROES[0].skills.map((_, i) => (
                <div key={i} className="text-[10px] text-[#6B7280] text-center">
                  技能 {i + 1}
                </div>
              ))}
              <div className="text-[10px] text-[#6B7280] text-center">定位</div>
            </div>
            {/* Hero rows */}
            {HEROES.map((hero, hi) => {
              const r = RARITY[hero.rarity];
              const f = FACTION[hero.faction];
              return (
                <motion.div
                  key={hero.id}
                  className="grid grid-cols-7 gap-2 items-center py-2 border-t border-[#1F2937]/50"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: hi * 0.05 }}
                >
                  <div className="flex items-center gap-2 justify-center">
                    <img src={hero.portrait} alt={hero.name} className="w-7 h-7 rounded-md object-cover border border-[#1F2937]" />
                    <span className="text-xs font-bold text-[#E5E7EB]">{hero.name}</span>
                  </div>
                  <div className="text-center">
                    <Badge className="text-[9px] px-1.5 py-0" style={{
                      backgroundColor: f.bg, color: f.color, border: `1px solid ${f.color}30`,
                    }}>
                      {f.label}
                    </Badge>
                  </div>
                  <div className="text-center">
                    <span className="text-[10px] font-bold" style={{ color: r.color }}>{hero.rarity}</span>
                  </div>
                  {hero.skills.map((skill, si) => {
                    const st = SKILL_TYPES[skill.type];
                    return (
                      <motion.div
                        key={si}
                        className="text-center group"
                        whileHover={{ scale: 1.05 }}
                      >
                        <div
                          className="inline-flex flex-col items-center px-2 py-1 rounded-md border transition-colors hover:bg-[#161922]"
                          style={{ borderColor: `${st.color}25` }}
                        >
                          <st.icon className="w-3 h-3 mb-0.5" style={{ color: st.color }} />
                          <span className="text-[9px] text-[#E5E7EB] whitespace-nowrap">{skill.name}</span>
                          <span className="text-[8px] text-[#6B7280]">{st.label}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div className="text-center">
                    <span className="text-[9px] text-[#6B7280]">{hero.role}</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ═══════════════════════════════════════════
   Code Block Component
   ═══════════════════════════════════════════ */
function CodeBlock({ code, language, filename }: { code: string; language: string; filename: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div className="rounded-xl border border-[#1F2937] overflow-hidden">
      {/* File header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1b23] border-b border-[#1F2937]">
        <div className="flex items-center gap-2">
          <Braces className="w-3.5 h-3.5 text-[#C4973B]" />
          <span className="text-xs font-mono text-[#9CA3AF]">{filename}</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-[#6B7280] hover:text-[#E5E7EB] transition-colors px-2 py-1 rounded-md hover:bg-white/5"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">已复制</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>复制</span>
            </>
          )}
        </button>
      </div>
      {/* Code */}
      <ScrollArea className="max-h-[500px]">
        <SyntaxHighlighter
          language={language}
          style={vscDarkPlus}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: '#0d0e14',
            fontSize: '0.75rem',
            lineHeight: '1.6',
          }}
          showLineNumbers
          lineNumberStyle={{ color: '#4A5568', fontSize: '0.7rem', minWidth: '3em' }}
          wrapLongLines
        >
          {code}
        </SyntaxHighlighter>
      </ScrollArea>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Main Page Component
   ═══════════════════════════════════════════ */
export default function HeroPerformancePage() {
  const [activeSkillDemo, setActiveSkillDemo] = useState<string>('AOE');
  const [activeCodeFile, setActiveCodeFile] = useState(0);

  return (
    <div className="min-h-screen flex flex-col bg-[#0a0b10] text-[#E5E7EB]">
      {/* ─── Sticky Header ─── */}
      <header className="sticky top-0 z-50 bg-[#0a0b10]/92 backdrop-blur-xl border-b border-[#1F2937]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Title bar */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#C23B22] to-[#C4973B] flex items-center justify-center shadow-lg shadow-[#C23B22]/20"
                whileHover={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 0.4 }}
              >
                <Swords className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h1 className="text-lg font-bold text-[#F5F0E8] tracking-wider">九州争鼎</h1>
                <p className="text-[10px] text-[#6B7280] tracking-widest">HERO PERFORMANCE SYSTEM</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-[#C4973B]/40 text-[#C4973B] text-xs hidden sm:inline-flex">
                v2.0 · 武将表现系统
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* ─── Main Content ─── */}
      <main className="flex-1 w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
          <Tabs defaultValue="gallery" className="w-full">
            <TabsList className="bg-[#111318] border border-[#1F2937] p-1 h-auto w-full flex flex-wrap">
              {[
                { value: 'gallery', label: '武将画廊', icon: Crown },
                { value: 'prompts', label: 'SD Prompt', icon: Palette },
                { value: 'skills', label: '技能系统', icon: Gamepad2 },
                { value: 'code', label: 'Unity 代码', icon: Code2 },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="flex items-center gap-2 px-4 py-2.5 text-xs data-[state=active]:bg-[#C4973B]/12 data-[state=active]:text-[#C4973B] data-[state=active]:shadow-none rounded-md transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {/* ═══════════════════════════════════
               TAB 1: Hero Gallery
            ═══════════════════════════════════ */}
            <TabsContent value="gallery" className="mt-6">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
              >
                {/* Section Header */}
                <motion.div variants={fadeInUp} className="mb-6">
                  <h2 className="text-xl font-bold text-[#F5F0E8] flex items-center gap-2">
                    <Crown className="w-5 h-5 text-[#C4973B]" />
                    武将画廊
                  </h2>
                  <p className="text-sm text-[#6B7280] mt-1">
                    共 {HEROES.length} 位武将 · {HEROES.filter(h => h.rarity === 'SSR').length} SSR · {HEROES.filter(h => h.rarity === 'SR').length} SR · 点击查看详情
                  </p>
                  <Separator className="bg-[#C4973B]/20 mt-3" />
                </motion.div>

                {/* Stats bar */}
                <motion.div variants={fadeInUp} className="flex flex-wrap gap-3 mb-6">
                  {Object.entries(FACTION).map(([key, f]) => {
                    const count = HEROES.filter(h => h.faction === key).length;
                    return (
                      <div key={key} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1F2937] bg-[#111318]">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                        <span className="text-xs text-[#9CA3AF]">{f.label}</span>
                        <span className="text-xs font-bold text-[#E5E7EB]">{count}</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1F2937] bg-[#111318]">
                    <div className="w-2 h-2 rounded-full bg-[#FFD700]" />
                    <span className="text-xs text-[#9CA3AF]">SSR</span>
                    <span className="text-xs font-bold text-[#E5E7EB]">{HEROES.filter(h => h.rarity === 'SSR').length}</span>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1F2937] bg-[#111318]">
                    <div className="w-2 h-2 rounded-full bg-[#C77DFF]" />
                    <span className="text-xs text-[#9CA3AF]">SR</span>
                    <span className="text-xs font-bold text-[#E5E7EB]">{HEROES.filter(h => h.rarity === 'SR').length}</span>
                  </div>
                </motion.div>

                {/* Hero Grid */}
                <motion.div
                  className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-4 sm:gap-6"
                  variants={staggerContainer}
                >
                  {HEROES.map((hero, i) => (
                    <HeroCard key={hero.id} hero={hero} index={i} />
                  ))}
                </motion.div>
              </motion.div>
            </TabsContent>

            {/* ═══════════════════════════════════
               TAB 2: SD Prompt Generator
            ═══════════════════════════════════ */}
            <TabsContent value="prompts" className="mt-6">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="space-y-6"
              >
                <motion.div variants={fadeInUp}>
                  <h2 className="text-xl font-bold text-[#F5F0E8] flex items-center gap-2">
                    <Palette className="w-5 h-5 text-[#C4973B]" />
                    SD Prompt 生成器
                  </h2>
                  <p className="text-sm text-[#6B7280] mt-1">
                    AI武将肖像生成 · Stable Diffusion Prompt 模板
                  </p>
                  <Separator className="bg-[#C4973B]/20 mt-3" />
                </motion.div>

                {/* Template Builder */}
                <motion.div variants={fadeInUp}>
                  <PromptTemplateBuilder />
                </motion.div>

                {/* All Prompts List */}
                <motion.div variants={fadeInUp} className="space-y-4">
                  <h3 className="text-sm font-bold text-[#E5E7EB] flex items-center gap-2">
                    <Scroll className="w-4 h-4 text-[#C4973B]" />
                    全武将 Prompt 列表
                  </h3>
                  <div className="space-y-3">
                    {HEROES.map((hero) => {
                      const r = RARITY[hero.rarity];
                      return (
                        <motion.div
                          key={hero.id}
                          className="p-4 rounded-xl border border-[#1F2937] bg-[#111318] hover:border-[#2A2D3A] transition-colors"
                          whileHover={{ x: 2 }}
                        >
                          <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={hero.portrait}
                                alt={hero.name}
                                className="w-10 h-10 rounded-lg object-cover border"
                                style={{ borderColor: `${r.color}30` }}
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-bold" style={{ color: r.color }}>{hero.name}</span>
                                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-[#1F2937] text-[#6B7280]">
                                    {hero.title}
                                  </Badge>
                                </div>
                                <div className="flex gap-1.5 mt-1">
                                  {hero.keywords.map((kw) => (
                                    <span key={kw} className="text-[9px] px-1.5 py-0.5 rounded bg-[#0d0e14] text-[#4A5568]">{kw}</span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <CopyButton text={hero.sdPrompt} label="Prompt" />
                          </div>
                          <div className="p-3 rounded-lg bg-[#0d0e14] border border-[#1F2937]/50">
                            <p className="text-xs text-[#9CA3AF] leading-relaxed font-mono">{hero.sdPrompt}</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              </motion.div>
            </TabsContent>

            {/* ═══════════════════════════════════
               TAB 3: Skill System
            ═══════════════════════════════════ */}
            <TabsContent value="skills" className="mt-6">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="space-y-6"
              >
                <motion.div variants={fadeInUp}>
                  <h2 className="text-xl font-bold text-[#F5F0E8] flex items-center gap-2">
                    <Gamepad2 className="w-5 h-5 text-[#C4973B]" />
                    技能表现系统
                  </h2>
                  <p className="text-sm text-[#6B7280] mt-1">
                    粒子特效 · 动画系统 · 音效控制 · 技能类型演示
                  </p>
                  <Separator className="bg-[#C4973B]/20 mt-3" />
                </motion.div>

                {/* Skill type selector & demo */}
                <motion.div variants={fadeInUp} className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#E5E7EB] flex items-center gap-2">
                      <Radio className="w-4 h-4 text-[#C4973B]" />
                      技能类型实时演示
                    </h3>
                  </div>
                  {/* Type selector */}
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(SKILL_TYPES).map(([key, st]) => (
                      <button
                        key={key}
                        onClick={() => setActiveSkillDemo(key)}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium transition-all border',
                          activeSkillDemo === key
                            ? cn('bg-gradient-to-r shadow-lg', st.gradient)
                            : 'border-[#1F2937] text-[#6B7280] hover:text-[#E5E7EB] hover:border-[#2A2D3A] bg-[#111318]'
                        )}
                        style={activeSkillDemo === key ? { borderColor: st.color + '40' } : undefined}
                      >
                        <st.icon className="w-4 h-4" style={{ color: st.color }} />
                        <span style={{ color: activeSkillDemo === key ? st.color : undefined }}>
                          {st.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Demo area */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeSkillDemo}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}
                    >
                      {SKILL_DEMOS[activeSkillDemo]}
                    </motion.div>
                  </AnimatePresence>

                  {/* Skill type description */}
                  {(() => {
                    const st = SKILL_TYPES[activeSkillDemo as keyof typeof SKILL_TYPES];
                    const descriptions: Record<string, { effects: string[]; tech: string[] }> = {
                      AOE: {
                        effects: ['红色/橙色粒子爆炸效果', '360度扩散圆环', '伤害数字浮动显示', '屏幕震动反馈', '子粒子火花飞溅'],
                        tech: ['ParticleSystem Cone Shape', 'Color Over Lifetime 渐变', 'Sub Emitter 火花', 'Point Light 动态光照', 'Camera Shake 衰减震动'],
                      },
                      Single: {
                        effects: ['聚焦光束贯穿效果', '粒子拖尾 Trail', '暴击伤害放大显示', '冲击波环形扩散', '屏幕闪白效果'],
                        tech: ['SingleLine Shape 光束', 'Trails Module 拖尾', 'Width Over Trail 渐细', 'Screen Flash 全屏闪白', 'Slow Motion 命中减速'],
                      },
                      Control: {
                        effects: ['冰冻蓝色晶体环绕', '眩晕星星旋转指示', '锁链禁锢视觉效果', '目标行动状态标记', '持续效果呼吸光环'],
                        tech: ['Sphere Shape 持续发射', 'Rotation Over Lifetime 旋转', 'Material Override 冰冻材质', 'Animator Speed 减速控制', 'Status Indicator 状态指示'],
                      },
                      Buff: {
                        effects: ['绿/金色上升粒子', '光环脉冲扩散效果', '属性提升数字标识', '友方连线增益指示', '全队范围光环覆盖'],
                        tech: ['Gravity Modifier 上升漂浮', 'Loop 循环粒子', 'Min/Max Curve 脉冲', 'AudioSource 增益音效', 'Prefab Pool 粒子池化'],
                      },
                    };
                    const desc = descriptions[activeSkillDemo];
                    return (
                      <motion.div
                        key={`desc-${activeSkillDemo}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4"
                      >
                        <Card className="bg-[#111318] border-[#1F2937]">
                          <CardHeader className="pb-2 pt-3 px-4">
                            <CardTitle className="text-xs text-[#9CA3AF]">表现效果</CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-3">
                            <ul className="space-y-1.5">
                              {desc.effects.map((e) => (
                                <li key={e} className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                                  <ChevronRight className="w-3 h-3 shrink-0" style={{ color: st.color }} />
                                  {e}
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                        <Card className="bg-[#111318] border-[#1F2937]">
                          <CardHeader className="pb-2 pt-3 px-4">
                            <CardTitle className="text-xs text-[#9CA3AF]">技术实现</CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-3">
                            <ul className="space-y-1.5">
                              {desc.tech.map((t) => (
                                <li key={t} className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                                  <ChevronRight className="w-3 h-3 shrink-0" style={{ color: st.color }} />
                                  <span className="font-mono text-[10px]">{t}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })()}
                </motion.div>

                {/* Skill Tree */}
                <motion.div variants={fadeInUp}>
                  <SkillTreeView />
                </motion.div>

                {/* Skill Type Summary */}
                <motion.div variants={fadeInUp}>
                  <Card className="bg-[#111318] border-[#1F2937]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-[#9CA3AF] flex items-center gap-2">
                        <Layers className="w-4 h-4 text-[#C4973B]" />
                        技能类型统计
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {Object.entries(SKILL_TYPES).map(([key, st]) => {
                          const count = HEROES.reduce((acc, h) => acc + h.skills.filter(s => s.type === key).length, 0);
                          return (
                            <motion.div
                              key={key}
                              className="p-3 rounded-lg border text-center bg-gradient-to-b"
                              style={{
                                borderColor: `${st.color}20`,
                                background: `linear-gradient(to bottom, ${st.color}08, transparent)`,
                              }}
                              whileHover={{ scale: 1.02, borderColor: `${st.color}40` }}
                            >
                              <st.icon className="w-6 h-6 mx-auto mb-2" style={{ color: st.color }} />
                              <div className="text-lg font-bold" style={{ color: st.color }}>{count}</div>
                              <div className="text-[10px] text-[#6B7280]">{st.label}</div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </TabsContent>

            {/* ═══════════════════════════════════
               TAB 4: Unity Code
            ═══════════════════════════════════ */}
            <TabsContent value="code" className="mt-6">
              <motion.div
                initial="hidden"
                animate="visible"
                variants={staggerContainer}
                className="space-y-6"
              >
                <motion.div variants={fadeInUp}>
                  <h2 className="text-xl font-bold text-[#F5F0E8] flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-[#C4973B]" />
                    Unity C# 代码
                  </h2>
                  <p className="text-sm text-[#6B7280] mt-1">
                    武将表现系统完整源码 · {UNITY_FILES.length} 个文件
                  </p>
                  <Separator className="bg-[#C4973B]/20 mt-3" />
                </motion.div>

                {/* File tabs */}
                <motion.div variants={fadeInUp} className="space-y-4">
                  <div className="flex gap-1 overflow-x-auto pb-2">
                    {UNITY_FILES.map((file, i) => (
                      <button
                        key={file.name}
                        onClick={() => setActiveCodeFile(i)}
                        className={cn(
                          'shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border whitespace-nowrap',
                          activeCodeFile === i
                            ? 'border-[#C4973B]/40 bg-[#C4973B]/10 text-[#C4973B]'
                            : 'border-[#1F2937] text-[#6B7280] hover:text-[#E5E7EB] hover:border-[#2A2D3A] bg-[#111318]'
                        )}
                      >
                        <Braces className="w-3.5 h-3.5" />
                        <span className="font-mono">{file.name}</span>
                      </button>
                    ))}
                  </div>

                  {/* File description */}
                  <div className="flex items-center gap-3 px-1">
                    <Badge variant="outline" className="text-[10px] border-[#1F2937] text-[#6B7280] bg-[#111318]">
                      {UNITY_FILES[activeCodeFile].name}
                    </Badge>
                    <span className="text-xs text-[#6B7280]">{UNITY_FILES[activeCodeFile].desc}</span>
                  </div>

                  {/* Code block */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeCodeFile}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      <CodeBlock
                        code={UNITY_FILES[activeCodeFile].code}
                        language="csharp"
                        filename={UNITY_FILES[activeCodeFile].name}
                      />
                    </motion.div>
                  </AnimatePresence>
                </motion.div>

                {/* Architecture overview */}
                <motion.div variants={fadeInUp}>
                  <Card className="bg-[#111318] border-[#1F2937]">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm text-[#9CA3AF] flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-[#C4973B]" />
                        系统架构概览
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {[
                          { name: 'HeroPerformanceSystem', desc: '主控制器 — 单例模式，协调所有子系统', color: '#C23B22', role: 'Singleton Manager' },
                          { name: 'ParticleEffectFactory', desc: '粒子工厂 — 创建 AOE/单体/控制粒子效果', color: '#EF4444', role: 'Factory Pattern' },
                          { name: 'SkillAudioController', desc: '音效控制器 — AudioSource 对象池，连击递增音调', color: '#F59E0B', role: 'Audio Pool' },
                          { name: 'SkillAnimationController', desc: '动画控制器 — Animator 状态机，相机震动', color: '#3B82F6', role: 'Animation FSM' },
                          { name: 'SkillTypes / SkillConfig', desc: '数据结构 — 技能类型枚举，配置序列化类', color: '#8E44AD', role: 'Data Model' },
                        ].map((item) => (
                          <div
                            key={item.name}
                            className="flex items-center gap-4 p-3 rounded-lg border border-[#1F2937] bg-[#0d0e14] hover:border-[#2A2D3A] transition-colors"
                          >
                            <div
                              className="w-2 h-8 rounded-full shrink-0"
                              style={{ backgroundColor: item.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono font-bold text-[#E5E7EB]">{item.name}</span>
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-[#1F2937] text-[#6B7280]">
                                  {item.role}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-[#6B7280] mt-0.5">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Copy all button */}
                <motion.div variants={fadeInUp}>
                  <Card className="bg-[#111318] border-[#1F2937]">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                          <h3 className="text-sm font-bold text-[#E5E7EB]">导出全部代码</h3>
                          <p className="text-xs text-[#6B7280] mt-0.5">复制 {UNITY_FILES.length} 个文件的完整 C# 代码</p>
                        </div>
                        <CopyButton
                          text={UNITY_FILES.map(f => `// ═══ ${f.name} ═══\n// ${f.desc}\n\n${f.code}`).join('\n\n\n')}
                          label="全部代码"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* ─── Sticky Footer ─── */}
      <footer className="mt-auto border-t border-[#1F2937]/60 bg-[#0a0b10]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#C23B22] to-[#C4973B] flex items-center justify-center">
                <Swords className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-xs text-[#9CA3AF]">九州争鼎 — Hero Performance System</p>
                <p className="text-[10px] text-[#4A5568]">SLG Card Game · Warring States Period</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-[#4A5568]">
              <span>Unity C# · Next.js 16 · TypeScript</span>
              <Separator orientation="vertical" className="h-3 bg-[#1F2937]" />
              <span>© 2024 Z.ai Team</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
