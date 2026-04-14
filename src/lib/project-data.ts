// ============================================================
// 《九州争鼎》SLG卡牌游戏 - 完整项目结构数据
// ============================================================

export interface TreeNode {
  name: string;
  type: "folder" | "file";
  children?: TreeNode[];
  description?: string;
  lang?: string;
}

// ==================== 后端 Go 项目结构 ====================
export const goBackendTree: TreeNode = {
  name: "jiuzhou-server/",
  type: "folder",
  description: "Go 后端微服务根目录",
  children: [
    {
      name: "cmd/",
      type: "folder",
      description: "各微服务入口程序",
      children: [
        { name: "gateway/", type: "folder", description: "API网关服务入口", children: [
          { name: "main.go", type: "file", description: "网关服务主入口，启动HTTP/TCP网关" },
          { name: "config.yaml", type: "file", description: "网关配置文件（端口、路由、限流等）" },
        ]},
        { name: "player/", type: "folder", description: "玩家服务入口", children: [
          { name: "main.go", type: "file", description: "玩家服务主入口" },
          { name: "config.yaml", type: "file", description: "玩家服务配置" },
        ]},
        { name: "battle/", type: "folder", description: "战斗服务入口", children: [
          { name: "main.go", type: "file", description: "战斗服务主入口" },
          { name: "config.yaml", type: "file", description: "战斗服务配置" },
        ]},
        { name: "card/", type: "folder", description: "卡牌服务入口", children: [
          { name: "main.go", type: "file", description: "卡牌服务主入口" },
          { name: "config.yaml", type: "file", description: "卡牌服务配置" },
        ]},
        { name: "guild/", type: "folder", description: "公会服务入口", children: [
          { name: "main.go", type: "file", description: "公会服务主入口" },
          { name: "config.yaml", type: "file", description: "公会服务配置" },
        ]},
        { name: "chat/", type: "folder", description: "聊天服务入口", children: [
          { name: "main.go", type: "file", description: "聊天服务主入口" },
          { name: "config.yaml", type: "file", description: "聊天服务配置" },
        ]},
        { name: "rank/", type: "folder", description: "排行榜服务入口", children: [
          { name: "main.go", type: "file", description: "排行榜服务主入口" },
          { name: "config.yaml", type: "file", description: "排行榜服务配置" },
        ]},
        { name: "mail/", type: "folder", description: "邮件服务入口", children: [
          { name: "main.go", type: "file", description: "邮件服务主入口" },
          { name: "config.yaml", type: "file", description: "邮件服务配置" },
        ]},
        { name: "activity/", type: "folder", description: "活动服务入口", children: [
          { name: "main.go", type: "file", description: "活动服务主入口" },
          { name: "config.yaml", type: "file", description: "活动服务配置" },
        ]},
        { name: "payment/", type: "folder", description: "充值支付服务入口", children: [
          { name: "main.go", type: "file", description: "支付服务主入口" },
          { name: "config.yaml", type: "file", description: "支付服务配置" },
        ]},
        { name: "gm/", type: "folder", description: "GM后台管理服务入口", children: [
          { name: "main.go", type: "file", description: "GM服务主入口" },
          { name: "config.yaml", type: "file", description: "GM服务配置" },
        ]},
      ],
    },
    {
      name: "pkg/",
      type: "folder",
      description: "公共可复用包",
      children: [
        { name: "proto/", type: "folder", description: "Protobuf协议定义", children: [
          { name: "common/", type: "folder", description: "公共消息定义", children: [
            { name: "common.proto", type: "file", description: "公共类型、错误码、枚举定义" },
          ]},
          { name: "player/", type: "folder", description: "玩家协议", children: [
            { name: "player.proto", type: "file", description: "玩家注册、登录、信息查询协议" },
          ]},
          { name: "battle/", type: "folder", description: "战斗协议", children: [
            { name: "battle.proto", type: "file", description: "战斗请求、结算、回放协议" },
          ]},
          { name: "card/", type: "folder", description: "卡牌协议", children: [
            { name: "card.proto", type: "file", description: "卡牌获取、合成、升级协议" },
          ]},
          { name: "guild/", type: "folder", description: "公会协议", children: [
            { name: "guild.proto", type: "file", description: "公会创建、管理、战争协议" },
          ]},
          { name: "chat/", type: "folder", description: "聊天协议", children: [
            { name: "chat.proto", type: "file", description: "世界/公会/私聊消息协议" },
          ]},
          { name: "generate.sh", type: "file", description: "批量生成 protobuf Go 代码脚本" },
        ]},
        { name: "network/", type: "folder", description: "网络通信框架", children: [
          { name: "tcp_server.go", type: "file", description: "TCP长连接服务器（游戏主连接）" },
          { name: "websocket.go", type: "file", description: "WebSocket支持" },
          { name: "http_server.go", type: "file", description: "HTTP REST API服务器" },
          { name: "packet.go", type: "file", description: "数据包编解码（头部+压缩）" },
          { name: "middleware.go", type: "file", description: "网络中间件（鉴权/限流/日志）" },
          { name: "compress.go", type: "file", description: "数据压缩/解压（LZ4/Snappy）" },
        ]},
        { name: "config/", type: "folder", description: "配置管理", children: [
          { name: "config.go", type: "file", description: "配置加载器（YAML/Viper）" },
          { name: "nacos.go", type: "file", description: "Nacos配置中心适配器" },
        ]},
        { name: "db/", type: "folder", description: "数据库工具包", children: [
          { name: "mysql.go", type: "file", description: "MySQL连接池管理" },
          { name: "redis.go", type: "file", description: "Redis连接池管理" },
          { name: "dao.go", type: "file", description: "通用DAO层封装" },
          { name: "migration.go", type: "file", description: "数据库迁移工具" },
        ]},
        { name: "cache/", type: "folder", description: "缓存工具包", children: [
          { name: "local_cache.go", type: "file", description: "本地缓存（BigCache/FreeCache）" },
          { name: "redis_cache.go", type: "file", description: "Redis分布式缓存" },
          { name: "cache_chain.go", type: "file", description: "多级缓存链（L1本地+L2 Redis）" },
        ]},
        { name: "logger/", type: "folder", description: "日志系统", children: [
          { name: "zap_logger.go", type: "file", description: "Zap高性能日志适配" },
          { name: "hook.go", type: "file", description: "日志钩子（文件轮转/ES上报）" },
        ]},
        { name: "auth/", type: "folder", description: "鉴权模块", children: [
          { name: "jwt.go", type: "file", description: "JWT Token生成与验证" },
          { name: "token.go", type: "file", description: "Token刷新与黑名单管理" },
          { name: "crypto.go", type: "file", description: "数据加密/签名工具" },
        ]},
        { name: "errors/", type: "folder", description: "错误处理", children: [
          { name: "codes.go", type: "file", description: "统一错误码定义" },
          { name: "handler.go", type: "file", description: "错误处理中间件" },
        ]},
        { name: "utils/", type: "folder", description: "通用工具", children: [
          { name: "snowflake.go", type: "file", description: "雪花算法分布式ID生成器" },
          { name: "timer.go", type: "file", description: "定时任务管理（cron）" },
          { name: "string.go", type: "file", description: "字符串工具" },
          { name: "math.go", type: "file", description: "数学工具（随机数/概率计算）" },
        ]},
        { name: "rpc/", type: "folder", description: "RPC框架封装", children: [
          { name: "client.go", type: "file", description: "gRPC客户端连接池" },
          { name: "server.go", type: "file", description: "gRPC服务端封装" },
          { name: "interceptor.go", type: "file", description: "gRPC拦截器（链路追踪/限流）" },
          { name: "discovery.go", type: "file", description: "服务发现客户端（Consul/Etcd）" },
          { name: "loadbalancer.go", type: "file", description: "客户端负载均衡" },
        ]},
      ],
    },
    {
      name: "internal/",
      type: "folder",
      description: "各微服务内部实现",
      children: [
        { name: "player/", type: "folder", description: "玩家服务实现", children: [
          { name: "handler.go", type: "file", description: "玩家HTTP/TCP请求处理器" },
          { name: "service.go", type: "file", description: "玩家业务逻辑层" },
          { name: "model.go", type: "file", description: "玩家数据模型" },
          { name: "dao.go", type: "file", description: "玩家数据访问层" },
          { name: "cache.go", type: "file", description: "玩家缓存管理" },
          { name: "repository.go", type: "file", description: "玩家数据仓储模式" },
        ]},
        { name: "battle/", type: "folder", description: "战斗服务实现", children: [
          { name: "handler.go", type: "file", description: "战斗请求处理器" },
          { name: "engine.go", type: "file", description: "战斗引擎核心（回合制/即时制）" },
          { name: "calculator.go", type: "file", description: "伤害计算/属性加成计算" },
          { name: "skill.go", type: "file", description: "技能系统实现" },
          { name: "ai.go", type: "file", description: "AI行为树（PVE战斗）" },
          { name: "replay.go", type: "file", description: "战斗回放录制与回放" },
          { name: "match.go", type: "file", description: "匹配系统实现" },
          { name: "model.go", type: "file", description: "战斗数据模型" },
        ]},
        { name: "card/", type: "folder", description: "卡牌服务实现", children: [
          { name: "handler.go", type: "file", description: "卡牌请求处理器" },
          { name: "service.go", type: "file", description: "卡牌业务逻辑" },
          { name: "gacha.go", type: "file", description: "抽卡系统（概率/保底）" },
          { name: "synthesis.go", type: "file", description: "卡牌合成系统" },
          { name: "evolution.go", type: "file", description: "卡牌进化/升星系统" },
          { name: "deck.go", type: "file", description: "卡组管理（编组/推荐）" },
          { name: "model.go", type: "file", description: "卡牌数据模型" },
        ]},
        { name: "guild/", type: "folder", description: "公会服务实现", children: [
          { name: "handler.go", type: "file", description: "公会请求处理器" },
          { name: "service.go", type: "file", description: "公会业务逻辑" },
          { name: "war.go", type: "file", description: "公会战争系统" },
          { name: "donate.go", type: "file", description: "公会捐赠系统" },
          { name: "tech.go", type: "file", description: "公会科技树" },
          { name: "model.go", type: "file", description: "公会数据模型" },
        ]},
        { name: "chat/", type: "folder", description: "聊天服务实现", children: [
          { name: "handler.go", type: "file", description: "聊天请求处理器" },
          { name: "service.go", type: "file", description: "聊天业务逻辑" },
          { name: "room.go", type: "file", description: "聊天房间管理" },
          { name: "filter.go", type: "file", description: "敏感词过滤" },
          { name: "push.go", type: "file", description: "消息推送（长连接广播）" },
        ]},
        { name: "rank/", type: "folder", description: "排行榜服务实现", children: [
          { name: "handler.go", type: "file", description: "排行榜请求处理器" },
          { name: "service.go", type: "file", description: "排行榜业务逻辑" },
          { name: "zset.go", type: "file", description: "Redis ZSet排行榜实现" },
          { name: "season.go", type: "file", description: "赛季重置与奖励发放" },
        ]},
        { name: "mail/", type: "folder", description: "邮件服务实现", children: [
          { name: "handler.go", type: "file", description: "邮件请求处理器" },
          { name: "service.go", type: "file", description: "邮件业务逻辑" },
          { name: "attachment.go", type: "file", description: "邮件附件系统" },
          { name: "template.go", type: "file", description: "系统邮件模板" },
        ]},
        { name: "activity/", type: "folder", description: "活动服务实现", children: [
          { name: "handler.go", type: "file", description: "活动请求处理器" },
          { name: "service.go", type: "file", description: "活动业务逻辑" },
          { name: "manager.go", type: "file", description: "活动生命周期管理" },
          { name: "reward.go", type: "file", description: "活动奖励发放" },
          { name: "task.go", type: "file", description: "任务/成就系统" },
        ]},
        { name: "payment/", type: "folder", description: "支付服务实现", children: [
          { name: "handler.go", type: "file", description: "支付请求处理器" },
          { name: "service.go", type: "file", description: "支付业务逻辑" },
          { name: "order.go", type: "file", description: "订单管理" },
          { name: "verify.go", type: "file", description: "支付回调验证" },
          { name: "platform.go", type: "file", description: "多平台支付适配（AppStore/GooglePlay）" },
        ]},
        { name: "gateway/", type: "folder", description: "网关服务实现", children: [
          { name: "handler.go", type: "file", description: "网关请求分发处理器" },
          { name: "router.go", type: "file", description: "动态路由管理" },
          { name: "limiter.go", type: "file", description: "限流器（令牌桶/滑动窗口）" },
          { name: "balancer.go", type: "file", description: "服务端负载均衡" },
          { name: "circuit_breaker.go", type: "file", description: "熔断器（Hystrix模式）" },
          { name: "proxy.go", type: "file", description: "协议代理（TCP↔gRPC转发）" },
        ]},
      ],
    },
    {
      name: "api/",
      type: "folder",
      description: "OpenAPI/Swagger文档",
      children: [
        { name: "openapi.yaml", type: "file", description: "REST API接口文档" },
        { name: "gateway.yaml", type: "file", description: "网关API文档" },
      ],
    },
    {
      name: "configs/",
      type: "folder",
      description: "全局配置文件",
      children: [
        { name: "dev.yaml", type: "file", description: "开发环境配置" },
        { name: "staging.yaml", type: "file", description: "预发布环境配置" },
        { name: "prod.yaml", type: "file", description: "生产环境配置" },
        { name: "gateway_routes.yaml", type: "file", description: "网关路由规则配置" },
      ],
    },
    {
      name: "scripts/",
      type: "folder",
      description: "运维脚本",
      children: [
        { name: "build.sh", type: "file", description: "批量编译脚本" },
        { name: "deploy.sh", type: "file", description: "一键部署脚本" },
        { name: "proto_gen.sh", type: "file", description: "Proto文件代码生成" },
        { name: "data_migration.sh", type: "file", description: "数据迁移脚本" },
        { name: "stress_test.sh", type: "file", description: "压测启动脚本" },
      ],
    },
    {
      name: "deploy/",
      type: "folder",
      description: "部署配置",
      children: [
        { name: "docker-compose.yaml", type: "file", description: "Docker Compose编排文件" },
        { name: "Dockerfile", type: "file", description: "多阶段构建Dockerfile" },
        { name: "k8s/", type: "folder", description: "Kubernetes配置", children: [
          { name: "namespace.yaml", type: "file", description: "命名空间定义" },
          { name: "deployment.yaml", type: "file", description: "Deployment配置模板" },
          { name: "service.yaml", type: "file", description: "Service配置" },
          { name: "ingress.yaml", type: "file", description: "Ingress网关入口" },
          { name: "configmap.yaml", type: "file", description: "配置映射" },
          { name: "hpa.yaml", type: "file", description: "水平自动扩缩容" },
        ]},
        { name: "nginx/", type: "folder", description: "Nginx配置", children: [
          { name: "nginx.conf", type: "file", description: "Nginx主配置" },
          { name: "upstream.conf", type: "file", description: "上游服务代理配置" },
        ]},
        { name: "prometheus/", type: "folder", description: "监控配置", children: [
          { name: "prometheus.yml", type: "file", description: "Prometheus配置" },
          { name: "alerts.yaml", type: "file", description: "告警规则" },
        ]},
        { name: "grafana/", type: "folder", description: "Grafana仪表盘", children: [
          { name: "dashboard.json", type: "file", description: "游戏业务监控面板" },
        ]},
      ],
    },
    {
      name: "test/",
      type: "folder",
      description: "测试目录",
      children: [
        { name: "integration/", type: "folder", description: "集成测试", children: [
          { name: "battle_test.go", type: "file", description: "战斗流程集成测试" },
          { name: "gacha_test.go", type: "file", description: "抽卡概率测试" },
        ]},
        { name: "benchmark/", type: "folder", description: "性能基准测试", children: [
          { name: "battle_bench.go", type: "file", description: "战斗引擎性能压测" },
          { name: "gateway_bench.go", type: "file", description: "网关吞吐量压测" },
        ]},
        { name: "mock/", type: "folder", description: "Mock数据", children: [
          { name: "player_mock.go", type: "file", description: "玩家Mock数据生成" },
          { name: "card_mock.go", type: "file", description: "卡牌Mock数据生成" },
        ]},
      ],
    },
    {
      name: "docs/",
      type: "folder",
      description: "项目文档",
      children: [
        { name: "architecture.md", type: "file", description: "架构设计文档" },
        { name: "database_design.md", type: "file", description: "数据库设计文档" },
        { name: "protocol.md", type: "file", description: "通信协议文档" },
        { name: "api_reference.md", type: "file", description: "API参考手册" },
        { name: "deploy_guide.md", type: "file", description: "部署指南" },
      ],
    },
    {
      name: ".github/",
      type: "folder",
      description: "CI/CD流水线",
      children: [
        { name: "workflows/", type: "folder", description: "GitHub Actions工作流", children: [
          { name: "ci.yaml", type: "file", description: "持续集成（编译+测试+lint）" },
          { name: "cd.yaml", type: "file", description: "持续部署（构建镜像+推送+部署）" },
          { name: "codeql.yaml", type: "file", description: "安全扫描" },
        ]},
      ],
    },
    { name: "go.mod", type: "file", description: "Go模块依赖管理" },
    { name: "go.sum", type: "file", description: "依赖校验文件" },
    { name: "Makefile", type: "file", description: "构建自动化（make build/test/lint）" },
    { name: ".gitignore", type: "file", description: "Git忽略文件" },
    { name: "README.md", type: "file", description: "项目说明文档" },
  ],
};

