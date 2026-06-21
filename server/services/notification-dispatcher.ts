import { prisma } from "../storage";
import { durableEventBus } from "./event-delivery-verification";
import { EventType, CommerceEvent } from "../events";
import crypto from "crypto";

// ============================================
// CHANNEL ADAPTER INTERFACE & REGISTRY
// ============================================

export interface ChannelAdapter {
  send(recipient: string, message: string, metadata: any): Promise<{ success: boolean; error?: string }>;
}

export class ChannelRegistry {
  private adapters: Map<string, ChannelAdapter> = new Map();

  register(channel: string, adapter: ChannelAdapter) {
    this.adapters.set(channel.toUpperCase(), adapter);
    console.log(`🔌 [NOTIFICATION REGISTRY] Registered adapter for channel: ${channel.toUpperCase()}`);
  }

  get(channel: string): ChannelAdapter | undefined {
    return this.adapters.get(channel.toUpperCase());
  }

  async dispatch(channel: string, recipient: string, message: string, metadata: any): Promise<{ success: boolean; error?: string }> {
    const adapter = this.get(channel);
    if (!adapter) {
      return { success: false, error: `No adapter registered for channel: ${channel}` };
    }
    return await adapter.send(recipient, message, metadata);
  }
}

export const channelRegistry = new ChannelRegistry();

// ============================================
// MOCK CHANNEL ADAPTER IMPLEMENTATIONS
// ============================================

class WhatsAppAdapter implements ChannelAdapter {
  async send(recipient: string, message: string, metadata: any): Promise<{ success: boolean; error?: string }> {
    console.log(`📡 [NOTIFICATION] Channel: WHATSAPP | Recipient: ${recipient} | Message: "${message}"`);
    if (recipient.includes("simulate-fail")) {
      return { success: false, error: "WhatsApp provider connection timeout" };
    }
    return { success: true };
  }
}

class SMSAdapter implements ChannelAdapter {
  async send(recipient: string, message: string, metadata: any): Promise<{ success: boolean; error?: string }> {
    console.log(`📡 [NOTIFICATION] Channel: SMS | Recipient: ${recipient} | Message: "${message}"`);
    if (recipient.includes("simulate-fail")) {
      return { success: false, error: "SMS gateway provider rejected delivery" };
    }
    return { success: true };
  }
}

class PushAdapter implements ChannelAdapter {
  async send(recipient: string, message: string, metadata: any): Promise<{ success: boolean; error?: string }> {
    console.log(`📡 [NOTIFICATION] Channel: PUSH | Recipient: ${recipient} | Message: "${message}"`);
    if (recipient.includes("simulate-fail")) {
      return { success: false, error: "FCM registration token expired" };
    }
    return { success: true };
  }
}

// Register default mock adapters
channelRegistry.register("WHATSAPP", new WhatsAppAdapter());
channelRegistry.register("SMS", new SMSAdapter());
channelRegistry.register("PUSH", new PushAdapter());

// ============================================
// CENTRALIZED CUSTOMER TEMPLATES
// ============================================

export const NOTIFICATION_TEMPLATES = {
  ACCEPTED: "Your order #{orderId} has been accepted by the vendor.",
  PREPARING: "Your order #{orderId} is being prepared.",
  READY: "Your order #{orderId} is ready.",
  DELIVERED: "Your order #{orderId} has been delivered.",
  CANCELLED: "Your order #{orderId} has been cancelled."
};

function formatTemplate(template: string, variables: Record<string, any>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
  }
  return result;
}

// ============================================
// NOTIFICATION DISPATCHER SERVICE
// ============================================

export class NotificationDispatcher {
  private static instance: NotificationDispatcher;

  private constructor() {}

  static getInstance(): NotificationDispatcher {
    if (!NotificationDispatcher.instance) {
      NotificationDispatcher.instance = new NotificationDispatcher();
    }
    return NotificationDispatcher.instance;
  }

  /**
   * Listen for events and trigger notification flow safely
   */
  initialize() {
    console.log("🔔 [NOTIFICATION DISPATCHER] Initializing listeners...");
    
    const handleEvent = async (event: CommerceEvent) => {
      try {
        await this.processNotification(event);
      } catch (err) {
        // Safe boundary: never let notification exceptions propagate back to event bus retries
        console.error("❌ [NOTIFICATION DISPATCHER] Dispatch process failed safely:", err);
      }
    };

    durableEventBus.subscribe(EventType.ORDER_CONFIRMED, handleEvent);
    durableEventBus.subscribe(EventType.ORDER_PREPARING, handleEvent);
    durableEventBus.subscribe(EventType.ORDER_READY, handleEvent);
    durableEventBus.subscribe(EventType.ORDER_DELIVERED, handleEvent);
    durableEventBus.subscribe(EventType.ORDER_CANCELLED, handleEvent);
  }

