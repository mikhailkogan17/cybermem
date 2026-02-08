# Base stage
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache python3 make g++

# Build stage
FROM base AS builder
COPY package.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm prune --production

# Native stage for sqlite3 bindings
FROM node:20-alpine AS native-builder
RUN apk update && apk add --no-cache python3 python3-dev make g++
WORKDIR /native
RUN npm init -y && npm install sqlite3@5.1.7 sqlite@5.1.1

# Runtime stage
FROM node:20-alpine AS runner
RUN apk add --no-cache libc6-compat
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
