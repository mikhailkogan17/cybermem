# Release Report: [Version]

> [!CAUTION]
> **DO NOT MODIFY STRUCTURE**: This template structure is immutable. Fill in the brackets `[...]` but do NOT remove sections or change headers. If a section is skipped, mark Status as `[SKIPPED]`.

**Date**: [YYYY-MM-DD]

**Status**: [Verified/Failed]

**Context**: [Brief context, e.g. "Fresh run after fix X"]

## 0. Verification Instructions (Reproduction)
To reproduce this verification report with minimum tokens and deep understanding:

1. **Setup Remote Credentials**:
   - Retrieve Tailscale URL from RPi: `ssh pi@raspberrypi.local "sudo tailscale funnel status"`
   - Retrieve SSoT Token (raw) from RPi: `ssh pi@raspberrypi.local "cat .cybermem/secrets/om_api_key"`

2. **Run E2E Lethal Law Guard**:
   ```bash
   export TAILSCALE_URL="https://raspberrypi.[domain].ts.net/[path]"
   export CYBERMEM_TOKEN="[token]"
   npx ts-node packages/cli/e2e/release-check.ts
   ```

3. **Verify Programmatic Proofs**:
   - Check `release-reports/release-report-[version]-assets/` for Playwright screenshots.
   - All statuses in the **Stability Checks** table MUST match these actual screenshots.

4. **Zero Trust Rule**: Never manually check "Verified" without seeing the programmatic screenshot proof for that specific environment.

> [!IMPORTANT]
> **Lethal Laws of Release**:
> 1. All screenshots MUST be present.
> 2. All checklist items MUST be verified against the specific screenshot.
> 3. Identity must be verified (`X-Client-Name` / "Last Writer").
> 4. **Concrete App Name**: No `curl`, `node`, `rest-api`, `mcp`, or `cybermem` in Identity.
> 5. **Zero Direct Port Exposure**: All access via Traefik (8625/8626). No direct 3000/3001/8080.

## 1. Localhost: Staging (`localhost:8625`)
**Status**: [✅/❌]

#### 1.1 Dashboard (`1.1_dashboard.png`)
![1.1 Dashboard]([screenshot_path])
- **Top Writer**: [Observed Value, e.g. Claude Desktop]
- **Identity Law**: [Observed X-Client-Name, e.g. Antigravity]
- **Environment**: [Staging/Production]
- **Audit Logs**: [Full CRUD / Success Only / Generic]
- [ ] **Data Proof**: Metrics cards and graphs are visible.

#### 1.2 MCP Integration (`1.2_mcp.png`)
![1.2 MCP]([screenshot_path])
- **Command Proof**: [Truncated command, e.g. npx @cybermem/cli mcp --staging]
- [ ] **JSON Proof**: Correct JSON syntax highlighting visible.

#### 1.3 Settings (`1.3_settings.png`)
![1.3 Settings]([screenshot_path])
- **Token Proof**: [Truncated Token, e.g. sk-74d9...6575]
- [ ] **Visibility Proof**: Token is made visible via Eye Icon.

---

## 2. Localhost: Production (`localhost:8626`)
**Status**: [✅/❌]

#### 2.1 Dashboard (`2.1_dashboard.png`)
![2.1 Dashboard]([screenshot_path])
- **Top Writer**: [Observed Value]
- **Identity Law**: [Observed X-Client-Name]
- **Environment**: [Production]
- [ ] **Data Proof**: Metrics cards and graphs are visible.

#### 2.2 MCP Integration (`2.2_mcp.png`)
![2.2 MCP]([screenshot_path])
- **Command Proof**: [Truncated command]
- [ ] **JSON Proof**: Correct JSON syntax highlighting visible.

#### 2.3 Settings (`2.3_settings.png`)
![2.3 Settings]([screenshot_path])
- **Token Proof**: [Truncated Token, e.g. sk-74d9...6575]
- [ ] **Visibility Proof**: Token is made visible via Eye Icon.

---

