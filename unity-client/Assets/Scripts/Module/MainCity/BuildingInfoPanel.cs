using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using Jiuzhou.Core;
using Game.Data;

namespace Game.Module.MainCity
{
    /// <summary>
    /// 建筑信息面板 - 显示建筑详情和升级功能
    /// 弹出式面板，在主城中点击建筑后打开
    /// 支持6种建筑类型，每种最多10级
    /// 升级消耗金币，费用公式：baseCost * (level^1.5)
    /// 继承自 UIBase，由 UIManager 统一管理生命周期
    /// </summary>
    public class BuildingInfoPanel : UIBase
    {
        // ============================================================
        // 建筑类型枚举
        // ============================================================

        public enum BuildingType
        {
            CommandCenter,  // 指挥中心
            Barracks,       // 兵营
            Academy,        // 学院
            Warehouse,      // 仓库
            Blacksmith,     // 铁匠铺
            Tavern          // 酒馆
        }

        // ============================================================
        // 建筑数据定义
        // ============================================================

        [Serializable]
        public class BuildingData
        {
            public BuildingType type;
            public string name;
            public int level;
            public int maxLevel;
            public int baseCost;
            public string description;
            public string[] functions;
            public int[] levelBonuses;

            /// <summary>
            /// 计算当前等级的升级费用
            /// 公式：baseCost * (level^1.5)
            /// </summary>
            public int GetUpgradeCost()
            {
                return Mathf.RoundToInt(baseCost * Mathf.Pow(level, 1.5f));
            }

            public bool IsMaxLevel => level >= maxLevel;

            public int GetCurrentBonus()
            {
                if (levelBonuses == null || levelBonuses.Length == 0) return 0;
                int index = Mathf.Clamp(level - 1, 0, levelBonuses.Length - 1);
                return levelBonuses[index];
            }

            public int GetNextBonus()
            {
                if (levelBonuses == null || IsMaxLevel) return 0;
                int index = Mathf.Clamp(level, 0, levelBonuses.Length - 1);
                return levelBonuses[index];
            }
        }

        // ──────────────────────────────────────
        // UI 元素引用
        // ──────────────────────────────────────

        [Header("建筑信息")]
        [SerializeField] private Text buildingNameText;
        [SerializeField] private Text buildingLevelText;
        [SerializeField] private Text buildingDescriptionText;
        [SerializeField] private Image buildingIcon;

        [Header("升级区域")]
        [SerializeField] private Button upgradeButton;
        [SerializeField] private Text upgradeCostText;
        [SerializeField] private Text nextBonusText;
        [SerializeField] private GameObject maxLevelBadge;

        [Header("功能按钮区域")]
        [SerializeField] private Button[] functionButtons;

        [Header("关闭按钮")]
        [SerializeField] private Button closeButton;

        [Header("升级动画")]
        [SerializeField] private GameObject upgradeEffect;
        [SerializeField] private CanvasGroup buildingPanel;

        // ──────────────────────────────────────
        // 常量
        // ──────────────────────────────────────

        private const int MAX_BUILDING_LEVEL = 10;

        // ──────────────────────────────────────
        // 内部状态
        // ──────────────────────────────────────

        private BuildingType currentBuildingType;
        private BuildingData currentBuildingData;
        private bool isUpgrading = false;
        private Dictionary<BuildingType, int> buildingLevels = new Dictionary<BuildingType, int>();

        // ============================================================
        // 预定义建筑数据（6种建筑，各10级）
        // ============================================================

