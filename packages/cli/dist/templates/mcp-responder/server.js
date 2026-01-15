const http = require('http');

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/mcp') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      jsonrpc: '2.0',
      result: {
        serverInfo: { name: 'openmemory-mcp', version: '1.3.2' },
        protocolVersion: '2025-06-18',
        capabilities: { tools: {}, resources: {}, logging: {} },
        message: 'Use POST /mcp for MCP requests'
      },
      id: null
    }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(8081, () => console.log('MCP responder on :8081'));
