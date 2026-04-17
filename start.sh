#!/bin/bash
# ============================================================
# 九州争鼎 - start.sh 一键启动脚本
# 功能: 自动补全依赖 → 构建镜像 → 启动服务
# 用法:
#   bash start.sh          # 一键启动全部（首次自动构建）
#   bash start.sh build    # 仅构建镜像
#   bash start.sh infra    # 仅启动基础设施 (MySQL + Redis)
#   bash start.sh backend  # 仅启动后端微服务
#   bash start.sh frontend # 仅启动前端
#   bash start.sh stop     # 停止所有服务
#   bash start.sh status   # 查看服务状态
#   bash start.sh logs     # 查看日志
#   bash start.sh rebuild  # 清理缓存后重新构建
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

# 需要生成 go.sum 的服务
SERVICES=(
    "user-service:1.21"
    "battle-service:1.21"
    "card-service:1.21"
    "map-service:1.21"
    "guild-service:1.21"
    "payment-service:1.21"
    "season-service:1.21"
    "admin-service:1.22"
)

log_info()  { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()  { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# ── 检查 go.sum 并自动生成 ──
ensure_go_sum() {
    local need_gen=false
    for item in "${SERVICES[@]}"; do
        local SVC="${item%%:*}"
        if [[ ! -f "$SCRIPT_DIR/$SVC/go.sum" ]]; then
            need_gen=true
            break
        fi
    done

    if [[ "$need_gen" == "false" ]]; then
        log_info "go.sum 文件齐全, 跳过生成"
        return 0
    fi

    log_step "生成缺失的 go.sum 文件"
    for item in "${SERVICES[@]}"; do
        local SVC="${item%%:*}"
        local GO_VER="${item##*:}"

        if [[ -f "$SCRIPT_DIR/$SVC/go.sum" ]]; then
            echo -e "  ${GREEN}✓${NC} $SVC/go.sum 已存在"
            continue
        fi

        echo -e "  ${YELLOW}⏳${NC} 生成 $SVC/go.sum (Go $GO_VER)..."
        if docker run --rm \
            -v "$SCRIPT_DIR/$SVC:/app" \
            -w /app \
            -e GOPROXY=https://goproxy.cn,direct \
            -e GO111MODULE=on \
            "golang:$GO_VER-alpine" \
            sh -c "apk add --no-cache git > /dev/null 2>&1 && go mod tidy && go mod download"; then
            echo -e "  ${GREEN}✓${NC} $SVC/go.sum 生成成功"
        else
            echo -e "  ${RED}✗${NC} $SVC/go.sum 生成失败 (查看上方错误信息)"
        fi
    done

    # 自动提交 go.sum
    local has_new=false
    for item in "${SERVICES[@]}"; do
        local SVC="${item%%:*}"
        if [[ -f "$SCRIPT_DIR/$SVC/go.sum" ]]; then
            git -C "$SCRIPT_DIR" add "$SVC/go.sum" 2>/dev/null && has_new=true
        fi
    done
    if [[ "$has_new" == "true" ]]; then
        git -C "$SCRIPT_DIR" commit -m "chore: 自动生成 go.sum 文件" 2>/dev/null || true
        log_info "go.sum 文件已自动提交到 git"
    fi
}

# ── 构建镜像 ──
build_images() {
    log_step "构建 Docker 镜像"
    cd "$COMMAND_DIR"

    # 确保日志目录存在
    mkdir -p logs/{user-service,battle-service,card-service,map-service,guild-service,payment-service,season-service,admin-service}

    log_info "开始构建 (首次约需 10-20 分钟, 后续会使用缓存)..."
    $COMPOSE_CMD build 2>&1
    log_info "镜像构建完成 ✓"
}

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

# ── 一键启动（含自动构建）──
start_all() {
    log_step "一键启动所有服务"

    # 自动检测并补全 go.sum
    ensure_go_sum

    # 检查是否需要构建
    cd "$COMMAND_DIR"
    local need_build=false
    for item in "${SERVICES[@]}"; do
        local SVC="${item%%:*}"
        if ! docker image inspect "command-${SVC}" &> /dev/null && \
           ! docker image inspect "command-${SVC//[-]/}" &> /dev/null; then
            need_build=true
            break
        fi
    done
    if [[ "$need_build" == "true" ]]; then
        log_warn "检测到镜像不存在, 开始构建..."
        build_images
    else
        log_info "镜像已存在, 跳过构建 (如需重建: bash start.sh rebuild)"
    fi

    # 启动基础设施
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
}

# ── 仅构建镜像 ──
do_build() {
    ensure_go_sum
    build_images
}

# ── 清理缓存重新构建 ──
do_rebuild() {
    log_step "清理构建缓存"
    docker builder prune -f
    log_info "缓存已清理, 开始重新构建..."
    ensure_go_sum
    build_images
}

# ── 仅启动基础设施 ──
start_infra() {
    cd "$COMMAND_DIR"
    $COMPOSE_CMD up -d mysql redis
    log_info "MySQL → localhost:3307"
    log_info "Redis → localhost:6380"
}

# ── 仅启动后端 ──
start_backend() {
    cd "$COMMAND_DIR"
    $COMPOSE_CMD up -d
    log_info "等待服务启动..."
    sleep 10
    show_status
}

# ── 启动前端 ──
start_frontend() {
    cd "$SCRIPT_DIR"
    if [[ -f "package.json" ]]; then
        if ! command -v bun &> /dev/null; then
            log_warn "Bun 未安装, 请先运行: bash trans.sh"
            exit 1
        fi
        # 检查依赖是否已安装
        if [[ ! -d "node_modules" ]]; then
            log_info "安装前端依赖..."
            bun install
        fi
        log_info "启动前端: http://localhost:3000"
        bun run dev &
    else
        log_error "未找到 package.json"
        exit 1
    fi
}

# ── 停止所有服务 ──
stop_all() {
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

# ============================================================
# 主入口
# ============================================================
case "${1:-all}" in
    all)
        start_all
        echo ""
        log_info "前端启动命令: bash start.sh frontend"
        ;;
    build)
        do_build
        ;;
    rebuild)
        do_rebuild
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
    *)
        echo "用法: bash start.sh [命令]"
        echo ""
        echo "命令:"
        echo "  all                一键启动全部 (默认, 首次自动构建+生成go.sum)"
        echo "  build              仅构建镜像"
        echo "  rebuild            清理缓存后重新构建"
        echo "  infra              仅启动基础设施 (MySQL + Redis)"
        echo "  backend            仅启动后端微服务"
        echo "  frontend           启动前端面板 (localhost:3000)"
        echo "  stop               停止所有服务"
        echo "  status             查看服务状态"
        echo "  logs [服务名]      查看日志"
        echo ""
        echo "端口映射:"
        echo "  MySQL → 3307  |  Redis → 6380"
        echo "  User:9001  Battle:9002  Card:9003  Map:9004"
        echo "  Guild:9005  Payment:9006  Season:9008  Admin:9100"
        ;;
esac