  private async processNotification(event: CommerceEvent): Promise<void> {
    const orderId = (event.data as any).orderId;
    const districtId = event.districtId;

    if (!orderId || !districtId) {
      console.warn("⚠️ [NOTIFICATION DISPATCHER] Invalid event data", event);
      return;
    }

    // 🔒 DISTRICT BOUNDARY CHECK: Query order strictly by id and districtId
    const order = await prisma.order.findFirst({
      where: { id: orderId, districtId },
      include: {
        product: { select: { title: true } }
      }
    });

    if (!order) {
      console.warn(`⚠️ [NOTIFICATION DISPATCHER] Order #${orderId} not found in district #${districtId}. Leak blocked.`);
      return;
    }

    // Resolve vendor name via order.vendorId separately to match database schema
    let vendorName = "Merchant";
    if (order.vendorId) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: order.vendorId },
        select: { name: true }
      });
      if (vendor) {
        vendorName = vendor.name;
      }
    }

    const customerId = order.userId;
    const customerPhone = order.customerPhone || "Walk-in";
    const status = order.status.toLowerCase();
    
    // Resolve templates & channels
    let templateKey: keyof typeof NOTIFICATION_TEMPLATES | null = null;
    if (status === "accepted" || status === "confirmed") templateKey = "ACCEPTED";
    else if (status === "preparing") templateKey = "PREPARING";
    else if (status === "ready") templateKey = "READY";
    else if (status === "delivered") templateKey = "DELIVERED";
    else if (status === "cancelled") templateKey = "CANCELLED";

    if (!templateKey) {
      console.log(`ℹ️ [NOTIFICATION DISPATCHER] No template mapped for order status: ${status}`);
      return;
    }

    const rawTemplate = NOTIFICATION_TEMPLATES[templateKey];
    const message = formatTemplate(rawTemplate, {
      orderId,
      productName: order.product?.title || `Product #${order.productId}`,
      vendorName: vendorName
    });

    // Send across all three channels (WHATSAPP, SMS, PUSH)
    const channels = ["WHATSAPP", "SMS", "PUSH"];

    for (const channel of channels) {
      await this.dispatchChannelNotification({
        orderId,
        customerId,
        districtId,
        channel,
        template: rawTemplate,
        message,
        recipient: customerPhone,
        eventType: event.type,
        statusValue: status
      });
    }
  }

  private async dispatchChannelNotification(params: {
    orderId: number;
    customerId: number | null;
    districtId: number;
    channel: string;
    template: string;
    message: string;
    recipient: string;
    eventType: string;
    statusValue: string;
  }): Promise<void> {
    const { orderId, customerId, districtId, channel, template, message, recipient, eventType, statusValue } = params;

    // 🔒 IDEMPOTENCY KEY: sha256(orderId + status + channel)
    const fingerprintInput = `${orderId}:${statusValue}:${channel}`;
    const fingerprint = crypto.createHash("sha256").update(fingerprintInput).digest("hex");

    try {
      // Check existing successful dispatch in AuditLog in a database-agnostic way
      const logs = await prisma.auditLog.findMany({
        where: {
          action: "NOTIFICATION_DISPATCH",
          entityType: "NOTIFICATION",
          entityId: orderId
        }
      });

      const existingSuccess = logs.find(log => {
        const meta = log.metadata as any;
        return meta && meta.fingerprint === fingerprint && meta.status === "SENT";
      });

      if (existingSuccess) {
        console.log(`🛡️ [IDEMPOTENCY SKIP] Notification already sent successfully for ${fingerprintInput} (fingerprint: ${fingerprint.substring(0, 16)}...)`);
        return;
      }

      // Perform actual dispatch
      const result = await channelRegistry.dispatch(channel, recipient, message, { orderId });
      const dispatchStatus = result.success ? "SENT" : "FAILED";
      const errorMsg = result.error || null;

      // Cryptographic hash chain calculation
      const lastEntry = await prisma.auditLog.findFirst({
        orderBy: { id: "desc" },
        select: { hash: true }
      });

      const auditData = JSON.stringify({
        action: "NOTIFICATION_DISPATCH",
        orderId,
        customerId,
        districtId,
        channel,
        template,
        status: dispatchStatus,
        timestamp: new Date().toISOString(),
        eventType,
        fingerprint,
        error: errorMsg
      });

      const hash = crypto.createHash("sha256")
        .update((lastEntry?.hash || "GENESIS") + auditData)
        .digest("hex");

      // Write chained tamper-proof AuditLog entry
      await prisma.auditLog.create({
        data: {
          action: "NOTIFICATION_DISPATCH",
          entityType: "NOTIFICATION",
          entityId: orderId,
          targetId: customerId,
          targetType: "CUSTOMER",
          userId: customerId,
          districtId,
          details: {
            status: dispatchStatus,
            message: `Notification via ${channel}: status=${dispatchStatus}`
          },
          metadata: {
            orderId,
            customerId,
            districtId,
            channel,
            template,
            status: dispatchStatus,
            timestamp: new Date().toISOString(),
            eventType,
            fingerprint,
            error: errorMsg
          },
          ipAddress: "system",
          userAgent: "NotificationDispatcher",
          hash,
          prevHash: lastEntry?.hash || null
        }
      });

      console.log(`✅ [NOTIFICATION DISPATCHED] Order #${orderId} | Channel: ${channel} | Status: ${dispatchStatus}`);
    } catch (err: any) {
      console.error(`❌ [NOTIFICATION DISPATCH ERROR] Failed to send/log notification for Order #${orderId} via ${channel}:`, err);
    }
  }
}

export const notificationDispatcher = NotificationDispatcher.getInstance();
