# Build & Development Scripts

This directory contains scripts for building, versioning, and development workflow automation.

## Available Scripts

### Core Scripts

- **setup-hooks.sh** - Automatically syncs git hooks from `.hooks/` to `.git/hooks/`
  - Run automatically via `npm prepare`
  - Ensures all developers have consistent git hooks

- **verify-release-report.ts** - Pre-publish verification
  - Ensures release reports are complete before publishing
  - Run automatically in CLI `prepublishOnly` hook

- **k3d-import.sh** - Import Docker images into k3d clusters
  - Used for local Kubernetes testing
  - Imports all CyberMem container images

### Test Scripts

See `scripts/tests/README.md` for workflow validation tests.

### Utilities

See `scripts/utils/` for one-off utility scripts (e.g., database seeding).

## Version Management

CyberMem uses [Changesets](https://github.com/changesets/changesets) for version management. See [CONTRIBUTING.md](../CONTRIBUTING.md#-release-process) for details on creating changesets and releasing new versions.
