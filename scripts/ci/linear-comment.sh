#!/bin/bash
# Comment on Linear issues with deployed version
# Usage: scripts/ci/linear-comment.sh <version> "<issues>" <run_url>
# Requires: LINEAR_API_KEY env var
set -e

if ! command -v jq > /dev/null 2>&1; then
  echo "❌ jq is required but not installed. Please install jq to use this script."
  exit 1
fi

VERSION="${1:?Usage: $0 <version> <issues> <run_url>}"
ISSUES="${2:?Usage: $0 <version> <issues> <run_url>}"
RUN_URL="${3:?Usage: $0 <version> <issues> <run_url>}"

if [ -z "$LINEAR_API_KEY" ]; then
  echo "⚠️ LINEAR_API_KEY not set, skipping Linear sync"
  exit 0
fi

COMMENT_BODY="🚀 **Deployed in v${VERSION}**\n\n- NPM: [@cybermem/cli@${VERSION}](https://www.npmjs.com/package/@cybermem/cli/v/${VERSION})\n- [GitHub Actions Run](${RUN_URL})"

# Note: Iterating over space-separated ISSUES by design (Linear issue IDs cannot contain spaces)
for ISSUE_ID in $ISSUES; do
  echo "📝 Commenting on $ISSUE_ID..."

  # Get the issue UUID from identifier (using jq for safe payload construction)
  ISSUE_UUID=$(jq -n --arg num "${ISSUE_ID#CM-}" \
    '{query: "query { issueSearch(filter: { number: { eq: \($num | tonumber) } }, first: 1) { nodes { id identifier } } }"}' | \
    curl -s -X POST https://api.linear.app/graphql \
      -H "Content-Type: application/json" \
      -H "Authorization: $LINEAR_API_KEY" \
      -d @- | \
    jq -r '.data.issueSearch.nodes[0].id // empty')

  if [ -z "$ISSUE_UUID" ]; then
    echo "⚠️ Could not find $ISSUE_ID in Linear, skipping"
    continue
  fi

  # Add comment (using jq for safe GraphQL mutation construction)
  RESULT=$(jq -n --arg issueId "$ISSUE_UUID" --arg body "$COMMENT_BODY" \
    '{query: "mutation { commentCreate(input: { issueId: \($issueId), body: \($body) }) { success } }"}' | \
    curl -s -X POST https://api.linear.app/graphql \
      -H "Content-Type: application/json" \
      -H "Authorization: $LINEAR_API_KEY" \
      -d @-)

  if echo "$RESULT" | jq -e '.data.commentCreate.success' > /dev/null 2>&1; then
    echo "✅ Commented on $ISSUE_ID"
  else
    echo "⚠️ Failed to comment on $ISSUE_ID: $RESULT"
  fi
done

echo "✅ Linear sync complete for v$VERSION"
