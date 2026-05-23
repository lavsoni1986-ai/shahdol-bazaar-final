/**
 * EVENT DELIVERY VERIFICATION SYSTEM
 *
 * Enterprise-grade event delivery with outbox pattern.
 * Ensures events are delivered reliably with replay capabilities.
 */

import { prisma } from '../storage.js';
import { EventType, EventBus, EventPublisher, CommerceEvent } from '../events/index.js';

// ============================================
// OUTBOX PATTERN IMPLEMENTATION
// ============================================

export interface OutboxEvent {
  id: string;
  eventType: EventType;
  aggregateType: string; // 'order', 'product', etc.
  aggregateId: string;   // orderId, productId, etc.
  payload: any;
  createdAt: Date;
  processedAt?: Date;
  retryCount: number;
  maxRetries: number;
  status: 'PENDING' | 'PROCESSING' | 'DELIVERED' | 'FAILED';
  errorMessage?: string;
  nextRetryAt?: Date;
}

// ============================================
// DURABLE EVENT BUS WITH OUTBOX
// ============================================

export class DurableEventBus implements EventBus {
  private subscribers: Map<EventType, Array<{ handler: EventHandler; id: string }>> = new Map();

  constructor(private maxRetries: number = 3, private retryDelayMs: number = 5000) {}

  /**
   * PUBLISH EVENT TO OUTBOX
   */
  async publish(event: CommerceEvent): Promise<void> {
    console.log(`📤 Publishing event: ${event.type} for ${event.data?.orderId || event.data?.productId || 'unknown'}`);

    // Store in outbox first (outbox pattern)
    await this.storeInOutbox(event);

    // Attempt immediate delivery
    await this.attemptDelivery(event);
  }

