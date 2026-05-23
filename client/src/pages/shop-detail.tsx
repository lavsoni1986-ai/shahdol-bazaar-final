// 🛡️ BHARAT-OS: LEGACY SURFACE
// ⚠️  DO NOT MODIFY — Slated for migration to SovereignEntityDetail
// STATUS: Pre-governance monolithic. Do not replicate its pattern.
// VIOLATIONS: analytics, lead capture, WhatsApp, booking, healthcare,
//   vendor resolution, UI rendering, CTA, tracking — all in one file.
// REPLACEMENT: canonical entity rendering via SovereignEntityDetail

import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
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
  Sparkles,
} from "lucide-react";
import { apiRequest } from "@/lib/api-client";
import { getCTAConfig, getWhatsAppContext, supportsBookings, getCategoryColor } from "@/lib/cta-helpers";
import { BookingModal } from "@/components/BookingModal";
import { TrustBadge } from "@/components/DSSL/TrustBadge";
import { fetchVendorBySlug, fetchVendorById, fetchVendorProducts, trackAnalytics, captureLead, type CanonicalVendorEntity } from "../services/vendor.service";
import { Shield, Award, FileCheck, Lock, Verified } from "lucide-react";

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



const fetchProducts = async (vendorId: number) => {
  const result = await apiRequest("GET", `marketplace/products?vendorId=${vendorId}`);
  console.log("API RESULT", result);
  console.log("vendorId", vendorId);
  if (!result.success) {
    throw new Error(result.error || "API request failed");
  }
  if (!result.data) {
    throw new Error("Missing products payload");
  }
  return result.data || [];
};

