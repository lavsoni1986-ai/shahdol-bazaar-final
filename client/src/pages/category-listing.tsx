import { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { Search, Sparkles, MapPin, ArrowRight, RotateCcw } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { useDistrict } from "@/contexts/DistrictContext";
import { CanonicalEntity, normalizeCanonicalEntity } from "@/shared/api/response-normalizers";
import { SovereignEntityCard } from "@/components/shared/SovereignEntityCard";

interface CategorySuggestion {
  label: string;
  path: string;
  isGlobal?: boolean;
}

const POPULAR_SUGGESTIONS: CategorySuggestion[] = [
  { label: "Hospitals & Clinics", path: "hospitals" },
  { label: "Mobile & Electronics", path: "search?q=electronics" },
  { label: "Local Services", path: "services" },
  { label: "Schools & Education", path: "schools", isGlobal: true },
  { label: "Bus Timetable", path: "bus-timetable" },
  { label: "All Marketplace Stores", path: "marketplace", isGlobal: true },
];

/**
 * Builds canonical district-aware suggestion routes.
 * Guarantees zero double prefixes (e.g. never produces /shahdol/shahdol/*).
 */
function resolveSuggestionUrl(districtSlug: string, suggestion: CategorySuggestion): string {
  const cleanDistrict = (districtSlug || "shahdol").toLowerCase().trim();
  const rawPath = suggestion.path.trim().replace(/^\/+/, "");

  if (suggestion.isGlobal) {
    return `/${rawPath}`;
  }

  // Prevent double prefixing if path already includes the district
  if (rawPath.startsWith(`${cleanDistrict}/`)) {
    return `/${rawPath}`;
  }

  return `/${cleanDistrict}/${rawPath}`;
}

export default function CategoryListing() {
  const [location] = useLocation();
  const [, params] = useRoute("/category/:slug");
  const routeParams = params as { slug?: string } | null;
  const { currentDistrict } = useDistrict();
  const districtSlug = currentDistrict?.slug || "shahdol";
  const districtName = currentDistrict?.name || "Shahdol";

  const [entities, setEntities] = useState<CanonicalEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState("");
  const [error, setError] = useState("");
  const [retryTrigger, setRetryTrigger] = useState(0);
  const activeControllerRef = useRef<AbortController | null>(null);

  const handleRetry = useCallback(() => {
    setRetryTrigger((prev) => prev + 1);
  }, []);

  useEffect(() => {
    // 1. Extract query / slug synchronously for instant header rendering
    let searchTerm = "";
    if (routeParams?.slug) {
      searchTerm = routeParams.slug;
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      searchTerm = urlParams.get("q") || urlParams.get("category") || "";
    }

    if (!searchTerm.trim()) {
      setError("No search term specified");
      setLoading(false);
      setCategoryName("Search");
      return;
    }

    const trimmed = searchTerm.trim();
    const displayName = trimmed
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Immediate heading update on route / query change
    setCategoryName(displayName);
    setError("");
    setEntities([]);

    // 2. Abort any previous pending in-flight request
    if (activeControllerRef.current) {
      activeControllerRef.current.abort();
    }

    const controller = new AbortController();
    activeControllerRef.current = controller;
    let isCancelled = false;

    // 4.5s client-side request timeout
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 4500);

    const executeSearch = async () => {
      try {
        setLoading(true);

        const unifiedRes = await apiRequest(
          "GET",
          `/search/unified?q=${encodeURIComponent(trimmed)}`,
          undefined,
          { signal: controller.signal }
        );

        if (isCancelled) return;

        if (unifiedRes?.success && unifiedRes?.data?.results) {
          const r = unifiedRes.data.results;
          const vendors = Array.isArray(r.vendors)
            ? r.vendors.map((v: any) => normalizeCanonicalEntity(v))
            : [];
          const products = Array.isArray(r.products)
            ? r.products.map((p: any) => normalizeCanonicalEntity(p, undefined, "product"))
            : [];
          const buses = Array.isArray(r.busRoutes)
            ? r.busRoutes.map((b: any) => normalizeCanonicalEntity(b))
            : [];

          const combined = [...vendors, ...products, ...buses];
          setEntities(combined);
        } else {
          setEntities([]);
        }
      } catch (err: any) {
        if (isCancelled) return;

        const isAborted =
          controller.signal.aborted ||
          err?.name === "AbortError" ||
          (typeof err?.message === "string" && err.message.toLowerCase().includes("aborted"));

        if (isAborted) {
          console.warn(`[SEARCH] Query "${trimmed}" timed out after 4500ms`);
          setError("Search took longer than expected to respond. Please check your connection or choose a category below.");
        } else {
          console.error("Search request error:", err);
          setError("Failed to load search results. Please try again or explore popular categories below.");
        }
      } finally {
        clearTimeout(timeoutId);
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    executeSearch();

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [location, params, retryTrigger]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {/* Header — Rendered Immediately on Mount */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-1">
            <MapPin size={14} />
            <span>District: {districtName}</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white capitalize mb-2">
            {categoryName || "Search"}
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {loading
              ? `Searching verified local listings in ${districtName}...`
              : error
              ? "Search interrupted"
              : `${entities.length} entit${entities.length !== 1 ? "ies" : "y"} found`}
          </p>
        </div>

        {/* Loading Skeleton Grid (Instant Visual Structure, No Full-Page Spinner) */}
        {loading && (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse"
            data-testid="search-skeleton-grid"
          >
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4"
              >
                <div className="w-full h-44 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                <div className="space-y-2">
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-4 bg-slate-100 dark:bg-slate-850 rounded w-1/2" />
                </div>
                <div className="h-8 bg-slate-100 dark:bg-slate-850 rounded-lg w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error State with Immediate Single-Click Retry & Suggestions */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 sm:p-8 text-center mb-8">
            <p className="text-red-700 dark:text-red-300 font-semibold mb-2">{error}</p>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              You can retry your search, or explore the verified categories below:
            </p>
            <div className="flex items-center justify-center gap-3 mb-6">
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
              >
                <RotateCcw size={14} /> Retry Search
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {POPULAR_SUGGESTIONS.map((sug) => (
                <Link
                  key={sug.label}
                  href={resolveSuggestionUrl(districtSlug, sug)}
                  className="px-4 py-2 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-full text-xs font-medium hover:border-orange-500 hover:text-orange-600 transition-colors"
                >
                  {sug.label}
                </Link>
              ))}
            </div>
            <Link
              href={`/${districtSlug}`}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700 underline"
            >
              Back to {districtName} Home <ArrowRight size={14} />
            </Link>
          </div>
        )}

        {/* Zero Results State with Instant Local Categories & Optional AI Concierge Action */}
        {!loading && !error && entities.length === 0 && (
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 sm:p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 flex items-center justify-center mx-auto mb-4">
              <Search size={22} />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              No direct matches found for "{categoryName}"
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto text-sm mb-6">
              Your search demand has been logged for merchant onboarding in {districtName}. In the meantime, try these active categories:
            </p>

            {/* Quick Category Suggestions with Guaranteed Correct District URLs */}
            <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto mb-8">
              {POPULAR_SUGGESTIONS.map((sug) => (
                <Link
                  key={sug.label}
                  href={resolveSuggestionUrl(districtSlug, sug)}
                  className="px-3.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium hover:border-orange-500 hover:text-orange-600 transition-colors"
                >
                  {sug.label}
                </Link>
              ))}
            </div>

            {/* Explicit On-Demand AI Concierge Helper (Non-Blocking) */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={`/${districtSlug}/ai/concierge?q=${encodeURIComponent(categoryName)}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
              >
                <Sparkles size={16} />
                Ask AI Concierge about "{categoryName}"
              </Link>
              <Link
                href={`/${districtSlug}`}
                className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-medium"
              >
                Back to {districtName} Home
              </Link>
            </div>
          </div>
        )}

        {/* Entities Grid */}
        {!loading && entities.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {entities.map((entity) => (
              <SovereignEntityCard key={entity.id} entity={entity} variant="grid" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