        private static readonly Dictionary<BuildingType, BuildingData> BuildingTemplates = new Dictionary<BuildingType, BuildingData>
        {
            {
                BuildingType.CommandCenter, new BuildingData
                {
                    type = BuildingType.CommandCenter,
                    name = "指挥中心",
                    maxLevel = MAX_BUILDING_LEVEL,
                    baseCost = 500,
                    description = "城池的核心建筑，统领全局。升级可提升资源产出效率和建筑队列数量。",
                    functions = new string[] { "查看城池状态", "城池防御设置", "官职管理", "资源总览" },
                    levelBonuses = new int[] { 5, 10, 18, 28, 40, 55, 72, 92, 115, 140 }
                }
            },
            {
                BuildingType.Barracks, new BuildingData
                {
                    type = BuildingType.Barracks,
                    name = "兵营",
                    maxLevel = MAX_BUILDING_LEVEL,
                    baseCost = 300,
                    description = "训练和征募士兵的场所。升级可解锁更高级兵种，提升训练速度。",
                    functions = new string[] { "训练士兵", "兵种科技", "驻军管理", "伤兵营" },
                    levelBonuses = new int[] { 3, 7, 12, 20, 30, 42, 56, 72, 90, 110 }
                }
            },
            {
                BuildingType.Academy, new BuildingData
                {
                    type = BuildingType.Academy,
                    name = "学院",
                    maxLevel = MAX_BUILDING_LEVEL,
                    baseCost = 400,
                    description = "研究科技和策略的殿堂。升级可解锁更多科技，提升研究速度。",
                    functions = new string[] { "科技研究", "武将培养", "技能升级", "兵法研习" },
                    levelBonuses = new int[] { 4, 9, 15, 24, 35, 48, 64, 82, 102, 125 }
                }
            },
            {
                BuildingType.Warehouse, new BuildingData
                {
                    type = BuildingType.Warehouse,
                    name = "仓库",
                    maxLevel = MAX_BUILDING_LEVEL,
                    baseCost = 200,
                    description = "储存资源的建筑。升级可提升资源存储上限，保护更多资源免受掠夺。",
                    functions = new string[] { "查看资源", "资源保护", "仓库扩容", "资源兑换" },
                    levelBonuses = new int[] { 10, 20, 35, 55, 80, 110, 145, 185, 230, 280 }
                }
            },
            {
                BuildingType.Blacksmith, new BuildingData
                {
                    type = BuildingType.Blacksmith,
                    name = "铁匠铺",
                    maxLevel = MAX_BUILDING_LEVEL,
                    baseCost = 350,
                    description = "打造和强化装备的工坊。升级可锻造更高级装备，提升强化成功率。",
                    functions = new string[] { "装备锻造", "装备强化", "材料分解", "装备合成" },
                    levelBonuses = new int[] { 3, 8, 14, 22, 32, 44, 58, 74, 92, 112 }
                }
            },
            {
                BuildingType.Tavern, new BuildingData
                {
                    type = BuildingType.Tavern,
                    name = "酒馆",
                    maxLevel = MAX_BUILDING_LEVEL,
                    baseCost = 250,
                    description = "招募武将和交流信息的场所。升级可招募更高品质武将，刷新武将列表。",
                    functions = new string[] { "武将招募", "酒馆任务", "情报购买", "名将寻访" },
                    levelBonuses = new int[] { 2, 5, 10, 16, 24, 34, 46, 60, 76, 94 }
                }
            }
        };

        // ============================================================
        // 生命周期方法
        // ============================================================

        protected override void Awake()
        {
            base.Awake();

            if (upgradeButton != null)
                upgradeButton.onClick.AddListener(OnUpgradeClick);
            if (closeButton != null)
                closeButton.onClick.AddListener(OnCloseClick);

            RegisterFunctionButtonEvents();
            InitializeBuildingLevels();

            if (upgradeEffect != null) upgradeEffect.SetActive(false);
            if (maxLevelBadge != null) maxLevelBadge.SetActive(false);
        }

        /// <summary>
        /// 面板打开回调 - 根据传入的建筑类型显示对应信息
        /// </summary>
        public override void OnOpen(params object[] args)
        {
            base.OnOpen(args);

            string buildingTypeStr = args != null && args.Length > 0 ? args[0] as string : null;
            if (!string.IsNullOrEmpty(buildingTypeStr))
            {
                currentBuildingType = ParseBuildingType(buildingTypeStr);
            }
            else
            {
                currentBuildingType = BuildingType.CommandCenter;
            }

            BuildCurrentBuildingData();
            UpdateBuildingDisplay();
        }

        public override void OnClose()
        {
            StopAllCoroutines();
            isUpgrading = false;
            base.OnClose();
        }

        public override void OnRefresh()
        {
            BuildCurrentBuildingData();
            UpdateBuildingDisplay();
        }

        // ============================================================
        // 建筑数据管理
        // ============================================================

        private void InitializeBuildingLevels()
        {
            foreach (BuildingType type in Enum.GetValues(typeof(BuildingType)))
            {
                string key = GetBuildingLevelKey(type);
                int savedLevel = PlayerPrefs.GetInt(key, 1);
                buildingLevels[type] = Mathf.Clamp(savedLevel, 1, MAX_BUILDING_LEVEL);
            }
        }

