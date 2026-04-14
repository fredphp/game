// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Module
// =============================================================================
// 描述：任务主面板 —— 统一管理主线任务、日常任务、成就三大模块的 UI 展示。
//       支持三个 Tab 切换、章节列表浏览、任务进度展示、奖励领取等功能。
//       继承自 UIBase，由 UIManager 统一管理生命周期。
// =============================================================================

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Jiuzhou.Core;
using Game.Core.Network.Api;
using Game.Data;

namespace Game.Module.Quest
{
    /// <summary>
    /// 任务主面板 - 九州争鼎任务系统界面
    /// 功能：三个Tab切换（主线/日常/成就）、章节浏览、任务列表、进度展示、奖励领取
    /// 继承自 UIBase，由 UIManager 统一管理生命周期
    /// </summary>
    public class QuestPanel : UIBase
    {
        // ──────────────────────────────────────
        // Tab 切换区域
        // ──────────────────────────────────────

        [Header("Tab 切换")]
        [SerializeField] private Button mainQuestTabButton;
        [SerializeField] private Button dailyTaskTabButton;
        [SerializeField] private Button achievementTabButton;
        [SerializeField] private Text mainQuestTabText;
        [SerializeField] private Text dailyTaskTabText;
        [SerializeField] private Text achievementTabText;
        [SerializeField] private Image mainQuestTabIndicator;
        [SerializeField] private Image dailyTaskTabIndicator;
        [SerializeField] private Image achievementTabIndicator;
        [SerializeField] private GameObject mainQuestRedDot;
        [SerializeField] private GameObject dailyTaskRedDot;
        [SerializeField] private GameObject achievementRedDot;

        // ──────────────────────────────────────
        // 主线任务区域
        // ──────────────────────────────────────

        [Header("主线任务")]
        [SerializeField] private GameObject mainQuestContainer;
        [SerializeField] private RectTransform chapterListContainer;
        [SerializeField] private GameObject chapterItemPrefab;
        [SerializeField] private GameObject questListPanel;
        [SerializeField] private RectTransform questListContainer;
        [SerializeField] private GameObject questItemPrefab;
        [SerializeField] private Text chapterTitleText;
        [SerializeField] private Text chapterDescText;
        [SerializeField] private Button questListBackButton;

        // ──────────────────────────────────────
        // 日常任务区域
        // ──────────────────────────────────────

        [Header("日常任务")]
        [SerializeField] private GameObject dailyTaskContainer;
        [SerializeField] private RectTransform dailyTaskListContainer;
        [SerializeField] private GameObject dailyTaskItemPrefab;
        [SerializeField] private Text totalActivityText;
        [SerializeField] private RectTransform activityRewardBar;
        [SerializeField] private GameObject activityRewardNodePrefab;

        // ──────────────────────────────────────
        // 成就区域
        // ──────────────────────────────────────

        [Header("成就")]
        [SerializeField] private GameObject achievementContainer;
        [SerializeField] private RectTransform achievementCategoryContainer;
        [SerializeField] private GameObject categoryButtonPrefab;
        [SerializeField] private RectTransform achievementListContainer;
        [SerializeField] private GameObject achievementItemPrefab;
        [SerializeField] private Text achievementSummaryText;

        // ──────────────────────────────────────
        // 导航
        // ──────────────────────────────────────

        [Header("导航")]
        [SerializeField] private Button backButton;

        // ──────────────────────────────────────
        // 奖励预览弹窗
        // ──────────────────────────────────────

        [Header("奖励弹窗")]
        [SerializeField] private GameObject rewardPreviewPanel;
        [SerializeField] private RectTransform rewardListContainer;
        [SerializeField] private GameObject rewardItemPrefab;
        [SerializeField] private Button rewardCloseButton;

        // ──────────────────────────────────────
        // 常量
        // ──────────────────────────────────────

        private static readonly string[] AchievementCategories = { "all", "battle", "card", "guild", "collection", "growth" };
        private static readonly string[] AchievementCategoryNames = { "全部", "战斗", "卡牌", "公会", "收集", "成长" };

        // ──────────────────────────────────────
        // 内部状态
        // ──────────────────────────────────────

        private enum TabType { MainQuest, DailyTask, Achievement }

