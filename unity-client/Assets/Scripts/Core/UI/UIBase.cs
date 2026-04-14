// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Core Framework
// =============================================================================
// 描述：UI 面板抽象基类 —— 所有 UI 面板的共同父类。
//       提供面板生命周期管理（打开/关闭/刷新）、数据绑定、动画支持。
//       子类通过重写虚方法实现具体面板逻辑。
// =============================================================================

using System;
using System.Collections;
using UnityEngine;

namespace Jiuzhou.Core
{
    /// <summary>
    /// UI 面板抽象基类。
    /// <para>所有 UI 面板必须继承此类，挂载到对应的预制体 GameObject 上。</para>
    /// <para>使用方式：public class LoginPanel : UIBase { ... }</para>
    /// </summary>
    public abstract class UIBase : MonoBehaviour
    {
        // =====================================================================
        // 序列化字段（子类可在 Inspector 中设置）
        // =====================================================================

        /// <summary>面板所属 UI 层级</summary>
        [Header("UI 面板基础设置")]
        [Tooltip("面板所属的 UI 层级")]
        [SerializeField] private UILayer _uiLayer = UILayer.Main;

        /// <summary>面板名称（自动生成，也可以手动设置）</summary>
        [Tooltip("面板名称，用于 UIManager 查找和管理")]
        [SerializeField] protected string _panelName = string.Empty;

        /// <summary>是否在打开时禁用背景交互（模态弹窗）</summary>
        [Tooltip("打开时是否禁用背景交互")]
        [SerializeField] private bool _blockInput = false;

        /// <summary>关闭按钮的引用（如面板有关闭按钮，自动绑定点击关闭事件）</summary>
        [Tooltip("关闭按钮（拖拽赋值），点击后自动关闭面板")]
        [SerializeField] private UnityEngine.UI.Button _closeButton;

        /// <summary>动画持续时间（秒）</summary>
        [Tooltip("打开/关闭动画持续时间")]
        [SerializeField] private float _animationDuration = 0.25f;

        /// <summary>打开动画类型</summary>
        [Tooltip("面板打开时的动画效果")]
        [SerializeField] private PanelAnimationType _openAnimation = PanelAnimationType.FadeAndScale;

        /// <summary>关闭动画类型</summary>
        [SerializeField] private PanelAnimationType _closeAnimation = PanelAnimationType.FadeAndScale;

        // =====================================================================
        // 动画类型枚举
        // =====================================================================

        /// <summary>
        /// 面板动画类型。
        /// </summary>
        public enum PanelAnimationType
        {
            /// <summary>无动画</summary>
            None,

            /// <summary>淡入淡出</summary>
            Fade,

            /// <summary>缩放（从小到大 / 从大到小）</summary>
            Scale,

            /// <summary>淡入 + 缩放</summary>
            FadeAndScale,

            /// <summary>从下方滑入</summary>
            SlideUp,

            /// <summary>从上方滑入</summary>
            SlideDown
        }

        // =====================================================================
        // 内部状态
        // =====================================================================

        /// <summary>当前绑定到面板的数据</summary>
        private object _currentData;

        /// <summary>面板当前动画协程引用</summary>
        private Coroutine _animationCoroutine;

        /// <summary>CanvasGroup 引用（用于动画和交互控制）</summary>
        protected CanvasGroup _canvasGroup;

        /// <summary>RectTransform 引用（用于动画）</summary>
        protected RectTransform _rectTransform;

        // =====================================================================
        // 公开属性
        // =====================================================================

        /// <summary>面板所属 UI 层级</summary>
        public UILayer UILayer => _uiLayer;

        /// <summary>面板名称</summary>
        public string PanelName
        {
            get
            {
                if (string.IsNullOrEmpty(_panelName))
                {
                    _panelName = gameObject.name;
                }
                return _panelName;
            }
            set => _panelName = value;
        }

        /// <summary>面板是否已打开</summary>
        public bool IsOpen { get; private set; }

        /// <summary>是否在打开时阻止背景交互</summary>
        public bool BlockInput => _blockInput;

        // =====================================================================
        // Unity 生命周期
        // =====================================================================

        /// <summary>
        /// MonoBehaviour Awake —— 初始化组件引用和自动绑定关闭按钮。
        /// </summary>
        protected virtual void Awake()
        {
            // 获取或添加 CanvasGroup 组件（用于淡入淡出和交互控制）
            _canvasGroup = GetComponent<CanvasGroup>();
            if (_canvasGroup == null)
            {
                _canvasGroup = gameObject.AddComponent<CanvasGroup>();
            }

            // 获取 RectTransform
            _rectTransform = GetComponent<RectTransform>();
            if (_rectTransform == null)
            {
                _rectTransform = transform as RectTransform;
            }

            // 自动绑定关闭按钮
            if (_closeButton != null)
            {
                _closeButton.onClick.RemoveAllListeners();
                _closeButton.onClick.AddListener(OnCloseButtonClicked);
            }

            // 默认隐藏面板
            SetPanelVisible(false);
        }

