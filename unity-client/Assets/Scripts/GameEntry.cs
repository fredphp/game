// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client
// =============================================================================
// 描述：游戏入口点 —— 挂载在首个场景（Bootstrap/Init Scene）的 GameObject 上。
//       负责创建 GameManager 实例并初始化所有子系统。
//       在 Awake 中完成框架初始化，在 Start 中检查 Token 并引导进入对应界面。
//       同时处理应用生命周期事件（暂停、退出）。
// =============================================================================

using UnityEngine;

namespace Jiuzhou.Core
{
    /// <summary>
    /// 游戏入口点 MonoBehaviour。
    /// <para>使用方式：在第一个场景中创建一个 GameObject，挂载此脚本即可。</para>
    /// <para>确保场景中没有其他需要延迟加载的资源阻塞初始化流程。</para>
    /// </summary>
    public class GameEntry : MonoBehaviour
    {
        // =====================================================================
        // Inspector 配置
        // =====================================================================

        [Header("游戏启动配置")]

        [Tooltip("游戏是否自动初始化（取消勾选可用于调试）")]
        [SerializeField] private bool _autoInitialize = true;

        [Tooltip("目标帧率")]
        [SerializeField] private int _targetFrameRate = 30;

        [Tooltip("是否在初始化时清除所有面板缓存")]
        [SerializeField] private bool _clearPanelCacheOnStart = false;

        // =====================================================================
        // Unity 生命周期
        // =====================================================================

        /// <summary>
        /// MonoBehaviour Awake —— 游戏最早的入口点。
        /// <para>执行顺序：</para>
        /// <para>1. 设置帧率</para>
        /// <para>2. 确保 GameManager 单例被创建（触发所有子管理器初始化）</para>
        /// <para>3. 开始异步初始化流程</para>
        /// </summary>
        private void Awake()
        {
            // 设置日志输出级别
            Debug.Log("============================================================");
            Debug.Log("  九州争鼎 (Jiuzhou Zhengding) - Unity Client");
            Debug.Log("  Game Entry Initializing...");
            Debug.Log("============================================================");

            // 设置目标帧率
            Application.targetFrameRate = _targetFrameRate;

            // 设置固定时间步长
            Time.fixedDeltaTime = 1f / _targetFrameRate;

            // 设置永不休眠（防止移动设备锁屏导致游戏暂停）
            Screen.sleepTimeout = SleepTimeout.NeverSleep;

            if (!_autoInitialize)
            {
                Debug.Log("[GameEntry] 自动初始化已禁用，等待手动触发。");
                return;
            }

            // 确保 GameManager 单例被创建
            // 访问 Instance 属性会触发 Singleton 的创建和 OnInitialize
            var gameManager = GameManager.Instance;

            // 开始初始化流程
            gameManager.Initialize(() =>
            {
                Debug.Log("[GameEntry] GameManager 初始化完成。");
            });
        }

        /// <summary>
        /// MonoBehaviour Start —— 初始化完成后调用。
        /// <para>执行顺序：</para>
        /// <para>1. 等待 GameManager 初始化完成</para>
        /// <para>2. 检查是否有已保存的有效 Token</para>
        /// <para>3. 有 Token → 尝试获取玩家信息并进入主城</para>
        /// <para>4. 无 Token → 打开登录面板</para>
        /// </summary>
        private void Start()
        {
            if (!_autoInitialize) return;

            // 如果需要，清除面板缓存
            if (_clearPanelCacheOnStart)
            {
                Debug.Log("[GameEntry] 清除面板缓存。");
                UIManager.Instance.ClearPanelCache();
            }

            // 检查 Token 并开始游戏
            CheckTokenAndStart();
        }