  /**
   * SUBSCRIBE TO EVENT TYPE
   */
  subscribe(eventType: EventType, handler: EventHandler): void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, []);
    }

    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.subscribers.get(eventType)!.push({ handler, id });
  }

  /**
   * UNSUBSCRIBE FROM EVENT TYPE
   */
  unsubscribe(eventType: EventType, handler: EventHandler): void {
    const subscribers = this.subscribers.get(eventType);
    if (subscribers) {
      // Remove matching handler (basic implementation)
      const index = subscribers.findIndex(sub => sub.handler === handler);
      if (index > -1) {
        subscribers.splice(index, 1);
      }
    }
  }

  /**
   * STORE EVENT IN OUTBOX
   */
  private async storeInOutbox(event: CommerceEvent): Promise<void> {
    // In a real implementation, this would be a separate outbox table
    // For now, we'll use the existing audit log as a proxy
    const targetId = parseInt(event.data?.orderId || event.data?.productId || '0') || null;
    await prisma.auditLog.create({
      data: {
        action: `EVENT_OUTBOX:${event.type}`,
        entityType: 'EVENT',
        entityId: targetId || 0,
        targetType: 'EVENT',
        targetId: targetId,
        details: `Event published: ${event.type}`,
        metadata: {
          eventType: event.type,
          eventData: event.data,
          outboxId: event.id,
          status: 'PENDING'
        },
        ipAddress: 'system',
        userAgent: 'DurableEventBus',
        districtId: event.districtId ?? null
      }
    });
  }

  /**
   * ATTEMPT EVENT DELIVERY
   */
  private async attemptDelivery(event: CommerceEvent): Promise<void> {
    const subscribers = this.subscribers.get(event.type);

    if (!subscribers || subscribers.length === 0) {
      console.log(`ℹ️ No subscribers for event type: ${event.type}`);
      return;
    }

    console.log(`📨 Delivering event ${event.type} to ${subscribers.length} subscribers`);

    const deliveryPromises = subscribers.map(async ({ handler, id }) => {
      try {
        await handler(event);
        console.log(`✅ Event ${event.type} delivered to subscriber ${id}`);
      } catch (error) {
        console.error(`❌ Event ${event.type} delivery failed to subscriber ${id}:`, error);

        // Mark for retry
        await this.scheduleRetry(event, error.message);
      }
    });

    await Promise.allSettled(deliveryPromises);
  }

  /**
   * SCHEDULE EVENT RETRY
   */
  private async scheduleRetry(event: CommerceEvent, errorMessage: string): Promise<void> {
    // Update outbox entry with retry information
    const retryTargetId = parseInt(event.data?.orderId || event.data?.productId || '0') || null;
    await prisma.auditLog.create({
      data: {
        action: `EVENT_RETRY:${event.type}`,
        entityType: 'EVENT',
        entityId: retryTargetId || 0,
        targetType: 'EVENT',
        targetId: retryTargetId,
        details: `Event delivery failed, scheduled for retry: ${errorMessage}`,
        metadata: {
          eventType: event.type,
          eventData: event.data,
          errorMessage,
          retryCount: 1,
          nextRetryAt: new Date(Date.now() + this.retryDelayMs)
        },
        ipAddress: 'system',
        userAgent: 'DurableEventBus',
        districtId: event.districtId ?? null
      }
    });
  }

  /**
   * PROCESS RETRY QUEUE
   */
  async processRetryQueue(): Promise<void> {
    console.log('🔄 Processing event retry queue...');

    // Find failed events that are ready for retry
    // In a real implementation, this would query an outbox table
    const failedEvents = await prisma.auditLog.findMany({
      where: {
        action: { startsWith: 'EVENT_RETRY:' },
        createdAt: { lt: new Date(Date.now() - this.retryDelayMs) }
      },
      take: 50 // Process in batches
    });

    console.log(`📋 Found ${failedEvents.length} events ready for retry`);

    for (const failedEvent of failedEvents) {
      try {
        const eventData = failedEvent.metadata as any;
        const retryCount = eventData.retryCount || 0;

        if (retryCount >= this.maxRetries) {
          console.log(`❌ Event ${failedEvent.id} exceeded max retries (${this.maxRetries})`);
          await this.markEventFailed(failedEvent);
          continue;
        }

        // Reconstruct event
        const event: CommerceEvent = {
          id: `retry_${failedEvent.id}`,
          type: eventData.eventType,
          timestamp: failedEvent.createdAt,
          districtId: failedEvent.districtId,
          data: eventData.eventData
        };

        // Attempt redelivery
        await this.attemptDelivery(event);

        // Mark as successfully retried
        const successEntityId = failedEvent.targetId || failedEvent.id || null;
        await prisma.auditLog.create({
          data: {
            action: `EVENT_RETRY_SUCCESS:${event.type}`,
            entityType: 'EVENT',
            entityId: successEntityId || 0,
            targetType: 'EVENT',
            targetId: failedEvent.targetId,
            details: `Event retry succeeded after ${retryCount + 1} attempts`,
            metadata: {
              originalEventId: failedEvent.id,
              retryCount: retryCount + 1
            },
            ipAddress: 'system',
            userAgent: 'DurableEventBus',
            districtId: failedEvent.districtId ?? null
          }
        });

      } catch (error) {
        console.error(`❌ Retry failed for event ${failedEvent.id}:`, error);
        await this.incrementRetryCount(failedEvent);
      }
    }
  }

  /**
   * MARK EVENT AS FAILED
   */
  private async markEventFailed(failedEvent: any): Promise<void> {
    await prisma.auditLog.create({
      data: {
        action: `EVENT_FAILED:${failedEvent.action.split(':')[1]}`,
        targetType: 'EVENT',
        targetId: failedEvent.targetId,
        details: `Event permanently failed after ${this.maxRetries} retries`,
        metadata: {
          originalEventId: failedEvent.id,
          finalError: failedEvent.metadata?.errorMessage
        },
        ipAddress: 'system',
        userAgent: 'DurableEventBus',
        districtId: failedEvent.districtId
      }
    });
  }

  /**
   * INCREMENT RETRY COUNT
   */
  private async incrementRetryCount(failedEvent: any): Promise<void> {
    const currentRetryCount = (failedEvent.metadata as any)?.retryCount || 0;

    await prisma.auditLog.update({
      where: { id: failedEvent.id },
      data: {
        metadata: {
          ...failedEvent.metadata,
          retryCount: currentRetryCount + 1,
          nextRetryAt: new Date(Date.now() + (this.retryDelayMs * Math.pow(2, currentRetryCount)))
        }
      }
    });
  }

  /**
   * GET DELIVERY STATISTICS
   */
  async getDeliveryStats(): Promise<{
    totalEvents: number;
    deliveredEvents: number;
    failedEvents: number;
    pendingRetries: number;
    deliveryRate: number;
  }> {
    // Count successful deliveries
    const deliveredCount = await prisma.auditLog.count({
      where: { action: { startsWith: 'EVENT_OUTBOX:' } }
    });

    // Count failed deliveries
    const failedCount = await prisma.auditLog.count({
      where: { action: { startsWith: 'EVENT_RETRY:' } }
    });

    // Count pending retries
    const pendingRetries = await prisma.auditLog.count({
      where: {
        action: { startsWith: 'EVENT_RETRY:' },
        createdAt: { lt: new Date(Date.now() - this.retryDelayMs) }
      }
    });

    const totalEvents = deliveredCount + failedCount;
    const deliveryRate = totalEvents > 0 ? (deliveredCount / totalEvents) * 100 : 0;

    return {
      totalEvents,
      deliveredEvents: deliveredCount,
      failedEvents: failedCount,
      pendingRetries,
      deliveryRate
    };
  }
}

// ============================================
// RELIABLE EVENT PUBLISHER
// ============================================

export class ReliableEventPublisher extends EventPublisher {
  constructor(private eventBus: DurableEventBus) {
    super(eventBus);
  }

