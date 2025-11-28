# Monitoring Guide

This document describes the monitoring setup, available metrics, dashboards, and alerting rules for CyberMem.

## Overview

CyberMem uses a pure DevOps monitoring approach without modifying the OpenMemory application:

- **Traefik** → Access logs with client_id
- **Vector** → Parses logs, generates metrics
- **postgres_exporter** → Database-level metrics
- **Prometheus** → Metrics storage
- **Grafana** → Visualization

## Metrics Collection

### Application Metrics (Vector)

Vector parses Traefik access logs and exports metrics at `:9091/metrics`.

**Configuration:** `monitoring/vector/vector.toml`

#### Available Metrics

```promql
# Total requests by client
openmemory_requests_total{client="client_123", method="POST", endpoint="/store", status="200"}

# Request duration histogram
openmemory_request_duration_seconds_bucket{client="client_123", endpoint="/store", le="0.5"}

# Request duration summary
openmemory_request_duration_seconds_sum{client="client_123", endpoint="/store"}
openmemory_request_duration_seconds_count{client="client_123", endpoint="/store"}
```

#### Example Queries

**Request rate per client:**
```promql
sum(rate(openmemory_requests_total{client="client_123"}[5m])) by (endpoint)
```

**p95 latency:**
```promql
histogram_quantile(0.95,
  sum(rate(openmemory_request_duration_seconds_bucket{client="client_123"}[5m])) by (le)
)
```

**Error rate:**
```promql
sum(rate(openmemory_requests_total{status=~"5.."}[5m])) by (client)
/ sum(rate(openmemory_requests_total[5m])) by (client)
```

### Database Metrics (postgres_exporter)

Queries OpenMemory's database for storage metrics at `:9187/metrics`.

**Configuration:** `monitoring/postgres_exporter/queries.yml`

#### Available Metrics

```promql
# Total memories stored per client
pg_openmemory_stored_memories{client="user_123"}

# Memories per sector per client
pg_openmemory_stored_memories_by_sector{client="user_123", sector="semantic"}

# Database connections
pg_stat_database_numbackends{datname="openmemory"}
```

#### Example Queries

**Storage growth rate:**
```promql
rate(pg_openmemory_stored_memories{client="client_123"}[1h])
```

**Top clients by storage:**
```promql
topk(10, pg_openmemory_stored_memories)
```

**Sector distribution:**
```promql
sum(pg_openmemory_stored_memories_by_sector{client="client_123"}) by (sector)
```

## Grafana Dashboards

### OpenMemory Overview Dashboard

**Location:** `monitoring/grafana/dashboards/openmemory.json`

**Panels:**

1. **Request Rate by Client**
   - Query: `sum(rate(openmemory_requests_total[5m])) by (client)`
   - Type: Time series

2. **Error Rate**
   - Query: Error rate calculation (see above)
   - Type: Time series
   - Threshold: Warning at 1%, Critical at 5%

3. **Request Latency (p50, p95, p99)**
   - Query: `histogram_quantile(0.95, sum(rate(openmemory_request_duration_seconds_bucket[5m])) by (le, client))`
   - Type: Time series

4. **Total Memories Stored**
   - Query: `sum(pg_openmemory_stored_memories) by (client)`
   - Type: Bar gauge

5. **Storage Growth Rate**
   - Query: `rate(pg_openmemory_stored_memories[1h])`
   - Type: Time series

6. **Sector Distribution**
   - Query: `sum(pg_openmemory_stored_memories_by_sector) by (sector)`
   - Type: Pie chart

### Accessing Dashboards

**Local:**
```bash
open http://localhost:3000
# Login: admin / admin
```

**VPS:**
```bash
kubectl port-forward -n cybermem svc/grafana 3000:3000
open http://localhost:3000
```

## Alerting Rules

**Configuration:** `monitoring/prometheus/alert_rules.yml`

### High Error Rate

```yaml
- alert: HighErrorRate
  expr: |
    sum(rate(openmemory_requests_total{status=~"5.."}[5m])) by (client)
    / sum(rate(openmemory_requests_total[5m])) by (client) > 0.05
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High error rate for client {{ $labels.client }}"
    description: "Error rate is {{ $value | humanizePercentage }} for the last 5 minutes"
```

### High Request Latency

```yaml
- alert: HighLatency
  expr: |
    histogram_quantile(0.95,
      sum(rate(openmemory_request_duration_seconds_bucket[5m])) by (le, client)
    ) > 2.0
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "High p95 latency for client {{ $labels.client }}"
    description: "p95 latency is {{ $value }}s (threshold: 2s)"
```

### No Memory Growth

```yaml
- alert: NoMemoryGrowth
  expr: |
    rate(pg_openmemory_stored_memories[24h]) == 0
  for: 48h
  labels:
    severity: info
  annotations:
    summary: "No new memories for client {{ $labels.client }}"
    description: "No memory growth detected in the last 48 hours"
```

### Database Connection Saturation