        /// <summary>
        /// 检查 Token 有效性并引导进入对应界面。
        /// </summary>
        private void CheckTokenAndStart()
        {
            // 检查是否有已保存的有效 Token
            if (NetworkManager.Instance.HasValidToken())
            {
                Debug.Log("[GameEntry] 检测到已保存的有效 Token，尝试进入主城...");

                // 尝试获取玩家信息验证 Token 有效性
                NetworkManager.Instance.GetUser<PlayerData>(Constants.UserApi.GET_PROFILE,
                    (ApiResult<PlayerData> result) =>
                    {
                        if (result.IsSuccess() && result.data != null)
                        {
                            // Token 有效，设置玩家数据并进入主城
                            GameManager.Instance.SetPlayerData(result.data);
                            Debug.Log($"[GameEntry] 玩家数据获取成功: {result.data.username} (Lv.{result.data.level})");
                            GameManager.Instance.StartGame();
                        }
                        else
                        {
                            // Token 无效，清除并进入登录界面
                            Debug.LogWarning("[GameEntry] Token 已失效或玩家数据获取失败，进入登录界面。");
                            NetworkManager.Instance.ClearTokens();
                            GameManager.Instance.ClearPlayerData();
                            GameManager.Instance.EnterState(GameState.Login);
                        }
                    });
            }
            else
            {
                // 无有效 Token，直接进入登录界面
                Debug.Log("[GameEntry] 无有效 Token，进入登录界面。");
                GameManager.Instance.StartGame();
            }
        }

        // =====================================================================
        // 应用生命周期
        // =====================================================================

        /// <summary>
        /// 应用暂停/恢复 —— 处理前后台切换。
        /// </summary>
        /// <param name="pauseStatus">true = 进入后台，false = 回到前台</param>
        private void OnApplicationPause(bool pauseStatus)
        {
            if (!GameManager.HasInstance) return;

            if (pauseStatus)
            {
                Debug.Log("[GameEntry] 应用进入后台。");
                GameManager.Instance.OnApplicationPause(true);
            }
            else
            {
                Debug.Log("[GameEntry] 应用回到前台。");
                GameManager.Instance.OnApplicationPause(false);
            }
        }

        /// <summary>
        /// 应用退出 —— 清理资源。
        /// </summary>
        private void OnApplicationQuit()
        {
            Debug.Log("[GameEntry] 应用正在退出...");

            if (GameManager.HasInstance)
            {
                GameManager.Instance.OnApplicationQuit();
            }

            Debug.Log("============================================================");
            Debug.Log("  九州争鼎 - 感谢游玩！");
            Debug.Log("============================================================");
        }

        // =====================================================================
        // 调试方法
        // =====================================================================

#if UNITY_EDITOR
        /// <summary>
        /// 仅在编辑器中使用的重置方法 —— 清除所有本地缓存数据。
        /// </summary>
        [ContextMenu("清除所有本地缓存")]
        private void ClearAllCache()
        {
            PlayerPrefs.DeleteAll();
            Debug.Log("[GameEntry] 已清除所有 PlayerPrefs 缓存。");
        }

        /// <summary>
        /// 仅在编辑器中使用的重置方法 —— 清除 Token。
        /// </summary>
        [ContextMenu("仅清除 Token")]
        private void ClearTokenOnly()
        {
            PlayerPrefs.DeleteKey(Constants.PlayerPrefsKeys.ACCESS_TOKEN);
            PlayerPrefs.DeleteKey(Constants.PlayerPrefsKeys.REFRESH_TOKEN);
            PlayerPrefs.Save();
            Debug.Log("[GameEntry] 已清除 Token。");
        }

        /// <summary>
        /// 仅在编辑器中使用的模拟登录方法 —— 快速进入主城（跳过登录）。
        /// </summary>
        [ContextMenu("模拟登录（直接进入主城）")]
        private void SimulateLogin()
        {
            // 创建模拟玩家数据
            var mockData = new PlayerData
            {
                userId = "debug_user_001",
                username = "DebugPlayer",
                nickname = "调试玩家",
                avatarId = 1,
                level = 30,
                experience = 15000,
                gold = 99999,
                diamond = 8888,
                stamina = 100,
                maxStamina = 120,
                vipLevel = 5
            };

            GameManager.Instance.SetPlayerData(mockData);
            GameManager.Instance.EnterState(GameState.MainCity);

            Debug.Log("[GameEntry] 已模拟登录，直接进入主城。");
        }
#endif
    }
}
