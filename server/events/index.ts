/**
 * SOVEREIGN EVENT BUS FOUNDATION
 *
 * Enterprise-grade event system for BharatOS commerce infrastructure.
 * Decouples business logic from side effects.
 *
 * Events are published to this bus, subscribers handle them asynchronously.
 */

// ============================================
// EVENT TYPES
// ============================================

export enum EventType {
  // Order Lifecycle
  ORDER_CREATED = 'order.created',
  ORDER_CONFIRMED = 'order.confirmed',
  ORDER_PREPARING = 'order.preparing',
  ORDER_READY = 'order.ready',
  ORDER_SHIPPED = 'order.shipped',
  ORDER_DELIVERED = 'order.delivered',
  ORDER_CANCELLED = 'order.cancelled',
  ORDER_REFUNDED = 'order.refunded',

  // Payment Events
  PAYMENT_INITIATED = 'payment.initiated',
  PAYMENT_COMPLETED = 'payment.completed',
  PAYMENT_FAILED = 'payment.failed',
  PAYMENT_REFUNDED = 'payment.refunded',

  // Inventory Events
  STOCK_RESERVED = 'stock.reserved',
  STOCK_RELEASED = 'stock.released',
  STOCK_SOLD = 'stock.sold',
  LOW_STOCK_ALERT = 'low_stock.alert',

  // Vendor Events
  VENDOR_ORDER_RECEIVED = 'vendor.order.received',
  VENDOR_PAYMENT_RECEIVED = 'vendor.payment.received',

  // Customer Events
  CUSTOMER_NOTIFICATION = 'customer.notification',
  CUSTOMER_REFUND_PROCESSED = 'customer.refund.processed'
}

// ============================================
// EVENT PAYLOADS
// ============================================

export interface BaseEvent {
  id: string;
  type: EventType;
  timestamp: Date;
  districtId: number;
  data: any;
}

export interface OrderEvent extends BaseEvent {
  type: EventType.ORDER_CREATED | EventType.ORDER_CONFIRMED | EventType.ORDER_PREPARING |
  EventType.ORDER_READY | EventType.ORDER_SHIPPED | EventType.ORDER_DELIVERED |
  EventType.ORDER_CANCELLED | EventType.ORDER_REFUNDED;
  data: {
    orderId: number;
    userId?: number;
    totalAmountPaisa: number;
    itemCount: number;
    vendorIds: number[];
  };
}

export interface PaymentEvent extends BaseEvent {
  type: EventType.PAYMENT_INITIATED | EventType.PAYMENT_COMPLETED | EventType.PAYMENT_FAILED | EventType.PAYMENT_REFUNDED;
  data: {
    orderId: number;
    amountPaisa: number;
    method: string;
    transactionId?: string;
  };
}

export interface InventoryEvent extends BaseEvent {
  type: EventType.STOCK_RESERVED | EventType.STOCK_RELEASED | EventType.STOCK_SOLD | EventType.LOW_STOCK_ALERT;
  data: {
    productId: number;
    quantity: number;
    availableStock: number;
    reservedStock: number;
    soldStock: number;
  };
}

export type CommerceEvent = OrderEvent | PaymentEvent | InventoryEvent;

// ============================================
// EVENT BUS INTERFACE
// ============================================

export interface EventBus {
  publish(event: CommerceEvent): Promise<void>;
  subscribe(eventType: EventType, handler: EventHandler): void;
  unsubscribe(eventType: EventType, handler: EventHandler): void;
}

export type EventHandler = (event: CommerceEvent) => Promise<void>;

// ============================================
// EVENT PUBLISHER
// ============================================

export class EventPublisher {
  constructor(private eventBus: EventBus) { }

  async publishOrderCreated(orderId: number, districtId: number, userId: number | undefined, totalAmountPaisa: number, itemCount: number, vendorIds: number[]): Promise<void> {
    await this.eventBus.publish({
      id: generateEventId(),
      type: EventType.ORDER_CREATED,
      timestamp: new Date(),
      districtId,
      data: { orderId, userId, totalAmountPaisa, itemCount, vendorIds }
    });
  }

  async publishOrderStatusChanged(orderId: number, districtId: number, newStatus: string): Promise<void> {
    const eventType = getOrderStatusEventType(newStatus);
    if (!eventType) return;

    const orderEvent: OrderEvent = {
      id: generateEventId(),
      type: eventType as OrderEvent['type'],
      timestamp: new Date(),
      districtId,
      data: { orderId, totalAmountPaisa: 0, itemCount: 0, vendorIds: [] }
    };
    await this.eventBus.publish(orderEvent);
  }

  async publishStockReserved(productId: number, districtId: number, quantity: number, availableStock: number, reservedStock: number): Promise<void> {
    await this.eventBus.publish({
      id: generateEventId(),
      type: EventType.STOCK_RESERVED,
      timestamp: new Date(),
      districtId,
      data: { productId, quantity, availableStock, reservedStock, soldStock: 0 }
    });
  }
}

// ============================================
// UTILITIES
// ============================================

function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getOrderStatusEventType(status: string): EventType | null {
  switch (status.toUpperCase()) {
    case 'ACCEPTED':
    case 'CONFIRMED': return EventType.ORDER_CONFIRMED;
    case 'PREPARING': return EventType.ORDER_PREPARING;
    case 'READY': return EventType.ORDER_READY;
    case 'SHIPPED': return EventType.ORDER_SHIPPED;
    case 'DELIVERED': return EventType.ORDER_DELIVERED;
    case 'CANCELLED': return EventType.ORDER_CANCELLED;
    case 'REFUNDED': return EventType.ORDER_REFUNDED;
    default: return null;
  }
}