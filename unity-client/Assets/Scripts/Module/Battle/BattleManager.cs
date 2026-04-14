using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Random = UnityEngine.Random;

namespace Jiuzhou.Zhengding.Module.Battle
{
    /// <summary>
    /// 战斗状态枚举
    /// </summary>
    public enum BattleState
    {
        Idle,        // 空闲
        Preparing,   // 准备中
        InProgress,  // 战斗进行中
        Animating,   // 动画播放中
        Victory,     // 胜利
        Defeat,      // 失败
        Paused       // 暂停
    }

    /// <summary>
    /// 势力枚举（阵营克制关系）
    /// 魏 > 蜀 > 吴 > 群 > 魏
    /// </summary>
    public enum Faction
    {
        Wei = 0,  // 魏
        Shu = 1,  // 蜀
        Wu = 2,   // 吴
        Qun = 3   // 群
    }

    /// <summary>
    /// 战斗中单张卡牌的运行时数据
    /// </summary>
    [Serializable]
    public class BattleCard
    {
        public int CardId;            // 卡牌ID
        public string CardName;       // 卡牌名称
        public int MaxHp;             // 最大生命值
        public int CurrentHp;         // 当前生命值
        public int Attack;            // 基础攻击力
        public int Defense;           // 基础防御力
        public int Speed;             // 速度（决定出手顺序）
        public Faction Faction;       // 阵营
        public string SkillName;      // 技能名称
        public float SkillMultiplier; // 技能伤害倍率
        public int SkillCooldown;     // 技能冷却（当前回合）
        public int MaxSkillCooldown;  // 技能最大冷却
        public bool IsAlive;          // 是否存活
        public int SlotIndex;         // 在队伍中的位置
        public bool IsPlayer;         // 是否是玩家方

        /// <summary>
        /// 从基础数据初始化战斗卡牌
        /// </summary>
        public static BattleCard CreateFromData(int cardId, string cardName, int maxHp,
            int attack, int defense, int speed, Faction faction,
            string skillName, float skillMultiplier, int maxCooldown,
            int slotIndex, bool isPlayer)
        {
            return new BattleCard
            {
                CardId = cardId,
                CardName = cardName,
                MaxHp = maxHp,
                CurrentHp = maxHp,
                Attack = attack,
                Defense = defense,
                Speed = speed,
                Faction = faction,
                SkillName = skillName,
                SkillMultiplier = skillMultiplier,
                SkillCooldown = 0,
                MaxSkillCooldown = maxCooldown,
                IsAlive = true,
                SlotIndex = slotIndex,
                IsPlayer = isPlayer
            };
        }
    }

    /// <summary>
    /// 战斗回合动作记录
    /// </summary>
    [Serializable]
    public class BattleAction
    {
        public int Round;                // 回合数
        public string AttackerName;      // 攻击者名称
        public string DefenderName;      // 防御者名称
        public int Damage;               // 造成伤害
        public bool IsCritical;          // 是否暴击
        public bool IsSkill;             // 是否使用技能
        public string SkillName;         // 技能名称
        public string FactionBonus;      // 阵营克制提示
        public bool IsPlayerAction;      // 是否是玩家方行动
    }

    /// <summary>
    /// 战斗结果数据
    /// </summary>
    [Serializable]
    public class BattleResult
    {
        public bool IsVictory;           // 是否胜利
        public int Stars;                // 星级评价（1-3）
        public int GoldReward;           // 金币奖励
        public int ExpReward;            // 经验奖励
        public List<int> CardRewardIds;  // 获得的卡牌ID列表
        public int TotalRounds;          // 总回合数
        public int AliveCardsCount;      // 存活卡牌数
        public int TotalCardsCount;      // 总卡牌数
        public List<BattleAction> ActionLog; // 战斗日志
    }

    /// <summary>
    /// 战斗管理器 - 核心战斗模拟
    /// 管理整个战斗流程：初始化、回合执行、伤害计算、胜负判定
    /// </summary>
    public class BattleManager : MonoBehaviour
    {
        private static BattleManager _instance;
        public static BattleManager Instance
        {
            get
            {
                if (_instance == null)
                {
                    var go = new GameObject("BattleManager");
                    _instance = go.AddComponent<BattleManager>();
                    DontDestroyOnLoad(go);
                }
                return _instance;
            }
        }

