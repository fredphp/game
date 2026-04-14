// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Module
// =============================================================================
// 描述：新手引导覆盖面板 —— 半透明遮罩 + 高亮目标 UI + 对话气泡 + 箭头指引。
//       由 TutorialManager 驱动，负责展示引导步骤的视觉层。
//       挂载在 Guide 层（UILayer=Guide），覆盖在所有其他面板之上。
// =============================================================================

using System;
using System.Collections;
using UnityEngine;
using UnityEngine.UI;
using Jiuzhou.Core;
using Game.Data;

namespace Game.Module.Quest
{
    /// <summary>
    /// 新手引导覆盖面板
    /// 功能：半透明遮罩、高亮区域裁剪、对话气泡、箭头指引、步骤进度、跳过按钮
    /// 由 TutorialManager 统一驱动，不直接操作 API
    /// </summary>
    public class TutorialPanel : UIBase
    {
        // ──────────────────────────────────────
        // 遮罩与高亮
        // ──────────────────────────────────────

        [Header("遮罩与高亮")]
        [SerializeField] private Image maskOverlay;              // 半透明黑色遮罩
        [SerializeField] private Image highlightFrame;           // 高亮框（可调整大小/位置）
        [SerializeField] private RectTransform highlightRect;    // 高亮裁剪区域
        [SerializeField] private Color maskColor = new Color(0f, 0f, 0f, 0.75f);
        [SerializeField] private float highlightPadding = 10f;   // 高亮区域外扩像素

        // ──────────────────────────────────────
        // 对话区域
        // ──────────────────────────────────────

        [Header("对话区域")]
        [SerializeField] private GameObject dialogBox;            // 对话框容器
        [SerializeField] private Image speakerAvatar;
        [SerializeField] private Text speakerNameText;
        [SerializeField] private Text dialogContentText;
        [SerializeField] private Button nextButton;
        [SerializeField] private Text nextButtonText;

        // ──────────────────────────────────────
        // 箭头指引
        // ──────────────────────────────────────

        [Header("箭头指引")]
        [SerializeField] private RectTransform arrowPointer;       // 箭头 Transform
        [SerializeField] private float arrowBounceSpeed = 2f;
        [SerializeField] private float arrowBounceHeight = 15f;

        // ──────────────────────────────────────
        // 进度指示
        // ──────────────────────────────────────

        [Header("进度指示")]
        [SerializeField] private Text stepProgressText;           // "步骤 3/10"
        [SerializeField] private RectTransform stepDotsContainer; // 步骤圆点容器
        [SerializeField] private GameObject stepDotPrefab;        // 步骤圆点预制体

        // ──────────────────────────────────────
        // 跳过按钮
        // ──────────────────────────────────────

        [Header("跳过")]
        [SerializeField] private Button skipButton;
        [SerializeField] private GameObject skipConfirmPanel;      // 跳过确认弹窗
        [SerializeField] private Button skipYesButton;
        [SerializeField] private Button skipNoButton;

        // ──────────────────────────────────────
        // 手指点击指示（点击高亮区域继续）
        // ──────────────────────────────────────

        [Header("点击指示")]
        [SerializeField] private GameObject tapIndicator;
        [SerializeField] private float tapAnimationSpeed = 1.5f;

        // ──────────────────────────────────────
        // 常量
        // ──────────────────────────────────────

        private const float DIALOG_TYPewriter_SPEED = 30f;  // 每秒打字数
        private const float STEP_TRANSITION_DURATION = 0.3f;

        // ──────────────────────────────────────
        // 内部状态
        // ──────────────────────────────────────

        private TutorialStep currentStep;
        private int currentStepIndex;
        private int totalSteps;
        private Coroutine typewriterCoroutine;
        private Coroutine arrowBounceCoroutine;
        private Coroutine tapAnimCoroutine;
        private bool isWaitingForTap = false;
        private Action<int> onStepComplete;
        private Action onTutorialSkip;
        private Action onTutorialFinish;
        private bool isTransitioning = false;

        // ============================================================
        // 公开方法 —— 由 TutorialManager 调用
        // ============================================================

        /// <summary>
        /// 设置引导回调
        /// </summary>
        public void SetCallbacks(Action<int> stepComplete, Action onSkip, Action onFinish)
        {
            onStepComplete = stepComplete;
            onTutorialSkip = onSkip;
            onTutorialFinish = onFinish;
        }

