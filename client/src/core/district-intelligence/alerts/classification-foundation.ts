/**
 * ALERT CLASSIFICATION FOUNDATION
 * BharatOS Phase 7 - District Operating Console Foundation
 *
 * Foundation for classifying and managing district intelligence alerts
 */

import { IntelligenceAlert, AlertType } from '../../shared/district-intelligence/types';

export interface AlertClassifier {
  // Alert detection and classification
  classifyAlert(signal: any, context: AlertContext): Promise<AlertType | null>;
  generateAlert(alertType: AlertType, data: AlertData, context: AlertContext): Promise<IntelligenceAlert>;

  // Alert prioritization
  prioritizeAlert(alert: IntelligenceAlert): Promise<number>; // 1-10 priority score

  // Alert validation
  validateAlert(alert: IntelligenceAlert): Promise<boolean>;
  shouldTriggerAlert(alertType: AlertType, data: AlertData): Promise<boolean>;

  // Alert deduplication
  isDuplicateAlert(alert: IntelligenceAlert, recentAlerts: IntelligenceAlert[]): Promise<boolean>;
}

export interface AlertContext {
  districtId: number;
  timestamp: number;
  timeWindow: {
    start: number;
    end: number;
  };
  signalSource: string;
  confidence: number;
}

export interface AlertData {
  entityId?: string | number;
  entityType?: 'vendor' | 'category' | 'locality';
  metrics: Record<string, any>;
  previousValue?: number;
  currentValue: number;
  threshold: number;
  change?: number;
  metadata: Record<string, any>;
}

export interface AlertThresholds {
  DEMAND_SPIKE: {
    growthRate: number; // percentage increase
    minimumVolume: number;
    timeWindow: number; // in hours
  };

  TRUST_DROP: {
    dropThreshold: number; // trust score decrease
    minimumTrust: number; // minimum starting trust
    timeWindow: number; // in hours
  };

  SERVICE_GAP: {
    unmetDemandRatio: number; // 0-1
    minimumSearches: number;
    duration: number; // in hours
  };

  EXECUTION_FAILURE_CLUSTER: {
    failureRate: number; // 0-1
    minimumActions: number;
    clusterSize: number; // affected users/vendors
  };

  HIGH_EMERGENCY_ACTIVITY: {
    activitySpike: number; // multiplier
    emergencyRatio: number; // 0-1
    timeWindow: number; // in hours
  };

  LOCALITY_SHORTAGE: {
    shortageSeverity: number; // 0-1
    affectedUsers: number;
    duration: number; // in hours
  };

  VENDOR_RELIABILITY_DROP: {
    reliabilityDrop: number; // 0-1 decrease
    minimumReliability: number; // starting reliability
    timeWindow: number; // in hours
  };

  CATEGORY_GROWTH_SPIKE: {
    growthRate: number; // percentage
    minimumVolume: number;
    sustainability: number; // how long the trend lasts
  };

  UNMET_DEMAND_CLUSTER: {
    clusterSize: number;
    unmetRatio: number; // 0-1
    duration: number; // in hours
  };

  TRUST_CONCENTRATION_RISK: {
    concentrationIndex: number; // 0-1
    threshold: number; // when to alert
    affectedCategories: string[];
  };
}

export interface AlertRule {
  type: AlertType;
  name: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;

  // Detection conditions
  conditions: Array<{
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=' | 'changes_by';
    threshold: number;
    timeWindow?: number; // in hours
    aggregation?: 'sum' | 'avg' | 'max' | 'min' | 'count';
  }>;

  // Alert metadata
  cooldown: number; // minutes between similar alerts
  autoResolve: boolean;
  requiresAck: boolean;

  // Response guidance
  recommendations: string[];
  escalation: {
    after: number; // minutes
    to: 'supervisor' | 'admin' | 'system';
  };
}

export interface AlertManager {
  // Alert lifecycle
  createAlert(alertType: AlertType, data: AlertData, context: AlertContext): Promise<IntelligenceAlert>;
  acknowledgeAlert(alertId: string, userId: string, comment?: string): Promise<void>;
  resolveAlert(alertId: string, userId: string, resolution?: string): Promise<void>;

  // Alert querying
  getActiveAlerts(districtId: number, severity?: string): Promise<IntelligenceAlert[]>;
  getAlertHistory(districtId: number, timeWindow: { start: number; end: number }): Promise<IntelligenceAlert[]>;
  getAlertById(alertId: string): Promise<IntelligenceAlert | null>;

  // Alert analysis
  getAlertPatterns(districtId: number, timeWindow: { start: number; end: number }): Promise<{
    byType: Record<AlertType, number>;
    bySeverity: Record<string, number>;
    trends: Array<{
      type: AlertType;
      frequency: number;
      trend: 'increasing' | 'stable' | 'decreasing';
    }>;
  }>;

  // Alert configuration
  updateAlertRules(rules: AlertRule[]): Promise<void>;
  getAlertRules(): Promise<AlertRule[]>;
}

export interface AlertNotification {
  alert: IntelligenceAlert;
  channels: ('email' | 'sms' | 'dashboard' | 'api')[];
  recipients: Array<{
    type: 'user' | 'role' | 'system';
    id: string;
    contact: string;
  }>;
  template: {
    subject: string;
    message: string;
    actions: Array<{
      label: string;
      url: string;
      primary: boolean;
    }>;
  };
  metadata: {
    priority: 'low' | 'normal' | 'high' | 'urgent';
    escalation: boolean;
    retryCount: number;
  };
}

// Alert escalation policies
export interface AlertEscalationPolicy {
  severity: 'low' | 'medium' | 'high' | 'critical';
  initialResponse: number; // minutes to first response
  escalation: Array<{
    after: number; // minutes from alert creation
    to: 'supervisor' | 'admin' | 'management';
    method: 'email' | 'sms' | 'call';
  }>;
  autoResolve: {
    enabled: boolean;
    conditions: string[]; // when to auto-resolve
    after: number; // minutes
  };
}

// Alert analytics
export interface AlertAnalytics {
  districtId: number;
  timeWindow: { start: number; end: number };

  summary: {
    totalAlerts: number;
    byType: Record<AlertType, number>;
    bySeverity: Record<string, number>;
    resolutionRate: number; // percentage resolved
    averageResolutionTime: number; // in minutes
  };

  performance: {
    detectionAccuracy: number; // true positives / total alerts
    falsePositiveRate: number;
    alertFatigue: number; // alerts per day that might overwhelm
    responseEfficiency: number; // average time to acknowledge
  };

  trends: {
    alertVolumeTrend: 'increasing' | 'stable' | 'decreasing';
    severityTrend: 'increasing' | 'stable' | 'decreasing';
    typeDistributionShift: Record<AlertType, number>; // percentage change
  };

  insights: {
    mostCommonAlerts: AlertType[];
    problematicTimes: string[]; // time periods with most alerts
    systemicIssues: string[];
    improvementOpportunities: string[];
  };
}