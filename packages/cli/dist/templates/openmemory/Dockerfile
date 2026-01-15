# OpenMemory using official npm package
FROM node:20-alpine

WORKDIR /app

# Install openmemory-js from npm (waiting for release with MCP fix)
RUN npm install openmemory-js@1.3.2

# Create data directory
RUN mkdir -p /data && chown -R node:node /data /app

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["npm", "start", "--prefix", "/app/node_modules/openmemory-js"]
