using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Jiuzhou.Zhengding.Core.UI;

namespace Jiuzhou.Zhengding.Module.Battle
{
    /// <summary>
    /// 战斗结果面板 - 显示战斗结束后的评价、奖励、后续操作
    /// 星级评价、金币/经验奖励、卡牌掉落展示、下一关/重播/返回
    /// </summary>
    public class BattleResultPanel : UIBase
    {
        // ==================== UI引用 - 结果标题 ====================
        [Header("结果标题")]
        [SerializeField] private TextMeshProUGUI resultTitleText;
        [SerializeField] private Image resultIcon;
        [SerializeField] private Sprite victoryIcon;
        [SerializeField] private Sprite defeatIcon;
        [SerializeField] private GameObject victoryEffects;
        [SerializeField] private GameObject defeatEffects;

        // ==================== UI引用 - 星级评价 ====================
        [Header("星级评价")]
        [SerializeField] private Image[] starsDisplay = new Image[3];
        [SerializeField] private Sprite starFilledSprite;
        [SerializeField] private Sprite starEmptySprite;
        [SerializeField] private Sprite starLockedSprite;
        [SerializeField] private float starRevealInterval = 0.5f;
        [SerializeField] private float starPopScale = 1.5f;

        // ==================== UI引用 - 战斗统计 ====================
        [Header("战斗统计")]
        [SerializeField] private TextMeshProUGUI roundsText;
        [SerializeField] private TextMeshProUGUI survivalText;
        [SerializeField] private TextMeshProUGUI totalDamageText;

        // ==================== UI引用 - 奖励展示 ====================
        [Header("奖励展示")]
        [SerializeField] private GameObject rewardsContainer;
        [SerializeField] private TextMeshProUGUI goldRewardText;
        [SerializeField] private TextMeshProUGUI expRewardText;
        [SerializeField] private GameObject cardRewardsContainer;
        [SerializeField] private GameObject cardRewardPrefab;
        [SerializeField] private Transform newCardList;

        // ==================== UI引用 - 操作按钮 ====================
        [Header("操作按钮")]
        [SerializeField] private Button nextStageButton;
        [SerializeField] private Button replayButton;
        [SerializeField] private Button backButton;
        [SerializeField] private TextMeshProUGUI nextStageButtonText;

        // ==================== UI引用 - 新卡牌揭示 ====================
        [Header("新卡牌揭示")]
        [SerializeField] private GameObject newCardRevealOverlay;
        [SerializeField] private Image newCardImage;
        [SerializeField] private TextMeshProUGUI newCardNameText;
        [SerializeField] private TextMeshProUGUI newCardRarityText;
        [SerializeField] private Button newCardConfirmButton;
        [SerializeField] private float revealAnimDuration = 0.8f;

        // ==================== 运行时变量 ====================
        private BattleResult _currentResult;
        private List<GameObject> _instantiatedRewards = new List<GameObject>();
        private Coroutine _starAnimCoroutine;
        private Coroutine _revealCoroutine;

        // 稀有度颜色
        private static readonly Color CommonColor = new Color(0.7f, 0.7f, 0.7f, 1f);     // 普通 - 白色
        private static readonly Color RareColor = new Color(0.2f, 0.6f, 1.0f, 1f);        // 稀有 - 蓝色
        private static readonly Color EpicColor = new Color(0.8f, 0.3f, 0.9f, 1f);        // 史诗 - 紫色
        private static readonly Color LegendaryColor = new Color(1.0f, 0.8f, 0.2f, 1f);   // 传说 - 橙色

        /// <summary>
        /// 面板名称
        /// </summary>
        public override string PanelName => "BattleResultPanel";

        /// <summary>
        /// 面板打开 - 显示战斗结果
        /// args: BattleResult
        /// </summary>
        public override void OnOpen(params object[] args)
        {
            if (args == null || args.Length < 1 || !(args[0] is BattleResult result))
            {
                Debug.LogError("[BattleResultPanel] 打开参数不足，需要 BattleResult");
                return;
            }

            _currentResult = result;
            Debug.Log($"[BattleResultPanel] 打开结果面板 - 胜利: {result.IsVictory}, 星级: {result.Stars}");

            // 注册按钮事件
            RegisterButtonEvents();

            // 初始化UI
            InitializeStars();
            HideNewCardReveal();

            // 先显示标题
            ShowResultTitle(result.IsVictory);

            // 延迟播放动画序列
            StartCoroutine(PlayResultSequence(result));
        }