// ==================== Unity 客户端项目结构 ====================
export const unityClientTree: TreeNode = {
  name: "jiuzhou-client/",
  type: "folder",
  description: "Unity客户端项目根目录",
  children: [
    {
      name: "Assets/",
      type: "folder",
      description: "Unity资源根目录",
      children: [
        {
          name: "Scripts/",
          type: "folder",
          description: "C#脚本代码",
          children: [
            {
              name: "Core/",
              type: "folder",
              description: "核心框架层",
              children: [
                { name: "GameManager.cs", type: "file", description: "游戏全局管理器（生命周期控制）" },
                { name: "EventCenter.cs", type: "file", description: "事件总线（观察者模式）" },
                { name: "ServiceLocator.cs", type: "file", description: "服务定位器" },
                { name: "ObjectPool.cs", type: "file", description: "对象池管理" },
                { name: "ResourceManager.cs", type: "file", description: "资源加载管理（Addressable）" },
                { name: "SceneLoader.cs", type: "file", description: "场景加载与转场管理" },
                { name: "CoroutineManager.cs", type: "file", description: "协程管理器" },
                { name: "SaveManager.cs", type: "file", description: "本地数据持久化" },
                { name: "TimeManager.cs", type: "file", description: "服务器时间同步" },
                { name: "Singleton.cs", type: "file", description: "泛型单例基类" },
              ],
            },
            {
              name: "Network/",
              type: "folder",
              description: "网络通信层",
              children: [
                { name: "NetworkManager.cs", type: "file", description: "网络连接管理器（TCP/WebSocket）" },
                { name: "SocketClient.cs", type: "file", description: "Socket客户端封装" },
                { name: "MessageHandler.cs", type: "file", description: "消息分发处理器" },
                { name: "PacketEncoder.cs", type: "file", description: "消息编解码" },
                { name: "HeartbeatManager.cs", type: "file", description: "心跳包管理" },
                { name: "ReconnectManager.cs", type: "file", description: "断线重连管理" },
                { name: "ProtobufHelper.cs", type: "file", description: "Protobuf序列化工具" },
                { name: "NetworkConfig.cs", type: "file", description: "网络配置（服务器地址/超时）" },
                { name: "WebSocketClient.cs", type: "file", description: "WebSocket客户端" },
              ],
            },
            {
              name: "UI/",
              type: "folder",
              description: "UI框架层",
              children: [
                { name: "UIManager.cs", type: "file", description: "UI管理器（栈式/并行）" },
                { name: "UIBase.cs", type: "file", description: "UI面板基类" },
                { name: "UIView.cs", type: "file", description: "UIView MVC视图基类" },
                { name: "UIModel.cs", type: "file", description: "UI数据模型基类" },
                { name: "UIController.cs", type: "file", description: "UI控制器基类" },
                { name: "UIMask.cs", type: "file", description: "UI遮罩层管理" },
                { name: "UIAnimation.cs", type: "file", description: "UI动画效果" },
                { name: "UIBinding.cs", type: "file", description: "UI数据绑定框架" },
                { name: "RedDotManager.cs", type: "file", description: "红点系统" },
                { name: "SafeAreaAdapter.cs", type: "file", description: "刘海屏安全区适配" },
              ],
            },
            {
              name: "Data/",
              type: "folder",
              description: "数据管理层",
              children: [
                { name: "DataManager.cs", type: "file", description: "数据管理总入口" },
                { name: "PlayerData.cs", type: "file", description: "玩家数据模型" },
                { name: "CardData.cs", type: "file", description: "卡牌数据模型" },
                { name: "BattleData.cs", type: "file", description: "战斗数据模型" },
                { name: "GuildData.cs", type: "file", description: "公会数据模型" },
                { name: "ShopData.cs", type: "file", description: "商城数据模型" },
                { name: "ConfigLoader.cs", type: "file", description: "配置表加载器" },
                { name: "DataCache.cs", type: "file", description: "本地数据缓存" },
                { name: "DataSync.cs", type: "file", description: "与服务端数据同步" },
              ],
            },
            {
              name: "Battle/",
              type: "folder",
              description: "战斗系统",
              children: [
                { name: "BattleManager.cs", type: "file", description: "战斗管理器" },
                { name: "BattleController.cs", type: "file", description: "战斗流程控制器" },
                { name: "BattleField.cs", type: "file", description: "战场状态管理" },
                { name: "CardSlot.cs", type: "file", description: "卡牌槽位管理" },
                { name: "SkillExecutor.cs", type: "file", description: "技能执行器" },
                { name: "EffectManager.cs", type: "file", description: "特效管理器" },
                { name: "CameraController.cs", type: "file", description: "战斗相机控制" },
                { name: "BattleAI.cs", type: "file", description: "PVE AI控制器" },
                { name: "BattleReplay.cs", type: "file", description: "战斗回放播放器" },
                { name: "TurnManager.cs", type: "file", description: "回合制回合管理" },
              ],
            },
            {
              name: "Card/",
              type: "folder",
              description: "卡牌系统",
              children: [
                { name: "CardManager.cs", type: "file", description: "卡牌管理器" },
                { name: "CardCollection.cs", type: "file", description: "卡牌图鉴收藏" },
                { name: "CardDeck.cs", type: "file", description: "卡组编成" },
                { name: "CardInfo.cs", type: "file", description: "卡牌信息数据结构" },
                { name: "GachaSystem.cs", type: "file", description: "抽卡系统客户端逻辑" },
                { name: "CardEvolution.cs", type: "file", description: "卡牌进化界面逻辑" },
                { name: "CardDetailView.cs", type: "file", description: "卡牌详情展示" },
              ],
            },
            {
              name: "Guild/",
              type: "folder",
              description: "公会系统",
              children: [
                { name: "GuildManager.cs", type: "file", description: "公会管理器" },
                { name: "GuildMemberList.cs", type: "file", description: "成员列表管理" },
                { name: "GuildWar.cs", type: "file", description: "公会战争客户端" },
                { name: "GuildChat.cs", type: "file", description: "公会聊天客户端" },
                { name: "GuildDonate.cs", type: "file", description: "公会捐赠界面" },
              ],
            },
            {
              name: "Shop/",
              type: "folder",
              description: "商城系统",
              children: [
                { name: "ShopManager.cs", type: "file", description: "商城管理器" },
                { name: "ShopItem.cs", type: "file", description: "商品数据结构" },
                { name: "PurchaseFlow.cs", type: "file", description: "购买流程控制" },
                { name: "IAPManager.cs", type: "file", description: "内购SDK集成（Unity IAP）" },
              ],
            },
            {
              name: "Audio/",
              type: "folder",
              description: "音频系统",
              children: [
                { name: "AudioManager.cs", type: "file", description: "音频管理器" },
                { name: "BGMController.cs", type: "file", description: "背景音乐控制" },
                { name: "SFXController.cs", type: "file", description: "音效控制" },
                { name: "VoiceController.cs", type: "file", description: "语音控制" },
              ],
            },
            {
              name: "Utils/",
              type: "folder",
              description: "工具类",
              children: [
                { name: "Extensions.cs", type: "file", description: "C#扩展方法" },
                { name: "MathUtils.cs", type: "file", description: "数学工具" },
                { name: "StringUtils.cs", type: "file", description: "字符串工具" },
                { name: "ColorUtils.cs", type: "file", description: "颜色工具" },
                { name: "EncryptUtils.cs", type: "file", description: "加密工具" },
              ],
            },
          ],
        },
        {
          name: "Prefabs/",
          type: "folder",
          description: "预制体",
          children: [
            { name: "UI/", type: "folder", description: "UI预制体", children: [
              { name: "MainUI.prefab", type: "file", description: "主界面预制体" },
              { name: "BattleUI.prefab", type: "file", description: "战斗界面预制体" },
              { name: "CardDetailPanel.prefab", type: "file", description: "卡牌详情面板" },
              { name: "GachaPanel.prefab", type: "file", description: "抽卡面板" },
              { name: "GuildPanel.prefab", type: "file", description: "公会面板" },
              { name: "ChatPanel.prefab", type: "file", description: "聊天面板" },
              { name: "ShopPanel.prefab", type: "file", description: "商城面板" },
              { name: "SettingsPanel.prefab", type: "file", description: "设置面板" },
              { name: "Common/", type: "folder", description: "通用UI组件预制体" },
            ]},
            { name: "Battle/", type: "folder", description: "战斗预制体", children: [
              { name: "CardSlot.prefab", type: "file", description: "卡牌槽位" },
              { name: "Effect.prefab", type: "file", description: "特效预制体" },
              { name: "Unit.prefab", type: "file", description: "战斗单位" },
            ]},
            { name: "Cards/", type: "folder", description: "卡牌预制体" },
            { name: "Effects/", type: "folder", description: "特效预制体" },
          ],
        },
        {
          name: "Art/",
          type: "folder",
          description: "美术资源",
          children: [
            { name: "Sprites/", type: "folder", description: "2D精灵图", children: [
              { name: "Cards/", type: "folder", description: "卡牌原画" },
              { name: "Icons/", type: "folder", description: "图标资源" },
              { name: "UI/", type: "folder", description: "UI切图" },
              { name: "Backgrounds/", type: "folder", description: "背景图" },
            ]},
            { name: "Animations/", type: "folder", description: "动画资源", children: [
              { name: "Controllers/", type: "folder", description: "动画控制器" },
              { name: "Clips/", type: "folder", description: "动画片段" },
            ]},
            { name: "Fonts/", type: "folder", description: "字体资源", children: [
              { name: "Chinese/", type: "folder", description: "中文字体" },
              { name: "English/", type: "folder", description: "英文字体" },
            ]},
            { name: "Shaders/", type: "folder", description: "着色器", children: [
              { name: "CardEffect.shader", type: "file", description: "卡牌特效着色器" },
              { name: "UIEffect.shader", type: "file", description: "UI特效着色器" },
            ]},
          ],
        },
        {
          name: "Audio/",
          type: "folder",
          description: "音频资源",
          children: [
            { name: "BGM/", type: "folder", description: "背景音乐" },
            { name: "SFX/", type: "folder", description: "音效文件" },
            { name: "Voice/", type: "folder", description: "语音文件" },
          ],
        },
        {
          name: "StreamingAssets/",
          type: "folder",
          description: "可热更资源",
          children: [
            { name: "Config/", type: "folder", description: "配置表（Excel→JSON）", children: [
              { name: "CardConfig.json", type: "file", description: "卡牌配置表" },
              { name: "SkillConfig.json", type: "file", description: "技能配置表" },
              { name: "StageConfig.json", type: "file", description: "关卡配置表" },
              { name: "ShopConfig.json", type: "file", description: "商城配置表" },
              { name: "GachaConfig.json", type: "file", description: "抽卡配置表" },
              { name: "ActivityConfig.json", type: "file", description: "活动配置表" },
              { name: "RewardConfig.json", type: "file", description: "奖励配置表" },
            ]},
            { name: "AB/", type: "folder", description: "AssetBundle热更包" },
          ],
        },
        {
          name: "Scenes/",
          type: "folder",
          description: "场景文件",
          children: [
            { name: "Boot.unity", type: "file", description: "启动场景（SDK初始化+版本检查）" },
            { name: "Login.unity", type: "file", description: "登录场景" },
            { name: "Main.unity", type: "file", description: "主城/大厅场景" },
            { name: "Battle.unity", type: "file", description: "战斗场景" },
            { name: "Guild.unity", type: "file", description: "公会场景" },
          ],
        },
        {
          name: "Plugins/",
          type: "folder",
          description: "第三方插件/SDK",
          children: [
            { name: "Protobuf/", type: "folder", description: "Protobuf C#运行时" },
            { name: "UniTask/", type: "folder", description: "异步任务库" },
            { name: "DOTween/", type: "folder", description: "补间动画库" },
            { name: "Addressables/", type: "folder", description: "Addressable资源系统" },
            { name: "UniRx/", type: "folder", description: "响应式编程框架" },
            { name: "FairyGUI/", type: "folder", description: "UGUI插件" },
            { name: "XLua/", type: "folder", description: "Lua热更框架（可选）" },
          ],
        },
        {
          name: "Resources/",
          type: "folder",
          description: "Resources目录（启动必须资源）",
        },
        {
          name: "Editor/",
          type: "folder",
          description: "编辑器扩展",
          children: [
            { name: "BuildTool.cs", type: "file", description: "打包工具（多渠道）" },
            { name: "ConfigGenerator.cs", type: "file", description: "配置表代码生成" },
            { name: "ABBuilder.cs", type: "file", description: "AssetBundle构建工具" },
            { name: "DataChecker.cs", type: "file", description: "资源检查工具" },
            { name: "ProtoGenerator.cs", type: "file", description: "Proto C#代码生成" },
          ],
        },
      ],
    },
    {
      name: "ProjectSettings/",
      type: "folder",
      description: "Unity项目设置",
      children: [
        { name: "ProjectSettings.asset", type: "file", description: "项目基本设置" },
        { name: "QualitySettings.asset", type: "file", description: "画质分级设置" },
        { name: "GraphicsSettings.asset", type: "file", description: "图形渲染设置" },
        { name: "EditorBuildSettings.asset", type: "file", description: "场景构建列表" },
      ],
    },
    { name: "Packages/", type: "folder", description: "Unity包管理（manifest.json）" },
    { name: ".gitignore", type: "file", description: "Git忽略文件" },
    { name: "README.md", type: "file", description: "客户端说明文档" },
  ],
};

