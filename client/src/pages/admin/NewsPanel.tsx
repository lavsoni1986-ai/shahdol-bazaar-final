// 📁 client/src/pages/admin/NewsPanel.tsx

import AdminLayout from "./AdminLayout";
import { useState, useEffect } from "react";
import { Zap, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { safeData } from "@/lib/admin-response";

interface Offer {
  id: number;
  content: string;
  isActive: boolean;
}

export default function NewsPanel() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
      try {
        setLoading(true);
        const res = await apiRequest("GET", "/offers");
        const list = safeData<Offer[]>(res, []);
        setOffers(Array.isArray(list) ? list : []);
      } catch (err) {
      console.error("Failed to load offers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this news/alert?")) return;
    try {
      await apiRequest("DELETE", `offers/${id}`);
      loadOffers();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">News & Alerts</h1>
          <button onClick={loadOffers} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading news...</div>
        ) : offers.length === 0 ? (
          <div className="text-gray-400">No news/alerts found</div>
        ) : (
          <div className="space-y-4">
            {offers.map((offer) => (
              <div key={offer.id} className="bg-black/40 rounded-xl border border-white/10 p-4 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center shrink-0">
                    <Zap className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-white font-bold">{offer.content}</p>
                    <span className={`text-xs font-bold uppercase mt-1 inline-block ${
                      offer.isActive ? "text-emerald-500" : "text-gray-500"
                    }`}>
                      {offer.isActive ? "Active Broadcast" : "Inactive"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(offer.id)}
                  className="p-2 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
