// 九州争鼎 - 主城面板：资源栏 | 政务官 | 城池建筑 | 快捷操作 | 导航栏 | 公告 | 服务器信息
// 继承自 Jiuzhou.Core.UIBase，由 UIManager 统一管理。

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Jiuzhou.Core;
using Game.Core.Network.Api;
using Game.Data;

namespace Game.Module.MainCity
{
    public class MainCityPanel : UIBase
    {
        private const int STAMINA_MAX = 120;
        private const int STAMINA_REGEN_SECONDS = 300;
        private const int STAMINA_REGEN_AMOUNT = 1;
        private const int BUILDING_QUEUE_MAX = 6;

        // ────────────────────── §1 资源栏 ──────────────────────

        [Header("§1 资源栏 - 玩家信息")]
        [SerializeField] private Image playerAvatarImage;
        [SerializeField] private Text playerNameText;
        [SerializeField] private Text playerLevelText;
        [SerializeField] private Image vipBadgeImage;
        [SerializeField] private Text vipLevelText;

        [Header("§1 资源栏 - 资源显示")]
        [SerializeField] private Text goldText;
        [SerializeField] private Text diamondsText;
        [SerializeField] private Text staminaText;
        [SerializeField] private Text prestigeText;
        [SerializeField] private Image staminaBarFill;
        [SerializeField] private Text staminaTimerText;
        [SerializeField] private Text staminaRegenHintText;
        [SerializeField] private Button goldAddButton;
        [SerializeField] private Button diamondsAddButton;
        [SerializeField] private Button staminaAddButton;
        [SerializeField] private Button prestigeAddButton;

        // ────────────────────── §2 政务官 ──────────────────────

        [Header("§2 政务官 - 建造队列")]
        [SerializeField] private Transform buildingQueueContainer;
        [SerializeField] private GameObject buildingQueueSlotPrefab;
        [SerializeField] private Button speedUpAllButton;
        [SerializeField] private Text speedUpCostText;
        [SerializeField] private Text freeInstantBuildText;

        // ────────────────────── §3 城池建筑区 ──────────────────────

        [Header("§3 城池建筑区")]
        [SerializeField] private Button commandCenterButton;
        [SerializeField] private Button barracksButton;
        [SerializeField] private Button academyButton;
        [SerializeField] private Button blacksmithButton;
        [SerializeField] private Button warehouseButton;
        [SerializeField] private Button tavernButton;
        [SerializeField] private Text commandCenterLevelText;
        [SerializeField] private Text barracksLevelText;
        [SerializeField] private Text academyLevelText;
        [SerializeField] private Text blacksmithLevelText;
        [SerializeField] private Text warehouseLevelText;
        [SerializeField] private Text tavernLevelText;
        [SerializeField] private GameObject[] buildingUpgradeIndicators;

        // ────────────────────── §4 快捷操作栏 ──────────────────────

        [Header("§4 快捷操作栏")]
        [SerializeField] private Button questButton;
        [SerializeField] private GameObject questRedDot;
        [SerializeField] private Button dailySignInButton;
        [SerializeField] private Text signInButtonText;
        [SerializeField] private Button activityButton;
        [SerializeField] private Text activityProgressText;
        [SerializeField] private Button allianceButton;
        [SerializeField] private Button battleEntryButton;
        [SerializeField] private Text battleEntryCountText;
        [SerializeField] private Button mapEntryButton;
        [SerializeField] private Text marchCountBadgeText;

        // ────────────────────── §5 底部导航栏 ──────────────────────

        [Header("§5 底部导航栏")]
        [SerializeField] private Button navHomeButton;
        [SerializeField] private Button navCardButton;
        [SerializeField] private Button navBagButton;
        [SerializeField] private Button navWorldButton;
        [SerializeField] private Button navMoreButton;
        [SerializeField] private Image[] navTabIndicators;

        // ────────────────────── §6 公告横幅 ──────────────────────

        [Header("§6 公告横幅")]
        [SerializeField] private ScrollRect announcementScrollRect;
        [SerializeField] private Text announcementContentText;
        [SerializeField] private GameObject announcementNewBadge;
        [SerializeField] private RectTransform announcementContentRect;

