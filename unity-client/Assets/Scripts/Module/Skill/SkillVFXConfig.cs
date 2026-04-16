// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Skill System
// =============================================================================
// 描述：技能视觉特效配置 —— 定义技能的粒子特效、音效、动画等表现参数。
//       支持按元素属性（Fire/Water/Wind/Thunder/Ice/Dark/Light）预设特效。
//       通过 ScriptableObject 实现美术人员可视化编辑。
// =============================================================================

using System.Collections.Generic;
using UnityEngine;

namespace Jiuzhou.Zhengding.Module.Skill
{
    // ============================================================
    // 枚举定义
    // ============================================================

    /// <summary>
    /// 元素属性枚举 —— 对应战国楚汉英雄体系
    /// </summary>
    public enum ElementType
    {
        Fire = 0,       // 火 —— 红橙色系，爆炸/燃烧
        Water = 1,      // 水 —— 蓝青色系，波纹/治愈
        Wind = 2,       // 风 —— 绿白色系，旋风/切割
        Thunder = 3,    // 雷 —— 金黄色系，闪电/电弧
        Ice = 4,        // 冰 —— 冰蓝色系，冰晶/冻结
        Dark = 5,       // 暗 —— 紫黑色系，暗影/侵蚀
        Light = 6       // 光 —— 金白色系，圣光/净化
    }

    /// <summary>
    /// 技能目标类型
    /// </summary>
    public enum SkillTargetType
    {
        SingleEnemy,    // 单体敌方
        AllEnemies,     // 全体敌方（AOE）
        Self,           // 自身
        SingleAlly,     // 单体友方
        AllAllies,      // 全体友方
        RandomEnemy,    // 随机敌方
        FrontRow,       // 敌方前排
        BackRow,        // 敌方后排
        CrossArea,      // 十字范围
        RowLine         // 一排
    }

    /// <summary>
    /// 技能分类
    /// </summary>
    public enum SkillCategory
    {
        Attack,         // 攻击型
        Defense,        // 防御型
        Support,        // 辅助型
        Control,        // 控制型
        Utility         // 实用型
    }

    /// <summary>
    /// 特效层类型 —— 决定粒子特效的渲染层级
    /// </summary>
    public enum VFXLayer
    {
        Ground = 0,     // 地面层（波纹、法阵）
        Body = 1,       // 身体层（光环、护盾）
        Air = 2,        // 空中层（火焰、闪电）
        Overlay = 3     // 覆盖层（全屏闪光）
    }

    /// <summary>
    /// 屏幕震动强度
    /// </summary>
    public enum ShakeIntensity
    {
        None = 0,
        Light = 1,      // 轻微震动（普通攻击）
        Medium = 2,     // 中等震动（SR技能）
        Heavy = 3,      // 强烈震动（SSR技能）
        Extreme = 4     // 极限震动（终结技）
    }

    /// <summary>
    /// 动画触发时机
    /// </summary>
    public enum AnimationTriggerTiming
    {
        OnCastStart,        // 释放开始
        OnProjectileFire,   // 发射弹道
        OnProjectileHit,    // 弹道命中
        OnEffectApply,      // 效果生效
        OnCastEnd           // 释放结束
    }

    // ============================================================
    // 配置数据结构
    // ============================================================

    /// <summary>
    /// 技能特效完整配置（ScriptableObject）
    /// </summary>
    [CreateAssetMenu(fileName = "SkillVFXProfile", menuName = "九州争鼎/技能/特效配置")]
    public class SkillVFXProfile : ScriptableObject
    {
        [Header("━━━ 基础信息 ━━━")]
        [SerializeField] private int skillId;
        [SerializeField] private string skillName;
        [SerializeField] private ElementType element;
        [SerializeField] private SkillCategory category;
        [SerializeField] private int rarity;            // 3=R, 4=SR, 5=SSR
        [SerializeField] private string description;

