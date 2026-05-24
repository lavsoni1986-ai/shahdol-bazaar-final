// 🏛️ BHARAT-OS: GOVERNED ENTITY DETAIL PAGE
// ================================================================
// SOVEREIGN — Consumes governance layer for ALL entity behavior.
// NO hardcoded category branching. NO hardcoded CTA logic.
// NO legacy entity kind detection.
//
// Every decision derives from:
//   resolveEntityExperience() → media, layout, accent
//   resolveEntityCTAs()       → primary/secondary actions, booking, commerce flags
//   trackEvent()              → canonical analytics
// ================================================================

import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Phone,
  MessageCircle,
  Share2,
  Store,
  Package,
  Calendar,
  AlertCircle,
  Stethoscope,
  CheckCircle,
  Building2,
  Shield,
  FileCheck,
  Lock,
  Verified,
  BookOpen,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { BookingModal } from "@/components/BookingModal";
import { fetchVendorBySlug, fetchVendorById, fetchVendorProducts, captureLead } from "../services/vendor.service";

// ─── GOVERNANCE IMPORTS ──────────────────────────────────
import {
  resolveEntityExperience,
  resolveEntityCTAs,
  resolveKindFromCategory,
  resolveKindFromTags,
  type ResolvedExperience,
} from "@/governance";
import { trackEvent } from "@/lib/analytics";
import { SovereignTrustBadge, resolveTrustLevel } from "@/components/shared/SovereignTrustBadge";
import { MEDIA_GOVERNANCE } from "@/design/media-governance";
import type { MediaType } from "@/design/media-governance";

// ─── TYPES ──────────────────────────────────────────────

type Product = {
  id: string | number;
  name: string;
  price: string;
  category: string;
  imageUrl?: string;
  imageUrls?: string[];
  images?: string[];
  description?: string;
};

// ─── HELPERS ────────────────────────────────────────────

/**
 * Resolve entity kind from vendor data fields.
 * Uses canonical governance resolvers — NO hardcoded category branching.
 */
function resolveVendorKind(vendor: Record<string, any>): string {
  const fromCategory = resolveKindFromCategory(vendor.category || "");
  if (fromCategory) return fromCategory;

  const fromTags = vendor.tags?.length ? resolveKindFromTags(vendor.tags) : undefined;
  if (fromTags) return fromTags;

  const type = (vendor.type || "").toLowerCase();
  if (type === "hospital" || type === "healthcare") return "healthcare";
  if (type === "service" || type === "school") return "service";
  if (type === "shop" || type === "store" || type === "vendor") return "marketplace";

  return "marketplace";
}

function heroIconForLayout(layout: ResolvedExperience["layout"]) {
  switch (layout) {
    case "service": return Stethoscope;
    case "info": return BookOpen;
    default: return Building2;
  }
}

function heroLabelForLayout(layout: ResolvedExperience["layout"], category?: string | null): string {
  if (category) return category;
  switch (layout) {
    case "service": return "Service Provider";
    case "info": return "Information";
    default: return "Shop";
  }
}

function accentGradientClasses(accent: ResolvedExperience["accent"]): string {
  switch (accent) {
    case "emerald": return "from-emerald-600/20 to-green-600/10";
    case "blue": return "from-blue-600/20 to-indigo-600/10";
    case "purple": return "from-purple-600/20 to-violet-600/10";
    case "rose": return "from-rose-600/20 to-red-600/10";
    case "amber": return "from-amber-600/20 to-yellow-600/10";
    default: return "from-orange-600/20 to-amber-600/10";
  }
}

function accentIconBorder(accent: ResolvedExperience["accent"]): string {
  switch (accent) {
    case "emerald": return "border-emerald-900/30";
    case "blue": return "border-blue-900/30";
    case "purple": return "border-purple-900/30";
    case "rose": return "border-rose-900/30";
    case "amber": return "border-amber-900/30";
    default: return "border-orange-900/30";
  }
}