        // ==================== 战斗状态 ====================
        public BattleState CurrentState { get; private set; } = BattleState.Idle;
        public int CurrentRound { get; private set; } = 0;
        public float BattleSpeed { get; set; } = 1f;

        // ==================== 战斗数据 ====================
        public BattleCard[] PlayerCards { get; private set; } = new BattleCard[5];
        public BattleCard[] EnemyCards { get; private set; } = new BattleCard[5];
        public List<BattleAction> ActionLog { get; private set; } = new List<BattleAction>();

        // ==================== 常量 ====================
        private const float CRITICAL_CHANCE = 0.1f;      // 暴击概率 10%
        private const float CRITICAL_MULTIPLIER = 1.5f;   // 暴击伤害倍率
        private const float FACTION_BONUS = 0.2f;         // 阵营克制伤害加成 20%
        private const float DEFENSE_FACTOR = 0.5f;        // 防御力系数
        private const float RANDOM_MIN = 0.9f;            // 伤害随机下限
        private const float RANDOM_MAX = 1.1f;            // 伤害随机上限
        private const float ROUND_DELAY = 1.0f;           // 回合间隔（秒）
        private const int MAX_ROUNDS = 30;                // 最大回合数（超时判负）

        // ==================== 关卡难度配置 ====================
        private static readonly Dictionary<int, StageDifficulty> StageDifficulties = new Dictionary<int, StageDifficulty>
        {
            { 1, new StageDifficulty { Level = 1, EnemyHpMult = 1.0f, EnemyAtkMult = 1.0f, GoldReward = 100, ExpReward = 50 } },
            { 2, new StageDifficulty { Level = 2, EnemyHpMult = 1.1f, EnemyAtkMult = 1.05f, GoldReward = 150, ExpReward = 80 } },
            { 3, new StageDifficulty { Level = 3, EnemyHpMult = 1.2f, EnemyAtkMult = 1.1f, GoldReward = 200, ExpReward = 120 } },
            { 4, new StageDifficulty { Level = 4, EnemyHpMult = 1.3f, EnemyAtkMult = 1.2f, GoldReward = 300, ExpReward = 180 } },
            { 5, new StageDifficulty { Level = 5, EnemyHpMult = 1.5f, EnemyAtkMult = 1.3f, GoldReward = 400, ExpReward = 250 } },
            { 6, new StageDifficulty { Level = 6, EnemyHpMult = 1.7f, EnemyAtkMult = 1.5f, GoldReward = 500, ExpReward = 350 } },
            { 7, new StageDifficulty { Level = 7, EnemyHpMult = 2.0f, EnemyAtkMult = 1.7f, GoldReward = 700, ExpReward = 500 } },
            { 8, new StageDifficulty { Level = 8, EnemyHpMult = 2.3f, EnemyAtkMult = 2.0f, GoldReward = 1000, ExpReward = 700 } },
            { 9, new StageDifficulty { Level = 9, EnemyHpMult = 2.5f, EnemyAtkMult = 2.3f, GoldReward = 1500, ExpReward = 1000 } },
            { 10, new StageDifficulty { Level = 10, EnemyHpMult = 3.0f, EnemyAtkMult = 2.5f, GoldReward = 2000, ExpReward = 1500 } }
        };

        // ==================== PVE预设敌人模板 ====================
        private static readonly string[][] EnemyNames = new string[][]
        {
            new string[] { "黄巾兵", "黄巾力士", "黄巾弓手", "黄巾骑兵", "黄巾法师" },
            new string[] { "山贼头目", "山贼弓手", "山贼步兵", "山贼斥候", "山贼巫师" },
            new string[] { "叛军将领", "叛军先锋", "叛军弓兵", "叛军骑兵", "叛军谋士" },
            new string[] { "守城将领", "城防军", "弓箭手", "骑兵队", "军师" },
            new string[] { "敌军主将", "副将", "精锐步兵", "精锐弓手", "精锐骑兵" }
        };

