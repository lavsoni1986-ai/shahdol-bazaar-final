# 📦 ADMIN PANEL - PRODUCT MANAGEMENT FEATURE

**Problem**: Admin panel doesn't have product upload/management for vendors  
**Solution**: Add complete product management section to admin panel  
**Effort**: 30-45 minutes to implement

---

## 🎯 CURRENT SITUATION

### ❌ What's Missing
```
Admin can:
✅ View vendors
✅ Edit vendor details (name, address, phone, logo)
✅ Approve/Reject vendors
✅ Verify vendors

But CANNOT:
❌ Upload products for vendors
❌ View vendor products
❌ Edit products
❌ Delete products
```

---

## ✅ SOLUTION: ADD PRODUCT TAB TO ADMIN PANEL

### Architecture
```
Admin Dashboard
├─ Vendors Tab (Current)
├─ Products Tab (NEW) ← Add this
│  ├─ All Products (list with filters)
│  ├─ Pending Approval (products awaiting admin approval)
│  ├─ Upload Product (form)
│  └─ Edit Product (modal)
├─ Inquiries Tab (Current)
└─ Districts Tab (Current)
```

---

## 🚀 IMPLEMENTATION

### Step 1: Add Product Types

Add this to the top of `client/src/pages/admin.tsx`:

```typescript
// Add Product types
type Product = {
  id: number;
  title: string;
  description?: string;
  price: number;
  mrp?: number;
  category?: string;
  stock: number;
  imageUrls?: string[];
  status?: string; // PENDING, APPROVED, REJECTED
  createdAt: string | Date;
  vendorId: number;
  vendor?: {
    name: string;
    id: number;
  };
};

type ProductTab = 'all' | 'pending' | 'upload' | 'edit';
```

---

### Step 2: Add State Management

Add these states after the existing vendor states:

```typescript
// Product management states
const [products, setProducts] = useState<Product[]>([]);
const [pendingProducts, setPendingProducts] = useState<Product[]>([]);
const [productTab, setProductTab] = useState<ProductTab>('all');
const [editingProduct, setEditingProduct] = useState<Product | null>(null);
const [productLoading, setProductLoading] = useState(false);

// Product form states
const [selectedVendor, setSelectedVendor] = useState<number | null>(null);
const [productForm, setProductForm] = useState({
  title: '',
  description: '',
  price: 0,
  mrp: 0,
  category: '',
  stock: 0,
});
const [productImages, setProductImages] = useState<File[]>([]);
```

---

### Step 3: Add Fetch Functions

Add these functions in the component:

```typescript
// Fetch all products
const fetchProducts = useCallback(async () => {
  try {
    const token = localStorage.getItem("accessToken");
    const res = await fetch("/api/admin/products", {
      credentials: "include",
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || "Failed to fetch products");
      return;
    }
    
    const data = await res.json();
    setProducts(data.data || []);
  } catch (e) {
    console.error("Fetch products error:", e);
    toast.error("Network error while fetching products");
  }
}, [toast]);

// Fetch pending products
const fetchPendingProducts = useCallback(async () => {
  try {
    const token = localStorage.getItem("accessToken");
    const res = await fetch("/api/admin/products/pending", {
      credentials: "include",
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || "Failed to fetch pending products");
      return;
    }
    
    const data = await res.json();
    setPendingProducts(data.data || []);
  } catch (e) {
    console.error("Fetch pending products error:", e);
    toast.error("Network error");
  }
}, [toast]);

// Upload product
const uploadProduct = async (formData: FormData) => {
  if (!selectedVendor) {
    toast.error("Please select a vendor");
    return;
  }
  
  setProductLoading(true);
  try {
    const token = localStorage.getItem("accessToken");
    const res = await fetch("/api/merchant/products", {
      credentials: "include",
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData
    });
    
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.message || "Failed to upload product");
      return;
    }
    
    toast.success("Product uploaded successfully!");
    setProductForm({ title: '', description: '', price: 0, mrp: 0, category: '', stock: 0 });
    setProductImages([]);
    fetchProducts();
    setProductTab('all');
  } catch (e) {
    console.error("Upload error:", e);
    toast.error("Failed to upload product");
  } finally {
    setProductLoading(false);
  }
};

// Approve product
const approveProduct = async (productId: number) => {
  try {
    const token = localStorage.getItem("accessToken");
    const res = await fetch(`/api/admin/products/${productId}/approve`, {
      credentials: "include",
      method: "PATCH",
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (res.ok) {
      toast.success("Product approved!");
      fetchPendingProducts();
      fetchProducts();
    }
  } catch (e) {
    toast.error("Failed to approve product");
  }
};

// Reject product
const rejectProduct = async (productId: number) => {
  try {
    const token = localStorage.getItem("accessToken");
    const res = await fetch(`/api/admin/products/${productId}/reject`, {
      credentials: "include",
      method: "PATCH",
      headers: { "Authorization": `Bearer ${token}` }
    });
    
    if (res.ok) {
      toast.success("Product rejected!");
      fetchPendingProducts();
      fetchProducts();
    }
  } catch (e) {
    toast.error("Failed to reject product");
  }
};
```

