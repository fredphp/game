using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Jiuzhou.Core;
using Game.Core.Network.Api;
using Game.Data;

namespace Game.Module.Card
{
    /// <summary>
    /// 抽卡面板（祈愿/召唤）- 九州争鼎卡牌召唤界面
    /// 功能：卡池选择、单抽/十连、稀有度特效、保底系统、抽卡历史
    /// 继承自 UIBase，由 UIManager 统一管理生命周期
    /// </summary>
    public class GachaPanel : UIBase
    {
        // ──────────────────────────────────────
        // UI 元素引用
        // ──────────────────────────────────────

        [Header("卡池展示区域")]
        [SerializeField] private RectTransform poolContainer;
        [SerializeField] private GameObject poolItemPrefab;
        [SerializeField] private Image poolBannerImage;
        [SerializeField] private Text poolNameText;
        [SerializeField] private Text poolTypeText;
        [SerializeField] private Text poolDescText;

        [Header("抽卡按钮区域")]
        [SerializeField] private Button singlePullButton;
        [SerializeField] private Button tenPullButton;
        [SerializeField] private Text singlePullCostText;
        [SerializeField] private Text tenPullCostText;
        [SerializeField] private Text playerDiamondText;

        [Header("结果展示")]
        [SerializeField] private GameObject resultOverlay;
        [SerializeField] private RectTransform resultCardsContainer;
        [SerializeField] private GameObject resultCardPrefab;
        [SerializeField] private Text resultSummaryText;
        [SerializeField] private Button skipButton;
        [SerializeField] private Button resultConfirmButton;

        [Header("保底信息")]
        [SerializeField] private Text ssrPityText;
        [SerializeField] private Text srPityText;
        [SerializeField] private Image pityProgressBar;

        [Header("历史记录")]
        [SerializeField] private Button historyButton;
        [SerializeField] private GameObject historyPanel;
        [SerializeField] private RectTransform historyContainer;
        [SerializeField] private Button historyCloseButton;

        [Header("导航")]
        [SerializeField] private Button backToCollectionButton;
        [SerializeField] private Button backButton;

        // ──────────────────────────────────────
        // 常量
        // ──────────────────────────────────────

        private const int SINGLE_PULL_COST = 150;
        private const int TEN_PULL_COST = 1350;
        private const float RESULT_CARD_SHOW_DELAY = 0.15f;

        private static readonly Dictionary<int, Color> RarityGlowColors = new Dictionary<int, Color>
        {
            { 3, new Color(0.2f, 0.8f, 0.2f, 0.3f) },
            { 4, new Color(0.6f, 0.2f, 0.9f, 0.4f) },
            { 5, new Color(1f, 0.85f, 0.1f, 0.6f) }
        };

        // ──────────────────────────────────────
        // 内部状态
        // ──────────────────────────────────────

        private List<CardPool> availablePools = new List<CardPool>();
        private CardPool selectedPool;
        private GachaResponse lastGachaResponse;
        private bool isPulling = false;
        private bool isShowingResult = false;
        private Coroutine showResultCoroutine;

        // ============================================================
        // 生命周期方法
        // ============================================================

        protected override void Awake()
        {
            base.Awake();

            if (singlePullButton != null) singlePullButton.onClick.AddListener(OnSinglePull);
            if (tenPullButton != null) tenPullButton.onClick.AddListener(OnTenPull);
            if (skipButton != null) skipButton.onClick.AddListener(OnSkipAnimation);
            if (resultConfirmButton != null) resultConfirmButton.onClick.AddListener(CloseResultOverlay);
            if (historyButton != null) historyButton.onClick.AddListener(OnShowHistory);
            if (historyCloseButton != null) historyCloseButton.onClick.AddListener(CloseHistory);
            if (backToCollectionButton != null) backToCollectionButton.onClick.AddListener(OnGoToCollection);
            if (backButton != null) backButton.onClick.AddListener(OnBack);

            if (resultOverlay != null) resultOverlay.SetActive(false);
            if (historyPanel != null) historyPanel.SetActive(false);

            UpdateCostDisplay();
        }

