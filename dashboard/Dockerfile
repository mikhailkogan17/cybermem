# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Use corepack to get the pnpm version from the lockfile and speed up installs via cache
RUN corepack enable

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies (cache pnpm store). Lock is not frozen in repo, so allow updates.
RUN --mount=type=cache,target=/root/.pnpm-store pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Build the application (reuse pnpm store + Next.js cache)
RUN --mount=type=cache,target=/root/.pnpm-store \
    --mount=type=cache,target=/app/.next/cache \
    pnpm build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Copy necessary files from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Expose port
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Start the application
CMD ["node", "server.js"]
