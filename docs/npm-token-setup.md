# NPM Token Setup for GitHub Actions

## Issue
Publish workflow #42 failed with:
```
npm error 404 Not Found - PUT https://registry.npmjs.org/@cybermem%2fcli
npm notice Access token expired or revoked. Please try logging in again.
```

## Root Cause
The GitHub Actions workflow was missing the `NODE_AUTH_TOKEN` environment variable in the publish step. While OIDC provenance signing worked, npm still requires authentication via a token.

## Fix Applied
Added `NODE_AUTH_TOKEN` environment variable to the publish step in `.github/workflows/publish.yml`:

```yaml
- name: Publish to NPM (OIDC)
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
  run: |
    for pkg in packages/cli packages/mcp packages/dashboard; do
       (cd $pkg && npm publish --access public --provenance)
    done
```

## Required: Update NPM_TOKEN Secret

The repository owner needs to create or update the `NPM_TOKEN` secret in GitHub:

### Step 1: Generate NPM Token

1. Log in to [npmjs.com](https://www.npmjs.com/)
2. Go to Account Settings → Access Tokens
3. Click "Generate New Token" → "Granular Access Token"
4. Configure the token:
   - **Name**: `cybermem-github-actions`
   - **Expiration**: Choose appropriate duration (e.g., 1 year)
   - **Packages and scopes**: 
     - Select: `@cybermem/cli`, `@cybermem/mcp`, `@cybermem/dashboard`
     - Permissions: `Read and write`
   - **Organizations**: If using organization scope, grant access to `@cybermem` org
5. Click "Generate Token" and copy the token (starts with `npm_...`)

### Step 2: Add Secret to GitHub

1. Go to GitHub repository settings: `https://github.com/mikhailkogan17/cybermem/settings/secrets/actions`
2. Click "New repository secret"
3. Name: `NPM_TOKEN`
4. Value: Paste the npm token from Step 1
5. Click "Add secret"

### Step 3: Verify Setup

After adding the secret, trigger the publish workflow:

```bash
# Using GitHub CLI
gh workflow run publish.yml --field version_type=patch
```

## Alternative: OIDC-Only Publishing (Future)

NPM supports OIDC for publishing from GitHub Actions without requiring a token. To use this:

1. Remove `NODE_AUTH_TOKEN` from the workflow
2. Ensure npm version is >= 9.x (already satisfied)
3. The `--provenance` flag already enables OIDC

However, as of the current npm version, a token is still required even with OIDC provenance. Monitor npm updates for when token-less publishing becomes available.

## Troubleshooting

### Error: "404 Not Found"
- The package doesn't exist: First publish requires creating the package manually
- Token doesn't have permission: Ensure token has access to the `@cybermem` scope

### Error: "Access token expired"
- Token has expired: Generate a new token and update the GitHub secret
- Token was revoked: Check npm account for any security issues

### Error: "You do not have permission to publish"
- Account doesn't own the scope: Ensure your npm account has access to `@cybermem`
- Token permissions insufficient: Use "Automation" or "Publish" token type with write access

## Security Best Practices

1. **Use Granular Tokens**: Create tokens with minimal required permissions
2. **Set Expiration**: Always set an expiration date for tokens
3. **Rotate Regularly**: Update tokens every 6-12 months
4. **Monitor Usage**: Check npm audit logs for unauthorized access
5. **Use OIDC**: Combine token authentication with OIDC provenance for maximum security

## References

- [NPM Access Tokens Documentation](https://docs.npmjs.com/creating-and-viewing-access-tokens)
- [GitHub Actions npm Publishing](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)
- [npm Provenance](https://docs.npmjs.com/generating-provenance-statements)
