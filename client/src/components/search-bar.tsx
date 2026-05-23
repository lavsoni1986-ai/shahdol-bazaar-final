import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { useDistrict } from "@/contexts/DistrictContext";
import { aiRouter } from "@/lib/ai-router";
import { safeText } from "@/lib/admin-response";
import { Search, Mic, Sparkles, Zap, Stethoscope, Bus, Store, ShoppingBag } from "lucide-react";
import { partnerRoutes, productRoutes } from "@/shared/routing/sovereign-routes";
import { normalizeCanonicalEntity, type CanonicalEntity } from "@/shared/api/response-normalizers";
import { SovereignEntityCard } from "@/components/shared/SovereignEntityCard";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import VoiceSearch from "@/components/VoiceSearch";

// Stub for trackAISignal until analytics wired
const trackAISignal = (..._args: any[]) => { };

type SearchResult = {
  hospitals: Array<{
    id: number;
    name: string;
    slug?: string;
    specialties?: string[];
    address?: string;
    phone?: string;
    logo?: string;
  }>;
  vendors: Array<{
    id: number;
    name: string;
    slug?: string;
    description?: string;
    address?: string;
    phone?: string;
    logo?: string;
    isVerified?: boolean;
    dsslScore?: number;
    category?: string;
    type: 'vendor';
  }>;
  products: Array<{
    id: number;
    name: string;
    price: number;
    image?: string;
    vendor?: {
      name: string;
      slug?: string;
    };
  }>;
  busRoutes: Array<{
    id: number;
    fromCity: string;
    toCity: string;
    firstBusTime: string;
    lastBusTime: string;
    fare: string;
  }>;
  // AI Intent metadata
  intent?: string;
  message?: string;
  suggestedCategories?: string[];
  aiSuggested?: boolean;
};

