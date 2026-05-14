// AI-Powered Recommendations Section
// Displays personalized recommendations and trending products using AI District Brain

import { useEffect, useState } from "react";
import { getPersonalizedRecommendations, getTrendingProducts, type AIRecommendation, type TrendingItem } from "@/lib/ai-brain";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, Sparkles, ShoppingBag } from "lucide-react";

interface AIRecommendationsProps {
  className?: string;
}

export function AIRecommendations({ className = "" }: AIRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [trending, setTrending] = useState<TrendingItem[]>([]);
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
              {recommendations.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => window.location.href = `/product/${item.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm line-clamp-2">{item.title}</h3>
                    <Badge variant="secondary" className="text-xs">
                      AI {item.dsslScore.toFixed(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-600">
                      {item.vendor.rating?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{item.vendor.name}</p>
                  {item.price && (
                    <p className="text-sm font-bold text-green-600 mt-1">₹{item.price}</p>
                  )}
                </div>
              ))}
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
              {trending.slice(0, 8).map((item) => (
                <div
                  key={item.id}
                  className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => window.location.href = `/product/${item.id}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-sm line-clamp-2">{item.title}</h3>
                    <div className="flex items-center gap-1">
                      <ShoppingBag className="w-3 h-3 text-green-500" />
                      <span className="text-xs text-green-600">{item.orderCount}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mb-2">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-gray-600">
                      {item.vendor.rating?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{item.vendor.name}</p>
                  <Badge variant="outline" className="text-xs mt-2">
                    DSSL: {item.dsslScore.toFixed(1)}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AIRecommendations;