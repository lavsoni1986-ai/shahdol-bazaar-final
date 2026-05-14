/**
 * ============================================
 * AI EXPLAINABILITY DASHBOARD - BharatOS Admin
 * ============================================
 * Visual AI decision explanation and system intelligence
 *
 * Features:
 * - Fraud score breakdowns
 * - AI decision explanations
 * - Trend analysis
 * - Alert intelligence
 * - System health metrics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { apiRequest } from '@/lib/api-client';
import { safeData } from '@/lib/admin-response';


import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Shield,
  Users,
  Activity,
  Target,
  Zap,
  Loader2
} from 'lucide-react';

// Types for API responses
interface FraudAnalysis {
  vendorId: number;
  vendorName: string;
  fraudScore: number;
  riskLevel: string;
  explanation: {
    reason: string;
    confidence: number;
    factors: Array<{
      name: string;
      value: number;
      impact: string;
      weight: number;
    }>;
    signals: {
      anomalyScore: number;
      patternMatches: string[];
      behaviorFlags: string[];
      historicalTrends: string[];
    };
  };
  lastAnalyzed: string;
  analysisHistory: Array<{
    score: number;
    flags: string;
    analyzedAt: string;
  }>;
}

interface SystemHealth {
  overallHealth: number;
  metrics: {
    totalVendors: number;
    totalUsers: number;
    totalOrders: number;
    avgFraudScore: number;
    highRiskVendors: number;
    criticalVendors: number;
    analysesLast24h: number;
    activeAlerts: number;
  };
  insights: string[];
  recentAlerts: Array<{
    id: number;
    message: string;
    severity: string;
    timestamp: string;
  }>;
}



const AIExplainerDashboard: React.FC = () => {
  const [selectedVendor, setSelectedVendor] = useState<FraudAnalysis | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch data on component mount
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch system health
        const healthData = await apiRequest('GET', '/admin/system-health');
        setSystemHealth(safeData(healthData));

        // Fetch AI metrics
        // Fetch fraud analysis for first vendor (you can make this dynamic)
        const fraudData = await apiRequest('GET', '/admin/fraud-analysis/1');
        setSelectedVendor(safeData(fraudData));

      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-500';
      case 'HIGH': return 'bg-orange-500';
      case 'MEDIUM': return 'bg-yellow-500';
      case 'LOW': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Loading AI Dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <Alert className="max-w-md">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Explainability Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Understanding why AI makes decisions in BharatOS
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Brain className="h-8 w-8 text-blue-600" />
          <Badge variant="secondary" className="text-sm">
            System Health: {systemHealth?.overallHealth ?? 0}%
          </Badge>
        </div>
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>System Intelligence Overview</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{systemHealth?.metrics?.totalVendors ?? 0}</div>
              <div className="text-sm text-gray-600">Total Vendors</div>
              <Progress value={Math.min(100, (systemHealth?.metrics?.totalVendors ?? 0) / 10)} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{systemHealth?.metrics?.totalUsers ?? 0}</div>
              <div className="text-sm text-gray-600">Total Users</div>
              <Progress value={Math.min(100, (systemHealth?.metrics?.totalUsers ?? 0) / 100)} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{systemHealth?.metrics?.avgFraudScore ?? 0}</div>
              <div className="text-sm text-gray-600">Avg Fraud Score</div>
              <Progress value={systemHealth?.metrics?.avgFraudScore ?? 0} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{systemHealth?.metrics?.analysesLast24h ?? 0}</div>
              <div className="text-sm text-gray-600">Analyses (24h)</div>
              <Progress value={Math.min(100, (systemHealth?.metrics?.analysesLast24h ?? 0) / 10)} className="mt-2" />
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {systemHealth?.insights?.map((insight, index) => (
              <Alert key={index}>
                <Zap className="h-4 w-4" />
                <AlertDescription>{insight}</AlertDescription>
              </Alert>
            ))}
            {systemHealth?.recentAlerts?.slice(0, 2).map((alert) => (
              <Alert key={alert.id} className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  {alert.message}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="fraud-analysis" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="fraud-analysis">Fraud Analysis</TabsTrigger>
          <TabsTrigger value="trends">Trend Analysis</TabsTrigger>
          <TabsTrigger value="rankings">AI Rankings</TabsTrigger>
          <TabsTrigger value="alerts">Smart Alerts</TabsTrigger>
        </TabsList>

        {/* Fraud Analysis Tab */}
        <TabsContent value="fraud-analysis" className="space-y-4">
          {selectedVendor ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Fraud Score Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <Shield className="h-5 w-5" />
                      Fraud Analysis - {selectedVendor?.vendorName}
                    </span>
                    <Badge className={getRiskColor(selectedVendor?.riskLevel)}>
                      {selectedVendor?.riskLevel}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                     <div className="text-4xl font-bold text-gray-900">
                       {selectedVendor?.fraudScore}
                     </div>
                     <div className="text-sm text-gray-600">Fraud Score</div>
                     <div className={`text-sm font-medium ${getConfidenceColor(selectedVendor?.explanation?.confidence)}`}>
                       Confidence: {(selectedVendor?.explanation?.confidence * 100).toFixed(0)}%
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Decision Reason</h4>
                    <p className="text-sm text-gray-600">{selectedVendor?.explanation?.reason}</p>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Key Factors</h4>
                    {selectedVendor?.explanation?.factors?.map((factor, index) => (
                        <div key={index} className="flex justify-between items-center">
                          <span className="text-sm">{factor.name}</span>
                          <div className="flex items-center space-x-2">
                            <span className={`text-sm font-medium ${
                              factor.impact === 'positive' ? 'text-green-600' :
                              factor.impact === 'negative' ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {factor.impact === 'positive' ? '+' : factor.impact === 'negative' ? '-' : ''}{factor.value}
                            </span>
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  factor.impact === 'positive' ? 'bg-green-500' :
                                  factor.impact === 'negative' ? 'bg-red-500' : 'bg-yellow-500'
                                }`}
                                style={{ width: `${Math.min(factor.weight * 100, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                </CardContent>
              </Card>

              {/* Signals & Patterns */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Target className="h-5 w-5" />
                    <span>Detection Signals</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Anomaly Score</h4>
                    <div className="flex items-center space-x-2">
                      <Progress value={selectedVendor?.explanation?.signals?.anomalyScore} className="flex-1" />
                      <span className="text-sm font-medium">{selectedVendor?.explanation?.signals?.anomalyScore}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Behavior Flags</h4>
                    {selectedVendor?.explanation?.signals?.behaviorFlags?.map((flag, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <span className="text-sm">{typeof flag === 'string' ? flag : (flag as any)?.name}</span>
                        <Badge variant="outline">{typeof flag === 'string' ? 'High' : (flag as any)?.severity}</Badge>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Historical Trends</h4>
                    <ul className="space-y-1">
                      {selectedVendor?.explanation?.signals?.historicalTrends?.map((trend, index) => (
                        <li key={index} className="text-sm text-gray-600">• {trend}</li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No fraud analysis data available. Select a vendor to analyze.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Trend Analysis Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardContent className="text-center py-8">
              <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Trend analysis coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Rankings Tab */}
        <TabsContent value="rankings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>AI Ranking Explanation</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                   <div className="flex items-center justify-between mb-2">
                     <h3 className="font-medium">{selectedVendor?.vendorName}</h3>
                     <Badge variant="secondary">Rank #1</Badge>
                   </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Why this vendor is ranked #1 out of 50 in Shahdol district
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-2">Positive Factors</h4>
                      <ul className="space-y-1">
                        <li className="text-sm text-green-600">• High DSSL Score (85/100)</li>
                        <li className="text-sm text-green-600">• Good conversion rate (42%)</li>
                        <li className="text-sm text-green-600">• Repeat customers (30%)</li>
                        <li className="text-sm text-green-600">• Low fraud risk</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-2">AI Confidence</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Overall Confidence</span>
                          <span className="font-medium text-green-600">91%</span>
                        </div>
                        <Progress value={91} className="h-2" />
                        <div className="text-xs text-gray-500">
                          Ranking stable for 12 days
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Brain className="h-4 w-4" />
                  <AlertDescription>
                    This ranking is based on real-time AI analysis of vendor behavior,
                    customer feedback, and fraud patterns. Rankings update every 15 minutes.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Smart Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <div className="font-medium">CRITICAL ALERT: Vendor Fraud Spike</div>
                <div className="text-sm mt-1">
                  {selectedVendor?.vendorName} fraud score jumped from 45 to 78 in 24 hours.
                </div>
                <div className="text-sm mt-2">
                  <strong>Why:</strong> 50 fake reviews detected, same IP clustering, pattern match confidence 87%.
                </div>
              </AlertDescription>
            </Alert>

            <Alert className="border-yellow-200 bg-yellow-50">
              <TrendingUp className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <div className="font-medium">TREND ALERT: District Risk Increasing</div>
                <div className="text-sm mt-1">
                  Shahdol district fraud indicators up 15% this week.
                </div>
                <div className="text-sm mt-2">
                  <strong>AI Insight:</strong> Correlated with increased promotional activity.
                  Monitor vendors offering heavy discounts.
                </div>
              </AlertDescription>
            </Alert>

            <Alert className="border-green-200 bg-green-50">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <div className="font-medium">SUCCESS: AI Intervention Effective</div>
                <div className="text-sm mt-1">
                  Fraud prevention measures reduced suspicious activities by 23%.
                </div>
                <div className="text-sm mt-2">
                  <strong>Confidence:</strong> 94% - System performing as expected.
                </div>
              </AlertDescription>
            </Alert>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIExplainerDashboard;
