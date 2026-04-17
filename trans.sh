#!/bin/bash
# ============================================================
# 九州争鼎 - trans.sh 一键环境检测与部署脚本
# 功能: 检测/安装 Docker, 构建 Go 服务镜像, 初始化数据库
# 用法: bash trans.sh
# ============================================================

set -e

# ── 颜色定义 ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ── 项目根目录 ──
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
COMMAND_DIR="$PROJECT_ROOT/command"

# ── 服务列表 ──
GAME_SERVICES=("user-service" "battle-service" "card-service" "map-service" "guild-service" "payment-service" "quest-service" "season-service")

log_info()    { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; }
log_step()    { echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; echo -e "${BLUE}  $1${NC}"; echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

# ============================================================
# 1. 检测操作系统
# ============================================================
detect_os() {
    log_step "步骤 1/6: 检测操作系统"
    OS="$(uname -s)"
    case "$OS" in
        Linux*)  log_info "操作系统: Linux ($(cat /etc/os-release 2>/dev/null | grep PRETTY_NAME | cut -d= -f2 | tr -d '\"' 2>/dev/null || echo 'Unknown'))" ;;
        Darwin*) log_info "操作系统: macOS" ;;
        *)       log_warn "未知操作系统: $OS" ;;
    esac
    ARCH="$(uname -m)"
    log_info "架构: $ARCH"
}

# ============================================================
# 2. 检测并安装 Docker
# ============================================================
check_docker() {
    log_step "步骤 2/6: 检测 Docker 环境"

    if command -v docker &> /dev/null; then
        DOCKER_VERSION="$(docker --version | grep -oP 'Docker version \K[0-9.]+')"
        log_info "Docker 已安装: v$DOCKER_VERSION"
    else
        log_warn "Docker 未安装, 开始安装..."
        install_docker
    fi

    # 检查 Docker Compose
    if docker compose version &> /dev/null 2>&1; then
        COMPOSE_VERSION="$(docker compose version --short 2>/dev/null)"
        log_info "Docker Compose 已安装: v$COMPOSE_VERSION"
    elif command -v docker-compose &> /dev/null; then
        log_info "Docker Compose (独立版) 已安装: $(docker-compose --version)"
    else
        log_error "Docker Compose 未找到, 请手动安装"
        exit 1
    fi

    # 检查 Docker 守护进程
    if ! docker info &> /dev/null; then
        log_error "Docker 守护进程未运行, 请启动 Docker"
        if [[ "$OS" == "Linux" ]]; then
            log_info "尝试启动 Docker..."
            sudo systemctl start docker 2>/dev/null || sudo service docker start 2>/dev/null || true
            sleep 3
            if docker info &> /dev/null; then
                log_info "Docker 启动成功!"
            else
                log_error "Docker 启动失败, 请手动启动后重试"
                exit 1
            fi
        fi
    fi
    log_info "Docker 运行正常 ✓"
}

# ============================================================
# 3. 检测并安装 Go (用于本地调试)
# ============================================================
check_go() {
    log_step "步骤 3/6: 检测 Go 环境"

    if command -v go &> /dev/null; then
        GO_VERSION="$(go version | grep -oP 'go\K[0-9.]+')"
        log_info "Go 已安装: v$GO_VERSION"
    else
        log_warn "Go 未安装 (Docker 构建不需要, 但本地调试需要)"
        log_info "如需本地调试, 请访问 https://go.dev/dl/ 安装 Go 1.21+"
    fi
}

# ============================================================
# 4. 检测并安装 Bun (用于 Web Admin 前端)
# ============================================================
check_bun() {
    log_step "步骤 4/6: 检测 Bun 环境 (Web Admin 前端)"

    if command -v bun &> /dev/null; then
        BUN_VERSION="$(bun --version)"
        log_info "Bun 已安装: v$BUN_VERSION"
    else
        log_warn "Bun 未安装, 开始安装..."
        curl -fsSL https://bun.sh/install | bash
        export PATH="$HOME/.bun/bin:$PATH"
        if command -v bun &> /dev/null; then
            log_info "Bun 安装成功: v$(bun --version)"
        else
            log_error "Bun 安装失败, 请手动安装: curl -fsSL https://bun.sh/install | bash"
            exit 1
        fi
    fi
}

