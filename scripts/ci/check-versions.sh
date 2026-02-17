#!/bin/bash
# Check version consistency across all packages
# Usage: scripts/ci/check-versions.sh
set -e

echo "=== Checking version consistency across all packages ==="

CLI_VERSION=$(node -p "require('./packages/cli/package.json').version")
MCP_VERSION=$(node -p "require('./packages/mcp/package.json').version")
DASHBOARD_VERSION=$(node -p "require('./packages/dashboard/package.json').version")
ROOT_VERSION=$(node -p "require('./package.json').version")

echo "Versions found:"
echo "  Root: $ROOT_VERSION"
echo "  @cybermem/cli: $CLI_VERSION"
echo "  @cybermem/mcp: $MCP_VERSION"
echo "  @cybermem/dashboard: $DASHBOARD_VERSION"

if [ "$CLI_VERSION" != "$MCP_VERSION" ] || [ "$CLI_VERSION" != "$DASHBOARD_VERSION" ]; then
  echo "❌ ERROR: Package versions are inconsistent!"
  echo "All linked packages must have the same version."
  echo "Run 'npm version <version> --workspaces --no-git-tag-version' to sync versions."
  exit 1
fi

echo "✅ All package versions are consistent: $CLI_VERSION"
