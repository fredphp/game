// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Core Framework
// =============================================================================
// 描述：通用 API 响应包装类，所有服务端返回的 JSON 数据统一通过此类解析。
//       包含泛型数据字段、状态码校验、静态 Token 管理器。
// =============================================================================

using System;
using UnityEngine;

namespace Jiuzhou.Core
{
    // =====================================================================
    // API 响应码常量
    // =====================================================================

    /// <summary>
    /// 服务端返回的响应码定义，与 Go 后端保持一致。
    /// </summary>
    public static class ResponseCode
    {
        /// <summary>成功</summary>
        public const int SUCCESS = 0;

        /// <summary>参数错误</summary>
        public const int INVALID_PARAMS = 10001;

        /// <summary>未授权（未登录或 Token 无效）</summary>
        public const int UNAUTHORIZED = 10002;

        /// <summary>Token 已过期</summary>
        public const int TOKEN_EXPIRED = 10003;

        /// <summary>权限不足</summary>
        public const int FORBIDDEN = 10004;

        /// <summary>资源不存在</summary>
        public const int NOT_FOUND = 10005;

        /// <summary>服务器内部错误</summary>
        public const int INTERNAL_ERROR = 20001;

        /// <summary>数据库错误</summary>
        public const int DB_ERROR = 20002;

        /// <summary>缓存错误</summary>
        public const int CACHE_ERROR = 20003;

        /// <summary>请求过于频繁</summary>
        public const int TOO_MANY_REQUESTS = 20004;
    }

    // =====================================================================
    // 泛型 API 响应结果
    // =====================================================================

    /// <summary>
    /// 泛型 API 响应包装类。
    /// <para>服务端统一返回格式: { "code": 0, "message": "success", "data": {...} }</para>
    /// <para>使用方式: var result = ApiResult&lt;PlayerData&gt;.Parse(json);</para>
    /// </summary>
    /// <typeparam name="T">响应数据（data 字段）的类型</typeparam>
    [Serializable]
    public class ApiResult<T>
    {
        /// <summary>响应状态码（0 表示成功）</summary>
        public int code;

        /// <summary>响应消息（成功时通常为 "success"）</summary>
        public string message;

        /// <summary>响应数据，泛型类型，根据具体接口不同而不同</summary>
        public T data;

        // =================================================================
        // 解析方法
        // =================================================================

        /// <summary>
        /// 从 JSON 字符串解析为 ApiResult 对象。
        /// </summary>
        /// <param name="json">服务端返回的 JSON 字符串</param>
        /// <returns>解析后的 ApiResult 实例，解析失败时返回错误结果</returns>
        public static ApiResult<T> Parse(string json)
        {
            if (string.IsNullOrEmpty(json))
            {
                Debug.LogError("[ApiResult] Parse: JSON 字符串为空。");
                return CreateErrorResult(ResponseCode.INTERNAL_ERROR, "解析失败：空响应");
            }

            try
            {
                // 先尝试用 JsonUtility 直接解析
                var result = JsonUtility.FromJson<ApiResult<T>>(json);
                if (result != null)
                {
                    return result;
                }

                // 如果直接解析失败，尝试提取 data 字段再解析
                Debug.LogWarning("[ApiResult] Parse: 直接解析失败，尝试提取 data 字段。");
                var baseResult = JsonUtility.FromJson<ApiResultBasic>(json);
                if (baseResult != null && baseResult.code == ResponseCode.SUCCESS && !string.IsNullOrEmpty(baseResult.dataJson))
                {
                    result = new ApiResult<T>
                    {
                        code = baseResult.code,
                        message = baseResult.message,
                        data = JsonUtility.FromJson<T>(baseResult.dataJson)
                    };
                    return result;
                }

                return CreateErrorResult(ResponseCode.INTERNAL_ERROR, "JSON 解析失败");
            }
            catch (Exception ex)
            {
                Debug.LogError($"[ApiResult] Parse 异常: {ex.Message}\nJSON: {json}");
                return CreateErrorResult(ResponseCode.INTERNAL_ERROR, $"解析异常: {ex.Message}");
            }
        }

        // =================================================================
        // 便捷方法
        // =================================================================

