// =============================================================================
// 九州争鼎 - 战国·楚汉争霸 武将卡牌渲染器
// =============================================================================
// 描述：武将卡牌通用渲染组件 —— 负责品质边框、动态光效、武将立绘布局。
//       挂载到卡牌预制体上，调用 Setup() 方法初始化显示。
//       设计规范：武将立绘占比70%，品质边框自动匹配颜色，SSR/SR有持续光效。
// =============================================================================

using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using Jiuzhou.Core.UI;

namespace Jiuzhou.Core.UI
{
    /// <summary>
    /// 武将卡牌渲染器 —— 战国·楚汉争霸风格。
    /// <para>布局规范：立绘70% + 信息区30%（品质徽章、武将名、势力、星级）</para>
    /// <para>品质系统：凡→良→R→SR→SSR，自动匹配边框颜色和光效</para>
    /// <para>动态边框：SSR金光流转、SR紫雾呼吸、R翡翠微光</para>
    /// </summary>
    [RequireComponent(typeof(CanvasGroup))]
    public class HeroCardRenderer : MonoBehaviour
    {
        // ── UI引用 ──

        [Header("卡牌背景")]
        [SerializeField] private Image cardBackground;
        [SerializeField] private Image cardFrame;         // 外边框（青铜纹）
        [SerializeField] private Image innerFrame;        // 内边框
        [SerializeField] private Image cornerDecorLeft;   // 左上角装饰
        [SerializeField] private Image cornerDecorRight;  // 右上角装饰

        [Header("武将立绘区域（70%）")]
        [SerializeField] private RectTransform portraitArea;
        [SerializeField] private Image portraitImage;     // 武将立绘
        [SerializeField] private Image portraitMask;      // 立绘遮罩（水墨渐隐）

        [Header("信息区域（30%）")]
        [SerializeField] private RectTransform infoArea;
        [SerializeField] private Image infoBackground;    // 信息区背景（竹简色）
        [SerializeField] private Text heroNameText;       // 武将名
        [SerializeField] private Text heroTitleText;      // 称号（如"武圣"、"卧龙"）
        [SerializeField] private Text factionText;        // 阵营（魏/蜀/吴/群）
        [SerializeField] private Text rarityBadgeText;    // 品质徽章
        [SerializeField] private Image rarityBadgeBg;     // 品质徽章背景
        [SerializeField] private Transform starContainer; // 星级容器
        [SerializeField] private Text levelText;          // 等级
        [SerializeField] private Text powerText;          // 战力

        [Header("动态效果")]
        [SerializeField] private Image glowOverlay;      // 全卡光效遮罩
        [SerializeField] private Outline outlineEffect;  // 边框光效
        [SerializeField] private ParticleSystem rarityParticle; // 品质粒子
        [SerializeField] private Image sealStamp;        // 印章（已拥有/未拥有）
        [SerializeField] private Image lockIcon;         // 锁定图标

        [Header("NEW标签")]
        [SerializeField] private GameObject newTag;
        [SerializeField] private Text newTagText;

        // ── 内部状态 ──

        private CanvasGroup _canvasGroup;
        private Coroutine _borderAnimCoroutine;
        private Coroutine _glowPulseCoroutine;
        private int _currentRarity;
        private bool _isAnimating;

        // ============================================================
        // 生命周期
        // ============================================================

        private void Awake()
        {
            _canvasGroup = GetComponent<CanvasGroup>();
            if (outlineEffect == null)
                outlineEffect = GetComponent<Outline>();
        }

        private void OnDestroy()
        {
            StopAnimations();
        }

        // ============================================================
        // 公开方法 —— 卡牌初始化
        // ============================================================

