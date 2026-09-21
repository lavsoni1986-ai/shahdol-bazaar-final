-- AlterTable
ALTER TABLE "partner_interaction" ADD COLUMN     "value" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "demand_intelligence" (
    "id" SERIAL NOT NULL,
    "district_id" INTEGER NOT NULL,
    "domain" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "frequency" INTEGER NOT NULL DEFAULT 1,
    "lastQueried" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trend" TEXT NOT NULL DEFAULT 'stable',
    "economicContext" JSONB,
    "temporalPatterns" JSONB,
    "geographicPatterns" JSONB,
    "userDemographics" JSONB,
    "businessInsights" JSONB,

    CONSTRAINT "demand_intelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "demand_intelligence_district_id_idx" ON "demand_intelligence"("district_id");

-- CreateIndex
CREATE INDEX "demand_intelligence_domain_idx" ON "demand_intelligence"("domain");

-- CreateIndex
CREATE INDEX "demand_intelligence_frequency_idx" ON "demand_intelligence"("frequency");

-- CreateIndex
CREATE INDEX "demand_intelligence_lastQueried_idx" ON "demand_intelligence"("lastQueried");

-- CreateIndex
CREATE UNIQUE INDEX "demand_intelligence_district_id_domain_entity_key" ON "demand_intelligence"("district_id", "domain", "entity");
