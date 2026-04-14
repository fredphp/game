// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Core Framework
// =============================================================================
// 描述：游戏管理器 —— 顶层游戏状态管理和子系统协调器。
//       管理所有子管理器（UIManager、NetworkManager、AudioManager），
//       控制游戏生命周期（初始化、开始、暂停、恢复），管理场景加载和玩家数据。
// =============================================================================

using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.SceneManagement;

namespace Jiuzhou.Core
{
    // =====================================================================
    // 游戏状态枚举
    // =====================================================================

    /// <summary>
    /// 游戏主状态枚举。
    /// 每个状态对应游戏的一个主要阶段或场景。
    /// </summary>
    public enum GameState
    {
        /// <summary>未初始化</summary>
        None,

        /// <summary>登录/注册阶段</summary>
        Login,

        /// <summary>主城（大厅）阶段</summary>
        MainCity,

        /// <summary>战斗阶段</summary>
        Battle,

        /// <summary>地图（大地图）阶段</summary>
        Map,

        /// <summary>加载中</summary>
        Loading
    }

    // =====================================================================
    // 玩家基础数据
    // =====================================================================

    /// <summary>
    /// 玩家基础数据缓存。
    /// 登录成功后从服务端获取并保存在内存中。
    /// </summary>
    [Serializable]
    public class PlayerData
    {
        /// <summary>玩家唯一ID</summary>
        public string userId;

        /// <summary>用户名</summary>
        public string username;

        /// <summary>昵称</summary>
        public string nickname;

        /// <summary>头像ID</summary>
        public int avatarId;

        /// <summary>等级</summary>
        public int level;

        /// <summary>经验值</summary>
        public long experience;

        /// <summary>金币</summary>
        public long gold;

        /// <summary>钻石</summary>
        public long diamond;

        /// <summary>体力</summary>
        public int stamina;

        /// <summary>最大体力</summary>
        public int maxStamina;

        /// <summary>公会ID（0 表示未加入公会）</summary>
        public string guildId;

        /// <summary>公会名称</summary>
        public string guildName;

        /// <summary>VIP 等级</summary>
        public int vipLevel;

        /// <summary>上次登录时间</summary>
        public string lastLoginTime;

        /// <summary>最后更新时间戳</summary>
        public long lastUpdated;
    }

    // =====================================================================
    // 游戏管理器（单例）
    // =====================================================================

    /// <summary>
    /// 游戏管理器单例 —— 全局游戏状态管理和子系统协调。
    /// <para>职责：</para>
    /// <para>1. 初始化并管理所有子管理器</para>
    /// <para>2. 控制游戏生命周期（Init -> Start -> Play -> Pause/Resume）</para>
    /// <para>3. 管理游戏主状态切换</para>
    /// <para>4. 场景加载管理</para>
    /// <para>5. 玩家数据缓存</para>
    /// </summary>
    public class GameManager : Singleton<GameManager>
    {
        // =====================================================================
        // 私有字段
        // =====================================================================

        /// <summary>当前游戏状态</summary>
        private GameState _currentState = GameState.None;

        /// <summary>上一个游戏状态（用于状态回退）</summary>
        private GameState _previousState = GameState.None;

        /// <summary>是否已初始化</summary>
        private bool _isInitialized = false;

        /// <summary>是否正在切换状态</summary>
        private bool _isStateChanging = false;

        /// <summary>游戏是否已暂停</summary>
        private bool _isPaused = false;

        /// <summary>玩家数据缓存</summary>
        private PlayerData _playerData;

        /// <summary>当前游戏时间（从游戏开始计算的秒数）</summary>
        private float _gameTime = 0f;

        /// <summary>游戏帧率</summary>
        private int _frameRate = 30;

        /// <summary>场景加载回调字典 —— 场景名 -> 加载完成回调</summary>
        private Dictionary<string, Action> _sceneLoadCallbacks;

        // =====================================================================
        // 公开属性
        // =====================================================================

        /// <summary>当前游戏状态</summary>
        public GameState CurrentState => _currentState;

        /// <summary>上一个游戏状态</summary>
        public GameState PreviousState => _previousState;

        /// <summary>是否已初始化</summary>
        public bool IsInitialized => _isInitialized;

        /// <summary>游戏是否已暂停</summary>
        public bool IsPaused => _isPaused;

        /// <summary>玩家数据</summary>
        public PlayerData PlayerData => _playerData;

        /// <summary>是否有玩家数据</summary>
        public bool HasPlayerData => _playerData != null;

        /// <summary>游戏时间（秒）</summary>
        public float GameTime => _gameTime;

        /// <summary>目标帧率</summary>
        public int TargetFrameRate
        {
            get => _frameRate;
            set
            {
                _frameRate = Mathf.Clamp(value, 15, 120);
                Application.targetFrameRate = _frameRate;
            }
        }