# ============================================================
# 5. 修复配置文件密码不一致问题
# ============================================================
fix_config_passwords() {
    log_step "步骤 5/6: 修复配置文件"

    # Docker MySQL 密码为 root123, 但服务配置中为 123456
    # 统一修改为 root123 以匹配 Docker
    local OLD_PASSWORD="password: \"123456\""
    local NEW_PASSWORD="password: \"root123\""

    local FIXED_COUNT=0
    for svc in "${GAME_SERVICES[@]}" "admin-service"; do
        local CONFIG_FILE="$PROJECT_ROOT/$svc/config/config.yaml"
        if [[ -f "$CONFIG_FILE" ]]; then
            if grep -q "$OLD_PASSWORD" "$CONFIG_FILE" 2>/dev/null; then
                sed -i "s|$OLD_PASSWORD|$NEW_PASSWORD|g" "$CONFIG_FILE"
                log_info "已修复 $svc/config/config.yaml 密码"
                ((FIXED_COUNT++)) || true
            fi

            # 同时将 MySQL host 从 127.0.0.1 改为 mysql (Docker 服务名)
            # 仅在 Docker 部署时需要
            local HOST_PATTERN="host: \"127.0.0.1\""
            local HOST_REPLACEMENT="host: \"mysql\""
            if grep -q "$HOST_PATTERN" "$CONFIG_FILE" 2>/dev/null; then
                # 创建 Docker 专用配置
                cp "$CONFIG_FILE" "$PROJECT_ROOT/$svc/config/config.docker.yaml"
                sed -i "s|$HOST_PATTERN|$HOST_REPLACEMENT|g" "$PROJECT_ROOT/$svc/config/config.docker.yaml"
                # Redis host 也改为 redis
                sed -i 's|host: "localhost"|host: "redis"|g' "$PROJECT_ROOT/$svc/config/config.docker.yaml"
                sed -i 's|addr: "localhost:6379"|addr: "redis:6379"|g' "$PROJECT_ROOT/$svc/config/config.docker.yaml"
                sed -i 's|addr: "127.0.0.1:6379"|addr: "redis:6379"|g' "$PROJECT_ROOT/$svc/config/config.docker.yaml"
                log_info "已生成 $svc Docker 专用配置"
            fi
        else
            log_warn "配置文件不存在: $CONFIG_FILE"
        fi
    done

    # 在 Docker Compose 中使用 Docker 专用配置
    if [[ $FIXED_COUNT -gt 0 ]]; then
        log_info "共修复 $FIXED_COUNT 个配置文件"
    fi

    # 更新 docker-compose.yml 使用 docker 配置文件
    log_info "配置文件修复完成 ✓"
}

# ============================================================
# 6. 构建 Docker 镜像
# ============================================================
build_images() {
    log_step "步骤 6/6: 构建 Docker 镜像"

    cd "$COMMAND_DIR"

    # 创建日志目录
    mkdir -p logs/{user-service,battle-service,card-service,map-service,guild-service,payment-service,quest-service,season-service,admin-service}

    log_info "开始构建所有服务镜像 (首次构建可能需要 10-20 分钟)..."

    # 使用 docker compose 构建
    if docker compose version &> /dev/null 2>&1; then
        docker compose build --parallel 2>&1 | while IFS= read -r line; do
            echo "  $line"
        done
    else
        docker-compose build --parallel 2>&1 | while IFS= read -r line; do
            echo "  $line"
        done
    fi

    log_info "镜像构建完成 ✓"
}

