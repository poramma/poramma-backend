FROM node:20-alpine AS build
WORKDIR /app
RUN npm install -g pnpm@10

# Workspace manifests + shared packages, and this service's own manifest and
# pre-built dist (built on the host by build.sh — plain JS, portable across
# OS). Other services' package.json are included so pnpm can resolve the
# full workspace graph declared in pnpm-workspace.yaml / pnpm-lock.yaml.
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages ./packages
COPY services/communaute-api/package.json services/communaute-api/package.json
COPY services/identity-api/package.json services/identity-api/package.json
COPY services/ambassade-api/package.json services/ambassade-api/package.json
COPY services/communaute-api/dist services/communaute-api/dist

RUN pnpm install --frozen-lockfile

# `pnpm deploy` produces a self-contained output directory for just this
# service — real files (not symlinks), only its own runtime dependencies.
# This is what keeps the final image lean instead of shipping the whole
# monorepo's node_modules into every service's image.
RUN pnpm --filter ./services/communaute-api deploy --prod --legacy /out

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /out ./

EXPOSE 4003
CMD ["node", "dist/server.js"]
