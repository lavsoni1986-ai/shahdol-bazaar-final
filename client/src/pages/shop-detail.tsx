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
} from "lucide-react";
import { getCTAConfig, getWhatsAppContext, supportsBookings, getCategoryColor } from "@/lib/cta-helpers";
import { BookingModal } from "@/components/BookingModal";
import { TrustBadge } from "@/components/DSSL/TrustBadge";
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

// Fetch shop by ID (supports both legacy Shop and new Vendor)
const fetchShopById = async (id: string) => {
  // Try vendor API first
  const vendorRes = await fetch(`/api/vendors/${id}`);
  if (vendorRes.ok) {
    return vendorRes.json();
  }
  // Fallback to shops API for legacy
  const res = await fetch(`/api/shops/${id}`);
  if (!res.ok) throw new Error("Shop not found");
  return res.json();
};

// Fetch shop by slug - uses new Vendor API
const fetchShopBySlug = async (slug: string) => {
  const res = await fetch(`/api/vendors/${slug}`);
  if (!res.ok) throw new Error("Shop not found");
  return res.json();
};

const fetchProducts = async (vendorId: number) => {
  const res = await fetch(`/api/products?vendorId=${vendorId}`);
  if (!res.ok) {
    throw new Error("Products not found");
  }
  return res.json();
};

