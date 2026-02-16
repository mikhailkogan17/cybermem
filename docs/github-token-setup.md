# GitHub Token Configuration for Publish Workflow

## Overview

The `publish.yml` workflow's finalize job uses the default `GITHUB_TOKEN` provided by GitHub Actions to create pull requests and push changes.

## Root Cause of Previous Failures

The finalize job was failing intermittently **not** due to token permissions, but because:
1. `continue-on-error: true` was set at the job level, masking real failures
2. No error diagnostics made it difficult to identify issues

## What Was Fixed

### 1. Removed Job-Level `continue-on-error`
The `continue-on-error: true` directive was hiding actual failures. It has been:
- **Removed** from the finalize job level
- **Kept only** for Slack notifications (non-critical)

### 2. Added Token Verification
A verification step now checks token access before any operations:
```yaml
- name: Verify GitHub Token Permissions
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  run: |
    if ! gh auth status 2>&1; then
      echo "❌ ERROR: GitHub token is not properly configured"
      exit 1
    fi
```

### 3. Enhanced Error Diagnostics
All critical operations now have proper error handling:
- **Push errors**: Detailed messages about branch protection, network issues
- **PR creation errors**: Specific guidance on common failures
- **Auto-merge errors**: Non-fatal warnings (PR still created)
- **Empty commits**: Skip PR creation if no changes

## GITHUB_TOKEN Permissions

The default `GITHUB_TOKEN` provided by GitHub Actions has sufficient permissions for this workflow:
- ✅ Create and update pull requests
- ✅ Push to branches (including creating release branches)
- ✅ Create releases
- ✅ Read repository contents

**Note**: The `GITHUB_TOKEN` **cannot** push directly to protected branches (like `main`), which is why the workflow creates a PR instead. This is by design and correct behavior.

## Workflow Behavior

The finalize job will now:
1. Verify token permissions upfront
2. Create version bump commits on a release branch
3. Push the release branch (not directly to `main`)
4. Create a PR for review and merging
5. Enable auto-merge if repository settings allow
6. Wait for PR merge, then create GitHub Release
7. Fail properly if any step encounters an error (except Slack notifications)

## Troubleshooting

### Error: "Failed to push release branch"

**Possible causes**:
- Network connectivity issues
- Branch protection rules preventing branch creation
- Repository permissions

**Solution**: Check repository settings and network. The default `GITHUB_TOKEN` should work.

### Error: "Failed to create PR"

**Possible causes**:
- A PR already exists for this release branch
- Repository settings prevent PR creation
- Token expired or invalid

**Solution**: Check for existing PRs with the same branch name, verify repository settings.

### Warning: "Could not enable auto-merge for PR"

**This is not an error** - the PR was created successfully. Auto-merge may not be enabled in repository settings or may require additional checks to pass.

**Action**: Manually merge the PR or enable auto-merge in repository settings.

## Migration Notes

If you previously had `PUBLISH_GITHUB_TOKEN` configured:
- It is no longer needed or used
- The workflow uses only the default `GITHUB_TOKEN`
- No action required - the workflow will work as before

## Key Takeaway

**The main fix was removing `continue-on-error: true` from the job level**, which was masking failures. The token permissions were not the root cause - the default `GITHUB_TOKEN` has always had sufficient permissions for this workflow.