        // ────────────────────── §7 服务器信息 ──────────────────────

        [Header("§7 服务器信息栏")]
        [SerializeField] private Text serverInfoText;

        // ────────────────────── 内部状态 ──────────────────────

        private User currentProfile;
        private int displayedGold, displayedDiamonds, displayedStamina, displayedPrestige;
        private bool isRefreshing;
        private Coroutine staminaRegenCoroutine, refreshCoroutine, announcementScrollCoroutine;
        private int currentNavIndex;
        private readonly Dictionary<string, int> buildingLevels = new Dictionary<string, int>
        {
            { "command_center", 1 }, { "barracks", 1 }, { "academy", 1 },
            { "blacksmith", 1 }, { "warehouse", 1 }, { "tavern", 1 }
        };
        private readonly List<BuildingQueueSlot> queueSlots = new List<BuildingQueueSlot>();

        // ============================================================
        // 建造队列槽位数据
        // ============================================================

        [Serializable]
        public class BuildingQueueSlot
        {
            public string buildingName;
            public int level, remainSeconds;
            public bool isActive;
            public GameObject slotGameObject;
            public Text nameText, levelText, timerText;
            public Image iconImage;

            public void UpdateDisplay()
            {
                if (!isActive || slotGameObject == null) return;
                slotGameObject.SetActive(true);
                if (nameText != null) nameText.text = buildingName;
                if (levelText != null) levelText.text = $"Lv.{level}";
                if (timerText != null)
                {
                    if (remainSeconds > 0)
                    {
                        int m = remainSeconds / 60, s = remainSeconds % 60;
                        timerText.text = remainSeconds >= 3600
                            ? $"{remainSeconds / 3600}时{m % 60}分{s}秒"
                            : $"{m}分{s}秒";
                    }
                    else timerText.text = "已完成";
                }
            }
        }

        // ============================================================
        // 生命周期
        // ============================================================

        protected override void Awake()
        {
            base.Awake();
            // §3 建筑按钮
            RegisterBuildingButton(commandCenterButton, "command_center");
            RegisterBuildingButton(barracksButton, "barracks");
            RegisterBuildingButton(academyButton, "academy");
            RegisterBuildingButton(blacksmithButton, "blacksmith");
            RegisterBuildingButton(warehouseButton, "warehouse");
            RegisterBuildingButton(tavernButton, "tavern");
            if (speedUpAllButton != null) speedUpAllButton.onClick.AddListener(OnSpeedUpAllClick);
            UpdateBuildingLevelBadges();

            // §4 快捷操作
            if (questButton != null) questButton.onClick.AddListener(() => OnQuickAction("quest"));
            if (dailySignInButton != null) dailySignInButton.onClick.AddListener(() => OnQuickAction("daily_signin"));
            if (activityButton != null) activityButton.onClick.AddListener(() => OnQuickAction("activity"));
            if (allianceButton != null) allianceButton.onClick.AddListener(() => OnQuickAction("alliance"));
            if (battleEntryButton != null) battleEntryButton.onClick.AddListener(() => OnQuickAction("battle"));
            if (mapEntryButton != null) mapEntryButton.onClick.AddListener(() => OnQuickAction("map"));

            // §1 资源快捷购买
            if (goldAddButton != null) goldAddButton.onClick.AddListener(() => OnQuickAction("buy_gold"));
            if (diamondsAddButton != null) diamondsAddButton.onClick.AddListener(() => OnQuickAction("buy_diamonds"));
            if (staminaAddButton != null) staminaAddButton.onClick.AddListener(() => OnQuickAction("buy_stamina"));
            if (prestigeAddButton != null) prestigeAddButton.onClick.AddListener(() => OnQuickAction("buy_prestige"));

            // §5 导航栏
            if (navHomeButton != null) navHomeButton.onClick.AddListener(() => OnNavTabClick(0));
            if (navCardButton != null) navCardButton.onClick.AddListener(() => OnNavTabClick(1));
            if (navBagButton != null) navBagButton.onClick.AddListener(() => OnNavTabClick(2));
            if (navWorldButton != null) navWorldButton.onClick.AddListener(() => OnNavTabClick(3));
            if (navMoreButton != null) navMoreButton.onClick.AddListener(() => OnNavTabClick(4));

            // §6 公告
            if (announcementNewBadge != null) announcementNewBadge.SetActive(false);

            // 默认文字
            SetTextSafe(signInButtonText, "签到");
            SetTextSafe(activityProgressText, "0/100");
            SetTextSafe(speedUpCostText, "全部加速");
            SetTextSafe(freeInstantBuildText, "免费秒建: 0次");
            SetTextSafe(staminaRegenHintText, "每5分钟恢复1点");
            SetTextSafe(serverInfoText, "在线: 12,856 | 九州1区 | 服务器延迟: 32ms");
        }

