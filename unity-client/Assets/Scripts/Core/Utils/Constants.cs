// =============================================================================
// 九州争鼎 (Jiuzhou Zhengding) - Unity Client Core Framework
// =============================================================================
// 描述：全局常量定义，包括微服务端口、API路径、UI层级、游戏事件等。
//       所有字符串常量集中管理，便于统一维护和国际化。
// =============================================================================

namespace Jiuzhou.Core
{
    /// <summary>
    /// 全局常量类 —— 集中管理所有服务端口、API路径、UI层级和游戏事件。
    /// </summary>
    public static class Constants
    {
        // =====================================================================
        // 网络相关常量
        // =====================================================================

        /// <summary>服务器基础URL</summary>
        public const string BASE_URL = "http://localhost";

        /// <summary>API版本前缀</summary>
        public const string API_VERSION = "/api/v1";

        // =====================================================================
        // 微服务端口 —— 对应 Go 后端各服务
        // =====================================================================

        /// <summary>用户服务端口</summary>
        public const int PORT_USER = 9001;

        /// <summary>卡牌服务端口</summary>
        public const int PORT_CARD = 9002;

        /// <summary>战斗服务端口</summary>
        public const int PORT_BATTLE = 9003;

        /// <summary>地图服务端口</summary>
        public const int PORT_MAP = 9004;

        /// <summary>公会服务端口</summary>
        public const int PORT_GUILD = 9005;

        // =====================================================================
        // 完整服务URL
        // =====================================================================

        /// <summary>用户服务完整URL</summary>
        public const string USER_URL = BASE_URL + ":" + PORT_USER + API_VERSION;

        /// <summary>卡牌服务完整URL</summary>
        public const string CARD_URL = BASE_URL + ":" + PORT_CARD + API_VERSION;

        /// <summary>战斗服务完整URL</summary>
        public const string BATTLE_URL = BASE_URL + ":" + PORT_BATTLE + API_VERSION;

        /// <summary>地图服务完整URL</summary>
        public const string MAP_URL = BASE_URL + ":" + PORT_MAP + API_VERSION;

        /// <summary>公会服务完整URL</summary>
        public const string GUILD_URL = BASE_URL + ":" + PORT_GUILD + API_VERSION;

        // =====================================================================
        // 用户服务 API 路径
        // =====================================================================

        public static class UserApi
        {
            /// <summary>用户注册</summary>
            public const string REGISTER = "/user/register";
            /// <summary>用户登录</summary>
            public const string LOGIN = "/user/login";
            /// <summary>刷新Token</summary>
            public const string REFRESH_TOKEN = "/user/refresh";
            /// <summary>获取用户信息</summary>
            public const string GET_PROFILE = "/user/profile";
            /// <summary>更新用户信息</summary>
            public const string UPDATE_PROFILE = "/user/profile";
            /// <summary>修改密码</summary>
            public const string CHANGE_PASSWORD = "/user/password";
            /// <summary>获取用户资源</summary>
            public const string GET_RESOURCES = "/user/resources";
        }

        // =====================================================================
        // 卡牌服务 API 路径
        // =====================================================================

        public static class CardApi
        {
            /// <summary>获取卡组列表</summary>
            public const string GET_DECKS = "/card/decks";
            /// <summary>创建卡组</summary>
            public const string CREATE_DECK = "/card/decks";
            /// <summary>获取卡组详情</summary>
            public const string GET_DECK = "/card/decks/{deckId}";
            /// <summary>更新卡组</summary>
            public const string UPDATE_DECK = "/card/decks/{deckId}";
            /// <summary>删除卡组</summary>
            public const string DELETE_DECK = "/card/decks/{deckId}";
            /// <summary>添加卡牌到卡组</summary>
            public const string ADD_CARD = "/card/decks/{deckId}/cards";
            /// <summary>从卡组移除卡牌</summary>
            public const string REMOVE_CARD = "/card/decks/{deckId}/cards/{cardId}";
            /// <summary>获取所有可用卡牌</summary>
            public const string GET_ALL_CARDS = "/card/cards";
            /// <summary>获取卡牌详情</summary>
            public const string GET_CARD = "/card/cards/{cardId}";
            /// <summary>抽卡（召唤）</summary>
            public const string SUMMON = "/card/summon";
            /// <summary>合成卡牌</summary>
            public const string UPGRADE_CARD = "/card/upgrade";
            /// <summary>获取卡牌图鉴</summary>
            public const string GET_COLLECTION = "/card/collection";
        }

        // =====================================================================
        // 战斗服务 API 路径
        // =====================================================================

