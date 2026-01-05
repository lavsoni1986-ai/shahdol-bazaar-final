// Version 1.0.1 - Final Build Fix
import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, Menu } from "lucide-react";

type Offer = { id?: number; content: string; isActive: boolean };
type Product = { id: number; name: string; price: string; category: string; description?: string; approved?: boolean; status?: string; imageUrl?: string; images?: string[] };
type Shop = { id: number; name: string; approved?: boolean; isVerified?: boolean; category?: string; contactNumber?: string; mobile?: string; phone?: string };
type Banner = { id?: number; image: string; title?: string; link?: string };
type Category = { id: number; name: string; imageUrl?: string | null };
const brandOrange = "#f97316";

export default function Admin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const [activeTab, setActiveTab] = useState<"overview" | "sellers" | "products" | "news" | "banners">("overview");

  const [offers, setOffers] = useState<Offer[]>([]);
  const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
  const [liveProducts, setLiveProducts] = useState<Product[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [categoryFile, setCategoryFile] = useState<File | null>(null);
  const [editCategoryModal, setEditCategoryModal] = useState(false);
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [editCategoryFile, setEditCategoryFile] = useState<File | null>(null);

  const [showOfferCreate, setShowOfferCreate] = useState(false);
  const [newOffer, setNewOffer] = useState<string>("");
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerLink, setBannerLink] = useState("/");
  const [bannerLoading, setBannerLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [editProductModal, setEditProductModal] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [editProductFile, setEditProductFile] = useState<File | null>(null);
  const [editBannerModal, setEditBannerModal] = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);
  const [editBannerFile, setEditBannerFile] = useState<File | null>(null);
  const [editOfferModal, setEditOfferModal] = useState(false);
  const [editOffer, setEditOffer] = useState<Offer | null>(null);

  useEffect(() => {
    if (loggedIn) {
      loadAllData();
    }
  }, [loggedIn]);

  async function loadAllData() {
    try {
      setLoading(true);
      await Promise.all([
        fetchOffers(),
        fetchPendingProducts(),
        fetchLiveProducts(),
        fetchShops(),
        fetchBanners(),
        fetchCategories(),
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleLogin() {
    if (username === "admin" && password === "shahdol123") {
      setLoggedIn(true);
      toast.success("Identity Verified! Syncing with Neon...");
    } else {
      toast.error("Invalid credentials ❌");
    }
  }

  async function fetchOffers() {
    try {
      const res = await fetch(`/api/offers`);
      if (res.ok) setOffers(await res.json());
    } catch (e) { console.error("Error fetching offers:", e); }
  }

  async function fetchPendingProducts() {
    try {
      const res = await fetch(`/api/products/all?status=pending`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.products || data.data || data.items || [];
        const pending = list.filter((p: any) => (p?.status || "").toLowerCase() === "pending" || p?.approved === false);
        setPendingProducts(pending);
      }
    } catch (e) { console.error("Error fetching pending products:", e); }
  }

  async function fetchLiveProducts() {
    try {
      const res = await fetch(`/api/products/all?approved=true`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.products || data.data || data.items || [];
        const live = list.filter((p: any) => {
          const status = (p?.status || "").toLowerCase();
          return status !== "pending" && status !== "deleted";
        });
        setLiveProducts(live);
      }
    } catch (e) { console.error("Error fetching live products:", e); }
  }

  async function fetchShops() {
    try {
      const res = await fetch(`/api/shops`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.data || [];
        setShops(list);
      }
    } catch (e) { console.error("Error fetching shops:", e); }
  }

  async function fetchBanners() {
    try {
      const res = await fetch(`/api/banners`);
      if (res.ok) setBanners(await res.json());
    } catch (e) { console.error("Error fetching banners:", e); }
  }

  async function fetchCategories() {
    try {
      const res = await fetch(`/api/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(Array.isArray(data) ? data : []);
      }
    } catch (e) { console.error("Error fetching categories:", e); }
  }

  async function handleAddCategory() {
    if (!newCategory.trim()) return;
    try {
      let imageUrl: string | undefined;
      if (categoryFile) {
        const form = new FormData();
        form.append("images", categoryFile);
        const upload = await fetch(`/api/upload`, { method: "POST", headers: { "x-user-id": "1" }, body: form });
        const uploadJson = await upload.json();
        if (!upload.ok) throw new Error(uploadJson?.message || "Upload failed");
        imageUrl = Array.isArray(uploadJson?.urls) ? uploadJson.urls[0] : uploadJson?.urls;
      }

      const res = await fetch(`/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory, imageUrl }),
      });
      if (!res.ok) throw new Error("Create failed");
      setNewCategory("");
      setCategoryFile(null);
      fetchCategories();
      toast.success("Category added");
    } catch (e: any) {
      toast.error(e?.message || "Create failed");
    }
  }

  async function handleDeleteCategory(id: number) {
    const ok = window.confirm("Delete this category?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      fetchCategories();
      toast.success("Category deleted");
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  }

  async function handleUpdateCategory() {
    if (!editCategory?.id) return;
    if (!editCategory.name.trim()) {
      toast.error("Name is required");
      return;
    }
    try {
      const form = new FormData();
      form.append("name", editCategory.name);
      if (editCategoryFile) {
        form.append("image", editCategoryFile);
      } else if (editCategory.imageUrl) {
        form.append("imageUrl", editCategory.imageUrl);
      }

      const res = await fetch(`/api/categories/${editCategory.id}`, {
        method: "PATCH",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Update failed");

      toast.success("Category updated");
      setEditCategoryModal(false);
      setEditCategory(null);
      setEditCategoryFile(null);
      fetchCategories();
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
    }
  }

  async function handleUpdateProduct() {
    if (!editProduct) return;
    try {
      const form = new FormData();
      form.append("name", editProduct.name);
      form.append("price", editProduct.price);
      form.append("category", editProduct.category);
      form.append("description", editProduct.description || "");
      if (editProductFile) {
        form.append("image", editProductFile);
      } else if (editProduct.imageUrl) {
        form.append("imageUrl", editProduct.imageUrl);
      }

      const res = await fetch(`/api/products/${editProduct.id}`, {
        method: "PATCH",
        headers: { "x-user-id": "1" },
        body: form,
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Product updated");
      setEditProductModal(false);
      setEditProductFile(null);
      fetchLiveProducts();
      fetchPendingProducts();
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
    }
  }

  async function handleDeleteProduct(id?: number) {
    if (!id) return;
    const ok = window.confirm("Delete this product?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "deleted" }),
      });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Product deleted");
      fetchLiveProducts();
      fetchPendingProducts();
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  }

  async function handleToggleStock(p: Product) {
    try {
      const nextStatus = p.status === "out_of_stock" ? "available" : "out_of_stock";
      const res = await fetch(`/api/products/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("Toggle failed");
      toast.success(`Stock: ${nextStatus}`);
      fetchLiveProducts();
    } catch (e: any) {
      toast.error(e?.message || "Toggle failed");
    }
  }

  async function handleApprove(id: number) {
    try {
      const res = await fetch(`/api/products/${id}/approve`, { method: "PATCH" });
      if (!res.ok) throw new Error("Approve failed");
      toast.success("Product approved!");
      setPendingProducts((prev) => prev.filter(p => p.id !== id));
      fetchLiveProducts();
    } catch (e: any) {
      toast.error(e?.message || "Approve failed");
    }
  }

  async function handleAddOffer() {
    if (!newOffer.trim()) return;
    try {
      const res = await fetch(`/api/offers`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-user-id": "1" },
        body: JSON.stringify({ content: newOffer, isActive: true, userId: 1 })
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Server error");
      }
      toast.success("News LIVE!");
      setNewOffer("");
      setShowOfferCreate(false);
      fetchOffers();
    } catch (e: any) {
      toast.error(e?.message || "Post failed");
    }
  }

  async function handleDeleteOffer(id?: number) {
    if (!id) return;
    const ok = window.confirm("Delete this news item?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/offers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Deleted");
      setOffers((prev) => prev.filter(o => o.id !== id));
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  }

  async function handleUpdateOffer() {
    if (!editOffer?.id) return;
    try {
      const res = await fetch(`/api/offers/${editOffer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editOffer.content, isActive: editOffer.isActive }),
      });
      if (!res.ok) throw new Error("Update failed");
      toast.success("Offer updated");
      setEditOfferModal(false);
      fetchOffers();
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
    }
  }

  const renderStatsSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-pulse">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-white border rounded-xl p-4 shadow-sm">
          <div className="h-3 w-24 bg-slate-200 rounded mb-3" />
          <div className="h-6 w-16 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );

  const renderTableSkeleton = (cols: number) => (
    <div className="bg-white border rounded-xl shadow-sm">
      <div className="h-12 bg-slate-100 border-b" />
      <div className="divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-slate-50 animate-pulse" />
        ))}
      </div>
    </div>
  );

  async function handleCreateBanner() {
    if (!bannerFile) return toast.error("Select an image");
    try {
      setBannerLoading(true);
      const form = new FormData();
      form.append("image", bannerFile);
      form.append("title", String(bannerTitle || ""));
      form.append("link", String(bannerLink || "/"));

      const res = await fetch(`/api/banners`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Create failed");
      toast.success("Banner saved!");
      setBannerFile(null);
      setBannerTitle("");
      setBannerLink("/");
      fetchBanners();
    } catch (e: any) {
      toast.error(e?.message || "Banner create failed");
    } finally {
      setBannerLoading(false);
    }
  }

  async function handleDeleteBanner(id?: number) {
    if (!id) return;
    const ok = window.confirm("Delete this banner?");
    if (!ok) return;
    try {
      const res = await fetch(`/api/banners/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast.success("Banner deleted");
      setBanners((prev) => prev.filter((b) => b.id !== id));
    } catch (e: any) {
      toast.error(e?.message || "Delete failed");
    }
  }

  async function handleUpdateBanner() {
    if (!editBanner?.id) return;
    try {
      const form = new FormData();
      form.append("title", String(editBanner.title || ""));
      form.append("link", String(editBanner.link || "/"));
      if (editBannerFile) {
        form.append("image", editBannerFile);
      } else if (editBanner.image) {
        form.append("image", editBanner.image);
      }

      const res = await fetch(`/api/banners/${editBanner.id}`, { method: "PATCH", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Update failed");
      toast.success("Banner updated");
      setEditBannerModal(false);
      setEditBannerFile(null);
      fetchBanners();
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
    }
  }

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="w-full max-w-md bg-white p-10 rounded-[2.5rem] shadow-2xl border-4 border-white">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Admin Login</h2>
            <p className="text-orange-600 font-bold text-[10px] uppercase tracking-widest mt-1">Neon DB Management</p>
          </div>
          <div className="space-y-4">
            <input type="text" placeholder="Username" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-500 font-bold" onChange={(e)=>setUsername(e.target.value)} />
            <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:border-orange-500 font-bold" onChange={(e)=>setPassword(e.target.value)} />
            <button className="w-full bg-black text-white p-4 rounded-2xl font-black uppercase tracking-widest shadow-lg hover:bg-orange-600 transition-all active:scale-95" onClick={handleLogin}>Enter Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { label: "Total Sellers", value: shops.length },
    { label: "Live Products", value: liveProducts.length },
    { label: "Pending Approvals", value: pendingProducts.length },
    { label: "Total News Items", value: offers.length },
  ];

  const tabButton = (key: typeof activeTab, label: string) => (
    <button
      className={`w-full text-left px-4 py-3 rounded-lg font-bold ${activeTab === key ? "text-white" : "bg-white text-slate-700 hover:bg-slate-50"}`}
      style={activeTab === key ? { backgroundColor: brandOrange } : {}}
      onClick={() => { setActiveTab(key); setSidebarOpen(false); }}
    >
      {label}
    </button>
  );

  return (
    <>
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b flex items-center justify-between px-4 py-3 shadow-sm">
        <div className="font-black text-slate-800 flex items-center gap-2">
          <span style={{ color: brandOrange }}>Admin</span> Panel
        </div>
        <button
          aria-label="Toggle menu"
          onClick={() => setSidebarOpen((s) => !s)}
          className="p-2 rounded-lg border text-slate-700"
        >
          <Menu size={18} />
        </button>
      </div>

      <aside
        className={`w-56 bg-white border-r p-4 space-y-2 md:static fixed top-14 left-0 h-[calc(100%-56px)] md:h-auto z-20 transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <p className="text-xs font-black uppercase text-slate-500 mb-2">Admin Panel</p>
        {tabButton("overview", "Overview")}
        {tabButton("sellers", "Manage Sellers")}
        {tabButton("products", "Products")}
        {tabButton("news", "News / Offers")}
        {tabButton("banners", "Manage Banners")}
        {tabButton("categories", "Manage Categories")}
      </aside>

      <main className="flex-1 p-8 pt-16 md:pt-8 space-y-6">
        {loading ? renderStatsSkeleton() : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-white border rounded-xl p-4 shadow-sm">
              <p className="text-xs uppercase text-slate-500 font-bold">{s.label}</p>
              <p className="text-2xl font-black mt-2">{s.value}</p>
            </div>
          ))}
        </div>
        )}

        {activeTab === "overview" && (
          <div className="bg-white border rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-black mb-4">Recent News</h2>
            {offers.length === 0 ? (
              <p className="text-slate-500 text-sm">No news published yet.</p>
            ) : (
              <ul className="space-y-2">
                {offers.slice(0, 5).map((o) => (
                  <li key={o.id} className="text-sm font-bold text-slate-800">{o.content}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {activeTab === "sellers" && (
          <div className="bg-white border rounded-xl shadow-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-black">Manage Sellers</h2>
              <span className="text-xs font-black uppercase text-orange-600">{shops.length} total</span>
            </div>
            {loading ? renderTableSkeleton(5) : (
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                  <th className="p-4">Shop</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Address</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {shops.length === 0 && (
                  <tr><td colSpan={5} className="p-4 text-sm text-slate-500">No sellers found.</td></tr>
                )}
                {shops.map((s) => (
                  <tr key={s.id}>
                    <td className="p-4 font-bold text-slate-800">{s.name}</td>
                    <td className="p-4 text-sm text-slate-500">{s.category || "—"}</td>
                    <td className="p-4 text-sm text-slate-600">{(s as any)?.address || "—"}</td>
                    <td className="p-4 text-sm text-slate-700">{s.contactNumber || s.mobile || s.phone || "—"}</td>
                    <td className="p-4 text-sm">
                      {(s.approved ?? true) ? <span className="text-green-600 font-bold">Approved</span> : <span className="text-orange-600 font-bold">Pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            )}
          </div>
        )}

        {activeTab === "products" && (
          <>
          <div className="bg-white border rounded-xl shadow-sm p-6">
            <p className="text-sm text-slate-600">Loading Table...</p>
          </div>
          <div className="bg-white border rounded-xl shadow-sm p-6">
            <p className="text-sm text-slate-600">Loading Table...</p>
          </div>
          </>
        )}

        {activeTab === "news" && (
          <div className="space-y-6">
            <div className="bg-white border rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-black">Publish News / Offers</h2>
                <button onClick={() => setShowOfferCreate(!showOfferCreate)} className="bg-orange-600 text-white px-4 py-2 rounded-full font-black text-xs uppercase shadow active:scale-95">
                  {showOfferCreate ? "Dismiss" : "+ New Alert"}
                </button>
              </div>
              {showOfferCreate && (
                <div className="p-6 space-y-4">
                  <textarea value={newOffer} onChange={(e) => setNewOffer(e.target.value)} placeholder="Type live news updates here..." className="w-full p-4 rounded-xl border-2 border-slate-200 h-28 font-bold text-slate-700 outline-none focus:border-orange-500 transition-all bg-white" />
                  <button onClick={handleAddOffer} className="bg-black text-white px-6 py-3 rounded-xl font-black uppercase shadow hover:bg-orange-600 transition-all active:scale-95">Publish Live</button>
                </div>
              )}
            </div>

            <div className="bg-white border rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-black">Published Content</h2>
                <span className="text-xs font-black uppercase text-orange-600">{offers.length} live</span>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="p-4">Content</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {offers.length === 0 && (
                    <tr><td colSpan={2} className="p-4 text-sm text-slate-500">No content yet.</td></tr>
                  )}
                  {offers.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 text-sm font-black text-slate-800">{o.content}</td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditOffer(o); setEditOfferModal(true); }}
                          className="p-2 rounded-full border text-slate-600 hover:text-orange-600 hover:border-orange-200"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteOffer(o.id)}
                          className="p-2 rounded-full border text-red-500 hover:border-red-200"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
            </table>
            </div>
          </div>
        )}

        {activeTab === "banners" && (
          <div className="space-y-6">
            <div className="bg-white border rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-black">Manage Home Banners</h2>
                <span className="text-xs font-black uppercase text-orange-600">{banners.length} live</span>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase">Banner Image</label>
                    <input type="file" accept="image/*" onChange={(e) => setBannerFile(e.target.files?.[0] || null)} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase">Title</label>
                    <input value={bannerTitle} onChange={(e) => setBannerTitle(e.target.value)} placeholder="Festive Mega Sale" className="w-full p-3 border rounded-lg font-bold text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase">Link</label>
                    <input value={bannerLink} onChange={(e) => setBannerLink(e.target.value)} placeholder="/category/electronics" className="w-full p-3 border rounded-lg font-bold text-sm" />
                  </div>
                </div>
                <button
                  onClick={handleCreateBanner}
                  disabled={bannerLoading}
                  className="bg-orange-600 text-white px-6 py-3 rounded-xl font-black uppercase shadow hover:bg-orange-700 active:scale-95 disabled:opacity-50"
                >
                  {bannerLoading ? "Saving..." : "Save Banner"}
                </button>
              </div>
            </div>

            <div className="bg-white border rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-black">Current Banners</h2>
              </div>
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                    <th className="p-4">Image</th>
                    <th className="p-4">Title</th>
                    <th className="p-4">Link</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {banners.length === 0 && (
                    <tr><td colSpan={4} className="p-4 text-sm text-slate-500">No banners yet.</td></tr>
                  )}
                  {banners.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4">
                        <img src={b.image} alt={b.title} className="w-16 h-16 object-cover rounded border" />
                      </td>
                      <td className="p-4 text-sm font-black text-slate-800">{b.title}</td>
                      <td className="p-4 text-sm text-slate-600">{b.link}</td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditBanner(b); setEditBannerFile(null); setEditBannerModal(true); }}
                          className="p-2 rounded-full border text-slate-600 hover:text-orange-600 hover:border-orange-200"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteBanner(b.id)}
                          className="p-2 rounded-full border text-red-500 hover:border-red-200"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "categories" && (
          <div className="space-y-6">
            <div className="bg-white border rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-black">Manage Categories</h2>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex gap-2">
                  <input
                    className="w-full p-3 border rounded-lg font-bold text-sm"
                    placeholder="Category name"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  />
                  <input type="file" accept="image/*" onChange={(e) => setCategoryFile(e.target.files?.[0] || null)} />
                  <button
                    onClick={handleAddCategory}
                    className="bg-orange-600 text-white px-4 py-2 rounded-lg font-black text-xs uppercase shadow active:scale-95"
                  >
                    Add
                  </button>
                </div>
                <div className="space-y-2">
                  {categories.length === 0 && <p className="text-sm text-slate-500">No categories yet.</p>}
                  {categories.map((c) => (
                    <div key={c.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                      <div className="flex items-center gap-3">
                        {c.imageUrl ? (
                          <img
                            src={c.imageUrl.startsWith("http") ? c.imageUrl : `/uploads/${c.imageUrl.split("/").pop() || ""}`}
                            alt={c.name}
                            className="w-10 h-10 rounded object-cover border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded border bg-slate-50" />
                        )}
                        <span className="font-bold text-slate-800">{c.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setEditCategory(c); setEditCategoryFile(null); setEditCategoryModal(true); }}
                          className="p-2 rounded-full border text-slate-600 hover:text-orange-600 hover:border-orange-200"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          className="p-2 rounded-full border text-red-500 hover:border-red-200"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>

      {editProductModal && editProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-black">Edit Product</h3>
            <input
              className="w-full p-3 rounded-lg border border-slate-200"
              placeholder="Name"
              value={editProduct.name}
              onChange={(e) => setEditProduct({ ...editProduct, name: e.target.value })}
            />
            <input
              className="w-full p-3 rounded-lg border border-slate-200"
              placeholder="Price"
              value={editProduct.price}
              onChange={(e) => setEditProduct({ ...editProduct, price: e.target.value })}
            />
            <input
              className="w-full p-3 rounded-lg border border-slate-200"
              placeholder="Category"
              value={editProduct.category}
              onChange={(e) => setEditProduct({ ...editProduct, category: e.target.value })}
            />
            <textarea
              className="w-full p-3 rounded-lg border border-slate-200 h-24"
              placeholder="Description"
              value={editProduct.description || ""}
              onChange={(e) => setEditProduct({ ...editProduct, description: e.target.value })}
            />
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase">Product Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setEditProductFile(e.target.files?.[0] || null)}
              />
              <div className="flex gap-2 items-center">
                {editProductFile ? (
                  <span className="text-xs text-green-600 font-bold">New image selected</span>
                ) : (
                  editProduct.imageUrl && (
                    <img
                      src={editProduct.imageUrl.startsWith("http") ? editProduct.imageUrl : `/uploads/${editProduct.imageUrl.split("/").pop() || ""}`}
                      alt="Current"
                      className="w-16 h-16 rounded object-cover border"
                    />
                  )
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditProductModal(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
              <button onClick={handleUpdateProduct} className="px-4 py-2 rounded-lg bg-orange-600 text-white font-black">Save</button>
            </div>
          </div>
        </div>
      )}
      {editCategoryModal && editCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-black">Edit Category</h3>
            <input
              className="w-full p-3 rounded-lg border border-slate-200"
              placeholder="Name"
              value={editCategory.name}
              onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
            />
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase">Category Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setEditCategoryFile(e.target.files?.[0] || null)}
              />
              <div className="flex items-center gap-2">
                {editCategoryFile ? (
                  <span className="text-xs font-bold text-green-600">New file selected</span>
                ) : editCategory.imageUrl ? (
                  <img
                    src={editCategory.imageUrl.startsWith("http") ? editCategory.imageUrl : `/uploads/${editCategory.imageUrl.split("/").pop() || ""}`}
                    alt={editCategory.name}
                    className="w-16 h-16 rounded object-cover border"
                  />
                ) : (
                  <span className="text-xs text-slate-500">No image</span>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setEditCategoryModal(false); setEditCategoryFile(null); }} className="px-4 py-2 rounded-lg border">Cancel</button>
              <button onClick={handleUpdateCategory} className="px-4 py-2 rounded-lg bg-orange-600 text-white font-black">Save</button>
            </div>
          </div>
        </div>
      )}
      {editBannerModal && editBanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-black">Edit Banner</h3>
            <input
              className="w-full p-3 rounded-lg border border-slate-200"
              placeholder="Title"
              value={editBanner.title || ""}
              onChange={(e) => setEditBanner({ ...editBanner, title: e.target.value })}
            />
            <input
              className="w-full p-3 rounded-lg border border-slate-200"
              placeholder="Link"
              value={editBanner.link || ""}
              onChange={(e) => setEditBanner({ ...editBanner, link: e.target.value })}
            />
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase">Banner Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setEditBannerFile(e.target.files?.[0] || null)}
              />
              <div className="flex items-center gap-2">
                {editBannerFile ? (
                  <span className="text-xs font-bold text-green-600">New file selected</span>
                ) : editBanner.image ? (
                  <img
                    src={editBanner.image.startsWith("http") ? editBanner.image : `/uploads/${editBanner.image.split("/").pop() || ""}`}
                    alt="Current"
                    className="w-16 h-16 rounded object-cover border"
                  />
                ) : (
                  <span className="text-xs text-slate-500">No image</span>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setEditBannerModal(false); setEditBannerFile(null); }} className="px-4 py-2 rounded-lg border">Cancel</button>
              <button onClick={handleUpdateBanner} className="px-4 py-2 rounded-lg bg-orange-600 text-white font-black">Save</button>
            </div>
          </div>
        </div>
      )}
      {editOfferModal && editOffer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
            <h3 className="text-lg font-black">Edit Alert</h3>
            <textarea
              className="w-full p-3 rounded-lg border border-slate-200 h-28"
              value={editOffer.content}
              onChange={(e) => setEditOffer({ ...editOffer, content: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
              <input
                type="checkbox"
                checked={editOffer.isActive}
                onChange={(e) => setEditOffer({ ...editOffer, isActive: e.target.checked })}
              />
              Active
            </label>
            <div className="flex justify-end gap-3">
              <button onClick={() => setEditOfferModal(false)} className="px-4 py-2 rounded-lg border">Cancel</button>
              <button onClick={handleUpdateOffer} className="px-4 py-2 rounded-lg bg-orange-600 text-white font-black">Save</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}