using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;
using Jiuzhou.Zhengding.Core.UI;

namespace Jiuzhou.Zhengding.Module.Map
{
    /// <summary>
    /// 城市详情数据 - 从MapApi获取
    /// </summary>
    [Serializable]
    public class CityDetailData
    {
        public int CityId;
        public string CityName;
        public int Level;
        public int RegionId;
        public string RegionName;
        public int OwnerGuildId;
        public string OwnerGuildName;
        public int OwnerPlayerId;
        public string OwnerPlayerName;
        public int OccupationStatus;
        public bool IsContested;

        // 资源产出
        public int GoldProduction;
        public int FoodProduction;
        public int IronProduction;
        public int WoodProduction;

        // 防御信息
        public int DefenseStrength;
        public int MaxDefenseStrength;
        public int GarrisonCount;
        public string GarrisonType;

        // 连接城市
        public List<ConnectedCityInfo> ConnectedCities;

        // 战斗记录
        public List<CityBattleLog> BattleLogs;

        // 距离信息
        public float DistanceFromPlayer;
    }

    /// <summary>
    /// 连接城市信息
    /// </summary>
    [Serializable]
    public class ConnectedCityInfo
    {
        public int CityId;
        public string CityName;
        public int OccupationStatus;
        public int Level;
        public string OwnerGuildName;
    }

    /// <summary>
    /// 城市战斗日志
    /// </summary>
    [Serializable]
    public class CityBattleLog
    {
        public string LogId;
        public string AttackerGuildName;
        public string DefenderGuildName;
        public string Result;       // win/lose
        public int AttackTroops;
        public int DefenseTroops;
        public string Timestamp;
        public string BattleType;   // attack/defense/scout
    }

    /// <summary>
    /// 城市详情面板 - 显示城市的详细信息
    /// 包括城市名称、等级、区域、拥有者、资源产出、防御强度、
    /// 驻军信息、战斗历史、连接城市列表、距离信息
    /// </summary>
    public class CityInfoPanel : UIBase
    {
        // ==================== UI引用 - 城市基本信息 ====================
        [Header("城市基本信息")]
        [SerializeField] private TextMeshProUGUI cityNameText;
        [SerializeField] private TextMeshProUGUI cityLevelText;
        [SerializeField] private TextMeshProUGUI regionNameText;
        [SerializeField] private TextMeshProUGUI ownerText;
        [SerializeField] private Image cityBannerImage;
        [SerializeField] private Image occupationColorIndicator;

        // ==================== UI引用 - 资源产出 ====================
        [Header("资源产出")]
        [SerializeField] private TextMeshProUGUI goldProductionText;
        [SerializeField] private TextMeshProUGUI foodProductionText;
        [SerializeField] private TextMeshProUGUI ironProductionText;
        [SerializeField] private TextMeshProUGUI woodProductionText;
        [SerializeField] private GameObject resourcesContainer;

        // ==================== UI引用 - 防御信息 ====================
        [Header("防御信息")]
        [SerializeField] private TextMeshProUGUI defenseStrengthText;
        [SerializeField] private Image defenseBarFill;
        [SerializeField] private TextMeshProUGUI garrisonText;
        [SerializeField] private TextMeshProUGUI garrisonTypeText;

        // ==================== UI引用 - 战斗历史 ====================
        [Header("战斗历史")]
        [SerializeField] private Transform battleLogList;
        [SerializeField] private GameObject battleLogItemPrefab;
        [SerializeField] private ScrollRect battleLogScrollRect;

        // ==================== UI引用 - 连接城市 ====================
        [Header("连接城市")]
        [SerializeField] private Transform connectionsList;
        [SerializeField] private GameObject connectionItemPrefab;
        [SerializeField] private ScrollRect connectionsScrollRect;

        // ==================== UI引用 - 距离和行军 ====================
        [Header("行军信息")]
        [SerializeField] private TextMeshProUGUI distanceText;
        [SerializeField] private TextMeshProUGUI estimatedMarchTimeText;
        [SerializeField] private TextMeshProUGUI marchCostText;

        // ==================== UI引用 - 操作按钮 ====================
        [Header("操作按钮")]
        [SerializeField] private Button attackButton;
        [SerializeField] private Button scoutButton;
        [SerializeField] private Button reinforceButton;
        [SerializeField] private Button closeButton;
        [SerializeField] private TextMeshProUGUI attackButtonText;

