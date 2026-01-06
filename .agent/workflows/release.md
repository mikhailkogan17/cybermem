---
description: Create a new release - bump version, tag, npm publish, GitHub release
---

# Release Workflow

Creates a new release with:
- Version bump (patch by default)
- Git tag
- npm publish
- GitHub release
- Post-release version bump with commit

## Usage

```bash
/release          # Patch release (e.g., 0.2.1 -> 0.2.2)
/release minor    # Minor release (e.g., 0.2.1 -> 0.3.0)
/release major    # Major release (e.g., 0.2.1 -> 1.0.0)
```

## Steps

### 1. Ensure clean working directory
```bash
cd /Users/mikhailkogan/cybermem
git status
```
Verify no uncommitted changes.

### 2. Bump version in packages/mcp
// turbo
```bash
cd packages/mcp && npm version ${VERSION_TYPE:-patch} --no-git-tag-version
```

### 3. Build the package
// turbo
```bash
npm run build 2>/dev/null || echo "No build step"
```

### 4. Get the new version
// turbo
```bash
NEW_VERSION=$(node -p "require('./package.json').version")
echo "New version: $NEW_VERSION"
```

### 5. Commit version bump
```bash
cd /Users/mikhailkogan/cybermem
git add packages/mcp/package.json packages/mcp/dist/
git commit -m "release: @cybermem/mcp-server v$NEW_VERSION"
```

### 6. Create git tag
```bash
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION"
```

### 7. Push commit and tag
```bash
git push && git push --tags
```

### 8. Publish to npm
```bash
cd packages/mcp && npm publish --access public
```

### 9. Create GitHub release
```bash
cd /Users/mikhailkogan/cybermem
gh release create "v$NEW_VERSION" --title "v$NEW_VERSION" --generate-notes
```

### 10. Post-release: Bump to next dev version
// turbo
```bash
cd packages/mcp && npm version patch --no-git-tag-version
NEXT_VERSION=$(node -p "require('./package.json').version")
```

### 11. Commit next dev version
```bash
cd /Users/mikhailkogan/cybermem
git add packages/mcp/package.json
git commit -m "chore: bump to v$NEXT_VERSION for development"
git push
```

### 12. Verify
// turbo
```bash
npm view @cybermem/mcp-server version
gh release list --limit 1
```