```yaml
- alert: HighDatabaseConnections
  expr: |
    pg_stat_database_numbackends{datname="openmemory"} > 80
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Database connection pool nearly exhausted"
    description: "{{ $value }} active connections (limit: 100)"
```

## Testing Metrics Pipeline

### 1. Send Test Request

```bash
curl -X POST http://localhost:8080/api/store \
  -H "Authorization: Bearer client_123.secret_key" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Test memory for metrics validation",
    "userId": "client_123"
  }'
```

### 2. Verify Traefik Logs

```bash
docker-compose exec traefik cat /var/log/traefik/access.log | tail -1 | jq .
```

**Expected output:**
```json
{
  "ClientAddr": "172.18.0.1:54321",
  "request_Authorization": "Bearer client_123.secret_key",
  "RequestMethod": "POST",
  "RequestPath": "/api/store",
  "DownstreamStatus": 200,
  "Duration": 123456789
}
```

### 3. Verify Vector Metrics

```bash
curl -s http://localhost:9091/metrics | grep openmemory_requests_total
```

**Expected output:**
```
openmemory_requests_total{client="client_123",method="POST",endpoint="/store",status="200"} 1
```

### 4. Verify Prometheus Scraping

```bash
curl -s 'http://localhost:9090/api/v1/query?query=openmemory_requests_total' | jq '.data.result'
```

### 5. Verify Database Metrics

```bash
curl -s http://localhost:9187/metrics | grep pg_openmemory
```

**Expected output:**
```
pg_openmemory_stored_memories{client="client_123"} 1
pg_openmemory_stored_memories_by_sector{client="client_123",sector="semantic"} 1
```

## Troubleshooting

### Metrics Not Appearing in Prometheus

**Check Vector is running:**
```bash
docker-compose ps vector
curl http://localhost:9091/metrics
```

**Check Prometheus scrape targets:**
```bash
open http://localhost:9090/targets
```

Look for `vector` and `postgres-exporter` targets. Status should be **UP**.

**Check Prometheus logs:**
```bash
docker-compose logs prometheus | grep -i error
```

### Client ID Not Extracted

**Verify Traefik logs include Authorization header:**
```bash
docker-compose exec traefik cat /var/log/traefik/access.log | jq .request_Authorization
```

**Check Vector configuration:**
```bash
docker-compose exec vector cat /etc/vector/vector.toml
```

**Verify Vector transform:**
```toml
[transforms.extract_client_id]
type = "remap"
inputs = ["traefik_logs"]
source = '''
  auth_header = .request_Authorization ?? ""
  parts = split(auth_header, ".")
  .client_id = replace(parts[0] ?? "", "Bearer ", "") ?? "unknown"
'''
```

### Database Metrics Not Available

**Check postgres_exporter is running:**
```bash
docker-compose ps postgres-exporter
curl http://localhost:9187/metrics
```

**Verify database connection:**
```bash
docker-compose logs postgres-exporter | grep -i "connection"
```

**Test SQL query manually:**
```bash
docker-compose exec postgres psql -U openmemory -c \
  "SELECT user_id, COUNT(*) FROM memories GROUP BY user_id;"
```

## Performance Tuning

### Vector

**Increase buffer size for high-traffic scenarios:**
```toml
[sinks.prometheus_exporter]
type = "prometheus_exporter"
inputs = ["extract_metrics"]
buffer.max_events = 10000  # Default: 1000
```

### Prometheus

**Adjust retention and scrape interval:**
```yaml
# prometheus.yml
global:
  scrape_interval: 15s      # Default: 15s (increase for lower load)
  evaluation_interval: 15s

# Command line flags
--storage.tsdb.retention.time=30d   # VPS
--storage.tsdb.retention.time=7d    # Local/RPi
```

### postgres_exporter

**Reduce query frequency for read-heavy workloads:**
```yaml
# docker-compose.yml
postgres-exporter:
  environment:
    PG_EXPORTER_AUTO_DISCOVER_DATABASES: "false"
    PG_EXPORTER_QUERY_TIMEOUT: "5s"
```

## Security Considerations

### Metrics Endpoints

By default, metrics endpoints are exposed only on internal Docker network:

- Vector: `vector:9091` (not exposed externally)
- postgres_exporter: `postgres-exporter:9187` (not exposed externally)
- Prometheus: `prometheus:9090` (exposed at `localhost:9090` for development)

**Production (VPS):** Use Kubernetes NetworkPolicies to restrict access:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: prometheus-allow
spec:
  podSelector:
    matchLabels:
      app: prometheus
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: grafana
```

### Sensitive Data in Logs

**Traefik is configured to log Authorization header.** Ensure:

1. Logs are stored securely (volume permissions: `600`)
2. Log rotation is enabled
3. Logs are not exposed externally

**Kubernetes:** Use ephemeral volumes or PVCs with restricted access:

```yaml
volumes:
- name: traefik-logs
  emptyDir: {}  # Deleted with pod, not persisted
```

## References

- [Vector Documentation](https://vector.dev/docs/)
- [Prometheus Querying](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [postgres_exporter](https://github.com/prometheus-community/postgres_exporter)
- [Grafana Dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
