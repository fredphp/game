// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Module
// =============================================================================
// 描述：新手引导管理器 —— 管理引导流程的状态机，驱动 TutorialPanel 展示。
//       单例模式（继承 Singleton<T>），负责：
//       - 玩家登录后检查是否需要引导
//       - 新玩家自动启动引导
//       - 监听游戏事件自动推进条件触发步骤
//       - 协调 UIManager 开/关面板配合引导流程
//       - 保存完成状态到 PlayerPrefs
// =============================================================================

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Jiuzhou.Core;
using Game.Core.Network.Api;
using Game.Data;

namespace Game.Module.Quest
{
    /// <summary>
    /// 新手引导管理器 - 状态机驱动
    /// 管理引导步骤的加载、推进、完成、跳过
    /// 单例模式，游戏启动后由 GameManager 初始化
    /// </summary>
    public class TutorialManager : Singleton<TutorialManager>
    {
        // ============================================================
        // 引导状态枚举
        // ============================================================

        private enum TutorialState
        {
            /// <summary>未初始化</summary>
            Idle,
            /// <summary>加载步骤数据中</summary>
            Loading,
            /// <summary>等待开始（等待条件满足）</summary>
            Waiting,
            /// <summary>引导进行中</summary>
            Running,
            /// <summary>引导已完成</summary>
            Completed,
            /// <summary>引导已跳过</summary>
            Skipped
        }

        // ============================================================
        // 常量
        // ============================================================

        /// <summary>PlayerPrefs 存储键</summary>
        private const string PP_TUTORIAL_COMPLETED = "tutorial_completed";
        private const string PP_TUTORIAL_LAST_STEP = "tutorial_last_step";
        private const string PP_TUTORIAL_SKIPPED = "tutorial_skipped";

        // ============================================================
        // 内部状态
        // ============================================================

        /// <summary>当前引导状态</summary>
        private TutorialState state = TutorialState.Idle;

        /// <summary>所有引导步骤定义</summary>
        private List<TutorialStep> allSteps = new List<TutorialStep>();

        /// <summary>玩家引导进度</summary>
        private List<TutorialProgress> playerProgress = new List<TutorialProgress>();

        /// <summary>当前步骤索引</summary>
        private int currentStepIndex = 0;

        /// <summary>当前正在展示的步骤</summary>
        private TutorialStep currentStep;

        /// <summary>引导面板引用</summary>
        private TutorialPanel tutorialPanel;

        /// <summary>引导完成后的回调</summary>
        private Action onTutorialComplete;

        /// <summary>是否正在等待条件满足</summary>
        private bool isWaitingForCondition = false;

        /// <summary>当前条件监听的事件名</summary>
        private string listeningEventName = string.Empty;

        /// <summary>条件检查的协程引用</summary>
        private Coroutine conditionCheckCoroutine;

        // ============================================================
        // 公开属性
        // ============================================================

        /// <summary>引导是否正在进行中</summary>
        public bool IsRunning => state == TutorialState.Running;

        /// <summary>引导是否已完成或已跳过</summary>
        public bool IsFinished => state == TutorialState.Completed || state == TutorialState.Skipped;

        /// <summary>引导是否已完成（非跳过）</summary>
        public bool IsCompleted => state == TutorialState.Completed;

        // ============================================================
        // 生命周期
        // ============================================================

        protected override void OnInitialize()
        {
            base.OnInitialize();

            Debug.Log("[TutorialManager] 初始化完成");
        }

        /// <summary>
        /// 销毁时清理事件监听
        /// </summary>
        protected override void OnDestroy()
        {
            UnregisterAllEventListeners();
            if (conditionCheckCoroutine != null)
            {
                StopCoroutine(conditionCheckCoroutine);
                conditionCheckCoroutine = null;
            }
            base.OnDestroy();
        }

        // ============================================================
        // 公开方法 —— 外部调用入口
        // ============================================================

        /// <summary>
        /// 检查并启动新手引导（登录后调用）
        /// </summary>
        /// <param name="onComplete">引导完成后的回调（无论完成还是跳过）</param>
        public void CheckAndStartTutorial(Action onComplete = null)
        {
            onTutorialComplete = onComplete;

            // 检查本地是否已完成
            if (IsTutorialFinishedLocally())
            {
                Debug.Log("[TutorialManager] 新手引导已完成（本地缓存），跳过检查");
                state = TutorialState.Completed;
                onTutorialComplete?.Invoke();
                return;
            }

            // 从服务端获取进度
            StartCoroutine(LoadTutorialData());
        }

