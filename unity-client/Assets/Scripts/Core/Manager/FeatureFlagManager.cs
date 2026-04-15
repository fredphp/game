// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Core Framework
// =============================================================================
// 描述：功能开关管理器 —— 管理服务端下发的功能开关状态。
//       在游戏启动后（登录成功后）获取功能开关列表并缓存。
//       提供运行时查询接口，供各业务模块检查功能是否可用。
//       依赖: HttpClient, GameManager, VersionCheckManager, ConfigApi。
// =============================================================================

using System;
using System.Collections;
using System.Collections.Generic;
using Jiuzhou.Core;
using Jiuzhou.Data;
using Jiuzhou.Network.Api;
using UnityEngine;

namespace Jiuzhou.Core
{
    /// <summary>
    /// 功能开关管理器（单例）
    /// <para>从服务端获取功能开关列表并缓存到内存。</para>
    /// <para>提供便捷方法检查功能是否可用及获取功能配置。</para>
    /// </summary>
    public class FeatureFlagManager : Singleton<FeatureFlagManager>
    {
        // =====================================================================
        // 功能开关 Key 常量
        // =====================================================================

        /// <summary>
        /// 功能开关 Key 常量定义。
        /// 使用时: FeatureFlagManager.Flags.BATTLE_PVP
        /// </summary>
        public static class Flags
        {
            /// <summary>PVP对战模式</summary>
            public const string BATTLE_PVP = "battle_pvp_mode";

            /// <summary>公会战系统</summary>
            public const string GUILD_WAR = "guild_war_system";

            /// <summary>赛季系统</summary>
            public const string SEASON_SYSTEM = "season_system";

            /// <summary>好友系统</summary>
            public const string FRIEND_SYSTEM = "friend_system";

            /// <summary>排行榜</summary>
            public const string LEADERBOARD = "leaderboard";

            /// <summary>世界聊天</summary>
            public const string WORLD_CHAT = "world_chat";

            /// <summary>交易系统</summary>
            public const string TRADE_SYSTEM = "trade_system";

            /// <summary>每日签到（灰度测试）</summary>
            public const string DAILY_CHECKIN = "daily_checkin";

            /// <summary>新手引导优化版（AB测试）</summary>
            public const string NEW_TUTORIAL = "new_tutorial_v2";
        }

        // =====================================================================
        // 内部状态
        // =====================================================================

        /// <summary>功能开关缓存字典</summary>
        private readonly Dictionary<string, FeatureFlagItem> _flags = new Dictionary<string, FeatureFlagItem>();

        /// <summary>是否已加载功能开关</summary>
        private bool _isLoaded;

        /// <summary>最后更新时间</summary>
        private DateTime _lastUpdateTime;

        // =====================================================================
        // 公开属性
        // =====================================================================

        /// <summary>是否已加载功能开关</summary>
        public bool IsLoaded => _isLoaded;

        /// <summary>已加载的功能开关数量</summary>
        public int FlagCount => _flags.Count;

        // =====================================================================
        // 生命周期
        // =====================================================================

        protected override void OnInitialize()
        {
            base.OnInitialize();
            DontDestroyOnLoad();
            Debug.Log("[FeatureFlag] 初始化完成。");
        }

        // =====================================================================
        // 公开方法
        // =====================================================================

        /// <summary>
        /// 从服务端加载功能开关列表。
        /// 需要在 GameManager 和登录流程完成后调用。
        /// </summary>
        /// <param name="onComplete">加载完成回调（参数: 是否成功）</param>
        public void LoadFeatureFlags(Action<bool> onComplete = null)
        {
            StartCoroutine(LoadFeatureFlagsCoroutine(onComplete));
        }

        /// <summary>
        /// 检查指定功能是否启用。
        /// </summary>
        /// <param name="flagKey">功能标识（如 Flags.BATTLE_PVP）</param>
        /// <returns>true 表示功能可用；未加载或未知功能返回 false</returns>
        public bool IsEnabled(string flagKey)
        {
            if (!_isLoaded)
            {
                Debug.LogWarning($"[FeatureFlag] 功能开关未加载，默认返回 false: {flagKey}");
                return false;
            }

            if (_flags.TryGetValue(flagKey, out var flag))
            {
                return flag.is_enabled;
            }

            // 未知功能默认禁用（安全策略：宁可少开不可错开）
            return false;
        }

