// 📁 client/src/pages/admin/DSSLControl.tsx

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SovereignGlassCard } from "@/components/SovereignLayout";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Zap, TrendingUp, Users, Star, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/api-client";

interface WeightConfig {
  rating: number;
  orders: number;
  reviews: number;
  age: number;
  products: number;
}

interface VendorRanking {
  id: number;
  name: string;
  currentRank: number;
  newRank: number;
  dsslScore: number;
  change: number;
}

export default function DSSLControl() {
  const [selectedDistrict, setSelectedDistrict] = useState(1); // Shahdol default
  const [weights, setWeights] = useState<WeightConfig>({
    rating: 0.25,
    orders: 0.25,
    reviews: 0.25,
    age: 0.15,
    products: 0.10
  });
  const [simulatedRankings, setSimulatedRankings] = useState<VendorRanking[]>([]);
  const queryClient = useQueryClient();

  // Fetch current district config
  const { data: districtConfig } = useQuery({
    queryKey: ["district-config", selectedDistrict],
    queryFn: async () => {
      const response = await apiRequest('GET', `/admin/districts/${selectedDistrict}`);
      return response?.data;
    }
  });

  // Fetch top vendors for simulation
  const { data: topVendors } = useQuery({
    queryKey: ["top-vendors", selectedDistrict],
    queryFn: async () => {
      const response = await apiRequest('GET', `vendors?districtId=${selectedDistrict}&limit=10`);
      return response?.data || [];
    }
  });

  // Update weights mutation
  const updateWeightsMutation = useMutation({
    mutationFn: async (newWeights: WeightConfig) => {
      const response = await apiRequest('PATCH', `/admin/dssl/weights/${selectedDistrict}`, { weights: newWeights });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["district-config"] });
    }
  });

  // Recalculate mutation
  const recalculateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/admin/dssl/recalculate/${selectedDistrict}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["top-vendors"] });
    }
  });

  // Load existing weights
  useEffect(() => {
    if (districtConfig?.config?.dsslWeights) {
      setWeights(districtConfig.config.dsslWeights);
    }
  }, [districtConfig]);

  // Simulate rankings based on weight changes
  useEffect(() => {
    if (topVendors && topVendors.length > 0) {
      const simulated = topVendors.map((vendor: any, index: number) => {
        // Simple simulation: adjust score based on weights
        const simulatedScore = (
          (vendor.rating || 0) * weights.rating +
          (vendor._count?.orders || 0) * weights.orders * 0.01 +
          (vendor.totalReviews || 0) * weights.reviews * 0.1 +
          (vendor.createdAt ? (new Date().getTime() - new Date(vendor.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30) : 0) * weights.age * 0.01 +
          (vendor._count?.products || 0) * weights.products
        );

        // Calculate new rank (simplified)
        const currentScore = vendor.dsslScore || simulatedScore;
        const change = simulatedScore - currentScore;

        return {
          id: vendor.id,
          name: vendor.name,
          currentRank: index + 1,
          newRank: index + 1, // Would need proper sorting logic
          dsslScore: simulatedScore,
          change
        };
      });

      setSimulatedRankings(simulated);
    }
  }, [weights, topVendors]);

  const handleWeightChange = (key: keyof WeightConfig, value: number[]) => {
    const newWeights = { ...weights, [key]: value[0] };
    // Normalize to ensure they sum to 1
    const total = Object.values(newWeights).reduce((sum, w) => sum + w, 0);
    const normalizedWeights = Object.fromEntries(
      Object.entries(newWeights).map(([k, v]) => [k, v / total])
    ) as unknown as WeightConfig;

    setWeights(normalizedWeights);
  };

  const handleSaveWeights = () => {
    updateWeightsMutation.mutate(weights);
  };

  const handleRecalculate = () => {
    recalculateMutation.mutate();
  };

  const weightControls = [
    { key: 'rating' as keyof WeightConfig, label: 'Customer Rating', icon: Star, color: 'text-yellow-500' },
    { key: 'orders' as keyof WeightConfig, label: 'Order Volume', icon: TrendingUp, color: 'text-green-500' },
    { key: 'reviews' as keyof WeightConfig, label: 'Review Count', icon: Users, color: 'text-blue-500' },
    { key: 'age' as keyof WeightConfig, label: 'Account Age', icon: Zap, color: 'text-purple-500' },
    { key: 'products' as keyof WeightConfig, label: 'Product Count', icon: RefreshCw, color: 'text-orange-500' }
  ];

  return (
    <div className="p-8 space-y-8 bg-nebula-gradient min-h-screen text-white">
      {/* Header */}
      <header className="flex justify-between items-center">
        <h1 className="text-4xl font-bold tracking-tighter">
          DSSL <span className="text-orange-500 underline">MIXING CONSOLE</span>
        </h1>
        <div className="flex gap-4 items-center">
          <span className="px-4 py-2 rounded-full border border-orange-500/50 bg-orange-500/10 text-orange-400 text-sm animate-pulse">
            ⚡ AI CONTROL ACTIVE
          </span>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(Number(e.target.value))}
            className="px-4 py-2 rounded-lg bg-black/50 border border-gray-600 text-white"
          >
            <option value={1}>Shahdol</option>
            <option value={3}>Rewa</option>
          </select>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weight Controls */}
        <SovereignGlassCard className="space-y-6">
          <h3 className="text-xl font-semibold text-orange-400 mb-4">🎚️ AI Weight Sliders</h3>

          {weightControls.map(({ key, label, icon: Icon, color }) => (
            <div key={key} className="space-y-2">
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${color}`} />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-orange-400 font-mono ml-auto">
                  {(weights[key] * 100).toFixed(1)}%
                </span>
              </div>
              <Slider
                value={[weights[key]]}
                onValueChange={(value) => handleWeightChange(key, value)}
                max={1}
                min={0}
                step={0.01}
                className="neon-slider"
              />
            </div>
          ))}

          <Button
            onClick={handleSaveWeights}
            disabled={updateWeightsMutation.isPending}
            className="w-full bg-orange-500 hover:bg-orange-600 text-black font-bold py-3"
          >
            {updateWeightsMutation.isPending ? "Saving..." : "💾 Save Weights"}
          </Button>
        </SovereignGlassCard>

        {/* Live Simulation */}
        <SovereignGlassCard className="space-y-6">
          <h3 className="text-xl font-semibold text-green-400 mb-4">📊 Live Ranking Simulation</h3>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {simulatedRankings.map((vendor) => (
              <div key={vendor.id} className="flex items-center justify-between p-3 rounded-lg bg-black/20 border border-gray-700">
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-mono px-2 py-1 rounded ${
                    vendor.change > 0 ? 'bg-green-500/20 text-green-400' :
                    vendor.change < 0 ? 'bg-red-500/20 text-red-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    #{vendor.currentRank}
                  </span>
                  <span className="font-medium">{vendor.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">
                    Score: {vendor.dsslScore.toFixed(2)}
                  </div>
                  {vendor.change !== 0 && (
                    <div className={`text-xs ${
                      vendor.change > 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {vendor.change > 0 ? '↗' : '↘'} {Math.abs(vendor.change).toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SovereignGlassCard>
      </div>

      {/* Recalculate Button */}
      <SovereignGlassCard className="text-center py-8">
        <h3 className="text-2xl font-bold text-orange-400 mb-4">🔄 RECALCULATE DISTRICT SCORES</h3>
        <p className="text-gray-400 mb-6">
          Trigger AI recalculation for all vendors in this district. This will update rankings based on new weights.
        </p>
        <Button
          onClick={handleRecalculate}
          disabled={recalculateMutation.isPending}
          size="lg"
          className="bg-orange-500 hover:bg-orange-600 text-black font-bold px-12 py-4 text-lg"
        >
          {recalculateMutation.isPending ? (
            <>
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
              Recalculating...
            </>
          ) : (
            <>
              <Zap className="w-5 h-5 mr-2" />
              🚀 TRIGGER AI RECALCULATION
            </>
          )}
        </Button>
      </SovereignGlassCard>

      {/* Preset Modes */}
      <SovereignGlassCard className="space-y-4">
        <h3 className="text-xl font-semibold text-blue-400">🎯 Quick Presets</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button
            variant="outline"
            onClick={() => setWeights({ rating: 0.25, orders: 0.25, reviews: 0.25, age: 0.15, products: 0.10 })}
            className="p-4 h-auto text-left"
          >
            <div>
              <div className="font-semibold">Normal</div>
              <div className="text-sm text-gray-400">Balanced ranking</div>
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => setWeights({ rating: 0.10, orders: 0.60, reviews: 0.10, age: 0.10, products: 0.10 })}
            className="p-4 h-auto text-left"
          >
            <div>
              <div className="font-semibold">Aggressive Sales</div>
              <div className="text-sm text-gray-400">Boost sellers</div>
            </div>
          </Button>
          <Button
            variant="outline"
            onClick={() => setWeights({ rating: 0.10, orders: 0.10, reviews: 0.60, age: 0.10, products: 0.10 })}
            className="p-4 h-auto text-left"
          >
            <div>
              <div className="font-semibold">New Discovery</div>
              <div className="text-sm text-gray-400">Trending vendors up</div>
            </div>
          </Button>
        </div>
      </SovereignGlassCard>
    </div>
  );
}