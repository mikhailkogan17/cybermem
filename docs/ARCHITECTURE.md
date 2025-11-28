# CyberMem Architecture

This document describes the system design and architectural decisions for CyberMem.

## Overview

CyberMem is a production-grade AI memory system with per-client monitoring and multi-platform deployment support. It wraps [OpenMemory](https://github.com/CaviraOSS/OpenMemory) with a pure DevOps infrastructure layer—no application code modifications.

## System Architecture

```
Client Request (Authorization: Bearer client_123.secret_key)
    ↓
┌─────────────────────────────────────────────────┐
│ Traefik (Reverse Proxy + Access Logs)          │
│ - Logs client_id from Authorization header     │
│ - JSON access logs → /var/log/traefik/         │
└─────────────┬──────────────────┬────────────────┘
              ↓                  ↓
┌─────────────────────┐   ┌─────────────────────┐
│ Vector              │   │ OpenMemory          │
│ - Parses logs       │   │ (Git Submodule)     │
│ - Extracts client_id│   │ - Stores memories   │
│ - Generates metrics │   │ - Writes user_id    │
│ - Exports :9091     │   └──────────┬──────────┘
└─────────┬───────────┘              ↓
          ↓                  ┌─────────────────────┐
┌─────────────────────┐      │ PostgreSQL / SQLite │
│ Prometheus          │      └──────────┬──────────┘
│ - Scrapes Vector    │                 ↓
│ - Scrapes PG export │      ┌─────────────────────┐
│ - Stores metrics    │←─────│ postgres_exporter   │
└─────────┬───────────┘      │ - Per-client counts │
          ↓                  │ - Sector breakdowns │
┌─────────────────────┐      └─────────────────────┘
│ Grafana             │
│ - Visualizes metrics│
│ - Per-client views  │
└─────────────────────┘
```

## Key Design Decisions

### 1. OpenMemory as Git Submodule (Not Fork)

**Decision:** Use OpenMemory as an unmodified git submodule.

**Rationale:**
- **Zero maintenance overhead:** Security patches and features come from upstream
- **Clean separation:** DevOps infrastructure wraps the app without coupling
- **Updatable:** `git submodule update --remote` pulls latest changes
- **Production best practice:** Don't fork unless absolutely necessary

**Alternative considered:** Fork OpenMemory to add metrics middleware
- **Rejected because:** Requires maintaining Python code, breaks upstream updates

### 2. Pure DevOps Monitoring (No Application Code)

**Decision:** Extract metrics from logs and database, not application instrumentation.

**Approach:**
- **Traefik access logs** → JSON with Authorization header
- **Vector log parser** → Extracts client_id, generates Prometheus metrics
- **postgres_exporter** → Queries OpenMemory's native `user_id` column

**Rationale:**
- **Language-agnostic:** Works with any backend (Python, Go, Rust)
- **Non-invasive:** No code changes to OpenMemory
- **Production-proven:** Vector handles millions of events/sec in production

**Alternative considered:** Add Prometheus client library to OpenMemory
- **Rejected because:** Violates "no code changes" principle, harder to maintain

### 3. Multi-Platform Support

**Decision:** Single codebase deploys to local/Raspberry Pi/VPS.

**Implementation:**

| Platform | Orchestrator | Database | Embeddings | RAM |
|----------|-------------|----------|------------|-----|
| **Local** | Docker Compose | SQLite | Ollama | 4GB+ |
| **Raspberry Pi** | Docker Compose (via Ansible) | SQLite | Ollama | 1GB |
| **VPS** | Kubernetes (Helm) | PostgreSQL | OpenAI API | 4GB+ |

**Rationale:**
- **Developer experience:** Test locally before deploying
- **Edge deployment:** RPi for privacy-first users
- **Cloud scalability:** VPS for multi-user scenarios

### 4. Kompose for Kubernetes Manifests

**Decision:** Generate k8s YAML from `docker-compose.yml` using Kompose.

**Rationale:**
- **CNCF standard:** Industry-standard tool, not custom generator
- **Single source of truth:** Changes to `docker-compose.yml` propagate to k8s
- **Reduced boilerplate:** Automatically generates Deployments, Services, ConfigMaps

**Alternative considered:** Hand-write k8s manifests or custom Python generator
- **Rejected because:** More boilerplate, harder to maintain

### 5. Database Choice by Platform

**Decision:** SQLite for edge (local/RPi), PostgreSQL for cloud (VPS).

**Rationale:**

**SQLite:**
- ✅ Zero configuration
- ✅ Works in <1GB RAM (Raspberry Pi)
- ✅ No network overhead
- ❌ Single-writer limitation (fine for single-user)

**PostgreSQL:**
- ✅ Concurrent writes (multi-user VPS)
- ✅ Rich metrics via postgres_exporter
- ✅ Encryption at rest (pgcrypto extension)
- ❌ Requires 512MB+ RAM

## Data Flow

### Write Path

1. **Client sends request** with `Authorization: Bearer <client_id>.<secret>`
2. **Traefik** logs the request (client_id in header) and forwards to OpenMemory
3. **OpenMemory** stores memory in database with `user_id = client_id`
4. **Vector** parses Traefik logs, extracts `client_id`, increments `openmemory_requests_total` counter
5. **Prometheus** scrapes Vector metrics every 15 seconds
6. **Grafana** queries Prometheus and displays per-client write rate

### Read Path (Metrics)

1. **postgres_exporter** runs SQL query: `SELECT user_id, COUNT(*) FROM memories GROUP BY user_id`
2. **Prometheus** scrapes postgres_exporter metrics
3. **Grafana** displays total memories stored per client

## Metrics Design

### Application Metrics (from Traefik logs)

Collected by **Vector**, exposed at `:9091/metrics`:

```promql
# Total requests per client
openmemory_requests_total{client="client_123", method="POST", endpoint="/store"}

# Request duration histogram
openmemory_request_duration_seconds_bucket{client="client_123", endpoint="/store"}

# p95 latency
histogram_quantile(0.95,
  rate(openmemory_request_duration_seconds_bucket{client="client_123"}[5m])
)
```

### Database Metrics (from PostgreSQL)

Collected by **postgres_exporter**, exposed at `:9187/metrics`:

```promql
# Total memories stored per client
pg_openmemory_stored_memories{client="client_123"}

# Memories per sector per client
pg_openmemory_stored_memories_by_sector{client="client_123", sector="semantic"}

# Storage growth rate
rate(pg_openmemory_stored_memories{client="client_123"}[1h])
```

### Example Queries

**Top 5 clients by request volume:**
```promql
topk(5, sum(rate(openmemory_requests_total[5m])) by (client))
```

**Clients with high error rates:**
```promql
sum(rate(openmemory_requests_total{status=~"5.."}[5m])) by (client) > 0.1
```

**Total memories stored across all clients:**
```promql
sum(pg_openmemory_stored_memories)
```

## Security Model

### Data Encryption

- **At rest:** PostgreSQL pgcrypto extension (AES-256)
- **In transit:** TLS termination at Traefik (Let's Encrypt)
- **Secrets:** Kubernetes Sealed Secrets (VPS), environment variables (local)

### Authentication

- **Client authentication:** Bearer token in `Authorization` header
- **Format:** `client_123.secret_key` (client_id.api_key)
- **Validation:** Handled by OpenMemory (we only extract client_id for metrics)

### Network Security

- **Local:** Services communicate via Docker network (no external exposure)
- **VPS:** Firewall rules (80, 443, 6443 only), private k8s network

## Scaling Strategy

### Horizontal Scaling (VPS)

```yaml
# charts/cybermem/values-vps.yaml
openmemory:
  replicas: 3  # Run 3 pods behind load balancer
```

**Bottleneck:** PostgreSQL (single writer)

**Solution:** Connection pooling (PgBouncer) or read replicas

### Vertical Scaling (RPi)

**Constraint:** 1GB RAM on Raspberry Pi Zero 2 W

**Optimizations:**
- SQLite (no PostgreSQL overhead)
- Ollama with small model (e.g., `all-minilm`)
- Reduced Prometheus retention (7 days instead of 30)

### Resource Limits

| Service | CPU Request | Memory Limit |
|---------|-------------|--------------|
| OpenMemory | 100m | 512Mi |
| PostgreSQL | 50m | 512Mi |
| Prometheus | 100m | 512Mi |
| Vector | 50m | 128Mi |
| Grafana | 50m | 256Mi |

## Deployment Targets

### Local (Docker Compose)

**Use case:** Development, testing
**Command:** `./deploy.sh --target local`
**Access:** http://localhost:8080

### Raspberry Pi (Ansible + Docker Compose)

**Use case:** Edge deployment, privacy-first
**Command:** `./deploy.sh --target rpi`
**Hardware:** Raspberry Pi 3B+ or newer (1GB+ RAM)

### VPS (Kubernetes + Helm)

**Use case:** Production, multi-user
**Command:** `./deploy.sh --target vps`
**Provider:** Hetzner CX22 (2 vCPU, 4GB RAM, €5.83/mo)

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **App** | OpenMemory (Python/FastAPI) | AI memory storage |
| **Reverse Proxy** | Traefik | Load balancing, TLS, access logs |
| **Log Processing** | Vector | Parse logs → metrics |
| **Metrics Storage** | Prometheus | Time-series database |
| **Visualization** | Grafana | Dashboards |
| **Database** | PostgreSQL / SQLite | Memory persistence |
| **DB Metrics** | postgres_exporter | Database-level metrics |
| **Embeddings** | OpenAI API / Ollama | Vector embeddings |
| **Orchestration (Local)** | Docker Compose | Service management |
| **Orchestration (VPS)** | Kubernetes + Helm | Production orchestration |
| **Provisioning** | Terraform (future) | VPS provisioning |
| **Configuration** | Ansible | Raspberry Pi setup |

## Monitoring and Alerting

### Grafana Dashboards

1. **OpenMemory Overview**
   - Total requests/sec by client
   - Error rate (4xx, 5xx) by client
   - Request latency p95/p99

2. **Database Stats**
   - Memories stored per client
   - Growth rate (memories/hour)
   - Sector distribution (semantic, episodic, procedural)

3. **Infrastructure**
   - CPU/Memory usage per service
   - Disk I/O
   - Network traffic

### Alert Rules (Prometheus)

```yaml
# High error rate
- alert: HighErrorRate
  expr: |
    sum(rate(openmemory_requests_total{status=~"5.."}[5m])) by (client)
    / sum(rate(openmemory_requests_total[5m])) by (client) > 0.05
  for: 5m
  annotations:
    summary: "High error rate for client {{ $labels.client }}"

# Low memory growth (potential issue)
- alert: NoMemoryGrowth
  expr: |
    rate(pg_openmemory_stored_memories[1h]) == 0
  for: 24h
  annotations:
    summary: "No new memories for client {{ $labels.client }} in 24h"
```

## Future Enhancements

- **Multi-region deployment:** Deploy to multiple VPS regions (EU, US, Asia)
- **Read replicas:** PostgreSQL read replicas for query scaling
- **S3 backup:** Automated daily backups to S3-compatible storage
- **Tracing:** OpenTelemetry integration for distributed tracing
- **Rate limiting:** Per-client rate limits via Traefik middleware

## References

- [OpenMemory Documentation](https://github.com/CaviraOSS/OpenMemory)
- [Twelve-Factor App](https://12factor.net/)
- [Kubernetes Production Best Practices](https://kubernetes.io/docs/setup/best-practices/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/naming/)
