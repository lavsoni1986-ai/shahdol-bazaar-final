import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import { Package, ShoppingCart, ArrowLeft, Store, Plus, Minus, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";

interface ProductDetail {
  id: number;
  name: string;
  title: string | null;
  price: string;
  mrp: string | null;
  imageUrl: string | null;
  category: string;
  description: string | null;
  stock: number;
  shopName: string | null;
  shopId: number;
  vendorId?: number;
  storeType?: 'SHOP' | 'SERVICE' | 'HOSPITAL';
  vendor?: {
    phone?: string | null;
    mobile?: string | null;
  };
}

export default function MarketplaceProduct() {
  const [, params] = useRoute("/marketplace/product/:id");
  const routeParams = params as { id?: string } | null;
  const productId = routeParams?.id;
  const { addToCart } = useCart();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery<ProductDetail>({
    queryKey: ["marketplace-product", productId],
    queryFn: async () => {
      const res = await fetch(`/api/products/${productId}`);
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    },
    enabled: !!productId,
  });

  // Handle case where productId is not available
  if (!routeParams?.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product not found</h2>
          <Link href="/marketplace">
            <Button>Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (!product) return;
    
    if (product.stock < quantity) {
      toast.error("Insufficient stock");
      return;
    }

    // Add to cart with quantity
    for (let i = 0; i < quantity; i++) {
      // Use vendorId if available, otherwise fall back to shopId
      const vendorOrShopId = product.vendorId ?? product.shopId;
      addToCart({
        id: product.id,
        productId: Number(product.id),
        name: product.title || product.name,
        price: product.price,
        imageUrl: product.imageUrl ?? undefined,
        shopId: Number(vendorOrShopId),
        vendorId: product.vendorId ? Number(product.vendorId) : undefined,
        shopName: product.shopName || undefined,
      });
    }

    toast.success("Added to cart");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Product not found</h2>
          <Link href="/marketplace">
            <Button>Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  const discount = product.mrp && parseFloat(product.mrp) > parseFloat(product.price)
    ? Math.round(((parseFloat(product.mrp) - parseFloat(product.price)) / parseFloat(product.mrp)) * 100)
    : 0;
  const resolvedType = product.storeType || "SHOP";
  const contactNumber = (product.vendor?.mobile || product.vendor?.phone || "").replace(/\D/g, "");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-4">
          <Link href="/marketplace">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Marketplace
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image */}
          <div className="bg-white rounded-lg overflow-hidden">
            <div className="aspect-square bg-gray-200">
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-32 w-32 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product?.title || product?.name || 'Product'}</h1>
              <p className="text-lg text-gray-600">{(product?.category as any)?.name || product?.category || 'General'}</p>
            </div>

            {product.shopName && (
              <Link href={`/marketplace/store/${product.shopId}`}>
                <div className="flex items-center gap-2 text-gray-600 hover:text-orange-600 transition-colors">
                  <Store className="h-4 w-4" />
                  <span>{product.shopName}</span>
                </div>
              </Link>
            )}

            {/* Price */}
            <div className="flex items-center gap-4">
              <span className="text-4xl font-bold text-orange-600">₹{product.price}</span>
              {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
                <>
                  <span className="text-2xl text-gray-500 line-through">₹{product.mrp}</span>
                  {discount > 0 && (
                    <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                      {discount}% OFF
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
              </div>
            )}

            {/* Stock */}
            <div>
              {product.stock > 0 ? (
                <p className="text-green-600 font-semibold">In Stock ({product.stock} available)</p>
              ) : (
                <p className="text-amber-600 font-semibold">Coming Soon - Contact Store</p>
              )}
            </div>

            {/* Quantity & Add to Cart */}
            {product.stock > 0 && resolvedType === "SHOP" && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <span className="font-semibold">Quantity:</span>
                  <div className="flex items-center gap-2 border rounded-lg">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center font-semibold">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      disabled={quantity >= product.stock}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button
                  onClick={handleAddToCart}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  size="lg"
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Add to Cart
                </Button>
              </div>
            )}

            {resolvedType !== "SHOP" && (
              <div className="space-y-3">
                <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white" size="lg">
                  {resolvedType === "HOSPITAL" ? "Book Appointment" : "Book Inquiry"}
                </Button>
                {contactNumber && (
                  <a href={`tel:${contactNumber}`}>
                    <Button variant="outline" className="w-full" size="lg">
                      <Phone className="h-5 w-5 mr-2" />
                      {resolvedType === "HOSPITAL" ? "Emergency Contact" : "Call Now"}
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
