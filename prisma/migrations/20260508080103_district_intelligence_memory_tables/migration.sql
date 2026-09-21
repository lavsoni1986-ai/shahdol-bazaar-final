-- CreateTable
CREATE TABLE "district_demand_memory" (
    "id" SERIAL NOT NULL,
    "district_id" INTEGER NOT NULL,
    "domain" TEXT DEFAULT 'general',
    "entity" TEXT DEFAULT 'unknown',
    "query" TEXT NOT NULL,
    "originalQuery" TEXT,
    "normalizedIntent" TEXT,
    "confidence" DOUBLE PRECISION,
    "matchedEntities" INTEGER NOT NULL DEFAULT 0,
    "demandCount" INTEGER NOT NULL DEFAULT 1,
    "lastQueried" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trend" TEXT DEFAULT 'stable',

    CONSTRAINT "district_demand_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district_supply_gap" (
    "id" SERIAL NOT NULL,
    "district_id" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "demandCount" INTEGER NOT NULL DEFAULT 0,
    "urgencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trendScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "onboardingReady" BOOLEAN NOT NULL DEFAULT false,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "district_supply_gap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "query_trend" (
    "id" SERIAL NOT NULL,
    "district_id" INTEGER NOT NULL,
    "query" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trend" TEXT DEFAULT 'stable',
    "velocity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "category" TEXT,
    "intent" TEXT,

    CONSTRAINT "query_trend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_gap" (
    "id" SERIAL NOT NULL,
    "district_id" INTEGER NOT NULL,
    "serviceType" TEXT NOT NULL,
    "locality" TEXT,
    "demandLevel" TEXT DEFAULT 'medium',
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "urgencyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availableProviders" INTEGER NOT NULL DEFAULT 0,
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_gap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "district_signal" (
    "id" SERIAL NOT NULL,
    "district_id" INTEGER NOT NULL,
    "signalType" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "entity" TEXT,
    "intensity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "context" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "district_signal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partner_interaction" (
    "id" SERIAL NOT NULL,
    "district_id" INTEGER NOT NULL,
    "partnerType" TEXT NOT NULL DEFAULT 'vendor',
    "partnerId" INTEGER NOT NULL,
    "interactionType" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "partner_interaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "district_demand_memory_district_id_idx" ON "district_demand_memory"("district_id");

-- CreateIndex
CREATE INDEX "district_demand_memory_domain_idx" ON "district_demand_memory"("domain");

-- CreateIndex
CREATE INDEX "district_demand_memory_lastQueried_idx" ON "district_demand_memory"("lastQueried");

-- CreateIndex
CREATE UNIQUE INDEX "district_demand_memory_district_id_domain_entity_key" ON "district_demand_memory"("district_id", "domain", "entity");

-- CreateIndex
CREATE INDEX "district_supply_gap_district_id_idx" ON "district_supply_gap"("district_id");

-- CreateIndex
CREATE INDEX "district_supply_gap_domain_idx" ON "district_supply_gap"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "district_supply_gap_district_id_domain_entity_key" ON "district_supply_gap"("district_id", "domain", "entity");

-- CreateIndex
CREATE INDEX "query_trend_district_id_idx" ON "query_trend"("district_id");

-- CreateIndex
CREATE INDEX "query_trend_frequency_idx" ON "query_trend"("frequency");

-- CreateIndex
CREATE UNIQUE INDEX "query_trend_district_id_query_key" ON "query_trend"("district_id", "query");

-- CreateIndex
CREATE INDEX "service_gap_district_id_idx" ON "service_gap"("district_id");

-- CreateIndex
CREATE INDEX "service_gap_serviceType_idx" ON "service_gap"("serviceType");

-- CreateIndex
CREATE UNIQUE INDEX "service_gap_district_id_serviceType_key" ON "service_gap"("district_id", "serviceType");

-- CreateIndex
CREATE INDEX "district_signal_district_id_idx" ON "district_signal"("district_id");

-- CreateIndex
CREATE INDEX "district_signal_signalType_idx" ON "district_signal"("signalType");

-- CreateIndex
CREATE INDEX "district_signal_domain_idx" ON "district_signal"("domain");

-- CreateIndex
CREATE INDEX "partner_interaction_district_id_idx" ON "partner_interaction"("district_id");

-- CreateIndex
CREATE INDEX "partner_interaction_partnerType_idx" ON "partner_interaction"("partnerType");

-- CreateIndex
CREATE INDEX "partner_interaction_partnerId_idx" ON "partner_interaction"("partnerId");

-- CreateIndex
CREATE INDEX "partner_interaction_interactionType_idx" ON "partner_interaction"("interactionType");
