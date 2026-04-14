using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Jiuzhou.Zhengding.Core.UI;

namespace Jiuzhou.Zhengding.Module.Battle
{
    /// <summary>
    /// 战斗面板 - 主战斗界面
    /// 显示双方卡牌阵容、HP血条、回合信息、战斗日志、速度/暂停控制
    /// </summary>
    public class BattlePanel : UIBase
    {
        // ==================== UI引用 - 玩家卡牌槽位 ====================
        [Header("玩家卡牌槽位")]
        [SerializeField] private Transform playerCardSlotsParent;
        [SerializeField] private GameObject cardSlotPrefab;
        [SerializeField] private CardSlotUI[] playerCardSlots = new CardSlotUI[5];

        // ==================== UI引用 - 敌方卡牌槽位 ====================
        [Header("敌方卡牌槽位")]
        [SerializeField] private Transform enemyCardSlotsParent;
        [SerializeField] private CardSlotUI[] enemyCardSlots = new CardSlotUI[5];

        // ==================== UI引用 - 战斗信息 ====================
        [Header("战斗信息")]
        [SerializeField] private TextMeshProUGUI roundText;
        [SerializeField] private TextMeshProUGUI battleLogText;
        [SerializeField] private TextMeshProUGUI battleTimerText;
        [SerializeField] private TextMeshProUGUI playerTeamPowerText;
        [SerializeField] private TextMeshProUGUI enemyTeamPowerText;

        // ==================== UI引用 - 控制按钮 ====================
        [Header("控制按钮")]
        [SerializeField] private Button speedUpButton;
        [SerializeField] private Button pauseButton;
        [SerializeField] private Button autoButton;
        [SerializeField] private GameObject pauseOverlay;

        // ==================== UI引用 - 动画效果 ====================
        [Header("动画效果")]
        [SerializeField] private Transform damageNumberParent;
        [SerializeField] private GameObject damageNumberPrefab;
        [SerializeField] private GameObject criticalDamagePrefab;
        [SerializeField] private GameObject skillEffectPrefab;
        [SerializeField] private float attackAnimDuration = 0.4f;
        [SerializeField] private float damageDisplayDuration = 1.2f;

        // ==================== UI引用 - 战斗日志滚动区域 ====================
        [Header("战斗日志")]
        [SerializeField] private ScrollRect battleLogScrollRect;
        [SerializeField] private int maxLogLines = 50;

        // ==================== 运行时变量 ====================
        private bool _isSpeedUp = false;
        private bool _isPaused = false;
        private float _battleStartTime;
        private List<GameObject> _instantiatedUIObjects = new List<GameObject>();
        private StringBuilder _logBuilder = new StringBuilder();
        private Coroutine _timerCoroutine;

        /// <summary>
        /// 面板名称
        /// </summary>
        public override string PanelName => "BattlePanel";

        /// <summary>
        /// 面板打开 - 初始化战斗管理器和UI
        /// args: (List&lt;BattleCard&gt; deckCards, int stageId)
        /// </summary>
        public override void OnOpen(params object[] args)
        {
            if (args == null || args.Length < 2)
            {
                Debug.LogError("[BattlePanel] 打开参数不足，需要 (deckCards, stageId)");
                return;
            }

            var deckCards = args[0] as List<BattleCard>;
            int stageId = args.Length > 1 ? Convert.ToInt32(args[1]) : 1;

            if (deckCards == null || deckCards.Count == 0)
            {
                Debug.LogError("[BattlePanel] 出战卡牌为空");
                return;
            }

            Debug.Log($"[BattlePanel] 打开战斗面板 - 关卡: {stageId}, 卡牌数: {deckCards.Count}");

            // 初始化UI
            InitializeCardSlots();
            UpdateTeamPower(deckCards);
            ClearBattleLog();

            // 设置速度按钮初始状态
            _isSpeedUp = false;
            UpdateSpeedButtonText();
            speedUpButton.onClick.AddListener(OnSpeedUpClick);
            pauseButton.onClick.AddListener(OnPauseClick);

            // 显示暂停覆盖层（初始隐藏）
            if (pauseOverlay != null)
            {
                pauseOverlay.SetActive(false);
            }

            // 重置战斗计时器
            _battleStartTime = Time.time;
            _timerCoroutine = StartCoroutine(UpdateBattleTimer());

            // 注册战斗管理器事件
            RegisterBattleEvents();

            // 启动战斗
            BattleManager.Instance.SetBattleSpeed(1f);
            BattleManager.Instance.StartBattle(deckCards, stageId);
        }

