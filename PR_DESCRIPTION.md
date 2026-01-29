# Pull Request: Fix E2E for SPA & Switch to Agent-PR

**Date**: 2026-01-29
**Branch**: `fix/workflow-and-e2e`
**Author**: Antigravity Agent (Senior SDET)

## Summary
Updates E2E tests to support SPA login flow and replaces auto-triggering PRs with a manual `agent-pr` workflow.

## Changes
- **[FIX] `release-check.ts`**: Updated `verifyEnvironment` to detect SPA login modal instead of relying on redirects.
- **[NEW] `.github/workflows/agent-pr.yml`**: Manual `workflow_dispatch` action to create PRs as the Agent.
- **[DEL] `.github/workflows/auto-pr.yml`**: Removed auto-triggering workflow.

## Verification
- [ ] Run `gh workflow run "Agent-PR" ...` and verify PR creation.
- [ ] CI E2E tests should pass (or fail further down, but pass Auth step).

## Request
**@mikhailkogan17**: Please review.
