// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Core Framework
// =============================================================================
// 描述：网络管理器 —— 统一管理 HTTP 客户端和 WebSocket 客户端。
//       负责连接状态监控、在线/离线事件广播、Token 持久化管理、
//       自动刷新 Token 逻辑、服务端 URL 配置。
// =============================================================================

using System;
using System.Collections;
using UnityEngine;

namespace Jiuzhou.Core
{
    /// <summary>
    /// 网络连接状态枚举。
    /// </summary>
    public enum NetworkStatus
    {
        /// <summary>离线（未连接）</summary>
        Offline,

        /// <summary>正在连接</summary>
        Connecting,

        /// <summary>在线（已连接）</summary>
        Online,

        /// <summary>重连中</summary>
        Reconnecting
    }

    /// <summary>
    /// 网络管理器单例 —— 全局网络状态管理和 Token 生命周期管理。
    /// <para>职责：</para>
    /// <para>1. 管理 HttpClient 和 WebSocketClient 实例</para>
    /// <para>2. 监控网络连接状态变化并广播事件</para>
    /// <para>3. Token 的本地持久化（PlayerPrefs）和自动刷新</para>
    /// <para>4. 服务端 URL 统一配置</para>
    /// </summary>
    public class NetworkManager : Singleton<NetworkManager>
    {
        // =====================================================================
        // 私有字段
        // =====================================================================

        /// <summary>当前网络连接状态</summary>
        private NetworkStatus _status = NetworkStatus.Offline;

        /// <summary>是否已达到网络可用的判定（使用 Application.internetReachability）</summary>
        private bool _isReachable;

        /// <summary>网络可达性检测协程</summary>
        private Coroutine _reachabilityCoroutine;

        /// <summary>Token 自动刷新协程</summary>
        private Coroutine _tokenRefreshCoroutine;

        /// <summary>是否正在刷新 Token</summary>
        private bool _isRefreshingToken = false;

        /// <summary>服务器基础 URL 配置（可在运行时修改）</summary>
        private string _serverBaseUrl = Constants.BASE_URL;

        // =====================================================================
        // 公开属性
        // =====================================================================

        /// <summary>当前网络连接状态</summary>
        public NetworkStatus Status => _status;

        /// <summary>是否在线</summary>
        public bool IsOnline => _status == NetworkStatus.Online;

        /// <summary>HTTP 客户端实例</summary>
        public HttpClient Http => HttpClient.Instance;

        /// <summary>WebSocket 客户端实例</summary>
        public WebSocketClient WebSocket => WebSocketClient.Instance;

        /// <summary>获取/设置服务器基础 URL</summary>
        public string ServerBaseUrl
        {
            get => _serverBaseUrl;
            set
            {
                if (!string.IsNullOrEmpty(value))
                {
                    _serverBaseUrl = value.TrimEnd('/');
                    PlayerPrefs.SetString(Constants.PlayerPrefsKeys.SERVER_URL, _serverBaseUrl);
                    PlayerPrefs.Save();
                    Debug.Log($"[NetworkManager] 服务器 URL 已更新为: {_serverBaseUrl}");
                }
            }
        }

        /// <summary>用户服务完整 URL</summary>
        public string UserServiceUrl => $"{_serverBaseUrl}:{Constants.PORT_USER}{Constants.API_VERSION}";

        /// <summary>卡牌服务完整 URL</summary>
        public string CardServiceUrl => $"{_serverBaseUrl}:{Constants.PORT_CARD}{Constants.API_VERSION}";

        /// <summary>战斗服务完整 URL</summary>
        public string BattleServiceUrl => $"{_serverBaseUrl}:{Constants.PORT_BATTLE}{Constants.API_VERSION}";

        /// <summary>地图服务完整 URL</summary>
        public string MapServiceUrl => $"{_serverBaseUrl}:{Constants.PORT_MAP}{Constants.API_VERSION}";

