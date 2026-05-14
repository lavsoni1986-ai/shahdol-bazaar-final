// 📁 client/src/pages/admin/FraudCenter.tsx

import AdminLayout from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { AlertTriangle, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "react-hot-toast";
import { useDistrict } from "@/contexts/DistrictContext";

export default function FraudCenter() {
  const queryClient = useQueryClient();
  const { currentDistrict } = useDistrict();
  const districtId = currentDistrict?.id;

  const renderReasonText = (reason: any) => {
    if (typeof reason === "string" || typeof reason === "number") {
      return reason;
    }

    if (!reason || typeof reason !== "object") {
      return "Unknown reason";
    }

    if (typeof reason.text === "string" || typeof reason.text === "number") {
      return reason.text;
    }

    if (typeof reason.message === "string" || typeof reason.message === "number") {
      return reason.message;
    }

    return JSON.stringify(reason);
  };

  const { data: fraudAlerts, isLoading } = useQuery({
    queryKey: ["fraud-alerts", districtId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/admin/fraud-alerts`);
      return response?.data || [];
    },
    refetchInterval: 30000,
  });

  const resolveAlertMutation = useMutation({
    mutationFn: async ({ alertId, action }: { alertId: string; action: string }) => {
      const response = await apiRequest("PATCH", `/admin/fraud-alerts/${alertId}/resolve`, { action });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fraud-alerts", districtId] });
      toast.success("Alert resolved");
    },
  });

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
        <div>
          <h1 className="text-3xl font-bold text-white">Fraud Center</h1>
          <p className="text-gray-400 mt-1">Real-time fraud detection and response</p>
        </div>

        <div className="grid gap-4">
          {fraudAlerts?.map((alert: any) => (
            <div key={alert.id} className="glass-card-sovereign p-6 border-l-4 border-red-500">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <AlertTriangle className="text-red-500" size={24} />
                    <div>
                      <h3 className="text-xl font-semibold text-white">{alert.title}</h3>
                      <p className="text-gray-400 text-sm">{alert.description}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      alert.severity === 'CRITICAL' ? 'bg-red-500/20 text-red-400' :
                      alert.severity === 'HIGH' ? 'bg-orange-500/20 text-orange-400' :
                      alert.severity === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {alert.severity}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-gray-400 text-sm">Entity Type</p>
                      <span className="font-semibold text-white">{alert.entityType}</span>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Entity ID</p>
                      <span className="font-semibold text-white">{alert.entityId}</span>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Fraud Score</p>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-red-400">{alert.fraudScore}</span>
                        <span className="text-xs text-gray-400">({alert.confidence}% confidence)</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Detected At</p>
                      <span className="font-semibold text-white">
                        {new Date(alert.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {alert.reasons && alert.reasons.length > 0 && (
                    <div className="mb-4">
                      <p className="text-gray-400 text-sm mb-2">Detection Reasons:</p>
                      <ul className="space-y-1">
                        {alert.reasons.map((reason: any, index: number) => (
                          <li key={index} className="text-sm text-gray-300 flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                            <span>{renderReasonText(reason)}</span>
                            {reason.confidence && (
                              <span className="text-xs text-gray-500">({reason.confidence}%)</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {alert.recommendations && (
                    <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded">
                      <p className="text-orange-400 text-sm">
                        <strong>Recommended Action:</strong> {alert.recommendations}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-6">
                  <button
                    onClick={() => window.open(`/admin/${alert.entityType.toLowerCase()}/${alert.entityId}`, '_blank')}
                    className="p-2 bg-blue-500/20 hover:bg-blue-500/40 rounded-lg transition-colors"
                    title="Investigate"
                  >
                    <Eye size={16} className="text-blue-400" />
                  </button>

                  <button
                    onClick={() => resolveAlertMutation.mutate({
                      alertId: alert.id,
                      action: 'INVESTIGATE'
                    })}
                    disabled={resolveAlertMutation.isPending}
                    className="p-2 bg-yellow-500/20 hover:bg-yellow-500/40 rounded-lg transition-colors disabled:opacity-50"
                    title="Mark for Investigation"
                  >
                    <Clock size={16} className="text-yellow-400" />
                  </button>

                  <button
                    onClick={() => resolveAlertMutation.mutate({
                      alertId: alert.id,
                      action: 'CONFIRM'
                    })}
                    disabled={resolveAlertMutation.isPending}
                    className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors disabled:opacity-50"
                    title="Confirm Fraud"
                  >
                    <XCircle size={16} className="text-red-400" />
                  </button>

                  <button
                    onClick={() => resolveAlertMutation.mutate({
                      alertId: alert.id,
                      action: 'DISMISS'
                    })}
                    disabled={resolveAlertMutation.isPending}
                    className="p-2 bg-green-500/20 hover:bg-green-500/40 rounded-lg transition-colors disabled:opacity-50"
                    title="Dismiss Alert"
                  >
                    <CheckCircle size={16} className="text-green-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {(!fraudAlerts || fraudAlerts.length === 0) && (
          <div className="glass-card-sovereign p-12 text-center">
            <CheckCircle className="text-green-500 mx-auto mb-4" size={48} />
            <h3 className="text-xl font-semibold text-white mb-2">All Clear</h3>
            <p className="text-gray-400">No active fraud alerts at this time.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
