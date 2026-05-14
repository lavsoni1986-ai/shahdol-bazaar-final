// 📁 client/src/pages/admin/EmergencyPanel.tsx

import AdminLayout from "./AdminLayout";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { AlertCircle, Shield, Power, Lock, Unlock } from "lucide-react";
import { toast } from "react-hot-toast";

export default function EmergencyPanel() {
  const lockdownMutation = useMutation({
    mutationFn: async (enable: boolean) => {
      const response = await apiRequest("POST", `/admin/system-lockdown`, { enable });
      return response;
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
  });

  const killSwitchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/admin/kill-switch`);
      return response;
    },
    onSuccess: (data) => {
      toast.success("Emergency kill switch activated");
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Emergency Panel</h1>
          <p className="text-gray-400 mt-1">Critical system controls for emergency situations</p>
        </div>

        <div className="grid gap-6">
          {/* System Lockdown */}
          <div className="glass-card-sovereign p-6 border-l-4 border-red-500">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-500/20 rounded-lg">
                <Lock className="text-red-500" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">System Lockdown</h3>
                <p className="text-gray-400">Pause all reviews and new registrations during fraud spikes</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => lockdownMutation.mutate(true)}
                disabled={lockdownMutation.isPending}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Lock size={16} />
                Enable Lockdown
              </button>

              <button
                onClick={() => lockdownMutation.mutate(false)}
                disabled={lockdownMutation.isPending}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Unlock size={16} />
                Disable Lockdown
              </button>
            </div>
          </div>

          {/* Kill Switch */}
          <div className="glass-card-sovereign p-6 border-l-4 border-red-700">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-red-700/20 rounded-lg">
                <Power className="text-red-400" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">Emergency Kill Switch</h3>
                <p className="text-gray-400">Complete system shutdown for critical security breaches</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => killSwitchMutation.mutate()}
                disabled={killSwitchMutation.isPending}
                className="px-6 py-3 bg-red-800 hover:bg-red-900 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <AlertCircle size={16} />
                ACTIVATE KILL SWITCH
              </button>
            </div>

            <div className="mt-4 p-3 bg-red-900/20 border border-red-700/30 rounded">
              <p className="text-red-300 text-sm">
                <strong>WARNING:</strong> This will immediately stop all marketplace operations.
                Only use in case of critical security breach.
              </p>
            </div>
          </div>

          {/* System Status */}
          <div className="glass-card-sovereign p-6 border-l-4 border-green-500">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-green-500/20 rounded-lg">
                <Shield className="text-green-500" size={24} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-white">System Status</h3>
                <p className="text-gray-400">Current operational status and health metrics</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-400">AI Engine</p>
                <p className="font-semibold text-green-400">ONLINE</p>
              </div>
              <div className="text-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-400">Fraud Detection</p>
                <p className="font-semibold text-green-400">ACTIVE</p>
              </div>
              <div className="text-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-400">User Tracking</p>
                <p className="font-semibold text-green-400">OPERATIONAL</p>
              </div>
              <div className="text-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-gray-400">Database</p>
                <p className="font-semibold text-green-400">HEALTHY</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}