# Image de production pour Coolify (build pack : Dockerfile, port 3000).
# Au démarrage, le serveur applique les migrations SQL (/drizzle) puis lance la file de tâches.

# 1. Dépendances
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2. Build (aucune variable secrète n'est nécessaire ici)
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3. Exécution : uniquement le serveur standalone, les fichiers statiques et les migrations
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/drizzle ./drizzle
# Outils de diagnostic lançables depuis le terminal Coolify (ex. node scripts/test-email.mjs)
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

USER nextjs
EXPOSE 3000

# Coolify lit ce contrôle : le conteneur est « sain » quand la base répond.
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/sante || exit 1

CMD ["node", "server.js"]
