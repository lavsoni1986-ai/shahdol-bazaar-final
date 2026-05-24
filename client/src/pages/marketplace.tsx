// 🏛️ BHARAT-OS: GOVERNED MARKETPLACE PAGE
// ================================================================
// SOVEREIGN — Consumes canonical store/product cards.
// NO hardcoded category branching. NO any types. NO commerce-only assumptions.
// Analytics via trackEvent. Filters via governance where possible.
// ================================================================

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SovereignStoreCard } from "@/components/home/SovereignStoreCard";
import { StoreCardSkeleton } from "@/components/shared/SovereignStoreCard";
import { SovereignProductCard, ProductCardSkeleton } from "@/components/home/SovereignProductCard";
import { ShoppingBag, Store, Sparkles } from "lucide-react";
import { useDistrict } from "@/contexts/DistrictContext";
import { apiRequest, getArrayData } from "@/lib/api-client";
import { trackEvent } from "@/lib/analytics";

// ─── TYPES ──────────────────────────────────────────────

interface StoreData {
  id: number;
  name: string;
  slug?: string | null;
  shopName?: string;
  imageUrl?: string | null;
  image?: string | null;
  logo?: string | null;
  category?: string | { name: string } | null;
  businessType?: string;
  isSponsored?: boolean;
  isTrending?: boolean;
  isVerified?: boolean;
  dsslScore?: number | null;
  distance?: string | number | null;
  distanceKm?: string | number | null;
  isOpen?: boolean;
  closingTime?: string;
  phone?: string | null;
  address?: string | null;
  district?: string;
  rating?: number | null;
  reviewCount?: number | null;
  reason?: string;
  deliveryInfo?: string;
}

interface ProductData {
  id: number;
  title: string;
  name?: string;
  price: string | number;
  slug?: string;
  imageUrl?: string;
  category?: string;
  isSponsored?: boolean;
  isTrending?: boolean;
  discount?: number | null;
  sellerName?: string;
  sellerSlug?: string;
  dsslScore?: number | null;
  rating?: number | null;
  reviewCount?: number | null;
  district?: string;
  deliveryInfo?: string;
}

// ─── COMPONENT ──────────────────────────────────────────

export default function MarketplacePage() {
  const { currentDistrict, isReady } = useDistrict();
  const [activeTab, setActiveTab] = useState<'stores' | 'products'>('stores');
  const [selectedCategory, setSelectedCategory] = useState("All");

  const { data: storesData, isLoading: storesLoading, error: storesError } = useQuery({
    queryKey: ["marketplace/stores", currentDistrict?.id],
    queryFn: async () => {
      if (!isReady || !currentDistrict?.id) return [];
      trackEvent("SEARCH_INTERACTION", {
        action: "fetch_stores",
        value: { district: currentDistrict.slug },
      });
      const res = await apiRequest("GET", "/marketplace/stores");
      return getArrayData(res);
    },
    enabled: !!currentDistrict?.id && isReady,
    retry: 2,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const stores = Array.isArray(storesData) ? (storesData as StoreData[]) : [];

  const { data: productsData, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ["marketplace/products", currentDistrict?.id],
    queryFn: async () => {
      if (!isReady || !currentDistrict?.id) return [];
      trackEvent("SEARCH_INTERACTION", {
        action: "fetch_products",
        value: { district: currentDistrict.slug },
      });
      const res = await apiRequest("GET", "/marketplace/products");
      return getArrayData(res);
    },
    enabled: !!currentDistrict?.id && isReady,
    retry: 2,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const products = Array.isArray(productsData) ? (productsData as ProductData[]) : [];

  const handleTabSwitch = (tab: 'stores' | 'products') => {
    setActiveTab(tab);
    trackEvent("CTA_CLICK", {
      source: "marketplace_tabs",
      action: tab,
      value: { district: currentDistrict?.slug },
    });
  };

  const handleCategoryClick = (cat: string) => {
    setSelectedCategory(cat);
    trackEvent("CTA_CLICK", {
      source: "marketplace_category",
      action: cat,
      value: { district: currentDistrict?.slug },
    });
  };

  // Guard AFTER hooks
  if (!isReady || !currentDistrict?.id) {
    return (
      <div className="sovereign-bg min-h-screen flex items-center justify-center">
        <div className="text-orange-500 animate-pulse">Initializing district...</div>
      </div>
    );
  }

  // Category filters — currently commerce-oriented; designed to be replaced
  // by governance-driven category resolution in future phase.
  const categories = ["All", "Grocery", "Electronics", "Fashion", "Pharmacy", "Food"];

  return (
    <div className="sovereign-bg">
      <div className="max-w-7xl mx-auto px-4 pt-4 sm:px-6 sm:pt-6">
        {/* 📑 Navigation & Filters */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8 md:gap-6 md:mb-12 border-b border-white/5 pb-8">
          <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
            <TabButton
              active={activeTab === 'stores'}
              onClick={() => handleTabSwitch('stores')}
              icon={<Store className="w-4 h-4" />}
              label="Stores"
            />
            <TabButton
              active={activeTab === 'products'}
              onClick={() => handleTabSwitch('products')}
              icon={<ShoppingBag className="w-4 h-4" />}
              label="Products"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all ${selectedCategory === cat
                  ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]'
                  : 'bg-white/5 text-gray-500 border border-white/10 hover:border-orange-500/30'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* 🏹 Content Grid */}
        {storesError || productsError ? (
          <div className="text-center py-20 glass-card-sovereign border-red-500/20">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Data Service Unavailable</h3>
            <p className="text-gray-400 mb-4">Unable to load marketplace data. Please try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-orange-500 text-white rounded-lg font-bold hover:bg-orange-600 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeTab === 'stores' ? (
              storesLoading ? (
                // Loading skeleton for stores — canonical
                Array.from({ length: 8 }).map((_, i) => (
                  <StoreCardSkeleton key={i} variant="marketplace" />
                ))
              ) : (
                stores?.map((store) => (
                  <SovereignStoreCard key={store.id} data={store} />
                ))
              )
            ) : (
              productsLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <ProductCardSkeleton key={i} variant="marketplace" />
                ))
              ) : (
                products?.map((product) => (
                  <SovereignProductCard key={product.id} data={product} />
                ))
              )
            )}
          </div>
        )}

        {/* 🛸 Empty State with AI Vibe */}
        {((activeTab === 'stores' && !stores?.length && !storesLoading && !storesError) ||
          (activeTab === 'products' && !products?.length && !productsLoading && !productsError)) && (
            <div className="text-center py-40 glass-card-sovereign border-dashed">
              <Sparkles className="w-12 h-12 text-orange-500/50 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white">Awaiting Sovereign Merchants</h3>
              <p className="text-gray-500">First items in this category are arriving soon.</p>
            </div>
          )}
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all ${active ? 'bg-orange-500 text-white shadow-lg' : 'text-gray-400 hover:text-white'
        }`}
    >
      {icon} {label}
    </button>
  );
}
