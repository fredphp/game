// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Module
// =============================================================================
// 描述：商业化提示面板 —— 非侵入式提示系统，引导玩家关注商业功能。
//       继承 UIBase（UILayer.Top, 非模态），屏幕顶部粘性通知栏。
//       支持轮播提示、优先级排序、5分钟冷却、点击跳转、自动消失。
// =============================================================================

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Jiuzhou.Core;

namespace Game.Module.Quest
{
    /// <summary>商业化提示配置</summary>
    [Serializable]
    public class TipConfig
    {
        public string id;            // 唯一标识
        public string text;          // 提示文本
        public string category;      // payment/retention/engagement/event/social
        public int priority;         // 优先级（越高越紧急）
        public string action;        // 点击后打开的面板
        public float duration;       // 展示时长（秒）
    }

    /// <summary>
    /// 商业化提示面板 —— 非侵入式粘性通知栏。
    /// UILayer.Top, 非模态。5分钟冷却，点击跳转面板，24小时忽略。
    /// </summary>
    public class TipsPanel : UIBase
    {
        [Header("提示栏 UI")]
        [SerializeField] private GameObject tipBar;
        [SerializeField] private Text tipText;
        [SerializeField] private Button closeButton;
        [SerializeField] private Button tipClickButton;
        [SerializeField] private CanvasGroup tipCanvasGroup;

        private const float COOLDOWN = 300f;       // 5分钟
        private const float DISMISS_CD = 86400f;   // 24小时
        private const float FADE_DUR = 0.3f;
        private const string PP_DISMISS = "tip_dismissed_";
        private const string PP_LAST_SHOW = "tip_last_show_time";
        private const string PP_DAILY = "tip_daily_login_shown_";

        private TipConfig[] allTips;
        private TipConfig currentTip;
        private Coroutine showCoroutine;
        private Coroutine fadeCoroutine;
        private bool isShowing;
        private HashSet<string> shownThisSession = new HashSet<string>();

        protected override void Awake()
        {
            base.Awake();
            if (closeButton != null) closeButton.onClick.AddListener(OnCloseClick);
            if (tipClickButton != null) tipClickButton.onClick.AddListener(OnTipClicked);
            allTips = GetDefaultTips();
            HideImmediate();
            RegisterTriggers();
        }

        public override void OnOpen(params object[] args)
        {
            base.OnOpen(args);
            RegisterTriggers();
            TryShowNext();
        }

        public override void OnClose()
        {
            StopCoroutines(); HideImmediate();
            isShowing = false; currentTip = null;
            base.OnClose();
        }

        protected override void OnDestroy()
        {
            UnregisterTriggers();
            if (closeButton != null) closeButton.onClick.RemoveAllListeners();
            if (tipClickButton != null) tipClickButton.onClick.RemoveAllListeners();
            StopCoroutines();
            base.OnDestroy();
        }

        // ============================================================
        // 内置提示配置
        // ============================================================

        private TipConfig[] GetDefaultTips() => new[]
        {
            new() { id="first_recharge_double", text="💰 首充双倍钻石，限时优惠中！",
                     category="payment", priority=100, action="shop", duration=8f },
            new() { id="monthly_card", text="💎 月卡玩家每日额外获得100钻石",
                     category="payment", priority=80, action="shop", duration=6f },
            new() { id="daily_sign_reward", text="🎁 今日签到可领100钻石，连续签到还有额外奖励！",
                     category="retention", priority=90, action="MainCityPanel", duration=6f },
            new() { id="daily_task_reward", text="📋 今日日常任务已完成 0/5，完成可获得活跃度奖励",
                     category="retention", priority=70, action="MainCityPanel", duration=6f },
            new() { id="ssr_rate_up", text="🔥 限时SSR武将概率UP中，抽到就是赚到！",
                     category="engagement", priority=85, action="DeckPanel", duration=7f },
            new() { id="arena_countdown", text="🏆 竞技场赛季倒计时3天，冲刺排名赢取大奖！",
                     category="engagement", priority=75, action="BattlePanel", duration=6f },
            new() { id="limited_event", text="🎯 限时活动「九州争霸」火热进行中，参与即送稀有武将碎片！",
                     category="event", priority=95, action="MainCityPanel", duration=7f },
            new() { id="guild_siege", text="🏰 加入联盟解锁攻城战，与其他联盟争夺城池控制权！",
                     category="social", priority=60, action="GuildPanel", duration=6f },
            new() { id="friend_gift", text="🤝 好友互赠体力，每天最多领取5次，别忘了收体力哦！",
                     category="social", priority=50, action="MainCityPanel", duration=5f }
        };

