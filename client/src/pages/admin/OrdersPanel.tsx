// 📁 client/src/pages/admin/OrdersPanel.tsx
// TODO: Migrate from admin.tsx Orders tab

import AdminLayout from "./AdminLayout";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/api-client";
import { safeData } from "@/lib/admin-response";

interface Order {
  id: number;
  customerName: string;
  totalPrice: number;
  status: string;
}

export default function OrdersPanel() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
      try {
        setLoading(true);
        const res = await apiRequest("GET", "/orders?includeAll=true");
        const list = safeData<Order[]>(res, []);
        setOrders(Array.isArray(list) ? list : []);
      } catch (err) {
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Orders Management</h1>
          <button onClick={loadOrders} className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-gray-400">No orders found</div>
        ) : (
          <div className="bg-black/40 rounded-xl border border-white/10 overflow-x-auto w-full">
            <table className="min-w-[800px] w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Order ID</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white font-bold">#SB{order.id}</td>
                    <td className="px-4 py-3 text-gray-400">{order.customerName || "Guest"}</td>
                    <td className="px-4 py-3 text-emerald-500 font-bold">₹{order.totalPrice}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-orange-500/10 text-orange-500 rounded text-xs font-bold uppercase">
                        {order.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
