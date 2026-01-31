# fix(cm-9): Enforce Tailscale Auth & Secure Metrics

## Problem
- **Auth Bypass**: Tailscale traffic was treated as "local" due to lack of domain validation.
- **Metrics Leak**: `/metrics` was whitelist in `docker-compose.yml` (publicly accessible).
- **Legacy Aliases**: `/cybermem` paths were still active.

## Solution
1. **Auth Sidecar**:
   - Added strict check: `host.includes(".ts.net")` -> **ENFORCE AUTH**.
   - Added `host.endsWith(".local")` -> **ALLOW BYPASS** (RPi LAN).
   - Restored `localhost` bypass strictly for `CYBERMEM_INSTANCE=local` (Dev).
2. **Traefik**: Removed `/metrics` from public router.
3. **E2E**: Updated `release-check.ts` with correct Tailscale staging URLs.

## Verification
- **Localhost-Prod**: Verified (CRUD + UI + Audit + Metrics blocked).
- **Release Report**: `release-reports/release-report-0.12.5.md` created.

## Ticket
[CM-9](https://linear.app/cybermem/issue/CM-9/remove-auth-bypass-on-tailscale)
