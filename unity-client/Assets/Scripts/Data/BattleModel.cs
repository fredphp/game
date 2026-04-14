using System;
using System.Collections.Generic;
using UnityEngine;

namespace Game.Data
{
    /// <summary>
    /// 战斗结果枚举
    /// </summary>
    public enum BattleResult
    {
        Win,    // 胜利
        Loss,   // 失败
        Draw    // 平局
    }

    /// <summary>
    /// 战斗记录（列表项） - 对应 battle-service 历史记录中的单条记录
    /// </summary>
    [Serializable]
    public class BattleRecord
    {
        [SerializeField] private string id;
        [SerializeField] private int userId;
        [SerializeField] private string stageId;
        [SerializeField] private string result;
        [SerializeField] private int roundsCount;
        [SerializeField] private List<RewardItem> rewards;
        [SerializeField] private string createdAt;

        public string Id { get => id; set => id = value; }
        public int UserId { get => userId; set => userId = value; }
        public string StageId { get => stageId; set => stageId = value; }
        public string Result { get => result; set => result = value; }
        public int RoundsCount { get => roundsCount; set => roundsCount = value; }
        public List<RewardItem> Rewards { get => rewards; set => rewards = value; }
        public string CreatedAt { get => createdAt; set => createdAt = value; }

        /// <summary>
        /// 获取战斗结果枚举
        /// </summary>
        public BattleResult GetResultEnum()
        {
            switch (result?.ToLower())
            {
                case "win": return BattleResult.Win;
                case "loss": return BattleResult.Loss;
                case "draw": return BattleResult.Draw;
                default: return BattleResult.Loss;
            }
        }
    }

    /// <summary>
    /// 战斗中的回合信息
    /// </summary>
    [Serializable]
    public class BattleRound
    {
        [SerializeField] private int roundNumber;
        [SerializeField] private BattleUnit attacker;
        [SerializeField] private BattleUnit defender;
        [SerializeField] private int damage;
        [SerializeField] private bool isCritical;

        public int RoundNumber { get => roundNumber; set => roundNumber = value; }
        public BattleUnit Attacker { get => attacker; set => attacker = value; }
        public BattleUnit Defender { get => defender; set => defender = value; }
        public int Damage { get => damage; set => damage = value; }
        public bool IsCritical { get => isCritical; set => isCritical = value; }
    }

    /// <summary>
    /// 战斗中的单位信息（攻击方/防守方）
    /// </summary>
    [Serializable]
    public class BattleUnit
    {
        [SerializeField] private string cardId;
        [SerializeField] private string name;
        [SerializeField] private int hp;
        [SerializeField] private string skillUsed;

        public string CardId { get => cardId; set => cardId = value; }
        public string Name { get => name; set => name = value; }
        public int Hp { get => hp; set => hp = value; }
        public string SkillUsed { get => skillUsed; set => skillUsed = value; }
    }

    /// <summary>
    /// 战斗详情（含回放数据） - 用于战斗回放功能
    /// </summary>
    [Serializable]
    public class BattleDetail
    {
        [SerializeField] private string id;
        [SerializeField] private string result;
        [SerializeField] private int totalRounds;
        [SerializeField] private List<BattleRound> rounds;
        [SerializeField] private List<RewardItem> rewards;
        [SerializeField] private string replayData;

        public string Id { get => id; set => id = value; }
        public string Result { get => result; set => result = value; }
        public int TotalRounds { get => totalRounds; set => totalRounds = value; }
        public List<BattleRound> Rounds { get => rounds; set => rounds = value; }
        public List<RewardItem> Rewards { get => rewards; set => rewards = value; }
        public string ReplayData { get => replayData; set => replayData = value; }

        /// <summary>
        /// 获取战斗结果枚举
        /// </summary>
        public BattleResult GetResultEnum()
        {
            switch (result?.ToLower())
            {
                case "win": return BattleResult.Win;
                case "loss": return BattleResult.Loss;
                case "draw": return BattleResult.Draw;
                default: return BattleResult.Loss;
            }
        }
    }

    /// <summary>
    /// PVE 战斗请求体
    /// </summary>
    [Serializable]
    public class PVERequest
    {
        [SerializeField] private List<string> deckCards;
        [SerializeField] private string stageId;

        public PVERequest(List<string> deckCards, string stageId)
        {
            this.deckCards = deckCards;
            this.stageId = stageId;
        }

        public List<string> DeckCards { get => deckCards; set => deckCards = value; }
        public string StageId { get => stageId; set => stageId = value; }
    }

    /// <summary>
    /// 战斗发起响应
    /// </summary>
    [Serializable]
    public class BattleStartResponse
    {
        [SerializeField] private Battle battle;

        public Battle Battle { get => battle; set => battle = value; }
    }

    /// <summary>
    /// 战斗简要信息（发起战斗后返回的结构）
    /// </summary>
    [Serializable]
    public class Battle
    {
        [SerializeField] private string id;
        [SerializeField] private string result;
        [SerializeField] private int rounds;
        [SerializeField] private List<RewardItem> rewards;

        public string Id { get => id; set => id = value; }
        public string Result { get => result; set => result = value; }
        public int Rounds { get => rounds; set => rounds = value; }
        public List<RewardItem> Rewards { get => rewards; set => rewards = value; }
    }

    /// <summary>
    /// 战斗回放响应
    /// </summary>
    [Serializable]
    public class BattleReplayResponse
    {
        [SerializeField] private BattleDetail battle;

        public BattleDetail Battle { get => battle; set => battle = value; }
    }

    /// <summary>
    /// 战斗历史分页响应
    /// </summary>
    [Serializable]
    public class BattleHistoryResponse
    {
        [SerializeField] private List<BattleRecord> battles;
        [SerializeField] private int total;

        public List<BattleRecord> Battles { get => battles; set => battles = value; }
        public int Total { get => total; set => total = value; }
    }

    /// <summary>
    /// 奖励物品
    /// </summary>
    [Serializable]
    public class RewardItem
    {
        [SerializeField] private string type;
        [SerializeField] private int amount;
        [SerializeField] private string itemId;
        [SerializeField] private string itemName;

        public string Type { get => type; set => type = value; }
        public int Amount { get => amount; set => amount = value; }
        public string ItemId { get => itemId; set => itemId = value; }
        public string ItemName { get => itemName; set => itemName = value; }
    }
}
