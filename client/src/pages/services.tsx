import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { apiRequest, getArrayData } from "@/lib/api-client";
import { useDistrict } from "@/contexts/DistrictContext";
import { normalizeCanonicalEntities, type CanonicalEntity } from "@/shared/api/response-normalizers";
import { SovereignEntityCard } from "@/components/shared/SovereignEntityCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building2, Sparkles, Search, ArrowLeft } from "lucide-react";

export default function ServicesPage() {
    const [, setLocation] = useLocation();
    const { currentDistrict, isLoading: districtLoading, isReady: districtReady } = useDistrict();
    const [services, setServices] = useState<CanonicalEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [error, setError] = useState<string | null>(null);

    const districtName = currentDistrict?.name ?? "Shahdol";
    const districtSlug = currentDistrict?.slug ?? "shahdol";

    useEffect(() => {
        if (!districtReady || !currentDistrict?.slug) return;

        const fetchServices = async () => {
            try {
                setLoading(true);
                setError(null);

                const response = await apiRequest("GET", "/marketplace/stores?category=SERVICE");
                const rawServices = getArrayData(response);
                setServices(normalizeCanonicalEntities(rawServices, districtSlug, "service"));
            } catch (err) {
                console.error("Error fetching services:", err);
                setError("Failed to load services. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchServices();
    }, [districtReady, currentDistrict?.slug, districtSlug]);

    const filteredServices = services.filter((service) =>
        (service.title || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        ((service.category || "").toLowerCase().includes(searchQuery.toLowerCase())) ||
        ((service.address || "").toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="min-h-screen sovereign-bg text-white">
            <div className="container mx-auto px-6 py-12">
                <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
                    <div>
                        <div className="inline-flex items-center justify-center mb-4 w-16 h-16 rounded-full bg-orange-500/10 text-orange-400">
                            <Sparkles className="w-8 h-8" />
                        </div>
                        <h1 className="text-5xl font-black mb-2">Essential Services</h1>
                        <p className="text-gray-300 max-w-2xl">
                            Browse verified local service providers across {districtName}. All services are normalized to the shared canonical entity layer and route through canonical service detail pages.
                        </p>
                    </div>

                    <Button variant="secondary" onClick={() => setLocation(`/${districtSlug}/search?q=services`)}>
                        Search services
                    </Button>
                </div>

                <div className="max-w-xl">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                            type="text"
                            placeholder="Search essential services..."
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            className="pl-10 h-12"
                        />
                    </div>
                </div>

                <div className="mt-8">
                    {loading || districtLoading ? (
                        <div className="text-center py-24">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4" />
                            <p className="text-gray-400">Loading service providers...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <p className="text-red-400 mb-4">{error}</p>
                            <Button onClick={() => window.location.reload()}>Try Again</Button>
                        </div>
                    ) : filteredServices.length === 0 ? (
                        <div className="text-center py-20 border border-white/10 rounded-3xl bg-white/5">
                            <Building2 className="w-16 h-16 text-orange-400 mx-auto mb-4" />
                            <h2 className="text-2xl font-bold mb-2">No services found</h2>
                            <p className="text-gray-400">
                                Try a broader search or return to marketplace discovery.
                            </p>
                        </div>
                    ) : (
                        <>
                            <p className="text-gray-400 mb-6">
                                Showing {filteredServices.length} service provider{filteredServices.length !== 1 ? "s" : ""} in {districtName}.
                            </p>
                            <div className="grid gap-4 xl:grid-cols-3 lg:grid-cols-2">
                                {filteredServices.map((service) => (
                                    <SovereignEntityCard key={`${service.kind}-${service.id}`} entity={service} variant="grid" />
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
