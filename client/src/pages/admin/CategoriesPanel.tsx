// 📁 client/src/pages/admin/CategoriesPanel.tsx

import AdminLayout from "./AdminLayout";
import { useState } from "react";
import { Layers, Plus, Edit2, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/api-client";
import { safeData } from "@/lib/admin-response";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "react-hot-toast";

interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  createdAt: string;
  productCount: number;
}

export default function CategoriesPanel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isSuperAdmin = user?.role?.toUpperCase() === "SUPER_ADMIN";

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addDescription, setAddDescription] = useState("");
  const [addImageUrl, setAddImageUrl] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editImageUrl, setEditImageUrl] = useState("");

  const [categoryToToggle, setCategoryToToggle] = useState<Category | null>(null);

  // TanStack Query: Fetch Categories
  const { data: categories = [], isLoading, isFetching, refetch } = useQuery<Category[]>({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/admin/categories");
      const list = safeData<Category[]>(res, []);
      return Array.isArray(list) ? list : [];
    }
  });

  // Mutation: Create Category
  const createCategoryMutation = useMutation({
    mutationFn: async (payload: { name: string; description?: string | null; imageUrl?: string | null }) => {
      return await apiRequest("POST", "/admin/categories", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      toast.success("Category created successfully");
      setIsAddModalOpen(false);
      setAddName("");
      setAddDescription("");
      setAddImageUrl("");
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to create category";
      toast.error(msg);
    }
  });

  // Mutation: Update Category (Edit or Toggle Active)
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      return await apiRequest("PATCH", `/admin/categories/${id}`, data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-categories"] });
      if (variables.data.isActive !== undefined) {
        toast.success(`Category ${variables.data.isActive ? "activated" : "deactivated"}`);
        setCategoryToToggle(null);
      } else {
        toast.success("Category updated successfully");
        setIsEditModalOpen(false);
        setEditingCategory(null);
      }
    },
    onError: (err: any) => {
      const msg = err?.message || "Failed to update category";
      toast.error(msg);
    }
  });

  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditDescription(cat.description || "");
    setEditImageUrl(cat.imageUrl || "");
    setIsEditModalOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Layers className="text-orange-500 w-7 h-7" />
              Categories Management
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              Global Platform Taxonomy & Discovery Classifications
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              Refresh
            </button>
            {isSuperAdmin && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-black font-bold rounded-lg text-sm flex items-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Category
              </button>
            )}
          </div>
        </div>

        {/* Read-Only Notice for City Admins */}
        {!isSuperAdmin && (
          <div className="bg-blue-950/40 border border-blue-800/40 p-3 rounded-xl flex items-center gap-3 text-xs text-blue-300">
            <AlertTriangle className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Categories are a platform-wide global taxonomy. City Admins have view-only access. Mutation controls are reserved for Super Admins.
            </span>
          </div>
        )}

        {/* Categories Grid */}
        {isLoading ? (
          <div className="text-center py-16 text-gray-400 animate-pulse">
            Loading platform categories...
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-16 text-gray-500 bg-black/20 rounded-2xl border border-gray-800">
            No categories found.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className={`bg-[#111] rounded-2xl border p-4 transition-all flex flex-col justify-between ${
                  cat.isActive
                    ? "border-gray-800 hover:border-orange-500/40"
                    : "border-red-900/30 bg-red-950/10 opacity-75"
                }`}
              >
                <div>
                  {/* Image or Placeholder */}
                  <div className="aspect-square bg-white/5 rounded-xl mb-3 overflow-hidden border border-white/5 relative group">
                    {cat.imageUrl ? (
                      <img src={cat.imageUrl} className="w-full h-full object-cover" alt={cat.name} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Layers className="text-gray-600 w-10 h-10" />
                      </div>
                    )}
                    <span
                      className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        cat.isActive
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      {cat.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Name and Slug */}
                  <h3 className="text-white font-bold text-base truncate" title={cat.name}>
                    {cat.name}
                  </h3>
                  <p className="text-xs text-gray-500 font-mono truncate mt-0.5">/{cat.slug}</p>

                  {/* Description if present */}
                  {cat.description && (
                    <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                      {cat.description}
                    </p>
                  )}
                </div>

                {/* Footer / Product Count & Actions */}
                <div className="mt-4 pt-3 border-t border-gray-800/80 flex items-center justify-between">
                  <span className="text-xs text-gray-400">
                    <span className="font-semibold text-gray-200">{cat.productCount}</span> {cat.productCount === 1 ? "product" : "products"}
                  </span>

                  {isSuperAdmin && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(cat)}
                        title="Edit Category"
                        className="p-1.5 text-gray-400 hover:text-orange-400 hover:bg-orange-500/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setCategoryToToggle(cat)}
                        title={cat.isActive ? "Deactivate Category" : "Activate Category"}
                        className={`p-1.5 rounded-lg transition-colors ${
                          cat.isActive
                            ? "text-gray-400 hover:text-red-400 hover:bg-red-500/10"
                            : "text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10"
                        }`}
                      >
                        {cat.isActive ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Category Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-[#111] border border-orange-500/30 p-6 sm:p-8 rounded-2xl w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-white text-center">Add Global Category</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!addName.trim()) return;
                  createCategoryMutation.mutate({
                    name: addName.trim(),
                    description: addDescription.trim() || null,
                    imageUrl: addImageUrl.trim() || null
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs text-gray-400 font-semibold block mb-1">Category Name *</label>
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Organic Groceries"
                    className="w-full bg-[#1a1a1a] border border-gray-800 p-2.5 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-semibold block mb-1">Image URL</label>
                  <input
                    type="text"
                    value={addImageUrl}
                    onChange={(e) => setAddImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#1a1a1a] border border-gray-800 p-2.5 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-semibold block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={addDescription}
                    onChange={(e) => setAddDescription(e.target.value)}
                    placeholder="Brief description for search & discovery..."
                    className="w-full bg-[#1a1a1a] border border-gray-800 p-2.5 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={createCategoryMutation.isPending}
                    className="flex-1 bg-orange-500 hover:bg-orange-400 text-black py-2.5 px-4 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    {createCategoryMutation.isPending ? "Adding..." : "Add Category"}
                  </button>
                  <button
                    type="button"
                    disabled={createCategoryMutation.isPending}
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setAddName("");
                      setAddDescription("");
                      setAddImageUrl("");
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 px-4 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Category Modal */}
        {isEditModalOpen && editingCategory && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-[#111] border border-orange-500/30 p-6 sm:p-8 rounded-2xl w-full max-w-md">
              <h3 className="text-xl font-bold mb-4 text-white text-center">Edit Category</h3>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!editName.trim() || !editingCategory) return;
                  updateCategoryMutation.mutate({
                    id: editingCategory.id,
                    data: {
                      name: editName.trim(),
                      description: editDescription.trim() || null,
                      imageUrl: editImageUrl.trim() || null
                    }
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="text-xs text-gray-400 font-semibold block mb-1">Slug (Immutable)</label>
                  <input
                    type="text"
                    value={editingCategory.slug}
                    disabled
                    className="w-full bg-black/40 border border-gray-800 p-2.5 rounded-lg text-gray-500 text-sm font-mono cursor-not-allowed"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    Permalinks remain fixed to prevent breaking bookmarks and external links.
                  </span>
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-semibold block mb-1">Category Name *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-gray-800 p-2.5 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-semibold block mb-1">Image URL</label>
                  <input
                    type="text"
                    value={editImageUrl}
                    onChange={(e) => setEditImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full bg-[#1a1a1a] border border-gray-800 p-2.5 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 font-semibold block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-gray-800 p-2.5 rounded-lg text-white text-sm focus:border-orange-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={updateCategoryMutation.isPending}
                    className="flex-1 bg-orange-500 hover:bg-orange-400 text-black py-2.5 px-4 rounded-lg font-bold text-sm transition-colors disabled:opacity-50"
                  >
                    {updateCategoryMutation.isPending ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    disabled={updateCategoryMutation.isPending}
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setEditingCategory(null);
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2.5 px-4 rounded-lg text-sm transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Activate / Deactivate Confirmation Modal */}
        {categoryToToggle && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl w-full max-w-md">
              <h3 className="text-lg font-bold mb-2 text-white">
                {categoryToToggle.isActive ? "Deactivate Category?" : "Activate Category?"}
              </h3>
              <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                {categoryToToggle.isActive ? (
                  <>
                    Deactivating <span className="text-white font-semibold">"{categoryToToggle.name}"</span> will remove it from public consumer discovery and home carousels. Existing product relationships (<span className="font-semibold">{categoryToToggle.productCount} products</span>) will remain completely intact.
                  </>
                ) : (
                  <>
                    Activating <span className="text-white font-semibold">"{categoryToToggle.name}"</span> will immediately make it visible in public marketplace discovery and navigation.
                  </>
                )}
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  disabled={updateCategoryMutation.isPending}
                  onClick={() => setCategoryToToggle(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={updateCategoryMutation.isPending}
                  onClick={() => {
                    updateCategoryMutation.mutate({
                      id: categoryToToggle.id,
                      data: { isActive: !categoryToToggle.isActive }
                    });
                  }}
                  className={`px-4 py-2 font-bold rounded-lg text-sm transition-colors disabled:opacity-50 ${
                    categoryToToggle.isActive
                      ? "bg-red-600 hover:bg-red-500 text-white"
                      : "bg-emerald-600 hover:bg-emerald-500 text-white"
                  }`}
                >
                  {updateCategoryMutation.isPending
                    ? "Updating..."
                    : categoryToToggle.isActive
                    ? "Confirm Deactivate"
                    : "Confirm Activate"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
