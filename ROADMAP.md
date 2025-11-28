# CyberMem Development Roadmap

**Goal:** Production-ready AI memory system with per-client monitoring and multi-platform deployment

**Timeline:** 20 working days (1 month)

**Current Phase:** Phase 1 - Infrastructure Monitoring Setup

---

## Quick Reference

| Phase | Days | Status | Deliverable |
|-------|------|--------|-------------|
| **Phase 1** | 1-2 | 🔄 In Progress | OpenMemory + Prometheus metrics |
| **Phase 2** | 3-4 | ⏳ Pending | Docker Compose + observability |
| **Phase 3** | 5 | ⏳ Pending | Data encryption |
| **Phase 4** | 6-8 | ⏳ Pending | Helm chart for k8s |
| **Phase 5** | 9-11 | ⏳ Pending | Terraform VPS |
| **Phase 6** | 12-13 | ⏳ Pending | Raspberry Pi support |
| **Phase 7** | 14 | ⏳ Pending | Universal deploy script |
| **Phase 8** | 15-17 | ⏳ Pending | CI/CD pipeline |
| **Phase 9** | 18-20 | ⏳ Pending | Documentation |

---

## Architecture Overview

```
Client Request (Authorization: Bearer client_123.key)
    ↓
Traefik (reverse proxy + access logs)
    ↓ JSON logs with client_id
Vector (log parser)
    ↓ extracts client_id, generates metrics
Prometheus ← scrapes Vector + postgres_exporter
    ↓
Grafana dashboards (per-client metrics)

OpenMemory (git submodule, no modifications)
    ↓ writes to
PostgreSQL
    ↑ reads from
postgres_exporter (custom SQL queries)
```

**Key Decisions:**
- ✅ OpenMemory as git submodule (zero maintenance)
- ✅ Pure DevOps approach (no application code)
- ✅ Traefik + Vector for metrics extraction
- ✅ postgres_exporter for database metrics
- ✅ SQLite (local/RPi) + PostgreSQL (VPS)
- ✅ Encryption at rest (PostgreSQL config)
- ✅ Docker Compose + Helm (both platforms)

---

## Phase 1: Infrastructure Monitoring Setup ⏱️ Days 1-2

**Goal:** OpenMemory running locally with per-client Prometheus metrics (pure DevOps)

### Tasks
- [x] Research OpenMemory architecture
- [x] Add OpenMemory as git submodule
- [ ] Create Traefik configuration (access logs with Authorization header)
- [ ] Create Vector configuration (parse logs, extract client_id, export metrics)
- [ ] Create postgres_exporter queries (per-client memory counts)
- [ ] Test metrics collection: `curl localhost:9091/metrics`

### Metrics to Collect
- `openmemory_requests_total{client, method, endpoint, status}` (from Traefik logs via Vector)
- `openmemory_request_duration_seconds{client, endpoint}` (from Traefik logs via Vector)
- `openmemory_stored_memories{client}` (from PostgreSQL via postgres_exporter)
- `openmemory_stored_memories_by_sector{client, sector}` (from PostgreSQL)

### Files to Create
- `monitoring/traefik/traefik.yml` (access logs config)
- `monitoring/vector/vector.toml` (log parsing + metrics export)
- `monitoring/postgres_exporter/queries.yml` (custom SQL queries)
- `docker/.env.example`

---

## Phase 2: Docker Compose Stack ⏱️ Days 3-4

**Goal:** Full local stack with monitoring

### Stack Services
```yaml
traefik:              # port 8080 (main entry), 9090 (dashboard)
openmemory:           # internal port 8081
postgres:             # port 5432
vector:               # port 9091 (metrics)
postgres_exporter:    # port 9187 (metrics)
prometheus:           # port 9090
grafana:              # port 3000
alertmanager:         # port 9093
ollama:               # port 11434 (optional)
```

### Tasks
- [ ] Create `docker/docker-compose.yml` with all services
- [ ] Create `docker/docker-compose.ollama.yml` (optional overlay)
- [ ] Configure Prometheus scrape config (Vector + postgres_exporter targets)
- [ ] Create Grafana dashboard "OpenMemory by Client"
- [ ] Setup alert rules (high error rate, low memory count)
- [ ] Test full stack: `docker-compose up`
- [ ] Verify metrics flow: Traefik → Vector → Prometheus → Grafana

