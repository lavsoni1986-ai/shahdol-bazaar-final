import { useEffect, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { Loader2 } from "lucide-react";

interface Shop {
  id: number;
  name: string;
  slug: string;
  category: string;
  description?: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
  isFeatured?: boolean;
}

export default function CategoryListing() {
  const [location] = useLocation();
  const [, params] = useRoute("/category/:slug");
  const routeParams = params as { slug?: string } | null;
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Try to get category/search term from URL:
    // 1. From route param: /category/:slug
    // 2. From query param: /search?q=term or /category-listing?category=Hospitals
    
    let searchTerm = "";
    
    // Check route params first
    if (routeParams?.slug) {
      searchTerm = routeParams.slug;
    } else {
      // Check query params - support both 'category' and 'q' (for search)
      const urlParams = new URLSearchParams(window.location.search);
      searchTerm = urlParams.get("q") || urlParams.get("category") || "";
    }

    if (!searchTerm) {
      setError("No search term specified");
      setLoading(false);
      return;
    }

    // Convert slug format to readable name if needed (e.g., "hospitals" -> "Hospitals")
    const displayName = searchTerm
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    setCategoryName(displayName);
    fetchShopsByCategory(searchTerm);
  }, [location, params]);

  const fetchShopsByCategory = async (category: string) => {
    try {
      setLoading(true);
      setError("");

      // Fetch from vendors API first
      let vendorRes = await fetch(`/api/vendors?category=${encodeURIComponent(category)}`);
      let allShops: any[] = [];
      
      if (vendorRes.ok) {
        const vendors = await vendorRes.json();
        allShops = vendors.map((v: any) => ({
          id: v.id,
          name: v.name,
          slug: v.slug,
          description: v.description,
          image: v.logo,
          category: v.category,
          isVerified: v.isVerified,
          avgRating: v.dsslScore / 20,
          isFeatured: false
        }));
      } else {
        // Fallback to shops API
        const res = await fetch("/api/shops");
        if (!res.ok) throw new Error("Failed to load shops");

        const data = await res.json();
        // Handle both { data: shops } and direct array formats
        allShops = Array.isArray(data) ? data : data?.data || data?.shops || [];
      }

      // Filter shops by category or search term (case-insensitive)
      const filtered = allShops.filter(
        (shop: any) => {
          if (!shop.category) return false;
          const categoryLower = shop.category.toLowerCase();
          const searchLower = category.toLowerCase();
          // Match category name or search term
          return categoryLower === searchLower || 
                 shop.name.toLowerCase().includes(searchLower) ||
                 (shop.description && shop.description.toLowerCase().includes(searchLower));
        }
      );

      // Sort by featured, then by rating
      filtered.sort((a: Shop, b: Shop) => {
        if (a.isFeatured !== b.isFeatured) {
          return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
        }
        return (b.rating || 0) - (a.rating || 0);
      });

      setShops(filtered);
    } catch (err) {
      console.error("Error fetching shops:", err);
      setError("Failed to load shops. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 capitalize mb-2">
            {categoryName}
          </h1>
          <p className="text-slate-600">
            {loading
              ? "Loading shops..."
              : `${shops.length} shop${shops.length !== 1 ? "s" : ""} found`}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-orange-600 mx-auto mb-4" />
              <p className="text-slate-600">Loading shops for {categoryName}...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-700 font-semibold mb-4">{error}</p>
            <Link href="/" className="text-red-600 hover:text-red-700 underline">
              Back to Home
            </Link>
          </div>
        )}

        {/* No Results */}
        {!loading && !error && shops.length === 0 && (
          <div className="bg-slate-100 rounded-lg p-12 text-center">
            <p className="text-slate-600 text-lg mb-4">
              No shops found in {categoryName}
            </p>
            <Link href="/" className="text-orange-600 hover:text-orange-700 underline">
              Back to Home
            </Link>
          </div>
        )}

        {/* Shops Grid */}
        {!loading && shops.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {shops.map((shop) => (
              <Link
                key={shop.id}
                href={`/shop/${shop.id}`}
                className="group block"
              >
                <div className="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-full flex flex-col">
                  {/* Shop Image */}
                  <div className="relative h-48 bg-slate-200 overflow-hidden">
                    <img
                      src={
                        shop.image ||
                        "https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=500&q=80"
                      }
                      alt={shop.name}
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {shop.isFeatured && (
                      <div className="absolute top-3 right-3 bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                        Featured
                      </div>
                    )}
                  </div>

                  {/* Shop Info */}
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-slate-900 mb-1 group-hover:text-orange-600 transition-colors">
                      {shop.name}
                    </h3>

                    {shop.description && (
                      <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                        {shop.description}
                      </p>
                    )}

                    {/* Rating */}
                    {shop.rating !== undefined && shop.reviewCount !== undefined && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm font-semibold text-yellow-600">
                          ★ {shop.rating.toFixed(1)}
                        </span>
                        <span className="text-xs text-slate-500">
                          ({shop.reviewCount} reviews)
                        </span>
                      </div>
                    )}

                    {/* Category Badge */}
                    <div className="mt-auto pt-3 border-t border-slate-100">
                      <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded font-semibold">
                        {shop.category}
                      </span>
                    </div>
                  </div>

                  {/* CTA Button */}
                  <div className="px-4 pb-4">
                    <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 rounded-lg transition-colors">
                      View Shop →
                    </button>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
