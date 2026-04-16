using System;
using System.Collections.Generic;
using UnityEngine;

namespace Game.Data
{
    // ============================================================
    // 技能定义 - 对应 skill-service 中 skill_definitions 表
    // ============================================================

    /// <summary>
    /// 技能定义（配置表）
    /// 对应 Go 后端 model.SkillDefinition 结构体
    /// </summary>
    [Serializable]
    public class SkillDefinition
    {
        [SerializeField] private int id;
        [SerializeField] private string name;
        [SerializeField] private string type;           // 技能类型: active/passive
        [SerializeField] private string targetType;      // 目标类型: enemy/self/ally/all
        [SerializeField] private string damageType;      // 伤害类型: physical/magical/true
        [SerializeField] private float damageRatio;      // 伤害倍率
        [SerializeField] private int baseDamage;         // 基础伤害
        [SerializeField] private int cd;                 // 冷却回合数
        [SerializeField] private string special;         // 特殊效果标签
        [SerializeField] private float healRatio;        // 治疗倍率
        [SerializeField] private int rarity;             // 稀有度: 3=R, 4=SR, 5=SSR
        [SerializeField] private string category;        // 分类: Attack/Defense/Support/Control/Utility
        [SerializeField] private string icon;            // 图标资源路径
        [SerializeField] private string description;     // 技能描述
        [SerializeField] private bool isObtainable;      // 是否可通过抽卡获得
        [SerializeField] private int maxLevel;           // 最大等级
        [SerializeField] private string levelConfig;     // 等级配置（JSON）

        public int Id { get => id; set => id = value; }
        public string Name { get => name; set => name = value; }
        public string Type { get => type; set => type = value; }
        public string TargetType { get => targetType; set => targetType = value; }
        public string DamageType { get => damageType; set => damageType = value; }
        public float DamageRatio { get => damageRatio; set => damageRatio = value; }
        public int BaseDamage { get => baseDamage; set => baseDamage = value; }
        public int Cd { get => cd; set => cd = value; }
        public string Special { get => special; set => special = value; }
        public float HealRatio { get => healRatio; set => healRatio = value; }
        public int Rarity { get => rarity; set => rarity = value; }
        public string Category { get => category; set => category = value; }
        public string Icon { get => icon; set => icon = value; }
        public string Description { get => description; set => description = value; }
        public bool IsObtainable { get => isObtainable; set => isObtainable = value; }
        public int MaxLevel { get => maxLevel; set => maxLevel = value; }
        public string LevelConfig { get => levelConfig; set => levelConfig = value; }

        /// <summary>
        /// 是否为主动技能
        /// </summary>
        public bool IsActive => type == "active";

        /// <summary>
        /// 是否为被动技能
        /// </summary>
        public bool IsPassive => type == "passive";

        /// <summary>
        /// 是否为治疗型技能
        /// </summary>
        public bool IsHealSkill => healRatio > 0f;

        /// <summary>
        /// 是否为伤害型技能
        /// </summary>
        public bool IsDamageSkill => damageRatio > 0f || baseDamage > 0;

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
        /// 获取技能类型中文名称
        /// </summary>
        public string GetTypeName()
        {
            switch (type)
            {
                case "active": return "主动";
                case "passive": return "被动";
                default: return "未知";
            }
        }

        /// <summary>
        /// 获取目标类型中文名称
        /// </summary>
        public string GetTargetTypeName()
        {
            switch (targetType)
            {
                case "enemy": return "敌方";
                case "self": return "自身";
                case "ally": return "友方";
                case "all": return "全体";
                default: return "未知";
            }
        }

        /// <summary>
        /// 获取伤害类型中文名称
        /// </summary>
        public string GetDamageTypeName()
        {
            switch (damageType)
            {
                case "physical": return "物理";
                case "magical": return "魔法";
                case "true": return "真实";
                default: return "无";
            }
        }

        /// <summary>
        /// 获取分类中文名称
        /// </summary>
        public string GetCategoryName()
        {
            switch (category)
            {
                case "Attack": return "攻击";
                case "Defense": return "防御";
                case "Support": return "辅助";
                case "Control": return "控制";
                case "Utility": return "实用";
                default: return "其他";
            }
        }
    }

