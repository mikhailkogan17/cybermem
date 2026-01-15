# OpenMemory from GitHub with MCP fix (commit c7fc7e1)
FROM node:20-alpine AS builder

WORKDIR /build

# Install git and clone specific commit
RUN apk add --no-cache git && \
  git clone --depth 1 https://github.com/CaviraOSS/OpenMemory.git . && \
  git fetch --depth 1 origin c7fc7e1 && \
  git checkout c7fc7e1

# Build openmemory-js package
WORKDIR /build/packages/openmemory-js
RUN npm install && npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy built package
COPY --from=builder /build/packages/openmemory-js/dist ./dist
COPY --from=builder /build/packages/openmemory-js/node_modules ./node_modules
COPY --from=builder /build/packages/openmemory-js/package.json ./

# Create data directory
RUN mkdir -p /data && chown -R node:node /data /app

USER node

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["npm", "start"]
