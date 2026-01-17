# Security & Privacy

CyberMem is designed with a "Local-First" philosophy. Your AI's memory belongs to you, and only you.

## Core Principles

### 🗄️ Local Storage

All memory vectors and entity graphs are stored in a local SQLite database on your filesystem. No data is ever sent to CyberMem or any third-party cloud.

### 👁️ No Telemetry

The core binary contains zero usage tracking or analytics. The only network requests made are those you explicitly configure (e.g., to your LLM provider).

### 🔐 Encryption At Rest

We support standard filesystem encryption. On RPi and VPS deployments, we recommend using LUKS or similar disk encryption for maximum security.

### 🔑 Your Keys, Your Control

API keys for LLM providers (OpenAI, Anthropic, etc.) are stored in your local `.env` file or passed at runtime. They are never logged or exported.

## Security by Environment

| Environment | Auth Required | HTTPS    | Notes                                     |
| ----------- | ------------- | -------- | ----------------------------------------- |
| **Local**   | No            | No       | Keyless access for localhost              |
| **RPi**     | Yes           | Optional | Use `--remote-access` for Tailscale HTTPS |
| **VPS**     | Yes           | Yes      | Auto-SSL via Caddy/Traefik                |

## Authentication Flow

### OAuth (Recommended - v0.7.0+)

CyberMem uses GitHub OAuth for secure, passwordless authentication.

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│  MCP Client │────▶│  cybermem.dev    │────▶│   GitHub    │
│  (Cursor)   │◀────│  /api/auth       │◀────│   OAuth     │
└─────────────┘     └──────────────────┘     └─────────────┘
       │
       │ JWT Token
       ▼
┌─────────────┐     ┌──────────────────┐
│   Traefik   │────▶│  auth-sidecar    │
│  (Gateway)  │◀────│  (ForwardAuth)   │
└─────────────┘     └──────────────────┘
       │
       ▼
┌─────────────┐
│ OpenMemory  │
└─────────────┘
```

**CLI Commands:**

```bash
npx @cybermem/mcp --login   # Open browser for GitHub OAuth
npx @cybermem/mcp --status  # Check auth status
npx @cybermem/mcp --logout  # Clear stored token
```

**Token storage:** `~/.cybermem/token.json`

### API Key (Deprecated)

> [!WARNING]
> API keys are deprecated as of v0.7.0 and will be removed in v0.8.0.
> Run `npx @cybermem/mcp --login` to switch to OAuth.

- **Local mode**: No API key required. Traefik accepts all localhost connections.
- **Remote mode**: API key or JWT validated by auth-sidecar before forwarding.

## Common Questions

### Does CyberMem train on my data?

No. CyberMem is a self-hosted infrastructure component. We have no access to your data, so training on it is physically impossible.

### What about the Cloud deployment?

Even when deployed to a cloud VPS (AWS, DigitalOcean), you control the instance. We provide the Docker image; you run it. We do not offer a managed SaaS version.

### How do I rotate my OAuth token?

```bash
npx @cybermem/mcp --logout
npx @cybermem/mcp --login
```

### How do I rotate API keys (deprecated)?

```bash
# Generate new key
NEW_KEY=$(openssl rand -hex 32)

# Update your .env
echo "OM_API_KEY=sk-$NEW_KEY" >> ~/.cybermem/.env

# Restart services
cd ~/.cybermem && docker-compose restart
```

## Reporting Vulnerabilities

If you discover a security vulnerability, please do **NOT** open a public issue. Contact the maintainer directly via [GitHub Security Advisories](https://github.com/mikhailkogan17/cybermem/security/advisories).
