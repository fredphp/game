// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Module
// =============================================================================
// 描述：新手引导管理器 —— 增强型智能引导系统。
//       单例模式（继承 Singleton<T>），支持：
//       - 智能条件检测触发（等级/建筑/战斗/抽卡/任务/社交/资源）
//       - 优先级系统：必做步骤阻塞流程，可选步骤可跳过
//       - 挂起(Suspended)状态 + 自动恢复
//       - 断点恢复：服务重启后从最后未完成步骤继续
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
    /// 新手引导步骤配置 —— 内置默认引导流程的数据结构。
    /// </summary>
    [Serializable]
    public class TutorialStepConfig
    {
        public string stepKey;          // 步骤唯一标识
        public string title;            // 步骤标题
        public string triggerType;      // level/building/battle/gacha/quest/social/resource
        public int triggerValue;        // 触发阈值
        public string uiTarget;         // 高亮 UI 路径
        public string dialogNPC;        // NPC 名称
        public string dialogText;       // 对话内容
        public Vector2 dialogPosition;  // 对话位置 (x:-1左/0中/1右, y:纵向偏移)
        public Vector2 highlightPos;    // 高亮区域中心
        public Vector2 highlightSize;   // 高亮区域尺寸
        public string nextStepKey;      // 手动链接下一步
        public bool isRequired;         // 是否必做（不可跳过）
        public string rewards;          // 奖励 JSON
        public float autoShowDelay;     // 自动展示延迟（秒）
    }

    /// <summary>
    /// 新手引导管理器 - 增强型状态机驱动。
    /// 单例模式，游戏启动后由 GameManager 初始化。
    /// </summary>
    public class TutorialManager : Singleton<TutorialManager>
    {
        private enum TutorialState { Idle, Loading, Waiting, Suspended, Running, Completed, Skipped }

        // PlayerPrefs 键
        private const string PP_COMPLETED = "tutorial_completed_steps";
        private const string PP_CURRENT = "tutorial_current_step";
        private const string PP_SKIPPED = "tutorial_skipped";
        private const float CHECK_INTERVAL = 0.5f;

        private TutorialState state = TutorialState.Idle;
        private TutorialStepConfig[] steps;
        private Dictionary<string, bool> completedSteps = new Dictionary<string, bool>();
        private int currentStepIndex;
        private TutorialStepConfig currentStepConfig;
        private TutorialPanel tutorialPanel;
        private Action onTutorialComplete;
        private List<TutorialStep> serverSteps = new List<TutorialStep>();
        private Coroutine conditionCoroutine;
        private Coroutine autoShowCoroutine;
        private HashSet<string> triggeredEvents = new HashSet<string>();

        /// <summary>引导是否正在进行中（含挂起）</summary>
        public bool IsRunning => state == TutorialState.Running || state == TutorialState.Suspended;
        /// <summary>引导是否已完成或已跳过</summary>
        public bool IsFinished => state == TutorialState.Completed || state == TutorialState.Skipped;
        /// <summary>引导是否已完成（非跳过）</summary>
        public bool IsCompleted => state == TutorialState.Completed;

        protected override void OnInitialize()
        {
            base.OnInitialize();
            RegisterGameEvents();
            Debug.Log("[TutorialManager] 初始化完成");
        }

        protected override void OnDestroy()
        {
            UnregisterGameEvents();
            StopAllCoroutines();
            base.OnDestroy();
        }

        // ============================================================
        // 公开方法
        // ============================================================

        /// <summary>检查并启动新手引导（登录后调用）</summary>
        public void CheckAndStartTutorial(Action onComplete = null)
        {
            onTutorialComplete = onComplete;
            LoadProgress();

            if (IsTutorialFinishedLocally())
            {
                state = TutorialState.Completed;
                onTutorialComplete?.Invoke();
                return;
            }
            StartCoroutine(LoadServerData());
        }

        /// <summary>手动触发游戏事件通知</summary>
        public void TriggerGameEvent(string eventName)
        {
            triggeredEvents.Add(eventName);
            if (state == TutorialState.Suspended) TryResumeFromSuspended();
        }

        /// <summary>暂停引导（打开其他面板时）</summary>
        public void PauseTutorial()
        {
            if (state != TutorialState.Running) return;
            if (tutorialPanel != null) tutorialPanel.gameObject.SetActive(false);
        }

        /// <summary>恢复引导</summary>
        public void ResumeTutorial()
        {
            if (state != TutorialState.Running) return;
            if (tutorialPanel != null && currentStepConfig != null)
            {
                tutorialPanel.gameObject.SetActive(true);
                ShowCurrentStepOnPanel();
            }
        }

        /// <summary>强制重置引导状态（调试用）</summary>
        public void ResetTutorial()
        {
            state = TutorialState.Idle;
            currentStepIndex = 0;
            steps = null;
            completedSteps.Clear();
            currentStepConfig = null;
            triggeredEvents.Clear();
            PlayerPrefs.DeleteKey(PP_COMPLETED);
            PlayerPrefs.DeleteKey(PP_CURRENT);
            PlayerPrefs.DeleteKey(PP_SKIPPED);
            PlayerPrefs.Save();

            if (tutorialPanel != null)
            {
                tutorialPanel.ForceFinish();
                UIManager.Instance.ClosePanel("TutorialPanel");
                tutorialPanel = null;
            }
            StopAllCoroutines();
        }

        // ============================================================
        // 服务端数据加载
        // ============================================================

        private IEnumerator LoadServerData()
        {
            state = TutorialState.Loading;
            bool allDone = false;

            yield return StartCoroutine(QuestApi.GetTutorialSteps(r =>
            {
                if (r != null && r.IsSuccess() && r.data?.Steps != null && r.data.Steps.Count > 0)
                {
                    serverSteps = new List<TutorialStep>(r.data.Steps);
                    serverSteps.Sort((a, b) => a.Order.CompareTo(b.Order));
                }
                allDone = true;
            }));

            if (!allDone) allDone = true;

            yield return StartCoroutine(QuestApi.GetTutorialProgress(r =>
            {
                if (r != null && r.IsSuccess() && r.data != null)
                {
                    if (r.data.IsAllCompleted)
                    {
                        SaveCompletionLocally();
                        state = TutorialState.Completed;
                        onTutorialComplete?.Invoke();
                        return;
                    }
                    if (r.data.Progress != null)
                        foreach (var p in r.data.Progress)
                            if (p.IsCompleted) completedSteps[p.StepId.ToString()] = true;
                }
            }));

            steps = serverSteps.Count > 0 ? ConvertServerSteps() : GetDefaultSteps();
            currentStepIndex = FindFirstIncomplete();

            if (currentStepIndex >= steps.Length) { FinishTutorial(); yield break; }
            StartTutorialAt(currentStepIndex);
        }

        private TutorialStepConfig[] ConvertServerSteps()
        {
            var list = new List<TutorialStepConfig>();
            foreach (var s in serverSteps)
                list.Add(new TutorialStepConfig
                {
                    stepKey = s.StepId.ToString(), title = s.Title, triggerType = s.TriggerType,
                    triggerValue = s.Order, uiTarget = s.TargetUiPath, dialogNPC = s.Speaker,
                    dialogText = s.Description, isRequired = !s.Skippable,
                    nextStepKey = s.NextStepId > 0 ? s.NextStepId.ToString() : null
                });
            return list.ToArray();
        }

        // ============================================================
        // 内置默认步骤（8步）
        // ============================================================

        private TutorialStepConfig[] GetDefaultSteps() => new[]
        {
            new() { stepKey="welcome", title="欢迎来到九州", triggerType="level", triggerValue=1,
                     uiTarget="main_top_bar", dialogNPC="诸葛亮",
                     dialogText="主公，欢迎来到九州大陆！天下大乱，群雄并起，正是英雄用武之时。让我们开始征战吧！",
                     dialogPosition=new Vector2(0f,-100f), isRequired=true, rewards="{\"gold\":1000}", autoShowDelay=1f },
            new() { stepKey="recruit_hero", title="招募第一位武将", triggerType="level", triggerValue=1,
                     uiTarget="btn_recruit", dialogNPC="诸葛亮",
                     dialogText="兵马未动，粮草先行。不过主公，我们更需要的是猛将！点击招募按钮，招揽第一位武将吧。",
                     dialogPosition=new Vector2(-1f,-50f), highlightPos=new Vector2(-350f,350f),
                     highlightSize=new Vector2(80f,80f), nextStepKey="first_battle", isRequired=true, rewards="{\"diamonds\":100}" },
            new() { stepKey="first_battle", title="首次战斗", triggerType="battle", triggerValue=1,
                     uiTarget="btn_battle", dialogNPC="诸葛亮",
                     dialogText="武将已就位，是时候一展身手了！点击战斗按钮，进入第一场战斗，让敌人见识我军威风！",
                     dialogPosition=new Vector2(1f,-50f), highlightPos=new Vector2(350f,350f),
                     highlightSize=new Vector2(80f,80f), nextStepKey="upgrade_building", isRequired=true,
                     rewards="{\"stamina\":50,\"exp\":200}" },
            new() { stepKey="upgrade_building", title="升级建筑", triggerType="building", triggerValue=1,
                     uiTarget="building_panel", dialogNPC="诸葛亮",
                     dialogText="主公大胜！城池是根基，升级主城可解锁更多功能。点击建筑面板，先升级主城吧。",
                     dialogPosition=new Vector2(0f,100f), nextStepKey="join_guild", isRequired=true,
                     rewards="{\"gold\":500}", autoShowDelay=0.5f },
            new() { stepKey="join_guild", title="加入联盟", triggerType="social", triggerValue=1,
                     uiTarget="btn_guild", dialogNPC="诸葛亮",
                     dialogText="独木难支，众志成城。加入一个联盟，与志同道合的盟友并肩作战，攻城略地！",
                     dialogPosition=new Vector2(1f,-50f), highlightPos=new Vector2(250f,350f),
                     highlightSize=new Vector2(80f,80f), nextStepKey="first_10_pull", isRequired=false, rewards="{\"gold\":300}" },
            new() { stepKey="first_10_pull", title="首次十连招募", triggerType="gacha", triggerValue=10,
                     uiTarget="btn_gacha_10", dialogNPC="诸葛亮",
                     dialogText="主公，十连招募必出SR武将！赶紧来一发十连，扩充你的武将阵容吧！",
                     dialogPosition=new Vector2(0f,100f), highlightPos=new Vector2(0f,-200f),
                     highlightSize=new Vector2(300f,80f), nextStepKey="equip_hero", isRequired=false,
                     rewards="{\"diamonds\":50}" },
            new() { stepKey="equip_hero", title="装备武将", triggerType="quest", triggerValue=1,
                     uiTarget="hero_detail_panel", dialogNPC="诸葛亮",
                     dialogText="为武将装备合适的武器和防具，可以大幅提升战力。点击武将详情，试试装备系统吧。",
                     dialogPosition=new Vector2(-1f,-50f), highlightPos=new Vector2(-200f,0f),
                     highlightSize=new Vector2(300f,300f), nextStepKey="daily_sign", isRequired=false,
                     rewards="{\"material\":5}" },
            new() { stepKey="daily_sign", title="每日签到", triggerType="resource", triggerValue=1,
                     uiTarget="btn_daily_sign", dialogNPC="诸葛亮",
                     dialogText="每日签到可领取丰厚奖励，连续签到还有额外惊喜！别忘了每天来看看哦，主公。",
                     dialogPosition=new Vector2(0f,-100f), highlightPos=new Vector2(0f,400f),
                     highlightSize=new Vector2(80f,80f), isRequired=false, rewards="{\"gold\":200,\"diamonds\":20}" }
        };

        // ============================================================
        // 进度查找与断点恢复
        // ============================================================

        private int FindFirstIncomplete()
        {
            if (steps == null) return 0;
            for (int i = 0; i < steps.Length; i++)
                if (!completedSteps.ContainsKey(steps[i].stepKey)) return i;
            return steps.Length;
        }

        // ============================================================
        // 流程控制
        // ============================================================

        private void StartTutorialAt(int index)
        {
            currentStepIndex = index;
            state = TutorialState.Running;
            tutorialPanel = UnityEngine.Object.FindObjectOfType<TutorialPanel>();
            if (tutorialPanel == null)
            {
                UIManager.Instance.OpenPanel("TutorialPanel");
                tutorialPanel = UnityEngine.Object.FindObjectOfType<TutorialPanel>();
            }
            if (tutorialPanel != null)
                tutorialPanel.SetCallbacks(OnStepComplete, OnSkip, OnFinish);
            AdvanceToStep(index);
        }

        private void AdvanceToStep(int index)
        {
            if (index < 0 || index >= steps.Length) { FinishTutorial(); return; }
            currentStepIndex = index;
            currentStepConfig = steps[index];

            // 已完成则跳过
            if (completedSteps.ContainsKey(currentStepConfig.stepKey))
            { AdvanceToStep(index + 1); return; }

            // 条件不满足则挂起
            if (!CheckCondition(currentStepConfig)) { SuspendStep(); return; }

            SaveProgress();

            // 延迟或立即展示
            if (currentStepConfig.autoShowDelay > 0f)
            {
                state = TutorialState.Waiting;
                if (autoShowCoroutine != null) StopCoroutine(autoShowCoroutine);
                autoShowCoroutine = StartCoroutine(DelayedShow(currentStepConfig.autoShowDelay));
            }
            else
            {
                ShowCurrentStepOnPanel();
            }
        }

        private void ShowCurrentStepOnPanel()
        {
            if (currentStepConfig == null || tutorialPanel == null) return;
            state = TutorialState.Running;

            string panel = InferPanel(currentStepConfig.uiTarget);
            if (!string.IsNullOrEmpty(panel)) UIManager.Instance.OpenPanel(panel);

            tutorialPanel.gameObject.SetActive(true);
            tutorialPanel.ShowStep(new TutorialStep
            {
                StepId = currentStepIndex + 1, Title = currentStepConfig.title,
                Description = currentStepConfig.dialogText, Speaker = currentStepConfig.dialogNPC,
                TargetUiPath = currentStepConfig.uiTarget, Skippable = !currentStepConfig.isRequired
            }, currentStepIndex, steps.Length);
        }

        private string InferPanel(string target)
        {
            if (string.IsNullOrEmpty(target)) return null;
            if (target.Contains("recruit") || target.Contains("gacha")) return Constants.PanelNames.DECK;
            if (target.Contains("battle")) return Constants.PanelNames.BATTLE;
            if (target.Contains("building") || target.Contains("sign") || target.Contains("daily"))
                return Constants.PanelNames.MAIN_CITY;
            if (target.Contains("guild")) return Constants.PanelNames.GUILD;
            if (target.Contains("hero") || target.Contains("equip")) return Constants.PanelNames.CARD_DETAIL;
            return null;
        }

        private void AdvanceToNextStep()
        {
            if (currentStepConfig == null) return;
            completedSteps[currentStepConfig.stepKey] = true;
            SaveProgress();

            // 上报服务端
            StartCoroutine(QuestApi.CompleteTutorialStep(currentStepIndex + 1, r => { }));

            // 发放奖励
            if (!string.IsNullOrEmpty(currentStepConfig.rewards))
                EventBus.Trigger(Constants.GameEvents.RESOURCE_CHANGED, currentStepConfig.rewards);

            int next = currentStepIndex + 1;
            if (!string.IsNullOrEmpty(currentStepConfig.nextStepKey))
            {
                int found = FindIndexByKey(currentStepConfig.nextStepKey);
                if (found >= 0) next = found;
            }
            if (next >= steps.Length) { FinishTutorial(); return; }
            AdvanceToStep(next);
        }

        private void FinishTutorial()
        {
            state = TutorialState.Completed;
            SaveCompletionLocally();
            StopAllCoroutines();
            if (tutorialPanel != null)
            {
                tutorialPanel.ForceFinish();
                UIManager.Instance.ClosePanel("TutorialPanel");
                tutorialPanel = null;
            }
            UnregisterGameEvents();
            onTutorialComplete?.Invoke();
        }

        // ============================================================
        // 挂起与恢复
        // ============================================================

        private void SuspendStep()
        {
            state = TutorialState.Suspended;
            if (conditionCoroutine != null) StopCoroutine(conditionCoroutine);
            conditionCoroutine = StartCoroutine(ConditionLoop());
        }

        private void TryResumeFromSuspended()
        {
            if (state != TutorialState.Suspended || currentStepConfig == null) return;
            if (CheckCondition(currentStepConfig))
            {
                if (conditionCoroutine != null) StopCoroutine(conditionCoroutine);
                AdvanceToStep(currentStepIndex);
            }
        }

        private IEnumerator ConditionLoop()
        {
            while (state == TutorialState.Suspended && currentStepConfig != null)
            {
                if (CheckCondition(currentStepConfig)) { AdvanceToStep(currentStepIndex); yield break; }
                yield return new WaitForSeconds(CHECK_INTERVAL);
            }
        }

        // ============================================================
        // 条件检测
        // ============================================================

        private bool CheckCondition(TutorialStepConfig step)
        {
            if (step == null) return false;
            switch (step.triggerType)
            {
                case "level":     return PlayerPrefs.GetInt("player_level", 1) >= step.triggerValue;
                case "building":  return UIManager.Instance.IsPanelOpen(Constants.PanelNames.MAIN_CITY);
                case "battle":    return triggeredEvents.Contains(Constants.GameEvents.BATTLE_START);
                case "gacha":     return PlayerPrefs.GetInt("total_gacha_pulls", 0) >= step.triggerValue;
                case "quest":     return UIManager.Instance.IsPanelOpen(Constants.PanelNames.CARD_DETAIL)
                                       || triggeredEvents.Contains(Constants.GameEvents.CARD_ACQUIRED);
                case "social":    return triggeredEvents.Contains(Constants.GameEvents.GUILD_JOINED);
                case "resource":  return triggeredEvents.Contains(Constants.GameEvents.RESOURCE_CHANGED);
                default: return true;
            }
        }

        // ============================================================
        // 回调
        // ============================================================

        private void OnStepComplete(int stepId) { if (state == TutorialState.Running) AdvanceToNextStep(); }

        private void OnSkip()
        {
            if (state != TutorialState.Running) return;
            if (currentStepConfig != null && currentStepConfig.isRequired) return; // 必做步骤不可跳过

            state = TutorialState.Skipped;
            StartCoroutine(QuestApi.SkipTutorial(r => { }));
            PlayerPrefs.SetInt(PP_SKIPPED, 1); PlayerPrefs.Save();
            StopAllCoroutines();

            if (tutorialPanel != null)
            {
                tutorialPanel.ForceFinish();
                UIManager.Instance.ClosePanel("TutorialPanel");
                tutorialPanel = null;
            }
            UnregisterGameEvents();
            onTutorialComplete?.Invoke();
        }

        private void OnFinish() { FinishTutorial(); }

        // ============================================================
        // 事件监听
        // ============================================================

        private void RegisterGameEvents()
        {
            var events = new[] {
                Constants.GameEvents.PLAYER_LOGIN, Constants.GameEvents.PLAYER_DATA_UPDATED,
                Constants.GameEvents.BATTLE_START, Constants.GameEvents.BATTLE_VICTORY,
                Constants.GameEvents.BATTLE_DEFEAT, Constants.GameEvents.CARD_ACQUIRED,
                Constants.GameEvents.GUILD_JOINED, Constants.GameEvents.RESOURCE_CHANGED,
                Constants.GameEvents.UI_PANEL_OPENED, Constants.GameEvents.UI_PANEL_CLOSED
            };
            foreach (var e in events) EventBus.Register(e, OnGameEvent);
        }

        private void OnGameEvent() { if (state == TutorialState.Suspended) TryResumeFromSuspended(); }

        private void UnregisterGameEvents()
        {
            var events = new[] {
                Constants.GameEvents.PLAYER_LOGIN, Constants.GameEvents.PLAYER_DATA_UPDATED,
                Constants.GameEvents.BATTLE_START, Constants.GameEvents.BATTLE_VICTORY,
                Constants.GameEvents.BATTLE_DEFEAT, Constants.GameEvents.CARD_ACQUIRED,
                Constants.GameEvents.GUILD_JOINED, Constants.GameEvents.RESOURCE_CHANGED,
                Constants.GameEvents.UI_PANEL_OPENED, Constants.GameEvents.UI_PANEL_CLOSED
            };
            foreach (var e in events) EventBus.Unregister(e, OnGameEvent);
        }

        // ============================================================
        // 辅助
        // ============================================================

        private IEnumerator DelayedShow(float delay)
        {
            yield return new WaitForSeconds(delay);
            if (state == TutorialState.Waiting && currentStepConfig != null) ShowCurrentStepOnPanel();
            autoShowCoroutine = null;
        }

        private int FindIndexByKey(string key)
        {
            if (steps == null || string.IsNullOrEmpty(key)) return -1;
            for (int i = 0; i < steps.Length; i++) if (steps[i].stepKey == key) return i;
            return -1;
        }

        private void StopAllCoroutines()
        {
            if (conditionCoroutine != null) { StopCoroutine(conditionCoroutine); conditionCoroutine = null; }
            if (autoShowCoroutine != null) { StopCoroutine(autoShowCoroutine); autoShowCoroutine = null; }
        }

        // ============================================================
        // 持久化
        // ============================================================

        private bool IsTutorialFinishedLocally() => PlayerPrefs.GetInt(PP_COMPLETED, 0) == 1;

        private void SaveCompletionLocally()
        {
            PlayerPrefs.SetInt(PP_COMPLETED, 1);
            PlayerPrefs.DeleteKey(PP_CURRENT); PlayerPrefs.Save();
        }

        private void SaveProgress()
        {
            PlayerPrefs.SetString(PP_COMPLETED, string.Join(",", new List<string>(completedSteps.Keys).ToArray()));
            PlayerPrefs.SetInt(PP_CURRENT, currentStepIndex); PlayerPrefs.Save();
        }

        private void LoadProgress()
        {
            string list = PlayerPrefs.GetString(PP_COMPLETED, "");
            completedSteps.Clear();
            if (!string.IsNullOrEmpty(list))
                foreach (var k in list.Split(','))
                    if (!string.IsNullOrEmpty(k.Trim())) completedSteps[k.Trim()] = true;
            currentStepIndex = PlayerPrefs.GetInt(PP_CURRENT, 0);
        }
    }
}
