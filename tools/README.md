# Testing & Validation Tools

This directory contains tools for testing, validation, and quality assurance.

## Available Tools

### Kubernetes Testing

- **test-k8s.sh** - Automated k3d verification
  ```bash
  ./tools/test-k8s.sh
  ```
  - Creates temporary k3d cluster
  - Deploys CyberMem via Helm
  - Validates deployment
  - Auto-cleanup on exit

### SSH Utilities

- **ts-ssh** - Tailscale SSH wrapper for Ansible deployments
  - Used in CI/CD for RPi deployments
  - Enables SSH over Tailscale network

## Deprecated Tools (Removed)

The following tools have been removed as they're superseded by modern alternatives:

- **e2e.sh** → Use `npm run test:e2e` (Playwright-based)
- **test-crud.sh** → Use Playwright E2E tests in `e2e/`
- **test_mcp_modes.sh** → Integrated into E2E suite
- **verify-env.ts** → Use Playwright environment tests
- **sync-versions.sh** → Use changesets (see [CONTRIBUTING.md](../CONTRIBUTING.md#-release-process))
- **release.sh** → Use `npm run release` (changesets-based)

## Migration Notes

### Version Management

```bash
# Old (bash scripts)
./scripts/version-bump.sh patch
./tools/release.sh

# New (changesets)
npm run changeset      # Create a changeset
npm run version        # Apply changesets (bump versions)
npm run release        # Build and publish
```

### E2E Testing

```bash
# Old
./tools/e2e.sh
./tools/test-crud.sh

# New
npm run test:e2e
npm run test:e2e -- --grep "CRUD"
```
