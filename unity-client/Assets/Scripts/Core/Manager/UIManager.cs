// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Core Framework
// =============================================================================
// 描述：UI 管理器 —— 核心界面管理系统。
//       基于 Canvas 分层架构，管理所有 UI 面板的创建、打开、关闭、缓存和销毁。
//       支持 6 个 UI 层级（Background、Scene、Main、Popup、Top、Guide），
//       弹窗层级同时只允许一个面板打开，面板预制体从 Resources/UI/Panels 加载。
// =============================================================================

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

namespace Jiuzhou.Core
{
    /// <summary>
    /// UI 管理器单例 —— 全局 UI 面板管理中枢。
    /// <para>打开面板: UIManager.Instance.OpenPanel("LoginPanel");</para>
    /// <para>关闭面板: UIManager.Instance.ClosePanel("LoginPanel");</para>
    /// </summary>
    public class UIManager : Singleton<UIManager>
    {
        // =====================================================================
        // 私有字段
        // =====================================================================

        /// <summary>UI 根节点（所有 Canvas 的父对象）</summary>
        private GameObject _uiRoot;

        /// <summary>事件系统（用于 UI 事件分发）</summary>
        private GameObject _eventSystem;

        /// <summary>各层级 Canvas 字典 —— UILayer -> Canvas</summary>
        private Dictionary<UILayer, Canvas> _layerCanvases;

        /// <summary>面板缓存字典 —— 面板名称 -> 面板实例</summary>
        private Dictionary<string, UIBase> _panelCache;

        /// <summary>面板路径字典 —— 面板名称 -> 资源路径</summary>
        private Dictionary<string, string> _panelPaths;

        /// <summary>当前打开的弹窗面板（Popup 层同时只允许一个）</summary>
        private string _currentPopupPanel = string.Empty;

        /// <summary>当前打开的加载面板</summary>
        private string _currentLoadingPanel = string.Empty;

        /// <summary>面板名称 -> UILayer 的映射（用于确定面板应放在哪个层）</summary>
        private Dictionary<string, UILayer> _panelLayerMap;

        // =====================================================================
        // Canvas 配置常量
        // =====================================================================

        /// <summary>UI 根节点名称</summary>
        private const string UI_ROOT_NAME = "UIRoot";

        /// <summary>面板预制体根路径</summary>
        private const string PANEL_RESOURCE_PATH = "UI/Panels";

        // =====================================================================
        // 公开属性
        // =====================================================================

        /// <summary>获取当前已打开的面板数量</summary>
        public int OpenPanelCount
        {
            get
            {
                int count = 0;
                foreach (var kvp in _panelCache)
                {
                    if (kvp.Value != null && kvp.Value.IsOpen) count++;
                }
                return count;
            }
        }

        // =====================================================================
        // 生命周期
        // =====================================================================

        protected override void OnInitialize()
        {
            base.OnInitialize();
            DontDestroyOnLoad();

            _panelCache = new Dictionary<string, UIBase>();
            _panelPaths = new Dictionary<string, string>();
            _panelLayerMap = new Dictionary<string, UILayer>();
            _layerCanvases = new Dictionary<UILayer, Canvas>();

            // 注册面板路径映射
            RegisterPanelPaths();

            // 创建 UI 根节点和层级 Canvas
            CreateUIRoot();
            CreateLayerCanvases();

            // 确保存在 EventSystem
            EnsureEventSystem();

            Debug.Log("[UIManager] 初始化完成。");
        }

