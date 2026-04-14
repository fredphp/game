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
    /// 编队编辑面板 - 九州争鼎卡组构建界面
    /// 功能：5个编队槽位(5v5)、点击/拖拽添加卡牌、编队验证、自动编队、战力计算、阵营羁绊
    /// 继承自 UIBase，由 UIManager 统一管理生命周期
    /// </summary>
    public class DeckEditPanel : UIBase
    {
        // ──────────────────────────────────────
        // UI 元素引用
        // ──────────────────────────────────────

        [Header("编队槽位区域")]
        [SerializeField] private RectTransform deckSlotsContainer;
        [SerializeField] private GameObject deckSlotPrefab;
        [SerializeField] private Text deckNameText;
        [SerializeField] private InputField deckNameInput;
        [SerializeField] private Text totalPowerText;
        [SerializeField] private Text deckCountText;

        [Header("可用卡牌区域")]
        [SerializeField] private ScrollRect availableCardsScroll;
        [SerializeField] private RectTransform availableCardsContainer;
        [SerializeField] private GameObject cardItemPrefab;
        [SerializeField] private InputField cardSearchInput;
        [SerializeField] private Dropdown rarityFilterDropdown;

        [Header("操作按钮")]
        [SerializeField] private Button confirmButton;
        [SerializeField] private Button clearButton;
        [SerializeField] private Button autoFillButton;
        [SerializeField] private Button backButton;

        [Header("羁绊区域")]
        [SerializeField] private Text factionBonusText;

        [Header("提示")]
        [SerializeField] private Text validationText;
        [SerializeField] private GameObject dragHighlight;

        // ──────────────────────────────────────
        // 常量
        // ──────────────────────────────────────

        private const int MAX_DECK_SIZE = 5;
        private const int CARDS_PER_ROW = 4;
        private const float CARD_WIDTH = 160f;
        private const float CARD_HEIGHT = 210f;
        private const float CARD_SPACING = 8f;

        private static readonly Dictionary<string, string> FactionNames = new Dictionary<string, string>
        {
            { "wei", "魏" }, { "shu", "蜀" }, { "wu", "吴" }, { "qun", "群" }
        };

        private static readonly Dictionary<string, Color> FactionColors = new Dictionary<string, Color>
        {
            { "wei", new Color(0.2f, 0.4f, 0.9f, 1f) },
            { "shu", new Color(0.2f, 0.8f, 0.2f, 1f) },
            { "wu", new Color(0.9f, 0.2f, 0.2f, 1f) },
            { "qun", new Color(0.8f, 0.7f, 0.2f, 1f) }
        };

        private static readonly Dictionary<string, int[]> FactionSynergyThresholds = new Dictionary<string, int[]>
        {
            { "wei", new int[] { 2, 3, 5 } },
            { "shu", new int[] { 2, 3, 5 } },
            { "wu", new int[] { 2, 3, 5 } },
            { "qun", new int[] { 2, 3, 5 } }
        };

        private static readonly Dictionary<int, int> SynergyBonusMap = new Dictionary<int, int>
        {
            { 2, 10 }, { 3, 25 }, { 5, 50 }
        };

        // ──────────────────────────────────────
        // 内部状态
        // ──────────────────────────────────────

        private DeckSlotData[] deckSlots = new DeckSlotData[MAX_DECK_SIZE];
        private List<UserCard> allAvailableCards = new List<UserCard>();
        private List<UserCard> filteredAvailableCards = new List<UserCard>();
        private int? editingDeckId = null;
        private bool isSaving = false;
        private string searchKeyword = "";
        private int filterRarity = 0;

        // ============================================================
        // 生命周期方法
        // ============================================================

        protected override void Awake()
        {
            base.Awake();
            InitializeDeckSlots();

            if (confirmButton != null) confirmButton.onClick.AddListener(OnConfirmClick);
            if (clearButton != null) clearButton.onClick.AddListener(OnClearClick);
            if (autoFillButton != null) autoFillButton.onClick.AddListener(OnAutoFillClick);
            if (backButton != null) backButton.onClick.AddListener(OnBack);
            if (cardSearchInput != null) cardSearchInput.onValueChanged.AddListener(OnSearchChanged);
            if (rarityFilterDropdown != null) rarityFilterDropdown.onValueChanged.AddListener(OnRarityFilterChanged);

            if (dragHighlight != null) dragHighlight.SetActive(false);
            if (validationText != null) validationText.gameObject.SetActive(false);
        }

        public override void OnOpen(params object[] args)
        {
            base.OnOpen(args);

            if (args != null && args.Length > 0 && args[0] is int deckId && deckId > 0)
                editingDeckId = deckId;
            else
                editingDeckId = null;

            for (int i = 0; i < MAX_DECK_SIZE; i++)
                deckSlots[i] = DeckSlotData.Empty(i);

            LoadAvailableCards();

            if (!editingDeckId.HasValue)
            {
                if (deckNameInput != null) deckNameInput.text = "编队 1";
                if (deckNameText != null) deckNameText.text = "编队 1";
            }
        }

        public override void OnClose()
        {
            isSaving = false;
            base.OnClose();
        }

        public override void OnRefresh()
        {
            LoadAvailableCards();
        }

        // ============================================================
        // 卡牌加载
        // ============================================================

        private void LoadAvailableCards()
        {
            StartCoroutine(CardApi.ListUserCards(1, 100, (apiResult) =>
            {
                if (apiResult != null && apiResult.IsSuccess() && apiResult.data != null)
                {
                    var pageData = apiResult.data;
                    allAvailableCards = pageData.cards != null
                        ? new List<UserCard>(pageData.cards)
                        : new List<UserCard>();

                    // 按战力降序排列
                    allAvailableCards.Sort((a, b) => b.CalculatePower().CompareTo(a.CalculatePower()));

                    ApplyFilters();
                    DisplayDeckSlots();
                    DisplayAvailableCards();
                    UpdateDeckInfo();

                    Debug.Log($"[DeckEditPanel] 加载可用卡牌: {allAvailableCards.Count}张");
                }
                else
                {
                    allAvailableCards.Clear();
                    filteredAvailableCards.Clear();
                    DisplayAvailableCards();
                }
            }));
        }

        // ============================================================
        // 编队槽位显示
        // ============================================================

        private void InitializeDeckSlots()
        {
            for (int i = 0; i < MAX_DECK_SIZE; i++)
                deckSlots[i] = DeckSlotData.Empty(i);
        }

        private void DisplayDeckSlots()
        {
            if (deckSlotsContainer != null)
            {
                for (int i = deckSlotsContainer.childCount - 1; i >= 0; i--)
                    Destroy(deckSlotsContainer.GetChild(i).gameObject);
            }

            if (deckSlotsContainer == null || deckSlotPrefab == null) return;

            for (int i = 0; i < MAX_DECK_SIZE; i++)
            {
                GameObject slotObj = Instantiate(deckSlotPrefab, deckSlotsContainer);
                PopulateDeckSlot(slotObj, deckSlots[i], i);
            }
        }

        private void PopulateDeckSlot(GameObject slotObj, DeckSlotData slot, int index)
        {
            Text slotNumberText = slotObj.transform.Find("SlotNumber")?.GetComponent<Text>();
            Text cardNameText = slotObj.transform.Find("CardName")?.GetComponent<Text>();
            Text cardRarityText = slotObj.transform.Find("CardRarity")?.GetComponent<Text>();
            Text cardPowerText = slotObj.transform.Find("CardPower")?.GetComponent<Text>();
            Text emptyText = slotObj.transform.Find("EmptyText")?.GetComponent<Text>();
            Image slotFrame = slotObj.transform.Find("SlotFrame")?.GetComponent<Image>();
            Button slotButton = slotObj.GetComponent<Button>();

            if (slotNumberText != null) slotNumberText.text = $"#{index + 1}";

            if (slot.IsEmpty)
            {
                if (emptyText != null) emptyText.gameObject.SetActive(true);
                if (cardNameText != null) cardNameText.gameObject.SetActive(false);
                if (cardRarityText != null) cardRarityText.gameObject.SetActive(false);
                if (cardPowerText != null) cardPowerText.gameObject.SetActive(false);
                if (slotFrame != null) slotFrame.color = new Color(0.5f, 0.5f, 0.5f, 0.5f);
            }
            else
            {
                if (emptyText != null) emptyText.gameObject.SetActive(false);
                if (cardNameText != null)
                {
                    cardNameText.gameObject.SetActive(true);
                    cardNameText.text = slot.Card.DisplayName;
                }
                if (cardRarityText != null)
                {
                    cardRarityText.gameObject.SetActive(true);
                    cardRarityText.text = slot.Card.DisplayRarity switch { 3 => "R", 4 => "SR", 5 => "SSR", _ => "N" };
                }
                if (cardPowerText != null)
                {
                    cardPowerText.gameObject.SetActive(true);
                    cardPowerText.text = slot.Card.CalculatePower().ToString();
                }
                if (slotFrame != null)
                {
                    if (FactionColors.TryGetValue(slot.Card.DisplayFaction, out var color))
                        slotFrame.color = color;
                    else
                        slotFrame.color = Color.white;
                }
            }

            if (slotButton != null)
            {
                slotButton.onClick.RemoveAllListeners();
                int capturedIndex = index;
                slotButton.onClick.AddListener(() => OnSlotClick(capturedIndex));
            }
        }

        // ============================================================
        // 可用卡牌显示
        // ============================================================

        private void DisplayAvailableCards()
        {
            ClearAvailableCardItems();
            if (availableCardsContainer == null || cardItemPrefab == null) return;

            HashSet<int> deckCardIds = new HashSet<int>();
            foreach (var slot in deckSlots)
                if (!slot.IsEmpty && slot.Card != null)
                    deckCardIds.Add(slot.Card.Id);

            List<UserCard> displayCards = filteredAvailableCards.FindAll(c => !deckCardIds.Contains(c.Id));

            for (int i = 0; i < displayCards.Count; i++)
            {
                GameObject cardObj = Instantiate(cardItemPrefab, availableCardsContainer);
                UserCard card = displayCards[i];
                PopulateAvailableCardItem(cardObj, card, i);

                RectTransform cardRect = cardObj.GetComponent<RectTransform>();
                int row = i / CARDS_PER_ROW;
                int col = i % CARDS_PER_ROW;
                cardRect.anchoredPosition = new Vector2(col * (CARD_WIDTH + CARD_SPACING), -(row * (CARD_HEIGHT + CARD_SPACING)));
                cardRect.sizeDelta = new Vector2(CARD_WIDTH, CARD_HEIGHT);
            }

            int rowCount = Mathf.CeilToInt((float)displayCards.Count / CARDS_PER_ROW);
            float containerHeight = Mathf.Max(rowCount * (CARD_HEIGHT + CARD_SPACING) + CARD_SPACING, 300f);
            availableCardsContainer.sizeDelta = new Vector2(availableCardsContainer.sizeDelta.x, containerHeight);
        }

        private void PopulateAvailableCardItem(GameObject cardObj, UserCard card, int index)
        {
            Text nameText = cardObj.transform.Find("NameText")?.GetComponent<Text>();
            Text powerText = cardObj.transform.Find("PowerText")?.GetComponent<Text>();
            Image frame = cardObj.transform.Find("CardFrame")?.GetComponent<Image>();
            Button cardBtn = cardObj.GetComponent<Button>();

            if (nameText != null) nameText.text = card.DisplayName;
            if (powerText != null) powerText.text = card.CalculatePower().ToString();

            if (frame != null)
            {
                if (FactionColors.TryGetValue(card.DisplayFaction, out var fc))
                    frame.color = fc;
                else
                    frame.color = Color.gray;
            }

            if (cardBtn != null)
            {
                cardBtn.onClick.RemoveAllListeners();
                cardBtn.onClick.AddListener(() => OnCardClick(card));
            }
        }

        private void ClearAvailableCardItems()
        {
            if (availableCardsContainer == null) return;
            for (int i = availableCardsContainer.childCount - 1; i >= 0; i--)
                Destroy(availableCardsContainer.GetChild(i).gameObject);
        }

        // ============================================================
        // 编队操作
        // ============================================================

        /// <summary>
        /// 卡牌点击 - 添加到第一个空槽位
        /// </summary>
        private void OnCardClick(UserCard card)
        {
            if (card == null) return;
            if (IsCardInDeck(card.Id))
            {
                ShowValidation("该卡牌已在编队中");
                return;
            }

            int emptySlot = -1;
            for (int i = 0; i < MAX_DECK_SIZE; i++)
            {
                if (deckSlots[i].IsEmpty) { emptySlot = i; break; }
            }

            if (emptySlot < 0)
            {
                ShowValidation("编队已满（最多5张卡牌）");
                return;
            }

            AddCardToSlot(card, emptySlot);
        }

        /// <summary>
        /// 槽位点击 - 移除卡牌
        /// </summary>
        private void OnSlotClick(int slotIndex)
        {
            if (slotIndex < 0 || slotIndex >= MAX_DECK_SIZE || deckSlots[slotIndex].IsEmpty) return;
            RemoveCardFromSlot(slotIndex);
        }

        private void AddCardToSlot(UserCard card, int slotIndex)
        {
            if (card == null || slotIndex < 0 || slotIndex >= MAX_DECK_SIZE) return;
            deckSlots[slotIndex] = DeckSlotData.Filled(slotIndex, card);
            PlaySlotAnimation(slotIndex);
            DisplayDeckSlots();
            DisplayAvailableCards();
            UpdateDeckInfo();
            ClearValidation();
            Debug.Log($"[DeckEditPanel] 添加 [{card.DisplayName}] 到槽位 #{slotIndex + 1}");
        }

        private void RemoveCardFromSlot(int slotIndex)
        {
            if (slotIndex < 0 || slotIndex >= MAX_DECK_SIZE || deckSlots[slotIndex].IsEmpty) return;
            string cardName = deckSlots[slotIndex].Card.DisplayName;
            deckSlots[slotIndex] = DeckSlotData.Empty(slotIndex);
            DisplayDeckSlots();
            DisplayAvailableCards();
            UpdateDeckInfo();
            ClearValidation();
            Debug.Log($"[DeckEditPanel] 移除 [{cardName}] 从槽位 #{slotIndex + 1}");
        }

        private bool IsCardInDeck(int cardId)
        {
            foreach (var slot in deckSlots)
                if (!slot.IsEmpty && slot.Card != null && slot.Card.Id == cardId)
                    return true;
            return false;
        }

        private int GetDeckCardCount()
        {
            int count = 0;
            foreach (var slot in deckSlots)
                if (!slot.IsEmpty) count++;
            return count;
        }

        // ============================================================
        // 编队验证
        // ============================================================

        private bool ValidateDeck()
        {
            int cardCount = GetDeckCardCount();
            if (cardCount == 0)
            {
                ShowValidation("编队不能为空，请至少放置1张卡牌");
                return false;
            }

            HashSet<int> cardIds = new HashSet<int>();
            foreach (var slot in deckSlots)
            {
                if (!slot.IsEmpty && slot.Card != null)
                {
                    if (cardIds.Contains(slot.Card.Id))
                    {
                        ShowValidation("编队中存在重复卡牌");
                        return false;
                    }
                    cardIds.Add(slot.Card.Id);
                }
            }

            ClearValidation();
            return true;
        }

        private void ShowValidation(string message)
        {
            if (validationText != null)
            {
                validationText.text = message;
                validationText.gameObject.SetActive(true);
                StartCoroutine(HideValidationAfterDelay(3f));
            }
        }

        private void ClearValidation()
        {
            if (validationText != null) validationText.gameObject.SetActive(false);
        }

        private IEnumerator HideValidationAfterDelay(float delay)
        {
            yield return new WaitForSeconds(delay);
            ClearValidation();
        }

        // ============================================================
        // 战力计算
        // ============================================================

        private int CalculateTotalPower()
        {
            int basePower = 0;
            foreach (var slot in deckSlots)
                if (!slot.IsEmpty && slot.Card != null)
                    basePower += slot.Card.CalculatePower();

            float synergyMultiplier = 1f + CalculateSynergyBonusPercentage() / 100f;
            return Mathf.RoundToInt(basePower * synergyMultiplier);
        }

        // ============================================================
        // 自动编队
        // ============================================================

        private void OnAutoFillClick()
        {
            for (int i = 0; i < MAX_DECK_SIZE; i++)
                deckSlots[i] = DeckSlotData.Empty(i);

            int fillCount = Mathf.Min(MAX_DECK_SIZE, allAvailableCards.Count);
            for (int i = 0; i < fillCount; i++)
                deckSlots[i] = DeckSlotData.Filled(i, allAvailableCards[i]);

            DisplayDeckSlots();
            DisplayAvailableCards();
            UpdateDeckInfo();
            ClearValidation();
            Debug.Log($"[DeckEditPanel] 自动编队: 填入{fillCount}张卡牌");
        }

        // ============================================================
        // 阵营羁绊
        // ============================================================

        private int CalculateSynergyBonusPercentage()
        {
            Dictionary<string, int> factionCounts = new Dictionary<string, int>();
            foreach (var slot in deckSlots)
            {
                if (!slot.IsEmpty && slot.Card != null && !string.IsNullOrEmpty(slot.Card.DisplayFaction))
                {
                    string faction = slot.Card.DisplayFaction;
                    if (!factionCounts.ContainsKey(faction)) factionCounts[faction] = 0;
                    factionCounts[faction]++;
                }
            }

            int maxBonus = 0;
            foreach (var kvp in factionCounts)
            {
                if (FactionSynergyThresholds.TryGetValue(kvp.Key, out var thresholds))
                {
                    foreach (int threshold in thresholds)
                    {
                        if (kvp.Value >= threshold && SynergyBonusMap.TryGetValue(threshold, out var bonus))
                            if (bonus > maxBonus) maxBonus = bonus;
                    }
                }
            }
            return maxBonus;
        }

        private void UpdateFactionBonusDisplay()
        {
            Dictionary<string, int> factionCounts = new Dictionary<string, int>();
            foreach (var slot in deckSlots)
            {
                if (!slot.IsEmpty && slot.Card != null && !string.IsNullOrEmpty(slot.Card.DisplayFaction))
                {
                    string faction = slot.Card.DisplayFaction;
                    if (!factionCounts.ContainsKey(faction)) factionCounts[faction] = 0;
                    factionCounts[faction]++;
                }
            }

            List<string> synergyDescriptions = new List<string>();
            foreach (var kvp in factionCounts)
            {
                if (FactionSynergyThresholds.TryGetValue(kvp.Key, out var thresholds))
                {
                    foreach (int threshold in thresholds)
                    {
                        if (kvp.Value >= threshold && SynergyBonusMap.TryGetValue(threshold, out var bonus))
                        {
                            string factionName = FactionNames.TryGetValue(kvp.Key, out var fn) ? fn : kvp.Key;
                            synergyDescriptions.Add($"{factionName} ×{threshold}: +{bonus}%");
                            break;
                        }
                    }
                }
            }

            if (factionBonusText != null)
            {
                if (synergyDescriptions.Count > 0)
                {
                    factionBonusText.text = "羁绊: " + string.Join(" | ", synergyDescriptions);
                    factionBonusText.color = Color.yellow;
                }
                else
                {
                    factionBonusText.text = "羁绊: 未激活（同阵营2张以上触发）";
                    factionBonusText.color = Color.gray;
                }
            }
        }

        // ============================================================
        // 编队信息更新
        // ============================================================

        private void UpdateDeckInfo()
        {
            int cardCount = GetDeckCardCount();
            int totalPower = CalculateTotalPower();

            if (totalPowerText != null) totalPowerText.text = $"总战力: {totalPower}";
            if (deckCountText != null) deckCountText.text = $"{cardCount}/{MAX_DECK_SIZE}";
            if (deckNameInput != null && deckNameText != null)
                deckNameText.text = deckNameInput.text;
            if (confirmButton != null) confirmButton.interactable = cardCount > 0;

            UpdateFactionBonusDisplay();
        }

        // ============================================================
        // 保存编队
        // ============================================================

        private void OnConfirmClick()
        {
            if (isSaving) return;
            if (!ValidateDeck()) return;

            isSaving = true;
            if (confirmButton != null) confirmButton.interactable = false;

            DeckData deckData = new DeckData
            {
                Id = editingDeckId ?? 0,
                Name = deckNameInput != null ? deckNameInput.text.Trim() : "编队 1",
                CardIds = new List<int>(),
                TotalPower = CalculateTotalPower()
            };

            foreach (var slot in deckSlots)
                if (!slot.IsEmpty && slot.Card != null)
                    deckData.CardIds.Add(slot.Card.Id);

            // 模拟保存（实际应调用 DeckApi）
            Debug.Log($"[DeckEditPanel] 编队保存成功: {deckData.Name}, {deckData.CardIds.Count}张卡, 战力{deckData.TotalPower}");

            EventBus.Trigger(Constants.GameEvents.DECK_CHANGED, deckData);

            isSaving = false;
            if (confirmButton != null) confirmButton.interactable = true;

            UIManager.Instance.ClosePanel(PanelName);
        }

        // ============================================================
        // 操作按钮
        // ============================================================

        private void OnClearClick()
        {
            for (int i = 0; i < MAX_DECK_SIZE; i++)
                deckSlots[i] = DeckSlotData.Empty(i);

            DisplayDeckSlots();
            DisplayAvailableCards();
            UpdateDeckInfo();
            ClearValidation();
        }

        private void OnBack() => UIManager.Instance.ClosePanel(PanelName);

        // ============================================================
        // 筛选与搜索
        // ============================================================

        private void OnSearchChanged(string keyword)
        {
            searchKeyword = keyword.Trim();
            ApplyFilters();
            DisplayAvailableCards();
        }

        private void OnRarityFilterChanged(int dropdownValue)
        {
            filterRarity = dropdownValue switch { 1 => 3, 2 => 4, 3 => 5, _ => 0 };
            ApplyFilters();
            DisplayAvailableCards();
        }

        private void ApplyFilters()
        {
            filteredAvailableCards = allAvailableCards.FindAll(c =>
            {
                if (filterRarity > 0 && c.DisplayRarity != filterRarity) return false;
                if (!string.IsNullOrEmpty(searchKeyword))
                {
                    string kw = searchKeyword.ToLower();
                    bool nameMatch = c.DisplayName != null && c.DisplayName.ToLower().Contains(kw);
                    bool factionMatch = c.DisplayFaction != null && c.DisplayFaction.ToLower().Contains(kw);
                    if (!nameMatch && !factionMatch) return false;
                }
                return true;
            });
        }

        // ============================================================
        // 槽位动画
        // ============================================================

        private void PlaySlotAnimation(int slotIndex)
        {
            if (deckSlotsContainer == null || slotIndex >= deckSlotsContainer.childCount) return;
            Transform slotTransform = deckSlotsContainer.GetChild(slotIndex);
            if (slotTransform != null) StartCoroutine(SlotBounceAnimation(slotTransform));
        }

        private IEnumerator SlotBounceAnimation(Transform slotTransform)
        {
            Vector3 originalScale = slotTransform.localScale;
            float duration = 0.3f;
            float elapsed = 0f;

            while (elapsed < duration * 0.5f)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / (duration * 0.5f);
                slotTransform.localScale = Vector3.Lerp(originalScale, originalScale * 1.2f, t);
                yield return null;
            }

            elapsed = 0f;
            while (elapsed < duration * 0.5f)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / (duration * 0.5f);
                slotTransform.localScale = Vector3.Lerp(originalScale * 1.2f, originalScale, t);
                yield return null;
            }

            slotTransform.localScale = originalScale;
        }

        // ============================================================
        // 清理
        // ============================================================

        protected override void OnDestroy()
        {
            if (confirmButton != null) confirmButton.onClick.RemoveAllListeners();
            if (clearButton != null) clearButton.onClick.RemoveAllListeners();
            if (autoFillButton != null) autoFillButton.onClick.RemoveAllListeners();
            if (backButton != null) backButton.onClick.RemoveAllListeners();
            if (cardSearchInput != null) cardSearchInput.onValueChanged.RemoveAllListeners();
            if (rarityFilterDropdown != null) rarityFilterDropdown.onValueChanged.RemoveAllListeners();
            base.OnDestroy();
        }
    }
}
