
# Deployment Guide

CyberMem includes a universal deployment script `deploy.sh` that handles setup for various environments.

## Prerequisites

- **Docker & Docker Compose** (for Local)
- **Git**
- **Ansible** (for RPi)
- **Helm & Kubernetes** (for VPS)

## Quick Start (Local)

1. Clone the repository:
   ```bash
   git clone --recursive https://github.com/mikhailkogan/cybermem.git
   cd cybermem
   ```

2. Generate environment file:
   ```bash
   cp .env.example .env.local
   ```

3. Run deployment:
   ```bash
   ./deploy.sh --target local
   ```

## Environments

### Raspberry Pi
Use Ansible to deploy to a Raspberry Pi cluster.
```bash
./deploy.sh --target rpi
```

### VPS (Kubernetes)
Deploy to a VPS using K3s and Helm.
```bash
./deploy.sh --target vps
```

## Troubleshooting

If you encounter issues, verify that ports `8080` (API) and `3000` (Dashboard) are free.
