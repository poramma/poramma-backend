FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@8

# Copier les fichiers de workspace nécessaires
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY services/identity-api/package.json services/identity-api/

# --- Production ---
FROM node:20-alpine AS production
WORKDIR /app

# Installer uniquement les dépendances de production
RUN npm install -g pnpm@8
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
RUN pnpm install --filter ./services/identity-api --prod --include-workspace-root

# Copier dist déjà généré par build.sh
COPY services/identity-api/dist ./services/identity-api/dist
COPY services/identity-api/package.json ./services/identity-api/

# Copier node_modules
COPY services/identity-api/node_modules ./node_modules


EXPOSE 4001

CMD ["node", "services/identity-api/dist/server.js"]
