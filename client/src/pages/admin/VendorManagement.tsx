import { apiRequest } from "@/lib/api-client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDistrict } from "@/contexts/DistrictContext";
import { safeText } from "@/lib/admin-response";

import AdminLayout from "./AdminLayout";
import { toast } from "react-hot-toast";

interface Vendor {
  id: number;
  name: string;
  category?: string;
  dsslScore?: number;
  aiConfidence?: number;
  isSponsored?: boolean;
  status?: string;
}

export default function VendorManagement() {
  const queryClient = useQueryClient();
  const { currentDistrict } = useDistrict();
  const districtId = currentDistrict?.id;

  // Modal and form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [vendorName, setVendorName] = useState("");
  const [category, setCategory] = useState("");
  const [initialScore, setInitialScore] = useState(5.0);

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number, status: string }) => {
      const response = await apiRequest("PATCH", `/admin/vendors/${id}/status`, { status });
      return response;
    },
      onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["admin-vendors", districtId] });
       toast.success("Status Updated");
     }
   });

  const createVendorMutation = useMutation({
    mutationFn: async (newVendor: any) => {
      const response = await apiRequest("POST", "/admin/vendors", newVendor);
      return response;
    },
      onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["admin-vendors", districtId] });
       toast.success("New vendor added");
       setIsModalOpen(false);
       // Reset form
       setVendorName("");
       setCategory("");
       setInitialScore(5.0);
     }
   });

  const toggleSponsorshipMutation = useMutation({
    mutationFn: async ({ id, sponsored }: { id: number, sponsored: boolean }) => {
      const response = await apiRequest("PATCH", `/admin/vendors/${id}/sponsorship`, { isSponsored: sponsored });
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendors", districtId] });
    }
  });

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["admin-vendors", districtId],
    queryFn: async () => {
      const result = await apiRequest("GET", "/admin/vendors");
      return result?.data || [];
    }
  });

  const toggleSponsorship = (vendorId: number, sponsored: boolean) => {
    toggleSponsorshipMutation.mutate({ id: vendorId, sponsored });
  };

  return (
    <AdminLayout>
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Market Registry: Shahdol</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-orange-500 text-black px-4 py-2 rounded-lg font-bold text-sm"
        >
          + Add New Vendor
        </button>
      </div>

      <div className="overflow-x-auto bg-[#111] border border-gray-800 rounded-2xl">
        <table className="w-full text-left">
          <thead className="border-b border-gray-800 text-gray-400 text-sm">
            <tr>
              <th className="p-4">Vendor Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">DSSL Score</th>
              <th className="p-4">AI Confidence Level</th>
              <th className="p-4">Promotions (Ads)</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {isLoading ? (
              <tr><td colSpan={6} className="p-10 text-center animate-pulse">Scanning the Kingdom...</td></tr>
            ) : Array.isArray(vendors) ? vendors.map((v: any) => (
                <tr key={v.id} className="hover:bg-white/5 transition-colors">
                  <td className="p-4 font-medium">{v.name}</td>
                  <td className="p-4 text-gray-400 text-sm">{safeText(v.category)}</td>
                <td className="p-4">
                   <span className="bg-orange-500/10 text-orange-500 px-2 py-1 rounded-md text-xs border border-orange-500/20">
                     🛡️ {v.dsslScore || 0}
                   </span>
                </td>
                <td className="p-4">
                  <span className="bg-blue-500/10 text-blue-500 px-2 py-1 rounded-md text-xs border border-blue-500/20">
                    🤖 {(v.aiConfidence || 0).toFixed(2)}
                  </span>
                </td>
                <td className="p-4">
                  <button
                    onClick={() => toggleSponsorship(v.id, !v.isSponsored)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                      v.isSponsored
                        ? "bg-yellow-500 text-black shadow-[0_0_10px_rgba(234,179,8,0.4)]"
                        : "bg-white/10 text-gray-400 hover:bg-white/20"
                    }`}
                  >
                    {v.isSponsored ? "⭐ GOLD SPONSORED" : "Make VIP"}
                  </button>
                </td>
                <td className="p-4 text-right">
                  <button className="text-gray-400 hover:text-white mr-3">Edit</button>

                  {v.status === 'REJECTED' ? (
                    /* 🛡️ BHARAT-OS: Restore Button for Suspended Vendors */
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: v.id, status: 'APPROVED' })}
                      className="text-green-500 hover:text-green-400 font-bold"
                    >
                      Approve
                    </button>
                  ) : (
                    /* 🛑 Sovereign Suspend Button */
                    <button
                      onClick={() => updateStatusMutation.mutate({ id: v.id, status: 'REJECTED' })}
                      className="text-red-500 hover:text-red-400"
                    >
                      Suspend
                    </button>
                  )}
                </td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="p-10 text-center text-gray-500">No vendors found in this district.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Sovereign Onboarding Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#111] border border-orange-500/30 p-8 rounded-2xl w-full max-w-md">
            <h3 className="text-xl font-bold mb-6 text-center">Add New Vendor to Empire</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createVendorMutation.mutate({
                  name: vendorName,
                  category,
                  initialScore
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm text-gray-400">Vendor Name</label>
                <input
                  type="text"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  placeholder="साहू किराना"
                  className="w-full bg-[#1a1a1a] border border-gray-800 p-3 rounded-lg text-white"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="GROCERY"
                  className="w-full bg-[#1a1a1a] border border-gray-800 p-3 rounded-lg text-white"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-gray-400">Initial DSSL Score</label>
                <input
                  type="number"
                  value={initialScore}
                  onChange={(e) => setInitialScore(parseFloat(e.target.value))}
                  step="0.1"
                  className="w-full bg-[#1a1a1a] border border-gray-800 p-3 rounded-lg text-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={createVendorMutation.isPending}
                  className="flex-1 bg-orange-500 text-black p-3 rounded-lg font-bold"
                >
                  {createVendorMutation.isPending ? "Adding..." : "Add Vendor"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-600 text-white p-3 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </AdminLayout>
  );
}
