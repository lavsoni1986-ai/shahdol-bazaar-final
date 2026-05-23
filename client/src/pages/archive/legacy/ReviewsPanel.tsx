// 📁 client/src/pages/admin/ReviewsPanel.tsx

import AdminLayout from "./AdminLayout";
import { useState, useEffect } from "react";
import { MessageSquare, Star, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { safeData } from "@/lib/admin-response";

interface Review {
  id: number;
  rating: number;
  comment: string;
  user?: { name: string };
  vendor?: { name: string };
  product?: { name: string };
}

export default function ReviewsPanel() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
      try {
        setLoading(true);
        const res = await apiRequest("GET", "/admin/reviews/pending");
        const list = safeData<Review[]>(res, []);
        setReviews(Array.isArray(list) ? list : []);
      } catch (err) {
      console.error("Failed to load reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this review?")) return;
    try {
      await apiRequest("DELETE", `/admin/reviews/${id}`);
      loadReviews();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Reviews Management</h1>
          <button onClick={loadReviews} className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600">
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="text-gray-400">No reviews found</div>
        ) : (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div key={review.id} className="bg-black/40 rounded-xl border border-white/10 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-white font-bold">{review.user?.name || "Anonymous"}</p>
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-4 h-4 ${star <= review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-600"}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(review.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-gray-400 mt-3">{review.comment}</p>
                {(review.vendor || review.product) && (
                  <p className="text-gray-500 text-sm mt-2">
                    For: {review.vendor?.name || review.product?.name || "N/A"}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
