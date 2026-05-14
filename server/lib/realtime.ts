// 🔥 CENTRALIZED REAL-TIME EMIT HELPERS
// Clean API for emitting real-time events with performance optimizations

// io is available globally from the main server
import { prisma } from "../storage";

// Performance optimizations
const emitQueue = new Map<string, Array<{event: string, payload: any, timestamp: number}>>();
const BATCH_DELAY = 1000; // 1 second batching
const MAX_BATCH_SIZE = 10;

// Throttle emits to prevent spam
const emitThrottle = new Map<string, number>();
const THROTTLE_DELAY = 2000; // 2 seconds between similar events

function shouldThrottle(key: string): boolean {
  const lastEmit = emitThrottle.get(key);
  const now = Date.now();

  if (!lastEmit || (now - lastEmit) > THROTTLE_DELAY) {
    emitThrottle.set(key, now);
    return false;
  }
  return true;
}

// District-specific events with throttling and persistence
export const emitDistrict = async (districtId: number, event: string, payload: any) => {
  const throttleKey = `district:${districtId}:${event}`;

  if (shouldThrottle(throttleKey)) {
    console.log(`⏱️ Throttled ${event} for district ${districtId}`);
    return;
  }

  try {
    const eventData = {
      ...payload,
      districtId,
      timestamp: new Date().toISOString()
    };

    // 🔥 EVENT PERSISTENCE: Store in DB for reliability
    await prisma.sovereignEvent.create({
      data: {
        districtId,
        type: event,
        payload: eventData
      }
    });

    // Emit to live connections
    (global as any).io?.to(`district:${districtId}`).emit(event, eventData);
  } catch (error) {
    console.error(`Failed to emit/persist ${event} to district ${districtId}:`, error);
  }
};

// System-wide events (super admins only) with persistence
export const emitSystem = async (event: string, payload: any) => {
  try {
    const eventData = {
      ...payload,
      timestamp: new Date().toISOString()
    };

    // 🔥 EVENT PERSISTENCE: Store system events
    await prisma.sovereignEvent.create({
      data: {
        districtId: 0, // System-wide
        type: `system:${event}`,
        payload: eventData
      }
    });

    // Emit to super admin connections
    (global as any).io?.to("system:alerts").emit(event, eventData);
  } catch (error) {
    console.error(`Failed to emit/persist system ${event}:`, error);
  }
};

// Vendor update events
export const emitVendorUpdate = (vendor: any) => {
  emitDistrict(vendor.districtId, "vendor:update", {
    type: "UPDATE",
    vendor: {
      id: vendor.id,
      name: vendor.name,
      status: vendor.status,
      dsslScore: vendor.dsslScore,
      isShadowBanned: vendor.isShadowBanned
    }
  });
};

// Policy execution events
export const emitPolicySummary = (districtId: number, summary: any) => {
  emitDistrict(districtId, "policy:summary", summary);
};

// ML signals update events
export const emitSignalsUpdate = (districtId: number, vendorId: number, signals: any) => {
  emitDistrict(districtId, "signals:update", {
    vendorId,
    ...signals
  });
};

// System alert events
export const emitSystemAlert = (districtId: number | null, alert: any) => {
  if (districtId) {
    emitDistrict(districtId, "system:alert", alert);
  } else {
    emitSystem("system:alert", alert);
  }
};

// Batch emit helper (performance optimization)
export const emitBatch = (districtId: number, events: Array<{event: string, payload: any}>) => {
  const batchKey = `batch:${districtId}`;
  const now = Date.now();

  // Add to batch queue
  if (!emitQueue.has(batchKey)) {
    emitQueue.set(batchKey, []);
  }

  const batch = emitQueue.get(batchKey)!;
  batch.push(...events.map(event => ({ ...event, timestamp: now })));

  // If batch is full, emit immediately
  if (batch.length >= MAX_BATCH_SIZE) {
    processBatch(districtId);
    return;
  }

  // Otherwise, schedule batch processing
  setTimeout(() => {
    if (emitQueue.has(batchKey) && emitQueue.get(batchKey)!.length > 0) {
      processBatch(districtId);
    }
  }, BATCH_DELAY);
};

function processBatch(districtId: number) {
  const batchKey = `batch:${districtId}`;
  const batch = emitQueue.get(batchKey);

  if (!batch || batch.length === 0) return;

  emitQueue.delete(batchKey);

  // Group events by type for efficiency
  const eventGroups = new Map<string, any[]>();

  batch.forEach(({event, payload}) => {
    if (!eventGroups.has(event)) {
      eventGroups.set(event, []);
    }
    eventGroups.get(event)!.push(payload);
  });

  // Emit grouped events
  eventGroups.forEach((payloads, event) => {
    if (payloads.length === 1) {
      emitDistrict(districtId, event, payloads[0]);
    } else {
      // Batch multiple events of same type
      emitDistrict(districtId, `${event}:batch`, { events: payloads });
    }
  });

  console.log(`📦 Processed batch of ${batch.length} events for district ${districtId}`);
}