        /// <summary>
        /// 注册所有面板的名称和资源路径。
        /// 新增面板时需在此注册。
        /// </summary>
        private void RegisterPanelPaths()
        {
            // ----- 登录模块 -----
            RegisterPanel(Constants.PanelNames.LOGIN, PANEL_RESOURCE_PATH + "/" + Constants.PanelNames.LOGIN, UILayer.Main);
            RegisterPanel(Constants.PanelNames.REGISTER, PANEL_RESOURCE_PATH + "/" + Constants.PanelNames.REGISTER, UILayer.Main);

            // ----- 主城模块 -----
            RegisterPanel(Constants.PanelNames.MAIN_CITY, PANEL_RESOURCE_PATH + "/" + Constants.PanelNames.MAIN_CITY, UILayer.Main);
            RegisterPanel(Constants.PanelNames.BAG, PANEL_RESOURCE_PATH + "/" + Constants.PanelNames.BAG, UILayer.Main);
            RegisterPanel(Constants.PanelNames.DECK, PANEL_RESOURCE_PATH + "/" + Constants.PanelNames.DECK, UILayer.Main);
            RegisterPanel(Constants.PanelNames.CARD_DETAIL, PANEL_RESOURCE_PATH + "/" + Constants.PanelNames.CARD_DETAIL, UILayer.Popup);
            RegisterPanel(Constants.PanelNames.SETTINGS, PANEL_RESOURCE_PATH + "/" + Constants.PanelNames.SETTINGS, UILayer.Popup);
            RegisterPanel(Constants.PanelNames.REWARD, PANEL_RESOURCE_PATH + "/" + Constants.PanelNames.REWARD, UILayer.Popup);

            // ----- 战斗模块 -----
            RegisterPanel(Constants.PanelNames.BATTLE, PANEL_RESOURCE_PATH + "/" + Constants.PanelNames.BATTLE, UILayer.Main);

            // ----- 地图模块 -----
            RegisterPanel(Constants.PanelNames.MAP, PANEL_RESOURCE_PATH + "/" + Constants.PanelNames.MAP, UILayer.Main);

            // ----- 公会模块 -----
            RegisterPanel(Constants.PanelNames.GUILD, PANEL_RESOURCE_PATH + "/" + Constants.PanelNames.GUILD, UILayer.Main);

            // ----- 通用 -----
            RegisterPanel(Constants.PanelNames.LOADING, PANEL_RESOURCE_PATH + "/" + Constants.PanelNames.LOADING, UILayer.Top);
            RegisterPanel(Constants.PanelNames.CONFIRM_DIALOG, PANEL_RESOURCE_PATH + "/" + Constants.PanelNames.CONFIRM_DIALOG, UILayer.Popup);
        }

        /// <summary>
        /// 注册单个面板信息。
        /// </summary>
        /// <param name="panelName">面板名称</param>
        /// <param name="resourcePath">预制体资源路径</param>
        /// <param name="layer">所属层级</param>
        public void RegisterPanel(string panelName, string resourcePath, UILayer layer)
        {
            _panelPaths[panelName] = resourcePath;
            _panelLayerMap[panelName] = layer;
        }

        // =====================================================================
        // UI 根节点和层级 Canvas 创建
        // =====================================================================

        /// <summary>
        /// 创建 UI 根节点。
        /// </summary>
        private void CreateUIRoot()
        {
            _uiRoot = GameObject.Find(UI_ROOT_NAME);
            if (_uiRoot == null)
            {
                _uiRoot = new GameObject(UI_ROOT_NAME);
                DontDestroyOnLoad(_uiRoot);
                Debug.Log("[UIManager] 创建 UI 根节点。");
            }

            // 添加 Canvas 组件
            Canvas rootCanvas = _uiRoot.GetComponent<Canvas>();
            if (rootCanvas == null)
            {
                rootCanvas = _uiRoot.AddComponent<Canvas>();
                rootCanvas.renderMode = RenderMode.ScreenSpaceOverlay;
            }

            // 添加 CanvasScaler（自适应分辨率）
            UnityEngine.UI.CanvasScaler scaler = _uiRoot.GetComponent<UnityEngine.UI.CanvasScaler>();
            if (scaler == null)
            {
                scaler = _uiRoot.AddComponent<UnityEngine.UI.CanvasScaler>();
                scaler.uiScaleMode = UnityEngine.UI.CanvasScaler.ScaleMode.ScaleWithScreenSize;
                scaler.referenceResolution = new Vector2(1920, 1080);
                scaler.screenMatchMode = UnityEngine.UI.CanvasScaler.ScreenMatchMode.MatchWidthOrHeight;
                scaler.matchWidthOrHeight = 0.5f;
            }

            // 添加 GraphicRaycaster（支持 UI 事件）
            UnityEngine.UI.GraphicRaycaster raycaster = _uiRoot.GetComponent<UnityEngine.UI.GraphicRaycaster>();
            if (raycaster == null)
            {
                raycaster = _uiRoot.AddComponent<UnityEngine.UI.GraphicRaycaster>();
            }
        }