        // ==================== UI引用 - 争夺状态 ====================
        [Header("争夺状态")]
        [SerializeField] private GameObject contestedBanner;
        [SerializeField] private TextMeshProUGUI contestedText;

        // ==================== 运行时变量 ====================
        private CityDetailData _cityDetail;
        private int _currentCityId;
        private List<GameObject> _instantiatedItems = new List<GameObject>();

        // 占领状态颜色
        private static readonly Color NeutralColor = new Color(0.6f, 0.6f, 0.6f, 1f);
        private static readonly Color OwnColor = new Color(0.2f, 0.8f, 0.3f, 1f);
        private static readonly Color AllianceColor = new Color(0.3f, 0.5f, 0.9f, 1f);
        private static readonly Color EnemyColor = new Color(0.9f, 0.2f, 0.2f, 1f);

        /// <summary>
        /// 面板名称
        /// </summary>
        public override string PanelName => "CityInfoPanel";

        /// <summary>
        /// 面板打开 - 加载城市详情
        /// args: int cityId
        /// </summary>
        public override void OnOpen(params object[] args)
        {
            if (args == null || args.Length < 1)
            {
                Debug.LogError("[CityInfoPanel] 打开参数不足，需要 cityId");
                return;
            }

            _currentCityId = Convert.ToInt32(args[0]);
            Debug.Log($"[CityInfoPanel] 打开城市详情面板 - 城市ID: {_currentCityId}");

            // 注册按钮事件
            RegisterButtonEvents();

            // 加载城市详情数据
            StartCoroutine(LoadCityDetail(_currentCityId));
        }

        /// <summary>
        /// 面板关闭 - 清理资源
        /// </summary>
        public override void OnClose()
        {
            UnregisterButtonEvents();
            CleanupInstantiatedItems();
            Debug.Log("[CityInfoPanel] 城市详情面板已关闭");
        }

        /// <summary>
        /// 面板刷新
        /// </summary>
        public override void OnRefresh()
        {
            if (_currentCityId > 0)
            {
                StartCoroutine(LoadCityDetail(_currentCityId));
            }
        }

        // ==================== 数据加载 ====================

        /// <summary>
        /// 加载城市详情 - 从MapApi获取
        /// </summary>
        private IEnumerator LoadCityDetail(int cityId)
        {
            Debug.Log($"[CityInfoPanel] 正在加载城市 {cityId} 的详情...");

            // 实际应调用: StartCoroutine(MapApi.Instance.GetCityDetail(cityId, callback))
            // 这里生成模拟数据
            yield return StartCoroutine(GenerateMockCityDetail(cityId));

            // 显示城市详情
            DisplayCityDetail(_cityDetail);
        }