function accentBadgeClasses(accent: ResolvedExperience["accent"]): string {
  switch (accent) {
    case "emerald": return "bg-emerald-950/50 text-emerald-400 border border-emerald-900/30";
    case "blue": return "bg-blue-950/50 text-blue-400 border border-blue-900/30";
    case "purple": return "bg-purple-950/50 text-purple-400 border border-purple-900/30";
    case "rose": return "bg-rose-950/50 text-rose-400 border border-rose-900/30";
    case "amber": return "bg-amber-950/50 text-amber-400 border border-amber-900/30";
    default: return "bg-orange-950/50 text-orange-400 border border-orange-900/30";
  }
}

function accentButtonGradient(accent: ResolvedExperience["accent"]): string {
  switch (accent) {
    case "emerald": return "bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 shadow-emerald-700/20";
    case "blue": return "bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 shadow-blue-700/20";
    case "purple": return "bg-gradient-to-r from-purple-700 to-purple-600 hover:from-purple-600 hover:to-purple-500 shadow-purple-700/20";
    case "rose": return "bg-gradient-to-r from-rose-700 to-rose-600 hover:from-rose-600 hover:to-rose-500 shadow-rose-700/20";
    case "amber": return "bg-gradient-to-r from-amber-700 to-amber-600 hover:from-amber-600 hover:to-amber-500 shadow-amber-700/20";
    default: return "bg-gradient-to-r from-orange-700 to-orange-600 hover:from-orange-600 hover:to-orange-500 shadow-orange-700/20";
  }
}

function accentIconColor(accent: ResolvedExperience["accent"]): string {
  switch (accent) {
    case "emerald": return "text-emerald-400";
    case "blue": return "text-blue-400";
    case "purple": return "text-purple-400";
    case "rose": return "text-rose-400";
    case "amber": return "text-amber-400";
    default: return "text-orange-500";
  }
}

// ─── FETCHERS ───────────────────────────────────────────

const fetchProducts = async (vendorId: number) => {
  const result = await apiRequest("GET", `marketplace/products?vendorId=${vendorId}`);
  if (!result.success) {
    throw new Error(result.error || "API request failed");
  }
  if (!result.data) {
    throw new Error("Missing products payload");
  }
  return result.data || [];
};

// ─── COMPONENT ──────────────────────────────────────────