        /// <summary>
        /// 获取功能开关的配置值。
        /// </summary>
        /// <typeparam name="T">配置值的目标类型（需与 JSON 结构匹配）</typeparam>
        /// <param name="flagKey">功能标识</param>
        /// <param name="defaultValue">解析失败时的默认值</param>
        /// <returns>解析后的配置值</returns>
        public T GetConfig<T>(string flagKey, T defaultValue = default)
        {
            if (!_isLoaded || !_flags.TryGetValue(flagKey, out var flag))
            {
                return defaultValue;
            }

            if (string.IsNullOrEmpty(flag.config_value))
            {
                return defaultValue;
            }

            try
            {
                return JsonUtility.FromJson<T>(flag.config_value);
            }
            catch (Exception e)
            {
                Debug.LogError($"[FeatureFlag] 解析配置失败 [{flagKey}]: {e.Message}");
                return defaultValue;
            }
        }

        /// <summary>
        /// 获取所有已加载的功能开关列表。
        /// </summary>
        /// <returns>功能开关列表副本</returns>
        public List<FeatureFlagItem> GetAllFlags()
        {
            return new List<FeatureFlagItem>(_flags.Values);
        }

        /// <summary>
        /// 强制刷新功能开关列表。
        /// </summary>
        /// <param name="onComplete">刷新完成回调</param>
        public void Refresh(Action<bool> onComplete = null)
        {
            StartCoroutine(LoadFeatureFlagsCoroutine(onComplete));
        }

        // =====================================================================
        // 内部协程
        // =====================================================================

        /// <summary>
        /// 加载功能开关列表的协程
        /// </summary>
        private IEnumerator LoadFeatureFlagsCoroutine(Action<bool> onComplete)
        {
            // 等待 GameManager 就绪
            yield return new WaitUntil(() => GameManager.Instance != null);

            // 构建请求参数
            var playerData = GameManager.Instance?.PlayerData;
            var request = new FeatureFlagsRequest
            {
                platform = VersionCheckManager.CurrentPlatform,
                version_code = VersionCheckManager.CLIENT_VERSION,
                region_id = playerData?.serverId ?? 0,
                user_id = playerData?.userId ?? 0,
                vip_level = playerData?.vipLevel ?? 0,
                user_level = playerData?.level ?? 0
            };

            bool completed = false;

            ConfigApi.GetFeatureFlags(request, (result) =>
            {
                completed = true;

                if (result.IsSuccess() && result.data != null)
                {
                    // 清空旧数据
                    _flags.Clear();

                    // 解析新的功能开关
                    var list = result.data;
                    if (list != null && list.items != null)
                    {
                        foreach (var item in list.items)
                        {
                            if (!string.IsNullOrEmpty(item.flag_key))
                            {
                                _flags[item.flag_key] = item;
                                Debug.Log($"[FeatureFlag] 加载: {item.flag_key} = {(item.is_enabled ? "ON" : "OFF")}");
                            }
                        }
                    }

                    _isLoaded = true;
                    _lastUpdateTime = DateTime.Now;
                    Debug.Log($"[FeatureFlag] 功能开关加载完成，共 {_flags.Count} 个。");
                    onComplete?.Invoke(true);
                }
                else
                {
                    Debug.LogError($"[FeatureFlag] 加载失败: {result.message}");
                    onComplete?.Invoke(false);
                }
            });

            // 等待回调完成（最多15秒）
            float waitTime = 0;
            while (!completed && waitTime < 15f)
            {
                yield return new WaitForSeconds(0.5f);
                waitTime += 0.5f;
            }

            if (!completed)
            {
                Debug.LogError("[FeatureFlag] 加载超时。");
                onComplete?.Invoke(false);
            }
        }
    }
}
