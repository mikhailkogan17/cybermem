# Pull Request: Agile Infrastructure & Token Revert

**Date**: 2026-01-29
**Branch**: `feat/agile-setup`
**Author**: Antigravity Agent (Senior SDET)

## Summary
This PR establishes the foundational infrastructure for our new Agile workflow and reverts the critical token format changes to restore system stability.

## Changes
### 1. Agile Infrastructure
- **[NEW] `.github/workflows/auto-pr.yml`**: Automates PR creation to ensure identity separation (Bot vs User).
- **[NEW] `.github/pull_request_template.md`**: Enforces strict verification.
- **[NEW] `dangerfile.ts`**: Automates quality gates.
- **[MOD] `GEMINI.md`**: Updated with Agile protocols.
- **[MOD] `.hooks/pre-commit`**: Simplified to linters only.

### 2. Critical Fixes (Token Revert)
- **[REVERT] `packages/dashboard`**: Reverted API key generation and validation to `sk-` prefix.
- **[REVERT] `packages/mcp`**: Reverted token validation to `sk-`.
- **[fix] `next.config.mjs`**: Re-enabled `basePath` support.

## Request
**@mikhailkogan17**: Please review and merge.
