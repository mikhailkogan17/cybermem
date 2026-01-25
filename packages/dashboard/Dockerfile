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

# Development stage - skips build, runs dev server
FROM base AS dev
ENV NODE_ENV=development
CMD ["pnpm", "dev"]

# Builder stage - runs build (slow)
FROM base AS builder
RUN --mount=type=cache,target=/root/.pnpm-store \
    --mount=type=cache,target=/app/.next/cache \
    pnpm build

# Production stage
FROM node:20-alpine AS production
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Fix sqlite3 bindings by installing it explicitly in the production image
RUN npm install sqlite3@5.1.7 --os=linux --cpu=arm64

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
