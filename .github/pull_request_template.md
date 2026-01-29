# Description
<!-- What does this PR do? Why is it needed? Link to Jira/Task ID. -->

## Type of change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Refactor (code improvement)
- [ ] Ops/Infrastructure

## Verification Logic (The "Algorithm")
<!-- Describe the EXACT steps taken to verify this change. -->
1. **Environment**: [e.g. rpi-ts-staging, localhost]
2. **Commands Run**:
   ```bash
   npm run test:e2e
   ```
3. **Manual Check**:
   - [ ] Login Flow
   - [ ] Dashboard Load
   - [ ] MCP Modal matches strict environment table
   - [ ] Settings Eye reveals `sk-` token

## Evidence (The 16-Screen Rule)
<!-- Attach screenshots here. FAIL the PR if empty. -->
| Environment   | Dashboard | Stats | Auth |
| ------------- | --------- | ----- | ---- |
| Local         |           |       |      |
| RPi Tailscale |           |       |      |

## Checklist
- [ ] My code follows the style guidelines of this project
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation (`GEMINI.md`)
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes (`/pre_commit`)
