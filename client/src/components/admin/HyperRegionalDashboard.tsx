import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/api-client";
import {
  Activity,
  Users,
  TrendingUp,
  MapPin,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe
} from "lucide-react";

interface DistrictOverview {
  totalDistricts: number;
  totalUsers: number;
  totalVendors: number;
  averageMarketMaturity: number;
  districtStats: Array<{
    id: number;
    name: string;
    metrics: {
      userActivity: number;
      vendorCount: number;
      marketMaturity: number;
      digitalAdoption: number;
      topCategory: string;
    };
    health: {
      aiConfidence: number;
      userEngagement: string;
      marketGrowth: string;
    };
  }>;
}

export default function HyperRegionalDashboard() {
  const [overview, setOverview] = useState<DistrictOverview | null>(null);
  const [comparison, setComparison] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [overviewData, comparisonData, healthData] = await Promise.all([
        apiRequest("GET", "/admin/hyper/overview"),
        apiRequest("GET", "/admin/hyper/district-comparison"),
        apiRequest("GET", "/admin/hyper/health")
      ]);

      setOverview(overviewData.data);
      setComparison(comparisonData.data);
      setHealth(healthData.data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (districtId: number, action: string) => {
    try {
      await apiRequest("POST", `/admin/hyper/actions/${districtId}`, { action });
      loadDashboardData(); // Refresh data
    } catch (error) {
      console.error('Action execution failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading Sovereign Grid...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">🌍 Sovereign Multi-District Grid</h1>
          <p className="text-gray-600 mt-2">Master Control Center - Division Oversight</p>
        </div>
        <Button onClick={loadDashboardData}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Grid
        </Button>
      </div>

      {/* Key Metrics */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MapPin className="w-8 h-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Districts</p>
                  <p className="text-2xl font-bold">{overview.totalDistricts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="w-8 h-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Users</p>
                  <p className="text-2xl font-bold">{overview.totalUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="w-8 h-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Market Maturity</p>
                  <p className="text-2xl font-bold">{Math.round(overview.averageMarketMaturity * 100)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Activity className="w-8 h-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">System Health</p>
                  <p className="text-2xl font-bold">
                    {health?.overallHealth > 80 ? 'Excellent' :
                     health?.overallHealth > 60 ? 'Good' : 'Fair'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">District Overview</TabsTrigger>
          <TabsTrigger value="comparison">Performance Analysis</TabsTrigger>
          <TabsTrigger value="control">Control Panel</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overview?.districtStats.map((district) => (
              <Card key={district.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    {district.name}
                    <Badge variant={
                      district.health.userEngagement === 'high' ? 'default' :
                      district.health.userEngagement === 'medium' ? 'secondary' : 'destructive'
                    }>
                      {district.health.userEngagement}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Market Maturity</span>
                    <span>{Math.round(district.metrics.marketMaturity * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Digital Adoption</span>
                    <span>{Math.round(district.metrics.digitalAdoption * 100)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Top Category</span>
                    <Badge variant="outline">{district.metrics.topCategory}</Badge>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>AI Confidence</span>
                    <span>{Math.round(district.health.aiConfidence * 100)}%</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          {comparison && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <h3 className="font-semibold">Highest Engagement</h3>
                      <p className="text-2xl font-bold text-green-600">
                        {comparison.insights.highestEngagement.district}
                      </p>
                      <p className="text-sm text-gray-600">
                        {Math.round(comparison.insights.highestEngagement.metrics.userEngagement / 60)} min avg
                      </p>
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold">Most Mature Market</h3>
                      <p className="text-2xl font-bold text-blue-600">
                        {comparison.insights.mostMature.district}
                      </p>
                      <p className="text-sm text-gray-600">
                        {comparison.insights.mostMature.metrics.marketMaturity}% maturity
                      </p>
                    </div>
                    <div className="text-center">
                      <h3 className="font-semibold">Best Practices</h3>
                      <p className="text-sm">
                        {Object.keys(comparison.bestPractices).length} identified
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="control" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Control Panel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {overview?.districtStats.map((district) => (
                <div key={district.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-semibold">{district.name}</h4>
                    <p className="text-sm text-gray-600">
                      Health: {district.health.userEngagement} |
                      Maturity: {Math.round(district.metrics.marketMaturity * 100)}%
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => executeAction(district.id, 'update_config')}
                    >
                      Refresh Config
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => executeAction(district.id, 'trigger_learning')}
                    >
                      Update Learning
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