        /// <summary>
        /// MonoBehaviour OnDestroy —— 清理面板。
        /// </summary>
        protected virtual void OnDestroy()
        {
            _currentData = null;
            if (_animationCoroutine != null)
            {
                StopCoroutine(_animationCoroutine);
                _animationCoroutine = null;
            }
        }

        // =====================================================================
        // 面板生命周期方法（子类重写）
        // =====================================================================

        /// <summary>
        /// 面板被打开时调用。
        /// 子类应重写此方法以初始化面板内容。
        /// </summary>
        /// <param name="args">打开面板时传入的参数（可选）</param>
        public virtual void OnOpen(params object[] args)
        {
            IsOpen = true;

            // 根据是否阻止背景输入设置 CanvasGroup
            _canvasGroup.blocksRaycasts = true;

            // 播放打开动画
            PlayOpenAnimation();
        }

        /// <summary>
        /// 面板被关闭时调用。
        /// 子类应重写此方法以清理面板状态。
        /// </summary>
        public virtual void OnClose()
        {
            IsOpen = false;
            _currentData = null;

            // 播放关闭动画
            PlayCloseAnimation();
        }

        /// <summary>
        /// 刷新面板数据/显示。
        /// 在面板已打开的情况下调用以更新内容。
        /// </summary>
        public virtual void OnRefresh()
        {
            // 子类重写以实现刷新逻辑
        }

        // =====================================================================
        // 数据绑定
        // =====================================================================

        /// <summary>
        /// 设置面板数据（泛型版本）。
        /// 数据被保存后，子类可通过 Get 方法获取。
        /// </summary>
        /// <typeparam name="T">数据类型</typeparam>
        /// <param name="data">面板数据</param>
        public void SetData<T>(T data)
        {
            _currentData = data;
            OnDataChanged(data);
        }

        /// <summary>
        /// 获取面板绑定的数据（泛型版本）。
        /// </summary>
        /// <typeparam name="T">数据类型</typeparam>
        /// <returns>绑定的数据，类型不匹配或无数据时返回 default(T)</returns>
        public T GetData<T>()
        {
            if (_currentData is T typedData)
            {
                return typedData;
            }
            return default(T);
        }

        /// <summary>
        /// 数据变更时的回调。
        /// 子类重写此方法以响应数据变化并更新 UI 显示。
        /// </summary>
        /// <typeparam name="T">数据类型</typeparam>
        /// <param name="data">新数据</param>
        protected virtual void OnDataChanged<T>(T data)
        {
            // 子类重写
        }

        // =====================================================================
        // 动画系统
        // =====================================================================

        /// <summary>
        /// 播放打开动画。
        /// </summary>
        public void PlayOpenAnimation()
        {
            if (_animationCoroutine != null)
            {
                StopCoroutine(_animationCoroutine);
            }

            // 先确保面板可见
            SetPanelVisible(true);

            if (_openAnimation == PanelAnimationType.None)
            {
                return;
            }

            _animationCoroutine = StartCoroutine(PlayAnimationCoroutine(_openAnimation, true, _animationDuration));
        }

        /// <summary>
        /// 播放关闭动画。
        /// 动画结束后隐藏面板。
        /// </summary>
        public void PlayCloseAnimation()
        {
            if (_animationCoroutine != null)
            {
                StopCoroutine(_animationCoroutine);
            }

            if (_closeAnimation == PanelAnimationType.None)
            {
                SetPanelVisible(false);
                return;
            }

            _animationCoroutine = StartCoroutine(PlayAnimationCoroutine(_closeAnimation, false, _animationDuration));
        }

