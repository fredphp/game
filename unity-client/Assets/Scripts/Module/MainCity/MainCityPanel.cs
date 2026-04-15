// =============================================================================
// 九州争鼎 - 战国·楚汉争霸 主城面板
// =============================================================================
// 描述：主城 UI 重构版 —— 中国古代城池风格。
//       视觉元素：宫殿城墙背景、战火/旗帜动态效果、卷轴式公告、
//       青铜纹建筑图标、水墨风格资源栏。
//       保留所有原有业务逻辑（资源栏/建造队列/城池建筑/快捷操作/导航/公告）
// =============================================================================

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Jiuzhou.Core;
using Jiuzhou.Core.UI;
using Game.Core.Network.Api;
using Game.Data;

namespace Game.Module.MainCity
{
    /// <summary>
    /// 主城面板 —— 战国·楚汉争霸风格。
    /// 以古代城池为视觉载体，结合水墨风UI元素。
    /// </summary>
    public class MainCityPanel : UIBase
    {
        private const int STAMINA_MAX = 120;
        private const int STAMINA_REGEN_SECONDS = 300;
        private const int BUILDING_QUEUE_MAX = 6;

        // ────────────────────── §1 资源栏（水墨风格）──────────────────────

        [Header("§1 资源栏 - 卷轴背景")]
        [SerializeField] private Image resourceBarBg;        // 水墨卷轴背景
        [SerializeField] private Image playerAvatarFrame;    // 青铜纹头像框
        [SerializeField] private Image playerAvatarImage;
        [SerializeField] private Text playerNameText;
        [SerializeField] private Text playerLevelText;
        [SerializeField] private Image vipSealImage;         // VIP印章图标
        [SerializeField] private Text vipLevelText;

        [Header("§1 资源栏 - 资源（篆书风格数字）")]
        [SerializeField] private Text goldText;
        [SerializeField] private Text diamondsText;
        [SerializeField] private Text staminaText;
        [SerializeField] private Text prestigeText;
        [SerializeField] private Image staminaBarBg;        // 体力条背景（竹简色）
        [SerializeField] private Image staminaBarFill;      // 体力条填充（朱砂渐变）
        [SerializeField] private Text staminaTimerText;
        [SerializeField] private Button goldAddButton;
        [SerializeField] private Button diamondsAddButton;
        [SerializeField] private Button staminaAddButton;
        [SerializeField] private Button prestigeAddButton;

        // ────────────────────── §2 政务官 ──────────────────────

        [Header("§2 政务官 - 竹简列表")]
        [SerializeField] private Transform buildingQueueContainer;
        [SerializeField] private GameObject buildingQueueSlotPrefab;
        [SerializeField] private Button speedUpAllButton;
        [SerializeField] private Text speedUpCostText;
        [SerializeField] private Text freeInstantBuildText;

        // ────────────────────── §3 城池建筑区（宫殿地图）──────────────────────

        [Header("§3 城池建筑区 - 城池背景")]
        [SerializeField] private Image cityBackground;        // 古代城池背景图
        [SerializeField] private Image[] battleFlagImages;   // 战旗动画元素
        [SerializeField] private ParticleSystem fireParticle; // 战火粒子特效

        [Header("§3 城池建筑区 - 建筑节点")]
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
        [SerializeField] private Image[] buildingIconImages;  // 建筑图标（青铜纹）

        // ────────────────────── §4 快捷操作栏 ──────────────────────

        [Header("§4 快捷操作栏 - 印章风格按钮")]
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

        [Header("§5 底部导航 - 金文风格")]
        [SerializeField] private Button navHomeButton;
        [SerializeField] private Button navCardButton;
        [SerializeField] private Button navBagButton;
        [SerializeField] private Button navWorldButton;
        [SerializeField] private Button navMoreButton;
        [SerializeField] private Image[] navTabIndicators;

        // ────────────────────── §6 公告横幅（卷轴展开）──────────────────────

        [Header("§6 公告横幅 - 卷轴风格")]
        [SerializeField] private ScrollRect announcementScrollRect;
        [SerializeField] private Text announcementContentText;
        [SerializeField] private GameObject announcementNewBadge;
        [SerializeField] private RectTransform announcementContentRect;
        [SerializeField] private Image scrollLeftDecor;      // 卷轴左装饰
        [SerializeField] private Image scrollRightDecor;      // 卷轴右装饰

        // ────────────────────── §7 服务器信息 ──────────────────────

        [Header("§7 服务器信息栏")]
        [SerializeField] private Text serverInfoText;

        // ────────────────────── 内部状态 ──────────────────────

