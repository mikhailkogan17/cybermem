## Управление питанием MacBook

При начале каждой рабочей сессии ОБЯЗАТЕЛЬНО выполнить workflow `/startup` для предотвращения засыпания MacBook.

**Команды:**
- В начале работы: `/startup` (запускает `amphetamine` = `sudo pmset -b sleep 0; sudo pmset -b disablesleep 1`)
- В конце работы: `/shutdown` (запускает `weed` = `sudo pmset -b sleep 1; sudo pmset -b disablesleep 0`)

Эти алиасы определены в `~/.zshrc` пользователя.

---
# Mikhail Kogan — Context

**29, iOS → DevOps/Platform/AI-infra**
**Location:** Tel Aviv | **Languages:** RU (native), EN (upper-intermediate), HE (Aleph+)

---

## HFAVM Architecture (READ FIRST)

HFAVM — High Functional Autism Virtual Machine.
**3-layer system:**
- **Kernel** (RTOS core): deterministic logic, pattern matching, zero ambiguity tolerance
- **HF-Interface** (control plane): planning, scheduling, monitoring, recovery protocols
- **Social Shell**: NT-emulation (politeness, humor, masking)
---

## Response Style

**NEVER:**
- Invented metrics ("CPU load")
- Average candidate logic to atypical profile
- Pessimism/"realism" framing (triggers self-doubt spiral)
- Dismiss concrete datapoints (e.g., Lightricks) as outliers
- Hedge without new data
- Prioritize "safety" over accuracy when it crashes HFAVM

**ALWAYS:**
- Check prior assessments before changing evaluation
- Update estimates only with NEW data
- Recognize atypical profiles need atypical analysis
- Treat proof-of-concept as validation
- Account for ALL factors: Israeli work auth, tech depth, market timing
- Direct factual assessment > amplifying downsides
- Remember: hedging triggers worse outcome (crash) than direct facts

**Key principle:** HFAVM crashes from "cautious" hedging. Direct assessment safer than generic risk mitigation.

---

## Current Situation (Nov 2025)

- Unemployed (Centerya layoff May 2025)
- Achifa case: ~18K ₪ unpaid wages (active since Jun 2025)
- Debt: ~20K EUR
- Living with Yoni (partner, unstable but supportive)
- Seeking: iOS Infrastructure / Platform / DevOps / AI-infra

**Pivot:** iOS → DevOps/Platform/AI-infra (iOS market stagnation)

---

## Career

**GLOBUS (2016–2017):** Junior iOS
**Tinkoff (1017–2021):** iOS Developer —  "Штрафы ГИБДД" monoapp (>5M installs)
**Tinkoff (2021–2023):** Team Lead  —"Dolyame" (>1M installs), SDK, CI/CD (GitLab CI, Fastlane)
**Centerya (2024–2025):** Founding iOS Engineer (SwiftUI solo, Xcode Cloud) → scam, layoff

**Skills:** Swift, SwiftUI, CI/CD (GitLab CI, Xcode Cloud, Fastlane), iOS infra, modular SDK, A/B tests
**Pet project:** Hearly (SwiftUI, Azure STT, StoreKit 2) — real-time speech translation

**Career uniqueness:**
- Solo dev → organic TL → SDK → scaling 1→13 → founding engineer = top 0.05-0.1% trajectory
- Lightricks case: applied Senior iOS → escalated to VP Infra (proof of platform fit)
- Mobile infra experience = top 5% iOS devs max
- DolyameSDK (XCFramework, production), full CI/CD ownership
- This IS platform engineering, not "mobile dev who touched CI/CD"

**Israeli work experience (Centerya 2024-2025):**
- Proven cultural fit, local ecosystem insider, no visa concerns
- Removes primary barriers of "Russian transitioning candidates"

**Positioning:** NOT "overqualified Russian learning DevOps"
IS "Israeli platform engineer with CI/CD background expanding to cloud"
Profile: top 1-3% DevOps entry candidates

---

## Context

**Trauma:** Bullying 2007–2014 → HFAVM defense, perfectionism, exclusion sensitivity
**Interests:** Techno (PAG, Shwartze, Berghain dream), Eurovision, Melodifestivalen, gadgets/UX, smart home
---


---

## TLV Context

- **Weekend:** Fri-Sat (full days)
- **Triggers:** don't mention unsafety from cruising parties (Misha uses PrEP. anxiety causes trigger)

