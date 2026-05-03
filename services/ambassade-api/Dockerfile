# Étape 1 : Base commune
FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@8

# Étape 2 : Dépendances monorepo
FROM base AS deps
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY services/ambassade-api/package.json services/ambassade-api/package.json
RUN pnpm install --filter ./services/ambassade-api...

# Copier node_modules
COPY services/ambassade-api/node_modules ./node_modules

# Étape 3 : Build
FROM deps AS builder
WORKDIR /app/services/ambassade-api
COPY services/ambassade-api ./

# Étape 4 : Production
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

# Copier uniquement ce qui est nécessaire
COPY --from=builder /app/services/ambassade-api/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY services/ambassade-api/package.json ./

EXPOSE 4002
CMD ["node", "services/ambassade-api/dist/server.js"]
