// EducationPage - Schools and educational institutions listing
// Lists schools, colleges, and coaching centers in the current district

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  GraduationCap, 
  MapPin, 
  Phone, 
  Search, 
  Clock,
  Shield,
  ArrowLeft,
  BookOpen,
  Users,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDistrict } from "@/contexts/DistrictContext";

interface School {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  phone: string | null;
  mobile: string | null;
  category: string | null;
  categorySlug: string | null;
  businessType: string;
  isVerified: boolean;
  dsslScore: number;
  images: string[];
}

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
  const { currentDistrict, isLoading: districtLoading } = useDistrict();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const districtName = currentDistrict?.name || "Shahdol";
  const districtSlug = currentDistrict?.slug || "shahdol";

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/schools?district=${districtSlug}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch schools");
        }
        
        const data = await response.json();
        setSchools(data.data || []);
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
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.address?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.category?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getCategoryIcon = (category: string | null) => {
    switch (category?.toLowerCase()) {
      case "school":
        return "🏫";
      case "college":
        return "🎓";
      case "coaching":
        return "📚";
      case "tuition":
        return "📖";
      default:
        return "🏛️";
    }
  };

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSchools.map(school => (
              <div 
                key={school.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-amber-500 rounded-xl flex items-center justify-center text-3xl">
                    {getCategoryIcon(school.category)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg">{school.name}</h3>
                      {school.isVerified && (
                        <Shield className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-gray-600 text-sm">
                      {school.category || "Educational Institution"}
                    </p>
                    {school.dsslScore > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Award className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium">DSSL Score: {school.dsslScore}</span>
                      </div>
                    )}
                  </div>
                </div>

                {school.description && (
                  <p className="mt-4 text-gray-600 text-sm line-clamp-2">
                    {school.description}
                  </p>
                )}

                <div className="mt-4 space-y-2 text-sm text-gray-600">
                  {school.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{school.address}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  {(school.phone || school.mobile) && (
                    <Button 
                      size="sm"
                      className="bg-yellow-600 hover:bg-yellow-700"
                      onClick={() => window.location.href = `tel:${school.phone || school.mobile}`}
                    >
                      <Phone className="w-4 h-4 mr-2" />
                      Contact
                    </Button>
                  )}
                  <Button 
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/marketplace-stores?type=school&slug=${school.slug}`)}
                  >
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}