        /// <summary>
        /// 手动触发事件通知（当游戏中触发相关事件时调用）
        /// 例：完成首次战斗后调用 TriggerGameEvent("battle_victory")
        /// </summary>
        /// <param name="eventName">游戏事件名</param>
        public void TriggerGameEvent(string eventName)
        {
            if (state != TutorialState.Running || currentStep == null) return;

            Debug.Log($"[TutorialManager] 收到游戏事件: {eventName}, 当前等待条件: {currentStep.TriggerCondition}");

            // 检查当前步骤是否在等待此事件
            if (currentStep.IsConditionTrigger && currentStep.TriggerCondition == eventName)
            {
                // 条件满足，推进到下一步
                isWaitingForCondition = false;
                AdvanceToNextStep();
            }
        }

        /// <summary>
        /// 暂停引导（打开其他面板时暂停）
        /// </summary>
        public void PauseTutorial()
        {
            if (state != TutorialState.Running) return;

            Debug.Log("[TutorialManager] 暂停引导");
            // 隐藏引导面板但不关闭
            if (tutorialPanel != null)
            {
                tutorialPanel.gameObject.SetActive(false);
            }
        }

        /// <summary>
        /// 恢复引导
        /// </summary>
        public void ResumeTutorial()
        {
            if (state != TutorialState.Running) return;

            Debug.Log("[TutorialManager] 恢复引导");
            if (tutorialPanel != null)
            {
                tutorialPanel.gameObject.SetActive(true);
                // 重新展示当前步骤
                tutorialPanel.ShowStep(currentStep, currentStepIndex, allSteps.Count);
            }
        }

        /// <summary>
        /// 强制重置引导状态（调试用）
        /// </summary>
        public void ResetTutorial()
        {
            state = TutorialState.Idle;
            currentStepIndex = 0;
            allSteps.Clear();
            playerProgress.Clear();
            currentStep = null;
            isWaitingForCondition = false;

            // 清除本地存储
            PlayerPrefs.DeleteKey(PP_TUTORIAL_COMPLETED);
            PlayerPrefs.DeleteKey(PP_TUTORIAL_LAST_STEP);
            PlayerPrefs.DeleteKey(PP_TUTORIAL_SKIPPED);
            PlayerPrefs.Save();

            UnregisterAllEventListeners();

            if (tutorialPanel != null)
            {
                UIManager.Instance.ClosePanel("TutorialPanel");
                tutorialPanel = null;
            }

            Debug.Log("[TutorialManager] 引导状态已重置");
        }

        // ============================================================
        // 数据加载
        // ============================================================

        private IEnumerator LoadTutorialData()
        {
            state = TutorialState.Loading;
            Debug.Log("[TutorialManager] 开始加载引导数据...");

            bool dataLoaded = false;

            // 并行加载步骤定义和进度
            yield return StartCoroutine(QuestApi.GetTutorialSteps((stepsResult) =>
            {
                if (stepsResult != null && stepsResult.IsSuccess() && stepsResult.data != null)
                {
                    allSteps = new List<TutorialStep>(stepsResult.data.Steps ?? new List<TutorialStep>());
                    // 按顺序排列
                    allSteps.Sort((a, b) => a.Order.CompareTo(b.Order));
                    Debug.Log($"[TutorialManager] 步骤定义加载成功: {allSteps.Count}步");
                }
                else
                {
                    Debug.LogWarning($"[TutorialManager] 步骤定义加载失败: {stepsResult?.message}");
                }
            }));

            yield return StartCoroutine(QuestApi.GetTutorialProgress((progressResult) =>
            {
                if (progressResult != null && progressResult.IsSuccess() && progressResult.data != null)
                {
                    playerProgress = new List<TutorialProgress>(progressResult.data.Progress ?? new List<TutorialProgress>());
                    Debug.Log($"[TutorialManager] 进度加载成功: {progressResult.data.Completed}/{progressResult.data.Total}");

                    // 如果服务端显示全部完成
                    if (progressResult.data.IsAllCompleted)
                    {
                        SaveCompletionLocally();
                        state = TutorialState.Completed;
                        onTutorialComplete?.Invoke();
                        return;
                    }

                    dataLoaded = true;
                }
                else
                {
                    Debug.LogWarning($"[TutorialManager] 进度加载失败: {progressResult?.message}");
                    dataLoaded = true; // 继续尝试
                }
            }));

            // 等待两个请求都完成
            if (allSteps.Count == 0)
            {
                Debug.LogWarning("[TutorialManager] 无引导步骤数据，跳过引导");
                state = TutorialState.Completed;
                SaveCompletionLocally();
                onTutorialComplete?.Invoke();
                yield break;
            }

            // 查找第一个未完成的步骤
            currentStepIndex = FindFirstIncompleteStepIndex();

            if (currentStepIndex >= allSteps.Count)
            {
                Debug.Log("[TutorialManager] 所有步骤已完成");
                state = TutorialState.Completed;
                SaveCompletionLocally();
                onTutorialComplete?.Invoke();
                yield break;
            }

            // 启动引导
            StartTutorial();
        }

