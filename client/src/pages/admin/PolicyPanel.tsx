// 📁 client/src/pages/admin/PolicyPanel.tsx

import AdminLayout from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Zap, Shield, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "react-hot-toast";
import { apiRequest } from "@/lib/api-client";
import { useDistrict } from "@/contexts/DistrictContext";

export default function PolicyPanel() {
  const { currentDistrict } = useDistrict();
  const districtId = currentDistrict?.id;
  const [riskThreshold, setRiskThreshold] = useState(70);
  const [trustThreshold, setTrustThreshold] = useState(30);
  const [autoTuneEnabled, setAutoTuneEnabled] = useState(true);

  const queryClient = useQueryClient();

  const { data: currentPolicies } = useQuery({
    queryKey: ["policies", districtId],
    queryFn: () => apiRequest("GET", "/admin/policies"),
  });

  const updatePolicyMutation = useMutation({
    mutationFn: (policies: any) => apiRequest("PATCH", "/admin/policies", policies),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["policies", districtId] });
      toast.success("Policies updated successfully");
    },
  });

  const runScanMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/admin/policy-scan"),
    onSuccess: () => {
      toast.success("Policy scan completed");
    },
  });

  const simulatePolicyMutation = useMutation({
    mutationFn: (params: { riskThreshold: number; trustThreshold: number }) =>
      apiRequest("POST", "/admin/simulate-policy", params),
  });

  const handleSavePolicies = () => {
    updatePolicyMutation.mutate({
      riskThreshold,
      trustThreshold,
      autoTuneEnabled
    });
  };

  const handleSimulate = async () => {
    const result = await simulatePolicyMutation.mutateAsync({
      riskThreshold,
      trustThreshold
    });

    if (result) {
      toast.success(`Simulation: ${result.affectedUsers} users, ${result.affectedVendors} vendors would be affected`);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Policy Control</h1>
          <p className="text-gray-400 mt-1">Configure fraud detection thresholds and system policies</p>
        </div>

        <div className="grid gap-6">
          {/* Risk Thresholds */}
          <div className="glass-card-sovereign p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="text-red-500" size={24} />
              <h3 className="text-xl font-semibold text-white">Risk Thresholds</h3>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  User Risk Threshold (Block users above this score)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="50"
                    max="90"
                    value={riskThreshold}
                    onChange={(e) => setRiskThreshold(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-white font-semibold min-w-[3rem]">{riskThreshold}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Moderate Risk</span>
                  <span>Critical Risk</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Trust Threshold (Flag users below this score)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={trustThreshold}
                    onChange={(e) => setTrustThreshold(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-white font-semibold min-w-[3rem]">{trustThreshold}</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Low Trust</span>
                  <span>High Trust</span>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-Tuning */}
          <div className="glass-card-sovereign p-6">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="text-blue-500" size={24} />
              <h3 className="text-xl font-semibold text-white">Auto-Tuning</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium">Enable Auto Policy Tuning</h4>
                  <p className="text-gray-400 text-sm">Automatically adjust thresholds based on false positives</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoTuneEnabled}
                    onChange={(e) => setAutoTuneEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                </label>
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded">
                <p className="text-blue-400 text-sm">
                  <strong>How it works:</strong> System monitors false positive rates and automatically
                  relaxes thresholds when error rates exceed 30%.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="glass-card-sovereign p-6">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="text-green-500" size={24} />
              <h3 className="text-xl font-semibold text-white">Policy Actions</h3>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSimulate}
                disabled={simulatePolicyMutation.isPending}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Shield size={16} />
                Simulate Changes
              </button>

              <button
                onClick={handleSavePolicies}
                disabled={updatePolicyMutation.isPending}
                className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Save size={16} />
                Save Policies
              </button>

              <button
                onClick={() => runScanMutation.mutate()}
                disabled={runScanMutation.isPending}
                className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Shield size={16} />
                Run Policy Scan
              </button>
            </div>

            {simulatePolicyMutation.data && (
              <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/20 rounded">
                <h4 className="font-semibold text-blue-400 mb-2">Simulation Results:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Users affected:</span>
                    <span className="ml-2 font-semibold text-white">{simulatePolicyMutation.data?.affectedUsers || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Vendors affected:</span>
                    <span className="ml-2 font-semibold text-white">{simulatePolicyMutation.data?.affectedVendors || 0}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}