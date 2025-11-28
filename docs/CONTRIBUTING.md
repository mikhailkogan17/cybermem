# Contributing to CyberMem

Thank you for your interest in CyberMem! This document provides guidelines for contributing to the project.

## Development Philosophy

- **Infrastructure as Code**: All configurations are version-controlled
- **Production Patterns**: Use industry-standard tools (Kompose, Helm, Terraform)
- **Zero Application Code**: Pure DevOps approach—no modifications to OpenMemory
- **Documentation**: Code comments in English, thorough README

## Technology Choices

### Why These Tools?

**OpenMemory (Git Submodule)**
- Upstream maintenance: Security patches and features from CaviraOSS
- Zero fork overhead: Updates via `git submodule update --remote`
- Clean separation: Our DevOps infrastructure wraps the unmodified app

**Kompose for Kubernetes Manifests**
- CNCF-certified tool: Industry standard, not custom generator
- Single source of truth: `docker-compose.yml` → k8s manifests
- Reduced boilerplate: Automatic generation of Deployments, Services, ConfigMaps

**Traefik + Vector for Metrics**
- No middleware code: Extract metrics from access logs
- Production-proven: Vector handles millions of events/sec
- Language-agnostic: Works with any backend (Python, Go, Rust)

**Helm Umbrella Charts**
- Reusable components: Standard Prometheus/Grafana charts
- Platform-specific values: Override configs per deployment (local/RPi/VPS)
- Production pattern: Used by major projects (Rancher, GitLab)

**SQLite vs PostgreSQL**
- SQLite (local/RPi): Zero maintenance, <1GB RAM
- PostgreSQL (VPS): Production-grade, per-client metrics via postgres_exporter

## Architecture Decisions

The following analogies explain Kubernetes concepts using iOS/mobile patterns:

| Kubernetes | iOS/Mobile Equivalent | Purpose |
|------------|----------------------|---------|
| ConfigMap | Info.plist | App configuration |
| Secret | Keychain | Sensitive data storage |
| PVC | Documents directory (persistent) | Survives pod/app restarts |
| emptyDir | Cache directory | Deleted with pod |
| Service | NSNotificationCenter | Service discovery |
| Ingress | URL routing | External access |
| Deployment | App lifecycle | Rolling updates, replicas |

## Development Workflow

### Prerequisites

- **Local:** Docker 24+, Docker Compose 2.20+
- **Kubernetes:** kubectl, Helm 3.12+, k3d (for testing)
- **VPS:** Terraform 1.5+ (optional)
- **RPi:** Ansible 2.15+

### Local Development

```bash
# Clone with submodules
git clone --recursive https://github.com/mikhailkogan/cybermem.git
cd cybermem

# Start local stack
./deploy.sh --target local

# Verify services
curl http://localhost:8080/health  # OpenMemory
curl http://localhost:9091/metrics # Vector metrics
open http://localhost:3000         # Grafana (admin/admin)

# View logs
docker-compose logs -f openmemory

# Stop services
./deploy.sh --target local --action down
```

### Testing Changes to docker-compose.yml

```bash
# Validate syntax
docker-compose config

# Test locally
docker-compose up --build

# Regenerate k8s manifests
kompose convert -f docker-compose.yml -o charts/cybermem/templates/

# Test k8s deployment
k3d cluster create test
helm install cybermem charts/cybermem -f charts/cybermem/values-local.yaml
kubectl get pods,svc

# Cleanup
k3d cluster delete test
```

### Testing Metrics Pipeline

```bash
# Send test request with client_id
curl -X POST http://localhost:8080/api/store \
  -H "Authorization: Bearer client_123.secret_key" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test memory", "userId": "client_123"}'

# Check Vector metrics
curl http://localhost:9091/metrics | grep openmemory_requests_total

# Query Prometheus
curl 'http://localhost:9090/api/v1/query?query=openmemory_requests_total{client="client_123"}'

# Verify in Grafana
open http://localhost:3000/d/openmemory
```

## Git Workflow

### Commit Messages

Use conventional commit format:

```
feat: add Alertmanager integration
fix: correct Vector client_id extraction regex
docs: update METRICS.md with new queries
refactor: simplify deploy.sh error handling
```

### Branching Strategy

- `main`: Production-ready code
- `feature/<name>`: New features
- `fix/<name>`: Bug fixes

### Pull Request Process

1. Fork the repository
2. Create feature branch: `git checkout -b feature/add-alerting`
3. Make changes and test locally
4. Update documentation if needed
5. Submit PR with description of changes

## Project Structure

```
cybermem/
├── external/openmemory/          # Git submodule (no modifications)
├── monitoring/
│   ├── traefik/traefik.yml       # Access logs config
│   ├── vector/vector.toml        # Log parsing → metrics
│   ├── prometheus/prometheus.yml # Scrape config
│   ├── postgres_exporter/        # Per-client DB metrics
│   └── grafana/dashboards/       # Pre-built dashboards
├── charts/cybermem/              # Helm chart
│   ├── values.yaml               # Base config
│   ├── values-local.yaml         # Local overrides
│   ├── values-rpi.yaml           # Raspberry Pi overrides
│   ├── values-vps.yaml           # Production overrides
│   └── templates/                # Generated by kompose
├── deploy.sh                     # Universal deployment script
└── docker-compose.yml            # Local development stack
```

## Adding New Metrics

### Application Metrics (via Vector)

Edit `monitoring/vector/vector.toml`:

```toml
[transforms.custom_metric]
type = "remap"
source = '''
  .custom_value = parse_duration!(.request_time, "ms")
'''

[sinks.prometheus_custom]
type = "prometheus_exporter"
inputs = ["custom_metric"]
```

### Database Metrics (via postgres_exporter)

Edit `monitoring/postgres_exporter/queries.yml`:

```yaml
pg_custom_metric:
  query: "SELECT user_id, COUNT(*) as count FROM custom_table GROUP BY user_id"
  metrics:
    - user_id:
        usage: "LABEL"
        description: "User identifier"
    - count:
        usage: "GAUGE"
        description: "Custom metric count"
```

Then add to Prometheus scrape config in `monitoring/prometheus/prometheus.yml`.

## Troubleshooting

### Docker Compose Issues

```bash
# Check service logs
docker-compose logs <service-name>

# Restart specific service
docker-compose restart openmemory

# Verify network connectivity
docker-compose exec openmemory ping postgres
```

### Kubernetes Issues

```bash
# Check pod status
kubectl get pods -n cybermem
kubectl describe pod <pod-name> -n cybermem

# View logs
kubectl logs -f <pod-name> -n cybermem

# Check ConfigMaps
kubectl get configmap -n cybermem
kubectl describe configmap vector-config -n cybermem
```

### Metrics Not Appearing

1. Verify Traefik is logging: `docker-compose exec traefik cat /var/log/traefik/access.log`
2. Check Vector is parsing logs: `curl http://localhost:9091/metrics`
3. Verify Prometheus scrapes Vector: Check Prometheus targets at http://localhost:9090/targets
4. Check PromQL query in Grafana Explore

## Resources

- [OpenMemory Documentation](https://github.com/CaviraOSS/OpenMemory)
- [Kompose User Guide](https://kompose.io/)
- [Helm Chart Best Practices](https://helm.sh/docs/chart_best_practices/)
- [Vector Documentation](https://vector.dev/docs/)
- [Prometheus Exporter Guide](https://prometheus.io/docs/instrumenting/writing_exporters/)

## License

MIT - See LICENSE file for details

## Credits

- [OpenMemory](https://github.com/CaviraOSS/OpenMemory) by CaviraOSS
- Built to showcase production DevOps patterns
