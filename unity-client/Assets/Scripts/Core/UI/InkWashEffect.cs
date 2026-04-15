// =============================================================================
// 九州争鼎 - 战国·楚汉争霸 水墨特效组件
// =============================================================================
// 描述：提供水墨风视觉特效 —— 印章盖压、金光粒子、紫雾扩散、
//       竹简展开等动效。可挂载到任意 UI 元素上。
// =============================================================================

using System;
using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using Jiuzhou.Core.UI;

namespace Jiuzhou.Core.UI
{
    /// <summary>
    /// 水墨特效控制器 —— 挂载到需要动效的 UI 元素上。
    /// 支持的特效类型：印章盖压、金光闪烁、紫雾扩散、水墨淡入、边框呼吸
    /// </summary>
    public class InkWashEffect : MonoBehaviour
    {
        // ── 配置 ──
        [Header("特效类型")]
        [SerializeField] private EffectType effectType = EffectType.InkFadeIn;

        [Header("入场动画")]
        [SerializeField] private bool playOnAwake = false;
        [SerializeField] private float delay = 0f;

        [Header("循环动画")]
        [SerializeField] private bool loop = false;
        [SerializeField] private float loopInterval = 3f;

        [Header("金光参数")]
        [SerializeField] private Color goldColor = new Color(1f, 0.85f, 0.3f, 0.8f);
        [SerializeField] private float glowIntensity = 1.5f;

        [Header("粒子系统")]
        [SerializeField] private ParticleSystem inkParticle;
        [SerializeField] private ParticleSystem goldParticle;

        // ── 内部状态 ──
        private CanvasGroup _canvasGroup;
        private RectTransform _rectTransform;
        private Image _targetImage;
        private Outline _outlineEffect;
        private Coroutine _effectCoroutine;
        private Coroutine _loopCoroutine;

        /// <summary>特效类型枚举</summary>
        public enum EffectType
        {
            InkFadeIn,        // 水墨淡入
            StampPress,        // 印章盖压
            GoldShimmer,       // 金光闪烁（SSR）
            PurpleMist,        // 紫雾弥漫（SR）
            BorderBreathe,     // 边框呼吸
            BambooSlide,       // 竹简滑入
            SealStamp          // 印章盖章
        }

        // ============================================================
        // 生命周期
        // ============================================================

        private void Awake()
        {
            _canvasGroup = GetComponent<CanvasGroup>();
            if (_canvasGroup == null) _canvasGroup = gameObject.AddComponent<CanvasGroup>();
            _rectTransform = GetComponent<RectTransform>();
            _targetImage = GetComponent<Image>();
            _outlineEffect = GetComponent<Outline>();
            if (_outlineEffect == null && effectType == EffectType.BorderBreathe)
                _outlineEffect = gameObject.AddComponent<Outline>();
        }

        private void Start()
        {
            if (playOnAwake)
            {
                if (delay > 0)
                    StartCoroutine(PlayWithDelay(delay));
                else
                    PlayEffect();

                if (loop) StartLoop();
            }
        }

        private void OnDestroy()
        {
            StopAllEffects();
        }

        // ============================================================
        // 公开方法
        // ============================================================

        /// <summary>播放特效</summary>
        public void PlayEffect()
        {
            StopEffect();
            switch (effectType)
            {
                case EffectType.InkFadeIn:
                    _effectCoroutine = StartCoroutine(CoInkFadeIn()); break;
                case EffectType.StampPress:
                    _effectCoroutine = StartCoroutine(CoStampPress()); break;
                case EffectType.GoldShimmer:
                    _effectCoroutine = StartCoroutine(CoGoldShimmer()); break;
                case EffectType.PurpleMist:
                    _effectCoroutine = StartCoroutine(CoPurpleMist()); break;
                case EffectType.BorderBreathe:
                    _effectCoroutine = StartCoroutine(CoBorderBreathe()); break;
                case EffectType.BambooSlide:
                    _effectCoroutine = StartCoroutine(CoBambooSlide()); break;
                case EffectType.SealStamp:
                    _effectCoroutine = StartCoroutine(CoSealStamp()); break;
            }
        }

        /// <summary>停止当前特效</summary>
        public void StopEffect()
        {
            if (_effectCoroutine != null)
            {
                StopCoroutine(_effectCoroutine);
                _effectCoroutine = null;
            }
        }

        /// <summary>启动循环</summary>
        public void StartLoop()
        {
            StopLoop();
            _loopCoroutine = StartCoroutine(LoopRoutine());
        }

        /// <summary>停止循环</summary>
        public void StopLoop()
        {
            if (_loopCoroutine != null)
            {
                StopCoroutine(_loopCoroutine);
                _loopCoroutine = null;
            }
        }

