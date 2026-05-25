// 📁 client/src/pages/admin/Dashboard.tsx

// GlassCard component removed - using div with glass styling instead
const GlassCard = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`backdrop-blur-xl bg-black/30 border border-white/10 shadow-xl ${className}`}>{children}</div>
);
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Shield, Map, Zap, DollarSign, Lock } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "@/lib/api-client";

// Mock data for revenue chart
const revenueData = [
  { name: "Jan", amount: 85000 },
  { name: "Feb", amount: 92000 },
  { name: "Mar", amount: 101000 },
  { name: "Apr", amount: 118000 },
  { name: "May", amount: 124500 },
];

export default function SovereignDashboard() {
  const [selectedDistrict, setSelectedDistrict] = useState("shahdol");
  const queryClient = useQueryClient();

  // 🚀 LIVE POLLING: Fetch district data every 30 seconds
  const { data: districtData, isLoading } = useQuery({
    queryKey: ["districts", selectedDistrict],
    queryFn: async () => {
      const result = await apiRequest("GET", "admin/districts");
      if (!result.success) throw new Error(result.error || "Failed to fetch districts");
      return result.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // 🔒 LOCK DISTRICT MUTATION
  const lockMutation = useMutation({
    mutationFn: async (districtId: number) => {
      const result = await apiRequest("PATCH", `admin/districts/${districtId}`, {
        body: { isActive: false },
      });
      if (!result.success) throw new Error(result.error || "Failed to lock district");
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["districts"] });
    },
  });

  const currentDistrict = districtData?.find((d: any) => d.slug === selectedDistrict);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-nebula-gradient flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin" />
          <p className="text-xs font-black uppercase text-orange-500 tracking-[0.2em] animate-pulse">Loading Command Center</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-nebula-gradient min-h-screen text-white">
      {/* 🚀 HEADER: COMMAND CENTER */}
      <header className="flex justify-between items-center">
        <h1 className="text-4xl font-bold tracking-tighter">
          BHARAT-OS <span className="text-orange-500 underline">COMMAND CENTER</span>
        </h1>
        <div className="flex gap-4 items-center">
          <span className="px-4 py-2 rounded-full border border-green-500/50 bg-green-500/10 text-green-400 text-sm animate-pulse">
            ● SOVEREIGN SHIELD ACTIVE
          </span>

          {/* 🗺️ DISTRICT SELECTOR */}
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="px-4 py-2 rounded-lg bg-black/50 border border-gray-600 text-white"
          >
            <option value="shahdol">Shahdol</option>
            <option value="rewa">Rewa</option>
          </select>
        </div>
      </header>

      {/* 📊 TOP METRICS: THE POWER GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <GlassCard className="p-6 border-l-4 border-green-500 relative">
          <DollarSign className="text-green-500 mb-2" />
          <p className="text-gray-400 text-sm">Revenue</p>
          <h2 className="text-2xl font-bold">₹ {currentDistrict?._count?.orders * 125 || 124500}</h2>

          {/* 🔒 ACTION BUTTON */}
          {currentDistrict && (
            <button
              onClick={() => lockMutation.mutate(currentDistrict.id)}
              className="absolute top-4 right-4 p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors"
              disabled={lockMutation.isPending}
            >
              <Lock className="w-4 h-4 text-red-400" />
            </button>
          )}
        </GlassCard>

        <GlassCard className="p-6 border-l-4 border-blue-500">
          <Map className="text-blue-500 mb-2" />
          <p className="text-gray-400 text-sm">Active Districts</p>
          <h2 className="text-2xl font-bold">{districtData?.length || 1}</h2>
        </GlassCard>

        <GlassCard className="p-6 border-l-4 border-orange-500">
          <Zap className="text-orange-500 mb-2" />
          <p className="text-gray-400 text-sm">AI Search Match</p>
          <h2 className="text-2xl font-bold">94.8%</h2>
        </GlassCard>

        <GlassCard className="p-6 border-l-4 border-red-500">
          <Shield className="text-red-500 mb-2" />
          <p className="text-gray-400 text-sm">Threats Blocked</p>
          <h2 className="text-2xl font-bold">42</h2>
        </GlassCard>
      </div>

      {/* 📈 LIVE REVENUE GRAPH */}
      <GlassCard className="p-8 h-[400px]">
        <h3 className="text-xl font-semibold mb-6">Sovereign Revenue Trend ({selectedDistrict})</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={revenueData}>
            <XAxis dataKey="name" stroke="#888888" />
            <YAxis stroke="#888888" />
            <Tooltip contentStyle={{ backgroundColor: "#1a1a1a", border: "none" }} />
            <Line type="monotone" dataKey="amount" stroke="#00E676" strokeWidth={3} dot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* 🧠 USER INTELLIGENCE PANEL */}
      <GlassCard className="p-8">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Shield className="text-red-500" />
          User Intelligence Panel
        </h3>

        {/* User Intelligence Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Trust Score</th>
                <th className="text-left p-3">Risk Score</th>
                <th className="text-left p-3">Orders</th>
                <th className="text-left p-3">Reviews</th>
                <th className="text-left p-3">Status</th>
                <th className="text-left p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Mock data for now - replace with real data */}
              <tr className="border-b border-gray-800">
                <td className="p-3">user123</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                    85
                  </span>
                </td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                    15
                  </span>
                </td>
                <td className="p-3">12</td>
                <td className="p-3">8</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                    NORMAL
                  </span>
                </td>
                <td className="p-3">
                  <button className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500/40 rounded text-xs transition-colors">
                    View
                  </button>
                </td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="p-3">frauduser</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                    22
                  </span>
                </td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
                    70
                  </span>
                </td>
                <td className="p-3">3</td>
                <td className="p-3">25</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 text-xs">
                    QUARANTINE
                  </span>
                </td>
                <td className="p-3 space-x-2">
                  <button className="px-3 py-1 bg-yellow-500/20 hover:bg-yellow-500/40 rounded text-xs transition-colors">
                    Restrict
                  </button>
                  <button className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 rounded text-xs transition-colors">
                    Block
                  </button>
                </td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="p-3">newuser</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                    25
                  </span>
                </td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
                    10
                  </span>
                </td>
                <td className="p-3">1</td>
                <td className="p-3">0</td>
                <td className="p-3">
                  <span className="px-2 py-1 rounded-full bg-blue-500/20 text-blue-400 text-xs">
                    PROBATION
                  </span>
                </td>
                <td className="p-3 space-x-2">
                  <button className="px-3 py-1 bg-green-500/20 hover:bg-green-500/40 rounded text-xs transition-colors">
                    Monitor
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* 🛡️ SYSTEM HEALTH MONITOR */}
      <GlassCard className="p-8">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Shield className="text-red-500" />
          System Health Monitor
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-black/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Lockdown Mode</span>
            </div>
            <p className="text-xs text-gray-400">Inactive - Normal operations</p>
          </div>
          <div className="p-4 bg-black/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">Priority Alerts</span>
            </div>
            <p className="text-xs text-gray-400">3 critical, 7 high priority</p>
          </div>
          <div className="p-4 bg-black/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Auto-Tuning</span>
            </div>
            <p className="text-xs text-gray-400">Active - Learning from feedback</p>
          </div>
        </div>
      </GlassCard>

      {/* 🌐 NETWORK VIEW (PLACEHOLDER) */}
      <GlassCard className="p-8">
        <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Map className="text-purple-500" />
          Fraud Network Visualization
        </h3>
        <div className="h-64 flex items-center justify-center border-2 border-dashed border-gray-600 rounded-lg">
          <p className="text-gray-400 text-sm">Network graph visualization coming soon...</p>
        </div>
      </GlassCard>
    </div>
  );
}