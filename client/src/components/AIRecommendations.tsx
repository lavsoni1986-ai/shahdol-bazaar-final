// 🏛️ BHARAT-OS: AI RECOMMENDATIONS — CANONICAL ENTITY CONSUMER
// ================================================================
// Consumes CanonicalEntity[] from ai-brain (AI district intelligence).
// Renders custom recommendation cards using raw payload for vendor/order data.
// ================================================================

import { useEffect, useState } from "react";
import { getPersonalizedRecommendations, getTrendingProducts } from "@/lib/ai-brain";
import type { CanonicalEntity } from "@/shared/api/response-normalizers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { Star, TrendingUp, Sparkles, ShoppingBag } from "lucide-react";

interface AIRecommendationsProps {
  className?: string;
}

export function AIRecommendations({ className = "" }: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<CanonicalEntity[]>([]);
  const [trending, setTrending] = useState<CanonicalEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAIData = async () => {
      try {
        const [recData, trendData] = await Promise.all([
          getPersonalizedRecommendations(),
          getTrendingProducts()
        ]);

        setRecommendations(recData);
        setTrending(trendData);
      } catch (error) {
        console.error('Failed to load AI data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAIData();
  }, []);

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-48 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 ${className}`}>
      {/* Personalized Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              AI Recommendations for You
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.slice(0, 6).map((item) => {
                const raw = item.raw ?? {};
                const vendorName = raw.vendor?.name ?? item.subtitle ?? "Unknown";
                const vendorRating = raw.vendor?.rating ?? null;
                const dssl = item.dsslScore ?? raw.dsslScore ?? 0;
                return (
                  <Link
                    key={item.id}
                    href={item.route}
                    className="block p-4 border border-white/10 rounded-xl hover:border-orange-500/40 hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sm text-white line-clamp-2">{item.title}</h3>
                      <Badge variant="secondary" className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">
                        AI {dssl.toFixed(1)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-gray-400">
                        {vendorRating?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{vendorName}</p>
                    {item.price != null && (
                      <p className="text-sm font-bold text-emerald-400 mt-1">₹{item.price}</p>
                    )}
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trending Products */}
      {trending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              Trending This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {trending.slice(0, 8).map((item) => {
                const raw = item.raw ?? {};
                const vendorName = raw.vendor?.name ?? item.subtitle ?? "Unknown";
                const vendorRating = raw.vendor?.rating ?? null;
                const dssl = item.dsslScore ?? raw.dsslScore ?? 0;
                const orderCount = raw.orderCount ?? 0;
                return (
                  <Link
                    key={item.id}
                    href={item.route}
                    className="block p-4 border border-white/10 rounded-xl hover:border-orange-500/40 hover:bg-white/5 transition-all cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-sm text-white line-clamp-2">{item.title}</h3>
                      <div className="flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3 text-emerald-500" />
                        <span className="text-xs text-emerald-500">{orderCount}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-xs text-gray-400">
                        {vendorRating?.toFixed(1) || 'N/A'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">{vendorName}</p>
                    <Badge variant="outline" className="text-xs mt-2 border-orange-500/30 text-orange-400">
                      DSSL: {dssl.toFixed(1)}
                    </Badge>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AIRecommendations;
