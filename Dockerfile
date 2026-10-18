FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

COPY tsconfig.json ./
COPY src ./src
COPY server ./server
COPY public ./public

ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["npx", "tsx", "server/railway-server.ts"]
