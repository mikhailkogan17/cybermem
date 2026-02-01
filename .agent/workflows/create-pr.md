---
description: Create a Pull Request via CI (Agent-PR)
---

1. Setup Credentials
[Check _credentials]
view_file .agent/workflows/_credentials.md

2. Push Branch
```bash
git push -u origin HEAD
```

3. Trigger Agent-PR Workflow
```bash
# Get current branch
BRANCH=$(git branch --show-current)

# Usage: /create-pr "Title" "Description"
TITLE="$1"
DESCRIPTION="$2"

if [ -z "$TITLE" ]; then
  TITLE="feat: $BRANCH"
fi

if [ -z "$DESCRIPTION" ]; then
  DESCRIPTION="Auto-generated PR for $BRANCH"
fi

echo "🚀 Triggering Agent-PR Workflow..."
gh workflow run agent-pr.yml \
  -f head_branch="$BRANCH" \
  -f base_branch="main" \
  -f title="$TITLE" \
  -f description="$DESCRIPTION"

echo "✅ Workflow triggered. Check 'Actions' tab for progress."
echo "🔗 https://github.com/mikhailkogan17/cybermem/actions/workflows/agent-pr.yml"
```
