using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using UnityEngine.EventSystems;
using TMPro;
using Jiuzhou.Zhengding.Core.UI;

namespace Jiuzhou.Zhengding.Module.Map
{
    /// <summary>
    /// 世界地图数据 - 从API获取的地图概览
    /// </summary>
    [Serializable]
    public class WorldMapData
    {
        public List<MapRegion> Regions;
        public List<MapCity> Cities;
        public List<MapConnection> Connections;
        public int PlayerCityCount;
        public int TotalCityCount;
        public int AllianceCityCount;
        public List<MarchOrderInfo> ActiveMarches;
    }

    /// <summary>
    /// 地图区域数据
    /// </summary>
    [Serializable]
    public class MapRegion
    {
        public int RegionId;
        public string RegionName;
        public float CenterX;
        public float CenterY;
        public int CityCount;
        public Color RegionColor;
    }

    /// <summary>
    /// 地图城市数据
    /// </summary>
    [Serializable]
    public class MapCity
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
        public float PositionX;   // 地图坐标X (0~1)
        public float PositionY;   // 地图坐标Y (0~1)
        public int OccupationStatus; // 0=中立, 1=己方, 2=同盟, 3=敌方, 4=争夺中
        public bool IsContested;    // 是否在战争中
        public int GoldProduction;
        public int FoodProduction;
        public int IronProduction;
        public int WoodProduction;
        public int DefenseStrength;
        public List<int> ConnectedCityIds;
    }

    /// <summary>
    /// 地图连接线数据
    /// </summary>
    [Serializable]
    public class MapConnection
    {
        public int FromCityId;
        public int ToCityId;
    }

    /// <summary>
    /// 行军订单信息
    /// </summary>
    [Serializable]
    public class MarchOrderInfo
    {
        public string MarchId;
        public int FromCityId;
        public string FromCityName;
        public int ToCityId;
        public string ToCityName;
        public string TroopType;
        public int TroopCount;
        public float Progress;     // 0~1
        public int RemainingSeconds;
        public string Status;      // marching, arrived, recalled
    }

    /// <summary>
    /// 地图过滤模式
    /// </summary>
    public enum MapFilterMode
    {
        All,       // 全部
        Owned,     // 己方
        Alliance,  // 同盟
        Enemy,     // 敌方
        Neutral,   // 中立
        Contested  // 争夺中
    }

    /// <summary>
    /// 世界地图面板 - 显示九州区划、城市节点、领地颜色、行军信息
    /// 支持缩放、平移、区域过滤、城市点击查看详情
    /// </summary>
    public class WorldMapPanel : UIBase
    {
        // ==================== UI引用 - 地图容器 ====================
        [Header("地图容器")]
        [SerializeField] private RectTransform mapContainer;
        [SerializeField] private ScrollRect mapScrollRect;
        [SerializeField] private RectTransform mapContent;

        // ==================== UI引用 - 区域按钮 ====================
        [Header("区域过滤")]
        [SerializeField] private Button[] regionButtons;
        [SerializeField] private GameObject regionFilterContainer;
        [SerializeField] private Toggle filterOwnedToggle;
        [SerializeField] private Toggle filterAllToggle;
        [SerializeField] private Toggle filterNeutralToggle;

        // ==================== UI引用 - 城市节点预制体 ====================
        [Header("城市节点")]
        [SerializeField] private GameObject cityNodePrefab;
        [SerializeField] private GameObject connectionLinePrefab;

        // ==================== UI引用 - 领地信息 ====================
        [Header("领地信息")]
        [SerializeField] private TextMeshProUGUI myTerritoryText;
        [SerializeField] private TextMeshProUGUI allianceTerritoryText;
        [SerializeField] private TextMeshProUGUI totalCitiesText;

        // ==================== UI引用 - 行军列表 ====================
        [Header("行军列表")]
        [SerializeField] private GameObject marchListPanel;
        [SerializeField] private Transform marchListContent;
        [SerializeField] private GameObject marchItemPrefab;
        [SerializeField] private Button marchListToggle;

        // ==================== UI引用 - 小地图 ====================
        [Header("小地图")]
        [SerializeField] private Image miniMapImage;
        [SerializeField] private RectTransform miniMapContent;

        // ==================== UI引用 - 缩放控制 ====================
        [Header("缩放控制")]
        [SerializeField] private Slider zoomSlider;
        [SerializeField] private float minZoom = 0.5f;
        [SerializeField] private float maxZoom = 2.0f;
        [SerializeField] private Button zoomInButton;
        [SerializeField] private Button zoomOutButton;

        // ==================== UI引用 - 搜索 ====================
        [Header("搜索")]
        [SerializeField] private TMP_InputField searchInput;
        [SerializeField] private Button searchButton;

        // ==================== UI引用 - 其他按钮 ====================
        [Header("操作按钮")]
        [SerializeField] private Button marchOrderButton;
        [SerializeField] private Button backButton;

        // ==================== 常量 ====================
        private const float MAP_WIDTH = 2000f;
        private const float MAP_HEIGHT = 1500f;
        private const float CITY_NODE_SIZE = 60f;
        private const float MARCH_REFRESH_INTERVAL = 5f;

        // ==================== 颜色定义 ====================
        private static readonly Color NeutralColor = new Color(0.6f, 0.6f, 0.6f, 1f);
        private static readonly Color OwnGuildColor = new Color(0.2f, 0.8f, 0.3f, 1f);
        private static readonly Color AllianceColor = new Color(0.3f, 0.5f, 0.9f, 1f);
        private static readonly Color EnemyColor = new Color(0.9f, 0.2f, 0.2f, 1f);
        private static readonly Color ContestedColor = new Color(1.0f, 0.5f, 0.1f, 1f);
        private static readonly Color ConnectionLineColor = new Color(0.5f, 0.5f, 0.5f, 0.4f);

        // ==================== 运行时变量 ====================
        private WorldMapData _mapData;
        private Dictionary<int, GameObject> _cityNodeDict = new Dictionary<int, GameObject>();
        private List<GameObject> _connectionLines = new List<GameObject>();
        private List<GameObject> _marchItems = new List<GameObject>();
        private MapFilterMode _currentFilter = MapFilterMode.All;
        private int _selectedRegionId = -1;
        private Coroutine _marchRefreshCoroutine;
        private Coroutine _contestedFlashCoroutine;
        private float _currentZoom = 1f;

        /// <summary>
        /// 面板名称
        /// </summary>
        public override string PanelName => "WorldMapPanel";

        /// <summary>
        /// 面板打开 - 加载地图数据，渲染城市和连接线
        /// </summary>
        public override void OnOpen(params object[] args)
        {
            Debug.Log("[WorldMapPanel] 打开世界地图面板");

            // 注册按钮事件
            RegisterButtonEvents();

            // 初始化缩放
            InitializeZoom();

            // 隐藏行军列表面板
            if (marchListPanel != null)
            {
                marchListPanel.SetActive(false);
            }

            // 加载地图数据
            StartCoroutine(LoadMapData());
        }

        /// <summary>
        /// 面板关闭 - 清理资源
        /// </summary>
        public override void OnClose()
        {
            UnregisterButtonEvents();

            // 停止行军刷新
            if (_marchRefreshCoroutine != null)
            {
                StopCoroutine(_marchRefreshCoroutine);
                _marchRefreshCoroutine = null;
            }

            // 停止争夺城市闪烁
            if (_contestedFlashCoroutine != null)
            {
                StopCoroutine(_contestedFlashCoroutine);
                _contestedFlashCoroutine = null;
            }

            // 清理动态创建的UI
            CleanupDynamicUI();

            Debug.Log("[WorldMapPanel] 世界地图面板已关闭");
        }

        /// <summary>
        /// 面板刷新
        /// </summary>
        public override void OnRefresh()
        {
            StartCoroutine(LoadMapData());
        }

        // ==================== 数据加载 ====================

        /// <summary>
        /// 加载地图数据 - 从MapApi获取
        /// </summary>
        private IEnumerator LoadMapData()
        {
            Debug.Log("[WorldMapPanel] 正在加载地图数据...");

            // 实际应调用: StartCoroutine(MapApi.Instance.GetOverview(callback))
            // 这里生成模拟数据进行测试
            yield return StartCoroutine(GenerateMockMapData());

            // 渲染地图
            RenderMap();

            // 更新领地信息
            UpdateTerritoryInfo();

            // 加载行军列表
            StartCoroutine(LoadActiveMarches());

            // 启动行军自动刷新
            StartMarchRefresh();
        }

        /// <summary>
        /// 生成模拟地图数据（PVE测试用）
        /// </summary>
        private IEnumerator GenerateMockMapData()
        {
            _mapData = new WorldMapData();

            // 九大区域
            _mapData.Regions = new List<MapRegion>
            {
                new MapRegion { RegionId = 1, RegionName = "冀州", CenterX = 0.2f, CenterY = 0.2f, CityCount = 4, RegionColor = new Color(0.8f, 0.6f, 0.4f) },
                new MapRegion { RegionId = 2, RegionName = "兖州", CenterX = 0.35f, CenterY = 0.3f, CityCount = 4, RegionColor = new Color(0.6f, 0.7f, 0.5f) },
                new MapRegion { RegionId = 3, RegionName = "青州", CenterX = 0.2f, CenterY = 0.45f, CityCount = 4, RegionColor = new Color(0.5f, 0.6f, 0.8f) },
                new MapRegion { RegionId = 4, RegionName = "徐州", CenterX = 0.5f, CenterY = 0.45f, CityCount = 4, RegionColor = new Color(0.7f, 0.5f, 0.6f) },
                new MapRegion { RegionId = 5, RegionName = "豫州", CenterX = 0.4f, CenterY = 0.55f, CityCount = 4, RegionColor = new Color(0.8f, 0.7f, 0.4f) },
                new MapRegion { RegionId = 6, RegionName = "荆州", CenterX = 0.5f, CenterY = 0.7f, CityCount = 4, RegionColor = new Color(0.4f, 0.7f, 0.6f) },
                new MapRegion { RegionId = 7, RegionName = "扬州", CenterX = 0.7f, CenterY = 0.7f, CityCount = 4, RegionColor = new Color(0.6f, 0.5f, 0.8f) },
                new MapRegion { RegionId = 8, RegionName = "益州", CenterX = 0.2f, CenterY = 0.7f, CityCount = 4, RegionColor = new Color(0.5f, 0.8f, 0.5f) },
                new MapRegion { RegionId = 9, RegionName = "凉州", CenterX = 0.15f, CenterY = 0.4f, CityCount = 4, RegionColor = new Color(0.7f, 0.7f, 0.7f) }
            };

            // 模拟36个城市的名字
            string[] cityNames = new string[]
            {
                "邺城", "南皮", "平原", "渤海",
                "濮阳", "陈留", "济阴", "任城",
                "北海", "济南", "乐安", "琅琊",
                "彭城", "下邳", "广陵", "寿春",
                "许昌", "汝南", "陈国", "颍川",
                "襄阳", "江陵", "武陵", "长沙",
                "建业", "会稽", "庐江", "柴桑",
                "成都", "汉中", "永安", "南中",
                "长安", "安定", "天水", "西凉"
            };

            // 生成城市数据
            _mapData.Cities = new List<MapCity>();
            System.Random rng = new System.Random(42);

            for (int i = 0; i < cityNames.Length; i++)
            {
                int regionIndex = i / 4;
                MapRegion region = _mapData.Regions[regionIndex];

                // 在区域中心附近随机分布
                float offsetX = (i % 4 - 1.5f) * 0.08f + (rng.NextFloat() - 0.5f) * 0.05f;
                float offsetY = ((i % 2) - 0.5f) * 0.1f + (rng.NextFloat() - 0.5f) * 0.05f;

                // 分散到不同位置
                float posX = Mathf.Clamp(region.CenterX + offsetX, 0.05f, 0.95f);
                float posY = Mathf.Clamp(region.CenterY + offsetY, 0.05f, 0.95f);

                // 随机占领状态
                int occupation = 0; // 中立
                if (i < 3)
                {
                    occupation = 1; // 己方
                }
                else if (i < 6)
                {
                    occupation = 2; // 同盟
                }
                else if (i < 10)
                {
                    occupation = 3; // 敌方
                }
                else if (i == 15 || i == 20)
                {
                    occupation = 4; // 争夺中
                }

                _mapData.Cities.Add(new MapCity
                {
                    CityId = i + 1,
                    CityName = cityNames[i],
                    Level = rng.Next(1, 6),
                    RegionId = region.RegionId,
                    RegionName = region.RegionName,
                    OwnerGuildId = occupation > 0 ? (1000 + occupation) : 0,
                    OwnerGuildName = occupation == 1 ? "蜀汉盟" : occupation == 2 ? "东吴盟" : occupation == 3 ? "曹魏盟" : "",
                    OwnerPlayerId = occupation == 1 ? 1001 : 0,
                    OwnerPlayerName = occupation == 1 ? "主公" : "",
                    PositionX = posX,
                    PositionY = posY,
                    OccupationStatus = occupation,
                    IsContested = occupation == 4,
                    GoldProduction = 50 + i * 10,
                    FoodProduction = 40 + i * 8,
                    IronProduction = 30 + i * 5,
                    WoodProduction = 35 + i * 6,
                    DefenseStrength = 100 + i * 20,
                    ConnectedCityIds = new List<int>()
                });
            }

            // 生成连接关系
            _mapData.Connections = new List<MapConnection>();
            int[][] connectionPairs = new int[][]
            {
                new int[] { 1, 2 }, new int[] { 2, 3 }, new int[] { 3, 4 }, new int[] { 1, 3 },
                new int[] { 5, 6 }, new int[] { 6, 7 }, new int[] { 7, 8 }, new int[] { 5, 2 },
                new int[] { 9, 10 }, new int[] { 10, 11 }, new int[] { 11, 12 }, new int[] { 9, 3 },
                new int[] { 13, 14 }, new int[] { 14, 15 }, new int[] { 15, 16 }, new int[] { 13, 11 },
                new int[] { 17, 18 }, new int[] { 18, 19 }, new int[] { 19, 20 }, new int[] { 17, 7 },
                new int[] { 21, 22 }, new int[] { 22, 23 }, new int[] { 23, 24 }, new int[] { 21, 19 },
                new int[] { 25, 26 }, new int[] { 26, 27 }, new int[] { 27, 28 }, new int[] { 25, 16 },
                new int[] { 29, 30 }, new int[] { 30, 31 }, new int[] { 31, 32 }, new int[] { 29, 19 },
                new int[] { 33, 34 }, new int[] { 34, 35 }, new int[] { 35, 36 }, new int[] { 33, 1 },
                new int[] { 17, 21 }, new int[] { 21, 25 }, new int[] { 25, 28 }, new int[] { 28, 22 }
            };

            foreach (var pair in connectionPairs)
            {
                if (pair.Length == 2)
                {
                    _mapData.Connections.Add(new MapConnection { FromCityId = pair[0], ToCityId = pair[1] });

                    // 更新城市的连接列表
                    var fromCity = _mapData.Cities.Find(c => c.CityId == pair[0]);
                    var toCity = _mapData.Cities.Find(c => c.CityId == pair[1]);
                    if (fromCity != null && !fromCity.ConnectedCityIds.Contains(pair[1]))
                    {
                        fromCity.ConnectedCityIds.Add(pair[1]);
                    }
                    if (toCity != null && !toCity.ConnectedCityIds.Contains(pair[0]))
                    {
                        toCity.ConnectedCityIds.Add(pair[0]);
                    }
                }
            }

            // 统计领地
            _mapData.PlayerCityCount = _mapData.Cities.FindAll(c => c.OccupationStatus == 1).Count;
            _mapData.AllianceCityCount = _mapData.Cities.FindAll(c => c.OccupationStatus == 2).Count;
            _mapData.TotalCityCount = _mapData.Cities.Count;

            // 模拟行军订单
            _mapData.ActiveMarches = new List<MarchOrderInfo>
            {
                new MarchOrderInfo
                {
                    MarchId = "march_001",
                    FromCityId = 1,
                    FromCityName = "邺城",
                    ToCityId = 5,
                    ToCityName = "濮阳",
                    TroopType = "Infantry",
                    TroopCount = 500,
                    Progress = 0.65f,
                    RemainingSeconds = 120,
                    Status = "marching"
                },
                new MarchOrderInfo
                {
                    MarchId = "march_002",
                    FromCityId = 2,
                    FromCityName = "南皮",
                    ToCityId = 13,
                    ToCityName = "彭城",
                    TroopType = "Cavalry",
                    TroopCount = 300,
                    Progress = 0.3f,
                    RemainingSeconds = 300,
                    Status = "marching"
                }
            };

            yield return null;
        }

        // ==================== 地图渲染 ====================

        /// <summary>
        /// 渲染地图 - 创建城市节点和连接线
        /// </summary>
        private void RenderMap()
        {
            if (_mapData == null || mapContent == null) return;

            // 清理旧UI
            CleanupDynamicUI();

            // 设置地图内容大小
            mapContent.sizeDelta = new Vector2(MAP_WIDTH, MAP_HEIGHT);

            // 绘制连接线
            RenderConnections();

            // 绘制城市节点
            RenderCityNodes();

            // 启动争夺城市闪烁动画
            StartContestedFlash();
        }

        /// <summary>
        /// 渲染城市连接线
        /// </summary>
        private void RenderConnections()
        {
            if (_mapData.Connections == null || connectionLinePrefab == null) return;

            foreach (var connection in _mapData.Connections)
            {
                var fromCity = _mapData.Cities.Find(c => c.CityId == connection.FromCityId);
                var toCity = _mapData.Cities.Find(c => c.CityId == connection.ToCityId);
                if (fromCity == null || toCity == null) continue;

                // 计算屏幕坐标
                Vector2 fromPos = new Vector2(fromCity.PositionX * MAP_WIDTH, fromCity.PositionY * MAP_HEIGHT);
                Vector2 toPos = new Vector2(toCity.PositionX * MAP_WIDTH, toCity.PositionY * MAP_HEIGHT);

                // 创建连接线
                GameObject lineGo = Instantiate(connectionLinePrefab, mapContent);
                _connectionLines.Add(lineGo);

                // 使用LineRenderer或Image绘制线条
                // 这里使用拉伸Image模拟线条
                Image lineImage = lineGo.GetComponent<Image>();
                if (lineImage != null)
                {
                    lineImage.color = ConnectionLineColor;
                }

                // 计算位置和旋转
                RectTransform lineRect = lineGo.GetComponent<RectTransform>();
                float distance = Vector2.Distance(fromPos, toPos);
                float angle = Mathf.Atan2(toPos.y - fromPos.y, toPos.x - fromPos.x) * Mathf.Rad2Deg;

                Vector2 centerPos = (fromPos + toPos) / 2f;
                lineRect.localPosition = centerPos;
                lineRect.sizeDelta = new Vector2(distance, 2f);
                lineRect.localEulerAngles = new Vector3(0f, 0f, angle);
            }
        }

        /// <summary>
        /// 渲染城市节点
        /// </summary>
        private void RenderCityNodes()
        {
            if (_mapData.Cities == null || cityNodePrefab == null) return;

            foreach (var city in _mapData.Cities)
            {
                // 检查过滤
                if (!IsCityVisible(city))
                {
                    continue;
                }

                // 创建城市节点
                GameObject cityGo = Instantiate(cityNodePrefab, mapContent);
                _cityNodeDict[city.CityId] = cityGo;

                // 设置位置
                RectTransform cityRect = cityGo.GetComponent<RectTransform>();
                float posX = city.PositionX * MAP_WIDTH;
                float posY = city.PositionY * MAP_HEIGHT;
                cityRect.localPosition = new Vector2(posX, posY);
                cityRect.sizeDelta = new Vector2(CITY_NODE_SIZE, CITY_NODE_SIZE);

                // 设置城市节点UI
                var cityNode = cityGo.GetComponent<CityNodeUI>();
                if (cityNode != null)
                {
                    cityNode.Setup(city);
                }
                else
                {
                    // 简单设置文本
                    SetupSimpleCityNode(cityGo, city);
                }

                // 注册点击事件
                Button cityButton = cityGo.GetComponent<Button>();
                if (cityButton == null)
                {
                    cityButton = cityGo.AddComponent<Button>();
                }
                int capturedCityId = city.CityId; // 闭包捕获
                cityButton.onClick.AddListener(() => OnCityClick(capturedCityId));
            }
        }

        /// <summary>
        /// 简单城市节点设置（无CityNodeUI组件时）
        /// </summary>
        private void SetupSimpleCityNode(GameObject cityGo, MapCity city)
        {
            // 设置背景颜色
            Image bgImage = cityGo.GetComponent<Image>();
            if (bgImage != null)
            {
                bgImage.color = GetOccupationColor(city.OccupationStatus);
            }

            // 设置城市名称
            var texts = cityGo.GetComponentsInChildren<TextMeshProUGUI>();
            if (texts.Length > 0)
            {
                texts[0].text = city.CityName;
            }
            if (texts.Length > 1)
            {
                texts[1].text = $"Lv.{city.Level}";
            }
        }

        // ==================== 过滤和搜索 ====================

        /// <summary>
        /// 检查城市是否在当前过滤条件下可见
        /// </summary>
        private bool IsCityVisible(MapCity city)
        {
            // 区域过滤
            if (_selectedRegionId > 0 && city.RegionId != _selectedRegionId)
            {
                return false;
            }

            // 占领状态过滤
            switch (_currentFilter)
            {
                case MapFilterMode.All:
                    return true;
                case MapFilterMode.Owned:
                    return city.OccupationStatus == 1;
                case MapFilterMode.Alliance:
                    return city.OccupationStatus == 2;
                case MapFilterMode.Enemy:
                    return city.OccupationStatus == 3;
                case MapFilterMode.Neutral:
                    return city.OccupationStatus == 0;
                case MapFilterMode.Contested:
                    return city.IsContested;
                default:
                    return true;
            }
        }

        /// <summary>
        /// 区域过滤按钮点击
        /// </summary>
        private void OnRegionFilterClick(int regionId)
        {
            if (_selectedRegionId == regionId)
            {
                _selectedRegionId = -1; // 取消过滤
            }
            else
            {
                _selectedRegionId = regionId;
            }

            Debug.Log($"[WorldMapPanel] 区域过滤: {_selectedRegionId}");
            RenderMap(); // 重新渲染
        }

        /// <summary>
        /// 搜索城市
        /// </summary>
        private void OnSearchClick()
        {
            string query = searchInput != null ? searchInput.text.Trim() : "";
            if (string.IsNullOrEmpty(query))
            {
                _selectedRegionId = -1;
                _currentFilter = MapFilterMode.All;
                RenderMap();
                return;
            }

            // 搜索城市名称匹配
            bool found = false;
            foreach (var city in _mapData.Cities)
            {
                if (city.CityName.Contains(query))
                {
                    // 聚焦到该城市
                    FocusOnCity(city);
                    found = true;
                    break;
                }
            }

            if (!found)
            {
                Debug.Log($"[WorldMapPanel] 未找到城市: {query}");
            }
        }

        /// <summary>
        /// 聚焦到指定城市
        /// </summary>
        private void FocusOnCity(MapCity city)
        {
            if (mapScrollRect == null) return;

            // 计算城市在地图内容中的归一化位置
            Vector2 cityWorldPos = new Vector2(city.PositionX * MAP_WIDTH, city.PositionY * MAP_HEIGHT);
            Vector2 normalizedPos = new Vector2(
                city.PositionX,
                city.PositionY
            );

            // 滚动到目标位置
            StartCoroutine(SmoothScrollTo(normalizedPos));
        }

        /// <summary>
        /// 平滑滚动到目标位置
        /// </summary>
        private IEnumerator SmoothScrollTo(Vector2 targetNormalizedPos)
        {
            if (mapScrollRect == null) yield break;

            float duration = 0.5f;
            float elapsed = 0f;

            Vector2 startPos = mapScrollRect.normalizedPosition;
            Vector2 endPos = new Vector2(
                Mathf.Clamp01(targetNormalizedPos.x),
                Mathf.Clamp01(targetNormalizedPos.y)
            );

            while (elapsed < duration)
            {
                elapsed += Time.deltaTime;
                float t = elapsed / duration;
                float easedT = t * t * (3f - 2f * t);
                mapScrollRect.normalizedPosition = Vector2.Lerp(startPos, endPos, easedT);
                yield return null;
            }
        }

        // ==================== 城市点击 ====================

        /// <summary>
        /// 城市节点点击 - 打开城市详情面板
        /// </summary>
        private void OnCityClick(int cityId)
        {
            Debug.Log($"[WorldMapPanel] 点击城市: {cityId}");
            UIManager.Instance.OpenPanel("CityInfoPanel", cityId);
        }

        // ==================== 领地信息 ====================

        /// <summary>
        /// 更新领地信息显示
        /// </summary>
        private void UpdateTerritoryInfo()
        {
            if (_mapData == null) return;

            if (myTerritoryText != null)
            {
                myTerritoryText.text = $"己方城池: {_mapData.PlayerCityCount}";
            }

            if (allianceTerritoryText != null)
            {
                allianceTerritoryText.text = $"同盟城池: {_mapData.AllianceCityCount}";
            }

            if (totalCitiesText != null)
            {
                totalCitiesText.text = $"总城池数: {_mapData.TotalCityCount}";
            }
        }

        // ==================== 行军列表 ====================

        /// <summary>
        /// 加载活跃行军订单
        /// </summary>
        private IEnumerator LoadActiveMarches()
        {
            if (_mapData?.ActiveMarches == null) yield break;

            // 清理旧行军项
            foreach (var item in _marchItems)
            {
                if (item != null) Destroy(item);
            }
            _marchItems.Clear();

            foreach (var march in _mapData.ActiveMarches)
            {
                if (march.Status != "marching") continue;

                GameObject marchGo = marchItemPrefab != null
                    ? Instantiate(marchItemPrefab, marchListContent)
                    : new GameObject("MarchItem");

                _marchItems.Add(marchGo);

                // 设置行军信息
                var marchUI = marchGo.GetComponent<MarchItemUI>();
                if (marchUI != null)
                {
                    marchUI.Setup(march);
                }
                else
                {
                    // 简单文本显示
                    var text = marchGo.GetComponentInChildren<TextMeshProUGUI>();
                    if (text != null)
                    {
                        int etaMinutes = march.RemainingSeconds / 60;
                        text.text = $"{march.FromCityName} → {march.ToCityName} | {march.TroopType} {march.TroopCount} | ETA: {etaMinutes}分";
                    }
                }
            }
        }

        /// <summary>
        /// 启动行军自动刷新
        /// </summary>
        private void StartMarchRefresh()
        {
            if (_marchRefreshCoroutine != null)
            {
                StopCoroutine(_marchRefreshCoroutine);
            }
            _marchRefreshCoroutine = StartCoroutine(MarchRefreshLoop());
        }

        /// <summary>
        /// 行军刷新循环 - 每5秒刷新一次
        /// </summary>
        private IEnumerator MarchRefreshLoop()
        {
            while (true)
            {
                yield return new WaitForSeconds(MARCH_REFRESH_INTERVAL);

                // 刷新行军进度
                if (_mapData?.ActiveMarches != null)
                {
                    foreach (var march in _mapData.ActiveMarches)
                    {
                        if (march.Status == "marching")
                        {
                            march.Progress = Mathf.Min(1f, march.Progress + 0.02f);
                            march.RemainingSeconds = Mathf.Max(0, march.RemainingSeconds - 5);
                            if (march.Progress >= 1f)
                            {
                                march.Status = "arrived";
                            }
                        }
                    }

                    // 更新行军项UI
                    foreach (var item in _marchItems)
                    {
                        var marchUI = item?.GetComponent<MarchItemUI>();
                        marchUI?.RefreshProgress();
                    }
                }
            }
        }

        // ==================== 缩放和平移 ====================

        /// <summary>
        /// 初始化缩放控制
        /// </summary>
        private void InitializeZoom()
        {
            _currentZoom = 1f;

            if (zoomSlider != null)
            {
                zoomSlider.minValue = minZoom;
                zoomSlider.maxValue = maxZoom;
                zoomSlider.value = 1f;
                zoomSlider.onValueChanged.AddListener(OnZoomSliderChanged);
            }

            if (zoomInButton != null)
            {
                zoomInButton.onClick.AddListener(() => SetZoom(_currentZoom + 0.2f));
            }

            if (zoomOutButton != null)
            {
                zoomOutButton.onClick.AddListener(() => SetZoom(_currentZoom - 0.2f));
            }
        }

        /// <summary>
        /// 缩放滑块变化
        /// </summary>
        private void OnZoomSliderChanged(float value)
        {
            SetZoom(value);
        }

        /// <summary>
        /// 设置缩放级别
        /// </summary>
        private void SetZoom(float zoom)
        {
            _currentZoom = Mathf.Clamp(zoom, minZoom, maxZoom);

            if (mapContent != null)
            {
                mapContent.localScale = new Vector3(_currentZoom, _currentZoom, 1f);
            }

            if (zoomSlider != null)
            {
                zoomSlider.value = _currentZoom;
            }
        }

        // ==================== 争夺城市闪烁 ====================

        /// <summary>
        /// 启动争夺城市闪烁动画
        /// </summary>
        private void StartContestedFlash()
        {
            if (_contestedFlashCoroutine != null)
            {
                StopCoroutine(_contestedFlashCoroutine);
            }
            _contestedFlashCoroutine = StartCoroutine(ContestedFlashLoop());
        }

        /// <summary>
        /// 争夺城市闪烁循环
        /// </summary>
        private IEnumerator ContestedFlashLoop()
        {
            float flashSpeed = 2f;
            float time = 0f;

            while (true)
            {
                time += Time.deltaTime * flashSpeed;
                float pulse = (Mathf.Sin(time) + 1f) / 2f; // 0~1

                Color flashColor = Color.Lerp(
                    new Color(1f, 0.3f, 0.1f, 1f),  // 橙红
                    new Color(1f, 0.8f, 0.2f, 1f),  // 黄色
                    pulse
                );

                // 更新所有争夺中的城市节点颜色
                if (_mapData?.Cities != null)
                {
                    foreach (var city in _mapData.Cities)
                    {
                        if (city.IsContested && _cityNodeDict.TryGetValue(city.CityId, out var cityGo))
                        {
                            var cityNode = cityGo.GetComponent<CityNodeUI>();
                            if (cityNode != null)
                            {
                                cityNode.SetFlashColor(flashColor);
                            }
                            else
                            {
                                Image bgImage = cityGo.GetComponent<Image>();
                                if (bgImage != null)
                                {
                                    bgImage.color = flashColor;
                                }
                            }
                        }
                    }
                }

                yield return null;
            }
        }

        // ==================== 颜色工具 ====================

        /// <summary>
        /// 根据占领状态获取颜色
        /// </summary>
        private Color GetOccupationColor(int occupationStatus)
        {
            return occupationStatus switch
            {
                0 => NeutralColor,
                1 => OwnGuildColor,
                2 => AllianceColor,
                3 => EnemyColor,
                4 => ContestedColor,
                _ => NeutralColor
            };
        }

        // ==================== 按钮事件 ====================

        /// <summary>
        /// 注册按钮事件
        /// </summary>
        private void RegisterButtonEvents()
        {
            if (marchOrderButton != null)
            {
                marchOrderButton.onClick.AddListener(OnMarchOrderClick);
            }

            if (backButton != null)
            {
                backButton.onClick.AddListener(OnBackClick);
            }

            if (marchListToggle != null)
            {
                marchListToggle.onClick.AddListener(OnMarchListToggle);
            }

            if (searchButton != null)
            {
                searchButton.onClick.AddListener(OnSearchClick);
            }

            // 注册区域按钮
            for (int i = 0; i < regionButtons.Length; i++)
            {
                if (regionButtons[i] != null)
                {
                    int regionId = i + 1;
                    regionButtons[i].onClick.AddListener(() => OnRegionFilterClick(regionId));
                }
            }

            // 注册过滤Toggle
            if (filterAllToggle != null)
            {
                filterAllToggle.onValueChanged.AddListener(isOn =>
                {
                    if (isOn) { _currentFilter = MapFilterMode.All; RenderMap(); }
                });
            }
            if (filterOwnedToggle != null)
            {
                filterOwnedToggle.onValueChanged.AddListener(isOn =>
                {
                    if (isOn) { _currentFilter = MapFilterMode.Owned; RenderMap(); }
                });
            }
            if (filterNeutralToggle != null)
            {
                filterNeutralToggle.onValueChanged.AddListener(isOn =>
                {
                    if (isOn) { _currentFilter = MapFilterMode.Neutral; RenderMap(); }
                });
            }
        }

        /// <summary>
        /// 取消注册按钮事件
        /// </summary>
        private void UnregisterButtonEvents()
        {
            if (marchOrderButton != null) marchOrderButton.onClick.RemoveAllListeners();
            if (backButton != null) backButton.onClick.RemoveAllListeners();
            if (marchListToggle != null) marchListToggle.onClick.RemoveAllListeners();
            if (searchButton != null) searchButton.onClick.RemoveAllListeners();
            if (zoomSlider != null) zoomSlider.onValueChanged.RemoveAllListeners();
            if (zoomInButton != null) zoomInButton.onClick.RemoveAllListeners();
            if (zoomOutButton != null) zoomOutButton.onClick.RemoveAllListeners();

            foreach (var btn in regionButtons)
            {
                btn?.onClick.RemoveAllListeners();
            }

            if (filterAllToggle != null) filterAllToggle.onValueChanged.RemoveAllListeners();
            if (filterOwnedToggle != null) filterOwnedToggle.onValueChanged.RemoveAllListeners();
            if (filterNeutralToggle != null) filterNeutralToggle.onValueChanged.RemoveAllListeners();
        }

        /// <summary>
        /// 行军按钮点击 - 打开行军面板
        /// </summary>
        private void OnMarchOrderClick()
        {
            UIManager.Instance.OpenPanel("MarchPanel", null);
        }

        /// <summary>
        /// 返回按钮点击
        /// </summary>
        private void OnBackClick()
        {
            UIManager.Instance.ClosePanel(PanelName);
            UIManager.Instance.OpenPanel("MainCityPanel");
        }

        /// <summary>
        /// 行军列表切换
        /// </summary>
        private void OnMarchListToggle()
        {
            if (marchListPanel != null)
            {
                marchListPanel.SetActive(!marchListPanel.activeSelf);
            }
        }

        // ==================== 清理 ====================

        /// <summary>
        /// 清理动态创建的UI对象
        /// </summary>
        private void CleanupDynamicUI()
        {
            foreach (var kvp in _cityNodeDict)
            {
                if (kvp.Value != null)
                {
                    Destroy(kvp.Value);
                }
            }
            _cityNodeDict.Clear();

            foreach (var line in _connectionLines)
            {
                if (line != null)
                {
                    Destroy(line);
                }
            }
            _connectionLines.Clear();

            foreach (var item in _marchItems)
            {
                if (item != null)
                {
                    Destroy(item);
                }
            }
            _marchItems.Clear();
        }
    }

    // ==================== 城市节点UI组件 ====================

    /// <summary>
    /// 城市节点UI组件 - 显示单个城市的名称、等级、占领状态
    /// </summary>
    public class CityNodeUI : MonoBehaviour
    {
        [SerializeField] private Image backgroundImage;
        [SerializeField] private Image levelIndicator;
        [SerializeField] private TextMeshProUGUI cityNameText;
        [SerializeField] private TextMeshProUGUI cityLevelText;
        [SerializeField] private Image resourceIconGold;
        [SerializeField] private Image resourceIconFood;
        [SerializeField] private GameObject guildBanner;

        private MapCity _cityData;

        /// <summary>
        /// 设置城市数据
        /// </summary>
        public void Setup(MapCity city)
        {
            _cityData = city;

            // 城市名称
            if (cityNameText != null)
            {
                cityNameText.text = city.CityName;
            }

            // 城市等级
            if (cityLevelText != null)
            {
                cityLevelText.text = $"Lv.{city.Level}";
            }

            // 背景颜色
            if (backgroundImage != null)
            {
                backgroundImage.color = GetOccupationColor(city.OccupationStatus);
            }

            // 等级指示器大小
            if (levelIndicator != null)
            {
                float size = 30f + city.Level * 5f;
                levelIndicator.rectTransform.sizeDelta = new Vector2(size, size);
            }

            // 工会旗帜
            if (guildBanner != null)
            {
                guildBanner.SetActive(city.OccupationStatus == 1);
            }
        }

        /// <summary>
        /// 设置闪烁颜色（争夺中的城市）
        /// </summary>
        public void SetFlashColor(Color color)
        {
            if (backgroundImage != null && _cityData != null && _cityData.IsContested)
            {
                backgroundImage.color = color;
            }
        }

        private Color GetOccupationColor(int status)
        {
            return status switch
            {
                0 => new Color(0.6f, 0.6f, 0.6f, 1f),
                1 => new Color(0.2f, 0.8f, 0.3f, 1f),
                2 => new Color(0.3f, 0.5f, 0.9f, 1f),
                3 => new Color(0.9f, 0.2f, 0.2f, 1f),
                4 => new Color(1.0f, 0.5f, 0.1f, 1f),
                _ => Color.gray
            };
        }
    }

    // ==================== 行军项UI组件 ====================

    /// <summary>
    /// 行军项UI组件 - 显示单个行军订单的信息
    /// </summary>
    public class MarchItemUI : MonoBehaviour
    {
        [SerializeField] private TextMeshProUGUI marchRouteText;
        [SerializeField] private TextMeshProUGUI marchInfoText;
        [SerializeField] private TextMeshProUGUI marchEtaText;
        [SerializeField] private Image progressBarFill;
        [SerializeField] private Button recallButton;

        private MarchOrderInfo _marchData;

        /// <summary>
        /// 设置行军数据
        /// </summary>
        public void Setup(MarchOrderInfo march)
        {
            _marchData = march;
            RefreshProgress();
        }

        /// <summary>
        /// 刷新进度显示
        /// </summary>
        public void RefreshProgress()
        {
            if (_marchData == null) return;

            if (marchRouteText != null)
            {
                marchRouteText.text = $"{_marchData.FromCityName} → {_marchData.ToCityName}";
            }

            if (marchInfoText != null)
            {
                string troopName = GetTroopTypeName(_marchData.TroopType);
                marchInfoText.text = $"{troopName} {_marchData.TroopCount}人";
            }

            if (marchEtaText != null)
            {
                int minutes = _marchData.RemainingSeconds / 60;
                int seconds = _marchData.RemainingSeconds % 60;
                marchEtaText.text = $"ETA: {minutes:D2}:{seconds:D2}";
            }

            if (progressBarFill != null)
            {
                progressBarFill.fillAmount = _marchData.Progress;
            }
        }

        private string GetTroopTypeName(string type)
        {
            return type switch
            {
                "Infantry" => "步兵",
                "Cavalry" => "骑兵",
                "Archer" => "弓兵",
                "Siege" => "攻城",
                _ => type
            };
        }
    }
}
