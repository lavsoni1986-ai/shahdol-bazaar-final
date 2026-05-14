// 📁 client/src/pages/admin/AuditPanel.tsx

import { apiRequest } from "@/lib/api-client";
import AdminLayout from "./AdminLayout";

import { useQuery } from "@tanstack/react-query";
import { FileText, User, Settings, Shield, AlertTriangle, Clock } from "lucide-react";
import { useDistrict } from "@/contexts/DistrictContext";

export default function AuditPanel() {
  const { currentDistrict } = useDistrict();
  const districtId = currentDistrict?.id;

  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ["audit-logs", districtId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/admin/audit-logs?limit=50`);
      return response?.data || [];
    },
  });

  const getActionIcon = (action: string) => {
    if (action.includes('USER')) return <User size={16} />;
    if (action.includes('VENDOR')) return <Shield size={16} />;
    if (action.includes('POLICY') || action.includes('CONFIG')) return <Settings size={16} />;
    if (action.includes('ALERT') || action.includes('FRAUD')) return <AlertTriangle size={16} />;
    return <FileText size={16} />;
  };

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
          <h1 className="text-3xl font-bold text-white">Audit Log</h1>
          <p className="text-gray-400 mt-1">Complete history of all administrative actions</p>
        </div>

        <div className="glass-card-sovereign p-6">
          <div className="space-y-4">
            {auditLogs?.map((log: any) => (
              <div key={log.id} className="flex items-start gap-4 p-4 bg-black/20 rounded-lg">
                <div className="p-2 bg-gray-700 rounded-lg">
                  {getActionIcon(log.action)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-white">{log.action}</h4>
                    <span className="text-xs text-gray-400">
                      by {log.admin?.username || 'System'}
                    </span>
                  </div>

                  <p className="text-gray-300 text-sm mb-2">{log.details}</p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                    {log.targetId && (
                      <div>
                        Target ID: {log.targetId}
                      </div>
                    )}
                  </div>

                  {log.meta && (
                    <div className="mt-2 text-xs text-gray-400 bg-gray-800/50 p-2 rounded">
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(log.meta, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {(!auditLogs || auditLogs.length === 0) && (
            <div className="text-center py-12">
              <FileText className="text-gray-500 mx-auto mb-4" size={48} />
              <p className="text-gray-400">No audit logs found.</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}