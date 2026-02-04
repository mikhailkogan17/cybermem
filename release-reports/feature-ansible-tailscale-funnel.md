# Feature Report: Ansible Tailscale Funnel Configuration

> This is a feature report for PR #43, not a full release report.
> Full verification will occur during v0.13.0 release.

**Date**: 2026-02-04

**Status**: Pending Verification (CI)

**Context**: Add automatic Tailscale Funnel configuration to Ansible deploy playbook

## Feature Summary

### Problem
Tailscale Funnel was not configured automatically during deployment, requiring manual setup on each deploy and causing 404 errors on staging/prod URLs.

### Solution
Add Ansible task to configure Tailscale Funnel paths after successful health check:
- Staging (`cybermem_env=staging`): `/cybermem-staging` → port 8625
- Production (`cybermem_env=prod`): `/cybermem` → port 8626

## Decomposition

### Requirements
- [x] Staging: `/cybermem-staging` → 8625
- [x] Production: `/cybermem` → 8626
- [x] Must run after health check (service verified healthy before public exposure)
- [x] Must only run when `CYBERMEM_TAILSCALE=true`
- [x] Must be idempotent (reset before configure)

### Edge Cases
- [x] Previous serve/funnel config exists: Reset before new config
- [x] Tailscale not installed: `ignore_errors: true`
- [x] Health check fails: Funnel not configured (correct behavior)

## Changes

| File                                                           | Change                                                     |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| `packages/cli/templates/ansible/playbooks/deploy-cybermem.yml` | Add `Configure Tailscale Funnel` task after health check   |
| `.github/workflows/publish.yml`                                | Add `CYBERMEM_TAILSCALE=true` to staging deploy (line 135) |
| `.github/workflows/publish.yml`                                | Add `CYBERMEM_TAILSCALE=true` to prod deploy (line 510)    |

## Verification Checklist

- [x] Ansible lint passed
- [x] Pre-commit checks passed
- [ ] CI pipeline passes
- [ ] Staging E2E verification passes
- [ ] Production deploy succeeds

## Sign-off
- [ ] **Ready for Merge**: Pending CI
- **Signed By**: Antigravity Agent