---

### Step 4: Add useEffect to Load Products

Add this after the vendors useEffect:

```typescript
useEffect(() => {
  if (loggedIn && activeTab === 'all') {
    fetchProducts();
    fetchPendingProducts();
  }
}, [loggedIn, activeTab, fetchProducts, fetchPendingProducts]);
```

---

### Step 5: Add Tabs Navigation

Find the tabs section (around line 821) and add a "Products" tab:

```typescript
{/* Tabs */}
<div className="p-4 border-b border-white/5 flex gap-2 flex-wrap">
  {/* Existing tabs... */}
  
  {/* NEW: Products Tab */}
  <button
    onClick={() => {
      setActiveTab('all');
      setProductTab('all');
    }}
    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
      activeTab === 'all' && productTab === 'all'
        ? 'bg-purple-600 text-white' 
        : 'bg-white/5 text-slate-400 hover:bg-white/10'
    }`}
  >
    📦 Products ({products.length})
  </button>
</div>
```

---

### Step 6: Add Product Management UI

Add this section at the end of the form (before closing Dialog or before the closing div):

```typescript
{/* PRODUCTS SECTION */}
{productTab === 'all' && (
  <div className="space-y-6 mt-12">
    <h2 className="text-2xl font-black text-white flex items-center gap-2">
      <Package size={24} className="text-purple-500" />
      Product Management
    </h2>

    {/* Action Buttons */}
    <div className="flex gap-2">
      <button
        onClick={() => setProductTab('all')}
        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
          productTab === 'all'
            ? 'bg-purple-600 text-white'
            : 'bg-white/5 text-slate-400 hover:bg-white/10'
        }`}
      >
        All Products ({products.length})
      </button>
      <button
        onClick={() => setProductTab('pending')}
        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
          productTab === 'pending'
            ? 'bg-yellow-600 text-white'
            : 'bg-white/5 text-slate-400 hover:bg-white/10'
        }`}
      >
        Pending Approval ({pendingProducts.length})
      </button>
      <button
        onClick={() => setProductTab('upload')}
        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
          productTab === 'upload'
            ? 'bg-green-600 text-white'
            : 'bg-white/5 text-slate-400 hover:bg-white/10'
        }`}
      >
        + Upload Product
      </button>
    </div>

    {/* All Products List */}
    {productTab === 'all' && (
      <div className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] overflow-hidden">
        {products.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <Package size={32} className="mx-auto mb-2 opacity-50" />
            <p>No products yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {products.map((product) => (
              <div key={product.id} className="p-6 flex justify-between items-center hover:bg-white/[0.02]">
                <div className="flex-1">
                  <h4 className="font-bold text-white mb-1">{product.title}</h4>
                  <p className="text-sm text-slate-500 mb-2">{product.description}</p>
                  <div className="flex gap-4 text-xs text-slate-400">
                    <span>Price: ₹{product.price}</span>
                    <span>Stock: {product.stock}</span>
                    <span>Vendor: {product.vendor?.name}</span>
                    <span className={`font-bold ${
                      product.status === 'APPROVED' ? 'text-green-400' :
                      product.status === 'REJECTED' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {product.status || 'PENDING'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingProduct(product)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      // Add delete functionality
                      toast.info("Delete coming soon");
                    }}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs font-bold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Pending Products */}
    {productTab === 'pending' && (
      <div className="bg-[#0a0a0a] border border-yellow-500/30 rounded-[2rem] overflow-hidden">
        {pendingProducts.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <CheckCircle size={32} className="mx-auto mb-2 opacity-50" />
            <p>No pending products ✅</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {pendingProducts.map((product) => (
              <div key={product.id} className="p-6 flex justify-between items-center hover:bg-white/[0.02]">
                <div className="flex-1">
                  <h4 className="font-bold text-white mb-1">{product.title}</h4>
                  <p className="text-sm text-slate-500 mb-2">{product.description}</p>
                  <div className="flex gap-4 text-xs text-slate-400">
                    <span>Vendor: {product.vendor?.name}</span>
                    <span>Price: ₹{product.price}</span>
                    <span>Awaiting approval ⏳</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveProduct(product.id)}
                    className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-xs font-bold flex items-center gap-1"
                  >
                    <Check size={12} /> Approve
                  </button>
                  <button
                    onClick={() => rejectProduct(product.id)}
                    className="px-3 py-1 bg-red-600 hover:bg-red-500 rounded text-xs font-bold flex items-center gap-1"
                  >
                    <X size={12} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

    {/* Upload Product Form */}
    {productTab === 'upload' && (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData();
          formData.append('title', productForm.title);
          formData.append('description', productForm.description);
          formData.append('price', productForm.price.toString());
          formData.append('mrp', productForm.mrp.toString());
          formData.append('category', productForm.category);
          formData.append('stock', productForm.stock.toString());
          formData.append('vendorId', selectedVendor?.toString() || '');
          
          productImages.forEach((img) => {
            formData.append('images', img);
          });
          
          uploadProduct(formData);
        }}
        className="bg-[#0a0a0a] border border-white/10 rounded-[2rem] p-6 space-y-4"
      >
        {/* Select Vendor */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Select Vendor *
          </label>
          <select
            value={selectedVendor || ''}
            onChange={(e) => setSelectedVendor(Number(e.target.value))}
            required
            className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
          >
            <option value="">Choose a vendor...</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} ({v.category})
              </option>
            ))}
          </select>
        </div>

        {/* Product Title */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Product Title *
          </label>
          <Input
            required
            value={productForm.title}
            onChange={(e) => setProductForm({ ...productForm, title: e.target.value })}
            className="bg-white/10 border-white/20"
            placeholder="Product name"
          />
        </div>

        {/* Product Description */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Description
          </label>
          <Textarea
            value={productForm.description}
            onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
            className="bg-white/10 border-white/20 h-20"
            placeholder="Product details"
          />
        </div>

        {/* Price & MRP */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Price (₹)
            </label>
            <Input
              type="number"
              required
              value={productForm.price}
              onChange={(e) => setProductForm({ ...productForm, price: Number(e.target.value) })}
              className="bg-white/10 border-white/20"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              MRP (₹)
            </label>
            <Input
              type="number"
              value={productForm.mrp}
              onChange={(e) => setProductForm({ ...productForm, mrp: Number(e.target.value) })}
              className="bg-white/10 border-white/20"
            />
          </div>
        </div>

        {/* Category & Stock */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Category
            </label>
            <Input
              value={productForm.category}
              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
              className="bg-white/10 border-white/20"
              placeholder="Electronics, Groceries, etc"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">
              Stock *
            </label>
            <Input
              type="number"
              required
              value={productForm.stock}
              onChange={(e) => setProductForm({ ...productForm, stock: Number(e.target.value) })}
              className="bg-white/10 border-white/20"
            />
          </div>
        </div>

        {/* Product Images */}
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-2">
            Product Images
          </label>
          <div className="flex items-center gap-2">
            <Input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setProductImages(Array.from(e.target.files || []))}
              className="bg-white/10 border-white/20 text-slate-400"
            />
            <span className="text-xs text-slate-500">
              ({productImages.length} files selected)
            </span>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={productLoading}
          className="w-full py-2 bg-green-600 hover:bg-green-500 disabled:bg-slate-600 text-white font-bold rounded-lg transition-all"
        >
          {productLoading ? '⏳ Uploading...' : '✅ Upload Product'}
        </button>
      </form>
    )}
  </div>
)}
```

---

## 🔗 BACKEND API REQUIREMENTS

Make sure these endpoints exist in your `routes.ts`:

```typescript
// These endpoints should exist:

// Get all products (admin)
app.get("/api/admin/products", requireAuth, requireSuperAdmin, ...);

// Get pending products (admin)
app.get("/api/admin/products/pending", requireAuth, requireSuperAdmin, ...);

// Create product (merchant)
app.post("/api/merchant/products", requireAuth, requireMerchant, upload.array("images"), ...);

// Approve product (admin)
app.patch("/api/admin/products/:id/approve", requireAuth, requireSuperAdmin, ...);

// Reject product (admin)
app.patch("/api/admin/products/:id/reject", requireAuth, requireSuperAdmin, ...);
```

**If these don't exist, let me know and I'll create them!**

---

## 📋 VERIFICATION CHECKLIST

After implementation:

- [ ] Products tab visible in admin panel
- [ ] Can select vendor from dropdown
- [ ] Can fill product details
- [ ] Can upload images
- [ ] Products appear in "All Products" list
- [ ] Pending products show separately
- [ ] Can approve/reject products
- [ ] Errors show as toast notifications
- [ ] Loading state shows during upload

---

## ✅ HOW TO USE (For Admin)

```
1. Open Admin Panel
2. Click "📦 Products" tab
3. Click "+ Upload Product"
4. Select vendor (e.g., "Laxmi Electronics")
5. Fill:
   ├─ Product name (e.g., "Samsung 55 inch TV")
   ├─ Description
   ├─ Price
   ├─ Stock
   ├─ Category
   └─ Images
6. Click "Upload Product"
7. Product appears in "Pending Approval"
8. Approve from pending list
9. Product is live!
```

---

## 🚀 DEPLOYMENT

After adding this code:

1. Save the file
2. Restart dev server
3. Open admin panel
4. You should see "Products" tab now
5. Test uploading a product
6. Verify in pending products list

---

**Ready to add product management to your admin panel?** 🎉

Let me know if you need the backend endpoints created too!
