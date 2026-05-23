import React from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import {
  SovereignPageHeader,
  SovereignBackButton,
  SovereignContactGrid,
  SovereignFeatureSection,
  SovereignVerifiedBadge,
  SovereignGlassCard,
  PageType
} from "@/components/SovereignLayout";
import { apiRequest } from "@/lib/api-client";

interface VendorData {
  id: number;
  name: string;
  businessName?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  description?: string;
  category?: string;
  type?: string;
  isVerified?: boolean;
  dsslScore?: number;
  safetyBadges?: string[];
}

const fetchServiceBySlug = async (slug: string): Promise<VendorData> => {
  const res = await apiRequest("GET", `marketplace/vendors/${slug}`);
  return (res as any)?.data ?? res;
};

export default function ServiceDetail() {
  const { type, slug } = useParams<{ type?: string; slug?: string }>();

  const rawType = type?.toLowerCase();
  const pageType = (rawType === "school" || rawType === "hospital") ? rawType as PageType : "product";

  const { data: vendor, isLoading, error } = useQuery({
    queryKey: ["service", slug],
    queryFn: () => fetchServiceBySlug(slug!),
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen sovereign-bg text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-orange-600 h-12 w-12 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading service details...</p>
        </div>
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <div className="min-h-screen sovereign-bg text-white flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-2">Service Not Found</h1>
          <p className="text-slate-400 mb-6">
            The service you're looking for doesn't exist or has been removed.
          </p>
          <SovereignBackButton />
        </div>
      </div>
    );
  }

  const inferredType = vendor?.category?.toLowerCase().includes("hospital")
    ? "hospital"
    : vendor?.category?.toLowerCase().includes("school")
      ? "school"
      : rawType === "hospital" || rawType === "school"
        ? rawType
        : "service";

  // Map vendor data to service display format
  const serviceData = {
    name: vendor.businessName || vendor.name,
    phone: vendor.mobile || vendor.phone,
    address: vendor.address || "Address not provided",
    hours: inferredType === "hospital" ? "24/7 Emergency Services" : "9:00 AM - 5:00 PM",
    features: inferredType === "school"
      ? ["Academic Excellence", "Experienced Faculty", "Modern Facilities", "Sports & Activities"]
      : inferredType === "hospital"
        ? ["Emergency Care", "Qualified Doctors", "Modern Equipment", "24/7 Support"]
        : ["Trusted Local Service", "Verified Partner", "Fast Response", "Community Approved"],
    description: vendor.description || `Professional ${inferredType} services in Shahdol.`,
  };

  const category = inferredType === "school"
    ? "Education"
    : inferredType === "hospital"
      ? "Healthcare"
      : "Essential Services";

  return (
    <div className="min-h-screen sovereign-bg text-white">
      <SovereignBackButton />

      <SovereignPageHeader
        title={serviceData.name}
        category={category}
        type={pageType}
        subtitle="Shahdol, Madhya Pradesh"
      />

      <div className="px-6 -mt-12 pb-20">
        <SovereignContactGrid
          phone={serviceData.phone}
          address={serviceData.address}
          hours={serviceData.hours}
          whatsapp={serviceData.phone}
        />

        {serviceData.description && (
          <SovereignGlassCard className="mt-6">
            <h3 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-3">About</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{serviceData.description}</p>
          </SovereignGlassCard>
        )}

        <SovereignFeatureSection
          title={pageType === "school" ? "Key Features" : "Services & Facilities"}
          features={serviceData.features || []}
        />

        <SovereignVerifiedBadge />
      </div>
    </div>
  );
}
