#!/bin/bash
# Validate .changeset/config.json for CI
# Usage: scripts/ci/validate-changeset.sh
set -eo pipefail

# Ensure jq is installed before proceeding
if ! command -v jq > /dev/null 2>&1; then
  echo "❌ ERROR: jq is required but not installed. Please install jq to run this script."
  exit 1
fi

echo "=== Validating .changeset/config.json ==="
if [ ! -f .changeset/config.json ]; then
  echo "❌ ERROR: .changeset/config.json not found"
  exit 1
fi

# Validate JSON syntax
if ! jq empty .changeset/config.json 2>/dev/null; then
  echo "❌ ERROR: Invalid JSON in .changeset/config.json"
  exit 1
fi

# Validate required fields
REPO=$(jq -r '.changelog[1].repo // empty' .changeset/config.json)
if [ -z "$REPO" ]; then
  echo "❌ ERROR: changelog.repo is required in .changeset/config.json"
  exit 1
fi

# Validate linked packages match workspace packages (no subshell — use for loop)
LINKED_PACKAGES=$(jq -r '.linked[0][]' .changeset/config.json 2>/dev/null || echo "")
if [ -z "$LINKED_PACKAGES" ]; then
  echo "⚠️  WARNING: No linked packages configured"
else
  echo "✅ Linked packages:"
  for pkg in $LINKED_PACKAGES; do
    echo "  - $pkg"
    PKG_NAME=$(echo "$pkg" | sed 's/@cybermem\///')
    if [ ! -d "packages/$PKG_NAME" ]; then
      echo "❌ ERROR: Linked package $pkg does not exist in workspace"
      exit 1
    fi
  done
fi

echo "✅ Changeset configuration is valid"