        private string GetBuildingLevelKey(BuildingType type)
        {
            return $"Building_Level_{type.ToString()}";
        }

        private BuildingType ParseBuildingType(string typeStr)
        {
            switch (typeStr.ToLower())
            {
                case "command_center": return BuildingType.CommandCenter;
                case "barracks": return BuildingType.Barracks;
                case "academy": return BuildingType.Academy;
                case "warehouse": return BuildingType.Warehouse;
                case "blacksmith": return BuildingType.Blacksmith;
                case "tavern": return BuildingType.Tavern;
                default: return BuildingType.CommandCenter;
            }
        }

        private void BuildCurrentBuildingData()
        {
            if (!BuildingTemplates.TryGetValue(currentBuildingType, out var template)) return;

            int level = buildingLevels.ContainsKey(currentBuildingType) ? buildingLevels[currentBuildingType] : 1;

            currentBuildingData = new BuildingData
            {
                type = template.type,
                name = template.name,
                level = level,
                maxLevel = template.maxLevel,
                baseCost = template.baseCost,
                description = template.description,
                functions = template.functions,
                levelBonuses = template.levelBonuses
            };
        }

        // ============================================================
        // UI 显示更新
        // ============================================================

        private void UpdateBuildingDisplay()
        {
            if (currentBuildingData == null) return;

            if (buildingNameText != null) buildingNameText.text = currentBuildingData.name;
            if (buildingLevelText != null) buildingLevelText.text = $"Lv.{currentBuildingData.level}";
            if (buildingDescriptionText != null) buildingDescriptionText.text = currentBuildingData.description;

            UpdateUpgradeCostDisplay();

            if (maxLevelBadge != null) maxLevelBadge.SetActive(currentBuildingData.IsMaxLevel);
            UpdateUpgradeButtonState();
            UpdateFunctionButtons();
        }

        private void UpdateUpgradeCostDisplay()
        {
            if (upgradeCostText == null) return;

            if (currentBuildingData.IsMaxLevel)
            {
                upgradeCostText.text = "已达最高等级";
                if (nextBonusText != null) nextBonusText.text = "";
            }
            else
            {
                int cost = currentBuildingData.GetUpgradeCost();
                upgradeCostText.text = $"升级费用: 💰{FormatNumber(cost)}";

                if (nextBonusText != null)
                {
                    int currentBonus = currentBuildingData.GetCurrentBonus();
                    int nextBonus = currentBuildingData.GetNextBonus();
                    nextBonusText.text = $"加成: {currentBonus}% → {nextBonus}%";
                }
            }
        }

        private void UpdateUpgradeButtonState()
        {
            if (upgradeButton == null) return;

            if (currentBuildingData.IsMaxLevel)
            {
                upgradeButton.interactable = false;
                var btnText = upgradeButton.GetComponentInChildren<Text>();
                if (btnText != null) btnText.text = "已满级";
            }
            else
            {
                int cost = currentBuildingData.GetUpgradeCost();
                upgradeButton.interactable = !isUpgrading;
            }
        }

        private void UpdateFunctionButtons()
        {
            if (functionButtons == null || currentBuildingData == null) return;

            for (int i = 0; i < functionButtons.Length; i++)
            {
                if (functionButtons[i] != null)
                {
                    if (i < currentBuildingData.functions.Length)
                    {
                        functionButtons[i].gameObject.SetActive(true);
                        Text btnText = functionButtons[i].GetComponentInChildren<Text>();
                        if (btnText != null) btnText.text = currentBuildingData.functions[i];
                    }
                    else
                    {
                        functionButtons[i].gameObject.SetActive(false);
                    }
                }
            }
        }

        // ============================================================
        // 升级逻辑
        // ============================================================

        private void OnUpgradeClick()
        {
            if (isUpgrading || currentBuildingData == null || currentBuildingData.IsMaxLevel) return;

            int cost = currentBuildingData.GetUpgradeCost();

            isUpgrading = true;

            // 升级建筑
            currentBuildingData.level++;
            buildingLevels[currentBuildingType] = currentBuildingData.level;

            // 保存建筑等级
            PlayerPrefs.SetInt(GetBuildingLevelKey(currentBuildingType), currentBuildingData.level);
            PlayerPrefs.Save();

            // 触发资源变化事件
            EventBus.Trigger(Constants.GameEvents.RESOURCE_CHANGED, -cost);

            Debug.Log($"[BuildingInfoPanel] {currentBuildingData.name} 升级到 Lv.{currentBuildingData.level}");

            // 播放升级动画
            StartCoroutine(PlayUpgradeAnimation());
        }