        public override void OnOpen(params object[] args)
        {
            base.OnOpen(args);
            LoadPools();
            UpdatePlayerDiamond();
        }

        public override void OnClose()
        {
            if (showResultCoroutine != null)
            {
                StopCoroutine(showResultCoroutine);
                showResultCoroutine = null;
            }
            isPulling = false;
            isShowingResult = false;
            CloseResultOverlay();
            CloseHistory();
            base.OnClose();
        }

        public override void OnRefresh()
        {
            LoadPools();
            UpdatePlayerDiamond();
        }

        // ============================================================
        // 卡池加载与展示
        // ============================================================

        private void LoadPools()
        {
            StartCoroutine(CardApi.ListPools((apiResult) =>
            {
                if (apiResult != null && apiResult.IsSuccess() && apiResult.data != null)
                {
                    availablePools = new List<CardPool>(apiResult.data.pools ?? Array.Empty<CardPool>());
                    DisplayPools();

                    if (availablePools.Count > 0 && selectedPool == null)
                        SelectPool(availablePools[0]);

                    Debug.Log($"[GachaPanel] 加载卡池成功: {availablePools.Count}个");
                }
                else
                {
                    Debug.LogWarning($"[GachaPanel] 加载卡池失败: {apiResult?.message}");
                    availablePools.Clear();
                }
            }));
        }

        private void DisplayPools()
        {
            ClearPoolItems();
            if (poolContainer == null || poolItemPrefab == null) return;

            for (int i = 0; i < availablePools.Count; i++)
            {
                GameObject poolObj = Instantiate(poolItemPrefab, poolContainer);
                CardPool pool = availablePools[i];

                Text nameText = poolObj.transform.Find("PoolName")?.GetComponent<Text>();
                Text typeText = poolObj.transform.Find("PoolType")?.GetComponent<Text>();
                Button poolBtn = poolObj.GetComponent<Button>();

                if (nameText != null) nameText.text = pool.DisplayName ?? pool.Name;
                if (typeText != null) typeText.text = pool.GetTypeName();

                if (poolBtn != null)
                {
                    poolBtn.onClick.RemoveAllListeners();
                    int capturedIndex = i;
                    poolBtn.onClick.AddListener(() => OnPoolClick(availablePools[capturedIndex]));
                }
            }

            float totalWidth = availablePools.Count * 200f;
            poolContainer.sizeDelta = new Vector2(totalWidth, poolContainer.sizeDelta.y);
        }

        private void ClearPoolItems()
        {
            if (poolContainer == null) return;
            for (int i = poolContainer.childCount - 1; i >= 0; i--)
                Destroy(poolContainer.GetChild(i).gameObject);
        }

        // ============================================================
        // 卡池选择
        // ============================================================

        private void OnPoolClick(CardPool pool) => SelectPool(pool);

        private void SelectPool(CardPool pool)
        {
            selectedPool = pool;

            if (poolNameText != null) poolNameText.text = pool.DisplayName ?? pool.Name;
            if (poolTypeText != null) poolTypeText.text = pool.GetTypeName();
            if (poolDescText != null) poolDescText.text = GetPoolDescription(pool.Type);

            if (poolBannerImage != null)
            {
                switch (pool.Type)
                {
                    case "limited": poolBannerImage.color = new Color(1f, 0.4f, 0.1f, 1f); break;
                    case "rateup": poolBannerImage.color = new Color(0.9f, 0.8f, 0.1f, 1f); break;
                    default: poolBannerImage.color = new Color(0.2f, 0.5f, 0.9f, 1f); break;
                }
            }

            UpdateCostDisplay();
        }