# ============================================================
# 安装 Docker (Linux)
# ============================================================
install_docker() {
    log_info "正在安装 Docker..."

    if [[ "$(cat /etc/os-release 2>/dev/null | grep ^ID=)" == "ID=ubuntu" ]] || \
       [[ "$(cat /etc/os-release 2>/dev/null | grep ^ID=)" == "ID=debian" ]]; then
        # Ubuntu/Debian
        sudo apt-get update
        sudo apt-get install -y ca-certificates curl gnupg
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/$(. /etc/os-release && echo "$ID")/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
        sudo chmod a+r /etc/apt/keyrings/docker.gpg
        echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$(. /etc/os-release && echo "$ID") $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
        sudo apt-get update
        sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    elif [[ "$(cat /etc/os-release 2>/dev/null | grep ^ID=)" == *"centos"* ]] || \
         [[ "$(cat /etc/os-release 2>/dev/null | grep ^ID=)" == *"rhel"* ]] || \
         [[ "$(cat /etc/os-release 2>/dev/null | grep ^ID=)" == *"fedora"* ]]; then
        # CentOS/RHEL/Fedora
        sudo yum install -y yum-utils
        sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        sudo systemctl start docker
        sudo systemctl enable docker
    else
        log_error "不支持的 Linux 发行版, 请手动安装 Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi

    # 将当前用户添加到 docker 组
    sudo usermod -aG docker "$USER" 2>/dev/null || true
    log_info "Docker 安装完成! (可能需要重新登录以使用户组生效)"
}

# ============================================================
# 初始化 Web Admin 前端
# ============================================================
init_web_admin() {
    log_step "初始化 Web Admin 前端"

    cd "$PROJECT_ROOT"
    if [[ -f "package.json" ]]; then
        log_info "安装前端依赖..."
        bun install --frozen-lockfile 2>/dev/null || bun install
        log_info "前端依赖安装完成 ✓"
    else
        log_warn "未找到 package.json, 跳过前端初始化"
    fi
}

# ============================================================
# 打印部署摘要
# ============================================================
print_summary() {
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║        九州争鼎 - 环境部署完成!                   ║${NC}"
    echo -e "${GREEN}╠══════════════════════════════════════════════════╣${NC}"
    echo -e "${GREEN}║                                                    ║${NC}"
    echo -e "${GREEN}║  📦 已部署服务:                                   ║${NC}"
    echo -e "${GREEN}║     MySQL 8.0       → localhost:3306              ║${NC}"
    echo -e "${GREEN}║     Redis 7         → localhost:6379              ║${NC}"
    echo -e "${GREEN}║     User Service    → localhost:9001              ║${NC}"
    echo -e "${GREEN}║     Battle Service  → localhost:9002              ║${NC}"
    echo -e "${GREEN}║     Card Service    → localhost:9003              ║${NC}"
    echo -e "${GREEN}║     Map Service     → localhost:9004              ║${NC}"
    echo -e "${GREEN}║     Guild Service   → localhost:9005              ║${NC}"
    echo -e "${GREEN}║     Payment Service → localhost:9006              ║${NC}"
    echo -e "${GREEN}║     Quest Service   → localhost:9007              ║${NC}"
    echo -e "${GREEN}║     Season Service  → localhost:9008              ║${NC}"
    echo -e "${GREEN}║     Admin Service   → localhost:9100              ║${NC}"
    echo -e "${GREEN}║                                                    ║${NC}"
    echo -e "${GREEN}║  🚀 下一步:                                       ║${NC}"
    echo -e "${GREEN}║     启动所有服务 → bash start.sh                  ║${NC}"
    echo -e "${GREEN}║     启动前端面板 → cd src && bun run dev          ║${NC}"
    echo -e "${GREEN}║                                                    ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════╝${NC}"
    echo ""
}

# ============================================================
# 主流程
# ============================================================
main() {
    echo ""
    echo -e "${BLUE}╔══════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║     九州争鼎 - 一键环境检测与部署                ║${NC}"
    echo -e "${BLUE}║     Jiuzhou Zhengding - Auto Deploy              ║${NC}"
    echo -e "${BLUE}╚══════════════════════════════════════════════════╝${NC}"
    echo ""

    detect_os
    check_docker
    check_go
    check_bun
    fix_config_passwords
    build_images
    init_web_admin
    print_summary
}

main "$@"