        /// <summary>
        /// 展示指定步骤
        /// </summary>
        public void ShowStep(TutorialStep step, int stepIndex, int total)
        {
            if (step == null) return;

            currentStep = step;
            currentStepIndex = stepIndex;
            totalSteps = total;

            isWaitingForTap = false;

            // 更新进度指示
            UpdateStepProgress();

            // 高亮目标 UI
            HighlightTarget(step.TargetUiPath, step.TargetPanel);

            // 显示对话
            ShowDialog(step.Speaker, step.Description, step.Skippable);

            // 显示箭头
            ShowArrow(step.TargetUiPath);

            // 显示点击指示
            if (step.TriggerType == "manual")
            {
                ShowTapIndicator();
            }

            Debug.Log($"[TutorialPanel] 展示步骤: [{stepIndex + 1}/{total}] {step.Title}");
        }

        /// <summary>
        /// 完成当前步骤，进入下一步
        /// </summary>
        public void CompleteCurrentStep()
        {
            if (isTransitioning) return;
            isTransitioning = true;

            StopAllAnimations();

            StartCoroutine(StepTransition());
        }

        /// <summary>
        /// 强制结束引导（跳过/全部完成）
        /// </summary>
        public void ForceFinish()
        {
            StopAllAnimations();
            isWaitingForTap = false;
            isTransitioning = false;
            currentStep = null;

            if (maskOverlay != null) maskOverlay.gameObject.SetActive(false);
            if (highlightFrame != null) highlightFrame.gameObject.SetActive(false);
            if (dialogBox != null) dialogBox.SetActive(false);
            if (arrowPointer != null) arrowPointer.gameObject.SetActive(false);
            if (tapIndicator != null) tapIndicator.SetActive(false);
            if (skipConfirmPanel != null) skipConfirmPanel.SetActive(false);
        }

        // ============================================================
        // 生命周期
        // ============================================================

        protected override void Awake()
        {
            base.Awake();

            if (nextButton != null) nextButton.onClick.AddListener(OnNextClick);
            if (skipButton != null) skipButton.onClick.AddListener(OnSkipClick);
            if (skipYesButton != null) skipYesButton.onClick.AddListener(OnSkipConfirmed);
            if (skipNoButton != null) skipNoButton.onClick.AddListener(OnSkipCancelled);

            // 默认隐藏所有子元素
            if (maskOverlay != null) maskOverlay.gameObject.SetActive(false);
            if (highlightFrame != null) highlightFrame.gameObject.SetActive(false);
            if (dialogBox != null) dialogBox.SetActive(false);
            if (arrowPointer != null) arrowPointer.gameObject.SetActive(false);
            if (tapIndicator != null) tapIndicator.SetActive(false);
            if (skipConfirmPanel != null) skipConfirmPanel.SetActive(false);
            if (skipButton != null) skipButton.gameObject.SetActive(false);

            Debug.Log("[TutorialPanel] 初始化完成");
        }

        public override void OnOpen(params object[] args)
        {
            base.OnOpen(args);

            // 激活遮罩
            if (maskOverlay != null)
            {
                maskOverlay.gameObject.SetActive(true);
                maskOverlay.color = maskColor;
            }
            if (skipButton != null) skipButton.gameObject.SetActive(true);
        }

        public override void OnClose()
        {
            ForceFinish();
            base.OnClose();
        }

        // ============================================================
        // 高亮目标
        // ============================================================

        private void HighlightTarget(string uiPath, string panelName)
        {
            if (highlightFrame != null) highlightFrame.gameObject.SetActive(false);

            if (string.IsNullOrEmpty(uiPath))
            {
                Debug.Log("[TutorialPanel] 无目标 UI，全屏遮罩");
                return;
            }

            // 尝试查找目标 UI 元素
            Transform targetTransform = FindTargetTransform(uiPath, panelName);

            if (targetTransform == null)
            {
                Debug.LogWarning($"[TutorialPanel] 未找到目标 UI: panel={panelName}, path={uiPath}");
                return;
            }

            // 获取目标的屏幕/世界坐标并转换为本地坐标
            RectTransform targetRect = targetTransform as RectTransform;
            if (targetRect == null || highlightRect == null) return;

            // 计算目标在 Canvas 中的位置
            Vector3[] targetCorners = new Vector3[4];
            targetRect.GetWorldCorners(targetCorners);

            // 转换到遮罩的本地坐标
            Vector2 minLocal = transform.InverseTransformPoint(targetCorners[0]);
            Vector2 maxLocal = transform.InverseTransformPoint(targetCorners[2]);

            // 应用 padding
            minLocal -= new Vector2(highlightPadding, highlightPadding);
            maxLocal += new Vector2(highlightPadding, highlightPadding);

            // 计算大小和中心
            Vector2 size = maxLocal - minLocal;
            Vector2 center = (minLocal + maxLocal) / 2f;

            // 更新高亮框
            if (highlightFrame != null)
            {
                highlightFrame.gameObject.SetActive(true);
                highlightRect.anchoredPosition = center;
                highlightRect.sizeDelta = size;
            }

            Debug.Log($"[TutorialPanel] 高亮目标: {uiPath}, 位置: {center}, 大小: {size}");
        }