        public static class BattleApi
        {
            /// <summary>开始战斗</summary>
            public const string START_BATTLE = "/battle/start";
            /// <summary>提交战斗操作</summary>
            public const string SUBMIT_ACTION = "/battle/{battleId}/action";
            /// <summary>获取战斗状态</summary>
            public const string GET_BATTLE_STATUS = "/battle/{battleId}/status";
            /// <summary>获取战斗记录</summary>
            public const string GET_BATTLE_LOG = "/battle/{battleId}/log";
            /// <summary>结束战斗</summary>
            public const string END_BATTLE = "/battle/{battleId}/end";
            /// <summary>获取战斗回放</summary>
            public const string GET_REPLAY = "/battle/{battleId}/replay";
            /// <summary>获取战斗历史</summary>
            public const string GET_BATTLE_HISTORY = "/battle/history";
            /// <summary>匹配对手（PVP）</summary>
            public const string MATCH_OPPONENT = "/battle/match";
            /// <summary>取消匹配</summary>
            public const string CANCEL_MATCH = "/battle/match/cancel";
        }

        // =====================================================================
        // 配置检测 API 路径（客户端功能检测系统）
        // =====================================================================

        public static class ConfigApi
        {
            /// <summary>版本检查</summary>
            public const string CHECK_VERSION = "/config/version/check";
            /// <summary>获取功能开关列表</summary>
            public const string GET_FEATURE_FLAGS = "/config/features";
            /// <summary>热更新检查</summary>
            public const string CHECK_HOT_UPDATE = "/config/hotupdate/check";
        }

        // =====================================================================
        // 地图服务 API 路径
        // =====================================================================

        public static class MapApi
        {
            /// <summary>获取地图概览</summary>
            public const string GET_MAP_OVERVIEW = "/map/overview";
            /// <summary>获取区域详情</summary>
            public const string GET_REGION = "/map/regions/{regionId}";
            /// <summary>获取城市详情</summary>
            public const string GET_CITY = "/map/cities/{cityId}";
            /// <summary>获取所有城市</summary>
            public const string GET_ALL_CITIES = "/map/cities";
            /// <summary>行军（发起行军）</summary>
            public const string CREATE_MARCH = "/map/march";
            /// <summary>获取行军状态</summary>
            public const string GET_MARCH_STATUS = "/map/march/{marchId}";
            /// <summary>取消行军</summary>
            public const string CANCEL_MARCH = "/map/march/{marchId}";
            /// <summary>获取城池战斗记录</summary>
            public const string GET_CITY_BATTLE_LOG = "/map/cities/{cityId}/battles";
            /// <summary>获取联盟领地</summary>
            public const string GET_ALLIANCE_TERRITORY = "/map/alliance/territory";
            /// <summary>获取玩家行军列表</summary>
            public const string GET_PLAYER_MARCHES = "/map/player/marches";
        }

        // =====================================================================
        // 公会服务 API 路径
        // =====================================================================

        public static class GuildApi
        {
            /// <summary>创建公会</summary>
            public const string CREATE_GUILD = "/guild/create";
            /// <summary>获取公会列表</summary>
            public const string GET_GUILD_LIST = "/guild/list";
            /// <summary>搜索公会</summary>
            public const string SEARCH_GUILD = "/guild/search";
            /// <summary>加入公会</summary>
            public const string JOIN_GUILD = "/guild/{guildId}/join";
            /// <summary>离开公会</summary>
            public const string LEAVE_GUILD = "/guild/{guildId}/leave";
            /// <summary>获取公会详情</summary>
            public const string GET_GUILD_DETAIL = "/guild/{guildId}";
            /// <summary>更新公会信息</summary>
            public const string UPDATE_GUILD = "/guild/{guildId}";
            /// <summary>解散公会</summary>
            public const string DISBAND_GUILD = "/guild/{guildId}/disband";
            /// <summary>邀请玩家加入公会</summary>
            public const string INVITE_MEMBER = "/guild/{guildId}/invite";
            /// <summary>审批入会申请</summary>
            public const string APPROVE_APPLICATION = "/guild/{guildId}/approve";
            /// <summary>踢出成员</summary>
            public const string KICK_MEMBER = "/guild/{guildId}/kick";
            /// <summary>转让会长</summary>
            public const string TRANSFER_LEADER = "/guild/{guildId}/transfer";
            /// <summary>获取公会成员列表</summary>
            public const string GET_MEMBERS = "/guild/{guildId}/members";
            /// <summary>获取公会公告</summary>
            public const string GET_ANNOUNCEMENT = "/guild/{guildId}/announcement";
            /// <summary>发布公会公告</summary>
            public const string POST_ANNOUNCEMENT = "/guild/{guildId}/announcement";
            /// <summary>获取公会科技</summary>
            public const string GET_TECHNOLOGIES = "/guild/{guildId}/technologies";
            /// <summary>升级公会科技</summary>
            public const string UPGRADE_TECHNOLOGY = "/guild/{guildId}/technologies/{techId}";
        }

