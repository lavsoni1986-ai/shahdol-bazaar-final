// 🔥 USER BEHAVIOR TRACKING (ML FOUNDATION)
// Track user interactions for future ML improvements

import { createUserEvent } from "../repositories/userEvent.repo";

export async function trackUserEvent(
  userId: number,
  action: string,
  vendorId?: number | null,
  metadata?: any,
  req?: any
): Promise<void> {
  try {
    await createUserEvent({
      userId,
      action,
      sessionId: req?.sessionID || 'unknown',
      metadata: {
        ...metadata,
        userAgent: req?.headers?.['user-agent']
      },
      ipAddress: req?.ip || req?.connection?.remoteAddress
    });
  } catch (error) {
    console.error('Failed to track user event:', error);
    // Don't throw - tracking failure shouldn't break user flow
  }
}

// Track vendor view
export async function trackVendorView(userId: number, vendorId: number | null, req?: any): Promise<void> {
  await trackUserEvent(userId, 'VIEW_VENDOR', vendorId, {
    timestamp: new Date(),
    source: 'marketplace'
  }, req);
}

// Track order placement
export async function trackOrderPlacement(userId: number, vendorId: number, orderValue: number, req?: any): Promise<void> {
  await trackUserEvent(userId, 'PLACE_ORDER', vendorId, {
    orderValue,
    timestamp: new Date()
  }, req);
}

// Track vendor rating
export async function trackVendorRating(userId: number, vendorId: number, rating: number, req?: any): Promise<void> {
  await trackUserEvent(userId, 'RATE_VENDOR', vendorId, {
    rating,
    timestamp: new Date()
  }, req);
}
