using System;
using System.Collections.Generic;
using UnityEngine;

namespace Game.Data
{
    // ============================================================
    // 卡牌定义 - 对应 card-service 中 card_definitions 表
    // ============================================================

    /// <summary>
    /// 卡牌定义（配置表）
    /// 对应 Go 后端 model.Card 结构体
    /// </summary>
    [Serializable]
    public class CardDefinition
    {
        [SerializeField] private int id;
        [SerializeField] private string name;
        [SerializeField] private string title;
        [SerializeField] private int rarity;       // 稀有度: 3=R, 4=SR, 5=SSR
        [SerializeField] private string element;    // 元素: fire/ice/wind/thunder/light/dark
        [SerializeField] private string faction;    // 阵营: wei/shu/wu/qun
        [SerializeField] private string role;       // 定位: tank/warrior/mage/assassin/support
        [SerializeField] private int baseHp;
        [SerializeField] private int baseAtk;
        [SerializeField] private int baseDef;
        [SerializeField] private int skillId;
        [SerializeField] private int leadSkillId;
        [SerializeField] private string description;
        [SerializeField] private string obtainFrom;
        [SerializeField] private bool isLimited;

        public int Id { get => id; set => id = value; }
        public string Name { get => name; set => name = value; }
        public string Title { get => title; set => title = value; }
        public int Rarity { get => rarity; set => rarity = value; }
        public string Element { get => element; set => element = value; }
        public string Faction { get => faction; set => faction = value; }
        public string Role { get => role; set => role = value; }
        public int BaseHp { get => baseHp; set => baseHp = value; }
        public int BaseAtk { get => baseAtk; set => baseAtk = value; }
        public int BaseDef { get => baseDef; set => baseDef = value; }
        public int SkillId { get => skillId; set => skillId = value; }
        public int LeadSkillId { get => leadSkillId; set => leadSkillId = value; }
        public string Description { get => description; set => description = value; }
        public string ObtainFrom { get => obtainFrom; set => obtainFrom = value; }
        public bool IsLimited { get => isLimited; set => isLimited = value; }

        /// <summary>
        /// 计算卡牌战力（基于属性综合计算）
        /// </summary>
        public int CalculatePower()
        {
            float rarityMultiplier = 1f + (rarity - 3) * 0.5f;
            return Mathf.RoundToInt((baseHp * 0.5f + baseAtk * 2f + baseDef * 1.5f) * rarityMultiplier);
        }

        /// <summary>
        /// 获取稀有度显示名称
        /// </summary>
        public string GetRarityName()
        {
            switch (rarity)
            {
                case 3: return "R";
                case 4: return "SR";
                case 5: return "SSR";
                default: return "N";
            }
        }

        /// <summary>
        /// 获取阵营中文名称
        /// </summary>
        public string GetFactionName()
        {
            switch (faction)
            {
                case "wei": return "魏";
                case "shu": return "蜀";
                case "wu": return "吴";
                case "qun": return "群";
                default: return "未知";
            }
        }

        /// <summary>
        /// 获取元素中文名称
        /// </summary>
        public string GetElementName()
        {
            switch (element)
            {
                case "fire": return "火";
                case "ice": return "冰";
                case "wind": return "风";
                case "thunder": return "雷";
                case "light": return "光";
                case "dark": return "暗";
                default: return "无";
            }
        }

        /// <summary>
        /// 获取定位中文名称
        /// </summary>
        public string GetRoleName()
        {
            switch (role)
            {
                case "tank": return "坦克";
                case "warrior": return "战士";
                case "mage": return "法师";
                case "assassin": return "刺客";
                case "support": return "辅助";
                default: return "未知";
            }
        }
    }

    // ============================================================
    // 玩家持有卡牌
    // ============================================================

    /// <summary>
    /// 玩家持有卡牌实例
    /// 对应 Go 后端 model.UserCard 结构体
    /// </summary>
    [Serializable]
    public class UserCard
    {
        [SerializeField] private int id;            // 用户卡牌实例ID
        [SerializeField] private int userId;
        [SerializeField] private int cardId;        // 卡牌定义ID
        [SerializeField] private int star;          // 星级: 1~6
        [SerializeField] private int level;         // 等级: 1~100
        [SerializeField] private int exp;
        [SerializeField] private bool isLocked;
        [SerializeField] private string obtainTime;
        [SerializeField] private string obtainFrom;

