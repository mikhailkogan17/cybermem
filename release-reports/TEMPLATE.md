# Release Report: [Version]

**Date**: [YYYY-MM-DD]
**Status**: [Verified/Failed]
**Context**: [Brief context, e.g. "Fresh run after fix X"]

> [!IMPORTANT]
> **Lethal Laws of Release**:
> 1. All 17 screenshots MUST be present.
> 2. All checklist items MUST be verified against the specific screenshot.
> 3. Identity must be verified (`X-Client-Name` / "Last Writer").

## 1. Localhost Environment

### 1. Staging (`localhost:8625`)
**Status**: [✅/❌]

#### 1.1 Dashboard (`1.1_dashboard.png`)
![1.1 Dashboard](path/to/screenshot)
- [x] **Top/Last Reader/Writer**: Not empty.
- [x] **Identity Law**: Client Name IS CONCRETE APP (No `rest-api`, `curl`, `node`, `cybermem`, `mcp`).
- [x] **Time Series**: Not empty (shows graph data/bars).
- [ ] **Audit Logs**: Does not have errors (unless expected).

#### 1.2 MCP Integration (`1.2_mcp.png`)
![1.2 MCP](path/to/screenshot)
- [ ] **Command**: `args` includes `--staging` flag.
- [ ] **Format**: JSON syntax highlighting is correct.

#### 1.3 Settings (`1.3_settings.png`)
![1.3 Settings](path/to/screenshot)
- [ ] **Key**: `sk-generated_sha...` (NOT empty/hidden/redacted improperly).
- [ ] **Visibility**: Key is visible for Local Managed instance.

---

### 2. Production (`localhost:8626`)
**Status**: [✅/❌]

#### 2.1 Dashboard (`2.1_dashboard.png`)
![2.1 Dashboard](path/to/screenshot)
- [ ] **Top/Last Reader/Writer**: Not empty, Client Name IS CONCRETE APP.
- [ ] **Time Series**: Not empty.

#### 2.2 MCP Integration (`2.2_mcp.png`)
![2.2 MCP](path/to/screenshot)
- [ ] **Command**: `args` DOES NOT include `--staging`.
- [ ] **Format**: JSON syntax highlighting is correct.

#### 2.3 Settings (`2.3_settings.png`)
![2.3 Settings](path/to/screenshot)
- [ ] **Key**: `sk-...` (Visible SHA32).

---

## 3. Remote: RPi Local Staging (`rpi.local:8625`)
**Status**: [✅/❌]
**URL**: `http://raspberrypi.local:8625` (via Tunnel/Port Fwd)

#### 3.1 Dashboard (`3.1_dashboard.png`)
![3.1 Dashboard](path/to/screenshot)
- [ ] **Auth**: May require Login if Zero Trust enabled (or bypass if Local Network).

#### 3.2 MCP Integration (`3.2_mcp.png`)
![3.2 MCP](path/to/screenshot)
- [ ] **JSON**: `url` is valid for instance & environment (`http://raspberrypi.local:8625/mcp`).
- [ ] **JSON**: `token` is set (Remote always requires token).
- [ ] **JSON**: `args` includes `--staging`.

#### 3.3 Settings (`3.3_settings.png`)
![3.3 Settings](path/to/screenshot)
- [ ] **Key**: `sk-...` (Visible SHA32).

---

## 4. Remote: RPi Tailscale Staging (`rpi.ts.net`)
**Status**: [✅/❌]
**URL**: `https://raspberrypi...ts.net/cybermem-staging`

#### 4.1 Login (`4.1_login.png`)
![4.1 Login](path/to/screenshot)
- [ ] **Auth**: Login page visible (Zero Trust).

#### 4.2 Dashboard (`4.2_dashboard.png`)
![4.2 Dashboard](path/to/screenshot)
- [ ] **Top/Last Reader/Writer**: Visible.

#### 4.3 MCP Integration (`4.3_mcp.png`)
![4.3 MCP](path/to/screenshot)
- [ ] **JSON**: `url` is `https://raspberrypi...ts.net/cybermem-staging/mcp`.
- [ ] **JSON**: `token` is set.
- [ ] **JSON**: `args` includes `--staging`.

#### 4.4 Settings (`4.4_settings.png`)
![4.4 Settings](path/to/screenshot)
- [ ] **Key**: `sk-...` (Visible SHA32).

---

## 5. Remote: k3d Staging (`k3d-staging`)
**Status**: [✅/❌]

#### 5.1 Dashboard (`5.1_dashboard.png`)
![5.1 Dashboard](path/to/screenshot)
- [ ] **Stats**: Visible.

#### 5.2 MCP Integration (`5.2_mcp.png`)
![5.2 MCP](path/to/screenshot)
- [ ] **JSON**: `url` matches k3d ingress (e.g. `http://localhost:8081/mcp`).
- [ ] **JSON**: `token` is set.

#### 5.3 Settings (`5.3_settings.png`)
![5.3 Settings](path/to/screenshot)
- [ ] **Key**: `sk-...` (Visible SHA32).
---

## Sign-off
- [ ] **All Checks Passed**: Yes/No
- [ ] **Signed By**: [Agent Name]