        [Header("━━━ 目标与范围 ━━━")]
        [SerializeField] private SkillTargetType targetType;
        [SerializeField] private float castRange = 5f;         // 释放范围
        [SerializeField] private float effectRadius = 2f;      // 效果半径
        [SerializeField] private float projectileSpeed = 10f;  // 弹道速度
        [SerializeField] private bool hasProjectile = false;   // 是否有弹道

        [Header("━━━ 施法动画 ━━━")]
        [SerializeField] private float castDuration = 0.8f;    // 施法总时长
        [SerializeField] private string castAnimationName;     // 施法动画名
        [SerializeField] private float animSpeedMultiplier = 1f;
        [SerializeField] private AnimationTriggerTiming timing;

        [Header("━━━ 粒子特效 ━━━")]
        [SerializeField] private ParticleEffectConfig castParticle;       // 施法粒子
        [SerializeField] private ParticleEffectConfig hitParticle;        // 命中粒子
        [SerializeField] private ParticleEffectConfig trailParticle;      // 弹道拖尾
        [SerializeField] private ParticleEffectConfig groundParticle;     // 地面特效
        [SerializeField] private ParticleEffectConfig buffParticle;       // Buff/增益特效

        [Header("━━━ 屏幕效果 ━━━")]
        [SerializeField] private ShakeIntensity screenShake = ShakeIntensity.None;
        [SerializeField] private float shakeDuration = 0.3f;
        [SerializeField] private float slowMotionScale = 0f;             // 0=不触发慢动作, 0.3=30%速度
        [SerializeField] private float slowMotionDuration = 0.2f;
        [SerializeField] private Color flashColor = Color.clear;
        [SerializeField] private float flashDuration = 0.1f;

        [Header("━━━ 音效配置 ━━━")]
        [SerializeField] private AudioConfig castAudio;           // 施法音效
        [SerializeField] private AudioConfig hitAudio;            // 命中音效
        [SerializeField] private AudioConfig ambientAudio;        // 环境音效
        [SerializeField] private AudioConfig voiceAudio;          // 语音台词

        [Header("━━━ 伤害数字 ━━━")]
        [SerializeField] private bool showDamageNumbers = true;
        [SerializeField] private DamageNumberStyle damageNumberStyle;
        [SerializeField] private float damageNumberScale = 1f;

        [Header("━━━ Buff/Debuff 特效 ━━━")]
        [SerializeField] private List<BuffVFXConfig> appliedBuffs = new List<BuffVFXConfig>();

        // ── 属性访问器 ──
        public int SkillId { get => skillId; set => skillId = value; }
        public string SkillName { get => skillName; set => skillName = value; }
        public ElementType Element { get => element; set => element = value; }
        public SkillCategory Category { get => category; set => category = value; }
        public int Rarity { get => rarity; set => rarity = value; }
        public string Description { get => description; set => description = value; }
        public SkillTargetType TargetType { get => targetType; set => targetType = value; }
        public float CastRange { get => castRange; set => castRange = value; }
        public float EffectRadius { get => effectRadius; set => effectRadius = value; }
        public float ProjectileSpeed { get => projectileSpeed; set => projectileSpeed = value; }
        public bool HasProjectile { get => hasProjectile; set => hasProjectile = value; }
        public float CastDuration { get => castDuration; set => castDuration = value; }
        public string CastAnimationName { get => castAnimationName; set => castAnimationName = value; }
        public float AnimSpeedMultiplier { get => animSpeedMultiplier; set => animSpeedMultiplier = value; }
        public AnimationTriggerTiming Timing { get => timing; set => timing = value; }
        public ParticleEffectConfig CastParticle { get => castParticle; set => castParticle = value; }
        public ParticleEffectConfig HitParticle { get => hitParticle; set => hitParticle = value; }
        public ParticleEffectConfig TrailParticle { get => trailParticle; set => trailParticle = value; }
        public ParticleEffectConfig GroundParticle { get => groundParticle; set => groundParticle = value; }
        public ParticleEffectConfig BuffParticle { get => buffParticle; set => buffParticle = value; }
        public ShakeIntensity ScreenShake { get => screenShake; set => screenShake = value; }
        public float ShakeDuration { get => shakeDuration; set => shakeDuration = value; }
        public float SlowMotionScale { get => slowMotionScale; set => slowMotionScale = value; }
        public float SlowMotionDuration { get => slowMotionDuration; set => slowMotionDuration = value; }
        public Color FlashColor { get => flashColor; set => flashColor = value; }
        public float FlashDuration { get => flashDuration; set => flashDuration = value; }
        public AudioConfig CastAudio { get => castAudio; set => castAudio = value; }
        public AudioConfig HitAudio { get => hitAudio; set => hitAudio = value; }
        public AudioConfig AmbientAudio { get => ambientAudio; set => ambientAudio = value; }
        public AudioConfig VoiceAudio { get => voiceAudio; set => voiceAudio = value; }
        public bool ShowDamageNumbers { get => showDamageNumbers; set => showDamageNumbers = value; }
        public DamageNumberStyle DamageNumberStyle { get => damageNumberStyle; set => damageNumberStyle = value; }
        public float DamageNumberScale { get => damageNumberScale; set => damageNumberScale = value; }
        public List<BuffVFXConfig> AppliedBuffs { get => appliedBuffs; set => appliedBuffs = value; }