        private string GetPoolDescription(string poolType)
        {
            return poolType switch
            {
                "limited" => "限定卡池，包含限定UP角色，限时开放",
                "rateup" => "UP卡池，指定角色概率大幅提升",
                _ => "常驻卡池，可召唤所有已实装角色"
            };
        }

        // ============================================================
        // 抽卡逻辑
        // ============================================================

        private void OnSinglePull()
        {
            if (selectedPool == null) return;
            PerformGacha(1);
        }

        private void OnTenPull()
        {
            if (selectedPool == null) return;
            PerformGacha(10);
        }

        private void PerformGacha(int count)
        {
            if (isPulling) return;
            isPulling = true;
            UpdatePullButtonsState(false);

            StartCoroutine(CardApi.Gacha(selectedPool.Id, count, (apiResult) =>
            {
                isPulling = false;
                UpdatePullButtonsState(true);

                if (apiResult != null && apiResult.IsSuccess() && apiResult.data != null)
                {
                    lastGachaResponse = apiResult.data;
                    UpdatePlayerDiamond();

                    // 触发卡牌获得事件
                    EventBus.Trigger(Constants.GameEvents.CARD_ACQUIRED, count);

                    Debug.Log($"[GachaPanel] 抽卡成功");

                    ShowGachaResult(apiResult.data);
                }
                else
                {
                    Debug.LogWarning($"[GachaPanel] 抽卡失败: {apiResult?.message}");
                }
            }));
        }

        // ============================================================
        // 抽卡结果展示
        // ============================================================

        private void ShowGachaResult(GachaResponse response)
        {
            if (response == null || response.results == null || response.results.Length == 0) return;

            isShowingResult = true;
            if (resultOverlay != null) resultOverlay.SetActive(true);
            if (skipButton != null) skipButton.gameObject.SetActive(true);
            if (resultConfirmButton != null) resultConfirmButton.gameObject.SetActive(false);

            ClearResultCards();

            if (resultSummaryText != null)
            {
                int newCards = 0;
                foreach (var r in response.results) if (r.is_new) newCards++;
                resultSummaryText.text = $"获得 {newCards} 张新卡！";
            }

            showResultCoroutine = StartCoroutine(PlayResultAnimation(response));
        }

        private IEnumerator PlayResultAnimation(GachaResponse response)
        {
            // 确定最高稀有度
            int maxRarity = 3;
            foreach (var card in response.results)
                if (card.rarity > maxRarity) maxRarity = card.rarity;

            // 播放开场特效
            if (maxRarity >= 5)
                yield return StartCoroutine(PlayRarityEffect(5, 2.0f));
            else if (maxRarity >= 4)
                yield return StartCoroutine(PlayRarityEffect(4, 1.2f));

            // 逐张展示卡牌
            for (int i = 0; i < response.results.Length; i++)
            {
                CreateResultCard(response.results[i], i);
                yield return new WaitForSeconds(RESULT_CARD_SHOW_DELAY);
            }

            yield return new WaitForSeconds(0.5f);

            if (skipButton != null) skipButton.gameObject.SetActive(false);
            if (resultConfirmButton != null) resultConfirmButton.gameObject.SetActive(true);
            isShowingResult = false;
        }

        private IEnumerator PlayRarityEffect(int rarity, float duration)
        {
            Image overlayBg = resultOverlay?.GetComponent<Image>();
            if (overlayBg == null) yield break;

            Color baseColor = overlayBg.color;
            Color glowColor = RarityGlowColors.ContainsKey(rarity) ? RarityGlowColors[rarity] : Color.white;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;

                float glowIntensity;
                if (t < 0.3f) glowIntensity = Mathf.Sin((t / 0.3f) * (Mathf.PI / 2f));
                else if (t < 0.7f) glowIntensity = 1f;
                else glowIntensity = Mathf.Cos(((t - 0.7f) / 0.3f) * (Mathf.PI / 2f));

                if (rarity >= 5 && resultCardsContainer != null)
                {
                    float scale = 1f + glowIntensity * 0.02f;
                    resultCardsContainer.localScale = new Vector3(scale, scale, 1f);
                }

                overlayBg.color = Color.Lerp(baseColor, glowColor, glowIntensity * 0.7f);
                yield return null;
            }

