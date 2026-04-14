using System;
using System.Collections.Generic;
using UnityEngine;

namespace Game.Data
{
    /// <summary>
    /// 行军状态枚举
    /// </summary>
    public enum MarchStatus
    {
        Pending,   // 等待出发
        Marching,  // 行军中
        Arrived,   // 已到达
        Recalled,  // 已撤回
        Failed     // 行军失败
    }

    /// <summary>
    /// 地图区域数据模型 - 九州九大区域
    /// </summary>
    [Serializable]
    public class MapRegion
    {
        [SerializeField] private int id;
        [SerializeField] private string name;
        [SerializeField] private string description;
        [SerializeField] private int cityCount;
        [SerializeField] private int positionOrder;

        public int Id { get => id; set => id = value; }
        public string Name { get => name; set => name = value; }
        public string Description { get => description; set => description = value; }
        public int CityCount { get => cityCount; set => cityCount = value; }
        public int PositionOrder { get => positionOrder; set => positionOrder = value; }
    }

    /// <summary>
    /// 城市资源数据
    /// </summary>
    [Serializable]
    public class CityResources
    {
        [SerializeField] private int gold;
        [SerializeField] private int food;
        [SerializeField] private int iron;
        [SerializeField] private int wood;

        public int Gold { get => gold; set => gold = value; }
        public int Food { get => food; set => food = value; }
        public int Iron { get => iron; set => iron = value; }
        public int Wood { get => wood; set => wood = value; }

        /// <summary>
        /// 获取总资源价值
        /// </summary>
        public int TotalValue()
        {
            return gold + food + iron + wood;
        }
    }

    /// <summary>
    /// 城市数据模型
    /// </summary>
    [Serializable]
    public class MapCity
    {
        [SerializeField] private int id;
        [SerializeField] private string name;
        [SerializeField] private int level;
        [SerializeField] private int regionId;
        [SerializeField] private float positionX;
        [SerializeField] private float positionY;
        [SerializeField] private int garrison;
        [SerializeField] private CityResources resources;
        [SerializeField] private List<string> connections;
        [SerializeField] private CityOccupation occupation;

        public int Id { get => id; set => id = value; }
        public string Name { get => name; set => name = value; }
        public int Level { get => level; set => level = value; }
        public int RegionId { get => regionId; set => regionId = value; }
        public float PositionX { get => positionX; set => positionX = value; }
        public float PositionY { get => positionY; set => positionY = value; }
        public int Garrison { get => garrison; set => garrison = value; }
        public CityResources Resources { get => resources; set => resources = value; }
        public List<string> Connections { get => connections; set => connections = value; }
        public CityOccupation Occupation { get => occupation; set => occupation = value; }

        /// <summary>
        /// 城市等级描述文本
        /// </summary>
        public string GetLevelText()
        {
            return $"Lv.{level}";
        }
    }

    /// <summary>
    /// 城市占领信息
    /// </summary>
    [Serializable]
    public class CityOccupation
    {
        [SerializeField] private int cityId;
        [SerializeField] private int guildId;
        [SerializeField] private string guildName;
        [SerializeField] private string occupiedAt;
        [SerializeField] private int defenseStrength;

        public int CityId { get => cityId; set => cityId = value; }
        public int GuildId { get => guildId; set => guildId = value; }
        public string GuildName { get => guildName; set => guildName = value; }
        public string OccupiedAt { get => occupiedAt; set => occupiedAt = value; }
        public int DefenseStrength { get => defenseStrength; set => defenseStrength = value; }

        /// <summary>
        /// 城市是否已被占领
        /// </summary>
        public bool IsOccupied()
        {
            return guildId > 0;
        }
    }

    /// <summary>
    /// 行军指令数据模型
    /// </summary>
    [Serializable]
    public class MarchOrder
    {
        [SerializeField] private string id;
        [SerializeField] private int userId;
        [SerializeField] private int sourceCityId;
        [SerializeField] private int targetCityId;
        [SerializeField] private string troopType;
        [SerializeField] private int troopCount;
        [SerializeField] private string status;
        [SerializeField] private int progress;
        [SerializeField] private string estimatedArrival;
        [SerializeField] private string createdAt;

        public string Id { get => id; set => id = value; }
        public int UserId { get => userId; set => userId = value; }
        public int SourceCityId { get => sourceCityId; set => sourceCityId = value; }
        public int TargetCityId { get => targetCityId; set => targetCityId = value; }
        public string TroopType { get => troopType; set => troopType = value; }
        public int TroopCount { get => troopCount; set => troopCount = value; }
        public string Status { get => status; set => status = value; }
        public int Progress { get => progress; set => progress = value; }
        public string EstimatedArrival { get => estimatedArrival; set => estimatedArrival = value; }
        public string CreatedAt { get => createdAt; set => createdAt = value; }

        /// <summary>
        /// 获取行军状态枚举
        /// </summary>
        public MarchStatus GetStatusEnum()
        {
            switch (status?.ToLower())
            {
                case "pending": return MarchStatus.Pending;
                case "marching": return MarchStatus.Marching;
                case "arrived": return MarchStatus.Arrived;
                case "recalled": return MarchStatus.Recalled;
                case "failed": return MarchStatus.Failed;
                default: return MarchStatus.Pending;
            }
        }

