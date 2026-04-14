// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Core Framework
// =============================================================================
// 描述：WebSocket 客户端封装。
//       基于 UnityWebRequest 的长轮询（Polling）方式模拟实时通信，
//       同时提供 WebSocket 接口层以便未来替换为真正的 WebSocket 库（如 NativeWebSocket）。
//       支持自动重连（指数退避）、心跳机制、连接状态管理。
// =============================================================================

using System;
using System.Collections;
using UnityEngine;
using UnityEngine.Networking;

namespace Jiuzhou.Core
{
    // =====================================================================
    // WebSocket 连接状态枚举
    // =====================================================================

    /// <summary>
    /// WebSocket 连接状态。
    /// </summary>
    public enum WebSocketState
    {
        /// <summary>未连接</summary>
        Disconnected,

        /// <summary>正在连接中</summary>
        Connecting,

        /// <summary>已连接</summary>
        Connected,

        /// <summary>连接异常</summary>
        Error
    }

    // =====================================================================
    // WebSocket 客户端（单例）
    // =====================================================================

    /// <summary>
    /// WebSocket 客户端单例。
    /// <para>当前实现使用 HTTP 长轮询（Polling）方式模拟实时通信。</para>
    /// <para>接口设计兼容真正的 WebSocket，未来可无缝替换实现。</para>
    /// </summary>
    public class WebSocketClient : Singleton<WebSocketClient>
    {
        // =====================================================================
        // 私有字段
        // =====================================================================

        /// <summary>当前连接状态</summary>
        private WebSocketState _state = WebSocketState.Disconnected;

        /// <summary>长轮询的 URL</summary>
        private string _pollUrl = string.Empty;

        /// <summary>发送消息的 URL</summary>
        private string _sendUrl = string.Empty;

        /// <summary>是否正在轮询</summary>
        private bool _isPolling = false;

        /// <summary>心跳协程引用</summary>
        private Coroutine _heartbeatCoroutine;

        /// <summary>轮询协程引用</summary>
        private Coroutine _pollingCoroutine;

        /// <summary>重连协程引用</summary>
        private Coroutine _reconnectCoroutine;

        /// <summary>当前重连次数</summary>
        private int _reconnectAttempts = 0;

        /// <summary>轮询请求超时时间（秒）—— 长轮询超时，超过此时间后重新发起请求</summary>
        private const int POLL_TIMEOUT = 25;

        // =====================================================================
        // 事件回调
        // =====================================================================

        /// <summary>连接打开事件</summary>
        public event Action OnOpen;

        /// <summary>收到消息事件（参数为消息内容字符串）</summary>
        public event Action<string> OnMessage;

        /// <summary>连接关闭事件</summary>
        public event Action OnClose;

        /// <summary>连接错误事件（参数为错误信息）</summary>
        public event Action<string> OnError;

        // =====================================================================
        // 公开属性
        // =====================================================================

        /// <summary>当前连接状态</summary>
        public WebSocketState State => _state;

        /// <summary>是否已连接</summary>
        public bool IsConnected => _state == WebSocketState.Connected;

        // =====================================================================
        // 生命周期
        // =====================================================================

        protected override void OnInitialize()
        {
            base.OnInitialize();
            Debug.Log("[WebSocketClient] 初始化完成。");
        }

        protected override void OnDestroy()
        {
            Disconnect();
            base.OnDestroy();
        }

        // =====================================================================
        // 连接管理
        // =====================================================================

        /// <summary>
        /// 连接到 WebSocket 服务端。
        /// 使用 HTTP 轮询方式：pollUrl 用于接收消息，sendUrl 用于发送消息。
        /// </summary>
        /// <param name="pollUrl">轮询接收消息的 URL</param>
        /// <param name="sendUrl">发送消息的 URL（可选，默认与 pollUrl 相同）</param>
        public void Connect(string pollUrl, string sendUrl = null)
        {
            if (_state == WebSocketState.Connected || _state == WebSocketState.Connecting)
            {
                Debug.LogWarning("[WebSocketClient] 已经在连接或已连接状态。");
                return;
            }

            _pollUrl = pollUrl;
            _sendUrl = string.IsNullOrEmpty(sendUrl) ? pollUrl : sendUrl;

            StartCoroutine(ConnectRoutine());
        }

