import crypto from "crypto";

/**
 * Verifies Cashfree webhook signature
 * @param signature - The signature header from Cashfree webhook
 * @param payload - Raw request body
 * @param secretKey - The webhook secret key from Cashfree dashboard
 * @returns boolean - true if signature is valid
 */
export function verifyWebhookSignature(
  signature: string,
  payload: string,
  secretKey: string
): boolean {
  try {
    // STRICT: Reject if signature format is invalid
    if (!signature || signature.length < 64) {
      console.error('Webhook signature invalid: wrong length');
      return false;
    }
    
    const expectedSignature = crypto
      .createHmac("sha256", secretKey)
      .update(payload)
      .digest("hex");

    // Explicit length check before timingSafeEqual to prevent buffer mismatch errors
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    
    if (signatureBuffer.length !== expectedBuffer.length) {
      console.error('Webhook signature invalid: buffer length mismatch');
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error("Webhook signature verification error:", error);
    return false;
  }
}

/**
 * Parses the order_id from Cashfree webhook
 * Handles both integer IDs and 'ORD_' prefixed IDs
 * @param orderId - The order_id from Cashfree webhook
 * @returns { id: number | null, raw: string }
 */
export function parseOrderId(orderId: string | number): { id: number | null; raw: string } {
  const raw = String(orderId);
  
  // If it starts with 'ORD_', strip the prefix
  const numericPart = raw.replace(/^ORD_/, "");
  
  const parsedId = parseInt(numericPart, 10);
  
  if (isNaN(parsedId)) {
    return { id: null, raw };
  }
  
  return { id: parsedId, raw };
}

/**
 * Generates a test webhook signature for development
 * @param payload - Raw request body
 * @param secretKey - The webhook secret key
 * @returns string - The generated signature
 */
export function generateTestSignature(
  payload: string,
  secretKey: string
): string {
  return crypto
    .createHmac("sha256", secretKey)
    .update(payload)
    .digest("hex");
}

