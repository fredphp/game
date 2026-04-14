using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;
using Jiuzhou.Core;
using Game.Core.Network.Api;
using Game.Data;

namespace Game.Module.Card
{
    /// <summary>
    /// 卡牌收藏面板 - 玩家卡牌图鉴/背包界面
    /// 功能：网格展示、稀有度筛选、多种排序、分页、卡牌详情、锁定/解锁
    /// 继承自 UIBase，由 UIManager 统一管理生命周期
    /// </summary>
    public class CardCollectionPanel : UIBase
    {
        // ──────────────────────────────────────
        // UI 元素引用
        // ──────────────────────────────────────

        [Header("卡牌展示区域")]
        [SerializeField] private RectTransform cardContainer;
        [SerializeField] private GameObject cardItemPrefab;

        [Header("筛选区域")]
        [SerializeField] private Button[] filterButtons;
        [SerializeField] private Dropdown sortDropdown;
        [SerializeField] private InputField searchInput;

        [Header("信息显示")]
        [SerializeField] private Text cardCountText;
        [SerializeField] private Text pageInfoText;

        [Header("分页按钮")]
        [SerializeField] private Button prevPageButton;
        [SerializeField] private Button nextPageButton;

        [Header("详情面板")]
        [SerializeField] private GameObject detailPanel;
        [SerializeField] private Text detailNameText;
        [SerializeField] private Text detailTitleText;
        [SerializeField] private Text detailRarityText;
        [SerializeField] private Text detailFactionText;
        [SerializeField] private Text detailRoleText;
        [SerializeField] private Text detailStatsText;
        [SerializeField] private Text detailDescriptionText;
        [SerializeField] private Text detailLevelText;
        [SerializeField] private Text detailStarText;
        [SerializeField] private Text detailPowerText;
        [SerializeField] private Text detailLockStatusText;
        [SerializeField] private Button detailLockButton;
        [SerializeField] private Button detailCloseButton;

        [Header("导航")]
        [SerializeField] private Button gachaButton;
        [SerializeField] private Button deckButton;
        [SerializeField] private Button backButton;

        // ──────────────────────────────────────
        // 常量
        // ──────────────────────────────────────

        private const int CARDS_PER_PAGE = 20;
        private const int CARDS_PER_ROW = 4;
        private const float CARD_ITEM_WIDTH = 180f;
        private const float CARD_ITEM_HEIGHT = 240f;
        private const float CARD_SPACING = 10f;

        private static readonly int[] RarityFilterValues = { 0, 3, 4, 5 };

        private static readonly Dictionary<int, Color> RarityColors = new Dictionary<int, Color>
        {
            { 3, new Color(0.2f, 0.8f, 0.2f, 1f) },
            { 4, new Color(0.6f, 0.2f, 0.9f, 1f) },
            { 5, new Color(1f, 0.6f, 0.1f, 1f) }
        };

        // ──────────────────────────────────────
        // 内部状态
        // ──────────────────────────────────────

        private List<UserCard> currentCards = new List<UserCard>();
        private int currentPage = 1;
        private int totalPages = 1;
        private int totalCards = 0;
        private int currentRarityFilter = 0;
        private CardSortType currentSortType = CardSortType.Power;
        private string searchKeyword = "";
        private UserCard selectedCard = null;
        private bool isLoading = false;

        // ============================================================
        // 生命周期方法
        // ============================================================

        protected override void Awake()
        {
            base.Awake();

            RegisterFilterButtons();

            if (sortDropdown != null)
                sortDropdown.onValueChanged.AddListener(OnSortChanged);
            if (searchInput != null)
                searchInput.onEndEdit.AddListener(OnSearchChanged);
            if (prevPageButton != null) prevPageButton.onClick.AddListener(OnPrevPage);
            if (nextPageButton != null) nextPageButton.onClick.AddListener(OnNextPage);
            if (detailLockButton != null) detailLockButton.onClick.AddListener(OnToggleLock);
            if (detailCloseButton != null) detailCloseButton.onClick.AddListener(CloseDetail);
            if (gachaButton != null) gachaButton.onClick.AddListener(OnGoToGacha);
            if (deckButton != null) deckButton.onClick.AddListener(OnGoToDeck);
            if (backButton != null) backButton.onClick.AddListener(OnBack);

            if (detailPanel != null) detailPanel.SetActive(false);
        }

