import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Package, Plus, Pencil, Trash2, Loader2, X, AlertCircle } from "lucide-react";

interface Product {
  id: number;
  title?: string;
  name?: string;
  price: string;
  mrp?: string | null;
  category: string;
  description?: string;
  stock: number;
  status: "pending" | "approved" | "rejected";
  approved: boolean;
  images?: string[];
  imageUrl?: string | null;
  createdAt?: string;
}

export default function PartnerProducts() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Get auth token
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  });

  const accessToken = localStorage.getItem("accessToken");
  const headers = {
    "Content-Type": "application/json",
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    price: "",
    mrp: "",
    category: "General",
    description: "",
    stock: 0,
  });
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadedImageUrls, setUploadedImageUrls] = useState<string[]>([]);

  // Check authentication
  useEffect(() => {
    if (!user.id || !accessToken) {
      setLocation("/auth?return=/partner/products");
      return;
    }
    if (user.role !== "MERCHANT" && user.role !== "SUPER_ADMIN" && user.role !== "seller") {
      toast({
        title: "Access Denied",
        description: "Only merchants can access this page",
        variant: "destructive",
      });
      setLocation("/partner");
    }
  }, [user, accessToken, setLocation, toast]);

  // Fetch products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/merchant/products", { headers });
      if (res.status === 401) {
        // Token expired, try refresh
        const refreshRes = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });
        if (refreshRes.ok) {
          const { accessToken: newToken, user: newUser } = await refreshRes.json();
          localStorage.setItem("accessToken", newToken);
          localStorage.setItem("user", JSON.stringify(newUser));
          setUser(newUser);
          // Retry with new token
          const retryRes = await fetch("/api/merchant/products", {
            headers: { ...headers, Authorization: `Bearer ${newToken}` },
          });
          if (retryRes.ok) {
            const data = await retryRes.json();
            setProducts(data.data || []);
          }
        } else {
          setLocation("/auth");
        }
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data.data || []);
    } catch (error: any) {
      console.error("Fetch products failed:", error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setCategories(data);
      }
    } catch (error) {
      console.error("Fetch categories failed:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Handle image selection
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 images
    const filesToAdd = files.slice(0, 5 - images.length);
    setImages([...images, ...filesToAdd]);

    // Create previews
    const previews = await Promise.all(
      filesToAdd.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    );
    setImagePreviews([...imagePreviews, ...previews]);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
    setImagePreviews(imagePreviews.filter((_, i) => i !== index));
  };

  // Upload images to Cloudinary
  const uploadImages = async (): Promise<string[]> => {
    if (images.length === 0) return [];

    const formData = new FormData();
    images.forEach((file) => formData.append("images", file));

    const res = await fetch("/api/upload", {
      method: "POST",
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      credentials: "include",
      body: formData,
    });

    if (!res.ok) throw new Error("Image upload failed");
    const data = await res.json();
    return data.urls || [];
  };

  // Create product
  const handleCreateProduct = async () => {
    try {
      if (!formData.title || !formData.price || !formData.category) {
        toast({
          title: "Validation Error",
          description: "Please fill all required fields",
          variant: "destructive",
        });
        return;
      }

      setLoading(true);

      // Upload images first
      const imageUrls = await uploadImages();
      
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("name", formData.title);
      formDataToSend.append("price", formData.price);
      if (formData.mrp) formDataToSend.append("mrp", formData.mrp);
      formDataToSend.append("category", formData.category);
      if (formData.description) formDataToSend.append("description", formData.description);
      formDataToSend.append("stock", String(formData.stock));
      
      imageUrls.forEach((url) => formDataToSend.append("imageUrls", url));
      images.forEach((file) => formDataToSend.append("images", file));

      const res = await fetch("/api/merchant/products", {
        method: "POST",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: "include",
        body: formDataToSend,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create product");
      }

      toast({
        title: "Success",
        description: "Product created successfully. Waiting for approval.",
      });

      resetForm();
      setIsAddDialogOpen(false);
      fetchProducts();
    } catch (error: any) {
      console.error("Create product failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create product",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update product
  const handleUpdateProduct = async () => {
    if (!selectedProduct) return;

    try {
      setLoading(true);

      const imageUrls = await uploadImages();
      const allImageUrls = [...uploadedImageUrls, ...imageUrls];

      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("name", formData.title);
      formDataToSend.append("price", formData.price);
      if (formData.mrp) formDataToSend.append("mrp", formData.mrp);
      formDataToSend.append("category", formData.category);
      if (formData.description) formDataToSend.append("description", formData.description);
      formDataToSend.append("stock", String(formData.stock));
      
      allImageUrls.forEach((url) => formDataToSend.append("imageUrls", url));
      images.forEach((file) => formDataToSend.append("images", file));

      const res = await fetch(`/api/merchant/products/${selectedProduct.id}`, {
        method: "PUT",
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        credentials: "include",
        body: formDataToSend,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update product");
      }

      toast({
        title: "Success",
        description: "Product updated successfully",
      });

      resetForm();
      setIsEditDialogOpen(false);
      fetchProducts();
    } catch (error: any) {
      console.error("Update product failed:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update product",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/merchant/products/${selectedProduct.id}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to delete product");

      toast({
        title: "Success",
        description: "Product deleted successfully",
      });

      setIsDeleteDialogOpen(false);
      setSelectedProduct(null);
      fetchProducts();
    } catch (error: any) {
      console.error("Delete product failed:", error);
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Update stock
  const handleStockToggle = async (product: Product) => {
    try {
      const newStock = product.stock > 0 ? 0 : 100; // Toggle between 0 and 100
      const res = await fetch(`/api/merchant/products/${product.id}/stock`, {
        method: "PATCH",
        headers,
        credentials: "include",
        body: JSON.stringify({ stock: newStock }),
      });

      if (!res.ok) throw new Error("Failed to update stock");
      fetchProducts();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update stock",
        variant: "destructive",
      });
    }
  };

  // Open edit dialog
  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      title: product.title || product.name || "",
      price: product.price || "",
      mrp: product.mrp || "",
      category: product.category || "General",
      description: product.description || "",
      stock: product.stock || 0,
    });
    setImagePreviews(product.images || [product.imageUrl || ""].filter(Boolean));
    setUploadedImageUrls(product.images || []);
    setImages([]);
    setIsEditDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      price: "",
      mrp: "",
      category: "General",
      description: "",
      stock: 0,
    });
    setImages([]);
    setImagePreviews([]);
    setUploadedImageUrls([]);
    setSelectedProduct(null);
  };

  // Get status badge
  const getStatusBadge = (status: string, approved: boolean) => {
    if (status === "approved" || approved) {
      return <Badge className="bg-green-500">Approved</Badge>;
    }
    if (status === "rejected") {
      return <Badge className="bg-red-500">Rejected</Badge>;
    }
    return <Badge className="bg-yellow-500">Pending</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
            <p className="text-gray-600 mt-1">Manage your products and inventory</p>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-orange-600 hover:bg-orange-700" onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Product Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Price (₹) *</Label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <Label>MRP (₹)</Label>
                    <Input
                      type="number"
                      value={formData.mrp}
                      onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Category *</Label>
                    <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Stock</Label>
                    <Input
                      type="number"
                      value={formData.stock}
                      onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Product description..."
                    rows={4}
                  />
                </div>
                <div>
                  <Label>Product Images (max 5)</Label>
                  <Input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="mb-2"
                  />
                  <div className="grid grid-cols-5 gap-2">
                    {imagePreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-20 object-cover rounded" />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-0 right-0 h-6 w-6"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <Button
                  onClick={handleCreateProduct}
                  disabled={loading}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Create Product
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Products Grid */}
        {loading && products.length === 0 ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
          </div>
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600">No products yet. Add your first product!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <Card key={product.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{product.title || product.name}</CardTitle>
                    {getStatusBadge(product.status, product.approved)}
                  </div>
                  <CardDescription>{product.category}</CardDescription>
                </CardHeader>
                <CardContent>
                  {(product.images && product.images.length > 0) || product.imageUrl ? (
                    <img
                      src={product.images?.[0] || product.imageUrl || ""}
                      alt={product.title || product.name}
                      className="w-full h-48 object-cover rounded mb-4"
                    />
                  ) : (
                    <div className="w-full h-48 bg-gray-200 rounded mb-4 flex items-center justify-center">
                      <Package className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-semibold">Price:</span>
                      <span>₹{product.price}</span>
                    </div>
                    {product.mrp && (
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>MRP:</span>
                        <span className="line-through">₹{product.mrp}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Stock:</span>
                      <span>{product.stock}</span>
                    </div>
                    {product.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{product.description}</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={product.stock > 0}
                      onCheckedChange={() => handleStockToggle(product)}
                    />
                    <Label className="text-sm">In Stock</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => openEditDialog(product)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={() => {
                        setSelectedProduct(product);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Product Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Price (₹) *</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label>MRP (₹)</Label>
                  <Input
                    type="number"
                    value={formData.mrp}
                    onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Category *</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    min="0"
                  />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Product description..."
                  rows={4}
                />
              </div>
              <div>
                <Label>Product Images (max 5)</Label>
                <Input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="mb-2"
                />
                <div className="grid grid-cols-5 gap-2">
                  {imagePreviews.map((preview, index) => (
                    <div key={index} className="relative">
                      <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-20 object-cover rounded" />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-0 right-0 h-6 w-6"
                        onClick={() => {
                          if (index < uploadedImageUrls.length) {
                            // Remove from uploaded images
                            setUploadedImageUrls(uploadedImageUrls.filter((_, i) => i !== index));
                          } else {
                            // Remove from new images
                            removeImage(index - uploadedImageUrls.length);
                          }
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <Button
                onClick={handleUpdateProduct}
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700"
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Update Product
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{selectedProduct?.title || selectedProduct?.name}". This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProduct}
                className="bg-red-600 hover:bg-red-700"
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
