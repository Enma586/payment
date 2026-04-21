FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=dev

COPY . .

RUN useradd -m appuser
USER appuser

EXPOSE 3000

CMD ["node", "server.js"]
