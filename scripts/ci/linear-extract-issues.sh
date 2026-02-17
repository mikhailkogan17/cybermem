#!/bin/bash
# Extract Linear issue IDs from git commits since last release tag
# Usage: scripts/ci/linear-extract-issues.sh <version>
# Output: Sets GITHUB_OUTPUT variables: version, issues
set -e

VERSION="${1:?Usage: $0 <version>}"
echo "version=$VERSION" >> $GITHUB_OUTPUT

LAST_TAG=$(git tag --sort=-creatordate | grep -E '^v[0-9]' | head -2 | tail -1)
if [ -z "$LAST_TAG" ]; then
  echo "⚠️ No previous tag found, scanning last 50 commits"
  COMMIT_RANGE="HEAD~50..HEAD"
else
  echo "📋 Scanning commits since $LAST_TAG"
  COMMIT_RANGE="${LAST_TAG}..HEAD"
fi

ISSUES=$(git log "$COMMIT_RANGE" --pretty=format:"%s %D" 2>/dev/null | grep -oE 'CM-[0-9]+' | sort -u | tr '\n' ' ')

if [ -z "$ISSUES" ]; then
  echo "ℹ️ No Linear issues found in commits"
  echo "issues=" >> $GITHUB_OUTPUT
  exit 0
fi

echo "📝 Found Linear issues: $ISSUES"
echo "issues=$ISSUES" >> $GITHUB_OUTPUT