        // ============================================================
        // 展示控制
        // ============================================================

        /// <summary>按分类获取提示文本列表</summary>
        private string[] GetTipsForCategory(string category)
        {
            var list = new List<string>();
            foreach (var t in allTips) if (t.category == category) list.Add(t.text);
            return list.ToArray();
        }

        /// <summary>检查是否满足展示条件（冷却+不在展示中+有可用提示）</summary>
        public bool ShouldShowTip()
        {
            if (isShowing) return false;
            float elapsed = Time.realtimeSinceStartup - PlayerPrefs.GetFloat(PP_LAST_SHOW, 0f);
            return elapsed >= COOLDOWN && GetNextTip() != null;
        }

        /// <summary>尝试展示下一条提示</summary>
        public void TryShowNext()
        {
            if (isShowing) return;
            TipConfig tip = GetNextTip();
            if (tip != null) ShowTip(tip);
        }

        private TipConfig GetNextTip()
        {
            if (allTips == null) return null;
            var sorted = new List<TipConfig>(allTips);
            sorted.Sort((a, b) => b.priority.CompareTo(a.priority));
            foreach (var t in sorted)
            {
                if (shownThisSession.Contains(t.id)) continue;
                if (IsDismissed(t.id)) continue;
                return t;
            }
            return null;
        }

        private TipConfig GetTipByCategory(string cat)
        {
            TipConfig best = null;
            foreach (var t in allTips)
            {
                if (t.category != cat || shownThisSession.Contains(t.id) || IsDismissed(t.id)) continue;
                if (best == null || t.priority > best.priority) best = t;
            }
            return best;
        }

        /// <summary>展示指定提示（协程版本）</summary>
        private IEnumerator ShowTip(string text, string category, float duration)
        {
            TipConfig cfg = null;
            foreach (var t in allTips) if (t.text == text && t.category == category) { cfg = t; break; }
            if (cfg == null) cfg = new TipConfig { id = "temp_" + Guid.NewGuid().ToString("N").Substring(0,8),
                text = text, category = category, priority = 50, duration = duration };
            ShowTip(cfg);
            yield return new WaitForSeconds(duration);
        }

        private void ShowTip(TipConfig tip)
        {
            currentTip = tip; isShowing = true; shownThisSession.Add(tip.id);
            if (tipText != null) tipText.text = tip.text;
            PlayerPrefs.SetFloat(PP_LAST_SHOW, Time.realtimeSinceStartup); PlayerPrefs.Save();
            ShowWithFade();
            if (showCoroutine != null) StopCoroutine(showCoroutine);
            showCoroutine = StartCoroutine(AutoHide(Mathf.Max(tip.duration, 3f)));
        }

        // ============================================================
        // 按钮回调
        // ============================================================

        private void OnCloseClick()
        {
            if (currentTip != null) DismissTip(currentTip.id);
            HideWithFade(); isShowing = false; currentTip = null;
            if (showCoroutine != null) StopCoroutine(showCoroutine);
        }

        private void OnTipClicked()
        {
            if (currentTip == null || string.IsNullOrEmpty(currentTip.action)) return;
            string panel = MapAction(currentTip.action);
            if (!string.IsNullOrEmpty(panel)) UIManager.Instance.OpenPanel(panel);
            HideWithFade(); isShowing = false; currentTip = null;
            if (showCoroutine != null) StopCoroutine(showCoroutine);
        }

        private void OnTipClicked(string tipId) { OnTipClicked(); }

        // ============================================================
        // 忽略管理
        // ============================================================

        private void DismissTip(string id)
        {
            PlayerPrefs.SetFloat(PP_DISMISS + id, Time.realtimeSinceStartup); PlayerPrefs.Save();
        }

        private bool IsDismissed(string id)
        {
            float t = PlayerPrefs.GetFloat(PP_DISMISS + id, 0f);
            return t > 0f && (Time.realtimeSinceStartup - t) < DISMISS_CD;
        }

        // ============================================================
        // 触发监听
        // ============================================================