        /// <summary>
        /// 连接协程 —— 执行实际的连接流程。
        /// </summary>
        private IEnumerator ConnectRoutine()
        {
            _state = WebSocketState.Connecting;
            Debug.Log($"[WebSocketClient] 正在连接到 {_pollUrl}...");

            // 发送一个初始请求验证连接
            using (UnityWebRequest request = UnityWebRequest.Get(_pollUrl + "?action=connect"))
            {
                request.SetRequestHeader("Authorization", TokenHolder.GetBearerToken());
                request.timeout = 5;

                yield return request.SendWebRequest();

                if (request.result == UnityWebRequest.Result.Success ||
                    request.result == UnityWebRequest.Result.ProtocolError)
                {
                    // 即使返回错误，如果服务器可达也视为连接成功（长轮询模式下）
                    _state = WebSocketState.Connected;
                    _reconnectAttempts = 0;

                    Debug.Log("[WebSocketClient] 连接成功。");
                    OnOpen?.Invoke();
                    EventBus.Trigger(Constants.GameEvents.NETWORK_CONNECTED, "websocket");

                    // 启动心跳
                    StartHeartbeat();

                    // 启动轮询
                    StartPolling();
                }
                else
                {
                    _state = WebSocketState.Error;
                    string errorMsg = $"连接失败: {request.error}";
                    Debug.LogError($"[WebSocketClient] {errorMsg}");
                    OnError?.Invoke(errorMsg);

                    // 自动重连
                    StartCoroutine(ReconnectRoutine());
                }
            }
        }

        /// <summary>
        /// 断开连接。
        /// </summary>
        public void Disconnect()
        {
            StopHeartbeat();
            StopPolling();
            StopReconnect();

            if (_state != WebSocketState.Disconnected)
            {
                _state = WebSocketState.Disconnected;
                _isPolling = false;

                Debug.Log("[WebSocketClient] 已断开连接。");
                OnClose?.Invoke();
                EventBus.Trigger(Constants.GameEvents.NETWORK_DISCONNECTED, "websocket");
            }
        }

        /// <summary>
        /// 发送消息到服务端。
        /// </summary>
        /// <param name="message">要发送的消息内容</param>
        public void Send(string message)
        {
            if (_state != WebSocketState.Connected)
            {
                Debug.LogWarning("[WebSocketClient] 未连接，无法发送消息。");
                return;
            }

            StartCoroutine(SendRoutine(message));
        }

        /// <summary>
        /// 发送消息协程。
        /// </summary>
        private IEnumerator SendRoutine(string message)
        {
            string url = _sendUrl + "?action=send";

            using (UnityWebRequest request = new UnityWebRequest(url, "POST"))
            {
                byte[] bodyRaw = System.Text.Encoding.UTF8.GetBytes(message);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
                request.SetRequestHeader("Content-Type", "application/json");
                request.SetRequestHeader("Authorization", TokenHolder.GetBearerToken());
                request.timeout = 5;

                yield return request.SendWebRequest();

                if (request.result != UnityWebRequest.Result.Success)
                {
                    Debug.LogWarning($"[WebSocketClient] 发送消息失败: {request.error}");
                    OnError?.Invoke($"发送失败: {request.error}");
                }
            }
        }

        // =====================================================================
        // 轮询机制
        // =====================================================================

        /// <summary>
        /// 启动长轮询。
        /// </summary>
        private void StartPolling()
        {
            if (_isPolling) return;
            _isPolling = true;

            if (_pollingCoroutine != null)
            {
                StopCoroutine(_pollingCoroutine);
            }

            _pollingCoroutine = StartCoroutine(PollingRoutine());
        }

