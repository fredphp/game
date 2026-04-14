using System;
using System.Collections.Generic;
using UnityEngine;

namespace Game.Data
{
    /// <summary>
    /// 公会角色枚举 - 对应 guild-service 中的角色层级
    /// </summary>
    public enum GuildRole
    {
        Leader,     // 会长
        ViceLeader, // 副会长
        Officer,    // 精英
        Member      // 成员
    }

    /// <summary>
    /// 申请状态枚举
    /// </summary>
    public enum ApplicationStatus
    {
        Pending,   // 待审核
        Approved,  // 已通过
        Rejected   // 已拒绝
    }

    /// <summary>
    /// 公会战状态枚举
    /// </summary>
    public enum GuildWarStatus
    {
        Preparing, // 准备阶段
        Active,    // 战争进行中
        Ended      // 战争已结束
    }

    /// <summary>
    /// 协作战斗状态枚举
    /// </summary>
    public enum CoopBattleStatus
    {
        Preparing,   // 准备中
        Ready,       // 已就绪
        InProgress,  // 进行中
        Completed    // 已完成
    }

    /// <summary>
    /// 公会数据模型
    /// </summary>
    [Serializable]
    public class Guild
    {
        [SerializeField] private int id;
        [SerializeField] private string name;
        [SerializeField] private string announcement;
        [SerializeField] private int leaderId;
        [SerializeField] private string leaderName;
        [SerializeField] private int memberCount;
        [SerializeField] private int maxMembers;
        [SerializeField] private int level;
        [SerializeField] private int experience;
        [SerializeField] private string icon;
        [SerializeField] private string createdAt;

        public int Id { get => id; set => id = value; }
        public string Name { get => name; set => name = value; }
        public string Announcement { get => announcement; set => announcement = value; }
        public int LeaderId { get => leaderId; set => leaderId = value; }
        public string LeaderName { get => leaderName; set => leaderName = value; }
        public int MemberCount { get => memberCount; set => memberCount = value; }
        public int MaxMembers { get => maxMembers; set => maxMembers = value; }
        public int Level { get => level; set => level = value; }
        public int Experience { get => experience; set => experience = value; }
        public string Icon { get => icon; set => icon = value; }
        public string CreatedAt { get => createdAt; set => createdAt = value; }

        /// <summary>
        /// 公会是否已满员
        /// </summary>
        public bool IsFull()
        {
            return memberCount >= maxMembers;
        }
    }

    /// <summary>
    /// 公会成员数据模型
    /// </summary>
    [Serializable]
    public class GuildMember
    {
        [SerializeField] private int userId;
        [SerializeField] private string username;
        [SerializeField] private string nickname;
        [SerializeField] private string avatar;
        [SerializeField] private string role;
        [SerializeField] private int power;
        [SerializeField] private string joinedAt;
        [SerializeField] private string lastActive;

        public int UserId { get => userId; set => userId = value; }
        public string Username { get => username; set => username = value; }
        public string Nickname { get => nickname; set => nickname = value; }
        public string Avatar { get => avatar; set => avatar = value; }
        public string Role { get => role; set => role = value; }
        public int Power { get => power; set => power = value; }
        public string JoinedAt { get => joinedAt; set => joinedAt = value; }
        public string LastActive { get => lastActive; set => lastActive = value; }

        /// <summary>
        /// 获取角色枚举值
        /// </summary>
        public GuildRole GetRoleEnum()
        {
            switch (role?.ToLower())
            {
                case "leader": return GuildRole.Leader;
                case "vice_leader": return GuildRole.ViceLeader;
                case "officer": return GuildRole.Officer;
                case "member": return GuildRole.Member;
                default: return GuildRole.Member;
            }
        }

        /// <summary>
        /// 是否为会长
        /// </summary>
        public bool IsLeader()
        {
            return GetRoleEnum() == GuildRole.Leader;
        }

