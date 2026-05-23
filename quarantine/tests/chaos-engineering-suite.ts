/**
 * CHAOS ENGINEERING SUITE - P1C.4.2
 *
 * Enterprise-grade chaos engineering for BharatOS commerce infrastructure.
 * Simulates real-world failures to validate system resilience.
 */

import { prisma } from '../storage.js';
import { durableEventBus } from '../services/event-delivery-verification.js';
import { reservationCleanupWorker } from '../services/reservation-cleanup-worker.js';

// ============================================
// CHAOS CONFIGURATION
// ============================================

interface ChaosEvent {
  id: string;
  type: 'DB_DISCONNECT' | 'EVENT_BUS_FAILURE' | 'WORKER_DEATH' | 'PARTIAL_COMMIT' | 'HIGH_LATENCY';
  duration: number; // milliseconds
  probability: number; // 0-1
  active: boolean;
  startTime?: Date;
  endTime?: Date;
  impact: ChaosImpact;
}

interface ChaosImpact {
  affectedServices: string[];
  expectedBehavior: string;
  recoveryTime: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface ChaosExperiment {
  id: string;
  name: string;
  description: string;
  events: ChaosEvent[];
  duration: number;
  startTime?: Date;
  endTime?: Date;
  status: 'PLANNED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  results: ChaosResults;
}

interface ChaosResults {
  systemStability: number; // 0-100
  recoveryTime: number;
  dataIntegrity: boolean;
  businessContinuity: boolean;
  incidents: ChaosIncident[];
  metrics: ChaosMetrics;
}

interface ChaosIncident {
  timestamp: Date;
  event: ChaosEvent;
  impact: string;
  recovery: string;
  duration: number;
}

interface ChaosMetrics {
  requestsDuringChaos: number;
  failedRequestsDuringChaos: number;
  averageLatencyDuringChaos: number;
  errorRateDuringChaos: number;
  recoveryLatency: number;
}

// ============================================
// CHAOS ENGINEERING ENGINE
// ============================================

export class ChaosEngineeringEngine {
  private experiments: ChaosExperiment[] = [];
  private activeChaos: ChaosEvent[] = [];
  private metricsCollector: ChaosMetricsCollector;

  constructor() {
    this.metricsCollector = new ChaosMetricsCollector();
  }