        private TabType currentTab = TabType.MainQuest;
        private List<MainChapter> chapters = new List<MainChapter>();
        private List<MainQuest> currentChapterQuests = new List<MainQuest>();
        private List<MainQuestProgress> mainQuestProgress = new List<MainQuestProgress>();
        private List<DailyTaskProgress> dailyTasks = new List<DailyTaskProgress>();
        private ActivityInfoResponse activityInfo;
        private AchievementListResponse achievementList;
        private AchievementStatsResponse achievementStats;
        private int selectedChapterId = -1;
        private string selectedAchievementCategory = "all";
        private bool isDataLoading = false;

        // ============================================================
        // 生命周期方法
        // ============================================================

        protected override void Awake()
        {
            base.Awake();

            // Tab 按钮绑定
            if (mainQuestTabButton != null) mainQuestTabButton.onClick.AddListener(() => SwitchTab(TabType.MainQuest));
            if (dailyTaskTabButton != null) dailyTaskTabButton.onClick.AddListener(() => SwitchTab(TabType.DailyTask));
            if (achievementTabButton != null) achievementTabButton.onClick.AddListener(() => SwitchTab(TabType.Achievement));

            // 导航绑定
            if (backButton != null) backButton.onClick.AddListener(OnBack);
            if (questListBackButton != null) questListBackButton.onClick.AddListener(OnQuestListBack);

            // 奖励弹窗
            if (rewardCloseButton != null) rewardCloseButton.onClick.AddListener(CloseRewardPreview);

            // 默认隐藏子面板
            if (rewardPreviewPanel != null) rewardPreviewPanel.SetActive(false);
            if (questListPanel != null) questListPanel.SetActive(false);

            Debug.Log("[QuestPanel] 初始化完成");
        }

        public override void OnOpen(params object[] args)
        {
            base.OnOpen(args);

            // 初始化默认 Tab
            SwitchTab(TabType.MainQuest);
        }

        public override void OnClose()
        {
            isDataLoading = false;
            CloseRewardPreview();
            base.OnClose();
        }

        public override void OnRefresh()
        {
            // 刷新当前 Tab 的数据
            RefreshCurrentTab();
        }

        // ============================================================
        // Tab 切换
        // ============================================================

        private void SwitchTab(TabType tab)
        {
            currentTab = tab;

            // 更新 Tab 高亮
            UpdateTabHighlight();

            // 切换容器可见性
            if (mainQuestContainer != null) mainQuestContainer.SetActive(tab == TabType.MainQuest);
            if (dailyTaskContainer != null) dailyTaskContainer.SetActive(tab == TabType.DailyTask);
            if (achievementContainer != null) achievementContainer.SetActive(tab == TabType.Achievement);

            // 关闭任务列表子面板
            if (questListPanel != null) questListPanel.SetActive(false);

            // 加载对应数据
            RefreshCurrentTab();
        }

        private void UpdateTabHighlight()
        {
            // 清除所有高亮
            UpdateTabButtonStyle(mainQuestTabButton, mainQuestTabText, mainQuestTabIndicator, currentTab == TabType.MainQuest);
            UpdateTabButtonStyle(dailyTaskTabButton, dailyTaskTabText, dailyTaskTabIndicator, currentTab == TabType.DailyTask);
            UpdateTabButtonStyle(achievementTabButton, achievementTabText, achievementTabIndicator, currentTab == TabType.Achievement);
        }

        private void UpdateTabButtonStyle(Button button, Text text, Image indicator, bool active)
        {
            if (text != null)
            {
                text.color = active ? Color.white : new Color(0.6f, 0.6f, 0.6f, 1f);
                text.fontStyle = active ? FontStyle.Bold : FontStyle.Normal;
            }
            if (indicator != null)
            {
                indicator.gameObject.SetActive(active);
            }
        }

        private void RefreshCurrentTab()
        {
            switch (currentTab)
            {
                case TabType.MainQuest:
                    LoadMainQuestData();
                    break;
                case TabType.DailyTask:
                    LoadDailyTaskData();
                    break;
                case TabType.Achievement:
                    LoadAchievementData();
                    break;
            }
        }

        // ============================================================
        // 主线任务
        // ============================================================