        // ==================== 私有变量 ====================
        private int _currentStageId = 0;
        private Coroutine _battleCoroutine;
        private bool _skipAnimation = false;

        /// <summary>
        /// 回合开始事件
        /// </summary>
        public event Action<int, BattleCard> OnRoundStart;

        /// <summary>
        /// 攻击事件
        /// </summary>
        public event Action<BattleCard, BattleCard, int, bool, bool, string> OnAttack;

        /// <summary>
        /// 技能使用事件
        /// </summary>
        public event Action<BattleCard, string> OnSkillUse;

        /// <summary>
        /// 卡牌死亡事件
        /// </summary>
        public event Action<BattleCard, int, bool> OnCardDeath;

        /// <summary>
        /// 战斗结束事件
        /// </summary>
        public event Action<BattleResult> OnBattleEnd;

        /// <summary>
        /// 战斗状态变化事件
        /// </summary>
        public event Action<BattleState> OnStateChanged;

        /// <summary>
        /// 战斗日志更新事件
        /// </summary>
        public event Action<BattleAction> OnActionLog;

        // ==================== 关卡难度配置类 ====================
        private class StageDifficulty
        {
            public int Level;
            public float EnemyHpMult;
            public float EnemyAtkMult;
            public int GoldReward;
            public int ExpReward;
        }

        private void Awake()
        {
            if (_instance != null && _instance != this)
            {
                Destroy(gameObject);
                return;
            }
            _instance = this;
            DontDestroyOnLoad(gameObject);
        }

        private void OnDestroy()
        {
            if (_instance == this)
            {
                _instance = null;
            }
        }

        // ==================== 公开方法 ====================

        /// <summary>
        /// 开始战斗 - 初始化战斗数据，生成敌方队伍，开始第一回合
        /// </summary>
        /// <param name="deckCards">玩家出战的卡牌列表</param>
        /// <param name="stageId">关卡ID</param>
        public void StartBattle(List<BattleCard> deckCards, int stageId)
        {
            if (CurrentState == BattleState.InProgress || CurrentState == BattleState.Animating)
            {
                Debug.LogWarning("[BattleManager] 战斗正在进行中，无法开始新战斗");
                return;
            }

            _currentStageId = stageId;
            CurrentRound = 0;
            ActionLog.Clear();
            _skipAnimation = false;

            // 初始化玩家卡牌
            for (int i = 0; i < 5; i++)
            {
                if (i < deckCards.Count)
                {
                    var card = deckCards[i];
                    card.SlotIndex = i;
                    card.IsPlayer = true;
                    card.CurrentHp = card.MaxHp;
                    card.IsAlive = true;
                    card.SkillCooldown = 0;
                    PlayerCards[i] = card;
                }
                else
                {
                    PlayerCards[i] = null;
                }
            }

            // 生成敌方队伍
            GenerateEnemyTeam(stageId);

            // 切换状态
            SetState(BattleState.Preparing);

            Debug.Log($"[BattleManager] 战斗开始 - 关卡: {stageId}, 玩家卡牌: {deckCards.Count}张");

            // 延迟一小段时间后开始战斗
            StartCoroutine(DelayedStartBattle(0.5f));
        }

        /// <summary>
        /// 处理一个回合 - 双方依次行动
        /// </summary>
        public void ProcessRound()
        {
            if (CurrentState != BattleState.InProgress)
            {
                return;
            }

            CurrentRound++;
            if (CurrentRound > MAX_ROUNDS)
            {
                // 超过最大回合数，判定失败
                EndBattle(false);
                return;
            }

            SetState(BattleState.Animating);
        }

