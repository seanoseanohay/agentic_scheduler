# OneShot — Agentic Scheduler for Flight Schedule Pro

OneShot is an Azure-native, independently deployable, multi-tenant SaaS application that integrates with Flight Schedule Pro (FSP) to detect scheduling opportunities and present compliant scheduling suggestions to operators for approval.

## Product Summary

The MVP operates in a **suggest-and-approve** mode only. It supports four workflows:

1. Waitlist automation when an opening appears
2. Reschedule on cancellation
3. Discovery flight booking
4. Schedule next lesson on lesson completion or progress change

FSP remains the system of record for scheduling data. OneShot adds detection, ranking, explainability, operator approval, communication, and auditability.

## Repository Structure

```
apps/
  api/        — Fastify REST API (TypeScript, ESM)
  workers/    — Background workers: schedule poller, booking consumer, expiry job
  web/        — Next.js 14 operator console (MUI, NextAuth v5)
packages/
  persistence/   — Prisma client, repositories, migrations
  shared-types/  — Shared TypeScript types (Tenant, Suggestion, FspStudent, etc.)
  fsp-adapter/   — FSP API client + mock adapter
  rules/         — Deterministic constraint engine (availability, daylight, certification)
  ranking/       — Candidate scoring with tenant-configured weights
  notifications/ — Notification templates and provider abstraction
  observability/ — Pino logger factory
docs/
  architecture.md — System architecture and data flow
  decisions.md    — Decision register with rationale
  constraints.md  — Non-negotiable invariants
  evaluation.md   — Acceptance criteria and test scenarios
  phases.md       — Delivery phases
  requirements.md — Product requirements
  scope.md        — Scope boundaries
  system-map.md   — Module map and integration points
```

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** ≥ 9 (`npm install -g pnpm`)
- **Docker** (for local Postgres, Redis, and Mailpit via `docker-compose.yml`)

## Local Development

### 1. Start infrastructure

```sh
docker compose up -d
```

This starts:
- PostgreSQL on `localhost:5434` (user: `oneshot`, db: `oneshot_dev`)
- Redis on `localhost:6381`
- Mailpit SMTP on `:1025`, web UI on `http://localhost:8025`

### 2. Install dependencies

```sh
pnpm install
```

### 3. Configure environment

Copy and populate the local env file used by all apps in dev:

```sh
cp .env.example .env.local  # if provided, otherwise create manually
```

Minimum variables for local dev:

```env
DATABASE_URL=postgresql://oneshot:oneshot@localhost:5434/oneshot_dev
REDIS_URL=redis://localhost:6381
JWT_SECRET=local-dev-secret
FSP_BASE_URL=https://app.flightschedulepro.com
FSP_API_KEY=your-fsp-api-key
ALLOWED_ORIGINS=http://localhost:3000
DEMO_USER=admin
DEMO_PASSWORD=oneshot-demo-2026
DEMO_OPERATOR_ID=demo-operator-alpha
```

Web app (NextAuth):
```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=local-nextauth-secret
# Optional: wire real Azure AD
AZURE_AD_CLIENT_ID=
AZURE_AD_CLIENT_SECRET=
AZURE_AD_TENANT_ID=
```

### 4. Run database migrations and seed

```sh
pnpm db:migrate    # runs prisma migrate dev
pnpm db:seed       # seeds demo tenant and feature flags
```

### 5. Start services

```sh
pnpm dev           # starts api, workers, and web in parallel via Turborepo
```

| Service | URL |
|---------|-----|
| API | http://localhost:8000 |
| Web console | http://localhost:3000 |
| Mailpit | http://localhost:8025 |

Individual services:

```sh
pnpm --filter @oneshot/api dev
pnpm --filter @oneshot/workers dev
pnpm --filter @oneshot/web dev
```

## Testing

```sh
pnpm test                    # run all unit tests via Turborepo
pnpm --filter @oneshot/rules test       # rules constraint engine (21 tests)
pnpm --filter @oneshot/ranking test     # ranking scorer (7 tests)
pnpm --filter @oneshot/notifications test  # notification templates (5 tests)
pnpm --filter @oneshot/fsp-adapter test    # FSP mock adapter (13 tests)
```

**Test counts (as of 2026-03-27):** 53 tests across 5 packages, all passing.
API and workers have no unit tests yet — coverage is targeted in Phase 4/5.

A monorepo-wide hygiene ratchet in `packages/rules/src/hygiene.test.ts`
enforces smell budgets (`: any`, `as unknown as`, `@ts-` suppression,
`JSON.parse`, `console.`, fire-and-forget `void` dispatches) across all
production source files.

## Linting and Formatting

```sh
pnpm lint           # ESLint across all packages
pnpm typecheck      # TypeScript type check without emit
pnpm format         # Prettier write
pnpm format:check   # Prettier check (used in CI)
```

## Build

```sh
pnpm build                            # build all packages and apps
pnpm --filter @oneshot/api... build   # build API and its dependencies only
pnpm --filter @oneshot/workers... build
```

## CI

```sh
pnpm run ci    # lint + typecheck + test (as run in Azure DevOps)
```

## Deployment

Deployment target: **Azure Container Apps** (MVP).

Infrastructure is defined as Bicep in `infra/`:

```sh
az deployment group create \
  --resource-group <rg> \
  --template-file infra/main.bicep \
  --parameters @infra/parameters/prod.json
```

Container images are built and pushed to Azure Container Registry by the CI/CD pipeline. Database migrations run as a pre-deploy job:

```sh
pnpm --filter @oneshot/persistence db:migrate:deploy
```

## Key Architectural Decisions

- **Azure-native**: Azure Container Apps, PostgreSQL Flexible Server, Azure Cache for Redis, Azure Communication Services.
- **Tenant isolation**: Every query is scoped to `operatorId` extracted from a verified JWT — never from user-supplied parameters.
- **Suggest-and-approve only**: No scheduling changes are applied without explicit operator approval. This is enforced as an invariant in `docs/constraints.md`.
- **Deterministic rules first**: AI assistance (Azure OpenAI) is advisory and cannot override the constraint engine or candidate list.
- **FSP as source of truth**: Availability, reservations, and training records are always read from FSP — never derived from OneShot's own database.

See `docs/decisions.md` for the full decision register.

## Delivery Posture

- Cloud platform: **Azure-native**
- Tenant model: **strict tenant isolation by `operatorId`**
- Security posture: **least privilege, managed identity, encrypted data, audit trails**
- Autonomy posture: **human approval required for all changes in MVP**
- Deployment target: **pilot launch with 50 schools**

## Open Uncertainties

- Whether FSP can fully support SSO reuse for all tenants or whether local session brokerage is required.
- Whether Azure Communication Services alone is sufficient for all outbound messaging or whether Twilio/SendGrid is needed for deliverability and tenant branding edge cases.
- Whether discovery-flight prospect storage can remain minimal or needs a dedicated CRM-like submodel for follow-up.
