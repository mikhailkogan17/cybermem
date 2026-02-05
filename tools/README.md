# Testing & Validation Tools

This directory contains tools for testing, validation, and quality assurance.

## Available Tools

### Release & Publishing

- **release.sh** - Build and publish all npm packages
  ```bash
  npm run release
  ```
  - Builds all packages sequentially
  - Publishes to npm with public access
  - Used in release workflow

### Kubernetes Testing

- **test-k8s.sh** - Automated k3d verification
  ```bash
  ./tools/test-k8s.sh
  ```
  - Creates temporary k3d cluster
  - Deploys CyberMem via Helm
  - Validates deployment
  - Auto-cleanup on exit

## Deprecated Tools (Removed)

The following tools have been removed as they're superseded by modern alternatives:

- **e2e.sh** → Use `npm run test:e2e` (Playwright-based)
- **test-crud.sh** → Use Playwright E2E tests in `e2e/`
- **test_mcp_modes.sh** → Integrated into E2E suite
- **verify-env.ts** → Use Playwright environment tests
- **sync-versions.sh** → Use `scripts/version-bump.sh`

## Migration Notes

If you have scripts referencing old tools:

```bash
# Old
./tools/e2e.sh

# New
npm run test:e2e

# Old
./tools/test-crud.sh

# New
npm run test:e2e -- --grep "CRUD"
```