        /// <summary>停止所有特效和循环</summary>
        public void StopAllEffects()
        {
            StopEffect();
            StopLoop();
        }

        /// <summary>动态设置特效类型并播放</summary>
        public void PlayEffectWithType(EffectType type)
        {
            effectType = type;
            PlayEffect();
        }

        // ============================================================
        // 特效协程
        // ============================================================

        /// <summary>水墨淡入 —— 模拟墨水在宣纸上扩散</summary>
        private IEnumerator CoInkFadeIn()
        {
            float duration = UIStyleConfig.InkFadeIn.Duration;
            float elapsed = 0f;
            _canvasGroup.alpha = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.Clamp01(elapsed / duration);
                float eased = UIStyleConfig.EvaluateEasing(t, EasingType.InkSpread);
                _canvasGroup.alpha = eased;

                // 微缩放效果：从 0.97 到 1.0
                if (_rectTransform != null)
                {
                    float scale = Mathf.Lerp(0.97f, 1f, eased);
                    _rectTransform.localScale = new Vector3(scale, scale, 1f);
                }

                yield return null;
            }

            _canvasGroup.alpha = 1f;
            if (_rectTransform != null) _rectTransform.localScale = Vector3.one;
        }

        /// <summary>印章盖压 —— 先放大后回弹</summary>
        private IEnumerator CoStampPress()
        {
            float duration = UIStyleConfig.StampIn.Duration;
            float elapsed = 0f;

            if (_rectTransform != null)
                _rectTransform.localScale = new Vector3(1.3f, 1.3f, 1f);
            _canvasGroup.alpha = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.Clamp01(elapsed / duration);
                float eased = UIStyleConfig.EvaluateEasing(t, EasingType.StampPress);

                if (_rectTransform != null)
                    _rectTransform.localScale = new Vector3(eased, eased, 1f);
                _canvasGroup.alpha = Mathf.Min(1f, t * 3f); // 快速显现

                yield return null;
            }