        /// <summary>
        /// 面板关闭 - 清理资源和事件
        /// </summary>
        public override void OnClose()
        {
            // 取消注册事件
            UnregisterBattleEvents();

            // 停止计时器
            if (_timerCoroutine != null)
            {
                StopCoroutine(_timerCoroutine);
                _timerCoroutine = null;
            }

            // 清理按钮事件
            speedUpButton.onClick.RemoveAllListeners();
            pauseButton.onClick.RemoveAllListeners();

            // 销毁动态创建的UI对象
            CleanupInstantiatedObjects();

            // 强制结束战斗管理器
            BattleManager.Instance.ForceEndBattle();

            Debug.Log("[BattlePanel] 战斗面板已关闭");
        }

        /// <summary>
        /// 面板刷新
        /// </summary>
        public override void OnRefresh()
        {
            UpdateAllCardDisplays();
        }

        // ==================== 卡牌槽位初始化 ====================

        /// <summary>
        /// 初始化卡牌槽位UI
        /// </summary>
        private void InitializeCardSlots()
        {
            // 清理旧的卡牌槽位
            if (playerCardSlotsParent != null)
            {
                foreach (Transform child in playerCardSlotsParent)
                {
                    Destroy(child.gameObject);
                }
            }
            if (enemyCardSlotsParent != null)
            {
                foreach (Transform child in enemyCardSlotsParent)
                {
                    Destroy(child.gameObject);
                }
            }

            _instantiatedUIObjects.Clear();

            // 创建玩家卡牌槽位
            if (cardSlotPrefab != null && playerCardSlotsParent != null)
            {
                for (int i = 0; i < 5; i++)
                {
                    GameObject slotGo = Instantiate(cardSlotPrefab, playerCardSlotsParent);
                    _instantiatedUIObjects.Add(slotGo);
                    playerCardSlots[i] = slotGo.GetComponent<CardSlotUI>();
                    if (playerCardSlots[i] == null)
                    {
                        playerCardSlots[i] = slotGo.AddComponent<CardSlotUI>();
                    }
                    playerCardSlots[i].Initialize(i, true);
                }
            }

            // 创建敌方卡牌槽位
            if (cardSlotPrefab != null && enemyCardSlotsParent != null)
            {
                for (int i = 0; i < 5; i++)
                {
                    GameObject slotGo = Instantiate(cardSlotPrefab, enemyCardSlotsParent);
                    _instantiatedUIObjects.Add(slotGo);
                    enemyCardSlots[i] = slotGo.GetComponent<CardSlotUI>();
                    if (enemyCardSlots[i] == null)
                    {
                        enemyCardSlots[i] = slotGo.AddComponent<CardSlotUI>();
                    }
                    enemyCardSlots[i].Initialize(i, false);
                }
            }

            // 延迟一帧更新卡牌显示（等待战斗管理器初始化）
            StartCoroutine(DelayedUpdateCards(0.6f));
        }

        /// <summary>
        /// 延迟更新卡牌显示
        /// </summary>
        private IEnumerator DelayedUpdateCards(float delay)
        {
            yield return new WaitForSeconds(delay);
            UpdateAllCardDisplays();
        }

        // ==================== 卡牌显示更新 ====================

        /// <summary>
        /// 更新所有卡牌的显示（HP条、状态等）
        /// </summary>
        private void UpdateAllCardDisplays()
        {
            // 更新玩家卡牌
            for (int i = 0; i < 5; i++)
            {
                var card = BattleManager.Instance.PlayerCards[i];
                if (playerCardSlots[i] != null)
                {
                    if (card != null)
                    {
                        playerCardSlots[i].UpdateCard(card);
                    }
                    else
                    {
                        playerCardSlots[i].SetEmpty();
                    }
                }
            }

            // 更新敌方卡牌
            for (int i = 0; i < 5; i++)
            {
                var card = BattleManager.Instance.EnemyCards[i];
                if (enemyCardSlots[i] != null)
                {
                    if (card != null)
                    {
                        enemyCardSlots[i].UpdateCard(card);
                    }
                    else
                    {
                        enemyCardSlots[i].SetEmpty();
                    }
                }
            }
        }

        /// <summary>
        /// 更新单个卡牌显示
        /// </summary>
        private void UpdateSingleCard(BattleCard card, bool isPlayer)
        {
            CardSlotUI[] slots = isPlayer ? playerCardSlots : enemyCardSlots;
            if (card.SlotIndex >= 0 && card.SlotIndex < slots.Length && slots[card.SlotIndex] != null)
            {
                slots[card.SlotIndex].UpdateCard(card);
            }
        }

