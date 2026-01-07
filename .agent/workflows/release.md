---
description: Create a new release - bump version, tag, npm publish, GitHub release
---

# Release Workflow

Creates a new release via GitHub Actions with:
- Version bump (patch by default)
- Git tag
- npm publish (OIDC trusted publishers)
- GitHub release
- Post-release version bump

## Usage

```bash
/release          # Patch release (e.g., 0.2.1 -> 0.2.2)
/release minor    # Minor release (e.g., 0.2.1 -> 0.3.0)
/release major    # Major release (e.g., 0.2.1 -> 1.0.0)
```

## Steps

### 1. Ensure clean working directory
// turbo
```bash
cd /Users/mikhailkogan/cybermem
git status
```
Verify `nothing to commit, working tree clean`.

### 2. Trigger GitHub Actions release workflow
```bash
gh workflow run release.yml --field version_type=${VERSION_TYPE:-patch}
```

### 3. Monitor workflow progress
// turbo
```bash
sleep 10 && gh run list --workflow="release.yml" --limit 1 --json status,conclusion,databaseId
```

### 4. Wait for completion and check result
```bash
gh run view $(gh run list --workflow="release.yml" --limit 1 --json databaseId --jq '.[0].databaseId') --watch
```

### 5. Verify release
// turbo
```bash
npm view @cybermem/mcp-server version
gh release list --limit 1
```

### 6. Pull remote changes (workflow commits version bumps)
// turbo
```bash
git pull
```
