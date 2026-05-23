// 📁 server/services/dssl.intelligence.ts
// DSSL Intelligence - Fraud detection via AuditLog pattern analysis

import { prisma } from "../storage";

// Severity weights for different action types
const SEVERITY_WEIGHTS: Record<string, number> = {
  // High risk actions
  delete_Vendor: 10,
  delete_Product: 8,
  delete_Order: 8,
  update_Vendor_status: 7,
  update_Order_status: 6,
  block_User: 9,
  
  // Medium risk
  create_Product: 2,
  create_Vendor: 2,
  update_Product: 3,
  update_Vendor: 3,
  
  // Low risk
  create_Order: 1,
  read_: 0,
  findMany: 0,
};

function calculateRiskScore(actions: { action: string; count: number }[]): number {
  let score = 0;
  
  for (const { action, count } of actions) {
    const baseWeight = SEVERITY_WEIGHTS[action] || 1;
    score += count * baseWeight;
  }
  
  return score;
}

function detectAnomalies(actions: { action: string; count: number }[]): string[] {
  const anomalies: string[] = [];
  
  // Check for unusual activity patterns
  for (const { action, count } of actions) {
    if (count > 100 && action.includes("delete")) {
      anomalies.push(`High volume of ${action} operations (${count})`);
    }
    if (count > 500) {
      anomalies.push(`Unusual request volume: ${count} operations`);
    }
  }
  
  return anomalies;
}

export const dsslIntelligence = {
  async analyzeDistrictRisk(districtId: number): Promise<{
    riskScore: number;
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    anomalies: string[];
    summary: {
      totalActions: number;
      uniqueUsers: number;
      timeWindow: string;
    };
  }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Get recent audit logs for the district
    const recentLogs = await prisma.auditLog.findMany({
      where: {
        districtId,
        createdAt: { gte: oneHourAgo }
      },
      select: {
        action: true,
        userId: true
      }
    });

    if (recentLogs.length === 0) {
      return {
        riskScore: 0,
        riskLevel: "LOW",
        anomalies: [],
        summary: {
          totalActions: 0,
          uniqueUsers: 0,
          timeWindow: "1 hour"
        }
      };
    }

    // Group by action and count
    const actionCounts = new Map<string, number>();
    const userCounts = new Set<number>();

    for (const log of recentLogs) {
      actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
      if (log.userId) userCounts.add(log.userId);
    }

    const actions = Array.from(actionCounts.entries()).map(([action, count]) => ({
      action,
      count
    }));

    const riskScore = calculateRiskScore(actions);
    const anomalies = detectAnomalies(actions);

    // Determine risk level
    let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
    if (riskScore >= 100) riskLevel = "CRITICAL";
    else if (riskScore >= 50) riskLevel = "HIGH";
    else if (riskScore >= 20) riskLevel = "MEDIUM";

    return {
      riskScore,
      riskLevel,
      anomalies,
      summary: {
        totalActions: recentLogs.length,
        uniqueUsers: userCounts.size,
        timeWindow: "1 hour"
      }
    };
  },

  async getTopRiskyUsers(districtId: number, limit: number = 5): Promise<{
    userId: number;
    riskScore: number;
    actions: string[];
  }[]> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const logs = await prisma.auditLog.findMany({
      where: {
        districtId,
        createdAt: { gte: oneDayAgo },
        userId: { not: null }
      },
      select: {
        userId: true,
        action: true
      }
    });

    const userActions = new Map<number, string[]>();
    
    for (const log of logs) {
      if (log.userId) {
        const actions = userActions.get(log.userId) || [];
        actions.push(log.action);
        userActions.set(log.userId, actions);
      }
    }

    const userRisks = Array.from(userActions.entries()).map(([userId, actions]) => {
      const actionCounts = actions.reduce((acc, action) => {
        acc[action] = (acc[action] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const actionArray = Object.entries(actionCounts).map(([action, count]) => ({
        action,
        count
      }));
      
      return {
        userId,
        riskScore: calculateRiskScore(actionArray),
        actions: [...new Set(actions)]
      };
    });

    return userRisks
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, limit);
  },

  async generateDSSLScore(districtId: number): Promise<number> {
    const analysis = await this.analyzeDistrictRisk(districtId);
    
    // Convert risk score to DSSL score (0-100, higher is better)
    // Invert: 0 risk = 100 DSSL, 100+ risk = 0 DSSL
    const dsslScore = Math.max(0, 100 - analysis.riskScore);
    
    return dsslScore;
  }
};

export default dsslIntelligence;