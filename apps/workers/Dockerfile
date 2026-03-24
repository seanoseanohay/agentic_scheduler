FROM node:20-alpine AS base
WORKDIR /app
RUN corepack enable

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/workers/package.json ./apps/workers/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/persistence/package.json ./packages/persistence/
COPY packages/fsp-adapter/package.json ./packages/fsp-adapter/
COPY packages/rules/package.json ./packages/rules/
COPY packages/ranking/package.json ./packages/ranking/
COPY packages/notifications/package.json ./packages/notifications/
COPY packages/observability/package.json ./packages/observability/
RUN pnpm install --frozen-lockfile

FROM deps AS builder
COPY . .
RUN pnpm --filter @oneshot/workers... build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/apps/workers/dist ./apps/workers/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages
CMD ["node", "apps/workers/dist/index.js"]
