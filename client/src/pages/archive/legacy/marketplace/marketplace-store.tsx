// 🛡️ BHARAT-OS: SOVEREIGN STORE UI (TOTAL TRANSFORMATION)
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Store, MapPin, Phone, Package, ArrowLeft, ShieldCheck, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SovereignProductCard } from "@/components/home/SovereignProductCard";
import { useDistrict } from "@/contexts/DistrictContext";
import { apiRequest, getData } from "@/lib/api-client";
import { safeText } from "@/lib/admin-response";
import { parseRoute, districtRoutes } from "@/shared/routing/sovereign-routes";
import { normalizePartnerResponse } from "@/shared/api/response-normalizers";

export default function MarketplaceStore() {
  const [location] = useLocation();
  const { currentDistrict, isReady } = useDistrict();

  // Use canonical route parsing instead of manual URL splitting
  const parsedRoute = parseRoute(location);
  const slugOrId = parsedRoute.entitySlug; // This will be the partner slug from /:district/partner/:slug
  const districtSlug = parsedRoute.districtSlug;
  const storesLink = districtRoutes.marketplace(districtSlug || undefined);

  console.log("Current Store Ref:", slugOrId);

  if (!isReady || !currentDistrict?.id) {
    return <div className="sovereign-bg min-h-screen flex items-center justify-center text-orange-500 font-black">INITIALIZING...</div>;
  }

  const { data: storeResponse, isLoading } = useQuery<any>({
    queryKey: [`partner/${slugOrId}`, currentDistrict.id],
    queryFn: async () => {
      if (!slugOrId) {
        throw new Error("Missing partner reference");
      }

      // Use canonical partner endpoint
      const partnerRes = await apiRequest("GET", `marketplace/vendors/${slugOrId}`);
      return normalizePartnerResponse(partnerRes);
    },
    enabled: !!slugOrId && !!currentDistrict?.id
  });

  const store = storeResponse?.data;

  if (isLoading) return <div className="sovereign-bg min-h-screen flex items-center justify-center text-orange-500 font-black">SYNCING SOVEREIGN DATA...</div>;
  if (!store) return (
    <div className="sovereign-bg min-h-screen flex flex-col items-center justify-center text-white font-black">
      <div className="text-center">
        <h2 className="text-2xl mb-4">Data loading issue. Please refresh.</h2>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-orange-500 text-white rounded-lg">Reload</button>
      </div>
    </div>
  );

  const resolvedType = store.type || (store.businessType === 'HEALTHCARE' ? 'HOSPITAL' : 'SHOP');
  const sectionLabel = resolvedType === 'HOSPITAL' ? 'Available Services' : 'Our Products';

  return (
    <div className="sovereign-bg min-h-screen pb-20 pt-24">
      {/* 🌌 Sovereign Header Section */}
      <div className="relative py-16 px-6 overflow-hidden mb-8 border-b border-white/5">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-orange-500/10 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <Link href={storesLink}>
            <Button variant="ghost" className="text-gray-400 hover:text-white mb-8 border border-white/5 bg-white/5 hover:bg-white/10">
              <ArrowLeft className="w-4 h-4 mr-2" /> All Stores
            </Button>
          </Link>

          <div className="flex flex-col md:flex-row gap-10 items-center md:items-start text-center md:text-left">
            {/* Store Identity Box */}
            <div className="w-48 h-48 bg-white/5 rounded-[2.5rem] border border-white/10 p-2 backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative group">
              <div className="absolute inset-0 bg-orange-500/10 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              {store.image ? (
                <img src={store.image} alt={store.name} className="w-full h-full object-cover rounded-[2.2rem] relative z-10" />
              ) : (
                <div className="w-full h-full flex items-center justify-center relative z-10">
                  <Store className="w-16 h-16 text-orange-500/30" />
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-4">
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter">
                  {(store.name || "STORE").toUpperCase()}
                </h1>
                {store.isVerified && (
                  <div className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Verified
                  </div>
                )}
              </div>

              <p className="text-orange-500 font-black tracking-[0.3em] uppercase text-sm mb-6">
                {safeText(store.category)} • {resolvedType} • {currentDistrict?.name?.toUpperCase() || 'DISTRICT'}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                <div className="glass-card-sovereign p-4 border-white/5 flex items-center gap-4 group hover:border-orange-500/30 transition-all">
                  <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className="text-gray-400 text-sm leading-tight">{store.address || "Location Verified"}</span>
                </div>
                <div className="glass-card-sovereign p-4 border-white/5 flex items-center gap-4 group hover:border-orange-500/30 transition-all">
                  <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500">
                    <Phone className="w-5 h-5" />
                  </div>
                  <span className="text-gray-400 text-sm">{store.mobile || store.phone || "Connect Now"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🏹 Sovereign Content Grid */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-12">
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-4">
            <Package className="w-8 h-8 text-orange-500" />
            {sectionLabel.toUpperCase()}
          </h2>
          <div className="h-[2px] flex-1 bg-gradient-to-r from-orange-500/30 to-transparent ml-8 hidden md:block" />
        </div>

        {!store.products?.length ? (
          <div className="text-center py-40 glass-card-sovereign border-dashed border-white/10">
            <div className="text-orange-500/20 mb-6 flex justify-center">
              <Package className="w-20 h-20" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">Inventory Syncing...</h3>
            <p className="text-gray-500">The merchant is currently updating the stock.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {store.products.map((product: any) => (
              <SovereignProductCard key={product.id} data={product} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