        /// <summary>
        /// 为每个 UILayer 创建独立的 Canvas 子节点。
        /// </summary>
        private void CreateLayerCanvases()
        {
            // 获取所有 UILayer 枚举值
            Array layerValues = Enum.GetValues(typeof(UILayer));

            foreach (UILayer layer in layerValues)
            {
                CreateLayerCanvas(layer);
            }
        }

        /// <summary>
        /// 创建单个层级的 Canvas。
        /// </summary>
        private void CreateLayerCanvas(UILayer layer)
        {
            string layerName = layer.GetName();
            GameObject layerObj = new GameObject($"Canvas_{layerName}");
            layerObj.transform.SetParent(_uiRoot.transform, false);

            // 添加 Canvas 组件
            Canvas layerCanvas = layerObj.AddComponent<Canvas>();
            layerCanvas.overrideSorting = true;
            layerCanvas.sortingOrder = layer.GetSortingOrder();

            // 添加 GraphicRaycaster
            layerObj.AddComponent<UnityEngine.UI.GraphicRaycaster>();

            _layerCanvases[layer] = layerCanvas;
        }

        /// <summary>
        /// 确保 EventSystem 存在（UI 交互所需）。
        /// </summary>
        private void EnsureEventSystem()
        {
            _eventSystem = UnityEngine.EventSystems.EventSystem.current?.gameObject;
            if (_eventSystem == null)
            {
                _eventSystem = new GameObject("EventSystem");
                _eventSystem.AddComponent<UnityEngine.EventSystems.EventSystem>();
                _eventSystem.AddComponent<UnityEngine.EventSystems.StandaloneInputModule>();
                DontDestroyOnLoad(_eventSystem);
                Debug.Log("[UIManager] 创建 EventSystem。");
            }
        }

        // =====================================================================
        // 面板打开
        // =====================================================================

        /// <summary>
        /// 打开面板（泛型版本）。
        /// </summary>
        /// <typeparam name="T">面板类型（必须继承 UIBase）</typeparam>
        /// <param name="panelName">面板名称</param>
        /// <param name="args">传递给面板 OnOpen 的参数</param>
        /// <returns>面板实例，打开失败返回 null</returns>
        public T OpenPanel<T>(string panelName, params object[] args) where T : UIBase
        {
            UIBase panel = OpenPanel(panelName, args);
            return panel as T;
        }

        /// <summary>
        /// 打开面板（核心方法）。
        /// 如果面板已缓存则直接打开，否则从 Resources 加载预制体并实例化。
        /// </summary>
        /// <param name="panelName">面板名称</param>
        /// <param name="args">传递给面板 OnOpen 的参数</param>
        /// <returns>面板实例，打开失败返回 null</returns>
        public UIBase OpenPanel(string panelName, params object[] args)
        {
            if (string.IsNullOrEmpty(panelName))
            {
                Debug.LogError("[UIManager] OpenPanel: 面板名称不能为空。");
                return null;
            }

            // 检查面板是否已缓存
            UIBase panel;
            if (_panelCache.TryGetValue(panelName, out panel) && panel != null)
            {
                // 面板已缓存，如果已打开则先关闭再重新打开
                if (panel.IsOpen)
                {
                    panel.OnClose();
                }
            }
            else
            {
                // 加载面板预制体
                panel = LoadPanel(panelName);
                if (panel == null)
                {
                    Debug.LogError($"[UIManager] OpenPanel: 无法加载面板 '{panelName}'。");
                    return null;
                }
            }

            // 弹窗层级同时只允许一个面板打开
            UILayer panelLayer = GetPanelLayer(panelName);
            if (panelLayer == UILayer.Popup && !string.IsNullOrEmpty(_currentPopupPanel) && _currentPopupPanel != panelName)
            {
                // 自动关闭前一个弹窗
                ClosePanelImmediate(_currentPopupPanel);
            }

            // 设置面板层级和父对象
            SetPanelParent(panel, panelLayer);

            // 打开面板
            panel.gameObject.SetActive(true);
            panel.OnOpen(args);

            // 更新状态
            if (panelLayer == UILayer.Popup)
            {
                _currentPopupPanel = panelName;
            }

            // 广播面板打开事件
            EventBus.Trigger(Constants.GameEvents.UI_PANEL_OPENED, panelName);

            Debug.Log($"[UIManager] 打开面板: {panelName} (层级: {panelLayer})");
            return panel;
        }

