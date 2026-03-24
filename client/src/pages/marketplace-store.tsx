import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Store, MapPin, Phone, Package, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface StoreDetail {
  id: number;
  name: string;
  slug: string | null;
  type?: 'SHOP' | 'SERVICE' | 'HOSPITAL';
  businessType?: 'PRODUCT' | 'SERVICE' | 'HEALTHCARE' | 'SCHOOL';
  category: string;
  description: string | null;
  image: string | null;
  address: string | null;
  phone: string;
  mobile: string;
  rating: number | null;
  avgRating: number | null;
  reviewCount: number | null;
  products: Product[];
}

interface Product {
  id: number;
  name: string;
  title: string | null;
  price: string;
  mrp: string | null;
  imageUrl: string | null;
  category: string;
  description: string | null;
  stock: number;
  isTrending: boolean;
}

export default function MarketplaceStore() {
  const [, params] = useRoute("/marketplace/store/:slug");
  const routeParams = params as { slug?: string } | null;
  const slug = routeParams?.slug;

  const { data: store, isLoading } = useQuery<StoreDetail>({
    queryKey: ["marketplace-store", slug],
    queryFn: async () => {
      if (!slug) throw new Error("No slug provided");
      const res = await fetch(`/api/marketplace/stores/${slug}`);
      if (!res.ok) throw new Error("Store not found");
      return res.json();
    },
    enabled: !!slug,
  });

  // Handle case where slug is not available
  if (!routeParams?.slug) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Store</h2>
          <Link href="/marketplace">
            <Button>Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Store not found</h2>
          <Link href="/marketplace">
            <Button>Back to Marketplace</Button>
          </Link>
        </div>
      </div>
    );
  }

  const resolvedType =
    store.type ||
    (store.businessType === "HEALTHCARE"
      ? "HOSPITAL"
      : store.businessType === "SERVICE" || store.businessType === "SCHOOL"
        ? "SERVICE"
        : "SHOP");
  const contactNumber = (store?.mobile || store?.phone || "").replace(/\D/g, "");
  const sectionLabel =
    resolvedType === "HOSPITAL"
      ? "View Facilities"
      : resolvedType === "SERVICE"
        ? "View Courses/Services"
        : "Product List";
  const cardActionLabel =
    resolvedType === "HOSPITAL"
      ? "Book Appointment"
      : resolvedType === "SERVICE"
        ? "Book Inquiry"
        : "Add to Cart";
  const secondaryActionLabel =
    resolvedType === "HOSPITAL"
      ? "Emergency Contact"
      : resolvedType === "SERVICE"
        ? "Call Now"
        : "Buy Now";

  return (
    <div className="min-h-screen bg-gray-50 pt-24">
      {/* Header */}
      <div className="bg-gray-50 border-b shadow-sm">
        <div className="container mx-auto px-4 py-8">
          <Link href="/marketplace-stores" className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-orange-600 mb-6 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Stores
          </Link>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-32 h-32 md:w-40 md:h-40 bg-orange-50 rounded-2xl border border-orange-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {store.image ? (
                <img src={store.image} alt={store?.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Store className="h-16 w-16 text-orange-400" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-extrabold text-gray-900 mb-2">{store?.name || 'Store'}</h1>
              <p className="text-lg text-orange-600 font-medium mb-4">{store?.category || 'General'}</p>
              {store.description && (
                <p className="text-gray-600 mb-4 max-w-2xl">{store.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-sm mb-4">
                {store.address && (
                  <div className="flex items-center gap-1 text-gray-600">
                    <MapPin className="h-4 w-4" />
                    <span>{store.address}</span>
                  </div>
                )}
                <div className="flex items-center gap-1 text-gray-600">
                  <Phone className="h-4 w-4" />
                  <span>{store?.mobile || store?.phone}</span>
                </div>
                {store.avgRating && store.avgRating > 0 && (
                  <div className="text-yellow-600 font-medium">
                    ⭐ {store.avgRating.toFixed(1)} ({store?.reviewCount || 0} reviews)
                  </div>
                )}
              </div>
              {contactNumber && (
                <a href={`tel:${contactNumber}`} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-orange-600 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                  <Phone className="h-4 w-4" />
                  Call Store
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Products */}
      <div className="container mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Package className="h-6 w-6" />
          {sectionLabel} ({(store?.products?.length || 0)})
        </h2>
        {(store?.products?.length || 0) === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No products available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(store?.products || []).map((product) => (
              <Link key={product.id} href={`/marketplace/product/${product.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
                  <div className="relative aspect-[16/9] overflow-hidden rounded-t-lg">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <Package className="h-12 w-12 text-gray-400" />
                      </div>
                    )}
                    {/* Status Badge */}
                    {product.stock <= 0 ? (
                      <div className="absolute top-2 right-2 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                        COMING SOON
                      </div>
                    ) : (
                      <div className="absolute top-2 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded">
                        IN STOCK
                      </div>
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base line-clamp-2">{product.title || product.name}</CardTitle>
                    <CardDescription className="text-xs">{product.category}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg font-bold text-orange-600">₹{product.price}</span>
                      {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
                        <span className="text-xs text-gray-500 line-through">₹{product.mrp}</span>
                      )}
                    </div>
                    <div className="mt-auto">
                      {product.stock <= 0 ? (
                        <Button size="sm" className="w-full bg-amber-100 text-amber-700 hover:bg-amber-200" disabled>
                          Contact Store
                        </Button>
                      ) : (
                        <Button size="sm" className="w-full">
                          {cardActionLabel}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
