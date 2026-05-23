/**
 * DISTRICT SNAPSHOT FRAMEWORK
 * BharatOS Phase 7 - District Operating Console Foundation
 *
 * Framework for creating periodic district intelligence snapshots
 */

export interface DistrictSnapshot {
  id: string;
  districtId: number;
  type: SnapshotType;
  period: SnapshotPeriod;
  timestamp: number;

  // Snapshot content
  data: SnapshotData;

  // Metadata
  metadata: {
    generated: number;
    dataCompleteness: number; // 0-1
    confidence: number; // 0-1
    processingTime: number; // in ms
    sourceVersion: string;
  };

  // Retention
  retention: {
    expires: number;
    priority: 'low' | 'medium' | 'high';
    archival: boolean;
  };
}

export type SnapshotType =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'emergency'
  | 'demand_shift'
  | 'health_check'
  | 'performance_review';

export type SnapshotPeriod = {
  start: number;
  end: number;
  label: string; // e.g., "2024-W01", "2024-01-15"
};

export interface SnapshotData {
  // Core intelligence
  intelligence: IntelligenceSnapshot;

  // Health metrics
  health: HealthSnapshot;

  // Alert summary
  alerts: AlertSnapshot;

  // Key insights
  insights: InsightSnapshot;

  // Performance metrics
  performance: PerformanceSnapshot;

  // Predictive indicators
  predictions: PredictionSnapshot;
}

export interface IntelligenceSnapshot {
  signals: {
    total: number;
    byType: Record<string, number>;
    quality: number; // 0-1
    growth: number; // percentage change from previous
  };

  cognition: {
    queriesProcessed: number;
    intentsRecognized: number;
    entitiesExtracted: number;
    successRate: number;
  };

  execution: {
    actionsCompleted: number;
    successRate: number;
    averageResponseTime: number;
    userSatisfaction: number;
  };

  trust: {
    averageScore: number;
    scoreDistribution: Record<string, number>;
    volatility: number;
    topPerformers: number; // count
  };

  demand: {
    totalDemand: number;
    satisfiedDemand: number;
    risingCategories: string[];
    unmetHotspots: string[];
  };
}

export interface HealthSnapshot {
  overallScore: number; // 0-1
  components: {
    search: number;
    execution: number;
    demand: number;
    trust: number;
    locality: number;
    category: number;
  };

  trends: {
    direction: 'improving' | 'stable' | 'declining';
    magnitude: number;
    confidence: number;
  };

  issues: {
    active: number; // count of active health issues
    critical: number; // count of critical issues
    resolved: number; // count resolved in period
  };
}

export interface AlertSnapshot {
  total: number;
  active: number;
  resolved: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;

  trends: {
    alertVolume: number; // change in alert count
    severity: 'increasing' | 'stable' | 'decreasing';
    resolutionTime: number; // average time to resolve
  };

  topIssues: Array<{
    type: string;
    count: number;
    impact: number;
  }>;
}

export interface InsightSnapshot {
  generated: number; // total insights generated
  byType: Record<string, number>;
  byImpact: Record<string, number>; // low, medium, high, critical

  topInsights: Array<{
    id: string;
    type: string;
    title: string;
    impact: string;
    priority: number;
  }>;

  trends: {
    insightVolume: number; // change in insight generation
    quality: 'improving' | 'stable' | 'declining';
    actionability: number; // percentage with recommendations
  };
}

export interface PerformanceSnapshot {
  system: {
    uptime: number; // percentage
    responseTime: number; // average in ms
    errorRate: number;
    throughput: number; // requests per minute
  };

  intelligence: {
    processingTime: number; // average intelligence processing time
    accuracy: number; // intelligence accuracy score
    coverage: number; // percentage of district covered
    freshness: number; // how recent the data is
  };

  user: {
    searches: number;
    executions: number;
    satisfaction: number;
    retention: number; // user retention rate
  };

  operational: {
    alertsHandled: number;
    insightsActioned: number;
    issuesResolved: number;
    improvementsImplemented: number;
  };
}

export interface PredictionSnapshot {
  timeHorizon: number; // hours into future
  confidence: number; // 0-1

  predictions: Array<{
    type: string;
    metric: string;
    currentValue: number;
    predictedValue: number;
    confidence: number;
    timeframe: string;
  }>;

  scenarios: Array<{
    name: string;
    probability: number;
    impacts: Record<string, number>;
    triggers: string[];
  }>;

  risks: Array<{
    risk: string;
    probability: number;
    impact: 'low' | 'medium' | 'high';
    mitigation: string;
  }>;
}

export interface SnapshotGenerator {
  // Core snapshot generation
  generateSnapshot(districtId: number, type: SnapshotType): Promise<DistrictSnapshot>;

  // Specific snapshot types
  generateDailySnapshot(districtId: number): Promise<DistrictSnapshot>;
  generateWeeklySnapshot(districtId: number): Promise<DistrictSnapshot>;
  generateEmergencySnapshot(districtId: number, trigger: string): Promise<DistrictSnapshot>;
  generateDemandShiftSnapshot(districtId: number, trigger: DemandShiftTrigger): Promise<DistrictSnapshot>;