        private void LoadMainQuestData()
        {
            if (isDataLoading) return;
            isDataLoading = true;

            // 并行加载章节列表和任务进度
            StartCoroutine(QuestApi.GetMainQuestProgress((progressResult) =>
            {
                if (progressResult != null && progressResult.IsSuccess() && progressResult.data != null)
                {
                    mainQuestProgress = new List<MainQuestProgress>(progressResult.data.progress ?? new List<MainQuestProgress>());
                    Debug.Log($"[QuestPanel] 主线进度加载成功: {mainQuestProgress.Count}条");
                }

                StartCoroutine(QuestApi.GetChapters((chaptersResult) =>
                {
                    isDataLoading = false;

                    if (chaptersResult != null && chaptersResult.IsSuccess() && chaptersResult.data != null)
                    {
                        chapters = new List<MainChapter>(chaptersResult.data.chapters ?? new List<MainChapter>());
                        DisplayChapterList();
                        UpdateMainQuestRedDot();

                        Debug.Log($"[QuestPanel] 章节列表加载成功: {chapters.Count}个章节");
                    }
                    else
                    {
                        Debug.LogWarning($"[QuestPanel] 章节列表加载失败: {chaptersResult?.message}");
                    }
                }));
            }));
        }

        private void DisplayChapterList()
        {
            ClearContainer(chapterListContainer);
            if (chapterListContainer == null || chapterItemPrefab == null) return;

            foreach (var chapter in chapters)
            {
                GameObject chapterObj = Instantiate(chapterItemPrefab, chapterListContainer);

                Text nameText = chapterObj.transform.Find("ChapterName")?.GetComponent<Text>();
                Text descText = chapterObj.transform.Find("ChapterDesc")?.GetComponent<Text>();
                Text progressText = chapterObj.transform.Find("ProgressText")?.GetComponent<Text>();
                Image progressFill = chapterObj.transform.Find("ProgressFill")?.GetComponent<Image>();
                GameObject lockIcon = chapterObj.transform.Find("LockIcon")?.gameObject;
                GameObject completedIcon = chapterObj.transform.Find("CompletedIcon")?.gameObject;
                Button chapterBtn = chapterObj.GetComponent<Button>();

                if (nameText != null) nameText.text = chapter.Name;
                if (descText != null) descText.text = chapter.Description;
                if (progressText != null) progressText.text = $"{chapter.CompletedCount}/{chapter.QuestCount}";

                if (progressFill != null)
                {
                    progressFill.fillAmount = chapter.ProgressPercent / 100f;
                }

                if (lockIcon != null) lockIcon.SetActive(false);
                if (completedIcon != null) completedIcon.SetActive(chapter.IsCompleted);

                if (chapterBtn != null)
                {
                    chapterBtn.onClick.RemoveAllListeners();
                    int capturedId = chapter.Id;
                    chapterBtn.onClick.AddListener(() => OnChapterClick(capturedId));
                }
            }
        }

        private void OnChapterClick(int chapterId)
        {
            selectedChapterId = chapterId;
            if (questListPanel != null) questListPanel.SetActive(true);

            StartCoroutine(QuestApi.GetChapterDetail(chapterId, (result) =>
            {
                if (result != null && result.IsSuccess() && result.data != null)
                {
                    currentChapterQuests = new List<MainQuest>(result.data.Quests ?? new List<MainQuest>());

                    if (chapterTitleText != null) chapterTitleText.text = result.data.Chapter?.Name ?? "";
                    if (chapterDescText != null) chapterDescText.text = result.data.Chapter?.Description ?? "";

                    DisplayQuestList();
                    Debug.Log($"[QuestPanel] 章节详情加载: {chapterId}, {currentChapterQuests.Count}个任务");
                }
                else
                {
                    Debug.LogWarning($"[QuestPanel] 章节详情加载失败: {result?.message}");
                }
            }));
        }