        /// <summary>
        /// 面板关闭 - 清理资源
        /// </summary>
        public override void OnClose()
        {
            UnregisterButtonEvents();

            // 停止动画协程
            if (_starAnimCoroutine != null)
            {
                StopCoroutine(_starAnimCoroutine);
                _starAnimCoroutine = null;
            }
            if (_revealCoroutine != null)
            {
                StopCoroutine(_revealCoroutine);
                _revealCoroutine = null;
            }

            // 清理动态生成的奖励UI
            CleanupRewardUI();

            Debug.Log("[BattleResultPanel] 结果面板已关闭");
        }

        /// <summary>
        /// 面板刷新
        /// </summary>
        public override void OnRefresh()
        {
            if (_currentResult != null)
            {
                ShowResultTitle(_currentResult.IsVictory);
                ShowRewards(_currentResult);
                ShowBattleStats(_currentResult);
            }
        }

        // ==================== 结果展示序列 ====================

        /// <summary>
        /// 播放结果展示动画序列
        /// 1. 显示标题 → 2. 星级揭示 → 3. 战斗统计 → 4. 奖励展示 → 5. 新卡揭示（如有）
        /// </summary>
        private IEnumerator PlayResultSequence(BattleResult result)
        {
            // 等待标题显示
            yield return new WaitForSeconds(0.8f);

            // 星级揭示动画
            yield return AnimateStarReveal(result.Stars);

            // 等待星级动画完成
            yield return new WaitForSeconds(0.5f);

            // 显示战斗统计
            ShowBattleStats(result);

            // 等待统计显示
            yield return new WaitForSeconds(0.5f);

            // 显示奖励
            ShowRewards(result);

            // 等待奖励显示
            yield return new WaitForSeconds(1.0f);

            // 如果有新卡牌，播放揭示动画
            if (result.CardRewardIds != null && result.CardRewardIds.Count > 0)
            {
                foreach (int cardId in result.CardRewardIds)
                {
                    yield return ShowNewCardReveal(cardId);
                    yield return new WaitForSeconds(0.3f);
                }
            }
        }

        // ==================== 标题显示 ====================

        /// <summary>
        /// 显示结果标题（胜利/失败）
        /// </summary>
        private void ShowResultTitle(bool isVictory)
        {
            if (resultTitleText != null)
            {
                resultTitleText.text = isVictory ? "战斗胜利!" : "战斗失败";
                resultTitleText.color = isVictory ? Color.yellow : new Color(0.8f, 0.3f, 0.3f, 1f);
            }

            if (resultIcon != null)
            {
                resultIcon.sprite = isVictory ? victoryIcon : defeatIcon;
                resultIcon.gameObject.SetActive(resultIcon.sprite != null);
            }

            if (victoryEffects != null)
            {
                victoryEffects.SetActive(isVictory);
            }

            if (defeatEffects != null)
            {
                defeatEffects.SetActive(!isVictory);
            }

            // 标题缩放动画
            StartCoroutine(PlayTitlePopAnimation(isVictory));
        }

        /// <summary>
        /// 标题弹出动画
        /// </summary>
        private IEnumerator PlayTitlePopAnimation(bool isVictory)
        {
            if (resultTitleText == null) yield break;

            RectTransform rect = resultTitleText.rectTransform;
            Vector3 originalScale = rect.localScale;
            rect.localScale = Vector3.zero;

            float duration = 0.5f;
            float elapsed = 0f;

            // 弹出
            while (elapsed < duration * 0.6f)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / (duration * 0.6f);
                // 弹性效果
                float scale = 1f + Mathf.Sin(t * Mathf.PI) * 0.2f;
                rect.localScale = originalScale * scale * t;
                yield return null;
            }

            // 回弹到正常大小
            elapsed = 0f;
            Vector3 currentScale = rect.localScale;
            while (elapsed < duration * 0.4f)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / (duration * 0.4f);
                rect.localScale = Vector3.Lerp(currentScale, originalScale, t);
                yield return null;
            }