            overlayBg.color = baseColor;
            if (resultCardsContainer != null) resultCardsContainer.localScale = Vector3.one;
        }

        private void CreateResultCard(GachaResult card, int index)
        {
            if (resultCardsContainer == null || resultCardPrefab == null) return;

            GameObject cardObj = Instantiate(resultCardPrefab, resultCardsContainer);
            RectTransform cardRect = cardObj.GetComponent<RectTransform>();
            cardRect.localScale = Vector3.zero;

            Text nameText = cardObj.transform.Find("CardName")?.GetComponent<Text>();
            Text rarityText = cardObj.transform.Find("CardRarity")?.GetComponent<Text>();
            Text newTag = cardObj.transform.Find("NewTag")?.GetComponent<Text>();
            Image cardFrame = cardObj.transform.Find("CardFrame")?.GetComponent<Image>();
            Image glowEffect = cardObj.transform.Find("GlowEffect")?.GetComponent<Image>();

            if (nameText != null) nameText.text = card.name;
            if (rarityText != null)
                rarityText.text = card.rarity switch { 3 => "R", 4 => "SR", 5 => "SSR", _ => "N" };
            if (newTag != null) newTag.gameObject.SetActive(card.is_new);

            if (cardFrame != null && RarityGlowColors.TryGetValue(card.rarity, out var color))
                cardFrame.color = color;
            if (glowEffect != null)
            {
                glowEffect.gameObject.SetActive(card.rarity >= 4);
                if (RarityGlowColors.TryGetValue(card.rarity, out var glowColor))
                    glowEffect.color = glowColor;
            }

            int row = index / 5;
            int col = index % 5;
            cardRect.anchoredPosition = new Vector2(col * 130f - 260f, -(row * 180f) + 90f);

            StartCoroutine(CardAppearAnimation(cardRect, card.rarity));
        }