        /// <summary>公会服务完整 URL</summary>
        public string GuildServiceUrl => $"{_serverBaseUrl}:{Constants.PORT_GUILD}{Constants.API_VERSION}";

        // =====================================================================
        // 生命周期
        // =====================================================================

        protected override void OnInitialize()
        {
            base.OnInitialize();
            DontDestroyOnLoad();

            // 加载保存的服务器 URL
            string savedUrl = PlayerPrefs.GetString(Constants.PlayerPrefsKeys.SERVER_URL, string.Empty);
            if (!string.IsNullOrEmpty(savedUrl))
            {
                _serverBaseUrl = savedUrl;
            }

            // 加载已保存的 Token
            TokenHolder.LoadSavedTokens();

            Debug.Log($"[NetworkManager] 初始化完成。服务器: {_serverBaseUrl}");
        }

        /// <summary>
        /// MonoBehaviour Start —— 启动网络监控。
        /// </summary>
        private void Start()
        {
            // 启动网络可达性检测
            StartReachabilityCheck();

            // 如果有已保存的 Token，启动 Token 自动刷新
            if (TokenHolder.HasToken)
            {
                StartTokenRefreshMonitor();
            }
        }

        /// <summary>
        /// MonoBehaviour OnDestroy —— 清理网络资源。
        /// </summary>
        protected override void OnDestroy()
        {
            StopReachabilityCheck();
            StopTokenRefreshMonitor();
            DisconnectWebSocket();
            base.OnDestroy();
        }

        // =====================================================================
        // 网络状态管理
        // =====================================================================

        /// <summary>
        /// 标记网络为在线状态。
        /// </summary>
        public void SetOnline()
        {
            if (_status == NetworkStatus.Online) return;

            NetworkStatus oldStatus = _status;
            _status = NetworkStatus.Online;

            Debug.Log($"[NetworkManager] 网络状态: {oldStatus} -> Online");

            if (oldStatus != NetworkStatus.Online)
            {
                EventBus.Trigger(Constants.GameEvents.NETWORK_CONNECTED);
            }
        }

        /// <summary>
        /// 标记网络为离线状态。
        /// </summary>
        public void SetOffline()
        {
            if (_status == NetworkStatus.Offline) return;

            NetworkStatus oldStatus = _status;
            _status = NetworkStatus.Offline;

            Debug.Log($"[NetworkManager] 网络状态: {oldStatus} -> Offline");

            if (oldStatus != NetworkStatus.Offline)
            {
                EventBus.Trigger(Constants.GameEvents.NETWORK_DISCONNECTED);
            }
        }

        /// <summary>
        /// 标记网络为重连中状态。
        /// </summary>
        public void SetReconnecting()
        {
            _status = NetworkStatus.Reconnecting;
            Debug.Log("[NetworkManager] 网络状态: Reconnecting");
        }

        // =====================================================================
        // 网络可达性检测
        // =====================================================================

        /// <summary>
        /// 启动网络可达性周期性检测。
        /// </summary>
        private void StartReachabilityCheck()
        {
            if (_reachabilityCoroutine != null)
            {
                StopCoroutine(_reachabilityCoroutine);
            }
            _reachabilityCoroutine = StartCoroutine(ReachabilityCheckRoutine());
        }

        /// <summary>
        /// 停止网络可达性检测。
        /// </summary>
        private void StopReachabilityCheck()
        {
            if (_reachabilityCoroutine != null)
            {
                StopCoroutine(_reachabilityCoroutine);
                _reachabilityCoroutine = null;
            }
        }

        /// <summary>
        /// 网络可达性检测协程 —— 每 5 秒检查一次网络连接状态。
        /// </summary>
        private IEnumerator ReachabilityCheckRoutine()
        {
            WaitForSeconds checkInterval = new WaitForSeconds(5f);

            while (true)
            {
                // 检查网络可达性
                bool wasReachable = _isReachable;
                _isReachable = Application.internetReachability != NetworkReachability.NotReachable;

                // 状态变化处理
                if (!wasReachable && _isReachable)
                {
                    // 从不可达变为可达 —— 网络恢复
                    Debug.Log("[NetworkManager] 网络已恢复。");
                    SetOnline();
                }
                else if (wasReachable && !_isReachable)
                {
                    // 从可达变为不可达 —— 网络断开
                    Debug.LogWarning("[NetworkManager] 网络已断开。");
                    SetOffline();
                }

                yield return checkInterval;
            }
        }