        /// <summary>
        /// 获取元素默认颜色
        /// </summary>
        public Color GetElementColor()
        {
            return element switch
            {
                ElementType.Fire => new Color(1f, 0.4f, 0.1f),
                ElementType.Water => new Color(0.2f, 0.5f, 1f),
                ElementType.Wind => new Color(0.5f, 0.9f, 0.4f),
                ElementType.Thunder => new Color(1f, 0.9f, 0.2f),
                ElementType.Ice => new Color(0.6f, 0.85f, 1f),
                ElementType.Dark => new Color(0.5f, 0.1f, 0.8f),
                ElementType.Light => new Color(1f, 0.95f, 0.7f),
                _ => Color.white
            };
        }

        /// <summary>
        /// 获取稀有度文字颜色
        /// </summary>
        public Color GetRarityColor()
        {
            return rarity switch
            {
                5 => new Color(1f, 0.75f, 0f),      // SSR 金色
                4 => new Color(0.6f, 0.4f, 1f),      // SR 紫色
                3 => new Color(0.3f, 0.7f, 1f),      // R 蓝色
                _ => Color.white
            };
        }

        /// <summary>
        /// 获取元素中文名称
        /// </summary>
        public static string GetElementName(ElementType elem)
        {
            return elem switch
            {
                ElementType.Fire => "火",
                ElementType.Water => "水",
                ElementType.Wind => "风",
                ElementType.Thunder => "雷",
                ElementType.Ice => "冰",
                ElementType.Dark => "暗",
                ElementType.Light => "光",
                _ => "无"
            };
        }

        /// <summary>
        /// 获取目标类型中文名称
        /// </summary>
        public static string GetTargetTypeName(SkillTargetType type)
        {
            return type switch
            {
                SkillTargetType.SingleEnemy => "单体敌方",
                SkillTargetType.AllEnemies => "全体敌方",
                SkillTargetType.Self => "自身",
                SkillTargetType.SingleAlly => "单体友方",
                SkillTargetType.AllAllies => "全体友方",
                SkillTargetType.RandomEnemy => "随机敌方",
                SkillTargetType.FrontRow => "敌方前排",
                SkillTargetType.BackRow => "敌方后排",
                SkillTargetType.CrossArea => "十字范围",
                SkillTargetType.RowLine => "一排",
                _ => "未知"
            };
        }
    }

    // ============================================================
    // 子配置结构
    // ============================================================

    /// <summary>
    /// 粒子特效配置
    /// </summary>
    [System.Serializable]
    public class ParticleEffectConfig
    {
        [Tooltip("粒子预制体（必须包含 ParticleSystem）")]
        [SerializeField] private GameObject particlePrefab;

