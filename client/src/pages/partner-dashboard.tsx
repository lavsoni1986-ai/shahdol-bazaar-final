import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Store, Package, Home, CheckCircle2, Plus, LogOut, Loader2, Pencil, Menu } from "lucide-react";

export default function PartnerDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const headers = { "Content-Type": "application/json", "x-user-id": user.id?.toString() || "1" };

  const [activeTab, setActiveTab] = useState<'dashboard' | 'products'>('dashboard');
  const [shop, setShop] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [eName, setEName] = useState("");
  const [ePrice, setEPrice] = useState("");
  const [eDescription, setEDescription] = useState("");
  const [editFiles, setEditFiles] = useState<File[]>([]);
  const [editImagePreviews, setEditImagePreviews] = useState<string[]>([]);
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [profileReady, setProfileReady] = useState(false);

  // Form States
  const [pName, setPName] = useState("");
  const [pPrice, setPPrice] = useState("");
  const [pDescription, setPDescription] = useState("");
  const [pCategory, setPCategory] = useState("General");
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedEditCategory, setSelectedEditCategory] = useState("General");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const orange = "#f97316";

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/shops/mine", { headers });
      const data = await res.json();
      setShop(data);
      if (data) {
        setShopName(data?.name || "");
        setShopAddress(data?.address || "");
        setMapsLink(data?.mapsLink || "");
        setContactNumber(data?.contactNumber || data?.mobile || "");
        setPDescription((prev) => prev); // no-op just keeping state
      }
      if (data?.id) {
        const pRes = await fetch(`/api/products?shopId=${data.id}&includeAll=true`, { headers });
        if (pRes.ok) setProducts(await pRes.json());
      } else {
        setProducts([]);
      }
    } catch (e) { console.error("Fetch failed"); }
    finally { setLoading(false); }
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const data = await res.json();
      if (Array.isArray(data)) setCategories(data);
    } catch (e) {
      console.error("Category fetch failed");
    }
  };

  useEffect(() => { fetchData(); fetchCategories(); }, [activeTab]);

  const handleFileSelect = async (fileList: FileList | null) => {
    if (!fileList) return;
    const selected = Array.from(fileList);
    setFiles(selected);
    const previews = await Promise.all(
      selected.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          }),
      ),
    );
    setImagePreviews(previews);
  };

  // Hydrate profile fields after user is available
  useEffect(() => {
    setShopName(user?.shopName || "");
    setShopAddress(user?.shopAddress || "");
    setMapsLink(user?.mapsLink || "");
    setContactNumber(user?.contactNumber || "");
    setProfileReady(true);
  }, []);

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setEName(product?.name ?? "");
    setEPrice(String(product?.price ?? ""));
    setEDescription(product?.description ?? "");
    setSelectedEditCategory(product?.category || "General");
    const existing =
      (Array.isArray(product?.images) && product?.images[0]) || product?.imageUrl || "";
    setEditImagePreviews(existing ? [existing] : []);
    setEditFiles([]);
    setIsEditDialogOpen(true);
  };

  const handleEditFileSelect = async (fileList: FileList | null) => {
    if (!fileList) return;
    const selected = Array.from(fileList);
    setEditFiles(selected);
    const previews = await Promise.all(
      selected.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsDataURL(file);
          }),
      ),
    );
    setEditImagePreviews(previews);
  };

  const toAbsolute = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const normalized = url.startsWith("/") ? url : `/${url}`;
    return `${window.location.origin}${normalized}`;
  };

  const saveEdit = async () => {
    if (!editingProduct?.id) return;
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("name", eName);
      formData.append("price", ePrice);
      formData.append("description", eDescription);
      formData.append("category", selectedEditCategory || editingProduct?.category || "General");

      const existingImage =
        (Array.isArray(editingProduct.images) && editingProduct.images[0]) ||
        editingProduct.imageUrl ||
        "";

      if (editFiles.length > 0) {
        formData.append("image", editFiles[0]);
      } else if (existingImage) {
        formData.append("imageUrl", existingImage);
      }

      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: "PATCH",
        headers: { "x-user-id": headers["x-user-id"] },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.message || "Update failed");
      }
      toast({ title: "Updated!" });
      setIsEditDialogOpen(false);
      setEditingProduct(null);
      await fetchData();
    } catch (e) {
      toast({ title: "Update failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    setLocation("/auth");
  };

  const saveProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": headers["x-user-id"],
        },
        body: JSON.stringify({ shopName, shopAddress, mapsLink, contactNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Profile update failed");
      localStorage.setItem("user", JSON.stringify({ ...user, ...data }));
      toast({ title: "Dukan ki details save ho gayi!" });
      await fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Update failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const becomeSeller = async () => {
    try {
      setLoading(true);
      const payload = {
        name: "Temp Shop",
        category: "General",
        description: "Auto-created for testing",
        address: "Shahdol",
        phone: "0000000000",
        mobile: "0000000000",
      };
      const res = await fetch("/api/partner/shop/create-default", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const resJson = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(resJson?.message || "Failed to create shop / seller");
      }
      // update local user role
      const updatedUser = { ...user, role: "seller" };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setShop(resJson || null);
      toast({ title: "You are now a Seller" });
      await fetchData();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Become seller failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async (e?: React.MouseEvent<HTMLButtonElement>) => {
    e?.preventDefault();
    setLoading(true);
    console.log("Submitting form (simplified)...");

    // Minimal defaults to avoid any blocking
    const shopId = Number(shop?.id) && Number(shop?.id) > 0 ? Number(shop?.id) : 1;
    const payload = {
      name: pName || "Test Product",
      price: Number(pPrice) || 0,
      category: pCategory || "General",
      description: pDescription || "",
      imageUrl: "", // allow empty to keep request simple
      shopId,
    };

    console.log("Sending minimal payload to API...", payload);

    fetch("/api/products", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    })
      .then((res) => {
        if (!res.ok) throw new Error(`Product create failed (${res.status})`);
        window.alert("Waiting for Admin Approval");
        toast({ title: "Product submitted", description: "Waiting for Admin Approval" });
        setIsDialogOpen(false);
        setPName("");
        setPPrice("");
        setPDescription("");
        setImagePreviews([]);
        setFiles([]);
        fetchData();
      })
      .catch((err) => {
        console.error("CRITICAL API FAILURE:", err);
        toast({ title: "Error", description: err?.message || "Error", variant: "destructive" });
        alert("Error: " + (err?.message || "Unknown"));
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const renderSkeleton = () => (
    <div className="space-y-4 animate-pulse">
      <div className="h-20 bg-slate-200 rounded-xl" />
      <div className="h-40 bg-slate-200 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="h-24 bg-slate-200 rounded-xl" />
        <div className="h-24 bg-slate-200 rounded-xl" />
        <div className="h-24 bg-slate-200 rounded-xl" />
      </div>
    </div>
  );

  if (!profileReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin" style={{ color: orange, height: 40, width: 40 }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-white border-b flex items-center justify-between px-4 py-3 shadow-sm">
        <div className="font-black text-slate-800 flex items-center gap-2">
          <Store color={orange} size={20} /> Partner Panel
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
        className={`w-64 bg-white border-r p-6 space-y-4 md:static fixed top-14 left-0 h-[calc(100%-56px)] md:h-auto z-20 transition-transform duration-200 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="hidden md:flex font-bold items-center gap-2 mb-6"><Store style={{ color: orange }} /> Partner Panel</div>
        <Button
          variant={activeTab === 'dashboard' ? "default" : "ghost"}
          className="w-full justify-start gap-2"
          style={activeTab === 'dashboard' ? { backgroundColor: orange, color: "#fff" } : {}}
          onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
        ><Home size={18}/> Dashboard</Button>
        <Button
          variant={activeTab === 'products' ? "default" : "ghost"}
          className="w-full justify-start gap-2"
          style={activeTab === 'products' ? { backgroundColor: orange, color: "#fff" } : {}}
          onClick={() => { setActiveTab('products'); setSidebarOpen(false); }}
        ><Package size={18}/> Products</Button>
        <Button variant="ghost" className="w-full justify-start gap-2 text-red-600" onClick={handleLogout}><LogOut size={18}/> Logout</Button>
      </aside>

      <main className="flex-1 p-8 pt-16 md:pt-8">
        {activeTab === 'dashboard' && (
          <div className="space-y-4">
            {loading ? renderSkeleton() : (
            <>
            <div className="bg-white p-6 rounded-xl border shadow-sm">
              <p className="text-sm text-slate-500 font-medium">Shop Status</p>
              <div className="text-xl font-bold flex items-center gap-2 mt-2 text-green-600">
                <CheckCircle2 size={24}/> Active
              </div>
            </div>
            {user.role !== "seller" && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-orange-700">You are currently a customer.</p>
                  <p className="text-xs text-orange-600">Click below to become a seller and add products.</p>
                </div>
                <Button className="bg-orange-600" style={{ backgroundColor: orange }} onClick={becomeSeller} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : "Become a Seller"}
                </Button>
              </div>
            )}

            <div className="bg-white p-6 rounded-xl border shadow-sm space-y-3">
              <h3 className="text-lg font-bold">Shop Profile</h3>
              <Input
                placeholder="Shop Name"
                value={shopName || ""}
                onChange={(e) => {
                  console.log("Typing shop name:", e.target.value);
                  setShopName(e.target.value);
                }}
              />
              <Textarea
                placeholder="Shop Address"
                value={shopAddress || ""}
                onChange={(e) => {
                  console.log("Typing shop address:", e.target.value);
                  setShopAddress(e.target.value);
                }}
              />
              <Input
                placeholder="WhatsApp Number"
                value={contactNumber || ""}
                onChange={(e) => setContactNumber(e.target.value)}
              />
              <Input
                placeholder="Google Maps Link (optional)"
                value={mapsLink || ""}
                onChange={(e) => {
                  console.log("Typing maps link:", e.target.value);
                  setMapsLink(e.target.value);
                }}
              />
              <div className="flex justify-end">
                <Button className="bg-orange-600" style={{ backgroundColor: orange }} onClick={saveProfile} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : "Save Profile"}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-xs uppercase text-slate-500 font-bold">Total Products</p>
                <p className="text-2xl font-bold mt-2">{products.length}</p>
              </div>
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-xs uppercase text-slate-500 font-bold">Approved Items</p>
                <p className="text-2xl font-bold mt-2">
                  {products.filter(p => p?.approved === true || p?.status === "approved").length}
                </p>
              </div>
              <div className="bg-white border rounded-xl p-4 shadow-sm">
                <p className="text-xs uppercase text-slate-500 font-bold">Pending Items</p>
                <p className="text-2xl font-bold mt-2">
                  {products.filter(p => p?.approved === false || p?.status === "pending").length}
                </p>
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Aapke Products</h2>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-orange-600" style={{ backgroundColor: orange }}><Plus size={18} className="mr-2"/> Naya Item</Button>
                </DialogTrigger>
                <DialogContent className="bg-white">
                  <DialogHeader>
                    <DialogTitle>Product Details</DialogTitle>
                    <DialogDescription className="sr-only">Add a new product to your shop</DialogDescription>
                  </DialogHeader>
                  {/* Keep this as a simple div so no implicit form validation interferes */}
                  <div className="space-y-4 py-4">
                    <Input placeholder="Item Name" value={pName} onChange={e => setPName(e.target.value)} />
                    <Input placeholder="Price (₹)" type="number" value={pPrice} onChange={e => setPPrice(e.target.value)} />
                    <Textarea placeholder="Description" value={pDescription} onChange={e => setPDescription(e.target.value)} />
                    <select
                      className="w-full border rounded-md px-3 py-2 text-sm"
                      value={pCategory}
                      onChange={(e) => setPCategory(e.target.value)}
                    >
                      {(categories.length ? categories : [{ id: 0, name: "General" }]).map((cat) => (
                        <option key={cat.id} value={cat.name}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <div className="space-y-2">
                      <Input type="file" accept="image/*" multiple onChange={e => handleFileSelect(e.target.files)} />
                      {imagePreviews.length > 0 && (
                        <div className="flex gap-2 flex-wrap">
                          {imagePreviews.map((src, idx) => (
                            <img key={idx} src={src} alt="preview" className="w-16 h-16 rounded object-cover border" />
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      className="w-full bg-orange-600"
                      onClick={addProduct}
                      disabled={loading}
                    >
                      {loading ? "Processing..." : "Item Bachien"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-xs font-bold text-orange-700">New items need Admin approval before they appear on the site.</p>
            
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-40 bg-slate-200 rounded-xl" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white border rounded-xl p-8 text-center space-y-3 shadow-sm">
                <p className="text-lg font-bold text-slate-800">No products yet</p>
                <p className="text-sm text-slate-600">Add your first item to start selling.</p>
                <Button
                  className="bg-orange-600"
                  style={{ backgroundColor: orange }}
                  onClick={() => setIsDialogOpen(true)}
                >
                  Start Adding Products
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {products.map(p => (
                  <div
                    key={p.id}
                    className="bg-white p-4 rounded-lg border shadow-sm cursor-pointer hover:shadow-md transition"
                    onClick={() => openEdit(p)}
                  >
                    {(
                      (Array.isArray(p.images) && p.images[0]) ||
                      p.imageUrl
                    ) && (
                      <img
                        src={(Array.isArray(p.images) && p.images[0]) || p.imageUrl}
                        alt={p.name}
                        className="w-full h-32 object-cover rounded mb-2"
                      />
                    )}
                    <p className="font-bold">{p.name}</p>
                    <p className="text-green-600">₹{p.price}</p>
                    <div className="mt-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                      >
                        <Pencil size={14} className="mr-1" /> Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Dialog
              open={isEditDialogOpen}
              onOpenChange={(open) => {
                setIsEditDialogOpen(open);
                if (!open) {
                  setEditingProduct(null);
                  setEditFiles([]);
                  setEditImagePreviews([]);
                }
              }}
            >
              <DialogContent className="bg-white">
                <DialogHeader>
                  <DialogTitle>Edit Product</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <Input placeholder="Item Name" value={eName} onChange={e => setEName(e.target.value)} />
                  <Input placeholder="Price (₹)" type="number" value={ePrice} onChange={e => setEPrice(e.target.value)} />
                  <Textarea placeholder="Description" value={eDescription} onChange={e => setEDescription(e.target.value)} />
                  <select
                    className="w-full border rounded-md px-3 py-2 text-sm"
                    value={selectedEditCategory}
                    onChange={(ev) => setSelectedEditCategory(ev.target.value)}
                  >
                    {(categories.length ? categories : [{ id: 0, name: "General" }]).map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-500">Change Image</p>
                      <Input type="file" accept="image/*" multiple onChange={e => handleEditFileSelect(e.target.files)} />
                      <div className="flex gap-2 flex-wrap">
                        {editImagePreviews.length > 0
                          ? editImagePreviews.map((src, idx) => (
                              <img key={idx} src={src} alt="preview" className="w-16 h-16 rounded object-cover border" />
                            ))
                          : (editingProduct?.imageUrl || (Array.isArray(editingProduct?.images) && editingProduct?.images[0])) && (
                              <img
                                src={toAbsolute((Array.isArray(editingProduct?.images) && editingProduct?.images[0]) || editingProduct?.imageUrl)}
                                alt={editingProduct?.name}
                                className="w-16 h-16 rounded object-cover border"
                              />
                            )}
                      </div>
                    </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                    <Button className="bg-orange-600" onClick={saveEdit} disabled={loading}>
                      {loading ? <Loader2 className="animate-spin" /> : "Save"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </main>
    </div>
  );
}