        // =====================================================================
        // 生命周期
        // =====================================================================

        protected override void OnInitialize()
        {
            base.OnInitialize();
            DontDestroyOnLoad();

            _sceneLoadCallbacks = new Dictionary<string, Action>();

            // 设置默认帧率
            Application.targetFrameRate = _frameRate;

            // 初始化子管理器（通过访问 Instance 触发它们的 OnInitialize）
            InitializeSubManagers();

            Debug.Log("[GameManager] 初始化完成。");
        }

        private void Update()
        {
            if (!_isInitialized || _isPaused) return;

            // 累加游戏时间
            _gameTime += Time.deltaTime;
        }

        // =====================================================================
        // 子管理器初始化
        // =====================================================================

        /// <summary>
        /// 初始化所有子管理器。
        /// 通过访问每个管理器的 Instance 属性触发它们的创建和 OnInitialize。
        /// </summary>
        private void InitializeSubManagers()
        {
            // UI 管理器
            var uiManager = UIManager.Instance;
            Debug.Log("[GameManager] 子管理器初始化: UIManager");

            // 网络管理器
            var networkManager = NetworkManager.Instance;
            Debug.Log("[GameManager] 子管理器初始化: NetworkManager");

            // 音频管理器
            var audioManager = AudioManager.Instance;
            Debug.Log("[GameManager] 子管理器初始化: AudioManager");
        }

        // =====================================================================
        // 游戏生命周期
        // =====================================================================

        /// <summary>
        /// 初始化游戏 —— 在 GameEntry.Awake 中调用。
        /// 执行全局初始化操作，如注册事件、加载配置等。
        /// </summary>
        /// <param name="onComplete">初始化完成回调</param>
        public void Initialize(Action onComplete = null)
        {
            StartCoroutine(InitializeRoutine(onComplete));
        }

        /// <summary>
        /// 初始化协程。
        /// </summary>
        private IEnumerator InitializeRoutine(Action onComplete)
        {
            Debug.Log("[GameManager] 开始初始化...");

            // 显示加载界面
            UIManager.Instance.ShowLoading("正在初始化...");

            // 模拟初始化耗时（等待一帧以确保所有管理器已就绪）
            yield return null;

            // 注册全局事件
            RegisterGlobalEvents();

            // 加载本地缓存数据
            LoadCachedData();

            // 初始化完成
            _isInitialized = true;

            // 隐藏加载界面
            UIManager.Instance.HideLoading();

            Debug.Log("[GameManager] 初始化完成。");
            onComplete?.Invoke();
        }

        /// <summary>
        /// 开始游戏 —— 初始化完成后调用。
        /// 根据是否有有效 Token 决定进入登录界面还是主界面。
        /// </summary>
        public void StartGame()
        {
            if (!_isInitialized)
            {
                Debug.LogError("[GameManager] 游戏尚未初始化，无法开始。");
                return;
            }

            Debug.Log("[GameManager] 开始游戏。");

            // 检查是否有有效的已保存 Token
            if (NetworkManager.Instance.HasValidToken())
            {
                // 有有效 Token，尝试进入主城
                EnterState(GameState.MainCity);
            }
            else
            {
                // 无有效 Token，进入登录界面
                EnterState(GameState.Login);
            }
        }

        /// <summary>
        /// 暂停游戏。
        /// </summary>
        public void PauseGame()
        {
            if (_isPaused) return;

            _isPaused = true;
            Time.timeScale = 0f;

            // 暂停音频
            AudioManager.Instance.PauseBGM();

            Debug.Log("[GameManager] 游戏已暂停。");
            EventBus.Trigger(Constants.GameEvents.GAME_PAUSED);
        }

        /// <summary>
        /// 恢复游戏。
        /// </summary>
        public void ResumeGame()
        {
            if (!_isPaused) return;

            _isPaused = false;
            Time.timeScale = 1f;

            // 恢复音频
            AudioManager.Instance.ResumeBGM();

            Debug.Log("[GameManager] 游戏已恢复。");
            EventBus.Trigger(Constants.GameEvents.GAME_RESUMED);
        }

        // =====================================================================
        // 游戏状态管理
        // =====================================================================

        /// <summary>
        /// 切换游戏状态。
        /// </summary>
        /// <param name="newState">新的游戏状态</param>
        /// <param name="args">状态参数（传递给目标状态）</param>
        public void EnterState(GameState newState, params object[] args)
        {
            if (_isStateChanging)
            {
                Debug.LogWarning($"[GameManager] 状态正在切换中，忽略请求: {_currentState} -> {newState}");
                return;
            }

            if (_currentState == newState)
            {
                Debug.LogWarning($"[GameManager] 已经处于状态 {newState}，忽略切换请求。");
                return;
            }

            StartCoroutine(ChangeStateRoutine(newState, args));
        }