export function SearchBar({
  initialValue = "",
  onSearch,
  placeholder = "Search shops, doctors... (e.g. Biryani, Dentist)",
  onFocus,
  onBlur
}: {
  initialValue?: string;
  onSearch?: (term: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}) {
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [results, setResults] = useState<SearchResult>({ hospitals: [], vendors: [], products: [], busRoutes: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();
  const { currentDistrict } = useDistrict();

  useEffect(() => {
    setSearchQuery(initialValue);
  }, [initialValue]);

  // Close results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Simplified search function - just routing
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setResults({ hospitals: [], vendors: [], products: [], busRoutes: [] });
      setShowResults(false);
      return;
    }

    const result = await aiRouter(query, currentDistrict?.slug || "shahdol");
    setLocation(result.route);
  };

  // Debounced search
  useEffect(() => {
    const searchTimeout = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const result = await aiRouter(searchQuery.trim(), currentDistrict?.slug || "shahdol");
      setLocation(result.route);
    }
  };

  const handleResultClick = async (result: any, type: string) => {
    setShowResults(false);
    setSearchQuery("");

    // 📊 AI Signal Tracking - Track user interactions for ML training
    try {
      if (type === 'product' && result.id) {
        // Track product clicks for recommendation engine
        await trackAISignal('click', result.id, searchQuery, result.category, {
          vendorId: result.vendor?.id,
          dsslScore: result.dsslScore,
          relevanceScore: result.relevanceScore
        });
      } else if (type === 'vendor' && result.id) {
        // Track vendor clicks
        await trackAISignal('click', undefined, searchQuery, type, {
          vendorId: result.id,
          dsslScore: result.dsslScore
        });
      } else {
        // Track other interactions
        await trackAISignal('click', result.id, searchQuery, type);
      }
    } catch (error) {
      console.warn('AI tracking failed:', error);
    }

    const districtSlug = currentDistrict?.slug || "shahdol";

    switch (type) {
      case 'hospital':
        if (!result.slug) {
          console.warn("Missing slug for hospital:", result);
          return;
        }
        setLocation(partnerRoutes.profile(districtSlug, result.slug));
        break;
      case 'bus':
        setLocation(`/${districtSlug}/bus-timetable`);
        break;
      case 'vendor':
        if (!result.slug) {
          console.warn("Missing slug for vendor:", result);
          return;
        }
        setLocation(partnerRoutes.profile(districtSlug, result.slug));
        break;
      case 'product':
        if (!result.slug) {
          console.warn("Missing slug for product:", result);
          return;
        }
        setLocation(productRoutes.detail(districtSlug, result.slug));
        break;
      default:
        if (onSearch) {
          onSearch(searchQuery.trim());
        }
    }
  };

  const normalizeSearchResult = (result: any, type: 'hospital' | 'vendor' | 'product'): CanonicalEntity => {
    return normalizeCanonicalEntity(result, currentDistrict?.slug || 'shahdol', type === 'vendor' ? 'partner' : type);
  };

  const handleSearchEntityTrack = async (type: 'hospital' | 'partner' | 'product', entityId: number) => {
    setShowResults(false);
    setSearchQuery("");

    try {
      if (type === 'product') {
        await trackAISignal('click', entityId, searchQuery, 'product');
      } else {
        await trackAISignal('click', undefined, searchQuery, type, { vendorId: entityId });
      }
    } catch (error) {
      console.warn('AI tracking failed:', error);
    }
  };

  const hasResults = (
    (results.hospitals && results.hospitals.length > 0) ||
    (results.vendors && results.vendors.length > 0) ||
    (results.products && results.products.length > 0) ||
    (results.busRoutes && results.busRoutes.length > 0)
  );

  const totalResults =
    (results.hospitals?.length || 0) +
    (results.vendors?.length || 0) +
    (results.products?.length || 0) +
    (results.busRoutes?.length || 0);

  return (
    <div className="w-full relative z-[90] py-2 px-2 sm:px-0" ref={searchRef}>
      <div className="w-full">
        <form onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 w-full max-w-2xl mx-auto">
            <div className="flex-grow flex items-center bg-white/5 border border-white/10 rounded-full px-4 py-2.5 backdrop-blur-sm focus-within:border-orange-500/50 transition-all">
              <Search className="text-gray-400 w-5 h-5 mr-2" />
              <input
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (onFocus) onFocus();
                  searchQuery.trim().length >= 2 && hasResults && setShowResults(true);
                }}
                onBlur={() => {
                  if (onBlur) onBlur();
                }}
                placeholder="Search shops, doctors... (e.g. Biryani, Dentist)"
                className="bg-transparent border-none outline-none text-white w-full text-sm placeholder:text-white/20"
              />
              <Mic
                className="text-gray-400 w-5 h-5 ml-2 cursor-pointer hover:text-orange-500 transition-colors"
                onClick={() => setIsVoiceModalOpen(true)}
              />
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-shahdol-ai'))}
              className="whitespace-nowrap bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-full px-4 py-2.5 text-sm font-bold shadow-[0_0_15px_rgba(249,115,22,0.4)] flex items-center gap-1 hover:scale-105 transition-transform"
            >
              <Sparkles className="w-4 h-4" /> Ask AI
            </button>
          </div>
        </form>
      </div>

      {/* Search Results Dropdown - Glassmorphism */}
      {showResults && searchQuery.trim().length >= 2 && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-full max-w-2xl bg-black/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-[90] animate-in slide-in-from-top-2">
          {/* AI Intent Message */}
          {results.message && (
            <div className="px-4 py-2 bg-orange-500/10 border-b border-orange-500/20 flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-orange-400">{results.message}</span>
            </div>
          )}
          {/* AI Suggested Categories */}
          {results.suggestedCategories && results.suggestedCategories.length > 0 && (
            <div className="px-4 py-2 border-b border-white/5 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">AI Suggested:</span>
              {results.suggestedCategories.map((cat, i) => (
                <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {cat}
                </span>
              ))}
            </div>
          )}
          {isLoading ? (
            <div className="p-4 text-center text-slate-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mx-auto"></div>
            </div>
          ) : hasResults ? (
            <div className="py-2">
              {/* Hospitals Section */}
              {(results?.hospitals?.length ?? 0) > 0 && (
                <div className="px-3 py-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">
                    <Stethoscope size={14} /> Hospitals
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {results?.hospitals?.map((hospital) => {
                      const entity = normalizeSearchResult(hospital, 'hospital');
                      return (
                        <SovereignEntityCard
                          key={entity.id}
                          entity={entity}
                          variant="search"
                          onTrack={() => handleSearchEntityTrack('hospital', entity.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bus Routes Section */}
              {(results?.busRoutes?.length ?? 0) > 0 && (
                <div className="px-3 py-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">
                    <Bus size={14} /> Buses
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {results?.busRoutes?.map((bus) => (
                      <button
                        key={bus?.id}
                        type="button"
                        onClick={() => handleResultClick(bus, 'bus')}
                        className="w-full text-left p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-white"
                      >
                        <div className="flex justify-between font-bold">
                          <span>{bus?.fromCity} ➔ {bus?.toCity}</span>
                          <span className="text-green-500">{bus?.fare}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Vendors Section */}
              {(results?.vendors?.length ?? 0) > 0 && (
                <div className="px-3 py-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">
                    <Store size={14} /> Local Businesses
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {results?.vendors?.map((vendor) => {
                      const entity = normalizeSearchResult(vendor, 'vendor');
                      return (
                        <SovereignEntityCard
                          key={entity.id}
                          entity={entity}
                          variant="search"
                          onTrack={() => handleSearchEntityTrack('partner', entity.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Products Section */}
              {(results?.products?.length ?? 0) > 0 && (
                <div className="px-3 py-2 border-t border-white/5">
                  <div className="flex items-center gap-2 text-xs font-bold text-orange-500 uppercase tracking-wider mb-2">
                    <ShoppingBag size={14} /> Products
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {results?.products?.map((product) => {
                      const entity = normalizeSearchResult(product, 'product');
                      return (
                        <SovereignEntityCard
                          key={entity.id}
                          entity={entity}
                          variant="search"
                          onTrack={() => handleSearchEntityTrack('product', entity.id)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Show all results button */}
              {totalResults > 10 && (
                <div className="px-3 py-3 border-t border-white/5 bg-white/5">
                  <button
                    type="button"
                    onClick={handleSubmit}
                    className="w-full text-center text-sm font-medium text-orange-500 hover:text-orange-400"
                  >
                    View all {totalResults} results
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-slate-500 text-sm italic mb-3">
                अभी "{searchQuery}" के लिए data उपलब्ध नहीं है
              </p>
              <button
                onClick={() => setLocation(`/${currentDistrict?.slug || 'shahdol'}/marketplace`)}
                className="text-orange-500 hover:text-orange-400 text-sm font-medium underline"
              >
                Nearby shops देखें →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Voice Search Modal */}
      <Dialog open={isVoiceModalOpen} onOpenChange={setIsVoiceModalOpen}>
        <DialogContent className="sm:max-w-md bg-black/95 backdrop-blur-xl border-white/20">
          <DialogTitle className="sr-only">Voice Search</DialogTitle>
          <DialogDescription className="sr-only">Listening to your voice command for Shahdol Bazaar search.</DialogDescription>
          <VoiceSearch />
        </DialogContent>
      </Dialog>
    </div>
  );
}
