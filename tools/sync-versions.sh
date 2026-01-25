#!/bin/bash
# CyberMem Version Sync Script
# Syncs all subpackages to the version defined in the root package.json

set -e

# Get root version
VERSION=$(grep '"version"' package.json | head -1 | cut -d'"' -f4)

echo "🚀 Syncing all packages to Global Version: v$VERSION..."

# List of targets
TARGETS=(
    "packages/cli/package.json"
    "packages/mcp/package.json"
    "packages/dashboard/package.json"
)

for TARGET in "${TARGETS[@]}"; do
    if [ -f "$TARGET" ]; then
        # Use sed to replace the version line
        # Mac-compatible sed syntax (-i '')
        sed -i '' "s/\"version\": \".*\"/\"version\": \"$VERSION\"/" "$TARGET"
        echo "  ✅ Updated $TARGET"
    else
        echo "  ⚠️  Skipped $TARGET (not found)"
    fi
done

echo "✨ All versions synchronized."