// ==================== 模块职责说明 ====================
export interface ModuleInfo {
  name: string;
  nameEn: string;
  icon: string;
  color: string;
  description: string;
  responsibilities: string[];
  techStack: string[];
  port?: string;
  protocol?: string;
}

export const backendModules: ModuleInfo[] = [
  {
    name: "API网关服务",
    nameEn: "Gateway Service",
    icon: "Route",
    color: "from-amber-500 to-orange-600",
    description: "统一入口，负责请求分发、负载均衡、限流熔断、协议转换",
    responsibilities: [
      "统一接收所有客户端请求（TCP/WebSocket/HTTP）",
      "基于服务发现的路由分发",
      "令牌桶/滑动窗口限流保护",
      "服务熔断与降级（Hystrix模式）",
      "协议转换（TCP↔gRPC）",
      "JWT鉴权Token校验",
      "请求日志与链路追踪",
      "灰度发布与A/B测试路由",
    ],
    techStack: ["Go", "gRPC", "Nginx", "Consul/Etcd", "Prometheus"],
    port: "8000/8001",
    protocol: "TCP / WebSocket / HTTP",
  },
  {
    name: "玩家服务",
    nameEn: "Player Service",
    icon: "User",
    color: "from-emerald-500 to-teal-600",
    description: "管理玩家全生命周期数据，包括注册登录、角色创建、属性管理等",
    responsibilities: [
      "账号注册与登录（手机/邮箱/第三方）",
      "角色创建与管理（改名/头像/签名）",
      "玩家等级/经验值管理",
      "资源管理（金币/钻石/体力/材料）",
      "玩家背包系统",
      "新手引导进度管理",
      "玩家在线状态与心跳维护",
      "数据安全校验与防作弊",
    ],
    techStack: ["Go", "MySQL", "Redis", "gRPC", "Protobuf"],
    port: "9001",
    protocol: "gRPC / TCP",
  },
  {
    name: "战斗服务",
    nameEn: "Battle Service",
    icon: "Swords",
    color: "from-red-500 to-rose-600",
    description: "游戏核心战斗引擎，支持PVE/PVP多模式战斗计算",
    responsibilities: [
      "回合制战斗引擎核心逻辑",
      "卡牌技能效果计算（伤害/治疗/增益/减益）",
      "PVE关卡战斗逻辑",
      "PVP实时/异步对战",
      "匹配系统（MMR算法/段位匹配）",
      "战斗回放录制与存储",
      "战斗结算与奖励发放",
      "战报统计与数据分析",
    ],
    techStack: ["Go", "Redis", "gRPC", "Protobuf", "MMR"],
    port: "9002",
    protocol: "gRPC / WebSocket",
  },
  {
    name: "卡牌服务",
    nameEn: "Card Service",
    icon: "Layers",
    color: "from-violet-500 to-purple-600",
    description: "卡牌获取、合成、进化、卡组编成等卡牌核心系统",
    responsibilities: [
      "卡牌抽取系统（单抽/十连/保底机制）",
      "卡牌图鉴与收集系统",
      "卡牌合成与碎片系统",
      "卡牌进化/升星/突破",
      "技能升级与解锁",
      "卡组编成与保存（多套）",
      "卡牌推荐系统",
      "卡牌交易市场（可选）",
    ],
    techStack: ["Go", "MySQL", "Redis", "gRPC", "概率算法"],
    port: "9003",
    protocol: "gRPC",
  },
  {
    name: "公会服务",
    nameEn: "Guild Service",
    icon: "Shield",
    color: "from-cyan-500 to-blue-600",
    description: "公会社交系统，包含公会战争、科技树、捐赠等玩法",
    responsibilities: [
      "公会创建/解散/转让",
      "成员招募与审批",
      "公会等级与经验值",
      "公会战争（GVG）",
      "公会科技树研发",
      "成员捐赠与贡献度",
      "公会排行榜",
      "公会日志与公告",
    ],
    techStack: ["Go", "MySQL", "Redis", "gRPC"],
    port: "9004",
    protocol: "gRPC",
  },
  {
    name: "聊天服务",
    nameEn: "Chat Service",
    icon: "MessageCircle",
    color: "from-pink-500 to-fuchsia-600",
    description: "实时消息系统，支持世界/公会/私聊多频道",
    responsibilities: [
      "世界频道实时消息广播",
      "公会频道消息推送",
      "私聊系统（点对点）",
      "系统公告推送",
      "敏感词过滤",
      "聊天记录存储与查询",
      "消息类型支持（文字/表情/图片）",
      "聊天禁言/拉黑管理",
    ],
    techStack: ["Go", "WebSocket", "Redis Pub/Sub", "MongoDB(可选)"],
    port: "9005",
    protocol: "WebSocket / gRPC",
  },
  {
    name: "排行榜服务",
    nameEn: "Rank Service",
    icon: "Trophy",
    color: "from-yellow-500 to-amber-600",
    description: "多维度排行榜系统，基于Redis ZSet高性能实现",
    responsibilities: [
      "战力排行榜",
      "竞技场排行榜",
      "公会排行榜",
      "赛季排行榜与重置",
      "排名奖励自动发放",
      "历史排名查询",
      "周边排名查询（我的前N名）",
      "排行榜缓存优化",
    ],
    techStack: ["Go", "Redis ZSet", "gRPC"],
    port: "9006",
    protocol: "gRPC",
  },
  {
    name: "邮件服务",
    nameEn: "Mail Service",
    icon: "Mail",
    color: "from-slate-500 to-gray-600",
    description: "系统邮件与附件奖励发放系统",
    responsibilities: [
      "系统邮件自动发放",
      "运营邮件群发",
      "邮件附件领取",
      "邮件过期清理",
      "邮件模板管理",
      "已读/未读状态管理",
      "批量附件奖励发放",
    ],
    techStack: ["Go", "MySQL", "Redis", "gRPC"],
    port: "9007",
    protocol: "gRPC",
  },
  {
    name: "活动服务",
    nameEn: "Activity Service",
    icon: "Calendar",
    color: "from-orange-500 to-red-600",
    description: "运营活动生命周期管理，包含限时活动与任务成就系统",
    responsibilities: [
      "限时活动创建与管理",
      "活动开放/关闭自动调度",
      "签到/七日登录活动",
      "任务系统（日常/周常/成就）",
      "活动奖励发放",
      "活动数据统计",
      "活动条件判定引擎",
    ],
    techStack: ["Go", "MySQL", "Redis", "定时任务"],
    port: "9008",
    protocol: "gRPC",
  },
  {
    name: "支付服务",
    nameEn: "Payment Service",
    icon: "CreditCard",
    color: "from-green-500 to-emerald-600",
    description: "多平台支付集成，订单管理与安全验证",
    responsibilities: [
      "多平台支付SDK集成（AppStore/GooglePlay/微信/支付宝）",
      "订单创建与状态管理",
      "支付回调验证与安全校验",
      "充值到账与商品发放",
      "订单查询与退款处理",
      "支付安全防篡改",
      "充值统计与报表",
    ],
    techStack: ["Go", "MySQL", "Redis", "HTTPS/SSL"],
    port: "9009",
    protocol: "HTTPS / gRPC",
  },
  {
    name: "GM管理服务",
    nameEn: "GM Admin Service",
    icon: "Settings",
    color: "from-zinc-500 to-neutral-600",
    description: "运营后台管理，提供玩家查询、数据修改、公告发布等功能",
    responsibilities: [
      "玩家数据查询与修改",
      "全服公告发布",
      "封号/禁言管理",
      "物品/资源直接发放",
      "服务器参数热更新",
      "运营数据分析面板",
      "操作审计日志",
      "服务器状态监控",
    ],
    techStack: ["Go", "MySQL", "gRPC", "React(管理后台)"],
    port: "9010",
    protocol: "HTTPS / gRPC",
  },
];