        /// <summary>
        /// 停止长轮询。
        /// </summary>
        private void StopPolling()
        {
            _isPolling = false;
            if (_pollingCoroutine != null)
            {
                StopCoroutine(_pollingCoroutine);
                _pollingCoroutine = null;
            }
        }

        /// <summary>
        /// 长轮询协程 —— 持续从服务端拉取新消息。
        /// 使用较长的超时时间实现长轮询效果。
        /// </summary>
        private IEnumerator PollingRoutine()
        {
            Debug.Log("[WebSocketClient] 开始长轮询。");

            while (_isPolling && _state == WebSocketState.Connected)
            {
                string url = _pollUrl + "?action=poll&timeout=" + POLL_TIMEOUT;

                using (UnityWebRequest request = UnityWebRequest.Get(url))
                {
                    request.SetRequestHeader("Authorization", TokenHolder.GetBearerToken());
                    // 设置较长超时（服务器端也应该实现长轮询延迟返回）
                    request.timeout = POLL_TIMEOUT + 5;

                    yield return request.SendWebRequest();

                    if (request.result == UnityWebRequest.Result.Success)
                    {
                        string response = request.downloadHandler.text;

                        // 如果有消息内容，触发消息回调
                        if (!string.IsNullOrEmpty(response) && response != "[]")
                        {
                            // 尝试解析为数组格式的消息列表
                            try
                            {
                                // 检查是否是 JSON 数组
                                string trimmed = response.Trim();
                                if (trimmed.StartsWith("["))
                                {
                                    // 解析 JSON 数组中的每条消息
                                    var messages = JsonHelper.FromJsonRawArray<PollMessage>(response);
                                    if (messages != null)
                                    {
                                        foreach (var msg in messages)
                                        {
                                            if (msg != null && !string.IsNullOrEmpty(msg.content))
                                            {
                                                OnMessage?.Invoke(msg.content);
                                            }
                                        }
                                    }
                                }
                                else
                                {
                                    // 单条消息
                                    OnMessage?.Invoke(response);
                                }
                            }
                            catch (Exception ex)
                            {
                                // 如果解析失败，直接将原始内容作为消息传递
                                Debug.LogWarning($"[WebSocketClient] 消息解析警告: {ex.Message}");
                                OnMessage?.Invoke(response);
                            }
                        }
                    }
                    else if (request.result == UnityWebRequest.Result.ConnectionError ||
                             request.result == UnityWebRequest.Result.DataProcessingError)
                    {
                        Debug.LogWarning($"[WebSocketClient] 轮询失败: {request.error}，将在下次轮询中重试。");
                        // 短暂等待后继续轮询
                        yield return new WaitForSeconds(2f);
                    }
                    // 其他错误（超时等）直接继续轮询 —— 超时在长轮询中是正常行为
                }

                // 轮询间隔（避免空轮询时过于频繁请求）
                yield return new WaitForSeconds(0.1f);
            }

            Debug.Log("[WebSocketClient] 长轮询已停止。");
        }

        // =====================================================================
        // 心跳机制
        // =====================================================================

        /// <summary>
        /// 启动心跳 —— 定期发送心跳消息保持连接活跃。
        /// </summary>
        private void StartHeartbeat()
        {
            StopHeartbeat();
            _heartbeatCoroutine = StartCoroutine(HeartbeatRoutine());
        }

        /// <summary>
        /// 停止心跳。
        /// </summary>
        private void StopHeartbeat()
        {
            if (_heartbeatCoroutine != null)
            {
                StopCoroutine(_heartbeatCoroutine);
                _heartbeatCoroutine = null;
            }
        }