        // 附加卡牌定义信息（由前端关联查询填充）
        [SerializeField] private CardDefinition cardDef;

        public int Id { get => id; set => id = value; }
        public int UserId { get => userId; set => userId = value; }
        public int CardId { get => cardId; set => cardId = value; }
        public int Star { get => star; set => star = value; }
        public int Level { get => level; set => level = value; }
        public int Exp { get => exp; set => exp = value; }
        public bool IsLocked { get => isLocked; set => isLocked = value; }
        public string ObtainTime { get => obtainTime; set => obtainTime = value; }
        public string ObtainFrom { get => obtainFrom; set => obtainFrom = value; }
        public CardDefinition CardDef { get => cardDef; set => cardDef = value; }

        /// <summary>
        /// 获取显示名称（优先使用卡牌定义名）
        /// </summary>
        public string DisplayName => cardDef != null ? cardDef.Name : $"卡牌#{cardId}";

        /// <summary>
        /// 获取显示稀有度
        /// </summary>
        public int DisplayRarity => cardDef != null ? cardDef.Rarity : 3;

        /// <summary>
        /// 获取显示阵营
        /// </summary>
        public string DisplayFaction => cardDef != null ? cardDef.Faction : "";

        /// <summary>
        /// 计算实例战力（含等级加成）
        /// </summary>
        public int CalculatePower()
        {
            if (cardDef == null) return 0;
            float levelMultiplier = 1f + (level - 1) * 0.02f;
            float starMultiplier = 1f + (star - 1) * 0.15f;
            return Mathf.RoundToInt(cardDef.CalculatePower() * levelMultiplier * starMultiplier);
        }
    }

    // ============================================================
    // 卡池配置
    // ============================================================

    /// <summary>
    /// 卡池配置
    /// 对应 Go 后端 model.CardPool 结构体
    /// </summary>
    [Serializable]
    public class CardPool
    {
        [SerializeField] private int id;
        [SerializeField] private string name;
        [SerializeField] private string displayName;
        [SerializeField] private string type;        // normal/limited/rateup
        [SerializeField] private string startTime;
        [SerializeField] private string endTime;
        [SerializeField] private int status;         // 1=开放 0=关闭
        [SerializeField] private string config;       // JSON配置

        public int Id { get => id; set => id = value; }
        public string Name { get => name; set => name = value; }
        public string DisplayName { get => displayName; set => displayName = value; }
        public string Type { get => type; set => type = value; }
        public string StartTime { get => startTime; set => startTime = value; }
        public string EndTime { get => endTime; set => endTime = value; }
        public int Status { get => status; set => status = value; }
        public string Config { get => config; set => config = value; }

        /// <summary>
        /// 卡池是否当前开放
        /// </summary>
        public bool IsOpen => status == 1;

        /// <summary>
        /// 获取卡池类型中文名称
        /// </summary>
        public string GetTypeName()
        {
            switch (type)
            {
                case "normal": return "常驻";
                case "limited": return "限定";
                case "rateup": return "UP";
                default: return "普通";
            }
        }
    }

    // ============================================================
    // 抽卡相关模型
    // ============================================================

    /// <summary>
    /// 抽卡请求
    /// 对应 Go 后端 model.GachaRequest 结构体
    /// </summary>
    [Serializable]
    public class GachaRequest
    {
        [SerializeField] private int poolId;
        [SerializeField] private int count;

        public GachaRequest(int poolId, int count)
        {
            this.poolId = poolId;
            this.count = count;
        }

        public int PoolId { get => poolId; set => poolId = value; }
        public int Count { get => count; set => count = value; }
    }

    /// <summary>
    /// 抽卡响应
    /// 对应 Go 后端 model.GachaResponse 结构体
    /// </summary>
    [Serializable]
    public class GachaResponse
    {
        [SerializeField] private int pullIndex;
        [SerializeField] private List<GachaCardResult> cards;
        [SerializeField] private int newCards;
        [SerializeField] private int ssrCount;
        [SerializeField] private int srCount;
        [SerializeField] private int rCount;
        [SerializeField] private int ssrPityLeft;
        [SerializeField] private int srPityLeft;

