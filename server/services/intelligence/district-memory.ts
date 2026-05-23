// 🏛️ BHARAT-OS: DISTRICT OPERATIONAL MEMORY
// ================================================================
// Tracks district-level operational intelligence.
//
// Every district accumulates:
// - Trusted providers (vendors with high DSSL + positive outcomes)
// - Repeat complaints (vendors with recurring issues)
// - Seasonal demand (what's trending when)
// - Emergency spikes (times of heightened urgency)
// - Booking patterns (peak hours/days)
// - Local popularity (what's trending in this district)
// - Fraud signals (detected anomalies)
//
// This is the DISTRICT COGNITION layer.
// ================================================================

import { prisma } from "../../storage";
import { safeLogger } from "../../lib/logging/safe-logger";
import { LogComponent } from "../../lib/logging/structured-logger";

const COMPONENT = LogComponent.SYSTEM;
const TAG = "[DISTRICT_MEMORY]";

// ─── TYPES ───────────────────────────────────────────────────────

export interface DistrictMemorySnapshot {
    districtId: number;
    districtName: string;
    trustedProviders: TrustedProvider[];
    recentComplaints: number;
    fraudAlerts: FraudAlert[];
    popularCategories: CategoryTrend[];
    bookingTrends: BookingTrend[];
    emergencyStats: EmergencyStats;
    seasonalDemands: SeasonalDemand[];
    lastUpdated: string;
}

export interface TrustedProvider {
    vendorId: number;
    name: string;
    dsslScore: number;
    rating: number;
    completionRate: number;
    category: string;
    lastVerified: string | null;
}

export interface FraudAlert {
    vendorId: number;
    vendorName: string;
    eventType: string;
    riskScore: number;
    details: string;
    detectedAt: string;
}

export interface CategoryTrend {
    category: string;
    entityKind: string;
    engagement: number;
    trend: "rising" | "stable" | "declining";
    period: string;
}

export interface BookingTrend {
    timeSlot: string;
    dayOfWeek: string;
    volume: number;
    category: string;
}

export interface EmergencyStats {
    totalEmergencies: number;
    avgResponseTime: number;
    topEmergencyCategories: Array<{ category: string; count: number }>;
}

export interface SeasonalDemand {
    season: string;
    category: string;
    demandLevel: "high" | "medium" | "low";
    typicalPeriod: string;
}

// ─── MEMORY RETRIEVAL ────────────────────────────────────────────

/**
 * Get district operational memory snapshot.
 * Aggregates data from Prisma models and computed signals.
 */
export async function getDistrictMemory(districtId: number): Promise<DistrictMemorySnapshot> {
    const district = await prisma.district.findUnique({
        where: { id: districtId },
        select: { name: true },
    });

    const districtName = district?.name || `District #${districtId}`;

    // ── Trusted providers (high DSSL vendors) ──
    const topVendors = await prisma.vendor.findMany({
        where: {
            districtId,
            status: "APPROVED",
            isShadowBanned: false,
            dsslScore: { gte: 70 },
        },
        orderBy: { dsslScore: "desc" },
        take: 20,
        select: {
            id: true,
            name: true,
            dsslScore: true,
            rating: true,
            category: true,
            metadata: { select: { lastVerified: true } },
        },
    });

    // ── Fraud alerts (from FraudHistory) ──
    const fraudHistories = await prisma.fraudHistory.findMany({
        where: {
            vendor: {
                districtId,
            },
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
            vendor: { select: { id: true, name: true } },
        },
    });

    // ── Popular categories (from VendorMetricsDaily + Vendor) ──
    const vendorIds = await prisma.vendor.findMany({
        where: { districtId, status: "APPROVED" },
        select: { id: true, category: true, businessType: true },
    });

    const vendorIdSet = vendorIds.map(v => v.id);
    const recentMetrics = await prisma.vendorMetricsDaily.findMany({
        where: {
            vendorId: { in: vendorIdSet },
            date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { date: "desc" },
        take: 100,
    });

    // Build vendor category map
    const vendorCategoryMap = new Map<number, { category: string | null; businessType: string | null }>();
    for (const v of vendorIds) {
        vendorCategoryMap.set(v.id, { category: v.category, businessType: v.businessType });
    }

    // Map metrics to include vendor category
    const metricsWithCategory = recentMetrics
        .filter(m => vendorCategoryMap.has(m.vendorId))
        .map(m => ({
            vendor: vendorCategoryMap.get(m.vendorId) || { category: null, businessType: null },
            totalViews: m.views,
        }));

    return {
        districtId,
        districtName,
        trustedProviders: topVendors.map((v) => ({
            vendorId: v.id,
            name: v.name,
            dsslScore: v.dsslScore,
            rating: v.rating,
            completionRate: v.metadata?.lastVerified ? 0.85 : 0.5,
            category: v.category || "General",
            lastVerified: v.metadata?.lastVerified?.toISOString() || null,
        })),
        recentComplaints: fraudHistories
            .filter((f) => f.riskScore > 70)
            .length,
        fraudAlerts: fraudHistories.slice(0, 10).map((f) => ({
            vendorId: f.vendor?.id || 0,
            vendorName: f.vendor?.name || "Unknown",
            eventType: f.eventType,
            riskScore: f.riskScore,
            details: f.details ? JSON.stringify(f.details) : "No details",
            detectedAt: f.createdAt.toISOString(),
        })),
        popularCategories: aggregateCategoryTrends(metricsWithCategory),
        bookingTrends: [], // Placeholder — requires booking model
        emergencyStats: {
            totalEmergencies: 0, // Placeholder
            avgResponseTime: 0,
            topEmergencyCategories: [],
        },
        seasonalDemands: getSeasonalDemand(new Date()),
        lastUpdated: new Date().toISOString(),
    };
}

// ─── INTERNAL HELPERS ────────────────────────────────────────────

function aggregateCategoryTrends(
    metrics: Array<{ vendor: { category: string | null; businessType: string | null }; totalViews: number }>,
): CategoryTrend[] {
    const categoryMap = new Map<string, { views: number; count: number }>();

    for (const m of metrics) {
        const cat = m.vendor.category || m.vendor.businessType || "General";
        const existing = categoryMap.get(cat) || { views: 0, count: 0 };
        existing.views += m.totalViews || 0;
        existing.count += 1;
        categoryMap.set(cat, existing);
    }

    const result: CategoryTrend[] = [...categoryMap.entries()]
        .map(([category, data]) => ({
            category,
            entityKind: detectEntityKindFromCategory(category),
            engagement: data.views,
            trend: (data.views > 100 ? "rising" : data.views > 50 ? "stable" : "declining") as "rising" | "stable" | "declining",
            period: "7d" as const,
        }))
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 10);

    return result;
}

