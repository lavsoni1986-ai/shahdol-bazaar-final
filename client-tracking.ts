// 🔥 FRONTEND EVENT TRACKING HOOKS
// Client-side utilities for tracking user behavior

// Generate session ID for anonymous users
export const getSessionId = (): string => {
  let sessionId = localStorage.getItem('bazaar_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('bazaar_session_id', sessionId);
  }
  return sessionId;
};

// Track events (fire-and-forget)
export const trackEvent = async (
  action: string,
  data: {
    vendorId?: number;
    productId?: number;
    meta?: any;
  } = {}
): Promise<void> => {
  try {
    const sessionId = getSessionId();
    const userId = localStorage.getItem('user_id'); // Assuming you store user ID

    await fetch('/api/marketplace/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId
      },
      body: JSON.stringify({
        userId: userId ? parseInt(userId) : undefined,
        vendorId: data.vendorId,
        productId: data.productId,
        action,
        meta: data.meta || {}
      })
    });
  } catch (error) {
    console.error('Event tracking failed:', error);
    // Don't show error to user - tracking is non-critical
  }
};

// Specific tracking functions
export const trackVendorClick = (vendorId: number) => {
  trackEvent('CLICK', { vendorId });
};

export const trackVendorView = (vendorId: number) => {
  trackEvent('VIEW', { vendorId });
};

export const trackOrder = (vendorId: number, orderValue: number) => {
  trackEvent('ORDER', { vendorId, meta: { orderValue } });
};

export const trackRepeatOrder = (vendorId: number, orderValue: number) => {
  trackEvent('REPEAT_ORDER', { vendorId, meta: { orderValue } });
};

export const trackAddToCart = (productId: number, vendorId: number) => {
  trackEvent('ADD_TO_CART', { productId, vendorId });
};

// React Hook for easy integration
export const useTracking = () => {
  return {
    trackVendorClick,
    trackVendorView,
    trackOrder,
    trackRepeatOrder,
    trackAddToCart
  };
};