        public int PullIndex { get => pullIndex; set => pullIndex = value; }
        public List<GachaCardResult> Cards { get => cards; set => cards = value; }
        public int NewCards { get => newCards; set => newCards = value; }
        public int SsrCount { get => ssrCount; set => ssrCount = value; }
        public int SrCount { get => srCount; set => srCount = value; }
        public int RCount { get => rCount; set => rCount = value; }
        public int SsrPityLeft { get => ssrPityLeft; set => ssrPityLeft = value; }
        public int SrPityLeft { get => srPityLeft; set => srPityLeft = value; }
    }

    /// <summary>
    /// 单张抽卡结果
    /// 对应 Go 后端 model.GachaCard 结构体
    /// </summary>
    [Serializable]
    public class GachaCardResult
    {
        [SerializeField] private int cardId;
        [SerializeField] private string name;
        [SerializeField] private int rarity;
        [SerializeField] private bool isNew;
        [SerializeField] private bool isPity;
        [SerializeField] private bool isUp;
        [SerializeField] private int userCardId;

        public int CardId { get => cardId; set => cardId = value; }
        public string Name { get => name; set => name = value; }
        public int Rarity { get => rarity; set => rarity = value; }
        public bool IsNew { get => isNew; set => isNew = value; }
        public bool IsPity { get => isPity; set => isPity = value; }
        public bool IsUp { get => isUp; set => isUp = value; }
        public int UserCardId { get => userCardId; set => userCardId = value; }

        /// <summary>
        /// 获取稀有度中文名称
        /// </summary>
        public string GetRarityName()
        {
            switch (rarity)
            {
                case 3: return "R";
                case 4: return "SR";
                case 5: return "SSR";
                default: return "N";
            }
        }
    }

    // ============================================================
    // 保底统计
    // ============================================================

    /// <summary>
    /// 玩家抽卡统计信息
    /// 对应 Go 后端 model.UserGachaInfo 结构体
    /// </summary>
    [Serializable]
    public class UserGachaInfo
    {
        [SerializeField] private int userId;
        [SerializeField] private int poolId;
        [SerializeField] private int totalPulls;
        [SerializeField] private int ssrPityCounter;
        [SerializeField] private int srPityCounter;

        public int UserId { get => userId; set => userId = value; }
        public int PoolId { get => poolId; set => poolId = value; }
        public int TotalPulls { get => totalPulls; set => totalPulls = value; }
        public int SsrPityCounter { get => ssrPityCounter; set => ssrPityCounter = value; }
        public int SrPityCounter { get => srPityCounter; set => srPityCounter = value; }
    }

    // ============================================================
    // 卡牌列表分页响应
    // ============================================================

    /// <summary>
    /// 分页数据包装
    /// 对应 Go 后端 pkgresponse.PageData 结构体
    /// </summary>
    [Serializable]
    public class PageData<T>
    {
        [SerializeField] private int total;
        [SerializeField] private int page;
        [SerializeField] private int size;
        [SerializeField] private List<T> list;

        public int Total { get => total; set => total = value; }
        public int Page { get => page; set => page = value; }
        public int Size { get => size; set => size = value; }
        public List<T> List { get => list; set => list = value; }

        /// <summary>
        /// 总页数
        /// </summary>
        public int TotalPages => size > 0 ? Mathf.CeilToInt((float)total / size) : 1;

        /// <summary>
        /// 是否有下一页
        /// </summary>
        public bool HasNext => page < TotalPages;

        /// <summary>
        /// 是否有上一页
        /// </summary>
        public bool HasPrev => page > 1;
    }

    // ============================================================
    // 卡组/编队相关模型
    // ============================================================

    /// <summary>
    /// 编队/卡组数据
    /// 用于卡组编辑面板
    /// </summary>
    [Serializable]
    public class DeckData
    {
        [SerializeField] private int id;
        [SerializeField] private string name;
        [SerializeField] private List<int> cardIds;  // 卡牌实例ID列表，最多5张
        [SerializeField] private int totalPower;