        [Tooltip("特效层级")]
        [SerializeField] private VFXLayer layer = VFXLayer.Body;

        [Tooltip("生命周期（秒），0=使用粒子系统自带时长")]
        [SerializeField] private float duration = 0f;

        [Tooltip("延迟播放（秒）")]
        [SerializeField] private float delay = 0f;

        [Tooltip("缩放倍率")]
        [SerializeField] private float scale = 1f;

        [Tooltip("是否跟随目标")]
        [SerializeField] private bool followTarget = false;

        [Tooltip("是否旋转面向目标")]
        [SerializeField] private bool lookAtTarget = true;

        [Tooltip("位置偏移")]
        [SerializeField] private Vector3 positionOffset = Vector3.zero;

        [Tooltip("是否在命中后倒放（淡出效果）")]
        [SerializeField] private bool fadeOutOnEnd = false;

        [Tooltip("颜色叠加")]
        [SerializeField] private Color colorTint = Color.white;

        [Tooltip("是否使用对象池")]
        [SerializeField] private bool usePooling = true;

        public GameObject ParticlePrefab { get => particlePrefab; set => particlePrefab = value; }
        public VFXLayer Layer { get => layer; set => layer = value; }
        public float Duration { get => duration; set => duration = value; }
        public float Delay { get => delay; set => delay = value; }
        public float Scale { get => scale; set => scale = value; }
        public bool FollowTarget { get => followTarget; set => followTarget = value; }
        public bool LookAtTarget { get => lookAtTarget; set => lookAtTarget = value; }
        public Vector3 PositionOffset { get => positionOffset; set => positionOffset = value; }
        public bool FadeOutOnEnd { get => fadeOutOnEnd; set => fadeOutOnEnd = value; }
        public Color ColorTint { get => colorTint; set => colorTint = value; }
        public bool UsePooling { get => usePooling; set => usePooling = value; }

        /// <summary>
        /// 配置是否有效（有预制体）
        /// </summary>
        public bool IsValid => particlePrefab != null;
    }

    /// <summary>
    /// 音效配置
    /// </summary>
    [System.Serializable]
    public class AudioConfig
    {
        [Tooltip("音频资源路径（Resources/）")]
        [SerializeField] private string resourcePath;

        [Tooltip("直接引用 AudioClip")]
        [SerializeField] private AudioClip audioClip;

        [Tooltip("音量缩放")]
        [Range(0f, 2f)]
        [SerializeField] private float volumeScale = 1f;

        [Tooltip("音调偏移")]
        [Range(0.5f, 2f)]
        [SerializeField] private float pitch = 1f;

        [Tooltip("是否3D空间音效")]
        [SerializeField] private bool is3D = false;

        [Tooltip("3D最大距离")]
        [SerializeField] private float maxDistance = 20f;

        [Tooltip("延迟播放（秒）")]
        [SerializeField] private float delay = 0f;

        [Tooltip("是否循环")]
        [SerializeField] private bool loop = false;

        [Tooltip("淡入时间（秒）")]
        [SerializeField] private float fadeIn = 0f;

        public string ResourcePath { get => resourcePath; set => resourcePath = value; }
        public AudioClip AudioClip { get => audioClip; set => audioClip = value; }
        public float VolumeScale { get => volumeScale; set => volumeScale = value; }
        public float Pitch { get => pitch; set => pitch = value; }
        public bool Is3D { get => is3D; set => is3D = value; }
        public float MaxDistance { get => maxDistance; set => maxDistance = value; }
        public float Delay { get => delay; set => delay = value; }
        public bool Loop { get => loop; set => loop = value; }
        public float FadeIn { get => fadeIn; set => fadeIn = value; }

        /// <summary>
        /// 配置是否有效
        /// </summary>
        public bool IsValid => !string.IsNullOrEmpty(resourcePath) || audioClip != null;
    }