        private void DisplayQuestList()
        {
            ClearContainer(questListContainer);
            if (questListContainer == null || questItemPrefab == null) return;

            foreach (var quest in currentChapterQuests)
            {
                // 查找对应的进度
                MainQuestProgress progress = FindMainQuestProgress(quest.Id);

                GameObject questObj = Instantiate(questItemPrefab, questListContainer);

                Text titleText = questObj.transform.Find("QuestTitle")?.GetComponent<Text>();
                Text descText = questObj.transform.Find("QuestDesc")?.GetComponent<Text>();
                Text typeText = questObj.transform.Find("QuestType")?.GetComponent<Text>();
                Text statusText = questObj.transform.Find("StatusText")?.GetComponent<Text>();
                Image progressBar = questObj.transform.Find("ProgressBar")?.GetComponent<Image>();
                Text progressLabel = questObj.transform.Find("ProgressLabel")?.GetComponent<Text>();
                Button actionButton = questObj.transform.Find("ActionButton")?.GetComponent<Button>();
                Text actionButtonText = questObj.transform.Find("ActionButton/Text")?.GetComponent<Text>();
                GameObject redDot = questObj.transform.Find("RedDot")?.gameObject;

                if (titleText != null) titleText.text = quest.Title;
                if (descText != null) descText.text = quest.Description;
                if (typeText != null) typeText.text = quest.GetQuestTypeName();

                if (progress != null)
                {
                    if (statusText != null) statusText.text = progress.GetStatusName();
                    if (progressBar != null) progressBar.fillAmount = progress.ProgressPercent / 100f;
                    if (progressLabel != null) progressLabel.text = $"{progress.CurrentProgress}/{progress.TargetProgress}";
                    if (redDot != null) redDot.SetActive(progress.CanClaim);

                    if (actionButton != null)
                    {
                        actionButton.onClick.RemoveAllListeners();
                        if (progress.CanClaim)
                        {
                            if (actionButtonText != null) actionButtonText.text = "领取";
                            int capturedId = quest.Id;
                            actionButton.onClick.AddListener(() => OnClaimMainQuest(capturedId));
                        }
                        else if (progress.IsAvailable)
                        {
                            if (actionButtonText != null) actionButtonText.text = "接取";
                            int capturedId = quest.Id;
                            actionButton.onClick.AddListener(() => OnCompleteMainQuest(capturedId));
                        }
                        else
                        {
                            actionButton.interactable = false;
                            if (actionButtonText != null) actionButtonText.text = progress.IsClaimed ? "已完成" : "进行中";
                        }
                    }
                }
                else
                {
                    if (statusText != null) statusText.text = "未解锁";
                    if (actionButton != null) actionButton.interactable = false;
                }
            }
        }

        private MainQuestProgress FindMainQuestProgress(int questId)
        {
            if (mainQuestProgress == null) return null;
            for (int i = 0; i < mainQuestProgress.Count; i++)
            {
                if (mainQuestProgress[i].QuestId == questId)
                    return mainQuestProgress[i];
            }
            return null;
        }

        private void OnClaimMainQuest(int questId)
        {
            StartCoroutine(QuestApi.ClaimMainQuest(questId, (result) =>
            {
                if (result != null && result.IsSuccess() && result.data != null)
                {
                    Debug.Log("[QuestPanel] 主线奖励领取成功");
                    EventBus.Trigger(Constants.GameEvents.RESOURCE_CHANGED);

                    // 显示奖励预览
                    ShowRewardPreview(result.data.Rewards);

                    // 刷新数据
                    LoadMainQuestData();
                }
                else
                {
                    Debug.LogWarning($"[QuestPanel] 主线奖励领取失败: {result?.message}");
                }
            }));
        }

        private void OnCompleteMainQuest(int questId)
        {
            StartCoroutine(QuestApi.CompleteMainQuest(questId, (result) =>
            {
                if (result != null && result.IsSuccess())
                {
                    Debug.Log("[QuestPanel] 主线任务接取/完成成功");
                    LoadMainQuestData();
                }
                else
                {
                    Debug.LogWarning($"[QuestPanel] 主线任务操作失败: {result?.message}");
                }
            }));
        }

        private void OnQuestListBack()
        {
            if (questListPanel != null) questListPanel.SetActive(false);
            selectedChapterId = -1;
        }

        private void UpdateMainQuestRedDot()
        {
            if (mainQuestRedDot == null) return;
            bool hasClaimable = false;
            for (int i = 0; i < mainQuestProgress.Count; i++)
            {
                if (mainQuestProgress[i].CanClaim)
                {
                    hasClaimable = true;
                    break;
                }
            }
            mainQuestRedDot.SetActive(hasClaimable);
        }

        // ============================================================
        // 日常任务
        // ============================================================