        /// <summary>
        /// 生成模拟城市详情数据
        /// </summary>
        private IEnumerator GenerateMockCityDetail(int cityId)
        {
            string[] cityNames = new string[]
            {
                "邺城", "南皮", "平原", "渤海", "濮阳",
                "许昌", "洛阳", "长安", "成都", "建业",
                "襄阳", "江陵", "长沙", "柴桑", "汉中",
                "寿春", "下邳", "彭城", "汝南", "颍川",
                "北海", "济南", "陈留", "会稽", "庐江",
                "武陵", "永安", "天水", "安定", "西凉",
                "南中", "济阴", "任城", "乐安", "琅琊", "广陵"
            };

            string[] regionNames = new string[]
            {
                "冀州", "冀州", "冀州", "冀州",
                "兖州", "豫州", "豫州", "凉州", "益州", "扬州",
                "荆州", "荆州", "荆州", "扬州", "益州",
                "扬州", "徐州", "徐州", "豫州", "豫州",
                "青州", "青州", "兖州", "扬州", "扬州",
                "荆州", "益州", "凉州", "凉州", "凉州",
                "益州", "兖州", "兖州", "青州", "徐州", "扬州"
            };

            string[] guildNames = new string[]
            {
                "蜀汉盟", "蜀汉盟", "蜀汉盟", "", "曹魏盟",
                "", "曹魏盟", "", "蜀汉盟", "东吴盟",
                "", "", "", "东吴盟", "蜀汉盟",
                "东吴盟", "", "", "", "",
                "", "", "", "", "",
                "", "", "", "", "",
                "", "", "", "", "", ""
            };

            int nameIndex = Mathf.Clamp(cityId - 1, 0, cityNames.Length - 1);
            int regionIndex = Mathf.Clamp(cityId - 1, 0, regionNames.Length - 1);

            System.Random rng = new System.Random(cityId * 137);

            // 确定占领状态
            int occupationStatus = 0;
            string ownerGuildName = "";
            string ownerPlayerName = "";

            if (nameIndex < 3)
            {
                occupationStatus = 1;
                ownerGuildName = "蜀汉盟";
                ownerPlayerName = "主公";
            }
            else if (nameIndex < 6)
            {
                occupationStatus = 2;
                ownerGuildName = "东吴盟";
            }
            else if (nameIndex < 10)
            {
                occupationStatus = 3;
                ownerGuildName = "曹魏盟";
            }

            bool isContested = (cityId == 16 || cityId == 21);

            _cityDetail = new CityDetailData
            {
                CityId = cityId,
                CityName = cityNames[nameIndex],
                Level = rng.Next(1, 7),
                RegionId = (nameIndex / 4) + 1,
                RegionName = regionNames[regionIndex],
                OwnerGuildId = occupationStatus > 0 ? 1000 + occupationStatus : 0,
                OwnerGuildName = ownerGuildName,
                OwnerPlayerId = occupationStatus == 1 ? 1001 : 0,
                OwnerPlayerName = ownerPlayerName,
                OccupationStatus = occupationStatus,
                IsContested = isContested,

                GoldProduction = 50 + cityId * 10 + rng.Next(0, 30),
                FoodProduction = 40 + cityId * 8 + rng.Next(0, 25),
                IronProduction = 30 + cityId * 5 + rng.Next(0, 20),
                WoodProduction = 35 + cityId * 6 + rng.Next(0, 22),

                DefenseStrength = 100 + cityId * 20 + rng.Next(0, 100),
                MaxDefenseStrength = 500 + cityId * 30,
                GarrisonCount = occupationStatus > 0 ? rng.Next(50, 500) : 0,
                GarrisonType = "混合驻军",

                DistanceFromPlayer = 1f + cityId * 0.3f + rng.NextFloat() * 0.5f,

                ConnectedCities = new List<ConnectedCityInfo>(),
                BattleLogs = new List<CityBattleLog>()
            };

            // 生成连接城市
            int[] possibleNeighbors = new int[] { cityId - 1, cityId + 1, cityId - 4, cityId + 4, cityId - 5, cityId + 5 };
            string[] neighborGuilds = new string[] { "蜀汉盟", "东吴盟", "曹魏盟", "", "" };
            int[] neighborOccupations = new int[] { 1, 2, 3, 0, 0 };

            foreach (int neighborId in possibleNeighbors)
            {
                if (neighborId >= 1 && neighborId <= 36)
                {
                    int nnIndex = neighborId - 1;
                    int occ = nnIndex < 3 ? 1 : nnIndex < 6 ? 2 : nnIndex < 10 ? 3 : 0;
                    string guild = nnIndex < 3 ? "蜀汉盟" : nnIndex < 6 ? "东吴盟" : nnIndex < 10 ? "曹魏盟" : "";

                    _cityDetail.ConnectedCities.Add(new ConnectedCityInfo
                    {
                        CityId = neighborId,
                        CityName = cityNames[Mathf.Clamp(nnIndex, 0, cityNames.Length - 1)],
                        OccupationStatus = occ,
                        Level = rng.Next(1, 7),
                        OwnerGuildName = guild
                    });
                }
            }

            // 生成战斗历史（最多5条）
            string[] battleTypes = new string[] { "attack", "defense", "scout" };
            string[] battleResults = new string[] { "win", "lose" };

            int logCount = Mathf.Min(rng.Next(0, 6), 5);
            for (int i = 0; i < logCount; i++)
            {
                string attacker = neighborGuilds[rng.Next(0, neighborGuilds.Length)];
                if (string.IsNullOrEmpty(attacker)) attacker = "流寇";

                _cityDetail.BattleLogs.Add(new CityBattleLog
                {
                    LogId = $"log_{cityId}_{i}",
                    AttackerGuildName = attacker,
                    DefenderGuildName = string.IsNullOrEmpty(ownerGuildName) ? "守军" : ownerGuildName,
                    Result = battleResults[rng.Next(0, battleResults.Length)],
                    AttackTroops = rng.Next(100, 1000),
                    DefenseTroops = rng.Next(50, 800),
                    Timestamp = DateTime.Now.AddHours(-i * 6 - rng.Next(1, 12)).ToString("MM-dd HH:mm"),
                    BattleType = battleTypes[rng.Next(0, battleTypes.Length)]
                });
            }

            yield return null;
        }

