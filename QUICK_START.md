# Quick Start - Fast-CI Fix

## TL;DR
Branch `copilot/refactor-ci-cd-pipeline` has failing E2E workflows. Need to fix and get working.

## What to Do

### 1. Check What's Failing
```bash
gh run list --branch copilot/refactor-ci-cd-pipeline --limit 3
gh run view <latest-run-id> --log-failed
```

### 2. Most Likely Issues

**e2e.yml syntax errors**:
- `runs-on: ${{ matrix.runner }}` might be wrong
- Conditional steps might have syntax errors
- Check lines with `if: ${{ matrix.setup_tailscale }}`

**Quick Fix Attempt**:
```yaml
# Change from:
runs-on: ${{ matrix.runner }}

# To:
runs-on: ${{ matrix.runner || 'ubuntu-latest' }}
```

### 3. Test Incrementally

**Step 1**: Fix localhost tests only
- Remove rpi-ts-staging from matrix temporarily
- Get localhost-staging and localhost-prod working

**Step 2**: Add RPi testing back
- Once localhost works, add rpi-ts-staging
- Debug Tailscale/runner issues separately

## Critical Rules
- ❌ **NEVER touch production RPi (port 8626)**
- ✅ Use staging port (8625) only
- ✅ Keep Turbopack (`--turbo` flag)
- ✅ rpi-ts-staging runs on self-hosted runner

## Files to Check
1. `.github/workflows/e2e.yml` - Main file (likely has errors)
2. `packages/dashboard/package.json` - Verify `"dev": "next dev --turbo"`
3. GitHub Actions logs - See actual errors

## Expected Result
- ✅ localhost-staging passes (AMD64)
- ✅ localhost-prod passes (AMD64)  
- ✅ rpi-ts-staging passes (RPi self-hosted)
- ✅ Turbopack builds work
- ✅ Production never touched

## See Full Details
Read `NEXT_SESSION_PROMPT.md` for complete context.