        // =====================================================================
        // 面板关闭
        // =====================================================================

        /// <summary>
        /// 关闭面板（带动画）。
        /// 动画结束后面板会被隐藏（但保留在缓存中）。
        /// </summary>
        /// <param name="panelName">面板名称</param>
        public void ClosePanel(string panelName)
        {
            if (string.IsNullOrEmpty(panelName)) return;

            UIBase panel;
            if (!_panelCache.TryGetValue(panelName, out panel) || panel == null)
            {
                Debug.LogWarning($"[UIManager] ClosePanel: 未找到面板 '{panelName}'。");
                return;
            }

            if (!panel.IsOpen)
            {
                return;
            }

            // 关闭面板（触发动画）
            panel.OnClose();

            // 清除弹窗记录
            if (panelName == _currentPopupPanel)
            {
                _currentPopupPanel = string.Empty;
            }

            // 清除加载面板记录
            if (panelName == _currentLoadingPanel)
            {
                _currentLoadingPanel = string.Empty;
            }

            // 广播面板关闭事件
            EventBus.Trigger(Constants.GameEvents.UI_PANEL_CLOSED, panelName);

            Debug.Log($"[UIManager] 关闭面板: {panelName}");
        }

        /// <summary>
        /// 立即关闭面板（不播放动画）。
        /// </summary>
        /// <param name="panelName">面板名称</param>
        public void ClosePanelImmediate(string panelName)
        {
            if (string.IsNullOrEmpty(panelName)) return;

            UIBase panel;
            if (!_panelCache.TryGetValue(panelName, out panel) || panel == null) return;

            if (panel.IsOpen)
            {
                panel.OnClose();
                panel.gameObject.SetActive(false);

                if (panelName == _currentPopupPanel)
                {
                    _currentPopupPanel = string.Empty;
                }
                if (panelName == _currentLoadingPanel)
                {
                    _currentLoadingPanel = string.Empty;
                }

                EventBus.Trigger(Constants.GameEvents.UI_PANEL_CLOSED, panelName);
            }
        }

        /// <summary>
        /// 关闭所有已打开的面板。
        /// </summary>
        /// <param name="excludePanels">需要排除（不关闭）的面板名称列表</param>
        public void CloseAllPanels(params string[] excludePanels)
        {
            // 构建排除集合
            HashSet<string> excludeSet = new HashSet<string>(excludePanels ?? new string[0]);

            // 收集需要关闭的面板（避免在遍历时修改字典）
            List<string> panelsToClose = new List<string>();
            foreach (var kvp in _panelCache)
            {
                if (kvp.Value != null && kvp.Value.IsOpen && !excludeSet.Contains(kvp.Key))
                {
                    panelsToClose.Add(kvp.Key);
                }
            }

            // 依次关闭
            foreach (string panelName in panelsToClose)
            {
                ClosePanelImmediate(panelName);
            }

            _currentPopupPanel = string.Empty;
            _currentLoadingPanel = string.Empty;

            EventBus.Trigger(Constants.GameEvents.UI_ALL_PANELS_CLOSED);
        }

        // =====================================================================
        // 加载面板
        // =====================================================================

        /// <summary>
        /// 从 Resources 加载面板预制体并实例化。
        /// </summary>
        /// <param name="panelName">面板名称</param>
        /// <returns>面板实例，加载失败返回 null</returns>
        private UIBase LoadPanel(string panelName)
        {
            string resourcePath;
            if (!_panelPaths.TryGetValue(panelName, out resourcePath))
            {
                // 如果未注册路径，使用默认路径
                resourcePath = PANEL_RESOURCE_PATH + "/" + panelName;
            }

            // 从 Resources 加载预制体
            GameObject prefab = Resources.Load<GameObject>(resourcePath);
            if (prefab == null)
            {
                Debug.LogError($"[UIManager] LoadPanel: 未找到面板预制体 '{resourcePath}'。");
                return null;
            }

            // 实例化预制体
            GameObject panelObj = Instantiate(prefab);
            panelObj.name = panelName;
            panelObj.SetActive(false);

            // 获取 UIBase 组件
            UIBase panel = panelObj.GetComponent<UIBase>();
            if (panel == null)
            {
                Debug.LogError($"[UIManager] LoadPanel: 面板 '{panelName}' 的预制体上没有 UIBase 组件。");
                Destroy(panelObj);
                return null;
            }

            // 设置面板名称
            panel.PanelName = panelName;

            // 设置面板的父对象（根据层级）
            UILayer layer = GetPanelLayer(panelName);
            SetPanelParent(panel, layer);

            // 缓存面板
            _panelCache[panelName] = panel;

            Debug.Log($"[UIManager] 加载并缓存面板: {panelName} (路径: {resourcePath})");
            return panel;
        }

