// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Core Framework
// =============================================================================
// 描述：版本检查管理器 —— 启动时自动检查客户端版本，处理更新逻辑。
//       包括强制更新拦截、推荐更新提示、版本号记录等功能。
//       依赖: HttpClient, EventBus, ConfigApi。
// =============================================================================

using System;
using System.Collections;
using Jiuzhou.Core;
using Jiuzhou.Data;
using Jiuzhou.Network.Api;
using UnityEngine;

namespace Jiuzhou.Core
{
    // =====================================================================
    // 枚举 & 委托
    // =====================================================================

    /// <summary>
    /// 版本检查结果
    /// </summary>
    public enum VersionCheckResult
    {
        /// <summary>版本最新，无需更新</summary>
        UpToDate,
        /// <summary>有新版本但非强制，可跳过</summary>
        UpdateRecommended,
        /// <summary>版本过低，必须更新才能继续</summary>
        ForceUpdateRequired,
        /// <summary>检查失败（网络异常等）</summary>
        CheckFailed
    }

    /// <summary>
    /// 版本检查完成回调
    /// </summary>
    /// <param name="result">检查结果</param>
    /// <param name="versionInfo">版本信息（有更新时有效）</param>
    public delegate void VersionCheckCallback(VersionCheckResult result, VersionCheckResponse versionInfo);

    // =====================================================================
    // 版本检查管理器（单例）
    // =====================================================================

    /// <summary>
    /// 版本检查管理器
    /// <para>在游戏启动时自动检查客户端版本。</para>
    /// <para>强制更新时阻止用户继续游戏。</para>
    /// <para>推荐更新时弹出提示供用户选择。</para>
    /// </summary>
    public class VersionCheckManager : Singleton<VersionCheckManager>
    {
        // =====================================================================
        // 配置常量
        // =====================================================================

        /// <summary>当前客户端版本号（每次发版手动更新）</summary>
        public const string CLIENT_VERSION = "1.2.0";

        /// <summary>当前构建号</summary>
        public const int CLIENT_BUILD_NUMBER = 120;

        /// <summary>版本检查失败最大重试次数</summary>
        private const int MAX_CHECK_RETRIES = 3;

        /// <summary>版本检查重试间隔（秒）</summary>
        private const float CHECK_RETRY_INTERVAL = 2f;

        // =====================================================================
        // 内部状态
        // =====================================================================

        /// <summary>最近一次检查结果</summary>
        private VersionCheckResponse _lastCheckResult;

        /// <summary>版本检查是否已完成</summary>
        private bool _checkCompleted;

        /// <summary>是否正在检查中</summary>
        private bool _isChecking;

        // =====================================================================
        // 公开属性
        // =====================================================================

        /// <summary>最近一次检查的版本信息</summary>
        public VersionCheckResponse LastCheckResult => _lastCheckResult;

        /// <summary>版本检查是否已完成</summary>
        public bool CheckCompleted => _checkCompleted;

        /// <summary>当前客户端平台</summary>
        public static string CurrentPlatform
        {
            get
            {
#if UNITY_ANDROID
                return "android";
#elif UNITY_IOS
                return "ios";
#else
                return "windows";
#endif
            }
        }

        // =====================================================================
        // 生命周期
        // =====================================================================

        protected override void OnInitialize()
        {
            base.OnInitialize();
            DontDestroyOnLoad();
            Debug.Log($"[VersionCheck] 初始化完成。客户端版本: {CLIENT_VERSION}, 构建: {CLIENT_BUILD_NUMBER}, 平台: {CurrentPlatform}");
        }

        // =====================================================================
        // 公开方法
        // =====================================================================

        /// <summary>
        /// 检查客户端版本（基础版本，需自行处理结果）。
        /// </summary>
        /// <param name="callback">检查完成回调</param>
        public void CheckVersion(VersionCheckCallback callback)
        {
            if (_isChecking)
            {
                Debug.LogWarning("[VersionCheck] 正在检查中，忽略重复请求。");
                return;
            }

            StartCoroutine(CheckVersionCoroutine(callback));
        }

