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
    /// 兵种枚举
    /// </summary>
    public enum TroopType
    {
        Infantry = 0,  // 步兵 - 均衡型
        Cavalry = 1,   // 骑兵 - 速度最快
        Archer = 2,    // 弓兵 - 远程优势
        Siege = 3      // 攻城 - 速度最慢，攻城加成
    }

    /// <summary>
    /// 兵种配置数据
    /// </summary>
    [Serializable]
    public class TroopConfig
    {
        public TroopType Type;
        public string Name;         // 显示名称
        public float Speed;         // 移动速度（格/分钟）
        public int Attack;          // 攻击力
        public int Defense;         // 防御力
        public float SiegeBonus;    // 攻城加成
        public int FoodCostPerUnit; // 每单位粮食消耗
        public string Description;  // 描述
        public Color IconColor;     // 图标颜色
    }

    /// <summary>
    /// 行军创建请求数据
    /// </summary>
    [Serializable]
    public class MarchCreateRequest
    {
        public int FromCityId;
        public int ToCityId;
        public TroopType TroopType;
        public int TroopCount;
        public bool IsReinforce;    // 是否增援
    }

    /// <summary>
    /// 行军创建响应数据
    /// </summary>
    [Serializable]
    public class MarchCreateResponse
    {
        public bool Success;
        public string MarchId;
        public string Message;
        public int RemainingTroops; // 剩余可用兵力
    }

    /// <summary>
    /// 活跃行军详情
    /// </summary>
    [Serializable]
    public class ActiveMarchDetail
    {
        public string MarchId;
        public int FromCityId;
        public string FromCityName;
        public int ToCityId;
        public string ToCityName;
        public TroopType TroopType;
        public int TroopCount;
        public float Progress;
        public int TotalSeconds;
        public int RemainingSeconds;
        public string Status;       // marching, arrived, returning, recalled
        public bool IsReinforce;
    }

    /// <summary>
    /// 行军面板 - 创建和管理行军订单
    /// 功能：选择目标城市、选择兵种、设置兵力、计算行军时间和消耗、
    /// 确认行军、查看活跃行军列表、召回行军
    /// </summary>
    public class MarchPanel : UIBase
    {
        // ==================== UI引用 - 目标信息 ====================
        [Header("目标信息")]
        [SerializeField] private TextMeshProUGUI targetCityText;
        [SerializeField] private TextMeshProUGUI targetRegionText;
        [SerializeField] private TextMeshProUGUI targetOwnerText;
        [SerializeField] private Image targetOccupationColor;

        // ==================== UI引用 - 兵种选择 ====================
        [Header("兵种选择")]
        [SerializeField] private TMP_Dropdown troopTypeDropdown;
        [SerializeField] private Image troopTypeIcon;
        [SerializeField] private TextMeshProUGUI troopTypeDescription;
        [SerializeField] private TextMeshProUGUI troopTypeStats;
        [SerializeField] private GameObject[] troopTypeCards;

        // ==================== UI引用 - 兵力设置 ====================
        [Header("兵力设置")]
        [SerializeField] private Slider troopCountSlider;
        [SerializeField] private TextMeshProUGUI troopCountText;
        [SerializeField] private TextMeshProUGUI maxTroopText;
        [SerializeField] private Button troopMinusButton;
        [SerializeField] private Button troopPlusButton;
        [SerializeField] private int troopStep = 50;        // 兵力调节步长
        [SerializeField] private int minTroop = 100;        // 最小兵力

        // ==================== UI引用 - 行军信息 ====================
        [Header("行军信息")]
        [SerializeField] private TextMeshProUGUI estimatedTimeText;
        [SerializeField] private TextMeshProUGUI marchCostText;
        [SerializeField] private TextMeshProUGUI marchDistanceText;
        [SerializeField] private Image marchTimeBar;
        [SerializeField] private TextMeshProUGUI arrivalTimeText;

        // ==================== UI引用 - 操作按钮 ====================
        [Header("操作按钮")]
        [SerializeField] private Button confirmButton;
        [SerializeField] private Button cancelButton;
        [SerializeField] private Button reinforceModeButton;
        [SerializeField] private TextMeshProUGUI confirmButtonText;
        [SerializeField] private TextMeshProUGUI reinforceModeText;

        // ==================== UI引用 - 活跃行军列表 ====================
        [Header("活跃行军列表")]
        [SerializeField] private Transform activeMarchesList;
        [SerializeField] private GameObject marchItemPrefab;
        [SerializeField] private ScrollRect marchesScrollRect;
        [SerializeField] private TextMeshProUGUI activeMarchesCountText;

        // ==================== UI引用 - 源城市选择 ====================
        [Header("源城市选择")]
        [SerializeField] private TMP_Dropdown fromCityDropdown;

        // ==================== 兵种配置 ====================
        private static readonly TroopConfig[] TroopConfigs = new TroopConfig[]
        {
            new TroopConfig
            {
                Type = TroopType.Infantry,
                Name = "步兵",
                Speed = 1.0f,
                Attack = 10,
                Defense = 10,
                SiegeBonus = 0f,
                FoodCostPerUnit = 2,
                Description = "均衡型兵种，攻守兼备",
                IconColor = new Color(0.6f, 0.7f, 0.5f, 1f)
            },
            new TroopConfig
            {
                Type = TroopType.Cavalry,
                Name = "骑兵",
                Speed = 2.0f,
                Attack = 15,
                Defense = 8,
                SiegeBonus = 0f,
                FoodCostPerUnit = 3,
                Description = "速度最快，适合突袭和追击",
                IconColor = new Color(0.8f, 0.6f, 0.3f, 1f)
            },
            new TroopConfig
            {
                Type = TroopType.Archer,
                Name = "弓兵",
                Speed = 1.2f,
                Attack = 14,
                Defense = 6,
                SiegeBonus = 0.1f,
                FoodCostPerUnit = 2,
                Description = "远程攻击，对步兵有优势",
                IconColor = new Color(0.5f, 0.6f, 0.8f, 1f)
            },
            new TroopConfig
            {
                Type = TroopType.Siege,
                Name = "攻城器械",
                Speed = 0.5f,
                Attack = 20,
                Defense = 5,
                SiegeBonus = 0.5f,
                FoodCostPerUnit = 5,
                Description = "攻城加成50%，移动速度最慢",
                IconColor = new Color(0.7f, 0.5f, 0.4f, 1f)
            }
        };

        // ==================== 常量 ====================
        private const float BASE_MARCH_TIME_PER_UNIT = 30f;  // 步兵每格30秒
        private const float FOOD_COST_DISTANCE_FACTOR = 0.5f; // 粮食消耗距离系数
        private const int MAX_ACTIVE_MARCHES = 5;            // 最大同时行军数
        private const float MARCH_REFRESH_INTERVAL = 3f;     // 行军刷新间隔

        // ==================== 运行时变量 ====================
        private int _targetCityId;
        private string _targetCityName = "";
        private int _fromCityId = 1;
        private string _fromCityName = "邺城";
        private int _maxAvailableTroops = 2000;
        private int _currentTroopCount = 100;
        private TroopType _selectedTroopType = TroopType.Infantry;
        private bool _isReinforceMode = false;
        private float _marchDistance = 3f;
        private List<GameObject> _marchItemObjects = new List<GameObject>();
        private Coroutine _marchRefreshCoroutine;
        private ActiveMarchDetail[] _activeMarches = new ActiveMarchDetail[0];

        /// <summary>
        /// 面板名称
        /// </summary>
        public override string PanelName => "MarchPanel";

        /// <summary>
        /// 面板打开 - 初始化行军面板
        /// args: int targetCityId 或 (int targetCityId, bool isReinforce)
        /// </summary>
        public override void OnOpen(params object[] args)
        {
            Debug.Log("[MarchPanel] 打开行军面板");

            // 解析参数
            if (args != null && args.Length > 0)
            {
                _targetCityId = Convert.ToInt32(args[0]);
                if (args.Length > 1 && args[1] is bool reinforce)
                {
                    _isReinforceMode = reinforce;
                }
            }
            else
            {
                _targetCityId = 0; // 无预设目标
            }

            // 注册事件
            RegisterEvents();

            // 初始化兵种下拉菜单
            InitializeTroopDropdown();

            // 初始化源城市下拉菜单
            InitializeFromCityDropdown();

            // 设置兵力滑块
            InitializeTroopSlider();

            // 加载目标城市信息
            if (_targetCityId > 0)
            {
                StartCoroutine(LoadTargetCityInfo(_targetCityId));
            }
            else
            {
                SetDefaultTargetInfo();
            }

            // 加载活跃行军列表
            LoadActiveMarches();

            // 启动行军自动刷新
            StartMarchRefresh();

            // 更新增援模式显示
            UpdateReinforceMode();
        }

        /// <summary>
        /// 面板关闭 - 清理资源
        /// </summary>
        public override void OnClose()
        {
            UnregisterEvents();

            if (_marchRefreshCoroutine != null)
            {
                StopCoroutine(_marchRefreshCoroutine);
                _marchRefreshCoroutine = null;
            }

            CleanupMarchItems();
            Debug.Log("[MarchPanel] 行军面板已关闭");
        }

        /// <summary>
        /// 面板刷新
        /// </summary>
        public override void OnRefresh()
        {
            LoadActiveMarches();
            UpdateMarchCalculations();
        }

        // ==================== 初始化 ====================

        /// <summary>
        /// 初始化兵种下拉菜单
        /// </summary>
        private void InitializeTroopDropdown()
        {
            if (troopTypeDropdown == null) return;

            troopTypeDropdown.ClearOptions();

            var options = new List<TMP_Dropdown.OptionData>();
            foreach (var config in TroopConfigs)
            {
                options.Add(new TMP_Dropdown.OptionData(config.Name));
            }
            troopTypeDropdown.AddOptions(options);

            // 默认选中步兵
            troopTypeDropdown.value = 0;
            _selectedTroopType = TroopType.Infantry;
            UpdateTroopTypeDisplay();

            troopTypeDropdown.onValueChanged.AddListener(OnTroopTypeChanged);
        }

        /// <summary>
        /// 初始化源城市下拉菜单
        /// </summary>
        private void InitializeFromCityDropdown()
        {
            if (fromCityDropdown == null) return;

            fromCityDropdown.ClearOptions();

            // 玩家拥有的城市列表（模拟数据）
            var options = new List<TMP_Dropdown.OptionData>
            {
                new TMP_Dropdown.OptionData("邺城"),
                new TMP_Dropdown.OptionData("南皮"),
                new TMP_Dropdown.OptionData("平原")
            };
            fromCityDropdown.AddOptions(options);

            fromCityDropdown.value = 0;
            fromCityDropdown.onValueChanged.AddListener(OnFromCityChanged);
        }

        /// <summary>
        /// 初始化兵力滑块
        /// </summary>
        private void InitializeTroopSlider()
        {
            if (troopCountSlider == null) return;

            troopCountSlider.minValue = minTroop;
            troopCountSlider.maxValue = _maxAvailableTroops;
            troopCountSlider.value = _currentTroopCount;
            troopCountSlider.wholeNumbers = true;

            troopCountSlider.onValueChanged.AddListener(OnTroopCountChanged);

            if (troopMinusButton != null)
            {
                troopMinusButton.onClick.AddListener(() => AdjustTroopCount(-troopStep));
            }

            if (troopPlusButton != null)
            {
                troopPlusButton.onClick.AddListener(() => AdjustTroopCount(troopStep));
            }

            if (maxTroopText != null)
            {
                maxTroopText.text = $"可用兵力: {_maxAvailableTroops}";
            }

            UpdateTroopCountDisplay();
        }

        // ==================== 数据加载 ====================

        /// <summary>
        /// 加载目标城市信息
        /// </summary>
        private IEnumerator LoadTargetCityInfo(int cityId)
        {
            // 模拟城市数据
            string[] cityNames = new string[]
            {
                "邺城", "南皮", "平原", "渤海", "濮阳", "许昌", "洛阳"
            };

            string[] regions = new string[]
            {
                "冀州", "冀州", "冀州", "冀州", "兖州", "豫州", "豫州"
            };

            int index = Mathf.Clamp(cityId - 1, 0, cityNames.Length - 1);
            _targetCityName = cityNames[index];

            if (targetCityText != null)
            {
                targetCityText.text = $"目标: {_targetCityName}";
            }

            if (targetRegionText != null)
            {
                targetRegionText.text = regions[index];
            }

            if (targetOwnerText != null)
            {
                // 己方城市标记
                if (index < 3)
                {
                    targetOwnerText.text = "己方城池";
                    targetOwnerText.color = new Color(0.2f, 0.9f, 0.3f, 1f);
                }
                else
                {
                    targetOwnerText.text = "敌方城池";
                    targetOwnerText.color = new Color(1f, 0.3f, 0.3f, 1f);
                }
            }

            // 计算距离（模拟）
            _marchDistance = 1f + index * 0.8f + UnityEngine.Random.Range(0f, 0.5f);

            yield return null;
        }

        /// <summary>
        /// 设置默认目标信息
        /// </summary>
        private void SetDefaultTargetInfo()
        {
            _targetCityName = "请选择目标";
            _marchDistance = 3f;

            if (targetCityText != null)
            {
                targetCityText.text = "目标: 未选择";
            }
            if (targetRegionText != null)
            {
                targetRegionText.text = "";
            }
            if (targetOwnerText != null)
            {
                targetOwnerText.text = "";
            }
        }

        // ==================== 行军计算 ====================

        /// <summary>
        /// 计算行军时间
        /// 基础时间 = 基准时间 * (距离 / 兵种速度)
        /// </summary>
        private float CalculateMarchTime(TroopType troopType, float distance)
        {
            TroopConfig config = GetTroopConfig(troopType);
            if (config == null) return 0f;

            // 行军时间 = 基础每格时间 * 距离 / 兵种速度倍率
            float timeSeconds = BASE_MARCH_TIME_PER_UNIT * distance / config.Speed;
            return Mathf.Max(0f, timeSeconds);
        }

        /// <summary>
        /// 计算行军粮食消耗
        /// 粮食消耗 = 兵力 * 距离 * 每单位消耗 * 距离系数
        /// </summary>
        private int CalculateMarchCost(TroopType troopType, int troopCount, float distance)
        {
            TroopConfig config = GetTroopConfig(troopType);
            if (config == null) return 0;

            int cost = Mathf.RoundToInt(troopCount * distance * config.FoodCostPerUnit * FOOD_COST_DISTANCE_FACTOR);
            return Mathf.Max(0, cost);
        }

        /// <summary>
        /// 更新所有行军相关计算和显示
        /// </summary>
        private void UpdateMarchCalculations()
        {
            float marchTime = CalculateMarchTime(_selectedTroopType, _marchDistance);
            int marchCost = CalculateMarchCost(_selectedTroopType, _currentTroopCount, _marchDistance);

            // 显示行军时间
            if (estimatedTimeText != null)
            {
                int minutes = Mathf.FloorToInt(marchTime / 60f);
                int seconds = Mathf.FloorToInt(marchTime % 60f);
                estimatedTimeText.text = $"预计行军: {minutes}分{seconds}秒";
            }

            // 显示粮食消耗
            if (marchCostText != null)
            {
                marchCostText.text = $"粮食消耗: {marchCost}";
            }

            // 显示距离
            if (marchDistanceText != null)
            {
                marchDistanceText.text = $"距离: {_marchDistance:F1} 格";
            }

            // 显示行军时间条
            if (marchTimeBar != null)
            {
                float maxTime = 600f; // 最大10分钟
                float fill = Mathf.Clamp01(marchTime / maxTime);
                marchTimeBar.fillAmount = fill;
                // 时间条颜色
                if (fill < 0.3f)
                {
                    marchTimeBar.color = Color.green;
                }
                else if (fill < 0.6f)
                {
                    marchTimeBar.color = Color.yellow;
                }
                else
                {
                    marchTimeBar.color = Color.red;
                }
            }

            // 显示预计到达时间
            if (arrivalTimeText != null)
            {
                DateTime arrival = DateTime.Now.AddSeconds(marchTime);
                arrivalTimeText.text = $"到达时间: {arrival:HH:mm}";
            }
        }

        // ==================== 事件处理 ====================

        /// <summary>
        /// 兵种选择变化
        /// </summary>
        private void OnTroopTypeChanged(int index)
        {
            if (index >= 0 && index < TroopConfigs.Length)
            {
                _selectedTroopType = TroopConfigs[index].Type;
                UpdateTroopTypeDisplay();
                UpdateMarchCalculations();
            }
        }

        /// <summary>
        /// 更新兵种显示
        /// </summary>
        private void UpdateTroopTypeDisplay()
        {
            TroopConfig config = GetTroopConfig(_selectedTroopType);
            if (config == null) return;

            // 更新兵种描述
            if (troopTypeDescription != null)
            {
                troopTypeDescription.text = config.Description;
            }

            // 更新兵种属性
            if (troopTypeStats != null)
            {
                string siegeText = config.SiegeBonus > 0 ? $"\n攻城加成: +{config.SiegeBonus * 100}%" : "";
                troopTypeStats.text = $"攻击: {config.Attack} | 防御: {config.Defense}\n速度: {config.Speed}x | 粮耗: {config.FoodCostPerUnit}/人{siegeText}";
            }

            // 更新兵种图标颜色
            if (troopTypeIcon != null)
            {
                troopTypeIcon.color = config.IconColor;
            }

            // 高亮选中的兵种卡片
            for (int i = 0; i < troopTypeCards.Length; i++)
            {
                if (troopTypeCards[i] != null)
                {
                    troopTypeCards[i].SetActive((int)config.Type == i);
                }
            }
        }

        /// <summary>
        /// 兵力变化
        /// </summary>
        private void OnTroopCountChanged(float value)
        {
            _currentTroopCount = Mathf.RoundToInt(value);
            _currentTroopCount = Mathf.Clamp(_currentTroopCount, minTroop, _maxAvailableTroops);
            UpdateTroopCountDisplay();
            UpdateMarchCalculations();
        }

        /// <summary>
        /// 调节兵力
        /// </summary>
        private void AdjustTroopCount(int delta)
        {
            int newValue = _currentTroopCount + delta;
            newValue = Mathf.Clamp(newValue, minTroop, _maxAvailableTroops);
            _currentTroopCount = newValue;

            if (troopCountSlider != null)
            {
                troopCountSlider.value = newValue;
            }

            UpdateTroopCountDisplay();
            UpdateMarchCalculations();
        }

        /// <summary>
        /// 更新兵力显示
        /// </summary>
        private void UpdateTroopCountDisplay()
        {
            if (troopCountText != null)
            {
                troopCountText.text = _currentTroopCount.ToString();
            }
        }

        /// <summary>
        /// 源城市变化
        /// </summary>
        private void OnFromCityChanged(int index)
        {
            string[] cityNames = new string[] { "邺城", "南皮", "平原" };
            int[] cityIds = new int[] { 1, 2, 3 };

            if (index >= 0 && index < cityNames.Length)
            {
                _fromCityId = cityIds[index];
                _fromCityName = cityNames[index];
            }
        }

        /// <summary>
        /// 确认行军按钮点击
        /// </summary>
        private void OnConfirmMarch()
        {
            // 验证
            if (_targetCityId <= 0)
            {
                Debug.LogWarning("[MarchPanel] 未选择目标城市");
                return;
            }

            if (_targetCityId == _fromCityId)
            {
                Debug.LogWarning("[MarchPanel] 不能向己方城市派遣行军（如需增援请使用增援模式）");
                return;
            }

            if (_currentTroopCount < minTroop)
            {
                Debug.LogWarning($"[MarchPanel] 兵力不足最低要求: {minTroop}");
                return;
            }

            if (_currentTroopCount > _maxAvailableTroops)
            {
                Debug.LogWarning("[MarchPanel] 可用兵力不足");
                return;
            }

            // 检查活跃行军数量限制
            if (_activeMarches.Length >= MAX_ACTIVE_MARCHES)
            {
                Debug.LogWarning($"[MarchPanel] 同时行军数已达上限: {MAX_ACTIVE_MARCHES}");
                return;
            }

            Debug.Log($"[MarchPanel] 确认行军: {_fromCityName} → {_targetCityName}, " +
                      $"兵种: {GetTroopConfig(_selectedTroopType)?.Name}, 兵力: {_currentTroopCount}");

            // 构建行军请求
            var request = new MarchCreateRequest
            {
                FromCityId = _fromCityId,
                ToCityId = _targetCityId,
                TroopType = _selectedTroopType,
                TroopCount = _currentTroopCount,
                IsReinforce = _isReinforceMode
            };

            // 发送行军请求
            StartCoroutine(SendMarchRequest(request));
        }

        /// <summary>
        /// 发送行军请求 - 调用MapApi
        /// </summary>
        private IEnumerator SendMarchRequest(MarchCreateRequest request)
        {
            // 实际应调用: StartCoroutine(MapApi.Instance.InitiateMarch(request, callback))
            // 这里模拟API响应
            yield return new WaitForSeconds(0.5f);

            bool success = true; // 模拟成功
            string marchId = $"march_{DateTime.Now.Ticks}";
            string message = success ? "行军已出发!" : "行军失败: 兵力不足";
            int remainingTroops = _maxAvailableTroops - request.TroopCount;

            // 处理响应
            if (success)
            {
                // 扣除兵力
                _maxAvailableTroops = remainingTroops;
                if (maxTroopText != null)
                {
                    maxTroopText.text = $"可用兵力: {_maxAvailableTroops}";
                }

                // 更新兵力滑块
                if (troopCountSlider != null)
                {
                    troopCountSlider.maxValue = _maxAvailableTroops;
                    if (_currentTroopCount > _maxAvailableTroops)
                    {
                        _currentTroopCount = _maxAvailableTroops;
                        troopCountSlider.value = _currentTroopCount;
                        UpdateTroopCountDisplay();
                    }
                }

                // 添加新的行军到列表
                AddActiveMarchToList(new ActiveMarchDetail
                {
                    MarchId = marchId,
                    FromCityId = request.FromCityId,
                    FromCityName = _fromCityName,
                    ToCityId = request.ToCityId,
                    ToCityName = _targetCityName,
                    TroopType = request.TroopType,
                    TroopCount = request.TroopCount,
                    Progress = 0f,
                    TotalSeconds = Mathf.RoundToInt(CalculateMarchTime(request.TroopType, _marchDistance)),
                    RemainingSeconds = Mathf.RoundToInt(CalculateMarchTime(request.TroopType, _marchDistance)),
                    Status = "marching",
                    IsReinforce = request.IsReinforce
                });

                // 在世界地图上创建行军动画标记
                // 实现方式: 在WorldMapPanel的mapContent下创建一个移动图标，
                // 使用协程根据行军进度更新图标位置（在fromCity和toCity之间插值）
                // 图标到达后触发到达事件并销毁图标
                Debug.Log($"[MarchPanel] 行军已创建: {marchId} - {_fromCityName} → {_targetCityName}");
            }
            else
            {
                Debug.LogWarning($"[MarchPanel] 行军失败: {message}");
            }
        }

        /// <summary>
        /// 取消按钮点击
        /// </summary>
        private void OnCancelClick()
        {
            UIManager.Instance.ClosePanel(PanelName);
        }

        /// <summary>
        /// 增援模式切换
        /// </summary>
        private void OnReinforceModeToggle()
        {
            _isReinforceMode = !_isReinforceMode;
            UpdateReinforceMode();
        }

        /// <summary>
        /// 更新增援模式显示
        /// </summary>
        private void UpdateReinforceMode()
        {
            if (reinforceModeText != null)
            {
                reinforceModeText.text = _isReinforceMode ? "模式: 增援" : "模式: 攻击";
                reinforceModeText.color = _isReinforceMode
                    ? new Color(0.2f, 0.8f, 0.3f, 1f)
                    : new Color(1f, 0.5f, 0.3f, 1f);
            }

            if (confirmButtonText != null)
            {
                confirmButtonText.text = _isReinforceMode ? "确认增援" : "确认出发";
            }
        }

        // ==================== 活跃行军管理 ====================

        /// <summary>
        /// 加载活跃行军列表
        /// </summary>
        private void LoadActiveMarches()
        {
            // 实际应调用: StartCoroutine(MapApi.Instance.ListMarches(callback))
            // 这里使用模拟数据
            _activeMarches = new ActiveMarchDetail[]
            {
                new ActiveMarchDetail
                {
                    MarchId = "march_001",
                    FromCityId = 1, FromCityName = "邺城",
                    ToCityId = 5, ToCityName = "濮阳",
                    TroopType = TroopType.Infantry, TroopCount = 500,
                    Progress = 0.65f, TotalSeconds = 180, RemainingSeconds = 63,
                    Status = "marching", IsReinforce = false
                },
                new ActiveMarchDetail
                {
                    MarchId = "march_002",
                    FromCityId = 2, FromCityName = "南皮",
                    ToCityId = 3, ToCityName = "平原",
                    TroopType = TroopType.Cavalry, TroopCount = 300,
                    Progress = 0.3f, TotalSeconds = 90, RemainingSeconds = 63,
                    Status = "marching", IsReinforce = true
                }
            };

            // 渲染行军列表
            RenderActiveMarches();
        }

        /// <summary>
        /// 渲染活跃行军列表
        /// </summary>
        private void RenderActiveMarches()
        {
            CleanupMarchItems();

            foreach (var march in _activeMarches)
            {
                if (march.Status != "marching") continue;

                GameObject itemGo = marchItemPrefab != null
                    ? Instantiate(marchItemPrefab, activeMarchesList)
                    : CreateSimpleMarchItem();

                _marchItemObjects.Add(itemGo);

                // 设置行军信息
                var marchUI = itemGo.GetComponent<ActiveMarchItemUI>();
                if (marchUI != null)
                {
                    marchUI.Setup(march, OnRecallClick, OnMarchItemClick);
                }
                else
                {
                    // 简单文本
                    var text = itemGo.GetComponentInChildren<TextMeshProUGUI>();
                    if (text != null)
                    {
                        string modeText = march.IsReinforce ? "[增援]" : "[攻击]";
                        string troopName = GetTroopConfig(march.TroopType)?.Name ?? "";
                        int etaMin = march.RemainingSeconds / 60;
                        int etaSec = march.RemainingSeconds % 60;
                        text.text = $"{modeText} {march.FromCityName} → {march.ToCityName} | {troopName} {march.TroopCount}人 | ETA: {etaMin:D2}:{etaSec:D2}";
                    }
                }
            }

            // 更新计数
            if (activeMarchesCountText != null)
            {
                int marchingCount = 0;
                foreach (var m in _activeMarches)
                {
                    if (m.Status == "marching") marchingCount++;
                }
                activeMarchesCountText.text = $"活跃行军: {marchingCount}/{MAX_ACTIVE_MARCHES}";
            }
        }

        /// <summary>
        /// 添加新的行军到列表
        /// </summary>
        private void AddActiveMarchToList(ActiveMarchDetail newMarch)
        {
            var newList = new List<ActiveMarchDetail>(_activeMarches);
            newList.Add(newMarch);
            _activeMarches = newList.ToArray();
            RenderActiveMarches();
        }

        /// <summary>
        /// 召回行军
        /// </summary>
        private void OnRecallClick(string marchId)
        {
            Debug.Log($"[MarchPanel] 召回行军: {marchId}");

            // 实际应调用: StartCoroutine(MapApi.Instance.RecallMarch(marchId, callback))
            // 这里模拟召回
            StartCoroutine(RecallMarch(marchId));
        }

        /// <summary>
        /// 执行召回操作
        /// </summary>
        private IEnumerator RecallMarch(string marchId)
        {
            yield return new WaitForSeconds(0.3f);

            // 从列表中移除
            var newList = new List<ActiveMarchDetail>();
            foreach (var march in _activeMarches)
            {
                if (march.MarchId != marchId)
                {
                    newList.Add(march);
                }
                else
                {
                    // 返还兵力（简化处理：返还50%）
                    _maxAvailableTroops = Mathf.Min(5000, _maxAvailableTroops + march.TroopCount / 2);
                }
            }
            _activeMarches = newList.ToArray();

            // 更新UI
            if (maxTroopText != null)
            {
                maxTroopText.text = $"可用兵力: {_maxAvailableTroops}";
            }
            if (troopCountSlider != null)
            {
                troopCountSlider.maxValue = _maxAvailableTroops;
            }

            RenderActiveMarches();
            Debug.Log($"[MarchPanel] 行军 {marchId} 已召回");
        }

        /// <summary>
        /// 行军项点击 - 查看行军详情
        /// </summary>
        private void OnMarchItemClick(string marchId)
        {
            Debug.Log($"[MarchPanel] 查看行军详情: {marchId}");
            // 可以展开显示更多信息
        }

        /// <summary>
        /// 行军自动刷新
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
        /// 行军刷新循环
        /// </summary>
        private IEnumerator MarchRefreshLoop()
        {
            while (true)
            {
                yield return new WaitForSeconds(MARCH_REFRESH_INTERVAL);

                bool updated = false;
                for (int i = 0; i < _activeMarches.Length; i++)
                {
                    var march = _activeMarches[i];
                    if (march.Status == "marching")
                    {
                        // 更新进度
                        float progressIncrement = 1f / march.TotalSeconds * MARCH_REFRESH_INTERVAL;
                        march.Progress = Mathf.Min(1f, march.Progress + progressIncrement);
                        march.RemainingSeconds = Mathf.Max(0,
                            march.RemainingSeconds - Mathf.RoundToInt(MARCH_REFRESH_INTERVAL));

                        if (march.Progress >= 1f)
                        {
                            march.Status = "arrived";
                            march.RemainingSeconds = 0;
                            Debug.Log($"[MarchPanel] 行军到达: {march.MarchId} - {march.ToCityName}");
                        }

                        _activeMarches[i] = march;
                        updated = true;
                    }
                }

                if (updated)
                {
                    // 更新行军项UI
                    for (int i = 0; i < _marchItemObjects.Count; i++)
                    {
                        if (i < _activeMarches.Length && _marchItemObjects[i] != null)
                        {
                            var marchUI = _marchItemObjects[i].GetComponent<ActiveMarchItemUI>();
                            marchUI?.RefreshProgress(_activeMarches[i]);
                        }
                    }

                    // 如果有行军到达，刷新列表
                    bool hasArrived = false;
                    foreach (var march in _activeMarches)
                    {
                        if (march.Status == "arrived") hasArrived = true;
                    }
                    if (hasArrived)
                    {
                        RenderActiveMarches();
                    }
                }
            }
        }

        // ==================== 工具方法 ====================

        /// <summary>
        /// 获取兵种配置
        /// </summary>
        private TroopConfig GetTroopConfig(TroopType type)
        {
            foreach (var config in TroopConfigs)
            {
                if (config.Type == type)
                {
                    return config;
                }
            }
            return TroopConfigs[0]; // 默认步兵
        }

        /// <summary>
        /// 创建简单的行军项
        /// </summary>
        private GameObject CreateSimpleMarchItem()
        {
            GameObject go = new GameObject("MarchItem");
            RectTransform rect = go.AddComponent<RectTransform>();
            rect.sizeDelta = new Vector2(500, 50);

            TextMeshProUGUI text = go.AddComponent<TextMeshProUGUI>();
            text.fontSize = 16;
            text.alignment = TextAlignmentOptions.Left;

            Button btn = go.AddComponent<Button>();
            return go;
        }

        // ==================== 事件注册 ====================

        /// <summary>
        /// 注册事件
        /// </summary>
        private void RegisterEvents()
        {
            if (confirmButton != null)
            {
                confirmButton.onClick.AddListener(OnConfirmMarch);
            }
            if (cancelButton != null)
            {
                cancelButton.onClick.AddListener(OnCancelClick);
            }
            if (reinforceModeButton != null)
            {
                reinforceModeButton.onClick.AddListener(OnReinforceModeToggle);
            }
        }

        /// <summary>
        /// 取消注册事件
        /// </summary>
        private void UnregisterEvents()
        {
            if (confirmButton != null) confirmButton.onClick.RemoveAllListeners();
            if (cancelButton != null) cancelButton.onClick.RemoveAllListeners();
            if (reinforceModeButton != null) reinforceModeButton.onClick.RemoveAllListeners();
            if (troopTypeDropdown != null) troopTypeDropdown.onValueChanged.RemoveAllListeners();
            if (fromCityDropdown != null) fromCityDropdown.onValueChanged.RemoveAllListeners();
            if (troopCountSlider != null) troopCountSlider.onValueChanged.RemoveAllListeners();
            if (troopMinusButton != null) troopMinusButton.onClick.RemoveAllListeners();
            if (troopPlusButton != null) troopPlusButton.onClick.RemoveAllListeners();
        }

        // ==================== 清理 ====================

        /// <summary>
        /// 清理行军项UI
        /// </summary>
        private void CleanupMarchItems()
        {
            foreach (var item in _marchItemObjects)
            {
                if (item != null)
                {
                    Destroy(item);
                }
            }
            _marchItemObjects.Clear();
        }
    }

    // ==================== 活跃行军项UI组件 ====================

    /// <summary>
    /// 活跃行军项UI组件 - 显示单个行军订单的详细信息
    /// 包含路线、进度条、ETA、召回按钮
    /// </summary>
    public class ActiveMarchItemUI : MonoBehaviour
    {
        [Header("行军信息")]
        [SerializeField] private TextMeshProUGUI routeText;
        [SerializeField] private TextMeshProUGUI troopInfoText;
        [SerializeField] private TextMeshProUGUI etaText;
        [SerializeField] private Image progressBarFill;
        [SerializeField] private TextMeshProUGUI progressText;
        [SerializeField] private Button recallButton;
        [SerializeField] private Button detailButton;
        [SerializeField] private Image marchTypeIndicator;
        [SerializeField] private TextMeshProUGUI marchModeText;

        private ActiveMarchDetail _marchData;
        private Action<string> _onRecall;
        private Action<string> _onDetailClick;

        /// <summary>
        /// 设置行军数据
        /// </summary>
        public void Setup(ActiveMarchDetail march, Action<string> onRecall, Action<string> onDetailClick)
        {
            _marchData = march;
            _onRecall = onRecall;
            _onDetailClick = onDetailClick;

            RefreshProgress(march);

            // 注册按钮事件
            if (recallButton != null)
            {
                recallButton.onClick.RemoveAllListeners();
                recallButton.onClick.AddListener(() => _onRecall?.Invoke(march.MarchId));
            }

            if (detailButton != null)
            {
                detailButton.onClick.RemoveAllListeners();
                detailButton.onClick.AddListener(() => _onDetailClick?.Invoke(march.MarchId));
            }
        }

        /// <summary>
        /// 刷新进度显示
        /// </summary>
        public void RefreshProgress()
        {
            RefreshProgress(_marchData);
        }

        /// <summary>
        /// 刷新进度显示（传入最新数据）
        /// </summary>
        public void RefreshProgress(ActiveMarchDetail march)
        {
            if (march == null) return;
            _marchData = march;

            // 路线
            if (routeText != null)
            {
                routeText.text = $"{march.FromCityName} → {march.ToCityName}";
            }

            // 兵种信息
            if (troopInfoText != null)
            {
                string troopName = GetTroopName(march.TroopType);
                troopInfoText.text = $"{troopName} {march.TroopCount}人";
            }

            // 预计到达时间
            if (etaText != null)
            {
                int minutes = march.RemainingSeconds / 60;
                int seconds = march.RemainingSeconds % 60;
                etaText.text = $"ETA: {minutes:D2}:{seconds:D2}";
            }

            // 进度条
            if (progressBarFill != null)
            {
                progressBarFill.fillAmount = march.Progress;
            }

            // 进度文本
            if (progressText != null)
            {
                progressText.text = $"{Mathf.RoundToInt(march.Progress * 100)}%";
            }

            // 行军模式
            if (marchModeText != null)
            {
                marchModeText.text = march.IsReinforce ? "增援" : "攻击";
                marchModeText.color = march.IsReinforce
                    ? new Color(0.2f, 0.8f, 0.3f, 1f)
                    : new Color(1f, 0.5f, 0.3f, 1f);
            }

            // 行军类型指示器颜色
            if (marchTypeIndicator != null)
            {
                marchTypeIndicator.color = march.IsReinforce
                    ? new Color(0.2f, 0.8f, 0.3f, 1f)
                    : new Color(1f, 0.5f, 0.3f, 1f);
            }

            // 如果已到达，禁用召回按钮
            if (recallButton != null)
            {
                recallButton.interactable = march.Status == "marching";
            }
        }

        private string GetTroopName(TroopType type)
        {
            return type switch
            {
                TroopType.Infantry => "步兵",
                TroopType.Cavalry => "骑兵",
                TroopType.Archer => "弓兵",
                TroopType.Siege => "攻城",
                _ => "未知"
            };
        }
    }
}
