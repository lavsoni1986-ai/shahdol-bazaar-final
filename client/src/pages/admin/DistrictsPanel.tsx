import AdminLayout from "./AdminLayout";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { Globe, MapPin, Users, Store, CheckCircle, XCircle } from "lucide-react";
import { safeData } from "@/lib/admin-response";

import type { DistrictRuntimeContext as District } from "@/shared/contracts/district.contract";

type AdminDistrict = District & {
  isActive?: boolean;
  isDefault?: boolean;
  _count?: { vendors: number; products: number };
};

export default function DistrictsPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-districts"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/admin/districts");
      const list = safeData<AdminDistrict[]>(response, []);
      return Array.isArray(list) ? list : [];
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

  const districts = data || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Districts Management</h1>
            <p className="text-gray-400 mt-1">Manage all districts in the BharatOS network</p>
          </div>
          <div className="px-4 py-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <span className="text-orange-400 font-semibold">{districts.length} Districts</span>
          </div>
        </div>

        <div className="grid gap-4">
          {districts.map((district: AdminDistrict) => (
            <div
              key={district.id}
              className={`glass-card-sovereign p-6 rounded-xl border transition-all ${district.isActive
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-red-500/30 bg-red-500/5"
                }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl ${district.isActive ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    <Globe className={`w-6 h-6 ${district.isActive ? 'text-emerald-400' : 'text-red-400'}`} />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-white">{district.name}</h3>
                      {district.isDefault && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded">
                          DEFAULT
                        </span>
                      )}
                      {district.isActive ? (
                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-400" />
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} />
                        <span>{district.slug}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users size={14} />
                        <span>{district._count?.vendors || 0} vendors</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Store size={14} />
                        <span>{district._count?.products || 0} products</span>
                      </div>
                    </div>

                    {district.state && (
                      <p className="text-xs text-gray-500">State: {district.state}</p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-500">ID: {district.id}</p>
                  <p className="text-sm text-gray-300 mt-1">
                    Created: {district.createdAt ? new Date(district.createdAt).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {districts.length === 0 && (
          <div className="text-center py-12">
            <Globe className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No districts configured yet.</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
