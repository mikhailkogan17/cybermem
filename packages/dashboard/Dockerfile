# Base stage for both dev and prod
FROM node:20-alpine AS base
WORKDIR /app

# Use corepack to get the pnpm version from the lockfile and speed up installs via cache
RUN corepack enable && apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies (cache pnpm store). Lock is not frozen in repo, so allow updates.
RUN --mount=type=cache,target=/root/.pnpm-store pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Development stage - skips build, runs Turbopack dev server (instant startup)
FROM base AS dev
ENV NODE_ENV=development
CMD ["pnpm", "dev", "--turbopack"]

# Builder stage - runs build (slow)
FROM base AS builder
RUN --mount=type=cache,target=/root/.pnpm-store \
    --mount=type=cache,target=/app/.next/cache \
    pnpm build

# Native stage for sqlite3 bindings and wrapper
FROM node:20-alpine AS native-builder
RUN apk update && apk add --no-cache python3 python3-dev make g++
WORKDIR /native
RUN npm init -y && npm install sqlite3@5.1.7 sqlite@5.1.1

# Production stage
FROM node:20-alpine AS production
RUN apk add --no-cache libc6-compat
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copy compiled native modules and wrapper (sqlite3 and sqlite)
# standalone contains its own node_modules, we add ours there
COPY --from=native-builder /native/node_modules/sqlite3 ./node_modules/sqlite3
COPY --from=native-builder /native/node_modules/sqlite ./node_modules/sqlite

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
