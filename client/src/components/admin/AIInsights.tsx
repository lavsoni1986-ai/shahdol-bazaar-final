import React, { useState, useEffect } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement } from 'chart.js';
import { apiRequest } from '@/lib/api-client';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, PointElement, LineElement, ArcElement);

interface AIStats {
  vendorStats: Array<{
    id: number;
    name: string;
    currentScore: number;
    predictedScore: number;
    reliability: number;
    growthRate: number;
  }>;
  insightsStats: {
    total: number;
    avgAccuracy: number;
    topPerformers: Array<any>;
  };
  patterns: {
    searchTrends: number;
    clickTrends: number;
    orderTrends: number;
    userActivity: Record<string, number>;
    timePatterns: Record<number, number>;
  };
  marketPredictions: {
    topCategories: Array<[string, number]>;
    predictedGrowth: number;
    seasonalTrends: string;
  };
}

export default function AIInsights() {
  const [stats, setStats] = useState<AIStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiRequest("GET", "/admin/ai-stats")
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6">Loading AI Insights...</div>;
  if (!stats) return <div className="p-6">Failed to load insights</div>;

  const vendorChartData = {
    labels: stats.vendorStats.map(v => v.name),
    datasets: [
      {
        label: 'Current Score',
        data: stats.vendorStats.map(v => v.currentScore),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
      },
      {
        label: 'Predicted Score',
        data: stats.vendorStats.map(v => v.predictedScore),
        backgroundColor: 'rgba(153, 102, 255, 0.6)',
      },
    ],
  };

  const timeChartData = {
    labels: Object.keys(stats.patterns.timePatterns).map(h => `${h}:00`),
    datasets: [{
      label: 'Activity',
      data: Object.values(stats.patterns.timePatterns),
      borderColor: 'rgb(255, 99, 132)',
      backgroundColor: 'rgba(255, 99, 132, 0.5)',
    }],
  };

  const categoryChartData = {
    labels: stats.marketPredictions.topCategories.map(([cat]) => cat),
    datasets: [{
      data: stats.marketPredictions.topCategories.map(([, count]) => count),
      backgroundColor: [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 205, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)',
      ],
    }],
  };

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-3xl font-bold">🤖 AI Insights Dashboard</h1>

      {/* Vendor Performance */}
      <div className="bg-white/5 p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4">Vendor Performance & Predictions</h2>
        <Bar data={vendorChartData} />
      </div>

      {/* Activity Patterns */}
      <div className="bg-white/5 p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4">Daily Activity Patterns</h2>
        <Line data={timeChartData} />
      </div>

      {/* Market Trends */}
      <div className="bg-white/5 p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4">Market Category Trends</h2>
        <div className="flex">
          <div className="w-1/2">
            <Pie data={categoryChartData} />
          </div>
          <div className="w-1/2 p-4">
            <h3 className="text-lg font-semibold">Predictions</h3>
            <p>Growth Factor: {(stats.marketPredictions.predictedGrowth * 100).toFixed(1)}%</p>
            <p>Seasonal Trend: {stats.marketPredictions.seasonalTrends}</p>
          </div>
        </div>
      </div>

      {/* AI Accuracy */}
      <div className="bg-white/5 p-6 rounded-2xl">
        <h2 className="text-xl font-bold mb-4">AI Model Performance</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{stats.insightsStats.total}</div>
            <div className="text-sm">Total Insights</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">{(stats.insightsStats.avgAccuracy * 100).toFixed(1)}%</div>
            <div className="text-sm">Avg Accuracy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-500">{stats.patterns.searchTrends}</div>
            <div className="text-sm">Search Events</div>
          </div>
        </div>
      </div>
    </div>
  );
}