        /// <summary>
        /// 状态切换协程。
        /// </summary>
        private IEnumerator ChangeStateRoutine(GameState newState, object[] args)
        {
            _isStateChanging = true;
            GameState oldState = _currentState;

            Debug.Log($"[GameManager] 状态切换: {oldState} -> {newState}");

            // 1. 退出旧状态
            yield return StartCoroutine(ExitStateRoutine(oldState));

            // 2. 过渡（可在此处添加转场动画）
            _previousState = oldState;

            // 3. 进入新状态
            _currentState = newState;
            yield return StartCoroutine(EnterStateRoutine(newState, args));

            _isStateChanging = false;

            Debug.Log($"[GameManager] 状态切换完成: {newState}");
        }

        /// <summary>
        /// 退出旧状态协程。
        /// </summary>
        private IEnumerator ExitStateRoutine(GameState state)
        {
            switch (state)
            {
                case GameState.Login:
                    // 退出登录界面
                    UIManager.Instance.ClosePanel(Constants.PanelNames.LOGIN);
                    break;

                case GameState.MainCity:
                    // 退出主城
                    UIManager.Instance.ClosePanel(Constants.PanelNames.MAIN_CITY);
                    break;

                case GameState.Battle:
                    // 退出战斗
                    UIManager.Instance.ClosePanel(Constants.PanelNames.BATTLE);
                    Time.timeScale = 1f;
                    break;

                case GameState.Map:
                    // 退出地图
                    UIManager.Instance.ClosePanel(Constants.PanelNames.MAP);
                    break;
            }

            yield return null;
        }

        /// <summary>
        /// 进入新状态协程。
        /// </summary>
        private IEnumerator EnterStateRoutine(GameState state, object[] args)
        {
            switch (state)
            {
                case GameState.Login:
                    UIManager.Instance.OpenPanel(Constants.PanelNames.LOGIN);
                    break;

                case GameState.MainCity:
                    UIManager.Instance.OpenPanel(Constants.PanelNames.MAIN_CITY, args);
                    // 播放主城 BGM
                    AudioManager.Instance.PlayBGM("Audio/BGM/MainCity");
                    break;

                case GameState.Battle:
                    UIManager.Instance.OpenPanel(Constants.PanelNames.BATTLE, args);
                    AudioManager.Instance.PlayBGM("Audio/BGM/Battle");
                    break;

                case GameState.Map:
                    UIManager.Instance.OpenPanel(Constants.PanelNames.MAP, args);
                    AudioManager.Instance.PlayBGM("Audio/BGM/Map");
                    break;

                case GameState.Loading:
                    UIManager.Instance.ShowLoading();
                    break;
            }

            yield return null;
        }

        /// <summary>
        /// 回退到上一个状态。
        /// </summary>
        public void ReturnToPreviousState()
        {
            if (_previousState != GameState.None && _previousState != GameState.Loading)
            {
                EnterState(_previousState);
            }
            else
            {
                // 默认回到主城
                EnterState(GameState.MainCity);
            }
        }

        // =====================================================================
        // 玩家数据管理
        // =====================================================================

        /// <summary>
        /// 设置玩家数据（登录成功后调用）。
        /// </summary>
        /// <param name="data">玩家数据</param>
        public void SetPlayerData(PlayerData data)
        {
            _playerData = data;
            if (data != null)
            {
                // 保存关键数据到 PlayerPrefs
                PlayerPrefs.SetString(Constants.PlayerPrefsKeys.USER_ID, data.userId ?? string.Empty);
                PlayerPrefs.SetString(Constants.PlayerPrefsKeys.USERNAME, data.username ?? string.Empty);
                PlayerPrefs.Save();

                EventBus.Trigger(Constants.GameEvents.PLAYER_DATA_UPDATED, data);
            }
        }

        /// <summary>
        /// 更新玩家数据的部分字段。
        /// </summary>
        /// <param name="updater">数据更新委托</param>
        public void UpdatePlayerData(Action<PlayerData> updater)
        {
            if (_playerData == null)
            {
                Debug.LogWarning("[GameManager] UpdatePlayerData: 玩家数据为空，无法更新。");
                return;
            }

            updater(_playerData);
            EventBus.Trigger(Constants.GameEvents.PLAYER_DATA_UPDATED, _playerData);
        }

        /// <summary>
        /// 清除玩家数据（登出时调用）。
        /// </summary>
        public void ClearPlayerData()
        {
            _playerData = null;
            PlayerPrefs.DeleteKey(Constants.PlayerPrefsKeys.USER_ID);
            PlayerPrefs.DeleteKey(Constants.PlayerPrefsKeys.USERNAME);
            PlayerPrefs.Save();
        }

