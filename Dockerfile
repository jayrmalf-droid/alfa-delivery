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

COPY server/ ./server/
COPY scripts/ ./scripts/
COPY public/ ./public/
COPY --from=builder /app/dist/ ./dist/

RUN mkdir -p /app/data /app/public/uploads && chown -R node:node /app

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "server/index.mjs"]
