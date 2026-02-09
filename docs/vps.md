# Cloud/VPS Deployment

Production deployment on cloud VPS or Kubernetes.

## Overview

Cloud deployment features:

- **PostgreSQL** for reliable storage
- **OpenAI embeddings** (high quality)
- **Traefik auto-cert** or Caddy for HTTPS
- **Horizontal scaling** via Kubernetes

## VPS Quick Deploy

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Run on the VPS
npx @cybermem/cli init --vps
```

## Kubernetes (Helm)

### Prerequisites

- K8s cluster (K3s, EKS, GKE, etc.)
- Helm 3+
- kubectl configured

### Install

```bash
# Add CyberMem Helm repo
helm repo add cybermem https://charts.cybermem.dev
helm repo update

# Install with default values
helm install cybermem cybermem/cybermem \
  --namespace cybermem \
  --create-namespace
```

### Custom Values

```yaml
# values.yaml
core:
  replicas: 2

database:
  type: postgresql
  external: false

embeddings:
  provider: openai

ingress:
  enabled: true
  host: memory.your-domain.com
  tls:
    enabled: true
```

```bash
helm install cybermem cybermem/cybermem -f values.yaml
```

## Docker Compose (VPS)

### 1. Clone and Configure

```bash
git clone https://github.com/mikhailkogan17/cybermem
cd cybermem/packages/cli/templates

# Copy and edit environment
cp .env.example .env
vim .env
```

### 2. Environment Variables

```bash
# Required
OPENAI_API_KEY=sk-...
OM_API_KEY=sk-...  # Generate with: openssl rand -hex 32

# PostgreSQL
POSTGRES_USER=cybermem
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=cybermem

# Domain (for Traefik auto-cert)
DOMAIN=memory.your-domain.com
ACME_EMAIL=admin@your-domain.com
```

### 3. Start Services

```bash
docker compose -f docker-compose.vps.yml up -d
```

## Architecture

```
Internet
    │
    ▼
┌─────────────────────────────────────┐
│            Load Balancer            │
└─────────────────┬───────────────────┘
                  │
    ┌─────────────┴─────────────┐
    ▼                           ▼
┌────────┐                 ┌────────┐
│Traefik │  ◄── HTTPS ──►  │Traefik │
└────┬───┘                 └────┬───┘
     │                          │
     ▼                          ▼
┌────────────────────────────────────┐
│         CyberMem Core Pods         │
└─────────────────┬──────────────────┘
                  │
                  ▼
         ┌────────────────┐
         │   PostgreSQL   │
         │   (Replicated) │
         └────────────────┘
```

## Monitoring

CyberMem comes with a built-in Monitoring Dashboard that tracks:

- Success rate and error counts
- Memory record growth
- Request latency and throughput
- Detailed audit logs

The dashboard uses a direct SQLite-to-Charts engine for high-performance visualization without external dependencies.

## Security

### API Key Rotation

```bash
# Generate new key
NEW_KEY=$(openssl rand -hex 32)

# Update environment
echo "OM_API_KEY=sk-$NEW_KEY" >> .env

# Restart services
docker compose restart cybermem-core
```

### Network Policies (K8s)

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: cybermem-ingress
spec:
  podSelector:
    matchLabels:
      app: cybermem-core
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: traefik
```

## Scaling

### Horizontal Pod Autoscaler

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: cybermem-core
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: cybermem-core
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
```

## Next Steps

- [MCP Integration](./mcp.md) - Connect AI clients
- [HTTPS Setup](./https-setup.md) - SSL configuration
