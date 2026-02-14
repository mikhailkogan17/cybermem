### Added
### Changed
### Fixed
### Removed
## [0.13.14] - 2026-02-10
### Added
### Changed
### Fixed
### Removed
## [0.13.13] - 2026-02-09
### Added
### Changed
### Fixed
### Removed
## [0.13.12] - 2026-02-09
### Added
### Changed
### Fixed
### Removed
## [0.13.11] - 2026-02-09
### Added
### Changed
### Fixed
### Removed
## [0.13.10] - 2026-02-09
### Added
### Changed
### Fixed
### Removed
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
