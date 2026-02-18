# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed

- **MCP**: Migrated from custom Express server to **FastMCP** framework
- **MCP**: Switched transport from legacy SSE to Streamable HTTP (`httpStream`)
- **MCP**: Added native FastMCP authentication support
- **MCP**: Disabled `stateless` mode to enable proper `mcp-session-id` generation
- **MCP**: Made database migration errors fatal (`process.exit(1)`)
- **E2E**: Extracted shared `FastMCPHandshakeTransport` test utility
- **E2E**: Replaced hardcoded delays with event-driven stream readiness
- **E2E**: Added MCP JSON-RPC protocol verification to `global-setup.ts`
- **Release**: Switched to patch-by-default publish (no manual version_type input)
- **Release**: Added `npm run version:minor` / `version:major` scripts for explicit bumps

### Fixed

- **MCP**: Fixed `stateless: true` suppressing session IDs in httpStream mode
- **MCP**: Fixed CI E2E failures caused by missing `mcp-session-id` header
- **MCP**: Fixed `update_memory` tool missing validation for required fields
- **MCP**: Fixed migration logic for `cybermem_stats` table missing `tool` column fallback
- **Dashboard**: Added fallback for legacy databases missing `tool` column in audit logs

## [0.13.9] - 2026-02-09

### Added

- **Release Pipeline**: Automated Release Notes extraction from `CHANGELOG.md` directly into GitHub Releases.
- **Release Pipeline**: Unified `finalize` job that handles versioning, changelog, and reporting in one atomic step.
- **CLI**: Default to GHCR pulls for remote deployments (no local builds/transfers).
- **CLI**: Added `--build` flag to force local builds if needed.

### Fixed

- **CHANGELOG**: Cleaned up duplicated headers and inconsistent formatting.

## [0.13.4] - 2026-02-09

### Fixed

- **Ansible**: Increased health check retries (30) and delay (10s) to handle slow RPi startups.
- **MCP**: Applied Isolated Native-Builder Pattern for stable ARM64 `sqlite3` builds.
- **CI**: Fully transitioned to native NPM workspaces.
- **Publish**: Restored Node 24 and OIDC-based publishing stability.

## [0.13.0] - 2026-02-03

### Added

- **Release Pipeline**: 8-step strict release workflow (`publish.yml`).
- **Ansible**: `build_from_source` mode for staging deployments.
- **CI**: Branch protection requiring Quality Gates and E2E checks.

### Changed

- **Ansible**: Docker-compose path patching for source builds.
- **E2E**: Fixed Playwright artifact upload paths.

## [0.7.5] - 2026-01-19

### Changed

- **Architecture**: Removed Prometheus and simplified to SQLite-only metrics.
- **Branding**: Replaced all mentions of "OpenMemory" with "CyberMem Core".
- **Security**: Renamed "API Key" to "Security Token".
- **MCP**: Added `cybermem://protocol` resource.
- **Landing**: Updated with new terminology.

### Fixed

- **MCP**: Fixed `SQLITE_BUSY` crashes.
- **E2E**: Fixed MCP protocol handshake and session management.
- **Dashboard**: Fixed port conflict and service naming.

## [0.6.15] - 2026-01-19

### Fixed

- **Dashboard**: Fixed "Local Mode" detection on RPi.
- **Dashboard**: Improved hover styles for Settings buttons.
- **Tests**: Renamed E2E test clients to "Antigravity" / "Claude".
- **Test**: Added DB Reset and Read Verification to `flow-test.ts`.

## [0.6.14] - 2026-01-18

### Added

- **Release Report Gatekeeper**: Strict pre-publish verification.
- Specialized `.env` templates for different environments.

### Changed

- Dashboard E2E tests forced to IPv4 (`127.0.0.1`).
- `cybermem-cli init` refactored to use standardized templates.

### Fixed

- CI Dashboard E2E timeouts.
- CLI `OM_API_KEY` generation prefix changed to `cm-`.