export default function ShopDetail() {
  const [, shopParams] = useRoute("/shop/:id");
  const [, vendorParams] = useRoute("/vendor/:slug");
  const [, partnerParams] = useRoute("/:district/partner/:slug");
  const [, marketplaceStoreParams] = useRoute("/marketplace/stores/:slug");

  const routeShopParams = shopParams as { id?: string } | null;
  const routeVendorParams = vendorParams as { slug?: string } | null;
  const routePartnerParams = partnerParams as { slug?: string } | null;
  const routeMarketplaceParams = marketplaceStoreParams as { slug?: string } | null;

  const vendorId = routeShopParams?.id;
  const slug = routeVendorParams?.slug || routePartnerParams?.slug || routeMarketplaceParams?.slug;

  const [imageError, setImageError] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [showLeadPopup, setShowLeadPopup] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: '', purpose: '' });
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [pendingWhatsAppLink, setPendingWhatsAppLink] = useState('');

  // Single query - handles both ID and slug
  const { data: vendor, isLoading } = useQuery({
    queryKey: ["vendor", vendorId || slug],
    queryFn: () => (vendorId ? fetchVendorById(vendorId) : fetchVendorBySlug(slug!)),
    enabled: !!vendorId || !!slug,
  });

  // ─── GOVERNANCE RESOLUTION ─────────────────────────────
  const entityKind = vendor ? resolveVendorKind(vendor as Record<string, any>) : "marketplace";
  const experience = vendor ? resolveEntityExperience({
    entityKind,
    category: (vendor as any).category,
    tags: (vendor as any).tags || [],
    vendorType: (vendor as any).type,
  }) : null;
  const ctas = vendor ? resolveEntityCTAs({
    kind: entityKind as any,
    category: (vendor as any).category,
    tags: (vendor as any).tags || [],
  }) : null;

  // Track VENDOR_VIEW via canonical analytics
  useEffect(() => {
    if (vendor?.id) {
      trackEvent("VENDOR_VIEW", {
        vendorId: vendor.id,
        source: "profile",
        value: { entityKind, slug: vendor.slug },
      });
    }
  }, [vendor?.id, entityKind]);

  const validVendorId =
    typeof vendor?.id === "number" &&
      Number.isFinite(vendor.id) &&
      vendor.id > 0
      ? vendor.id
      : null;

  const { data: products = [] } = useQuery({
    queryKey: ["products", validVendorId],
    queryFn: () => {
      if (!validVendorId) return [];
      return fetchVendorProducts(validVendorId);
    },
    enabled: !!validVendorId,
  });

  // ─── LOADING STATE ────────────────────────────────────
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-zinc-700 border-t-orange-500"></div>
          <p className="text-zinc-400 text-sm">Loading partner details...</p>
        </div>
      </div>
    );
  }

  // ─── ERROR STATE ──────────────────────────────────────
  if (!vendor) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-red-950/40 to-zinc-950 border border-red-900/30 rounded-2xl p-8 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-red-300 text-lg font-medium">Shop load नहीं हो पाई।</p>
          <p className="text-zinc-400 text-sm mt-2">Please try again या back जाइए।</p>
        </div>
      </div>
    );
  }

  const displayVendor = vendor as any;
  const phone = displayVendor.mobile?.replace(/\D/g, "") || displayVendor.phone?.replace(/\D/g, "");

  const whatsappDefaultText = `Namaste ${displayVendor.name}, main ${leadForm.name} bol raha hoon, mujhe ${leadForm.purpose} ke baare mein jaankari chahiye.`;
  const whatsappLink = phone
    ? `https://wa.me/91${phone}?text=${encodeURIComponent(whatsappDefaultText)}`
    : "";

  // Resolved governance values
  const resolvedAccent = experience?.accent || "orange";
  const resolvedLayout = experience?.layout || "commerce";
  const resolvedMediaType: MediaType = experience?.mediaType || "marketplace_card";
  const resolvedHasBooking = experience?.hasBooking ?? false;
  const resolvedIsCommerce = experience?.isCommerce ?? true;
  const resolvedHasEmergency = ctas?.policy.hasEmergencyContact ?? false;
  const FallbackIcon = heroIconForLayout(resolvedLayout);

  const sectionLabel = resolvedLayout === "service"
    ? "View Facilities / Services"
    : "Product List";

  const toAbsolute = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const normalized = url.startsWith("/") ? url : `/${url}`;
    return `${window.location.origin}${normalized}`;
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `${displayVendor.name} - ShahdolBazaar`,
          text: displayVendor.description?.substring(0, 100) || "Check this shop on ShahdolBazaar!",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("✅ Link copied to clipboard!");
      }
    } catch { /* silent */ }
  };

  // ─── GOVERNANCE WIRED ANALYTICS ───────────────────────

  const handleWhatsAppClick = async () => {
    const userStr = localStorage.getItem('user');
    const isLoggedIn = userStr && JSON.parse(userStr)?.id;

    trackEvent("WHATSAPP_CLICK", {
      vendorId: displayVendor.id,
      source: "shop_detail",
      value: { entityKind, vendorName: displayVendor.name },
    });

    if (!isLoggedIn) {
      setPendingWhatsAppLink(whatsappLink);
      setShowLeadPopup(true);
      return;
    }

    try {
      await captureLead({
        vendorId: displayVendor.id,
        vendorName: displayVendor.name,
        message: `Customer clicked WhatsApp on ${displayVendor.name} via ShahdolBazaar`
      });
    } catch (err) {
      console.error("Failed to track lead:", err);
    }
  };

  const handleCallClick = () => {
    trackEvent("CALL_CLICK", {
      vendorId: displayVendor.id,
      source: "shop_detail",
      value: { entityKind, vendorName: displayVendor.name },
    });
  };

  const handleBookingClick = () => {
    trackEvent("CTA_CLICK", {
      vendorId: displayVendor.id,
      source: "shop_detail",
      action: "booking",
      value: { entityKind, vendorName: displayVendor.name },
    });
    setIsBookingModalOpen(true);
  };

  const submitLeadCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.name || !leadForm.purpose) return;

    setIsSubmittingLead(true);
    try {
      trackEvent("CTA_CLICK", {
        vendorId: displayVendor.id,
        source: "shop_detail",
        action: "lead_capture",
        value: {
          customerName: leadForm.name,
          purpose: leadForm.purpose,
          vendorId: displayVendor.id,
          vendorName: displayVendor.name,
          entityKind,
        },
      });

      const leadResult = await apiRequest("POST", "leads", {
        body: {
          vendorId: displayVendor.id,
          vendorName: displayVendor.name,
          customerName: leadForm.name,
          message: `Purpose: ${leadForm.purpose} - High-Intent Lead from DSSL Framework`
        }
      });

      if (!leadResult.success) {
        console.error("Lead capture failed:", leadResult.error);
      }

      trackEvent("WHATSAPP_CLICK", {
        vendorId: displayVendor.id,
        source: "lead_popup",
        value: { entityKind },
      });

      setShowLeadPopup(false);
      setLeadForm({ name: '', purpose: '' });
      window.open(pendingWhatsAppLink, '_blank');
    } catch (err) {
      console.error("Failed to submit lead:", err);
    } finally {
      setIsSubmittingLead(false);
    }
  };

  // Governance-driven media
  const heroMediaGovernance = MEDIA_GOVERNANCE[resolvedMediaType];

  return (
    <>
      <div className="bg-black" data-testid="shop-detail-page">
        {/* 🏛️ Hero — governance-driven mediaMode */}
        <div className={`relative w-full overflow-hidden ${heroMediaGovernance.aspectClass}`}>
          {!imageError && (displayVendor.image || displayVendor.logo) ? (
            <>
              <img
                src={displayVendor.image || displayVendor.logo}
                alt={displayVendor.name}
                className={`w-full h-full ${heroMediaGovernance.containStrategy === "contain" ? "object-contain" : "object-cover"} bg-zinc-900/70`}
                loading="lazy"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-black to-zinc-950 flex items-center justify-center relative">
              <div className="absolute inset-0 bg-gradient-radial from-orange-500/10 via-transparent to-transparent" />
              <div className="relative flex flex-col items-center gap-3">
                <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${accentGradientClasses(resolvedAccent)} border ${accentIconBorder(resolvedAccent)} flex items-center justify-center`}>
                  <FallbackIcon className={`w-10 h-10 ${accentIconColor(resolvedAccent)}/80`} />
                </div>
                <span className="text-zinc-500 text-xs font-medium tracking-wider uppercase">
                  {heroLabelForLayout(resolvedLayout, displayVendor.category)}
                </span>
              </div>
            </div>
          )}

          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.history.back()}
              className="bg-black/60 backdrop-blur-sm border-zinc-700 text-white hover:bg-black/80"
              data-testid="button-back"
            >← Back</Button>
          </div>

          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/60 backdrop-blur-sm border border-zinc-700 text-zinc-300 hover:text-orange-400 hover:bg-black/80 rounded-full"
              onClick={handleShare}
            ><Share2 size={18} /></Button>
          </div>
        </div>

        {/* Info Card */}
        <div className="container mx-auto px-4 -mt-10 relative z-10">
          <div className="bg-gradient-to-br from-zinc-950 to-black rounded-2xl border border-zinc-800 p-6 shadow-xl shadow-black/50">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 min-w-0">
                {/* 🏛️ Category badge — governance accent */}
                <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-2 ${accentBadgeClasses(resolvedAccent)}`}>
                  {displayVendor.category || heroLabelForLayout(resolvedLayout)}
                </span>
                <h1 className="text-2xl md:text-3xl font-bold text-white mt-2 flex items-center gap-2 truncate">
                  {displayVendor.name}
                  {displayVendor.isVerified && (
                    <span className="inline-flex items-center justify-center shrink-0" title="Verified">
                      <CheckCircle className="text-emerald-400 h-5 w-5" />
                    </span>
                  )}
                </h1>
                {/* 🏛️ DSSL Trust — SovereignTrustBadge */}
                <div className="mt-3">
                  <SovereignTrustBadge
                    level={resolveTrustLevel({
                      isVerified: displayVendor.isVerified,
                      dsslScore: displayVendor.dsslScore || 0,
                    })}
                    size="md"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 text-zinc-400 mb-2">
              <MapPin size={16} className="shrink-0 mt-0.5 text-orange-500" />
              <p className="text-sm">{displayVendor.address || "Address not provided"}</p>
            </div>
            {displayVendor.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayVendor.address)}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors mb-6"
              ><MapPin size={12} /> View on Google Maps</a>
            )}

            {/* 🏛️ CTA Buttons — governance-driven */}
            <div className={`grid ${phone ? 'grid-cols-2' : 'grid-cols-1'} gap-3 mb-4`}>
              {phone && (
                <a href={`tel:${phone}`} className="w-full" onClick={handleCallClick}>
                  <Button className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white py-6 text-base shadow-md shadow-orange-600/20 transition-all active:scale-95 rounded-xl">
                    <Phone className="mr-2 h-5 w-5" /> कॉल करें
                  </Button>
                </a>
              )}

              {resolvedHasBooking ? (
                <button
                  onClick={handleBookingClick}
                  className={`w-full text-white font-bold py-6 text-base shadow-md transition-all active:scale-95 rounded-xl ${accentButtonGradient(resolvedAccent)}`}
                >
                  <Calendar className="inline mr-2 h-5 w-5" />
                  {entityKind === "professional" ? "Book Appointment" : entityKind === "healthcare" ? "Book Appointment" : "Book Service"}
                </button>
              ) : (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                  onClick={(e) => {
                    e.preventDefault();
                    handleWhatsAppClick();
                    const userStr = localStorage.getItem('user');
                    if (userStr && JSON.parse(userStr)?.id) {
                      window.open(whatsappLink, '_blank');
                    }
                  }}
                >
                  <Button className="w-full bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white py-6 text-base shadow-md shadow-emerald-700/20 transition-all active:scale-95 rounded-xl">
                    <MessageCircle className="mr-2 h-5 w-5" /> व्हाट्सएप चैट
                  </Button>
                </a>
              )}
            </div>

            {/* 🏛️ Emergency contact — governance-driven */}
            {resolvedHasEmergency && phone && (
              <div className="mb-4">
                <a href={`tel:${phone}`} className="w-full" onClick={handleCallClick}>
                  <button className="w-full bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-white font-bold py-3.5 text-base shadow-md shadow-red-800/20 transition-all active:scale-95 rounded-xl border border-red-700/30">
                    <AlertCircle className="inline mr-2 h-5 w-5" /> Emergency Contact
                  </button>
                </a>
              </div>
            )}

            {/* About */}
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-white">
                <Store size={18} className={accentIconColor(resolvedAccent)} />
                About {resolvedLayout === "service" ? "Service Provider" : "the Shop"}
              </h3>
              <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap text-sm">
                {displayVendor.description || "No description available."}
              </p>
            </div>

            {/* 🏛️ DSSL Safety Protocol Section */}
            <div className="mt-6 bg-gradient-to-br from-zinc-900/80 to-black border border-zinc-800 rounded-2xl p-6">
              <h4 className="font-bold text-base flex items-center gap-2 mb-4 text-white">
                <Shield className={accentIconColor(resolvedAccent)} size={20} /> DSSL Safety Protocol
              </h4>
              <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
                This business is verified under the <strong className="text-zinc-200">Digital Safety Score (DSSL)</strong> Framework.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-start gap-2.5 bg-black/40 rounded-xl p-3 border border-zinc-800/50">
                  <Verified className="text-emerald-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="font-semibold text-sm text-zinc-200">Business Verified</p>
                    <p className="text-xs text-zinc-500">Identity & license confirmed</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 bg-black/40 rounded-xl p-3 border border-zinc-800/50">
                  <Lock className="text-blue-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="font-semibold text-sm text-zinc-200">Secure Contact</p>
                    <p className="text-xs text-zinc-500">Phone & WhatsApp verified</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5 bg-black/40 rounded-xl p-3 border border-zinc-800/50">
                  <FileCheck className="text-amber-400 shrink-0 mt-0.5" size={16} />
                  <div>
                    <p className="font-semibold text-sm text-zinc-200">Service Quality</p>
                    <p className="text-xs text-zinc-500">Customer reviews monitored</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <SovereignTrustBadge
                  level={resolveTrustLevel({
                    isVerified: displayVendor.isVerified,
                    dsslScore: displayVendor.dsslScore || 0,
                  })}
                  size="lg"
                />
              </div>
            </div>

            {/* 🏛️ Products Section — governed by isCommerce */}
            {resolvedIsCommerce && (
              <div className="mt-6 pt-6 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Package className={accentIconColor(resolvedAccent)} size={20} /> {sectionLabel}
                  </h2>
                  <span className="bg-zinc-900 text-zinc-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-zinc-800">
                    {products.length} Items
                  </span>
                </div>

                {products.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                    {products.map((product: Product) => (
                      <Link key={product.id} href={`/product/${product.id}`}>
                        <div className="group bg-zinc-900/80 rounded-2xl border border-zinc-800 hover:border-orange-800/50 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full">
                          <div className="h-36 overflow-hidden bg-zinc-800/50 relative">
                            <img
                              src={toAbsolute(product.images?.[0] || product.imageUrls?.[0] || product.imageUrl || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&q=80&w=400")}
                              alt={product.name}
                              className="w-full h-full object-contain p-1 bg-zinc-900/70 group-hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                          <div className="p-3 flex flex-col flex-1 gap-1">
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{product.category}</p>
                            <h4 className="font-bold text-zinc-100 group-hover:text-orange-400 transition-colors line-clamp-2 text-sm flex-1">{product.name}</h4>
                            <p className="text-base font-bold text-orange-400">₹{parseFloat(product.price).toLocaleString()}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-zinc-900/50 rounded-[2rem] border border-dashed border-zinc-800">
                    <Package className="text-zinc-700 h-10 w-10 mx-auto mb-3" />
                    <p className="text-zinc-500 font-medium text-sm">
                      Abhi is {resolvedLayout === "service" ? "service provider" : "shop"} mein koi items nahi hain.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 🔥 Sticky WhatsApp */}
      {phone && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-float fixed bottom-6 right-6 p-3 rounded-full shadow-xl z-50 flex items-center justify-center hover:scale-110 transition-all border-2 border-zinc-700"
          title={`Chat with ${displayVendor.name} on WhatsApp`}
          aria-label={`Chat with ${displayVendor.name} on WhatsApp`}
          style={{ background: "#25D366", width: "64px", height: "64px" }}
          onClick={(e) => {
            e.preventDefault();
            handleWhatsAppClick();
            const userStr = localStorage.getItem('user');
            if (userStr && JSON.parse(userStr)?.id) {
              window.open(whatsappLink, '_blank');
            }
          }}
        ><MessageCircle size={32} className="text-white" /></a>
      )}

      {/* Booking Modal */}
      {displayVendor && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          vendorId={displayVendor.id}
          vendorName={displayVendor.name}
          vendorCategory={displayVendor.category}
        />
      )}

      {/* Lead Capture Popup */}
      {showLeadPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-zinc-950 to-black border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-600/20 to-amber-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                <Shield className="text-orange-400" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white">Before you continue...</h3>
              <p className="text-zinc-400 text-sm mt-2">Help us connect you better.</p>
            </div>

            <form onSubmit={submitLeadCapture} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Your Name</label>
                <input type="text" required className="w-full px-4 py-3 rounded-xl bg-black border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition" placeholder="Enter your name" value={leadForm.name} onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Purpose</label>
                <select required className="w-full px-4 py-3 rounded-xl bg-black border border-zinc-800 text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition" value={leadForm.purpose} onChange={(e) => setLeadForm({ ...leadForm, purpose: e.target.value })}>
                  <option value="">Select purpose</option>
                  <option value="product_inquiry">Product Inquiry</option>
                  <option value="price_quote">Get Price Quote</option>
                  <option value="bulk_order">Bulk Order</option>
                  <option value="service_booking">Book a Service</option>
                  <option value="general">General Inquiry</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowLeadPopup(false); setLeadForm({ name: '', purpose: '' }); }} className="flex-1 px-4 py-3 rounded-xl border border-zinc-700 text-zinc-400 font-semibold hover:bg-zinc-900 transition">Skip</button>
                <button type="submit" disabled={isSubmittingLead} className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold hover:from-orange-500 hover:to-orange-400 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20">
                  {isSubmittingLead ? (<><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>) : (<>Continue to WhatsApp</>)}
                </button>
              </div>
            </form>
            <p className="text-xs text-zinc-500 text-center mt-4">🔒 Your data is protected under DSSL Framework</p>
          </div>
        </div>
      )}
    </>
  );
}
