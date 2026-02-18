---
name: Feature Request
about: Submit a new feature for CyberMem
title: "feat: "
labels: ["enhancement"]
assignees: []
---

## Feature Decomposition
<!-- AGENT: You MUST fill this out before coding. -->

### Requirements
- [ ] List user requirements here
- [ ] ...

### Existing Patterns
- **Reference**: `path/to/similar/feature`
- **Pattern**: (e.g. "Use functional components", "Follow auth-sidecar pattern")

### Edge Cases
- [ ] Failure Mode 1: (e.g. Network Down)
- [ ] Failure Mode 2: (e.g. Read-only Filesystem)

## Verification
<!-- AGENT: Attach screenshots proving usage in relevant environments. Use the 16-Screen Rule for major features. -->

### Automated Tests
- [ ] `npm run test:e2e` (Local)
- [ ] `npm run test:e2e` (RPi - Read-only)

### Environments Verified
- [ ] **Local (localhost:8626)**
- [ ] **Local (k3d)**
- [ ] **RPi (Lan)**
- [ ] **RPi (Tailscale)**

### Visual Proof (Screenshots/Videos)
<!-- Attach media here -->