        /// <summary>
        /// 判断请求是否成功。
        /// </summary>
        /// <returns>true 表示 code == 0（成功）</returns>
        public bool IsSuccess()
        {
            return code == ResponseCode.SUCCESS;
        }

        /// <summary>
        /// 判断是否需要重新登录（Token 失效）。
        /// </summary>
        /// <returns>true 表示需要重新登录</returns>
        public bool IsTokenExpired()
        {
            return code == ResponseCode.TOKEN_EXPIRED || code == ResponseCode.UNAUTHORIZED;
        }

        /// <summary>
        /// 创建一个成功的响应结果。
        /// </summary>
        /// <param name="data">成功时携带的数据</param>
        /// <param name="message">成功消息</param>
        /// <returns>成功的 ApiResult</returns>
        public static ApiResult<T> CreateSuccessResult(T data, string message = "success")
        {
            return new ApiResult<T>
            {
                code = ResponseCode.SUCCESS,
                message = message,
                data = data
            };
        }

        /// <summary>
        /// 创建一个错误响应结果。
        /// </summary>
        /// <param name="errorCode">错误码</param>
        /// <param name="errorMessage">错误消息</param>
        /// <returns>错误的 ApiResult</returns>
        public static ApiResult<T> CreateErrorResult(int errorCode, string errorMessage)
        {
            return new ApiResult<T>
            {
                code = errorCode,
                message = errorMessage,
                data = default(T)
            };
        }

        /// <summary>
        /// 调试友好的字符串表示。
        /// </summary>
        public override string ToString()
        {
            string dataStr = data != null ? JsonUtility.ToJson(data) : "null";
            // 截断过长的数据内容，便于日志阅读
            if (dataStr.Length > 200)
            {
                dataStr = dataStr.Substring(0, 200) + "...(truncated)";
            }
            return $"ApiResult<{typeof(T).Name}>(code={code}, message=\"{message}\", data={dataStr})";
        }
    }

    // =====================================================================
    // 非泛型基础响应类（用于解析基础字段）
    // =====================================================================

    /// <summary>
    /// 非泛型基础响应类，用于提取响应的基础字段（code、message）和原始 data JSON。
    /// </summary>
    [Serializable]
    internal class ApiResultBasic
    {
        /// <summary>响应状态码</summary>
        public int code;

        /// <summary>响应消息</summary>
        public string message;

        /// <summary>
        /// data 字段的原始 JSON 字符串。
        /// 由于 JsonUtility 无法直接处理泛型字段，
        /// 当 data 为复杂对象时，需要用此字段保存原始 JSON 后再二次解析。
        /// </summary>
        public string dataJson;
    }

    // =====================================================================
    // Token 管理器（静态类）
    // =====================================================================

    /// <summary>
    /// 静态 Token 管理器 —— 全局管理访问令牌（JWT）和刷新令牌。
    /// <para>AccessToken: 用于 API 请求鉴权的 Bearer Token</para>
    /// <para>RefreshToken: 用于刷新 AccessToken 的长期令牌</para>
    /// <para>Token 过期时间: 用于判断是否需要提前刷新</para>
    /// </summary>
    public static class TokenHolder
    {
        // ----- Token 存储 -----

        /// <summary>访问令牌（JWT），用于 API 请求的 Authorization 头</summary>
        private static string _accessToken = string.Empty;

        /// <summary>刷新令牌，用于在 AccessToken 过期后获取新的 AccessToken</summary>
        private static string _refreshToken = string.Empty;

        /// <summary>AccessToken 过期时间戳（Unix秒），0 表示未设置</summary>
        private static long _expiresAt;

        /// <summary>当前 Token 是否有效的标记</summary>
        private static bool _isValid;

        // ----- 属性 -----

        /// <summary>获取/设置访问令牌。设置时会自动更新本地存储和有效期标记。</summary>
        public static string AccessToken
        {
            get => _accessToken;
            set
            {
                _accessToken = value;
                _isValid = !string.IsNullOrEmpty(value);
                PlayerPrefs.SetString(Constants.PlayerPrefsKeys.ACCESS_TOKEN, value ?? string.Empty);
            }
        }

        /// <summary>获取/设置刷新令牌。设置时自动同步到本地存储。</summary>
        public static string RefreshToken
        {
            get => _refreshToken;
            set
            {
                _refreshToken = value;
                PlayerPrefs.SetString(Constants.PlayerPrefsKeys.REFRESH_TOKEN, value ?? string.Empty);
            }
        }

