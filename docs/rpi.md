# Raspberry Pi Deployment

Deploy CyberMem to Raspberry Pi for edge AI memory.

## Overview

RPi deployment features:

- **Tailscale Funnel** for zero-config public HTTPS
- **SQLite** storage (SD card friendly)
- **Ollama** local embeddings (ARM optimized)
- **Low resource footprint** (~1GB RAM)

## Requirements

- Raspberry Pi 4/5 (4GB+ RAM recommended)
- Raspberry Pi OS (64-bit preferred)
- Docker installed
- Tailscale account (free tier works)

## Quick Deploy

```bash
# SSH into your Pi
ssh pi@raspberrypi.local

# Run on the Pi
npx @cybermem/cli init --rpi

# Or with HTTPS remote access
npx @cybermem/cli init --rpi --remote-access
```

## Tailscale Setup

### 1. Install Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

### 2. Enable Funnel

```bash
# Enable HTTPS funnel on port 8626
sudo tailscale funnel 8626
```

### 3. Get Your URL

```bash
tailscale funnel status
# Shows: https://your-machine-name.ts.net
```

## Architecture

```
Internet ──► Tailscale Funnel ──► Traefik:8626 ──► Core API
                                      │
                                      └──► Dashboard:3000
```

## Configuration

RPi configuration in `~/.cybermem/.env`:

```bash
# Target environment
CYBERMEM_TARGET=rpi

# Database
DATABASE_URL=sqlite:///data/openmemory.sqlite

# Embeddings
EMBEDDING_PROVIDER=ollama
OLLAMA_URL=http://ollama:11434

# Generated Security Token (required for remote access)
OM_TOKEN=sk-...
```

## Remote MCP Configuration

For AI clients connecting to your RPi:

```json
{
  "mcpServers": {
    "cybermem-rpi": {
      "command": "npx",
      "args": [
        "-y",
        "@cybermem/mcp",
        "--url",
        "https://your-rpi.ts.net:8626",
        "--token",
        "sk-your-token",
        "--client-name",
        "cursor"
      ]
    }
  }
}
```

## Platform Compatibility

> ⚠️ **64-bit OS Required**: Traefik and Prometheus require 64-bit Raspberry Pi OS. If using 32-bit userspace, use `traefik:v2.11` image.

Check your platform:

```bash
uname -m          # Should show: aarch64
getconf LONG_BIT  # Should show: 64
```

Access dashboard via Tailscale:

- **Dashboard**: https://your-rpi.ts.net:8626/dashboard

## Troubleshooting

### Container Crashes (Exit 159)

Platform mismatch — 32-bit Docker cannot run arm64 images.

:::caution 32-bit Userspace with 64-bit Kernel

If your kernel is aarch64 but Docker shows `linux/arm`, install 64-bit Docker static binary:

```bash
# Stop 32-bit Docker
sudo systemctl stop docker docker.socket

# Download arm64 Docker
curl -fsSL https://download.docker.com/linux/static/stable/aarch64/docker-27.5.1.tgz -o /tmp/docker.tgz

# Install to /usr/local/bin
sudo tar -xzf /tmp/docker.tgz -C /usr/local/bin --strip-components=1

# Start with new binary
sudo /usr/local/bin/dockerd &

# Verify
docker version  # Should show OS/Arch: linux/arm64
```

**Note**: After reboot, Docker will use 32-bit version again. Make permanent by updating systemd service.
:::

### Slow Embeddings

Ollama on Pi is slower. Consider:

```bash
# Use smaller model
docker exec cybermem-ollama ollama pull all-minilm
```

### SD Card Wear

Move data to USB drive:

```yaml
volumes:
  openmemory-data:
    driver_opts:
      device: /mnt/usb/cybermem
```

## Next Steps

- [HTTPS Setup](./https-setup.md) - Advanced SSL configuration
- [MCP Integration](./mcp.md) - Connect remote clients