        /// <summary>
        /// 自动检查版本并处理（推荐在游戏启动流程中调用）。
        /// 根据检查结果自动触发事件或回调。
        /// </summary>
        /// <param name="onVersionOK">版本正常时的回调（版本最新或推荐更新时调用）</param>
        public void AutoCheckAndHandle(Action onVersionOK)
        {
            CheckVersion((result, info) =>
            {
                switch (result)
                {
                    case VersionCheckResult.UpToDate:
                        Debug.Log("[VersionCheck] 版本最新。");
                        onVersionOK?.Invoke();
                        break;

                    case VersionCheckResult.UpdateRecommended:
                        Debug.Log("[VersionCheck] 有新版本可用，推荐更新。");
                        _lastCheckResult = info;
                        // 触发推荐更新事件，UI 层监听后弹出提示
                        EventBus.Trigger("version_update_recommended", info);
                        // 不阻塞，允许用户继续游戏
                        onVersionOK?.Invoke();
                        break;

                    case VersionCheckResult.ForceUpdateRequired:
                        Debug.LogWarning("[VersionCheck] 版本过低，需要强制更新！");
                        _lastCheckResult = info;
                        // 触发强制更新事件，UI 层弹出不可关闭的更新面板
                        EventBus.Trigger("version_force_update_required", info);
                        // 不调用 onVersionOK，阻塞游戏启动流程
                        break;

                    case VersionCheckResult.CheckFailed:
                        Debug.LogError("[VersionCheck] 版本检查失败，不阻塞游戏。");
                        // 检查失败时不阻塞，避免服务端故障影响所有玩家
                        onVersionOK?.Invoke();
                        break;
                }
            });
        }

        // =====================================================================
        // 内部协程
        // =====================================================================

        /// <summary>
        /// 版本检查协程（带重试机制）
        /// </summary>
        private IEnumerator CheckVersionCoroutine(VersionCheckCallback callback)
        {
            _isChecking = true;
            _checkCompleted = false;

            var request = new VersionCheckRequest
            {
                platform = CurrentPlatform,
                version_code = CLIENT_VERSION,
                build_number = CLIENT_BUILD_NUMBER
            };

            for (int retry = 0; retry < MAX_CHECK_RETRIES; retry++)
            {
                if (retry > 0)
                {
                    Debug.Log($"[VersionCheck] 第 {retry + 1} 次重试...");
                    yield return new WaitForSeconds(CHECK_RETRY_INTERVAL);
                }

                bool completed = false;

                ConfigApi.CheckVersion(request, (result) =>
                {
                    completed = true;

                    if (result.IsSuccess() && result.data != null)
                    {
                        _lastCheckResult = result.data;
                        _checkCompleted = true;

                        if (result.data.force_update)
                        {
                            callback?.Invoke(VersionCheckResult.ForceUpdateRequired, result.data);
                        }
                        else if (result.data.need_update)
                        {
                            callback?.Invoke(VersionCheckResult.UpdateRecommended, result.data);
                        }
                        else
                        {
                            callback?.Invoke(VersionCheckResult.UpToDate, result.data);
                        }
                    }
                    else
                    {
                        Debug.LogError($"[VersionCheck] 版本检查请求失败: {result.message}");
                    }
                });

                // 等待回调完成（最多等待10秒）
                float waitTime = 0;
                while (!completed && waitTime < 10f)
                {
                    yield return new WaitForSeconds(0.5f);
                    waitTime += 0.5f;
                }

                if (_checkCompleted)
                {
                    break;
                }
            }

            if (!_checkCompleted)
            {
                Debug.LogError("[VersionCheck] 所有重试均失败。");
                callback?.Invoke(VersionCheckResult.CheckFailed, null);
            }

            _isChecking = false;
        }
    }
}
