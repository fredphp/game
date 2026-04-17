#!/bin/bash
# ============================================================
# 九州争鼎 - gen-go-sum.sh 预生成所有服务的 go.sum 文件
# 用法: bash gen-go-sum.sh
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

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

echo "╔══════════════════════════════════════════════════╗"
echo "║     预生成所有服务的 go.sum 文件                ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

for item in "${SERVICES[@]}"; do
    SVC="${item%%:*}"
    GO_VER="${item##*:}"

    if [[ -f "$PROJECT_ROOT/$svc/go.sum" ]]; then
        echo "[SKIP] $SVC/go.sum 已存在"
        continue
    fi

    echo "[GEN]  $SVC (Go $GO_VER)..."

    docker run --rm \
        -v "$PROJECT_ROOT/$SVC:/app" \
        -w /app \
        -e GOPROXY=https://goproxy.cn,direct \
        "golang:$GO_VER-alpine" \
        sh -c "apk add --no-cache git && go mod tidy"

    if [[ -f "$PROJECT_ROOT/$SVC/go.sum" ]]; then
        echo "[OK]   $SVC/go.sum 生成成功"
    else
        echo "[FAIL] $SVC/go.sum 生成失败"
    fi
done

echo ""
echo "完成! 现在可以提交 go.sum 文件并重新构建"
