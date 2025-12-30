
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

### Raspberry Pi (Ansible)
Deploy to a Raspberry Pi (or any Debian-based server) using existing credentials.

**Prerequisites:**
- Ansible (`brew install ansible`)
- SSH access to the RPi
- Valid `ansible/inventory/hosts.ini` (see existing file for template)

**Deployment:**
Since the repository might be private or local-only, the deployment uses `rsync` to sync your local files to the RPi.

1. Configure your inventory in `ansible/inventory/hosts.ini`:
   ```ini
   [rpi]
   raspberrypi.local ansible_user=pi ansible_ssh_pass=SECRET
   ```
2. Run the deploy script:
   ```bash
   ./deploy.sh --target rpi
   ```

This will:
- Install Docker & Docker Compose on the RPi
- Sync your project files (excluding git/cache)
- Start the services using the optimized `.env.rpi` config

### VPS (Helm / AWS / Generic K8s)
Deploy to a Kubernetes cluster (e.g., K3s on a VPS, EKS on AWS).

**Prerequisites:**
- `kubectl` configured for your cluster
- `helm` installed

**Deployment:**
The script includes an interactive wizard to generate `values-vps.yaml`.

1. Run the deploy script:
   ```bash
   ./deploy.sh --target vps
   ```
2. Follow the wizard to configure:
   - Domain name (Ingress)
   - API Keys
   - OpenMemory/OpenAI settings

For **AWS EKS**, ensure you have your `~/.kube/config` pointing to the EKS cluster. The Helm chart is agnostic but assumes an Nginx Ingress Controller by default.

## Troubleshooting

If you encounter issues, verify that ports `8080` (API) and `3000` (Dashboard) are free.
