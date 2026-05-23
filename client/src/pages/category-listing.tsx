import { useEffect, useState } from "react";
import { useLocation, useRoute, Link } from "wouter";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { partnerRoutes, getCurrentDistrictSlug } from "@/shared/routing/sovereign-routes";
import { CanonicalEntity, normalizeDistrictSnapshot } from "@/shared/api/response-normalizers";
import { SovereignEntityCard } from "@/components/shared/SovereignEntityCard";

export default function CategoryListing() {
  const [location] = useLocation();
  const [, params] = useRoute("/category/:slug");
  const routeParams = params as { slug?: string } | null;
  const [entities, setEntities] = useState<CanonicalEntity[]>([]);
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
    fetchEntities(searchTerm);
  }, [location, params]);

  const fetchEntities = async (category: string) => {
    try {
      setLoading(true);
      setError("");

      const res = await apiRequest("POST", "/ai/concierge", { message: category });

      if (!res.success) {
        throw new Error("Failed to load entities");
      }

      const rawResponse = res;
      const snapshot = normalizeDistrictSnapshot(rawResponse);

      // Combine all entities from the snapshot for semantic search results
      const allEntities = [
        ...snapshot.partners,
        ...snapshot.hospitals,
        ...snapshot.schools,
        ...snapshot.services,
        ...snapshot.products
      ];

      setEntities(allEntities);
    } catch (err: any) {
      console.error("Error fetching entities:", err);
      setError("Failed to load entities. Please try again.");
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
              ? "Loading entities..."
              : `${entities.length} entit${entities.length !== 1 ? "ies" : "y"} found`}
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Loader2 className="h-10 w-10 animate-spin text-orange-600 mx-auto mb-4" />
              <p className="text-slate-600">Loading entities for {categoryName}...</p>
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
        {!loading && !error && entities.length === 0 && (
          <div className="bg-slate-100 rounded-lg p-12 text-center">
            <p className="text-slate-600 text-lg mb-4">
              No entities found for {categoryName}. Demand has been recorded for potential onboarding.
            </p>
            <Link href="/" className="text-orange-600 hover:text-orange-700 underline">
              Back to Home
            </Link>
          </div>
        )}

        {/* Entities Grid */}
        {!loading && entities.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {entities.map((entity) => (
              <SovereignEntityCard
                key={entity.id}
                entity={entity}
                variant="grid"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