        /// <summary>
        /// 心跳协程 —— 每隔 WEBSOCKET_HEARTBEAT_INTERVAL 秒发送一次心跳。
        /// </summary>
        private IEnumerator HeartbeatRoutine()
        {
            WaitForSeconds wait = new WaitForSeconds(Constants.WEBSOCKET_HEARTBEAT_INTERVAL);

            while (_state == WebSocketState.Connected)
            {
                yield return wait;

                if (_state == WebSocketState.Connected)
                {
                    Send("{\"type\":\"heartbeat\",\"timestamp\":" + DateTimeOffset.UtcNow.ToUnixTimeSeconds() + "}");
                    Debug.Log("[WebSocketClient] 心跳发送。");
                }
            }
        }

        // =====================================================================
        // 自动重连（指数退避）
        // =====================================================================

        /// <summary>
        /// 启动自动重连。
        /// 使用指数退避策略：第 N 次重连等待 2^N 秒（最大 32 秒）。
        /// </summary>
        private IEnumerator ReconnectRoutine()
        {
            StopReconnect();

            _reconnectAttempts = 0;
            int maxAttempts = Constants.WEBSOCKET_MAX_RECONNECT_ATTEMPTS;

            while (_reconnectAttempts < maxAttempts)
            {
                // 计算退避时间：2^reconnectAttempts 秒，最大 32 秒
                float delay = Mathf.Min(
                    Mathf.Pow(2, _reconnectAttempts) * Constants.WEBSOCKET_RECONNECT_BASE_DELAY,
                    32f
                );

                // 加一点随机抖动（jitter），避免多个客户端同时重连
                delay += UnityEngine.Random.Range(0f, 1f);

                _reconnectAttempts++;
                Debug.Log($"[WebSocketClient] 将在 {delay:F1} 秒后进行第 {_reconnectAttempts}/{maxAttempts} 次重连...");

                yield return new WaitForSeconds(delay);

                // 如果已经被外部断开，不再重连
                if (_state == WebSocketState.Disconnected)
                {
                    Debug.Log("[WebSocketClient] 已被主动断开，取消重连。");
                    yield break;
                }

                // 尝试重新连接
                _state = WebSocketState.Connecting;

                using (UnityWebRequest request = UnityWebRequest.Get(_pollUrl + "?action=connect"))
                {
                    request.SetRequestHeader("Authorization", TokenHolder.GetBearerToken());
                    request.timeout = 5;

                    yield return request.SendWebRequest();

                    if (request.result == UnityWebRequest.Result.Success ||
                        request.result == UnityWebRequest.Result.ProtocolError)
                    {
                        // 重连成功
                        _state = WebSocketState.Connected;
                        _reconnectAttempts = 0;

                        Debug.Log("[WebSocketClient] 重连成功。");
                        EventBus.Trigger(Constants.GameEvents.NETWORK_RECONNECTED, "websocket");

                        // 重新启动心跳和轮询
                        StartHeartbeat();
                        StartPolling();

                        yield break;
                    }
                    else
                    {
                        Debug.LogWarning($"[WebSocketClient] 第 {_reconnectAttempts} 次重连失败: {request.error}");
                    }
                }
            }

            // 所有重连尝试均失败
            _state = WebSocketState.Error;
            Debug.LogError("[WebSocketClient] 重连失败，已达最大重试次数。");
            EventBus.Trigger(Constants.GameEvents.NETWORK_RECONNECT_FAILED, "websocket");
            OnError?.Invoke("重连失败，请检查网络连接。");
        }

        /// <summary>
        /// 停止重连协程。
        /// </summary>
        private void StopReconnect()
        {
            if (_reconnectCoroutine != null)
            {
                StopCoroutine(_reconnectCoroutine);
                _reconnectCoroutine = null;
            }
        }

        // =====================================================================
        // 内部数据结构
        // =====================================================================

        /// <summary>
        /// 轮询消息包装类。
        /// </summary>
        [Serializable]
        private class PollMessage
        {
            /// <summary>消息类型</summary>
            public string type;

            /// <summary>消息内容</summary>
            public string content;

            /// <summary>消息时间戳</summary>
            public long timestamp;
        }
    }
}
