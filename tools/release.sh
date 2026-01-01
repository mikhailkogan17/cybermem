#!/bin/bash
set -e

echo "🚀 Preparing release for CyberMem Monorepo..."

# Build packages sequentially to avoid OOM
echo "🏗️ Building Dashboard..."
npm run build -w @cybermem/dashboard

echo "🏗️ Building CLI..."
npm run build -w @cybermem/cli

echo "🏗️ Building MCP..."
npm run build -w @cybermem/mcp

# Packages to publish
PACKAGES=("packages/cli" "packages/mcp" "packages/dashboard")

for PKG in "${PACKAGES[@]}"; do
    echo "📤 Publishing $PKG..."
    cd "$PKG"
    npm publish
    cd - > /dev/null
done

echo "✨ All packages published successfully!"
