FROM node:24-alpine
WORKDIR /app
# Install build dependencies for native modules (sqlite3)
RUN apk add --no-cache libc6-compat python3 make g++
COPY package.json ./
RUN npm install
COPY server.js .

EXPOSE 3001
CMD ["node", "server.js"]