        /// <summary>
        /// 行军是否已结束
        /// </summary>
        public bool IsFinished()
        {
            var s = GetStatusEnum();
            return s == MarchStatus.Arrived || s == MarchStatus.Recalled || s == MarchStatus.Failed;
        }
    }

    /// <summary>
    /// 发起行军请求体
    /// </summary>
    [Serializable]
    public class MarchRequest
    {
        [SerializeField] private int targetCityId;
        [SerializeField] private string troopType;
        [SerializeField] private int troopCount;

        public MarchRequest(int targetCityId, string troopType, int troopCount)
        {
            this.targetCityId = targetCityId;
            this.troopType = troopType;
            this.troopCount = troopCount;
        }

        public int TargetCityId { get => targetCityId; set => targetCityId = value; }
        public string TroopType { get => troopType; set => troopType = value; }
        public int TroopCount { get => troopCount; set => troopCount = value; }
    }

    /// <summary>
    /// 行军进度数据
    /// </summary>
    [Serializable]
    public class MarchProgress
    {
        [SerializeField] private string marchId;
        [SerializeField] private int percent;
        [SerializeField] private string eta;
        [SerializeField] private string currentNode;
        [SerializeField] private List<string> remainingNodes;

        public string MarchId { get => marchId; set => marchId = value; }
        public int Percent { get => percent; set => percent = value; }
        public string Eta { get => eta; set => eta = value; }
        public string CurrentNode { get => currentNode; set => currentNode = value; }
        public List<string> RemainingNodes { get => remainingNodes; set => remainingNodes = value; }

        /// <summary>
        /// 格式化的预计到达时间文本
        /// </summary>
        public string GetEtaText()
        {
            if (DateTime.TryParse(eta, out var time))
            {
                return time.ToString("HH:mm:ss");
            }
            return eta ?? "--";
        }
    }

    /// <summary>
    /// 领地城市（用于联盟领地展示）
    /// </summary>
    [Serializable]
    public class TerritoryCity
    {
        [SerializeField] private int cityId;
        [SerializeField] private string cityName;
        [SerializeField] private int level;
        [SerializeField] private float positionX;
        [SerializeField] private float positionY;

        public int CityId { get => cityId; set => cityId = value; }
        public string CityName { get => cityName; set => cityName = value; }
        public int Level { get => level; set => level = value; }
        public float PositionX { get => positionX; set => positionX = value; }
        public float PositionY { get => positionY; set => positionY = value; }
    }

    /// <summary>
    /// 联盟领地数据
    /// </summary>
    [Serializable]
    public class AllianceTerritory
    {
        [SerializeField] private int guildId;
        [SerializeField] private string guildName;
        [SerializeField] private List<TerritoryCity> cities;
        [SerializeField] private int totalInfluence;
        [SerializeField] private int level;

        public int GuildId { get => guildId; set => guildId = value; }
        public string GuildName { get => guildName; set => guildName = value; }
        public List<TerritoryCity> Cities { get => cities; set => cities = value; }
        public int TotalInfluence { get => totalInfluence; set => totalInfluence = value; }
        public int Level { get => level; set => level = value; }
    }

    /// <summary>
    /// 地图总览数据（含总城市数和已占领城市数）
    /// </summary>
    [Serializable]
    public class MapOverviewResponse
    {
        [SerializeField] private List<MapRegion> regions;
        [SerializeField] private int totalCities;
        [SerializeField] private int occupiedCities;

        public List<MapRegion> Regions { get => regions; set => regions = value; }
        public int TotalCities { get => totalCities; set => totalCities = value; }
        public int OccupiedCities { get => occupiedCities; set => occupiedCities = value; }
    }

    /// <summary>
    /// 区域城市列表响应
    /// </summary>
    [Serializable]
    public class RegionCitiesResponse
    {
        [SerializeField] private List<MapCity> cities;

        public List<MapCity> Cities { get => cities; set => cities = value; }
    }

    /// <summary>
    /// 城市详情响应
    /// </summary>
    [Serializable]
    public class CityDetailResponse
    {
        [SerializeField] private MapCity city;

        public MapCity City { get => city; set => city = value; }
    }

    /// <summary>
    /// 城市日志记录
    /// </summary>
    [Serializable]
    public class CityLog
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
    /// 城市日志列表响应
    /// </summary>
    [Serializable]
    public class CityLogsResponse
    {
        [SerializeField] private List<CityLog> logs;

        public List<CityLog> Logs { get => logs; set => logs = value; }
    }

    /// <summary>
    /// 行军发起响应
    /// </summary>
    [Serializable]
    public class MarchResponse
    {
        [SerializeField] private MarchOrder march;

        public MarchOrder March { get => march; set => march = value; }
    }

    /// <summary>
    /// 行军列表响应
    /// </summary>
    [Serializable]
    public class MarchListResponse
    {
        [SerializeField] private List<MarchOrder> marches;

        public List<MarchOrder> Marches { get => marches; set => marches = value; }
    }

    /// <summary>
    /// 行军进度响应
    /// </summary>
    [Serializable]
    public class MarchProgressResponse
    {
        [SerializeField] private MarchProgress progress;

        public MarchProgress Progress { get => progress; set => progress = value; }
    }
}
