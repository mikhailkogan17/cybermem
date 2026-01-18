# Changelog

All notable changes to this project will be documented in this file.

## [0.6.15] - 2026-01-19

### Fixed

- **Dashboard**: Fixed "Local Mode" detection on RPi (respects `OM_API_KEY`).
- **Dashboard**: Improved hover styles for Settings buttons (Reset, Restart, Cancel).
- **Tests**: Renamed E2E test clients to "Antigravity" / "Claude" for cleaner Audit Logs.
- **Test**: Added DB Reset and Read Verification to `flow-test.ts`.

## [0.6.14] - 2026-01-18

### Added

- **Release Report Gatekeeper**: Strict pre-commit verification with `scripts/validate-release-report.js`.
- Specialized `.env` templates for `local`, `rpi`, `rpi-tailscale`, and `vps`.

### Changed

- Dashboard E2E tests forced to IPv4 (`127.0.0.1`) to resolve CI networking issues.
- `cybermem-cli init` refactored to use standardized templates.

### Fixed

- CI Dashboard E2E timeouts by adding health check wait for `db-exporter`.
- CLI `OM_API_KEY` generation prefix changed to `cm-` to avoid Gitleaks false positives.
