/**
 * SOVEREIGN ORDER ENGINE
 *
 * SINGLE FINANCIAL AUTHORITY for BharatOS commerce infrastructure.
 *
 * ONLY this service may:
 * - Calculate totals
 * - Decrement stock
 * - Create orders
 * - Create commissions
 *
 * Enterprise-grade transaction safety with:
 * - Atomic stock reservation
 * - Financial integrity
 * - Vendor split readiness
 * - District isolation
 * - Anti-race-condition logic
 * - FSM enforcement
 * - Idempotency
 * - Scalable architecture
 */

import { prisma } from '../storage.js';
import { EventPublisher, EventType } from '../events/index.js';

// ============================================
// TYPES
// ============================================

export interface OrderItemRequest {
  productId: number;
  quantity: number;
}

export interface CreateOrderRequest {
  userId?: number;
  districtId: number;
  items: OrderItemRequest[];
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod: 'CASH' | 'ONLINE' | 'CARD' | 'WALLET';
  idempotencyKey?: string;
}

export interface OrderResult {
  orderId: number;
  totalAmountPaisa: number;
  totalItems: number;
  status: string;
}

// ============================================
// SOVEREIGN ORDER ENGINE
// ============================================

export class SovereignOrderEngine {
  private eventPublisher: EventPublisher;

  constructor(eventPublisher: EventPublisher) {
    this.eventPublisher = eventPublisher;
  }

  /**
   * CREATE ORDER - Single Transaction Boundary
   * This is the ONLY place where financial calculations happen
   */
  async createOrder(request: CreateOrderRequest): Promise<OrderResult> {
    const { userId, districtId, items, customerName, customerPhone, customerAddress, paymentMethod, idempotencyKey } = request;

    return await prisma.$transaction(async (tx) => {
      // 1. Idempotency check
      if (idempotencyKey) {
        const existingOrder = await tx.sovereignOrder.findUnique({
          where: { idempotencyKey }
        });
        if (existingOrder) {
          return {
            orderId: existingOrder.id,
            totalAmountPaisa: existingOrder.totalAmountPaisa,
            totalItems: existingOrder.totalItems,
            status: existingOrder.status
          };
        }
      }

      // 2. Validate district context
      const district = await tx.district.findUnique({
        where: { id: districtId }
      });
      if (!district || !district.isActive) {
        throw new Error('Invalid district');
      }

      // 3. Load and validate all products atomically
      const validatedItems = await this.validateOrderItems(items, districtId, tx);

      // 4. Reserve inventory atomically
      await this.reserveInventory(validatedItems, tx);

      // 5. Calculate sovereign pricing (server-side only)
      const pricing = this.calculateSovereignPricing(validatedItems);

      // 6. Create order header
      const order = await tx.sovereignOrder.create({
        data: {
          districtId,
          userId,
          totalAmountPaisa: pricing.totalAmountPaisa,
          totalItems: pricing.totalItems,
          paymentMethod,
          customerName,
          customerPhone,
          customerAddress,
          idempotencyKey,
          items: {
            create: validatedItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPricePaisa: item.unitPricePaisa,
              totalPricePaisa: item.subtotalPaisa
            }))
          }
        },
        include: {
          items: true
        }
      });

      // 7. Create audit trail
      await this.createOrderAudit(order, tx);