        private void RegisterTriggers()
        {
            EventBus.Register(Constants.GameEvents.PLAYER_LOGIN, OnLogin);
            EventBus.Register(Constants.GameEvents.BATTLE_VICTORY, OnBattleEnd);
            EventBus.Register(Constants.GameEvents.BATTLE_DEFEAT, OnBattleEnd);
            EventBus.Register(Constants.GameEvents.CARD_ACQUIRED, OnGacha);
        }

        private void UnregisterTriggers()
        {
            EventBus.Unregister(Constants.GameEvents.PLAYER_LOGIN, OnLogin);
            EventBus.Unregister(Constants.GameEvents.BATTLE_VICTORY, OnBattleEnd);
            EventBus.Unregister(Constants.GameEvents.BATTLE_DEFEAT, OnBattleEnd);
            EventBus.Unregister(Constants.GameEvents.CARD_ACQUIRED, OnGacha);
        }

        private void OnLogin()
        {
            string key = PP_DAILY + DateTime.Now.ToString("yyyyMMdd");
            if (PlayerPrefs.GetInt(key, 0) == 1) return;
            PlayerPrefs.SetInt(key, 1); PlayerPrefs.Save();
            StartCoroutine(DelayedShow(2f));
        }

        private void OnBattleEnd()
        {
            if (!ShouldShowTip()) return;
            if (GetTipByCategory("payment") != null || GetTipByCategory("engagement") != null)
                StartCoroutine(DelayedShow(1.5f));
        }

        private void OnGacha()
        {
            if (!ShouldShowTip()) return;
            if (GetTipByCategory("payment") != null || GetTipByCategory("engagement") != null)
                StartCoroutine(DelayedShow(1f));
        }

        private IEnumerator DelayedShow(float delay)
        {
            yield return new WaitForSeconds(delay);
            if (ShouldShowTip()) TryShowNext();
        }

        // ============================================================
        // 面板映射
        // ============================================================

        private string MapAction(string action)
        {
            if (string.IsNullOrEmpty(action)) return null;
            return action.ToLower() switch
            {
                "shop" or "store" => "ShopPanel",
                "gacha" or "recruit" or "draw" => Constants.PanelNames.DECK,
                "guild" or "alliance" => Constants.PanelNames.GUILD,
                "battle" or "arena" or "pvp" => Constants.PanelNames.BATTLE,
                "maincity" or "home" or "city" => Constants.PanelNames.MAIN_CITY,
                "bag" or "inventory" => Constants.PanelNames.BAG,
                _ => action
            };
        }

        // ============================================================
        // UI 动画
        // ============================================================

        private void ShowWithFade()
        {
            if (tipBar != null) tipBar.SetActive(true);
            if (fadeCoroutine != null) StopCoroutine(fadeCoroutine);
            fadeCoroutine = StartCoroutine(FadeAnim(0f, 1f, FADE_DUR));
        }

        private void HideWithFade()
        {
            if (fadeCoroutine != null) StopCoroutine(fadeCoroutine);
            fadeCoroutine = StartCoroutine(FadeAnim(1f, 0f, FADE_DUR, () => { if (tipBar != null) tipBar.SetActive(false); }));
        }

        private void HideImmediate()
        {
            if (tipBar != null) tipBar.SetActive(false);
            if (tipCanvasGroup != null) tipCanvasGroup.alpha = 0f;
        }

        private IEnumerator FadeAnim(float from, float to, float dur, Action done = null)
        {
            if (tipCanvasGroup == null) { done?.Invoke(); yield break; }
            tipCanvasGroup.alpha = from; float t = 0f;
            while (t < dur) { t += Time.deltaTime; tipCanvasGroup.alpha = Mathf.Lerp(from, to, Mathf.Clamp01(t / dur)); yield return null; }
            tipCanvasGroup.alpha = to; fadeCoroutine = null; done?.Invoke();
        }

        private IEnumerator AutoHide(float delay)
        {
            yield return new WaitForSeconds(delay);
            if (isShowing) { HideWithFade(); isShowing = false; currentTip = null; }
            showCoroutine = null;
        }

        private void StopCoroutines()
        {
            if (showCoroutine != null) { StopCoroutine(showCoroutine); showCoroutine = null; }
            if (fadeCoroutine != null) { StopCoroutine(fadeCoroutine); fadeCoroutine = null; }
        }
    }
}
