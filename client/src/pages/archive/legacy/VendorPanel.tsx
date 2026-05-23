// 📁 client/src/pages/admin/VendorPanel.tsx

import AdminLayout from "./AdminLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { CheckCircle, XCircle, Eye, AlertTriangle, Star, CheckSquare, Square } from "lucide-react";
import { toast } from "react-hot-toast";
import { apiRequest } from "@/lib/api-client";
import { useDistrict } from "@/contexts/DistrictContext";

interface Vendor {
  id: number;
  name: string;
  status: string;
  dsslScore?: number;
  fraudScore?: number;
  totalReviews?: number;
  orderSuccessRate?: number;
  description?: string;
  slug?: string;
}

export default function VendorPanel() {
  const { currentDistrict } = useDistrict();
  const districtId = currentDistrict?.id;
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [selectedVendors, setSelectedVendors] = useState<number[]>([]);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{type: string, vendorId?: number, vendors?: number[]} | null>(null);
  const [lastActionTime, setLastActionTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const { data: vendors, isLoading } = useQuery({
    queryKey: ["vendors", selectedStatus, districtId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedStatus !== "ALL") params.set("status", selectedStatus);

      const response = await apiRequest("GET", `/admin/vendors?${params}`);
      // Backend returns: { data: [...], count: N }
      return response?.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Action cooldown check
  const checkActionCooldown = () => {
    const now = Date.now();
    if (now - lastActionTime < 2000) { // 2 second cooldown
      toast.error("Please wait before performing another action");
      return false;
    }
    setLastActionTime(now);
    return true;
  };

  // Handle single actions with confirmation
  const handleAction = (action: string, vendorId: number, vendor: Vendor) => {
    if (!checkActionCooldown()) return;

    // High-risk actions require confirmation
    if (action === 'ban' && ((vendor.fraudScore || 0) > 70 || (vendor.dsslScore || 100) < 30)) {
      setPendingAction({ type: action, vendorId });
      setShowConfirmModal(true);
      return;
    }

    executeAction(action, vendorId);
  };

  // Handle bulk actions
  const handleBulkAction = (action: string) => {
    if (!checkActionCooldown()) return;
    if (selectedVendors.length === 0) {
      toast.error("No vendors selected");
      return;
    }
    if (selectedVendors.length > 10) {
      toast.error("Cannot perform bulk actions on more than 10 vendors");
      return;
    }

    setPendingAction({ type: action, vendors: selectedVendors });
    setShowConfirmModal(true);
  };

  const executeAction = async (action: string, vendorId?: number, vendors?: number[]) => {
    try {
      if (vendors && vendors.length > 1) {
        // Bulk action
        const promises = vendors.map(id => {
          const endpoint = action === 'ban' ? 'ban' : 'approve';
          return apiRequest("PATCH", `/admin/vendors/${id}/${endpoint}`);
        });
        await Promise.all(promises);
        toast.success(`${action === 'ban' ? 'Banned' : 'Approved'} ${vendors.length} vendors`);
      } else if (vendorId) {
        // Single action
        const endpoint = action === 'ban' ? 'ban' : 'approve';
        const response = await apiRequest("PATCH", `/admin/vendors/${vendorId}/${endpoint}`);
        if (response) {
          toast.success(`Vendor ${action === 'ban' ? 'banned' : 'approved'} successfully`);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["vendors", selectedStatus, districtId] });
      setSelectedVendors([]);
      setShowConfirmModal(false);
      setPendingAction(null);
    } catch (error) {
      toast.error("Action failed");
    }
  };

  const confirmAction = () => {
    if (pendingAction) {
      executeAction(pendingAction.type, pendingAction.vendorId, pendingAction.vendors);
    }
  };

  const toggleVendorSelection = (vendorId: number) => {
    setSelectedVendors(prev =>
      prev.includes(vendorId)
        ? prev.filter(id => id !== vendorId)
        : [...prev, vendorId]
    );
  };

  // Filter vendors based on search query
  const filteredVendors = Array.isArray(vendors) ? vendors.filter((vendor: Vendor) =>
    (vendor.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    vendor.id.toString().includes(searchQuery)
  ) : [];

  const selectAllVendors = () => {
    setSelectedVendors(selectedVendors.length === filteredVendors.length ? [] : filteredVendors.map((v: Vendor) => v.id));
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in inputs
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case 'a':
          if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            selectAllVendors();
          } else {
            // Approve selected vendors
            event.preventDefault();
            handleBulkAction('approve');
          }
          break;
        case 'b':
          // Ban selected vendors
          event.preventDefault();
          handleBulkAction('ban');
          break;
        case 'escape':
          // Clear selection
          event.preventDefault();
          setSelectedVendors([]);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [selectedVendors, vendors]);

  const banMutation = useMutation({
    mutationFn: async (vendorId: number) => {
      const response = await apiRequest("PATCH", `/admin/vendors/${vendorId}/ban`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors", selectedStatus, districtId] });
      toast.success("Vendor banned successfully");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (vendorId: number) => {
      const response = await apiRequest("PATCH", `/admin/vendors/${vendorId}/approve`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors", selectedStatus, districtId] });
      toast.success("Vendor approved successfully");
    },
  });

  const statusOptions = ["ALL", "PENDING", "APPROVED", "REJECTED", "SUSPENDED", "RESTRICTED", "MONITORED", "BANNED"];

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-10">
          <div className="animate-spin h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Vendor Control Panel</h1>
            <p className="text-gray-400 mt-1">Manage vendor approvals and oversight</p>
          </div>

           <div className="flex flex-wrap items-center gap-3 w-full">
             {/* Search Input */}
             <input
               type="text"
               placeholder="Search vendors..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="px-4 py-2 rounded-lg bg-gray-800 text-white w-full sm:w-64 placeholder-gray-400 focus:outline-none focus:border-orange-500"
             />
             <div className="flex flex-wrap gap-2 w-full">
               {statusOptions.map(status => (
                 <button
                   key={status}
                   onClick={() => setSelectedStatus(status)}
                   className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                     selectedStatus === status
                       ? "bg-orange-500 text-white"
                       : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                   }`}
                 >
                   {status}
                 </button>
               ))}
             </div>

            {selectedVendors.length > 0 && (
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-400">
                  {selectedVendors.length} selected
                </span>
                <button
                  onClick={() => handleBulkAction('approve')}
                  className="px-3 py-1 bg-green-500/20 hover:bg-green-500/40 rounded text-sm transition-colors flex items-center gap-1"
                >
                  <CheckCircle size={14} />
                  Approve All
                </button>
                <button
                  onClick={() => handleBulkAction('ban')}
                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/40 rounded text-sm transition-colors flex items-center gap-1"
                >
                  <XCircle size={14} />
                  Ban All
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          {/* Select All Header */}
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={selectAllVendors}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              {selectedVendors.length === filteredVendors.length && filteredVendors.length > 0 ? (
                <CheckSquare size={16} />
              ) : (
                <Square size={16} />
              )}
              Select All ({filteredVendors.length})
            </button>
          </div>

          {Array.isArray(filteredVendors) && filteredVendors.map((vendor: Vendor) => (
            <div key={vendor.id} className="glass-card-sovereign p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-white">{vendor.name}</h3>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      vendor.status === 'APPROVED' ? 'bg-green-500/20 text-green-400' :
                      vendor.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                      vendor.status === 'REJECTED' ? 'bg-red-500/20 text-red-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {vendor.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <p className="text-gray-400 text-sm">DSSL Score</p>
                      <div className="flex items-center gap-2">
                        <Star className="text-yellow-500" size={16} />
                        <span className="font-semibold">{vendor.dsslScore || 0}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Fraud Score</p>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="text-red-500" size={16} />
                        <span className="font-semibold">{vendor.fraudScore || 0}</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Total Reviews</p>
                      <span className="font-semibold">{vendor.totalReviews || 0}</span>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Order Success</p>
                      <span className="font-semibold">{vendor.orderSuccessRate || 0}%</span>
                    </div>
                  </div>

                  <p className="text-gray-300 text-sm">{vendor.description}</p>
                </div>

                <div className="flex gap-2 ml-6">
                  <button
                    onClick={() => window.open(`/marketplace/store/${vendor.slug}`, '_blank')}
                    className="p-2 bg-blue-500/20 hover:bg-blue-500/40 rounded-lg transition-colors"
                    title="View Vendor"
                  >
                    <Eye size={16} className="text-blue-400" />
                  </button>

                  {vendor.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => handleAction('approve', vendor.id, vendor)}
                        className="p-2 bg-green-500/20 hover:bg-green-500/40 rounded-lg transition-colors"
                        title="Approve Vendor"
                      >
                        <CheckCircle size={16} className="text-green-400" />
                      </button>

                      <button
                        onClick={() => handleAction('ban', vendor.id, vendor)}
                        className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors"
                        title="Ban Vendor"
                      >
                        <XCircle size={16} className="text-red-400" />
                      </button>
                    </>
                  )}

                  {vendor.status === 'APPROVED' && (
                    <button
                      onClick={() => handleAction('ban', vendor.id, vendor)}
                      className="p-2 bg-red-500/20 hover:bg-red-500/40 rounded-lg transition-colors"
                      title="Ban Vendor"
                    >
                      <XCircle size={16} className="text-red-400" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredVendors.length === 0 && (
          <div className="glass-card-sovereign p-12 text-center">
            <p className="text-gray-400">
              {searchQuery ? "No vendors match your search." : "No vendors found for the selected status."}
            </p>
          </div>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && pendingAction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-white mb-4">Confirm Action</h3>
              <p className="text-gray-300 mb-6">
                Are you sure you want to {pendingAction.type}{' '}
                {pendingAction.vendors
                  ? `${pendingAction.vendors.length} vendors`
                  : 'this vendor'
                }?
                {pendingAction.type === 'ban' && ' This action cannot be undone.'}
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    setPendingAction(null);
                  }}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
