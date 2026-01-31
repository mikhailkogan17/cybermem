# Release Report v0.12.5

## CM-9: Remove Tailscale Auth Bypass & Cleanup

### Summary
Verification of strict auth enforcement on Tailscale, legacy alias removal, and metrics security.

### 1. Localhost Staging
**URL**: http://localhost:8625
- [ ] Dashboard Loads (Bypass Active)
- [ ] E2E Tests Pass

### 2. Localhost Prod
**URL**: http://localhost:8626
- [x] `/metrics` returns 404/401 (Not 200)
- [x] Audit logs accessible
- [x] Dashboard Loads (Bypass Active)
- [x] E2E Tests Pass

### 3. RPi LAN (Staging)
**URL**: http://raspberrypi.local:8625
- [ ] `/metrics` protected
- [ ] Login Bypassed (Auth Not Required) as per user rule
- [ ] E2E Tests Pass

### 4. RPi Tailscale (Staging)
**URL**: https://raspberrypi.tail7242ed.ts.net/cybermem-staging
- [ ] Login Page Visible (NO Bypass)
- [ ] Full CRUD works
- [ ] `/metrics` protected (401/404)
- [ ] E2E Tests Pass

## Failure Log
*(Record any failures here)*
