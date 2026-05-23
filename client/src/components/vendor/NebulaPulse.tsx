import { apiRequest } from "@/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, AlertTriangle, Award, Target } from "lucide-react";

interface DSSLScore {
  score: number;
  level: 'sovereign_elite' | 'growing_trust' | 'under_review';
  color: string;
  message: string;
  insights: string[];
  badge: string;
  badgeColor: string;
  badgeIcon: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  isFallback: boolean;
  degraded: boolean;
  statusMessage: string;
  ttl: number;
  lastCalculated?: Date;
  signalsUsed?: number;
  breakdown: {
    trust: { score: number; max: number; label: string };
    performance: { score: number; max: number; label: string };
    safety: { score: number; max: number; label: string };
    activity: { score: number; max: number; label: string };
    responsiveness: { score: number; max: number; label: string };
  };
  metrics: {
    avgRating: number;
    orderCount: number;
    fraudAlerts: number;
    responseTime: number;
    completionRate: number;
  };
}

interface NebulaPulseProps {
  className?: string;
}

export default function NebulaPulse({ className = "" }: NebulaPulseProps) {
  const { data: dsslData, isLoading, error } = useQuery<DSSLScore>({
    queryKey: ["partner/dssl-score"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/partner/dssl-score");
      return res;
    },
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className={`glass-card-sovereign p-6 animate-pulse ${className}`}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gray-700 rounded-full"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-700 rounded w-48"></div>
            <div className="h-3 bg-gray-700 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dsslData) {
    return (
      <div className={`glass-card-sovereign p-6 border-red-500/30 ${className}`}>
        <div className="flex items-center gap-4">
          <AlertTriangle className="w-8 h-8 text-red-400" />
          <div>
            <h3 className="text-white font-bold">Score Unavailable</h3>
            <p className="text-gray-400 text-sm">Unable to load your DSSL score</p>
          </div>
        </div>
      </div>
    );
  }

  const { score, level, color, message, insights, breakdown, metrics, badge, badgeColor, badgeIcon, confidence, isFallback, degraded, statusMessage } = dsslData;

  // Get level icon and styling
  const getLevelIcon = () => {
    switch (level) {
      case 'sovereign_elite':
        return <Award className="w-6 h-6" style={{ color }} />;
      case 'growing_trust':
        return <TrendingUp className="w-6 h-6" style={{ color }} />;
      case 'under_review':
        return <AlertTriangle className="w-6 h-6" style={{ color }} />;
      default:
        return <Target className="w-6 h-6" style={{ color: '#6B7280' }} />;
    }
  };

  const getPulseClass = () => {
    switch (level) {
      case 'sovereign_elite':
        return 'shadow-emerald-500/20 border-emerald-500/30';
      case 'growing_trust':
        return 'shadow-amber-500/20 border-amber-500/30';
      case 'under_review':
        return 'shadow-red-500/20 border-red-500/30';
      default:
        return 'shadow-gray-500/20 border-gray-500/30';
    }
  };

  return (
    <div className={`glass-card-sovereign p-6 ${className}`}>
      <h3 className="text-white font-bold">Nebula Pulse</h3>
      <p className="text-gray-400">Score: {score}</p>
    </div>
  );
}