        // =====================================================================
        // 场景加载
        // =====================================================================

        /// <summary>
        /// 加载场景（异步）。
        /// </summary>
        /// <param name="sceneName">场景名称</param>
        /// <param name="onComplete">加载完成回调</param>
        /// <param name="showLoading">是否显示加载界面</param>
        public void LoadScene(string sceneName, Action onComplete = null, bool showLoading = true)
        {
            if (string.IsNullOrEmpty(sceneName))
            {
                Debug.LogError("[GameManager] LoadScene: 场景名称为空。");
                return;
            }

            StartCoroutine(LoadSceneRoutine(sceneName, onComplete, showLoading));
        }

        /// <summary>
        /// 场景加载协程。
        /// </summary>
        private IEnumerator LoadSceneRoutine(string sceneName, Action onComplete, bool showLoading)
        {
            if (showLoading)
            {
                UIManager.Instance.ShowLoading("正在加载...");
            }

            // 关闭所有面板（保留加载面板）
            string loadingPanel = Constants.PanelNames.LOADING;
            UIManager.Instance.CloseAllPanels(loadingPanel);

            // 异步加载场景
            AsyncOperation asyncLoad = SceneManager.LoadSceneAsync(sceneName);

            while (!asyncLoad.isDone)
            {
                // 可以在这里更新加载进度
                float progress = Mathf.Clamp01(asyncLoad.progress / 0.9f);
                Debug.Log($"[GameManager] 场景加载进度: {progress:P0}");
                yield return null;
            }

            // 加载完成
            if (showLoading)
            {
                UIManager.Instance.HideLoading();
            }

            Debug.Log($"[GameManager] 场景 '{sceneName}' 加载完成。");
            onComplete?.Invoke();
        }

        // =====================================================================
        // 本地缓存数据加载
        // =====================================================================

        /// <summary>
        /// 加载本地缓存数据（游戏启动时调用）。
        /// </summary>
        private void LoadCachedData()
        {
            // 从 PlayerPrefs 加载基本用户信息
            string userId = PlayerPrefs.GetString(Constants.PlayerPrefsKeys.USER_ID, string.Empty);
            string username = PlayerPrefs.GetString(Constants.PlayerPrefsKeys.USERNAME, string.Empty);

            if (!string.IsNullOrEmpty(userId))
            {
                _playerData = new PlayerData
                {
                    userId = userId,
                    username = username
                };
                Debug.Log($"[GameManager] 已加载缓存玩家数据: {username} ({userId})");
            }
        }

        // =====================================================================
        // 全局事件注册
        // =====================================================================

        /// <summary>
        /// 注册全局事件监听。
        /// </summary>
        private void RegisterGlobalEvents()
        {
            // Token 过期 —— 自动跳转到登录界面
            EventBus.Register(Constants.GameEvents.TOKEN_EXPIRED, OnTokenExpired);

            // 网络断开
            EventBus.Register(Constants.GameEvents.NETWORK_DISCONNECTED, OnNetworkDisconnected);

            // 网络恢复
            EventBus.Register(Constants.GameEvents.NETWORK_RECONNECTED, OnNetworkReconnected);

            Debug.Log("[GameManager] 已注册全局事件监听。");
        }

        /// <summary>
        /// Token 过期事件处理。
        /// </summary>
        private void OnTokenExpired()
        {
            Debug.LogWarning("[GameManager] Token 过期，返回登录界面。");
            ClearPlayerData();
            EnterState(GameState.Login);
        }

        /// <summary>
        /// 网络断开事件处理。
        /// </summary>
        private void OnNetworkDisconnected()
        {
            Debug.LogWarning("[GameManager] 网络断开。");
            // 可以在此处显示网络断开提示
        }

        /// <summary>
        /// 网络恢复事件处理。
        /// </summary>
        private void OnNetworkReconnected()
        {
            Debug.Log("[GameManager] 网络已恢复。");
            // 可以在此处重新发送未完成的请求
        }

        // =====================================================================
        // 应用生命周期
        // =====================================================================

        /// <summary>
        /// 应用暂停/恢复回调。
        /// </summary>
        /// <param name="pause">true=暂停，false=恢复</param>
        public void OnApplicationPause(bool pause)
        {
            if (pause)
            {
                NetworkManager.Instance.OnAppPause();
                EventBus.Trigger(Constants.GameEvents.APP_PAUSE);
            }
            else
            {
                NetworkManager.Instance.OnAppResume();
                EventBus.Trigger(Constants.GameEvents.APP_RESUME);
            }
        }

        /// <summary>
        /// 应用退出回调。
        /// </summary>
        public void OnApplicationQuit()
        {
            NetworkManager.Instance.OnAppQuit();
            EventBus.Trigger(Constants.GameEvents.APP_QUIT);
        }
    }
}