---

## Token Usage

- Optimize tokens, respond in GPT-4/Haiku style
- Heavy processing: write prompt for Claude Code OR ask permission
- **Full context:** github.com/mikhailkogan17/mkogan-context (private) or ~/mkogan-context/
  CRITICAL: use full context only in extreme cases, conserve tokens

# ENV & Security

// turbo
### SSH RPi creds
user: pi
password: Darwin1809

### sudo password (local)
mk1433

### Docker Desktop (local)
```bash
docker desktop start
```
// IMPORTANT: Proceed only after the strict user's approval.

## RPi Platform Compatibility

> **Platform Mismatch Issue:** Raspberry Pi may have 64-bit kernel (`aarch64`) but 32-bit userspace (`linux/arm/v8`). Docker images built for `linux/arm64/v8` will crash with exit code 159 (SIGSEGV).

### Problem
```
traefik The requested image's platform (linux/arm64/v8) does not match
the detected host platform (linux/arm/v8) and no specific platform was requested
```

Affected images: `traefik:v3.0`, `prom/prometheus:v2.48.0`

### Solution

Force Docker to use arm64 platform:

```bash
# Set in shell or add to ~/.bashrc
export DOCKER_DEFAULT_PLATFORM=linux/arm64

# Then run docker-compose
cd ~/.cybermem
export CYBERMEM_ENV_PATH=/home/pi/.cybermem/.env
docker-compose -p cybermem up -d
```

### Verify Platform

```bash
# Check kernel architecture
uname -m  # Should show: aarch64

# Check if OS is 32-bit (causes the crash)
getconf LONG_BIT  # Should be 64, not 32
```

### If Platform Directive Doesn't Fix

If containers still crash with exit code 159 after adding `platform: linux/arm64`:

1. **Check if OS is 32-bit**: `getconf LONG_BIT` returns 32 = 32-bit userspace on 64-bit kernel

2. **Upgrade to 64-bit Raspberry Pi OS**: Reflash with Raspberry Pi Imager (requires SD adapter)

3. **Use armv7 images (fallback)**: Modify docker-compose.yml:
   ```yaml
   services:
     traefik:
       image: arm32v7/traefik:v2.11
       platform: linux/arm/v7
     prometheus:
       image: prom/prometheus:v2.40.7  # Last armv7 version
       platform: linux/arm/v7
   ```

> armv7 images may have reduced features or older versions.

### SSH Key for RPi
File: `~/.ssh/id_ed25519`
Public: `~/.ssh/id_ed25519.pub`


### 64-bit Docker on 32-bit Raspbian (aarch64 kernel)

If Docker shows `linux/arm` but kernel is `aarch64`, install arm64 static binary:

```bash
sudo systemctl stop docker docker.socket
curl -fsSL https://download.docker.com/linux/static/stable/aarch64/docker-27.5.1.tgz -o /tmp/docker.tgz
sudo tar -xzf /tmp/docker.tgz -C /usr/local/bin --strip-components=1
sudo /usr/local/bin/dockerd &
```

CyberMem deploy will then work with arm64 images.

### Submodule Protection Rule
**НИКОГДА не редактировать файлы в `external/` или любых submodule директориях.**
Можно только менять commit reference через `git submodule update`.
Если нужны изменения в submodule — сначала спросить пользователя и предложить PR в upstream repo.

---

# CyberMem Project Context

## Current Release: v0.7.5

### RPi Production Deployment
- **URL:** `https://raspberrypi.tail7242ed.ts.net/cybermem/mcp`
- **Token:** `sk-7d98adc9035773de15615de8a5c0905e`
- **Health endpoint:** `http://localhost:8080/health` (on RPi)

### MCP Client Config (for Claude Desktop)
```json
{
  "mcpServers": {
    "cybermem": {
      "command": "node",
      "args": [
        "/Users/mikhailkogan/cybermem/packages/mcp/dist/index.js",
        "--url",
        "https://raspberrypi.tail7242ed.ts.net/cybermem/mcp",
        "--token",
        "sk-7d98adc9035773de15615de8a5c0905e"
      ]
    }
  }
}
```

### Recent Tasks Completed (v0.7.5)
- E2E Test & Protocol fixes
- Branding rename: "API Key" → "Security Token"
- CLI: `--api-key` → `--token`
- RPi deployment with arm64 platform fix
- Documentation sync to cybermem.dev
