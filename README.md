# 九州争鼎 - SLG卡牌游戏架构方案

> Go微服务 + Unity客户端全栈SLG卡牌游戏完整项目架构

## 技术栈
- **后端**: Go 1.21+ / gRPC / Protobuf / MySQL 8.0 / Redis 7.0
- **客户端**: Unity 2022 LTS / C# / Addressable
- **部署**: Docker / Kubernetes / Nginx / Consul
- **监控**: Prometheus / Grafana / OpenTelemetry

## 项目结构
- 11个核心微服务（网关/玩家/战斗/卡牌/公会/聊天/排行榜/邮件/活动/支付/GM）
- Protobuf通信协议
- 多级缓存架构
- 容器化部署方案