        public override void OnOpen(params object[] args)
        {
            base.OnOpen(args);
            RefreshProfile();
            StartStaminaRegenTimer();
            StartPeriodicRefresh();
            RegisterEvents();
            StartAnnouncementScroll();
            SetNavTabActive(0);
        }

        public override void OnClose()
        {
            StopAllCoroutines();
            UnregisterEvents();
            base.OnClose();
        }

        public override void OnRefresh() => RefreshProfile();

        protected override void OnDestroy()
        {
            StopAllCoroutines();
            UnregisterEvents();
            foreach (var btn in GetAllButtons()) if (btn != null) btn.onClick.RemoveAllListeners();
            base.OnDestroy();
        }

        // ============================================================
        // §1 资源栏 - 玩家信息 & 资源
        // ============================================================

        /// <summary>刷新全部玩家信息（头像、昵称、等级、VIP、资源）</summary>
        public void UpdatePlayerInfo(User user)
        {
            if (user == null) return;
            currentProfile = user;
            string displayName = !string.IsNullOrEmpty(user.Nickname) ? user.Nickname : user.Username;
            SetTextSafe(playerNameText, displayName);
            SetTextSafe(playerLevelText, $"Lv.{user.VipLevel}");
            SetTextSafe(vipLevelText, $"VIP{user.VipLevel}");
            UpdateResources(user);
        }

        /// <summary>更新所有资源显示（带数字滚动动画）</summary>
        public void UpdateResources(User user)
        {
            if (user == null) return;
            StartCoroutine(AnimateResourceChange(goldText, ref displayedGold, user.Gold));
            StartCoroutine(AnimateResourceChange(diamondsText, ref displayedDiamonds, user.Diamonds));
            StartCoroutine(AnimateResourceChange(staminaText, ref displayedStamina, user.Stamina, $"/{STAMINA_MAX}"));
            int prestige = displayedPrestige > 0 ? displayedPrestige : 50;
            StartCoroutine(AnimateResourceChange(prestigeText, ref displayedPrestige, prestige));
            UpdateStaminaBar(user.Stamina);
        }

        private void UpdateStaminaBar(int stamina)
        {
            if (staminaBarFill != null) staminaBarFill.fillAmount = Mathf.Clamp01((float)stamina / STAMINA_MAX);
        }

        /// <summary>数字滚动动画协程</summary>
        private IEnumerator AnimateResourceChange(Text text, ref int currentVal, int targetVal, string suffix = "")
        {
            if (text == null) yield break;
            float elapsed = 0f;
            int startVal = currentVal;
            while (elapsed < 0.5f)
            {
                elapsed += Time.deltaTime;
                float t = 1f - Mathf.Pow(1f - Mathf.Clamp01(elapsed / 0.5f), 3f);
                currentVal = Mathf.RoundToInt(Mathf.Lerp(startVal, targetVal, t));
                text.text = FormatNumber(currentVal) + suffix;
                yield return null;
            }
            currentVal = targetVal;
            text.text = FormatNumber(targetVal) + suffix;
        }

        private static string FormatNumber(int n)
        {
            if (n >= 100000000) return (n / 100000000f).ToString("F1") + "亿";
            if (n >= 10000) return (n / 10000f).ToString("F1") + "万";
            return n.ToString("N0");
        }

