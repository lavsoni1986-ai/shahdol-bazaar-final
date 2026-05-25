import { prisma } from "../storage";
import { bharatOSLogger, LogComponent } from "../lib/logging/structured-logger";

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
    const updateData: any = {
      demandCount: { increment: 1 },
      lastQueried: new Date(),
      matchedEntities: params.matchedEntities ?? 0
    };

    // Only include non-null values in update
    if (params.query !== null) updateData.query = params.query;
    if (params.normalizedIntent !== null) updateData.normalizedIntent = params.normalizedIntent;
    if (params.confidence !== null) updateData.confidence = params.confidence;

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
        query: params.query || undefined,
        normalizedIntent: params.normalizedIntent || undefined,
        confidence: params.confidence || undefined,
        matchedEntities: params.matchedEntities ?? 0,
        demandCount: 1,
        lastQueried: new Date(),
      } as any,
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
      error: (error as any).message,
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
        demandCount: { increment: 1 },
        lastUpdated: new Date(),
      },
      create: {
        districtId: params.districtId,
        domain: params.domain,
        entity: params.entity,
        demandCount: 1,
        lastUpdated: new Date(),
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
      error: (error as any).message,
    });
  }
}

export async function updateEconomicCluster(params: {
  districtId: number;
  clusterType: string;
  economicIndicator: string;
  value: number;
}) {
  console.log("Mock updateEconomicCluster", params);
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
    await prisma.sharedLearning.create({
      data: {
        districtId: params.districtId,
        query: params.areaKey,
        domain: params.domain,
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
  } catch (error: any) {
    console.error('[SHARED_LEARNING_FAILURE] Detailed error:', {
      code: error?.code,
      meta: error?.meta,
      message: error?.message,
      stack: error?.stack,
      districtId: params.districtId,
      domain: params.domain,
      vendorIds: params.vendorIds?.length,
      productIds: params.productIds?.length
    });
    bharatOSLogger.error(LogComponent.DEMAND, 'shared_learning_failure', 'Failed to record district learning pattern', {
      districtId: params.districtId,
      domain: params.domain,
    }, error);
  }
}