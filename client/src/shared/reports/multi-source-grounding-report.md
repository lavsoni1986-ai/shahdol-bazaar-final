/**
 * MULTI-SOURCE GROUNDING REPORT
 * BharatOS Grounding Integration Hotfix
 */

MULTI-SOURCE GROUNDING IMPLEMENTATION:

✅ COMPLETED INTEGRATIONS:

1. **Transport Utility Grounding**
   - Connected AI concierge to existing `/bus-timetable` API
   - Added transport adapter: `groundTransportUtility()`
   - Integrated before SUPPLY_GAP decision
   - Added transport context to AI prompts

2. **Grounding Priority Order**
   - Primary: Marketplace vendors/products (existing)
   - Secondary: Transport utilities (new)
   - Fallback: SUPPLY_GAP with demand memory (existing)

3. **Query Recognition Enhancement**
   - TRANSPORT domain detection (existing)
   - TRAVEL_SERVICE entity detection (existing)
   - Transport keyword matching: bus, travel, transport, timing, schedule, route, fare, ticket
   - Destination extraction from queries

4. **Response Synthesis Updates**
   - Transport results included in AI context
   - Combined marketplace + transport results
   - Transport-specific formatting in responses
   - No SUPPLY_GAP trigger for transport queries

GROUNDING SOURCES MATRIX:

| Source | Status | API Endpoint | Data Types | Query Types |
|--------|--------|--------------|------------|-------------|
| Marketplace | ✅ Active | `/marketplace/stores` | vendors, products | commerce, services |
| Transport | ✅ **NEW** | `/bus-timetable` | bus routes, timing | transport, travel |
| Future: Medical | ⏳ Planned | `/hospitals` | healthcare facilities | medical services |
| Future: Education | ⏳ Planned | `/schools` | educational institutions | education services |

TRANSPORT GROUNDING FLOW:

User Query → Cognition Engine → Intent: TRANSPORT
    ↓
Transport Keywords Detected → groundTransportUtility()
    ↓
Bus Timetable API Query → Filter by destination/query
    ↓
Transport Results Found → Include in AI context
    ↓
Combined Response: Marketplace + Transport data
    ↓
NO SUPPLY_GAP → NO demand memory trigger

TEST QUERY VALIDATION:

✅ "Bus Timing" → Transport grounding → Bus timetable data
✅ "Rewa bus" → Destination filtering → Rewa-bound buses
✅ "Umaria bus" → Destination filtering → Umaria-bound buses
✅ "Transport" → Transport intent → General transport data
✅ "Travel" → Travel intent → Transport services

FUTURE CIVIC INTEGRATION POINTS:

1. **Healthcare Grounding**
   - Connect to existing hospital/diagnostic data
   - Ground "doctor", "blood bank", "emergency" queries
   - Integrate with medical appointment systems

2. **Education Grounding**
   - Connect to school/college directories
   - Ground "school", "college", "admission" queries
   - Include fee structures, facilities data

3. **Government Services Grounding**
   - Connect to civic service databases
   - Ground "license", "certificate", "permit" queries
   - Include application processes, requirements

4. **Emergency Services Grounding**
   - Connect to police, fire, ambulance data
   - Ground "emergency", "police", "fire" queries
   - Include emergency contact numbers, locations

GROUNDING ARCHITECTURE PATTERN:

```typescript
// Generic grounding adapter pattern
interface GroundingAdapter {
  shouldGround(query: string, cognition: any): boolean;
  ground(query: string, districtId: number): Promise<GroundingResult>;
  formatResults(results: any[]): any[];
}

// Multi-source grounding orchestrator
class MultiSourceGrounding {
  private adapters: GroundingAdapter[] = [
    new MarketplaceAdapter(),
    new TransportAdapter(), // ✅ Added
    new HealthcareAdapter(), // ⏳ Future
    new EducationAdapter(), // ⏳ Future
  ];

  async groundAllSources(query: string, cognition: any, districtId: number) {
    const results = [];
    for (const adapter of this.adapters) {
      if (adapter.shouldGround(query, cognition)) {
        const result = await adapter.ground(query, districtId);
        if (result.hasResults) {
          results.push(...result.results);
        }
      }
    }
    return results;
  }
}
```

IMPLEMENTATION IMPACT:

✅ **Queries Now Grounded:** Transport queries return real bus data instead of SUPPLY_GAP
✅ **Intelligence Accuracy:** System provides actual utility information
✅ **Demand Memory Clean:** Only triggers when truly no data available
✅ **User Experience:** Immediate access to transport information
✅ **Scalability:** Pattern ready for additional civic data sources

The grounding pipeline now supports multiple data sources, with transport utilities successfully integrated. The system can now answer transport queries with real data while maintaining the existing marketplace grounding capabilities.