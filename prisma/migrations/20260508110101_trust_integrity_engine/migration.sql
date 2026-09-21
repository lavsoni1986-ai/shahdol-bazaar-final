-- CreateTable
CREATE TABLE "trust_signal" (
    "id" SERIAL NOT NULL,
    "vendor_id" INTEGER NOT NULL,
    "signalType" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'organic',
    "context" JSONB,

    CONSTRAINT "trust_signal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trust_signal_vendor_id_idx" ON "trust_signal"("vendor_id");

-- CreateIndex
CREATE INDEX "trust_signal_signalType_idx" ON "trust_signal"("signalType");

-- CreateIndex
CREATE INDEX "trust_signal_timestamp_idx" ON "trust_signal"("timestamp");

-- CreateIndex
CREATE INDEX "trust_signal_source_idx" ON "trust_signal"("source");
