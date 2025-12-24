# How to Connect & Integrate with CyberMem

This guide explains how to connect to the CyberMem dashboard and verify the integrity of the data pipeline.

## 1. Prerequisites

- Docker and Docker Compose installed
- Repository cloned: `https://github.com/mikhailkogan/cybermem`

## 2. Running the Dashboard

Start the stack locally:
```bash
docker-compose up -d
```

Access the dashboard at:
[http://localhost:3000](http://localhost:3000)

## 3. Connecting via MCP

The CyberMem Metrics MCP Server allows AI agents (like Claude) to query metrics directly.

### Installation
```bash
npm install -g @cybermemmetrics/mcp
```

### Configuration (mcp-config.json)
```json
{
  "mcpServers": {
    "cybermemmetrics": {
      "command": "node",
      "args": ["/path/to/cybermemmetrics-mcp/index.js"],
      "env": {
        "API_ENDPOINT": "http://localhost:8080",
        "API_KEY": "dev-secret-key"
      }
    }
  }
}
```

### Verification
Run `cybermemmetrics verify` to test the connection.

## 4. Visual Verification

1. **Background**: Verify the 5-radial-gradient green/teal background is present without black spots.
2. **Metrics**: Verify 8 cards are shown.
   - First 4: Trend Arrows should be green/red based on data.
3. **Audit Log**: Check that logs are populating in the table.

## 5. Troubleshooting

If the dashboard is blank or metrics are "..."
- Check if `Prometheus` is running: `http://localhost:9090`
- Check logs: `docker-compose logs dashboard`