        // ==================== 显示城市详情 ====================

        /// <summary>
        /// 显示城市完整详情
        /// </summary>
        private void DisplayCityDetail(CityDetailData data)
        {
            if (data == null)
            {
                Debug.LogError("[CityInfoPanel] 城市详情数据为空");
                return;
            }

            // 清理旧UI
            CleanupInstantiatedItems();

            // 显示基本信息
            DisplayBasicInfo(data);

            // 显示资源产出
            DisplayResources(data);

            // 显示防御信息
            DisplayDefenseStrength(data);

            // 显示连接城市
            DisplayConnections(data.ConnectedCities);

            // 显示战斗历史
            DisplayBattleLogs(data.BattleLogs);

            // 显示距离和行军信息
            DisplayMarchInfo(data);

            // 显示争夺状态
            DisplayContestedStatus(data);

            // 更新攻击按钮状态
            UpdateAttackButton(data);
        }

        /// <summary>
        /// 显示城市基本信息
        /// </summary>
        private void DisplayBasicInfo(CityDetailData data)
        {
            if (cityNameText != null)
            {
                cityNameText.text = data.CityName;
            }

            if (cityLevelText != null)
            {
                cityLevelText.text = $"等级 {data.Level}";
                // 等级颜色
                cityLevelText.color = data.Level >= 5 ? Color.yellow :
                    data.Level >= 3 ? new Color(0.2f, 0.8f, 1f) : Color.white;
            }

            if (regionNameText != null)
            {
                regionNameText.text = data.RegionName;
            }

            if (ownerText != null)
            {
                if (data.OccupationStatus == 0)
                {
                    ownerText.text = "中立城池";
                    ownerText.color = NeutralColor;
                }
                else
                {
                    ownerText.text = $"{data.OwnerGuildName}";
                    if (!string.IsNullOrEmpty(data.OwnerPlayerName))
                    {
                        ownerText.text += $" ({data.OwnerPlayerName})";
                    }
                    ownerText.color = GetOccupationTextColor(data.OccupationStatus);
                }
            }

            if (occupationColorIndicator != null)
            {
                occupationColorIndicator.color = GetOccupationColor(data.OccupationStatus);
            }
        }

        /// <summary>
        /// 显示资源产出
        /// </summary>
        private void DisplayResources(CityDetailData data)
        {
            if (goldProductionText != null)
            {
                goldProductionText.text = $"金币: +{data.GoldProduction}/时";
            }

            if (foodProductionText != null)
            {
                foodProductionText.text = $"粮食: +{data.FoodProduction}/时";
            }

            if (ironProductionText != null)
            {
                ironProductionText.text = $"铁矿: +{data.IronProduction}/时";
            }

            if (woodProductionText != null)
            {
                woodProductionText.text = $"木材: +{data.WoodProduction}/时";
            }

            if (resourcesContainer != null)
            {
                resourcesContainer.SetActive(true);
            }
        }

        /// <summary>
        /// 显示防御强度
        /// </summary>
        private void DisplayDefenseStrength(CityDetailData data)
        {
            if (defenseStrengthText != null)
            {
                defenseStrengthText.text = $"防御力: {data.DefenseStrength}/{data.MaxDefenseStrength}";
            }

            if (defenseBarFill != null)
            {
                float defensePercent = data.MaxDefenseStrength > 0
                    ? (float)data.DefenseStrength / data.MaxDefenseStrength
                    : 0f;
                defenseBarFill.fillAmount = defensePercent;

                // 防御条颜色
                if (defensePercent > 0.7f)
                {
                    defenseBarFill.color = Color.green;
                }
                else if (defensePercent > 0.3f)
                {
                    defenseBarFill.color = Color.yellow;
                }
                else
                {
                    defenseBarFill.color = Color.red;
                }
            }

            if (garrisonText != null)
            {
                garrisonText.text = data.OccupationStatus > 0
                    ? $"驻军: {data.GarrisonCount}人"
                    : "驻军: 无";
            }

            if (garrisonTypeText != null)
            {
                garrisonTypeText.text = data.GarrisonType;
            }
        }

