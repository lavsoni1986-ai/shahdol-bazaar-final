import React, { useEffect, useMemo, useState } from "react";
import { Link as WLink } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, Package, User, MapPin, Phone, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"orders" | "profile">("orders");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState(() => localStorage.getItem("customerPhone") || "");
  const [profile, setProfile] = useState(() => {
    const userRaw = localStorage.getItem("user");
    const user = userRaw ? JSON.parse(userRaw) : {};
    return {
      name: user?.name || user?.username || "",
      phone: user?.phone || "",
      address: user?.address || "",
    };
  });

  const fetchOrders = async (phoneNumber: string) => {
    if (!phoneNumber) {
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/orders?phone=${encodeURIComponent(phoneNumber)}`);
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (e: any) {
      toast({ title: "Failed to load orders", description: e?.message || "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (phone) fetchOrders(phone);
  }, []);

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

  const handleProfileSave = () => {
    localStorage.setItem("customerProfile", JSON.stringify(profile));
    toast({ title: "Profile Updated" });
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
          <User style={{ color: orange }} /> Customer
        </div>
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
      </aside>

      {/* Main */}
      <main className="flex-1 p-8 pt-16 md:pt-8 space-y-6">
        {activeTab === "orders" && (
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
            ) : orders.length === 0 ? (
              <div className="bg-white border rounded-xl p-8 text-center space-y-3 shadow-sm">
                <p className="text-lg font-bold text-slate-800">No orders yet</p>
                <p className="text-sm text-slate-600">Start shopping to place your first order.</p>
                <WLink href="/">
                  <Button style={{ backgroundColor: orange }}>Start Shopping</Button>
                </WLink>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.map((order) => (
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
              <div className="flex justify-end">
                <Button style={{ backgroundColor: orange }} onClick={handleProfileSave}>
                  Edit Profile
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