        private IEnumerator CardAppearAnimation(RectTransform cardRect, int rarity)
        {
            float duration = rarity >= 5 ? 0.5f : (rarity >= 4 ? 0.4f : 0.25f);
            float elapsed = 0f;
            float overshoot = rarity >= 5 ? 1.3f : (rarity >= 4 ? 1.2f : 1.1f);

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = Mathf.Clamp01(elapsed / duration);
                float eased;
                if (t < 0.6f)
                    eased = (t / 0.6f) * overshoot;
                else
                {
                    float decayT = (t - 0.6f) / 0.4f;
                    eased = overshoot - (overshoot - 1f) * Mathf.Sin(decayT * (Mathf.PI / 2f));
                }
                cardRect.localScale = new Vector3(eased, eased, 1f);
                yield return null;
            }
            cardRect.localScale = Vector3.one;
        }

        private void ClearResultCards()
        {
            if (resultCardsContainer == null) return;
            for (int i = resultCardsContainer.childCount - 1; i >= 0; i--)
                Destroy(resultCardsContainer.GetChild(i).gameObject);
        }

        private void OnSkipAnimation()
        {
            if (showResultCoroutine != null)
            {
                StopCoroutine(showResultCoroutine);
                showResultCoroutine = null;
            }

            if (lastGachaResponse != null && lastGachaResponse.results != null)
            {
                ClearResultCards();
                for (int i = 0; i < lastGachaResponse.results.Length; i++)
                {
                    CreateResultCard(lastGachaResponse.results[i], i);
                    if (resultCardsContainer.childCount > i)
                        resultCardsContainer.GetChild(i).localScale = Vector3.one;
                }
            }

            isShowingResult = false;
            if (skipButton != null) skipButton.gameObject.SetActive(false);
            if (resultConfirmButton != null) resultConfirmButton.gameObject.SetActive(true);
        }

        private void CloseResultOverlay()
        {
            if (resultOverlay != null) resultOverlay.SetActive(false);
            lastGachaResponse = null;
        }

        // ============================================================
        // 抽卡历史
        // ============================================================

        private void OnShowHistory()
        {
            if (historyPanel == null) return;
            historyPanel.SetActive(true);

            StartCoroutine(CardApi.GachaHistory(1, (apiResult) =>
            {
                if (apiResult != null && apiResult.IsSuccess() && apiResult.data != null)
                {
                    DisplayHistoryRecords(apiResult.data);
                }
            }));
        }

        private void DisplayHistoryRecords(GachaHistoryResult records)
        {
            if (historyContainer == null || records?.records == null) return;

            for (int i = historyContainer.childCount - 1; i >= 0; i--)
                Destroy(historyContainer.GetChild(i).gameObject);

            foreach (var record in records.records)
            {
                GameObject recordObj = new GameObject("Record", typeof(RectTransform));
                recordObj.transform.SetParent(historyContainer, false);

                RectTransform rect = recordObj.GetComponent<RectTransform>();
                rect.sizeDelta = new Vector2(400f, 30f);

                Text recordText = recordObj.AddComponent<Text>();
                recordText.font = Resources.GetBuiltinResource<Font>("LegacyRuntime.ttf");
                recordText.fontSize = 14;
                recordText.alignment = TextAnchor.MiddleLeft;

                string rarityStr = record.rarity switch { 5 => "SSR", 4 => "SR", 3 => "R", _ => "N" };
                string newTag = record.is_new ? " [新]" : "";
                recordText.text = $"#{record.pull_index} {rarityStr} 卡牌ID:{record.card_id}{newTag} {record.created_at}";

                if (RarityGlowColors.TryGetValue(record.rarity, out var color))
                    recordText.color = new Color(color.r, color.g, color.b, 1f);
            }
        }

        private void CloseHistory()
        {
            if (historyPanel != null) historyPanel.SetActive(false);
        }

        // ============================================================
        // 费用与保底显示
        // ============================================================

        private void UpdateCostDisplay()
        {
            if (singlePullCostText != null) singlePullCostText.text = $"单抽 ×1 ({SINGLE_PULL_COST}💎)";
            if (tenPullCostText != null) tenPullCostText.text = $"十连 ×10 ({TEN_PULL_COST}💎)";
        }

        private void UpdatePlayerDiamond()
        {
            if (playerDiamondText != null) playerDiamondText.text = $"💎 {TokenHolder.Instance.HasToken ? "---" : "0"}";
        }

        private void UpdatePullButtonsState(bool interactable)
        {
            if (singlePullButton != null) singlePullButton.interactable = interactable;
            if (tenPullButton != null) tenPullButton.interactable = interactable;
        }

        // ============================================================
        // 导航
        // ============================================================

        private void OnGoToCollection()
        {
            UIManager.Instance.ClosePanel(PanelName);
            UIManager.Instance.OpenPanel("CardCollectionPanel");
        }

        private void OnBack() => UIManager.Instance.ClosePanel(PanelName);

        // ============================================================
        // 清理
        // ============================================================

        protected override void OnDestroy()
        {
            if (singlePullButton != null) singlePullButton.onClick.RemoveAllListeners();
            if (tenPullButton != null) tenPullButton.onClick.RemoveAllListeners();
            if (skipButton != null) skipButton.onClick.RemoveAllListeners();
            if (resultConfirmButton != null) resultConfirmButton.onClick.RemoveAllListeners();
            if (historyButton != null) historyButton.onClick.RemoveAllListeners();
            if (historyCloseButton != null) historyCloseButton.onClick.RemoveAllListeners();
            if (backToCollectionButton != null) backToCollectionButton.onClick.RemoveAllListeners();
            if (backButton != null) backButton.onClick.RemoveAllListeners();
            base.OnDestroy();
        }
    }
}
