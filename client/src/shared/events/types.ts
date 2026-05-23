/**
 * CANONICAL EVENT TYPES
 * BharatOS - Phase 2 Canonicalization
 *
 * Purpose: Standardized event vocabulary for telemetry and analytics.
 * Centralizes event naming to prevent inconsistencies.
 */

export const EVENT_TYPES = {
  // User interaction events
  USER_QUERY: 'user_query',
  SEARCH_ABANDONED: 'search_abandoned',

  // AI processing events
  AI_CLASSIFICATION: 'ai_classification',

  // Match and result events
  VENDOR_MATCH: 'vendor_match',
  NO_RESULT: 'no_result',

  // Action events
  CALL_VENDOR: 'call_vendor',
  WHATSAPP_VENDOR: 'whatsapp_vendor',
  MAP_OPEN: 'map_open',
  ORDER_CREATED: 'order_created',
} as const;

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

/**
 * Event payload interfaces
 */
export interface BaseEvent {
  type: EventType;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  districtSlug?: string;
}

export interface UserQueryEvent extends BaseEvent {
  type: typeof EVENT_TYPES.USER_QUERY;
  query: string;
  category?: string;
}

export interface VendorMatchEvent extends BaseEvent {
  type: typeof EVENT_TYPES.VENDOR_MATCH;
  vendorId: string;
  query: string;
  matchScore?: number;
}

export interface ActionEvent extends BaseEvent {
  type: typeof EVENT_TYPES.CALL_VENDOR | typeof EVENT_TYPES.WHATSAPP_VENDOR | typeof EVENT_TYPES.MAP_OPEN;
  vendorId: string;
  query: string;
}

export interface OrderCreatedEvent extends BaseEvent {
  type: typeof EVENT_TYPES.ORDER_CREATED;
  orderId: string;
  vendorId: string;
  totalAmount: number;
}

export type Event =
  | UserQueryEvent
  | VendorMatchEvent
  | ActionEvent
  | OrderCreatedEvent
  | (BaseEvent & { type: Exclude<EventType, UserQueryEvent['type'] | VendorMatchEvent['type'] | ActionEvent['type'] | OrderCreatedEvent['type']> });