export default function ShopDetail() {
  // Support both /shop/:id and /vendor/:slug routes
  const [, shopParams] = useRoute("/shop/:id");
  const [, vendorParams] = useRoute("/vendor/:slug");
  
  const routeShopParams = shopParams as { id?: string } | null;
  const routeVendorParams = vendorParams as { slug?: string } | null;
  
  if (!routeShopParams || !routeVendorParams) return null;

  const shopId = routeShopParams?.id;
  const slug = routeVendorParams?.slug;

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
      await fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: vendorId || shop?.id,
          eventType,
          source: "shop_detail",
        }),
      });
    } catch (e) {
      console.error("Analytics track error:", e);
    }
  };

  // Single query - handles both ID and slug
  const { data: shop, isLoading } = useQuery({
    queryKey: ["shop", shopId || slug],
    queryFn: () => (shopId ? fetchShopById(shopId) : fetchShopBySlug(slug!)),
    enabled: !!shopId || !!slug,
  });

  // Track profile view on page load
  useEffect(() => {
    if (shop?.id) {
      trackEvent("PROFILE_VIEW", shop.id);
    }
  }, [shop?.id]);

  // Fetch products when shop data is available
  const {
    data: products = [],
    isLoading: productsLoading,
  } = useQuery({
    queryKey: ["products", shop?.id],
    queryFn: () => fetchProducts(shop?.id || shop?.vendorId || 0),
    enabled: !!shop?.id || !!shop?.vendorId,
  });

  // Healthcare theme logic
  const isHealthcare =
    shop?.category === "Hospital" ||
    shop?.category === "Healthcare" ||
    shop?.name?.toLowerCase().includes("hospital") ||
    shop?.name?.toLowerCase().includes("doctor");
  const resolvedStoreType: "SHOP" | "SERVICE" | "HOSPITAL" =
    shop?.type ||
    (shop?.businessType === "HEALTHCARE" || isHealthcare
      ? "HOSPITAL"
      : shop?.businessType === "SERVICE" || shop?.businessType === "SCHOOL"
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
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-600 h-10 w-10" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="text-center p-10 text-red-500 bg-red-50 rounded-2xl mx-4">
        ❌ Shop load नहीं हो पाई। Please try again या back जाइए।
      </div>
    );
  }

  const displayShop = shop;
  const phone = displayShop.mobile?.replace(/\D/g, "") || displayShop.phone?.replace(/\D/g, "");
  const ctaConfig = getCTAConfig(displayShop.category);
  const categoryColor = getCategoryColor(displayShop.category);
  const whatsappContext = getWhatsAppContext(displayShop.name, displayShop.category);
  const whatsappLink = phone ? `https://wa.me/91${phone}?text=${encodeURIComponent(`Namaste ${displayShop.name}, main ${leadForm.name} bol raha hoon, mujhe ${leadForm.purpose} ke baare mein jaankari chahiye.`)}` : "";

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
          title: `${displayShop.name} - ShahdolBazaar`,
          text:
            displayShop.description?.substring(0, 100) ||
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
      await trackEvent("WHATSAPP_CLICK", displayShop.id);
      
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: displayShop.id,
          shopName: displayShop.name,
          customerPhone: phone,
          message: `Customer clicked WhatsApp on ${displayShop.name} via ShahdolBazaar`
        })
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
      await fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: displayShop.id,
          eventType: "HIGH_INTENT_LEAD",
          source: "shop_detail",
          action: "whatsapp_prepopup",
          value: {
            customerName: leadForm.name,
            purpose: leadForm.purpose,
            shopId: displayShop.id,
            shopName: displayShop.name
          }
        })
      });
      
      // Also save to leads table
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId: displayShop.id,
          shopName: displayShop.name,
          customerName: leadForm.name,
          message: `Purpose: ${leadForm.purpose} - High-Intent Lead from DSSL Framework`
        })
      });
      
      // Track WhatsApp click
      await trackEvent("WHATSAPP_CLICK", displayShop.id);
      
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
        className="min-h-screen bg-slate-50 pb-20"
        data-testid="shop-detail-page"
      >
        {/* Hero Image */}
        <div className="relative h-48 sm:h-64 md:h-80 bg-slate-200 w-full">
          {!imageError && (displayShop.image || displayShop.logo) ? (
            <img
              src={displayShop.image || displayShop.logo}
              alt={displayShop.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl bg-orange-100 text-orange-300">
              {isHealthcare ? '🏥' : '🏪'}
            </div>
          )}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.history.back()}
              data-testid="button-back"
            >
              ← Back
            </Button>
          </div>
        </div>

        {/* Shop Info Card */}
        <div className="container mx-auto px-4 -mt-10 relative z-10">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide ${
                  isHealthcare 
                    ? 'bg-red-100 text-red-700' 
                    : categoryColor.bg === 'bg-green-100'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {isHealthcare ? 'Healthcare' : displayShop.category || 'Shop'}
                </span>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                  {displayShop.name}
                  {displayShop.isVerified && (
                    <span className="inline-flex items-center justify-center" title="Verified Shop">
                      <CheckCircle className="text-blue-500 h-6 w-6" />
                    </span>
                  )}
                </h1>
                {/* DSSL Trust Badge */}
                <div className="mt-2">
                  <TrustBadge 
                    dsslScore={displayShop.dsslScore || 0} 
                    isVerified={displayShop.isVerified} 
                    safetyBadges={displayShop.safetyBadges || []}
                    size="md"
                    showScore={true}
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-400 hover:text-orange-600"
                onClick={handleShare}
              >
                <Share2 size={20} />
              </Button>
            </div>

            <div className="flex items-center gap-2 text-slate-500 mb-4">
              <MapPin size={18} className={isHealthcare ? "text-red-600" : "text-orange-600"} />
              <p>{displayShop.address || "Address not provided"}</p>
            </div>
            {displayShop.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(displayShop.address)}`}
                target="_blank"
                className="inline-flex items-center gap-2 text-xs font-black text-orange-600 mb-4"
              >
                <MapPin size={14} /> View on Google Maps
              </a>
            )}

            <div className="grid grid-cols-2 gap-4 mb-6">
              {phone && (
                <a href={`tel:${phone}`} className="w-full">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg shadow-md transition-transform active:scale-95">
                    <Phone className="mr-2 h-5 w-5" /> कॉल करें
                  </Button>
                </a>
              )}

              {/* Dynamic Primary CTA Button */}
              {supportsBookings(displayShop.category) || resolvedStoreType !== "SHOP" ? (
                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className={`w-full ${isHealthcare ? 'bg-red-600 hover:bg-red-700' : ctaConfig.primary.color} text-white font-bold py-6 text-lg shadow-md transition-all active:scale-95 rounded-lg`}
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
                  <Button className="w-full bg-green-500 hover:bg-green-600 text-white py-6 text-lg shadow-md transition-transform active:scale-95">
                    <MessageCircle className="mr-2 h-5 w-5" /> व्हाट्सएप पर चैट करें
                  </Button>
                </a>
              )}
            </div>

            {/* Hospital Emergency CTA */}
            {resolvedStoreType === "HOSPITAL" && (
              <div className="mb-6">
                <a href={`tel:${phone}`} className="w-full">
                  <button className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 text-lg shadow-md transition-all active:scale-95 rounded-lg">
                    <AlertCircle className="inline mr-2 h-5 w-5" />
                    Emergency Contact
                  </button>
                </a>
              </div>
            )}

            <div className="border-t pt-6">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Store size={20} className="text-slate-400" />
                About {resolvedStoreType === "HOSPITAL" ? "Hospital" : resolvedStoreType === "SERVICE" ? "Service Provider" : "the Shop"}
              </h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap mb-10">
                {displayShop.description || "No description available."}
              </p>

              {/* DSSL Safety Protocol Section */}
              <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-2xl p-6 border border-slate-200 mb-8">
                <h4 className="font-bold text-lg flex items-center gap-2 mb-4 text-slate-800">
                  <Shield className="text-blue-600" size={24} />
                  DSSL Safety Protocol
                </h4>
                <p className="text-slate-600 text-sm mb-4">
                  This business is verified under the <strong>Digital Safety Score (DSSL)</strong> Framework.
                  We verify business legitimacy, contact accessibility, and customer service responsiveness.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start gap-2">
                    <Verified className="text-green-600 mt-0.5" size={18} />
                    <div>
                      <p className="font-semibold text-sm text-slate-800">Business Verified</p>
                      <p className="text-xs text-slate-500">Identity & license confirmed</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Lock className="text-blue-600 mt-0.5" size={18} />
                    <div>
                      <p className="font-semibold text-sm text-slate-800">Secure Contact</p>
                      <p className="text-xs text-slate-500">Phone & WhatsApp verified</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileCheck className="text-purple-600 mt-0.5" size={18} />
                    <div>
                      <p className="font-semibold text-sm text-slate-800">Service Quality</p>
                      <p className="text-xs text-slate-500">Customer reviews monitored</p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <TrustBadge 
                    dsslScore={displayShop.dsslScore || 0} 
                    isVerified={displayShop.isVerified} 
                    safetyBadges={displayShop.safetyBadges || []}
                    size="lg"
                    showScore={true}
                    showGlow={true}
                  />
                </div>
              </div>

              <div className="border-t pt-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <Package className={isHealthcare ? "text-red-600" : "text-orange-600"} />
                    {sectionLabel}
                  </h2>
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    {products.length} Items
                  </span>
                </div>

                {productsLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-2xl" />
                    ))}
                  </div>
                ) : products.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                    {products.map((product: Product) => (
                      <Link key={product.id} href={`/product/${product.id}`}>
                        <div className="group bg-white rounded-2xl border border-slate-100 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full">
                          <div className="h-40 overflow-hidden bg-slate-50 relative">
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
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            />
                          </div>
                          <div className="p-4 flex flex-col flex-1">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">{product.category}</p>
                            <h4 className="font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2 mb-2 flex-1">{product.name}</h4>
                            <p className="text-lg font-black text-orange-600">₹{parseFloat(product.price).toLocaleString()}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                    <Package className="text-slate-300 h-12 w-12 mx-auto mb-3" />
                    <p className="text-slate-500 font-medium">Abhi is {isHealthcare ? 'hospital' : 'shop'} mein koi products nahi hain.</p>
                  </div>
                )}
              </div>
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
          className="whatsapp-float fixed bottom-6 right-6 p-3 rounded-full shadow-xl z-50 flex items-center justify-center hover:scale-110 transition-all border-2 border-white"
          title={`Chat with ${displayShop.name} on WhatsApp`}
          aria-label={`Chat with ${displayShop.name} on WhatsApp`}
          style={{ background: "#25D366", width: "64px", height: "64px" }}
          onClick={handleWhatsAppClick}
        >
          <MessageCircle size={32} className="text-white" />
        </a>
      )}

      {/* Booking Modal */}
      {displayShop && (
        <BookingModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          shopId={displayShop.id}
          shopName={displayShop.name}
          shopCategory={displayShop.category}
        />
      )}

      {/* Smart Lead Capture Popup */}
      {showLeadPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-orange-600" size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Before you continue...</h3>
              <p className="text-slate-500 text-sm mt-2">
                Help us connect you better. This helps {displayShop.name} prepare for your inquiry.
              </p>
            </div>
            
            <form onSubmit={submitLeadCapture} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition"
                  placeholder="Enter your name"
                  value={leadForm.name}
                  onChange={(e) => setLeadForm({ ...leadForm, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Purpose of Inquiry</label>
                <select
                  required
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition"
                  value={leadForm.purpose}
                  onChange={(e) => setLeadForm({ ...leadForm, purpose: e.target.value })}
                >
                  <option value="">Select purpose</option>
                  <option value="product_inquiry">Product Inquiry</option>
                  <option value="price_quote">Get Price Quote</option>
                  <option value="bulk_order">Bulk/Wholesale Order</option>
                  <option value="service_booking">Book a Service</option>
                  <option value="general">General Inquiry</option>
                </select>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowLeadPopup(false);
                    setLeadForm({ name: '', purpose: '' });
                  }}
                  className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition"
                >
                  Skip
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLead}
                  className="flex-1 px-4 py-3 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
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
            
            <p className="text-xs text-slate-400 text-center mt-4">
              🔒 Your data is protected under DSSL Framework
            </p>
          </div>
        </div>
      )}
    </>
  );
}