export default function ShopDetail() {
  // Support /shop/:id, /vendor/:slug, /:district/partner/:slug, and /marketplace/stores/:slug routes
  const [, shopParams] = useRoute("/shop/:id");
  const [, vendorParams] = useRoute("/vendor/:slug");
  const [, partnerParams] = useRoute("/:district/partner/:slug");
  const [, marketplaceStoreParams] = useRoute("/marketplace/stores/:slug");

  const routeShopParams = shopParams as { id?: string } | null;
  const routeVendorParams = vendorParams as { slug?: string } | null;
  const routePartnerParams = partnerParams as { slug?: string } | null;
  const routeMarketplaceParams = marketplaceStoreParams as { slug?: string } | null;

  // 🛡️ ALL HOOKS MUST DECLARE UNCONDITIONALLY - before any guard returns
  const vendorId = routeShopParams?.id;
  const slug = routeVendorParams?.slug || routePartnerParams?.slug || routeMarketplaceParams?.slug;

  const [imageError, setImageError] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [showLeadPopup, setShowLeadPopup] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: '', purpose: '' });
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [pendingWhatsAppLink, setPendingWhatsAppLink] = useState('');
  const [whatsappPreview, setWhatsAppPreview] = useState('');

  // Track analytics events
  const trackEvent = async (eventType: string, vendorId?: number) => {
    try {
      await trackAnalytics({
        vendorId: vendor?.id || vendorId,
        eventType,
        source: "shop_detail",
      });
    } catch (e) {
      console.error("Analytics track error:", e);
    }
  };

  // Single query - handles both ID and slug
  const { data: vendor, isLoading } = useQuery({
    queryKey: ["vendor", vendorId || slug],
    queryFn: () => (vendorId ? fetchVendorById(vendorId) : fetchVendorBySlug(slug!)),
    enabled: !!vendorId || !!slug,
  });

  // Track profile view on page load
  useEffect(() => {
    if (vendor?.id) {
      trackEvent("PROFILE_VIEW", vendor.id);
    }
  }, [vendor?.id]);

  // Fetch products when vendor data is available
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

  // Healthcare theme logic
  const isHealthcare =
    vendor?.category === "Hospital" ||
    vendor?.category === "Healthcare" ||
    vendor?.name?.toLowerCase().includes("hospital") ||
    vendor?.name?.toLowerCase().includes("doctor");
  const resolvedStoreType: "SHOP" | "SERVICE" | "HOSPITAL" =
    vendor?.type ||
    (vendor?.category === "HEALTHCARE" || isHealthcare
      ? "HOSPITAL"
      : vendor?.category === "SERVICE" || vendor?.category === "SCHOOL"
        ? "SERVICE"
        : "SHOP");
  const primaryLabel =
    resolvedStoreType === "HOSPITAL"
      ? "Book Appointment"
      : resolvedStoreType === "SERVICE"
        ? "Book Inquiry"
        : "Buy Now";
  const sectionLabel =
    resolvedStoreType === "HOSPITAL"
      ? "View Facilities"
      : resolvedStoreType === "SERVICE"
        ? "View Courses/Services"
        : "Product List";

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

  const displayVendor = vendor;
  const phone = displayVendor.mobile?.replace(/\D/g, "") || displayVendor.phone?.replace(/\D/g, "");
  const ctaConfig = getCTAConfig(displayVendor.category);
  const categoryColor = getCategoryColor(displayVendor.category);
  const whatsappContext = getWhatsAppContext(displayVendor.name, displayVendor.category);
  const whatsappLink = phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(`Namaste ${displayVendor.name}, main ${leadForm.name} bol raha hoon, mujhe ${leadForm.purpose} ke baare mein jaankari chahiye.`)}` : "";

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
          text:
            displayVendor.description?.substring(0, 100) ||
            "Check this shop on ShahdolBazaar!",
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("✅ Link copied to clipboard!");
      }
    } catch {
      // Silent fail
    }
  };

  // Track lead when customer clicks WhatsApp
  const handleWhatsAppClick = async () => {
    // Check if user is logged in
    const userStr = localStorage.getItem('user');
    const isLoggedIn = userStr && JSON.parse(userStr)?.id;

    if (!isLoggedIn) {
      // Show lead capture popup instead of direct redirect
      setPendingWhatsAppLink(whatsappLink);
      setShowLeadPopup(true);
      return;
    }

    // Track analytics and lead for logged-in users
    try {
      // Track analytics event
      await trackEvent("WHATSAPP_CLICK", displayVendor.id);

      await captureLead({
        vendorId: displayVendor.id,
        vendorName: displayVendor.name,
        message: `Customer clicked WhatsApp on ${displayVendor.name} via ShahdolBazaar`
      });

      console.log("Lead tracked successfully");
    } catch (err) {
      console.error("Failed to track lead:", err);
    }
  };

  // Submit lead capture form
  const submitLeadCapture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadForm.name || !leadForm.purpose) return;

    setIsSubmittingLead(true);
    try {
      // Save as High-Intent Lead in Analytics
      await trackAnalytics({
        vendorId: displayVendor.id,
        eventType: "HIGH_INTENT_LEAD",
        source: "shop_detail",
        action: "whatsapp_prepopup",
        value: {
          customerName: leadForm.name,
          purpose: leadForm.purpose,
          vendorId: displayVendor.id,
          vendorName: displayVendor.name
        }
      });

      // Also save to leads table
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

      // Track WhatsApp click
      await trackEvent("WHATSAPP_CLICK", displayVendor.id);

      // Close popup and open WhatsApp
      setShowLeadPopup(false);
      setLeadForm({ name: '', purpose: '' });
      window.open(pendingWhatsAppLink, '_blank');

    } catch (err) {
      console.error("Failed to submit lead:", err);
    } finally {
      setIsSubmittingLead(false);
    }
  };

  return (
    <>
      <div
        className="bg-black"
        data-testid="shop-detail-page"
      >
        {/* Hero Image */}
        <div className="relative h-48 sm:h-64 md:h-80 w-full overflow-hidden">
          {/* Ambient glow overlay */}
          {!imageError && (displayVendor.image || displayVendor.logo) ? (
            <>
              <img
                src={displayVendor.image || displayVendor.logo}
                alt={displayVendor.name}
                className="w-full h-full object-contain bg-zinc-900/70"
                loading="lazy"
                onError={() => setImageError(true)}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-900 via-black to-zinc-950 flex items-center justify-center relative">
              {/* Radial glow effect */}
              <div className="absolute inset-0 bg-gradient-radial from-orange-500/10 via-transparent to-transparent" />
              <div className="relative flex flex-col items-center gap-3">
                {isHealthcare ? (
                  <>
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-red-600/20 to-orange-600/10 border border-zinc-800 flex items-center justify-center">
                      <Stethoscope className="w-10 h-10 text-orange-400/80" />
                    </div>
                    <span className="text-zinc-500 text-xs font-medium tracking-wider uppercase">Healthcare</span>
                  </>
                ) : (
                  <>
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-600/20 to-amber-600/10 border border-zinc-800 flex items-center justify-center">
                      <Building2 className="w-10 h-10 text-orange-400/80" />
                    </div>
                    <span className="text-zinc-500 text-xs font-medium tracking-wider uppercase">{displayVendor.category || 'Shop'}</span>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Back button */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-10">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.history.back()}
              className="bg-black/60 backdrop-blur-sm border-zinc-700 text-white hover:bg-black/80"
              data-testid="button-back"
            >
              ← Back
            </Button>
          </div>

          {/* Share button on hero */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10">
            <Button
              variant="ghost"
              size="icon"
              className="bg-black/60 backdrop-blur-sm border border-zinc-700 text-zinc-300 hover:text-orange-400 hover:bg-black/80 rounded-full"
              onClick={handleShare}
            >
              <Share2 size={18} />
            </Button>
          </div>
        </div>

        {/* Shop Info Card */}
        <div className="container mx-auto px-4 -mt-10 relative z-10">
          <div className="bg-gradient-to-br from-zinc-950 to-black rounded-2xl border border-zinc-800 p-6 shadow-xl shadow-black/50">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 min-w-0">
                <span className={`inline-block text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider mb-2 ${isHealthcare
                  ? 'bg-red-950/50 text-red-400 border border-red-900/30'
                  : categoryColor.bg === 'bg-green-100'
                    ? 'bg-green-950/50 text-green-400 border border-green-900/30'
                    : 'bg-orange-950/50 text-orange-400 border border-orange-900/30'
                  }`}>
                  {isHealthcare ? 'Healthcare' : displayVendor.category || 'Shop'}
                </span>
                <h1 className="text-2xl md:text-3xl font-bold text-white mt-2 flex items-center gap-2 truncate">
                  {displayVendor.name}
                  {displayVendor.isVerified && (
                    <span className="inline-flex items-center justify-center shrink-0" title="Verified Shop">
                      <CheckCircle className="text-emerald-400 h-5 w-5" />
                    </span>
                  )}
                </h1>
                {/* DSSL Trust Badge */}
                <div className="mt-3">
                  <TrustBadge
                    dsslScore={displayVendor.dsslScore || 0}
                    isVerified={displayVendor.isVerified}
                    safetyBadges={displayVendor.safetyBadges || []}
                    size="md"
                    showScore={true}
                  />
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="flex items-start gap-2 text-zinc-400 mb-2">
              <MapPin size={16} className="shrink-0 mt-0.5 text-orange-500" />
              <p className="text-sm">{displayVendor.address || "Address not provided"}</p>
            </div>
            {displayVendor.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayVendor.address)}`}
                target="_blank"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-400 hover:text-orange-300 transition-colors mb-6"
              >
                <MapPin size={12} /> View on Google Maps
              </a>
            )}

            {/* CTA Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              {phone && (
                <a href={`tel:${phone}`} className="w-full">
                  <Button className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white py-6 text-base shadow-md shadow-orange-600/20 transition-all active:scale-95 rounded-xl">
                    <Phone className="mr-2 h-5 w-5" /> कॉल करें
                  </Button>
                </a>
              )}

              {/* Dynamic Primary CTA Button */}
              {supportsBookings(displayVendor.category) || resolvedStoreType !== "SHOP" ? (
                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className={`w-full text-white font-bold py-6 text-base shadow-md transition-all active:scale-95 rounded-xl ${isHealthcare
                    ? 'bg-gradient-to-r from-red-700 to-red-600 hover:from-red-600 hover:to-red-500 shadow-red-700/20'
                    : 'bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 shadow-emerald-700/20'
                    }`}
                >
                  <Calendar className="inline mr-2 h-5 w-5" />
                  {primaryLabel}
                </button>
              ) : (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full"
                  onClick={handleWhatsAppClick}
                >
                  <Button className="w-full bg-gradient-to-r from-emerald-700 to-emerald-600 hover:from-emerald-600 hover:to-emerald-500 text-white py-6 text-base shadow-md shadow-emerald-700/20 transition-all active:scale-95 rounded-xl">
                    <MessageCircle className="mr-2 h-5 w-5" /> व्हाट्सएप चैट
                  </Button>
                </a>
              )}
            </div>

            {/* Hospital Emergency CTA */}
            {resolvedStoreType === "HOSPITAL" && (
              <div className="mb-4">
                <a href={`tel:${phone}`} className="w-full">
                  <button className="w-full bg-gradient-to-r from-red-800 to-red-700 hover:from-red-700 hover:to-red-600 text-white font-bold py-3.5 text-base shadow-md shadow-red-800/20 transition-all active:scale-95 rounded-xl border border-red-700/30">
                    <AlertCircle className="inline mr-2 h-5 w-5" />
                    Emergency Contact
                  </button>
                </a>
              </div>
            )}

            {/* About */}
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2 text-white">
                <Store size={18} className="text-orange-500" />
                About {resolvedStoreType === "HOSPITAL" ? "Hospital" : resolvedStoreType === "SERVICE" ? "Service Provider" : "the Shop"}
              </h3>
              <p className="text-zinc-400 leading-relaxed whitespace-pre-wrap text-sm">
                {displayVendor.description || "No description available."}
              </p>
            </div>

            {/* DSSL Safety Protocol Section */}
            <div className="mt-6 bg-gradient-to-br from-zinc-900/80 to-black border border-zinc-800 rounded-2xl p-6">
              <h4 className="font-bold text-base flex items-center gap-2 mb-4 text-white">
                <Shield className="text-orange-500" size={20} />
                DSSL Safety Protocol
              </h4>
              <p className="text-zinc-400 text-sm mb-4 leading-relaxed">
                This business is verified under the <strong className="text-zinc-200">Digital Safety Score (DSSL)</strong> Framework.
                We verify business legitimacy, contact accessibility, and customer service responsiveness.
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
                <TrustBadge
                  dsslScore={displayVendor.dsslScore || 0}
                  isVerified={displayVendor.isVerified}
                  safetyBadges={displayVendor.safetyBadges || []}
                  size="lg"
                  showScore={true}
                  showGlow={true}
                />
              </div>
            </div>

            {/* Products Section */}
            <div className="mt-6 pt-6 border-t border-zinc-800">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Package className={isHealthcare ? "text-red-400" : "text-orange-500"} size={20} />
                  {sectionLabel}
                </h2>
                <span className="bg-zinc-900 text-zinc-400 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-zinc-800">
                  {products.length} Items
                </span>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-56 bg-zinc-900 animate-pulse rounded-2xl" />
                  ))}
                </div>
              ) : products.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                  {products.map((product: Product) => (
                    <Link key={product.id} href={`/product/${product.id}`}>
                      <div className="group bg-zinc-900/80 rounded-2xl border border-zinc-800 hover:border-orange-800/50 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full">
                        <div className="h-36 overflow-hidden bg-zinc-800/50 relative">
                          <img
                            src={
                              toAbsolute(
                                product.images?.[0] ||
                                product.imageUrls?.[0] ||
                                product.imageUrl ||
                                "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&q=80&w=400"
                              )
                            }
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
                  <p className="text-zinc-500 font-medium text-sm">Abhi is {isHealthcare ? 'hospital' : 'shop'} mein koi products nahi hain.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 STICKY WHATSAPP */}
      {phone && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="whatsapp-float fixed bottom-6 right-6 p-3 rounded-full shadow-xl z-50 flex items-center justify-center hover:scale-110 transition-all border-2 border-zinc-700"
          title={`Chat with ${displayVendor.name} on WhatsApp`}
          aria-label={`Chat with ${displayVendor.name} on WhatsApp`}
          style={{ background: "#25D366", width: "64px", height: "64px" }}
          onClick={handleWhatsAppClick}
        >
          <MessageCircle size={32} className="text-white" />
        </a>
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

      {/* Smart Lead Capture Popup */}
      {showLeadPopup && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-gradient-to-br from-zinc-950 to-black border border-zinc-800 rounded-2xl shadow-2xl shadow-black/50 max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-600/20 to-amber-600/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-zinc-800">
                <Shield className="text-orange-400" size={28} />
              </div>
              <h3 className="text-xl font-bold text-white">Before you continue...</h3>
              <p className="text-zinc-400 text-sm mt-2">
                Help us connect you better. This helps {displayVendor.name} prepare for your inquiry.
              </p>
            </div>

            <form onSubmit={submitLeadCapture} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Your Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                  placeholder="Enter your name"
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-zinc-300 mb-1.5">Purpose of Inquiry</label>
                <select
                  required
                  className="w-full px-4 py-3 rounded-xl bg-black border border-zinc-800 text-white placeholder:text-zinc-500 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition"
                  value={leadForm.purpose}
                  onChange={(e) => setLeadForm({ ...leadForm, purpose: e.target.value })}
                >
                  <option value="" className="bg-zinc-900">Select purpose</option>
                  <option value="product_inquiry" className="bg-zinc-900">Product Inquiry</option>
                  <option value="price_quote" className="bg-zinc-900">Get Price Quote</option>
                  <option value="bulk_order" className="bg-zinc-900">Bulk/Wholesale Order</option>
                  <option value="service_booking" className="bg-zinc-900">Book a Service</option>
                  <option value="general" className="bg-zinc-900">General Inquiry</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLeadPopup(false);
                    setLeadForm({ name: '', purpose: '' });
                  }}
                  className="flex-1 px-4 py-3 rounded-xl border border-zinc-700 text-zinc-400 font-semibold hover:bg-zinc-900 transition"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLead}
                  className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-orange-600 to-orange-500 text-white font-semibold hover:from-orange-500 hover:to-orange-400 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20"
                >
                  {isSubmittingLead ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Continue to WhatsApp
                    </>
                  )}
                </button>
              </div>
            </form>

            <p className="text-xs text-zinc-500 text-center mt-4">
              🔒 Your data is protected under DSSL Framework
            </p>
          </div>
        </div>
      )}
    </>
  );
}
