# Fast-CI Implementation - Continuation Prompt

## Context
You are continuing work on branch `copilot/refactor-ci-cd-pipeline` in the `mikhailkogan17/cybermem` repository. The previous session attempted to implement Fast-CI architecture but all jobs are currently failing. The PR was closed but the branch is kept for future work.

## Original Problem
- RPi self-hosted runner crashes during ARM64 Dashboard builds
- Staging verification blocks on physical RPi hardware availability
- **No deployments for 2 weeks**
- Dashboard builds slow (5-10 minutes with webpack)

## What Was Attempted

### 1. Fast-CI Architecture
**Goal**: Decouple staging from RPi runner
- AMD64 runners for localhost staging/prod tests (fast)
- RPi self-hosted runner for hardware validation (rpi-ts-staging)
- RPi reserved for production ARM64 builds only

### 2. Turbopack Integration
**Goal**: 10x faster Dashboard builds
- Added `--turbo` flag to `packages/dashboard/package.json`
- Changed `"dev": "next dev --turbo"`

### 3. E2E Test Matrix (3 environments)
```yaml
matrix:
  include:
    - env_name: localhost-staging
      runner: ubuntu-latest
      base_url: http://localhost:8625
      
    - env_name: localhost-prod
      runner: ubuntu-latest
      base_url: http://localhost:8626
      
    - env_name: rpi-ts-staging
      runner: self-hosted
      setup_tailscale: true
      base_url: http://localhost:8625
```

### 4. Key Changes Made
- `.github/workflows/e2e.yml`: 3-environment matrix, dynamic runner selection
- `.github/workflows/publish.yml`: Removed deploy-staging and e2e-staging jobs (Tailscale Funnel removed)
- `packages/dashboard/package.json`: Added Turbopack
- `packages/cli/templates/docker-compose.yml`: Changed to `mem_limit` (from `deploy.resources`)
- `playwright.config.ts`: Scoped `ignoreHTTPSErrors` to `.ts.net` URLs only

