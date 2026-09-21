-- CreateTable
CREATE TABLE "QueryIntelligence" (
    "id" SERIAL NOT NULL,
    "rawQuery" TEXT NOT NULL,
    "normalized" TEXT NOT NULL,
    "districtId" INTEGER NOT NULL,
    "domain" TEXT,
    "entity" TEXT,
    "temporal" TEXT,
    "urgency" TEXT,
    "actionability" TEXT,
    "fulfillment" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "source" TEXT DEFAULT 'AI_CONCIERGE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QueryIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QueryIntelligence_districtId_idx" ON "QueryIntelligence"("districtId");

-- CreateIndex
CREATE INDEX "QueryIntelligence_domain_idx" ON "QueryIntelligence"("domain");

-- CreateIndex
CREATE INDEX "QueryIntelligence_entity_idx" ON "QueryIntelligence"("entity");