// ==================== 网关设计 ====================
export const gatewayDesign = {
  layers: [
    {
      name: "客户端层",
      color: "border-blue-400 bg-blue-500/10",
      items: ["Unity客户端", "Web管理后台", "第三方接口"],
    },
    {
      name: "接入层",
      color: "border-amber-400 bg-amber-500/10",
      items: ["Nginx 反向代理", "SSL/TLS 终止", "负载均衡"],
    },
    {
      name: "网关层",
      color: "border-orange-400 bg-orange-500/10",
      items: [
        "鉴权过滤器 (JWT验证)",
        "限流过滤器 (令牌桶/滑动窗口)",
        "熔断降级器 (Hystrix)",
        "协议转换器 (TCP↔gRPC)",
        "服务发现 (Consul/Etcd)",
        "链路追踪 (OpenTelemetry)",
        "请求日志与审计",
      ],
    },
    {
      name: "微服务层",
      color: "border-emerald-400 bg-emerald-500/10",
      items: ["玩家服务", "战斗服务", "卡牌服务", "公会服务", "聊天服务", "排行榜服务", "其他服务..."],
    },
    {
      name: "数据层",
      color: "border-purple-400 bg-purple-500/10",
      items: ["MySQL (持久化)", "Redis (缓存/排行榜)", "MongoDB (聊天日志)", "对象存储 (战斗回放)"],
    },
  ],
  flow: [
    "客户端 → TCP/WebSocket → Nginx → Gateway",
    "Gateway: JWT校验 → 路由匹配 → 负载均衡",
    "Gateway → gRPC → 目标微服务",
    "微服务 → MySQL/Redis → 数据读写",
    "响应: 微服务 → Gateway → 客户端",
    "异常: 熔断 → 降级 → 友好错误返回",
  ],
};