        public int Id { get => id; set => id = value; }
        public string Name { get => name; set => name = value; }
        public List<int> CardIds { get => cardIds; set => cardIds = value; }
        public int TotalPower { get => totalPower; set => totalPower = value; }
    }

    /// <summary>
    /// 编队槽位数据
    /// 用于编队面板的槽位显示
    /// </summary>
    [Serializable]
    public class DeckSlotData
    {
        [SerializeField] private int index;          // 槽位索引 0~4
        [SerializeField] private bool isEmpty;       // 是否为空
        [SerializeField] private UserCard card;      // 槽位中的卡牌（空槽时为null）

        public int Index { get => index; set => index = value; }
        public bool IsEmpty { get => isEmpty; set => isEmpty = value; }
        public UserCard Card { get => card; set => card = value; }

        /// <summary>
        /// 创建空槽位
        /// </summary>
        public static DeckSlotData Empty(int index)
        {
            return new DeckSlotData { index = index, isEmpty = true, card = null };
        }

        /// <summary>
        /// 创建有卡槽位
        /// </summary>
        public static DeckSlotData Filled(int index, UserCard card)
        {
            return new DeckSlotData { index = index, isEmpty = false, card = card };
        }
    }

    // ============================================================
    // 卡牌稀有度枚举
    // ============================================================

    /// <summary>
    /// 卡牌稀有度枚举
    /// </summary>
    public enum CardRarity
    {
        N = 1,
        R = 3,
        SR = 4,
        SSR = 5
    }

    /// <summary>
    /// 卡牌阵营枚举
    /// </summary>
    public enum CardFaction
    {
        Wei = 0,    // 魏
        Shu = 1,    // 蜀
        Wu = 2,     // 吴
        Qun = 3     // 群
    }

    /// <summary>
    /// 卡牌排序类型枚举
    /// </summary>
    public enum CardSortType
    {
        Power,      // 按战力排序
        Level,      // 按等级排序
        Rarity,     // 按稀有度排序
        Name,       // 按名称排序
        ObtainTime  // 按获取时间排序
    }

    // ============================================================
    // API响应基础包装
    // ============================================================

    /// <summary>
    /// API响应包装
    /// 对应 Go 后端 pkgresponse.Response 结构体
    /// </summary>
    [Serializable]
    public class ApiResponse<T>
    {
        [SerializeField] private int code;
        [SerializeField] private string message;
        [SerializeField] private T data;

        public int Code { get => code; set => code = value; }
        public string Message { get => message; set => message = value; }
        public T Data { get => data; set => data = value; }

        /// <summary>
        /// 请求是否成功
        /// </summary>
        public bool IsSuccess => code == 0;
    }

    // ============================================================
    // 建筑相关数据模型
    // ============================================================

    /// <summary>
    /// 玩家建筑数据
    /// 用于主城建筑系统
    /// </summary>
    [Serializable]
    public class PlayerBuilding
    {
        [SerializeField] private string buildingType;
        [SerializeField] private int level;
        [SerializeField] private int maxLevel;
        [SerializeField] private long lastUpgradeTime;

        public string BuildingType { get => buildingType; set => buildingType = value; }
        public int Level { get => level; set => level = value; }
        public int MaxLevel { get => maxLevel; set => maxLevel = value; }
        public long LastUpgradeTime { get => lastUpgradeTime; set => lastUpgradeTime = value; }
    }

    /// <summary>
    /// 玩家公会信息
    /// </summary>
    [Serializable]
    public class PlayerGuildInfo
    {
        [SerializeField] private int guildId;
        [SerializeField] private string guildName;
        [SerializeField] private string guildBadge;
        [SerializeField] private string memberRole;

        public int GuildId { get => guildId; set => guildId = value; }
        public string GuildName { get => guildName; set => guildName = value; }
        public string GuildBadge { get => guildBadge; set => guildBadge = value; }
        public string MemberRole { get => memberRole; set => memberRole = value; }

        /// <summary>
        /// 是否已加入公会
        /// </summary>
        public bool HasGuild => guildId > 0;
    }
}
