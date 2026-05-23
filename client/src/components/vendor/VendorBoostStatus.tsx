import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, TrendingUp, Crown, Zap } from "lucide-react";

interface VendorStats {
  views: number;
  searches: number;
  clicks: number;
  isSponsored: boolean;
  boostExpiry?: string;
  trustScore: number;
}

export default function VendorBoostStatus({ vendorId }: { vendorId: number }) {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["vendor-stats", vendorId],
    queryFn: async (): Promise<VendorStats> => {
      return await apiRequest("GET", `/vendor/${vendorId}/stats`);
    },
    enabled: !!vendorId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const isBoostActive = stats.isSponsored && stats.boostExpiry &&
    new Date(stats.boostExpiry) > new Date();

  return (
    <div className="space-y-4">
      {/* Boost Status */}
      <Card className={isBoostActive ? "border-yellow-200 bg-yellow-50" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5" />
            Boost Status
            {isBoostActive && (
              <Badge className="bg-yellow-500 text-black">
                ACTIVE
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isBoostActive ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-green-600">
                <Zap className="w-4 h-4" />
                <span className="font-medium">Your shop is boosted and visible at the top!</span>
              </div>
              <p className="text-sm text-gray-600">
                Expires: {new Date(stats.boostExpiry!).toLocaleDateString()}
              </p>
            </div>
          ) : (
            <div className="text-center py-4">
              <Crown className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-600 mb-3">Get more visibility with boost</p>
              <Button className="bg-yellow-500 hover:bg-yellow-600 text-black">
                Boost for ₹299
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.views}</p>
                <p className="text-sm text-gray-600">Profile Views</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.searches}</p>
                <p className="text-sm text-gray-600">Search Appearances</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.clicks}</p>
                <p className="text-sm text-gray-600">Clicks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trust Score */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Trust Score</p>
              <p className="text-sm text-gray-600">Based on customer feedback and business metrics</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{stats.trustScore}</p>
              <p className="text-sm text-gray-600">
                {stats.trustScore >= 80 ? "Excellent" :
                 stats.trustScore >= 60 ? "Good" :
                 stats.trustScore >= 40 ? "Average" : "Low"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}