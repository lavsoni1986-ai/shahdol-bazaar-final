// 📁 client/src/pages/admin/NewsPanel.tsx

import AdminLayout from "./AdminLayout";
import { useState, useEffect, useRef } from "react";
import { Zap, Trash2, PlusCircle, X, ImagePlus, Loader2, Pencil } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { safeData } from "@/lib/admin-response";

interface Offer {
  id: number;
  content: string;
  imageUrl?: string | null;
  isActive: boolean;
  type: string;
  createdAt: string;
}

const EMPTY_FORM = { content: "", imageUrl: null as string | null };

export default function NewsPanel() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadOffers();
  }, []);

  const loadOffers = async () => {
    try {
      setLoading(true);
      const res = await apiRequest("GET", "/offers");
      const list = safeData<Offer[]>(res, []);
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

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Only JPG, PNG, or WebP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("image", file);
      const result = await apiRequest("POST", "/upload/single", formData);
      const url = result?.url || (result?.urls && result.urls[0]);
      if (!url) throw new Error("Upload returned no URL");
      setForm((prev) => ({ ...prev, imageUrl: url }));
    } catch (err: any) {
      setError(err?.message || "Image upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this news item?")) return;
    setError(null);
    try {
      await apiRequest("DELETE", `offers/${id}`);
      setSuccess("News item deleted.");
      setTimeout(() => setSuccess(null), 3000);
      // If we were editing this item, cancel edit mode
      if (editingId === id) resetForm();
      loadOffers();
    } catch (err: any) {
      setError(err?.message || "Failed to delete.");
    }
  };

  const handleEdit = (offer: Offer) => {
    setEditingId(offer.id);
    setForm({ content: offer.content, imageUrl: offer.imageUrl ?? null });
    setShowForm(true);
    setError(null);
    setSuccess(null);
    // Scroll form into view on mobile
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const content = form.content.trim();
    if (!content) { setError("Content is required."); return; }
    if (content.length > 500) { setError("Content must be 500 characters or less."); return; }

    setSubmitting(true);
    try {
      if (editingId !== null) {
        // PATCH — send imageUrl key always so server knows intent
        await apiRequest("PATCH", `/offers/${editingId}`, {
          content,
          imageUrl: form.imageUrl ?? null,
        });
        setSuccess("News updated successfully.");
      } else {
        await apiRequest("POST", "/offers", {
          content,
          ...(form.imageUrl ? { imageUrl: form.imageUrl } : {}),
        });
        setSuccess("News published successfully.");
      }
      resetForm();
      setTimeout(() => setSuccess(null), 4000);
      loadOffers();
    } catch (err: any) {
      setError(err?.message || (editingId ? "Failed to update news." : "Failed to publish news."));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const isEditing = editingId !== null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">News &amp; Alerts</h1>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (showForm) { resetForm(); } else { setShowForm(true); setError(null); }
              }}
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

        {/* Feedback */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg px-4 py-3 text-sm">{error}</div>
        )}
        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg px-4 py-3 text-sm">{success}</div>
        )}

        {/* Create / Edit Form */}
        {showForm && (
          <form onSubmit={handleSubmit} className="bg-black/40 rounded-xl border border-white/10 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold text-lg">
                {isEditing ? "Edit News" : "Create Local News"}
              </h2>
              {isEditing && (
                <span className="text-xs text-orange-400 font-bold uppercase tracking-widest bg-orange-500/10 px-2 py-1 rounded-md">
                  Editing #{editingId}
                </span>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-gray-400 text-sm font-medium">
                Content <span className="text-red-400">*</span>
              </label>
              <textarea
                value={form.content}
                onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="e.g. शहडोल में आज से नई बस सेवा शुरू हुई..."
                rows={4}
                maxLength={500}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-orange-500/50 resize-none text-sm"
              />
              <p className="text-gray-600 text-xs text-right">{form.content.length}/500</p>
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <label className="text-gray-400 text-sm font-medium">News Image (Optional)</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                onChange={handleImageSelect}
                className="hidden"
                id="news-image-input"
              />

              {!form.imageUrl ? (
                <div>
                  <label
                    htmlFor="news-image-input"
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-sm w-fit transition-colors
                      ${uploading ? "opacity-50 cursor-not-allowed bg-white/5 text-gray-500" : "bg-white/5 hover:bg-white/10 text-gray-300 cursor-pointer"}`}
                  >
                    {uploading
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                      : <><ImagePlus className="w-4 h-4" /> Upload Image</>
                    }
                  </label>
                  <p className="text-gray-600 text-xs mt-1">JPG, PNG, WebP · Max 5MB</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <img
                    src={form.imageUrl}
                    alt="News preview"
                    className="w-full max-w-xs rounded-lg object-cover aspect-video border border-white/10"
                  />
                  <div className="flex gap-2">
                    <label
                      htmlFor="news-image-input"
                      className="px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs cursor-pointer hover:bg-white/20 transition-colors"
                    >
                      Change Image
                    </label>
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, imageUrl: null }))}
                      className="px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg text-xs hover:bg-red-500/20 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={submitting || uploading || !form.content.trim()}
                className="flex items-center gap-2 px-5 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm"
              >
                <Zap className="w-4 h-4" />
                {submitting
                  ? (isEditing ? "Updating..." : "Publishing...")
                  : (isEditing ? "Update News" : "Publish News")
                }
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm"
              >
                {isEditing ? "Cancel Edit" : "Cancel"}
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
              <button onClick={() => setShowForm(true)} className="text-orange-400 underline underline-offset-2 hover:text-orange-300">
                Create the first one.
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {offers.map((offer) => (
              <div
                key={offer.id}
                className={`bg-black/40 rounded-xl border p-4 flex items-start justify-between group transition-colors ${
                  editingId === offer.id ? "border-orange-500/40 bg-orange-500/5" : "border-white/10"
                }`}
              >
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {offer.imageUrl ? (
                    <img
                      src={offer.imageUrl}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover shrink-0 border border-white/10"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-orange-500/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <Zap className="w-5 h-5 text-orange-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm leading-relaxed break-words">{offer.content}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`text-xs font-bold uppercase ${offer.isActive ? "text-emerald-500" : "text-gray-500"}`}>
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
                <div className="flex gap-1 ml-3 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleEdit(offer)}
                    title="Edit news item"
                    className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500 hover:text-white transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(offer.id)}
                    title="Delete news item"
                    className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
