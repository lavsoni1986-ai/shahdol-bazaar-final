// HospitalsPage - Healthcare facilities listing
// Lists hospitals and clinics in the current district

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest, getArrayData } from "@/lib/api-client";
import {
  HeartPulse,
  Search,
  ArrowLeft,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDistrict } from "@/contexts/DistrictContext";
import { normalizeCanonicalEntities, type CanonicalEntity } from "@/shared/api/response-normalizers";
import { SovereignEntityCard } from "@/components/shared/SovereignEntityCard";

export default function HospitalsPage() {
  const [, setLocation] = useLocation();
  const { currentDistrict, isLoading: districtLoading, isReady: districtReady } = useDistrict();
  const [hospitals, setHospitals] = useState<CanonicalEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!districtReady || !currentDistrict?.slug) return;

    const fetchHospitals = async () => {
      try {
        setLoading(true);
        const res = await apiRequest("GET", "hospitals");
        const rawHospitals = res?.data ?? [];
        setHospitals(normalizeCanonicalEntities(rawHospitals, currentDistrict?.slug, 'hospital'));
      } catch (err) {
        console.error("Error fetching hospitals:", err);
        setError("Failed to load hospitals. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchHospitals();
  }, [districtReady, currentDistrict?.slug]);

  if (!districtReady || !currentDistrict?.id) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-orange-600 animate-pulse">Initializing district...</div>
      </div>
    );
  }

  const districtName = currentDistrict.name;
  const districtSlug = currentDistrict.slug;

  const filteredHospitals = hospitals.filter(h =>
    (h.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    ((h.address || "").toLowerCase().includes(searchQuery.toLowerCase())) ||
    ((h.category || "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen sovereign-bg">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-pink-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <div className="flex items-center gap-3 mb-2">
            <HeartPulse className="w-8 h-8" />
            <h1 className="text-3xl font-bold">Healthcare Facilities</h1>
          </div>
          <p className="text-red-100">
            Find hospitals, clinics, and medical services in {districtName}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 py-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Search hospitals by name, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 pb-12">
        {loading || districtLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading hospitals...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <Button
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        ) : filteredHospitals.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Hospitals Found</h2>
            <p className="text-gray-500">
              {searchQuery
                ? "No hospitals match your search. Try different keywords."
                : "No hospitals registered yet in this district."}
            </p>
          </div>
        ) : (
          <>
            <p className="text-gray-600 mb-6">
              Showing {filteredHospitals.length} healthcare facility in {districtName}
            </p>

            <div className="grid gap-4 md:grid-cols-2">
              {filteredHospitals.map((hospital) => (
                <SovereignEntityCard key={hospital.id} entity={hospital} variant="grid" />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
