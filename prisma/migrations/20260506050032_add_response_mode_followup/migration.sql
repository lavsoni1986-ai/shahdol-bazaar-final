-- AlterTable
ALTER TABLE "QueryIntelligence" ADD COLUMN     "followupGenerated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "responseMode" TEXT;
