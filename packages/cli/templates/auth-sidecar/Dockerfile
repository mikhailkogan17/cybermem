# Builder stage for native modules
FROM node:20-alpine AS builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY package.json ./
RUN npm install

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=builder /app/node_modules ./node_modules
COPY server.js .
COPY package.json .

EXPOSE 3001
CMD ["node", "server.js"]