        private void LoadDailyTaskData()
        {
            if (isDataLoading) return;
            isDataLoading = true;

            // 并行加载日常任务和活跃度信息
            StartCoroutine(QuestApi.GetDailyTasks((taskResult) =>
            {
                if (taskResult != null && taskResult.IsSuccess() && taskResult.data != null)
                {
                    dailyTasks = new List<DailyTaskProgress>(taskResult.data.Tasks ?? new List<DailyTaskProgress>());
                    if (totalActivityText != null)
                        totalActivityText.text = $"活跃度: {taskResult.data.TotalActivity}";

                    Debug.Log($"[QuestPanel] 日常任务加载成功: {dailyTasks.Count}个任务");
                }

                StartCoroutine(QuestApi.GetActivityInfo((activityResult) =>
                {
                    isDataLoading = false;

                    if (activityResult != null && activityResult.IsSuccess() && activityResult.data != null)
                    {
                        activityInfo = activityResult.data;
                        DisplayActivityRewardBar();
                        UpdateDailyTaskRedDot();
                    }

                    DisplayDailyTaskList();
                }));
            }));
        }

        private void DisplayDailyTaskList()
        {
            ClearContainer(dailyTaskListContainer);
            if (dailyTaskListContainer == null || dailyTaskItemPrefab == null) return;

            foreach (var taskProgress in dailyTasks)
            {
                GameObject taskObj = Instantiate(dailyTaskItemPrefab, dailyTaskListContainer);

                Text titleText = taskObj.transform.Find("TaskTitle")?.GetComponent<Text>();
                Text descText = taskObj.transform.Find("TaskDesc")?.GetComponent<Text>();
                Image progressBar = taskObj.transform.Find("ProgressBar")?.GetComponent<Image>();
                Text progressLabel = taskObj.transform.Find("ProgressLabel")?.GetComponent<Text>();
                Text rewardText = taskObj.transform.Find("RewardText")?.GetComponent<Text>();
                Text pointsText = taskObj.transform.Find("PointsText")?.GetComponent<Text>();
                Button claimButton = taskObj.transform.Find("ClaimButton")?.GetComponent<Button>();
                Text claimButtonText = taskObj.transform.Find("ClaimButton/Text")?.GetComponent<Text>();
                GameObject redDot = taskObj.transform.Find("RedDot")?.gameObject;

                DailyTask task = taskProgress.Task;
                if (titleText != null) titleText.text = task != null ? task.Title : $"任务#{taskProgress.TaskId}";
                if (descText != null) descText.text = task != null ? task.Description : "";
                if (progressBar != null) progressBar.fillAmount = taskProgress.ProgressPercent / 100f;
                if (progressLabel != null) progressLabel.text = $"{taskProgress.CurrentProgress}/{taskProgress.TargetCount}";
                if (pointsText != null) pointsText.text = task != null ? $"+{task.ActivityPoints}活跃" : "";

                // 奖励预览文本
                if (rewardText != null && task != null && task.Rewards != null)
                {
                    string rewardStr = "";
                    foreach (var r in task.Rewards)
                    {
                        if (rewardStr.Length > 0) rewardStr += ", ";
                        rewardStr += r.GetDisplayText();
                    }
                    rewardText.text = rewardStr;
                }

                if (redDot != null) redDot.SetActive(taskProgress.CanClaim);

                if (claimButton != null)
                {
                    claimButton.onClick.RemoveAllListeners();
                    if (taskProgress.CanClaim)
                    {
                        if (claimButtonText != null) claimButtonText.text = "领取";
                        int capturedId = taskProgress.TaskId;
                        claimButton.onClick.AddListener(() => OnClaimDailyTask(capturedId));
                    }
                    else
                    {
                        claimButton.interactable = false;
                        if (claimButtonText != null) claimButtonText.text = taskProgress.IsClaimed ? "已领取" : "未完成";
                    }
                }
            }
        }