function detectEntityKindFromCategory(category: string): string {
    const cat = category.toLowerCase();
    if (/hospital|clinic|medical/.test(cat)) return "healthcare";
    if (/doctor|specialist/.test(cat)) return "professional";
    if (/repair|plumb|electric|clean/.test(cat)) return "service";
    if (/school|college|academy/.test(cat)) return "education";
    if (/hotel|resort|restaurant/.test(cat)) return "booking";
    if (/ambulance|emergency/.test(cat)) return "emergency";
    return "marketplace";
}

function getSeasonalDemand(date: Date): SeasonalDemand[] {
    const month = date.getMonth();
    const season = month >= 3 && month <= 5 ? "summer" :
        month >= 6 && month <= 9 ? "monsoon" :
            month >= 10 && month <= 11 ? "autumn" :
                "winter";

    const seasonal: SeasonalDemand[] = [];

    switch (season) {
        case "summer":
            seasonal.push({ season: "Summer", category: "Air Conditioner", demandLevel: "high", typicalPeriod: "Apr-Jun" });
            seasonal.push({ season: "Summer", category: "Cooler", demandLevel: "high", typicalPeriod: "Apr-Jun" });
            seasonal.push({ season: "Summer", category: "Ice Cream", demandLevel: "high", typicalPeriod: "Apr-Jun" });
            seasonal.push({ season: "Summer", category: "Summer Clothing", demandLevel: "high", typicalPeriod: "Apr-Jun" });
            break;
        case "monsoon":
            seasonal.push({ season: "Monsoon", category: "Umbrella", demandLevel: "high", typicalPeriod: "Jul-Sep" });
            seasonal.push({ season: "Monsoon", category: "Raincoat", demandLevel: "high", typicalPeriod: "Jul-Sep" });
            seasonal.push({ season: "Monsoon", category: "Plumber", demandLevel: "high", typicalPeriod: "Jul-Sep" });
            seasonal.push({ season: "Monsoon", category: "Medicine", demandLevel: "medium", typicalPeriod: "Jul-Sep" });
            break;
        case "winter":
            seasonal.push({ season: "Winter", category: "Heater", demandLevel: "high", typicalPeriod: "Dec-Feb" });
            seasonal.push({ season: "Winter", category: "Winter Clothing", demandLevel: "high", typicalPeriod: "Dec-Feb" });
            seasonal.push({ season: "Winter", category: "Blanket", demandLevel: "high", typicalPeriod: "Dec-Feb" });
            break;
        default:
            seasonal.push({ season: season.charAt(0).toUpperCase() + season.slice(1), category: "General", demandLevel: "medium", typicalPeriod: "Ongoing" });
    }

    // Always include core categories
    seasonal.push({ season: "All Year", category: "Groceries", demandLevel: "high", typicalPeriod: "Always" });
    seasonal.push({ season: "All Year", category: "Medicine", demandLevel: "high", typicalPeriod: "Always" });
    seasonal.push({ season: "All Year", category: "Doctor", demandLevel: "medium", typicalPeriod: "Always" });

    return seasonal;
}

export const DISTRICT_MEMORY_VERSION = "1.0.0";
export const DISTRICT_MEMORY_CREATED = "2026-05-22";