            rect.localScale = originalScale;
        }

        // ==================== 星级评价 ====================

        /// <summary>
        /// 初始化星级显示
        /// </summary>
        private void InitializeStars()
        {
            for (int i = 0; i < starsDisplay.Length; i++)
            {
                if (starsDisplay[i] != null)
                {
                    // 初始显示空星
                    if (starEmptySprite != null)
                    {
                        starsDisplay[i].sprite = starEmptySprite;
                    }
                    starsDisplay[i].color = new Color(0.3f, 0.3f, 0.3f, 0.5f);
                    starsDisplay[i].transform.localScale = Vector3.zero;
                }
            }
        }

        /// <summary>
        /// 星级揭示动画 - 依次弹出每颗星
        /// </summary>
        /// <param name="starCount">获得星数（0-3）</param>
        private IEnumerator AnimateStarReveal(int starCount)
        {
            _starAnimCoroutine = StartCoroutine(AnimateStarRevealInternal(starCount));
            yield return _starAnimCoroutine;
        }

        /// <summary>
        /// 星级揭示动画内部实现
        /// </summary>
        private IEnumerator AnimateStarRevealInternal(int starCount)
        {
            int clampedStars = Mathf.Clamp(starCount, 0, 3);

            for (int i = 0; i < 3; i++)
            {
                if (i >= starsDisplay.Length || starsDisplay[i] == null)
                {
                    continue;
                }

                Image starImage = starsDisplay[i];

                if (i < clampedStars)
                {
                    // 亮星动画
                    starImage.color = Color.yellow;
                    if (starFilledSprite != null)
                    {
                        starImage.sprite = starFilledSprite;
                    }

                    yield return PlayStarPopAnimation(starImage);
                }
                else
                {
                    // 未获得的星 - 灰色缩小显示
                    starImage.color = new Color(0.3f, 0.3f, 0.3f, 0.3f);
                    if (starEmptySprite != null)
                    {
                        starImage.sprite = starEmptySprite;
                    }
                    starImage.transform.localScale = Vector3.one * 0.7f;
                }

                // 星与星之间的间隔
                yield return new WaitForSeconds(starRevealInterval);
            }
        }

        /// <summary>
        /// 单颗星弹出动画
        /// </summary>
        private IEnumerator PlayStarPopAnimation(Image starImage)
        {
            RectTransform rect = starImage.rectTransform;
            Vector3 originalScale = rect.localScale;
            rect.localScale = Vector3.zero;

            float duration = 0.4f;
            float elapsed = 0f;

            // 放大到超过正常大小
            while (elapsed < duration * 0.5f)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / (duration * 0.5f);
                // 弹性缓动
                float easedT = 1f - Mathf.Pow(1f - t, 3f);
                rect.localScale = Vector3.Lerp(Vector3.zero, originalScale * starPopScale, easedT);
                yield return null;
            }

            // 回弹到正常大小
            elapsed = 0f;
            Vector3 popScale = rect.localScale;
            while (elapsed < duration * 0.5f)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / (duration * 0.5f);
                float easedT = t * t * (3f - 2f * t); // smoothstep
                rect.localScale = Vector3.Lerp(popScale, originalScale, easedT);
                yield return null;
            }

            rect.localScale = originalScale;
        }

        // ==================== 战斗统计 ====================

        /// <summary>
        /// 显示战斗统计数据
        /// </summary>
        private void ShowBattleStats(BattleResult result)
        {
            if (roundsText != null)
            {
                roundsText.text = $"战斗回合: {result.TotalRounds}";
            }

            if (survivalText != null)
            {
                survivalText.text = $"存活卡牌: {result.AliveCardsCount}/{result.TotalCardsCount}";
                // 根据存活率显示不同颜色
                float survivalRate = result.TotalCardsCount > 0
                    ? (float)result.AliveCardsCount / result.TotalCardsCount
                    : 0f;
                if (survivalRate >= 1f)
                {
                    survivalText.color = Color.yellow;
                }
                else if (survivalRate >= 0.6f)
                {
                    survivalText.color = Color.green;
                }
                else if (survivalRate > 0f)
                {
                    survivalText.color = new Color(1f, 0.6f, 0.3f, 1f);
                }
                else
                {
                    survivalText.color = Color.red;
                }
            }

            // 计算总伤害（从战斗日志统计）
            if (totalDamageText != null && result.ActionLog != null)
            {
                int totalDamage = 0;
                foreach (var action in result.ActionLog)
                {
                    if (action.IsPlayerAction)
                    {
                        totalDamage += action.Damage;
                    }
                }
                totalDamageText.text = $"我方总伤害: {totalDamage}";
            }
        }

        // ==================== 奖励展示 ====================

        /// <summary>
        /// 显示奖励信息
        /// </summary>
        private void ShowRewards(BattleResult result)
        {
            // 显示金币奖励
            if (goldRewardText != null)
            {
                goldRewardText.text = result.IsVictory
                    ? $"+{result.GoldReward} 金币"
                    : $"+{result.GoldReward} 金币 (安慰奖)";
                StartCoroutine(PlayRewardCounterAnimation(goldRewardText, result.GoldReward));
            }

            // 显示经验奖励
            if (expRewardText != null)
            {
                expRewardText.text = $"+{result.ExpReward} 经验";
                StartCoroutine(PlayRewardCounterAnimation(expRewardText, result.ExpReward));
            }

            // 显示卡牌奖励
            if (result.CardRewardIds != null && result.CardRewardIds.Count > 0)
            {
                ShowCardRewards(result.CardRewardIds);
            }
            else
            {
                if (cardRewardsContainer != null)
                {
                    cardRewardsContainer.SetActive(false);
                }
            }

            // 显示奖励容器
            if (rewardsContainer != null)
            {
                rewardsContainer.SetActive(true);
            }
        }

        /// <summary>
        /// 显示卡牌奖励列表
        /// </summary>
        private void ShowCardRewards(List<int> cardRewardIds)
        {
            if (cardRewardsContainer == null || cardRewardPrefab == null) return;

            // 清理旧的卡牌奖励UI
            CleanupRewardUI();

            cardRewardsContainer.SetActive(true);

            foreach (int cardId in cardRewardIds)
            {
                GameObject cardGo = Instantiate(cardRewardPrefab, newCardList != null ? newCardList : cardRewardsContainer.transform);
                _instantiatedRewards.Add(cardGo);

                // 设置卡牌奖励显示
                var cardRewardUI = cardGo.GetComponent<CardRewardItem>();
                if (cardRewardUI != null)
                {
                    cardRewardUI.Setup(cardId);
                }
                else
                {
                    // 简单设置文本
                    var text = cardGo.GetComponentInChildren<TextMeshProUGUI>();
                    if (text != null)
                    {
                        text.text = $"新卡牌 #{cardId}";
                    }
                }

                // 边框颜色根据稀有度
                Image border = cardGo.GetComponentInChildren<Image>();
                if (border != null)
                {
                    border.color = GetRarityColorForCard(cardId);
                }
            }
        }

        /// <summary>
        /// 奖励数字递增动画
        /// </summary>
        private IEnumerator PlayRewardCounterAnimation(TextMeshProUGUI textElement, int targetValue)
        {
            string prefix = "";
            string suffix = "";
            string originalText = textElement.text;

            // 提取前缀和后缀
            int plusIndex = originalText.IndexOf('+');
            if (plusIndex >= 0)
            {
                prefix = originalText.Substring(0, plusIndex + 1);
                int spaceIndex = originalText.IndexOf(' ', plusIndex);
                if (spaceIndex >= 0)
                {
                    suffix = originalText.Substring(spaceIndex);
                }
            }

            float duration = 0.8f;
            float elapsed = 0f;
            int currentDisplayValue = 0;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                float easedT = 1f - Mathf.Pow(1f - t, 3f);
                currentDisplayValue = Mathf.RoundToInt(targetValue * easedT);
                textElement.text = $"{prefix}{currentDisplayValue}{suffix}";
                yield return null;
            }

            textElement.text = $"{prefix}{targetValue}{suffix}";
        }

        /// <summary>
        /// 根据卡牌ID获取稀有度颜色
        /// </summary>
        private Color GetRarityColorForCard(int cardId)
        {
            // 使用卡牌ID末位判断稀有度（简化逻辑，实际应从卡牌数据读取）
            int rarityIndicator = cardId % 10;
            if (rarityIndicator >= 8)
            {
                return LegendaryColor;
            }
            else if (rarityIndicator >= 5)
            {
                return EpicColor;
            }
            else if (rarityIndicator >= 3)
            {
                return RareColor;
            }
            else
            {
                return CommonColor;
            }
        }

        // ==================== 新卡牌揭示 ====================

        /// <summary>
        /// 显示新卡牌揭示动画
        /// </summary>
        private IEnumerator ShowNewCardReveal(int cardId)
        {
            if (newCardRevealOverlay == null) yield break;

            newCardRevealOverlay.SetActive(true);

            // 阶段1: 卡牌背面展示（翻转动画面板）
            if (newCardImage != null)
            {
                newCardImage.transform.localScale = Vector3.zero;
            }

            yield return new WaitForSeconds(0.3f);

            // 阶段2: 卡牌翻转动画
            if (newCardImage != null)
            {
                StartCoroutine(PlayCardFlipAnimation(newCardImage, revealAnimDuration));
            }

            yield return new WaitForSeconds(revealAnimDuration * 0.5f);

            // 阶段3: 显示卡牌信息
            if (newCardNameText != null)
            {
                // 从卡牌ID生成名称（简化逻辑）
                newCardNameText.text = GenerateCardName(cardId);
                newCardNameText.gameObject.SetActive(true);
            }

            if (newCardRarityText != null)
            {
                newCardRarityText.text = GetRarityName(cardId);
                newCardRarityText.color = GetRarityColorForCard(cardId);
                newCardRarityText.gameObject.SetActive(true);
            }

            // 等待玩家确认
            yield return new WaitForSeconds(1.0f);

            // 显示确认按钮
            if (newCardConfirmButton != null)
            {
                newCardConfirmButton.gameObject.SetActive(true);
                newCardConfirmButton.onClick.AddListener(OnNewCardConfirm);
            }
        }

        /// <summary>
        /// 卡牌翻转动画
        /// </summary>
        private IEnumerator PlayCardFlipAnimation(Image cardImage, float duration)
        {
            RectTransform rect = cardImage.rectTransform;

            // 设置稀有度边框颜色
            cardImage.color = GetRarityColorForCard(0); // 简化处理

            float elapsed = 0f;
            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;

                // X轴缩放模拟翻转
                if (t < 0.5f)
                {
                    float scaleX = Mathf.Lerp(0f, 1f, t * 2f);
                    rect.localScale = new Vector3(scaleX, 1f, 1f);
                }
                else
                {
                    float scaleX = Mathf.Lerp(1f, 1f, (t - 0.5f) * 2f);
                    float scaleY = Mathf.Lerp(0.8f, 1f, (t - 0.5f) * 2f);
                    rect.localScale = new Vector3(scaleX, scaleY, 1f);
                }

                yield return null;
            }

            rect.localScale = Vector3.one;
        }

        /// <summary>
        /// 新卡牌确认按钮点击
        /// </summary>
        private void OnNewCardConfirm()
        {
            HideNewCardReveal();
        }

        /// <summary>
        /// 隐藏新卡牌揭示界面
        /// </summary>
        private void HideNewCardReveal()
        {
            if (newCardRevealOverlay != null)
            {
                newCardRevealOverlay.SetActive(false);
            }

            if (newCardConfirmButton != null)
            {
                newCardConfirmButton.onClick.RemoveAllListeners();
            }

            if (newCardNameText != null)
            {
                newCardNameText.gameObject.SetActive(false);
            }

            if (newCardRarityText != null)
            {
                newCardRarityText.gameObject.SetActive(false);
            }
        }

        /// <summary>
        /// 根据卡牌ID生成卡牌名称（简化逻辑）
        /// </summary>
        private string GenerateCardName(int cardId)
        {
            string[] heroNames = new string[]
            {
                "吕布", "关羽", "赵云", "张飞", "马超",
                "黄忠", "诸葛亮", "周瑜", "司马懿", "曹操",
                "孙策", "陆逊", "典韦", "许褚", "夏侯惇",
                "甘宁", "太史慈", "庞统", "徐庶", "姜维"
            };

            int index = cardId % heroNames.Length;
            return heroNames[index];
        }

        /// <summary>
        /// 获取稀有度名称
        /// </summary>
        private string GetRarityName(int cardId)
        {
            int rarityIndicator = cardId % 10;
            if (rarityIndicator >= 8)
            {
                return "★★★★ 传说";
            }
            else if (rarityIndicator >= 5)
            {
                return "★★★ 史诗";
            }
            else if (rarityIndicator >= 3)
            {
                return "★★ 稀有";
            }
            else
            {
                return "★ 普通";
            }
        }

        // ==================== 按钮事件 ====================

        /// <summary>
        /// 注册按钮事件
        /// </summary>
        private void RegisterButtonEvents()
        {
            if (nextStageButton != null)
            {
                nextStageButton.onClick.AddListener(OnNextStageClick);
            }

            if (replayButton != null)
            {
                replayButton.onClick.AddListener(OnReplayClick);
            }

            if (backButton != null)
            {
                backButton.onClick.AddListener(OnBackClick);
            }
        }

        /// <summary>
        /// 取消注册按钮事件
        /// </summary>
        private void UnregisterButtonEvents()
        {
            if (nextStageButton != null)
            {
                nextStageButton.onClick.RemoveAllListeners();
            }

            if (replayButton != null)
            {
                replayButton.onClick.RemoveAllListeners();
            }

            if (backButton != null)
            {
                backButton.onClick.RemoveAllListeners();
            }

            if (newCardConfirmButton != null)
            {
                newCardConfirmButton.onClick.RemoveAllListeners();
            }
        }

        /// <summary>
        /// 下一关按钮点击 - 进入下一关卡
        /// </summary>
        private void OnNextStageClick()
        {
            if (_currentResult == null || !_currentResult.IsVictory)
            {
                Debug.LogWarning("[BattleResultPanel] 失败时无法进入下一关");
                return;
            }

            Debug.Log("[BattleResultPanel] 进入下一关");

            // 关闭当前面板
            UIManager.Instance.ClosePanel(PanelName);

            // 重新打开战斗面板，关卡ID+1
            // 注意: 实际应使用玩家之前出战的卡牌阵容
            // 这里通过EventBus通知其他模块重新开始战斗
            var nextStageArgs = new object[]
            {
                _currentResult,  // 传递当前结果
                true             // 标记为下一关
            };
            UIManager.Instance.OpenPanel("BattlePanel", nextStageArgs);
        }

        /// <summary>
        /// 重播按钮点击 - 重新挑战当前关卡
        /// </summary>
        private void OnReplayClick()
        {
            if (_currentResult == null) return;

            Debug.Log("[BattleResultPanel] 重播战斗");

            // 关闭当前面板
            UIManager.Instance.ClosePanel(PanelName);

            // 重新打开战斗面板
            // 实际应从BattleApi.GetReplay获取回放数据
            // 这里简化为直接重开
            var replayArgs = new object[]
            {
                _currentResult,
                false  // 标记为重播
            };
            UIManager.Instance.OpenPanel("BattlePanel", replayArgs);
        }

        /// <summary>
        /// 返回按钮点击 - 返回主城或关卡选择
        /// </summary>
        private void OnBackClick()
        {
            Debug.Log("[BattleResultPanel] 返回主界面");

            // 关闭当前面板
            UIManager.Instance.ClosePanel(PanelName);

            // 关闭战斗面板（如果还在）
            UIManager.Instance.ClosePanel("BattlePanel");

            // 打开主界面或关卡选择
            UIManager.Instance.OpenPanel("MainCityPanel");
        }

        // ==================== 清理 ====================

        /// <summary>
        /// 清理奖励UI
        /// </summary>
        private void CleanupRewardUI()
        {
            foreach (var obj in _instantiatedRewards)
            {
                if (obj != null)
                {
                    Destroy(obj);
                }
            }
            _instantiatedRewards.Clear();
        }
    }

    /// <summary>
    /// 卡牌奖励展示项UI组件
    /// </summary>
    public class CardRewardItem : MonoBehaviour
    {
        [SerializeField] private Image cardIcon;
        [SerializeField] private Image borderImage;
        [SerializeField] private TextMeshProUGUI cardNameText;
        [SerializeField] private TextMeshProUGUI rarityText;

        /// <summary>
        /// 设置卡牌奖励显示
        /// </summary>
        public void Setup(int cardId)
        {
            // 简化逻辑 - 实际应从CardModel获取卡牌数据
            if (cardNameText != null)
            {
                string[] heroNames = new string[]
                {
                    "吕布", "关羽", "赵云", "张飞", "马超",
                    "诸葛亮", "周瑜", "司马懿", "曹操", "孙策"
                };
                cardNameText.text = heroNames[cardId % heroNames.Length];
            }

            if (rarityText != null)
            {
                int rarityIndicator = cardId % 10;
                if (rarityIndicator >= 8)
                {
                    rarityText.text = "传说";
                    rarityText.color = new Color(1f, 0.8f, 0.2f, 1f);
                }
                else if (rarityIndicator >= 5)
                {
                    rarityText.text = "史诗";
                    rarityText.color = new Color(0.8f, 0.3f, 0.9f, 1f);
                }
                else if (rarityIndicator >= 3)
                {
                    rarityText.text = "稀有";
                    rarityText.color = new Color(0.2f, 0.6f, 1f, 1f);
                }
                else
                {
                    rarityText.text = "普通";
                    rarityText.color = new Color(0.7f, 0.7f, 0.7f, 1f);
                }
            }
        }
    }
}