        /// <summary>
        /// 初始化卡牌显示。
        /// </summary>
        /// <param name="heroName">武将名称</param>
        /// <param name="title">称号（可为空）</param>
        /// <param name="rarity">品质等级（1~5）</param>
        /// <param name="faction">阵营键（wei/shu/wu/qun）</param>
        /// <param name="level">等级</param>
        /// <param name="star">星级</param>
        /// <param name="power">战力</param>
        /// <param name="isLocked">是否锁定</param>
        /// <param name="isNew">是否新获得</param>
        /// <param name="portrait">武将立绘Sprite</param>
        public void Setup(
            string heroName,
            string title,
            int rarity,
            string faction,
            int level,
            int star,
            int power,
            bool isLocked,
            bool isNew,
            Sprite portrait = null)
        {
            _currentRarity = Mathf.Clamp(rarity, 1, 5);
            StopAnimations();

            // 设置品质样式
            ApplyRarityStyle(_currentRarity);

            // 设置阵营样式
            ApplyFactionStyle(faction);

            // 设置文字信息
            SetTextSafe(heroNameText, heroName);
            SetTextSafe(heroTitleText, string.IsNullOrEmpty(title) ? "" : $"「{title}」");
            SetTextSafe(levelText, $"Lv.{level}");
            SetTextSafe(powerText, power.ToString());
            SetTextSafe(factionText, GetFactionName(faction));

            // 品质徽章
            if (UIStyleConfig.RarityStyles.TryGetValue(_currentRarity, out var style))
            {
                SetTextSafe(rarityBadgeText, style.Name);
                if (rarityBadgeBg != null) rarityBadgeBg.color = style.PrimaryColor;
                if (rarityBadgeText != null) rarityBadgeText.color = Color.white;
            }

            // 星级
            SetupStars(star);

            // 立绘
            if (portraitImage != null && portrait != null)
                portraitImage.sprite = portrait;

            // 锁定/NEW
            if (lockIcon != null) lockIcon.gameObject.SetActive(isLocked);
            if (newTag != null) newTag.SetActive(isNew);

            // 印章（已拥有标记）
            if (sealStamp != null)
            {
                sealStamp.gameObject.SetActive(!isNew);
                sealStamp.color = new Color(0.76f, 0.15f, 0.12f, 0.6f); // 朱砂色半透明
            }

            // 布局：立绘70% + 信息30%
            ApplyLayout();

            // 启动品质动画
            StartRarityAnimation(_currentRarity);
        }

        /// <summary>
        /// 简化版初始化 —— 仅设置品质和名称
        /// </summary>
        public void SetupSimple(string name, int rarity, Sprite portrait = null)
        {
            Setup(name, "", rarity, "", 1, 1, 0, false, false, portrait);
        }

        // ============================================================
        // 品质样式应用
        // ============================================================

        private void ApplyRarityStyle(int rarity)
        {
            if (!UIStyleConfig.RarityStyles.TryGetValue(rarity, out var style)) return;

            // 外边框
            if (cardFrame != null) cardFrame.color = style.BorderColor;

            // 内边框
            if (innerFrame != null) innerFrame.color = new Color(
                style.PrimaryColor.r, style.PrimaryColor.g, style.PrimaryColor.b, 0.3f);

            // 角落装饰
            if (cornerDecorLeft != null) cornerDecorLeft.color = style.PrimaryColor;
            if (cornerDecorRight != null) cornerDecorRight.color = style.PrimaryColor;

            // 卡牌背景
            if (cardBackground != null)
            {
                cardBackground.color = Color.Lerp(UIStyleConfig.SilkWhite, style.PrimaryColor, 0.05f);
            }

            // 信息区背景
            if (infoBackground != null)
            {
                infoBackground.color = Color.Lerp(UIStyleConfig.BambooYellow, style.PrimaryColor, 0.08f);
            }
        }

        private void ApplyFactionStyle(string faction)
        {
            if (string.IsNullOrEmpty(faction)) return;
            if (!UIStyleConfig.FactionStyles.TryGetValue(faction.ToLower(), out var style)) return;

            if (factionText != null) factionText.color = style.PrimaryColor;
        }

        // ============================================================
        // 品质动画
        // ============================================================

        private void StartRarityAnimation(int rarity)
        {
            switch (rarity)
            {
                case 5: // SSR —— 金光流转
                    StartBorderGlow(UIStyleConfig.RarityStyles[5].GlowColor, 2f, true);
                    StartGlowPulse(UIStyleConfig.RarityStyles[5].GlowColor, 0.6f);
                    if (rarityParticle != null) rarityParticle.Play();
                    break;

                case 4: // SR —— 紫雾呼吸
                    StartBorderGlow(UIStyleConfig.RarityStyles[4].GlowColor, 1.5f, false);
                    StartGlowPulse(UIStyleConfig.RarityStyles[4].GlowColor, 0.4f);
                    break;

                case 3: // R —— 翡翠微光
                    StartBorderGlow(UIStyleConfig.RarityStyles[3].GlowColor, 1f, false);
                    break;
            }
        }

        /// <summary>边框光效动画</summary>
        private void StartBorderGlow(Color glowColor, float intensity, bool continuous)
        {
            StopBorderAnimation();
            _borderAnimCoroutine = StartCoroutine(BorderGlowRoutine(glowColor, intensity, continuous));
        }

