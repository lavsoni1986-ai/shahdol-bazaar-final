import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, persistPortalContext } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, LogOut, User, Package, Edit3, Trash2, MapPin, Check, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Order = {
  id?: number;
  quantity?: number;
  totalPrice?: string;
  status?: string;
  customerPhone?: string;
  customerAddress?: string;
};

const orange = "#f97316";

export default function CustomerDashboard() {
  const { user, isAuthenticated, loading, logout, checkAuth } = useAuth();
  const [, setLocation] = useLocation();

  // -----------------------------
  // AUTH GATE
  // -----------------------------
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      console.log("[CDASH] unauthenticated -> redirect auth");
      setLocation("/auth?return=/customer-dashboard");
    }
  }, [loading, isAuthenticated, setLocation]);

  // -----------------------------
  // PROFILE & ADDRESSES STATE
  // -----------------------------
  const [profileData, setProfileData] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [profileLoading, setProfileLoading] = useState(true);
  const [addressesLoading, setAddressesLoading] = useState(true);

  // Edit Profile form state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ fullName: "", phone: "" });
  const [profileUpdating, setProfileUpdating] = useState(false);

  // Address form state
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
  const [addressForm, setAddressForm] = useState({
    streetAddress: "",
    houseNumber: "",
    landmark: "",
    village: "",
    ward: "",
    city: "",
    districtName: "",
    state: "",
    postalCode: "",
    isDefault: false
  });
  const [addressSubmitting, setAddressSubmitting] = useState(false);

  // -----------------------------
  // FETCH PROFILE & ADDRESSES
  // -----------------------------
  const fetchProfileAndAddresses = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setProfileLoading(true);
      const res = await apiRequest("GET", "/customer/profile");
      const data = res?.data ?? res;
      setProfileData(data);
      if (data) {
        setProfileForm({
          fullName: data.fullName || "",
          phone: data.phone || ""
        });
      }
    } catch (e) {
      console.error("Failed to load customer profile", e);
    } finally {
      setProfileLoading(false);
    }

    try {
      setAddressesLoading(true);
      const res = await apiRequest("GET", "/customer/addresses");
      setAddresses(res?.data ?? res ?? []);
    } catch (e) {
      console.error("Failed to load customer addresses", e);
    } finally {
      setAddressesLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      fetchProfileAndAddresses();
    }
  }, [loading, isAuthenticated, fetchProfileAndAddresses]);

  // -----------------------------
  // ORDERS STATE
  // -----------------------------
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  // -----------------------------
  // FETCH ORDERS
  // -----------------------------
  const fetchOrders = useCallback(async () => {
    const phoneToUse = profileData?.phone || user?.phone || "";
    if (!phoneToUse) return;
    console.log("[CDASH] fetching orders");

    try {
      setOrdersLoading(true);
      setOrdersError("");

      const res = await apiRequest(
        "GET",
        `/orders?phone=${encodeURIComponent(phoneToUse)}`
      );

      const payload = res?.data || res || [];
      setOrders(Array.isArray(payload) ? payload : []);
    } catch (err: any) {
      console.error("[CDASH] order fetch failed", err);
      setOrders([]);
      setOrdersError("Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  }, [profileData?.phone, user?.phone]);

  // Fetch orders when profile or auth loads phone
  useEffect(() => {
    const phoneToUse = profileData?.phone || user?.phone || "";
    if (!loading && isAuthenticated && phoneToUse) {
      fetchOrders();
    }
  }, [loading, isAuthenticated, profileData?.phone, user?.phone, fetchOrders]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.fullName || !profileForm.phone) return;
    try {
      setProfileUpdating(true);
      const res = await apiRequest("PATCH", "/customer/profile", profileForm);
      setProfileData(res?.data ?? res);
      setIsEditingProfile(false);
      await checkAuth(); // Sync globally
      fetchProfileAndAddresses();
    } catch (err) {
      console.error("Failed to update profile", err);
    } finally {
      setProfileUpdating(false);
    }
  };

  const handleAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressForm.streetAddress) return;
    try {
      setAddressSubmitting(true);
      if (editingAddressId) {
        await apiRequest("PATCH", `/customer/addresses/${editingAddressId}`, addressForm);
      } else {
        await apiRequest("POST", "/customer/addresses", addressForm);
      }
      setShowAddressForm(false);
      setEditingAddressId(null);
      setAddressForm({
        streetAddress: "",
        houseNumber: "",
        landmark: "",
        village: "",
        ward: "",
        city: "",
        districtName: "",
        state: "",
        postalCode: "",
        isDefault: false
      });
      fetchProfileAndAddresses();
    } catch (err) {
      console.error("Failed to save address", err);
    } finally {
      setAddressSubmitting(false);
    }
  };

  const handleSetDefaultAddress = async (id: number) => {
    try {
      await apiRequest("PATCH", `/customer/addresses/${id}`, { isDefault: true });
      fetchProfileAndAddresses();
    } catch (err) {
      console.error("Failed to set default address", err);
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!confirm("क्या आप वाकई इस पते को हटाना चाहते हैं?")) return;
    try {
      await apiRequest("DELETE", `/customer/addresses/${id}`);
      fetchProfileAndAddresses();
    } catch (err) {
      console.error("Failed to delete address", err);
    }
  };

  const startEditAddress = (addr: any) => {
    setEditingAddressId(addr.id);
    setAddressForm({
      streetAddress: addr.streetAddress || "",
      houseNumber: addr.houseNumber || "",
      landmark: addr.landmark || "",
      village: addr.village || "",
      ward: addr.ward || "",
      city: addr.city || "",
      districtName: addr.districtName || "",
      state: addr.state || "",
      postalCode: addr.postalCode || "",
      isDefault: addr.isDefault || false
    });
    setShowAddressForm(true);
  };

  // -----------------------------
  // LOGOUT
  // -----------------------------
  const handleLogout = async () => {
    await logout();
    setLocation("/auth");
  };

  // Preserve merchant context on merchant pages
  useEffect(() => {
    const currentPath = window.location.pathname;
    const isPartnerContext =
      currentPath.includes("/partner") ||
      currentPath.includes("/merchant");

    if (isPartnerContext) {
      persistPortalContext("partner");
    }
  }, []);

  // -----------------------------
  // RENDER GATES
  // -----------------------------
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <Loader2 className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Redirecting...
      </div>
    );
  }

  // -----------------------------
  // FINAL UI
  // -----------------------------
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6 md:p-8 space-y-6">
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black">Customer Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome back, {profileData?.fullName || user?.username || "Customer"}</p>
        </div>

        <Button
          onClick={handleLogout}
          variant="destructive"
          className="flex items-center gap-2 hover:bg-red-700"
        >
          <LogOut size={16} />
          Logout
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* PROFILE CARD */}
        <div className="bg-white rounded-2xl shadow border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-bold">
              <User size={18} color={orange} />
              प्रोफ़ाइल प्रबंधन / Profile Management
            </div>
            {!isEditingProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditingProfile(true)}
                className="text-xs flex items-center gap-1"
              >
                <Edit3 size={12} />
                Edit Profile
              </Button>
            )}
          </div>

          {profileLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="animate-spin text-orange-500" size={24} />
            </div>
          ) : isEditingProfile ? (
            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">पूरा नाम / Full Name</Label>
                <Input
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                  className="bg-slate-50 border-slate-300"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">फ़ोन नंबर / WhatsApp Phone</Label>
                <Input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  className="bg-slate-50 border-slate-300"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={profileUpdating}
                  className="bg-[#f97316] hover:bg-[#ea580c] text-white text-xs px-4 h-8"
                >
                  {profileUpdating && <Loader2 className="animate-spin h-3 w-3 mr-1" />}
                  Save
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsEditingProfile(false)}
                  className="text-xs px-4 h-8"
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-2 text-sm">
              <p><strong>पूरा नाम / Full Name:</strong> {profileData?.fullName || "Not completed"}</p>
              <p><strong>फ़ोन नंबर / Phone:</strong> {profileData?.phone || "Not completed"}</p>
              {(!profileData?.fullName || !profileData?.phone) && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs p-3 rounded-lg flex items-center gap-2 mt-2">
                  <span>⚠️ कृपया अपना नाम और फोन नंबर दर्ज करने के लिए 'Edit Profile' पर क्लिक करें।</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ADDRESS BOOK CARD */}
        <div className="bg-white rounded-2xl shadow border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-bold">
              <MapPin size={18} color={orange} />
              पता पुस्तिका / Address Book
            </div>
            {!showAddressForm && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingAddressId(null);
                  setAddressForm({
                    streetAddress: "",
                    houseNumber: "",
                    landmark: "",
                    village: "",
                    ward: "",
                    city: "",
                    districtName: "",
                    state: "",
                    postalCode: "",
                    isDefault: false
                  });
                  setShowAddressForm(true);
                }}
                className="text-xs flex items-center gap-1"
              >
                <Plus size={12} />
                Add Address
              </Button>
            )}
          </div>

          {addressesLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="animate-spin text-orange-500" size={24} />
            </div>
          ) : showAddressForm ? (
            <form onSubmit={handleAddressSubmit} className="space-y-3 max-h-80 overflow-y-auto pr-1">
              <div className="space-y-1">
                <Label className="text-xs">गली का पता / Street Address *</Label>
                <Textarea
                  value={addressForm.streetAddress}
                  onChange={(e) => setAddressForm({ ...addressForm, streetAddress: e.target.value })}
                  placeholder="मकान नंबर, गली..."
                  className="bg-slate-50 border-slate-300 text-xs h-12"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-505">मकान नंबर</Label>
                  <Input
                    value={addressForm.houseNumber}
                    onChange={(e) => setAddressForm({ ...addressForm, houseNumber: e.target.value })}
                    className="bg-slate-50 border-slate-300 text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-505">सीमाचिह्न</Label>
                  <Input
                    value={addressForm.landmark}
                    onChange={(e) => setAddressForm({ ...addressForm, landmark: e.target.value })}
                    className="bg-slate-50 border-slate-300 text-xs h-8"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-505">गाँव</Label>
                  <Input
                    value={addressForm.village}
                    onChange={(e) => setAddressForm({ ...addressForm, village: e.target.value })}
                    className="bg-slate-50 border-slate-300 text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-505">वार्ड</Label>
                  <Input
                    value={addressForm.ward}
                    onChange={(e) => setAddressForm({ ...addressForm, ward: e.target.value })}
                    className="bg-slate-50 border-slate-300 text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-505">शहर</Label>
                  <Input
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="bg-slate-50 border-slate-300 text-xs h-8"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-505">जिला</Label>
                  <Input
                    value={addressForm.districtName}
                    onChange={(e) => setAddressForm({ ...addressForm, districtName: e.target.value })}
                    className="bg-slate-50 border-slate-300 text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-505">राज्य</Label>
                  <Input
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="bg-slate-50 border-slate-300 text-xs h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-505">पिन कोड</Label>
                  <Input
                    value={addressForm.postalCode}
                    onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                    className="bg-slate-50 border-slate-300 text-xs h-8"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="dashIsDefault"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="accent-[#f97316]"
                />
                <Label htmlFor="dashIsDefault" className="text-xs cursor-pointer">सेट डिफ़ॉल्ट / Set as default</Label>
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="submit"
                  disabled={addressSubmitting}
                  className="bg-[#f97316] hover:bg-[#ea580c] text-white text-xs px-4 h-8"
                >
                  {addressSubmitting && <Loader2 className="animate-spin h-3 w-3 mr-1" />}
                  Save Address
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowAddressForm(false)}
                  className="text-xs px-4 h-8"
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : addresses.length === 0 ? (
            <div className="text-center text-xs text-slate-400 py-6 border border-dashed rounded-lg">
              कोई पता सहेजा नहीं गया है / No addresses saved yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {addresses.map((addr) => (
                <div key={addr.id} className="p-3 border rounded-lg bg-slate-50 space-y-2 text-xs relative">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#f97316]">{addr.type} ADDRESS</span>
                    {addr.isDefault && (
                      <span className="bg-green-50 text-green-700 border border-green-200 px-1.5 py-0.5 rounded text-[10px] font-bold">Default</span>
                    )}
                  </div>
                  <p className="text-slate-700">{addr.streetAddress}</p>
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-200">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => startEditAddress(addr)}
                      className="h-6 text-[10px] px-2 flex items-center gap-1 text-slate-600 hover:bg-slate-200"
                    >
                      <Edit3 size={10} />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteAddress(addr.id)}
                      className="h-6 text-[10px] px-2 flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 size={10} />
                      Delete
                    </Button>
                    {!addr.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefaultAddress(addr.id)}
                        className="h-6 text-[10px] px-2 text-[#f97316] hover:bg-[#f97316]/5 ml-auto"
                      >
                        Make Default
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ORDERS HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-bold">
          <Package size={18} color={orange} />
          Your Orders
        </div>

        <Button
          onClick={fetchOrders}
          style={{ backgroundColor: orange }}
          className="text-white flex items-center gap-2"
        >
          <RefreshCw size={15} />
          Refresh
        </Button>
      </div>

      {/* ORDERS BODY */}
      {ordersLoading && (
        <div className="bg-white rounded-2xl shadow border p-8 flex items-center justify-center">
          <Loader2 className="animate-spin text-orange-500" size={30} />
        </div>
      )}

      {!ordersLoading && ordersError && (
        <div className="bg-red-50 text-red-600 border rounded-2xl p-6">
          {ordersError}
        </div>
      )}

      {!ordersLoading && !ordersError && orders.length === 0 && (
        <div className="bg-white rounded-2xl shadow border p-8 text-center text-slate-500">
          No orders found yet.
        </div>
      )}

      {!ordersLoading && orders.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {orders.map((order, idx) => (
            <div key={order.id || idx} className="bg-white rounded-2xl shadow border p-5 space-y-2">
              <p className="font-bold">Order #{order.id || idx + 1}</p>
              <p>Status: {order.status || "pending"}</p>
              <p>Qty: {order.quantity || 0}</p>
              <p>Total: ₹{order.totalPrice || "0"}</p>
              <p>Phone: {order.customerPhone || "-"}</p>
              <p>Address: {order.customerAddress || "-"}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}