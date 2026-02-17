#!/bin/bash
# Validation script to run pre-merge checks locally
# This script mimics what the CI pr-validation job will do

set -e

echo "=================================================="
echo "    CyberMem Pre-Merge Validation Suite"
echo "=================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track overall status
VALIDATION_PASSED=true

# 1. Validate Changeset Configuration
echo "=== 1/3: Validating Changeset Configuration ==="
if [ ! -f .changeset/config.json ]; then
  echo -e "${RED}❌ ERROR: .changeset/config.json not found${NC}"
  VALIDATION_PASSED=false
else
  # Validate JSON syntax
  if ! jq empty .changeset/config.json 2>/dev/null; then
    echo -e "${RED}❌ ERROR: Invalid JSON in .changeset/config.json${NC}"
    VALIDATION_PASSED=false
  else
    # Validate required fields
    REPO=$(jq -r '.changelog[1].repo // empty' .changeset/config.json)
    if [ -z "$REPO" ]; then
      echo -e "${RED}❌ ERROR: changelog.repo is required in .changeset/config.json${NC}"
      VALIDATION_PASSED=false
    else
      echo -e "${GREEN}✅ Changeset repository configured: $REPO${NC}"
    fi
    
    # Validate linked packages match workspace packages
    LINKED_PACKAGES=$(jq -r '.linked[0][]' .changeset/config.json 2>/dev/null || echo "")
    if [ -z "$LINKED_PACKAGES" ]; then
      echo -e "${YELLOW}⚠️  WARNING: No linked packages configured${NC}"
    else
      echo -e "${GREEN}✅ Linked packages found:${NC}"
      echo "$LINKED_PACKAGES" | while read pkg; do
        echo "  - $pkg"
        PKG_NAME=$(echo "$pkg" | sed 's/@cybermem\///')
        if [ ! -d "packages/$PKG_NAME" ]; then
          echo -e "${RED}❌ ERROR: Linked package $pkg does not exist in workspace${NC}"
          VALIDATION_PASSED=false
          exit 1
        fi
      done
    fi
    
    if [ "$VALIDATION_PASSED" = true ]; then
      echo -e "${GREEN}✅ Changeset configuration is valid${NC}"
    fi
  fi
fi
echo ""

# 2. Version Consistency Check
echo "=== 2/3: Version Consistency Check ==="
CLI_VERSION=$(node -p "require('./packages/cli/package.json').version")
MCP_VERSION=$(node -p "require('./packages/mcp/package.json').version")
DASHBOARD_VERSION=$(node -p "require('./packages/dashboard/package.json').version")
ROOT_VERSION=$(node -p "require('./package.json').version")

echo "Versions found:"
echo "  Root: $ROOT_VERSION"
echo "  @cybermem/cli: $CLI_VERSION"
echo "  @cybermem/mcp: $MCP_VERSION"
echo "  @cybermem/dashboard: $DASHBOARD_VERSION"

# All workspace packages should have the same version (linked packages)
if [ "$CLI_VERSION" != "$MCP_VERSION" ] || [ "$CLI_VERSION" != "$DASHBOARD_VERSION" ]; then
  echo -e "${RED}❌ ERROR: Package versions are inconsistent!${NC}"
  echo "All linked packages must have the same version."
  echo "Run 'npm version <version> --workspaces --no-git-tag-version' to sync versions."
  VALIDATION_PASSED=false
else
  echo -e "${GREEN}✅ All package versions are consistent: $CLI_VERSION${NC}"
fi
echo ""

# 3. NPM Publish Dry-Run
echo "=== 3/3: NPM Publish Dry-Run ==="
echo "Building packages..."

# Build CLI and MCP (skip dashboard if it fails due to font fetch)
if npm run build -w packages/cli -w packages/mcp > /tmp/build.log 2>&1; then
  echo -e "${GREEN}✅ Packages built successfully${NC}"
  
  echo "Running npm publish dry-run..."
  if npm publish --workspaces --access public --dry-run > /tmp/publish-dry-run.log 2>&1; then
    echo -e "${GREEN}✅ Dry-run publish successful for all packages${NC}"
    echo ""
    echo "Summary of packages to publish:"
    grep -E "npm notice (package|name|version)" /tmp/publish-dry-run.log || true
  else
    # Check if the error is due to version already published (expected in local dev)
    if grep -q "cannot publish over the previously published versions" /tmp/publish-dry-run.log; then
      echo -e "${YELLOW}⚠️  Current version already published (expected in local dev)${NC}"
      echo "In CI, the publish workflow will auto-bump the version."
      echo -e "${GREEN}✅ Package structure is valid${NC}"
    else
      echo -e "${RED}❌ ERROR: Dry-run publish failed${NC}"
      echo "See /tmp/publish-dry-run.log for details"
      tail -20 /tmp/publish-dry-run.log
      VALIDATION_PASSED=false
    fi
  fi
else
  echo -e "${RED}❌ ERROR: Build failed${NC}"
  echo "See /tmp/build.log for details"
  tail -20 /tmp/build.log
  VALIDATION_PASSED=false
fi
echo ""

# Final status
echo "=================================================="
if [ "$VALIDATION_PASSED" = true ]; then
  echo -e "${GREEN}✅ ALL VALIDATIONS PASSED${NC}"
  echo "=================================================="
  exit 0
else
  echo -e "${RED}❌ VALIDATION FAILED${NC}"
  echo "Please fix the issues above before pushing."
  echo "=================================================="
  exit 1
fi
