import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useDistrict } from "@/contexts/DistrictContext";
import { TrendingSection } from "@/components/home/TrendingSection";
import { FeaturedStores } from "@/components/home/FeaturedStores";
import { QuickLinks } from "@/components/home/QuickLinks";
import { CategoriesSection } from "@/components/home/CategoriesSection";
import { AISearchTerminal } from "@/components/home/AISearchTerminal";
import { TrustNebulaBanner } from "@/components/home/TrustNebulaBanner";
import { Zap, Shield, TrendingUp, Wrench, Hammer, Cog, Activity } from "lucide-react";

interface StatsProps {
  storesCount: number;
  productsCount: number;
  hospitalsCount: number;
}

const SkeletonCard = () => (
  <div className="glass-card-3d p-4 animate-pulse border border-white/5">
    <div className="aspect-video bg-white/5 rounded-2xl mb-3" />
    <div className="h-4 bg-white/10 rounded w-3/4 mb-2" />
    <div className="h-3 bg-white/5 rounded w-1/2" />
  </div>
);

const SectionSkeleton = () => (
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-fluid">
    {[...Array(4)].map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export default function SuperAIHome() {
  const [, setLocation] = useLocation();
  const { currentDistrict } = useDistrict();

  const [stats, setStats] = useState<StatsProps>({ storesCount: 0, productsCount: 0, hospitalsCount: 0 });
  const [trendingProducts, setTrendingProducts] = useState<any[]>([]);
  const [featuredStores, setFeaturedStores] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const districtId = currentDistrict?.id || 3;

  const trackLead = useCallback((action: string, item: string) => {
    console.log(`[Analytics] ${action}: ${item}`);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoadingData(true);
      
      try {
        const statsRes = await fetch(`/api/district-stats?districtId=${districtId}`);
        const statsData = await statsRes.json().catch(() => ({}));
        
        const [productsRes, storesRes, hospitalsRes, categoriesRes, offersRes] = await Promise.all([
          fetch(`/api/marketplace/products?districtId=${districtId}&limit=50`),
          fetch(`/api/marketplace/stores?districtId=${districtId}&limit=20`),
          fetch(`/api/hospitals?districtId=${districtId}&limit=10`),
          fetch('/api/categories'),
          fetch(`/api/offers?districtId=${districtId}`),
        ]);

        const [productsData, storesData, hospitalsData, categoriesData, offersData] = await Promise.all([
          productsRes.json().catch(() => ({ data: [] })),
          storesRes.json().catch(() => ({ data: [] })),
          hospitalsRes.json().catch(() => ({ data: [] })),
          categoriesRes.json().catch(() => ({ data: [] })),
          offersRes.json().catch(() => ([])),
        ]);

        const products = productsData.data || productsData.products || [];
        const stores = storesData.data || storesData.stores || [];
        const hospitals = hospitalsData.data || hospitalsData.hospitals || [];
        const cats = categoriesData.data || categoriesData || [];
        const activeOffers = Array.isArray(offersData) ? offersData : (offersData.data || []);

        setStats({
          storesCount: statsData.vendorCount || stores.length,
          productsCount: statsData.productCount || products.length,
          hospitalsCount: statsData.hospitalCount || hospitals.length,
        });

        const trending = products.filter((p: any) => p.isTrending).slice(0, 4);
        
        const liveFeed = products
          .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 8);
        
        setTrendingProducts(trending.length > 0 ? trending : liveFeed);

        const featured = stores.filter((s: any) => s.isTrending || s.isVerified).slice(0, 4);
        setFeaturedStores(featured.length > 0 ? featured : stores.slice(0, 4));

        setCategories(cats.slice(0, 8));
        setOffers(activeOffers.filter((o: any) => o.isActive).slice(0, 3));

      } catch (error) {
        console.error('Dashboard data fetch error:', error);
      } finally {
        setLoadingData(false);
      }
    };

    fetchDashboardData();
  }, [districtId]);

  const districtName = currentDistrict?.name || "Shahdol";

  return (
    <div className="min-h-screen bg-[#030003] text-slate-200 font-['Plus_Jakarta_Sans'] relative overflow-x-hidden pb-20 safe-bottom">
  
      {/* 🌌 SOVEREIGN NEBULA BACKGROUND (GPU Safe Polish) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-orange-600/10 blur-[60px] md:blur-[100px]"></div>
        <div className="absolute top-[30%] right-[-10%] w-[30vw] h-[30vw] rounded-full bg-purple-600/10 blur-[60px] md:blur-[100px]"></div>
        <div className="absolute bottom-[0%] left-[20%] w-[50vw] h-[50vw] rounded-full bg-emerald-600/5 blur-[80px] md:blur-[120px]"></div>
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
      </div>
      
      {/* 🚀 ALL CONTENT WRAPPER - USING FLUID CONTAINER */}
      <div className="relative z-10 container-fluid flex flex-col gap-fluid pt-6 md:pt-10">
          
          {/* HERO SECTION - Fluid Text, No Forced Breaks, Balanced */}
          <div className="text-center relative z-10 max-w-2xl mx-auto">
            <h1 className="text-4xl font-black text-white mb-3 tracking-tighter leading-tight text-balance">
              {districtName} mein jo chahiye — <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 drop-shadow-[0_0_15px_rgba(249,115,22,0.3)]">Turant Dhoondo</span>
            </h1>
            <p className="text-sm font-medium text-gray-400">
              AI Powered • Verified Shops • Instant Services
            </p>
          </div>

          {/* AI SEARCH TERMINAL - Sovereign Command Center */}
          <div className="w-full max-w-3xl mx-auto mt-0 md:-mt-2">
             <AISearchTerminal />
          </div>

          {/* LIVE STATS BAR - Cleaned up for V5 */}
          <div className="flex justify-center mt-0 md:-mt-2 mb-4">
            {stats.hospitalsCount === 0 && stats.storesCount === 0 ? (
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 backdrop-blur-md">
                <Activity className="w-4 h-4 text-orange-500 animate-pulse" />
                <span className="text-xs font-bold text-orange-400 tracking-wide uppercase">System Calibrating...</span>
              </div>
            ) : (
              <div className="glass-card-3d rounded-full px-6 py-3 border border-white/10 flex flex-wrap items-center justify-center gap-4 md:gap-6 backdrop-blur-xl shadow-2xl shadow-orange-500/5">
                {[
                  { count: stats.storesCount, label: "Verified Shops" },
                  { count: stats.productsCount, label: "LIVE PRODUCTS", isLive: true },
                  { count: stats.hospitalsCount, label: "Specialists" }
                ].map((stat, idx, arr) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {stat.isLive ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                          <span className="text-xs font-bold text-slate-300">
                            <span className="text-white font-black">{stat.count < 10 && stat.count > 0 ? `${stat.count}+` : stat.count}</span> {stat.label}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]"></span>
                          <span className="text-xs font-bold text-slate-300">
                            <span className="text-white font-black">{stat.count < 10 && stat.count > 0 ? `${stat.count}+` : stat.count}</span> {stat.label}
                          </span>
                        </>
                      )}
                    </div>
                    {idx < arr.length - 1 && <span className="text-white/10 hidden md:block">|</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🔥 OFFERS - High Priority Alert Style */}
          {!loadingData && offers.length > 0 && (
            <section className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4">
              <div className="glass-card-3d bg-gradient-to-r from-orange-600/10 to-red-600/10 border border-orange-500/20 rounded-2xl p-fluid relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,1)]" />
                <div className="flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex items-center gap-2 shrink-0 bg-orange-500/20 px-3 py-1.5 rounded-lg border border-orange-500/30">
                    <Zap className="text-orange-500 w-4 h-4" />
                    <h2 className="text-xs font-black uppercase tracking-widest text-orange-400">Live Offers</h2>
                  </div>
                  <div className="flex-1 space-y-2">
                    {offers.map((offer: any) => (
                      <p key={offer.id} className="text-sm font-bold text-white leading-snug">{offer.content}</p>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ESSENTIAL SERVICES - Utility Ribbon */}
          <section className="w-full max-w-4xl mx-auto">
            <h2 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Instant Services</h2>
            <div className="grid grid-cols-4 gap-3 md:gap-4 w-full">
              {[
                { name: 'Plumber', icon: Wrench, color: 'text-sky-400' },
                { name: 'Electrician', icon: Zap, color: 'text-orange-400' },
                { name: 'Carpenter', icon: Hammer, color: 'text-amber-500' },
                { name: 'Mechanic', icon: Cog, color: 'text-rose-500' }
              ].map((service) => (
                <button 
                  key={service.name}
                  onClick={() => setLocation(`/marketplace?service=${service.name.toLowerCase()}`)} 
                  className="group aspect-square glass-card-3d border border-white/5 hover:border-white/20 flex flex-col items-center justify-center p-2 rounded-2xl relative overflow-hidden transition-all hover:scale-[1.02] hover:-translate-y-1"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <service.icon className={`w-6 h-6 md:w-7 md:h-7 mb-2 block mx-auto ${service.color} group-hover:drop-shadow-[0_0_15px_currentColor] transition-all`} />
                  <span className="text-xs font-black uppercase text-gray-400 group-hover:text-white block w-full text-center tracking-tight transition-colors">{service.name}</span>
                </button>
              ))}
            </div>
          </section>

          {/* 🔥 CATEGORIES - Infrastructure & Services */}
          {!loadingData && categories.length > 0 && (
            <div className="animate-in fade-in duration-700">
              <CategoriesSection categories={categories} onTrack={trackLead} />
            </div>
          )}

          {/* 🔥 TRENDING PRODUCTS */}
          {!loadingData && trendingProducts.length > 0 && (
            <div className="animate-in fade-in duration-700 delay-100">
              <TrendingSection products={trendingProducts} onTrack={trackLead} />
            </div>
          )}

          {/* 🔥 FEATURED STORES - Near You */}
          {!loadingData && featuredStores.length > 0 && (
            <div className="animate-in fade-in duration-700 delay-200">
              <FeaturedStores stores={featuredStores} onTrack={trackLead} />
            </div>
          )}

          {/* Loading State */}
          {loadingData && (
             <SectionSkeleton />
          )}

          {/* Quick Links */}
          {!loadingData && (
            <div className="mt-8">
              <QuickLinks onTrack={trackLead} />
            </div>
          )}

          {/* 🛡️ TRUST NEBULA BANNER - DSSL Sovereign Seal */}
          <div className="mt-auto pt-8">
            <TrustNebulaBanner />
          </div>

      </div>
    </div>
  );
}