  // Snapshot management
  listSnapshots(districtId: number, type?: SnapshotType, limit?: number): Promise<DistrictSnapshot[]>;
  getSnapshot(snapshotId: string): Promise<DistrictSnapshot | null>;
  deleteExpiredSnapshots(): Promise<number>; // returns count deleted

  // Snapshot comparison
  compareSnapshots(snapshotA: string, snapshotB: string): Promise<SnapshotComparison>;
}

export interface DemandShiftTrigger {
  category: string;
  change: number; // percentage change
  duration: number; // hours of sustained change
  localities: string[];
}

export interface SnapshotComparison {
  snapshots: [DistrictSnapshot, DistrictSnapshot];

  changes: {
    overall: {
      direction: 'improving' | 'declining' | 'stable';
      magnitude: number;
      confidence: number;
    };

    byComponent: Record<string, {
      change: number;
      significance: 'low' | 'medium' | 'high';
      trend: 'improving' | 'declining' | 'stable';
    }>;

    keyInsights: Array<{
      component: string;
      insight: string;
      impact: 'low' | 'medium' | 'high';
    }>;
  };

  recommendations: Array<{
    action: string;
    rationale: string;
    priority: 'low' | 'medium' | 'high';
    expectedImpact: number;
  }>;
}

// Snapshot scheduling and automation
export interface SnapshotScheduler {
  // Schedule management
  scheduleSnapshot(districtId: number, type: SnapshotType, cron: string): Promise<string>; // returns schedule ID
  unscheduleSnapshot(scheduleId: string): Promise<void>;
  listSchedules(districtId?: number): Promise<SnapshotSchedule[]>;

  // Automated generation
  generateScheduledSnapshots(): Promise<void>;
  generateEmergencySnapshots(triggers: EmergencyTrigger[]): Promise<void>;

  // Quality assurance
  validateSnapshot(snapshot: DistrictSnapshot): Promise<SnapshotValidation>;
}

export interface SnapshotSchedule {
  id: string;
  districtId: number;
  type: SnapshotType;
  cron: string;
  enabled: boolean;
  lastRun: number;
  nextRun: number;
  metadata: {
    created: number;
    createdBy: string;
    priority: number;
  };
}

export interface EmergencyTrigger {
  districtId: number;
  type: 'health_critical' | 'alert_spike' | 'demand_surge' | 'trust_crisis';
  threshold: number;
  currentValue: number;
  triggerTime: number;
}

export interface SnapshotValidation {
  valid: boolean;
  score: number; // 0-1
  issues: Array<{
    severity: 'low' | 'medium' | 'high';
    component: string;
    issue: string;
    suggestion: string;
  }>;
  recommendations: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    expectedImprovement: number;
  }>;
}

// Snapshot storage and retrieval
export interface SnapshotStorage {
  // Storage operations
  storeSnapshot(snapshot: DistrictSnapshot): Promise<void>;
  retrieveSnapshot(snapshotId: string): Promise<DistrictSnapshot | null>;
  listSnapshots(districtId: number, filters?: SnapshotFilters): Promise<DistrictSnapshot[]>;

  // Archival and cleanup
  archiveSnapshot(snapshotId: string): Promise<void>;
  deleteSnapshot(snapshotId: string): Promise<void>;
  cleanupExpiredSnapshots(): Promise<number>;

  // Query and analytics
  querySnapshots(query: SnapshotQuery): Promise<DistrictSnapshot[]>;
  getSnapshotStats(districtId: number): Promise<SnapshotStats>;
}

export interface SnapshotFilters {
  type?: SnapshotType;
  period?: {
    start: number;
    end: number;
  };
  minConfidence?: number;
  includeArchived?: boolean;
  limit?: number;
  offset?: number;
}

export interface SnapshotQuery {
  districtId: number;
  filters: SnapshotFilters;
  sortBy?: 'timestamp' | 'type' | 'confidence';
  sortOrder?: 'asc' | 'desc';
}

export interface SnapshotStats {
  totalSnapshots: number;
  byType: Record<SnapshotType, number>;
  averageConfidence: number;
  storageUsed: number; // in bytes
  oldestSnapshot: number;
  newestSnapshot: number;
  archivalRate: number; // percentage archived
}

// Snapshot configuration
export interface SnapshotConfig {
  enabled: boolean;
  generation: {
    defaultConfidence: number; // 0-1
    minDataCompleteness: number; // 0-1
    processingTimeout: number; // in minutes
    retryAttempts: number;
  };

  scheduling: {
    enabled: boolean;
    timezone: string;
    dailySchedule: string; // cron expression
    weeklySchedule: string;
    monthlySchedule: string;
  };

  emergency: {
    enabled: boolean;
    triggers: EmergencyTrigger[];
    cooldown: number; // minutes between emergency snapshots
  };

  storage: {
    retention: {
      daily: number; // days
      weekly: number; // weeks
      monthly: number; // months
      emergency: number; // days
    };
    compression: boolean;
    archival: {
      enabled: boolean;
      threshold: number; // days old
      location: string;
    };
  };

  validation: {
    enabled: boolean;
    rules: SnapshotValidationRule[];
  };
}

export interface SnapshotValidationRule {
  name: string;
  component: string;
  condition: string;
  severity: 'low' | 'medium' | 'high';
  enabled: boolean;
}