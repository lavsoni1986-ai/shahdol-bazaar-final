import React from "react";
import { useParams } from "wouter";
import { 
  SovereignPageHeader, 
  SovereignBackButton,
  SovereignContactGrid,
  SovereignFeatureSection,
  SovereignVerifiedBadge,
  SovereignGlassCard,
  PageType
} from "@/components/SovereignLayout";

interface ServiceData {
  name: string;
  phone?: string;
  address?: string;
  hours?: string;
  features?: string[];
  description?: string;
}

const mockServices: Record<string, ServiceData> = {
  "times-public-school": {
    name: "Times Public School",
    phone: "917696888881",
    address: "Shahdol, Madhya Pradesh",
    hours: "8:00 AM - 3:00 PM",
    features: [
      "Premium Infrastructure",
      "Smart Classrooms",
      "Science & Computer Labs",
      "Sports Facilities",
      "Safe & Secure Campus",
      "Transportation Available",
    ],
    description: "Times Public School is a premier educational institution dedicated to providing quality education to students in Shahdol region.",
  },
  "city-hospital": {
    name: "City Hospital Shahdol",
    phone: "917696888882",
    address: "Shahdol, Madhya Pradesh",
    hours: "24/7 Open",
    features: [
      "24/7 Emergency Services",
      "Qualified Medical Staff",
      "Modern Infrastructure",
      "Ambulance Service",
      "Pharmacy Available",
      "ICU Facilities",
    ],
    description: "City Hospital provides comprehensive healthcare services to the Shahdol community with state-of-the-art medical facilities.",
  },
};

export default function ServiceDetail() {
  const { type, slug } = useParams<{ type: string; slug: string }>();
  
  const pageType = (type === "school" || type === "hospital") ? type as PageType : "school";
  const serviceData = mockServices[slug || ""] || {
    name: slug?.replace(/-/g, " ") || "Unknown",
    phone: "917696888881",
    address: "Shahdol, Madhya Pradesh",
    hours: pageType === "hospital" ? "24/7 Open" : "9:00 AM - 5:00 PM",
    features: pageType === "school" 
      ? ["Premium Infrastructure", "Experienced Faculty", "Modern Labs"]
      : ["24/7 Emergency", "Qualified Doctors", "Modern Equipment"],
  };

  const category = pageType === "school" ? "Education" : "Healthcare";

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
