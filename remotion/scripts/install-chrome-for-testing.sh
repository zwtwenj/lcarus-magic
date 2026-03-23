#!/usr/bin/env bash
# 将已上传的 chrome-linux64.zip 解压到 Remotion 缓存目录，避免运行时从 Google 下载。
#
# 用法：
#   1) 把 chrome-linux64.zip 放到项目根目录（即本脚本所在目录的上一级），然后：
#      ./scripts/install-chrome-for-testing.sh
#   2) 或指定 zip 路径：
#      ./scripts/install-chrome-for-testing.sh /path/to/chrome-linux64.zip

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# Remotion 当前期望的 Chrome for Testing 版本（与 get-chrome-download-url.js 中 TESTED_VERSION 一致）
CHROME_VERSION="144.0.7559.20"
CACHE_DIR="$PROJECT_ROOT/node_modules/.remotion/chrome-for-testing"

if [ -n "$1" ]; then
    ZIP_PATH="$1"
    # 若为相对路径，转为绝对路径，避免受当前工作目录影响
    if [[ "$ZIP_PATH" != /* ]]; then
        ZIP_PATH="$(cd "$(dirname "$ZIP_PATH")" 2>/dev/null && pwd)/$(basename "$ZIP_PATH")"
    fi
else
    # 默认：项目根目录下的 chrome-linux64.zip（例如 /home/liuruxing/ecs/nvm/server/chrome-linux64.zip）
    ZIP_PATH="$PROJECT_ROOT/chrome-linux64.zip"
fi

echo "项目根目录: $PROJECT_ROOT"
if [ ! -f "$ZIP_PATH" ]; then
    echo "错误: 未找到 $ZIP_PATH"
    echo "请从能访问 Google 的机器下载："
    echo "  https://storage.googleapis.com/chrome-for-testing-public/${CHROME_VERSION}/linux64/chrome-linux64.zip"
    echo "上传到服务器后任选一种方式执行："
    echo "  • 上传到项目根目录后执行: $0"
    echo "    即: $PROJECT_ROOT/chrome-linux64.zip"
    echo "  • 上传到任意位置后执行:   $0 /你上传的路径/chrome-linux64.zip"
    exit 1
fi

echo "使用 zip: $ZIP_PATH"
echo "缓存目录: $CACHE_DIR"
mkdir -p "$CACHE_DIR/linux64"
unzip -o "$ZIP_PATH" -d "$CACHE_DIR/linux64"
echo -n "$CHROME_VERSION" > "$CACHE_DIR/VERSION"
chmod +x "$CACHE_DIR/linux64/chrome-linux64/chrome"
echo "完成。Chrome for Testing 已安装到 $CACHE_DIR，版本 $CHROME_VERSION"
