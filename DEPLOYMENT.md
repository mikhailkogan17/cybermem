# CyberMem Deployment Guide

## Quick Start

### Local Development (Build from Source)
```bash
./deploy.sh --target local
```

### Local with Pre-built Images (Faster)
```bash
USE_PREBUILT=1 ./deploy.sh --target local
```

### Raspberry Pi
```bash
# First push: Ensure images are built in CI and pushed to GHCR
# Then deploy to RPi
./deploy.sh --target rpi
```

### VPS (Kubernetes)
```bash
./deploy.sh --target vps
```

## Image Build Strategy

**GitHub Actions** automatically builds multi-arch images (amd64 + arm64) on every push to `main`:
- `ghcr.io/mikhailkogan/cybermem-openmemory:latest`
- `ghcr.io/mikhailkogan/cybermem-dashboard:latest`
- `ghcr.io/mikhailkogan/cybermem-db_exporter:latest`
- `ghcr.io/mikhailkogan/cybermem-log_exporter:latest`

**Benefits:**
- ✅ No local builds on slow devices (RPi)
- ✅ Consistent images across environments
- ✅ ARM64 support out of the box
- ✅ Cached layers in CI

## Testing MCP Locally

```bash
# After deployment
./scripts/test_mcp_local.sh
```

## Access Points

- **Dashboard**: http://localhost:3000
- **OpenMemory API**: http://localhost:8080
- **MCP Endpoint**: http://localhost:8080/mcp
- **Prometheus**: http://localhost:9092
- **Traefik Dashboard**: http://localhost:8081

## Troubleshooting

### Images not found
Make sure the workflow ran successfully and images are public in GHCR.

### RPi deployment fails
Check that:
1. SSH access works: `ssh pi@raspberrypi.local`
2. Docker is installed on RPi
3. Ansible is installed locally: `brew install ansible`

### Local SQLite permission errors
Reset volumes:
```bash
docker-compose down -v
./deploy.sh --target local
```
