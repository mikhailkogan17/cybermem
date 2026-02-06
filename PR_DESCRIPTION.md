## Feature Decomposition

### Requirements
- [x] Implement Fast-CI architecture to decouple staging from RPi runner
- [x] Add `--ci` flag for non-interactive CI deployments
- [x] Configure resource limits to prevent crashes (Dashboard: 512MB, MCP: 256MB, Traefik: 128MB)
- [x] Update workflows to use AMD64 runners for staging, RPi for production ARM64 only
- [x] Add parallel E2E test matrix for comprehensive environment coverage
- [x] Test across localhost-staging, localhost-prod, and rpi-ts-staging (emulation)

### Existing Patterns
- **Reference**: `.github/workflows/e2e.yml` - Matrix strategy for parallel test execution
- **Pattern**: Use `PROJECT_NAME` environment variable to run multiple docker-compose stacks simultaneously
- **Reference**: `packages/cli/src/commands/install.ts` - CLI flag pattern for deployment modes
- **Pattern**: Ansible playbook execution with `is_ci_mode` for non-interactive deployments

### Edge Cases
- [x] RPi Runner Overload: Skip ARM64 builds for `:staging` tag, build only for `:latest`
- [x] Port Conflicts: Use different ports (8625 staging, 8626 prod) and project names
- [x] Memory Pressure: Apply docker-compose resource limits for stability
- [x] Tailscale Funnel: Setup automatic HTTPS exposure for RPi emulation tests
- [x] Parallel Matrix: Ensure independent execution with `fail-fast: false`

## Implementation

### Problem
The Raspberry Pi self-hosted runner was overloaded during CI/CD:
- ARM64 Dashboard builds crashed
- Staging verification coupled to physical RPi hardware
- PR checks extremely slow and fragile
- **Result**: No deployments for 2 weeks

### Solution: Fast-CI + E2E Matrix

#### 1. Fast-CI Architecture
**Before**: RPi for ALL builds (staging + production) → overload
**After**: AMD64 GitHub runners for staging, RPi for production ARM64 only

**CLI Enhancement:**
```bash
# CI mode: non-interactive, localhost deployment via Ansible
cybermem install --ci --rpi --staging
cybermem install --ci --rpi --staging --remote-access  # with Tailscale
cybermem install --ci --rpi  # production
```

**Workflow Changes:**
- **PR Checks**: AMD64 runner becomes staging environment (no RPi)
- **Publish**: Staging on AMD64 → E2E → Build ARM64 on RPi → Deploy
- **Build**: Skip ARM64 for `:staging`, build both for `:latest`

#### 2. E2E Matrix Testing
**Parallel execution across 3 environments:**
1. **localhost-staging** (port 8625): Fast local validation
2. **localhost-prod** (port 8626): Production config verification
3. **rpi-ts-staging** (Tailscale + port 8625): RPi emulation with remote access

**Benefits:**
- Comprehensive coverage without waiting for sequential tests
- Earlier detection of environment-specific issues
- RPi emulation validates Tailscale Funnel setup
- Independent test artifacts per environment

### Files Changed
- `.github/workflows/e2e.yml`: Matrix strategy with 3 parallel environments
- `.github/workflows/build-images.yml`: Conditional ARM64 build
- `.github/workflows/publish.yml`: Runner-as-staging pattern
- `packages/cli/src/index.ts`: Add `--ci` flag
- `packages/cli/src/commands/install.ts`: Implement CI mode
- `packages/cli/templates/ansible/playbooks/deploy-cybermem.yml`: CI support
- `packages/cli/templates/docker-compose.yml`: Memory limits
- `GEMINI.md`: Section 1.3.2 Fast-CI architecture
- `PR_DESCRIPTION.md`: Feature template compliance

## Verification

### Local (localhost:8626)
Will be tested by `localhost-prod` matrix job in e2e.yml

### Local (k3d)
N/A for this PR (future enhancement)

### RPi (Lan)
Production deployment unchanged, will verify post-merge

### RPi (Tailscale)
Will be tested by `rpi-ts-staging` matrix job with Tailscale Funnel emulation