        /// <summary>
        /// 是否拥有管理权限（会长或副会长）
        /// </summary>
        public bool HasAdminPermission()
        {
            var r = GetRoleEnum();
            return r == GuildRole.Leader || r == GuildRole.ViceLeader;
        }

        /// <summary>
        /// 角色显示名称
        /// </summary>
        public string GetRoleDisplayName()
        {
            switch (GetRoleEnum())
            {
                case GuildRole.Leader: return "会长";
                case GuildRole.ViceLeader: return "副会长";
                case GuildRole.Officer: return "精英";
                case GuildRole.Member: return "成员";
                default: return "成员";
            }
        }
    }

    /// <summary>
    /// 公会入会申请
    /// </summary>
    [Serializable]
    public class GuildApplication
    {
        [SerializeField] private string id;
        [SerializeField] private int userId;
        [SerializeField] private string username;
        [SerializeField] private string nickname;
        [SerializeField] private int power;
        [SerializeField] private int guildId;
        [SerializeField] private string status;
        [SerializeField] private string createdAt;

        public string Id { get => id; set => id = value; }
        public int UserId { get => userId; set => userId = value; }
        public string Username { get => username; set => username = value; }
        public string Nickname { get => nickname; set => nickname = value; }
        public int Power { get => power; set => power = value; }
        public int GuildId { get => guildId; set => guildId = value; }
        public string Status { get => status; set => status = value; }
        public string CreatedAt { get => createdAt; set => createdAt = value; }

        /// <summary>
        /// 获取申请状态枚举
        /// </summary>
        public ApplicationStatus GetStatusEnum()
        {
            switch (status?.ToLower())
            {
                case "pending": return ApplicationStatus.Pending;
                case "approved": return ApplicationStatus.Approved;
                case "rejected": return ApplicationStatus.Rejected;
                default: return ApplicationStatus.Pending;
            }
        }
    }

    /// <summary>
    /// 公会战数据模型
    /// </summary>
    [Serializable]
    public class GuildWar
    {
        [SerializeField] private string id;
        [SerializeField] private int attackerGuildId;
        [SerializeField] private string attackerName;
        [SerializeField] private int defenderGuildId;
        [SerializeField] private string defenderName;
        [SerializeField] private string status;
        [SerializeField] private string startTime;
        [SerializeField] private string endTime;
        [SerializeField] private int citiesExchanged;
        [SerializeField] private int winnerId;

        public string Id { get => id; set => id = value; }
        public int AttackerGuildId { get => attackerGuildId; set => attackerGuildId = value; }
        public string AttackerName { get => attackerName; set => attackerName = value; }
        public int DefenderGuildId { get => defenderGuildId; set => defenderGuildId = value; }
        public string DefenderName { get => defenderName; set => defenderName = value; }
        public string Status { get => status; set => status = value; }
        public string StartTime { get => startTime; set => startTime = value; }
        public string EndTime { get => endTime; set => endTime = value; }
        public int CitiesExchanged { get => citiesExchanged; set => citiesExchanged = value; }
        public int WinnerId { get => winnerId; set => winnerId = value; }

        /// <summary>
        /// 获取战争状态枚举
        /// </summary>
        public GuildWarStatus GetStatusEnum()
        {
            switch (status?.ToLower())
            {
                case "preparing": return GuildWarStatus.Preparing;
                case "active": return GuildWarStatus.Active;
                case "ended": return GuildWarStatus.Ended;
                default: return GuildWarStatus.Preparing;
            }
        }

        /// <summary>
        /// 战争是否已结束
        /// </summary>
        public bool IsEnded()
        {
            return GetStatusEnum() == GuildWarStatus.Ended;
        }
    }

    /// <summary>
    /// 协作战斗参与者
    /// </summary>
    [Serializable]
    public class CoopParticipant
    {
        [SerializeField] private int userId;
        [SerializeField] private string username;
        [SerializeField] private int troopCount;
        [SerializeField] private string joinedAt;

