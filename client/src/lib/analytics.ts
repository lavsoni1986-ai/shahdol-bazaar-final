// 🏛️ BHARAT-OS: CANONICAL ANALYTICS CLIENT
// ================================================================
// Single typed entry point for ALL frontend analytics events.
// NO ad-hoc analytics calls. NO console.log tracking. NO stringly-typed events.
//
// ================================================================

import { normalizeApiUrl, apiRequest, resolveCanonicalDistrictSlug } from "./api-client";

// ─── EVENT TYPES ─────────────────────────────────────────

export type AnalyticsEventType =
    | "PAGE_VIEW"
    | "PRODUCT_VIEW"
    | "VENDOR_VIEW"
    | "SEARCH"
    | "SEARCH_INTERACTION"
    | "CLICK"
    | "CTA_CLICK"
    | "WHATSAPP_CLICK"
    | "CALL_CLICK"
    | "ADD_TO_CART"
    | "ORDER_PLACED"
    | "ORDER_COMPLETED"
    | "ERROR"
    | "SESSION_START"
    | "SESSION_END";

export interface AnalyticsPayload {
    eventType: AnalyticsEventType;
    vendorId?: number | null;
    source?: string;
    action?: string;
    value?: Record<string, unknown>;
    sessionId?: string;
    timestamp?: string;
    retryCount?: number;
    districtSlug?: string;
}

// ─── SESSION MANAGEMENT ──────────────────────────────────

function getOrCreateSessionId(): string {
    const STORAGE_KEY = "bharatos_session_id";
    let sessionId = sessionStorage.getItem(STORAGE_KEY);
    if (!sessionId) {
        sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem(STORAGE_KEY, sessionId);
    }
    return sessionId;
}

// ─── CANONICAL TRACKING ──────────────────────────────────

const API_ENDPOINT = normalizeApiUrl(import.meta.env.VITE_API_URL || "", "/analytics/track");
const QUEUE_KEY = "bharatos_analytics_queue";
const DLQ_KEY = "bharatos_analytics_dlq";
const MAX_DLQ_ITEMS = 100;

let queueTimeout: any = null;
let isFlushing = false;

