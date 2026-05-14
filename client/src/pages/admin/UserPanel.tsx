// 📁 client/src/pages/admin/UserPanel.tsx

import React from "react";
import AdminLayout from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { useDistrict } from "@/contexts/DistrictContext";

/**
 * 🛡️ SOVEREIGN UI: GlassCard Component
 * Defined locally to avoid import issues
 */
const GlassCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-xl overflow-hidden transition-all hover:border-white/20 ${className}`}>
    {children}
  </div>
);
import { useState } from "react";
import { Shield, AlertTriangle, Eye, Lock, Unlock, User } from "lucide-react";
import { toast } from "react-hot-toast";

export default function UserPanel() {
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const queryClient = useQueryClient();
  const { currentDistrict } = useDistrict();
  const districtId = currentDistrict?.id;

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", selectedStatus, districtId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);

      const response = await apiRequest("GET", `/admin/users?${params}`);
      return response?.data || [];
    },
  });

  const blockMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("PATCH", `/admin/users/${userId}/block`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", selectedStatus, districtId] });
      toast.success("User blocked successfully");
    },
  });

  const quarantineMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("PATCH", `/admin/users/${userId}/quarantine`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", selectedStatus, districtId] });
      toast.success("User quarantined successfully");
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async ({ userId, action, reason }: { userId: number; action: string; reason: string }) => {
      const response = await apiRequest("POST", "/admin/user-feedback", { userId, action, reason });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", selectedStatus, districtId] });
      toast.success("Feedback processed");
    },
  });

  const statusOptions = ["ALL", "NORMAL", "PROBATION", "MONITORED", "QUARANTINE", "BLOCKED"];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">User Intelligence Panel</h1>
            <p className="text-gray-400 mt-1">Monitor and manage user trust & risk levels</p>
          </div>

          <div className="flex gap-2">
            {statusOptions.map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedStatus === status
                    ? "bg-orange-500 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-4">
          {Array.isArray(users) && users.map((user: any) => (
            <GlassCard key={user.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="text-blue-500" size={20} />
                    <h3 className="text-xl font-semibold text-white">{user.username}</h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      user.userIntelligence?.status === 'NORMAL' ? 'bg-green-500/20 text-green-400' :
                      user.userIntelligence?.status === 'PROBATION' ? 'bg-blue-500/20 text-blue-400' :
                      user.userIntelligence?.status === 'MONITORED' ? 'bg-yellow-500/20 text-yellow-400' :
                      user.userIntelligence?.status === 'QUARANTINE' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {user.userIntelligence?.status || 'UNKNOWN'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-gray-400 text-sm">Trust Score</p>
                      <div className="flex items-center gap-2">
                        <Shield className="text-green-500" size={16} />
                        <span className="font-semibold">{user.userIntelligence?.trustScore || 0}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Risk Score</p>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="text-red-500" size={16} />
                        <span className="font-semibold">{user.userIntelligence?.riskScore || 0}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Orders</p>
                      <span className="font-semibold">{user.userIntelligence?.orderCount || 0}</span>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Reviews</p>
                      <span className="font-semibold">{user.userIntelligence?.reviewCount || 0}</span>
                    </div>
                  </div>

                  {user.userIntelligence?.meta?.trustBreakdown && (
                    <div className="text-xs text-gray-500 bg-black/20 p-3 rounded">
                      <p><strong>Breakdown:</strong> Orders: {user.userIntelligence.meta.trustBreakdown.orders},
                      Reviews: {user.userIntelligence.meta.trustBreakdown.reviews},
                      Devices: {user.userIntelligence.meta.trustBreakdown.devices},
                       Fraud History: {user.userIntelligence.meta.trustBreakdown.fraudHistory}</p>
                    </div>
                  )}

                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {(!users || users.length === 0) && (
          <GlassCard className="p-12 text-center">
            <p className="text-gray-400">No users found for the selected status.</p>
          </GlassCard>
        )}
      </div>
    </AdminLayout>
  );
}
