import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/api-client";
import {
  TrendingUp,
  DollarSign,
  Target,
  Calendar,
  Users,
  RefreshCw,
  Crown,
  Zap
} from "lucide-react";

interface RevenueMetrics {
  totalRevenue: number;
  todayRevenue: number;
  monthlyRevenue: number;
  pendingSettlements: number;
  topEarningMerchants: Array<{
    merchantId: number;
    name: string;
    revenue: number;
    transactions: number;
  }>;
  revenueByType: {
    subscriptions: number;
    advertisements: number;
    commissions: number;
  };
  dailyGoals: {
    target: number;
    achieved: number;
    percentage: number;
  };
}

export default function CashFlowStatus() {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    loadMetrics();
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMetrics, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadMetrics = async () => {
    try {
      const data = await apiRequest("GET", "/admin/revenue/metrics");
      setMetrics(data.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load revenue metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center space-x-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Loading Sovereign Vault...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p>Failed to load revenue data</p>
          <button onClick={loadMetrics} className="mt-4 text-blue-500 hover:underline">
            Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  const dailyGoalMet = metrics.dailyGoals.percentage >= 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-green-500" />
            Sovereign Revenue Dashboard
          </h2>
          <p className="text-gray-600 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <button
          onClick={loadMetrics}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-800">Total Revenue</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(metrics.totalRevenue)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Today's Revenue */}
        <Card className={`border-2 ${dailyGoalMet ? 'border-green-300 bg-green-50' : 'border-orange-300 bg-orange-50'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Today's Revenue</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(metrics.todayRevenue)}
                </p>
                <Badge variant={dailyGoalMet ? "default" : "secondary"} className="mt-1">
                  {dailyGoalMet ? "Goal Met! 🎉" : "In Progress"}
                </Badge>
              </div>
              <Target className={`w-8 h-8 ${dailyGoalMet ? 'text-green-600' : 'text-orange-600'}`} />
            </div>
          </CardContent>
        </Card>

        {/* Monthly Revenue */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">This Month</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(metrics.monthlyRevenue)}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        {/* Pending Settlements */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(metrics.pendingSettlements)}
                </p>
              </div>
              <RefreshCw className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Goal Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Daily Revenue Goal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">
                Target: {formatCurrency(metrics.dailyGoals.target)}
              </span>
              <span className={`text-sm font-bold ${dailyGoalMet ? 'text-green-600' : 'text-orange-600'}`}>
                {metrics.dailyGoals.percentage.toFixed(1)}% Complete
              </span>
            </div>
            <Progress
              value={Math.min(metrics.dailyGoals.percentage, 100)}
              className={`h-3 ${dailyGoalMet ? 'bg-green-200' : 'bg-orange-200'}`}
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>Achieved: {formatCurrency(metrics.dailyGoals.achieved)}</span>
              <span>Remaining: {formatCurrency(Math.max(0, metrics.dailyGoals.target - metrics.dailyGoals.achieved))}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-yellow-500" />
                  <span>Subscriptions</span>
                </div>
                <span className="font-bold">{formatCurrency(metrics.revenueByType.subscriptions)}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-blue-500" />
                  <span>Advertisements</span>
                </div>
                <span className="font-bold">{formatCurrency(metrics.revenueByType.advertisements)}</span>
              </div>

              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span>Commissions</span>
                </div>
                <span className="font-bold">{formatCurrency(metrics.revenueByType.commissions)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Earning Merchants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Top Revenue Generators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.topEarningMerchants.slice(0, 5).map((merchant, index) => (
                <div key={merchant.merchantId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{merchant.name}</p>
                      <p className="text-sm text-gray-600">{merchant.transactions} transactions</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">{formatCurrency(merchant.revenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Motivational Footer */}
      <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
        <CardContent className="p-6 text-center">
          <h3 className="text-lg font-bold text-orange-800 mb-2">
            🎯 Sovereign Wealth Building Mission
          </h3>
          <p className="text-orange-700">
            {dailyGoalMet
              ? "🎉 Daily goal achieved! Tomorrow's target: ₹5,000"
              : `Keep pushing! ₹${(metrics.dailyGoals.target - metrics.dailyGoals.achieved).toFixed(0)} more to hit today's goal!`
            }
          </p>
          <div className="mt-4 text-sm text-orange-600">
            Total Empire Value: {formatCurrency(metrics.totalRevenue)} 💰
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
