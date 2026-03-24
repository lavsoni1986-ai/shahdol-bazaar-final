// ServicesPage - Service workers listing (Plumbers, Electricians, Carpenters)
// Lists service providers in the current district - Sovereign Night Theme

import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Wrench, 
  Zap,
  Hammer,
  Cog,
  MapPin, 
  Phone, 
  Search, 
  Clock,
  Shield,
  ArrowLeft,
  Star,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDistrict } from "@/contexts/DistrictContext";
import { SearchBar } from "@/components/search-bar";

interface ServiceWorker {
  id: number;
  name: string;
  slug: string;
  phone: string;
  address: string | null;
  serviceType: string;
  isAvailable: boolean;
  serviceArea: string | null;
  serviceHours: string | null;
  basePrice: number | null;
  experience: number | null;
  rating: number | null;
  reviewCount: number;
  isVerified: boolean;
  dsslScore: number;
}

const serviceTypeLabels: Record<string, string> = {
  "plumber": "Plumber",
  "electrician": "Electrician",
  "carpenter": "Carpenter",
  "painter": "Painter",
  "AC": "AC Repair",
  "appliance": "Appliance Repair",
  "general": "General Service"
};

const serviceTypeIcons: Record<string, React.ReactNode> = {
  "plumber": <Wrench className="w-8 h-8 text-sky-400" />,
  "electrician": <Zap className="w-8 h-8 text-orange-400" />,
  "carpenter": <Hammer className="w-8 h-8 text-amber-500" />,
  "mechanic": <Cog className="w-8 h-8 text-rose-500" />,
};

const serviceTypeGlows: Record<string, string> = {
  "plumber": "from-sky-500/20 to-blue-500/10 border-sky-500/30",
  "electrician": "from-orange-500/20 to-red-500/10 border-orange-500/30",
  "carpenter": "from-amber-500/20 to-yellow-500/10 border-amber-500/30",
  "mechanic": "from-rose-500/20 to-red-500/10 border-rose-500/30",
};

const ServiceSkeleton = () => (
  <div className="glass-card-3d rounded-2xl p-6 animate-pulse">
    <div className="flex items-start gap-4">
      <div className="w-16 h-16 bg-white/10 rounded-xl" />
      <div className="flex-1 space-y-3">
        <div className="h-5 bg-white/10 rounded w-1/3" />
        <div className="h-4 bg-white/10 rounded w-1/4" />
        <div className="h-4 bg-white/10 rounded w-1/2" />
      </div>
    </div>
    <div className="mt-4 flex gap-2">
      <div className="h-6 bg-white/10 rounded-full w-16" />
      <div className="h-6 bg-white/10 rounded-full w-20" />
    </div>
  </div>
);

export default function ServicesPage() {
  const [, setLocation] = useLocation();
  const { currentDistrict, isLoading: districtLoading } = useDistrict();
  const [serviceWorkers, setServiceWorkers] = useState<ServiceWorker[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const districtName = currentDistrict?.name || "Shahdol";
  const districtSlug = currentDistrict?.slug || "shahdol";

  useEffect(() => {
    const fetchServiceWorkers = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/service-workers?district=${districtSlug}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch service workers");
        }
        
        const data = await response.json();
        setServiceWorkers(data.data || []);
      } catch (err) {
        console.error("Error fetching service workers:", err);
        setError("Failed to load services. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (districtSlug) {
      fetchServiceWorkers();
    }
  }, [districtSlug]);

  const filteredWorkers = serviceWorkers.filter(w => {
    const matchesSearch = w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (w.address?.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (w.serviceType?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = !selectedType || w.serviceType === selectedType;
    return matchesSearch && matchesType;
  });

  const serviceTypes = [...new Set(serviceWorkers.map(w => w.serviceType))];

  return (
    <div className="min-h-screen sovereign-bg text-white/90">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50">
        <div className="container mx-auto px-4 py-8">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/")}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          
          <h1 className="sovereign-heading text-3xl md:text-4xl font-black mb-2">
            SHAHDOL SERVICE HUB
          </h1>
          <p className="text-white/60">Find plumbers, electricians, carpenters, and more</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-4">
          <SearchBar
            placeholder="Search for Plumbers, Electricians in Shahdol..."
            initialValue={searchQuery}
            onSearch={(query) => setSearchQuery(query)}
          />
        </div>

        {/* Service Type Filters */}
        <div className="flex flex-wrap gap-2 mt-4">
          <Button
            variant={selectedType === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedType(null)}
            className={selectedType === null ? "bg-orange-600 hover:bg-orange-500" : "border-white/20 text-white/60 hover:bg-white/10 hover:text-white"}
          >
            All Services
          </Button>
          {serviceTypes.map(type => (
            <Button
              key={type}
              variant={selectedType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(type)}
              className={selectedType === type ? "bg-orange-600 hover:bg-orange-500" : "border-white/20 text-white/60 hover:bg-white/10 hover:text-white"}
            >
              {serviceTypeLabels[type] || type}
            </Button>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="container mx-auto px-4 pb-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <ServiceSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <Wrench className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4 border-white/20 text-white/60 hover:bg-white/10"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="w-16 h-16 text-white/20 mx-auto mb-4" />
            <p className="text-white/40">No service providers found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredWorkers.map(worker => (
              <div 
                key={worker.id}
                className={`glass-border sovereign-inner-glow rounded-2xl p-6 hover:scale-[1.02] transition-all bg-gradient-to-br ${serviceTypeGlows[worker.serviceType] || 'from-orange-500/20 to-red-500/10 border-orange-500/30'}`}
              >
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl flex items-center justify-center border border-white/10">
                    {serviceTypeIcons[worker.serviceType] || <Wrench className="w-8 h-8 text-orange-400" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-lg text-white">{worker.name}</h3>
                      {worker.isVerified && (
                        <Shield className="w-4 h-4 text-green-500" />
                      )}
                    </div>
                    <p className="text-white/60 text-sm">
                      {serviceTypeLabels[worker.serviceType] || worker.serviceType}
                    </p>
                    {worker.rating && (
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        <span className="text-sm font-medium text-white/80">{worker.rating}</span>
                        <span className="text-sm text-white/40">({worker.reviewCount})</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-white/60">
                  {worker.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-white/40" />
                      <span>{worker.address}</span>
                    </div>
                  )}
                  {worker.serviceArea && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-white/40" />
                      <span>Serves: {worker.serviceArea}</span>
                    </div>
                  )}
                  {worker.serviceHours && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-white/40" />
                      <span>{worker.serviceHours}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  {worker.basePrice && (
                    <span className="text-lg font-bold text-orange-400">
                      ₹{worker.basePrice}+
                    </span>
                  )}
                  <Button 
                    size="sm"
                    className="bg-orange-600 hover:bg-orange-500 text-white"
                    onClick={() => window.location.href = `tel:${worker.phone}`}
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Call Now
                  </Button>
                </div>

                {worker.experience && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <span className="text-xs text-white/40">
                      {worker.experience} years experience
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
