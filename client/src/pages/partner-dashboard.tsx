// ============================================
// SHAHDOL BAZAAR - PARTNER OS V2.0 (SOVEREIGN ADAPTIVE)
// CONNECTED TO RETAIL, HEALTHCARE & SERVICE ENGINES
// ============================================
import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api-client";
import {
  Store, Package, ShoppingBag, Settings,
  Plus, TrendingUp, Clock, Menu, X, LogOut, Trash2, XCircle,
  Stethoscope, UserPlus, Briefcase, GraduationCap, Calendar, Phone, MessageSquare
} from "lucide-react";

export default function PartnerDashboard() {
  const { isAuthenticated, user, logout, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"dashboard" | "products" | "orders" | "doctors" | "services" | "inquiries" | "settings">("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [vendorStats, setVendorStats] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);

  // Product Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: "", price: "", mrp: "", category: "", description: "", imageUrl: "", images: [] as string[] });
  const [uploading, setUploading] = useState(false);

  // Doctor Modal State
  const [showDoctorModal, setShowDoctorModal] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    name: "",
    qualification: "",
    specialization: "",
    experience: "",
    consultationFee: "",
    timing: ""
  });

  // Service State
  const [serviceDetails, setServiceDetails] = useState({
    specialties: [] as string[],
    newSpecialty: "",
    serviceArea: "",
    serviceHours: "",
    description: ""
  });

  const [storeSettings, setStoreSettings] = useState({ shopName: "", address: "", phone: "" });

  const isHealthcare = vendorStats?.businessType === "HEALTHCARE" ||
    vendorStats?.category?.toLowerCase() === "healthcare" ||
    vendorStats?.category?.toLowerCase() === "hospital";

  const isService = vendorStats?.businessType === "SERVICE" ||
    vendorStats?.category?.toLowerCase() === "service";

  const isEducation = vendorStats?.businessType === "SCHOOL" ||
    vendorStats?.businessType === "EDUCATION" ||
    vendorStats?.category?.toLowerCase() === "school" ||
    vendorStats?.category?.toLowerCase() === "education";

  const isRetail = !isHealthcare && !isService && !isEducation;

  const loadVendorData = async () => {
    try {
      setLoading(true);

      // 1. Fetch vendor stats & profile classification
      const statsRes = await apiRequest("GET", "/vendor/stats");
      const stats = statsRes?.data || statsRes || {};
      setVendorStats(stats);

      const bType = (stats.businessType || "").toString().toUpperCase();
      const cat = (stats.category || "").toString().toUpperCase();

      const healthcare = bType === "HEALTHCARE" || cat === "HEALTHCARE" || cat === "HOSPITAL";
      const service = bType === "SERVICE" || cat === "SERVICE";
      const education = bType === "SCHOOL" || bType === "EDUCATION" || cat === "SCHOOL" || cat === "EDUCATION";

      setServiceDetails({
        specialties: Array.isArray(stats.specialties) ? stats.specialties : [],
        newSpecialty: "",
        serviceArea: stats.serviceArea || "",
        serviceHours: stats.serviceHours || "",
        description: stats.description || ""
      });

      setStoreSettings({
        shopName: stats.vendorName || (user as any)?.shopName || "",
        address: stats.address || (user as any)?.shopAddress || "",
        phone: stats.phone || ""
      });

      // 2. Fetch specific data based on vendor type
      if (healthcare) {
        const [docRes, inqRes, apptRes] = await Promise.all([
          apiRequest("GET", "/vendor/doctors").catch(() => ({ data: [] })),
          apiRequest("GET", "/vendor/inquiries").catch(() => ({ data: [] })),
          apiRequest("GET", "/vendor/appointments").catch(() => ({ data: [] }))
        ]);
        setDoctors(Array.isArray(docRes?.data) ? docRes.data : Array.isArray(docRes) ? docRes : []);
        setInquiries(Array.isArray(inqRes?.data) ? inqRes.data : Array.isArray(inqRes) ? inqRes : []);
        setAppointments(Array.isArray(apptRes?.data) ? apptRes.data : Array.isArray(apptRes) ? apptRes : []);
      } else if (service) {
        const [inqRes, apptRes] = await Promise.all([
          apiRequest("GET", "/vendor/inquiries").catch(() => ({ data: [] })),
          apiRequest("GET", "/vendor/appointments").catch(() => ({ data: [] }))
        ]);
        setInquiries(Array.isArray(inqRes?.data) ? inqRes.data : Array.isArray(inqRes) ? inqRes : []);
        setAppointments(Array.isArray(apptRes?.data) ? apptRes.data : Array.isArray(apptRes) ? apptRes : []);
      } else if (education) {
        const inqRes = await apiRequest("GET", "/vendor/inquiries").catch(() => ({ data: [] }));
        setInquiries(Array.isArray(inqRes?.data) ? inqRes.data : Array.isArray(inqRes) ? inqRes : []);
      } else {
        // Retail Merchant: Load products & retail orders
        const [prodRes, ordersRes] = await Promise.all([
          apiRequest("GET", "/merchant/products").catch(() => ({ data: [] })),
          apiRequest("GET", "/vendor/orders").catch(() => ({ data: [] }))
        ]);

        const productsList = Array.isArray(prodRes?.data) ? prodRes.data : Array.isArray(prodRes) ? prodRes : [];
        const ordersList = Array.isArray(ordersRes?.data) ? ordersRes.data : Array.isArray(ordersRes) ? ordersRes : [];
        setProducts(productsList);
        setOrders(ordersList);
      }
    } catch (err) {
      console.error("🔴 [PARTNER] API error:", err);
      toast.error("Failed to sync with Command Center");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: number, status: string) => {
    try {
      setLoading(true);
      await apiRequest("PATCH", `/vendor/orders/${orderId}/status`, { status });
      toast.success(`Order status updated to ${status}! 🎉`);
      await loadVendorData();
    } catch (err: any) {
      console.error("🔴 [PARTNER] Status update failed:", err);
      toast.error(err.message || "Failed to update order status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      setLocation("/auth?role=partner");
    } else if (user?.role && ["CUSTOMER", "customer"].includes(user.role)) {
      toast.error("Access Denied: You are not a registered merchant.");
      setLocation("/");
    } else {
      loadVendorData();
    }
  }, [isAuthenticated, authLoading, user]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    const primaryImg = newProduct.imageUrl || (newProduct.images && newProduct.images[0]);
    if (!primaryImg) {
      toast.error("कृपया प्रोडक्ट की कम से कम एक फोटो अपलोड करें!");
      return;
    }

    try {
      const payload: any = {
        ...newProduct,
        price: parseFloat(newProduct.price),
        mrp: newProduct.mrp ? parseFloat(newProduct.mrp) : undefined,
        imageUrl: primaryImg,
        images: newProduct.images?.length ? newProduct.images : [primaryImg],
        status: "PENDING"
      };
      if (!payload.mrp) delete payload.mrp;
      if (!payload.description) delete payload.description;

      console.log("🚀 [PRODUCT CREATE PAYLOAD]", payload);

      const res = await apiRequest("POST", "/merchant/products", payload);

      console.log("🟢 [PARTNER] Product create result:", res);
      toast.success("प्रोडक्ट रिव्यु के लिए भेज दिया गया है! 🚀");
      setShowAddModal(false);
      setNewProduct({ name: "", price: "", mrp: "", category: "", description: "", imageUrl: "", images: [] });
      loadVendorData();
    } catch (err: any) {
      console.error("🔴 [PARTNER] API error:", err);
      toast.error(err.message || "सबमिशन फेल हो गया!");
    }
  };

  const handleAddDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor.name) {
      toast.error("Doctor name is required!");
      return;
    }

    try {
      const payload = {
        name: newDoctor.name,
        qualification: newDoctor.qualification,
        specialization: newDoctor.specialization,
        experience: parseInt(newDoctor.experience) || 0,
        consultationFee: parseFloat(newDoctor.consultationFee) || 0,
        timing: newDoctor.timing
      };

      await apiRequest("POST", "/vendor/doctors", payload);
      toast.success("Doctor profile added successfully! 🩺");
      setShowDoctorModal(false);
      setNewDoctor({ name: "", qualification: "", specialization: "", experience: "", consultationFee: "", timing: "" });
      loadVendorData();
    } catch (err: any) {
      console.error("🔴 [PARTNER] Doctor add error:", err);
      toast.error(err.message || "Failed to add doctor");
    }
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    if (!confirm("Are you sure you want to remove this doctor profile?")) return;
    try {
      await apiRequest("DELETE", `/vendor/doctors/${doctorId}`);
      toast.success("Doctor profile removed 🗑️");
      loadVendorData();
    } catch (err: any) {
      console.error("🔴 [PARTNER] Doctor delete error:", err);
      toast.error(err.message || "Failed to delete doctor");
    }
  };

  const handleAddSpecialty = () => {
    if (!serviceDetails.newSpecialty.trim()) return;
    const updated = [...serviceDetails.specialties, serviceDetails.newSpecialty.trim()];
    setServiceDetails({ ...serviceDetails, specialties: updated, newSpecialty: "" });
  };

  const handleRemoveSpecialty = (index: number) => {
    const updated = serviceDetails.specialties.filter((_, i) => i !== index);
    setServiceDetails({ ...serviceDetails, specialties: updated });
  };

  const handleSaveServices = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("PATCH", "/vendor/profile", {
        specialties: serviceDetails.specialties,
        serviceArea: serviceDetails.serviceArea,
        serviceHours: serviceDetails.serviceHours,
        description: serviceDetails.description
      });
      toast.success("Service profile updated! ✅");
      loadVendorData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update service profile");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const existingImages = newProduct.images || (newProduct.imageUrl ? [newProduct.imageUrl] : []);
    const remainingSlots = 4 - existingImages.length;
    if (remainingSlots <= 0) {
      toast.error("अधिकतम 4 फोटो ही अपलोड की जा सकती हैं!");
      return;
    }

    const fileList = Array.from(files).slice(0, remainingSlots);
    const formData = new FormData();
    for (const file of fileList) {
      formData.append("images", file);
    }

    setUploading(true);
    try {
      const result = await apiRequest("POST", "/upload", formData);
      if (result?.urls && result.urls.length > 0) {
        const uploadedUrls: string[] = result.urls;
        const combined = Array.from(new Set([...existingImages, ...uploadedUrls])).slice(0, 4);
        setNewProduct({
          ...newProduct,
          imageUrl: combined[0] || "",
          images: combined
        });
        toast.success(`${uploadedUrls.length} फोटो अपलोड हो गई! 📸`);
      }
    } catch (err) {
      toast.error("Cloudinary Sync Failed!");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const existing = newProduct.images || (newProduct.imageUrl ? [newProduct.imageUrl] : []);
    const updated = existing.filter((_, idx) => idx !== indexToRemove);
    setNewProduct({
      ...newProduct,
      imageUrl: updated[0] || "",
      images: updated
    });
  };

  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await apiRequest("DELETE", `/merchant/products/${id}`);
      toast.success("Product Deleted 🗑️");
      loadVendorData();
    } catch (err) {
      console.error("🔴 [PARTNER] API error:", err);
      toast.error("Failed to delete product");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("PATCH", "/vendor/profile", {
        phone: storeSettings.phone,
        address: storeSettings.address
      });
      toast.success("Settings Saved! ✅");
    } catch (err: any) {
      toast.error(err.message || "Failed to update settings");
    }
  };

  const tabButton = (key: typeof activeTab, label: string, Icon: any) => (
    <button
      onClick={() => { setActiveTab(key); setSidebarOpen(false); }}
      className={`w-full flex items-center gap-3 px-4 py-3 md:py-3.5 rounded-xl font-bold transition-all border ${
        activeTab === key
          ? "text-emerald-400 border-emerald-500/50 bg-emerald-500/5 [box-shadow:inset_0_0_15px_rgba(16,185,129,0.1)] drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]"
          : "border-transparent text-gray-500 hover:text-white hover:bg-white/5"
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm">{label}</span>
    </button>
  );

  // Stats Calculations
  const todayOrdersCount = orders.filter(o => {
    const orderDate = new Date(o.createdAt).toDateString();
    const todayDate = new Date().toDateString();
    return orderDate === todayDate;
  }).length;

  const potentialRevenue = orders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);

  if (authLoading || loading) return (
    <div className="min-h-screen sovereign-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
        <p className="text-xs font-black uppercase text-emerald-500 tracking-[0.2em] animate-pulse">Loading Partner OS</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen sovereign-bg text-slate-200 flex flex-col md:flex-row font-['Plus_Jakarta_Sans']">

      {sidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`w-64 max-w-[80%] bg-black/40 backdrop-blur-3xl border-r border-white/10 p-4 flex flex-col fixed md:relative h-full max-h-screen overflow-y-auto z-50 transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-10 px-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              {isHealthcare ? <Stethoscope className="w-6 h-6 text-black" /> : isService ? <Briefcase className="w-6 h-6 text-black" /> : isEducation ? <GraduationCap className="w-6 h-6 text-black" /> : <Store className="w-6 h-6 text-black" />}
            </div>
            <div>
              <h2 className="font-black text-white text-lg tracking-tighter uppercase leading-none">Partner OS</h2>
              <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest mt-1">
                {vendorStats?.vendorName || user?.username || "My Account"}
              </p>
            </div>
          </div>
          <button className="md:hidden text-gray-500 hover:text-white" onClick={() => setSidebarOpen(false)}><X className="w-6 h-6" /></button>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto pr-2 pb-4 [&::-webkit-scrollbar]:hidden">
          {tabButton("dashboard", "Dashboard", TrendingUp)}

          {/* DYNAMIC TABS BASED ON ENTITY TYPE */}
          {isRetail && (
            <>
              {tabButton("products", "My Inventory", Package)}
              {tabButton("orders", "Live Orders", ShoppingBag)}
            </>
          )}

          {isHealthcare && (
            <>
              {tabButton("doctors", "Doctors & Consultations", Stethoscope)}
              {tabButton("inquiries", "Appointments & Inquiries", Calendar)}
            </>
          )}

          {isService && (
            <>
              {tabButton("services", "Services & Specialties", Briefcase)}
              {tabButton("inquiries", "Inquiries & Bookings", Calendar)}
            </>
          )}

          {isEducation && (
            <>
              {tabButton("services", "Courses & Details", GraduationCap)}
              {tabButton("inquiries", "Student Inquiries", Calendar)}
            </>
          )}

          {tabButton("settings", "Account Settings", Settings)}
        </nav>

        <button onClick={() => logout()} className="mt-4 flex items-center gap-3 px-4 py-3 md:py-4 rounded-xl font-bold text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all group border-t border-white/10 pt-6">
          <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm">Sign Out</span>
        </button>
      </aside>

      <main className="flex-1 p-4 md:p-10 w-full overflow-y-auto h-screen relative">

        {/* ===================== DASHBOARD VIEW ===================== */}
        {activeTab === "dashboard" && (
          <div className="animate-in fade-in duration-500">
            <header className="mb-10">
              <h1 className="text-3xl md:text-4xl font-black text-white uppercase tracking-tighter mb-2">
                Welcome, {vendorStats?.vendorName || user?.username || "Partner"}
              </h1>
              <p className="text-gray-500 text-xs md:text-sm font-medium">
                {isHealthcare ? "Healthcare Facility Management Command Center" : isService ? "Service Provider Command Center" : isEducation ? "Educational Institution Command Center" : "Merchant Store Command Center"}
              </p>
            </header>

            {/* STATS CARDS */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-10">
              {isRetail ? (
                [
                  { label: "Today's Orders", val: todayOrdersCount, icon: ShoppingBag, color: "text-blue-500", bg: "bg-blue-500/10" },
                  { label: "Active Products", val: products.length, icon: Package, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                  { label: "Potential Revenue", val: `₹${potentialRevenue}`, icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10" }
                ].map((s, i) => (
                  <div key={i} className="glass-card-sovereign p-5 md:p-6 border border-white/5 relative group overflow-hidden rounded-2xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                        <p className="text-3xl font-black text-white tracking-tighter">{s.val}</p>
                      </div>
                      <div className={`p-3 rounded-2xl ${s.bg} ${s.color} border border-white/5`}><s.icon className="w-6 h-6" /></div>
                    </div>
                  </div>
                ))
              ) : isHealthcare ? (
                [
                  { label: "Registered Doctors", val: doctors.length, icon: Stethoscope, color: "text-blue-500", bg: "bg-blue-500/10" },
                  { label: "Appointments", val: appointments.length, icon: Calendar, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                  { label: "Direct Inquiries", val: inquiries.length, icon: MessageSquare, color: "text-orange-500", bg: "bg-orange-500/10" }
                ].map((s, i) => (
                  <div key={i} className="glass-card-sovereign p-5 md:p-6 border border-white/5 relative group overflow-hidden rounded-2xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                        <p className="text-3xl font-black text-white tracking-tighter">{s.val}</p>
                      </div>
                      <div className={`p-3 rounded-2xl ${s.bg} ${s.color} border border-white/5`}><s.icon className="w-6 h-6" /></div>
                    </div>
                  </div>
                ))
              ) : (
                [
                  { label: "Active Services", val: serviceDetails.specialties.length, icon: Briefcase, color: "text-blue-500", bg: "bg-blue-500/10" },
                  { label: "Direct Inquiries", val: inquiries.length, icon: MessageSquare, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                  { label: "Appointments", val: appointments.length, icon: Calendar, color: "text-orange-500", bg: "bg-orange-500/10" }
                ].map((s, i) => (
                  <div key={i} className="glass-card-sovereign p-5 md:p-6 border border-white/5 relative group overflow-hidden rounded-2xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-xs font-black text-gray-500 uppercase tracking-widest mb-1">{s.label}</p>
                        <p className="text-3xl font-black text-white tracking-tighter">{s.val}</p>
                      </div>
                      <div className={`p-3 rounded-2xl ${s.bg} ${s.color} border border-white/5`}><s.icon className="w-6 h-6" /></div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* QUICK ACTIONS */}
            <div className="glass-card-sovereign p-6 md:p-8 border border-white/10 rounded-2xl">
               <h3 className="text-sm font-black text-white uppercase mb-6 tracking-widest border-b border-white/5 pb-4">Quick Actions</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isRetail && (
                    <button onClick={() => { setActiveTab("products"); setShowAddModal(true); }} className="flex items-center gap-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/20 transition-all group text-left">
                       <div className="p-3 bg-orange-500 rounded-lg group-hover:scale-110 transition-transform"><Plus className="w-6 h-6 text-black" /></div>
                       <div>
                         <h4 className="text-orange-500 font-bold text-sm">Add New Product</h4>
                         <p className="text-xs text-gray-400 mt-1">Upload items to your retail catalog</p>
                       </div>
                    </button>
                  )}

                  {isHealthcare && (
                    <button onClick={() => { setActiveTab("doctors"); setShowDoctorModal(true); }} className="flex items-center gap-4 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 transition-all group text-left">
                       <div className="p-3 bg-blue-500 rounded-lg group-hover:scale-110 transition-transform"><UserPlus className="w-6 h-6 text-white" /></div>
                       <div>
                         <h4 className="text-blue-400 font-bold text-sm">Add Doctor / Specialist</h4>
                         <p className="text-xs text-gray-400 mt-1">Register doctors for appointments & home visits</p>
                       </div>
                    </button>
                  )}

                  {isService && (
                    <button onClick={() => { setActiveTab("services"); }} className="flex items-center gap-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all group text-left">
                       <div className="p-3 bg-emerald-500 rounded-lg group-hover:scale-110 transition-transform"><Briefcase className="w-6 h-6 text-black" /></div>
                       <div>
                         <h4 className="text-emerald-400 font-bold text-sm">Manage Services & Rates</h4>
                         <p className="text-xs text-gray-400 mt-1">Update service specialties, hours, and area</p>
                       </div>
                    </button>
                  )}

                  {(isHealthcare || isService || isEducation) && (
                    <button onClick={() => { setActiveTab("inquiries"); }} className="flex items-center gap-4 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all group text-left">
                       <div className="p-3 bg-purple-500 rounded-lg group-hover:scale-110 transition-transform"><Calendar className="w-6 h-6 text-white" /></div>
                       <div>
                         <h4 className="text-purple-400 font-bold text-sm">View Customer Inquiries</h4>
                         <p className="text-xs text-gray-400 mt-1">Respond to customer appointments and leads</p>
                       </div>
                    </button>
                  )}
               </div>
            </div>
          </div>
        )}

        {/* ===================== RETAIL PRODUCTS TAB ===================== */}
        {activeTab === "products" && isRetail && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">My Inventory</h2>
              </div>
              <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 bg-orange-600 text-black px-5 py-2.5 rounded-xl font-black text-sm uppercase hover:scale-105 transition-all shadow-[0_0_15px_rgba(249,115,22,0.3)]">
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>

            {products.length === 0 ? (
               <div className="glass-card-sovereign border border-white/10 p-16 text-center rounded-2xl">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                    <Package className="text-gray-600 w-8 h-8" />
                  </div>
                  <h4 className="text-white font-black uppercase tracking-widest text-sm">Inventory Empty</h4>
                  <p className="text-gray-500 text-xs md:text-sm mt-2 mb-6">You haven't added any products to your store yet.</p>
               </div>
            ) : (
               <div className="glass-card-sovereign border border-white/10 overflow-x-auto shadow-2xl rounded-xl">
                 <table className="w-full min-w-[700px] text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-[10px] md:text-[11px] font-black uppercase text-gray-500 tracking-widest border-b border-white/10">
                      <th className="py-4 md:py-5 px-4 md:px-6">Product Item</th>
                      <th className="py-4 md:py-5 px-4 md:px-6">Status</th>
                      <th className="py-4 md:py-5 px-4 md:px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {products.map(p => (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-all group">
                        <td className="py-4 md:py-5 px-4 md:px-6">
                          <div>
                            <p className="text-xs md:text-sm font-black text-white">{p.name || p.title}</p>
                            <p className="text-[10px] md:text-xs text-emerald-500 font-black mt-0.5">₹{p.price}</p>
                          </div>
                        </td>
                        <td className="py-4 md:py-5 px-4 md:px-6">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${p.approved ? "text-emerald-500 bg-emerald-500/10" : "text-orange-500 bg-orange-500/10 animate-pulse"}`}>
                            {p.approved ? "Live" : "Pending Admin Approval"}
                          </span>
                        </td>
                        <td className="py-4 md:py-5 px-4 md:px-6 text-right">
                          <button onClick={() => handleDeleteProduct(p.id)} className="p-2 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-4 h-4 text-red-500" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
               </div>
            )}
          </div>
        )}

        {/* ===================== HEALTHCARE DOCTORS TAB ===================== */}
        {activeTab === "doctors" && isHealthcare && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Doctors & Consultation Staff</h2>
                <p className="text-xs text-gray-400">Manage registered doctors for outpatient appointments and home visits</p>
              </div>
              <button onClick={() => setShowDoctorModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-black text-sm uppercase hover:scale-105 transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                <UserPlus className="w-4 h-4" /> Add Doctor
              </button>
            </div>

            {doctors.length === 0 ? (
              <div className="glass-card-sovereign border border-white/10 p-16 text-center rounded-2xl">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                  <Stethoscope className="text-blue-400 w-8 h-8" />
                </div>
                <h4 className="text-white font-black uppercase tracking-widest text-sm">No Doctors Registered</h4>
                <p className="text-gray-500 text-xs md:text-sm mt-2 mb-6">Add doctors to allow patients in your district to book consultations.</p>
                <button onClick={() => setShowDoctorModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold uppercase">
                  Add First Doctor
                </button>
              </div>
            ) : (
              <div className="glass-card-sovereign border border-white/10 overflow-x-auto shadow-2xl rounded-xl">
                <table className="w-full min-w-[700px] text-left border-collapse">
                  <thead>
                    <tr className="bg-white/5 text-[10px] md:text-[11px] font-black uppercase text-gray-500 tracking-widest border-b border-white/10">
                      <th className="py-4 md:py-5 px-4 md:px-6">Doctor Name</th>
                      <th className="py-4 md:py-5 px-4 md:px-6">Specialization</th>
                      <th className="py-4 md:py-5 px-4 md:px-6">Fee</th>
                      <th className="py-4 md:py-5 px-4 md:px-6">Timing</th>
                      <th className="py-4 md:py-5 px-4 md:px-6 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {doctors.map(d => (
                      <tr key={d.id} className="hover:bg-white/[0.02] transition-all group">
                        <td className="py-4 md:py-5 px-4 md:px-6">
                          <div>
                            <p className="text-xs md:text-sm font-black text-white">{d.name}</p>
                            <p className="text-[10px] md:text-xs text-gray-400">{d.qualification || "Qualified Physician"}</p>
                          </div>
                        </td>
                        <td className="py-4 md:py-5 px-4 md:px-6 text-xs text-blue-400 font-bold">{d.specialization || "General"}</td>
                        <td className="py-4 md:py-5 px-4 md:px-6 text-xs text-emerald-400 font-black">₹{d.consultationFee}</td>
                        <td className="py-4 md:py-5 px-4 md:px-6 text-xs text-gray-400">{d.timing || "Standard Hours"}</td>
                        <td className="py-4 md:py-5 px-4 md:px-6 text-right">
                          <button onClick={() => handleDeleteDoctor(d.id)} className="p-2 hover:bg-red-500/10 rounded-lg transition-all"><Trash2 className="w-4 h-4 text-red-500" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ===================== SERVICES & SPECIALTIES TAB ===================== */}
        {activeTab === "services" && (isService || isEducation) && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
            <header className="mb-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Services & Specialties</h2>
              <p className="text-xs text-gray-400">Configure your operational service offerings, service area, and business hours</p>
            </header>

            <form onSubmit={handleSaveServices} className="glass-card-sovereign border border-white/10 p-6 md:p-8 rounded-2xl space-y-6">
              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">Service Specialties / Skills</label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    placeholder="e.g. Electrician, Plumbing, Home Consultation"
                    value={serviceDetails.newSpecialty}
                    onChange={e => setServiceDetails({...serviceDetails, newSpecialty: e.target.value})}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-sm text-white"
                  />
                  <button type="button" onClick={handleAddSpecialty} className="bg-emerald-600 hover:bg-emerald-500 text-black font-bold px-4 py-2 rounded-xl text-xs uppercase">
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {serviceDetails.specialties.map((s, idx) => (
                    <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      {s}
                      <button type="button" onClick={() => handleRemoveSpecialty(idx)} className="hover:text-red-400 ml-1">×</button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">Service Area / Localities Covered</label>
                <input
                  type="text"
                  placeholder="e.g. Entire Shahdol City, Kotma, Sohagpur"
                  value={serviceDetails.serviceArea}
                  onChange={e => setServiceDetails({...serviceDetails, serviceArea: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">Working Hours</label>
                <input
                  type="text"
                  placeholder="e.g. 9:00 AM - 8:00 PM (Mon-Sat)"
                  value={serviceDetails.serviceHours}
                  onChange={e => setServiceDetails({...serviceDetails, serviceHours: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white"
                />
              </div>

              <div>
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">Service Description / Offerings</label>
                <textarea
                  value={serviceDetails.description}
                  onChange={e => setServiceDetails({...serviceDetails, description: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-white min-h-[100px]"
                  placeholder="Describe your professional services, experience, and certifications..."
                />
              </div>

              <button type="submit" className="w-full bg-emerald-600 text-black py-3 rounded-xl font-black text-sm uppercase hover:bg-emerald-500 transition-all">
                Save Service Profile
              </button>
            </form>
          </div>
        )}

        {/* ===================== INQUIRIES & APPOINTMENTS TAB ===================== */}
        {activeTab === "inquiries" && (isHealthcare || isService || isEducation) && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
            <div>
              <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4">Customer Inquiries & Appointments</h2>

              {inquiries.length === 0 && appointments.length === 0 ? (
                <div className="glass-card-sovereign border border-white/10 p-16 text-center rounded-2xl">
                  <Calendar className="text-gray-600 w-12 h-12 mx-auto mb-4" />
                  <h4 className="text-white font-black uppercase tracking-widest text-sm">No Pending Inquiries</h4>
                  <p className="text-gray-500 text-xs md:text-sm mt-2">New leads and customer consultation requests will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {appointments.map((appt: any) => (
                    <div key={appt.id} className="glass-card-sovereign p-5 border border-white/10 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">Appointment</span>
                          <span className="text-sm font-bold text-white">{appt.customerName}</span>
                          <span className="text-xs text-gray-400">({appt.customerPhone})</span>
                        </div>
                        <p className="text-xs text-gray-300 mt-1">{appt.serviceType || "Consultation"} {appt.notes ? `— "${appt.notes}"` : ""}</p>
                        {appt.preferredDate && (
                          <p className="text-[11px] text-gray-500 mt-0.5">Preferred: {new Date(appt.preferredDate).toLocaleDateString()}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={`tel:${appt.customerPhone}`} className="bg-emerald-600 hover:bg-emerald-500 text-black px-3 py-1.5 rounded-lg text-xs font-bold uppercase inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                      </div>
                    </div>
                  ))}

                  {inquiries.map((inq: any) => (
                    <div key={inq.id} className="glass-card-sovereign p-5 border border-white/10 rounded-xl flex flex-col md:flex-row justify-between md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">Inquiry</span>
                          <span className="text-sm font-bold text-white">{inq.customerName || "Customer"}</span>
                          <span className="text-xs text-gray-400">({inq.customerPhone})</span>
                        </div>
                        <p className="text-xs text-gray-300 mt-1">{inq.message || inq.serviceType || "Service Inquiry"}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">{new Date(inq.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <a href={`tel:${inq.customerPhone}`} className="bg-emerald-600 hover:bg-emerald-500 text-black px-3 py-1.5 rounded-lg text-xs font-bold uppercase inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================== RETAIL ORDERS TAB ===================== */}
        {activeTab === "orders" && isRetail && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             <header className="mb-6">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Live Orders</h2>
             </header>

             {orders.length === 0 ? (
                <div className="glass-card-sovereign border border-white/10 p-16 text-center rounded-2xl">
                   <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                     <Clock className="text-gray-600 w-8 h-8" />
                   </div>
                   <h4 className="text-white font-black uppercase tracking-widest text-sm">No Live Orders</h4>
                   <p className="text-gray-500 text-xs md:text-sm mt-2">Incoming orders will appear here in real-time.</p>
                </div>
             ) : (
                <div className="glass-card-sovereign border border-white/10 overflow-x-auto shadow-2xl rounded-xl">
                  <table className="w-full min-w-[900px] text-left border-collapse">
                   <thead>
                     <tr className="bg-white/5 text-[10px] md:text-[11px] font-black uppercase text-gray-500 tracking-widest border-b border-white/10">
                       <th className="py-4 md:py-5 px-4 md:px-6">Order ID</th>
                       <th className="py-4 md:py-5 px-4 md:px-6">Customer</th>
                       <th className="py-4 md:py-5 px-4 md:px-6">Product</th>
                       <th className="py-4 md:py-5 px-4 md:px-6">Qty</th>
                       <th className="py-4 md:py-5 px-4 md:px-6">Amount</th>
                       <th className="py-4 md:py-5 px-4 md:px-6">Status</th>
                       <th className="py-4 md:py-5 px-4 md:px-6">Created Time</th>
                       <th className="py-4 md:py-5 px-4 md:px-6 text-right">Actions</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-white/5">
                     {orders.map(o => (
                       <tr key={o.id} className="hover:bg-white/[0.02] transition-all group">
                         <td className="py-4 md:py-5 px-4 md:px-6 font-mono text-xs font-bold text-amber-500">#{o.id}</td>
                         <td className="py-4 md:py-5 px-4 md:px-6">
                           <div>
                             <p className="text-xs md:text-sm font-black text-white">{o.customerName || "Walk-in Customer"}</p>
                             <p className="text-[10px] md:text-xs text-gray-500">{o.customerPhone || ""}</p>
                           </div>
                         </td>
                         <td className="py-4 md:py-5 px-4 md:px-6">
                           <p className="text-xs md:text-sm font-black text-white">{o.product?.title || `Product #${o.productId}`}</p>
                         </td>
                         <td className="py-4 md:py-5 px-4 md:px-6 font-bold text-xs">{o.quantity}</td>
                         <td className="py-4 md:py-5 px-4 md:px-6 font-black text-xs text-emerald-500">₹{o.totalPrice}</td>
                         <td className="py-4 md:py-5 px-4 md:px-6">
                           <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase ${
                             o.status === "delivered" || o.status === "completed"
                               ? "text-emerald-500 bg-emerald-500/10"
                               : o.status === "cancelled" || o.status === "failed"
                               ? "text-red-500 bg-red-500/10"
                               : o.status === "preparing"
                               ? "text-orange-400 bg-orange-400/10 animate-pulse"
                               : o.status === "ready"
                               ? "text-teal-400 bg-teal-400/10 animate-pulse"
                               : o.status === "accepted"
                               ? "text-indigo-400 bg-indigo-400/10 animate-pulse"
                               : "text-amber-500 bg-amber-500/10 animate-pulse"
                           }`}>
                             {o.status}
                           </span>
                         </td>
                         <td className="py-4 md:py-5 px-4 md:px-6 text-xs text-gray-500 font-medium">
                           {new Date(o.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                         </td>
                         <td className="py-4 md:py-5 px-4 md:px-6 text-right">
                           <div className="flex items-center justify-end gap-2">
                             {o.status === "pending" && (
                               <>
                                 <button onClick={() => handleUpdateStatus(o.id, "accepted")} className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-black uppercase transition-all">Accept</button>
                                 <button onClick={() => handleUpdateStatus(o.id, "cancelled")} className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-black uppercase transition-all border border-red-500/20">Cancel</button>
                               </>
                             )}
                             {o.status === "accepted" && (
                               <>
                                 <button onClick={() => handleUpdateStatus(o.id, "preparing")} className="px-2.5 py-1 rounded bg-orange-600 hover:bg-orange-500 text-black text-xs font-black uppercase transition-all">Prepare</button>
                                 <button onClick={() => handleUpdateStatus(o.id, "cancelled")} className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-black uppercase transition-all border border-red-500/20">Cancel</button>
                               </>
                             )}
                             {o.status === "preparing" && (
                               <button onClick={() => handleUpdateStatus(o.id, "ready")} className="px-2.5 py-1 rounded bg-teal-600 hover:bg-teal-500 text-black text-xs font-black uppercase transition-all">Ready</button>
                             )}
                             {o.status === "ready" && (
                               <button onClick={() => handleUpdateStatus(o.id, "delivered")} className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-500 text-black text-xs font-black uppercase transition-all">Deliver</button>
                             )}
                             {["delivered", "completed", "cancelled", "failed"].includes(o.status) && (
                               <span className="text-xs text-gray-500 font-bold uppercase mr-2">Done</span>
                             )}
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

        {/* ===================== SETTINGS TAB ===================== */}
        {activeTab === "settings" && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
             <header className="mb-6">
                <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Account Settings</h2>
             </header>
             <form onSubmit={handleSaveSettings} className="glass-card-sovereign border border-white/10 p-6 md:p-8 rounded-2xl space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">Business / Practice Name</label>
                    <input type="text" disabled value={storeSettings.shopName} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm text-gray-400 cursor-not-allowed" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">Contact Phone</label>
                    <input type="text" value={storeSettings.phone} onChange={e => setStoreSettings({...storeSettings, phone: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-emerald-500/50 text-white" />
                  </div>
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-2">Complete Address</label>
                    <textarea value={storeSettings.address} onChange={e => setStoreSettings({...storeSettings, address: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-sm focus:border-emerald-500/50 text-white min-h-[100px]"></textarea>
                  </div>
                  <button type="submit" className="w-full bg-emerald-600 text-black py-3 rounded-xl font-black text-sm uppercase hover:bg-emerald-500 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)] mt-4">
                    Save Changes
                  </button>
                </div>
             </form>
          </div>
        )}

        {/* ===================== ADD PRODUCT MODAL (RETAIL ONLY) ===================== */}
        {showAddModal && isRetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <form onSubmit={handleAddProduct} className="bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
              <button type="button" onClick={() => setShowAddModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><XCircle className="w-6 h-6" /></button>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Add New Product</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Product Name *</label>
                  <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Selling Price (₹) *</label>
                    <input required type="number" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">MRP / Original (₹)</label>
                    <input type="number" placeholder="Optional" value={newProduct.mrp} onChange={e => setNewProduct({...newProduct, mrp: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Category *</label>
                  <input required type="text" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Product Description</label>
                  <textarea rows={3} placeholder="Describe product details, condition, warranty..." value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-sm text-white resize-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Product Photos (Up to 4)</label>
                  {((newProduct.images && newProduct.images.length > 0) || newProduct.imageUrl) && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                      {(newProduct.images?.length ? newProduct.images : [newProduct.imageUrl]).map((img, idx) => (
                        <div key={idx} className="relative group">
                          <img src={img} className="w-12 h-12 rounded-lg object-cover border border-orange-500/50" />
                          <button type="button" onClick={() => handleRemoveImage(idx)} className="absolute -top-1.5 -right-1.5 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold">×</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <input type="file" multiple onChange={handleImageUpload} accept="image/*" className="text-xs text-gray-400 file:bg-orange-600 file:text-black file:rounded-lg file:border-0 file:px-4 file:py-1.5" />
                  {uploading && <p className="text-[10px] text-orange-500 animate-pulse mt-1.5">Processing in Cloudinary...</p>}
                </div>
                <button type="submit" className="w-full bg-orange-600 text-black py-2.5 rounded-xl font-black text-sm uppercase mt-3 hover:scale-[1.02] transition-transform">
                  Submit for Approval
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ===================== ADD DOCTOR MODAL (HEALTHCARE ONLY) ===================== */}
        {showDoctorModal && isHealthcare && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <form onSubmit={handleAddDoctor} className="bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl relative">
              <button type="button" onClick={() => setShowDoctorModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><XCircle className="w-6 h-6" /></button>
              <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Add Doctor / Specialist</h3>

              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Doctor Full Name</label>
                  <input required type="text" placeholder="Dr. Firstname Lastname" value={newDoctor.name} onChange={e => setNewDoctor({...newDoctor, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Specialization</label>
                  <input type="text" placeholder="e.g. General Physician, Pediatrician, Home Visit" value={newDoctor.specialization} onChange={e => setNewDoctor({...newDoctor, specialization: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Qualification</label>
                  <input type="text" placeholder="e.g. MBBS, MD" value={newDoctor.qualification} onChange={e => setNewDoctor({...newDoctor, qualification: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Fee (₹)</label>
                    <input type="number" placeholder="500" value={newDoctor.consultationFee} onChange={e => setNewDoctor({...newDoctor, consultationFee: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Experience (Yrs)</label>
                    <input type="number" placeholder="5" value={newDoctor.experience} onChange={e => setNewDoctor({...newDoctor, experience: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1">Timing / Availability</label>
                  <input type="text" placeholder="e.g. 10:00 AM - 2:00 PM, Home Visit On Request" value={newDoctor.timing} onChange={e => setNewDoctor({...newDoctor, timing: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white" />
                </div>
                <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-black text-sm uppercase mt-4 hover:bg-blue-500 transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)]">
                  Save Doctor Profile
                </button>
              </div>
            </form>
          </div>
        )}

      </main>

      <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden fixed bottom-6 right-6 p-4 bg-orange-500 text-black rounded-full shadow-2xl z-50">
        <Menu className="w-6 h-6" />
      </button>

    </div>
  );
}
