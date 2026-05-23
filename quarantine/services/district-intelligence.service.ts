import { PrismaClient } from "@prisma/client";
import { bharatOSLogger, LogComponent } from "../lib/logging/structured-logger";

const prisma = new PrismaClient();

export async function updateDistrictDemandMemory(params: {
  districtId: number;
  domain: string;
  entity: string;
  query?: string;
  normalizedIntent?: string;
  confidence?: number;
  matchedEntities?: number;
}) {
  console.log("DISTRICT_MEMORY_ENTER", {
    districtId: params.districtId,
    domain: params.domain,
    entity: params.entity,
  });
  try {
    const updateData = {
      demandCount: { increment: 1 },
      lastQueried: new Date(),
      query: params.query ?? null,
      normalizedIntent: params.normalizedIntent ?? null,
      confidence: params.confidence ?? null,
      matchedEntities: params.matchedEntities ?? 0
    };

    console.log("UPSERT_UPDATE_PAYLOAD", {
      districtId: params.districtId,
      domain: params.domain,
      entity: params.entity,
      updateData
    });

    const result = await prisma.districtDemandMemory.upsert({
      where: {
        districtId_domain_entity: {
          districtId: params.districtId,
          domain: params.domain,
          entity: params.entity,
        },
      },
      update: updateData,
      create: {
        districtId: params.districtId,
        domain: params.domain,
        entity: params.entity,
        query: params.query ?? null,
        normalizedIntent: params.normalizedIntent ?? null,
        confidence: params.confidence ?? null,
        matchedEntities: params.matchedEntities ?? 0,
        demandCount: 1,
        lastQueried: new Date(),
      },
    });

    console.log("UPSERT_RESULT", {
      id: result.id,
      districtId: result.districtId,
      domain: result.domain,
      entity: result.entity,
      normalizedIntent: result.normalizedIntent,
      confidence: result.confidence,
      matchedEntities: result.matchedEntities,
      demandCount: result.demandCount
    });
    console.log("DISTRICT_MEMORY_SUCCESS", {
      districtId: params.districtId,
      domain: params.domain,
      entity: params.entity,
    });
  } catch (error) {
    console.error("DISTRICT_MEMORY_ERROR", {
      districtId: params.districtId,
      domain: params.domain,
      entity: params.entity,
      error: error.message,
    });
  }
}

export async function updateDistrictSupplyGap(params: {
  districtId: number;
  domain: string;
  entity: string;
  gapType: string;
}) {
  try {
    await prisma.districtSupplyGap.upsert({
      where: {
        districtId_domain_entity: {
          districtId: params.districtId,
          domain: params.domain,
          entity: params.entity,
        },
      },
      update: {
        reports: { increment: 1 },
        lastReportedAt: new Date(),
      },
      create: {
        districtId: params.districtId,
        domain: params.domain,
        entity: params.entity,
        gapType: params.gapType,
        reports: 1,
        lastReportedAt: new Date(),
      },
    });

    console.log("SUPPLY_GAP_SUCCESS", {
      districtId: params.districtId,
      domain: params.domain,
      entity: params.entity,
      gapType: params.gapType,
    });
  } catch (error) {
    console.error("SUPPLY_GAP_ERROR", {
      districtId: params.districtId,
      domain: params.domain,
      entity: params.entity,
      error: error.message,
    });
  }
}

export async function updateEconomicCluster(params: {
  districtId: number;
  clusterType: string;
  economicIndicator: string;
  value: number;
}) {
  try {
    await prisma.districtEconomicCluster.upsert({
      where: {
        districtId_clusterType: {
          districtId: params.districtId,
          clusterType: params.clusterType,
        },
      },
      update: {
        economicIndicator: params.economicIndicator,
        value: params.value,
        lastUpdatedAt: new Date(),
      },
      create: {
        districtId: params.districtId,
        clusterType: params.clusterType,
        economicIndicator: params.economicIndicator,
        value: params.value,
        lastUpdatedAt: new Date(),
      },
    });

    console.log("ECONOMIC_CLUSTER_SUCCESS", {
      districtId: params.districtId,
      clusterType: params.clusterType,
    });
  } catch (error) {
    console.error("ECONOMIC_CLUSTER_ERROR", {
      districtId: params.districtId,
      clusterType: params.clusterType,
      error: error.message,
    });
  }
}

export async function updateSharedLearning(params: {
  districtId: number;
  areaKey: string;
  domain: string;
  searchTerms: string[];
  vendorIds: number[];
  productIds: number[];
  successScore: number;
  responseMode: string;
}) {
  try {
    await prisma.sharedDistrictLearning.create({
      data: {
        domain: params.domain,
        pattern: `${params.domain}_${params.responseMode}`, // Safe fallback pattern
        confidence: Math.min(params.successScore / 100, 1.0), // Normalize to 0-1
        sourceDistrict: params.districtId,
      },
    });

    bharatOSLogger.info(LogComponent.DEMAND, 'shared_learning_success', 'District learning pattern recorded', {
      districtId: params.districtId,
      domain: params.domain,
      pattern: `${params.domain}_${params.responseMode}`,
      confidence: Math.min(params.successScore / 100, 1.0),
      vendorCount: params.vendorIds.length,
      productCount: params.productIds.length
    });
  } catch (error) {
    bharatOSLogger.error(LogComponent.DEMAND, 'shared_learning_failure', 'Failed to record district learning pattern', {
      districtId: params.districtId,
      domain: params.domain,
    }, error);
  }
}