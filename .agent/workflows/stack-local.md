---
description: Start local CyberMem stack with all services (Traefik, OpenMemory, Prometheus, Dashboard)
---
# Start Local Stack

// turbo-all

1. Navigate to the CLI templates directory:
```bash
cd /Users/mikhailkogan/cybermem/packages/cli/templates
```

2. Start all services:
```bash
CYBERMEM_ENV_PATH=/Users/mikhailkogan/.cybermem/.env docker compose -p templates up -d
```

3. Verify stack is healthy:
```bash
curl -s http://127.0.0.1:8626/health | head -c 100
```

4. Start the dashboard (in dev mode):
```bash
cd /Users/mikhailkogan/cybermem/packages/dashboard && npm run dev
```

## Endpoints

| Service     | URL                           |
| ----------- | ----------------------------- |
| API/MCP     | http://localhost:8626         |
| Dashboard   | http://localhost:3000         |
| Prometheus  | http://localhost:9092         |
| DB Exporter | http://localhost:8000/metrics |

## Stop Stack

```bash
cd /Users/mikhailkogan/cybermem/packages/cli/templates
CYBERMEM_ENV_PATH=/Users/mikhailkogan/.cybermem/.env docker compose -p templates down
```
