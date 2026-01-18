FROM node:18-alpine AS builder

WORKDIR /app
# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package.json ./
# Install ALL dependencies (including devDeps for build if TS)
RUN npm install

# Copy source
COPY . .

# Build TypeScript
RUN npm run build

# Prune dev dependencies
RUN npm prune --production


FROM node:18-alpine AS runner

WORKDIR /app
# Install runtime dependencies for native modules if needed (usually just glibc/musl compatibility, but better-sqlite3 bundles binaries or needs rebuild.
# We copy node_modules from builder so native addons should work if arc matches.
# For cross-platform (building amd64 on arm64 or vice versa), we might need QEMU or specific handling.
# GitHub Actions runner is likely amd64, RPi is arm64.
# We rely on docker buildx (multi-arch) in CI.

# Copy built artifacts and deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Environment defaults
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start server in HTTP mode
CMD ["node", "dist/index.js", "--http", "--port", "8080"]
