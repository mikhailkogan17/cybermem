# NPM OIDC Publishing Configuration

## Overview
This repository uses **pure OIDC authentication** for publishing npm packages. No npm tokens are required.

## Configuration

### GitHub Actions Workflow
The `publish.yml` workflow is configured for OIDC publishing:

1. **Permissions** (required):
   ```yaml
   permissions:
     id-token: write  # Required for OIDC
     contents: write
     packages: write
   ```

2. **Node.js Setup** (with registry-url):
   ```yaml
   - uses: actions/setup-node@v4
     with:
       node-version: "20"
       registry-url: "https://registry.npmjs.org"
       # This creates .npmrc that npm uses for OIDC authentication
       # NO NODE_AUTH_TOKEN needed - GitHub Actions injects OIDC token automatically
   ```

3. **Publish Command** (with --provenance):
   ```yaml
   - name: Publish to NPM (OIDC)
     run: |
       npm publish --access public --provenance
   ```

## How It Works

1. GitHub Actions generates an OIDC token with `id-token: write` permission
2. The `setup-node` action creates a `.npmrc` file with registry configuration
3. npm CLI (v9+) uses the OIDC token (automatically injected by GitHub Actions) to authenticate
4. The `--provenance` flag triggers OIDC authentication and creates a signed provenance statement
5. npm verifies the OIDC token with GitHub's identity provider
6. Package is published with cryptographic proof of origin

## Troubleshooting

### Error: "This command requires you to be logged in"
**Cause**: The `registry-url` parameter was NOT set in `actions/setup-node`, so npm cannot use OIDC authentication.

**Fix**: Add `registry-url: "https://registry.npmjs.org"` to the setup-node configuration.

### Error: "Access token expired or revoked"
**Cause**: The `NODE_AUTH_TOKEN` environment variable was set manually, conflicting with OIDC.

**Fix**: Remove any manual `NODE_AUTH_TOKEN` configuration. GitHub Actions injects the OIDC token automatically when `registry-url` is set.

### Error: "id-token permission required"
**Cause**: Missing `id-token: write` permission in workflow.

**Fix**: Add to top-level `permissions` block in workflow.

### Error: "provenance flag requires authentication"
**Cause**: npm version is too old (< 9.0.0).

**Fix**: Ensure Node.js 18+ is used (includes npm 9+).

## Benefits of OIDC

✅ **No token management**: No need to create, rotate, or secure npm tokens
✅ **Better security**: Short-lived tokens scoped to specific workflows
✅ **Provenance**: Cryptographic proof of package origin
✅ **Transparency**: Public provenance records in Sigstore

## References

- [npm Provenance Documentation](https://docs.npmjs.com/generating-provenance-statements)
- [GitHub OIDC for npm](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/about-security-hardening-with-openid-connect)
- [npm Publish with GitHub Actions](https://docs.npmjs.com/publishing-packages-from-github-actions-workflows)