function getQueue(): AnalyticsPayload[] {
    try {
        const raw = localStorage.getItem(QUEUE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveQueue(queue: AnalyticsPayload[]): void {
    try {
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {}
}

// ─── DEDUPLICATION ───────────────────────────────────────

const trackedHashes = new Map<string, number>(); // hash -> timestamp

function calculateEventHash(event: AnalyticsPayload): string {
    const district = event.districtSlug || "shahdol";
    const eventType = event.eventType;
    const source = event.source || "";
    const vendorId = event.vendorId != null ? String(event.vendorId) : "";
    
    // 10-second timestamp bucket
    const timeMs = event.timestamp ? new Date(event.timestamp).getTime() : Date.now();
    const bucket = Math.floor(timeMs / 10000);
    
    return `${district}:${eventType}:${source}:${vendorId}:${bucket}`;
}

function isDuplicateEvent(event: AnalyticsPayload): boolean {
    const hash = calculateEventHash(event);
    const now = Date.now();
    
    // Clean up old entries from trackedHashes (older than 20 seconds)
    for (const [h, ts] of trackedHashes.entries()) {
        if (now - ts > 20000) {
            trackedHashes.delete(h);
        }
    }
    
    if (trackedHashes.has(hash)) {
        return true;
    }
    
    // Also check current queue to prevent duplicates that are waiting to be sent
    const queue = getQueue();
    const duplicateInQueue = queue.some(queuedEvent => calculateEventHash(queuedEvent) === hash);
    if (duplicateInQueue) {
        return true;
    }
    
    // Not a duplicate: record it
    trackedHashes.set(hash, now);
    return false;
}

// ─── RETRY BACKOFF WITH JITTER & DLQ ────────────────────

function getBackoffDelay(retryCount: number): number {
    let delay = 1000;
    if (retryCount === 2) delay = 2000;
    else if (retryCount === 3) delay = 5000;
    else if (retryCount === 4) delay = 10000;
    else if (retryCount >= 5) delay = 30000;
    
    // Add jitter: delay + random(0-500ms)
    const jitter = Math.floor(Math.random() * 500);
    return delay + jitter;
}

function appendToDLQ(events: AnalyticsPayload[]): void {
    try {
        const dlqRaw = localStorage.getItem(DLQ_KEY);
        let dlq: AnalyticsPayload[] = dlqRaw ? JSON.parse(dlqRaw) : [];
        
        dlq.push(...events);
        
        // Bounded size check: drop oldest if it exceeds MAX_DLQ_ITEMS
        if (dlq.length > MAX_DLQ_ITEMS) {
            dlq = dlq.slice(dlq.length - MAX_DLQ_ITEMS);
        }
        
        localStorage.setItem(DLQ_KEY, JSON.stringify(dlq));
        console.warn(`[Analytics] Moved ${events.length} events to DLQ (total size: ${dlq.length}).`);
    } catch (dlqErr) {
        console.error("[Analytics] Failed to save events to DLQ:", dlqErr);
    }
}

async function flushQueue(): Promise<void> {
    if (isFlushing) return; // Mutex guard
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    const queue = getQueue();
    if (queue.length === 0) return;

    isFlushing = true;
    const batch = queue.slice(0, 10); // Batch up to 10 events
    let nextFlushDelay = 1000;

    try {
        await apiRequest("POST", "/analytics/track", batch);
        
        // Remove sent events from queue
        const remaining = getQueue().slice(batch.length);
        saveQueue(remaining);
        nextFlushDelay = 1000; // Reset delay on success
    } catch (err) {
        if (process.env.NODE_ENV === "development") {
            console.warn("[Analytics] Failed to flush queue:", err);
        }

        // Retry Storm Fix logic:
        const currentQueue = getQueue();
        const updatedQueue = currentQueue.map((event, index) => {
            if (index < batch.length) {
                const currentRetries = event.retryCount || 0;
                return { ...event, retryCount: currentRetries + 1 };
            }
            return event;
        });

        // Find events that exceeded maxRetries (5)
        const deadLetterEvents = updatedQueue.filter((event, index) => index < batch.length && (event.retryCount || 0) >= 5);
        const activeEvents = updatedQueue.filter((event, index) => !(index < batch.length && (event.retryCount || 0) >= 5));

        if (deadLetterEvents.length > 0) {
            appendToDLQ(deadLetterEvents);
        }

        saveQueue(activeEvents);

        // Calculate backoff based on the max retry count in the failed batch
        const maxRetriesInBatch = Math.max(...batch.map(e => (e.retryCount || 0) + 1));
        nextFlushDelay = getBackoffDelay(maxRetriesInBatch);
    } finally {
        isFlushing = false; // Release mutex
        
        // If queue still has items, schedule another flush
        const remaining = getQueue();
        if (remaining.length > 0 && typeof navigator !== "undefined" && navigator.onLine) {
            if (queueTimeout) clearTimeout(queueTimeout);
            queueTimeout = setTimeout(flushQueue, nextFlushDelay);
        }
    }
}

// Register online event listener to trigger retry when network returns
if (typeof window !== "undefined") {
    window.addEventListener("online", () => {
        flushQueue();
    });
    // Flush on page close/unload using sendBeacon
    window.addEventListener("beforeunload", () => {
        const queue = getQueue();
        if (queue.length > 0 && typeof navigator !== "undefined" && navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(queue)], { type: "application/json" });
            const flushed = navigator.sendBeacon(API_ENDPOINT, blob);
            if (flushed) {
                saveQueue([]);
            }
        }
    });
}

/**
 * Track an analytics event with typed payload, queue persistence, and batching.
 */
export async function trackEvent(
    eventType: AnalyticsEventType,
    payload?: Partial<Omit<AnalyticsPayload, "eventType">>
): Promise<void> {
    try {
        const body: AnalyticsPayload = {
            eventType,
            vendorId: payload?.vendorId ?? null,
            source: payload?.source ?? "web",
            action: payload?.action,
            value: payload?.value,
            sessionId: getOrCreateSessionId(),
            timestamp: new Date().toISOString(),
            retryCount: 0,
            districtSlug: resolveCanonicalDistrictSlug(), // Inject districtSlug from canonical source
        };

        // Check for deduplication (drops duplicate click spam or double vendor views)
        if (isDuplicateEvent(body)) {
            if (process.env.NODE_ENV === "development") {
                console.log("[Analytics] Dropped duplicate event:", body.eventType, body.source);
            }
            return;
        }

        // Use sendBeacon for SESSION_END immediately
        if (eventType === "SESSION_END") {
            const allEvents = getQueue();
            allEvents.push(body);
            if (typeof navigator !== "undefined" && navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(allEvents)], { type: "application/json" });
                navigator.sendBeacon(API_ENDPOINT, blob);
                saveQueue([]);
            } else {
                saveQueue(allEvents);
                flushQueue();
            }
            return;
        }

        const queue = getQueue();
        queue.push(body);
        saveQueue(queue);

        // If there are already failed events in the queue, we must respect backoff.
        const hasFailed = queue.some(e => (e.retryCount || 0) > 0);
        if (hasFailed) {
            // Respect the backoff delay. If no timeout is scheduled, schedule one.
            if (!queueTimeout && !isFlushing) {
                const maxFailedCount = Math.max(...queue.map(e => e.retryCount || 0));
                queueTimeout = setTimeout(flushQueue, getBackoffDelay(maxFailedCount));
            }
        } else {
            // Flush immediately if batch size reached, otherwise debounce
            if (queue.length >= 5) {
                flushQueue();
            } else {
                if (queueTimeout) clearTimeout(queueTimeout);
                queueTimeout = setTimeout(flushQueue, 2000);
            }
        }
    } catch {
        // Silently fail — analytics should never block the user experience
        if (process.env.NODE_ENV === "development") {
            console.warn("[Analytics] Failed to track event:", eventType);
        }
    }
}

