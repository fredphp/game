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
    /// <summary>
    /// 主城面板 - 九州争鼎游戏主界面
    /// 玩家的核心操作中心，包含：
    /// - 顶部资源栏（金币、钻石、体力）
    /// - 城池建筑区域
    /// - 底部导航栏（战斗、地图、卡牌等模块入口）
    /// - 公会信息显示
    /// - 体力自动恢复计时器（每5分钟恢复1点）
    /// 继承自 UIBase，由 UIManager 统一管理生命周期
    /// </summary>
    public class MainCityPanel : UIBase
    {
        // ──────────────────────────────────────
        // UI 元素引用
        // ──────────────────────────────────────

        [Header("玩家信息区域")]
        [SerializeField] private Text playerNameText;         // 玩家名称
        [SerializeField] private Text playerLevelText;        // 玩家等级

        [Header("资源栏")]
        [SerializeField] private Text goldText;               // 金币显示
        [SerializeField] private Text diamondText;             // 钻石显示
        [SerializeField] private Text staminaText;             // 体力显示
        [SerializeField] private Image staminaBar;             // 体力条填充
        [SerializeField] private Text staminaTimerText;        // 体力恢复倒计时

        [Header("建筑按钮")]
        [SerializeField] private Button commandCenterButton;   // 指挥中心
        [SerializeField] private Button barracksButton;        // 兵营
        [SerializeField] private Button academyButton;         // 学院
        [SerializeField] private Button warehouseButton;       // 仓库
        [SerializeField] private Button blacksmithButton;      // 铁匠铺
        [SerializeField] private Button tavernButton;          // 酒馆

        [Header("功能按钮")]
        [SerializeField] private Button guildButton;           // 公会按钮
        [SerializeField] private Button battleButton;          // 战斗按钮
        [SerializeField] private Button mapButton;             // 地图按钮
        [SerializeField] private Button cardButton;            // 卡牌按钮
        [SerializeField] private Button settingsButton;        // 设置按钮
        [SerializeField] private Button chatButton;            // 聊天按钮

        [Header("公会信息")]
        [SerializeField] private Text guildNameText;           // 公会名称
        [SerializeField] private Image guildBadge;             // 公会徽章
        [SerializeField] private GameObject guildInfoPanel;     // 公会信息面板

        [Header("通知")]
        [SerializeField] private GameObject notificationDot;   // 通知红点

        // ──────────────────────────────────────
        // 常量定义
        // ──────────────────────────────────────

        private const int MAX_STAMINA = 120;                    // 体力上限
        private const int STAMINA_REGEN_INTERVAL = 300;         // 体力恢复间隔（秒）：5分钟
        private const int STAMINA_REGEN_AMOUNT = 1;             // 每次恢复数量

        // ──────────────────────────────────────
        // 内部状态
        // ──────────────────────────────────────

        private User currentProfile;             // 当前玩家资料
        private int currentGold = 0;             // 当前金币（用于动画）
        private int currentDiamond = 0;          // 当前钻石（用于动画）
        private int currentStamina = 0;          // 当前体力（用于动画）
        private bool isRefreshing = false;       // 是否正在刷新数据
        private Coroutine refreshCoroutine;      // 刷新协程引用
        private Coroutine staminaRegenCoroutine; // 体力恢复协程引用

        // ============================================================
        // 生命周期方法
        // ============================================================

        protected override void Awake()
        {
            base.Awake();

            // 注册建筑按钮事件
            RegisterButtonEvent(commandCenterButton, "command_center");
            RegisterButtonEvent(barracksButton, "barracks");
            RegisterButtonEvent(academyButton, "academy");
            RegisterButtonEvent(warehouseButton, "warehouse");
            RegisterButtonEvent(blacksmithButton, "blacksmith");
            RegisterButtonEvent(tavernButton, "tavern");

            // 注册功能按钮事件
            if (guildButton != null) guildButton.onClick.AddListener(OnGuildClick);
            if (battleButton != null) battleButton.onClick.AddListener(() => SwitchScene("Battle"));
            if (mapButton != null) mapButton.onClick.AddListener(() => SwitchScene("Map"));
            if (cardButton != null) cardButton.onClick.AddListener(() => SwitchScene("Card"));
            if (settingsButton != null) settingsButton.onClick.AddListener(() => UIManager.Instance.OpenPanel(Constants.PanelNames.SETTINGS));
            if (chatButton != null) chatButton.onClick.AddListener(() => UIManager.Instance.OpenPanel("ChatPanel"));

            if (notificationDot != null) notificationDot.SetActive(false);
        }

        /// <summary>
        /// 面板打开回调 - 加载玩家资料，启动体力恢复计时
        /// </summary>
        public override void OnOpen(params object[] args)
        {
            base.OnOpen(args);
            RefreshProfile();
            StartStaminaRegenTimer();
            RegisterEvents();
            StartPeriodicRefresh();
        }

        public override void OnClose()
        {
            StopStaminaRegenTimer();
            StopPeriodicRefresh();
            UnregisterEvents();
            base.OnClose();
        }

        public override void OnRefresh()
        {
            RefreshProfile();
        }

        // ============================================================
        // 资源显示更新
        // ============================================================

        /// <summary>
        /// 更新资源显示（金币、钻石、体力），使用动画平滑过渡
        /// </summary>
        private void UpdateResourceDisplay()
        {
            if (currentProfile == null) return;

            int targetGold = currentProfile.Gold;
            int targetDiamond = currentProfile.Diamonds;
            int targetStamina = Mathf.Min(currentProfile.Stamina, MAX_STAMINA);

            StartCoroutine(AnimateResourceText(goldText, ref currentGold, targetGold, "💰 {0}"));
            StartCoroutine(AnimateResourceText(diamondText, ref currentDiamond, targetDiamond, "💎 {0}"));
            UpdateStaminaDisplay(targetStamina);
        }

        /// <summary>
        /// 更新体力条和体力文本
        /// </summary>
        private void UpdateStaminaDisplay(int stamina)
        {
            if (staminaText != null)
                staminaText.text = $"⚡ {stamina}/{MAX_STAMINA}";

            if (staminaBar != null)
            {
                float fillAmount = (float)stamina / MAX_STAMINA;
                StartCoroutine(AnimateFillAmount(staminaBar, fillAmount));
            }
        }

        /// <summary>
        /// 数字滚动动画
        /// </summary>
        private IEnumerator AnimateResourceText(Text targetText, ref int currentValue, int targetValue, string format)
        {
            if (targetText == null) yield break;

            float duration = 0.5f;
            float elapsed = 0f;
            int startValue = currentValue;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float progress = Mathf.Clamp01(elapsed / duration);
                float easedProgress = 1f - Mathf.Pow(1f - progress, 3f);
                int displayValue = Mathf.RoundToInt(Mathf.Lerp(startValue, targetValue, easedProgress));
                targetText.text = string.Format(format, FormatNumber(displayValue));
                currentValue = displayValue;
                yield return null;
            }

            currentValue = targetValue;
            targetText.text = string.Format(format, FormatNumber(targetValue));
        }

        private IEnumerator AnimateFillAmount(Image targetBar, float targetFill)
        {
            if (targetBar == null) yield break;

            float startFill = targetBar.fillAmount;
            float duration = 0.3f;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float progress = Mathf.Clamp01(elapsed / duration);
                targetBar.fillAmount = Mathf.Lerp(startFill, targetFill, progress);
                yield return null;
            }

            targetBar.fillAmount = targetFill;
        }

        private string FormatNumber(int number)
        {
            if (number >= 100000000) return (number / 100000000f).ToString("F1") + "亿";
            if (number >= 10000) return (number / 10000f).ToString("F1") + "万";
            return number.ToString();
        }

        // ============================================================
        // 玩家资料
        // ============================================================

        /// <summary>
        /// 刷新玩家资料 - 从后端获取最新数据并更新界面
        /// </summary>
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
                    UpdatePlayerInfo();
                    UpdateResourceDisplay();
                    Debug.Log($"[MainCityPanel] 玩家资料刷新成功: {currentProfile.Username} Lv.{currentProfile.VipLevel}");
                }
                else
                {
                    Debug.LogWarning($"[MainCityPanel] 刷新玩家资料失败: {apiResult?.message}");
                }
            }));
        }

        private void UpdatePlayerInfo()
        {
            if (currentProfile == null) return;

            if (playerNameText != null)
                playerNameText.text = currentProfile.Nickname ?? currentProfile.Username;
            if (playerLevelText != null)
                playerLevelText.text = $"Lv.{currentProfile.VipLevel}";
        }

        // ============================================================
        // 公会信息
        // ============================================================

        private void ShowGuildInfo(bool hasGuild, string guildName)
        {
            if (guildInfoPanel != null)
            {
                guildInfoPanel.SetActive(hasGuild);
                if (guildNameText != null)
                    guildNameText.text = guildName;
            }
        }

        // ============================================================
        // 体力恢复计时器
        // ============================================================

        private void StartStaminaRegenTimer()
        {
            StopStaminaRegenTimer();
            staminaRegenCoroutine = StartCoroutine(StaminaRegenRoutine());
        }

        private void StopStaminaRegenTimer()
        {
            if (staminaRegenCoroutine != null)
            {
                StopCoroutine(staminaRegenCoroutine);
                staminaRegenCoroutine = null;
            }
        }

        /// <summary>
        /// 体力恢复协程 - 每5分钟恢复1点体力
        /// </summary>
        private IEnumerator StaminaRegenRoutine()
        {
            while (true)
            {
                if (currentProfile != null && currentProfile.Stamina < MAX_STAMINA)
                {
                    for (int i = 0; i < STAMINA_REGEN_INTERVAL; i++)
                    {
                        int remainingSeconds = STAMINA_REGEN_INTERVAL - i;
                        int minutes = remainingSeconds / 60;
                        int seconds = remainingSeconds % 60;

                        if (staminaTimerText != null)
                            staminaTimerText.text = $"{minutes:D2}:{seconds:D2}";

                        yield return new WaitForSeconds(1f);
                    }

                    // 恢复体力
                    if (currentProfile != null)
                    {
                        currentProfile.Stamina = Mathf.Min(currentProfile.Stamina + STAMINA_REGEN_AMOUNT, MAX_STAMINA);
                        UpdateStaminaDisplay(currentProfile.Stamina);
                        Debug.Log($"[MainCityPanel] 体力恢复+{STAMINA_REGEN_AMOUNT}, 当前: {currentProfile.Stamina}/{MAX_STAMINA}");
                    }
                }
                else
                {
                    if (staminaTimerText != null)
                        staminaTimerText.text = "已满";
                    yield return new WaitForSeconds(10f);
                }
            }
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
            if (refreshCoroutine != null)
            {
                StopCoroutine(refreshCoroutine);
                refreshCoroutine = null;
            }
        }

        private IEnumerator PeriodicRefreshRoutine()
        {
            while (true)
            {
                yield return new WaitForSeconds(30f);
                RefreshProfile();
            }
        }

        // ============================================================
        // 建筑点击
        // ============================================================

        private void RegisterButtonEvent(Button button, string buildingType)
        {
            if (button != null)
                button.onClick.AddListener(() => OnBuildingClick(buildingType));
        }

        /// <summary>
        /// 建筑按钮点击 - 打开对应建筑详情面板
        /// </summary>
        private void OnBuildingClick(string buildingType)
        {
            Debug.Log($"[MainCityPanel] 点击建筑: {buildingType}");
            UIManager.Instance.OpenPanel("BuildingInfoPanel", buildingType);
        }

        // ============================================================
        // 场景切换
        // ============================================================

        private void SwitchScene(string sceneName)
        {
            Debug.Log($"[MainCityPanel] 切换场景: {sceneName}");
            EventBus.Trigger("OnSceneChange", sceneName);
        }

        // ============================================================
        // 功能按钮
        // ============================================================

        private void OnGuildClick()
        {
            UIManager.Instance.OpenPanel(Constants.PanelNames.GUILD);
        }

        // ============================================================
        // EventBus 事件
        // ============================================================

        private void RegisterEvents()
        {
            EventBus.Register<int>(Constants.GameEvents.RESOURCE_CHANGED, OnResourceChanged);
        }

        private void UnregisterEvents()
        {
            EventBus.Unregister<int>(Constants.GameEvents.RESOURCE_CHANGED, OnResourceChanged);
        }

        private void OnResourceChanged(int amount)
        {
            RefreshProfile();
        }

        // ============================================================
        // 清理
        // ============================================================

        protected override void OnDestroy()
        {
            StopStaminaRegenTimer();
            StopPeriodicRefresh();
            UnregisterEvents();

            if (commandCenterButton != null) commandCenterButton.onClick.RemoveAllListeners();
            if (barracksButton != null) barracksButton.onClick.RemoveAllListeners();
            if (academyButton != null) academyButton.onClick.RemoveAllListeners();
            if (warehouseButton != null) warehouseButton.onClick.RemoveAllListeners();
            if (blacksmithButton != null) blacksmithButton.onClick.RemoveAllListeners();
            if (tavernButton != null) tavernButton.onClick.RemoveAllListeners();
            if (guildButton != null) guildButton.onClick.RemoveAllListeners();
            if (battleButton != null) battleButton.onClick.RemoveAllListeners();
            if (mapButton != null) mapButton.onClick.RemoveAllListeners();
            if (cardButton != null) cardButton.onClick.RemoveAllListeners();
            if (settingsButton != null) settingsButton.onClick.RemoveAllListeners();
            if (chatButton != null) chatButton.onClick.RemoveAllListeners();

            base.OnDestroy();
        }
    }
}