    /// <summary>
    /// 伤害数字样式
    /// </summary>
    [System.Serializable]
    public class DamageNumberStyle
    {
        [Tooltip("伤害数字预制体")]
        [SerializeField] private GameObject normalPrefab;
        [SerializeField] private GameObject criticalPrefab;
        [SerializeField] private GameObject healPrefab;
        [SerializeField] private GameObject missPrefab;

        [Tooltip("飘字持续时间")]
        [SerializeField] private float displayDuration = 1.2f;

        [Tooltip("飘字高度")]
        [SerializeField] private float floatHeight = 80f;

        [Tooltip("随机水平偏移")]
        [SerializeField] private float randomOffsetX = 30f;

        public GameObject NormalPrefab { get => normalPrefab; set => normalPrefab = value; }
        public GameObject CriticalPrefab { get => criticalPrefab; set => criticalPrefab = value; }
        public GameObject HealPrefab { get => healPrefab; set => healPrefab = value; }
        public GameObject MissPrefab { get => missPrefab; set => missPrefab = value; }
        public float DisplayDuration { get => displayDuration; set => displayDuration = value; }
        public float FloatHeight { get => floatHeight; set => floatHeight = value; }
        public float RandomOffsetX { get => randomOffsetX; set => randomOffsetX = value; }
    }

    /// <summary>
    /// Buff/Debuff 视觉效果配置
    /// </summary>
    [System.Serializable]
    public class BuffVFXConfig
    {
        [Tooltip("Buff名称")]
        [SerializeField] private string buffName;

        [Tooltip("是否为增益")]
        [SerializeField] private bool isBuff = true;

        [Tooltip("持续粒子特效")]
        [SerializeField] private ParticleEffectConfig tickParticle;

        [Tooltip("叠加时的闪光特效")]
        [SerializeField] private ParticleEffectConfig stackParticle;

        [Tooltip("Buff图标（可选）")]
        [SerializeField] private Sprite icon;

        [Tooltip("图标颜色")]
        [SerializeField] private Color iconColor = Color.white;

        [Tooltip("附着位置偏移")]
        [SerializeField] private Vector3 attachOffset = new Vector3(0f, 2f, 0f);

        public string BuffName { get => buffName; set => buffName = value; }
        public bool IsBuff { get => isBuff; set => isBuff = value; }
        public ParticleEffectConfig TickParticle { get => tickParticle; set => tickParticle = value; }
        public ParticleEffectConfig StackParticle { get => stackParticle; set => stackParticle = value; }
        public Sprite Icon { get => icon; set => icon = value; }
        public Color IconColor { get => iconColor; set => iconColor = value; }
        public Vector3 AttachOffset { get => attachOffset; set => attachOffset = value; }
    }

    // ============================================================
    // 元素默认特效参数（运行时配置表）
    // ============================================================

    /// <summary>
    /// 元素默认特效配置表 —— 按元素属性提供默认视觉参数
    /// </summary>
    public static class ElementDefaults
    {
        /// <summary>各元素主色调</summary>
        public static readonly Dictionary<ElementType, Color> Colors = new Dictionary<ElementType, Color>
        {
            { ElementType.Fire,    new Color(1f, 0.4f, 0.1f) },
            { ElementType.Water,   new Color(0.2f, 0.5f, 1f) },
            { ElementType.Wind,    new Color(0.5f, 0.9f, 0.4f) },
            { ElementType.Thunder, new Color(1f, 0.9f, 0.2f) },
            { ElementType.Ice,     new Color(0.6f, 0.85f, 1f) },
            { ElementType.Dark,    new Color(0.5f, 0.1f, 0.8f) },
            { ElementType.Light,   new Color(1f, 0.95f, 0.7f) }
        };