        // =====================================================================
        // UI 层级名称
        // =====================================================================

        /// <summary>背景层 —— 最底层，场景背景元素</summary>
        public const string LAYER_BACKGROUND = "Background";

        /// <summary>场景层 —— 场景内3D/2D游戏元素</summary>
        public const string LAYER_SCENE = "Scene";

        /// <summary>主界面层 —— 游戏主界面面板（背包、任务等）</summary>
        public const string LAYER_MAIN = "Main";

        /// <summary>弹窗层 —— 弹窗、对话框等模态界面</summary>
        public const string LAYER_POPUP = "Popup";

        /// <summary>顶层 —— Toast、系统提示等始终在最上方的元素</summary>
        public const string LAYER_TOP = "Top";

        /// <summary>引导层 —— 新手引导高亮遮罩和提示箭头</summary>
        public const string LAYER_GUIDE = "Guide";

        // =====================================================================
        // UI 面板名称
        // =====================================================================

        public static class PanelNames
        {
            /// <summary>登录面板</summary>
            public const string LOGIN = "LoginPanel";
            /// <summary>注册面板</summary>
            public const string REGISTER = "RegisterPanel";
            /// <summary>主城面板</summary>
            public const string MAIN_CITY = "MainCityPanel";
            /// <summary>背包面板</summary>
            public const string BAG = "BagPanel";
            /// <summary>卡组面板</summary>
            public const string DECK = "DeckPanel";
            /// <summary>卡牌详情面板</summary>
            public const string CARD_DETAIL = "CardDetailPanel";
            /// <summary>战斗面板</summary>
            public const string BATTLE = "BattlePanel";
            /// <summary>地图面板</summary>
            public const string MAP = "MapPanel";
            /// <summary>公会面板</summary>
            public const string GUILD = "GuildPanel";
            /// <summary>设置面板</summary>
            public const string SETTINGS = "SettingsPanel";
            /// <summary>加载面板</summary>
            public const string LOADING = "LoadingPanel";
            /// <summary>确认对话框</summary>
            public const string CONFIRM_DIALOG = "ConfirmDialog";
            /// <summary>奖励面板</summary>
            public const string REWARD = "RewardPanel";
            /// <summary>更新提示面板</summary>
            public const string UPDATE_PROMPT = "UpdatePromptPanel";
        }

        // =====================================================================
        // PlayerPrefs 键名
        // =====================================================================

        public static class PlayerPrefsKeys
        {
            /// <summary>访问令牌</summary>
            public const string ACCESS_TOKEN = "access_token";
            /// <summary>刷新令牌</summary>
            public const string REFRESH_TOKEN = "refresh_token";
            /// <summary>用户ID</summary>
            public const string USER_ID = "user_id";
            /// <summary>用户名</summary>
            public const string USERNAME = "username";
            /// <summary>音量（BGM）</summary>
            public const string BGM_VOLUME = "bgm_volume";
            /// <summary>音量（音效）</summary>
            public const string SFX_VOLUME = "sfx_volume";
            /// <summary>服务器URL</summary>
            public const string SERVER_URL = "server_url";
            /// <summary>语言</summary>
            public const string LANGUAGE = "language";
            /// <summary>新手引导已完成</summary>
            public const string GUIDE_COMPLETED = "guide_completed";
            /// <summary>本地资源版本号</summary>
            public const string RESOURCE_VERSION = "resource_version";
        }

        // =====================================================================
        // 游戏事件常量
        // =====================================================================

        public static class GameEvents
        {
            // ----- 网络事件 -----
            /// <summary>网络已连接</summary>
            public const string NETWORK_CONNECTED = "network_connected";
            /// <summary>网络断开</summary>
            public const string NETWORK_DISCONNECTED = "network_disconnected";
            /// <summary>网络恢复</summary>
            public const string NETWORK_RECONNECTED = "network_reconnected";
            /// <summary>网络重连失败</summary>
            public const string NETWORK_RECONNECT_FAILED = "network_reconnect_failed";
            /// <summary>Token 过期</summary>
            public const string TOKEN_EXPIRED = "token_expired";
            /// <summary>Token 刷新成功</summary>
            public const string TOKEN_REFRESHED = "token_refreshed";

