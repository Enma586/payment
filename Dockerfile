
FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev && \
    npm cache clean --force

COPY --from=builder /app/src ./src
COPY --from=builder /app/server.js ./server.js

RUN useradd -m -s /bin/bash appuser

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["node", "server.js"]