// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - 战国·楚汉争霸 UI 风格配置
// =============================================================================
// 描述：全局 UI 风格配置中心 —— 定义水墨风 + 金属质感的色彩体系、
//       品质颜色、阵营配色、动画参数等。所有面板共享此配置。
//       风格定位：先秦金文篆刻 + 水墨山水 + 青铜器纹理
// =============================================================================

using System;
using UnityEngine;

namespace Jiuzhou.Core.UI
{
    /// <summary>
    /// UI 风格配置 —— 战国·楚汉争霸主题。
    /// 水墨风底色 + 青铜金文边框 + 朱砂印章点缀
    /// </summary>
    public static class UIStyleConfig
    {
        // =====================================================================
        // §1 主题色板 —— 水墨 + 青铜 + 朱砂 + 楚漆
        // =====================================================================

        /// <summary>水墨底色（宣纸色）</summary>
        public static readonly Color InkPaper = new Color(0.94f, 0.91f, 0.86f, 1f);

        /// <summary>浓墨色（标题/强调文字）</summary>
        public static readonly Color InkDark = new Color(0.12f, 0.10f, 0.08f, 1f);

        /// <summary>淡墨色（正文文字）</summary>
        public static readonly Color InkLight = new Color(0.35f, 0.30f, 0.25f, 1f);

        /// <summary>朱砂红（楚汉主色调，用于按钮/边框/强调）</summary>
        public static readonly Color CinnabarRed = new Color(0.76f, 0.15f, 0.12f, 1f);

        /// <summary>深朱砂（重要按钮/危险操作）</summary>
        public static readonly Color CinnabarDeep = new Color(0.60f, 0.10f, 0.08f, 1f);

        /// <summary>青铜金（金属边框/SSR品质）</summary>
        public static readonly Color BronzeGold = new Color(0.85f, 0.70f, 0.30f, 1f);

        /// <summary>青铜暗金（次要金属元素）</summary>
        public static readonly Color BronzeDark = new Color(0.55f, 0.45f, 0.20f, 1f);

        /// <summary>楚漆黑（面板背景/弹窗遮罩）</summary>
        public static readonly Color LacquerBlack = new Color(0.08f, 0.06f, 0.05f, 0.92f);

        /// <summary>竹简黄（列表项背景/次要面板）</summary>
        public static readonly Color BambooYellow = new Color(0.96f, 0.93f, 0.82f, 1f);

        /// <summary>丝绸白（卡牌底色/内容区域）</summary>
        public static readonly Color SilkWhite = new Color(0.98f, 0.96f, 0.93f, 1f);

        /// <summary>翡翠绿（友好/成功状态）</summary>
        public static readonly Color JadeGreen = new Color(0.18f, 0.65f, 0.42f, 1f);

        /// <summary>琥珀橙（警告/倒计时）</summary>
        public static readonly Color AmberOrange = new Color(0.90f, 0.60f, 0.15f, 1f);

        // =====================================================================
        // §2 品质配色体系
        // =====================================================================

        /// <summary>品质颜色字典 —— 品质等级 → (名称, 主色, 边框色, 光效色)</summary>
        public static readonly Dictionary<int, RarityStyle> RarityStyles = new Dictionary<int, RarityStyle>
        {
            {
                1, new RarityStyle
                {
                    Name = "凡",
                    NameFull = "凡品",
                    PrimaryColor = new Color(0.60f, 0.58f, 0.55f, 1f),
                    BorderColor = new Color(0.50f, 0.48f, 0.45f, 1f),
                    GlowColor = new Color(0.70f, 0.68f, 0.65f, 0.3f),
                    ParticleColor = new Color(0.65f, 0.63f, 0.60f, 0.5f)
                }
            },
            {
                2, new RarityStyle
                {
                    Name = "良",
                    NameFull = "良品",
                    PrimaryColor = new Color(0.30f, 0.70f, 0.55f, 1f),
                    BorderColor = new Color(0.20f, 0.55f, 0.42f, 1f),
                    GlowColor = new Color(0.30f, 0.80f, 0.60f, 0.4f),
                    ParticleColor = new Color(0.35f, 0.75f, 0.58f, 0.6f)
                }
            },
            {
                3, new RarityStyle
                {
                    Name = "R",
                    NameFull = "稀有",
                    PrimaryColor = new Color(0.25f, 0.75f, 0.30f, 1f),
                    BorderColor = new Color(0.15f, 0.55f, 0.20f, 1f),
                    GlowColor = new Color(0.30f, 0.85f, 0.40f, 0.5f),
                    ParticleColor = new Color(0.35f, 0.80f, 0.45f, 0.7f)
                }
            },
            {
                4, new RarityStyle
                {
                    Name = "SR",
                    NameFull = "超稀有",
                    PrimaryColor = new Color(0.55f, 0.25f, 0.78f, 1f),
                    BorderColor = new Color(0.40f, 0.15f, 0.60f, 1f),
                    GlowColor = new Color(0.65f, 0.35f, 0.90f, 0.6f),
                    ParticleColor = new Color(0.70f, 0.40f, 0.95f, 0.8f)
                }
            },
            {
                5, new RarityStyle
                {
                    Name = "SSR",
                    NameFull = "传说",
                    PrimaryColor = new Color(0.92f, 0.75f, 0.20f, 1f),
                    BorderColor = new Color(0.75f, 0.58f, 0.10f, 1f),
                    GlowColor = new Color(1.00f, 0.85f, 0.30f, 0.7f),
                    ParticleColor = new Color(1.00f, 0.90f, 0.40f, 0.9f)
                }
            }
        };

