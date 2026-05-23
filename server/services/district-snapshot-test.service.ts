/**
 * DISTRICT SNAPSHOT TEST SERVICE
 * BharatOS Phase 7.5 - System Hardening & Operability
 *
 * Test service to generate district intelligence summaries
 */

import { DistrictHealthSnapshot } from '../../shared/district-intelligence/types';

export interface DistrictSnapshotTestService {
  // Generate test snapshots
  generateTestSnapshot(districtId: number, type: 'summary' | 'trends' | 'alerts'): Promise<any>;

  // Test summary generation
  generateDistrictSummary(districtId: number): Promise<{
    topUnmetDemand: Array<{
      category: string;
      demandCount: number;
      lastQueried: number;
    }>;
    topTrustedVendors: Array<{
      vendorId: number;
      name: string;
      trustScore: number;
      category: string;
    }>;
    localityActivity: Array<{
      locality: string;
      queryCount: number;
      executionCount: number;
      trustDensity: number;
    }>;
    emergencyTrends: Array<{
      type: string;
      count: number;
      trend: 'increasing' | 'stable' | 'decreasing';
    }>;
  }>;

  // Test data validation
  validateSnapshotData(snapshot: any): Promise<{
    valid: boolean;
    issues: string[];
    completeness: number;
  }>;
}

export class DistrictSnapshotTestServiceImpl implements DistrictSnapshotTestService {
  async generateTestSnapshot(districtId: number, type: 'summary' | 'trends' | 'alerts'): Promise<any> {
    console.log(`[DISTRICT_SNAPSHOT] Generating test ${type} snapshot for district ${districtId}`);

    switch (type) {
      case 'summary':
        return this.generateDistrictSummary(districtId);
      case 'trends':
        return this.generateTrendsSnapshot(districtId);
      case 'alerts':
        return this.generateAlertsSnapshot(districtId);
      default:
        throw new Error(`Unknown snapshot type: ${type}`);
    }
  }

  async generateDistrictSummary(districtId: number) {
    console.log(`[DISTRICT_SNAPSHOT] Generating district summary for ${districtId}`);

    // This would query real data in production
    // For testing, return mock data structure
    return {
      districtId,
      generated: Date.now(),
      summary: {
        topUnmetDemand: [
          {
            category: 'blood_bank',
            demandCount: 15,
            lastQueried: Date.now() - 86400000 // 1 day ago
          },
          {
            category: 'night_pharmacy',
            demandCount: 23,
            lastQueried: Date.now() - 3600000 // 1 hour ago
          },
          {
            category: 'emergency_plumber',
            demandCount: 8,
            lastQueried: Date.now() - 7200000 // 2 hours ago
          }
        ],
        topTrustedVendors: [
          {
            vendorId: 1,
            name: 'City Hospital Shahdol',
            trustScore: 0.92,
            category: 'healthcare'
          },
          {
            vendorId: 2,
            name: 'Shahdol Medical Store',
            trustScore: 0.87,
            category: 'pharmacy'
          },
          {
            vendorId: 3,
            name: 'Quick Fix Electronics',
            trustScore: 0.83,
            category: 'electronics'
          }
        ],
        localityActivity: [
          {
            locality: 'Bus Stand Area',
            queryCount: 45,
            executionCount: 12,
            trustDensity: 0.76
          },
          {
            locality: 'Medical College Area',
            queryCount: 38,
            executionCount: 28,
            trustDensity: 0.89
          },
          {
            locality: 'Market Area',
            queryCount: 67,
            executionCount: 23,
            trustDensity: 0.65
          }
        ],
        emergencyTrends: [
          {
            type: 'blood_donation',
            count: 12,
            trend: 'increasing' as const
          },
          {
            type: 'emergency_medical',
            count: 8,
            trend: 'stable' as const
          },
          {
            type: 'power_outage',
            count: 5,
            trend: 'decreasing' as const
          }
        ]
      }
    };
  }