        // =====================================================================
        // 面板管理辅助
        // =====================================================================

        /// <summary>
        /// 获取面板所属层级。
        /// 如果未注册则默认返回 Main 层级。
        /// </summary>
        private UILayer GetPanelLayer(string panelName)
        {
            UILayer layer;
            if (_panelLayerMap.TryGetValue(panelName, out layer))
            {
                return layer;
            }

            // 尝试从面板实例获取
            UIBase panel;
            if (_panelCache.TryGetValue(panelName, out panel) && panel != null)
            {
                return panel.UILayer;
            }

            return UILayer.Main;
        }

        /// <summary>
        /// 设置面板的父对象为对应层级的 Canvas。
        /// </summary>
        private void SetPanelParent(UIBase panel, UILayer layer)
        {
            Canvas layerCanvas;
            if (_layerCanvases.TryGetValue(layer, out layerCanvas) && layerCanvas != null)
            {
                panel.transform.SetParent(layerCanvas.transform, false);
            }
            else
            {
                // 找不到对应层级的 Canvas，使用根节点
                Debug.LogWarning($"[UIManager] 未找到层级 '{layer}' 的 Canvas，面板将挂载到根节点。");
                panel.transform.SetParent(_uiRoot.transform, false);
            }
        }

        /// <summary>
        /// 获取已打开的面板实例。
        /// </summary>
        /// <typeparam name="T">面板类型</typeparam>
        /// <param name="panelName">面板名称</param>
        /// <returns>面板实例，不存在或未打开返回 null</returns>
        public T GetPanel<T>(string panelName) where T : UIBase
        {
            UIBase panel;
            if (_panelCache.TryGetValue(panelName, out panel) && panel != null && panel.IsOpen)
            {
                return panel as T;
            }
            return null;
        }

        /// <summary>
        /// 检查指定面板是否已打开。
        /// </summary>
        public bool IsPanelOpen(string panelName)
        {
            UIBase panel;
            return _panelCache.TryGetValue(panelName, out panel) && panel != null && panel.IsOpen;
        }

        // =====================================================================
        // 加载面板管理
        // =====================================================================

        /// <summary>
        /// 显示加载面板。
        /// </summary>
        /// <param name="message">加载提示文字</param>
        public void ShowLoading(string message = "加载中...")
        {
            UIBase panel = OpenPanel(Constants.PanelNames.LOADING, message);
            if (panel != null)
            {
                _currentLoadingPanel = Constants.PanelNames.LOADING;
            }
        }

        /// <summary>
        /// 隐藏加载面板。
        /// </summary>
        public void HideLoading()
        {
            if (!string.IsNullOrEmpty(_currentLoadingPanel))
            {
                ClosePanel(_currentLoadingPanel);
            }
        }

        // =====================================================================
        // 缓存管理
        // =====================================================================

        /// <summary>
        /// 销毁并移除指定面板的缓存。
        /// </summary>
        /// <param name="panelName">面板名称</param>
        public void DestroyPanelCache(string panelName)
        {
            UIBase panel;
            if (_panelCache.TryGetValue(panelName, out panel) && panel != null)
            {
                if (panel.IsOpen)
                {
                    panel.OnClose();
                }
                Destroy(panel.gameObject);
                _panelCache.Remove(panelName);
            }
        }

        /// <summary>
        /// 清除所有面板缓存并销毁面板对象。
        /// </summary>
        public void ClearPanelCache()
        {
            foreach (var kvp in _panelCache)
            {
                if (kvp.Value != null)
                {
                    Destroy(kvp.Value.gameObject);
                }
            }
            _panelCache.Clear();
            _currentPopupPanel = string.Empty;
            _currentLoadingPanel = string.Empty;
        }
    }
}
