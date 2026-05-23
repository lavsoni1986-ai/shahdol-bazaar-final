import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest, persistPortalContext } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, LogOut, User, Package } from "lucide-react";

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
  const { user, isAuthenticated, loading, logout } = useAuth();
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
  // DERIVED USER PROFILE (single truth)
  // -----------------------------
  const profile = useMemo(() => {
    const u: any = user || {};
    return {
      name: u.name || u.username || "Customer",
      phone: u.phone || u.contactNumber || "",
      address: u.address || u.shopAddress || "",
    };
  }, [user]);

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
    if (!profile.phone) {
      setOrders([]);
      return;
    }

    console.log("[CDASH] fetching orders for", profile.phone);

    try {
      setOrdersLoading(true);
      setOrdersError("");

      const res = await apiRequest(
        "GET",
        `/orders?phone=${encodeURIComponent(profile.phone)}`
      );

      const payload = res?.data || res || [];

      console.log("[CDASH] orders payload", payload);

      setOrders(Array.isArray(payload) ? payload : []);
    } catch (err: any) {
      console.error("[CDASH] order fetch failed", err);
      setOrders([]);
      setOrdersError("Failed to load orders");
    } finally {
      setOrdersLoading(false);
    }
  }, [profile.phone]);

  // -----------------------------
  // INITIAL FETCH AFTER AUTH
  // -----------------------------
  useEffect(() => {
    if (!loading && isAuthenticated && profile.phone) {
      fetchOrders();
    }
  }, [loading, isAuthenticated, profile.phone, fetchOrders]);

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
          <p className="text-sm text-slate-500">Welcome back, {profile.name}</p>
        </div>

        <Button
          onClick={handleLogout}
          variant="destructive"
          className="flex items-center gap-2"
        >
          <LogOut size={16} />
          Logout
        </Button>
      </div>

      {/* PROFILE CARD */}
      <div className="bg-white rounded-2xl shadow border p-5 space-y-2">
        <div className="flex items-center gap-2 text-lg font-bold">
          <User size={18} color={orange} />
          Profile
        </div>
        <p><strong>Name:</strong> {profile.name}</p>
        <p><strong>Phone:</strong> {profile.phone || "Not available"}</p>
        <p><strong>Address:</strong> {profile.address || "Not available"}</p>
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