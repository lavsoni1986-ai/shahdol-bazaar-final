import { apiRequest } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface HistoryEntry {
  score: number;
  date: string;
  trigger: string;
  breakdown: any;
}

interface DSSLHistoryChartProps {
  className?: string;
}

export default function DSSLHistoryChart({ className = "" }: DSSLHistoryChartProps) {
  // TODO: Replace with actual pro status check
  const isProUser = false; // Temporary - should come from auth context

  if (!isProUser) {
    return (
      <div className={`glass-card-sovereign p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-yellow-400" />
          </div>
          <h3 className="text-white font-semibold mb-2">Pro Feature</h3>
          <p className="text-white/70 text-sm mb-4">
            Unlock detailed DSSL analytics with our Pro plan
          </p>
          <button className="bg-yellow-500 text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-400 transition-colors">
            Upgrade to Pro
          </button>
        </div>
      </div>
    );
  }

  const { data: historyData, isLoading } = useQuery({
    queryKey: ["partner/dssl/history"],
    queryFn: async () => {
      return await apiRequest("GET", "/partner/dssl/history?days=7");
    },
  });

  if (isLoading || !historyData?.history) {
    return (
      <div className={`glass-card-sovereign p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  const { history } = historyData;

  if (history.length < 2) {
    return (
      <div className={`glass-card-sovereign p-6 ${className}`}>
        <h3 className="text-lg font-bold text-white mb-2">Score History</h3>
        <p className="text-gray-400 text-sm">Need at least 7 days of data for trend analysis</p>
      </div>
    );
  }

  // Calculate trend
  const firstScore = history[0].score;
  const lastScore = history[history.length - 1].score;
  const trend = lastScore - firstScore;
  const trendPercent = firstScore > 0 ? ((trend / firstScore) * 100).toFixed(1) : "0";

  const getTrendIcon = () => {
    if (trend > 5) return <TrendingUp className="w-4 h-4 text-green-400" />;
    if (trend < -5) return <TrendingDown className="w-4 h-4 text-red-400" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getTrendColor = () => {
    if (trend > 5) return "text-green-400";
    if (trend < -5) return "text-red-400";
    return "text-gray-400";
  };

  // Create chart points (simple line chart)
  const maxScore = Math.max(...history.map((h: HistoryEntry) => h.score));
  const minScore = Math.min(...history.map((h: HistoryEntry) => h.score));
  const range = maxScore - minScore || 1;

  const chartPoints = history.map((entry: HistoryEntry, index: number) => {
    const x = (index / (history.length - 1)) * 100;
    const y = 100 - ((entry.score - minScore) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className={`glass-card-sovereign p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Score History</h3>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 ${getTrendColor()}`}>
          {getTrendIcon()}
          <span className="text-sm font-medium">
            {trend > 0 ? '+' : ''}{trend} ({trendPercent}%)
          </span>
        </div>
      </div>

      {/* Simple SVG Chart */}
      <div className="relative h-32 mb-4">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Grid lines */}
          <line x1="0" y1="25" x2="100" y2="25" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          <line x1="0" y1="50" x2="100" y2="50" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          <line x1="0" y1="75" x2="100" y2="75" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />

          {/* Score line */}
          <polyline
            points={chartPoints}
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth="2"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" />
              <stop offset="50%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#EF4444" />
            </linearGradient>
          </defs>
        </svg>

        {/* Score labels */}
        <div className="absolute bottom-0 left-0 text-xs text-gray-400">
          {history[0]?.date}
        </div>
        <div className="absolute bottom-0 right-0 text-xs text-gray-400">
          {history[history.length - 1]?.date}
        </div>
      </div>

      {/* Recent triggers */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-300">Recent Activity</h4>
        {history.slice(-3).reverse().map((entry: HistoryEntry, index: number) => (
          <div key={index} className="flex items-center justify-between text-xs">
            <span className="text-gray-400 capitalize">
              {entry.trigger?.replace('_', ' ') || 'Periodic update'}
            </span>
            <span className="text-white font-medium">{entry.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}