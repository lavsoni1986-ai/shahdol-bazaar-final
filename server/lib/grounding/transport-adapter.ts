/**
 * TRANSPORT GROUNDING ADAPTER
 * BharatOS Phase 7.5 - Grounding Integration Hotfix
 *
 * Adapter to ground transport-related queries against existing bus timetable system
 */

import { prisma } from "../../storage";

export interface TransportResult {
  id: string;
  fromCity: string;
  toCity: string;
  time: string;
  price: string;
  type: string;
  routeDescription: string;
  grounded: boolean;
  source: 'bus_timetable';
}

export interface GroundingResult {
  hasResults: boolean;
  results: TransportResult[];
  total: number;
  query: string;
}

/**
 * Ground transport utility queries against existing bus timetable system
 */
export async function groundTransportUtility(query: string, districtId: number): Promise<GroundingResult> {
  try {
    // Normalize query for transport matching
    const normalizedQuery = query.toLowerCase().trim();

    // Check if this is a transport-related query
    const isTransportQuery = /\b(bus|travel|transport|timing|schedule|route|destination|fare|ticket)\b/.test(normalizedQuery);

    if (!isTransportQuery) {
      return { hasResults: false, results: [], total: 0, query };
    }

    console.log(`[GROUNDING:utility_transport] Checking transport utilities for: "${query}"`);

    // Get all active bus timetables for this district
    const busData = await prisma.busTimetable.findMany({
      where: {
        districtId: districtId,
        isActive: true
      },
      orderBy: { firstBusTime: 'asc' },
      take: 10 // Limit results for AI responses
    });

    if (!busData || busData.length === 0) {
      console.log(`[GROUNDING:utility_transport] No bus data found for district ${districtId}`);
      return { hasResults: false, results: [], total: 0, query };
    }

    // Map bus data to transport results
    const transportResults: TransportResult[] = busData.map((bus: any) => ({
      id: `bus_${bus.id}`,
      fromCity: bus.fromCity,
      toCity: bus.toCity,
      time: bus.firstBusTime,
      price: bus.fare.replace('₹', ''),
      type: bus.busType ?? 'unknown',
      routeDescription: bus.travelTime || bus.publicNote || 'Main Highway',
      grounded: true,
      source: 'bus_timetable' as const
    }));

    // Filter results based on query content if specific destination mentioned
    let filteredResults = transportResults;

    // Check for specific destinations in query
    const destinationMatches = normalizedQuery.match(/\b(to|for)\s+(\w+)/i);
    if (destinationMatches) {
      const destination = destinationMatches[2].toLowerCase();
      filteredResults = transportResults.filter(result =>
        result.toCity.toLowerCase().includes(destination) ||
        destination.includes(result.toCity.toLowerCase())
      );
    }

    console.log(`[GROUNDING:utility_match] Found ${filteredResults.length} transport results for query: "${query}"`);

    return {
      hasResults: filteredResults.length > 0,
      results: filteredResults,
      total: filteredResults.length,
      query
    };

  } catch (error) {
    console.error('[GROUNDING:utility_transport] Transport grounding error:', error);
    return { hasResults: false, results: [], total: 0, query };
  }
}

/**
 * Check if query should trigger transport utility grounding
 */
export function shouldGroundTransport(cognition: any): boolean {
  if (!cognition) return false;

  // Check domain/entity
  if (cognition.domain === 'TRANSPORT') return true;
  if (cognition.entity === 'TRAVEL_SERVICE') return true;

  // Check search terms for transport keywords
  const transportKeywords = ['bus', 'travel', 'transport', 'timing', 'schedule', 'route', 'fare', 'ticket'];
  const hasTransportTerms = cognition.searchTerms?.some((term: string) =>
    transportKeywords.some(keyword => term.toLowerCase().includes(keyword))
  );

  return !!hasTransportTerms;
}