        private void DisplayActivityRewardBar()
        {
            if (activityInfo == null || activityRewardBar == null || activityRewardNodePrefab == null) return;

            // 清除旧的节点
            for (int i = activityRewardBar.childCount - 1; i >= 0; i--)
                Destroy(activityRewardBar.GetChild(i).gameObject);

            foreach (var reward in activityInfo.Rewards)
            {
                GameObject nodeObj = Instantiate(activityRewardNodePrefab, activityRewardBar);

                Text pointsText = nodeObj.transform.Find("PointsText")?.GetComponent<Text>();
                Button claimBtn = nodeObj.transform.Find("ClaimButton")?.GetComponent<Button>();
                GameObject checkIcon = nodeObj.transform.Find("CheckIcon")?.gameObject;
                Image bgImage = nodeObj.GetComponent<Image>();
                Image lineFill = nodeObj.transform.Find("LineFill")?.GetComponent<Image>();

                if (pointsText != null) pointsText.text = $"{reward.RequiredPoints}";

                bool isClaimed = activityInfo.IsClaimed(reward.RequiredPoints);
                bool canClaim = activityInfo.CurrentPoints >= reward.RequiredPoints && !isClaimed;

                if (checkIcon != null) checkIcon.SetActive(isClaimed);
                if (bgImage != null) bgImage.color = isClaimed ? new Color(0.3f, 0.8f, 0.3f, 1f) : (canClaim ? Color.yellow : Color.gray);

                if (lineFill != null)
                {
                    // 显示当前进度是否达到此节点
                    float fillPercent = Mathf.Clamp01((float)activityInfo.CurrentPoints / reward.RequiredPoints);
                    lineFill.fillAmount = isClaimed ? 1f : fillPercent;
                }

                if (claimBtn != null)
                {
                    claimBtn.onClick.RemoveAllListeners();
                    if (canClaim)
                    {
                        claimBtn.onClick.AddListener(() => OnClaimActivityReward(reward.RequiredPoints));
                    }
                    else
                    {
                        claimBtn.interactable = false;
                    }
                }
            }
        }

        private void OnClaimDailyTask(int taskId)
        {
            StartCoroutine(QuestApi.ClaimDailyTask(taskId, (result) =>
            {
                if (result != null && result.IsSuccess() && result.data != null)
                {
                    Debug.Log("[QuestPanel] 日常任务奖励领取成功");
                    EventBus.Trigger(Constants.GameEvents.RESOURCE_CHANGED);
                    ShowRewardPreview(result.data.Rewards);
                    LoadDailyTaskData();
                }
                else
                {
                    Debug.LogWarning($"[QuestPanel] 日常任务奖励领取失败: {result?.message}");
                }
            }));
        }

        private void OnClaimActivityReward(int points)
        {
            StartCoroutine(QuestApi.ClaimActivityReward(points, (result) =>
            {
                if (result != null && result.IsSuccess() && result.data != null)
                {
                    Debug.Log($"[QuestPanel] 活跃度奖励领取成功: {points}点");
                    EventBus.Trigger(Constants.GameEvents.RESOURCE_CHANGED);
                    ShowRewardPreview(result.data.Rewards);
                    LoadDailyTaskData();
                }
                else
                {
                    Debug.LogWarning($"[QuestPanel] 活跃度奖励领取失败: {result?.message}");
                }
            }));
        }

        private void UpdateDailyTaskRedDot()
        {
            if (dailyTaskRedDot == null) return;
            bool hasClaimable = false;
            for (int i = 0; i < dailyTasks.Count; i++)
            {
                if (dailyTasks[i].CanClaim) { hasClaimable = true; break; }
            }

            // 检查活跃度奖励是否可领取
            if (!hasClaimable && activityInfo != null)
            {
                foreach (var reward in activityInfo.Rewards)
                {
                    if (activityInfo.CurrentPoints >= reward.RequiredPoints && !activityInfo.IsClaimed(reward.RequiredPoints))
                    {
                        hasClaimable = true;
                        break;
                    }
                }
            }

            dailyTaskRedDot.SetActive(hasClaimable);
        }

        // ============================================================
        // 成就
        // ============================================================

        private void LoadAchievementData()
        {
            if (isDataLoading) return;
            isDataLoading = true;

            // 加载统计数据
            StartCoroutine(QuestApi.GetAchievementStats((statsResult) =>
            {
                if (statsResult != null && statsResult.IsSuccess() && statsResult.data != null)
                {
                    achievementStats = statsResult.data;
                    if (achievementSummaryText != null)
                    {
                        achievementSummaryText.text = $"成就: {achievementStats.Completed}/{achievementStats.TotalAchievements} | 可领奖: {achievementStats.Claimable}";
                    }
                    UpdateAchievementRedDot();
                }

                // 加载分类列表
                DisplayAchievementCategories();
                LoadAchievementsByCategory(selectedAchievementCategory);
            }));
        }