        private User currentProfile;
        private int displayedGold, displayedDiamonds, displayedStamina, displayedPrestige;
        private bool isRefreshing;
        private Coroutine staminaRegenCoroutine, refreshCoroutine, announcementScrollCoroutine;
        private Coroutine flagWaveCoroutine, fireCoroutine;
        private int currentNavIndex;
        private readonly Dictionary<string, int> buildingLevels = new Dictionary<string, int>
        {
            { "command_center", 1 }, { "barracks", 1 }, { "academy", 1 },
            { "blacksmith", 1 }, { "warehouse", 1 }, { "tavern", 1 }
        };
        private readonly List<BuildingQueueSlot> queueSlots = new List<BuildingQueueSlot>();

        // ============================================================
        // 建造队列槽位数据（复用原有结构）
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

            // 应用战国风格颜色
            ApplyWarringStatesTheme();

            // 建筑按钮
            RegisterBuildingButton(commandCenterButton, "command_center");
            RegisterBuildingButton(barracksButton, "barracks");
            RegisterBuildingButton(academyButton, "academy");
            RegisterBuildingButton(blacksmithButton, "blacksmith");
            RegisterBuildingButton(warehouseButton, "warehouse");
            RegisterBuildingButton(tavernButton, "tavern");
            if (speedUpAllButton != null) speedUpAllButton.onClick.AddListener(OnSpeedUpAllClick);
            UpdateBuildingLevelBadges();

            // 快捷操作
            if (questButton != null) questButton.onClick.AddListener(() => OnQuickAction("quest"));
            if (dailySignInButton != null) dailySignInButton.onClick.AddListener(() => OnQuickAction("daily_signin"));
            if (activityButton != null) activityButton.onClick.AddListener(() => OnQuickAction("activity"));
            if (allianceButton != null) allianceButton.onClick.AddListener(() => OnQuickAction("alliance"));
            if (battleEntryButton != null) battleEntry.onClick.AddListener(() => OnQuickAction("battle"));
            if (mapEntryButton != null) mapEntryButton.onClick.AddListener(() => OnQuickAction("map"));

            // 资源快捷购买
            if (goldAddButton != null) goldAddButton.onClick.AddListener(() => OnQuickAction("buy_gold"));
            if (diamondsAddButton != null) diamondsAddButton.onClick.AddListener(() => OnQuickAction("buy_diamonds"));
            if (staminaAddButton != null) staminaAddButton.onClick.AddListener(() => OnQuickAction("buy_stamina"));
            if (prestigeAddButton != null) prestigeAddButton.onClick.AddListener(() => OnQuickAction("buy_prestige"));

            // 导航栏
            if (navHomeButton != null) navHomeButton.onClick.AddListener(() => OnNavTabClick(0));
            if (navCardButton != null) navCardButton.onClick.AddListener(() => OnNavTabClick(1));
            if (navBagButton != null) navBagButton.onClick.AddListener(() => OnNavTabClick(2));
            if (navWorldButton != null) navWorldButton.onClick.AddListener(() => OnNavTabClick(3));
            if (navMoreButton != null) navMoreButton.onClick.AddListener(() => OnNavTabClick(4));

            // 公告
            if (announcementNewBadge != null) announcementNewBadge.SetActive(false);

            // 默认文字
            SetTextSafe(signInButtonText, "签到");
            SetTextSafe(activityProgressText, "0/100");
            SetTextSafe(speedUpCostText, "全部加速");
            SetTextSafe(freeInstantBuildText, "免费秒建: 0次");
            SetTextSafe(staminaTimerText, "--:--");
            SetTextSafe(serverInfoText, "九州1区 | 在线: 12,856");
        }