        public override void OnOpen(params object[] args)
        {
            base.OnOpen(args);
            currentPage = 1;
            currentRarityFilter = 0;
            currentSortType = CardSortType.Power;
            searchKeyword = "";
            ResetFilterUI();
            LoadCards(currentPage);
        }

        public override void OnClose()
        {
            CloseDetail();
            base.OnClose();
        }

        public override void OnRefresh()
        {
            LoadCards(currentPage);
        }

        // ============================================================
        // 卡牌加载
        // ============================================================

        /// <summary>
        /// 加载指定页的卡牌列表
        /// </summary>
        private void LoadCards(int page)
        {
            if (isLoading) return;
            isLoading = true;

            StartCoroutine(CardApi.ListUserCards(page, CARDS_PER_PAGE, (apiResult) =>
            {
                isLoading = false;

                if (apiResult != null && apiResult.IsSuccess() && apiResult.data != null)
                {
                    var pageData = apiResult.data;
                    currentCards = pageData.cards != null
                        ? new List<UserCard>(pageData.cards)
                        : new List<UserCard>();
                    totalPages = pageData.total_pages > 0 ? pageData.total_pages : 1;
                    totalCards = pageData.total;
                    currentPage = page;

                    ApplyLocalFilters();
                    DisplayCards();
                    UpdatePageInfo();

                    Debug.Log($"[CardCollectionPanel] 加载卡牌: 第{page}页, 共{totalCards}张, 本页{currentCards.Count}张");
                }
                else
                {
                    Debug.LogWarning($"[CardCollectionPanel] 加载卡牌失败: {apiResult?.message}");
                    currentCards.Clear();
                    DisplayCards();
                    UpdatePageInfo();
                }
            }));
        }

        /// <summary>
        /// 在网格容器中显示当前卡牌列表
        /// </summary>
        private void DisplayCards()
        {
            ClearCardItems();
            if (cardContainer == null || cardItemPrefab == null) return;

            for (int i = 0; i < currentCards.Count; i++)
            {
                GameObject cardObj = Instantiate(cardItemPrefab, cardContainer);
                PopulateCardItem(cardObj, currentCards[i], i);

                RectTransform cardRect = cardObj.GetComponent<RectTransform>();
                int row = i / CARDS_PER_ROW;
                int col = i % CARDS_PER_ROW;
                float x = col * (CARD_ITEM_WIDTH + CARD_SPACING);
                float y = -(row * (CARD_ITEM_HEIGHT + CARD_SPACING));
                cardRect.anchoredPosition = new Vector2(x, y);
                cardRect.sizeDelta = new Vector2(CARD_ITEM_WIDTH, CARD_ITEM_HEIGHT);
            }

            int rowCount = Mathf.CeilToInt((float)currentCards.Count / CARDS_PER_ROW);
            float containerHeight = Mathf.Max(rowCount * (CARD_ITEM_HEIGHT + CARD_SPACING) + CARD_SPACING, 500f);
            cardContainer.sizeDelta = new Vector2(cardContainer.sizeDelta.x, containerHeight);

            if (cardCountText != null)
                cardCountText.text = $"共 {totalCards} 张卡牌";
        }

        private void PopulateCardItem(GameObject cardObj, UserCard card, int index)
        {
            Text nameText = cardObj.transform.Find("NameText")?.GetComponent<Text>();
            Text rarityText = cardObj.transform.Find("RarityText")?.GetComponent<Text>();
            Text levelText = cardObj.transform.Find("LevelText")?.GetComponent<Text>();
            Text powerText = cardObj.transform.Find("PowerText")?.GetComponent<Text>();
            Image cardFrame = cardObj.transform.Find("CardFrame")?.GetComponent<Image>();
            Image lockIcon = cardObj.transform.Find("LockIcon")?.GetComponent<Image>();
            Button cardButton = cardObj.GetComponent<Button>();

            if (nameText != null) nameText.text = card.DisplayName;
            if (rarityText != null)
                rarityText.text = card.DisplayRarity switch { 3 => "R", 4 => "SR", 5 => "SSR", _ => "N" };
            if (levelText != null) levelText.text = $"Lv.{card.Level}";
            if (powerText != null) powerText.text = card.CalculatePower().ToString();
            if (cardFrame != null && RarityColors.TryGetValue(card.DisplayRarity, out var color))
                cardFrame.color = color;
            if (lockIcon != null) lockIcon.gameObject.SetActive(card.IsLocked);

            if (cardButton != null)
            {
                cardButton.onClick.RemoveAllListeners();
                int capturedIndex = index;
                cardButton.onClick.AddListener(() => OnCardClick(currentCards[capturedIndex]));
            }
        }

