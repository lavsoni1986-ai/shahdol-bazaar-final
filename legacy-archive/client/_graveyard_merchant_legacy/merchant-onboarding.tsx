import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Store, Package, Upload, ArrowRight, Check, Loader2, X, Clock } from "lucide-react";
import { SOVEREIGN_CONFIG } from "@/lib/SovereignConstants";

// Category classification - using category directly

// Step 1: Shop Profile Schema
const shopProfileSchema = z.object({
  shopName: z.string().min(3, "Shop name must be at least 3 characters"),
  shopCategory: z.string().min(1, "Please select a category"),
  shopMobile: z.string().min(10, "Valid mobile number required"),
  shopAddress: z.string().min(5, "Address is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// Step 2: Product Schema with price validation
const productSchema = z.object({
  name: z.string().min(2, "Product name required"),
  description: z.string().optional(),
  image: z.string().optional(),
  originalPrice: z.coerce.number().min(1, "Original price required"),
  sellingPrice: z.coerce.number().min(1, "Selling price required"),
}).refine((data) => data.sellingPrice < data.originalPrice, {
  message: "Selling price must be less than original price!",
  path: ["sellingPrice"],
});

type ShopProfile = z.infer<typeof shopProfileSchema>;
type Product = z.infer<typeof productSchema>;

const categories = [
  "Grocery",
  "Electronics",
  "Clothing",
  "Hospital",
  "Pharmacy",
  "Restaurant",
  "Hardware",
  "Mobile & Accessories",
  "Home Decor",
  "Sports",
  "Books",
  "Jewelry",
  "Other",
];

export default function MerchantOnboarding() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [shopData, setShopData] = useState<ShopProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [vendorStatus, setVendorStatus] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  // Safe user extraction with fallback
  const getUser = () => {
    try {
      if (typeof window === "undefined") return {};
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error("User parse error:", e);
      return {};
    }
  };
  const user = getUser();

  // Check vendor status on mount
  useEffect(() => {
    const checkVendorStatus = async () => {
      try {
        const res = await apiRequest("GET", "/vendors");
        if (res.ok) {
          const vendors = await res.json();
          const myVendor = vendors.find((v: any) => v.userId === user.id || v.name === user.username);
          if (myVendor) {
            setVendorStatus(myVendor.status);
          }
        }
      } catch (e) {
        console.error("Vendor check error:", e);
      }
    };
    
    if (user.id) {
      checkVendorStatus();
    }
  }, [user.id]);

  const profileForm = useForm<ShopProfile>({
    resolver: zodResolver(shopProfileSchema),
    defaultValues: {
      shopName: "",
      shopCategory: "",
      shopMobile: "",
      shopAddress: "",
      password: "",
    },
  });

  const productForm = useForm<Product>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      image: "",
      originalPrice: 0,
      sellingPrice: 0,
    },
  });

  // Handle image upload to Cloudinary
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const res = await apiRequest("POST", "/upload", formData);
      
      if (res.ok) {
        const data = await res.json();
        productForm.setValue("image", data.url);
        setImagePreview(data.url);
        toast({ title: "Image uploaded!" });
      } else {
        throw new Error("Upload failed");
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Upload failed", description: error.message });
    } finally {
      setUploading(false);
    }
  };

  // Step 1: Submit Shop Profile
  const onSubmitProfile = async (data: ShopProfile) => {
    // Validate password length
    if (!data.password || data.password.length < 8) {
      toast({ variant: "destructive", title: "Error", description: "Password must be at least 8 characters" });
      return;
    }
    
    setLoading(true);
    try {
      // First register/update user as seller
      const response = await fetch("http://localhost:5002/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-District-Slug": "shahdol"
        },
        body: JSON.stringify({
          role: "seller",
          username: data.shopMobile,
          password: data.password,
          shopName: data.shopName,
          shopCategory: data.shopCategory,
          shopMobile: data.shopMobile,
          shopAddress: data.shopAddress,
          category: data.shopCategory,
          districtId: SOVEREIGN_CONFIG.DEFAULT_DISTRICT_ID,
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || "Registration failed");
      }

      // ✅ Token is in httpOnly cookie - no need to store in localStorage
      // User data will be synced via AuthContext
      const result = await response.json();

      setShopData(data);
      setStep(2);
      toast({ title: "Shop Registered!", description: "Now add your products" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Add Product
  const onAddProduct = (data: Product) => {
    if (!data.image) {
      toast({ variant: "destructive", title: "Image required", description: "Please upload a product image" });
      return;
    }
    setProducts([...products, { ...data, image: data.image }]);
    setImagePreview(null);
    productForm.reset({ name: "", description: "", image: "", originalPrice: 0, sellingPrice: 0 });
    toast({ title: "Product Added", description: `${data.name} added to your inventory` });
  };

  // Remove product from list
  const removeProduct = (index: number) => {
    const newProducts = [...products];
    newProducts.splice(index, 1);
    setProducts(newProducts);
  };

  // Step 3: Complete Onboarding
  const completeOnboarding = async () => {
    setLoading(true);
    try {
      // Upload products one by one
      for (const product of products) {
        await apiRequest("POST", "/products", {
          ...product,
          categoryName: shopData?.shopCategory,
          districtId: SOVEREIGN_CONFIG.DEFAULT_DISTRICT_ID,
        });
      }

      toast({ 
        title: "🎉 Welcome to Shahdol Bazaar!", 
        description: "Your shop has been created. You can now add products and manage your store." 
      });
      setLocation("/partner");
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white py-8 px-4 pb-24 md:py-12 md:pt-32 md:pb-20">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Already have a shop link - Login for existing vendors */}
        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-4 mb-6 text-center">
          <p className="text-orange-400">
            Already have a shop?{" "}
            <a 
              href="/auth?mode=login&role=vendor" 
              className="text-orange-500 hover:text-orange-400 underline font-bold"
            >
              Login here
            </a>
          </p>
        </div>
        
        {/* Pending Review Overlay */}
        {vendorStatus === "PENDING" && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-3 mb-2">
              <Clock className="text-yellow-500" size={24} />
              <h3 className="font-bold text-yellow-500">Pending Approval</h3>
            </div>
            <p className="text-sm text-gray-400">
              Your shop is pending admin approval. You can add products, but they will only be visible after your shop is approved.
            </p>
            <Button 
              onClick={() => setLocation("/partner")} 
              className="mt-4 bg-yellow-600 hover:bg-yellow-700"
            >
              Go to Dashboard
            </Button>
          </div>
        )}
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                  step >= s ? "bg-orange-600 text-white" : "bg-white/10 text-gray-500"
                }`}
              >
                {step > s ? <Check size={18} /> : s}
              </div>
              {s < 3 && (
                <div className={`w-16 h-1 ${step > s ? "bg-orange-600" : "bg-white/10"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Shop Profile */}
        {step === 1 && (
          <Card className="bg-[#0a0a0a] border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="text-orange-500" />
                Step 1: Shop Profile
              </CardTitle>
              <CardDescription>Tell us about your business</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={profileForm.handleSubmit(onSubmitProfile)} className="space-y-4">
                <div>
                  <Label htmlFor="shopName">Shop Name</Label>
                  <Input
                    id="shopName"
                    autoComplete="organization"
                    {...profileForm.register("shopName")}
                    placeholder="Your Shop Name"
                    className="bg-white/5 border-white/10 text-white font-black placeholder:text-slate-500 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/20 transition-all"
                  />
                  {profileForm.formState.errors.shopName && (
                    <p className="text-red-500 text-sm mt-1">{profileForm.formState.errors.shopName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="shopCategory">Category</Label>
                  <Select onValueChange={(v: string) => profileForm.setValue("shopCategory", v)}>
                    <SelectTrigger id="shopCategory" className="bg-white/5 border-white/10 text-white">
                      <SelectValue placeholder="Select category" className="text-slate-400" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                      {(categories || []).map((cat) => (
                        <SelectItem 
                          key={cat} 
                          value={cat}
                          className="text-white hover:bg-orange-600 focus:bg-orange-600 focus:text-white cursor-pointer"
                        >
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="shopMobile">Mobile Number</Label>
                  <Input
                    id="shopMobile"
                    autoComplete="tel"
                    {...profileForm.register("shopMobile")}
                    placeholder="10-digit mobile number"
                    type="tel"
                    className="bg-white/5 border-white/10 text-white font-bold placeholder:text-slate-500 focus:text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    autoComplete="new-password"
                    {...profileForm.register("password")}
                    type="password"
                    placeholder="Minimum 8 characters"
                    className="bg-white/5 border-white/10 text-white font-bold placeholder:text-slate-500 focus:text-white"
                  />
                  {profileForm.formState.errors.password && (
                    <p className="text-red-500 text-sm mt-1">{profileForm.formState.errors.password.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="shopAddress">Shop Address</Label>
                  <Textarea
                    id="shopAddress"
                    autoComplete="street-address"
                    {...profileForm.register("shopAddress")}
                    placeholder="Full address"
                    className="bg-white/5 border-white/10 text-white font-bold placeholder:text-slate-500 focus:text-white"
                  />
                </div>

                <Button type="submit" className="w-full bg-orange-600" disabled={loading}>
                  {loading ? <Loader2 className="animate-spin mr-2" /> : "Continue"}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Add Products */}
        {step === 2 && (
          <Card className="bg-[#0a0a0a] border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="text-orange-500" />
                Step 2: Add Products
              </CardTitle>
              <CardDescription>Add your first products (optional - can add more later)</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Product List */}
              {products.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-bold mb-2">Added Products ({products.length})</h4>
                  <div className="space-y-2">
                    {products.map((p, i) => (
                      <div key={i} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          {p.image && <img src={p.image} alt={p.name} className="w-10 h-10 rounded object-cover" />}
                          <span>{p.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-orange-500">₹{p.sellingPrice}</span>
                          <button onClick={() => removeProduct(i)} className="text-red-500 hover:text-red-400">
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Product Form */}
              <form onSubmit={productForm.handleSubmit(onAddProduct)} className="space-y-4">
                <div>
                  <Label>Product Name</Label>
                  <Input
                    {...productForm.register("name")}
                    placeholder="e.g., Samsung Mobile"
                    className="bg-white/5 border-white/10 text-white font-bold placeholder:text-slate-500 focus:text-white"
                  />
                </div>

                <div>
                  <Label>Description</Label>
                  <Textarea
                    {...productForm.register("description")}
                    placeholder="Product details..."
                    className="bg-white/5 border-white/10 text-white font-bold placeholder:text-slate-500 focus:text-white"
                  />
                </div>

                {/* Image Upload */}
                <div>
                  <Label>Product Image</Label>
                  <div className="flex items-center gap-4">
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors text-white">
                      <Upload size={16} />
                      <span className="text-sm">{uploading ? "Uploading..." : "Upload Image"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                    {imagePreview && (
                      <img src={imagePreview} alt="Preview" className="w-16 h-16 rounded object-cover" />
                    )}
                  </div>
                  {productForm.formState.errors.image && (
                    <p className="text-red-500 text-sm mt-1">{productForm.formState.errors.image.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Original Price (MRP)</Label>
                    <Input
                      type="number"
                      {...productForm.register("originalPrice")}
                      placeholder="₹"
                      className="bg-white/5 border-white/10 text-white font-black placeholder:text-slate-500 focus:text-white"
                    />
                  </div>
                  <div>
                    <Label>Selling Price</Label>
                    <Input
                      type="number"
                      {...productForm.register("sellingPrice")}
                      placeholder="₹"
                      className="bg-white/5 border-white/10 text-white font-black placeholder:text-slate-500 focus:text-white"
                    />
                  </div>
                </div>
                {productForm.formState.errors.sellingPrice && (
                  <p className="text-red-500 text-sm">{productForm.formState.errors.sellingPrice.message}</p>
                )}

                <div className="flex gap-2">
                  <Button type="submit" className="flex-1 bg-green-600">
                    Add Product
                  </Button>
                </div>
              </form>

              {/* Navigation */}
              <div className="flex gap-2 mt-6">
                <Button variant="outline" onClick={() => setStep(3)} className="flex-1">
                  Skip & Continue
                </Button>
                <Button onClick={() => completeOnboarding()} disabled={loading || products.length === 0} className="flex-1 bg-orange-600">
                  {loading ? <Loader2 className="animate-spin" /> : "Complete Setup"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Complete */}
        {step === 3 && (
          <Card className="bg-[#0a0a0a] border-white/10">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={32} className="text-orange-500" />
              </div>
              <CardTitle>You're All Set!</CardTitle>
              <CardDescription>
                Your shop "{shopData?.shopName}" has been created.
                <br />
                Status: <span className="text-yellow-500">PENDING APPROVAL</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white/5 p-4 rounded-lg">
                <h4 className="font-bold mb-2">What happens next?</h4>
                <ul className="text-sm text-gray-400 space-y-2">
                  <li>• Admin will review your shop within 24 hours</li>
                  <li>• Once approved, your products will be visible</li>
                  <li>• Customers can order via WhatsApp</li>
                </ul>
              </div>

              <Button onClick={() => setLocation("/partner")} className="w-full bg-orange-600">
                Go to Dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
