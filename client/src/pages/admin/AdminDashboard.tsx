// 📁 client/src/pages/admin/AdminDashboard.tsx

import AdminLayout from "./AdminLayout";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Shield, Zap, Users, Store, AlertTriangle, Activity, TrendingUp, DollarSign, Award, Package } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { useDistrict } from "@/contexts/DistrictContext";
import { safeData } from "@/lib/admin-response";
import { useLocation } from "wouter";

/**
 * 🛡️ SOVEREIGN UI: GlassCard Component
 * इसे यहीं डिफाइन कर दिया गया है ताकि 'Cannot find name' वाला एरर खत्म हो जाए।
 */
const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden transition-all hover:border-white/20 ${className}`}>
    {children}
  </div>
);

// जब भी एडमिन कोई एक्शन लेगा, डैशबोर्ड तुरंत लाइव हो जाएगा
export const useAdminMutation = () => {
  const queryClient = useQueryClient();
  const { currentDistrict } = useDistrict();
  const districtId = currentDistrict?.id;

  return useMutation({
    mutationFn: async ({ id, status, endpoint }: { id: number, status: string, endpoint: string }) => {
      return apiRequest("PATCH", `/admin/${endpoint}/${id}/status`, { status });
    },
    retry: false,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["systemHealth", districtId] });
      queryClient.invalidateQueries({ queryKey: ["fraudSummary", districtId] });
      queryClient.invalidateQueries({ queryKey: ["userSummary", districtId] });
      queryClient.invalidateQueries({ queryKey: ["revenue", districtId] });
      queryClient.invalidateQueries({ queryKey: ["trustMetrics", districtId] });
    },
  });
};

export default function AdminDashboard() {
  const { currentDistrict } = useDistrict();
  const districtId = currentDistrict?.id;
  const districtSlug = currentDistrict?.slug;
  const [, setLocation] = useLocation();

  // 1. System health data (Polled every 5 minutes)
  const { data: systemHealthRes, isLoading: healthLoading } = useQuery({
    queryKey: ["systemHealth", districtId, districtSlug],
    queryFn: () => apiRequest("GET", "/admin/system-health"),
  });

  // 2. Fraud summary
  const { data: fraudSummaryRes } = useQuery({
    queryKey: ["fraudSummary", districtId, districtSlug],
    queryFn: () => apiRequest("GET", "/admin/fraud-summary"),
  });

  // 3. User intelligence summary
  const { data: userSummaryRes } = useQuery({
    queryKey: ["userSummary", districtId, districtSlug],
    queryFn: () => apiRequest("GET", "/admin/user-intelligence-summary"),
  });

  // 4. Activity feed
  const { data: activityDataRes } = useQuery({
    queryKey: ["activityFeed", districtId, districtSlug],
    queryFn: () => apiRequest("GET", "/admin/activity-feed"),
  });

  // 5. Revenue metrics (Business Intelligence)
  const { data: revenueDataRes } = useQuery({
    queryKey: ["revenue", districtId, districtSlug],
    queryFn: () => apiRequest("GET", "/admin/revenue/metrics"),
  });

  // 6. DSSL Trust metrics (Trust Intelligence)
  const { data: trustDataRes } = useQuery({
    queryKey: ["trustMetrics", districtId, districtSlug],
    queryFn: () => apiRequest("GET", "/admin/metrics"),
  });

  // 7. Pending products count (for quick access)
  const { data: pendingProductsRes } = useQuery({
    queryKey: ["pendingProducts", districtId, districtSlug],
    queryFn: () => apiRequest("GET", "/admin/products/pending"),
  });

  const systemHealth = safeData<any>(systemHealthRes, {});
  const fraudSummary = safeData<any>(fraudSummaryRes, {});
  const userSummary = safeData<any>(userSummaryRes, {});
  const activityData = safeData<any>(activityDataRes, { chartData: [] });
  const revenueData = safeData<any>(revenueDataRes, {});
  const trustData = safeData<any>(trustDataRes, {});
  const pendingProducts = safeData<any[]>(pendingProductsRes, []);

  // Composite loading guard - dashboard ready when core queries have data
  const dashboardLoading = healthLoading &&
    !systemHealthRes &&
    !fraudSummaryRes &&
    !userSummaryRes &&
    !pendingProductsRes;

  // Debug: Log all data states
  console.log("Dashboard data states:", {
    systemHealth,
    fraudSummary,
    userSummary,
    activityData,
    revenueData,
    trustData,
    pendingProducts,
    healthLoading
  });

  // Debug: Log systemHealth structure
  console.log("systemHealth REAL:", systemHealth);

  // Allow rendering even if some queries are still loading
  if (dashboardLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-white text-xl">Loading dashboard...</div>
        </div>
      </AdminLayout>
    );
  }

  if (!systemHealth) {
    return (
      <AdminLayout>
        <div className="text-red-400 p-6">System Health Failed to Load</div>
      </AdminLayout>
    );
  }

  // Removed blocking on trustError to allow partial rendering

  console.log("Rendering dashboard with data:", {
    systemHealth: !!systemHealth,
    fraudSummary: !!fraudSummary,
    userSummary: !!userSummary,
    revenueData: !!revenueData,
    trustData: !!trustData,
    pendingProducts: !!pendingProducts
  });

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">
            BHARAT-OS <span className="text-orange-500">COMMAND CENTER</span>
          </h1>
          <p className="text-gray-400 mt-1">AI-powered governance of the sovereign commerce ecosystem</p>
            <div className="text-xs text-gray-500 mt-2">
              System Health: {systemHealth?.status || 'Loading...'} |
              Data Loaded: {[
                systemHealth && 'Health',
                fraudSummary && 'Fraud',
                userSummary && 'Users',
                revenueData && 'Revenue',
                trustData && 'Trust',
                pendingProducts && 'Products'
              ].filter(Boolean).join(', ')}
            </div>
        </div>

        {/* Key Metrics Grid - 6 Cards */}
        {/* Row 1: Business Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <GlassCard className="p-6 border-l-4 border-green-500">
            <DollarSign className="text-green-500 mb-2" size={24} />
            <p className="text-gray-400 text-sm">Total Revenue</p>
            <h2 className="text-2xl font-bold text-white">₹ {revenueData?.totalRevenue ?? 0}</h2>
            <p className="text-green-400 text-xs mt-1">
              <TrendingUp size={12} className="inline mr-1" />
              15.5% this month
            </p>
            </GlassCard>
          </div>

        {/* Row 2: Risk & Trust Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          <GlassCard className="p-6 border-l-4 border-red-500">
            <AlertTriangle className="text-red-500 mb-2" size={24} />
            <p className="text-gray-400 text-sm">Fraud Alerts</p>
            <h2 className="text-2xl font-bold text-white">{fraudSummary?.totalAlerts ?? systemHealth?.alertCount ?? 0}</h2>
            <p className="text-red-400 text-xs mt-1">
              {systemHealth?.lockdownMode ? "LOCKDOWN" : "System Normal"}
            </p>
          </GlassCard>

          <GlassCard className="p-6 border-l-4 border-emerald-500">
            <Award className="text-emerald-500 mb-2" size={24} />
            <p className="text-gray-400 text-sm">Trust Score (DSSL)</p>
            <h2 className="text-2xl font-bold text-white">{trustData?.averageTrustScore ?? trustData?.trustScore ?? 0}</h2>
            <p className="text-emerald-400 text-xs mt-1">
              Active: {trustData?.activeUsers ?? 0} | Total: {trustData?.totalUsers ?? 0}
            </p>
          </GlassCard>

          <GlassCard className="p-6 border-l-4 border-purple-500">
            <Shield className="text-purple-500 mb-2" size={24} />
            <p className="text-gray-400 text-sm">System Accuracy</p>
            <h2 className="text-2xl font-bold text-white">{systemHealth?.accuracy ?? systemHealth?.falsePositiveMetrics?.accuracy ?? 0}%</h2>
            <p className="text-purple-400 text-xs mt-1">
              {fraudSummary?.totalAlerts ?? systemHealth?.fraudDetections ?? 0} detected
            </p>
          </GlassCard>
        </div>

        {/* Activity Chart */}
        <GlassCard className="p-8">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Activity className="text-orange-500" size={20} />
            Live Activity Feed (24h)
          </h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData?.chartData || []}>
                <XAxis dataKey="name" stroke="#555555" fontSize={12} />
                <YAxis stroke="#555555" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111111",
                    border: "1px solid #333",
                    borderRadius: "8px"
                  }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="vendors" stroke="#3b82f6" strokeWidth={2} dot={false} name="Vendors" />
                <Line type="monotone" dataKey="users" stroke="#10b981" strokeWidth={2} dot={false} name="Users" />
                <Line type="monotone" dataKey="fraud" stroke="#ef4444" strokeWidth={2} dot={false} name="Fraud" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        {/* Priority Alerts */}
        {systemHealth?.priorityAlerts && systemHealth.priorityAlerts.length > 0 && (
          <GlassCard className="p-8">
            <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <AlertTriangle className="text-red-500" size={20} />
              Priority Alerts
            </h3>
            <div className="space-y-3">
              {systemHealth.priorityAlerts.slice(0, 5).map((alert: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                  <div>
                    <p className="font-medium text-white">{alert.username}</p>
                    <p className="text-sm text-gray-400">Risk Score: {alert.riskScore} | Trust: {alert.trustScore}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                    alert.priority === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    alert.priority === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  }`}>
                    {alert.priority}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        {/* System Health Monitor */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${systemHealth?.lockdownMode ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
              <span className="font-medium text-white">Lockdown Mode</span>
            </div>
            <p className="text-sm text-gray-400">
              {systemHealth?.lockdownMode ? "Emergency protocols active" : "Normal operations"}
            </p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Zap className="text-blue-500" size={20} />
              <span className="font-medium text-white">Auto-Tuning</span>
            </div>
            <p className="text-sm text-gray-400">Policy optimization active</p>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-green-500" size={20} />
              <span className="font-medium text-white">AI Learning</span>
            </div>
            <p className="text-sm text-gray-400">Continuous improvement active</p>
          </GlassCard>
        </div>
      </div>
    </AdminLayout>
  );
}
