#!/bin/bash
set -e

echo "🚀 Preparing release for CyberMem Monorepo..."

# Build all packages from root
npm install
npm run build

# Packages to publish
PACKAGES=("packages/cli" "packages/mcp" "packages/dashboard")

for PKG in "${PACKAGES[@]}"; do
    echo "📤 Publishing $PKG..."
    cd "$PKG"
    npm publish
    cd - > /dev/null
done

echo "✨ All packages published successfully!"
