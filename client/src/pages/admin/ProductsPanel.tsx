// 📁 client/src/pages/admin/ProductsPanel.tsx
// TODO: Migrate from admin.tsx Products tab

import AdminLayout from "./AdminLayout";
import { useState, useEffect } from "react";
import { Package } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { toast } from "react-hot-toast";
import { safeData, safeText } from "@/lib/admin-response";

interface Product {
  id: number;
  name: string;
  price: number;
  category?: string | {
    id?: number;
    name?: string;
    slug?: string;
    description?: string;
    imageUrl?: string;
    isActive?: boolean;
    createdAt?: string;
  };
  vendor?: {
    id: number;
    name: string;
    status?: string;
  };
  status: string;
  imageUrl?: string;
}

export default function ProductsPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");

  useEffect(() => {
    loadProducts();
  }, [statusFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const url = `admin/products/all${statusFilter ? `?status=${statusFilter}` : ""}`;
      const res = await apiRequest("GET", url);
      const list = safeData<Product[]>(res, []);
      setProducts(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load products:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await apiRequest("PATCH", `/admin/products/${id}/approve`);
      loadProducts();
      toast.success("Product Approved!");
    } catch (err) {
      console.error("Failed to approve:", err);
    }
  };

  const handleReject = async (id: number) => {
    try {
      await apiRequest("PATCH", `/admin/products/${id}/reject`);
      loadProducts();
      toast.error("Product Rejected");
    } catch (err) {
      console.error("Failed to reject:", err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this product?")) return;
    try {
      await apiRequest("DELETE", `/admin/products/${id}`);
      loadProducts();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  // No client-side filtering needed since API handles it
  const filteredProducts = products;
  const getCategoryLabel = (category: Product["category"]) => {
    if (typeof category === "string") return category;
    if (!category || typeof category !== "object") return "N/A";
    return category.name || category.slug || "N/A";
  };

  return (
    <AdminLayout>
      <div className="space-y-6 w-full">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Products Management</h1>
          <button onClick={loadProducts} className="px-4 py-2 rounded-lg text-sm font-medium bg-orange-500 text-white hover:bg-orange-600">
            Refresh
          </button>
        </div>

        <div className="flex gap-2">
          {[
            { label: "All", value: "" },
            { label: "Pending", value: "PENDING" },
            { label: "Approved", value: "APPROVED" },
            { label: "Rejected", value: "REJECTED" }
          ].map((tab) => (
             <button
               key={tab.value}
               onClick={() => setStatusFilter(tab.value)}
               className={`px-4 py-2 rounded-lg text-sm font-medium ${
                 statusFilter === tab.value
                   ? "bg-orange-500 text-white"
                   : "bg-gray-700 text-gray-300 hover:bg-gray-600"
               }`}
             >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin h-6 w-6 border-2 border-orange-500 border-t-transparent rounded-full"></div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-gray-400">No products found</div>
        ) : (
<div className="grid gap-4">
  {filteredProducts.map((product) => {
    const normalizedStatus = (product.status || "").toLowerCase();

    return (
    <div key={product.id} className="bg-black/40 rounded-xl border border-white/10 p-5 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-white/5 rounded-lg overflow-hidden">
          {product.imageUrl ? (
            <img src={product.imageUrl} className="w-full h-full object-cover" alt={product.name} />
          ) : (
            <Package className="w-full h-full p-3 text-gray-600" />
          )}
        </div>
        <div>
          <h3 className="text-white font-bold text-lg">{product.name}</h3>
          <p className="text-sm text-gray-400">Vendor: {product.vendor?.name || "N/A"}</p>
          <p className="text-sm text-gray-400">Category: {safeText(product.category)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-emerald-500 font-bold text-lg">₹{product.price}</p>
        <p className="text-xs text-orange-400 mt-1 capitalize">
          {normalizedStatus === "approved"
            ? "Approved"
            : normalizedStatus === "rejected"
            ? "Rejected"
            : "Pending"}
        </p>
      </div>
      <div className="flex gap-2">
        {normalizedStatus === "pending" && (
          <>
            <button
              onClick={() => handleApprove(product.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-500 text-white hover:bg-emerald-600"
            >
              APPROVE
            </button>
            <button
              onClick={() => handleReject(product.id)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600"
            >
              REJECT
            </button>
          </>
        )}
        <button
          onClick={() => handleDelete(product.id)}
          className="px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600"
        >
          DELETE
        </button>
      </div>
    </div>
    );
  })}
</div>
        )}
      </div>
    </AdminLayout>
  );
}