    // ============================================================
    // 玩家持有技能
    // ============================================================

    /// <summary>
    /// 玩家持有的技能实例
    /// 对应 Go 后端 model.UserSkill 结构体
    /// </summary>
    [Serializable]
    public class UserSkill
    {
        [SerializeField] private int id;            // 用户技能实例ID
        [SerializeField] private int userId;
        [SerializeField] private int skillId;       // 技能定义ID
        [SerializeField] private int level;         // 技能等级: 1~maxLevel
        [SerializeField] private int count;         // 持有数量（碎片叠加）
        [SerializeField] private bool isLocked;     // 是否锁定（防分解）
        [SerializeField] private bool isEquipped;   // 是否已装备到英雄
        [SerializeField] private string obtainTime; // 获取时间
        [SerializeField] private string obtainFrom; // 获取来源

        // 附加技能定义信息（由前端关联查询填充）
        [SerializeField] private SkillDefinition skillDef;

        public int Id { get => id; set => id = value; }
        public int UserId { get => userId; set => userId = value; }
        public int SkillId { get => skillId; set => skillId = value; }
        public int Level { get => level; set => level = value; }
        public int Count { get => count; set => count = value; }
        public bool IsLocked { get => isLocked; set => isLocked = value; }
        public bool IsEquipped { get => isEquipped; set => isEquipped = value; }
        public string ObtainTime { get => obtainTime; set => obtainTime = value; }
        public string ObtainFrom { get => obtainFrom; set => obtainFrom = value; }
        public SkillDefinition SkillDef { get => skillDef; set => skillDef = value; }

        /// <summary>
        /// 获取显示名称（优先使用技能定义名）
        /// </summary>
        public string DisplayName => skillDef != null ? skillDef.Name : $"技能#{skillId}";

        /// <summary>
        /// 获取显示稀有度
        /// </summary>
        public int DisplayRarity => skillDef != null ? skillDef.Rarity : 3;

        /// <summary>
        /// 获取显示分类
        /// </summary>
        public string DisplayCategory => skillDef != null ? skillDef.Category : "";

        /// <summary>
        /// 是否已达满级
        /// </summary>
        public bool IsMaxLevel => skillDef != null && level >= skillDef.MaxLevel;

        /// <summary>
        /// 获取描述文本（优先使用技能定义描述）
        /// </summary>
        public string DisplayDescription => skillDef != null ? skillDef.Description : "";
    }

    // ============================================================
    // 英雄技能装备
    // ============================================================

    /// <summary>
    /// 英雄装备的技能（技能装备关系）
    /// 对应 Go 后端 model.HeroSkillEquipment 结构体
    /// </summary>
    [Serializable]
    public class HeroSkillEquipment
    {
        [SerializeField] private int id;            // 装备记录ID
        [SerializeField] private int userId;
        [SerializeField] private int userCardId;    // 英雄卡牌实例ID
        [SerializeField] private int userSkillId;   // 技能实例ID
        [SerializeField] private int slot;          // 装备槽位: 0=技能1, 1=技能2, 2=技能3
        [SerializeField] private string equipTime;  // 装备时间

        // 附加信息（由前端关联查询填充）
        [SerializeField] private UserSkill userSkill;
        [SerializeField] private UserCard userCard;

        public int Id { get => id; set => id = value; }
        public int UserId { get => userId; set => userId = value; }
        public int UserCardId { get => userCardId; set => userCardId = value; }
        public int UserSkillId { get => userSkillId; set => userSkillId = value; }
        public int Slot { get => slot; set => slot = value; }
        public string EquipTime { get => equipTime; set => equipTime = value; }
        public UserSkill UserSkill { get => userSkill; set => userSkill = value; }
        public UserCard UserCard { get => userCard; set => userCard = value; }

        /// <summary>
        /// 获取槽位中文名称
        /// </summary>
        public string GetSlotName()
        {
            switch (slot)
            {
                case 0: return "技能1";
                case 1: return "技能2";
                case 2: return "技能3";
                default: return $"技能{slot + 1}";
            }
        }