        // =====================================================================
        // §3 阵营配色
        // =====================================================================

        public static readonly Dictionary<string, FactionStyle> FactionStyles = new Dictionary<string, FactionStyle>
        {
            {
                "wei", new FactionStyle
                {
                    Name = "魏",
                    NameFull = "曹魏",
                    PrimaryColor = new Color(0.20f, 0.40f, 0.75f, 1f),
                    LightColor = new Color(0.35f, 0.55f, 0.85f, 1f),
                    DescColor = new Color(0.90f, 0.92f, 0.95f, 1f)
                }
            },
            {
                "shu", new FactionStyle
                {
                    Name = "蜀",
                    NameFull = "蜀汉",
                    PrimaryColor = new Color(0.80f, 0.20f, 0.15f, 1f),
                    LightColor = new Color(0.90f, 0.35f, 0.30f, 1f),
                    DescColor = new Color(0.95f, 0.90f, 0.88f, 1f)
                }
            },
            {
                "wu", new FactionStyle
                {
                    Name = "吴",
                    NameFull = "东吴",
                    PrimaryColor = new Color(0.15f, 0.65f, 0.35f, 1f),
                    LightColor = new Color(0.25f, 0.75f, 0.50f, 1f),
                    DescColor = new Color(0.88f, 0.95f, 0.90f, 1f)
                }
            },
            {
                "qun", new FactionStyle
                {
                    Name = "群",
                    NameFull = "群雄",
                    PrimaryColor = new Color(0.60f, 0.50f, 0.30f, 1f),
                    LightColor = new Color(0.75f, 0.65f, 0.45f, 1f),
                    DescColor = new Color(0.93f, 0.90f, 0.85f, 1f)
                }
            }
        };

        // =====================================================================
        // §4 动画参数
        // =====================================================================

        /// <summary>水墨淡入淡出 —— 宣纸展开效果</summary>
        public static readonly AnimationConfig InkFadeIn = new AnimationConfig
        {
            Duration = 0.4f,
            Easing = EasingType.InkSpread
        };

        /// <summary>水墨淡出 —— 收卷效果</summary>
        public static readonly AnimationConfig InkFadeOut = new AnimationConfig
        {
            Duration = 0.3f,
            Easing = EasingType.InkRetract
        };

        /// <summary>滑动进入 —— 竹简展开</summary>
        public static readonly AnimationConfig SlideIn = new AnimationConfig
        {
            Duration = 0.35f,
            Easing = EasingType.BambooUnroll
        };

        /// <summary>弹窗出现 —— 印章盖印</summary>
        public static readonly AnimationConfig StampIn = new AnimationConfig
        {
            Duration = 0.25f,
            Easing = EasingType.StampPress
        };

        /// <summary>SSR 抽卡 —— 金光破墨</summary>
        public static readonly AnimationConfig SSRReveal = new AnimationConfig
        {
            Duration = 1.5f,
            Easing = EasingType.GoldBreakInk
        };

        /// <summary>SR 抽卡 —— 紫雾弥漫</summary>
        public static readonly AnimationConfig SRReveal = new AnimationConfig
        {
            Duration = 1.0f,
            Easing = EasingType.PurpleMist
        };

        // =====================================================================
        // §5 边框样式
        // =====================================================================

        /// <summary>青铜纹边框参数</summary>
        public static readonly BorderStyle BronzeBorder = new BorderStyle
        {
            Width = 3f,
            Color = BronzeGold,
            CornerRadius = 4f,
            InnerGlowWidth = 1.5f,
            InnerGlowColor = new Color(1f, 0.85f, 0.40f, 0.3f)
        };

        /// <summary>朱砂印章边框</summary>
        public static readonly BorderStyle CinnabarBorder = new BorderStyle
        {
            Width = 2f,
            Color = CinnabarRed,
            CornerRadius = 2f,
            InnerGlowWidth = 1f,
            InnerGlowColor = new Color(0.90f, 0.30f, 0.25f, 0.4f)
        };