        /// <summary>各元素粒子资源路径</summary>
        public static readonly Dictionary<ElementType, string> ParticlePaths = new Dictionary<ElementType, string>
        {
            { ElementType.Fire,    "VFX/Elements/Fire_Burst" },
            { ElementType.Water,   "VFX/Elements/Water_Wave" },
            { ElementType.Wind,    "VFX/Elements/Wind_Slash" },
            { ElementType.Thunder, "VFX/Elements/Thunder_Strike" },
            { ElementType.Ice,     "VFX/Elements/Ice_Crystal" },
            { ElementType.Dark,    "VFX/Elements/Dark_Vortex" },
            { ElementType.Light,   "VFX/Elements/Light_Beam" }
        };

        /// <summary>各元素音效资源路径</summary>
        public static readonly Dictionary<ElementType, string> CastAudioPaths = new Dictionary<ElementType, string>
        {
            { ElementType.Fire,    "Audio/SFX/Skill/Fire_Cast" },
            { ElementType.Water,   "Audio/SFX/Skill/Water_Cast" },
            { ElementType.Wind,    "Audio/SFX/Skill/Wind_Cast" },
            { ElementType.Thunder, "Audio/SFX/Skill/Thunder_Cast" },
            { ElementType.Ice,     "Audio/SFX/Skill/Ice_Cast" },
            { ElementType.Dark,    "Audio/SFX/Skill/Dark_Cast" },
            { ElementType.Light,   "Audio/SFX/Skill/Light_Cast" }
        };

        /// <summary>各元素命中音效路径</summary>
        public static readonly Dictionary<ElementType, string> HitAudioPaths = new Dictionary<ElementType, string>
        {
            { ElementType.Fire,    "Audio/SFX/Skill/Fire_Hit" },
            { ElementType.Water,   "Audio/SFX/Skill/Water_Hit" },
            { ElementType.Wind,    "Audio/SFX/Skill/Wind_Hit" },
            { ElementType.Thunder, "Audio/SFX/Skill/Thunder_Hit" },
            { ElementType.Ice,     "Audio/SFX/Skill/Ice_Hit" },
            { ElementType.Dark,    "Audio/SFX/Skill/Dark_Hit" },
            { ElementType.Light,   "Audio/SFX/Skill/Light_Hit" }
        };

        /// <summary>各元素屏幕震动强度</summary>
        public static readonly Dictionary<ElementType, ShakeIntensity> DefaultShakes = new Dictionary<ElementType, ShakeIntensity>
        {
            { ElementType.Fire,    ShakeIntensity.Medium },
            { ElementType.Water,   ShakeIntensity.Light },
            { ElementType.Wind,    ShakeIntensity.Light },
            { ElementType.Thunder, ShakeIntensity.Heavy },
            { ElementType.Ice,     ShakeIntensity.Medium },
            { ElementType.Dark,    ShakeIntensity.Heavy },
            { ElementType.Light,   ShakeIntensity.Medium }
        };

        /// <summary>稀有度默认慢动作配置</summary>
        public static void GetRaritySlowMotion(int rarity, out float scale, out float duration)
        {
            switch (rarity)
            {
                case 5: scale = 0.15f; duration = 0.4f; break;  // SSR 强慢动作
                case 4: scale = 0.3f;  duration = 0.2f; break;  // SR 轻慢动作
                default: scale = 0f;    duration = 0f;   break;   // R 无慢动作
            }
        }

        /// <summary>获取元素粒子路径</summary>
        public static string GetParticlePath(ElementType element) =>
            ParticlePaths.TryGetValue(element, out var path) ? path : "VFX/Elements/Default";

        /// <summary>获取元素施法音效路径</summary>
        public static string GetCastAudioPath(ElementType element) =>
            CastAudioPaths.TryGetValue(element, out var path) ? path : "Audio/SFX/Skill/Default_Cast";

        /// <summary>获取元素命中音效路径</summary>
        public static string GetHitAudioPath(ElementType element) =>
            HitAudioPaths.TryGetValue(element, out var path) ? path : "Audio/SFX/Skill/Default_Hit";
    }
}
