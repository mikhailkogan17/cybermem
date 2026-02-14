# Auto-Token Generation

## Overview

CyberMem automatically generates secure API tokens when they are not provided during deployment. This eliminates the security risk of placeholder tokens like `sk-not-generated-yet` being used in production.

## How It Works

### 1. Ansible Deployment (Primary)

When deploying via the CLI (`npx @cybermem/cli install --rpi`), if no token is provided:

1. The Ansible playbook checks if `auth_token_value` is defined
2. If not defined AND no existing token file exists, it auto-generates:
   - A secure 32-character token: `sk-<32 hex chars>`
   - A unique token ID
   - A PBKDF2 hash of the token
3. The token is saved to:
   - File: `~/cybermem/secrets/om_api_key` (0600 permissions)
   - Database: `openmemory.sqlite` → `access_keys` table
4. The token is displayed in the deployment output with a warning to save it

### 2. Auth-Sidecar Failsafe (Secondary)

If the Ansible deployment somehow fails to generate a token, the auth-sidecar container will auto-generate one on first startup:

1. On startup, auth-sidecar checks for a token in this order:
   - `OM_API_KEY` environment variable
   - `/run/secrets/om_api_key` secret file
   - `/data/.cybermem_token` fallback file
2. If no token is found, it auto-generates one
3. The token is saved to:
   - File: `/data/.cybermem_token` (writable volume)
   - Database: `openmemory.sqlite` → `access_keys` table
4. The token is logged to container logs with a warning
5. Metadata about the token source can be retrieved via the `/token-info` endpoint (strictly localhost loopback only). Full tokens are never exposed over HTTP.

### 3. Dashboard Display

The dashboard Settings modal provides a secure way to view and manage tokens:
- **Masked Display**: By default, the UI displays a masked version of the token (e.g., `sk-abcd...efgh`) in input fields. This prevents accidental exposure during screen sharing or screenshots.
- **Secure Retrieval**: The raw token is available for the "Copy" button in authenticated sessions (Local Mode or via secure cookie).
- **Filesystem SSoT**: Users are encouraged to retrieve the full token directly from the server's filesystem for initial client configuration:
  - Docker secret: `~/cybermem/secrets/om_api_key`
  - Fallback: `/data/.cybermem_token` (inside volume)

## Security Considerations

- **Token Format**: All tokens use the `sk-` prefix followed by 32 cryptographically random hexadecimal characters
- **Hashing**: Tokens are hashed using PBKDF2 with 100,000 iterations and SHA-512
- **Storage**: Token files are created with 0600 permissions (owner read-only)
- **Salt**: A fixed salt is used for validation purposes (same as CLI)
- **Access**: Auto-generated tokens are only displayed once at generation time and via Dashboard Settings

## Migration from Placeholder Tokens

If you have an existing deployment with a placeholder token:

1. The auto-generation will not overwrite existing tokens
2. To regenerate:
   - Delete the existing token file: `rm ~/cybermem/secrets/om_api_key`
   - Restart the stack: `docker-compose down && docker-compose up -d`
   - Check the auth-sidecar logs: `docker logs cybermem-auth-sidecar`
   - Or retrieve from Dashboard Settings

## Debugging

### Check if token was auto-generated

```bash
# Check Ansible output
# Look for "AUTO-GENERATED SECURITY TOKEN" message

# Check auth-sidecar logs
docker logs cybermem-auth-sidecar 2>&1 | grep -i "auto-generated"

# Check token-info endpoint (Metadata diagnostics)
# Allowed from localhost loopback OR Docker bridge gateway (172.16.x.x - 172.31.x.x)
curl http://localhost:3001/token-info

# If the 403 Forbidden persists, run diagnostics from inside the container:
docker exec -it cybermem-auth-sidecar curl http://localhost:3001/token-info
```

### Verify token is working

```bash
# Get token from the secret file (SSoT)
TOKEN=$(cat ~/cybermem/secrets/om_api_key)

# Test with MCP endpoint
curl -H "Authorization: Bearer $TOKEN" http://localhost:8626/health
```

## Implementation Details

### Files Modified

- `packages/cli/templates/ansible/playbooks/deploy-cybermem.yml`:
  - Added token generation tasks
  - Added hash computation using Python
  - Added conditional logic to use auto-generated or provided token

- `packages/cli/templates/auth-sidecar/server.js`:
  - Added `generateToken()` function
  - Added `hashToken()` function
  - Added `storeTokenInDatabase()` function
  - Added fallback token loading from `/data/.cybermem_token`
  - Added `/token-info` endpoint

- `packages/cli/templates/auth-sidecar/package.json`:
  - Added `sqlite3` dependency

- `packages/cli/templates/auth-sidecar/Dockerfile`:
  - Added build dependencies for native modules

- `packages/dashboard/app/api/settings/route.ts`:
  - Added fallback token reading from `/data/.cybermem_token`

## Related Issues

- Fixes: https://linear.app/cybermem/issue/CM-47/security-rpi-prod-uses-placeholder-token-sk-not-generated-yet
