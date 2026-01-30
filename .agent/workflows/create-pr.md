---
description: Create a Pull Request with linked issue and correct author
---
# Create Pull Request

1. Setup Credentials
[Check _credentials]
view_file .agent/workflows/_credentials.md

2. Push Branch
```bash
git push -u origin HEAD
```

3. Create PR
```bash
# Check if gh is installed
if ! command -v gh &> /dev/null; then
    echo "Error: GitHub CLI (gh) is not installed."
    echo "Please install it: brew install gh"
    echo "Or verify credentials manually."
    exit 1
fi

# Usage: /create-pr "Title" "Description"
PR_URL=$(gh pr create --title "$1" --body "$2" --json url --jq '.url')
echo "PR_URL=$PR_URL" >> $GITHUB_OUTPUT
echo "### PR Created: $PR_URL" >> $GITHUB_STEP_SUMMARY
```