        /// <summary>
        /// 显示连接城市列表
        /// </summary>
        private void DisplayConnections(List<ConnectedCityInfo> connections)
        {
            if (connections == null || connectionsList == null) return;

            foreach (var conn in connections)
            {
                GameObject itemGo = connectionItemPrefab != null
                    ? Instantiate(connectionItemPrefab, connectionsList)
                    : CreateSimpleConnectionItem();

                _instantiatedItems.Add(itemGo);

                // 设置连接城市信息
                var connUI = itemGo.GetComponent<ConnectionCityItem>();
                if (connUI != null)
                {
                    connUI.Setup(conn, OnConnectionCityClick);
                }
                else
                {
                    // 简单文本显示
                    var text = itemGo.GetComponentInChildren<TextMeshProUGUI>();
                    if (text != null)
                    {
                        string statusMark = conn.OccupationStatus switch
                        {
                            1 => "[己方] ",
                            2 => "[同盟] ",
                            3 => "[敌方] ",
                            _ => "[中立] "
                        };
                        text.text = $"{statusMark}{conn.CityName} (Lv.{conn.Level})";
                        text.color = GetOccupationTextColor(conn.OccupationStatus);
                    }
                }
            }
        }

        /// <summary>
        /// 创建简单的连接城市项
        /// </summary>
        private GameObject CreateSimpleConnectionItem()
        {
            GameObject go = new GameObject("ConnectionItem");
            go.AddComponent<RectTransform>();

            TextMeshProUGUI text = go.AddComponent<TextMeshProUGUI>();
            text.fontSize = 18;
            text.alignment = TextAlignmentOptions.Left;

            Button btn = go.AddComponent<Button>();
            return go;
        }

        /// <summary>
        /// 连接城市点击 - 切换到该城市的详情
        /// </summary>
        private void OnConnectionCityClick(int cityId)
        {
            _currentCityId = cityId;
            StartCoroutine(LoadCityDetail(cityId));
        }

        /// <summary>
        /// 显示战斗历史
        /// </summary>
        private void DisplayBattleLogs(List<CityBattleLog> logs)
        {
            if (logs == null || battleLogList == null) return;

            // 只显示最近5条
            int displayCount = Mathf.Min(logs.Count, 5);

            for (int i = 0; i < displayCount; i++)
            {
                var log = logs[i];
                GameObject itemGo = battleLogItemPrefab != null
                    ? Instantiate(battleLogItemPrefab, battleLogList)
                    : CreateSimpleBattleLogItem();

                _instantiatedItems.Add(itemGo);

                // 设置战斗日志信息
                var logUI = itemGo.GetComponent<BattleLogItem>();
                if (logUI != null)
                {
                    logUI.Setup(log);
                }
                else
                {
                    var text = itemGo.GetComponentInChildren<TextMeshProUGUI>();
                    if (text != null)
                    {
                        string resultText = log.Result == "win" ? "胜" : "负";
                        string resultColor = log.Result == "win" ? "[胜]" : "[败]";
                        string battleTypeText = log.BattleType == "attack" ? "进攻" :
                            log.BattleType == "defense" ? "防守" : "侦查";
                        text.text = $"[{log.Timestamp}] {log.AttackerGuildName}{battleTypeText}{log.DefenderGuildName} {resultColor} " +
                                   $"({log.AttackTroops} vs {log.DefenseTroops})";
                    }
                }
            }
        }

        /// <summary>
        /// 创建简单的战斗日志项
        /// </summary>
        private GameObject CreateSimpleBattleLogItem()
        {
            GameObject go = new GameObject("BattleLogItem");
            RectTransform rect = go.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(400, 40);

            TextMeshProUGUI text = go.AddComponent<TextMeshProUGUI>();
            text.fontSize = 14;
            text.alignment = TextAlignmentOptions.Left;
            text.color = new Color(0.8f, 0.8f, 0.8f, 1f);

            return go;
        }