        private IEnumerator PlayUpgradeAnimation()
        {
            if (upgradeButton != null) upgradeButton.interactable = false;

            if (upgradeEffect != null) upgradeEffect.SetActive(true);

            // 建筑图标放大动画
            if (buildingIcon != null)
            {
                Vector3 originalScale = buildingIcon.transform.localScale;
                Vector3 maxScale = originalScale * 1.3f;
                float duration = 0.3f;
                float elapsed = 0f;

                while (elapsed < duration)
                {
                    elapsed += Time.deltaTime;
                    float t = elapsed / duration;
                    float eased = 1f - Mathf.Pow(1f - t, 2f);
                    buildingIcon.transform.localScale = Vector3.Lerp(originalScale, maxScale, eased);
                    yield return null;
                }

                duration = 0.5f;
                elapsed = 0f;
                while (elapsed < duration)
                {
                    elapsed += Time.deltaTime;
                    float t = elapsed / duration;
                    float bounced = Mathf.Sin(t * Mathf.PI * 2f) * 0.1f * (1f - t);
                    buildingIcon.transform.localScale = Vector3.Lerp(maxScale, originalScale, t) + new Vector3(bounced, bounced, 0f);
                    yield return null;
                }

                buildingIcon.transform.localScale = originalScale;
            }

            yield return new WaitForSeconds(0.5f);

            if (upgradeEffect != null) upgradeEffect.SetActive(false);

            UpdateBuildingDisplay();
            isUpgrading = false;
        }

        // ============================================================
        // 辅助方法
        // ============================================================

        public static int CalculateUpgradeCost(int baseCost, int currentLevel)
        {
            return Mathf.RoundToInt(baseCost * Mathf.Pow(currentLevel, 1.5f));
        }

        private string FormatNumber(int number)
        {
            if (number >= 100000000) return (number / 100000000f).ToString("F1") + "亿";
            if (number >= 10000) return (number / 10000f).ToString("F1") + "万";
            return number.ToString();
        }

        private void OnCloseClick()
        {
            UIManager.Instance.ClosePanel(PanelName);
        }

        private void RegisterFunctionButtonEvents()
        {
            if (functionButtons == null) return;
            for (int i = 0; i < functionButtons.Length; i++)
            {
                if (functionButtons[i] != null)
                {
                    int index = i;
                    functionButtons[i].onClick.AddListener(() => OnFunctionClick(index));
                }
            }
        }

        private void OnFunctionClick(int functionIndex)
        {
            if (currentBuildingData == null || functionIndex >= currentBuildingData.functions.Length) return;

            string functionName = currentBuildingData.functions[functionIndex];
            Debug.Log($"[BuildingInfoPanel] 点击功能: {currentBuildingData.name} - {functionName}");

            switch (currentBuildingType)
            {
                case BuildingType.CommandCenter:
                    if (functionIndex == 0) UIManager.Instance.OpenPanel("CityStatusPanel");
                    else if (functionIndex == 1) UIManager.Instance.OpenPanel("DefensePanel");
                    break;
                case BuildingType.Barracks:
                    if (functionIndex == 0) UIManager.Instance.OpenPanel("TrainPanel");
                    else if (functionIndex == 3) UIManager.Instance.OpenPanel("HospitalPanel");
                    break;
                case BuildingType.Academy:
                    if (functionIndex == 0) UIManager.Instance.OpenPanel("ResearchPanel");
                    break;
                case BuildingType.Warehouse:
                    if (functionIndex == 0) UIManager.Instance.OpenPanel("ResourcePanel");
                    break;
                case BuildingType.Blacksmith:
                    if (functionIndex == 0) UIManager.Instance.OpenPanel("ForgePanel");
                    break;
                case BuildingType.Tavern:
                    if (functionIndex == 0) UIManager.Instance.OpenPanel("RecruitPanel");
                    break;
            }
        }

        protected override void OnDestroy()
        {
            if (upgradeButton != null) upgradeButton.onClick.RemoveAllListeners();
            if (closeButton != null) closeButton.onClick.RemoveAllListeners();
            if (functionButtons != null)
            {
                foreach (var btn in functionButtons)
                    if (btn != null) btn.onClick.RemoveAllListeners();
            }
            base.OnDestroy();
        }
    }
}
