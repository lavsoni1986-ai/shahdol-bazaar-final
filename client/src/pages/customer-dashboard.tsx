import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Link as WLink, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, Package, User, MapPin, Phone, RefreshCw, LogOut, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Order = {
  id?: number;
  productId: number;
  shopId: number;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  quantity: number;
  totalPrice: string;
  status: string;
  createdAt?: string;
};

const orange = "#f97316";

export default function CustomerDashboard() {
  const { toast } = useToast();
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [location, setLocation] = useLocation();

  // fetchOrders - moved to top near useAuth
  const fetchOrders = useCallback(async (phoneNumber: string) => {
    if (!phoneNumber) {
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/orders?phone=${encodeURIComponent(phoneNumber)}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Failed to load orders" }));
        throw new Error(errorData.message || "Failed to load orders");
      }
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast({ 
        title: "Failed to load orders", 
        description: e?.message || "Try again", 
        variant: "destructive" 
      });
      setOrders([]); // Clear orders on error
    } finally {
      setLoading(false);
    }
  }, []); // Stable function reference

  // Guards to prevent infinite loops
  const userDataInitRef = useRef(false);
  const authRedirectedRef = useRef(false);

  // Early return if still loading or not authenticated - MUST BE BEFORE ANY HOOKS
  if (authLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-orange-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  // SIMPLE AUTH GUARD - Redirect to /auth if not authenticated (moved after early return)
  useEffect(() => {
    if (!authLoading && !isAuthenticated && !authRedirectedRef.current) {
      authRedirectedRef.current = true;
      setLocation("/auth?return=/customer-dashboard");
    }
  }, [authLoading, isAuthenticated, setLocation]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  
  // Check for tab query parameter
  const getInitialTab = (): "orders" | "profile" => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    return tab === "profile" ? "profile" : "orders";
  };
  
  // Use constant default - initialize from URL in useEffect
  const [activeTab, setActiveTab] = useState<"orders" | "profile">("orders");
  
  // Initialize tab from URL on mount only
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "profile") {
      setActiveTab("profile");
    }
  }, []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Get customer data from AuthContext user directly
  const [customerData, setCustomerData] = useState<any>(() => user || {});
  
  // Sync customerData when user changes from AuthContext
  useEffect(() => {
    if (user) {
      setCustomerData(user);
    }
  }, [user]);
  
  // Get phone from AuthContext user or localStorage
  const [phone, setPhone] = useState<string>(() => {
    // Get from user first (AuthContext)
    const userAny = user as any;
    const fromUser = userAny?.phone || userAny?.contactNumber;
    if (fromUser) return fromUser;
    // Fallback to localStorage
    try {
      return localStorage.getItem("customerPhone") || "";
    } catch {
      return "";
    }
  });
  
  // Initialize profile from AuthContext user
  const [profile, setProfile] = useState(() => {
    const userAny = user as any;
    return {
      name: userAny?.name || userAny?.username || "",
      phone: userAny?.phone || userAny?.contactNumber || "",
      address: userAny?.address || userAny?.shopAddress || "",
    };
  });
  
  // Update profile when user changes
  useEffect(() => {
    const userAny = user as any;
    setProfile({
      name: userAny?.name || userAny?.username || "",
      phone: userAny?.phone || userAny?.contactNumber || "",
      address: userAny?.address || userAny?.shopAddress || "",
    });
    // Also set phone
    const userPhone = userAny?.phone || userAny?.contactNumber || "";
    if (userPhone) {
      setPhone(userPhone);
    }
  }, [user]);
  
  // Initialize user data - only once when user is available
  useEffect(() => {
    if (userDataInitRef.current || !user || !isAuthenticated) return;
    userDataInitRef.current = true;
    
    // Update customer data from user (cast to any for additional fields)
    const userData = user as any;
    setCustomerData((prev: any) => ({ ...prev, ...userData }));
    setProfile({
      name: userData?.name || userData?.username || "",
      phone: userData?.phone || userData?.contactNumber || "",
      address: userData?.address || userData?.shopAddress || "",
    });
    
    // Set phone for orders and fetch
    const customerPhone = userData?.phone || userData?.contactNumber || "";
    if (customerPhone) {
      setPhone(customerPhone);
      localStorage.setItem("customerPhone", customerPhone);
    }
  }, [user, isAuthenticated]);
  
  // Update active tab when query parameter changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "profile") {
      setActiveTab("profile");
    } else if (tab === "orders") {
      setActiveTab("orders");
    }
  }, [location]);

  // Fetch orders when phone is available - prevent infinite loops
  const ordersFetchedRef = useRef<string>("");
  
  useEffect(() => {
    // Only fetch if authenticated, phone changed and is available
    if (isAuthenticated && phone && phone !== ordersFetchedRef.current) {
      ordersFetchedRef.current = phone;
      fetchOrders(phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, phone]);

  // Memoize orders list to prevent re-calculation on tab changes
  const memoizedOrders = useMemo(() => orders || [], [orders]);
  
  const orderSkeletons = useMemo(
    () =>
      Array.from({ length: 4 }).map((_, idx) => (
        <div key={idx} className="bg-white border rounded-xl p-4 shadow-sm animate-pulse space-y-3">
          <div className="h-4 bg-slate-200 rounded w-1/3" />
          <div className="h-4 bg-slate-200 rounded w-1/2" />
          <div className="h-6 bg-slate-200 rounded w-1/4" />
          <div className="h-10 bg-slate-200 rounded" />
        </div>
      )),
    []
  );

  const handleProfileSave = async () => {
    // Auth is handled by cookies - API will return 401 if not authenticated
    try {
      setSavingProfile(true);
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: profile.name,
          phone: profile.phone,
          address: profile.address,
          contactNumber: profile.phone,
          shopAddress: profile.address,
        }),
      });
      
      if (response.status === 401) {
        toast({
          title: "Session expired",
          description: "Please log in again",
          variant: "destructive",
        });
        setLocation("/auth?return=/customer-dashboard");
        return;
      }
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to update profile" }));
        throw new Error(error.message || "Failed to update profile");
      }
      
      // Update local user data
      const userStr = localStorage.getItem("user");
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          const updatedUser = {
            ...user,
            name: profile.name || user.name,
            username: profile.name || user.username,
            phone: profile.phone || user.phone,
            contactNumber: profile.phone || user.contactNumber,
            address: profile.address || user.address,
            shopAddress: profile.address || user.shopAddress,
          };
          localStorage.setItem("user", JSON.stringify(updatedUser));
          setCustomerData(updatedUser);
          
          // Update phone for orders if changed
          if (profile.phone && profile.phone !== phone) {
            setPhone(profile.phone);
            localStorage.setItem("customerPhone", profile.phone);
            fetchOrders(profile.phone);
          }
        } catch (e) {
          console.error("Error updating local user data:", e);
        }
      }
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
      sonnerToast.success("Profile updated successfully!");
    } catch (error: any) {
      console.error("Profile update error:", error);
      toast({
        title: "Failed to update profile",
        description: error?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };
  
  const handleLogout = async () => {
    // SECURITY: Use httpOnly cookies - no localStorage token to clear
    console.log("🔴 [LOGOUT] User initiated logout from customer dashboard");
    
    // Use AuthContext logout (clears httpOnly cookies)
    await logout();
    
    // Clear only customer-specific localStorage (phone for orders)
    localStorage.removeItem("customerPhone");
    
    sonnerToast.success("Logged out successfully");
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b flex items-center justify-between px-4 py-3 shadow-sm">
        <div className="font-black text-slate-800 flex items-center gap-2">
          <User color={orange} size={20} /> My Dashboard
        </div>
        <button
          aria-label="Toggle menu"
          onClick={() => setSidebarOpen((s) => !s)}
          className="p-2 rounded-lg border text-slate-700"
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={`w-64 bg-white border-r p-6 space-y-4 md:static fixed top-14 left-0 h-[calc(100%-56px)] md:h-auto z-20 transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="hidden md:flex font-bold items-center gap-2 mb-6">
          <User style={{ color: orange }} /> My Account
        </div>
        {customerData && (
          <div className="mb-4 pb-4 border-b">
            <p className="text-sm font-bold text-slate-800">
              {customerData.name || customerData.username || "Customer"}
            </p>
            <p className="text-xs text-slate-500">{customerData.phone || customerData.contactNumber || ""}</p>
          </div>
        )}
        <Button
          variant={activeTab === "orders" ? "default" : "ghost"}
          className="w-full justify-start gap-2"
          style={activeTab === "orders" ? { backgroundColor: orange, color: "#fff" } : {}}
          onClick={() => {
            setActiveTab("orders");
            setSidebarOpen(false);
          }}
        >
          <Package size={18} /> Orders
        </Button>
        <Button
          variant={activeTab === "profile" ? "default" : "ghost"}
          className="w-full justify-start gap-2"
          style={activeTab === "profile" ? { backgroundColor: orange, color: "#fff" } : {}}
          onClick={() => {
            setActiveTab("profile");
            setSidebarOpen(false);
          }}
        >
          <User size={18} /> Profile
        </Button>
        <div className="pt-4 border-t">
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={handleLogout}
          >
            <LogOut size={18} /> Logout
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 pt-16 md:pt-8 space-y-6 z-10">
        {/* Fallback: if no tab matches, default to orders */}
        {(!activeTab || activeTab === "orders") && (
          <div className="space-y-4">
            <div className="bg-white border rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-800">Order History</p>
                <p className="text-xs text-slate-500">Track your recent orders and status</p>
              </div>
              <div className="flex flex-col md:flex-row gap-2 items-start md:items-center">
                <input
                  className="border rounded-lg px-3 py-2 text-sm w-56"
                  placeholder="Enter phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Button
                  style={{ backgroundColor: orange }}
                  disabled={!phone}
                  onClick={() => {
                    localStorage.setItem("customerPhone", phone);
                    fetchOrders(phone);
                  }}
                >
                  Refresh Orders <RefreshCw size={14} className="ml-2" />
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{orderSkeletons}</div>
            ) : !memoizedOrders || memoizedOrders.length === 0 ? (
              <div className="bg-white border rounded-xl p-8 text-center space-y-3 shadow-sm">
                <p className="text-lg font-bold text-slate-800">No orders yet</p>
                <p className="text-sm text-slate-600">Start shopping to place your first order.</p>
                <WLink href="/">
                  <Button style={{ backgroundColor: orange }}>Start Shopping</Button>
                </WLink>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {memoizedOrders?.map((order) => (
                  <div key={order.id} className="bg-white border rounded-xl p-4 shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-800">Order #{order.id}</div>
                      <span
                        className={`text-xs font-bold px-3 py-1 rounded-full ${
                          order.status === "delivered"
                            ? "bg-green-50 text-green-700"
                            : "bg-orange-50 text-orange-700"
                        }`}
                      >
                        {order.status || "pending"}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">
                      Qty: {order.quantity} | Total: ₹{order.totalPrice}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin size={14} /> {order.customerAddress || "Address not provided"}
                    </p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <Phone size={14} /> {order.customerPhone}
                    </p>
                    <div className="flex justify-end">
                      <Button style={{ backgroundColor: orange }}>Track Order</Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "profile" && (
          <div className="space-y-4">
            <div className="bg-white border rounded-xl p-6 shadow-sm space-y-3">
              <p className="text-lg font-bold text-slate-800">Profile</p>
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Full Name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
              <input
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
              <textarea
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Address"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset to original values
                    const userRaw = localStorage.getItem("user");
                    if (userRaw) {
                      try {
                        const user = JSON.parse(userRaw);
                        setProfile({
                          name: user?.name || user?.username || "",
                          phone: user?.phone || user?.contactNumber || "",
                          address: user?.address || user?.shopAddress || "",
                        });
                      } catch {}
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  style={{ backgroundColor: orange }}
                  onClick={handleProfileSave}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={16} /> Saving...
                    </>
                  ) : (
                    "Save Profile"
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