        /// <summary>
        /// 显示行军信息（距离和预计时间）
        /// </summary>
        private void DisplayMarchInfo(CityDetailData data)
        {
            if (distanceText != null)
            {
                distanceText.text = $"距离: {data.DistanceFromPlayer:F1} 格";
            }

            // 估算行军时间（步行为基准: 1格 = 60秒）
            float marchTimeSeconds = data.DistanceFromPlayer * 60f;
            int marchMinutes = Mathf.FloorToInt(marchTimeSeconds / 60f);
            int marchSeconds = Mathf.FloorToInt(marchTimeSeconds % 60f);

            if (estimatedMarchTimeText != null)
            {
                estimatedMarchTimeText.text = $"步行预计: {marchMinutes}分{marchSeconds}秒";
            }

            // 估算行军消耗（粮食消耗: 兵力 * 距离 * 0.5）
            int estimatedCost = Mathf.RoundToInt(500 * data.DistanceFromPlayer * 0.5f);
            if (marchCostText != null)
            {
                marchCostText.text = $"预计粮食消耗: {estimatedCost}";
            }
        }

        /// <summary>
        /// 显示争夺状态
        /// </summary>
        private void DisplayContestedStatus(CityDetailData data)
        {
            if (contestedBanner != null)
            {
                contestedBanner.SetActive(data.IsContested);
            }

            if (contestedText != null)
            {
                contestedText.text = data.IsContested ? "⚠ 此城池正在争夺中!" : "";
            }
        }

        /// <summary>
        /// 更新攻击按钮状态
        /// </summary>
        private void UpdateAttackButton(CityDetailData data)
        {
            if (attackButton != null)
            {
                // 己方城市不可攻击
                bool canAttack = data.OccupationStatus != 1;
                attackButton.interactable = canAttack;
            }

            if (attackButtonText != null)
            {
                attackButtonText.text = data.OccupationStatus switch
                {
                    0 => "占领",
                    1 => "己方城池",
                    2 => "攻击同盟",
                    3 => "攻击",
                    4 => "争夺战",
                    _ => "攻击"
                };
            }
        }

        // ==================== 按钮事件 ====================

        /// <summary>
        /// 注册按钮事件
        /// </summary>
        private void RegisterButtonEvents()
        {
            if (attackButton != null)
            {
                attackButton.onClick.AddListener(OnAttackClick);
            }

            if (scoutButton != null)
            {
                scoutButton.onClick.AddListener(OnScoutClick);
            }

            if (reinforceButton != null)
            {
                reinforceButton.onClick.AddListener(OnReinforceClick);
            }

            if (closeButton != null)
            {
                closeButton.onClick.AddListener(OnCloseClick);
            }
        }

        /// <summary>
        /// 取消注册按钮事件
        /// </summary>
        private void UnregisterButtonEvents()
        {
            if (attackButton != null) attackButton.onClick.RemoveAllListeners();
            if (scoutButton != null) scoutButton.onClick.RemoveAllListeners();
            if (reinforceButton != null) reinforceButton.onClick.RemoveAllListeners();
            if (closeButton != null) closeButton.onClick.RemoveAllListeners();
        }

        /// <summary>
        /// 攻击按钮点击 - 验证并打开行军面板
        /// </summary>
        private void OnAttackClick()
        {
            if (_cityDetail == null) return;

            // 验证：己方城池不可攻击
            if (_cityDetail.OccupationStatus == 1)
            {
                Debug.LogWarning("[CityInfoPanel] 不能攻击己方城池");
                return;
            }

            Debug.Log($"[CityInfoPanel] 发起攻击 - 目标: {_cityDetail.CityName}");

            // 关闭当前面板
            UIManager.Instance.ClosePanel(PanelName);

            // 打开行军面板，预选目标城市
            UIManager.Instance.OpenPanel("MarchPanel", _currentCityId);
        }

        /// <summary>
        /// 侦查按钮点击
        /// </summary>
        private void OnScoutClick()
        {
            if (_cityDetail == null) return;

            Debug.Log($"[CityInfoPanel] 侦查城市: {_cityDetail.CityName}");

            // 实际应调用MapApi.Scout
            // 显示侦查结果
        }

        /// <summary>
        /// 增援按钮点击
        /// </summary>
        private void OnReinforceClick()
        {
            if (_cityDetail == null) return;

            // 只有己方或同盟城市可以增援
            if (_cityDetail.OccupationStatus != 1 && _cityDetail.OccupationStatus != 2)
            {
                Debug.LogWarning("[CityInfoPanel] 只能增援己方或同盟城池");
                return;
            }

            Debug.Log($"[CityInfoPanel] 增援城市: {_cityDetail.CityName}");

            // 关闭当前面板
            UIManager.Instance.ClosePanel(PanelName);

            // 打开行军面板（增援模式）
            UIManager.Instance.OpenPanel("MarchPanel", new object[] { _currentCityId, true });
        }

