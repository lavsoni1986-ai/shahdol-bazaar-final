import { useRoute, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  MapPin,
  Phone,
  MessageCircle,
  Share2,
  Store,
  Package,
} from "lucide-react";

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

const fetchShop = async (id: string) => {
  const res = await fetch(`/api/shops/${id}`);
  if (!res.ok) {
    throw new Error("Shop not found");
  }
  return res.json();
};

const fetchShopProducts = async (shopId: string) => {
  const res = await fetch(`/api/products?shopId=${shopId}`);
  if (!res.ok) {
    throw new Error("Products not found");
  }
  return res.json();
};

export default function ShopDetail() {
  const [, params] = useRoute("/shop/:id");
  const id = params?.id;
  const [imageError, setImageError] = useState(false);

  const {
    data: shop,
    isLoading: shopLoading,
    error: shopError,
  } = useQuery({
    queryKey: ["shop", id],
    queryFn: () => fetchShop(id!),
    enabled: !!id,
  });

  const {
    data: products = [],
    isLoading: productsLoading,
  } = useQuery({
    queryKey: ["shop-products", id],
    queryFn: () => fetchShopProducts(id!),
    enabled: !!id,
  });

  if (shopLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-orange-600 h-10 w-10" />
      </div>
    );
  }

  if (shopError || !shop) {
    return (
      <div className="text-center p-10 text-red-500 bg-red-50 rounded-2xl mx-4">
        ❌ Shop load नहीं हो पाई। Please try again या back जाइए।
      </div>
    );
  }

  const phone = shop.mobile?.replace(/\D/g, "");

  // ✅ UPDATED MESSAGE: Ab ye "shahdolbazaar" kahega
  const message = `Hello shahdolbazaar से आपकी दुकान के बारे में जानना है!`;
  const whatsappLink = `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;

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
          title: `${shop.name} - ShahdolBazaar`,
          text:
            shop.description?.substring(0, 100) ||
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

  return (
    <>
      <div
        className="min-h-screen bg-slate-50 pb-20"
        data-testid="shop-detail-page"
      >
        {/* Hero Image */}
        <div className="relative h-48 sm:h-64 md:h-80 bg-slate-200 w-full">
          {!imageError && shop.image ? (
            <img
              src={shop.image}
              alt={shop.name}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-4xl sm:text-6xl bg-orange-100 text-orange-300">
              🏪
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
                <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                  {shop.category}
                </span>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mt-2">
                  {shop.name}
                </h1>
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
              <MapPin size={18} className="text-orange-600" />
              <p>{shop.address || "Address not provided"}</p>
            </div>
            {shop.address && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(shop.address)}`}
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
                    <Phone className="mr-2 h-5 w-5" /> Call Now
                  </Button>
                </a>
              )}
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full bg-green-500 hover:bg-green-600 text-white py-6 text-lg shadow-md transition-transform active:scale-95">
                  <MessageCircle className="mr-2 h-5 w-5" /> Chat WhatsApp
                </Button>
              </a>
            </div>

            <div className="border-t pt-6">
              <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
                <Store size={20} className="text-slate-400" />
                About the Shop
              </h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap mb-10">
                {shop.description || "No description available for this shop."}
              </p>

              <div className="border-t pt-10">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                    <Package className="text-orange-600" />
                    Products from this Shop
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
                    <p className="text-slate-500 font-medium">Abhi is shop mein koi products nahi hain.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 STICKY WHATSAPP (Side-by-side with AI) */}
      {shop?.mobile && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          // ✅ FIXED: WhatsApp ko right-6 par rakha hai
          className="whatsapp-float fixed bottom-6 right-6 p-3 rounded-full shadow-xl z-50 flex items-center justify-center hover:scale-110 transition-all border-2 border-white"
          title={`Chat with ${shop.name} on WhatsApp`}
          aria-label={`Chat with ${shop.name} on WhatsApp`}
          style={{ background: "#25D366", width: "64px", height: "64px" }}
        >
          <MessageCircle size={32} className="text-white" />
        </a>
      )}
    </>
  );
}