        /// <summary>水墨淡边框</summary>
        public static readonly BorderStyle InkBorder = new BorderStyle
        {
            Width = 1f,
            Color = new Color(0.40f, 0.35f, 0.30f, 0.6f),
            CornerRadius = 0f,
            InnerGlowWidth = 0f,
            InnerGlowColor = Color.clear
        };

        // =====================================================================
        // §6 字体大小规范
        // =====================================================================

        public const int FONT_SIZE_TITLE = 42;       // 面板标题（篆书风）
        public const int FONT_SIZE_SUBTITLE = 32;    // 区域标题（隶书风）
        public const int FONT_SIZE_BODY = 24;        // 正文（楷书风）
        public const int FONT_SIZE_CAPTION = 18;     // 辅助文字
        public const int FONT_SIZE_BADGE = 14;       // 角标/小标签

        // =====================================================================
        // §7 间距规范
        // =====================================================================

        public const float PADDING_XL = 32f;
        public const float PADDING_LG = 24f;
        public const float PADDING_MD = 16f;
        public const float PADDING_SM = 10f;
        public const float PADDING_XS = 6f;
        public const float GAP_LG = 20f;
        public const float GAP_MD = 12f;
        public const float GAP_SM = 8f;

        // =====================================================================
        // §8 缓动函数库
        // =====================================================================

        /// <summary>
        /// 缓动函数 —— 水墨扩散效果（先慢后快再缓）
        /// </summary>
        public static float EaseInkSpread(float t)
        {
            // 模拟墨水在宣纸上扩散的物理效果
            if (t < 0.3f) return Mathf.Lerp(0f, 0.2f, t / 0.3f);
            if (t < 0.7f) return Mathf.Lerp(0.2f, 0.85f, (t - 0.3f) / 0.4f);
            return Mathf.Lerp(0.85f, 1f, (t - 0.7f) / 0.3f);
        }

        /// <summary>
        /// 缓动函数 —— 印章盖压效果（快速按下+轻微回弹）
        /// </summary>
        public static float EaseStampPress(float t)
        {
            if (t < 0.15f) return Mathf.Lerp(0f, 1.15f, t / 0.15f);
            if (t < 0.35f) return Mathf.Lerp(1.15f, 0.92f, (t - 0.15f) / 0.2f);
            return Mathf.Lerp(0.92f, 1f, (t - 0.35f) / 0.65f);
        }

        /// <summary>
        /// 缓动函数 —— 竹简展开（匀速+末端缓停）
        /// </summary>
        public static float EaseBambooUnroll(float t)
        {
            return 1f - Mathf.Pow(1f - t, 2.5f);
        }

        /// <summary>
        /// 通用缓动选择
        /// </summary>
        public static float EvaluateEasing(float t, EasingType type)
        {
            switch (type)
            {
                case EasingType.InkSpread: return EaseInkSpread(t);
                case EasingType.StampPress: return EaseStampPress(t);
                case EasingType.BambooUnroll: return EaseBambooUnroll(t);
                case EasingType.GoldBreakInk: return 1f - Mathf.Pow(1f - t, 4f);
                case EasingType.PurpleMist: return EaseInkSpread(t);
                case EasingType.InkRetract: return t * t * t;
                default: return t;
            }
        }
    }

    // =========================================================================
    // 数据结构
    // =========================================================================

    /// <summary>品质样式配置</summary>
    [Serializable]
    public struct RarityStyle
    {
        public string Name;
        public string NameFull;
        public Color PrimaryColor;
        public Color BorderColor;
        public Color GlowColor;
        public Color ParticleColor;
    }

    /// <summary>阵营样式配置</summary>
    [Serializable]
    public struct FactionStyle
    {
        public string Name;
        public string NameFull;
        public Color PrimaryColor;
        public Color LightColor;
        public Color DescColor;
    }

    /// <summary>动画配置</summary>
    [Serializable]
    public struct AnimationConfig
    {
        public float Duration;
        public EasingType Easing;
    }

    /// <summary>边框样式</summary>
    [Serializable]
    public struct BorderStyle
    {
        public float Width;
        public Color Color;
        public float CornerRadius;
        public float InnerGlowWidth;
        public Color InnerGlowColor;
    }

    /// <summary>缓动类型枚举</summary>
    public enum EasingType
    {
        Linear,
        InkSpread,       // 水墨扩散
        StampPress,      // 印章盖压
        BambooUnroll,    // 竹简展开
        GoldBreakInk,    // 金光破墨
        PurpleMist,      // 紫雾弥漫
        InkRetract       // 水墨收回
    }
}