        /// <summary>
        /// 计算伤害 - 完整伤害公式
        /// 基础伤害 = 基础攻击 * (1 + 技能倍率) * 随机系数(0.9~1.1) - 基础防御 * 0.5
        /// 暴击: 10%概率，1.5倍伤害
        /// 阵营克制: 20%额外伤害加成
        /// </summary>
        /// <param name="attacker">攻击者</param>
        /// <param name="defender">防御者</param>
        /// <param name="useSkill">是否使用技能</param>
        /// <returns>伤害信息元组：(伤害值, 是否暴击, 是否克制)</returns>
        public (int damage, bool isCritical, bool isCounter) CalculateDamage(BattleCard attacker, BattleCard defender, bool useSkill = false)
        {
            // 技能倍率
            float skillMult = useSkill ? attacker.SkillMultiplier : 1f;

            // 基础伤害计算
            float baseDamage = attacker.Attack * (1f + skillMult);

            // 随机浮动
            float randomFactor = Random.Range(RANDOM_MIN, RANDOM_MAX);
            baseDamage *= randomFactor;

            // 暴击判定
            bool isCritical = Random.value < CRITICAL_CHANCE;
            if (isCritical)
            {
                baseDamage *= CRITICAL_MULTIPLIER;
            }

            // 阵营克制判定
            bool isCounter = CheckFactionCounter(attacker.Faction, defender.Faction);
            if (isCounter)
            {
                baseDamage *= (1f + FACTION_BONUS);
            }

            // 减去防御
            float defenseReduction = defender.Defense * DEFENSE_FACTOR;
            baseDamage -= defenseReduction;

            // 最低伤害为1
            int finalDamage = Mathf.Max(1, Mathf.RoundToInt(baseDamage));

            return (finalDamage, isCritical, isCounter);
        }

        /// <summary>
        /// 检查战斗是否结束 - 任一方全部卡牌死亡则战斗结束
        /// </summary>
        /// <returns>战斗结果：null=未结束, true=玩家胜, false=玩家败</returns>
        public bool? CheckBattleEnd()
        {
            bool allPlayerDead = AreAllCardsDead(true);
            bool allEnemyDead = AreAllCardsDead(false);

            if (allEnemyDead)
            {
                return true; // 玩家胜利
            }
            if (allPlayerDead)
            {
                return false; // 玩家失败
            }
            return null; // 战斗继续
        }

        /// <summary>
        /// 使用技能 - 应用技能效果并设置冷却
        /// </summary>
        /// <param name="card">使用技能的卡牌</param>
        /// <param name="target">技能目标</param>
        public void UseSkill(BattleCard card, BattleCard target)
        {
            if (card == null || !card.IsAlive || card.SkillCooldown > 0)
            {
                return;
            }

            // 设置技能冷却
            card.SkillCooldown = card.MaxSkillCooldown;

            // 触发技能使用事件
            OnSkillUse?.Invoke(card, card.SkillName);

            // 技能造成伤害（使用技能倍率）
            var (damage, isCritical, isCounter) = CalculateDamage(card, target, useSkill: true);

            // 应用伤害
            ApplyDamage(target, damage);

            // 记录战斗日志
            var action = new BattleAction
            {
                Round = CurrentRound,
                AttackerName = card.CardName,
                DefenderName = target.CardName,
                Damage = damage,
                IsCritical = isCritical,
                IsSkill = true,
                SkillName = card.SkillName,
                FactionBonus = isCounter ? "克制" : "",
                IsPlayerAction = card.IsPlayer
            };
            ActionLog.Add(action);
            OnActionLog?.Invoke(action);

            // 触发攻击事件
            OnAttack?.Invoke(card, target, damage, isCritical, true, card.SkillName);
        }

        /// <summary>
        /// 普通攻击
        /// </summary>
        public void NormalAttack(BattleCard attacker, BattleCard target)
        {
            if (attacker == null || !attacker.IsAlive || target == null || !target.IsAlive)
            {
                return;
            }

            var (damage, isCritical, isCounter) = CalculateDamage(attacker, target, useSkill: false);

            // 应用伤害
            ApplyDamage(target, damage);

            // 减少技能冷却
            if (attacker.SkillCooldown > 0)
            {
                attacker.SkillCooldown--;
            }

            // 记录战斗日志
            var action = new BattleAction
            {
                Round = CurrentRound,
                AttackerName = attacker.CardName,
                DefenderName = target.CardName,
                Damage = damage,
                IsCritical = isCritical,
                IsSkill = false,
                SkillName = "",
                FactionBonus = isCounter ? "克制" : "",
                IsPlayerAction = attacker.IsPlayer
            };
            ActionLog.Add(action);
            OnActionLog?.Invoke(action);

            // 触发攻击事件
            OnAttack?.Invoke(attacker, target, damage, isCritical, false, "");
        }