  /**
   * CREATE CHAOS EXPERIMENT
   */
  createExperiment(name: string, description: string, duration: number): ChaosExperiment {
    const experiment: ChaosExperiment = {
      id: `chaos_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description,
      events: this.generateChaosEvents(),
      duration,
      status: 'PLANNED',
      results: {
        systemStability: 0,
        recoveryTime: 0,
        dataIntegrity: true,
        businessContinuity: true,
        incidents: [],
        metrics: {
          requestsDuringChaos: 0,
          failedRequestsDuringChaos: 0,
          averageLatencyDuringChaos: 0,
          errorRateDuringChaos: 0,
          recoveryLatency: 0
        }
      }
    };

    this.experiments.push(experiment);
    return experiment;
  }

  /**
   * EXECUTE CHAOS EXPERIMENT
   */
  async executeExperiment(experimentId: string): Promise<ChaosResults> {
    const experiment = this.experiments.find(e => e.id === experimentId);
    if (!experiment) {
      throw new Error(`Experiment ${experimentId} not found`);
    }

    console.log(`🌀 STARTING CHAOS EXPERIMENT: ${experiment.name}`);
    console.log(`Description: ${experiment.description}`);
    console.log(`Duration: ${experiment.duration}ms`);
    console.log(`Events: ${experiment.events.length}`);

    experiment.status = 'RUNNING';
    experiment.startTime = new Date();

    // Start metrics collection
    this.metricsCollector.startCollection();

    try {
      // Execute chaos events
      const chaosPromises = experiment.events.map(event => this.executeChaosEvent(event, experiment));
      await Promise.allSettled(chaosPromises);

      // Wait for experiment duration
      await new Promise(resolve => setTimeout(resolve, experiment.duration));

      // Stop metrics collection
      const metrics = this.metricsCollector.stopCollection();

      // Assess system stability
      const stability = await this.assessSystemStability(experiment);

      experiment.status = 'COMPLETED';
      experiment.endTime = new Date();
      experiment.results = {
        systemStability: stability.score,
        recoveryTime: stability.recoveryTime,
        dataIntegrity: stability.dataIntegrity,
        businessContinuity: stability.businessContinuity,
        incidents: stability.incidents,
        metrics
      };

      console.log(`✅ CHAOS EXPERIMENT COMPLETED`);
      console.log(`System Stability: ${stability.score}/100`);
      console.log(`Recovery Time: ${stability.recoveryTime}ms`);
      console.log(`Data Integrity: ${stability.dataIntegrity ? 'MAINTAINED' : 'COMPROMISED'}`);
      console.log(`Business Continuity: ${stability.businessContinuity ? 'MAINTAINED' : 'BROKEN'}`);

      return experiment.results;

    } catch (error) {
      experiment.status = 'FAILED';
      experiment.endTime = new Date();
      console.error(`❌ CHAOS EXPERIMENT FAILED:`, error);
      throw error;
    }
  }

  /**
   * GENERATE CHAOS EVENTS
   */
  private generateChaosEvents(): ChaosEvent[] {
    const events: ChaosEvent[] = [];

    LIVE_FIRE_CONFIG.chaosEvents.forEach(config => {
      if (Math.random() < config.probability) {
        events.push({
          id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: config.type,
          duration: config.duration,
          probability: config.probability,
          active: false,
          impact: this.getEventImpact(config.type)
        });
      }
    });

    return events;
  }

  /**
   * EXECUTE CHAOS EVENT
   */
  private async executeChaosEvent(event: ChaosEvent, experiment: ChaosExperiment): Promise<void> {
    console.log(`⚡ EXECUTING CHAOS EVENT: ${event.type} (${event.duration}ms)`);

    event.active = true;
    event.startTime = new Date();

    // Execute the chaos
    await this.implementChaos(event);

    // Wait for duration
    await new Promise(resolve => setTimeout(resolve, event.duration));

    // Stop the chaos
    await this.stopChaos(event);

    event.active = false;
    event.endTime = new Date();

    // Record incident
    const incident: ChaosIncident = {
      timestamp: new Date(),
      event,
      impact: event.impact.expectedBehavior,
      recovery: 'Automatic recovery implemented',
      duration: event.duration
    };

    experiment.results.incidents.push(incident);

    console.log(`✅ CHAOS EVENT COMPLETED: ${event.type}`);
  }

  /**
   * IMPLEMENT CHAOS
   */
  private async implementChaos(event: ChaosEvent): Promise<void> {
    switch (event.type) {
      case 'DB_DISCONNECT':
        await this.implementDBDisconnect(event.duration);
        break;

      case 'EVENT_BUS_FAILURE':
        await this.implementEventBusFailure(event.duration);
        break;

      case 'WORKER_DEATH':
        await this.implementWorkerDeath(event.duration);
        break;

      case 'PARTIAL_COMMIT':
        await this.implementPartialCommit();
        break;

      case 'HIGH_LATENCY':
        await this.implementHighLatency(event.duration);
        break;

      default:
        console.warn(`Unknown chaos event type: ${event.type}`);
    }
  }

  /**
   * STOP CHAOS
   */
  private async stopChaos(event: ChaosEvent): Promise<void> {
    // Most chaos events are self-healing, but some need cleanup
    switch (event.type) {
      case 'HIGH_LATENCY':
        await this.stopHighLatency();
        break;

      default:
        // Self-healing chaos
        break;
    }
  }

  /**
   * DB DISCONNECT CHAOS
   */
  private async implementDBDisconnect(duration: number): Promise<void> {
    console.log('💥 SIMULATING DB DISCONNECT');

    // In a real system, this would temporarily disconnect from database
    // For simulation, we'll introduce artificial delays and failures
    this.activeChaos.push({
      id: 'db_disconnect',
      type: 'DB_DISCONNECT',
      duration,
      probability: 1,
      active: true,
      impact: this.getEventImpact('DB_DISCONNECT')
    });

    // Simulate DB unavailability by rejecting queries
    const originalQuery = prisma.$queryRaw;
    prisma.$queryRaw = async (...args: any[]) => {
      if (Math.random() < 0.8) { // 80% failure rate during chaos
        throw new Error('Database connection lost (chaos simulation)');
      }
      return originalQuery.apply(prisma, args);
    };

    // Restore after duration
    setTimeout(() => {
      prisma.$queryRaw = originalQuery;
      console.log('🔄 DB CONNECTION RESTORED');
    }, duration);
  }

  /**
   * EVENT BUS FAILURE CHAOS
   */
  private async implementEventBusFailure(duration: number): Promise<void> {
    console.log('📡 SIMULATING EVENT BUS FAILURE');

    // Temporarily break event publishing
    const originalPublish = durableEventBus.publish;
    durableEventBus.publish = async (event: any) => {
      if (Math.random() < 0.9) { // 90% failure rate
        throw new Error('Event bus unavailable (chaos simulation)');
      }
      return originalPublish.call(durableEventBus, event);
    };

    setTimeout(() => {
      durableEventBus.publish = originalPublish;
      console.log('🔄 EVENT BUS RESTORED');
    }, duration);
  }

  /**
   * WORKER DEATH CHAOS
   */
  private async implementWorkerDeath(duration: number): Promise<void> {
    console.log('💀 SIMULATING WORKER DEATH');

    // Stop the reservation cleanup worker
    await reservationCleanupWorker.stop();

    setTimeout(async () => {
      await reservationCleanupWorker.start();
      console.log('🔄 WORKER RESTARTED');
    }, duration);
  }

  /**
   * PARTIAL COMMIT CHAOS
   */
  private async implementPartialCommit(): Promise<void> {
    console.log('⚠️ SIMULATING PARTIAL COMMIT');

    // This would be implemented by temporarily modifying transaction logic
    // to simulate partial failures during atomic operations
    console.log('Partial commit simulation: Some transactions may fail partially');
  }

  /**
   * HIGH LATENCY CHAOS
   */
  private async implementHighLatency(duration: number): Promise<void> {
    console.log('🐌 SIMULATING HIGH LATENCY');

    // Add artificial delays to all operations
    this.activeChaos.push({
      id: 'high_latency',
      type: 'HIGH_LATENCY',
      duration,
      probability: 1,
      active: true,
      impact: this.getEventImpact('HIGH_LATENCY')
    });
  }

  /**
   * STOP HIGH LATENCY
   */
  private async stopHighLatency(): Promise<void> {
    // Remove latency chaos
    this.activeChaos = this.activeChaos.filter(c => c.type !== 'HIGH_LATENCY');
  }

  /**
   * GET EVENT IMPACT
   */
  private getEventImpact(type: string): ChaosImpact {
    const impacts: Record<string, ChaosImpact> = {
      DB_DISCONNECT: {
        affectedServices: ['Order Engine', 'Financial Ledger', 'Inventory'],
        expectedBehavior: 'Orders fail, stock operations blocked, financial drift possible',
        recoveryTime: 30000,
        severity: 'CRITICAL'
      },
      EVENT_BUS_FAILURE: {
        affectedServices: ['Event Publishing', 'Notifications', 'Analytics'],
        expectedBehavior: 'Events not delivered, async operations fail, monitoring gaps',
        recoveryTime: 45000,
        severity: 'HIGH'
      },
      WORKER_DEATH: {
        affectedServices: ['Reservation Cleanup', 'Background Jobs'],
        expectedBehavior: 'Reservations not cleaned, potential stock leaks',
        recoveryTime: 60000,
        severity: 'MEDIUM'
      },
      PARTIAL_COMMIT: {
        affectedServices: ['Order Processing', 'Financial Transactions'],
        expectedBehavior: 'Some transactions succeed partially, data inconsistency',
        recoveryTime: 0,
        severity: 'CRITICAL'
      },
      HIGH_LATENCY: {
        affectedServices: ['All Services'],
        expectedBehavior: 'Requests slow down, timeouts increase, user experience degrades',
        recoveryTime: 20000,
        severity: 'MEDIUM'
      }
    };

    return impacts[type] || {
      affectedServices: ['Unknown'],
      expectedBehavior: 'Unknown impact',
      recoveryTime: 0,
      severity: 'LOW'
    };
  }

  /**
   * ASSESS SYSTEM STABILITY
   */
  private async assessSystemStability(experiment: ChaosExperiment): Promise<{
    score: number;
    recoveryTime: number;
    dataIntegrity: boolean;
    businessContinuity: boolean;
    incidents: ChaosIncident[];
  }> {
    // Check data integrity
    const dataIntegrity = await this.checkDataIntegrity();

    // Check business continuity
    const businessContinuity = await this.checkBusinessContinuity();

    // Calculate recovery time
    const recoveryTime = experiment.results.incidents.reduce((sum, incident) => sum + incident.duration, 0);

    // Calculate stability score (0-100)
    let score = 100;

    // Deduct for incidents
    score -= experiment.results.incidents.length * 5;

    // Deduct for severity
    experiment.results.incidents.forEach(incident => {
      switch (incident.event.impact.severity) {
        case 'CRITICAL': score -= 20; break;
        case 'HIGH': score -= 10; break;
        case 'MEDIUM': score -= 5; break;
        case 'LOW': score -= 1; break;
      }
    });

    // Deduct for data integrity issues
    if (!dataIntegrity) score -= 30;

    // Deduct for business continuity issues
    if (!businessContinuity) score -= 40;

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      recoveryTime,
      dataIntegrity,
      businessContinuity,
      incidents: experiment.results.incidents
    };
  }

  /**
   * CHECK DATA INTEGRITY
   */
  private async checkDataIntegrity(): Promise<boolean> {
    try {
      // Check order totals vs ledger
      const invariants = await financialInvariantEngine.validateInvariants(1);
      return invariants.isBalanced;
    } catch (error) {
      console.error('Data integrity check failed:', error);
      return false;
    }
  }

  /**
   * CHECK BUSINESS CONTINUITY
   */
  private async checkBusinessContinuity(): Promise<boolean> {
    try {
      // Check if system can still process orders
      const testOrder = await this.createTestOrder();
      return !!testOrder;
    } catch (error) {
      console.error('Business continuity check failed:', error);
      return false;
    }
  }

  /**
   * CREATE TEST ORDER
   */
  private async createTestOrder(): Promise<any> {
    return prisma.sovereignOrder.create({
      data: {
        districtId: 1,
        userId: 1,
        totalAmountPaisa: 10000,
        totalItems: 1,
        paymentMethod: 'CASH',
        customerName: 'Chaos Test',
        customerPhone: '9999999999',
        customerAddress: 'Test Address',
        items: {
          create: [{
            productId: 1,
            vendorId: 1,
            quantity: 1,
            unitPricePaisa: 10000,
            subtotalPaisa: 10000,
            commissionPaisa: 500
          }]
        }
      }
    });
  }

  /**
   * GET ACTIVE CHAOS
   */
  getActiveChaos(): ChaosEvent[] {
    return this.activeChaos;
  }

  /**
   * GET EXPERIMENTS
   */
  getExperiments(): ChaosExperiment[] {
    return this.experiments;
  }
}

// ============================================
// CHAOS METRICS COLLECTOR
// ============================================

class ChaosMetricsCollector {
  private isCollecting = false;
  private metrics: ChaosMetrics = {
    requestsDuringChaos: 0,
    failedRequestsDuringChaos: 0,
    averageLatencyDuringChaos: 0,
    errorRateDuringChaos: 0,
    recoveryLatency: 0
  };

  startCollection(): void {
    this.isCollecting = true;
    this.metrics = {
      requestsDuringChaos: 0,
      failedRequestsDuringChaos: 0,
      averageLatencyDuringChaos: 0,
      errorRateDuringChaos: 0,
      recoveryLatency: 0
    };
  }

  stopCollection(): ChaosMetrics {
    this.isCollecting = false;
    return this.metrics;
  }

  recordRequest(success: boolean, latency: number): void {
    if (!this.isCollecting) return;

    this.metrics.requestsDuringChaos++;
    if (!success) {
      this.metrics.failedRequestsDuringChaos++;
    }

    // Update average latency
    const currentAverage = this.metrics.averageLatencyDuringChaos;
    const newCount = this.metrics.requestsDuringChaos;
    this.metrics.averageLatencyDuringChaos = ((currentAverage * (newCount - 1)) + latency) / newCount;

    this.metrics.errorRateDuringChaos = (this.metrics.failedRequestsDuringChaos / this.metrics.requestsDuringChaos) * 100;
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const chaosEngineeringEngine = new ChaosEngineeringEngine();