        /// <summary>
        /// 关闭按钮点击
        /// </summary>
        private void OnCloseClick()
        {
            UIManager.Instance.ClosePanel(PanelName);
        }

        // ==================== 颜色工具 ====================

        /// <summary>
        /// 根据占领状态获取颜色
        /// </summary>
        private Color GetOccupationColor(int status)
        {
            return status switch
            {
                0 => NeutralColor,
                1 => OwnColor,
                2 => AllianceColor,
                3 => EnemyColor,
                _ => NeutralColor
            };
        }

        /// <summary>
        /// 根据占领状态获取文本颜色
        /// </summary>
        private Color GetOccupationTextColor(int status)
        {
            return status switch
            {
                0 => new Color(0.6f, 0.6f, 0.6f, 1f),
                1 => new Color(0.2f, 0.9f, 0.3f, 1f),
                2 => new Color(0.3f, 0.6f, 1f, 1f),
                3 => new Color(1f, 0.3f, 0.3f, 1f),
                _ => Color.white
            };
        }

        // ==================== 清理 ====================

        /// <summary>
        /// 清理动态创建的UI对象
        /// </summary>
        private void CleanupInstantiatedItems()
        {
            foreach (var item in _instantiatedItems)
            {
                if (item != null)
                {
                    Destroy(item);
                }
            }
            _instantiatedItems.Clear();
        }
    }

    // ==================== 连接城市项UI组件 ====================

    /// <summary>
    /// 连接城市项UI组件
    /// </summary>
    public class ConnectionCityItem : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI cityNameText;
        [SerializeField] private TextMeshProUGUI cityLevelText;
        [SerializeField] private Image statusIndicator;
        [SerializeField] private Button clickButton;

        private Action<int> _onClickCallback;
        private int _cityId;

        /// <summary>
        /// 设置连接城市信息
        /// </summary>
        public void Setup(ConnectedCityInfo conn, Action<int> onClickCallback)
        {
            _cityId = conn.CityId;
            _onClickCallback = onClickCallback;

            if (cityNameText != null)
            {
                cityNameText.text = conn.CityName;
            }

            if (cityLevelText != null)
            {
                cityLevelText.text = $"Lv.{conn.Level}";
            }

            if (statusIndicator != null)
            {
                statusIndicator.color = GetStatusColor(conn.OccupationStatus);
            }

            if (clickButton != null)
            {
                clickButton.onClick.AddListener(() => _onClickCallback?.Invoke(_cityId));
            }
        }

        private Color GetStatusColor(int status)
        {
            return status switch
            {
                0 => new Color(0.6f, 0.6f, 0.6f, 1f),
                1 => new Color(0.2f, 0.8f, 0.3f, 1f),
                2 => new Color(0.3f, 0.5f, 0.9f, 1f),
                3 => new Color(0.9f, 0.2f, 0.2f, 1f),
                _ => Color.gray
            };
        }
    }

    // ==================== 战斗日志项UI组件 ====================

    /// <summary>
    /// 战斗日志项UI组件
    /// </summary>
    public class BattleLogItem : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI logText;
        [SerializeField] private Image resultIndicator;

        /// <summary>
        /// 设置战斗日志信息
        /// </summary>
        public void Setup(CityBattleLog log)
        {
            if (logText != null)
            {
                string battleTypeText = log.BattleType switch
                {
                    "attack" => "进攻",
                    "defense" => "防守",
                    "scout" => "侦查",
                    _ => log.BattleType
                };

                string resultMark = log.Result == "win" ? "✓ 胜利" : "✗ 失败";

                logText.text = $"[{log.Timestamp}] {log.AttackerGuildName}{battleTypeText}{log.DefenderGuildName} " +
                              $"{resultMark} ({log.AttackTroops} vs {log.DefenseTroops})";

                logText.color = log.Result == "win"
                    ? new Color(0.3f, 0.9f, 0.3f, 1f)
                    : new Color(0.9f, 0.4f, 0.4f, 1f);
            }

            if (resultIndicator != null)
            {
                resultIndicator.color = log.Result == "win" ? Color.green : Color.red;
            }
        }
    }
}