        private int FindFirstIncompleteStepIndex()
        {
            if (playerProgress == null || playerProgress.Count == 0)
                return 0;

            // 找到第一个状态不为"已完成"的步骤
            for (int i = 0; i < allSteps.Count; i++)
            {
                bool found = false;
                for (int j = 0; j < playerProgress.Count; j++)
                {
                    if (playerProgress[j].StepId == allSteps[i].StepId && playerProgress[j].IsCompleted)
                    {
                        found = true;
                        break;
                    }
                }
                if (!found) return i;
            }

            return allSteps.Count; // 全部完成
        }

        // ============================================================
        // 引导流程控制
        // ============================================================

        private void StartTutorial()
        {
            state = TutorialState.Running;
            Debug.Log($"[TutorialManager] 启动引导，从步骤 {currentStepIndex + 1}/{allSteps.Count} 开始");

            // 打开引导面板
            OpenTutorialPanel();
        }

        private void OpenTutorialPanel()
        {
            // 先确保面板存在
            tutorialPanel = UnityEngine.Object.FindObjectOfType<TutorialPanel>();

            if (tutorialPanel == null)
            {
                // 通过 UIManager 打开面板
                UIManager.Instance.OpenPanel("TutorialPanel");
                tutorialPanel = UnityEngine.Object.FindObjectOfType<TutorialPanel>();
            }

            if (tutorialPanel == null)
            {
                Debug.LogError("[TutorialManager] 无法打开 TutorialPanel");
                return;
            }

            // 设置回调
            tutorialPanel.SetCallbacks(
                OnStepCompleteCallback,     // 步骤完成
                OnTutorialSkipCallback,     // 跳过引导
                OnTutorialFinishCallback    // 引导结束
            );

            // 展示当前步骤
            ShowCurrentStep();
        }

        private void ShowCurrentStep()
        {
            if (currentStepIndex < 0 || currentStepIndex >= allSteps.Count)
            {
                FinishTutorial();
                return;
            }

            currentStep = allSteps[currentStepIndex];

            // 检查是否需要等待条件
            if (currentStep.IsConditionTrigger)
            {
                StartConditionWaiting();
                return;
            }

            // 检查是否需要打开面板
            if (!string.IsNullOrEmpty(currentStep.TargetPanel))
            {
                UIManager.Instance.OpenPanel(currentStep.TargetPanel);
            }

            // 展示步骤
            if (tutorialPanel != null)
            {
                tutorialPanel.gameObject.SetActive(true);
                tutorialPanel.ShowStep(currentStep, currentStepIndex, allSteps.Count);
            }
        }

        private void AdvanceToNextStep()
        {
            currentStepIndex++;

            if (currentStepIndex >= allSteps.Count)
            {
                FinishTutorial();
                return;
            }

            // 通知服务端完成当前步骤
            if (currentStep != null)
            {
                StartCoroutine(QuestApi.CompleteTutorialStep(currentStep.StepId, (result) =>
                {
                    if (result != null && result.IsSuccess())
                    {
                        Debug.Log($"[TutorialManager] 步骤 {currentStep.StepId} 完成上报成功");
                    }
                    else
                    {
                        Debug.LogWarning($"[TutorialManager] 步骤完成上报失败: {result?.message}");
                    }
                }));
            }

            // 保存进度到本地
            SaveLastStepLocally(currentStepIndex);

            // 展示下一步
            ShowCurrentStep();
        }

        private void FinishTutorial()
        {
            state = TutorialState.Completed;
            Debug.Log("[TutorialManager] 新手引导全部完成！");

            // 保存完成状态
            SaveCompletionLocally();

            // 关闭引导面板
            if (tutorialPanel != null)
            {
                tutorialPanel.ForceFinish();
                UIManager.Instance.ClosePanel("TutorialPanel");
                tutorialPanel = null;
            }

            // 清理事件监听
            UnregisterAllEventListeners();

            // 触发引导完成事件
            EventBus.Trigger(Constants.GameEvents.UI_PANEL_CLOSED, "TutorialPanel");

            // 回调
            onTutorialComplete?.Invoke();
        }

