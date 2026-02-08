# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Changed

- **CI/CD**: Dashboard ARM64 builds now use macOS runner instead of RPi runner for better performance and reliability

## [0.13.0] - 2026-02-03

### Added

- **Release Pipeline**: 8-step strict release workflow (`publish.yml`):
  1. Changelog verification
  2. Staging deployment (build from source)
  3. E2E verification via Tailscale
  4. GHCR push (only after verification)
  5. NPM publish
  6. Finalize (tag, commit reports, GitHub release)
  7. Production deployment
  8. Slack notifications
- **Ansible**: `build_from_source` mode for staging deployments
- **CI**: Branch protection requiring Quality Gates and E2E checks

### Changed

- **Ansible**: Docker-compose path patching for source builds
- **E2E**: Fixed Playwright artifact upload paths

## [0.7.5] - 2026-01-19

### Changed

- **Architecture**: Removed Prometheus and simplified to SQLite-only metrics for lighter RPi usage.
- **Branding**: Replaced all mentions of "OpenMemory" with "CyberMem Core".
- **Security**: Renamed "API Key" to "Security Token" and standardized on `--token` argument.
- **MCP**: Added `cybermem://protocol` resource and centralized instructions.
- **Landing**: Updated with new terminology and performance optimizations.

### Fixed

- **MCP**: Fixed `SQLITE_BUSY` crashes by increasing timeout and adding wait logic.
- **E2E**: Fixed MCP protocol handshake and session management in Playwright tests.
- **Dashboard**: Fixed port conflict and service naming in health checks.

## [0.6.15] - 2026-01-19

### Fixed

- **Dashboard**: Fixed "Local Mode" detection on RPi (respects `OM_API_KEY`).
- **Dashboard**: Improved hover styles for Settings buttons (Reset, Restart, Cancel).
- **Tests**: Renamed E2E test clients to "Antigravity" / "Claude" for cleaner Audit Logs.
- **Test**: Added DB Reset and Read Verification to `flow-test.ts`.

## [0.6.14] - 2026-01-18

### Added

- **Release Report Gatekeeper**: Strict pre-publish verification with `scripts/verify-release-report.ts`.
- Specialized `.env` templates for `local`, `rpi`, `rpi-tailscale`, and `vps`.

### Changed

- Dashboard E2E tests forced to IPv4 (`127.0.0.1`) to resolve CI networking issues.
- `cybermem-cli init` refactored to use standardized templates.

### Fixed

- CI Dashboard E2E timeouts by adding health check wait for `db-exporter`.
- CLI `OM_API_KEY` generation prefix changed to `cm-` to avoid Gitleaks false positives.
