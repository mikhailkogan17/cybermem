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