        // ============================================================
        // §1 体力恢复计时器
        // ============================================================

        private void StartStaminaRegenTimer()
        {
            StopStaminaRegenTimer();
            staminaRegenCoroutine = StartCoroutine(StaminaRecoveryTimer());
        }

        private void StopStaminaRegenTimer()
        {
            if (staminaRegenCoroutine != null) { StopCoroutine(staminaRegenCoroutine); staminaRegenCoroutine = null; }
        }

        /// <summary>体力恢复倒计时协程 - 每5分钟恢复1点</summary>
        private IEnumerator StaminaRecoveryTimer()
        {
            while (true)
            {
                if (currentProfile == null || currentProfile.Stamina >= STAMINA_MAX)
                {
                    SetTextSafe(staminaTimerText, "已满");
                    yield return new WaitForSeconds(10f);
                    continue;
                }
                for (int i = 0; i < STAMINA_REGEN_SECONDS; i++)
                {
                    int rem = STAMINA_REGEN_SECONDS - i;
                    SetTextSafe(staminaTimerText, $"{rem / 60:D2}:{rem % 60:D2}");
                    yield return new WaitForSeconds(1f);
                }
                currentProfile.Stamina = Mathf.Min(currentProfile.Stamina + STAMINA_REGEN_AMOUNT, STAMINA_MAX);
                UpdateStaminaBar(currentProfile.Stamina);
                SetTextSafe(staminaText, $"{currentProfile.Stamina}/{STAMINA_MAX}");
                Debug.Log($"[MainCityPanel] 体力恢复+{STAMINA_REGEN_AMOUNT}, 当前: {currentProfile.Stamina}/{STAMINA_MAX}");
            }
        }

        // ============================================================
        // §2 政务官 - 建造队列
        // ============================================================

        private void InitBuildingQueue()
        {
            queueSlots.Clear();
            if (buildingQueueContainer == null || buildingQueueSlotPrefab == null) return;
            for (int i = 0; i < BUILDING_QUEUE_MAX; i++)
            {
                var obj = Instantiate(buildingQueueSlotPrefab, buildingQueueContainer);
                obj.SetActive(false);
                queueSlots.Add(new BuildingQueueSlot
                {
                    slotGameObject = obj,
                    nameText = obj.transform.Find("NameText")?.GetComponent<Text>(),
                    levelText = obj.transform.Find("LevelText")?.GetComponent<Text>(),
                    timerText = obj.transform.Find("TimerText")?.GetComponent<Text>(),
                    iconImage = obj.transform.Find("IconImage")?.GetComponent<Image>()
                });
            }
        }

        /// <summary>刷新所有建造队列倒计时</summary>
        public void UpdateBuildingTimers()
        {
            foreach (var slot in queueSlots)
            {
                if (slot.isActive && slot.remainSeconds > 0)
                {
                    slot.remainSeconds = Mathf.Max(0, slot.remainSeconds - 1);
                    slot.UpdateDisplay();
                }
            }
        }

        // ============================================================
        // §3 城池建筑区
        // ============================================================

        private void RegisterBuildingButton(Button btn, string type)
        {
            if (btn != null) btn.onClick.AddListener(() => OnBuildingClick(type));
        }

        /// <summary>建筑按钮点击 - 发送事件并打开 BuildingInfoPanel</summary>
        public void OnBuildingClick(string buildingType)
        {
            Debug.Log($"[MainCityPanel] 点击建筑: {buildingType}");
            EventBus.Trigger("building:click", buildingType);
            UIManager.Instance.OpenPanel("BuildingInfoPanel", buildingType);
        }

        private void UpdateBuildingLevelBadges()
        {
            SetTextSafe(commandCenterLevelText, $"Lv.{GetLevel("command_center")}");
            SetTextSafe(barracksLevelText, $"Lv.{GetLevel("barracks")}");
            SetTextSafe(academyLevelText, $"Lv.{GetLevel("academy")}");
            SetTextSafe(blacksmithLevelText, $"Lv.{GetLevel("blacksmith")}");
            SetTextSafe(warehouseLevelText, $"Lv.{GetLevel("warehouse")}");
            SetTextSafe(tavernLevelText, $"Lv.{GetLevel("tavern")}");
        }