        public int UserId { get => userId; set => userId = value; }
        public string Username { get => username; set => username = value; }
        public int TroopCount { get => troopCount; set => troopCount = value; }
        public string JoinedAt { get => joinedAt; set => joinedAt = value; }
    }

    /// <summary>
    /// 协作战斗数据模型
    /// </summary>
    [Serializable]
    public class CoopBattle
    {
        [SerializeField] private string id;
        [SerializeField] private string warId;
        [SerializeField] private int cityId;
        [SerializeField] private int initiatorId;
        [SerializeField] private List<CoopParticipant> participants;
        [SerializeField] private string status;
        [SerializeField] private int totalTroops;
        [SerializeField] private string createdAt;

        public string Id { get => id; set => id = value; }
        public string WarId { get => warId; set => warId = value; }
        public int CityId { get => cityId; set => cityId = value; }
        public int InitiatorId { get => initiatorId; set => initiatorId = value; }
        public List<CoopParticipant> Participants { get => participants; set => participants = value; }
        public string Status { get => status; set => status = value; }
        public int TotalTroops { get => totalTroops; set => totalTroops = value; }
        public string CreatedAt { get => createdAt; set => createdAt = value; }

        /// <summary>
        /// 获取协作战斗状态枚举
        /// </summary>
        public CoopBattleStatus GetStatusEnum()
        {
            switch (status?.ToLower())
            {
                case "preparing": return CoopBattleStatus.Preparing;
                case "ready": return CoopBattleStatus.Ready;
                case "in_progress": return CoopBattleStatus.InProgress;
                case "completed": return CoopBattleStatus.Completed;
                default: return CoopBattleStatus.Preparing;
            }
        }
    }

    // ============== 请求体 ==============

    /// <summary>
    /// 创建公会请求
    /// </summary>
    [Serializable]
    public class CreateGuildRequest
    {
        [SerializeField] private string name;
        [SerializeField] private string announcement;

        public CreateGuildRequest(string name, string announcement)
        {
            this.name = name;
            this.announcement = announcement;
        }

        public string Name { get => name; set => name = value; }
        public string Announcement { get => announcement; set => announcement = value; }
    }

    /// <summary>
    /// 加入公会请求
    /// </summary>
    [Serializable]
    public class JoinGuildRequest
    {
        [SerializeField] private int guildId;

        public JoinGuildRequest(int guildId)
        {
            this.guildId = guildId;
        }

        public int GuildId { get => guildId; set => guildId = value; }
    }

    /// <summary>
    /// 离开公会请求
    /// </summary>
    [Serializable]
    public class LeaveGuildRequest
    {
        [SerializeField] private int guildId;

        public LeaveGuildRequest(int guildId)
        {
            this.guildId = guildId;
        }

        public int GuildId { get => guildId; set => guildId = value; }
    }

    /// <summary>
    /// 更新公会信息请求
    /// </summary>
    [Serializable]
    public class UpdateGuildRequest
    {
        [SerializeField] private string name;
        [SerializeField] private string announcement;
        [SerializeField] private string icon;

        public UpdateGuildRequest(string name, string announcement, string icon)
        {
            this.name = name;
            this.announcement = announcement;
            this.icon = icon;
        }

        public string Name { get => name; set => name = value; }
        public string Announcement { get => announcement; set => announcement = value; }
        public string Icon { get => icon; set => icon = value; }
    }

    /// <summary>
    /// 审批申请请求
    /// </summary>
    [Serializable]
    public class ApproveApplicationRequest
    {
        [SerializeField] private bool approved;

        public ApproveApplicationRequest(bool approved)
        {
            this.approved = approved;
        }

        public bool Approved { get => approved; set => approved = value; }
    }

    /// <summary>
    /// 宣战请求
    /// </summary>
    [Serializable]
    public class DeclareWarRequest
    {
        [SerializeField] private int targetGuildId;

        public DeclareWarRequest(int targetGuildId)
        {
            this.targetGuildId = targetGuildId;
        }