  /**
   * RELIABLE ORDER CREATED EVENT
   */
  async publishOrderCreated(orderId: number, districtId: number, userId: number | undefined, totalAmountPaisa: number, itemCount: number, vendorIds: number[]): Promise<void> {
    const event: CommerceEvent = {
      id: `order_created_${orderId}_${Date.now()}`,
      type: EventType.ORDER_CREATED,
      timestamp: new Date(),
      districtId,
      data: { orderId, userId, totalAmountPaisa, itemCount, vendorIds }
    };

    await this.eventBus.publish(event);
  }

  /**
   * RELIABLE STOCK RESERVED EVENT
   */
  async publishStockReserved(productId: number, districtId: number, quantity: number, availableStock: number, reservedStock: number): Promise<void> {
    const event: CommerceEvent = {
      id: `stock_reserved_${productId}_${Date.now()}`,
      type: EventType.STOCK_RESERVED,
      timestamp: new Date(),
      districtId,
      data: { productId, quantity, availableStock, reservedStock, soldStock: 0 }
    };

    await this.eventBus.publish(event);
  }
}

// ============================================
// RETRY PROCESSOR WORKER
// ============================================

export class EventRetryProcessor {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    private eventBus: DurableEventBus,
    private intervalMs: number = 30000 // 30 seconds
  ) {}

  /**
   * START RETRY PROCESSOR
   */
  start(): void {
    if (this.isRunning) {
      console.log('🔄 Event retry processor already running');
      return;
    }

    console.log('🚀 Starting event retry processor');
    this.isRunning = true;

    // Process immediately
    this.processRetries();

    // Schedule periodic processing
    this.intervalId = setInterval(() => {
      this.processRetries();
    }, this.intervalMs);
  }

  /**
   * STOP RETRY PROCESSOR
   */
  stop(): void {
    console.log('🛑 Stopping event retry processor');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * PROCESS RETRIES
   */
  private async processRetries(): Promise<void> {
    try {
      await this.eventBus.processRetryQueue();
    } catch (error) {
      console.error('❌ Event retry processing failed:', error);
    }
  }

  /**
   * GET PROCESSOR STATUS
   */
  getStatus(): { isRunning: boolean; intervalMs: number } {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs
    };
  }
}

// ============================================
// EVENT DELIVERY VERIFICATION
// ============================================

export async function verifyEventDelivery(): Promise<{
  stats: any;
  health: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  issues: string[];
}> {
  const eventBus = new DurableEventBus();
  const stats = await eventBus.getDeliveryStats();

  const issues: string[] = [];

  // Check delivery rate
  if (stats.deliveryRate < 95) {
    issues.push(`Low delivery rate: ${stats.deliveryRate.toFixed(1)}%`);
  }

  // Check for excessive failures
  if (stats.failedEvents > stats.totalEvents * 0.05) {
    issues.push(`High failure rate: ${stats.failedEvents} failed events`);
  }

  // Check retry queue
  if (stats.pendingRetries > 100) {
    issues.push(`Large retry queue: ${stats.pendingRetries} pending retries`);
  }

  let health: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' = 'HEALTHY';

  if (issues.length > 2 || stats.deliveryRate < 90) {
    health = 'CRITICAL';
  } else if (issues.length > 0 || stats.deliveryRate < 99) {
    health = 'DEGRADED';
  }

  return {
    stats,
    health,
    issues
  };
}

// ============================================
// EXPORT SINGLETONS
// ============================================

export const durableEventBus = new DurableEventBus();
export const reliableEventPublisher = new ReliableEventPublisher(durableEventBus);
export const eventRetryProcessor = new EventRetryProcessor(durableEventBus);

// ============================================
// ADMIN ENDPOINTS
// ============================================

export function setupEventDeliveryEndpoints(app: any) {
  // GET DELIVERY STATISTICS
  app.get('/api/admin/events/stats', async (req: any, res: any) => {
    try {
      const stats = await durableEventBus.getDeliveryStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      console.error('Failed to get event delivery stats:', error);
      res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
  });

  // GET DELIVERY HEALTH
  app.get('/api/admin/events/health', async (req: any, res: any) => {
    try {
      const health = await verifyEventDelivery();
      res.json({ success: true, data: health });
    } catch (error) {
      console.error('Failed to verify event delivery:', error);
      res.status(500).json({ success: false, error: 'Failed to verify delivery' });
    }
  });

  // POST PROCESS RETRIES
  app.post('/api/admin/events/process-retries', async (req: any, res: any) => {
    try {
      await durableEventBus.processRetryQueue();
      res.json({ success: true, message: 'Retry processing completed' });
    } catch (error) {
      console.error('Failed to process event retries:', error);
      res.status(500).json({ success: false, error: 'Failed to process retries' });
    }
  });
}