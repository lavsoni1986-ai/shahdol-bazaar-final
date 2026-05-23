// 🛡️ BHARAT-OS: DEPRECATED
// ⚠️  DEPRECATED — migrate to PartnerDashboard
// STATUS: Legacy vendor dashboard. Keep for reference only.
// REPLACEMENT: PartnerDashboard (partner-dashboard.tsx)
// All future routes MUST point to PartnerDashboard only.
// Routes still pointing here: NONE (redirected to /partner in App.tsx)

import { apiRequest } from "@/lib/api-client";
import { useAuth } from "../contexts/AuthContext";
import { useDistrict } from "@/contexts/DistrictContext";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, Package, Users, TrendingUp } from "lucide-react";
import NebulaPulse from "../components/vendor/NebulaPulse";

export default function VendorDashboard() {
  const { user } = useAuth();
  const { currentDistrict } = useDistrict();
  const districtId = currentDistrict?.id;

  // Fetch vendor stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["vendor/stats", districtId],
    queryFn: async () => {
      return await apiRequest("GET", "/vendor/stats");
    },
    enabled: !!user?.id
  });

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">Vendor Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage your BharatOS presence</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="text-emerald-400 font-semibold text-sm">ACTIVE</div>
            </div>
          </div>
        </div>

        {/* Nebula Pulse - Main DSSL Score */}
        <NebulaPulse className="max-w-2xl" />

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Products */}
          <div className="glass-card-sovereign p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Active Products</p>
                <p className="text-2xl font-black text-white">
                  {statsLoading ? "..." : stats?.totalProducts || 0}
                </p>
              </div>
              <Package className="w-8 h-8 text-blue-400" />
            </div>
          </div>

          {/* Orders */}
          <div className="glass-card-sovereign p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Orders</p>
                <p className="text-2xl font-black text-white">
                  {statsLoading ? "..." : stats?.totalOrders || 0}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-emerald-400" />
            </div>
          </div>

          {/* Revenue */}
          <div className="glass-card-sovereign p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">Total Revenue</p>
                <p className="text-2xl font-black text-white">
                  {statsLoading ? "..." : `₹${(stats?.totalRevenue || 0).toLocaleString()}`}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </div>

          {/* DSSL Score */}
          <div className="glass-card-sovereign p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm font-medium">DSSL Score</p>
                <p className="text-2xl font-black text-white">
                  {statsLoading ? "..." : Math.round((stats?.dsslScore || 0) * 100) / 100}
                </p>
              </div>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${(stats?.dsslScore || 0) >= 0.8 ? 'bg-emerald-500/20 text-emerald-400' :
                  (stats?.dsslScore || 0) >= 0.6 ? 'bg-blue-500/20 text-blue-400' :
                    (stats?.dsslScore || 0) >= 0.4 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                }`}>
                <span className="text-lg">🛡️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Items */}
        <div className="glass-card-sovereign p-6">
          <h2 className="text-xl font-black text-white mb-4">Action Items</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              <span className="text-white">Respond to 3 pending customer reviews</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-white">Update pricing for seasonal products</span>
            </div>
            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-white">Complete 2 pending orders within 24 hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}