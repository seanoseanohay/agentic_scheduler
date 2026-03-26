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

FROM base AS runner
ENV NODE_ENV=production
# Copy pnpm virtual store (includes .prisma generated client + all deps)
COPY --from=builder /app/node_modules ./node_modules
# Copy compiled app
COPY --from=builder /app/apps/api/dist ./apps/api/dist
# Copy workspace package sources (needed for pnpm symlink resolution)
COPY --from=builder /app/packages ./packages
# Prisma schema + migrations for migrate deploy at startup
COPY --from=builder /app/packages/persistence/prisma ./packages/persistence/prisma
EXPOSE 3002
CMD ["node", "apps/api/dist/index.js"]
