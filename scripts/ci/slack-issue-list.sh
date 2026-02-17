#!/bin/bash
# Send Slack notification with linked Linear issues
# Usage: scripts/ci/slack-issue-list.sh <version> "<issues>"
# Requires: SLACK_WEBHOOK env var
set -e

VERSION="${1:?Usage: $0 <version> <issues>}"
ISSUES="${2:?Usage: $0 <version> <issues>}"

if [ -z "$SLACK_WEBHOOK" ]; then
  echo "⚠️ SLACK_WEBHOOK not set, skipping"
  exit 0
fi

# Build issue list for Slack
ISSUE_LIST=""
for ISSUE_ID in $ISSUES; do
  ISSUE_LIST="${ISSUE_LIST}\n• <https://linear.app/cybermem/issue/${ISSUE_ID}|${ISSUE_ID}>"
done

cat <<EOF > /tmp/slack-issues-payload.json
{
  "text": "📋 CyberMem v${VERSION} — Linear Issues",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "📋 CyberMem v${VERSION} — Linked Issues"
      }
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Issues included in this release:*${ISSUE_LIST}"
      }
    }
  ]
}
EOF
curl -X POST -H 'Content-type: application/json' --data @/tmp/slack-issues-payload.json $SLACK_WEBHOOK || true
