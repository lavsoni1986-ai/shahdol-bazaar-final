// 📁 client/src/pages/admin/NewsPanel.tsx

import AdminLayout from "./AdminLayout";
import { useState, useEffect } from "react";
import { Zap, Trash2, PlusCircle, X } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { safeData } from "@/lib/admin-response";

interface Offer {
  id: number;
  content: string;
  isActive: boolean;
  type: string;
  createdAt: string;
}

const EMPTY_FORM = { content: "" };

export default function NewsPanel() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const res = await apiRequest("GET", "/offers");
      const list = safeData<Offer[]>(res, []);
      // Show only GLOBAL_NEWS type in the News panel; filter out VENDOR_OFFERs
      const newsOnly = (Array.isArray(list) ? list : []).filter(
        (o) => !o.type || o.type === "GLOBAL_NEWS"
      );
      setOffers(newsOnly);
    } catch (err) {
      console.error("Failed to load offers:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this news item?")) return;
    setError(null);
    try {
      await apiRequest("DELETE", `offers/${id}`);
      setSuccess("News item deleted.");
      setTimeout(() => setSuccess(null), 3000);
      loadOffers();
    } catch (err: any) {
      const msg = err?.message || "Failed to delete.";
      setError(msg);
      console.error("Failed to delete:", err);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const content = form.content.trim();
    if (!content) {
      setError("Content is required.");
      return;
    }
    if (content.length > 500) {
      setError("Content must be 500 characters or less.");
      return;
    }

    setSubmitting(true);
    try {
      await apiRequest("POST", "/offers", {
        content,
        type: "GLOBAL_NEWS",
        isActive: true,
      });
      setSuccess("News published successfully.");
      setForm(EMPTY_FORM);
      setShowForm(false);
      setTimeout(() => setSuccess(null), 4000);
      loadOffers();
    } catch (err: any) {
      const msg = err?.message || "Failed to publish news.";
      setError(msg);
      console.error("Failed to create offer:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">News &amp; Alerts</h1>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm((v) => !v); setError(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
            >
              {showForm ? <X className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              {showForm ? "Cancel" : "Create News"}
            </button>
            <button
              onClick={loadOffers}
              className="px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Feedback banners */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg px-4 py-3 text-sm">
            {success}
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <form
            onSubmit={handleCreate}
            className="bg-black/40 rounded-xl border border-white/10 p-5 space-y-4"
          >
            <h2 className="text-white font-semibold text-lg">Create Local News</h2>

            <div className="space-y-1">
              <label className="text-gray-400 text-sm font-medium">
                Content <span className="text-red-400">*</span>
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setForm({ content: e.target.value })}
                placeholder="e.g. शहडोल में आज से नई बस सेवा शुरू हुई..."
                rows={4}
                maxLength={500}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 resize-none text-sm"
              />
              <p className="text-gray-600 text-xs text-right">{form.content.length}/500</p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting || !form.content.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                <Zap className="w-4 h-4" />
                {submitting ? "Publishing..." : "Publish News"}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setError(null); }}
                className="px-5 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* List */}
        {loading ? (
          <div className="text-gray-400 text-sm">Loading news...</div>
        ) : offers.length === 0 ? (
          <div className="text-gray-400 text-sm">
            No news/alerts found.{" "}
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="text-orange-400 underline underline-offset-2 hover:text-orange-300"
              >
                Create the first one.
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className="bg-black/40 rounded-xl border border-white/10 p-4 flex items-start justify-between group"
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Zap className="w-5 h-5 text-orange-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm leading-relaxed break-words">{offer.content}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span
                        className={`text-xs font-bold uppercase ${
                          offer.isActive ? "text-emerald-500" : "text-gray-500"
                        }`}
                      >
                        {offer.isActive ? "Active Broadcast" : "Inactive"}
                      </span>
                      {offer.createdAt && (
                        <span className="text-gray-600 text-xs">
                          {new Date(offer.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(offer.id)}
                  title="Delete news item"
                  className="p-2 bg-red-500/10 text-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 hover:text-white ml-3 shrink-0"
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
