# CI/CD Workflow Diagram

This document describes the improved CI/CD pipeline for CyberMem releases.

## PR Validation Workflow

```mermaid
graph TB
    Start[Developer Opens PR] --> Lint[Lint & Danger]
    Start --> Validation[Pre-Merge Validation]
    
    Validation --> V1[Changeset Config Check]
    Validation --> V2[Version Consistency Check]
    Validation --> V3[NPM Publish Dry-Run]
    
    V1 --> V1A{Valid JSON?}
    V1A -->|Yes| V1B{Repo Configured?}
    V1A -->|No| Fail1[❌ Fail]
    V1B -->|Yes| V1C{Packages Exist?}
    V1B -->|No| Fail2[❌ Fail]
    V1C -->|Yes| Pass1[✅ Pass]
    V1C -->|No| Fail3[❌ Fail]
    
    V2 --> V2A{All Versions Match?}
    V2A -->|Yes| Pass2[✅ Pass]
    V2A -->|No| Fail4[❌ Fail]
    
    V3 --> V3A{Build Success?}
    V3A -->|Yes| V3B{Publish OK?}
    V3A -->|No| Fail5[❌ Fail]
    V3B -->|Yes| Pass3[✅ Pass]
    V3B -->|Already Published| Warn1[⚠️ Version exists<br/>Will auto-bump]
    V3B -->|Other Error| Fail6[❌ Fail]
    
    Lint --> E2E1[E2E: localhost-staging]
    Pass1 --> E2E1
    Pass2 --> E2E1
    Pass3 --> E2E1
    Warn1 --> E2E1
    
    E2E1 --> E2E2[E2E: localhost-prod]
    E2E2 --> E2E3[SSE Multi-Session Tests]
    E2E3 --> E2E4[Dashboard Tests]
    E2E4 --> E2E5[CLI Integration Tests]
    
    E2E5 --> Ready[✅ Ready to Merge]
```

## Release Workflow

```mermaid
graph TB
    Trigger[Manual Release Trigger] --> Input{Version Type}
    Input -->|patch/minor/major| AutoCS[Auto-Generate Changeset]
    Input -->|none| CheckCS{Changesets Exist?}
    
    CheckCS -->|Yes| Prereq[✅ Prerequisites Pass]
    CheckCS -->|No| FailCS[❌ Fail: No Changesets]
    AutoCS --> Prereq
    
    Prereq --> E2E[Run E2E Tests]
    E2E --> Build[Build Docker Images<br/>Multi-Arch: amd64, arm64]
    
    Build --> Publish[NPM Publish Job]
    Publish --> P1[Apply Changesets]
    P1 --> P2{Version Published?}
    P2 -->|Yes| P3[Auto-Bump Patch]
    P2 -->|No| P4[Use Changeset Version]
    P3 --> P5[Build Packages]
    P4 --> P5
    P5 --> P6[Publish to NPM]
    P6 --> P7[Slack Notification]
    
    P6 --> Deploy[Deploy to RPi]
    Deploy --> D1[Setup Tailscale]
    D1 --> D2[Run Ansible Playbook]
    D2 --> D3[Pull :latest Images]
    D3 --> D4[Health Check]
    D4 --> D5[Slack Notification]
    
    P6 --> Finalize[Finalize Job]
    Finalize --> F1[Apply Changesets Again]
    F1 --> F2[Align Versions]
    F2 --> F3[Extract Release Notes]
    F3 --> F4[Create Release Branch]
    F4 --> F5[Open PR with Auto-Merge]
    F5 --> F6[Wait for PR Merge]
    F6 --> F7[Create Git Tag]
    F7 --> F8[Create GitHub Release]
    F8 --> F9[Slack Notification]
```

## Validation Gates

### Pre-Merge Validation Gates

| Gate | Purpose | Failure Impact |
|------|---------|----------------|
| **Changeset Config** | Ensure `.changeset/config.json` is valid | Prevents release workflow failures |
| **Version Consistency** | All linked packages have same version | Prevents NPM publish conflicts |
| **NPM Dry-Run** | Package structure is publishable | Detects build/packaging issues early |
| **Lint & Danger** | Code quality and PR completeness | Maintains code standards |

### E2E Test Matrix

| Environment | Port | Purpose |
|-------------|------|---------|
| **localhost-staging** | 8625 | Staging configuration validation |
| **localhost-prod** | 8626 | Production configuration validation |

### SSE Transport Tests

| Test | Purpose |
|------|---------|
| **Multi-Session** | Validates concurrent connections |
| **Rapid Connect/Disconnect** | Tests connection cleanup |
| **Malformed Requests** | Ensures graceful error handling |
| **Missing Headers** | Validates fallback behavior |

## Success Metrics

### Release Prep Time Reduction

**Before (0.12-0.14):**
- ~60% of commits for CI/CD stabilization
- Average 20+ fix commits per release
- Root causes: NPM OIDC, ARM64 builds, version mismatches

**Target (0.15+):**
- ≤20% of commits for CI/CD stabilization
- ≤3 fix commits per release
- Early validation catches issues before merge

### Key Improvements

1. **Early Failure Detection**: Validation gates run on every PR
2. **Version Management**: Automated version consistency checks
3. **SSE Stability**: Dedicated multi-session transport tests
4. **Documentation**: Release stability checklist with common failure modes
5. **Local Testing**: `npm run validate` script for pre-push checks

## Troubleshooting

See [CONTRIBUTING.md](../CONTRIBUTING.md#release-stability-checklist) for:
- Pre-release checklist
- Common failure modes and solutions
- Post-release verification steps
