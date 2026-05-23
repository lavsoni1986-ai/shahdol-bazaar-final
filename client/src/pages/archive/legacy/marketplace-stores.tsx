// 🛡️ BHARAT-OS: SOVEREIGN STORES UI UPDATE
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Store, MapPin, Search, Filter, Stethoscope, ShoppingBag, Building2, Star, ShieldCheck, Clock, Phone, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDistrict } from "@/contexts/DistrictContext";
import { apiRequest, getArrayData, getData } from "@/lib/api-client";
import { safeText } from "@/lib/admin-response";
import { districtRoutes, partnerRoutes } from "@/shared/routing/sovereign-routes";

type StoreType = 'SHOP' | 'SERVICE' | 'HOSPITAL';

export default function MarketplaceStores() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [storeType, setStoreType] = useState<"all" | StoreType>("all");
  const { currentDistrict, isReady } = useDistrict();

  // Debounce search to prevent API call flood on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  if (!isReady || !currentDistrict?.id) {
    return (
      <div className="sovereign-bg min-h-screen flex items-center justify-center">
        <div className="text-orange-500 animate-pulse">Initializing...</div>
      </div>
    );
  }

  // ✅ Use debouncedSearch in queryKey, not searchQuery
  const { data: storesData, isLoading } = useQuery<any[]>({
    queryKey: ["marketplace-stores", currentDistrict.id, debouncedSearch, storeType],
      queryFn: async () => {
        const res = await apiRequest("GET", `marketplace/stores?type=${storeType === 'all' ? '' : storeType}&search=${debouncedSearch}`);
        return getArrayData(res);
      },
      enabled: !!currentDistrict?.id
  });

  const stores = Array.isArray(storesData) ? storesData : [];
  const categories = Array.from(new Set(stores.map((s) => s.category).filter(Boolean)));
  const filteredStores = categoryFilter === "all" ? stores : stores.filter((s) => s.category === categoryFilter);

  return (
    <div className="sovereign-bg min-h-screen pb-20 pt-24">
      {/* 🌌 Sovereign Header */}
      <div className="relative py-16 px-6 overflow-hidden mb-8">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-orange-500/20 rounded-2xl border border-orange-500/30 text-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.2)]">
              <Store className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                ALL <span className="text-orange-500">STORES.</span>
              </h1>
              <p className="text-gray-400 font-medium">Verified Merchants of {currentDistrict?.slug?.toUpperCase() || 'DISTRICT'}</p>
            </div>
          </div>
          <Link href={districtRoutes.marketplace(currentDistrict?.slug)}>
            <Button variant="ghost" className="text-gray-400 hover:text-white border border-white/5 bg-white/5 hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Market
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        {/* 📑 Sovereign Filter Bar */}
        <div className="glass-card-sovereign p-4 mb-12 flex flex-wrap gap-4 items-center border-white/10">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <Input
              placeholder="Search merchants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-orange-500/50"
            />
          </div>

          <Select value={storeType} onValueChange={(v) => setStoreType(v as any)}>
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-white/10 text-white">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="SHOP">Shops</SelectItem>
              <SelectItem value="SERVICE">Services</SelectItem>
              <SelectItem value="HOSPITAL">Healthcare</SelectItem>
            </SelectContent>
          </Select>

          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-neutral-900 border-white/10 text-white">
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* 🏹 Sovereign Store Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredStores.map((store) => {
            if (!store.slug) {
              console.warn("Missing slug for store:", store);
              return (
                <div key={store.id} className="group bg-gray-500 border border-white/10 rounded-3xl p-6 opacity-50 cursor-not-allowed">
                  <div className="aspect-[16/9] rounded-2xl bg-gray-600 mb-6 overflow-hidden border border-white/5 relative">
                    <div className="w-full h-full bg-gradient-to-br from-gray-500/20 to-gray-700/20 flex items-center justify-center">
                      <Store className="w-16 h-16 text-gray-400" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-400 mb-2">{store.name}</h3>
                  <p className="text-gray-500">Coming Soon</p>
                </div>
              );
            }

            return (
              <Link key={store.id} href={partnerRoutes.profile(currentDistrict?.slug || 'shahdol', store.slug)}>
              <div className="group bg-white/5 border border-white/10 rounded-3xl p-6 transition-all duration-500 hover:border-orange-500/50 hover:bg-white/10 hover:shadow-[0_0_40px_rgba(249,115,22,0.1)] flex flex-col h-full relative overflow-hidden">
                {/* Image Section */}
                <div className="aspect-[16/9] rounded-2xl bg-black/40 mb-6 overflow-hidden border border-white/5 relative">
                  {store.image ? (
                    <img src={store.image} alt={store.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                      <ShoppingBag className="w-16 h-16 text-white" />
                    </div>
                  )}
                  {/* Badges */}
                  <div className="absolute top-4 left-4 flex flex-col gap-2">
                    {store.isVerified && (
                      <div className="bg-green-500/20 text-green-400 backdrop-blur-md border border-green-500/30 text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                        <ShieldCheck className="w-3 h-3" /> Verified
                      </div>
                    )}
                    {store.dsslScore > 0 && (
                      <div className="bg-orange-500/20 text-orange-400 backdrop-blur-md border border-orange-500/30 text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
                        <Star className="w-3 h-3 fill-current" /> DSSL {store.dsslScore}
                      </div>
                    )}
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-black text-white mb-1 tracking-tight group-hover:text-orange-500 transition-colors">
                  {store.name}
                </h3>
                <p className="text-orange-500 text-xs font-bold uppercase tracking-widest mb-4">
                  {safeText(store.category)}
                </p>
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-6">
                  <MapPin className="w-4 h-4" /> <span className="truncate">{store.address}</span>
                </div>

                {/* Footer Button */}
                <div className="mt-auto pt-6 border-t border-white/5">
                  <Button className="w-full bg-white/5 border border-white/10 hover:bg-orange-500 hover:text-white hover:border-orange-500 font-bold tracking-tight transition-all duration-300">
                    Enter Store
                  </Button>
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
