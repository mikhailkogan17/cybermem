#!/bin/bash
# NPM publish dry-run to validate package structure
# Usage: scripts/ci/npm-dry-run.sh
set -eo pipefail

echo "=== Running npm publish dry-run ==="

npm run build --workspaces

if npm publish --workspaces --access public --dry-run 2>&1 | tee /tmp/publish-dry-run.log; then
  echo "✅ Dry-run publish successful for all packages"
else
  if grep -q "cannot publish over the previously published versions" /tmp/publish-dry-run.log; then
    echo "⚠️  Current version already published"
    echo "The publish workflow will auto-bump the version if needed"
    echo "✅ Package structure validation passed"
  else
    echo "❌ Dry-run publish failed with unexpected error"
    cat /tmp/publish-dry-run.log
    exit 1
  fi
fi
