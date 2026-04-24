FROM node:20-slim AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/*

COPY package*.json ./

RUN npm install --omit=dev && \
    npm cache clean --force

# Código fuente
COPY --from=builder /app/src ./src
COPY --from=builder /app/server.js ./server.js

# Archivos necesarios para sequelize-cli db:migrate
COPY --from=builder /app/migrations ./migrations
COPY --from=builder /app/config ./config
COPY --from=builder /app/.sequelizerc.cjs ./.sequelizerc.cjs

# Entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN useradd -m -s /bin/bash appuser

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

ENTRYPOINT ["docker-entrypoint.sh"]