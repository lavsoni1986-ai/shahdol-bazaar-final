// ============================================
// SHAHDOL BAZAAR - SOVEREIGN COMMAND CENTER V5.0
// FLAWLESS RESPONSIVE & MOBILE-FIRST ARCHITECTURE
// ============================================
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { 
  Pencil, Trash2, Menu, Check, ShieldCheck, 
  Search, Package, TrendingUp, ShieldAlert, 
  LogOut, LayoutDashboard, ShoppingCart, 
  MessageSquare, Layers, Zap, Image, RefreshCw, Eye, X
} from "lucide-react";

export default function Admin() {
  const { isAuthenticated, isSuperAdmin, loading: authLoading, logout, user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"overview" | "sellers" | "products" | "news" | "banners" | "orders" | "reviews" | "categories">("overview");

  // --- Real Sync States ---
  const [offers, setOffers] = useState<any[]>([]);
  const [pendingProducts, setPendingProducts] = useState<any[]>([]);
  const [liveProducts, setLiveProducts] = useState<any[]>([]);
  const [shops, setShops] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [o, pp, lp, s, c, ord, b, r] = await Promise.all([
        fetch('/api/offers').then(res => res.json()),
        fetch('/api/admin/products/pending').then(res => res.json()),
        fetch('/api/products/all?approved=true').then(res => res.json()),
        fetch('/api/shops').then(res => res.json()),
        fetch('/api/categories').then(res => res.json()),
        fetch('/api/orders?includeAll=true').then(res => res.json()),
        fetch('/api/banners').then(res => res.json()),
        fetch('/api/reviews?pending=true').then(res => res.json())
      ]);

      setOffers(Array.isArray(o) ? o : []);
      setPendingProducts(Array.isArray(pp) ? pp : []);
      setLiveProducts(Array.isArray(lp) ? lp : []);
      setShops(Array.isArray(s) ? s.filter((shop: any) => shop.name.trim() !== "") : []);
      setCategories(Array.isArray(c) ? c : []);
      setOrders(Array.isArray(ord) ? ord : []);
      setBanners(Array.isArray(b) ? b : []);
      setReviews(Array.isArray(r) ? r : []);
    } catch (err) {
      toast.error("Critical Sync Failure ❌");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // 🔴 BACKEND ACTION HANDLERS (STRIKE 218)
  // ==========================================

  // 1. VENDOR ACTIONS
  const handleApproveVendor = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/shops/${id}/approve`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to approve vendor");
      toast.success("Vendor Verified Successfully! 🛡️");
      loadAllData();
    } catch (err) {
      toast.error("Action Failed! Check Backend API.");
    }
  };

  const handleDeleteVendor = async (id: number) => {
    if (!confirm("Are you sure you want to completely ban this vendor?")) return;
    try {
      const res = await fetch(`/api/shops/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete vendor");
      toast.success("Vendor Banned & Removed! 🗑️");
      loadAllData();
    } catch (err) {
      toast.error("Deletion Failed!");
    }
  };

  // 2. PRODUCT ACTIONS
  const handleApproveProduct = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/products/${id}/approve`, { method: "PATCH" });
      if (!res.ok) throw new Error("Failed to approve product");
      toast.success("Product is now LIVE! 🚀");
      loadAllData();
    } catch (err) {
      toast.error("Action Failed!");
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete product");
      toast.success("Product Removed from Inventory! 🗑️");
      loadAllData();
    } catch (err) {
      toast.error("Deletion Failed!");
    }
  };

  const handleRejectProduct = async (id: number) => {
    const reason = prompt("रिजेक्शन का कारण बताएं (Reason for rejection):");
    if (reason === null) return;

    try {
      const res = await fetch(`/api/admin/products/${id}/reject`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      if (res.ok) {
        toast.error("प्रोडक्ट रिजेक्ट कर दिया गया।");
        loadAllData();
      }
    } catch (err) {
      toast.error("Action Failed!");
    }
  };

  // 3. CATEGORY & NEWS ACTIONS
  const handleDeleteCategory = async (id: number) => {
    if (!confirm("Delete this category?")) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete category");
      toast.success("Category Removed! 🗑️");
      loadAllData();
    } catch (err) {
      toast.error("Deletion Failed!");
    }
  };

  const handleDeleteNews = async (id: number) => {
    try {
      const res = await fetch(`/api/offers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove alert");
      toast.success("Alert Removed! 🗑️");
      loadAllData();
    } catch (err) {
      toast.error("Action Failed!");
    }
  };

  useEffect(() => {
    if (isAuthenticated && isSuperAdmin) loadAllData();
    else if (!authLoading) setLocation("/auth");
  }, [isAuthenticated, isSuperAdmin, authLoading]);

  // --- UI Reusable Components ---
  const SectionHeader = ({ title, count }: { title: string, count?: number }) => (
    // FIX 7: HEADER FIX (OVERFLOW ISSUE)
    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-3">
        <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{title}</h2>
        {count !== undefined && <span className="px-2 py-0.5 bg-orange-500/10 text-orange-500 rounded-md text-xs font-black border border-orange-500/20">{count}</span>}
      </div>
      <div className="relative group w-full md:w-64">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-orange-500 transition-colors" />
        <input 
          type="text" 
          placeholder={`Search ${title.toLowerCase()}...`}
          className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-orange-500/50 transition-all text-white"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
    </div>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <div className="p-10 md:p-20 text-center animate-in fade-in duration-500">
      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
        <Layers className="text-gray-600 w-8 h-8" />
      </div>
      <h4 className="text-white font-black uppercase tracking-widest text-sm">No Data Detected</h4>
      <p className="text-gray-500 text-xs md:text-sm mt-2">{message}</p>
    </div>
  );

  const tabButton = (key: typeof activeTab, label: string, Icon: any) => (
    <button
      onClick={() => { setActiveTab(key); setSidebarOpen(false); setSearchQuery(""); }}
      // FIX 8: BUTTON FIX (Touch Friendly) - increased padding on mobile
      className={`w-full flex items-center gap-3 px-4 py-3 md:py-3.5 rounded-xl font-bold transition-all border ${
        activeTab === key 
          ? "text-orange-400 border-orange-500/50 bg-orange-500/5 [box-shadow:inset_0_0_15px_rgba(249,115,22,0.1)] drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]" 
          : "border-transparent text-gray-500 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm">{label}</span>
    </button>
  );

  if (authLoading || loading) return (
    <div className="min-h-screen bg-[#030003] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-xs font-black uppercase text-orange-500 tracking-[0.2em] animate-pulse">Sovereign Link Active</p>
      </div>
    </div>
  );

  // --- Search Filters ---
  const filteredShops = shops.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredProducts = [...pendingProducts, ...liveProducts].filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredOrders = orders.filter(o => o.customerName?.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredCategories = categories.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    // FIX 1: ROOT CONTAINER FIX (Browser handles scroll, no double scrollbars)
    <div className="min-h-screen bg-[#030003] text-slate-200 flex flex-col md:flex-row font-['Plus_Jakarta_Sans']">
      
      {/* Mobile Overlay Background (Closes sidebar on click outside) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 🌌 SOVEREIGN SIDEBAR */}
      {/* FIX 3: SIDEBAR RESPONSIVE FIX (max-w-[80%], proper scroll) */}
      <aside className={`w-64 max-w-[80%] bg-black/80 md:bg-black/40 backdrop-blur-3xl border-r border-white/10 p-4 flex flex-col fixed md:relative h-full max-h-screen overflow-y-auto z-50 transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-10 px-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500 rounded-lg shadow-[0_0_20px_rgba(249,115,22,0.4)]">
              <ShieldCheck className="w-6 h-6 text-black" />
            </div>
            <div>
              <h2 className="font-black text-white text-lg tracking-tighter uppercase leading-none">Shahdol</h2>
              <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest mt-1">Admin OS v5.0</p>
            </div>
          </div>
          {/* Mobile Close Button */}
          <button className="md:hidden text-gray-500 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="space-y-1 flex-1 overflow-y-auto pr-2 pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {tabButton("overview", "Dashboard", LayoutDashboard)}
          {tabButton("sellers", "Vendors", ShieldCheck)}
          {tabButton("products", "Inventory", Package)}
          {tabButton("orders", "Orders", ShoppingCart)}
          {tabButton("categories", "Categories", Layers)}
          {tabButton("news", "News & Alerts", Zap)}
          {tabButton("banners", "App Banners", Image)}
          {tabButton("reviews", "Reviews", MessageSquare)}
        </nav>

        <button onClick={() => logout()} className="mt-4 flex items-center gap-3 px-4 py-3 md:py-4 rounded-xl font-bold text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all group border-t border-white/10 pt-6">
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Sign Out</span>
        </button>
      </aside>

      {/* 🚀 MAIN CONTENT AREA */}
      {/* FIX 2: MAIN CONTENT SCROLL FIX (w-full instead of h-full, removes double scrollbar) */}
      <main className="flex-1 p-4 md:p-10 w-full">
        
        {/* ================= OVERVIEW TAB ================= */}
        {activeTab === "overview" && (
          <div className="animate-in fade-in duration-500">
            <header className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-2">Command Center</h1>
                <p className="text-gray-500 text-xs md:text-sm font-medium">Marketplace Pulse • District Shahdol (ID: 2)</p>
              </div>
              <button onClick={loadAllData} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-orange-500 transition-all self-start md:self-auto"><RefreshCw className="w-5 h-5" /></button>
            </header>

            {/* FIX 5: GRID FIX (sm:grid-cols-2 lg:grid-cols-4) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
              {[
                { label: "Total Vendors", val: shops.length, icon: ShieldCheck, color: "text-blue-500", bg: "bg-blue-500/10" },
                { label: "Pending Items", val: pendingProducts.length + shops.filter(s => !s.approved).length, icon: ShieldAlert, color: "text-orange-500", bg: "bg-orange-500/10" },
                { label: "Live Products", val: liveProducts.length, icon: Package, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                { label: "Total Revenue", val: `₹${orders.reduce((a, b) => a + (b.totalPrice || 0), 0)}`, icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10" }
              ].map((s, i) => (
                <div key={i} className="glass-card-3d p-5 md:p-6 border border-white/5 relative group overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div>
                      {/* FIX 6: TEXT SIZE AUTO SCALING (text-[10px] to text-xs) */}
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                      <p className="text-2xl md:text-3xl font-black text-white tracking-tighter">{s.val}</p>
                    </div>
                    <div className={`p-2.5 md:p-3 rounded-2xl ${s.bg} ${s.color} border border-white/5`}><s.icon className="w-5 h-5 md:w-6 md:h-6" /></div>
                  </div>
                  <div className="absolute bottom-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-orange-500/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              <div className="lg:col-span-2 space-y-6 md:space-y-8">
                 <div className="glass-card-3d p-5 md:p-8 border border-white/10 h-64 md:h-72 flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-base md:text-lg font-black text-white uppercase flex items-center gap-2"><TrendingUp className="text-orange-500 w-5 h-5"/> Growth Pulse</h3>
                      <span className="text-[10px] md:text-xs font-black text-orange-500 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">Real-time</span>
                    </div>
                    <div className="flex-1 flex items-end gap-1.5 md:gap-2 px-1 md:px-2">
                      {[40, 75, 45, 95, 65, 85, 50, 90, 100, 60, 80, 110].map((h, i) => (
                        <div key={i} className="flex-1 bg-white/5 rounded-t-lg relative group transition-all hover:bg-white/10">
                          <div className="absolute bottom-0 w-full bg-gradient-to-t from-orange-600 to-orange-400 rounded-t-lg transition-all duration-1000 group-hover:brightness-125" style={{ height: `${(h/110)*100}%` }} />
                        </div>
                      ))}
                    </div>
                 </div>
              </div>
              <div className="glass-card-3d p-5 md:p-6 border border-white/10">
                 <h3 className="text-xs md:text-sm font-black text-white uppercase mb-5 md:mb-6 tracking-widest border-b border-white/5 pb-4">Live System Feed</h3>
                 <div className="space-y-5 md:space-y-6">
                    {offers.length > 0 ? offers.slice(0, 4).map((o, idx) => (
                      <div key={idx} className="flex gap-4 group">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                          <div className="w-0.5 flex-1 bg-white/5 my-1 group-last:hidden" />
                        </div>
                        <div className="pb-3 md:pb-4">
                          <p className="text-xs md:text-sm font-bold text-slate-200 leading-relaxed">{o.content}</p>
                          <p className="text-[10px] text-gray-600 font-black uppercase mt-1 tracking-widest">Live Now</p>
                        </div>
                      </div>
                    )) : <p className="text-gray-500 text-xs md:text-sm">No active alerts.</p>}
                 </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= SELLERS TAB ================= */}
        {activeTab === "sellers" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SectionHeader title="Vendor Hub" count={shops.length} />
            {filteredShops.length === 0 ? <EmptyState message="No matching vendors found." /> : (
              // FIX 4: TABLE RESPONSIVE (overflow-x-auto on wrapper)
              <div className="glass-card-3d border border-white/10 overflow-x-auto shadow-2xl rounded-xl">
                {/* min-w-[700px] ensures it doesn't crush on mobile */}
                <table className="w-full min-w-[700px] text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-[10px] md:text-[11px] font-black uppercase text-gray-500 tracking-widest border-b border-white/10">
                      <th className="py-4 md:py-5 px-4 md:px-6">Identity / Name</th>
                      <th className="py-4 md:py-5 px-4 md:px-6">Category / Info</th>
                      <th className="py-4 md:py-5 px-4 md:px-6">Status</th>
                      <th className="py-4 md:py-5 px-4 md:px-6 text-right">Direct Controls</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredShops.map(s => (
                      <tr key={s.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-4 md:py-5 px-4 md:px-6">
                          <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-orange-500 font-black text-base md:text-lg shrink-0">
                              {s.name[0]}
                            </div>
                            <div>
                              <p className="text-xs md:text-sm font-black text-white group-hover:text-orange-500 transition-colors line-clamp-1">{s.name}</p>
                              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wide">{s.contactNumber || "No Contact"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 md:py-5 px-4 md:px-6 text-xs font-black text-gray-400 uppercase tracking-widest">{s.category || "Retail"}</td>
                        <td className="py-4 md:py-5 px-4 md:px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${s.approved ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-orange-500/10 text-orange-500 border border-orange-500/20"}`}>
                            {s.approved ? "Verified ✓" : "Reviewing"}
                          </span>
                        </td>
                        <td className="py-4 md:py-5 px-4 md:px-6 text-right">
                          <div className="flex justify-end gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                            {!s.approved && <button onClick={() => handleApproveVendor(s.id)} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all"><Check className="w-4 h-4" /></button>}
                            <button onClick={() => handleDeleteVendor(s.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= PRODUCTS TAB ================= */}
        {activeTab === "products" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SectionHeader title="Inventory Control" count={filteredProducts.length} />
            {filteredProducts.length === 0 ? <EmptyState message="No matching products found." /> : (
              <div className="glass-card-3d border border-white/10 overflow-x-auto shadow-2xl rounded-xl">
                <table className="w-full min-w-[700px] text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-[10px] md:text-[11px] font-black uppercase text-gray-500 tracking-widest border-b border-white/10">
                      <th className="py-4 md:py-5 px-4 md:px-6">Product Item</th>
                      <th className="py-4 md:py-5 px-4 md:px-6">Category</th>
                      <th className="py-4 md:py-5 px-4 md:px-6">Status</th>
                      <th className="py-4 md:py-5 px-4 md:px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredProducts.map(p => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-all group">
                        <td className="py-4 md:py-5 px-4 md:px-6">
                          <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/5 border border-white/10 overflow-hidden group-hover:border-orange-500/50 transition-all shrink-0">
                              {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Package className="w-full h-full p-2.5 md:p-3 text-gray-700" />}
                            </div>
                            <div>
                              <p className="text-xs md:text-sm font-black text-white line-clamp-1">{p.name}</p>
                              <p className="text-[10px] md:text-xs text-emerald-500 font-black mt-0.5">₹{p.price}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 md:py-5 px-4 md:px-6 text-[10px] md:text-xs font-black text-gray-500 uppercase">{p.category}</td>
                        <td className="py-4 md:py-5 px-4 md:px-6">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${p.approved ? "text-emerald-500 bg-emerald-500/10" : "text-orange-500 bg-orange-500/10 animate-pulse"}`}>
                            {p.approved ? "Live" : "Pending"}
                          </span>
                        </td>
                        <td className="py-4 md:py-5 px-4 md:px-6 text-right">
                          {!p.approved ? (
                            <div className="flex gap-2 justify-end">
                              <button onClick={() => handleApproveProduct(p.id)} className="bg-emerald-500/20 text-emerald-500 p-2 rounded-lg hover:bg-emerald-500 hover:text-black transition-all">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleRejectProduct(p.id)} className="bg-red-500/20 text-red-500 p-2 rounded-lg hover:bg-red-500 hover:text-black transition-all">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button onClick={() => handleDeleteProduct(p.id)} className="p-2 md:p-2.5 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-4 h-4 text-red-500" /></button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= ORDERS TAB ================= */}
        {activeTab === "orders" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SectionHeader title="Platform Orders" count={filteredOrders.length} />
            {filteredOrders.length === 0 ? <EmptyState message="No orders registered in the system yet." /> : (
              <div className="glass-card-3d border border-white/10 overflow-x-auto shadow-2xl rounded-xl">
                <table className="w-full min-w-[700px] text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-[10px] md:text-[11px] font-black uppercase text-gray-500 tracking-widest border-b border-white/10">
                      <th className="py-4 md:py-5 px-4 md:px-6">Order ID</th>
                      <th className="py-4 md:py-5 px-4 md:px-6">Customer</th>
                      <th className="py-4 md:py-5 px-4 md:px-6">Amount</th>
                      <th className="py-4 md:py-5 px-4 md:px-6 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredOrders.map(o => (
                      <tr key={o.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 md:py-5 px-4 md:px-6 font-bold text-white text-xs md:text-sm">#SB{o.id}</td>
                        <td className="py-4 md:py-5 px-4 md:px-6 text-gray-400 font-bold text-xs md:text-sm">{o.customerName}</td>
                        <td className="py-4 md:py-5 px-4 md:px-6 font-black text-emerald-500 text-xs md:text-sm">₹{o.totalPrice}</td>
                        <td className="py-4 md:py-5 px-4 md:px-6 text-right">
                          <span className="px-2.5 md:px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold text-orange-500 uppercase">
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ================= CATEGORIES TAB ================= */}
        {activeTab === "categories" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SectionHeader title="Manage Categories" count={filteredCategories.length} />
            {filteredCategories.length === 0 ? <EmptyState message="No matching categories found." /> : (
              // FIX 9: CATEGORY GRID FIX (sm:grid-cols-3)
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                {filteredCategories.map(c => (
                  <div key={c.id} className="glass-card-3d p-3 md:p-4 border border-white/10 group hover:border-orange-500/50 transition-all cursor-pointer relative overflow-hidden rounded-xl">
                    <div className="aspect-square bg-white/5 rounded-xl mb-3 overflow-hidden border border-white/5">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={c.name} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Layers className="text-gray-600 w-6 h-6 md:w-8 md:h-8" /></div>
                      )}
                    </div>
                    <p className="text-white font-black uppercase text-[10px] md:text-xs text-center tracking-wide line-clamp-1">{c.name}</p>
                    <button onClick={() => handleDeleteCategory(c.id)} className="absolute top-2 right-2 p-1.5 bg-red-500/80 text-white rounded-lg md:opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= NEWS / ALERTS TAB ================= */}
        {activeTab === "news" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SectionHeader title="System Alerts & News" count={offers.length} />
            {offers.length === 0 ? <EmptyState message="No news or alerts broadcasted." /> : (
              <div className="glass-card-3d border border-white/10 overflow-hidden shadow-2xl rounded-xl">
                <div className="divide-y divide-white/5">
                  {offers.map(o => (
                    <div key={o.id} className="p-4 md:p-6 hover:bg-white/[0.02] transition-colors flex justify-between items-center group">
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shrink-0">
                          <Zap className="text-orange-500 w-4 h-4 md:w-5 md:h-5" />
                        </div>
                        <div>
                          <p className="text-xs md:text-sm font-bold text-white line-clamp-2 md:line-clamp-none">{o.content}</p>
                          <p className="text-[10px] text-emerald-500 font-black uppercase mt-1">{o.isActive ? "Active Broadcast" : "Inactive"}</p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteNews(o.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg md:opacity-0 group-hover:opacity-100 transition-opacity ml-2"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ================= BANNERS & REVIEWS TABS (Placeholders) ================= */}
        {(activeTab === "banners" || activeTab === "reviews") && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SectionHeader title={activeTab === "banners" ? "App Banners" : "Customer Reviews"} />
            <EmptyState message={`No ${activeTab} available to manage at this moment.`} />
          </div>
        )}

      </main>

      {/* FIX 10: MOBILE BUTTON SAFE AREA FIX */}
      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)} 
        className="md:hidden fixed bottom-6 right-6 p-4 bg-orange-500 text-black rounded-full shadow-2xl z-50 transition-transform active:scale-95"
        style={{ bottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
      >
        <Menu className="w-6 h-6" />
      </button>

    </div>
  );
}