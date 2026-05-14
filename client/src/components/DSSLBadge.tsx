// DSSL Badge Component - Sovereign Trust Competition
// Displays vendor's DSSL score with beautiful visual badges
// Creates competition between vendors for higher trust scores

import { useEffect, useState } from "react";
import { getDSSLBadge, type DSSLBadge as DSSLBadgeType } from "@/lib/ai-brain";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Star, Shield, Award, TrendingUp, Sparkles } from "lucide-react";

interface DSSLBadgeProps {
  vendorId: number;
  vendorName?: string;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
  className?: string;
}

export function DSSLBadge({
  vendorId,
  vendorName,
  size = "md",
  showDetails = false,
  className = ""
}: DSSLBadgeProps) {
  const [badgeData, setBadgeData] = useState<DSSLBadgeType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBadge = async () => {
      try {
        const data = await getDSSLBadge(vendorId);
        setBadgeData(data);
      } catch (error) {
        console.error('Failed to load DSSL badge:', error);
      } finally {
        setLoading(false);
      }
    };

    loadBadge();
  }, [vendorId]);

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-6 bg-gray-200 rounded-full w-24"></div>
      </div>
    );
  }

  if (!badgeData) {
    return null;
  }

  const { badge, dsslScore } = badgeData;
  const scoreText = dsslScore.toFixed(1);

  const sizeClasses = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-3 py-1.5",
    lg: "text-base px-4 py-2"
  };

  const iconSizeClasses = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
    lg: "w-5 h-5"
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Badge
        className={`${badge.bgColor} ${badge.textColor} ${sizeClasses[size]} font-bold border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
        title={`${badge.description} - DSSL Score: ${scoreText}`}
      >
        <span className="mr-1">{badge.icon}</span>
        <span className="font-bold">{badge.level}</span>
        <span className="ml-1 opacity-90">{scoreText}</span>
      </Badge>

      {showDetails && (
        <Card className="absolute z-10 mt-2 ml-2 shadow-lg border-0">
          <CardContent className="p-3 bg-white">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-yellow-500" />
              <span className="font-semibold text-sm">{badge.label}</span>
            </div>
            <p className="text-xs text-gray-600 mb-2">{badge.description}</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-400" />
                <span>{badgeData.components.rating.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3 text-blue-400" />
                <span>{badgeData.components.reviews} reviews</span>
              </div>
              <div className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-green-400" />
                <span>{badgeData.components.orderCount} orders</span>
              </div>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <span>{badgeData.components.accountAge}d old</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// DSSL Trust Leaderboard Component
interface DSSLLeaderboardProps {
  districtId: number;
  limit?: number;
  className?: string;
}

export function DSSLLeaderboard({ districtId, limit = 10, className = "" }: DSSLLeaderboardProps) {
  // This would fetch top vendors by DSSL score from the district
  // Implementation would go here...

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-yellow-500" />
          <h3 className="font-semibold">DSSL Trust Leaders</h3>
        </div>
        <p className="text-sm text-gray-600">
          Sovereign Trust Competition - Coming Soon! 🏆
        </p>
      </CardContent>
    </Card>
  );
}

export default DSSLBadge;