        /// <summary>
        /// 结束战斗 - 计算奖励，触发事件
        /// </summary>
        /// <param name="isVictory">是否胜利</param>
        public void EndBattle(bool isVictory)
        {
            StopBattleCoroutine();
            SetState(isVictory ? BattleState.Victory : BattleState.Defeat);

            // 计算星级评价
            int aliveCount = CountAliveCards(true);
            int totalPlayerCards = CountPlayerCards();
            int stars = CalculateStars(aliveCount, totalPlayerCards, isVictory);

            // 获取关卡难度
            int stageLevel = Mathf.Clamp(_currentStageId, 1, 10);
            if (!StageDifficulties.TryGetValue(stageLevel, out var difficulty))
            {
                difficulty = StageDifficulties[1];
            }

            // 计算奖励
            int goldReward = isVictory ? difficulty.GoldReward : Mathf.RoundToInt(difficulty.GoldReward * 0.3f);
            int expReward = isVictory ? difficulty.ExpReward : Mathf.RoundToInt(difficulty.ExpReward * 0.2f);

            // 构建战斗结果
            var result = new BattleResult
            {
                IsVictory = isVictory,
                Stars = stars,
                GoldReward = goldReward,
                ExpReward = expReward,
                CardRewardIds = GenerateCardRewards(isVictory, stageLevel),
                TotalRounds = CurrentRound,
                AliveCardsCount = aliveCount,
                TotalCardsCount = totalPlayerCards,
                ActionLog = new List<BattleAction>(ActionLog)
            };

            Debug.Log($"[BattleManager] 战斗结束 - {(isVictory ? "胜利" : "失败")}, 星级: {stars}, " +
                      $"金币: {goldReward}, 经验: {expReward}, 回合: {CurrentRound}");

            // 触发战斗结束事件
            OnBattleEnd?.Invoke(result);
        }

        /// <summary>
        /// 暂停战斗
        /// </summary>
        public void PauseBattle()
        {
            if (CurrentState == BattleState.InProgress || CurrentState == BattleState.Animating)
            {
                SetState(BattleState.Paused);
                StopBattleCoroutine();
                Debug.Log("[BattleManager] 战斗已暂停");
            }
        }

        /// <summary>
        /// 恢复战斗
        /// </summary>
        public void ResumeBattle()
        {
            if (CurrentState == BattleState.Paused)
            {
                SetState(BattleState.InProgress);
                _battleCoroutine = StartCoroutine(BattleLoop());
                Debug.Log("[BattleManager] 战斗已恢复");
            }
        }

        /// <summary>
        /// 跳过动画 - 加速战斗
        /// </summary>
        public void SkipAnimation()
        {
            _skipAnimation = true;
            BattleSpeed = 3f;
        }

        /// <summary>
        /// 设置战斗速度
        /// </summary>
        /// <param name="speed">速度倍率 (1f=正常, 2f=两倍速)</param>
        public void SetBattleSpeed(float speed)
        {
            BattleSpeed = Mathf.Clamp(speed, 1f, 5f);
            _skipAnimation = BattleSpeed > 2f;
        }

        /// <summary>
        /// 强制结束当前战斗（清理用）
        /// </summary>
        public void ForceEndBattle()
        {
            StopBattleCoroutine();
            SetState(BattleState.Idle);
            ActionLog.Clear();
            Array.Clear(PlayerCards, 0, PlayerCards.Length);
            Array.Clear(EnemyCards, 0, EnemyCards.Length);
        }

        // ==================== 私有方法 ====================

        /// <summary>
        /// 延迟开始战斗
        /// </summary>
        private IEnumerator DelayedStartBattle(float delay)
        {
            yield return new WaitForSeconds(delay);
            SetState(BattleState.InProgress);
            _battleCoroutine = StartCoroutine(BattleLoop());
        }