        /// <summary>
        /// 计算并显示队伍战力
        /// </summary>
        private void UpdateTeamPower(List<BattleCard> deckCards)
        {
            if (playerTeamPowerText != null && deckCards != null)
            {
                int totalPower = 0;
                foreach (var card in deckCards)
                {
                    totalPower += card.Attack + card.Defense + card.MaxHp / 10;
                }
                playerTeamPowerText.text = $"我方战力: {totalPower}";
            }

            if (enemyTeamPowerText != null)
            {
                // 延迟显示敌方战力（等敌人生成后）
                StartCoroutine(UpdateEnemyPower(0.5f));
            }
        }

        /// <summary>
        /// 延迟更新敌方战力显示
        /// </summary>
        private IEnumerator UpdateEnemyPower(float delay)
        {
            yield return new WaitForSeconds(delay);
            if (enemyTeamPowerText != null)
            {
                int totalPower = 0;
                for (int i = 0; i < 5; i++)
                {
                    var card = BattleManager.Instance.EnemyCards[i];
                    if (card != null)
                    {
                        totalPower += card.Attack + card.Defense + card.MaxHp / 10;
                    }
                }
                enemyTeamPowerText.text = $"敌方战力: {totalPower}";
            }
        }

        // ==================== 战斗事件处理 ====================

        /// <summary>
        /// 注册战斗管理器事件
        /// </summary>
        private void RegisterBattleEvents()
        {
            BattleManager.Instance.OnRoundStart += HandleOnRoundStart;
            BattleManager.Instance.OnAttack += HandleOnAttack;
            BattleManager.Instance.OnSkillUse += HandleOnSkillUse;
            BattleManager.Instance.OnCardDeath += HandleOnCardDeath;
            BattleManager.Instance.OnBattleEnd += HandleOnBattleEnd;
            BattleManager.Instance.OnStateChanged += HandleOnStateChanged;
            BattleManager.Instance.OnActionLog += HandleOnActionLog;
        }

        /// <summary>
        /// 取消注册战斗管理器事件
        /// </summary>
        private void UnregisterBattleEvents()
        {
            BattleManager.Instance.OnRoundStart -= HandleOnRoundStart;
            BattleManager.Instance.OnAttack -= HandleOnAttack;
            BattleManager.Instance.OnSkillUse -= HandleOnSkillUse;
            BattleManager.Instance.OnCardDeath -= HandleOnCardDeath;
            BattleManager.Instance.OnBattleEnd -= HandleOnBattleEnd;
            BattleManager.Instance.OnStateChanged -= HandleOnStateChanged;
            BattleManager.Instance.OnActionLog -= HandleOnActionLog;
        }

        /// <summary>
        /// 回合开始处理 - 高亮当前行动卡牌，显示回合数
        /// </summary>
        private void HandleOnRoundStart(int round, BattleCard actingCard)
        {
            if (roundText != null)
            {
                roundText.text = $"第 {round} 回合";
            }

            // 清除所有卡牌高亮
            ClearAllHighlights();

            // 高亮当前行动卡牌
            if (actingCard != null)
            {
                HighlightCard(actingCard);
            }
        }

        /// <summary>
        /// 攻击事件处理 - 播放攻击动画，显示伤害数字
        /// </summary>
        private void HandleOnAttack(BattleCard attacker, BattleCard defender, int damage, bool isCritical, bool isSkill, string skillName)
        {
            // 播放攻击动画
            StartCoroutine(PlayAttackAnimation(attacker, defender));

            // 显示伤害数字
            ShowDamageNumber(defender, damage, isCritical);

            // 延迟更新HP显示（动画结束后）
            StartCoroutine(DelayedAction(attackAnimDuration * 0.5f, () =>
            {
                UpdateSingleCard(defender, defender.IsPlayer);
            }));
        }

        /// <summary>
        /// 技能使用事件处理 - 播放技能特效
        /// </summary>
        private void HandleOnSkillUse(BattleCard card, string skillName)
        {
            StartCoroutine(PlaySkillEffect(card, skillName));
        }

        /// <summary>
        /// 卡牌死亡事件处理 - 灰化并淡出卡牌
        /// </summary>
        private void HandleOnCardDeath(BattleCard card, int cardIndex, bool isPlayer)
        {
            CardSlotUI[] slots = isPlayer ? playerCardSlots : enemyCardSlots;
            if (cardIndex >= 0 && cardIndex < slots.Length && slots[cardIndex] != null)
            {
                slots[cardIndex].PlayDeathAnimation();
            }
        }

        /// <summary>
        /// 战斗结束事件处理 - 显示胜利/失败效果，延迟打开结果面板
        /// </summary>
        private void HandleOnBattleEnd(BattleResult result)
        {
            StartCoroutine(DelayedOpenResult(result));
        }

