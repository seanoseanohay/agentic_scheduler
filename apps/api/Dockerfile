FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/persistence/package.json ./packages/persistence/
COPY packages/fsp-adapter/package.json ./packages/fsp-adapter/
COPY packages/rules/package.json ./packages/rules/
COPY packages/ranking/package.json ./packages/ranking/
COPY packages/observability/package.json ./packages/observability/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm --filter @oneshot/persistence exec prisma generate
RUN pnpm --filter @oneshot/api... build
# pnpm deploy creates a flat node_modules with workspace packages physically copied in
RUN pnpm --filter @oneshot/api --prod deploy /tmp/deploy

FROM node:20-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app
RUN corepack enable
# Use the flat node_modules from pnpm deploy (no broken pnpm symlinks)
COPY --from=builder /tmp/deploy/node_modules ./node_modules
# Keep dist at original path so REPO_ROOT (dirname + ../../..) resolves to /app
COPY --from=builder /app/apps/api/dist ./apps/api/dist
# Prisma files at expected path relative to REPO_ROOT
COPY --from=builder /app/packages/persistence/prisma ./packages/persistence/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3002
CMD ["node", "apps/api/dist/index.js"]
