// 📁 client/src/components/admin/StickyAlerts.tsx

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, X, ExternalLink } from "lucide-react";
import { useState } from "react";
import { apiRequest } from "@/lib/api-client";
import { useDistrict } from "@/contexts/DistrictContext";

export default function StickyAlerts() {
  const { currentDistrict } = useDistrict();
  const districtId = currentDistrict?.id;
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);

  const { data: alerts } = useQuery({
    queryKey: ["priority-alerts", districtId],
    queryFn: async () => {
      const data = await apiRequest("GET", "/admin/system-health");
      return data?.data?.priorityAlerts || [];
    },
    refetchInterval: 30000,
  });

  const visibleAlerts = (alerts || []).filter((alert: any) => !dismissedAlerts.includes(alert.id)).slice(0, 3);

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  };

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {visibleAlerts.map((alert: any) => (
        <div
          key={alert.id}
          className="bg-red-600/90 backdrop-blur-lg border border-red-500/50 rounded-lg p-4 shadow-lg animate-in slide-in-from-right-2"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-white mt-0.5" size={16} />
              <div>
                <h4 className="font-semibold text-white text-sm">{alert.username}</h4>
                <p className="text-red-100 text-xs mt-1">
                  Risk Score: {alert.riskScore} | Priority: {alert.priority}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => window.open(`/admin/users`, '_blank')}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="View Details"
              >
                <ExternalLink size={12} className="text-white" />
              </button>
              <button
                onClick={() => dismissAlert(alert.id)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Dismiss"
              >
                <X size={12} className="text-white" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
