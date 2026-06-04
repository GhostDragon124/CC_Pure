#!/usr/bin/env bash
# scripts/pack-npm.sh — 构建 + 打包为 npm .tgz 离线安装包
set -e

echo "=== 1. 构建 ==="
bun run build --no-splitting

echo "=== 2. 准备打包目录 ==="
VERSION=$(node -p "require('./package.json').version")
PACK_DIR="/tmp/ccp-pack"
rm -rf "$PACK_DIR"
mkdir -p "$PACK_DIR/bin"

echo "=== 3. 复制产物 ==="
cp dist-nosplit/cli.js "$PACK_DIR/cli.js"
chmod +x "$PACK_DIR/cli.js"

echo "=== 4. 创建 bin 入口 ==="
cat > "$PACK_DIR/bin/ccp" << 'BINEOF'
#!/usr/bin/env bash
# ccp — CC Pure CLI wrapper
# Requires: bun (https://bun.sh)
DIR="$(cd "$(dirname "$0")/.." && pwd)"
exec bun "$DIR/cli.js" "$@"
BINEOF
chmod +x "$PACK_DIR/bin/ccp"

echo "=== 5. 生成 package.json ==="
cat > "$PACK_DIR/package.json" << PKGEOF
{
  "name": "ccp",
  "version": "$VERSION",
  "description": "CC Pure — 纯净版 Claude Code CLI",
  "license": "UNLICENSED",
  "private": true,
  "bin": {
    "ccp": "./bin/ccp"
  },
  "engines": {
    "bun": ">=1.3.0"
  },
  "files": [
    "cli.js",
    "bin/"
  ]
}
PKGEOF

echo "=== 6. 打包 ==="
TARBALL="ccp-${VERSION}.tgz"
(cd "$PACK_DIR" && npm pack --pack-destination /tmp)
mv "/tmp/$TARBALL" "./$TARBALL"

echo ""
echo "✅ 完成: $(pwd)/$TARBALL ($(du -h ./$TARBALL | cut -f1))"
echo ""
echo "安装方式（目标机器需要 Bun）:"
echo "  npm install -g ./$TARBALL"
echo "  ccp --version"