  async generateTrendsSnapshot(districtId: number) {
    console.log(`[DISTRICT_SNAPSHOT] Generating trends snapshot for ${districtId}`);

    return {
      districtId,
      generated: Date.now(),
      trends: {
        demandGrowth: {
          period: '7d',
          growth: 0.23, // 23% increase
          topGrowing: ['blood_bank', 'emergency_services'],
          declining: ['generic_shopping']
        },
        trustEvolution: {
          period: '30d',
          averageChange: 0.05, // 5% improvement
          improvingVendors: 12,
          decliningVendors: 3
        },
        localityShifts: {
          emergingAreas: ['New Residential Complex'],
          decliningAreas: ['Old Market Area'],
          activityRedistribution: 0.34 // 34% of activity moved
        }
      }
    };
  }

  async generateAlertsSnapshot(districtId: number) {
    console.log(`[DISTRICT_SNAPSHOT] Generating alerts snapshot for ${districtId}`);

    return {
      districtId,
      generated: Date.now(),
      alerts: {
        active: 3,
        critical: 1,
        warnings: 2,
        recentAlerts: [
          {
            id: 'alert_001',
            type: 'DEMAND_SPIKE',
            severity: 'high',
            title: 'Blood Bank Demand Surge',
            description: '32% increase in blood bank queries in Medical College area',
            affectedEntities: ['blood_bank', 'Medical College Area'],
            timestamp: Date.now() - 3600000
          },
          {
            id: 'alert_002',
            type: 'SERVICE_GAP',
            severity: 'medium',
            title: 'Night Pharmacy Shortage',
            description: 'No verified night pharmacies in Bus Stand area after 10 PM',
            affectedEntities: ['pharmacy', 'Bus Stand Area'],
            timestamp: Date.now() - 7200000
          }
        ]
      }
    };
  }

  async validateSnapshotData(snapshot: any): Promise<{
    valid: boolean;
    issues: string[];
    completeness: number;
  }> {
    const issues: string[] = [];
    let completeness = 0;
    const totalChecks = 5;

    // Check basic structure
    if (!snapshot.districtId) {
      issues.push('Missing districtId');
    } else {
      completeness++;
    }

    if (!snapshot.generated || typeof snapshot.generated !== 'number') {
      issues.push('Invalid or missing generated timestamp');
    } else {
      completeness++;
    }

    // Check data completeness based on snapshot type
    if (snapshot.summary) {
      if (!snapshot.summary.topUnmetDemand?.length) {
        issues.push('Missing topUnmetDemand data');
      } else {
        completeness++;
      }

      if (!snapshot.summary.topTrustedVendors?.length) {
        issues.push('Missing topTrustedVendors data');
      } else {
        completeness++;
      }
    }

    if (snapshot.trends) {
      if (!snapshot.trends.demandGrowth) {
        issues.push('Missing demand growth trends');
      } else {
        completeness++;
      }
    }

    if (snapshot.alerts) {
      if (typeof snapshot.alerts.active !== 'number') {
        issues.push('Invalid alerts active count');
      } else {
        completeness++;
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      completeness: completeness / totalChecks
    };
  }
}

// Export singleton instance
export const districtSnapshotTestService = new DistrictSnapshotTestServiceImpl();

// Helper function to test snapshot generation
export async function testDistrictSnapshotGeneration(districtId: number = 2) {
  console.log(`[TEST] Testing district snapshot generation for district ${districtId}`);

  const service = districtSnapshotTestService;

  // Test summary generation
  try {
    const summary = await service.generateDistrictSummary(districtId);
    console.log('[TEST] ✅ Summary generation successful');
    console.log('[TEST] Summary keys:', Object.keys(summary));

    const validation = await service.validateSnapshotData(summary);
    console.log(`[TEST] Summary validation: ${validation.valid ? '✅ PASS' : '❌ FAIL'}`);
    if (!validation.valid) {
      console.log('[TEST] Issues:', validation.issues);
    }
  } catch (error) {
    console.error('[TEST] ❌ Summary generation failed:', error);
  }

  // Test trends generation
  try {
    const trends = await service.generateTestSnapshot(districtId, 'trends');
    console.log('[TEST] ✅ Trends generation successful');
  } catch (error) {
    console.error('[TEST] ❌ Trends generation failed:', error);
  }

  // Test alerts generation
  try {
    const alerts = await service.generateTestSnapshot(districtId, 'alerts');
    console.log('[TEST] ✅ Alerts generation successful');
  } catch (error) {
    console.error('[TEST] ❌ Alerts generation failed:', error);
  }

  console.log(`[TEST] District snapshot testing completed for district ${districtId}`);
}