        private void ClearCardItems()
        {
            if (cardContainer == null) return;
            for (int i = cardContainer.childCount - 1; i >= 0; i--)
                Destroy(cardContainer.GetChild(i).gameObject);
        }

        // ============================================================
        // 卡牌点击与详情
        // ============================================================

        private void OnCardClick(UserCard card)
        {
            if (card == null) return;
            selectedCard = card;
            ShowCardDetail(card);
        }

        private void ShowCardDetail(UserCard card)
        {
            if (detailPanel == null || card == null) return;
            detailPanel.SetActive(true);

            if (detailNameText != null) detailNameText.text = card.DisplayName;
            if (detailTitleText != null) detailTitleText.text = card.CardDef?.Title ?? "无称号";

            if (detailRarityText != null)
            {
                detailRarityText.text = card.DisplayRarity switch { 3 => "R 稀有", 4 => "SR 超稀有", 5 => "SSR 极稀有", _ => "N 普通" };
                if (RarityColors.TryGetValue(card.DisplayRarity, out var color))
                    detailRarityText.color = color;
            }

            if (detailFactionText != null)
                detailFactionText.text = $"阵营: {card.CardDef?.GetFactionName() ?? "未知"}";
            if (detailRoleText != null)
                detailRoleText.text = $"定位: {card.CardDef?.GetRoleName() ?? "未知"}";
            if (detailLevelText != null)
                detailLevelText.text = $"等级: {card.Level}";
            if (detailStarText != null)
                detailStarText.text = "★".Repeat(card.Star);
            if (detailPowerText != null)
                detailPowerText.text = $"战力: {card.CalculatePower()}";

            if (detailStatsText != null && card.CardDef != null)
            {
                float levelMultiplier = 1f + (card.Level - 1) * 0.02f;
                int hp = Mathf.RoundToInt(card.CardDef.BaseHp * levelMultiplier);
                int atk = Mathf.RoundToInt(card.CardDef.BaseAtk * levelMultiplier);
                int def = Mathf.RoundToInt(card.CardDef.BaseDef * levelMultiplier);
                detailStatsText.text = $"生命: {hp}  攻击: {atk}  防御: {def}";
            }

            if (detailDescriptionText != null)
                detailDescriptionText.text = card.CardDef?.Description ?? "暂无描述";

            UpdateLockButton(card);
        }

        private void UpdateLockButton(UserCard card)
        {
            if (detailLockStatusText != null)
                detailLockStatusText.text = card.IsLocked ? "🔒 已锁定" : "🔓 未锁定";
            if (detailLockButton != null)
            {
                var btnText = detailLockButton.GetComponentInChildren<Text>();
                if (btnText != null) btnText.text = card.IsLocked ? "解锁" : "锁定";
            }
        }

        private void CloseDetail()
        {
            if (detailPanel != null) detailPanel.SetActive(false);
            selectedCard = null;
        }

        /// <summary>
        /// 切换卡牌锁定状态
        /// </summary>
        private void OnToggleLock()
        {
            if (selectedCard == null) return;

            string cardIdStr = selectedCard.Id.ToString();
            bool newLockState = !selectedCard.IsLocked;

            StartCoroutine(CardApi.ToggleLock(cardIdStr, newLockState, (apiResult) =>
            {
                if (apiResult != null && apiResult.IsSuccess())
                {
                    selectedCard.IsLocked = newLockState;
                    UpdateLockButton(selectedCard);
                    DisplayCards();
                    Debug.Log($"[CardCollectionPanel] 卡牌 {selectedCard.DisplayName} {(selectedCard.IsLocked ? "已锁定" : "已解锁")}");
                }
                else
                {
                    Debug.LogWarning($"[CardCollectionPanel] 切换锁定失败: {apiResult?.message}");
                }
            }));
        }

        // ============================================================
        // 筛选与排序
        // ============================================================

        private void RegisterFilterButtons()
        {
            if (filterButtons == null) return;
            for (int i = 0; i < filterButtons.Length && i < RarityFilterValues.Length; i++)
            {
                int rarity = RarityFilterValues[i];
                if (filterButtons[i] != null)
                    filterButtons[i].onClick.AddListener(() => OnFilterClick(rarity));
            }
        }

