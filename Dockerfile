# ==============================================================================
# Dockerfile Multi-stage — Alfa Salgados
# Constrói o frontend e roda com Node.js 24 Alpine
# ==============================================================================

# Estágio 1: Build
FROM node:24-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json tsconfig*.json vite.config.ts index.html ./
RUN npm ci
COPY src/ ./src/
COPY public/ ./public/
COPY scripts/ ./scripts/
COPY server/ ./server/
RUN npm run build

# Estágio 2: Runner
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
ENV HOST=0.0.0.0

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/server/ ./server/
COPY --from=builder /app/scripts/ ./scripts/
COPY --from=builder /app/public/ ./public/
COPY --from=builder /app/dist/ ./dist/

RUN mkdir -p /app/data /app/public/uploads && chown -R node:node /app

USER node
EXPOSE 8080

CMD ["node", "server/index.mjs"]
