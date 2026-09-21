-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" INTEGER NOT NULL,
    "targetType" TEXT,
    "targetId" INTEGER,
    "userId" INTEGER,
    "districtId" INTEGER,
    "details" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_event" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "action" TEXT,
    "converted" BOOLEAN,
    "eventData" JSONB,
    "sessionId" TEXT,
    "deviceHash" TEXT,
    "sessionFingerprint" TEXT,
    "districtId" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "telemetry_truth" (
    "id" SERIAL NOT NULL,
    "truthId" TEXT,
    "districtId" INTEGER NOT NULL,
    "query" TEXT NOT NULL,
    "queryOriginal" TEXT,
    "domain" TEXT,
    "entity" TEXT,
    "intent" TEXT,
    "normalizedIntent" TEXT,
    "confidence" DOUBLE PRECISION,
    "matchedEntities" INTEGER NOT NULL DEFAULT 0,
    "hallucinationPrevented" BOOLEAN NOT NULL DEFAULT false,
    "traceHash" TEXT,
    "executionTime" INTEGER,
    "timestamp" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telemetry_truth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_metrics_daily" (
    "id" SERIAL NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "districtId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "bookings" INTEGER NOT NULL DEFAULT 0,
    "revenue" INTEGER NOT NULL DEFAULT 0,
    "aiMentions" INTEGER NOT NULL DEFAULT 0,
    "rating" DOUBLE PRECISION,
    "responseTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_metrics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_pattern" (
    "id" SERIAL NOT NULL,
    "patternType" TEXT NOT NULL,
    "pattern" TEXT,
    "patternData" JSONB NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'LOW',
    "confidence" DOUBLE PRECISION,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "districtId" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastTriggered" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fraud_pattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_log" (
    "id" SERIAL NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventSource" TEXT NOT NULL,
    "type" TEXT,
    "eventData" JSONB,
    "metadata" JSONB,
    "districtId" INTEGER,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "traceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_lock" (
    "id" SERIAL NOT NULL,
    "lockType" TEXT NOT NULL,
    "key" TEXT,
    "lockKey" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_lock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_log" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fraud_history" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "vendorId" INTEGER,
    "eventType" TEXT NOT NULL,
    "riskScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fraud_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_intelligence" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "intelligenceData" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_intelligence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_ml_profile" (
    "id" SERIAL NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "mlScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_ml_profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_preference" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "preferenceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "user_preference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_config" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_action_log" (
    "id" SERIAL NOT NULL,
    "adminId" INTEGER,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_action_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shared_learning" (
    "id" SERIAL NOT NULL,
    "districtId" INTEGER NOT NULL,
    "query" TEXT NOT NULL,
    "domain" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shared_learning_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_metadata" (
    "id" SERIAL NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "specializations" JSONB,
    "businessHours" JSONB,
    "consultationMode" TEXT,
    "localityHint" TEXT,
    "tags" JSONB,
    "emergencyAvailable" BOOLEAN,
    "deliveryActive" BOOLEAN,
    "acceptsInsurance" BOOLEAN,
    "homeVisit" BOOLEAN,
    "whatsappNumber" TEXT,
    "lastVerified" TIMESTAMP(3),
    "dataPurity" DOUBLE PRECISION,
    "freshness" DOUBLE PRECISION,
    "lastActivity" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendor_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_entityType_entityId_idx" ON "audit_log"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_log_userId_idx" ON "audit_log"("userId");

-- CreateIndex
CREATE INDEX "audit_log_districtId_idx" ON "audit_log"("districtId");

-- CreateIndex
CREATE INDEX "user_event_userId_idx" ON "user_event"("userId");

-- CreateIndex
CREATE INDEX "user_event_eventType_idx" ON "user_event"("eventType");

-- CreateIndex
CREATE INDEX "user_event_districtId_idx" ON "user_event"("districtId");

-- CreateIndex
CREATE UNIQUE INDEX "telemetry_truth_truthId_key" ON "telemetry_truth"("truthId");

-- CreateIndex
CREATE INDEX "telemetry_truth_districtId_idx" ON "telemetry_truth"("districtId");

-- CreateIndex
CREATE INDEX "telemetry_truth_query_idx" ON "telemetry_truth"("query");

-- CreateIndex
CREATE INDEX "telemetry_truth_intent_idx" ON "telemetry_truth"("intent");

-- CreateIndex
CREATE INDEX "vendor_metrics_daily_districtId_idx" ON "vendor_metrics_daily"("districtId");

-- CreateIndex
CREATE INDEX "vendor_metrics_daily_date_idx" ON "vendor_metrics_daily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_metrics_daily_vendorId_date_key" ON "vendor_metrics_daily"("vendorId", "date");

-- CreateIndex
CREATE INDEX "fraud_pattern_patternType_idx" ON "fraud_pattern"("patternType");

-- CreateIndex
CREATE INDEX "fraud_pattern_districtId_idx" ON "fraud_pattern"("districtId");

-- CreateIndex
CREATE INDEX "fraud_pattern_isActive_idx" ON "fraud_pattern"("isActive");

-- CreateIndex
CREATE INDEX "event_log_eventType_idx" ON "event_log"("eventType");

-- CreateIndex
CREATE INDEX "event_log_eventSource_idx" ON "event_log"("eventSource");

-- CreateIndex
CREATE INDEX "event_log_districtId_idx" ON "event_log"("districtId");

-- CreateIndex
CREATE INDEX "event_log_createdAt_idx" ON "event_log"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_lock_lockKey_key" ON "system_lock"("lockKey");

-- CreateIndex
CREATE INDEX "system_lock_lockType_idx" ON "system_lock"("lockType");

-- CreateIndex
CREATE INDEX "system_lock_expiresAt_idx" ON "system_lock"("expiresAt");

-- CreateIndex
CREATE INDEX "admin_log_adminId_idx" ON "admin_log"("adminId");

-- CreateIndex
CREATE INDEX "fraud_history_userId_idx" ON "fraud_history"("userId");

-- CreateIndex
CREATE INDEX "fraud_history_vendorId_idx" ON "fraud_history"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "user_intelligence_userId_key" ON "user_intelligence"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_ml_profile_vendorId_key" ON "vendor_ml_profile"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "user_preference_userId_vendorId_key" ON "user_preference"("userId", "vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "system_config_key_key" ON "system_config"("key");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_metadata_vendorId_key" ON "vendor_metadata"("vendorId");

-- AddForeignKey
ALTER TABLE "admin_log" ADD CONSTRAINT "admin_log_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Admin"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_history" ADD CONSTRAINT "fraud_history_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fraud_history" ADD CONSTRAINT "fraud_history_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_intelligence" ADD CONSTRAINT "user_intelligence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_ml_profile" ADD CONSTRAINT "vendor_ml_profile_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_preference" ADD CONSTRAINT "user_preference_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_metadata" ADD CONSTRAINT "vendor_metadata_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
