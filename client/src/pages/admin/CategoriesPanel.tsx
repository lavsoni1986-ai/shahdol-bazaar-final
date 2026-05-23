// 📁 client/src/pages/admin/CategoriesPanel.tsx

import AdminLayout from "./AdminLayout";
import { useState, useEffect } from "react";
import { Layers, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { safeData } from "@/lib/admin-response";

interface Category {
  id: number;
  name: string;
  imageUrl?: string;
}

export default function CategoriesPanel() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
      try {
        setLoading(true);
        const res = await apiRequest("GET", "/categories");
        const list = safeData<Category[]>(res, []);
        setCategories(Array.isArray(list) ? list : []);
      } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this category?")) return;
    try {
      await apiRequest("DELETE", `categories/${id}`);
      loadCategories();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Categories Management</h1>
          <button onClick={loadCategories} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading categories...</div>
        ) : categories.length === 0 ? (
          <div className="text-gray-400">No categories found</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-black/40 rounded-xl border border-white/10 p-4 hover:border-orange-500/50 transition-colors group relative">
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="absolute top-2 right-2 p-1.5 bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
                <div className="aspect-square bg-white/5 rounded-xl mb-3 overflow-hidden border border-white/5">
                  {cat.imageUrl ? (
                    <img src={cat.imageUrl} className="w-full h-full object-cover" alt={cat.name} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Layers className="text-gray-600 w-8 h-8" />
                    </div>
                  )}
                </div>
                <p className="text-white font-bold text-center uppercase text-sm truncate">{cat.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