// ==================== Docker部署方案 ====================
export interface DockerService {
  name: string;
  image: string;
  port: string;
  replicas: string;
  env: string[];
  depends_on?: string[];
}

export const dockerServices: DockerService[] = [
  {
    name: "MySQL 8.0",
    image: "mysql:8.0",
    port: "3306:3306",
    replicas: "主从复制(1主2从)",
    env: ["MYSQL_ROOT_PASSWORD", "MYSQL_DATABASE=jiuzhou", "字符集=utf8mb4"],
  },
  {
    name: "Redis 7.0",
    image: "redis:7.0-alpine",
    port: "6379:6379",
    replicas: "哨兵模式(3节点)",
    env: ["REDIS_PASSWORD", "maxmemory=2gb", "maxmemory-policy=allkeys-lru"],
  },
  {
    name: "Consul",
    image: "consul:1.15",
    port: "8500:8500",
    replicas: "集群(3节点)",
    env: ["CONSUL_BIND_INTERFACE=eth0", "CONSUL_BOOTSTRAP_EXPECT=3"],
  },
  {
    name: "Prometheus",
    image: "prom/prometheus:v2.47",
    port: "9090:9090",
    replicas: "单节点",
    env: ["--config.file=/etc/prometheus/prometheus.yml"],
  },
  {
    name: "Grafana",
    image: "grafana/grafana:10.2",
    port: "3001:3000",
    replicas: "单节点",
    env: ["GF_SECURITY_ADMIN_PASSWORD"],
    depends_on: ["Prometheus"],
  },
  {
    name: "Gateway",
    image: "jiuzhou/gateway:latest",
    port: "8000:8000, 8001:8001",
    replicas: "2-4实例",
    env: ["CONFIG_PATH=/app/configs/prod.yaml", "CONSUL_ADDR=consul:8500"],
    depends_on: ["Consul", "MySQL 8.0", "Redis 7.0"],
  },
  {
    name: "Player Service",
    image: "jiuzhou/player:latest",
    port: "9001:9001",
    replicas: "2-3实例",
    env: ["DB_HOST=mysql-master", "REDIS_ADDR=redis:6379"],
    depends_on: ["MySQL 8.0", "Redis 7.0"],
  },
  {
    name: "Battle Service",
    image: "jiuzhou/battle:latest",
    port: "9002:9002",
    replicas: "3-5实例",
    env: ["REDIS_ADDR=redis:6379", "CPU_LIMIT=2"],
    depends_on: ["Redis 7.0"],
  },
  {
    name: "Card Service",
    image: "jiuzhou/card:latest",
    port: "9003:9003",
    replicas: "2-3实例",
    env: ["DB_HOST=mysql-master", "REDIS_ADDR=redis:6379"],
    depends_on: ["MySQL 8.0", "Redis 7.0"],
  },
  {
    name: "Chat Service",
    image: "jiuzhou/chat:latest",
    port: "9005:9005",
    replicas: "2-3实例",
    env: ["REDIS_ADDR=redis:6379"],
    depends_on: ["Redis 7.0"],
  },
  {
    name: "Nginx",
    image: "nginx:1.25-alpine",
    port: "80:80, 443:443",
    replicas: "2实例(主备)",
    env: ["SSL证书路径", "upstream配置"],
    depends_on: ["Gateway"],
  },
];

