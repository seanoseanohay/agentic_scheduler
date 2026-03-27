FROM node:20-slim AS base
WORKDIR /app
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
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
# Copy app-level node_modules (pnpm puts workspace symlinks here)
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
# Copy compiled app
COPY --from=builder /app/apps/api/dist ./apps/api/dist
# Copy workspace package dist (symlink targets)
COPY --from=builder /app/packages ./packages
# Prisma schema + migrations for migrate deploy at startup
COPY --from=builder /app/packages/persistence/prisma ./packages/persistence/prisma
EXPOSE 3002
CMD ["node", "apps/api/dist/index.js"]
