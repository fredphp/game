// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client
// =============================================================================
// 描述：配置检测 API —— 版本校验、功能开关、热更新检测的网络请求封装。
//       所有请求通过 HttpClient 发送到 user-service。
// =============================================================================

using System;
using Jiuzhou.Core;
using Jiuzhou.Data;

namespace Jiuzhou.Network.Api
{
    /// <summary>
    /// 功能开关列表包装类。
    /// JsonUtility 不支持直接反序列化顶级数组，需要包装类。
    /// 服务端返回 []FeatureFlagItem → 包装为 { items: [...] }
    /// </summary>
    [Serializable]
    public class FeatureFlagList
    {
        /// <summary>功能开关数组</summary>
        public FeatureFlagItem[] items;
    }

    /// <summary>
    /// 配置检测 API —— 负责版本校验、功能开关、热更新检测的网络请求。
    /// <para>所有接口均通过 user-service 暴露，无需认证。</para>
    /// </summary>
    public static class ConfigApi
    {
        // =====================================================================
        // 版本检查
        // =====================================================================

        /// <summary>
        /// 检查客户端版本是否需要更新。
        /// </summary>
        /// <param name="request">版本检查请求</param>
        /// <param name="callback">完成回调</param>
        public static void CheckVersion(
            VersionCheckRequest request,
            Action<ApiResult<VersionCheckResponse>> callback)
        {
            string url = HttpClient.BuildUrl(Constants.USER_URL, Constants.ConfigApi.CHECK_VERSION);
            HttpClient.Instance.Post<VersionCheckRequest, VersionCheckResponse>(
                url, request, callback);
        }

        // =====================================================================
        // 功能开关
        // =====================================================================

        /// <summary>
        /// 获取当前客户端可用的功能开关列表。
        /// </summary>
        /// <param name="request">功能开关请求</param>
        /// <param name="callback">完成回调</param>
        public static void GetFeatureFlags(
            FeatureFlagsRequest request,
            Action<ApiResult<FeatureFlagList>> callback)
        {
            string url = HttpClient.BuildUrl(Constants.USER_URL, Constants.ConfigApi.GET_FEATURE_FLAGS);
            HttpClient.Instance.Post<FeatureFlagsRequest, FeatureFlagList>(
                url, request, callback);
        }

        // =====================================================================
        // 热更新检查
        // =====================================================================

        /// <summary>
        /// 检查是否有可用的热更新资源。
        /// </summary>
        /// <param name="request">热更新检查请求</param>
        /// <param name="callback">完成回调</param>
        public static void CheckHotUpdate(
            HotUpdateCheckRequest request,
            Action<ApiResult<HotUpdateCheckResponse>> callback)
        {
            string url = HttpClient.BuildUrl(Constants.USER_URL, Constants.ConfigApi.CHECK_HOT_UPDATE);
            HttpClient.Instance.Post<HotUpdateCheckRequest, HotUpdateCheckResponse>(
                url, request, callback);
        }
    }
}