        // =====================================================================
        // Token 管理
        // =====================================================================

        /// <summary>
        /// 保存登录获得的 Token 信息。
        /// </summary>
        /// <param name="accessToken">访问令牌</param>
        /// <param name="refreshToken">刷新令牌</param>
        /// <param name="expiresIn">有效期（秒）</param>
        public void SaveTokens(string accessToken, string refreshToken, long expiresIn)
        {
            TokenHolder.SetTokens(accessToken, refreshToken, expiresIn);
            StartTokenRefreshMonitor();
            EventBus.Trigger(Constants.GameEvents.TOKEN_REFRESHED);
        }

        /// <summary>
        /// 清除所有 Token（登出时调用）。
        /// </summary>
        public void ClearTokens()
        {
            TokenHolder.ClearTokens();
            StopTokenRefreshMonitor();
            DisconnectWebSocket();
            EventBus.Trigger(Constants.GameEvents.PLAYER_LOGOUT);
        }

        /// <summary>
        /// 检查是否存在有效的已保存 Token。
        /// </summary>
        public bool HasValidToken()
        {
            return TokenHolder.HasToken && !TokenHolder.IsExpired();
        }

        /// <summary>
        /// 手动刷新 Token。
        /// </summary>
        /// <param name="onSuccess">刷新成功回调</param>
        /// <param name="onFailure">刷新失败回调</param>
        public void RefreshToken(Action onSuccess = null, Action onFailure = null)
        {
            if (_isRefreshingToken)
            {
                Debug.LogWarning("[NetworkManager] Token 正在刷新中，请勿重复调用。");
                return;
            }

            if (!TokenHolder.HasToken || string.IsNullOrEmpty(TokenHolder.RefreshToken))
            {
                Debug.LogWarning("[NetworkManager] 无可用的 RefreshToken，无法刷新。");
                onFailure?.Invoke();
                return;
            }

            _isRefreshingToken = true;
            string refreshToken = TokenHolder.RefreshToken;

            string url = HttpClient.BuildUrl(UserServiceUrl, Constants.UserApi.REFRESH_TOKEN);

            Http.Post(url, new { refresh_token = refreshToken },
                (ApiResult<object> result) =>
                {
                    _isRefreshingToken = false;

                    if (result.IsSuccess())
                    {
                        // 从响应中提取新 Token（通过 JsonHelper 提取字段）
                        string responseBody = JsonHelper.ToJson(result.data);
                        string newAccessToken = JsonHelper.ExtractField<string>(responseBody, "access_token");
                        string newRefreshToken = JsonHelper.ExtractField<string>(responseBody, "refresh_token");
                        long expiresIn = JsonHelper.ExtractField<long>(responseBody, "expires_in");

                        if (!string.IsNullOrEmpty(newAccessToken))
                        {
                            TokenHolder.SetTokens(newAccessToken, newRefreshToken, expiresIn);
                            EventBus.Trigger(Constants.GameEvents.TOKEN_REFRESHED);
                            onSuccess?.Invoke();
                            return;
                        }
                    }

                    Debug.LogWarning("[NetworkManager] Token 刷新失败，需要重新登录。");
                    EventBus.Trigger(Constants.GameEvents.TOKEN_EXPIRED);
                    onFailure?.Invoke();
                });
        }

        // =====================================================================
        // Token 自动刷新监控
        // =====================================================================