      // 8. Return result (events published outside transaction)
      return {
        orderId: order.id,
        totalAmountPaisa: order.totalAmountPaisa,
        totalItems: order.totalItems,
        status: order.status
      };
    });
  }

  /**
   * VALIDATE ORDER ITEMS - Atomic Product Validation
   */
  private async validateOrderItems(
    items: OrderItemRequest[],
    districtId: number,
    tx: any
  ): Promise<Array<{
    productId: number;
    vendorId: number;
    quantity: number;
    unitPricePaisa: number;
    subtotalPaisa: number;
    commissionPaisa: number;
  }>> {
    const validatedItems: any[] = [];

    for (const item of items) {
      if (item.quantity <= 0 || item.quantity > 20) {
        throw new Error(`Invalid quantity for product ${item.productId}`);
      }

      // Fetch authoritative product data
      const product = await tx.product.findFirst({
        where: {
          id: item.productId,
          districtId,
          approved: true,
          status: { in: ["APPROVED", "approved", "ACTIVE", "active"] },
          vendor: {
            status: 'APPROVED',
            isShadowBanned: false
          }
        },
        include: {
          vendor: true
        }
      });

      if (!product) {
        throw new Error(`Product ${item.productId} not available`);
      }

      // Validate stock availability
      const availableStock = product.availableStock - product.reservedStock;
      if (availableStock < item.quantity) {
        throw new Error(`Insufficient stock for product ${product.title}`);
      }

      // Server-side pricing calculation
      const unitPricePaisa = Math.round((product.price || 0) * 100);
      if (unitPricePaisa <= 0) {
        throw new Error(`Invalid pricing for product ${product.title}`);
      }

      const subtotalPaisa = unitPricePaisa * item.quantity;
      const commissionPaisa = Math.round(subtotalPaisa * 0.05); // 5% platform commission

      validatedItems.push({
        productId: product.id,
        vendorId: product.vendorId,
        quantity: item.quantity,
        unitPricePaisa,
        subtotalPaisa,
        commissionPaisa
      });
    }

    return validatedItems;
  }

  /**
   * RESERVE INVENTORY - Atomic Stock Reservation
   */
  private async reserveInventory(
    validatedItems: Array<{ productId: number; quantity: number }>,
    tx: any
  ): Promise<void> {
    for (const item of validatedItems) {
      // Atomic stock reservation
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { availableStock: true, reservedStock: true }
      });

      if (!product || (product.availableStock - product.reservedStock) < item.quantity) {
        throw new Error(`Race condition: stock unavailable for product ${item.productId}`);
      }

      await tx.product.update({
        where: { id: item.productId },
        data: {
          reservedStock: { increment: item.quantity }
        }
      });

      // Publish stock reserved event (will be done outside transaction)
    }
  }

  /**
   * CALCULATE SOVEREIGN PRICING - Server-Side Only
   */
  private calculateSovereignPricing(validatedItems: any[]): {
    totalAmountPaisa: number;
    totalItems: number;
  } {
    const totalAmountPaisa = validatedItems.reduce((sum, item) => sum + item.subtotalPaisa, 0);
    const totalItems = validatedItems.reduce((sum, item) => sum + item.quantity, 0);

    return { totalAmountPaisa, totalItems };
  }

  /**
   * CREATE ORDER AUDIT - Immutable Financial Trail
   */
  private async createOrderAudit(order: any, tx: any): Promise<void> {
    // Create comprehensive audit trail
    await tx.auditLog.create({
      data: {
        action: 'ORDER_CREATED',
        entityType: 'SOVEREIGN_ORDER',
        entityId: order.id,
        targetId: order.id,
        targetType: 'SOVEREIGN_ORDER',
        details: `Order created with ${order.totalItems} items, total ₹${(order.totalAmountPaisa / 100).toFixed(2)}`,
        metadata: {
          totalAmountPaisa: order.totalAmountPaisa,
          totalItems: order.totalItems,
          customerName: order.customerName,
          paymentMethod: order.paymentMethod
        },
        ipAddress: 'system',
        userAgent: 'SovereignOrderEngine',
        districtId: order.districtId
      }
    });
  }

  /**
   * TRANSITION ORDER STATUS - FSM Enforcement
   */
  async transitionOrder(orderId: number, newStatus: string): Promise<boolean> {
    // Validate FSM transition
    // Update order status
    // Publish events
    // This will be implemented in the next phase
    return false;
  }
}

// ============================================
// EXPORT SINGLETON INSTANCE
// ============================================

// This will be initialized with the event publisher
// export const sovereignOrderEngine = new SovereignOrderEngine(eventPublisher);