// ─── CONVENIENCE WRAPPERS ────────────────────────────────

export function trackPageView(source?: string): void {
    trackEvent("PAGE_VIEW", { source: source || window.location.pathname });
}

export function trackVendorView(vendorId: number): void {
    trackEvent("VENDOR_VIEW", { vendorId, source: "profile" });
}

export function trackProductView(productId: number): void {
    trackEvent("PRODUCT_VIEW", { source: `product/${productId}` });
}

export function trackSearch(query: string): void {
    trackEvent("SEARCH", { action: query });
}

export function trackWhatsAppClick(vendorId?: number): void {
    trackEvent("WHATSAPP_CLICK", { vendorId, source: "cta" });
}

export function trackCallClick(vendorId?: number): void {
    trackEvent("CALL_CLICK", { vendorId, source: "cta" });
}

export function trackAddToCart(vendorId: number, productId: number): void {
    trackEvent("ADD_TO_CART", { vendorId, value: { productId } });
}

export function trackOrderPlaced(orderId?: string): void {
    trackEvent("ORDER_PLACED", { value: { orderId } });
}

export function trackError(errorMessage: string): void {
    trackEvent("ERROR", { action: errorMessage });
}

// ─── METADATA ───────────────────────────────────────────

export const ANALYTICS_GOVERNANCE = {
    VERSION: "1.0.1",
    CREATED: "2026-05-25",
    ENDPOINT: API_ENDPOINT,
    STRATEGY: "Time-bucketed analytics batching with exponential backoff & DLQ",
    SAFETY_LEVEL: "LOW - Analytics failures never block user flow",
} as const;