        /// <summary>
        /// 战斗主循环 - 每回合执行
        /// </summary>
        private IEnumerator BattleLoop()
        {
            while (CurrentState == BattleState.InProgress)
            {
                ProcessRound();

                if (CurrentState != BattleState.Animating)
                {
                    break;
                }

                // 触发回合开始事件
                OnRoundStart?.Invoke(CurrentRound, null);

                // 计算出手顺序（速度排序）
                var allAliveCards = GetAllAliveCards();
                allAliveCards.Sort((a, b) => b.Speed.CompareTo(a.Speed));

                // 依次执行每个存活卡牌的行动
                foreach (var card in allAliveCards)
                {
                    if (CurrentState != BattleState.Animating && CurrentState != BattleState.InProgress)
                    {
                        break;
                    }

                    if (!card.IsAlive)
                    {
                        continue;
                    }

                    // 触发回合开始事件（当前行动卡牌）
                    OnRoundStart?.Invoke(CurrentRound, card);

                    // 选择目标
                    BattleCard target = SelectTarget(card);
                    if (target == null || !target.IsAlive)
                    {
                        continue;
                    }

                    // 判断是否使用技能（冷却完毕时有50%概率使用）
                    bool useSkill = card.SkillCooldown <= 0 && Random.value < 0.5f;

                    if (useSkill)
                    {
                        UseSkill(card, target);
                    }
                    else
                    {
                        NormalAttack(card, target);
                    }

                    // 等待动画
                    if (!_skipAnimation)
                    {
                        yield return new WaitForSeconds(0.5f / BattleSpeed);
                    }

                    // 检查战斗是否结束
                    var endResult = CheckBattleEnd();
                    if (endResult.HasValue)
                    {
                        EndBattle(endResult.Value);
                        yield break;
                    }

                    // 检查目标是否死亡
                    if (!target.IsAlive)
                    {
                        OnCardDeath?.Invoke(target, target.SlotIndex, target.IsPlayer);
                        if (!_skipAnimation)
                        {
                            yield return new WaitForSeconds(0.3f / BattleSpeed);
                        }

                        // 检查是否全灭
                        endResult = CheckBattleEnd();
                        if (endResult.HasValue)
                        {
                            EndBattle(endResult.Value);
                            yield break;
                        }
                    }
                }

                // 回合结束，减少所有存活卡牌的技能冷却
                ReduceCooldowns(PlayerCards);
                ReduceCooldowns(EnemyCards);

                if (!_skipAnimation)
                {
                    yield return new WaitForSeconds(ROUND_DELAY / BattleSpeed);
                }
                else
                {
                    yield return new WaitForSeconds(0.05f);
                }

                SetState(BattleState.InProgress);
            }
        }

        /// <summary>
        /// 选择攻击目标 - 优先攻击速度最高的敌方存活卡牌
        /// </summary>
        private BattleCard SelectTarget(BattleCard attacker)
        {
            BattleCard[] enemyTeam = attacker.IsPlayer ? EnemyCards : PlayerCards;
            BattleCard bestTarget = null;
            int highestSpeed = -1;

            foreach (var card in enemyTeam)
            {
                if (card != null && card.IsAlive && card.Speed > highestSpeed)
                {
                    highestSpeed = card.Speed;
                    bestTarget = card;
                }
            }

            // 如果没有高速目标，选第一个存活的
            if (bestTarget == null)
            {
                foreach (var card in enemyTeam)
                {
                    if (card != null && card.IsAlive)
                    {
                        bestTarget = card;
                        break;
                    }
                }
            }

            return bestTarget;
        }

        /// <summary>
        /// 应用伤害到目标卡牌
        /// </summary>
        private void ApplyDamage(BattleCard target, int damage)
        {
            if (target == null || !target.IsAlive) return;

            target.CurrentHp -= damage;
            if (target.CurrentHp <= 0)
            {
                target.CurrentHp = 0;
                target.IsAlive = false;
                Debug.Log($"[BattleManager] {target.CardName} 被击败! (HP: 0/{target.MaxHp})");
            }
            else
            {
                Debug.Log($"[BattleManager] {target.CardName} 受到 {damage} 伤害 (HP: {target.CurrentHp}/{target.MaxHp})");
            }
        }