        /// <summary>
        /// 状态变化事件处理
        /// </summary>
        private void HandleOnStateChanged(BattleState newState)
        {
            if (newState == BattleState.Paused)
            {
                ShowPauseOverlay(true);
            }
            else
            {
                ShowPauseOverlay(false);
            }
        }

        /// <summary>
        /// 战斗日志事件处理
        /// </summary>
        private void HandleOnActionLog(BattleAction action)
        {
            AppendBattleLog(action);
        }

        // ==================== 动画效果 ====================

        /// <summary>
        /// 播放攻击动画 - 卡牌向目标位移然后返回
        /// </summary>
        private IEnumerator PlayAttackAnimation(BattleCard attacker, BattleCard defender)
        {
            CardSlotUI[] attackerSlots = attacker.IsPlayer ? playerCardSlots : enemyCardSlots;
            CardSlotUI[] defenderSlots = defender.IsPlayer ? playerCardSlots : enemyCardSlots;

            if (attacker.SlotIndex < 0 || attacker.SlotIndex >= attackerSlots.Length) yield break;
            if (defender.SlotIndex < 0 || defender.SlotIndex >= defenderSlots.Length) yield break;

            CardSlotUI attackerSlot = attackerSlots[attacker.SlotIndex];
            CardSlotUI defenderSlot = defenderSlots[defender.SlotIndex];

            if (attackerSlot == null || defenderSlot == null) yield break;

            RectTransform attackerRect = attackerSlot.GetComponent<RectTransform>();
            RectTransform defenderRect = defenderSlot.GetComponent<RectTransform>();
            if (attackerRect == null || defenderRect == null) yield break;

            // 计算位移方向
            Vector3 originalPos = attackerRect.localPosition;
            Vector3 targetPos = defenderRect.localPosition;

            // 只在X轴上移动（向前冲刺）
            Vector3 attackPos = originalPos;
            float direction = attacker.IsPlayer ? 1f : -1f;
            float lerpDistance = Mathf.Abs(targetPos.x - originalPos.x) * 0.4f;
            attackPos.x += direction * lerpDistance;

            float speed = 1f / BattleManager.Instance.BattleSpeed;

            // 前冲动画
            float elapsed = 0f;
            while (elapsed < attackAnimDuration * 0.5f * speed)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / (attackAnimDuration * 0.5f * speed);
                t = t * t * (3f - 2f * t); // smoothstep
                attackerRect.localPosition = Vector3.Lerp(originalPos, attackPos, t);
                yield return null;
            }

            // 返回动画
            elapsed = 0f;
            Vector3 currentPos = attackerRect.localPosition;
            while (elapsed < attackAnimDuration * 0.5f * speed)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / (attackAnimDuration * 0.5f * speed);
                t = t * t * (3f - 2f * t);
                attackerRect.localPosition = Vector3.Lerp(currentPos, originalPos, t);
                yield return null;
            }