        /// <summary>
        /// 动画协程 —— 基于插值的简单动画。
        /// </summary>
        /// <param name="animationType">动画类型</param>
        /// <param name="isOpening">true=打开动画，false=关闭动画</param>
        /// <param name="duration">动画持续时间</param>
        private IEnumerator PlayAnimationCoroutine(PanelAnimationType animationType, bool isOpening, float duration)
        {
            if (_rectTransform == null || _canvasGroup == null)
            {
                yield break;
            }

            float elapsed = 0f;
            float normalizedDuration = Mathf.Max(0.01f, duration);

            // 保存初始状态
            Vector3 initialScale = _rectTransform.localScale;
            Vector2 initialPosition = _rectTransform.anchoredPosition;
            float initialAlpha = _canvasGroup.alpha;

            // 设置动画起始状态（关闭时从当前状态开始，打开时从零状态开始）
            switch (animationType)
            {
                case PanelAnimationType.Fade:
                    _canvasGroup.alpha = isOpening ? 0f : initialAlpha;
                    break;

                case PanelAnimationType.Scale:
                    _rectTransform.localScale = isOpening ? Vector3.zero : initialScale;
                    break;

                case PanelAnimationType.FadeAndScale:
                    _canvasGroup.alpha = isOpening ? 0f : initialAlpha;
                    _rectTransform.localScale = isOpening ? Vector3.zero : initialScale;
                    break;

                case PanelAnimationType.SlideUp:
                    if (isOpening)
                    {
                        _rectTransform.anchoredPosition = initialPosition + new Vector2(0, -300f);
                    }
                    break;

                case PanelAnimationType.SlideDown:
                    if (isOpening)
                    {
                        _rectTransform.anchoredPosition = initialPosition + new Vector2(0, 300f);
                    }
                    break;
            }

            // 动画循环
            while (elapsed < normalizedDuration)
            {
                elapsed += Time.deltaTime;
                float progress = Mathf.Clamp01(elapsed / normalizedDuration);

                // 使用缓动函数（EaseOutCubic）使动画更自然
                float easedProgress = EaseOutCubic(progress);

                switch (animationType)
                {
                    case PanelAnimationType.Fade:
                        _canvasGroup.alpha = isOpening
                            ? Mathf.Lerp(0f, 1f, easedProgress)
                            : Mathf.Lerp(1f, 0f, easedProgress);
                        break;

                    case PanelAnimationType.Scale:
                        _rectTransform.localScale = isOpening
                            ? Vector3.Lerp(Vector3.zero, initialScale, easedProgress)
                            : Vector3.Lerp(initialScale, Vector3.zero, easedProgress);
                        break;

                    case PanelAnimationType.FadeAndScale:
                        _canvasGroup.alpha = isOpening
                            ? Mathf.Lerp(0f, 1f, easedProgress)
                            : Mathf.Lerp(1f, 0f, easedProgress);
                        _rectTransform.localScale = isOpening
                            ? Vector3.Lerp(Vector3.zero, initialScale, easedProgress)
                            : Vector3.Lerp(initialScale, Vector3.zero, easedProgress);
                        break;

                    case PanelAnimationType.SlideUp:
                        if (isOpening)
                        {
                            _rectTransform.anchoredPosition = Vector2.Lerp(
                                initialPosition + new Vector2(0, -300f),
                                initialPosition,
                                easedProgress);
                        }
                        else
                        {
                            _rectTransform.anchoredPosition = Vector2.Lerp(
                                initialPosition,
                                initialPosition + new Vector2(0, -300f),
                                easedProgress);
                        }
                        break;

                    case PanelAnimationType.SlideDown:
                        if (isOpening)
                        {
                            _rectTransform.anchoredPosition = Vector2.Lerp(
                                initialPosition + new Vector2(0, 300f),
                                initialPosition,
                                easedProgress);
                        }
                        else
                        {
                            _rectTransform.anchoredPosition = Vector2.Lerp(
                                initialPosition,
                                initialPosition + new Vector2(0, 300f),
                                easedProgress);
                        }
                        break;
                }

                yield return null;
            }

            // 确保动画结束时状态正确
            if (isOpening)
            {
                _canvasGroup.alpha = 1f;
                _rectTransform.localScale = initialScale;
                _rectTransform.anchoredPosition = initialPosition;
            }
            else
            {
                _canvasGroup.alpha = 0f;
                SetPanelVisible(false);
                // 恢复到初始状态以便下次打开
                _rectTransform.localScale = initialScale;
                _rectTransform.anchoredPosition = initialPosition;
                _canvasGroup.alpha = 1f;
            }

            _animationCoroutine = null;
        }

        // =====================================================================
        // 辅助方法
        // =====================================================================

        /// <summary>
        /// 设置面板可见性（不触发动画，直接显示/隐藏）。
        /// </summary>
        /// <param name="visible">是否可见</param>
        protected void SetPanelVisible(bool visible)
        {
            gameObject.SetActive(visible);
        }

        /// <summary>
        /// 缓动函数 —— EaseOutCubic（减速曲线）。
        /// </summary>
        /// <param name="t">进度值 [0, 1]</param>
        /// <returns>缓动后的值</returns>
        private float EaseOutCubic(float t)
        {
            return 1f - Mathf.Pow(1f - t, 3f);
        }

        /// <summary>
        /// 关闭按钮点击回调 —— 自动关闭面板。
        /// </summary>
        protected virtual void OnCloseButtonClicked()
        {
            UIManager.Instance.ClosePanel(PanelName);
        }

        /// <summary>
        /// 手动设置关闭按钮引用（用于动态创建的面板）。
        /// </summary>
        /// <param name="button">关闭按钮</param>
        public void SetCloseButton(UnityEngine.UI.Button button)
        {
            _closeButton = button;
            if (_closeButton != null)
            {
                _closeButton.onClick.RemoveAllListeners();
                _closeButton.onClick.AddListener(OnCloseButtonClicked);
            }
        }

        /// <summary>
        /// 查找面板内的子 Transform。
        /// 便捷方法，等价于 transform.Find(path)。
        /// </summary>
        /// <param name="path">子对象路径</param>
        /// <returns>找到的 Transform，未找到返回 null</returns>
        protected Transform FindChild(string path)
        {
            return transform.Find(path);
        }

        /// <summary>
        /// 查找面板内的子组件。
        /// </summary>
        /// <typeparam name="T">组件类型</typeparam>
        /// <param name="path">子对象路径</param>
        /// <returns>找到的组件，未找到返回 null</returns>
        protected T FindChildComponent<T>(string path) where T : Component
        {
            Transform child = transform.Find(path);
            return child != null ? child.GetComponent<T>() : null;
        }
    }
}