// ==================== 数据库设计 ====================
export interface TableInfo {
  name: string;
  description: string;
  keyFields: string[];
  indexes: string[];
}

export const databaseTables: TableInfo[] = [
  {
    name: "player",
    description: "玩家基础信息表",
    keyFields: ["id(主键)", "uid(唯一ID)", "username", "level", "experience", "vip_level", "last_login"],
    indexes: ["uid(唯一)", "username(唯一)", "level", "last_login"],
  },
  {
    name: "player_resource",
    description: "玩家资源表",
    keyFields: ["id", "player_id", "gold", "diamond", "stamina", "stamina_refresh_time"],
    indexes: ["player_id(唯一)"],
  },
  {
    name: "card",
    description: "卡牌定义表",
    keyFields: ["id", "name", "rarity", "element", "base_atk", "base_hp", "skill_id", "description"],
    indexes: ["rarity", "element"],
  },
  {
    name: "player_card",
    description: "玩家持有卡牌表",
    keyFields: ["id", "player_id", "card_id", "level", "star", "exp", "slot"],
    indexes: ["player_id", "card_id"],
  },
  {
    name: "deck",
    description: "卡组表",
    keyFields: ["id", "player_id", "name", "card_ids(JSON)", "is_default"],
    indexes: ["player_id"],
  },
  {
    name: "guild",
    description: "公会表",
    keyFields: ["id", "name", "leader_id", "level", "exp", "member_count", "announcement"],
    indexes: ["name(唯一)", "leader_id"],
  },
  {
    name: "guild_member",
    description: "公会成员表",
    keyFields: ["id", "guild_id", "player_id", "role", "contribution", "join_time"],
    indexes: ["guild_id", "player_id(唯一)"],
  },
  {
    name: "battle_record",
    description: "战斗记录表",
    keyFields: ["id", "attacker_id", "defender_id", "result", "replay_data(LONGBLOB)", "create_time"],
    indexes: ["attacker_id", "defender_id", "create_time"],
  },
  {
    name: "payment_order",
    description: "支付订单表",
    keyFields: ["id", "order_no(唯一)", "player_id", "product_id", "amount", "status", "platform"],
    indexes: ["order_no(唯一)", "player_id", "status"],
  },
  {
    name: "mail",
    description: "邮件表",
    keyFields: ["id", "player_id", "title", "content", "attachments(JSON)", "is_read", "expire_time"],
    indexes: ["player_id", "is_read", "expire_time"],
  },
  {
    name: "activity",
    description: "活动表",
    keyFields: ["id", "type", "name", "start_time", "end_time", "config(JSON)", "status"],
    indexes: ["type", "status", "start_time", "end_time"],
  },
];