            // ----- 玩家事件 -----
            /// <summary>玩家登录成功</summary>
            public const string PLAYER_LOGIN = "player_login";
            /// <summary>玩家登出</summary>
            public const string PLAYER_LOGOUT = "player_logout";
            /// <summary>玩家数据更新</summary>
            public const string PLAYER_DATA_UPDATED = "player_data_updated";
            /// <summary>资源变化</summary>
            public const string RESOURCE_CHANGED = "resource_changed";

            // ----- UI 事件 -----
            /// <summary>面板打开</summary>
            public const string UI_PANEL_OPENED = "ui_panel_opened";
            /// <summary>面板关闭</summary>
            public const string UI_PANEL_CLOSED = "ui_panel_closed";
            /// <summary>所有面板关闭</summary>
            public const string UI_ALL_PANELS_CLOSED = "ui_all_panels_closed";

            // ----- 战斗事件 -----
            /// <summary>战斗开始</summary>
            public const string BATTLE_START = "battle_start";
            /// <summary>战斗回合开始</summary>
            public const string BATTLE_TURN_START = "battle_turn_start";
            /// <summary>战斗回合结束</summary>
            public const string BATTLE_TURN_END = "battle_turn_end";
            /// <summary>战斗结束</summary>
            public const string BATTLE_END = "battle_end";
            /// <summary>战斗胜利</summary>
            public const string BATTLE_VICTORY = "battle_victory";
            /// <summary>战斗失败</summary>
            public const string BATTLE_DEFEAT = "battle_defeat";

            // ----- 卡牌事件 -----
            /// <summary>卡牌获得</summary>
            public const string CARD_ACQUIRED = "card_acquired";
            /// <summary>卡牌升级</summary>
            public const string CARD_UPGRADED = "card_upgraded";
            /// <summary>卡牌消耗/分解</summary>
            public const string CARD_CONSUMED = "card_consumed";
            /// <summary>卡组变更</summary>
            public const string DECK_CHANGED = "deck_changed";

            // ----- 地图事件 -----
            /// <summary>行军开始</summary>
            public const string MARCH_STARTED = "march_started";
            /// <summary>行军到达</summary>
            public const string MARCH_ARRIVED = "march_arrived";
            /// <summary>行军取消</summary>
            public const string MARCH_CANCELLED = "march_cancelled";
            /// <summary>城池被占领</summary>
            public const string CITY_CAPTURED = "city_captured";

            // ----- 公会事件 -----
            /// <summary>加入公会</summary>
            public const string GUILD_JOINED = "guild_joined";
            /// <summary>离开公会</summary>
            public const string GUILD_LEFT = "guild_left";
            /// <summary>公会信息更新</summary>
            public const string GUILD_UPDATED = "guild_updated";

            // ----- 系统事件 -----
            /// <summary>进入后台</summary>
            public const string APP_PAUSE = "app_pause";
            /// <summary>从后台恢复</summary>
            public const string APP_RESUME = "app_resume";
            /// <summary>退出游戏</summary>
            public const string APP_QUIT = "app_quit";
            /// <summary>游戏暂停</summary>
            public const string GAME_PAUSED = "game_paused";
            /// <summary>游戏恢复</summary>
            public const string GAME_RESUMED = "game_resumed";
        }

        // =====================================================================
        // 游戏配置常量
        // =====================================================================

        /// <summary>HTTP 请求超时时间（秒）</summary>
        public const int HTTP_TIMEOUT = 30;

        /// <summary>HTTP 请求最大重试次数</summary>
        public const int HTTP_MAX_RETRIES = 3;

        /// <summary>HTTP 请求重试间隔（秒）</summary>
        public const float HTTP_RETRY_DELAY = 1.0f;

        /// <summary>WebSocket 心跳间隔（秒）</summary>
        public const int WEBSOCKET_HEARTBEAT_INTERVAL = 30;

        /// <summary>WebSocket 重连最大次数</summary>
        public const int WEBSOCKET_MAX_RECONNECT_ATTEMPTS = 5;

        /// <summary>WebSocket 重连基础间隔（秒）</summary>
        public const float WEBSOCKET_RECONNECT_BASE_DELAY = 1.0f;

        /// <summary>Token 提前刷新时间（秒）—— 在过期前多少秒尝试刷新</summary>
        public const int TOKEN_REFRESH_ADVANCE = 300;

        /// <summary>卡组最大卡牌数</summary>
        public const int DECK_MAX_CARDS = 12;

        /// <summary>战斗最大回合数</summary>
        public const int BATTLE_MAX_ROUNDS = 30;

        /// <summary>新手引导是否已完成的默认值</summary>
        public const string GUIDE_NOT_COMPLETED = "0";
    }
}