## 3. Remote: RPi LAN Staging (`rpi-lan-staging`)
**Status**: [✅/❌]
**URL**: `http://raspberrypi.local:8625`

#### 3.1 Dashboard (`3.1_dashboard.png`)
![3.1 Dashboard]([screenshot_path])
- **Top Writer**: [Observed Value]
- **Identity Law**: [Observed X-Client-Name]
- **Environment**: [Staging]
- [ ] **Data Proof**: Metrics cards and graphs are visible.

#### 3.2 MCP Integration (`3.2_mcp.png`)
![3.2 MCP]([screenshot_path])
- **Command Proof**: [Truncated command]
- [ ] **JSON Proof**: Correct JSON syntax highlighting visible.

#### 3.3 Settings (`3.3_settings.png`)
![3.3 Settings]([screenshot_path])
- **Token Proof**: [Truncated Token]
- [ ] **Visibility Proof**: Token is made visible via Eye Icon.

---

## 4. Remote: RPi Tailscale Staging (`rpi-ts-staging`)
**Status**: [✅/❌]
**URL**: `https://raspberrypi.[domain].ts.net/cybermem-staging`

#### 4.1 Dashboard (`4.1_dashboard.png`)
![4.1 Dashboard]([screenshot_path])
- **Top Writer**: [Observed Value]
- **Identity Law**: [Observed X-Client-Name]
- **Environment**: [Staging]
- [ ] **Data Proof**: Metrics cards and graphs are visible.

#### 4.2 MCP Integration (`4.2_mcp.png`)
![4.2 MCP]([screenshot_path])
- **Command Proof**: [Truncated command]
- [ ] **JSON Proof**: Correct JSON syntax highlighting visible.

#### 4.3 Settings (`4.3_settings.png`)
![4.3 Settings]([screenshot_path])
- **Token Proof**: [Truncated Token]
- [ ] **Visibility Proof**: Token is made visible via Eye Icon.
  
#### 4.4 Login (`4.4_login.png`)
![4.4 Login]([screenshot_path])
- **Login Bypassed?**: [Yes/No]
- **Logged in with**: [trunkated token]
---

## 5. Remote: k3d Staging (`vps-staging`)
**Status**: [✅/❌]
**URL**: `http://localhost:8081`

#### 5.1 Dashboard (`5.1_dashboard.png`)
![5.1 Dashboard]([screenshot_path])
- **Top Writer**: [Observed Value]
- **Identity Law**: [Observed X-Client-Name]
- **Environment**: [Staging]
- [ ] **Data Proof**: Metrics cards and graphs are visible.

#### 5.2 MCP Integration (`5.2_mcp.png`)
![5.2 MCP]([screenshot_path])
- **Command Proof**: [Truncated command]
- [ ] **JSON Proof**: Correct JSON syntax highlighting visible.

#### 5.3 Settings (`5.3_settings.png`)
![5.3 Settings]([screenshot_path])
- **Token Proof**: [Truncated Token]
- [ ] **Visibility Proof**: Token is made visible via Eye Icon.

---

## 🔍 Automated Verification Summary
This release introduces `release-check.ts` (Lethal Law Guard) which programmatically asserts:
1.  **Identity Law**: Fails if `Last Writer` contains generic terms (`curl`, `node`, `unknown`, `chrome`).
2.  **Data Integrity (SLA)**: Fails if metrics cards are `0` or `N/A`.
3.  **Visualization (SLA)**: Fails if time-series charts are missing.
4.  **Audit Log (SLA)**: Fails if errors detected or no success entries after CRUD.

---

## 🛡️ Zero Trust Verification Statement
> [ ] I hereby confirm that E2E tests have passed for all active environments. I have used exclusively the Playwright E2E assets (from `/release-report-[version]-assets/`) to compile this report, verifying every checkbox programmatically through `release-check.ts` and nothing was simulated or invented.

## Sign-off
- [ ] **All Checks Passed**: Yes/No
- [ ] **Signed By**: [Agent Name]