        private void DisplayAchievementCategories()
        {
            ClearContainer(achievementCategoryContainer);
            if (achievementCategoryContainer == null || categoryButtonPrefab == null) return;

            for (int i = 0; i < AchievementCategories.Length; i++)
            {
                string category = AchievementCategories[i];
                string displayName = AchievementCategoryNames[i];

                GameObject btnObj = Instantiate(categoryButtonPrefab, achievementCategoryContainer);
                Text btnText = btnObj.transform.Find("CategoryText")?.GetComponent<Text>();
                Button btn = btnObj.GetComponent<Button>();

                if (btnText != null) btnText.text = displayName;

                if (btn != null)
                {
                    btn.onClick.RemoveAllListeners();
                    string capturedCategory = category;
                    btn.onClick.AddListener(() => OnCategoryClick(capturedCategory));
                }

                // 高亮当前选中分类
                UpdateCategoryHighlight(btnObj, category == selectedAchievementCategory);
            }
        }

        private void OnCategoryClick(string category)
        {
            selectedAchievementCategory = category;
            DisplayAchievementCategories();
            LoadAchievementsByCategory(category);
        }

        private void UpdateCategoryHighlight(GameObject btnObj, bool active)
        {
            Image bg = btnObj?.GetComponent<Image>();
            Text text = btnObj?.transform.Find("CategoryText")?.GetComponent<Text>();

            if (bg != null)
            {
                bg.color = active ? new Color(0.9f, 0.7f, 0.2f, 1f) : new Color(0.3f, 0.3f, 0.3f, 1f);
            }
            if (text != null)
            {
                text.color = active ? Color.white : new Color(0.7f, 0.7f, 0.7f, 1f);
                text.fontStyle = active ? FontStyle.Bold : FontStyle.Normal;
            }
        }

        private void LoadAchievementsByCategory(string category)
        {
            isDataLoading = true;

            StartCoroutine(QuestApi.GetAchievements(category, (result) =>
            {
                isDataLoading = false;

                if (result != null && result.IsSuccess() && result.data != null)
                {
                    achievementList = result.data;
                    DisplayAchievementList();
                    Debug.Log($"[QuestPanel] 成就列表加载成功: {achievementList.Achievements?.Count ?? 0}个成就");
                }
                else
                {
                    Debug.LogWarning($"[QuestPanel] 成就列表加载失败: {result?.message}");
                }
            }));
        }

        private void DisplayAchievementList()
        {
            ClearContainer(achievementListContainer);
            if (achievementListContainer == null || achievementItemPrefab == null || achievementList == null) return;

            List<AchievementProgress> achievements = achievementList.Achievements;
            if (achievements == null) return;

            foreach (var achProgress in achievements)
            {
                GameObject achObj = Instantiate(achievementItemPrefab, achievementListContainer);

                Text nameText = achObj.transform.Find("AchName")?.GetComponent<Text>();
                Text descText = achObj.transform.Find("AchDesc")?.GetComponent<Text>();
                Text rarityText = achObj.transform.Find("RarityText")?.GetComponent<Text>();
                Text pointsText = achObj.transform.Find("PointsText")?.GetComponent<Text>();
                Image progressBar = achObj.transform.Find("ProgressBar")?.GetComponent<Image>();
                Text progressLabel = achObj.transform.Find("ProgressLabel")?.GetComponent<Text>();
                Button claimButton = achObj.transform.Find("ClaimButton")?.GetComponent<Button>();
                Text claimButtonText = achObj.transform.Find("ClaimButton/Text")?.GetComponent<Text>();
                GameObject redDot = achObj.transform.Find("RedDot")?.gameObject;
                Image rarityBg = achObj.transform.Find("RarityBg")?.GetComponent<Image>();

                Achievement ach = achProgress.Achievement;
                if (nameText != null) nameText.text = achProgress.GetDisplayName();
                if (descText != null) descText.text = achProgress.GetDisplayDescription();
                if (rarityText != null) rarityText.text = ach != null ? ach.GetRarityName() : "";
                if (pointsText != null) pointsText.text = ach != null ? $"{ach.Points}点" : "";
                if (progressBar != null) progressBar.fillAmount = achProgress.ProgressPercent / 100f;
                if (progressLabel != null) progressLabel.text = $"{achProgress.CurrentValue}/{achProgress.TargetValue}";

                // 稀有度背景色
                if (rarityBg != null && ach != null)
                {
                    rarityBg.color = ach.GetRarityColor();
                }

                if (redDot != null) redDot.SetActive(achProgress.CanClaim);

                if (claimButton != null)
                {
                    claimButton.onClick.RemoveAllListeners();
                    if (achProgress.CanClaim)
                    {
                        if (claimButtonText != null) claimButtonText.text = "领取";
                        int capturedId = achProgress.AchievementId;
                        claimButton.onClick.AddListener(() => OnClaimAchievement(capturedId));
                    }
                    else
                    {
                        claimButton.interactable = false;
                        if (claimButtonText != null) claimButtonText.text = achProgress.IsClaimed ? "已领取" : "未完成";
                    }
                }
            }
        }

