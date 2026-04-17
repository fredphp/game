#!/bin/bash
# ============================================================
# 九州争鼎 - start.sh 一键启动脚本
# 功能: 启动所有 Docker 服务 + Web Admin 前端
# 用法: bash start.sh [选项]
#   bash start.sh          # 启动所有服务
#   bash start.sh infra    # 仅启动基础设施 (MySQL + Redis)
#   bash start.sh backend  # 仅启动后端微服务
#   bash start.sh frontend # 仅启动前端
#   bash start.sh stop     # 停止所有服务
#   bash start.sh status   # 查看服务状态
#   bash start.sh logs     # 查看日志
# ============================================================

set -e

# ── 颜色定义 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMAND_DIR="$SCRIPT_DIR/command"

COMPOSE_CMD=""
if docker compose version &> /dev/null 2>&1; then
    COMPOSE_CMD="docker compose"
else
    COMPOSE_CMD="docker-compose"
fi

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ── 服务状态检查 ──
check_service() {
    local name="$1"
    local port="$2"
    if timeout 2 bash -c "echo > /dev/tcp/127.0.0.1/$port" 2>/dev/null; then
        echo -e "  ${GREEN}●${NC} $name (:$port) - 运行中"
        return 0
    else
        echo -e "  ${RED}○${NC} $name (:$port) - 未启动"
        return 1
    fi
}

# ── 启动所有服务 ──
start_all() {
    echo -e "\n${BLUE}━━━ 启动所有服务 ━━━${NC}\n"

    cd "$COMMAND_DIR"

    # 先启动基础设施
    log_info "启动基础设施 (MySQL + Redis)..."
    $COMPOSE_CMD up -d mysql redis

    # 等待 MySQL 就绪
    log_info "等待 MySQL 就绪..."
    local retries=30
    while [[ $retries -gt 0 ]]; do
        if docker exec jiuzhou-mysql mysqladmin ping -uroot -proot123 &> /dev/null; then
            log_info "MySQL 就绪 ✓"
            break
        fi
        sleep 2
        ((retries--)) || true
    done
    if [[ $retries -eq 0 ]]; then
        log_error "MySQL 启动超时!"
        exit 1
    fi

    # 启动后端微服务
    log_info "启动后端微服务..."
    $COMPOSE_CMD up -d

    # 等待服务启动
    log_info "等待服务启动 (15秒)..."
    sleep 15

    # 显示状态
    show_status

    # 提示前端启动
    echo ""
    log_info "前端启动命令: cd $SCRIPT_DIR && bun run dev"
}

# ── 仅启动基础设施 ──
start_infra() {
    log_info "启动基础设施..."
    cd "$COMMAND_DIR"
    $COMPOSE_CMD up -d mysql redis
    log_info "MySQL → localhost:3306"
    log_info "Redis → localhost:6379"
}

# ── 仅启动后端 ──
start_backend() {
    log_info "启动后端微服务..."
    cd "$COMMAND_DIR"
    $COMPOSE_CMD up -d
    log_info "等待服务启动..."
    sleep 10
    show_status
}

# ── 启动前端 ──
start_frontend() {
    log_info "启动 Web Admin 前端..."
    cd "$SCRIPT_DIR"
    if [[ -f "package.json" ]]; then
        bun run dev &
        log_info "前端已后台启动: http://localhost:3000"
    else
        log_error "未找到 package.json"
        exit 1
    fi
}

# ── 停止所有服务 ──
stop_all() {
    echo -e "\n${BLUE}━━━ 停止所有服务 ━━━${NC}\n"
    cd "$COMMAND_DIR"
    $COMPOSE_CMD down
    log_info "所有服务已停止"
}

# ── 查看服务状态 ──
show_status() {
    echo -e "\n${BLUE}━━━ 服务状态 ━━━${NC}\n"
    check_service "MySQL"         3307
    check_service "Redis"         6380
    check_service "User Service"  9001
    check_service "Battle Service" 9002
    check_service "Card Service"  9003
    check_service "Map Service"   9004
    check_service "Guild Service" 9005
    check_service "Payment Service" 9006
    check_service "Quest Service" 9007
    check_service "Season Service" 9008
    check_service "Admin Service" 9100
    echo ""
}

# ── 查看日志 ──
show_logs() {
    cd "$COMMAND_DIR"
    local service="${1:-}"
    if [[ -n "$service" ]]; then
        $COMPOSE_CMD logs -f "$service"
    else
        $COMPOSE_CMD logs -f --tail=50
    fi
}

# ── 重启所有服务 ──
restart_all() {
    stop_all
    sleep 3
    start_all
}

# ============================================================
# 主入口
# ============================================================
case "${1:-all}" in
    all)
        start_all
        ;;
    infra|mysql|redis)
        start_infra
        ;;
    backend|services)
        start_backend
        ;;
    frontend|web|admin)
        start_frontend
        ;;
    stop|down)
        stop_all
        ;;
    status|ps)
        show_status
        ;;
    logs|log)
        show_logs "${2:-}"
        ;;
    restart)
        restart_all
        ;;
    *)
        echo "用法: bash start.sh [命令]"
        echo ""
        echo "命令:"
        echo "  all       启动所有服务 (默认)"
        echo "  infra     仅启动基础设施 (MySQL + Redis)"
        echo "  backend   仅启动后端微服务"
        echo "  frontend  仅启动前端面板"
        echo "  stop      停止所有服务"
        echo "  status    查看服务状态"
        echo "  logs [服务名]  查看日志 (可选: mysql/redis/user-service/...)"
        echo "  restart   重启所有服务"
        echo ""
        echo "示例:"
        echo "  bash start.sh              # 启动全部"
        echo "  bash start.sh stop         # 停止全部"
        echo "  bash start.sh logs battle-service  # 查看 Battle 日志"
        ;;
esac
