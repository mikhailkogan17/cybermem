# Base stage
FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

# Build stage
FROM base AS builder
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm prune --production

# Native stage for sqlite3 bindings
FROM node:20-slim AS native-builder
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /native
RUN npm init -y && npm install sqlite3@5.1.7 sqlite@5.1.1

# Runtime stage
FROM node:20-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends curl libc6 && rm -rf /var/lib/apt/lists/*
WORKDIR /app

# Copy built artifacts and deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy compiled native modules (sqlite3 and sqlite)
COPY --from=native-builder /native/node_modules/sqlite3 ./node_modules/sqlite3
COPY --from=native-builder /native/node_modules/sqlite ./node_modules/sqlite

# Environment defaults
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

# Start server in HTTP mode
CMD ["node", "dist/index.js", "--http", "--port", "8080"]
