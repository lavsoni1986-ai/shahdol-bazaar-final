// EducationPage - Schools and educational institutions listing
// Lists schools, colleges, and coaching centers in the current district

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest, getArrayData } from "@/lib/api-client";
import {
  GraduationCap,
  Search,
  ArrowLeft,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDistrict } from "@/contexts/DistrictContext";
import { normalizeCanonicalEntities, type CanonicalEntity } from "@/shared/api/response-normalizers";
import { SovereignEntityCard } from "@/components/shared/SovereignEntityCard";

const SchoolSkeleton = () => (
  <div className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
    <div className="flex items-start gap-4">
      <div className="w-20 h-20 bg-gray-200 rounded-xl" />
      <div className="flex-1 space-y-3">
        <div className="h-5 bg-gray-200 rounded w-2/3" />
        <div className="h-4 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
    </div>
  </div>
);

export default function EducationPage() {
  const [, setLocation] = useLocation();
  const { currentDistrict, isLoading: districtLoading, isReady: districtReady } = useDistrict();
  const [schools, setSchools] = useState<CanonicalEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const districtName = currentDistrict!.name;
  const districtSlug = currentDistrict!.slug;

  if (!districtReady || !currentDistrict?.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-orange-600 animate-pulse">Initializing district...</div>
      </div>
    );
  }

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        setLoading(true);
        const response = await apiRequest("GET", "/schools");
        const schools = getArrayData(response);
        setSchools(normalizeCanonicalEntities(schools, districtSlug, 'school'));
      } catch (err) {
        console.error("Error fetching schools:", err);
        setError("Failed to load education institutions. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (districtSlug) {
      fetchSchools();
    }
  }, [districtSlug]);

  const filteredSchools = schools.filter(s =>
    (s.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    ((s.address || "").toLowerCase().includes(searchQuery.toLowerCase())) ||
    ((s.category || "").toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-yellow-600 to-amber-600 text-white">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="text-white hover:bg-white/20 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          <h1 className="text-3xl font-bold mb-2">Education in {districtName}</h1>
          <p className="text-white/80">Find schools, colleges, coaching centers, and more</p>
        </div>
      </div>

      {/* Search */}
      <div className="container mx-auto px-4 py-6">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search schools, colleges, coaching..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 pb-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <SchoolSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="text-center py-12">
            <GraduationCap className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No educational institutions found</p>
            <p className="text-gray-400 text-sm mt-2">Check back later for new additions</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredSchools.map(school => (
              <SovereignEntityCard key={school.id} entity={school} variant="grid" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}