        private IEnumerator BorderGlowRoutine(Color glowColor, float intensity, bool continuous)
        {
            _isAnimating = true;

            if (continuous)
            {
                // 持续流转
                float time = 0f;
                while (_isAnimating)
                {
                    time += Time.deltaTime * 1.5f;
                    float pulse = (Mathf.Sin(time) + 1f) / 2f;
                    float edgePulse = (Mathf.Sin(time * 0.7f + 1f) + 1f) / 2f;

                    if (outlineEffect != null)
                    {
                        outlineEffect.effectColor = new Color(
                            glowColor.r, glowColor.g, glowColor.b,
                            0.3f + pulse * 0.7f * (intensity / 2f));
                        outlineEffect.effectDistance = new Vector2(
                            (1f + edgePulse * 2f) * intensity,
                            (1f + edgePulse * 2f) * intensity);
                    }

                    yield return null;
                }
            }
            else
            {
                // 单次闪烁
                float duration = 0.8f;
                float elapsed = 0f;
                while (elapsed < duration)
                {
                    elapsed += Time.deltaTime;
                    float t = Mathf.Clamp01(elapsed / duration);
                    float fade = t < 0.3f ? t / 0.3f : 1f - (t - 0.3f) / 0.7f;

                    if (outlineEffect != null)
                    {
                        outlineEffect.effectColor = new Color(
                            glowColor.r, glowColor.g, glowColor.b,
                            fade * 0.6f);
                        outlineEffect.effectDistance = new Vector2(
                            fade * 2f * intensity,
                            fade * 2f * intensity);
                    }

                    yield return null;
                }

                ResetOutline();
            }
        }

        /// <summary>全局光效脉冲</summary>
        private void StartGlowPulse(Color glowColor, float maxAlpha)
        {
            StopGlowPulse();
            _glowPulseCoroutine = StartCoroutine(GlowPulseRoutine(glowColor, maxAlpha));
        }

        private IEnumerator GlowPulseRoutine(Color glowColor, float maxAlpha)
        {
            if (glowOverlay == null) yield break;

            float time = 0f;
            while (true)
            {
                time += Time.deltaTime * 2f;
                float pulse = (Mathf.Sin(time) + 1f) / 2f;

                glowOverlay.color = new Color(
                    glowColor.r, glowColor.g, glowColor.b,
                    pulse * maxAlpha);

                yield return null;
            }
        }

        // ============================================================
        // 布局
        // ============================================================

        private void ApplyLayout()
        {
            if (portraitArea == null || infoArea == null) return;

            RectTransform cardRect = GetComponent<RectTransform>();
            float cardHeight = cardRect != null ? cardRect.rect.height : 300f;

            // 立绘区域：70%高度
            float portraitHeight = cardHeight * 0.70f;
            portraitArea.sizeDelta = new Vector2(portraitArea.sizeDelta.x, portraitHeight);

            // 信息区域：30%高度
            float infoHeight = cardHeight * 0.30f;
            infoArea.sizeDelta = new Vector2(infoArea.sizeDelta.x, infoHeight);
        }

        private void SetupStars(int star)
        {
            if (starContainer == null) return;

            // 清除旧星星
            for (int i = starContainer.childCount - 1; i >= 0; i--)
                Destroy(starContainer.GetChild(i).gameObject);

            // 创建新星星
            for (int i = 0; i < star; i++)
            {
                GameObject starObj = new GameObject($"Star{i}", typeof(RectTransform));
                starObj.transform.SetParent(starContainer, false);

                Image starImg = starObj.AddComponent<Image>();
                starImg.color = UIStyleConfig.BronzeGold;

                RectTransform starRect = starObj.GetComponent<RectTransform>();
                starRect.sizeDelta = new Vector2(16f, 16f);
                starRect.anchoredPosition = new Vector2(i * 20f, 0f);
            }
        }

        // ============================================================
        // 工具方法
        // ============================================================

        private void StopAnimations()
        {
            _isAnimating = false;
            StopBorderAnimation();
            StopGlowPulse();
        }

        private void StopBorderAnimation()
        {
            if (_borderAnimCoroutine != null)
            {
                StopCoroutine(_borderAnimCoroutine);
                _borderAnimCoroutine = null;
            }
            ResetOutline();
        }

        private void StopGlowPulse()
        {
            if (_glowPulseCoroutine != null)
            {
                StopCoroutine(_glowPulseCoroutine);
                _glowPulseCoroutine = null;
            }
            if (glowOverlay != null) glowOverlay.color = Color.clear;
        }

        private void ResetOutline()
        {
            if (outlineEffect != null)
            {
                outlineEffect.effectColor = Color.clear;
                outlineEffect.effectDistance = Vector2.zero;
            }
        }

        private static void SetTextSafe(Text t, string s) { if (t != null) t.text = s; }

        private static string GetFactionName(string key)
        {
            if (string.IsNullOrEmpty(key)) return "";
            string lower = key.ToLower();
            if (UIStyleConfig.FactionStyles.TryGetValue(lower, out var style))
                return style.Name;
            return key;
        }
    }
}
