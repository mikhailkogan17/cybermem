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

## Implementation
### Changes
- **[NEW]** `path/to/new/file`
- **[MOD]** `path/to/modified/file`

## Verification
<!-- AGENT: Attach screenshots proving usage in 4 environments (16-Screen Rule). -->

### Local (localhost:8626)
![Local Dashboard](...)

### Local (k3d)
![k3d Dashboard](...)

### RPi (Lan)
![RPi Local](...)

### RPi (Tailscale)
![RPi Remote](...)
