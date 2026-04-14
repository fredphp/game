// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Core Framework
// =============================================================================
// 描述：HTTP 客户端封装 —— 基于 UnityWebRequest 的通用 HTTP 请求工具。
//       支持 GET、POST、PUT、DELETE 方法，泛型响应解析，自动附加 JWT Token，
//       请求超时配置，错误重试机制。
//       使用协程实现异步，所有请求通过回调返回结果。
// =============================================================================

using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace Jiuzhou.Core
{
    // =====================================================================
    // HTTP 请求回调类型
    // =====================================================================

    /// <summary>
    /// 通用 HTTP 请求完成回调。
    /// </summary>
    /// <param name="success">请求是否成功（HTTP 层面成功）</param>
    /// <param name="statusCode">HTTP 状态码（如 200, 404, 500）</param>
    /// <param name="responseBody">响应体 JSON 字符串</param>
    /// <param name="error">错误信息（成功时为 null）</param>
    public delegate void HttpCallback(bool success, long statusCode, string responseBody, string error);

    // =====================================================================
    // HTTP 客户端（单例）
    // =====================================================================

    /// <summary>
    /// HTTP 客户端单例 —— 封装所有 HTTP 请求操作。
    /// <para>使用方式：HttpClient.Instance.Get(url, callback);</para>
    /// <para>使用方式：HttpClient.Instance.Post&lt;T&gt;(url, data, callback);</para>
    /// </summary>
    public class HttpClient : Singleton<HttpClient>
    {
        // =====================================================================
        // 配置
        // =====================================================================

        /// <summary>请求超时时间（秒），可通过 PlayerPrefs 覆盖</summary>
        private int _timeoutSeconds = Constants.HTTP_TIMEOUT;

        /// <summary>最大重试次数</summary>
        private int _maxRetries = Constants.HTTP_MAX_RETRIES;

        /// <summary>重试间隔基础时间（秒）</summary>
        private float _retryDelay = Constants.HTTP_RETRY_DELAY;

        // =====================================================================
        // 公开属性
        // =====================================================================

        /// <summary>获取/设置请求超时时间（秒）</summary>
        public int TimeoutSeconds
        {
            get => _timeoutSeconds;
            set => _timeoutSeconds = Mathf.Max(1, value);
        }

        /// <summary>获取/设置最大重试次数</summary>
        public int MaxRetries
        {
            get => _maxRetries;
            set => _maxRetries = Mathf.Max(0, value);
        }

        // =====================================================================
        // 生命周期
        // =====================================================================

        protected override void OnInitialize()
        {
            base.OnInitialize();
            Debug.Log("[HttpClient] 初始化完成。");
        }

        // =====================================================================
        // GET 请求
        // =====================================================================

        /// <summary>
        /// 发送 GET 请求（原始回调版本）。
        /// </summary>
        /// <param name="url">请求URL</param>
        /// <param name="callback">完成回调</param>
        /// <returns>协程引用（可用于外部停止）</returns>
        public Coroutine Get(string url, HttpCallback callback)
        {
            return StartCoroutine(SendRequestCoroutine(url, "GET", null, callback));
        }

        /// <summary>
        /// 发送 GET 请求（泛型响应版本）。
        /// 自动将响应 JSON 解析为 ApiResult&lt;T&gt;。
        /// </summary>
        /// <typeparam name="T">响应数据类型</typeparam>
        /// <param name="url">请求URL</param>
        /// <param name="callback">完成回调，参数为解析后的 ApiResult</param>
        /// <returns>协程引用</returns>
        public Coroutine Get<T>(string url, Action<ApiResult<T>> callback)
        {
            return StartCoroutine(SendRequestCoroutine(url, "GET", null,
                (success, statusCode, body, error) =>
                {
                    if (callback != null)
                    {
                        callback(ParseResponse<T>(success, statusCode, body, error));
                    }
                }));
        }

        // =====================================================================
        // POST 请求
        // =====================================================================

        /// <summary>
        /// 发送 POST 请求（JSON body，原始回调版本）。
        /// </summary>
        /// <param name="url">请求URL</param>
        /// <param name="body">请求体对象（会被序列化为JSON）</param>
        /// <param name="callback">完成回调</param>
        /// <returns>协程引用</returns>
        public Coroutine Post(string url, object body, HttpCallback callback)
        {
            string jsonBody = body != null ? JsonHelper.ToJson(body) : "{}";
            return StartCoroutine(SendRequestCoroutine(url, "POST", jsonBody, callback));
        }

        /// <summary>
        /// 发送 POST 请求（JSON body，泛型响应版本）。
        /// </summary>
        /// <typeparam name="TRequest">请求体类型</typeparam>
        /// <typeparam name="TResponse">响应数据类型</typeparam>
        /// <param name="url">请求URL</param>
        /// <param name="body">请求体对象</param>
        /// <param name="callback">完成回调</param>
        /// <returns>协程引用</returns>
        public Coroutine Post<TRequest, TResponse>(string url, TRequest body, Action<ApiResult<TResponse>> callback)
        {
            string jsonBody = body != null ? JsonHelper.ToJson(body) : "{}";
            return StartCoroutine(SendRequestCoroutine(url, "POST", jsonBody,
                (success, statusCode, responseBody, error) =>
                {
                    if (callback != null)
                    {
                        callback(ParseResponse<TResponse>(success, statusCode, responseBody, error));
                    }
                }));
        }

        /// <summary>
        /// 发送 POST 请求（JSON body，仅指定响应类型的便捷版本）。
        /// </summary>
        /// <typeparam name="T">响应数据类型</typeparam>
        /// <param name="url">请求URL</param>
        /// <param name="body">请求体对象</param>
        /// <param name="callback">完成回调</param>
        /// <returns>协程引用</returns>
        public Coroutine Post<T>(string url, object body, Action<ApiResult<T>> callback)
        {
            string jsonBody = body != null ? JsonHelper.ToJson(body) : "{}";
            return StartCoroutine(SendRequestCoroutine(url, "POST", jsonBody,
                (success, statusCode, responseBody, error) =>
                {
                    if (callback != null)
                    {
                        callback(ParseResponse<T>(success, statusCode, responseBody, error));
                    }
                }));
        }

        // =====================================================================
        // PUT 请求
        // =====================================================================

        /// <summary>
        /// 发送 PUT 请求（JSON body，原始回调版本）。
        /// </summary>
        /// <param name="url">请求URL</param>
        /// <param name="body">请求体对象</param>
        /// <param name="callback">完成回调</param>
        /// <returns>协程引用</returns>
        public Coroutine Put(string url, object body, HttpCallback callback)
        {
            string jsonBody = body != null ? JsonHelper.ToJson(body) : "{}";
            return StartCoroutine(SendRequestCoroutine(url, "PUT", jsonBody, callback));
        }

        /// <summary>
        /// 发送 PUT 请求（JSON body，泛型响应版本）。
        /// </summary>
        /// <typeparam name="T">响应数据类型</typeparam>
        /// <param name="url">请求URL</param>
        /// <param name="body">请求体对象</param>
        /// <param name="callback">完成回调</param>
        /// <returns>协程引用</returns>
        public Coroutine Put<T>(string url, object body, Action<ApiResult<T>> callback)
        {
            string jsonBody = body != null ? JsonHelper.ToJson(body) : "{}";
            return StartCoroutine(SendRequestCoroutine(url, "PUT", jsonBody,
                (success, statusCode, responseBody, error) =>
                {
                    if (callback != null)
                    {
                        callback(ParseResponse<T>(success, statusCode, responseBody, error));
                    }
                }));
        }

        // =====================================================================
        // DELETE 请求
        // =====================================================================

        /// <summary>
        /// 发送 DELETE 请求（原始回调版本）。
        /// </summary>
        /// <param name="url">请求URL</param>
        /// <param name="callback">完成回调</param>
        /// <returns>协程引用</returns>
        public Coroutine Delete(string url, HttpCallback callback)
        {
            return StartCoroutine(SendRequestCoroutine(url, "DELETE", null, callback));
        }

        /// <summary>
        /// 发送 DELETE 请求（泛型响应版本）。
        /// </summary>
        /// <typeparam name="T">响应数据类型</typeparam>
        /// <param name="url">请求URL</param>
        /// <param name="callback">完成回调</param>
        /// <returns>协程引用</returns>
        public Coroutine Delete<T>(string url, Action<ApiResult<T>> callback)
        {
            return StartCoroutine(SendRequestCoroutine(url, "DELETE", null,
                (success, statusCode, responseBody, error) =>
                {
                    if (callback != null)
                    {
                        callback(ParseResponse<T>(success, statusCode, responseBody, error));
                    }
                }));
        }

        // =====================================================================
        // 核心请求协程（带重试逻辑）
        // =====================================================================

        /// <summary>
        /// 核心请求协程 —— 执行 HTTP 请求，支持重试。
        /// </summary>
        /// <param name="url">完整URL</param>
        /// <param name="method">HTTP 方法</param>
        /// <param name="jsonBody">JSON 请求体（GET/DELETE 时为 null）</param>
        /// <param name="callback">完成回调</param>
        /// <returns>IEnumerator</returns>
        private IEnumerator SendRequestCoroutine(string url, string method, string jsonBody, HttpCallback callback)
        {
            int currentRetry = 0;
            bool success = false;
            long statusCode = 0;
            string responseBody = string.Empty;
            string errorMessage = string.Empty;

            while (currentRetry <= _maxRetries)
            {
                // 如果不是第一次尝试，等待重试间隔
                if (currentRetry > 0)
                {
                    float delay = _retryDelay * currentRetry;
                    Debug.Log($"[HttpClient] 重试 #{currentRetry}，等待 {delay} 秒后重试...");
                    yield return new WaitForSeconds(delay);
                }

                // 使用 using 确保 UnityWebRequest 被正确释放
                using (UnityWebRequest request = CreateWebRequest(url, method, jsonBody))
                {
                    // 发送请求并等待完成
                    yield return request.SendWebRequest();

                    // 处理结果
                    bool networkError = request.result == UnityWebRequest.Result.ConnectionError ||
                                       request.result == UnityWebRequest.Result.DataProcessingError;

                    if (networkError)
                    {
                        // 网络错误 —— 可以重试
                        statusCode = 0;
                        errorMessage = request.error;

                        Debug.LogWarning($"[HttpClient] 请求失败 [{method}] {url}: {request.error}");

                        currentRetry++;
                        continue;
                    }

                    // HTTP 请求已到达服务端
                    success = true;
                    statusCode = (long)request.responseCode;

                    if (request.downloadHandler != null)
                    {
                        responseBody = request.downloadHandler.text;
                    }

                    // 日志（仅调试时输出完整 body）
                    Debug.Log($"[HttpClient] [{method}] {url} => HTTP {(int)statusCode}");

                    break;
                }
            }

            // 所有重试都失败
            if (!success)
            {
                Debug.LogError($"[HttpClient] 请求最终失败 [{method}] {url}，已重试 {_maxRetries} 次。");
                errorMessage = $"请求失败（重试{_maxRetries}次后仍失败）";
            }

            // 通过回调返回结果（确保在主线程回调）
            callback?.Invoke(success, statusCode, responseBody, errorMessage);
        }

        // =====================================================================
        // 创建 UnityWebRequest
        // =====================================================================

        /// <summary>
        /// 创建并配置 UnityWebRequest 实例。
        /// 自动附加 JWT Token、Content-Type 等通用请求头。
        /// </summary>
        /// <param name="url">完整URL</param>
        /// <param name="method">HTTP 方法</param>
        /// <param name="jsonBody">JSON 请求体（GET/DELETE 时为 null）</param>
        /// <returns>配置好的 UnityWebRequest</returns>
        private UnityWebRequest CreateWebRequest(string url, string method, string jsonBody)
        {
            UnityWebRequest request;

            // GET 和 DELETE 请求不需要 body
            if (method == "GET" || method == "DELETE")
            {
                request = new UnityWebRequest(url, method);
                request.downloadHandler = new DownloadHandlerBuffer();
            }
            else
            {
                // POST、PUT 等需要 body 的请求
                byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody ?? "{}");
                request = new UnityWebRequest(url, method);
                request.uploadHandler = new UploadHandlerRaw(bodyRaw);
                request.downloadHandler = new DownloadHandlerBuffer();
            }

            // 设置通用请求头
            request.SetRequestHeader("Content-Type", "application/json");
            request.SetRequestHeader("Accept", "application/json");

            // 附加 JWT Token
            string bearerToken = TokenHolder.GetBearerToken();
            if (!string.IsNullOrEmpty(bearerToken))
            {
                request.SetRequestHeader("Authorization", bearerToken);
            }

            // 设置超时
            request.timeout = _timeoutSeconds;

            return request;
        }

        // =====================================================================
        // 响应解析
        // =====================================================================

        /// <summary>
        /// 解析 HTTP 响应为泛型 ApiResult。
        /// </summary>
        /// <typeparam name="T">响应数据类型</typeparam>
        /// <param name="success">HTTP 是否成功</param>
        /// <param name="statusCode">HTTP 状态码</param>
        /// <param name="responseBody">响应体</param>
        /// <param name="error">错误信息</param>
        /// <returns>解析后的 ApiResult</returns>
        private ApiResult<T> ParseResponse<T>(bool success, long statusCode, string responseBody, string error)
        {
            // 网络层面失败
            if (!success)
            {
                return ApiResult<T>.CreateErrorResult((int)statusCode > 0 ? (int)statusCode : ResponseCode.INTERNAL_ERROR,
                    error ?? "网络请求失败");
            }

            // HTTP 层面成功，解析响应体
            if (string.IsNullOrEmpty(responseBody))
            {
                Debug.LogWarning($"[HttpClient] 响应体为空，HTTP 状态码: {statusCode}");
                return ApiResult<T>.CreateErrorResult(ResponseCode.INTERNAL_ERROR, "响应体为空");
            }

            // 使用 ApiResult.Parse 解析
            var result = ApiResult<T>.Parse(responseBody);

            // 检查是否 Token 过期
            if (result.IsTokenExpired())
            {
                Debug.LogWarning("[HttpClient] Token 已过期或无效，触发 Token 过期事件。");
                EventBus.Trigger(Constants.GameEvents.TOKEN_EXPIRED);
            }

            return result;
        }

        // =====================================================================
        // 便捷 URL 构建方法
        // =====================================================================

        /// <summary>
        /// 构建完整的 API URL。
        /// </summary>
        /// <param name="baseUrl">服务基础URL（如 Constants.USER_URL）</param>
        /// <param name="apiPath">API 路径（如 Constants.UserApi.GET_PROFILE）</param>
        /// <returns>完整 URL</returns>
        public static string BuildUrl(string baseUrl, string apiPath)
        {
            // 移除 apiPath 开头的斜杠（如果有）
            if (apiPath.StartsWith("/"))
            {
                apiPath = apiPath.Substring(1);
            }
            return $"{baseUrl}/{apiPath}";
        }

        /// <summary>
        /// 构建带路径参数的 API URL。
        /// 将 URL 中的 {paramName} 替换为实际值。
        /// </summary>
        /// <param name="baseUrl">服务基础URL</param>
        /// <param name="apiPath">API 路径（可包含 {参数} 占位符）</param>
        /// <param name="pathParams">路径参数字典</param>
        /// <returns>完整 URL</returns>
        public static string BuildUrl(string baseUrl, string apiPath, params object[] pathParams)
        {
            string url = BuildUrl(baseUrl, apiPath);

            // 将路径参数依次替换
            for (int i = 0; i < pathParams.Length; i++)
            {
                url = url.ReplaceFirst("{" + i + "}", pathParams[i]?.ToString() ?? "");
            }

            return url;
        }

        // =====================================================================
        // 辅助扩展方法
        // =====================================================================

        /// <summary>
        /// 字符串替换辅助 —— 仅替换第一个匹配项。
        /// </summary>
        /// <param name="source">源字符串</param>
        /// <param name="oldValue">要替换的值</param>
        /// <param name="newValue">新值</param>
        /// <returns>替换后的字符串</returns>
        private static string ReplaceFirst(this string source, string oldValue, string newValue)
        {
            if (string.IsNullOrEmpty(source) || string.IsNullOrEmpty(oldValue))
                return source;

            int index = source.IndexOf(oldValue, StringComparison.Ordinal);
            if (index < 0)
                return source;

            return source.Substring(0, index) + newValue + source.Substring(index + oldValue.Length);
        }
    }
}