        private void OnClaimAchievement(int achievementId)
        {
            StartCoroutine(QuestApi.ClaimAchievement(achievementId, (result) =>
            {
                if (result != null && result.IsSuccess() && result.data != null)
                {
                    Debug.Log("[QuestPanel] 成就奖励领取成功");
                    EventBus.Trigger(Constants.GameEvents.RESOURCE_CHANGED);
                    ShowRewardPreview(result.data.Rewards);
                    LoadAchievementData();
                }
                else
                {
                    Debug.LogWarning($"[QuestPanel] 成就奖励领取失败: {result?.message}");
                }
            }));
        }

        private void UpdateAchievementRedDot()
        {
            if (achievementRedDot == null || achievementStats == null) return;
            achievementRedDot.SetActive(achievementStats.Claimable > 0);
        }

        // ============================================================
        // 奖励预览
        // ============================================================

        private void ShowRewardPreview(List<RewardItem> rewards)
        {
            if (rewardPreviewPanel == null || rewards == null || rewards.Count == 0) return;

            rewardPreviewPanel.SetActive(true);
            ClearContainer(rewardListContainer);

            foreach (var reward in rewards)
            {
                GameObject rewardObj = Instantiate(rewardItemPrefab, rewardListContainer);

                Image icon = rewardObj.transform.Find("RewardIcon")?.GetComponent<Image>();
                Text nameText = rewardObj.transform.Find("RewardName")?.GetComponent<Text>();
                Text amountText = rewardObj.transform.Find("RewardAmount")?.GetComponent<Text>();

                if (nameText != null) nameText.text = reward.Name ?? reward.GetTypeName();
                if (amountText != null) amountText.text = $"x{reward.Amount}";

                if (icon != null)
                {
                    icon.color = reward.GetRarityColor();
                }
            }
        }

        private void CloseRewardPreview()
        {
            if (rewardPreviewPanel != null) rewardPreviewPanel.SetActive(false);
        }

        // ============================================================
        // 辅助方法
        // ============================================================

        private void ClearContainer(RectTransform container)
        {
            if (container == null) return;
            for (int i = container.childCount - 1; i >= 0; i--)
                Destroy(container.GetChild(i).gameObject);
        }

        private void OnBack()
        {
            if (questListPanel != null && questListPanel.activeSelf)
            {
                OnQuestListBack();
                return;
            }
            UIManager.Instance.ClosePanel(PanelName);
        }

        // ============================================================
        // 清理
        // ============================================================

        protected override void OnDestroy()
        {
            if (mainQuestTabButton != null) mainQuestTabButton.onClick.RemoveAllListeners();
            if (dailyTaskTabButton != null) dailyTaskTabButton.onClick.RemoveAllListeners();
            if (achievementTabButton != null) achievementTabButton.onClick.RemoveAllListeners();
            if (backButton != null) backButton.onClick.RemoveAllListeners();
            if (questListBackButton != null) questListBackButton.onClick.RemoveAllListeners();
            if (rewardCloseButton != null) rewardCloseButton.onClick.RemoveAllListeners();
            base.OnDestroy();
        }
    }
}
