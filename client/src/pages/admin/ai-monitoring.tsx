/**
 * ============================================
 * AI MONITORING DASHBOARD - BharatOS Sovereign Command Center
 * ============================================
 * Comprehensive AI intelligence and control dashboard
 *
 * Features:
 * - Real-time AI metrics and KPIs
 * - Fraud trend analysis and visualization
 * - Smart alert system with explainability
 * - Network graph for fraud detection
 * - Policy impact simulation
 * - Model behavior monitoring
 * - AI learning insights
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/api-client';
import { safeData } from '@/lib/admin-response';
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Shield,
  Activity,
  Target,
  Zap,
  Network,
  Play,
  Pause,
  Filter,
  Eye,
  RefreshCw
} from 'lucide-react';

// Import custom components
import MetricCard from '@/components/admin/MetricCard';
import TrendChart from '@/components/admin/TrendChart';
import AlertCard from '@/components/admin/AlertCard';
import ExplainCard from '@/components/admin/ExplainCard';
import NetworkGraph from '@/components/admin/NetworkGraph';
import PolicySimulator from '@/components/admin/PolicySimulator';
import ModelStatus from '@/components/admin/ModelStatus';

// Types for API responses
interface AIMetrics {
  fraudAccuracy: number;
  falsePositiveRate: number;
  avgTrustScore: number;
  activeThreats: number;
  systemHealth: number;
}

interface TrendData {
  dates: string[];
  fraudScores: number[];
  trustScores: number[];
  alertVolumes: number[];
}

interface AlertItem {
  id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  confidence: number;
  reasons: string[];
  timestamp: string;
  entityId?: string;
  entityType?: string;
}

interface ExplainData {
  entity: string;
  score: number;
  breakdown: Record<string, number>;
  confidence: number;
  reasons: string[];
}

interface NetworkData {
  nodes: Array<{
    id: string;
    label: string;
    type: 'user' | 'vendor' | 'ip';
    risk: number;
  }>;
  links: Array<{
    source: string;
    target: string;
    type: 'review' | 'purchase' | 'ip_shared';
    strength: number;
  }>;
}

interface PolicyImpact {
  vendorsAffected: number;
  falsePositives: number;
  revenueImpact: number;
}

interface ModelStatusData {
  drift: number;
  patternsLearned: number;
  autoTuning: boolean;
  confidence: number;
  lastUpdate: string;
}

const AIMonitoringDashboard: React.FC = () => {
  // State management
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [trendData, setTrendData] = useState<TrendData | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [explainData, setExplainData] = useState<ExplainData | null>(null);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [policyImpact, setPolicyImpact] = useState<PolicyImpact | null>(null);
  const [modelStatus, setModelStatus] = useState<ModelStatusData | null>(null);

  // UI state
  const [isLive, setIsLive] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  const [timeRange, setTimeRange] = useState('7d');
  const [riskFilter, setRiskFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setError(null);

      const [
        metricsData,
        trendsData,
        alertsData,
        networkData
      ] = await Promise.all([
        apiRequest("GET", "/admin/metrics"),
        apiRequest("GET", "/admin/trends"),
        apiRequest("GET", "/admin/alerts"),
        apiRequest("GET", "/admin/fraud-network"),
      ]);

      const modelData = await apiRequest("GET", "/admin/model-status");

      setMetrics(safeData(metricsData));
      setTrendData(safeData(trendsData));

      const alertList = safeData<any[]>(alertsData);
      setAlerts(Array.isArray(alertList) ? alertList : []);

      setNetworkData(safeData(networkData));
      setModelStatus(safeData(modelData));

    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Live updates
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(fetchDashboardData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [isLive]);

  // Handle alert selection for explainability
  const handleAlertClick = async (alert: AlertItem) => {
    setSelectedAlert(alert);
    if (alert.entityId && alert.entityType === 'vendor') {
      try {
        const data = await apiRequest("GET", `/admin/vendor-insights?vendorId=${alert.entityId}`);
        setExplainData(safeData(data));
      } catch (err) {
        console.error('Failed to fetch explanation:', err);
      }
    }
  };

  // Handle policy simulation
  const handlePolicySimulate = async (newThreshold: number) => {
    try {
      const data = await apiRequest("POST", "/admin/policy-simulate", { threshold: newThreshold });
      const resolved = safeData<any>(data);
      const impactData = resolved?.impact ?? resolved;
      setPolicyImpact(impactData);
    } catch (err) {
      console.error('Policy simulation failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <span className="text-lg text-gray-600">Loading AI Monitoring Dashboard...</span>
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
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-3">
            <Brain className="h-8 w-8 text-blue-600" />
            <span>AI Monitoring Dashboard</span>
          </h1>
          <p className="text-gray-600 mt-1">
            Sovereign Command Center - Real-time AI Intelligence & Control
          </p>
        </div>

        <div className="flex items-center space-x-4">
          {/* Live Mode Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="live-mode"
              checked={isLive}
              onCheckedChange={setIsLive}
            />
            <label htmlFor="live-mode" className="text-sm font-medium">
              {isLive ? (
                <span className="flex items-center space-x-1 text-green-600">
                  <Play className="h-3 w-3" />
                  <span>LIVE</span>
                </span>
              ) : (
                <span className="flex items-center space-x-1 text-gray-600">
                  <Pause className="h-3 w-3" />
                  <span>PAUSED</span>
                </span>
              )}
            </label>
          </div>

          {/* Refresh Button */}
          <Button onClick={fetchDashboardData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">Filters:</span>

            <Select value={selectedDistrict} onValueChange={setSelectedDistrict}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="District" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Districts</SelectItem>
                <SelectItem value="shahdol">Shahdol</SelectItem>
                <SelectItem value="jabalpur">Jabalpur</SelectItem>
                <SelectItem value="bhopal">Bhopal</SelectItem>
              </SelectContent>
            </Select>

            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="24h">Last 24h</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>

            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Risks</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* KPI Strip */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <MetricCard
            title="Fraud Accuracy"
            value={`${metrics.fraudAccuracy}%`}
            trend="+2.1%"
            icon={Target}
            color="green"
          />
          <MetricCard
            title="False Positive Rate"
            value={`${metrics.falsePositiveRate}%`}
            trend="-1.3%"
            icon={AlertTriangle}
            color="orange"
          />
          <MetricCard
            title="Avg Trust Score"
            value={metrics.avgTrustScore.toString()}
            trend="+5.2%"
            icon={Shield}
            color="blue"
          />
          <MetricCard
            title="Active Threats"
            value={metrics.activeThreats.toString()}
            trend="+12%"
            icon={Zap}
            color="red"
          />
          <MetricCard
            title="System Health"
            value={`${metrics.systemHealth}%`}
            trend="Stable"
            icon={Activity}
            color="purple"
          />
        </div>
      )}

      {/* Main Dashboard Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="alerts">Smart Alerts</TabsTrigger>
          <TabsTrigger value="explain">Explainability</TabsTrigger>
          <TabsTrigger value="network">Network Graph</TabsTrigger>
          <TabsTrigger value="policy">Policy Simulator</TabsTrigger>
          <TabsTrigger value="model">AI Model</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trend Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>AI Performance Trends</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trendData ? (
                  <TrendChart
                    data={trendData.dates.map((date, index) => ({
                      date,
                      fraudScore: trendData.fraudScores[index],
                      trustScore: trendData.trustScores[index],
                      alerts: trendData.alertVolumes[index]
                    }))}
                    lines={[
                      { key: 'fraudScore', name: 'Fraud Score', color: '#ef4444' },
                      { key: 'trustScore', name: 'Trust Score', color: '#10b981' },
                      { key: 'alerts', name: 'Alert Volume', color: '#f59e0b' }
                    ]}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Loading trend data...
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Recent Critical Alerts</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    onClick={() => handleAlertClick(alert)}
                  />
                ))}
                {alerts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No critical alerts at this time
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* System Health Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>System Health Summary</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {modelStatus && (
                  <div className="space-y-4">
                    <h4 className="font-medium">AI Model Status</h4>
                    <ModelStatus data={modelStatus} />
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="font-medium">Performance Metrics</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Response Time</span>
                      <span className="text-sm font-medium">120ms</span>
                    </div>
                    <Progress value={85} className="h-2" />
                    <div className="flex justify-between">
                      <span className="text-sm">Accuracy</span>
                      <span className="text-sm font-medium">94.2%</span>
                    </div>
                    <Progress value={94} className="h-2" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium">Learning Progress</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Patterns Learned</span>
                      <span className="text-sm font-medium">127</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Confidence Score</span>
                      <span className="text-sm font-medium">87.3%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Last Update</span>
                      <span className="text-sm font-medium">2 min ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Smart Alert Center</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {alerts.map((alert) => (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      onClick={() => handleAlertClick(alert)}
                      expanded={selectedAlert?.id === alert.id}
                    />
                  ))}
                </CardContent>
              </Card>
            </div>

            {selectedAlert && (
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Alert Details</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium">Alert ID</h4>
                        <p className="text-sm text-gray-600">{selectedAlert.id}</p>
                      </div>
                      <div>
                        <h4 className="font-medium">Timestamp</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(selectedAlert.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium">Reasons</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {selectedAlert.reasons.map((reason, index) => (
                            <li key={index}>• {reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Explainability Tab */}
        <TabsContent value="explain" className="space-y-4">
          {explainData ? (
            <ExplainCard data={explainData} />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Select an alert or entity to view AI explainability</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Network Graph Tab */}
        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Network className="h-5 w-5" />
                <span>Fraud Network Graph</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {networkData ? (
                <NetworkGraph data={networkData} />
              ) : (
                <div className="text-center py-12">
                  <Network className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Loading network graph...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Policy Simulator Tab */}
        <TabsContent value="policy" className="space-y-4">
          <PolicySimulator
            currentThreshold={70}
            onSimulate={handlePolicySimulate}
            impact={policyImpact}
          />
        </TabsContent>

        {/* AI Model Tab */}
        <TabsContent value="model" className="space-y-4">
          {modelStatus ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ModelStatus data={modelStatus} detailed />
              <Card>
                <CardHeader>
                  <CardTitle>AI Learning Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Pattern Recognition</span>
                      <span className="text-sm font-medium">89%</span>
                    </div>
                    <Progress value={89} className="h-2" />

                    <div className="flex justify-between">
                      <span className="text-sm">Anomaly Detection</span>
                      <span className="text-sm font-medium">76%</span>
                    </div>
                    <Progress value={76} className="h-2" />

                    <div className="flex justify-between">
                      <span className="text-sm">Behavioral Analysis</span>
                      <span className="text-sm font-medium">92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>

                  <Alert>
                    <Brain className="h-4 w-4" />
                    <AlertDescription>
                      AI model is continuously learning from new patterns and adapting to emerging fraud techniques.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Loading AI model status...</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AIMonitoringDashboard;
