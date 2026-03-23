-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Chicago',
    "rankingWeights" JSONB NOT NULL,
    "searchWindowDays" INTEGER NOT NULL DEFAULT 14,
    "continuityPreference" TEXT NOT NULL DEFAULT 'preferred',
    "notificationPolicy" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operator_users" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fspUserId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'scheduler',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "operator_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "workflowType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'running',
    "triggerKey" TEXT NOT NULL,
    "triggerPayload" JSONB NOT NULL,
    "suggestionsCreated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suggestions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "workflowRunId" TEXT,
    "workflowType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "triggerReservationId" TEXT,
    "studentId" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "aircraftId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "lessonType" TEXT NOT NULL,
    "explanation" JSONB NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNotes" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "actorId" TEXT,
    "actorType" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_records" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "suggestionId" TEXT,
    "channel" TEXT NOT NULL,
    "recipient" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "providerMessageId" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "flagKey" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "discovery_prospects" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "operatorId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "requestedDate" TIMESTAMP(3),
    "locationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentIntentId" TEXT,
    "paymentStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "discovery_prospects_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_operatorId_key" ON "tenants"("operatorId");

-- CreateIndex
CREATE INDEX "tenants_operatorId_idx" ON "tenants"("operatorId");

-- CreateIndex
CREATE INDEX "operator_users_tenantId_idx" ON "operator_users"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "operator_users_tenantId_email_key" ON "operator_users"("tenantId", "email");

-- CreateIndex
CREATE INDEX "workflow_runs_tenantId_workflowType_idx" ON "workflow_runs"("tenantId", "workflowType");

-- CreateIndex
CREATE INDEX "workflow_runs_operatorId_idx" ON "workflow_runs"("operatorId");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_runs_tenantId_triggerKey_key" ON "workflow_runs"("tenantId", "triggerKey");

-- CreateIndex
CREATE INDEX "suggestions_tenantId_status_idx" ON "suggestions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "suggestions_operatorId_status_idx" ON "suggestions"("operatorId", "status");

-- CreateIndex
CREATE INDEX "suggestions_tenantId_workflowType_status_idx" ON "suggestions"("tenantId", "workflowType", "status");

-- CreateIndex
CREATE INDEX "audit_events_tenantId_eventType_idx" ON "audit_events"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "audit_events_operatorId_createdAt_idx" ON "audit_events"("operatorId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_events_entityType_entityId_idx" ON "audit_events"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "notification_records_tenantId_status_idx" ON "notification_records"("tenantId", "status");

-- CreateIndex
CREATE INDEX "notification_records_operatorId_createdAt_idx" ON "notification_records"("operatorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_tenantId_flagKey_key" ON "feature_flags"("tenantId", "flagKey");

-- CreateIndex
CREATE INDEX "discovery_prospects_tenantId_status_idx" ON "discovery_prospects"("tenantId", "status");

-- CreateIndex
CREATE INDEX "discovery_prospects_operatorId_idx" ON "discovery_prospects"("operatorId");

-- AddForeignKey
ALTER TABLE "operator_users" ADD CONSTRAINT "operator_users_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_workflowRunId_fkey" FOREIGN KEY ("workflowRunId") REFERENCES "workflow_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_records" ADD CONSTRAINT "notification_records_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_records" ADD CONSTRAINT "notification_records_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "suggestions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "discovery_prospects" ADD CONSTRAINT "discovery_prospects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
