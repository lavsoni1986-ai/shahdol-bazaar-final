import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mic, Search, MapPin, Clock, Truck, Star } from "lucide-react";
import { SOVEREIGN_CONFIG } from "@/lib/SovereignConstants";
import { apiRequest } from "@/lib/api-client";

interface GlobalSearchResult {
  localResults: Array<{
    vendorId: number;
    relevanceScore: number;
    matchReasons: string[];
    distance: number;
    estimatedTime: string;
  }>;
  crossDistrictSuggestions: Array<{
    districtId: number;
    districtName: string;
    results: Array<{
      vendorId: number;
      relevanceScore: number;
      matchReasons: string[];
      distance: number;
      estimatedTime: string;
    }>;
    distance: number;
    transportCost: number;
    deliveryTime: string;
  }>;
  recommendations: {
    alternativeItems: string[];
    nearbyDistricts: Array<{
      id: number;
      name: string;
      similarity: number;
      topCategories: string[];
    }>;
  };
}

export default function SovereignGlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await apiRequest('POST', 'ai/global-search', {
        query,
        districtId: SOVEREIGN_CONFIG.DEFAULT_DISTRICT_ID,
        maxDistance: 150
      });

      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Global search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const startVoiceSearch = () => {
    // Voice search implementation would go here
    setIsListening(true);
    // For now, just toggle
    setTimeout(() => setIsListening(false), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">🔍 Sovereign Global Search</h1>
        <p className="text-gray-600">Find anything across districts - powered by AI</p>
      </div>

      {/* Search Interface */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search in Hindi/Bagheli: 'बिटिया के जन्मदिन के लिए पनीर और समोसे चाहिए'"
              className="flex-1"
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={startVoiceSearch} variant="outline">
              <Mic className={`w-4 h-4 ${isListening ? 'text-red-500 animate-pulse' : ''}`} />
            </Button>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
            </Button>
          </div>
          {isListening && (
            <p className="text-sm text-red-500 mt-2">🎤 Listening... Speak your search in Hindi</p>
          )}
        </CardContent>
      </Card>

      {/* Search Results */}
      {results && (
        <div className="space-y-6">
          {/* Local Results */}
          {results.localResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-green-500" />
                  Available in Shahdol ({results.localResults.length} results)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {results.localResults.map((result, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {Math.round(result.relevanceScore * 100)}% match
                          </Badge>
                          <span className="text-sm text-gray-600">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {result.estimatedTime}
                          </span>
                        </div>
                        <ul className="text-sm text-gray-600 mt-1">
                          {result.matchReasons.map((reason, i) => (
                            <li key={i}>• {reason}</li>
                          ))}
                        </ul>
                      </div>
                      <Button size="sm">View Details</Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cross-District Suggestions */}
          {results.crossDistrictSuggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-500" />
                  Available in Nearby Districts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {results.crossDistrictSuggestions.map((district) => (
                  <div key={district.districtId}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-semibold">{district.districtName}</h4>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {district.distance} km away
                          </span>
                          <span>
                            <Clock className="w-3 h-3 inline mr-1" />
                            {district.deliveryTime} delivery
                          </span>
                          <span>
                            <Truck className="w-3 h-3 inline mr-1" />
                            ₹{district.transportCost} shipping
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline">
                        {district.results.length} matches
                      </Badge>
                    </div>

                    <div className="space-y-2 ml-4">
                      {district.results.slice(0, 3).map((result, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm">
                              {Math.round(result.relevanceScore * 100)}% match
                            </span>
                          </div>
                          <Button size="sm" variant="outline">Order from {district.districtName}</Button>
                        </div>
                      ))}
                    </div>

                    {district !== results.crossDistrictSuggestions[results.crossDistrictSuggestions.length - 1] && (
                      <Separator className="my-4" />
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {results.recommendations && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Alternative Items */}
              {results.recommendations.alternativeItems.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">💡 Alternative Options</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {results.recommendations.alternativeItems.map((item, index) => (
                        <Badge key={index} variant="secondary" className="cursor-pointer hover:bg-blue-100">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Nearby Districts */}
              {results.recommendations.nearbyDistricts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">📍 Explore Nearby</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.recommendations.nearbyDistricts.map((district) => (
                        <div key={district.id} className="flex items-center justify-between">
                          <div>
                            <span className="font-medium">{district.name}</span>
                            <div className="text-sm text-gray-600">
                              {Math.round(district.similarity * 100)}% similar preferences
                            </div>
                          </div>
                          <div className="flex gap-1">
                            {district.topCategories.slice(0, 2).map((cat, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {cat}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* No Results */}
          {results.localResults.length === 0 && results.crossDistrictSuggestions.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-600">No Results Found</h3>
                <p className="text-gray-500">Try rephrasing your search or check nearby districts</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}