        /// <summary>
        /// 检查阵营克制关系
        /// 魏 > 蜀 > 吴 > 群 > 魏
        /// </summary>
        private bool CheckFactionCounter(Faction attackerFaction, Faction defenderFaction)
        {
            return attackerFaction switch
            {
                Faction.Wei when defenderFaction == Faction.Shu => true,   // 魏 > 蜀
                Faction.Shu when defenderFaction == Faction.Wu => true,    // 蜀 > 吴
                Faction.Wu when defenderFaction == Faction.Qun => true,    // 吴 > 群
                Faction.Qun when defenderFaction == Faction.Wei => true,   // 群 > 魏
                _ => false
            };
        }

        /// <summary>
        /// 获取克制加成描述
        /// </summary>
        public static string GetFactionCounterText(Faction attackerFaction, Faction defenderFaction)
        {
            string attackerName = GetFactionName(attackerFaction);
            string defenderName = GetFactionName(defenderFaction);
            return CheckFactionCounterStatic(attackerFaction, defenderFaction)
                ? $"{attackerName}克制{defenderName}!"
                : "";
        }

        private static bool CheckFactionCounterStatic(Faction attacker, Faction defender)
        {
            return attacker switch
            {
                Faction.Wei when defender == Faction.Shu => true,
                Faction.Shu when defender == Faction.Wu => true,
                Faction.Wu when defender == Faction.Qun => true,
                Faction.Qun when defender == Faction.Wei => true,
                _ => false
            };
        }

        /// <summary>
        /// 获取阵营名称
        /// </summary>
        public static string GetFactionName(Faction faction)
        {
            return faction switch
            {
                Faction.Wei => "魏",
                Faction.Shu => "蜀",
                Faction.Wu => "吴",
                Faction.Qun => "群",
                _ => "未知"
            };
        }

        /// <summary>
        /// 生成敌方队伍 - 根据关卡ID生成对应难度的敌人
        /// </summary>
        private void GenerateEnemyTeam(int stageId)
        {
            int stageLevel = Mathf.Clamp(stageId, 1, 10);
            if (!StageDifficulties.TryGetValue(stageLevel, out var difficulty))
            {
                difficulty = StageDifficulties[1];
            }

            // 选择敌人名称组
            int nameGroupIndex = Mathf.Clamp(Mathf.FloorToInt((stageId - 1) / 2), 0, EnemyNames.Length - 1);
            string[] nameGroup = EnemyNames[nameGroupIndex];

            // 随机阵营
            Faction[] factions = (Faction[])Enum.GetValues(typeof(Faction));

            for (int i = 0; i < 5; i++)
            {
                int baseHp = 300 + stageLevel * 80 + Random.Range(-20, 20);
                int baseAtk = 40 + stageLevel * 12 + Random.Range(-5, 5);
                int baseDef = 20 + stageLevel * 8 + Random.Range(-3, 3);
                int baseSpd = 20 + Random.Range(0, 30);
                float skillMult = 0.3f + stageLevel * 0.05f;
                int cooldown = Mathf.Clamp(3 + Random.Range(0, 3), 2, 6);
                Faction faction = factions[Random.Range(0, factions.Length)];
                string skillName = GetRandomSkillName(faction);
                string name = nameGroup[i];

                EnemyCards[i] = BattleCard.CreateFromData(
                    cardId: 1000 + stageId * 100 + i,
                    cardName: name,
                    maxHp: Mathf.RoundToInt(baseHp * difficulty.EnemyHpMult),
                    attack: Mathf.RoundToInt(baseAtk * difficulty.EnemyAtkMult),
                    defense: baseDef,
                    speed: baseSpd,
                    faction: faction,
                    skillName: skillName,
                    skillMultiplier: skillMult,
                    maxCooldown: cooldown,
                    slotIndex: i,
                    isPlayer: false
                );
            }
        }