        private int GetLevel(string type) => buildingLevels.ContainsKey(type) ? buildingLevels[type] : 1;

        private void SetUpgradeIndicator(int idx, bool ready)
        {
            if (buildingUpgradeIndicators != null && idx >= 0 && idx < buildingUpgradeIndicators.Length)
                buildingUpgradeIndicators[idx].SetActive(ready);
        }

        private void OnSpeedUpAllClick()
        {
            Debug.Log("[MainCityPanel] 全部加速点击");
            EventBus.Trigger("building:speedup_all");
        }

        // ============================================================
        // §4 快捷操作栏
        // ============================================================

        /// <summary>快捷操作分派 - 根据 action 类型打开对应面板或执行逻辑</summary>
        public void OnQuickAction(string action)
        {
            Debug.Log($"[MainCityPanel] 快捷操作: {action}");
            EventBus.Trigger("quick_action:" + action, action);
            switch (action)
            {
                case "quest": UIManager.Instance.OpenPanel("QuestPanel"); break;
                case "daily_signin": UIManager.Instance.OpenPanel("DailySignInPanel"); break;
                case "activity": UIManager.Instance.OpenPanel("ActivityPanel"); break;
                case "alliance": UIManager.Instance.OpenPanel(Constants.PanelNames.GUILD); break;
                case "battle": UIManager.Instance.OpenPanel(Constants.PanelNames.BATTLE); break;
                case "map": UIManager.Instance.OpenPanel(Constants.PanelNames.MAP); break;
                case "buy_gold": case "buy_diamonds": case "buy_stamina": case "buy_prestige":
                    UIManager.Instance.OpenPanel("ShopPanel", action); break;
            }
        }

        /// <summary>更新快捷操作按钮的红点/角标计数</summary>
        public void ShowQuickActionBadge(string actionId, int count)
        {
            switch (actionId)
            {
                case "quest": if (questRedDot != null) questRedDot.SetActive(count > 0); break;
                case "daily_signin": SetTextSafe(signInButtonText, count > 0 ? "可签到" : "签到"); break;
                case "activity": SetTextSafe(activityProgressText, $"{count}/100"); break;
                case "battle": SetTextSafe(battleEntryCountText, count > 0 ? $"{count}" : ""); break;
                case "map":
                    SetTextSafe(marchCountBadgeText, count > 0 ? $"{count}" : "");
                    if (marchCountBadgeText != null && marchCountBadgeText.transform.parent != null)
                        marchCountBadgeText.transform.parent.gameObject.SetActive(count > 0);
                    break;
            }
        }

        // ============================================================
        // §5 底部导航栏
        // ============================================================

        private void OnNavTabClick(int index)
        {
            SetNavTabActive(index);
            Debug.Log($"[MainCityPanel] 导航切换: {new[] { "首页", "卡牌", "背包", "世界", "更多" }[index]}");
            if (index > 0)
            {
                string panel = new[] { "", Constants.PanelNames.DECK, Constants.PanelNames.BAG, Constants.PanelNames.MAP, Constants.PanelNames.SETTINGS }[index];
                if (!string.IsNullOrEmpty(panel)) UIManager.Instance.OpenPanel(panel);
            }
        }

        private void SetNavTabActive(int index)
        {
            currentNavIndex = index;
            for (int i = 0; i < navTabIndicators?.Length; i++)
                if (navTabIndicators[i] != null) navTabIndicators[i].gameObject.SetActive(i == index);
        }

        // ============================================================
        // §6 公告横幅
        // ============================================================

        private void StartAnnouncementScroll()
        {
            StopAnnouncementScroll();
            if (announcementContentRect == null) return;
            announcementScrollCoroutine = StartCoroutine(AnnouncementScrollRoutine());
        }

        private void StopAnnouncementScroll()
        {
            if (announcementScrollCoroutine != null) { StopCoroutine(announcementScrollCoroutine); announcementScrollCoroutine = null; }
        }