        // ============================================================
        // 条件等待
        // ============================================================

        private void StartConditionWaiting()
        {
            if (currentStep == null || string.IsNullOrEmpty(currentStep.TriggerCondition))
            {
                AdvanceToNextStep();
                return;
            }

            isWaitingForCondition = true;
            state = TutorialState.Waiting;
            listeningEventName = currentStep.TriggerCondition;

            Debug.Log($"[TutorialManager] 等待条件触发: {listeningEventName}");

            // 显示提示文本（如果在面板上）
            if (tutorialPanel != null)
            {
                tutorialPanel.gameObject.SetActive(true);
                tutorialPanel.ShowStep(currentStep, currentStepIndex, allSteps.Count);
            }

            // 恢复为 Running 状态（面板仍然可见）
            state = TutorialState.Running;
        }

        // ============================================================
        // 回调方法 —— 由 TutorialPanel 调用
        // ============================================================

        private void OnStepCompleteCallback(int stepId)
        {
            if (state != TutorialState.Running) return;

            Debug.Log($"[TutorialManager] 步骤完成回调: step_id={stepId}");
            AdvanceToNextStep();
        }

        private void OnTutorialSkipCallback()
        {
            if (state != TutorialState.Running) return;

            state = TutorialState.Skipped;
            Debug.Log("[TutorialManager] 用户跳过了新手引导");

            // 通知服务端
            StartCoroutine(QuestApi.SkipTutorial((result) =>
            {
                if (result != null && result.IsSuccess())
                {
                    Debug.Log("[TutorialManager] 跳过引导上报成功");
                }
                else
                {
                    Debug.LogWarning($"[TutorialManager] 跳过引导上报失败: {result?.message}");
                }
            }));

            // 保存跳过状态
            PlayerPrefs.SetInt(PP_TUTORIAL_SKIPPED, 1);
            PlayerPrefs.Save();

            // 关闭面板
            if (tutorialPanel != null)
            {
                tutorialPanel.ForceFinish();
                UIManager.Instance.ClosePanel("TutorialPanel");
                tutorialPanel = null;
            }

            UnregisterAllEventListeners();
            onTutorialComplete?.Invoke();
        }

        private void OnTutorialFinishCallback()
        {
            FinishTutorial();
        }

        // ============================================================
        // 事件监听（自动推进条件步骤）
        // ============================================================

        private void RegisterEventListener(string eventName)
        {
            if (string.IsNullOrEmpty(eventName)) return;
            EventBus.Register(eventName, OnGameEventTriggered);
        }

        private void UnregisterEventListener(string eventName)
        {
            if (string.IsNullOrEmpty(eventName)) return;
            EventBus.Unregister(eventName, OnGameEventTriggered);
        }

        private void UnregisterAllEventListeners()
        {
            // 注销所有可能的引导相关事件
            string[] tutorialEvents = {
                Constants.GameEvents.BATTLE_VICTORY,
                Constants.GameEvents.CARD_ACQUIRED,
                Constants.GameEvents.GUILD_JOINED,
                Constants.GameEvents.PLAYER_DATA_UPDATED,
                Constants.GameEvents.RESOURCE_CHANGED,
                Constants.GameEvents.UI_PANEL_OPENED
            };

            foreach (string evt in tutorialEvents)
            {
                EventBus.Unregister(evt, OnGameEventTriggered);
            }
        }

        private void OnGameEventTriggered()
        {
            // 此方法通过 TriggerGameEvent 处理
            // 也可在此监听 EventBus 事件并转发
        }

        // ============================================================
        // 本地持久化
        // ============================================================

        private bool IsTutorialFinishedLocally()
        {
            return PlayerPrefs.GetInt(PP_TUTORIAL_COMPLETED, 0) == 1;
        }

        private void SaveCompletionLocally()
        {
            PlayerPrefs.SetInt(PP_TUTORIAL_COMPLETED, 1);
            PlayerPrefs.DeleteKey(PP_TUTORIAL_LAST_STEP);
            PlayerPrefs.Save();
            Debug.Log("[TutorialManager] 完成状态已保存到本地");
        }

        private void SaveLastStepLocally(int stepIndex)
        {
            PlayerPrefs.SetInt(PP_TUTORIAL_LAST_STEP, stepIndex);
            PlayerPrefs.Save();
        }
    }
}