        /// <summary>
        /// 获取随机技能名称（根据阵营）
        /// </summary>
        private string GetRandomSkillName(Faction faction)
        {
            string[][] factionSkills = new string[][]
            {
                new string[] { "霸业征伐", "挟天子", "屯田令", "虎豹骑突袭" },  // 魏
                new string[] { "仁德广布", "火攻计", "连弩齐射", "八阵图" },    // 蜀
                new string[] { "水淹七军", "火船冲阵", "美人计", "江东虎臣" },  // 吴
                new string[] { "天下布武", "连环计", "离间计", "万箭齐发" }     // 群
            };

            int factionIndex = Mathf.Clamp((int)faction, 0, factionSkills.Length - 1);
            string[] skills = factionSkills[factionIndex];
            return skills[Random.Range(0, skills.Length)];
        }

        /// <summary>
        /// 计算星级评价
        /// </summary>
        private int CalculateStars(int aliveCount, int totalCards, bool isVictory)
        {
            if (!isVictory) return 0;

            float survivalRate = (float)aliveCount / Mathf.Max(1, totalCards);
            if (survivalRate >= 1.0f)
            {
                return 3; // 全员存活 - 三星
            }
            else if (survivalRate >= 0.6f)
            {
                return 2; // 60%以上存活 - 两星
            }
            else
            {
                return 1; // 有存活 - 一星
            }
        }

        /// <summary>
        /// 生成卡牌奖励
        /// </summary>
        private List<int> GenerateCardRewards(bool isVictory, int stageLevel)
        {
            var rewards = new List<int>();
            if (!isVictory) return rewards;

            // 胜利时一定概率获得卡牌
            float dropChance = 0.1f + stageLevel * 0.05f;
            if (Random.value < dropChance)
            {
                // 生成一张随机卡牌ID作为奖励
                int cardRewardId = 5000 + stageLevel * 10 + Random.Range(0, 10);
                rewards.Add(cardRewardId);
            }

            return rewards;
        }

        /// <summary>
        /// 获取所有存活的卡牌（用于排序出手顺序）
        /// </summary>
        private List<BattleCard> GetAllAliveCards()
        {
            var allCards = new List<BattleCard>();
            foreach (var card in PlayerCards)
            {
                if (card != null && card.IsAlive)
                {
                    allCards.Add(card);
                }
            }
            foreach (var card in EnemyCards)
            {
                if (card != null && card.IsAlive)
                {
                    allCards.Add(card);
                }
            }
            return allCards;
        }

        /// <summary>
        /// 检查某一方是否全部死亡
        /// </summary>
        private bool AreAllCardsDead(bool isPlayer)
        {
            BattleCard[] team = isPlayer ? PlayerCards : EnemyCards;
            foreach (var card in team)
            {
                if (card != null && card.IsAlive)
                {
                    return false;
                }
            }
            return true;
        }

        /// <summary>
        /// 统计玩家存活卡牌数
        /// </summary>
        private int CountAliveCards(bool isPlayer)
        {
            BattleCard[] team = isPlayer ? PlayerCards : EnemyCards;
            int count = 0;
            foreach (var card in team)
            {
                if (card != null && card.IsAlive) count++;
            }
            return count;
        }

        /// <summary>
        /// 统计玩家出战卡牌总数
        /// </summary>
        private int CountPlayerCards()
        {
            int count = 0;
            foreach (var card in PlayerCards)
            {
                if (card != null) count++;
            }
            return count;
        }

        /// <summary>
        /// 减少队伍中所有存活卡牌的技能冷却
        /// </summary>
        private void ReduceCooldowns(BattleCard[] team)
        {
            foreach (var card in team)
            {
                if (card != null && card.IsAlive && card.SkillCooldown > 0)
                {
                    card.SkillCooldown--;
                }
            }
        }

        /// <summary>
        /// 设置战斗状态
        /// </summary>
        private void SetState(BattleState newState)
        {
            if (CurrentState != newState)
            {
                var oldState = CurrentState;
                CurrentState = newState;
                Debug.Log($"[BattleManager] 状态变更: {oldState} -> {newState}");
                OnStateChanged?.Invoke(newState);
            }
        }

        /// <summary>
        /// 停止战斗协程
        /// </summary>
        private void StopBattleCoroutine()
        {
            if (_battleCoroutine != null)
            {
                StopCoroutine(_battleCoroutine);
                _battleCoroutine = null;
            }
        }
    }
}
