// 📁 client/src/pages/admin/UserPanel.tsx

import React from "react";
import AdminLayout from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { safeData } from "@/lib/admin-response";
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
import { Shield, AlertTriangle, Eye, Lock, Unlock, User, KeyRound, Copy, Check, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function UserPanel() {
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [userToReset, setUserToReset] = useState<any | null>(null);
  const [isConfirmResetOpen, setIsConfirmResetOpen] = useState(false);
  const [tempPasswordResult, setTempPasswordResult] = useState<{ password: string; username: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const resetPasswordMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await apiRequest("POST", `/admin/users/${userId}/reset-password`);
      return response;
    },
    onSuccess: (data, userId) => {
      queryClient.invalidateQueries({ queryKey: ["users", selectedStatus, districtId] });
      const tempPass = data?.data?.temporaryPassword;
      const targetUsername = data?.data?.targetUser?.username || userToReset?.username || `User #${userId}`;
      setIsConfirmResetOpen(false);
      setUserToReset(null);
      if (tempPass) {
        setTempPasswordResult({ password: tempPass, username: targetUsername });
        toast.success("Temporary password generated");
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to reset password");
    }
  });
  const queryClient = useQueryClient();
  const { currentDistrict } = useDistrict();
  const districtId = currentDistrict?.id;

  const { data: users, isLoading } = useQuery({
    queryKey: ["users", selectedStatus, districtId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);

      const response = await apiRequest("GET", `/admin/users?${params}`);
      return safeData<any[]>(response, []);
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
        {/* 🔐 CONFIRMATION DIALOG */}
      <Dialog open={isConfirmResetOpen} onOpenChange={setIsConfirmResetOpen}>
        <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-orange-400 mb-1">
              <KeyRound size={20} />
              <DialogTitle className="text-lg font-bold">Confirm Administrative Reset</DialogTitle>
            </div>
            <DialogDescription className="text-slate-400 text-xs">
              This action will reset the credentials for <strong>{userToReset?.username}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm text-slate-300">
            <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl text-xs text-red-200">
              <p className="font-bold mb-1">Security Impact:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Immediately terminates and invalidates all existing active sessions.</li>
                <li>Generates an audited 12-character cryptographically secure temporary password.</li>
                <li>Requires the user to create a new permanent password immediately upon login.</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsConfirmResetOpen(false);
                setUserToReset(null);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={resetPasswordMutation.isPending}
              onClick={() => {
                if (userToReset) {
                  resetPasswordMutation.mutate(userToReset.id);
                }
              }}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
            >
              {resetPasswordMutation.isPending ? "Generating..." : "Generate Temporary Password"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 🔑 TEMPORARY PASSWORD RESULT MODAL */}
      <Dialog open={!!tempPasswordResult} onOpenChange={() => {}}>
        <DialogContent className="bg-slate-900 border border-orange-500/50 text-white max-w-md [&>button]:hidden">
          <DialogHeader>
            <div className="flex items-center gap-2 text-orange-400 mb-1">
              <KeyRound size={20} />
              <DialogTitle className="text-lg font-bold">Temporary Password Generated</DialogTitle>
            </div>
            <DialogDescription className="text-slate-400 text-xs">
              Credentials for <strong>{tempPasswordResult?.username}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-200 space-y-1">
              <p className="font-bold">⚠️ Shown Exactly Once</p>
              <p className="leading-relaxed">
                This temporary password will not be shown again and is not stored in plaintext. Copy it now and convey it securely to the verified user.
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Temporary Password:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={tempPasswordResult?.password || ""}
                  className="w-full bg-black/40 border border-orange-500/40 rounded-lg px-3 py-2 text-white font-mono text-sm tracking-wider select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (tempPasswordResult?.password) {
                      navigator.clipboard.writeText(tempPasswordResult.password);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                      toast.success("Copied to clipboard");
                    }
                  }}
                  className="px-3 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0"
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 italic">
              Upon login, the user will be strictly forced to set a new permanent password.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => {
                setTempPasswordResult(null);
                setCopied(false);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold"
            >
              Done / Copied
            </button>
          </div>
        </DialogContent>
      </Dialog>
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