        /// <summary>获取/设置 AccessToken 过期时间（Unix时间戳，秒）。</summary>
        public static long ExpiresAt
        {
            get => _expiresAt;
            set => _expiresAt = value;
        }

        /// <summary>当前是否存在有效的 AccessToken。</summary>
        public static bool HasToken => _isValid && !string.IsNullOrEmpty(_accessToken);

        /// <summary>获取当前时间（Unix时间戳，秒）</summary>
        private static long CurrentUnixTime
        {
            get
            {
                // DateTime.UtcNow 与 Unix 纪元（1970-01-01）的差值
                System.DateTime epoch = new System.DateTime(1970, 1, 1, 0, 0, 0, System.DateTimeKind.Utc);
                return (long)(System.DateTime.UtcNow - epoch).TotalSeconds;
            }
        }

        // ----- 方法 -----

        /// <summary>
        /// 判断 AccessToken 是否已过期。
        /// 如果未设置过期时间，默认视为已过期。
        /// </summary>
        /// <returns>true 表示已过期</returns>
        public static bool IsExpired()
        {
            if (_expiresAt <= 0) return true;
            return CurrentUnixTime >= _expiresAt;
        }

        /// <summary>
        /// 判断是否应该提前刷新 Token。
        /// 在过期前的 Constants.TOKEN_REFRESH_ADVANCE 秒时开始刷新。
        /// </summary>
        /// <returns>true 表示应该刷新</returns>
        public static bool ShouldRefresh()
        {
            if (_expiresAt <= 0) return true;
            long refreshThreshold = _expiresAt - Constants.TOKEN_REFRESH_ADVANCE;
            return CurrentUnixTime >= refreshThreshold;
        }

        /// <summary>
        /// 设置完整的 Token 信息（登录/注册成功后调用）。
        /// </summary>
        /// <param name="accessToken">访问令牌</param>
        /// <param name="refreshToken">刷新令牌</param>
        /// <param name="expiresIn">有效期（秒），通常从服务端获取</param>
        public static void SetTokens(string accessToken, string refreshToken, long expiresIn)
        {
            AccessToken = accessToken;
            RefreshToken = refreshToken;
            ExpiresAt = CurrentUnixTime + expiresIn;
            PlayerPrefs.Save();
        }

        /// <summary>
        /// 清除所有 Token 信息（登出时调用）。
        /// </summary>
        public static void ClearTokens()
        {
            _accessToken = string.Empty;
            _refreshToken = string.Empty;
            _expiresAt = 0;
            _isValid = false;

            PlayerPrefs.DeleteKey(Constants.PlayerPrefsKeys.ACCESS_TOKEN);
            PlayerPrefs.DeleteKey(Constants.PlayerPrefsKeys.REFRESH_TOKEN);
            PlayerPrefs.Save();
        }

        /// <summary>
        /// 从 PlayerPrefs 加载已保存的 Token（游戏启动时调用）。
        /// </summary>
        /// <returns>是否存在已保存的 Token</returns>
        public static bool LoadSavedTokens()
        {
            _accessToken = PlayerPrefs.GetString(Constants.PlayerPrefsKeys.ACCESS_TOKEN, string.Empty);
            _refreshToken = PlayerPrefs.GetString(Constants.PlayerPrefsKeys.REFRESH_TOKEN, string.Empty);

            if (!string.IsNullOrEmpty(_accessToken))
            {
                _isValid = true;
                Debug.Log("[TokenHolder] 已从本地加载保存的 Token。");
                return true;
            }

            _isValid = false;
            Debug.Log("[TokenHolder] 未找到已保存的 Token。");
            return false;
        }

        /// <summary>
        /// 获取用于 HTTP Authorization 头的 Bearer Token 字符串。
        /// 格式: "Bearer {accessToken}"
        /// </summary>
        /// <returns>Bearer Token 字符串，无 Token 时返回空字符串</returns>
        public static string GetBearerToken()
        {
            if (string.IsNullOrEmpty(_accessToken)) return string.Empty;
            return $"Bearer {_accessToken}";
        }
    }
}