        /// <summary>
        /// 获取技能显示名称
        /// </summary>
        public string SkillDisplayName => userSkill != null ? userSkill.DisplayName : $"技能#{userSkillId}";
    }

    // ============================================================
    // 技能抽卡相关模型
    // ============================================================

    /// <summary>
    /// 技能抽卡单抽结果
    /// 对应 Go 后端 model.SkillGachaResult 结构体
    /// </summary>
    [Serializable]
    public class SkillGachaResult
    {
        [SerializeField] private int skillId;
        [SerializeField] private string name;
        [SerializeField] private int rarity;
        [SerializeField] private string category;
        [SerializeField] private bool isNew;         // 是否为新获得
        [SerializeField] private bool isPity;        // 是否为保底
        [SerializeField] private bool isUp;          // 是否为UP限定
        [SerializeField] private int userSkillId;    // 用户技能实例ID

        public int SkillId { get => skillId; set => skillId = value; }
        public string Name { get => name; set => name = value; }
        public int Rarity { get => rarity; set => rarity = value; }
        public string Category { get => category; set => category = value; }
        public bool IsNew { get => isNew; set => isNew = value; }
        public bool IsPity { get => isPity; set => isPity = value; }
        public bool IsUp { get => isUp; set => isUp = value; }
        public int UserSkillId { get => userSkillId; set => userSkillId = value; }

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
        /// 获取分类中文名称
        /// </summary>
        public string GetCategoryName()
        {
            switch (category)
            {
                case "Attack": return "攻击";
                case "Defense": return "防御";
                case "Support": return "辅助";
                case "Control": return "控制";
                case "Utility": return "实用";
                default: return "其他";
            }
        }
    }

    /// <summary>
    /// 技能抽卡批量响应
    /// 对应 Go 后端 model.SkillGachaResponse 结构体
    /// </summary>
    [Serializable]
    public class SkillGachaResponse
    {
        [SerializeField] private int pullIndex;                     // 本次抽卡序号
        [SerializeField] private List<SkillGachaResult> skills;     // 抽到的技能列表
        [SerializeField] private int newSkills;                     // 新获得技能数量
        [SerializeField] private int ssrCount;                      // 本次SSR数量
        [SerializeField] private int srCount;                       // 本次SR数量
        [SerializeField] private int rCount;                        // 本次R数量
        [SerializeField] private int ssrPityLeft;                   // SSR保底剩余抽数
        [SerializeField] private int srPityLeft;                    // SR保底剩余抽数

        public int PullIndex { get => pullIndex; set => pullIndex = value; }
        public List<SkillGachaResult> Skills { get => skills; set => skills = value; }
        public int NewSkills { get => newSkills; set => newSkills = value; }
        public int SsrCount { get => ssrCount; set => ssrCount = value; }
        public int SrCount { get => srCount; set => srCount = value; }
        public int RCount { get => rCount; set => rCount = value; }
        public int SsrPityLeft { get => ssrPityLeft; set => ssrPityLeft = value; }
        public int SrPityLeft { get => srPityLeft; set => srPityLeft = value; }

        /// <summary>
        /// 本次抽卡总数量
        /// </summary>
        public int TotalCount => skills != null ? skills.Count : 0;
    }

    // ============================================================
    // 技能分解/升级响应
    // ============================================================

    /// <summary>
    /// 技能分解响应
    /// 对应 Go 后端 model.SkillDecomposeResponse 结构体
    /// </summary>
    [Serializable]
    public class SkillDecomposeResponse
    {
        [SerializeField] private string skillName;      // 技能名称
        [SerializeField] private int rarity;            // 技能稀有度
        [SerializeField] private int level;             // 技能等级
        [SerializeField] private string rewardType;     // 奖励类型: fragment/coin/gem
        [SerializeField] private int rewardAmount;      // 奖励数量
        [SerializeField] private int remainCount;       // 剩余持有数量

