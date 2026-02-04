#!/bin/bash
# Test script to verify workflow trigger configurations
# This ensures publish.yml only has workflow_dispatch trigger

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🔍 Checking workflow trigger configurations..."

# Check publish.yml has ONLY workflow_dispatch
PUBLISH_FILE="$REPO_ROOT/.github/workflows/publish.yml"

if [ ! -f "$PUBLISH_FILE" ]; then
  echo "❌ ERROR: publish.yml not found at $PUBLISH_FILE"
  exit 1
fi

# Validate YAML syntax
if ! python3 -c "import yaml; yaml.safe_load(open('$PUBLISH_FILE'))" 2>/dev/null; then
  echo "❌ ERROR: publish.yml has invalid YAML syntax"
  exit 1
fi

# Check triggers using Python (handles 'on' as boolean True in YAML)
TRIGGERS=$(python3 -c "
import yaml
with open('$PUBLISH_FILE') as f:
    data = yaml.safe_load(f)
    # 'on' is parsed as boolean True in YAML
    on_section = data.get(True) or data.get('on')
    if on_section and isinstance(on_section, dict):
        print(','.join(on_section.keys()))
")

if [ "$TRIGGERS" != "workflow_dispatch" ]; then
  echo "❌ ERROR: publish.yml has incorrect triggers: $TRIGGERS"
  echo "   Expected: workflow_dispatch (manual only)"
  echo "   Found: $TRIGGERS"
  exit 1
fi

echo "✅ publish.yml trigger configuration is correct (manual only)"

# Verify no 'push' or 'pull_request' triggers in publish.yml
if grep -q "^  push:" "$PUBLISH_FILE" 2>/dev/null; then
  echo "❌ ERROR: publish.yml contains 'push:' trigger (should be manual only)"
  exit 1
fi

if grep -q "^  pull_request:" "$PUBLISH_FILE" 2>/dev/null; then
  echo "❌ ERROR: publish.yml contains 'pull_request:' trigger (should be manual only)"
  exit 1
fi

echo "✅ No automatic triggers found in publish.yml"
echo ""
echo "🎉 All workflow trigger checks passed!"
exit 0