## What Worked
- ✅ Turbopack integration (syntax correct)
- ✅ Resource limits (`mem_limit` instead of `deploy.resources`)
- ✅ Parallel jobs (Danger doesn't block E2E)
- ✅ CLI `--ci` flag implementation
- ✅ Removed Tailscale Funnel complexity

## What Failed (All Jobs Failing)
- ❌ E2E jobs failing (need to investigate logs)
- ❌ Possible issues:
  - Dynamic runner selection (`${{ matrix.runner }}`)
  - Conditional steps logic
  - Tailscale setup on self-hosted runner
  - Platform detection (AMD64 vs ARM64)
  - Missing dependencies or environment variables

## Current Branch State
**Branch**: `copilot/refactor-ci-cd-pipeline` (35+ commits)

**Key Files Modified**:
1. `.github/workflows/e2e.yml` - Main E2E workflow with matrix
2. `.github/workflows/publish.yml` - Simplified (removed Tailscale jobs)
3. `.github/workflows/build-images.yml` - Conditional ARM64 builds
4. `packages/dashboard/package.json` - Turbopack added
5. `packages/cli/src/commands/install.ts` - CI mode
6. `packages/cli/templates/docker-compose.yml` - Resource limits
7. `playwright.config.ts` - Scoped SSL ignore
8. `GEMINI.md` - Documentation updates

## Critical Requirements (DO NOT VIOLATE)
1. ❌ **NEVER touch production RPi (port 8626) for E2E tests**
2. ✅ **Use staging port (8625) only for testing**
3. ✅ **rpi-ts-staging must run on RPi self-hosted runner**
4. ✅ **Use Tailscale for SSH access to RPi (tag:ci)**
5. ✅ **Keep Turbopack for faster builds**

## Next Steps to Fix

### 1. Investigate Workflow Failures
```bash
# Check the failing jobs
gh run list --branch copilot/refactor-ci-cd-pipeline
gh run view <run-id> --log
```

**Likely Issues**:
- Dynamic runner syntax wrong
- Conditional step logic broken
- Missing environment variables
- Tailscale setup failing on self-hosted

### 2. Fix e2e.yml
**Check**:
- `runs-on: ${{ matrix.runner }}` syntax
- Conditional steps: `if: ${{ matrix.setup_tailscale }}`
- Platform variable: `DOCKER_DEFAULT_PLATFORM`
- Tailscale setup step placement

**Possible Fix**:
```yaml
runs-on: ${{ matrix.runner || 'ubuntu-latest' }}
```

### 3. Fix Tailscale Setup
**On self-hosted runner**:
- Verify Tailscale is installed
- Check TAILSCALE_AUTHKEY secret exists
- Verify tag:ci permissions in ACL
- Ensure runner has network access

### 4. Simplify if Needed
**Option A**: Keep 3 environments, fix workflow syntax
**Option B**: Start with 2 environments (localhost only), add RPi later
**Option C**: Use separate job for rpi-ts-staging (not matrix)

### 5. Test Incrementally
1. First: Fix localhost-staging and localhost-prod (should be easy)
2. Then: Add rpi-ts-staging (more complex)

## Files to Review

### Critical Files
1. `.github/workflows/e2e.yml` - Main workflow (likely has syntax errors)
2. `packages/dashboard/package.json` - Verify Turbopack syntax
3. `playwright.config.ts` - Check if BASE_URL env var is set correctly

### Verification Commands
```bash
# Check workflow syntax
gh workflow view e2e.yml

# Validate YAML locally
yamllint .github/workflows/e2e.yml

# Check runner availability
gh api repos/mikhailkogan17/cybermem/actions/runners
```

## Expected Final State

### E2E Matrix (Working)
| Environment | Runner | Platform | URL | Status |
|-------------|--------|----------|-----|--------|
| localhost-staging | ubuntu-latest | AMD64 | localhost:8625 | ✅ Should work |
| localhost-prod | ubuntu-latest | AMD64 | localhost:8626 | ✅ Should work |
| rpi-ts-staging | self-hosted | ARM64 | localhost:8625 | ⚠️ Needs fixing |

### Turbopack
- ✅ Dashboard builds in <1 minute (vs 5-10 min)
- ✅ HMR in <1 second (vs 10s)
- ✅ Dev server starts in <5s (vs 30s)

### Production Safety
- ✅ Production RPi (port 8626) never touched by E2E
- ✅ Staging uses separate port (8625)
- ✅ Tests run on isolated environments

## Questions to Answer in Next Session

1. **What exactly is failing in the workflows?**
   - Check GitHub Actions logs
   - Identify specific error messages

2. **Is the matrix syntax correct?**
   - Verify `${{ matrix.runner }}` works
   - Check conditional step syntax

3. **Does the self-hosted runner work?**
   - Is it online?
   - Does it have required labels?
   - Can it access Tailscale?

4. **Should we simplify the approach?**
   - Maybe start with just localhost tests
   - Add RPi testing later when working

## Success Criteria

### Minimum Viable
- ✅ localhost-staging passes (AMD64)
- ✅ localhost-prod passes (AMD64)
- ✅ Turbopack works
- ✅ No production RPi touched

### Full Success
- ✅ All 3 environments pass
- ✅ rpi-ts-staging on RPi runner works
- ✅ Turbopack builds fast
- ✅ Production safety maintained
- ✅ Parallel jobs work

## Debugging Approach

1. **Start Simple**
   - Get localhost tests working first
   - Verify Turbopack builds
   - Check resource limits work

2. **Add Complexity Gradually**
   - Once localhost works, add RPi
   - Test Tailscale setup separately
   - Verify self-hosted runner

3. **Validate Each Change**
   - Run workflow after each fix
   - Check logs for new errors
   - Don't make multiple changes at once

## Key Learnings from Previous Session

1. **Tailscale Funnel is too complex for CI**
   - DNS propagation unreliable
   - TLS cert provisioning issues
   - Not worth the complexity

2. **Production safety is critical**
   - NEVER touch port 8626 for E2E
   - Use port 8625 for staging only
   - User will RAGE if production is touched

3. **Turbopack is valuable**
   - 10x faster builds important
   - Keep this even if other things fail

4. **RPi testing is required**
   - User wants real hardware validation
   - Must run on RPi self-hosted runner
   - Use localhost access (no remote)

## Branch Commits (Last 10)
```
d55aa4b fix: Replace rpi-lan-prod with rpi-ts-staging in matrix on RPi runner
4d18c33 feat: Add Turbopack, RPi LAN testing, remove Tailscale Funnel
7e91a45 fix: Add unique hostname and DNS propagation wait for Tailscale Funnel (properly this time)
1c59220 fix: Add http://localhost: prefix to Tailscale Funnel command to fix TLS error
05c6959 fix: Configure Tailscale Funnel AFTER services are running to fix TLS error
087c776 fix: Address copilot review comments - resource limits, auth token, scoped SSL ignore
73abffd fix: Remove invalid numeric ping parameter from Tailscale setup
6142a00 fix: Make Lint&Danger and E2E parallel jobs
c46a3ff fix: Use single-command Tailscale Funnel syntax as requested
...
```

## ACL Configuration (Reference)
```json
{
  "nodeAttrs": [
    {
      "target": ["autogroup:member", "tag:ci"],
      "attr": ["funnel"]
    }
  ],
  "tagOwners": {
    "tag:ci": ["autogroup:member"]
  }
}
```

## Repository Structure
```
cybermem/
├── .github/workflows/
│   ├── e2e.yml          # Main E2E tests (FAILING)
│   ├── publish.yml       # Simplified workflow
│   └── build-images.yml  # Conditional ARM64 builds
├── packages/
│   ├── dashboard/        # Next.js app (with Turbopack)
│   ├── cli/             # CLI with --ci flag
│   └── mcp/             # MCP server
└── tools/               # E2E tests
```

---

## Your Task

**Fix the failing workflows on branch `copilot/refactor-ci-cd-pipeline`**

Priority order:
1. Get localhost-staging and localhost-prod working (should be straightforward)
2. Fix rpi-ts-staging on RPi runner (more complex)
3. Verify Turbopack builds work
4. Ensure production safety (never touch port 8626)

**Start by**: Checking the actual error messages in the GitHub Actions logs to understand what's failing.

Good luck! 🚀