        public override void OnOpen(params object[] args)
        {
            base.OnOpen(args);
            RefreshProfile();
            StartStaminaRegenTimer();
            StartPeriodicRefresh();
            RegisterEvents();
            StartAnnouncementScroll();
            StartBattleFlagsAnimation();
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
        // 战国风格主题应用
        // ============================================================

        /// <summary>
        /// 应用战国·楚汉争霸视觉主题到所有UI元素
        /// </summary>
        private void ApplyWarringStatesTheme()
        {
            // 资源栏背景 —— 卷轴色
            if (resourceBarBg != null)
                resourceBarBg.color = new Color(0.95f, 0.92f, 0.85f, 0.95f);

            // 头像框 —— 青铜金
            if (playerAvatarFrame != null)
                playerAvatarFrame.color = UIStyleConfig.BronzeGold;

            // VIP印章 —— 朱砂红
            if (vipSealImage != null)
                vipSealImage.color = UIStyleConfig.CinnabarRed;

            // 体力条背景 —— 竹简色
            if (staminaBarBg != null)
                staminaBarBg.color = UIStyleConfig.BambooYellow;

            // 体力条填充 —— 朱砂渐变效果（用纯色近似）
            if (staminaBarFill != null)
                staminaBarFill.color = UIStyleConfig.CinnabarRed;

            // 建筑图标 —— 青铜金
            foreach (var icon in buildingIconImages)
                if (icon != null) icon.color = UIStyleConfig.BronzeDark;

            // 卷轴装饰
            if (scrollLeftDecor != null) scrollLeftDecor.color = UIStyleConfig.BronzeGold;
            if (scrollRightDecor != null) scrollRightDecor.color = UIStyleConfig.BronzeGold;

            // 文字颜色
            ApplyTextColor(playerNameText, UIStyleConfig.InkDark);
            ApplyTextColor(vipLevelText, UIStyleConfig.CinnabarRed);
            ApplyTextColor(goldText, UIStyleConfig.InkLight);
            ApplyTextColor(diamondsText, UIStyleConfig.InkLight);
            ApplyTextColor(staminaText, UIStyleConfig.InkLight);
            ApplyTextColor(prestigeText, UIStyleConfig.InkLight);
            ApplyTextColor(staminaTimerText, UIStyleConfig.InkLight);
            ApplyTextColor(serverInfoText, UIStyleConfig.InkLight);
        }

        // ============================================================
        // 战旗飘扬动画
        // ============================================================

        private void StartBattleFlagsAnimation()
        {
            StopFlagAnimation();
            flagWaveCoroutine = StartCoroutine(BattleFlagWaveRoutine());
        }

        private void StopFlagAnimation()
        {
            if (flagWaveCoroutine != null) { StopCoroutine(flagWaveCoroutine); flagWaveCoroutine = null; }
        }

        /// <summary>
        /// 战旗飘扬协程 —— 正弦波摆动模拟风吹效果
        /// </summary>
        private IEnumerator BattleFlagWaveRoutine()
        {
            if (battleFlagImages == null || battleFlagImages.Length == 0) yield break;

            float[] phases = new float[battleFlagImages.Length];
            for (int i = 0; i < phases.Length; i++)
                phases[i] = UnityEngine.Random.Range(0f, Mathf.PI * 2f); // 随机初始相位

            while (true)
            {
                for (int i = 0; i < battleFlagImages.Length; i++)
                {
                    if (battleFlagImages[i] == null) continue;
                    phases[i] += Time.deltaTime * 2f + i * 0.3f; // 每面旗不同频率
                    float wave = Mathf.Sin(phases[i]) * 8f;      // ±8度摆动
                    float flutter = Mathf.Sin(phases[i] * 1.7f) * 0.05f; // 轻微缩放
                    battleFlagImages[i].transform.localEulerAngles = new Vector3(0f, 0f, wave);
                    battleFlagImages[i].transform.localScale = new Vector3(1f + flutter, 1f - flutter * 0.5f, 1f);
                }
                yield return null;
            }
        }

        // ============================================================
        // 资源栏（保持原有逻辑，样式已更新）
        // ============================================================

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
            if (staminaBarFill != null)
            {
                float ratio = Mathf.Clamp01((float)stamina / STAMINA_MAX);
                staminaBarFill.fillAmount = ratio;
                // 低体力时变红
                staminaBarFill.color = ratio < 0.2f
                    ? UIStyleConfig.CinnabarDeep
                    : UIStyleConfig.CinnabarRed;
            }
        }

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
        // 体力恢复计时器（复用原有逻辑）
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
                currentProfile.Stamina = Mathf.Min(currentProfile.Stamina + 1, STAMINA_MAX);
                UpdateStaminaBar(currentProfile.Stamina);
                SetTextSafe(staminaText, $"{currentProfile.Stamina}/{STAMINA_MAX}");
            }
        }

        // ============================================================
        // §2 建造队列（复用原有逻辑）
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
        // §3 城池建筑区（复用原有逻辑）
        // ============================================================

        private void RegisterBuildingButton(Button btn, string type)
        {
            if (btn != null) btn.onClick.AddListener(() => OnBuildingClick(type));
        }

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
        // §4 快捷操作栏（复用原有逻辑）
        // ============================================================

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
        // §5 底部导航栏（复用原有逻辑）
        // ============================================================

        private void OnNavTabClick(int index)
        {
            SetNavTabActive(index);
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
        // §6 公告横幅（复用原有逻辑）
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
                    SetTextSafe(serverInfoText, "九州1区 | 在线: 12,856");
                }
            }));
        }

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
            if (buildingLevels.ContainsKey(buildingType)) { buildingLevels[buildingType]++; UpdateBuildingLevelBadges(); }
            UpdateBuildingTimers();
        }

        // ============================================================
        // 工具方法
        // ============================================================

        private static void SetTextSafe(Text t, string s) { if (t != null) t.text = s; }

        private static void ApplyTextColor(Text t, Color c) { if (t != null) t.color = c; }

        private void StopAllCoroutines()
        {
            StopStaminaRegenTimer();
            StopPeriodicRefresh();
            StopAnnouncementScroll();
            StopFlagAnimation();
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
