# Dockerfile para Next.js Production

# Estágio 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Instalar dependências
COPY package.json package-lock.json* ./
RUN npm ci

# Estágio 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variáveis de ambiente necessárias para build
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

ARG EVOLUTION_API_URL
ENV EVOLUTION_API_URL=${EVOLUTION_API_URL}
ARG EVOLUTION_API_KEY
ENV EVOLUTION_API_KEY=${EVOLUTION_API_KEY}
ARG NEXT_PUBLIC_APP_URL
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}
ARG N8N_API_KEY
ENV N8N_API_KEY=${N8N_API_KEY}
ARG N8N_WEBHOOK_URL
ENV N8N_WEBHOOK_URL=${N8N_WEBHOOK_URL}
ARG RESEND_API_KEY
ENV RESEND_API_KEY=${RESEND_API_KEY}
ARG CRON_SECRET
ENV CRON_SECRET=${CRON_SECRET}
ARG LOG_LEVEL
ENV LOG_LEVEL=${LOG_LEVEL}
ARG NODE_ENV
ENV NODE_ENV=${NODE_ENV}

# Gerar Prisma Client
RUN npx prisma generate

# Build da aplicação
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Estágio 3: Runner (Production)
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Instalar dependências necessárias para runtime
RUN apk add --no-cache curl postgresql-client

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copiar node_modules completo (necessário para Prisma CLI)
COPY --from=builder /app/node_modules ./node_modules

# Copiar arquivos necessários
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copiar servidor customizado Socket.io
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./server.js

# Criar diretório e copiar socket-server.js (CommonJS para server.js)
RUN mkdir -p ./src/lib
COPY --from=builder --chown=nextjs:nodejs /app/src/lib/socket-server.js ./src/lib/socket-server.js

# Copiar Prisma schema
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma

# Copiar package.json para Prisma CLI
COPY --from=builder /app/package.json ./

# Copiar entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Mudar ownership de tudo para nextjs
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["./docker-entrypoint.sh"]
