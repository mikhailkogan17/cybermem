## Postmortem Analysis

### Symptom
Potential edge case where multiple Raspberry Pi devices in Tailscale network could cause the jq query to return multiple IPs, breaking the deployment.

### Root Cause
1. The `deploy-staging` job had a duplicate `sleep 5` (already waited in `get_url` step at line 72)
2. The jq queries for RPi IP extraction lacked `| head -1` to handle multi-device scenarios

### Fix Strategy
1. Removed duplicate sleep in `deploy-staging` job
2. Added `| head -1` to both jq queries (staging and prod jobs)

### Prevention
Copilot code review caught this during PR #29 review.

## Changes
- **[FIX]** `.github/workflows/publish.yml`
  - Line 89-93: Removed duplicate `sleep 5`, added `| head -1` to jq (deploy-staging)
  - Line 363: Added `| head -1` to jq (deploy-prod)

## Verification
- [x] YAML syntax valid
- [ ] CI pipeline passes

### Evidence
Changes address all 3 actionable Copilot comments from PR #29 review.