        private Transform FindTargetTransform(string uiPath, string panelName)
        {
            // 优先从指定面板中查找
            if (!string.IsNullOrEmpty(panelName))
            {
                GameObject panelObj = GameObject.Find(panelName);
                if (panelObj != null)
                {
                    Transform target = panelObj.transform.Find(uiPath);
                    if (target != null) return target;
                }
            }

            // 回退：从场景中全局查找
            return GameObject.Find(uiPath)?.transform;
        }

        // ============================================================
        // 对话展示
        // ============================================================

        private void ShowDialog(string speaker, string content, bool skippable)
        {
            if (dialogBox == null) return;
            dialogBox.SetActive(true);

            // 设置说话人
            if (speakerNameText != null)
            {
                speakerNameText.text = string.IsNullOrEmpty(speaker) ? "系统" : speaker;
            }

            // 打字机效果显示内容
            if (typewriterCoroutine != null)
            {
                StopCoroutine(typewriterCoroutine);
                typewriterCoroutine = null;
            }

            if (dialogContentText != null)
            {
                typewriterCoroutine = StartCoroutine(TypewriterEffect(dialogContentText, content));
            }

            // 跳过按钮
            if (skipButton != null) skipButton.SetActive(skippable);
        }

        private IEnumerator TypewriterEffect(Text textComponent, string fullText)
        {
            if (textComponent == null) yield break;

            textComponent.text = "";
            int currentIndex = 0;
            float elapsed = 0f;
            float charInterval = 1f / DIALOG_TYPewriter_SPEED;

            while (currentIndex < fullText.Length)
            {
                elapsed += Time.deltaTime;
                while (elapsed >= charInterval && currentIndex < fullText.Length)
                {
                    currentIndex++;
                    elapsed -= charInterval;
                    textComponent.text = fullText.Substring(0, currentIndex);
                }
                yield return null;
            }

            textComponent.text = fullText;
            typewriterCoroutine = null;
        }

        // ============================================================
        // 箭头指引
        // ============================================================

        private void ShowArrow(string uiPath)
        {
            if (arrowPointer == null) return;

            if (string.IsNullOrEmpty(uiPath))
            {
                arrowPointer.gameObject.SetActive(false);
                return;
            }

            // 放置箭头在高亮区域上方
            if (highlightRect != null)
            {
                arrowPointer.gameObject.SetActive(true);
                arrowPointer.anchoredPosition = new Vector2(
                    highlightRect.anchoredPosition.x,
                    highlightRect.anchoredPosition.y + highlightRect.sizeDelta.y / 2f + 30f);
            }

            // 启动弹跳动画
            if (arrowBounceCoroutine != null)
            {
                StopCoroutine(arrowBounceCoroutine);
            }
            arrowBounceCoroutine = StartCoroutine(ArrowBounceAnimation());
        }

        private IEnumerator ArrowBounceAnimation()
        {
            if (arrowPointer == null) yield break;

            Vector2 basePosition = arrowPointer.anchoredPosition;
            float elapsed = 0f;

            while (true)
            {
                elapsed += Time.deltaTime * arrowBounceSpeed;
                float offset = Mathf.Sin(elapsed) * arrowBounceHeight;
                arrowPointer.anchoredPosition = basePosition + new Vector2(0f, offset);
                yield return null;
            }
        }

        // ============================================================
        // 点击指示
        // ============================================================

        private void ShowTapIndicator()
        {
            isWaitingForTap = true;

            if (tapIndicator == null) return;
            tapIndicator.SetActive(true);

            // 放置在高亮区域中心
            if (highlightRect != null)
            {
                RectTransform tapRect = tapIndicator.GetComponent<RectTransform>();
                if (tapRect != null)
                {
                    tapRect.anchoredPosition = highlightRect.anchoredPosition;
                }
            }

            // 播放缩放动画
            if (tapAnimCoroutine != null)
            {
                StopCoroutine(tapAnimCoroutine);
            }
            tapAnimCoroutine = StartCoroutine(TapAnimation());
        }

