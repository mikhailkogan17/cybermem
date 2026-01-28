FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json ./
RUN npm install
COPY server.js .

EXPOSE 3001
CMD ["node", "server.js"]
