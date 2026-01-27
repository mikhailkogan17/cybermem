# Release Report: v0.12.1 (Staging & RPi Fixes)

**Date**: 2026-01-27
**Status**: Partial Success (Local & RPi Local VERIFIED. Tailscale/k3d Blocked).
**Context**: Fixes for "Empty Dashboard" (DB Split-Brain), "Incorrect MCP Config" (React Logic), and "RPi Connection Refused" (Traefik Config).

> [!IMPORTANT]
> **Lethal Laws of Release**:
> 1. All 17 screenshots MUST be present.
> 2. All checklist items MUST be verified against the specific screenshot.
> 3. Identity must be verified (`X-Client-Name` / "Last Writer").

## 1. Localhost Environment

### 1. Staging (`localhost:8625`)
**Status**: ✅ Verified

#### 1.1 Dashboard (`1.1_dashboard.png`)
![1.1 Dashboard](evidence/1.1_dashboard.png)
- [x] **Top/Last Reader/Writer**: Not empty, Client Name IS CONCRETE APP (`antigravity-client`).
- [x] **Time Series**: Not empty (shows graph data/bars).
- [x] **Audit Logs**: Populated.

#### 1.2 MCP Integration (`1.2_mcp.png`)
![1.2 MCP](evidence/1.2_mcp.png)
- [x] **Command**: `args` includes `--staging` flag.
- [x] **Format**: JSON syntax highlighting is correct.

#### 1.3 Settings (`1.3_settings.png`)
![1.3 Settings](evidence/1.3_settings.png)
- [x] **Key**: `sk-generated_sha...` (Visible).
- [x] **Visibility**: Key is visible for Local Managed instance.

---

### 2. Production (`localhost:8626`)
**Status**: ✅ Verified

#### 2.1 Dashboard (`2.1_dashboard.png`)
![2.1 Dashboard](evidence/2.1_dashboard.png)
- [x] **Top/Last Reader/Writer**: Not empty.
- [x] **Time Series**: Not empty.

#### 2.2 MCP Integration (`2.2_mcp.png`)
![2.2 MCP](evidence/2.2_mcp.png)
- [x] **Command**: `args` DOES NOT include `--staging`. (FIX CONFIRMED)
- [x] **Format**: Correct.

#### 2.3 Settings (`2.3_settings.png`)
![2.3 Settings](evidence/2.3_settings.png)
- [x] **Key**: Visible.

---

## 3. Remote: RPi Local Staging (`rpi.local:8625`)
**Status**: ✅ Verified (Fixed `traefik.yml` conflict)
**URL**: `http://raspberrypi.local:8625`

#### 3.1 Dashboard (`3.1_dashboard.png`)
![3.1 Dashboard](evidence/3.1_dashboard.png)
- [x] **Auth**: Bypassed (Local Network).
- [x] **Stats**: Visible (>0).

#### 3.2 MCP Integration (`3.2_mcp.png`)
![3.2 MCP](evidence/3.2_mcp.png)
- [x] **JSON**: `url` is valid (`http://raspberrypi.local:8625/mcp`).
- [x] **JSON**: `token` is set.
- [x] **JSON**: `args` includes `--staging`.

#### 3.3 Settings (`3.3_settings.png`)
![3.3 Settings](evidence/3.3_settings.png)
- [x] **Key**: Visible.

---

## 4. Remote: RPi Tailscale Staging (`rpi.ts.net`)
**Status**: ❌ Failed (`ERR_CONNECTION_CLOSED`)
**URL**: `https://raspberrypi.tail7242ed.ts.net/cybermem-staging`

#### 4.1 Login (`4.1_login.png`)
![4.1 Login](evidence/error_screenshot.png)
- [ ] **Auth**: Login page NOT visible.

#### 4.2 Dashboard (`4.2_dashboard.png`)
Missing.

#### 4.3 MCP Integration (`4.3_mcp.png`)
Missing.

#### 4.4 Settings (`4.4_settings.png`)
Missing.

---

## 5. Remote: k3d Staging (`k3d-staging`)
**Status**: ❌/⚠️ Partial (Deployed, but CRUD 404)

#### 5.1 Dashboard (`5.1_dashboard.png`)
![5.1 Dashboard](evidence/5.1_dashboard.png)
- [ ] **Stats**: Empty (0). Cause: Ingress /add endpoint 404.

#### 5.2 MCP Integration (`5.2_mcp.png`)
![5.2 MCP](evidence/5.2_mcp.png)
- [x] **JSON**: `url` matches k3d ingress (`http://localhost:8081/mcp`).
- [x] **JSON**: `token` is set.

#### 5.3 Settings (`5.3_settings.png`)
![5.3 Settings](evidence/5.3_settings.png)

---

## Sign-off
- [x] **All Checks Passed**: No (Remote Pending, user agreed to proceed)
- [x] **Signed By**: Antigravity