            _canvasGroup.alpha = 1f;
            if (_rectTransform != null) _rectTransform.localScale = Vector3.one;
        }

        /// <summary>金光闪烁 —— SSR 卡牌特效</summary>
        private IEnumerator CoGoldShimmer()
        {
            float duration = UIStyleConfig.SSRReveal.Duration;
            float elapsed = 0f;

            // 阶段1: 黑暗蓄力
            float darkPhase = duration * 0.2f;
            while (elapsed < darkPhase)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / darkPhase;
                _canvasGroup.alpha = 1f - t * 0.8f; // 渐暗
                yield return null;
            }

            // 阶段2: 金光爆发
            float burstPhase = duration * 0.3f;
            float burstStart = elapsed;
            while (elapsed < burstStart + burstPhase)
            {
                float t = (elapsed - burstStart) / burstPhase;
                float intensity = Mathf.Sin(t * Mathf.PI); // 0→1→0
                _canvasGroup.alpha = 0.2f + intensity * 0.8f;

                if (_outlineEffect != null)
                {
                    _outlineEffect.effectColor = new Color(
                        goldColor.r, goldColor.g, goldColor.b,
                        intensity * glowIntensity);
                    _outlineEffect.effectDistance = new Vector2(
                        intensity * 3f, intensity * 3f);
                }

                if (_targetImage != null)
                {
                    _targetImage.color = Color.Lerp(Color.white, goldColor, intensity * 0.3f);
                }

                goldParticle?.Play();
                yield return null;
                elapsed += Time.deltaTime;
            }

            // 阶段3: 金光稳定
            float stablePhase = duration * 0.5f;
            float stableStart = elapsed;
            while (elapsed < stableStart + stablePhase)
            {
                float t = (elapsed - stableStart) / stablePhase;
                float pulse = Mathf.Sin(t * Mathf.PI * 2f) * 0.15f;
                _canvasGroup.alpha = 1f;

                if (_outlineEffect != null)
                {
                    _outlineEffect.effectColor = new Color(
                        goldColor.r, goldColor.g, goldColor.b,
                        0.5f + pulse);
                    _outlineEffect.effectDistance = new Vector2(2f, 2f);
                }

                yield return null;
                elapsed += Time.deltaTime;
            }

            // 清理
            ResetOutline();
            if (_targetImage != null) _targetImage.color = Color.white;
            _canvasGroup.alpha = 1f;
        }

        /// <summary>紫雾弥漫 —— SR 卡牌特效</summary>
        private IEnumerator CoPurpleMist()
        {
            float duration = UIStyleConfig.SRReveal.Duration;
            float elapsed = 0f;
            Color purpleColor = UIStyleConfig.RarityStyles[4].GlowColor;

            // 紫雾渐入
            while (elapsed < duration * 0.6f)
            {
                float t = Mathf.Clamp01(elapsed / (duration * 0.6f));
                float eased = UIStyleConfig.EvaluateEasing(t, EasingType.PurpleMist);

                if (_outlineEffect != null)
                {
                    _outlineEffect.effectColor = new Color(
                        purpleColor.r, purpleColor.g, purpleColor.b,
                        eased * 0.8f);
                    _outlineEffect.effectDistance = new Vector2(eased * 2f, eased * 2f);
                }

                _canvasGroup.alpha = Mathf.Lerp(0f, 1f, eased);
                inkParticle?.Play();
                yield return null;
                elapsed += Time.deltaTime;
            }

            // 稳定显示
            _canvasGroup.alpha = 1f;
            yield return new WaitForSeconds(duration * 0.4f);

            ResetOutline();
        }

        /// <summary>边框呼吸 —— 持续循环的边框光效</summary>
        private IEnumerator CoBorderBreathe()
        {
            float speed = 2f;
            float time = 0f;

            while (true)
            {
                time += Time.deltaTime * speed;
                float pulse = (Mathf.Sin(time) + 1f) / 2f; // 0~1

                if (_outlineEffect != null)
                {
                    Color borderColor = _targetImage != null ? _targetImage.color : UIStyleConfig.BronzeGold;
                    _outlineEffect.effectColor = new Color(
                        borderColor.r, borderColor.g, borderColor.b,
                        0.3f + pulse * 0.7f);
                    _outlineEffect.effectDistance = new Vector2(
                        1f + pulse * 2f, 1f + pulse * 2f);
                }

                yield return null;
            }
        }

        /// <summary>竹简滑入 —— 从侧面滑入</summary>
        private IEnumerator CoBambooSlide()
        {
            float duration = UIStyleConfig.SlideIn.Duration;
            float elapsed = 0f;

            if (_rectTransform == null) yield break;

            Vector2 originalPos = _rectTransform.anchoredPosition;
            _rectTransform.anchoredPosition = originalPos + new Vector2(-400f, 0f);
            _canvasGroup.alpha = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.Clamp01(elapsed / duration);
                float eased = UIStyleConfig.EvaluateEasing(t, EasingType.BambooUnroll);

                _rectTransform.anchoredPosition = Vector2.Lerp(
                    originalPos + new Vector2(-400f, 0f),
                    originalPos,
                    eased);
                _canvasGroup.alpha = eased;

                yield return null;
            }

            _rectTransform.anchoredPosition = originalPos;
            _canvasGroup.alpha = 1f;
        }

        /// <summary>印章盖章 —— 缩放+旋转+色变组合</summary>
        private IEnumerator CoSealStamp()
        {
            float duration = 0.5f;
            float elapsed = 0f;

            if (_rectTransform == null) yield break;

            _rectTransform.localScale = new Vector3(2f, 2f, 1f);
            _rectTransform.localEulerAngles = new Vector3(0f, 0f, -15f);
            _canvasGroup.alpha = 0f;

            Color sealRed = UIStyleConfig.CinnabarRed;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.Clamp01(elapsed / duration);
                float eased = UIStyleConfig.EvaluateEasing(t, EasingType.StampPress);

                _rectTransform.localScale = new Vector3(
                    Mathf.Lerp(2f, 1f, eased),
                    Mathf.Lerp(2f, 1f, eased),
                    1f);
                _rectTransform.localEulerAngles = new Vector3(0f, 0f, Mathf.Lerp(-15f, 0f, eased));
                _canvasGroup.alpha = Mathf.Min(1f, t * 2.5f);

                if (_targetImage != null)
                    _targetImage.color = Color.Lerp(Color.red, sealRed, eased);

                yield return null;
            }

            _rectTransform.localScale = Vector3.one;
            _rectTransform.localEulerAngles = Vector3.zero;
            _canvasGroup.alpha = 1f;
            if (_targetImage != null) _targetImage.color = sealRed;
        }

        // ============================================================
        // 辅助方法
        // ============================================================

        private IEnumerator PlayWithDelay(float d)
        {
            yield return new WaitForSeconds(d);
            PlayEffect();
        }

        private IEnumerator LoopRoutine()
        {
            while (true)
            {
                yield return new WaitForSeconds(loopInterval);
                PlayEffect();
            }
        }

        private void ResetOutline()
        {
            if (_outlineEffect != null)
            {
                _outlineEffect.effectColor = Color.clear;
                _outlineEffect.effectDistance = Vector2.zero;
            }
        }
    }
}