        private IEnumerator AnnouncementScrollRoutine()
        {
            float startPos = announcementContentRect.anchoredPosition.x;
            float endPos = startPos - announcementContentRect.rect.width;
            while (true)
            {
                if (announcementContentRect.anchoredPosition.x <= endPos)
                {
                    announcementContentRect.anchoredPosition = new Vector2(startPos, announcementContentRect.anchoredPosition.y);
                    yield return new WaitForSeconds(2f);
                }
                else
                {
                    announcementContentRect.anchoredPosition += Vector2.left * 60f * Time.deltaTime;
                    yield return null;
                }
            }
        }

        /// <summary>设置公告内容和NEW标记</summary>
        public void SetAnnouncement(string text, bool isNew)
        {
            SetTextSafe(announcementContentText, text);
            if (announcementNewBadge != null) announcementNewBadge.SetActive(isNew);
        }

        // ============================================================
        // 玩家资料刷新
        // ============================================================

        public void RefreshProfile()
        {
            if (isRefreshing) return;
            isRefreshing = true;
            StartCoroutine(UserApi.GetProfile((apiResult) =>
            {
                isRefreshing = false;
                if (apiResult != null && apiResult.IsSuccess() && apiResult.data != null)
                {
                    currentProfile = apiResult.data;
                    UpdatePlayerInfo(currentProfile);
                    SetTextSafe(serverInfoText, "在线: 12,856 | 九州1区 | 服务器延迟: 32ms");
                    Debug.Log($"[MainCityPanel] 资料刷新成功: {currentProfile.Username} VIP{currentProfile.VipLevel}");
                }
                else Debug.LogWarning($"[MainCityPanel] 资料刷新失败: {apiResult?.message}");
            }));
        }

        // ============================================================
        // 定时刷新
        // ============================================================

        private void StartPeriodicRefresh()
        {
            StopPeriodicRefresh();
            refreshCoroutine = StartCoroutine(PeriodicRefreshRoutine());
        }

        private void StopPeriodicRefresh()
        {
            if (refreshCoroutine != null) { StopCoroutine(refreshCoroutine); refreshCoroutine = null; }
        }

        private IEnumerator PeriodicRefreshRoutine()
        {
            while (true) { yield return new WaitForSeconds(30f); RefreshProfile(); UpdateBuildingTimers(); }
        }

        // ============================================================
        // EventBus 事件
        // ============================================================

        private void RegisterEvents()
        {
            EventBus.Register<int>(Constants.GameEvents.RESOURCE_CHANGED, OnResourceChanged);
            EventBus.Register<string>("building:upgrade_complete", OnBuildingUpgrade);
        }

        private void UnregisterEvents()
        {
            EventBus.Unregister<int>(Constants.GameEvents.RESOURCE_CHANGED, OnResourceChanged);
            EventBus.Unregister<string>("building:upgrade_complete", OnBuildingUpgrade);
        }

        private void OnResourceChanged(int _) => RefreshProfile();

        private void OnBuildingUpgrade(string buildingType)
        {
            Debug.Log($"[MainCityPanel] 建筑升级完成: {buildingType}");
            if (buildingLevels.ContainsKey(buildingType)) { buildingLevels[buildingType]++; UpdateBuildingLevelBadges(); }
            UpdateBuildingTimers();
        }

        // ============================================================
        // 工具方法
        // ============================================================

        private static void SetTextSafe(Text t, string s) { if (t != null) t.text = s; }

        private void StopAllCoroutines()
        {
            StopStaminaRegenTimer();
            StopPeriodicRefresh();
            StopAnnouncementScroll();
        }

        private Button[] GetAllButtons() => new Button[]
        {
            commandCenterButton, barracksButton, academyButton, blacksmithButton, warehouseButton, tavernButton,
            questButton, dailySignInButton, activityButton, allianceButton, battleEntryButton, mapEntryButton,
            navHomeButton, navCardButton, navBagButton, navWorldButton, navMoreButton,
            goldAddButton, diamondsAddButton, staminaAddButton, prestigeAddButton, speedUpAllButton
        };
    }
}
