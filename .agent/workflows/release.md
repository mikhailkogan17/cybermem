---
description: Create a new release - bump version, tag, npm publish, GitHub release
---

# Release Workflow

// turbo-all

> [!IMPORTANT]
> This workflow triggers GitHub Actions to bump versions, publish to npm, and create a GitHub release.

---

## Prerequisites

- Clean working directory
- All tests passing locally (`npm run test:e2e`)
- Pre-commit hook passed (`./.hooks/pre-commit`)

---

## Step 1: Ensure Clean State

```bash
cd /Users/mikhailkogan/cybermem
git status
```

**Must show:** `nothing to commit, working tree clean`

## Step 2: Trigger Release

```bash
# Patch release (0.7.6 → 0.7.7)
gh workflow run release.yml --field version_type=patch

# Minor release (0.7.6 → 0.8.0)
gh workflow run release.yml --field version_type=minor

# Major release (0.7.6 → 1.0.0)
gh workflow run release.yml --field version_type=major
```

## Step 3: Monitor Progress

```bash
gh run list --workflow="release.yml" --limit 1
gh run view $(gh run list --workflow="release.yml" --limit 1 --json databaseId --jq '.[0].databaseId') --watch
```

## Step 4: Verify Release

```bash
# Check npm versions
npm view @cybermem/mcp version
npm view @cybermem/cli version

# Check GitHub release
gh release list --limit 1

# Pull version bump commits
git pull
```

## Step 5: Deploy to RPi (Ansible-First)

```bash
# Deploy using modern registry-based playbook
cd packages/cli/templates/ansible
ansible-playbook -i inventory/hosts.ini playbooks/deploy-cybermem.yml
```

**Ansible does:**
- Verifies hardware state
- Pulls images from GHCR
- Restarts containers
- **Waits for health checks** (Traefik + Dashboard version check)

---

## What Release Does

1. Runs E2E tests in CI
2. Bumps version in cli, mcp, dashboard packages
3. Builds all packages
4. Commits version bump
5. Creates git tag (v0.7.7)
6. Publishes to npm (OIDC trusted publishers)
7. Creates GitHub release with notes
8. Bumps to next dev version (0.7.8)

---

## Troubleshooting

| Issue              | Fix                                                                |
| ------------------ | ------------------------------------------------------------------ |
| E2E fails in CI    | Check dashboard E2E tests locally first                            |
| npm publish fails  | Verify OIDC setup in npm account                                   |
| Tag already exists | Delete tag: `git tag -d v0.x.x && git push --delete origin v0.x.x` |
