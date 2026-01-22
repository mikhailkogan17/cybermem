#!/bin/bash
# CyberMem Atomic Version Bump Script
# Bumps ALL packages simultaneously to keep them in sync
#
# Usage:
#   ./scripts/version-bump.sh patch   # 0.8.6 -> 0.8.7
#   ./scripts/version-bump.sh minor   # 0.8.6 -> 0.9.0
#   ./scripts/version-bump.sh major   # 0.8.6 -> 1.0.0
#   ./scripts/version-bump.sh 1.0.0   # Set specific version

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PACKAGES=(
    "packages/cli/package.json"
    "packages/mcp/package.json"
    "packages/dashboard/package.json"
)

error() {
    echo -e "${RED}❌ ERROR: $1${NC}"
    exit 1
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check we're in the project root
if [ ! -f "package.json" ] || [ ! -d "packages" ]; then
    error "Must be run from the project root (where package.json and packages/ exist)"
fi

# Get version type or specific version
VERSION_TYPE="${1:-patch}"

# Get current version (from first package)
CURRENT_VERSION=$(grep '"version"' "${PACKAGES[0]}" | head -1 | cut -d'"' -f4)

if [ -z "$CURRENT_VERSION" ]; then
    error "Could not read current version from ${PACKAGES[0]}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  📦 CyberMem Atomic Version Bump"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Current version: v${CURRENT_VERSION}"
echo ""

# Calculate new version
if [[ "$VERSION_TYPE" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    # Specific version provided
    NEW_VERSION="$VERSION_TYPE"
else
    # Semver bump
    IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"

    case "$VERSION_TYPE" in
        major)
            NEW_VERSION="$((MAJOR + 1)).0.0"
            ;;
        minor)
            NEW_VERSION="${MAJOR}.$((MINOR + 1)).0"
            ;;
        patch)
            NEW_VERSION="${MAJOR}.${MINOR}.$((PATCH + 1))"
            ;;
        *)
            error "Invalid version type: $VERSION_TYPE (use: major, minor, patch, or X.Y.Z)"
            ;;
    esac
fi

echo "New version: v${NEW_VERSION}"
echo ""

# Confirm
read -p "Proceed with version bump? [y/N] " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    warn "Aborted"
    exit 0
fi

echo ""
echo "Updating packages..."

# Update all packages atomically
for PKG in "${PACKAGES[@]}"; do
    if [ ! -f "$PKG" ]; then
        error "Package not found: $PKG"
    fi

    # Update version using sed (cross-platform)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" "$PKG"
    else
        sed -i "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" "$PKG"
    fi

    # Verify update
    UPDATED=$(grep '"version"' "$PKG" | head -1 | cut -d'"' -f4)
    if [ "$UPDATED" = "$NEW_VERSION" ]; then
        success "Updated: $PKG → v${NEW_VERSION}"
    else
        error "Failed to update: $PKG (got: $UPDATED)"
    fi
done

# Update root package.json if it exists and has a version field
if [ -f "package.json" ]; then
    ROOT_VERSION=$(grep '"version"' package.json | head -1 | cut -d'"' -f4 2>/dev/null || echo "")
    if [ -n "$ROOT_VERSION" ] && [ "$ROOT_VERSION" = "$CURRENT_VERSION" ]; then
        if [[ "$OSTYPE" == "darwin"* ]]; then
            sed -i '' "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" package.json
        else
            sed -i "s/\"version\": \"${CURRENT_VERSION}\"/\"version\": \"${NEW_VERSION}\"/" package.json
        fi
        success "Updated: package.json → v${NEW_VERSION}"
    fi
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo -e "${GREEN}  ✅ All packages updated to v${NEW_VERSION}${NC}"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo "  1. git add -A"
echo "  2. git commit -m 'chore: bump version to v${NEW_VERSION}'"
echo "  3. git tag -a v${NEW_VERSION} -m 'v${NEW_VERSION}'"
echo "  4. git push origin main --tags"
echo ""