        /// <summary>
        /// 启动 Token 自动刷新监控协程。
        /// 每 60 秒检查一次 Token 是否需要刷新。
        /// </summary>
        private void StartTokenRefreshMonitor()
        {
            if (_tokenRefreshCoroutine != null)
            {
                StopCoroutine(_tokenRefreshCoroutine);
            }
            _tokenRefreshCoroutine = StartCoroutine(TokenRefreshMonitorRoutine());
        }

        /// <summary>
        /// 停止 Token 自动刷新监控。
        /// </summary>
        private void StopTokenRefreshMonitor()
        {
            if (_tokenRefreshCoroutine != null)
            {
                StopCoroutine(_tokenRefreshCoroutine);
                _tokenRefreshCoroutine = null;
            }
        }

        /// <summary>
        /// Token 自动刷新监控协程。
        /// 定期检查 Token 是否即将过期，自动触发刷新。
        /// </summary>
        private IEnumerator TokenRefreshMonitorRoutine()
        {
            // 等待 30 秒后开始检查（避免游戏启动时立即刷新）
            yield return new WaitForSeconds(30f);

            while (TokenHolder.HasToken)
            {
                // 如果 Token 已过期或即将过期，尝试刷新
                if (TokenHolder.IsExpired())
                {
                    Debug.LogWarning("[NetworkManager] Token 已过期，尝试刷新...");
                    RefreshToken(
                        () => Debug.Log("[NetworkManager] Token 刷新成功。"),
                        () =>
                        {
                            Debug.LogError("[NetworkManager] Token 刷新失败，需要重新登录。");
                            EventBus.Trigger(Constants.GameEvents.TOKEN_EXPIRED);
                        }
                    );
                }
                else if (TokenHolder.ShouldRefresh())
                {
                    Debug.Log("[NetworkManager] Token 即将过期，提前刷新...");
                    RefreshToken();
                }

                // 每 60 秒检查一次
                yield return new WaitForSeconds(60f);
            }

            Debug.Log("[NetworkManager] Token 自动刷新监控已停止（无有效 Token）。");
        }

        // =====================================================================
        // WebSocket 管理
        // =====================================================================

        /// <summary>
        /// 连接 WebSocket 服务。
        /// </summary>
        /// <param name="port">WebSocket 服务端口</param>
        public void ConnectWebSocket(int port)
        {
            string wsUrl = $"{_serverBaseUrl}:{port}/ws";
            WebSocket.Connect(wsUrl);
        }

        /// <summary>
        /// 连接到指定 WebSocket URL。
        /// </summary>
        /// <param name="pollUrl">轮询 URL</param>
        /// <param name="sendUrl">发送 URL</param>
        public void ConnectWebSocket(string pollUrl, string sendUrl = null)
        {
            WebSocket.Connect(pollUrl, sendUrl);
        }

        /// <summary>
        /// 断开 WebSocket 连接。
        /// </summary>
        public void DisconnectWebSocket()
        {
            WebSocket.Disconnect();
        }

        /// <summary>
        /// 通过 WebSocket 发送消息。
        /// </summary>
        /// <param name="message">消息内容</param>
        public void SendWebSocketMessage(string message)
        {
            WebSocket.Send(message);
        }

        // =====================================================================
        // 便捷 API 请求方法
        // =====================================================================

        /// <summary>
        /// 向用户服务发送 GET 请求。
        /// </summary>
        /// <typeparam name="T">响应数据类型</typeparam>
        /// <param name="apiPath">API 路径</param>
        /// <param name="callback">回调</param>
        public Coroutine GetUser<T>(string apiPath, Action<ApiResult<T>> callback)
        {
            string url = HttpClient.BuildUrl(UserServiceUrl, apiPath);
            return Http.Get<T>(url, callback);
        }

        /// <summary>
        /// 向用户服务发送 POST 请求。
        /// </summary>
        public Coroutine PostUser<T>(string apiPath, object body, Action<ApiResult<T>> callback)
        {
            string url = HttpClient.BuildUrl(UserServiceUrl, apiPath);
            return Http.Post<T>(url, body, callback);
        }

