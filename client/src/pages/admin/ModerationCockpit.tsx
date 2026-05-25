import { apiRequest } from "@/lib/api-client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDistrict } from "@/contexts/DistrictContext";
import AdminLayout from "./AdminLayout";
import { toast } from "sonner";
import { 
  ShieldCheck, 
  AlertTriangle, 
  UserX, 
  AlertOctagon, 
  ThumbsUp, 
  History, 
  Clock, 
  Search, 
  SlidersHorizontal,
  ChevronRight,
  User,
  ShieldAlert
} from "lucide-react";

interface Vendor {
  id: number;
  name: string;
  category?: string;
  dsslScore?: number;
  aiRankScore?: number;
  isVerified?: boolean;
  isShadowBanned?: boolean;
  status?: string;
  phone?: string;
  address?: string;
}

interface ModerationLog {
  id: number;
  adminId: number;
  action: string;
  createdAt: string;
  details: {
    decision: string;
    reason: string;
    targetId: number;
  };
}

export default function ModerationCockpit() {
  const queryClient = useQueryClient();
  const { currentDistrict } = useDistrict();
  const districtId = currentDistrict?.id;

  const [activeTab, setActiveTab] = useState<"PENDING" | "APPROVED" | "SHADOW_BAN" | "ALL">("PENDING");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [moderationReason, setModerationReason] = useState("");

  // Fetch vendors
  const { data: vendors = [], isLoading } = useQuery<Vendor[]>({
    queryKey: ["moderation-vendors", districtId, activeTab],
    queryFn: async () => {
      // Fetch vendors with status matching current tab
      const statusParam = activeTab === "SHADOW_BAN" ? "all" : activeTab.toLowerCase();
      const result = await apiRequest("GET", `/admin/vendors?status=${statusParam}`);
      let list: Vendor[] = result?.data || [];
      if (activeTab === "SHADOW_BAN") {
        list = list.filter(v => v.isShadowBanned);
      }
      return list;
    }
  });

  // Fetch moderation history for selected vendor
  const { data: history = [], isLoading: isLoadingHistory } = useQuery<ModerationLog[]>({
    queryKey: ["vendor-history", selectedVendor?.id],
    queryFn: async () => {
      if (!selectedVendor?.id) return [];
      const result = await apiRequest("GET", `/admin/vendors/${selectedVendor.id}/history`);
      return result?.data || [];
    },
    enabled: !!selectedVendor?.id
  });

  // Moderation mutation
  const moderateMutation = useMutation({
    mutationFn: async ({ id, action, reason }: { id: number; action: string; reason: string }) => {
      const response = await apiRequest("POST", `/admin/vendors/${id}/moderate`, { action, reason });
      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["moderation-vendors", districtId] });
      queryClient.invalidateQueries({ queryKey: ["vendor-history", variables.id] });
      toast.success(`Action '${variables.action}' executed successfully`);
      setModerationReason("");
      // Update selected vendor state to match local updates
      if (selectedVendor && selectedVendor.id === variables.id) {
        const isShadow = variables.action === "SHADOW_BAN";
        const isApprove = variables.action === "APPROVE";
        setSelectedVendor(prev => prev ? {
          ...prev,
          status: isApprove ? "APPROVED" : (variables.action === "ESCALATE" ? "PENDING" : prev.status),
          isShadowBanned: isShadow ? true : (isApprove ? false : prev.isShadowBanned),
          isVerified: isApprove ? true : (variables.action === "FLAG" ? false : prev.isVerified)
        } : null);
      }
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to execute moderation action");
    }
  });

  const handleModerate = (action: "APPROVE" | "FLAG" | "SHADOW_BAN" | "ESCALATE") => {
    if (!selectedVendor) return;
    moderateMutation.mutate({
      id: selectedVendor.id,
      action,
      reason: moderationReason.trim() || `Sovereign action: ${action}`
    });
  };

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (v.category || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="flex flex-col lg:flex-row min-h-[calc(100vh-4rem)] bg-zinc-950 text-slate-100">
        
        {/* Left Side - Vendor List */}
        <div className="flex-1 border-r border-zinc-800 p-4 lg:p-6 space-y-4 max-h-[88vh] overflow-y-auto">
          <div className="flex flex-col gap-2">
            <h1 className="text-xl lg:text-2xl font-black uppercase tracking-wider text-orange-500">
              Moderation Cockpit
            </h1>
            <p className="text-xs text-zinc-400">
              District: <span className="text-orange-400 font-bold uppercase">{currentDistrict?.name || 'Shahdol'}</span>
            </p>
          </div>

          {/* Search Header */}
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-zinc-500" />
            <input 
              type="text"
              placeholder="Search merchants or categories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-orange-500/50"
            />
          </div>

          {/* Tabs - Giant Touch Targets */}
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-zinc-900 rounded-xl border border-zinc-800/80">
            {(["PENDING", "APPROVED", "SHADOW_BAN", "ALL"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setSelectedVendor(null);
                }}
                className={`py-2 text-[10px] lg:text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === tab 
                    ? "bg-orange-600 text-white shadow-lg" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {tab === "SHADOW_BAN" ? "Banned" : tab.toLowerCase()}
              </button>
            ))}
          </div>

          {/* Vendor List */}
          <div className="space-y-2">
            {isLoading ? (
              <div className="py-20 text-center animate-pulse text-zinc-500 text-sm font-bold uppercase tracking-wider">
                Scanning district records...
              </div>
            ) : filteredVendors.length === 0 ? (
              <div className="py-20 text-center text-zinc-500 text-sm font-medium">
                No merchants found matching this criteria.
              </div>
            ) : (
              filteredVendors.map((vendor) => {
                const riskScore = Math.max(0, 100 - (vendor.dsslScore || 0));
                const isSelected = selectedVendor?.id === vendor.id;

                return (
                  <div
                    key={vendor.id}
                    onClick={() => setSelectedVendor(vendor)}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected 
                        ? "bg-orange-500/10 border-orange-500/60 shadow-lg" 
                        : "bg-zinc-900/60 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-sm lg:text-base text-white truncate">{vendor.name}</h3>
                        {vendor.isVerified && (
                          <span className="bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                            Verified
                          </span>
                        )}
                        {vendor.isShadowBanned && (
                          <span className="bg-red-500/15 border border-red-500/20 text-red-400 text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-wider">
                            Shadow Banned
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                        <span className="bg-zinc-800/80 px-2 py-0.5 rounded text-[10px] text-zinc-300 font-semibold">{vendor.category || "GENERAL"}</span>
                        <span>•</span>
                        <span>ID: {vendor.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-2">
                      <div className="text-right">
                        <div className="text-[10px] text-zinc-500 font-bold uppercase">AI Risk</div>
                        <div className={`text-xs lg:text-sm font-black ${
                          riskScore >= 75 ? "text-red-500" : riskScore >= 40 ? "text-amber-500" : "text-emerald-500"
                        }`}>
                          {riskScore}%
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-zinc-500" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Side - Details & Moderation Form */}
        <div className="flex-1 p-4 lg:p-6 bg-zinc-900/40 lg:max-h-[88vh] lg:overflow-y-auto space-y-6">
          {selectedVendor ? (
            <div className="space-y-6">
              {/* Vendor Profile Card */}
              <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 space-y-4 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500">
                      Merchant Details
                    </span>
                    <h2 className="text-lg lg:text-xl font-bold text-white leading-tight">
                      {selectedVendor.name}
                    </h2>
                    <p className="text-xs text-zinc-400">{selectedVendor.address || "No address provided"}</p>
                  </div>
                  <div className="bg-zinc-950 border border-zinc-800 px-4 py-2 rounded-2xl text-center">
                    <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider block">DSSL Score</span>
                    <span className="text-base lg:text-lg font-black text-orange-400">🛡️ {selectedVendor.dsslScore || 0}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/40">
                    <span className="text-zinc-500 block mb-1">Status</span>
                    <span className={`font-black uppercase tracking-wider text-[10px] px-2 py-0.5 rounded ${
                      selectedVendor.status === "APPROVED" 
                        ? "bg-emerald-500/10 text-emerald-400" 
                        : "bg-amber-500/10 text-amber-400"
                    }`}>
                      {selectedVendor.status || "PENDING"}
                    </span>
                  </div>
                  <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/40">
                    <span className="text-zinc-500 block mb-1">Risk Profile</span>
                    <span className="font-bold text-zinc-200">
                      {Math.max(0, 100 - (selectedVendor.dsslScore || 0)) >= 60 ? "🚨 HIGH RISK" : "✅ SAFE"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Form */}
              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-400">
                  Governance Action
                </h3>
                
                <textarea
                  placeholder="Provide audit reason or notes (required for action logs)..."
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  className="w-full h-24 bg-zinc-900 border border-zinc-800 p-3 rounded-2xl text-sm focus:outline-none focus:border-orange-500/50 text-white placeholder:text-zinc-600"
                  required
                />

                {/* Big Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleModerate("APPROVE")}
                    disabled={moderateMutation.isPending}
                    className="flex flex-col items-center justify-center gap-1.5 p-4 bg-emerald-600/90 hover:bg-emerald-600 active:scale-[0.97] disabled:opacity-50 text-white rounded-2xl shadow-lg transition-all"
                  >
                    <ThumbsUp className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-wider">Approve</span>
                  </button>

                  <button
                    onClick={() => handleModerate("FLAG")}
                    disabled={moderateMutation.isPending}
                    className="flex flex-col items-center justify-center gap-1.5 p-4 bg-amber-500/90 hover:bg-amber-500 active:scale-[0.97] disabled:opacity-50 text-zinc-950 rounded-2xl shadow-lg transition-all"
                  >
                    <AlertTriangle className="w-5 h-5 text-zinc-950" />
                    <span className="text-xs font-black uppercase tracking-wider">Flag Merchant</span>
                  </button>

                  <button
                    onClick={() => handleModerate("SHADOW_BAN")}
                    disabled={moderateMutation.isPending}
                    className="flex flex-col items-center justify-center gap-1.5 p-4 bg-red-600/90 hover:bg-red-600 active:scale-[0.97] disabled:opacity-50 text-white rounded-2xl shadow-lg transition-all"
                  >
                    <UserX className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-wider">Shadow Ban</span>
                  </button>

                  <button
                    onClick={() => handleModerate("ESCALATE")}
                    disabled={moderateMutation.isPending}
                    className="flex flex-col items-center justify-center gap-1.5 p-4 bg-purple-600/90 hover:bg-purple-600 active:scale-[0.97] disabled:opacity-50 text-white rounded-2xl shadow-lg transition-all"
                  >
                    <AlertOctagon className="w-5 h-5" />
                    <span className="text-xs font-black uppercase tracking-wider">Escalate</span>
                  </button>
                </div>
              </div>

              {/* Moderation History */}
              <div className="space-y-3">
                <h3 className="text-sm font-black uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <History className="w-4 h-4" /> Moderation History
                </h3>

                <div className="space-y-2.5">
                  {isLoadingHistory ? (
                    <div className="p-4 text-center text-xs text-zinc-500 animate-pulse uppercase tracking-wider">Loading history logs...</div>
                  ) : history.length === 0 ? (
                    <div className="p-5 text-center text-xs text-zinc-600 border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/10">
                      No previous moderation actions recorded.
                    </div>
                  ) : (
                    history.map((log) => (
                      <div key={log.id} className="bg-zinc-900/80 border border-zinc-800 p-3.5 rounded-2xl space-y-2 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-bold text-zinc-300">
                            <Clock className="w-3.5 h-3.5 text-zinc-500" />
                            {new Date(log.createdAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wide ${
                            log.action === "VENDOR_APPROVED"
                              ? "bg-emerald-500/15 text-emerald-400"
                              : log.action === "VENDOR_SHADOW_BANNED"
                                ? "bg-red-500/15 text-red-400"
                                : log.action === "VENDOR_ESCALATED"
                                  ? "bg-purple-500/15 text-purple-400"
                                  : "bg-amber-500/15 text-amber-400"
                          }`}>
                            {log.action.replace("VENDOR_", "")}
                          </span>
                        </div>
                        <p className="text-zinc-300 italic leading-relaxed">
                          "{log.details?.reason || 'No notes left'}"
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500">
                          <User className="w-3 h-3" /> Admin ID: {log.adminId}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-32 text-center text-zinc-500 space-y-3">
              <ShieldAlert className="w-12 h-12 text-zinc-700" />
              <div>
                <h4 className="font-bold text-white text-sm uppercase tracking-wider">No Merchant Selected</h4>
                <p className="text-xs text-zinc-600 max-w-xs mt-1">
                  Select a merchant from the directory registry on the left to review status, risk, and audit trail.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}