        private IEnumerator TapAnimation()
        {
            if (tapIndicator == null) yield break;

            RectTransform tapRect = tapIndicator.GetComponent<RectTransform>();
            if (tapRect == null) yield break;

            float elapsed = 0f;

            while (isWaitingForTap)
            {
                elapsed += Time.deltaTime * tapAnimationSpeed;
                // 缩放脉冲效果
                float scale = 1f + Mathf.Sin(elapsed * Mathf.PI) * 0.15f;
                tapRect.localScale = new Vector3(scale, scale, 1f);
                yield return null;
            }
        }

        // ============================================================
        // 步骤进度
        // ============================================================

        private void UpdateStepProgress()
        {
            if (stepProgressText != null)
            {
                stepProgressText.text = $"步骤 {currentStepIndex + 1}/{totalSteps}";
            }

            // 更新圆点
            UpdateStepDots();
        }

        private void UpdateStepDots()
        {
            if (stepDotsContainer == null || stepDotPrefab == null) return;

            // 清除旧的圆点
            for (int i = stepDotsContainer.childCount - 1; i >= 0; i--)
                Destroy(stepDotsContainer.GetChild(i).gameObject);

            // 创建新的圆点
            int maxDots = Mathf.Min(totalSteps, 10); // 最多显示10个圆点
            for (int i = 0; i < maxDots; i++)
            {
                GameObject dot = Instantiate(stepDotPrefab, stepDotsContainer);
                Image dotImage = dot.GetComponent<Image>();

                if (dotImage != null)
                {
                    dotImage.color = i <= currentStepIndex
                        ? new Color(1f, 0.8f, 0.2f, 1f)  // 已完成：金色
                        : new Color(0.5f, 0.5f, 0.5f, 1f); // 未完成：灰色
                }
            }
        }

        // ============================================================
        // 步骤过渡
        // ============================================================

        private IEnumerator StepTransition()
        {
            // 淡出动画
            if (dialogBox != null)
            {
                CanvasGroup dialogGroup = dialogBox.GetComponent<CanvasGroup>();
                if (dialogGroup == null) dialogGroup = dialogBox.AddComponent<CanvasGroup>();

                float elapsed = 0f;
                while (elapsed < STEP_TRANSITION_DURATION)
                {
                    elapsed += Time.deltaTime;
                    dialogGroup.alpha = 1f - (elapsed / STEP_TRANSITION_DURATION);
                    yield return null;
                }
                dialogGroup.alpha = 0f;
            }

            yield return new WaitForSeconds(0.05f);
            isTransitioning = false;

            // 通知 Manager 步骤完成
            onStepComplete?.Invoke(currentStep.StepId);
        }

        // ============================================================
        // 按钮回调
        // ============================================================

        private void OnNextClick()
        {
            // 跳过打字机效果直接显示全文
            if (typewriterCoroutine != null && dialogContentText != null && currentStep != null)
            {
                StopCoroutine(typewriterCoroutine);
                typewriterCoroutine = null;
                dialogContentText.text = currentStep.Description;
                return;
            }

            // 完成当前步骤
            CompleteCurrentStep();
        }

        private void OnSkipClick()
        {
            if (skipConfirmPanel != null)
            {
                skipConfirmPanel.SetActive(true);
            }
            else
            {
                // 无确认弹窗时直接跳过
                onTutorialSkip?.Invoke();
            }
        }

        private void OnSkipConfirmed()
        {
            if (skipConfirmPanel != null) skipConfirmPanel.SetActive(false);
            Debug.Log("[TutorialPanel] 用户确认跳过新手引导");
            onTutorialSkip?.Invoke();
        }

        private void OnSkipCancelled()
        {
            if (skipConfirmPanel != null) skipConfirmPanel.SetActive(false);
        }

        // ============================================================
        // 动画控制
        // ============================================================

        private void StopAllAnimations()
        {
            if (typewriterCoroutine != null)
            {
                StopCoroutine(typewriterCoroutine);
                typewriterCoroutine = null;
            }

            if (arrowBounceCoroutine != null)
            {
                StopCoroutine(arrowBounceCoroutine);
                arrowBounceCoroutine = null;
            }

            if (tapAnimCoroutine != null)
            {
                StopCoroutine(tapAnimCoroutine);
                tapAnimCoroutine = null;
            }
        }

        // ============================================================
        // 清理
        // ============================================================

        protected override void OnDestroy()
        {
            StopAllAnimations();
            if (nextButton != null) nextButton.onClick.RemoveAllListeners();
            if (skipButton != null) skipButton.onClick.RemoveAllListeners();
            if (skipYesButton != null) skipYesButton.onClick.RemoveAllListeners();
            if (skipNoButton != null) skipNoButton.onClick.RemoveAllListeners();
            base.OnDestroy();
        }
    }
}
