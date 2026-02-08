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

2. **Node.js Setup** (NO registry-url):
   ```yaml
   - uses: actions/setup-node@v4
     with:
       node-version: "20"
       # NO registry-url parameter! This would require NODE_AUTH_TOKEN
   ```

3. **Publish Command** (with --provenance):
   ```yaml
   - name: Publish to NPM (OIDC)
     run: |
       npm publish --access public --provenance
   ```

## How It Works

1. GitHub Actions generates an OIDC token with `id-token: write` permission
2. npm CLI (v9+) uses this token to authenticate via OIDC
3. The `--provenance` flag triggers OIDC authentication and creates a signed provenance statement
4. npm verifies the OIDC token with GitHub's identity provider
5. Package is published with cryptographic proof of origin

## Troubleshooting

### Error: "Access token expired or revoked"
**Cause**: The `registry-url` parameter was set in `actions/setup-node`, which creates a `.npmrc` expecting `NODE_AUTH_TOKEN`.

**Fix**: Remove `registry-url` from the setup-node configuration.

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