        /// <summary>
        /// 向卡牌服务发送 GET 请求。
        /// </summary>
        public Coroutine GetCard<T>(string apiPath, Action<ApiResult<T>> callback)
        {
            string url = HttpClient.BuildUrl(CardServiceUrl, apiPath);
            return Http.Get<T>(url, callback);
        }

        /// <summary>
        /// 向卡牌服务发送 POST 请求。
        /// </summary>
        public Coroutine PostCard<T>(string apiPath, object body, Action<ApiResult<T>> callback)
        {
            string url = HttpClient.BuildUrl(CardServiceUrl, apiPath);
            return Http.Post<T>(url, body, callback);
        }

        /// <summary>
        /// 向战斗服务发送 GET 请求。
        /// </summary>
        public Coroutine GetBattle<T>(string apiPath, Action<ApiResult<T>> callback)
        {
            string url = HttpClient.BuildUrl(BattleServiceUrl, apiPath);
            return Http.Get<T>(url, callback);
        }

        /// <summary>
        /// 向战斗服务发送 POST 请求。
        /// </summary>
        public Coroutine PostBattle<T>(string apiPath, object body, Action<ApiResult<T>> callback)
        {
            string url = HttpClient.BuildUrl(BattleServiceUrl, apiPath);
            return Http.Post<T>(url, body, callback);
        }

        /// <summary>
        /// 向地图服务发送 GET 请求。
        /// </summary>
        public Coroutine GetMap<T>(string apiPath, Action<ApiResult<T>> callback)
        {
            string url = HttpClient.BuildUrl(MapServiceUrl, apiPath);
            return Http.Get<T>(url, callback);
        }

        /// <summary>
        /// 向地图服务发送 POST 请求。
        /// </summary>
        public Coroutine PostMap<T>(string apiPath, object body, Action<ApiResult<T>> callback)
        {
            string url = HttpClient.BuildUrl(MapServiceUrl, apiPath);
            return Http.Post<T>(url, body, callback);
        }

        /// <summary>
        /// 向公会服务发送 GET 请求。
        /// </summary>
        public Coroutine GetGuild<T>(string apiPath, Action<ApiResult<T>> callback)
        {
            string url = HttpClient.BuildUrl(GuildServiceUrl, apiPath);
            return Http.Get<T>(url, callback);
        }

        /// <summary>
        /// 向公会服务发送 POST 请求。
        /// </summary>
        public Coroutine PostGuild<T>(string apiPath, object body, Action<ApiResult<T>> callback)
        {
            string url = HttpClient.BuildUrl(GuildServiceUrl, apiPath);
            return Http.Post<T>(url, body, callback);
        }

        // =====================================================================
        // 应用生命周期
        // =====================================================================

        /// <summary>
        /// 应用进入后台（OnApplicationPause(true)）。
        /// </summary>
        public void OnAppPause()
        {
            Debug.Log("[NetworkManager] 应用进入后台。");
            EventBus.Trigger(Constants.GameEvents.APP_PAUSE);

            // 暂停 WebSocket 心跳和轮询
            WebSocket.Disconnect();
        }

        /// <summary>
        /// 应用从后台恢复（OnApplicationPause(false)）。
        /// </summary>
        public void OnAppResume()
        {
            Debug.Log("[NetworkManager] 应用从后台恢复。");
            EventBus.Trigger(Constants.GameEvents.APP_RESUME);

            // 检查 Token 有效性
            if (TokenHolder.IsExpired())
            {
                RefreshToken();
            }

            // 重新检查网络可达性
            _isReachable = Application.internetReachability != NetworkReachability.NotReachable;
            if (_isReachable)
            {
                SetOnline();
            }
        }

        /// <summary>
        /// 应用即将退出。
        /// </summary>
        public void OnAppQuit()
        {
            Debug.Log("[NetworkManager] 应用退出。");
            EventBus.Trigger(Constants.GameEvents.APP_QUIT);
            DisconnectWebSocket();
        }
    }
}
