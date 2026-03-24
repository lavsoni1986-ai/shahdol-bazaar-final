import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Store, Package, Search, MapPin, HeartPulse, GraduationCap, Building2, ShieldCheck, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { openWhatsApp } from "@/lib/order-logic";

interface District {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
}

interface Store {
  id: number;
  name: string;
  slug: string | null;
  category: string;
  description: string | null;
  image: string | null;
  address: string | null;
  rating: number | null;
  avgRating: number | null;
  isVerified?: boolean;
  dsslScore?: number;
}

interface Product {
  id: number;
  name: string;
  title: string | null;
  price: string;
  mrp: string | null;
  imageUrl: string | null;
  category: string;
  shopName: string | null;
  stock: number;
  isTrending: boolean;
}

export default function Marketplace() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);

  // Get district from URL slug (e.g., /marketplace/shahdol) or use default
  const urlDistrictSlug = location.split("/marketplace/")[1]?.split("/")[0];
  const districtSlug = urlDistrictSlug || localStorage.getItem("districtSlug") || "shahdol";

  // Current district ID - used as dependency and safety check
  const currentDistrictId = selectedDistrict?.id;

  // Fetch district by slug
  const { data: districtData } = useQuery<District>({
    queryKey: ["district", districtSlug],
    queryFn: async () => {
      if (!districtSlug) return null;
      const res = await fetch(`/api/districts/${districtSlug}`);
      if (!res.ok) throw new Error("District not found");
      return res.json();
    },
    enabled: !!districtSlug,
  });

  // Fetch stores - only when districtId is available
  const { data: storesData } = useQuery<{ data: Store[] }>({
    queryKey: ["marketplace-stores", currentDistrictId],
    queryFn: async () => {
      // SAFETY CHECK: Stop if no districtId
      if (!currentDistrictId) return { data: [] };
      const params = new URLSearchParams();
      params.append("districtId", String(currentDistrictId));
      const res = await fetch(`/api/marketplace/stores?${params}`);
      if (!res.ok) throw new Error("Failed to fetch stores");
      return res.json();
    },
    // Only enable when districtId is available and valid
    enabled: !!currentDistrictId,
  });

  // Fetch featured products
  const { data: productsData } = useQuery<{ data: Product[]; pagination: any }>({
    queryKey: ["marketplace-products", currentDistrictId, searchQuery],
    queryFn: async () => {
      // SAFETY CHECK: Stop if no districtId
      if (!currentDistrictId) return { data: [], pagination: {} };
      const params = new URLSearchParams();
      params.append("districtId", String(currentDistrictId));
      if (searchQuery) params.append("search", searchQuery);
      params.append("limit", "12");
      const res = await fetch(`/api/marketplace/products?${params}`);
      if (!res.ok) throw new Error("Failed to fetch products");
      return res.json();
    },
    enabled: !!currentDistrictId,
  });

  // Set selected district when districtData changes - only if different to prevent loops
  useEffect(() => {
    if (districtData && (!selectedDistrict || selectedDistrict.id !== districtData.id)) {
      setSelectedDistrict(districtData);
    }
  }, [districtData]);

  const stores = storesData?.data || [];
  const products = productsData?.data || [];

  // Helper function to get icon based on store category
  const getStoreIcon = (category: string | null | object) => {
    // Handle category as object or string
    const catName = typeof category === 'object' 
      ? (category as any)?.name?.toLowerCase() 
      : String(category || '').toLowerCase();
    
    const safeCatName = catName || '';
    
    if (safeCatName.includes('health') || safeCatName.includes('hospital') || safeCatName.includes('clinic') || safeCatName.includes('medical')) {
      return <HeartPulse className="h-8 w-8 text-red-500" />;
    }
    if (safeCatName.includes('school') || safeCatName.includes('education') || safeCatName.includes('coaching') || safeCatName.includes('college')) {
      return <GraduationCap className="h-8 w-8 text-yellow-600" />;
    }
    if (safeCatName.includes('service') || safeCatName.includes('repair') || safeCatName.includes('hotel')) {
      return <Building2 className="h-8 w-8 text-blue-500" />;
    }
    return <Store className="h-8 w-8 text-orange-500" />;
  };

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-12">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-8">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl shadow-sm mb-10 flex flex-wrap gap-4 items-center relative z-10">
            <div className="flex-1 min-w-[200px]">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {selectedDistrict ? `${selectedDistrict.name} Marketplace` : "Shahdol Bazaar"}
              </h1>
              {selectedDistrict?.description && (
                <p className="text-gray-600 text-sm">{selectedDistrict.description}</p>
              )}
            </div>
            {/* Search */}
            <div className="relative min-w-[250px] flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search products, stores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border-gray-200 rounded-xl"
              />
            </div>
            <Link href="/">
              <Button variant="outline" className="rounded-xl">Back to Home</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        {/* Stores Section */}
        {stores.length > 0 && (
          <section className="mb-16">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Store className="h-6 w-6 text-orange-600" />
                Featured Stores
              </h2>
              <Link href={`/marketplace-stores${selectedDistrict ? `?district=${selectedDistrict.slug}` : ""}`}>
                <Button variant="outline" className="rounded-xl">View All</Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {stores.slice(0, 4).map((store) => (
                <Link key={store.id} href={`/marketplace/store/${store.slug || store.id}`}>
                  <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
                    <div className="aspect-video bg-gray-100 rounded-t-2xl overflow-hidden">
                      {store.image ? (
                        <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-orange-50">
                          <div className="w-16 h-16 bg-orange-50 rounded-xl flex items-center justify-center mx-auto mb-4">
                            {getStoreIcon(store.category as any)}
                          </div>
                        </div>
                      )}
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg font-bold text-gray-900">{store.name}</CardTitle>
                        {store.isVerified && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                            <ShieldCheck className="w-3 h-3" />
                            DSSL Verified
                          </span>
                        )}
                      </div>
                      <CardDescription className="text-orange-600 font-medium">
                        {store.category}
                        {store.dsslScore !== undefined && (
                          <span className="ml-2 text-amber-600">
                            • Trust Score: {store.dsslScore}/100
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {store.address && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{store.address}</span>
                        </div>
                      )}
                      {store.avgRating && store.avgRating > 0 && (
                        <div className="text-sm text-yellow-600 font-medium">
                          ⭐ {store.avgRating.toFixed(1)} ({store.rating || 0})
                        </div>
                      )}
                      <Button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl transition-colors mt-4">
                        View Store
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Products Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Package className="h-6 w-6 text-orange-600" />
              {searchQuery ? `Search Results` : "Featured Products"}
            </h2>
            {!searchQuery && (
              <Link href={`/marketplace/products${selectedDistrict ? `?district=${selectedDistrict.slug}` : ""}`}>
                <Button variant="outline" className="rounded-xl">View All</Button>
              </Link>
            )}
          </div>
          {products.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl">
              <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {products.map((product) => (
                <Link key={product.id} href={`/marketplace/product/${product.id}`}>
                  <Card className="bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-300 cursor-pointer h-full">
                    <div className="relative aspect-[16/9] overflow-hidden rounded-t-2xl">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-12 w-12 text-gray-300" />
                        </div>
                      )}
                      {/* Stock Badge */}
                      <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-bold ${
                        product.stock > 0 
                          ? "bg-green-100 text-green-800" 
                          : "bg-amber-100 text-amber-800"
                      }`}>
                        {product.stock > 0 ? "In Stock" : "Coming Soon"}
                      </div>
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-bold text-gray-900 line-clamp-2">{product.title || product.name}</CardTitle>
                      <CardDescription className="text-xs">{product.category}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-bold text-orange-600">₹{product.price}</span>
                        {product.mrp && parseFloat(product.mrp) > parseFloat(product.price) && (
                          <span className="text-xs text-gray-400 line-through">₹{product.mrp}</span>
                        )}
                      </div>
                      {product.shopName && (
                        <p className="text-xs text-gray-500 mb-3">by {product.shopName}</p>
                      )}
                      <Button 
                        className={`w-full font-bold py-2 rounded-xl transition-colors ${
                          product.stock > 0 
                            ? "bg-orange-600 hover:bg-orange-700 text-white" 
                            : "bg-gray-300 text-gray-500 cursor-not-allowed"
                        }`}
                        disabled={product.stock <= 0}
                      >
                        {product.stock > 0 ? "View Details" : "Contact Store"}
                      </Button>
                      <Button
                        variant="outline"
                        className="w-full mt-2 border-green-500 text-green-600 hover:bg-green-50"
                        onClick={(e) => {
                          e.preventDefault();
                          openWhatsApp(
                            product.title || product.name,
                            String(product.price),
                            product.shopName || undefined,
                            String(product.id),
                            (product as any).vendorId ? String((product as any).vendorId) : undefined,
                            (product as any).districtId ? String((product as any).districtId) : undefined
                          );
                        }}
                      >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Order on WhatsApp
                      </Button>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