            attackerRect.localPosition = originalPos;
        }

        /// <summary>
        /// 播放技能特效 - 闪光 + 缩放效果
        /// </summary>
        private IEnumerator PlaySkillEffect(BattleCard card, string skillName)
        {
            CardSlotUI[] slots = card.IsPlayer ? playerCardSlots : enemyCardSlots;
            if (card.SlotIndex < 0 || card.SlotIndex >= slots.Length) yield break;

            CardSlotUI slot = slots[card.SlotIndex];
            if (slot == null) yield break;

            // 显示技能名称
            slot.ShowSkillName(skillName);

            // 闪光效果 - 卡牌缩放
            RectTransform cardRect = slot.GetComponent<RectTransform>();
            if (cardRect != null)
            {
                Vector3 originalScale = cardRect.localScale;
                float duration = 0.3f / BattleManager.Instance.BattleSpeed;
                float elapsed = 0f;

                // 放大
                while (elapsed < duration * 0.5f)
                {
                    elapsed += Time.deltaTime;
                    float t = elapsed / (duration * 0.5f);
                    cardRect.localScale = Vector3.Lerp(originalScale, originalScale * 1.2f, t);
                    yield return null;
                }

                // 恢复
                elapsed = 0f;
                Vector3 maxScale = cardRect.localScale;
                while (elapsed < duration * 0.5f)
                {
                    elapsed += Time.deltaTime;
                    float t = elapsed / (duration * 0.5f);
                    cardRect.localScale = Vector3.Lerp(maxScale, originalScale, t);
                    yield return null;
                }

                cardRect.localScale = originalScale;
            }

            // 如果有技能特效预制体，生成技能特效
            if (skillEffectPrefab != null)
            {
                GameObject effect = Instantiate(skillEffectPrefab, slot.transform);
                _instantiatedUIObjects.Add(effect);

                // 技能特效播放一段时间后销毁
                StartCoroutine(DestroyAfter(effect, 1.0f / BattleManager.Instance.BattleSpeed));
            }
        }

        /// <summary>
        /// 显示伤害数字
        /// </summary>
        private void ShowDamageNumber(BattleCard target, int damage, bool isCritical)
        {
            CardSlotUI[] slots = target.IsPlayer ? playerCardSlots : enemyCardSlots;
            if (target.SlotIndex < 0 || target.SlotIndex >= slots.Length) return;

            CardSlotUI slot = slots[target.SlotIndex];
            if (slot == null) return;

            Transform parent = damageNumberParent != null ? damageNumberParent : slot.transform;

            // 选择伤害数字预制体
            GameObject prefab = isCritical ? criticalDamagePrefab : damageNumberPrefab;
            if (prefab == null && damageNumberPrefab != null)
            {
                prefab = damageNumberPrefab;
            }

            if (prefab != null)
            {
                GameObject dmgGo = Instantiate(prefab, parent);
                _instantiatedUIObjects.Add(dmgGo);

                // 设置伤害数值文本
                var dmgText = dmgGo.GetComponentInChildren<TextMeshProUGUI>();
                if (dmgText != null)
                {
                    dmgText.text = isCritical ? $"暴击! -{damage}" : $"-{damage}";
                    if (isCritical)
                    {
                        dmgText.color = Color.yellow;
                        dmgText.fontSize = 32;
                    }
                    else
                    {
                        dmgText.color = Color.white;
                    }
                }

                // 飘字动画（向上飘动并淡出）
                StartCoroutine(FloatingDamageAnimation(dmgGo, damageDisplayDuration / BattleManager.Instance.BattleSpeed));
            }
        }

        /// <summary>
        /// 伤害数字飘字动画
        /// </summary>
        private IEnumerator FloatingDamageAnimation(GameObject dmgGo, float duration)
        {
            RectTransform rect = dmgGo.GetComponent<RectTransform>();
            if (rect == null)
            {
                Destroy(dmgGo);
                yield break;
            }

            Vector3 startPos = rect.localPosition;
            Vector3 endPos = startPos + new Vector3(
                UnityEngine.Random.Range(-30f, 30f),
                80f,
                0f
            );

            float elapsed = 0f;
            CanvasGroup canvasGroup = dmgGo.GetComponent<CanvasGroup>();
            if (canvasGroup == null)
            {
                canvasGroup = dmgGo.AddComponent<CanvasGroup>();
            }
            canvasGroup.alpha = 1f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;

                // 位置插值（向上飘动）
                rect.localPosition = Vector3.Lerp(startPos, endPos, t);

                // 淡出（后半段开始）
                if (t > 0.4f)
                {
                    canvasGroup.alpha = 1f - ((t - 0.4f) / 0.6f);
                }

                yield return null;
            }

            Destroy(dmgGo);
            _instantiatedUIObjects.Remove(dmgGo);
        }

        /// <summary>
        /// 延迟打开战斗结果面板
        /// </summary>
        private IEnumerator DelayedOpenResult(BattleResult result)
        {
            // 等待动画播放完成
            yield return new WaitForSeconds(1.5f / BattleManager.Instance.BattleSpeed);

            // 通过UIManager打开结果面板
            UIManager.Instance.OpenPanel("BattleResultPanel", result);
        }

        // ==================== UI交互 ====================

        /// <summary>
        /// 加速按钮点击
        /// </summary>
        private void OnSpeedUpClick()
        {
            _isSpeedUp = !_isSpeedUp;
            if (_isSpeedUp)
            {
                BattleManager.Instance.SetBattleSpeed(2f);
            }
            else
            {
                BattleManager.Instance.SetBattleSpeed(1f);
            }
            UpdateSpeedButtonText();
        }

        /// <summary>
        /// 暂停按钮点击
        /// </summary>
        private void OnPauseClick()
        {
            if (BattleManager.Instance.CurrentState == BattleState.Paused)
            {
                BattleManager.Instance.ResumeBattle();
                _isPaused = false;
                UpdatePauseButtonText();
            }
            else
            {
                BattleManager.Instance.PauseBattle();
                _isPaused = true;
                UpdatePauseButtonText();
            }
        }

        /// <summary>
        /// 更新加速按钮文本
        /// </summary>
        private void UpdateSpeedButtonText()
        {
            var buttonText = speedUpButton?.GetComponentInChildren<TextMeshProUGUI>();
            if (buttonText != null)
            {
                buttonText.text = _isSpeedUp ? "2x" : "1x";
            }
        }

        /// <summary>
        /// 更新暂停按钮文本
        /// </summary>
        private void UpdatePauseButtonText()
        {
            var buttonText = pauseButton?.GetComponentInChildren<TextMeshProUGUI>();
            if (buttonText != null)
            {
                buttonText.text = _isPaused ? "继续" : "暂停";
            }
        }

        /// <summary>
        /// 显示/隐藏暂停覆盖层
        /// </summary>
        private void ShowPauseOverlay(bool show)
        {
            if (pauseOverlay != null)
            {
                pauseOverlay.SetActive(show);
            }
        }

        // ==================== 卡牌高亮 ====================

        /// <summary>
        /// 高亮指定卡牌
        /// </summary>
        private void HighlightCard(BattleCard card)
        {
            CardSlotUI[] slots = card.IsPlayer ? playerCardSlots : enemyCardSlots;
            if (card.SlotIndex >= 0 && card.SlotIndex < slots.Length && slots[card.SlotIndex] != null)
            {
                slots[card.SlotIndex].SetHighlight(true);
            }
        }

        /// <summary>
        /// 清除所有卡牌高亮
        /// </summary>
        private void ClearAllHighlights()
        {
            foreach (var slot in playerCardSlots)
            {
                slot?.SetHighlight(false);
            }
            foreach (var slot in enemyCardSlots)
            {
                slot?.SetHighlight(false);
            }
        }

        // ==================== 战斗日志 ====================

        /// <summary>
        /// 清空战斗日志
        /// </summary>
        private void ClearBattleLog()
        {
            _logBuilder.Clear();
            if (battleLogText != null)
            {
                battleLogText.text = "";
            }
        }

        /// <summary>
        /// 添加战斗日志条目
        /// </summary>
        private void AppendBattleLog(BattleAction action)
        {
            if (battleLogText == null) return;

            string sideMark = action.IsPlayerAction ? "【我方】" : "【敌方】";
            string actionType = action.IsSkill ? $"使用{action.SkillName}" : "普通攻击";
            string criticalText = action.IsCritical ? " 暴击!" : "";
            string counterText = !string.IsNullOrEmpty(action.FactionBonus) ? $" {action.FactionBonus}" : "";
            string logLine = $"[{action.Round}回合] {sideMark}{action.AttackerName} {actionType} → {action.DefenderName}，造成 {action.Damage} 伤害{criticalText}{counterText}\n";

            _logBuilder.Append(logLine);

            // 限制日志行数
            string logText = _logBuilder.ToString();
            string[] lines = logText.Split('\n');
            if (lines.Length > maxLogLines)
            {
                string[] trimmed = new string[maxLogLines];
                Array.Copy(lines, lines.Length - maxLogLines, trimmed, 0, maxLogLines);
                logText = string.Join("\n", trimmed);
            }

            battleLogText.text = logText;

            // 自动滚动到底部
            if (battleLogScrollRect != null)
            {
                StartCoroutine(ScrollToBottom());
            }
        }

        /// <summary>
        /// 滚动到底部
        /// </summary>
        private IEnumerator ScrollToBottom()
        {
            yield return new WaitForEndOfFrame();
            if (battleLogScrollRect != null)
            {
                battleLogScrollRect.verticalNormalizedPosition = 0f;
            }
        }

        // ==================== 计时器 ====================

        /// <summary>
        /// 更新战斗计时器
        /// </summary>
        private IEnumerator UpdateBattleTimer()
        {
            while (true)
            {
                float elapsed = Time.time - _battleStartTime;
                int minutes = Mathf.FloorToInt(elapsed / 60f);
                int seconds = Mathf.FloorToInt(elapsed % 60f);

                if (battleTimerText != null)
                {
                    battleTimerText.text = $"{minutes:D2}:{seconds:D2}";
                }

                yield return new WaitForSeconds(1f);
            }
        }

        // ==================== 工具方法 ====================

        /// <summary>
        /// 延迟执行操作
        /// </summary>
        private IEnumerator DelayedAction(float delay, Action action)
        {
            yield return new WaitForSeconds(delay);
            action?.Invoke();
        }

        /// <summary>
        /// 延迟销毁游戏对象
        /// </summary>
        private IEnumerator DestroyAfter(GameObject go, float delay)
        {
            yield return new WaitForSeconds(delay);
            if (go != null)
            {
                Destroy(go);
                _instantiatedUIObjects.Remove(go);
            }
        }

        /// <summary>
        /// 清理动态创建的UI对象
        /// </summary>
        private void CleanupInstantiatedObjects()
        {
            foreach (var obj in _instantiatedUIObjects)
            {
                if (obj != null)
                {
                    Destroy(obj);
                }
            }
            _instantiatedUIObjects.Clear();
        }
    }

    // ==================== 卡牌槽位UI组件 ====================

    /// <summary>
    /// 卡牌槽位UI - 显示单张卡牌的信息（名称、HP条、阵营、技能冷却）
    /// </summary>
    public class CardSlotUI : MonoBehaviour
    {
        [Header("卡牌信息")]
        [SerializeField] private TextMeshProUGUI cardNameText;
        [SerializeField] private TextMeshProUGUI factionText;
        [SerializeField] private TextMeshProUGUI hpText;
        [SerializeField] private TextMeshProUGUI atkText;
        [SerializeField] private TextMeshProUGUI defText;
        [SerializeField] private TextMeshProUGUI spdText;

        [Header("HP血条")]
        [SerializeField] private Image hpBarFill;
        [SerializeField] private Image hpBarBackground;
        [SerializeField] private Image cardBackground;

        [Header("技能冷却")]
        [SerializeField] private Image skillCooldownOverlay;
        [SerializeField] private TextMeshProUGUI skillCooldownText;
        [SerializeField] private TextMeshProUGUI skillNameText;

        [Header("高亮效果")]
        [SerializeField] private GameObject highlightBorder;
        [SerializeField] private Image deathOverlay;

        [Header("技能名称显示")]
        [SerializeField] private GameObject skillNamePopup;
        [SerializeField] private TextMeshProUGUI skillNamePopupText;
        [SerializeField] private float skillNameDisplayDuration = 1.5f;

        // 运行时变量
        private int _slotIndex;
        private bool _isPlayerSlot;
        private Coroutine _skillNameCoroutine;
        private Coroutine _deathAnimCoroutine;

        // 阵营颜色映射
        private static readonly Color WeiColor = new Color(0.2f, 0.4f, 0.8f, 1f);   // 魏蓝色
        private static readonly Color ShuColor = new Color(0.8f, 0.2f, 0.2f, 1f);    // 蜀红色
        private static readonly Color WuColor = new Color(0.2f, 0.7f, 0.3f, 1f);     // 吴绿色
        private static readonly Color QunColor = new Color(0.7f, 0.6f, 0.2f, 1f);    // 群黄色

        // HP条颜色
        private static readonly Color HpHighColor = new Color(0.2f, 0.8f, 0.2f, 1f);     // 绿色
        private static readonly Color HpMidColor = new Color(0.9f, 0.8f, 0.1f, 1f);      // 黄色
        private static readonly Color HpLowColor = new Color(0.9f, 0.2f, 0.2f, 1f);      // 红色
        private static readonly Color DeadColor = new Color(0.4f, 0.4f, 0.4f, 0.8f);     // 灰色

        /// <summary>
        /// 初始化卡牌槽位
        /// </summary>
        public void Initialize(int slotIndex, bool isPlayer)
        {
            _slotIndex = slotIndex;
            _isPlayerSlot = isPlayer;
        }

        /// <summary>
        /// 更新卡牌显示信息
        /// </summary>
        public void UpdateCard(BattleCard card)
        {
            if (card == null)
            {
                SetEmpty();
                return;
            }

            // 卡牌名称
            if (cardNameText != null)
            {
                cardNameText.text = card.CardName;
            }

            // 阵营
            if (factionText != null)
            {
                factionText.text = BattleManager.GetFactionName(card.Faction);
                factionText.color = GetFactionColor(card.Faction);
            }

            // 卡牌背景颜色
            if (cardBackground != null)
            {
                cardBackground.color = GetFactionColor(card.Faction) * 0.3f + Color.white * 0.7f;
            }

            // 属性文本
            if (atkText != null) atkText.text = $"攻:{card.Attack}";
            if (defText != null) defText.text = $"防:{card.Defense}";
            if (spdText != null) spdText.text = $"速:{card.Speed}";

            // HP血条
            UpdateHpBar(card);

            // 技能冷却
            UpdateSkillCooldown(card);
        }

        /// <summary>
        /// 更新HP血条
        /// </summary>
        private void UpdateHpBar(BattleCard card)
        {
            if (hpBarFill == null) return;

            float hpPercent = card.MaxHp > 0 ? (float)card.CurrentHp / card.MaxHp : 0f;
            hpBarFill.fillAmount = hpPercent;

            // HP条颜色变化: 绿 > 黄 > 红
            if (card.CurrentHp <= 0)
            {
                hpBarFill.color = DeadColor;
            }
            else if (hpPercent > 0.6f)
            {
                hpBarFill.color = HpHighColor;
            }
            else if (hpPercent > 0.3f)
            {
                hpBarFill.color = Color.Lerp(HpLowColor, HpMidColor, (hpPercent - 0.3f) / 0.3f);
            }
            else
            {
                hpBarFill.color = HpLowColor;
            }

            // HP文本
            if (hpText != null)
            {
                hpText.text = $"{card.CurrentHp}/{card.MaxHp}";
                hpText.color = card.CurrentHp <= 0 ? DeadColor : Color.white;
            }
        }

        /// <summary>
        /// 更新技能冷却显示
        /// </summary>
        private void UpdateSkillCooldown(BattleCard card)
        {
            if (skillCooldownOverlay != null)
            {
                float cooldownPercent = card.MaxSkillCooldown > 0
                    ? (float)card.SkillCooldown / card.MaxSkillCooldown
                    : 0f;
                skillCooldownOverlay.fillAmount = cooldownPercent;
                skillCooldownOverlay.gameObject.SetActive(card.SkillCooldown > 0);
            }

            if (skillCooldownText != null)
            {
                skillCooldownText.text = card.SkillCooldown > 0 ? card.SkillCooldown.ToString() : "就绪";
                skillCooldownText.color = card.SkillCooldown > 0 ? Color.gray : Color.green;
            }

            if (skillNameText != null)
            {
                skillNameText.text = card.SkillName;
            }
        }

        /// <summary>
        /// 设置空槽位
        /// </summary>
        public void SetEmpty()
        {
            if (cardNameText != null) cardNameText.text = "空";
            if (factionText != null) factionText.text = "";
            if (hpText != null) hpText.text = "";
            if (atkText != null) atkText.text = "";
            if (defText != null) defText.text = "";
            if (spdText != null) spdText.text = "";
            if (hpBarFill != null) hpBarFill.fillAmount = 0f;
            if (skillCooldownOverlay != null) skillCooldownOverlay.gameObject.SetActive(false);
            if (skillCooldownText != null) skillCooldownText.text = "";
            if (skillNameText != null) skillNameText.text = "";
            if (deathOverlay != null) deathOverlay.gameObject.SetActive(false);
        }

        /// <summary>
        /// 设置高亮状态
        /// </summary>
        public void SetHighlight(bool isHighlighted)
        {
            if (highlightBorder != null)
            {
                highlightBorder.SetActive(isHighlighted);
            }
        }

        /// <summary>
        /// 播放死亡动画 - 灰化并淡出
        /// </summary>
        public void PlayDeathAnimation()
        {
            if (_deathAnimCoroutine != null)
            {
                StopCoroutine(_deathAnimCoroutine);
            }
            _deathAnimCoroutine = StartCoroutine(DeathAnimationCoroutine());
        }

        /// <summary>
        /// 死亡动画协程
        /// </summary>
        private IEnumerator DeathAnimationCoroutine()
        {
            CanvasGroup canvasGroup = GetComponent<CanvasGroup>();
            if (canvasGroup == null)
            {
                canvasGroup = gameObject.AddComponent<CanvasGroup>();
            }

            // 显示死亡遮罩
            if (deathOverlay != null)
            {
                deathOverlay.gameObject.SetActive(true);
                deathOverlay.color = Color.clear;
            }

            float duration = 0.8f;
            float elapsed = 0f;

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;

                // 灰化效果
                if (deathOverlay != null)
                {
                    deathOverlay.color = new Color(0.3f, 0.3f, 0.3f, t * 0.7f);
                }

                // 淡出
                canvasGroup.alpha = 1f - t * 0.5f;

                // 缩小
                transform.localScale = Vector3.Lerp(Vector3.one, new Vector3(0.9f, 0.9f, 1f), t);

                yield return null;
            }
        }

        /// <summary>
        /// 显示技能名称弹出
        /// </summary>
        public void ShowSkillName(string skillName)
        {
            if (skillNamePopup == null || skillNamePopupText == null) return;

            skillNamePopupText.text = skillName;
            skillNamePopup.SetActive(true);

            if (_skillNameCoroutine != null)
            {
                StopCoroutine(_skillNameCoroutine);
            }
            _skillNameCoroutine = StartCoroutine(HideSkillNameAfter());
        }

        /// <summary>
        /// 延迟隐藏技能名称
        /// </summary>
        private IEnumerator HideSkillNameAfter()
        {
            yield return new WaitForSeconds(skillNameDisplayDuration / BattleManager.Instance.BattleSpeed);
            if (skillNamePopup != null)
            {
                skillNamePopup.SetActive(false);
            }
        }

        /// <summary>
        /// 获取阵营对应颜色
        /// </summary>
        private Color GetFactionColor(Faction faction)
        {
            return faction switch
            {
                Faction.Wei => WeiColor,
                Faction.Shu => ShuColor,
                Faction.Wu => WuColor,
                Faction.Qun => QunColor,
                _ => Color.white
            };
        }
    }
}
