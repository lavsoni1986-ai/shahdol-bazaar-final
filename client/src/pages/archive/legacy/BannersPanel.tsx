// 📁 client/src/pages/admin/BannersPanel.tsx

import AdminLayout from "./AdminLayout";
import { useState, useEffect } from "react";
import { Image, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { safeData } from "@/lib/admin-response";

interface Banner {
  id: number;
  title: string;
  imageUrl?: string;
  isActive: boolean;
}

export default function BannersPanel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBanners();
  }, []);

  const loadBanners = async () => {
      try {
        setLoading(true);
        const res = await apiRequest("GET", "/banners");
        const list = safeData<Banner[]>(res, []);
        setBanners(Array.isArray(list) ? list : []);
      } catch (err) {
      console.error("Failed to load banners:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this banner?")) return;
    try {
      await apiRequest("DELETE", `banners/${id}`);
      loadBanners();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Banners Management</h1>
          <button onClick={loadBanners} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading banners...</div>
        ) : banners.length === 0 ? (
          <div className="text-gray-400">No banners found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {banners.map((banner) => (
              <div key={banner.id} className="bg-black/40 rounded-xl border border-white/10 overflow-hidden group relative">
                <button
                  onClick={() => handleDelete(banner.id)}
                  className="absolute top-2 right-2 p-2 bg-red-500/80 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="aspect-video bg-white/5">
                  {banner.imageUrl ? (
                    <img src={banner.imageUrl} className="w-full h-full object-cover" alt={banner.title} />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Image className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="text-white font-bold">{banner.title}</h3>
                  <span className={`text-xs font-bold uppercase mt-2 inline-block ${
                    banner.isActive ? "text-emerald-500" : "text-gray-500"
                  }`}>
                    {banner.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
