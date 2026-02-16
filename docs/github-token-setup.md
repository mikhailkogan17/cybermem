# GitHub Token Setup for Publish Workflow

## Overview

The `publish.yml` workflow requires proper GitHub token configuration to successfully create pull requests and push to protected branches during the finalize job.

## Token Requirements

### Option 1: Use PUBLISH_GITHUB_TOKEN (Recommended)

Create a Personal Access Token (PAT) or GitHub App token with the following permissions:

- **repo** (full control) - Required for:
  - Pushing to branches
  - Creating pull requests
  - Creating releases
  
- **workflow** - Required for:
  - Updating GitHub Actions workflows
  - Managing workflow files

### Option 2: Use Default GITHUB_TOKEN (Limited)

The default `GITHUB_TOKEN` provided by GitHub Actions has limited permissions:
- ✅ Can create PRs
- ✅ Can push to unprotected branches
- ❌ Cannot push to protected branches (like `main`)
- ❌ May have restrictions in some repository configurations

## Setup Instructions

### Creating a Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens
2. Click "Generate new token"
3. Configure the token:
   - **Token name**: `CYBERMEM_PUBLISH_TOKEN`
   - **Expiration**: Choose appropriate duration
   - **Repository access**: Select "Only select repositories" → Choose your repository
   - **Permissions**:
     - Repository permissions:
       - Contents: Read and write
       - Pull requests: Read and write
       - Workflows: Read and write
4. Generate and copy the token

### Adding the Secret to GitHub

1. Go to your repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `PUBLISH_GITHUB_TOKEN`
4. Value: Paste your token
5. Click "Add secret"

## Workflow Behavior

The workflow will automatically:
1. Try to use `PUBLISH_GITHUB_TOKEN` if available
2. Fall back to `GITHUB_TOKEN` if `PUBLISH_GITHUB_TOKEN` is not set
3. Verify token permissions before proceeding
4. Provide clear error messages if token lacks required permissions

## Troubleshooting

### Error: "Failed to push release branch"

**Cause**: Token doesn't have permission to push to the branch.

**Solutions**:
- Ensure `PUBLISH_GITHUB_TOKEN` is set with proper permissions
- Check that the token has not expired
- Verify branch protection rules allow the token to push

### Error: "Failed to create PR"

**Cause**: Token lacks pull request write permissions.

**Solutions**:
- Ensure the token has "Pull requests: Read and write" permission
- Check repository settings allow PR creation
- Verify the branch doesn't already have an open PR

### Error: "Could not enable auto-merge for PR"

**Cause**: Repository settings may not allow auto-merge or token lacks permissions.

**Solutions**:
- This is a warning, not an error - the PR is still created
- Check repository Settings → General → Allow auto-merge
- Manually merge the PR if needed

## Migration Guide

If you're migrating from the old workflow:

1. Create and configure `PUBLISH_GITHUB_TOKEN` secret (see above)
2. The workflow will automatically use the new token
3. No code changes are required
4. Existing `GITHUB_TOKEN` will still work as fallback for basic operations

## Security Notes

- Never commit tokens directly to the repository
- Use GitHub Secrets for storing tokens
- Regularly rotate tokens
- Use fine-grained tokens with minimal required permissions
- Consider using GitHub Apps for automated workflows (more secure than PATs)