### Files to Create
- `docker/docker-compose.yml`
- `docker/docker-compose.ollama.yml`
- `docker/.env.example`
- `monitoring/prometheus/prometheus.yml`
- `monitoring/prometheus/alert_rules.yml`
- `monitoring/grafana/dashboards/openmemory.json`

**Checkpoint:** Demo working stack locally with per-client metrics

---

## Phase 3: Encryption ⏱️ Day 5

**Goal:** Data encrypted at rest and in transit

### Tasks
- [ ] Configure PostgreSQL encryption (pgcrypto extension)
- [ ] Add Traefik TLS termination (Let's Encrypt)
- [ ] Generate self-signed certs for local dev
- [ ] Create secrets generation script
- [ ] Test encrypted storage and TLS

### Files to Create
- `monitoring/traefik/tls.yml` (TLS configuration)
- `scripts/generate-secrets.sh` (DB encryption keys)
- `docker/postgres/init-encryption.sql` (pgcrypto setup)
- Update `docker/.env.example` with encryption vars

---

## Phase 4: Helm Chart ⏱️ Days 6-8

**Goal:** Production-ready Kubernetes deployment

### Umbrella Chart Dependencies
```yaml
- prometheus (27.46.0)
- grafana (10.2.0)
- postgresql (15.0.0)
```

### Tasks
- [ ] Create `charts/cybermem/Chart.yaml` with dependencies
- [ ] Create custom templates (deployment, service, ingress)
- [ ] Setup Files.Glob for configs
- [ ] Create Sealed Secrets for API keys
- [ ] Test in k3d cluster

### Files to Create
- `charts/cybermem/Chart.yaml`
- `charts/cybermem/values.yaml`
- `charts/cybermem/configs/prometheus.yml`
- `charts/cybermem/configs/alert_rules.yml`
- `charts/cybermem/configs/dashboards/openmemory.json`
- `charts/cybermem/templates/` (6 templates)
- `charts/INSTALL.md`

**Test:**
```bash
k3d cluster create cybermem --port 8080:80@loadbalancer
helm install cybermem charts/cybermem
```

**Checkpoint:** Working k8s deployment

---

## Phase 5: Terraform VPS ⏱️ Days 9-11

**Goal:** Automated VPS provisioning + k3s

### Modules
1. `hetzner-vps`: Create server (CX22, €5.83/mo)
2. `k3s-cluster`: Install k3s via cloud-init
3. `networking`: Firewall + DNS

### Tasks
- [ ] Create Terraform modules
- [ ] Add cloud-init script for k3s
- [ ] Configure firewall rules (80, 443, 6443)
- [ ] Test provisioning workflow
- [ ] Deploy Helm chart to VPS

### Files to Create
- `terraform/main.tf`
- `terraform/modules/hetzner-vps/main.tf`
- `terraform/modules/k3s-cluster/cloud-init.yaml`
- `terraform/variables.tf`
- `terraform/outputs.tf`

**Checkpoint:** VPS deployed via Terraform

---

## Phase 6: Raspberry Pi Support ⏱️ Days 12-13

**Goal:** Deploy to RPi via Ansible

### Playbooks
1. `setup-rpi.yml`: Docker + firewall
2. `deploy-cybermem.yml`: SQLite variant

### Tasks
- [ ] Create Ansible playbooks
- [ ] Configure SQLite backend for RPi
- [ ] Enable Ollama for offline mode
- [ ] Test deployment to RPi

### Files to Create
- `ansible/playbooks/setup-rpi.yml`
- `ansible/playbooks/deploy-cybermem.yml`
- `ansible/inventory/hosts.ini`
- `ansible/group_vars/rpi.yml`

---

## Phase 7: Universal Deploy Script ⏱️ Day 14

**Goal:** Single command for any platform

### Features
```bash
./deploy.sh --target local                    # Docker Compose
./deploy.sh --target rpi --host 192.168.1.50  # Ansible
./deploy.sh --target vps --cloud hetzner      # Terraform + Helm
```

### Tasks
- [ ] Build deploy.sh with platform detection
- [ ] Add prerequisite validation
- [ ] Generate secrets automatically
- [ ] Add health check validation
- [ ] Output access URLs

### Files to Create
- `scripts/deploy.sh`
- `scripts/lib/common.sh`
- `scripts/lib/validate.sh`
- `scripts/test-metrics.sh`

---

## Phase 8: CI/CD Pipeline ⏱️ Days 15-17

**Goal:** Automated build, test, deploy

### Workflows
1. `build.yml`: Multi-arch images (amd64/arm64)
2. `test.yml`: Integration tests
3. `deploy-dev.yml`: Auto-deploy to dev VPS

### Tasks
- [ ] Create GitHub Actions workflows
- [ ] Setup GHCR for Docker images
- [ ] Add integration tests
- [ ] Configure auto-deploy
- [ ] Test full CI/CD pipeline

### Files to Create
- `.github/workflows/build.yml`
- `.github/workflows/test.yml`
- `.github/workflows/deploy-dev.yml`
- `tests/integration/test_metrics.sh`

---

## Phase 9: Documentation ⏱️ Days 18-20

**Goal:** Interview-ready documentation

### Files to Create
1. **README.md**
   - Project overview
   - Quick start (3 commands)
   - Architecture diagram (mermaid)
   - Screenshots

2. **ARCHITECTURE.md**
   - System design
   - Data flow
   - Security model
   - Scaling strategy

3. **METRICS.md**
   - Prometheus metrics reference
   - PromQL examples
   - Alert rules

4. **DEPLOYMENT.md**
   - Platform guides
   - Troubleshooting
   - Cost estimation

**Final Checkpoint:** Ready for job applications ✅

---

## Metrics to Implement

### Per-Client Metrics
```promql
# Request rate by client
sum(rate(openmemory_requests_total{client="client_123"}[5m])) by (endpoint)

# Write/Read rates
rate(openmemory_memory_writes_total{client="client_123"}[5m])
rate(openmemory_memory_reads_total{client="client_123"}[5m])

# Total memories stored
openmemory_stored_memories{client="client_123"}

# Latency p95
histogram_quantile(0.95,
  rate(openmemory_request_duration_seconds_bucket{client="client_123"}[5m])
)
```

---

## Interview Talking Points

### HR Filter (2 min)
"CyberMem is an AI memory system with production DevOps infrastructure. It deploys to any platform—laptop, Raspberry Pi, cloud VPS—with a single command. Built to showcase my transition from iOS Platform Lead to DevOps, combining infrastructure experience with new skills in Kubernetes, Terraform, and observability."

### Tech Lead Filter (10 min)
- **Monitoring:** Grafana dashboard with per-client metrics
- **Security:** Sealed Secrets, encryption at rest/transit
- **Deployment:** Live demo `./deploy.sh --target vps`
- **Resource constraints:** SQLite for RPi (1GB RAM), PostgreSQL for VPS

### Hands-on Challenge (5 min)
```bash
./deploy.sh --target local
# Wait 1 minute
open http://localhost:3000  # Grafana
# Filter by client_id → show metrics
```

---

## Success Criteria

✅ **Functional:**
- [ ] OpenMemory stores/retrieves memories
- [ ] Metrics show per-client data
- [ ] Deploy to local/RPi/VPS works
- [ ] Data encrypted

✅ **DevOps Skills:**
- [ ] Docker multi-stage builds
- [ ] Kubernetes (Deployment, Service, Ingress)
- [ ] Helm umbrella charts + Files.Glob
- [ ] Terraform modules
- [ ] Prometheus custom metrics
- [ ] Grafana dashboards
- [ ] CI/CD pipeline
- [ ] Multi-arch support

✅ **Interview Ready:**
- [ ] 5-min demo
- [ ] 10-min architecture explanation
- [ ] 15-min live VPS deployment

---

**Next:** Start Phase 1 - Create Traefik and Vector configurations for metrics collection
