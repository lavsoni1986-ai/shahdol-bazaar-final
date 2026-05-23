import { updateOrder, findOrderById, withTransaction } from "../repositories";
import { parseOrderId } from "../utils/webhookSignatureVerifier";
import { recomputeTrustScore } from "./dssl.service";

/**
 * Cashfree webhook event types
 */
export type WebhookEventType = 
  | "PAYMENT_SUCCESS" 
  | "PAYMENT_FAILED" 
  | "PAYMENT_PENDING"
  | "ORDER_CREATED"
  | "ORDER_EXPIRED"
  | "PAID"
  | "EXPIRED";

/**
 * Cashfree webhook payload structure (actual Cashfree format)
 */
export interface CashfreeWebhookPayload {
  event_type: string;
  data: {
    order: {
      order_id: string;
      order_amount: number;
      order_currency?: string;
      order_status?: string;
    };
    payment: {
      cf_payment_id: string;
      payment_status: string;
      transaction_id?: string;
      transaction_amount?: number;
      transaction_message?: string;
    };
    customer_details?: {
      customer_id: string;
      customer_name: string;
      customer_email?: string;
      customer_phone: string;
    };
  };
}

/**
 * Maps Cashfree payment status to our order status
 */
function mapPaymentStatusToOrderStatus(paymentStatus: string): string {
  switch (paymentStatus.toLowerCase()) {
    case "success":
    case "paid":
      return "confirmed";
    case "failed":
      return "failed";
    case "pending":
      return "pending";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

/**
 * Maps Cashfree payment status to our payment status
 */
function mapPaymentStatusToPaymentStatus(paymentStatus: string): string {
  switch (paymentStatus.toLowerCase()) {
    case "success":
    case "paid":
      return "completed";
    case "failed":
      return "failed";
    case "pending":
      return "pending";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

/**
 * Handles successful payment webhook
 */
async function handlePaymentSuccess(payload: CashfreeWebhookPayload): Promise<boolean> {
  try {
    // STRICT: Validate payload structure before processing
    if (!payload?.data?.order?.order_id) {
      console.error('Webhook payload missing order data');
      return false;
    }
    if (!payload?.data?.payment) {
      console.error('Webhook payload missing payment data');
      return false;
    }

    const orderId = payload.data.order.order_id;
    const { id: numericOrderId } = parseOrderId(orderId);
    
    if (!numericOrderId) {
      console.error(`Invalid order_id in webhook: ${orderId}`);
      return false;
    }

    const transactionId = payload.data.payment.cf_payment_id || payload.data.payment.transaction_id;

    // Update the order with payment details
    const orderStatus = mapPaymentStatusToOrderStatus(payload.data.payment.payment_status);
    await withTransaction(async (tx) => {
      await tx.order.update({
        where: { id: numericOrderId },
        data: {
          status: orderStatus,
          paymentStatus: mapPaymentStatusToPaymentStatus(payload.data.payment.payment_status),
          paymentId: transactionId as string,
        },
      });
    });

    // Recompute trust score if order completed
    if (orderStatus === "COMPLETED") {
      const order = await findOrderById(numericOrderId);
      if (order?.vendorId && order?.districtId) {
        await recomputeTrustScore(order.vendorId, order.districtId);
      }
    }

    console.log(`Order ${numericOrderId} payment successful. Transaction: ${transactionId}`);
    return true;
  } catch (error) {
    console.error("Error handling payment success webhook:", error);
    return false;
  }
}

/**
 * Handles failed payment webhook
 */
async function handlePaymentFailed(payload: CashfreeWebhookPayload): Promise<boolean> {
  try {
    // STRICT: Validate payload structure before processing
    if (!payload?.data?.order?.order_id) {
      console.error('Webhook payload missing order data');
      return false;
    }

    const orderId = payload.data.order.order_id;
    const { id: numericOrderId } = parseOrderId(orderId);
    
    if (!numericOrderId) {
      console.error(`Invalid order_id in webhook: ${orderId}`);
      return false;
    }

    await withTransaction(async (tx) => {
      await tx.order.update({
        where: { id: numericOrderId },
        data: {
          status: "failed",
          paymentStatus: "failed",
        },
      });
    });

    console.log(`Order ${numericOrderId} payment failed.`);
    return true;
  } catch (error) {
    console.error("Error handling payment failed webhook:", error);
    return false;
  }
}

/**
 * Handles pending payment webhook
 */
async function handlePaymentPending(payload: CashfreeWebhookPayload): Promise<boolean> {
  try {
    // STRICT: Validate payload structure before processing
    if (!payload?.data?.order?.order_id) {
      console.error('Webhook payload missing order data');
      return false;
    }

    const orderId = payload.data.order.order_id;
    const { id: numericOrderId } = parseOrderId(orderId);
    
    if (!numericOrderId) {
      console.error(`Invalid order_id in webhook: ${orderId}`);
      return false;
    }

    await withTransaction(async (tx) => {
      await tx.order.update({
        where: { id: numericOrderId },
        data: {
          status: "pending",
          paymentStatus: "pending",
        },
      });
    });

    console.log(`Order ${numericOrderId} payment pending.`);
    return true;
  } catch (error) {
    console.error("Error handling payment pending webhook:", error);
    return false;
  }
}

/**
 * Main webhook handler - routes to appropriate handler based on event type
 * 
 * SECURITY: Validates payload structure before processing to prevent crashes
 */
export async function handleWebhook(payload: CashfreeWebhookPayload): Promise<boolean> {
  // CRITICAL: Validate payload structure at entry point to prevent null reference crashes
  if (!payload) {
    console.error('❌ [WEBHOOK] Missing payload data');
    return false;
  }
  
  if (!payload.data) {
    console.error('❌ [WEBHOOK] Missing payload.data');
    return false;
  }
  
  if (!payload.data.payment) {
    console.error('❌ [WEBHOOK] Missing payload.data.payment - cannot process webhook');
    // Still try event_type based handling as fallback
    const eventType = payload.event_type;
    if (eventType === 'ORDER_PAID' || eventType === 'PAYMENT_SUCCESS') {
      return handlePaymentSuccess(payload);
    }
    if (eventType === 'ORDER_EXPIRED' || eventType === 'PAYMENT_FAILED') {
      return handlePaymentFailed(payload);
    }
    return false;
  }

  const eventType = payload.event_type;
  const paymentStatus = payload.data.payment.payment_status?.toLowerCase() || '';

  console.log(`Processing webhook: Event=${eventType}, PaymentStatus=${paymentStatus}`);

  // Handle based on payment status
  if (paymentStatus === "success" || paymentStatus === "paid") {
    return handlePaymentSuccess(payload);
  } else if (paymentStatus === "failed") {
    return handlePaymentFailed(payload);
  } else if (paymentStatus === "pending") {
    return handlePaymentPending(payload);
  }

  // Also handle event type based events
  switch (eventType) {
    case "ORDER_PAID":
    case "PAYMENT_SUCCESS":
      return handlePaymentSuccess(payload);
    case "ORDER_EXPIRED":
    case "PAYMENT_FAILED":
      return handlePaymentFailed(payload);
    default:
      console.log(`Unhandled webhook event type: ${eventType}`);
      return false;
  }
}

/**
 * Get order by Cashfree order_id
 */
export async function getOrderByCashfreeId(cashfreeOrderId: string): Promise<any | null> {
  const { id: orderId } = parseOrderId(cashfreeOrderId);
  const numericOrderId = Number(orderId);
  
  if (!numericOrderId) {
    return null;
  }

  try {
    const order = await findOrderById(numericOrderId);
    return order;
  } catch (error) {
    console.error("Error finding order by Cashfree ID:", error);
    return null;
  }
}