        private void OnFilterClick(int rarity)
        {
            if (currentRarityFilter == rarity) return;
            currentRarityFilter = rarity;
            currentPage = 1;
            UpdateFilterButtonHighlight();
            LoadCards(currentPage);
        }

        private void OnSortChanged(int sortIndex)
        {
            currentSortType = (CardSortType)sortIndex;
            ApplyLocalFilters();
            DisplayCards();
        }

        private void OnSearchChanged(string keyword)
        {
            searchKeyword = keyword.Trim();
            ApplyLocalFilters();
            DisplayCards();
        }

        private void ApplyLocalFilters()
        {
            if (!string.IsNullOrEmpty(searchKeyword))
            {
                string kw = searchKeyword.ToLower();
                currentCards = currentCards.FindAll(c =>
                {
                    bool nameMatch = c.DisplayName != null && c.DisplayName.ToLower().Contains(kw);
                    bool factionMatch = c.DisplayFaction != null && c.DisplayFaction.ToLower().Contains(kw);
                    return nameMatch || factionMatch;
                });
            }

            currentCards.Sort((a, b) =>
            {
                int cmp = currentSortType switch
                {
                    CardSortType.Power => b.CalculatePower().CompareTo(a.CalculatePower()),
                    CardSortType.Level => b.Level.CompareTo(a.Level),
                    CardSortType.Rarity => b.DisplayRarity.CompareTo(a.DisplayRarity),
                    CardSortType.Name => string.Compare(a.DisplayName, b.DisplayName, StringComparison.Ordinal),
                    CardSortType.ObtainTime => string.Compare(b.ObtainTime ?? "", a.ObtainTime ?? "", StringComparison.Ordinal),
                    _ => 0
                };
                return cmp != 0 ? cmp : b.Id.CompareTo(a.Id);
            });
        }

        // ============================================================
        // 分页
        // ============================================================

        private void OnPrevPage()
        {
            if (currentPage > 1) LoadCards(currentPage - 1);
        }

        private void OnNextPage()
        {
            if (currentPage < totalPages) LoadCards(currentPage + 1);
        }

        private void UpdatePageInfo()
        {
            if (pageInfoText != null)
                pageInfoText.text = totalPages > 0 ? $"第 {currentPage}/{totalPages} 页" : "无卡牌";
            if (prevPageButton != null) prevPageButton.interactable = currentPage > 1;
            if (nextPageButton != null) nextPageButton.interactable = currentPage < totalPages;
        }

        // ============================================================
        // UI 辅助
        // ============================================================

        private void ResetFilterUI()
        {
            if (sortDropdown != null) sortDropdown.value = 0;
            if (searchInput != null) searchInput.text = "";
            UpdateFilterButtonHighlight();
        }

        private void UpdateFilterButtonHighlight()
        {
            if (filterButtons == null) return;
            for (int i = 0; i < filterButtons.Length && i < RarityFilterValues.Length; i++)
            {
                if (filterButtons[i] != null)
                {
                    bool isActive = RarityFilterValues[i] == currentRarityFilter;
                    var colors = filterButtons[i].colors;
                    colors.normalColor = isActive ? new Color(0.2f, 0.6f, 1f, 1f) : Color.white;
                    filterButtons[i].colors = colors;
                }
            }
        }

        private void OnGoToGacha() => UIManager.Instance.OpenPanel("GachaPanel");
        private void OnGoToDeck() => UIManager.Instance.OpenPanel("DeckEditPanel");
        private void OnBack() => UIManager.Instance.ClosePanel(PanelName);

        protected override void OnDestroy()
        {
            if (filterButtons != null)
                foreach (var btn in filterButtons)
                    if (btn != null) btn.onClick.RemoveAllListeners();
            if (sortDropdown != null) sortDropdown.onValueChanged.RemoveAllListeners();
            if (searchInput != null) searchInput.onEndEdit.RemoveAllListeners();
            if (prevPageButton != null) prevPageButton.onClick.RemoveAllListeners();
            if (nextPageButton != null) nextPageButton.onClick.RemoveAllListeners();
            if (detailLockButton != null) detailLockButton.onClick.RemoveAllListeners();
            if (detailCloseButton != null) detailCloseButton.onClick.RemoveAllListeners();
            if (gachaButton != null) gachaButton.onClick.RemoveAllListeners();
            if (deckButton != null) deckButton.onClick.RemoveAllListeners();
            if (backButton != null) backButton.onClick.RemoveAllListeners();
            base.OnDestroy();
        }
    }
}