        public string SkillName { get => skillName; set => skillName = value; }
        public int Rarity { get => rarity; set => rarity = value; }
        public int Level { get => level; set => level = value; }
        public string RewardType { get => rewardType; set => rewardType = value; }
        public int RewardAmount { get => rewardAmount; set => rewardAmount = value; }
        public int RemainCount { get => remainCount; set => remainCount = value; }

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
        /// 获取奖励类型中文名称
        /// </summary>
        public string GetRewardTypeName()
        {
            switch (rewardType)
            {
                case "fragment": return "碎片";
                case "coin": return "金币";
                case "gem": return "宝石";
                default: return rewardType;
            }
        }
    }

    /// <summary>
    /// 技能升级响应
    /// 对应 Go 后端 model.SkillUpgradeResponse 结构体
    /// </summary>
    [Serializable]
    public class SkillUpgradeResponse
    {
        [SerializeField] private string skillName;      // 技能名称
        [SerializeField] private int rarity;            // 技能稀有度
        [SerializeField] private int beforeLevel;       // 升级前等级
        [SerializeField] private int afterLevel;        // 升级后等级
        [SerializeField] private int costFragments;     // 消耗碎片数
        [SerializeField] private float newDamageRatio;  // 新伤害倍率
        [SerializeField] private int newBaseDamage;     // 新基础伤害

        public string SkillName { get => skillName; set => skillName = value; }
        public int Rarity { get => rarity; set => rarity = value; }
        public int BeforeLevel { get => beforeLevel; set => beforeLevel = value; }
        public int AfterLevel { get => afterLevel; set => afterLevel = value; }
        public int CostFragments { get => costFragments; set => costFragments = value; }
        public float NewDamageRatio { get => newDamageRatio; set => newDamageRatio = value; }
        public int NewBaseDamage { get => newBaseDamage; set => newBaseDamage = value; }

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
        /// 伤害倍率提升量
        /// </summary>
        public float DamageRatioGain => newDamageRatio;  // 前端可用于对比展示
    }

    // ============================================================
    // 技能装备请求
    // ============================================================

    /// <summary>
    /// 装备技能请求
    /// 对应 Go 后端 model.EquipSkillRequest 结构体
    /// </summary>
    [Serializable]
    public class EquipSkillRequest
    {
        [SerializeField] private int userCardId;    // 英雄卡牌实例ID
        [SerializeField] private int userSkillId;   // 技能实例ID
        [SerializeField] private int slot;          // 装备槽位: 0/1/2

        public EquipSkillRequest(int userCardId, int userSkillId, int slot)
        {
            this.userCardId = userCardId;
            this.userSkillId = userSkillId;
            this.slot = slot;
        }

        public int UserCardId { get => userCardId; set => userCardId = value; }
        public int UserSkillId { get => userSkillId; set => userSkillId = value; }
        public int Slot { get => slot; set => slot = value; }
    }

    // ============================================================
    // 技能池配置
    // ============================================================

    /// <summary>
    /// 技能卡池配置
    /// 对应 Go 后端 model.SkillPool 结构体
    /// </summary>
    [Serializable]
    public class SkillPool
    {
        [SerializeField] private int id;
        [SerializeField] private string name;
        [SerializeField] private string displayName;
        [SerializeField] private string type;        // normal/limited/rateup
        [SerializeField] private int status;         // 1=开放 0=关闭
        [SerializeField] private string config;       // JSON配置（概率表、UP列表等）

        public int Id { get => id; set => id = value; }
        public string Name { get => name; set => name = value; }
        public string DisplayName { get => displayName; set => displayName = value; }
        public string Type { get => type; set => type = value; }
        public int Status { get => status; set => status = value; }
        public string Config { get => config; set => config = value; }

        /// <summary>
        /// 技能池是否当前开放
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
    // 技能稀有度枚举
    // ============================================================

    /// <summary>
    /// 技能稀有度枚举
    /// </summary>
    public enum SkillRarity
    {
        N = 1,
        R = 3,
        SR = 4,
        SSR = 5
    }

    /// <summary>
    /// 技能分类枚举
    /// </summary>
    public enum SkillCategory
    {
        Attack,      // 攻击
        Defense,     // 防御
        Support,     // 辅助
        Control,     // 控制
        Utility      // 实用
    }
}