        public int TargetGuildId { get => targetGuildId; set => targetGuildId = value; }
    }

    /// <summary>
    /// 发起协作战斗请求
    /// </summary>
    [Serializable]
    public class InitiateCoopBattleRequest
    {
        [SerializeField] private int cityId;
        [SerializeField] private int troopCount;

        public InitiateCoopBattleRequest(int cityId, int troopCount)
        {
            this.cityId = cityId;
            this.troopCount = troopCount;
        }

        public int CityId { get => cityId; set => cityId = value; }
        public int TroopCount { get => troopCount; set => troopCount = value; }
    }

    /// <summary>
    /// 加入协作战斗请求
    /// </summary>
    [Serializable]
    public class JoinCoopBattleRequest
    {
        [SerializeField] private string battleId;
        [SerializeField] private int troopCount;

        public JoinCoopBattleRequest(string battleId, int troopCount)
        {
            this.battleId = battleId;
            this.troopCount = troopCount;
        }

        public string BattleId { get => battleId; set => battleId = value; }
        public int TroopCount { get => troopCount; set => troopCount = value; }
    }

    // ============== 响应体 ==============

    /// <summary>
    /// 公会列表响应（分页）
    /// </summary>
    [Serializable]
    public class GuildListResponse
    {
        [SerializeField] private List<Guild> guilds;
        [SerializeField] private int total;

        public List<Guild> Guilds { get => guilds; set => guilds = value; }
        public int Total { get => total; set => total = value; }
    }

    /// <summary>
    /// 公会详情响应
    /// </summary>
    [Serializable]
    public class GuildDetailResponse
    {
        [SerializeField] private Guild guild;

        public Guild Guild { get => guild; set => guild = value; }
    }

    /// <summary>
    /// 公会成员列表响应
    /// </summary>
    [Serializable]
    public class GuildMemberListResponse
    {
        [SerializeField] private List<GuildMember> members;

        public List<GuildMember> Members { get => members; set => members = value; }
    }

    /// <summary>
    /// 公会日志响应
    /// </summary>
    [Serializable]
    public class GuildLog
    {
        [SerializeField] private string id;
        [SerializeField] private string action;
        [SerializeField] private string description;
        [SerializeField] private int operatorId;
        [SerializeField] private string operatorName;
        [SerializeField] private string createdAt;

        public string Id { get => id; set => id = value; }
        public string Action { get => action; set => action = value; }
        public string Description { get => description; set => description = value; }
        public int OperatorId { get => operatorId; set => operatorId = value; }
        public string OperatorName { get => operatorName; set => operatorName = value; }
        public string CreatedAt { get => createdAt; set => createdAt = value; }
    }

    /// <summary>
    /// 公会日志列表响应
    /// </summary>
    [Serializable]
    public class GuildLogsResponse
    {
        [SerializeField] private List<GuildLog> logs;

        public List<GuildLog> Logs { get => logs; set => logs = value; }
    }

    /// <summary>
    /// 公会战详情响应
    /// </summary>
    [Serializable]
    public class GuildWarDetailResponse
    {
        [SerializeField] private GuildWar war;

        public GuildWar War { get => war; set => war = value; }
    }

    /// <summary>
    /// 公会战列表响应
    /// </summary>
    [Serializable]
    public class GuildWarListResponse
    {
        [SerializeField] private List<GuildWar> wars;

        public List<GuildWar> Wars { get => wars; set => wars = value; }
    }

    /// <summary>
    /// 申请列表响应
    /// </summary>
    [Serializable]
    public class GuildApplicationListResponse
    {
        [SerializeField] private List<GuildApplication> applications;

        public List<GuildApplication> Applications { get => applications; set => applications = value; }
    }

    /// <summary>
    /// 简单消息响应（用于返回操作结果的通用响应）
    /// </summary>
    [Serializable]
    public class MessageResponse
    {
        [SerializeField] private string message;

        public string Message { get => message; set => message = value; }
    }
}
