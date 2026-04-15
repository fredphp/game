// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client
// =============================================================================
// 描述：客户端功能检测系统 —— 数据模型定义。
//       与 Go 服务端 config_model.go 中的 Request/Response 结构保持一致。
// =============================================================================

using System;
using UnityEngine;

namespace Jiuzhou.Data
{
    // =====================================================================
    // 版本检查
    // =====================================================================

    /// <summary>
    /// 版本检查请求
    /// </summary>
    [Serializable]
    public class VersionCheckRequest
    {
        /// <summary>平台: android / ios / windows</summary>
        public string platform;

        /// <summary>客户端版本号（语义化: 1.2.0）</summary>
        public string version_code;

        /// <summary>构建号</summary>
        public int build_number;
    }

    /// <summary>
    /// 版本检查响应
    /// </summary>
    [Serializable]
    public class VersionCheckResponse
    {
        /// <summary>最新版本号</summary>
        public string latest_version;

        /// <summary>最低支持版本</summary>
        public string min_supported_version;

        /// <summary>是否需要更新</summary>
        public bool need_update;

        /// <summary>是否强制更新</summary>
        public bool force_update;

        /// <summary>更新标题</summary>
        public string update_title;

        /// <summary>更新说明</summary>
        public string update_description;

        /// <summary>下载地址</summary>
        public string download_url;

        /// <summary>安装包大小（字节）</summary>
        public long file_size;

        /// <summary>文件MD5校验值</summary>
        public string file_hash;

        /// <summary>服务器时间戳（Unix秒）</summary>
        public long server_time;
    }

    // =====================================================================
    // 功能开关
    // =====================================================================

    /// <summary>
    /// 功能开关请求
    /// </summary>
    [Serializable]
    public class FeatureFlagsRequest
    {
        /// <summary>平台</summary>
        public string platform;

        /// <summary>客户端版本号</summary>
        public string version_code;

        /// <summary>区服ID</summary>
        public long region_id;

        /// <summary>用户ID</summary>
        public long user_id;

        /// <summary>VIP等级</summary>
        public int vip_level;

        /// <summary>玩家等级</summary>
        public int user_level;
    }

    /// <summary>
    /// 功能开关项（服务端返回的单个功能开关）
    /// </summary>
    [Serializable]
    public class FeatureFlagItem
    {
        /// <summary>功能标识</summary>
        public string flag_key;

        /// <summary>功能名称</summary>
        public string flag_name;

        /// <summary>是否启用</summary>
        public bool is_enabled;

        /// <summary>功能配置（JSON字符串）</summary>
        public string config_value;
    }

    // =====================================================================
    // 热更新
    // =====================================================================

    /// <summary>
    /// 热更新检查请求
    /// </summary>
    [Serializable]
    public class HotUpdateCheckRequest
    {
        /// <summary>平台</summary>
        public string platform;

        /// <summary>当前资源版本号</summary>
        public string resource_version;

        /// <summary>当前APP版本号</summary>
        public string app_version;
    }

    /// <summary>
    /// 热更新检查响应
    /// </summary>
    [Serializable]
    public class HotUpdateCheckResponse
    {
        /// <summary>是否有更新</summary>
        public bool has_update;

        /// <summary>是否强制更新</summary>
        public bool force_update;

        /// <summary>最新资源版本</summary>
        public string latest_version;

        /// <summary>更新类型: 0普通 1紧急 2预载</summary>
        public int update_type;

        /// <summary>总大小（字节）</summary>
        public long total_size;

        /// <summary>文件数量</summary>
        public int file_count;

        /// <summary>更新说明</summary>
        public string description;

        /// <summary>下载基础URL</summary>
        public string download_base_url;

        /// <summary>清单文件地址</summary>
        public string manifest_url;

        /// <summary>清单文件MD5</summary>
        public string manifest_hash;
    }
}
