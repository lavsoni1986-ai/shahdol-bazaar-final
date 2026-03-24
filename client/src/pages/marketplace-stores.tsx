import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Store, MapPin, Search, Filter, Stethoscope, ShoppingBag, Building2, Star, ShieldCheck, Clock, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StoreType = 'SHOP' | 'SERVICE' | 'HOSPITAL';

interface Store {
  id: number;
  name: string;
  slug: string | null;
  category: string | null;
  businessType: 'PRODUCT' | 'SERVICE' | 'HEALTHCARE' | 'SCHOOL';
  type?: StoreType;
  description: string | null;
  image: string | null;
  logo: string | null;
  address: string | null;
  phone: string | null;
  mobile: string | null;
  rating: number | null;
  avgRating: number | null;
  reviewCount: number | null;
  isVerified: boolean;
  isHospital: boolean;
  // DSSL Trust Score
  dsslScore: number;
  safetyBadges: string[];
}

export default function MarketplaceStores() {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [storeType, setStoreType] = useState<"all" | StoreType>("all");

  // Parse URL search params
  const getSearchParam = (key: string): string | null => {
    const queryString = location.split('?')[1] || '';
    const params = new URLSearchParams(queryString);
    return params.get(key);
  };

  // Get district from URL or use default from localStorage
  const urlDistrictSlug = getSearchParam("district");
  const districtSlug = urlDistrictSlug || localStorage.getItem("districtSlug") || "shahdol";
  const typeParam = getSearchParam("type");

  // Set store type from query param on mount
  useEffect(() => {
    const normalized = (typeParam || "").toUpperCase();
    if (normalized === "HOSPITAL" || normalized === "HEALTHCARE") {
      setStoreType("HOSPITAL");
    } else if (normalized === "SHOP" || normalized === "PRODUCT") {
      setStoreType("SHOP");
    } else if (normalized === "SERVICE" || normalized === "SCHOOL") {
      setStoreType("SERVICE");
    }
  }, [typeParam]);

  const resolveStoreType = (store: Store): StoreType => {
    if (store.type === "SHOP" || store.type === "SERVICE" || store.type === "HOSPITAL") {
      return store.type;
    }
    if (store.businessType === "HEALTHCARE" || store.isHospital) return "HOSPITAL";
    if (store.businessType === "SERVICE" || store.businessType === "SCHOOL") return "SERVICE";
    return "SHOP";
  };

  // Get title based on type
  const getPageTitle = () => {
    switch (storeType) {
      case 'HOSPITAL':
        return { title: 'Hospitals & Healthcare', icon: <Stethoscope className="w-6 h-6" /> };
      case 'SERVICE':
        return { title: 'Local Services', icon: <Building2 className="w-6 h-6" /> };
      case 'SHOP':
        return { title: 'Local Markets & Shops', icon: <ShoppingBag className="w-6 h-6" /> };
      default:
        return { title: 'All Stores', icon: <Store className="w-6 h-6" /> };
    }
  };

  const pageInfo = getPageTitle();

  // Fetch stores with businessType filter
  const { data: storesData, isLoading, isError } = useQuery<{ data: Store[] }>({
    queryKey: ["marketplace-stores", districtSlug, searchQuery, storeType],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      const districtRes = await fetch(`/api/districts/${districtSlug}`);
      if (districtRes.ok) {
        const district = await districtRes.json();
        queryParams.append("districtId", String(district.id));
      }
      if (searchQuery) queryParams.append("search", searchQuery);
      
      if (storeType !== "all") queryParams.append("type", storeType);
      
      const res = await fetch(`/api/marketplace/stores?${queryParams}`);
      if (!res.ok) throw new Error("Failed to fetch stores");
      return res.json();
    },
    retry: 1,
    throwOnError: false,
  });

  const stores = storesData?.data || [];
  const categories = Array.from(new Set(stores.map((s) => s.category).filter(Boolean)));

  const filteredStores = categoryFilter === "all" 
    ? stores 
    : stores.filter((s) => s.category === categoryFilter);

  // Show loading only when actually fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading stores...</p>
        </div>
      </div>
    );
  }

  // Show error state if API failed
  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Failed to load stores. Please try again.</p>
          <Link href="/marketplace-stores">
            <Button>Retry</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                {pageInfo.icon}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{pageInfo.title}</h1>
            </div>
            <Link href="/marketplace">
              <Button variant="outline">Back to Marketplace</Button>
            </Link>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            {/* Type Filter */}
            <Select value={storeType} onValueChange={(value) => setStoreType(value as "all" | StoreType)}>
              <SelectTrigger className="w-[180px]">
                <Store className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Entity Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="SHOP">Retail Shop</SelectItem>
                <SelectItem value="SERVICE">Service/Education (School/Coaching)</SelectItem>
                <SelectItem value="HOSPITAL">Healthcare (Hospital/Clinic)</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                placeholder="Search stores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2"
              />
            </div>
            {/* Category Filter */}
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat!}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          </div>
        ) : filteredStores.length === 0 ? (
          <div className="text-center py-12">
            <Store className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No stores found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStores.map((store) => (
              <Link key={store.id} href={`/marketplace/store/${store.slug || store.id}`}>
                {/* Premium Card Container */}
                <div className="bg-white rounded-xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 overflow-hidden flex flex-col h-full">
                  {/* Vibrant Image/Banner Section */}
                  <div className="relative h-48 overflow-hidden">
                    {store.image ? (
                      <div className="relative aspect-[16/9] overflow-hidden rounded-t-2xl">
                        <img src={store.image} alt={store.name} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center">
                        {resolveStoreType(store) === 'HOSPITAL' ? (
                          <Stethoscope className="h-16 w-16 text-orange-500" />
                        ) : resolveStoreType(store) === 'SERVICE' ? (
                          <Building2 className="h-16 w-16 text-orange-500" />
                        ) : (
                          <ShoppingBag className="h-16 w-16 text-orange-500" />
                        )}
                      </div>
                    )}
                    {/* Verified Badge Overlay */}
                    {store.isVerified && (
                      <div className="absolute top-3 right-3 bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </div>
                    )}
                    {/* Premium/DSSL Badge */}
                    {store.dsslScore && store.dsslScore > 0 && (
                      <div className="absolute top-3 left-3 bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <Star className="w-3 h-3" /> DSSL {store.dsslScore}
                      </div>
                    )}
                  </div>

                  {/* Card Content */}
                  <div className="p-5 flex flex-col flex-1">
                    {/* Store Name & Category */}
                    <div className="mb-3">
                      <h3 className="text-xl font-bold text-gray-900 truncate">{store.name}</h3>
                      <p className="text-sm text-orange-600 font-medium">{store.category}</p>
                    </div>

                    {/* Safety Badges - Limited to 3 */}
                    {store.safetyBadges && store.safetyBadges.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {store.safetyBadges.slice(0, 3).map((badge, idx) => (
                          <span key={idx} className="bg-blue-100 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                            {badge}
                          </span>
                        ))}
                        {store.safetyBadges.length > 3 && (
                          <span className="text-xs text-gray-400">+{store.safetyBadges.length - 3} more</span>
                        )}
                      </div>
                    )}

                    {/* Description */}
                    {store.description && (
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">{store.description}</p>
                    )}

                    {/* Address */}
                    {store.address && (
                      <div className="flex items-start gap-1 text-sm text-gray-500 mb-3">
                        <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-400" />
                        <span className="truncate">{store.address}</span>
                      </div>
                    )}

                    {/* Rating & Reviews */}
                    <div className="flex items-center gap-2 mb-4">
                      {store.avgRating && store.avgRating > 0 ? (
                        <>
                          <div className="flex items-center gap-1 text-sm font-medium text-yellow-600">
                            <Star className="w-4 h-4 fill-current" />
                            {store.avgRating.toFixed(1)}
                          </div>
                          <span className="text-sm text-gray-400">({store.reviewCount || 0} reviews)</span>
                        </>
                      ) : (
                        <div className="text-sm text-gray-400">No ratings yet</div>
                      )}
                    </div>

                    {/* CTA Button - Full Width */}
                    <div className="mt-auto">
                      {resolveStoreType(store) === 'HOSPITAL' ? (
                        <button 
                          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2"
                          onClick={(e) => {
                            e.preventDefault();
                            window.location.href = `/marketplace/store/${store.slug || store.id}`;
                          }}
                        >
                          <Phone className="w-4 h-4" /> Book Appointment
                        </button>
                      ) : resolveStoreType(store) === 'SERVICE' ? (
                        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2">
                          <Clock className="w-4 h-4" /> Book Inquiry
                        </button>
                      ) : (
                        <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2">
                          <ShoppingBag className="w-4 h-4" /> View Store
                        </button>
                      )}
                    </div>
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
