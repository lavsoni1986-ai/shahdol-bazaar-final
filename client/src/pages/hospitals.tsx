// HospitalsPage - Healthcare facilities listing
// Lists hospitals and clinics in the current district

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  HeartPulse, 
  MapPin, 
  Phone, 
  Search, 
  Clock,
  Shield,
  ArrowLeft,
  Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDistrict } from "@/contexts/DistrictContext";

interface Hospital {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  phone: string | null;
  emergencyPhone: string | null;
  hospitalType: string;
  totalBeds: number;
  availableBeds: number;
  oxygenAvailable: boolean;
  icuAvailable: boolean;
}

export default function HospitalsPage() {
  const [, setLocation] = useLocation();
  const { currentDistrict, isLoading: districtLoading } = useDistrict();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const districtName = currentDistrict?.name || "Shahdol";
  const districtSlug = currentDistrict?.slug || "shahdol";

  useEffect(() => {
    const fetchHospitals = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/hospitals?district=${districtSlug}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch hospitals");
        }
        
        const data = await response.json();
        setHospitals(data.data || []);
      } catch (err) {
        console.error("Error fetching hospitals:", err);
        setError("Failed to load hospitals. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (districtSlug) {
      fetchHospitals();
    }
  }, [districtSlug]);

  const filteredHospitals = hospitals.filter(h => 
    h.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (h.address?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (h.city?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getHospitalTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "multi_specialty": "Multi Specialty",
      "general": "General Hospital",
      "nursing_home": "Nursing Home",
      "clinic": "Clinic",
      "diagnostic": "Diagnostic Center"
    };
    return labels[type] || type;
  };

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
            
            <div className="grid gap-4">
              {filteredHospitals.map((hospital) => (
                <div 
                  key={hospital.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Icon */}
                    <div className="w-14 h-14 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                      <HeartPulse className="w-7 h-7 text-red-600" />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">
                            {hospital.name}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {getHospitalTypeLabel(hospital.hospitalType)}
                          </p>
                        </div>
                        
                        {/* Quick badges */}
                        <div className="flex gap-2">
                          {hospital.icuAvailable && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                              <Shield className="w-3 h-3" /> ICU
                            </span>
                          )}
                          {hospital.oxygenAvailable && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              O₂
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Address */}
                      {(hospital.address || hospital.city) && (
                        <div className="flex items-center gap-2 text-gray-600 mt-2">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="text-sm">
                            {[hospital.address, hospital.city].filter(Boolean).join(", ")}
                          </span>
                        </div>
                      )}
                      
                      {/* Contact */}
                      <div className="flex flex-wrap gap-4 mt-3">
                        {hospital.phone && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Phone className="w-4 h-4" />
                            <span className="text-sm">{hospital.phone}</span>
                          </div>
                        )}
                        {hospital.emergencyPhone && (
                          <div className="flex items-center gap-2 text-red-600">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium">Emergency: {hospital.emergencyPhone}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Bed availability */}
                      <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100">
                        <div className="text-sm">
                          <span className="text-gray-500">Total Beds: </span>
                          <span className="font-medium">{hospital.totalBeds}</span>
                        </div>
                        <div className="text-sm">
                          <span className="text-gray-500">Available: </span>
                          <span className={`font-medium ${hospital.availableBeds > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {hospital.availableBeds}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
