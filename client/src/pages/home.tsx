import { useEffect, useState, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { Link, useLocation } from "wouter";
import {
  Star,
  X,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  Megaphone,
  ShieldCheck,
  Store,
  Smartphone,
  Shirt,
  ShoppingBag,
  Tag,
  HeartPulse,
  FlaskRound,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { SearchBar } from "@/components/search-bar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// --- TYPES ---
type Product = {
  id: string | number;
  name: string;
  price: string;
  category: string;
  imageUrl?: string;
  imageUrls?: string[];
  images?: string[];
  description?: string;
  shopId: number;
  approved?: boolean;
  shopName?: string;
};

type Offer = {
  id: number;
  content: string;
};

type Banner = {
  id?: number;
  image: string;
  title?: string;
  link?: string;
};

const PLACEHOLDER_IMAGE =
  "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&q=80&w=400";

type Category = { id: number; name: string };

const HERO_FALLBACK_BANNERS: Banner[] = [
  {
    title: "Welcome to Shahdol Bazaar",
    image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1600&q=80",
    link: "/",
  },
];

const CATEGORY_VISUALS: Record<
  string,
  { img?: string; icon?: React.ComponentType<{ size?: number; className?: string }> }
> = {
  // "electronics": { icon: Smartphone }, // disabled to prioritize uploaded image
  "ethnic wear": { img: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80" },
  "western wear": { img: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=400&q=80" },
  "menswear": { img: "https://images.unsplash.com/photo-1490578474895-699cd4e2cf59?auto=format&fit=crop&w=400&q=80" },
  "footwear": { icon: ShoppingBag },
  "kids wear": { icon: Shirt },
  "beauty": { icon: Tag },
  "cosmetics": { icon: Tag },
  "home appliances": { icon: ShoppingBag },
  "health & wellness": { icon: ShieldCheck },
  "home & kitchen": { icon: ShoppingBag },
  "groceries": { icon: ShoppingBag },
  "skin care": { icon: FlaskRound },
  "health": { icon: HeartPulse },
};

const resolveImage = (raw?: string) => {
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  const filename = raw.split("/").pop() || raw;
  return `/uploads/${filename}`;
};

const getPrimaryImage = (product: Product) => {
  const candidate =
    product.images?.[0] ||
    product.imageUrls?.[0] ||
    product.imageUrl ||
    "";
  if (!candidate) return PLACEHOLDER_IMAGE;
  return resolveImage(candidate);
};

// ==========================================
// PRODUCT CARD COMPONENT
// ==========================================
function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart: (product: Product) => void;
}) {
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerData, setCustomerData] = useState({ name: "", phone: "", address: "" });

  const tags = ["Bestseller", "Limited Offer", ""];
  const randomTag = tags[Math.floor(Math.random() * tags.length)];
  const rating = Math.random() > 0.5 ? 4.8 : 4.5;
  const lowStock = Math.random() > 0.7;
  const priceNum = parseFloat(product.price) || 0;
  const originalPrice = Math.max(priceNum * 1.25, priceNum + 120);
  const discountPercent = originalPrice > 0 ? Math.round((1 - priceNum / originalPrice) * 100) : 0;
  const sameDay = Math.random() > 0.5;
  const shopLabel =
    (product as any)?.shopName ||
    (product as any)?.seller?.shopName ||
    `Shop #${product.shopId}`;
  const isVerifiedSeller = (product as any)?.approved === true || (product as any)?.status === "approved";

  const handleBuyNow = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // ✅ LOCAL API SYNC: Connecting to local orders route
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          shopId: product.shopId,
          customerName: customerData.name,
          customerPhone: customerData.phone,
          customerAddress: customerData.address,
          quantity: 1,
          totalPrice: product.price,
          status: "pending",
        }),
      });

      if (res.ok) {
        toast.success("Order Placed Successfully! 📦");
        setShowOrderDialog(false);
        setCustomerData({ name: "", phone: "", address: "" });
      } else {
        throw new Error("Failed to place order");
      }
    } catch (err) {
      toast.error("Order failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Link href={`/product/${product.id}`} className="block h-full cursor-pointer">
      <div className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:shadow-xl hover:shadow-pink-200/50 transition-all duration-300 flex flex-col h-full cursor-pointer">
        <div className="h-48 overflow-hidden relative bg-slate-50">
          {randomTag && (
            <span
              className={`absolute top-2 left-2 text-[10px] font-black px-2 py-1 rounded-full shadow ${
                randomTag === "Bestseller" ? "bg-amber-400 text-amber-900" : "bg-red-500 text-white"
              }`}
            >
              {randomTag}
            </span>
          )}
          <img
            src={getPrimaryImage(product)}
            loading="lazy"
            alt={product.name}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-2 left-2 bg-white/90 text-[#e4488f] text-[10px] font-black px-2 py-1 rounded-full shadow">Free Delivery</div>
          <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="bg-white/90 text-[#e4488f] px-4 py-2 rounded-full text-xs font-black shadow-lg">
              View Details
            </button>
          </div>
        </div>
        <div className="p-5 flex flex-col flex-1">
          <div className="mb-2 flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{product.category}</p>
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-orange-600 transition-colors line-clamp-2 mb-2 min-h-[3.5rem] cursor-pointer">
              {product.name}
            </h3>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
              <ShieldCheck size={14} className={`text-blue-500 ${isVerifiedSeller ? "" : "opacity-70"}`} />
              <span className="text-blue-600">{isVerifiedSeller ? "Verified Local Seller" : "Seller"}</span>
            </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 mt-1">
            <Store size={14} className="text-slate-500" />
            <span className="hover:text-orange-600 cursor-pointer">{shopLabel}</span>
          </div>
            {product.description && <p className="text-xs text-slate-500 line-clamp-2 mb-3">{product.description}</p>}
          </div>
          <div className="flex flex-col gap-3 pt-3 border-t border-slate-50 mt-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-orange-600">₹{priceNum.toLocaleString()}</span>
                <span className="text-sm line-through text-slate-400">₹{originalPrice.toLocaleString()}</span>
                {discountPercent > 0 && (
                  <span className="text-xs font-black text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                    {discountPercent}% OFF
                  </span>
                )}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAddToCart(product); }}
                className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all"
              >
                <ShoppingCart size={20} />
              </button>
            </div>
            {sameDay && (
              <div className="text-[11px] font-bold text-green-600">Same Day Delivery in Shahdol</div>
            )}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star
                    key={idx}
                    size={14}
                    className="text-orange-500 fill-orange-500"
                  />
                ))}
              </div>
              <span className="font-bold">{rating.toFixed(1)}</span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-500">Best seller</span>
            </div>
            {lowStock && (
              <div className="text-[11px] font-bold text-red-500 mt-1">Only 2 left in stock!</div>
            )}
            <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
              <DialogTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); }}
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl shadow-lg active:scale-95 transition-all text-sm uppercase tracking-wider"
                >
                  Buy Now
                </button>
              </DialogTrigger>
              <DialogContent className="bg-white rounded-3xl max-w-sm">
                <DialogHeader><DialogTitle className="text-xl font-bold">Order Details</DialogTitle></DialogHeader>
                <form onSubmit={handleBuyNow} className="space-y-4 pt-4">
                  <Input required placeholder="Full Name" value={customerData.name} onChange={(e) => setCustomerData({...customerData, name: e.target.value})} />
                  <Input required type="tel" maxLength={10} placeholder="Mobile Number" value={customerData.phone} onChange={(e) => setCustomerData({...customerData, phone: e.target.value})} />
                  <Input required placeholder="Full Address" value={customerData.address} onChange={(e) => setCustomerData({...customerData, address: e.target.value})} />
                  <Button type="submit" className="w-full bg-orange-600 h-12 text-lg font-bold" disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Confirm Order"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ==========================================
// HOME COMPONENT
// ==========================================
export default function Home() {
  const { addToCart } = useCart();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });
  const [shopFilter] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const p = new URLSearchParams(window.location.search);
    return p.get("shopId");
  });
  const [location] = useLocation();
  const queryClient = useQueryClient();
  const productsSectionRef = useRef<HTMLDivElement>(null);
  const toAbsolute = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const filename = url.split("/").pop() || url;
    return `/uploads/${filename}`;
  };

  // Initialize search from URL ?q=
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const initialQ = params.get("q") || params.get("search") || "";
    setQuery(initialQ);
  }, []);

  // Keep search state in sync if URL changes (e.g., back/forward)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q") || params.get("search") || "";
    const cat = params.get("category") || "";
    setQuery(q);
    setActiveCategory(cat ? cat : null);
    setPage(1);
  }, [location]);

  // Autoplay for slider
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => {
      if (!emblaApi) return;
      if (emblaApi.canScrollNext()) emblaApi.scrollNext();
      else emblaApi.scrollTo(0);
    }, 4000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  const { data: productsData, isLoading: productsLoading, isFetching: productsFetching } = useQuery({
    queryKey: ["/api/products", { category: (activeCategory || "").toLowerCase(), search: debouncedQuery }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("approved", "true");
      if (activeCategory) params.set("category", activeCategory);
      if (debouncedQuery) params.set("search", debouncedQuery);
      const qs = params.toString();
      const response = await fetch(`/api/products${qs ? `?${qs}` : ""}`);
      const data = await response.json();
      console.log("Fetching from:", `/api/products${qs}`);
      return data;
    },
    keepPreviousData: true,
    staleTime: 15_000,
  });

  // Debounce search term
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    // ✅ LOCAL NEWS SYNC: Matching ticker to Admin Dashboard entries
    fetch(`/api/offers`)
      .then(res => res.json())
      .then(data => setOffers(Array.isArray(data) ? data : []))
      .catch(() => setOffers([]));
  }, []);

  const { data: categoryData = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Failed to load categories");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    cacheTime: 0,
  });

  const { data: bannerData = [] } = useQuery<Banner[]>({
    queryKey: ["banners"],
    queryFn: async () => {
      const res = await fetch(`/api/banners`);
      if (!res.ok) throw new Error("Failed to load banners");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    staleTime: 30_000,
  });

  const heroSlides = (bannerData.length ? bannerData : HERO_FALLBACK_BANNERS).map((b) => {
    const rawLink = b.link || "#products";
    const normalizedLink =
      rawLink.startsWith("/") || rawLink.startsWith("http")
        ? rawLink
        : /^\d+$/.test(rawLink)
          ? `/product/${rawLink}`
          : `/${rawLink}`;
    return {
      title: b.title || "Local Deals",
      subtitle: "",
      cta: "Shop Now",
      href: normalizedLink,
      image: toAbsolute(b.image),
    };
  });

  const productsList: Product[] = useMemo(() => {
    if (!productsData) return [];
    const list = productsData.data || productsData.products || productsData || [];
    const normalized = Array.isArray(list) ? list : [];
    const approvedOnly = normalized.filter((p: any) => p?.approved === true);
    return approvedOnly as Product[];
  }, [productsData]);

  useEffect(() => {
    if (!productsData) return;
    setTotalPages(productsData.pagination?.totalPages ?? 1);
  }, [productsData]);

  const renderProducts = productsList;
  console.log("Rendering Products:", renderProducts.length);

  if (productsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
        <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* --- NEWS TICKER --- */}
      {offers.length > 0 && (
        <div className="bg-[#FFD700] border-b border-yellow-500 overflow-hidden relative group">
          <div className="max-w-6xl mx-auto flex items-center h-10 md:h-12 px-6">
            <div className="flex-shrink-0 flex items-center gap-2 bg-black text-[#FFD700] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mr-4 animate-pulse">
              <Megaphone size={12} className="animate-bounce" /> OFFERS & NEWS
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div className="flex animate-marquee whitespace-nowrap gap-12 items-center">
                {offers.map((offer, i) => (
                  <span key={`${offer.id}-${i}`} className="text-slate-900 font-bold text-sm md:text-base uppercase">
                    {offer.content} <Star size={12} className="inline ml-2 opacity-30" />
                  </span>
                ))}
                {/* Seamless repetition for scrolling */}
                {offers.map((offer, i) => (
                  <span key={`${offer.id}-dup-${i}`} className="text-slate-900 font-bold text-sm md:text-base uppercase">
                    {offer.content} <Star size={12} className="inline ml-2 opacity-30" />
                  </span>
                ))}
              </div>
            </div>
          </div>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
            .animate-marquee { display: inline-flex; animation: marquee 35s linear infinite; }
            .group:hover .animate-marquee { animation-play-state: paused; }
          `}} />
        </div>
      )}

      <SearchBar
        initialValue={query}
        onSearch={(term) => {
          setQuery(term);
          setPage(1);
          const params = new URLSearchParams(window.location.search);
          if (term) params.set("search", term);
          else params.delete("search");
          const newUrl = `${window.location.pathname}?${params.toString()}`;
          window.history.replaceState({}, "", newUrl);
        }}
      />

      {/* --- CATEGORIES (Meesho-style circles) --- */}
      <section className="max-w-6xl mx-auto px-4 md:px-6 pt-2 pb-3 bg-white">
        <div className="flex overflow-x-auto gap-4 no-scrollbar py-2">
          {categoryData.length === 0 ? (
            <div className="text-sm text-slate-500">Loading categories...</div>
          ) : (
            <>
              <button
                key="all-categories"
                onClick={() => {
                  setActiveCategory(null);
                  setPage(1);
                  const params = new URLSearchParams(window.location.search);
                  params.delete("category");
                  const newUrl = `${window.location.pathname}?${params.toString()}`;
                  window.history.replaceState({}, "", newUrl.endsWith("?") ? newUrl.slice(0, -1) : newUrl);
                }}
                className={`flex-shrink-0 w-20 flex flex-col items-center gap-2 transition-transform ${!activeCategory ? "scale-95" : "hover:-translate-y-1"}`}
              >
                <div
                  className={`h-20 w-20 rounded-full overflow-hidden border-2 shadow transition-transform duration-200 ${
                    !activeCategory ? "border-[#e4488f]" : "border-slate-100"
                  } ${!activeCategory ? "" : "hover:scale-105"}`}
                >
                  <div className="h-full w-full bg-slate-50 flex items-center justify-center text-[#e4488f] font-black text-xs">
                    All
                  </div>
                </div>
                <span
                  className={`text-[11px] font-bold text-center leading-tight ${
                    !activeCategory ? "text-[#e4488f]" : "text-slate-600"
                  }`}
                >
                  All
                </span>
              </button>
            {categoryData.map((cat) => {
              const visual = CATEGORY_VISUALS[cat.name.toLowerCase()] || {};
              const isActive = activeCategory === cat.name;
              const IconComp = visual.icon || Star;
              const rawImage = (cat as any)?.imageUrl;
              const imageSrc = rawImage
                ? rawImage.startsWith("http")
                  ? rawImage
                  : `${window.location.origin}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`
                : undefined;
              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    const next = isActive ? null : cat.name;
                    setActiveCategory(next);
                    setPage(1);
                    const params = new URLSearchParams(window.location.search);
                    if (next) params.set("category", next.toLowerCase());
                    else params.delete("category");
                    const newUrl = `${window.location.pathname}?${params.toString()}`;
                    window.history.replaceState({}, "", newUrl.endsWith("?") ? newUrl.slice(0, -1) : newUrl);
                  }}
                  className={`flex-shrink-0 w-20 flex flex-col items-center gap-2 transition-transform ${
                    isActive ? "scale-95" : "hover:-translate-y-1"
                  }`}
                >
                  <div
                  className={`h-20 w-20 rounded-full overflow-hidden border-2 shadow transition-transform duration-200 ${
                      isActive ? "border-[#e4488f]" : "border-slate-100"
                    } ${isActive ? "" : "hover:scale-105"}`}
                  >
                    {imageSrc ? (
                      <img src={imageSrc} alt={cat.name} className="h-full w-full object-cover" />
                    ) : visual.img ? (
                      <img src={visual.img} alt={cat.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-slate-50 flex items-center justify-center text-[#e4488f]">
                        <IconComp size={24} />
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-[11px] font-bold text-center leading-tight ${
                      isActive ? "text-[#e4488f]" : "text-slate-600"
                    }`}
                  >
                    {cat.name}
                  </span>
                </button>
              );
            })}
            </>
          )}
        </div>
      </section>

      {/* --- TRUST BAR --- */}
      <div className="border-b border-slate-100 bg-white/95">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-2 flex items-center justify-between text-[11px] font-bold text-slate-700">
          <span className="flex items-center gap-2">✅ Cash on Delivery</span>
          <span className="flex items-center gap-2">✅ Free Shipping</span>
          <span className="flex items-center gap-2">✅ 7 Days Returns</span>
        </div>
      </div>

      {/* --- HERO SLIDER --- */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-0 md:px-6 py-4">
          <div className="relative rounded-3xl overflow-hidden shadow-lg">
            <div className="embla overflow-hidden" ref={emblaRef}>
              <div className="embla__container flex">
                {heroSlides.map((slide, idx) => {
                  const isScrollTarget = slide.href === "#products";
                  return (
                    <div className="embla__slide min-w-0 flex-[0_0_100%]" key={idx}>
                      <div className="relative h-[260px] md:h-[360px]">
                        <Link href={slide.href || "#products"}>
                          <div className="w-full h-full cursor-pointer">
                            <img
                              src={slide.image}
                              alt={slide.title}
                              className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent pointer-events-none" />
                          </div>
                        </Link>
                        <div className="absolute inset-0 flex flex-col justify-center px-6 md:px-12 text-white z-10 pointer-events-none">
                          <p className="text-xs font-black uppercase tracking-[0.3em] text-orange-200">Exclusive</p>
                          <h2 className="text-3xl md:text-5xl font-black leading-tight mt-2">{slide.title}</h2>
                          <p className="text-sm md:text-base text-slate-100 mt-3">{slide.subtitle}</p>
                          <div className="mt-5 w-fit pointer-events-auto">
                            {isScrollTarget ? (
                              <Button
                                className="bg-[#e4488f] hover:bg-[#d53e83] px-5 cursor-pointer relative z-[100]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (productsSectionRef.current) {
                                    productsSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
                                  }
                                }}
                              >
                                {slide.cta}
                              </Button>
                            ) : (
                              <Link href={slide.href || "#products"}>
                                <Button
                                  className="bg-[#e4488f] hover:bg-[#d53e83] px-5 cursor-pointer relative z-[100]"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                  }}
                                >
                                  {slide.cta}
                                </Button>
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- LISTING --- */}
      <section ref={productsSectionRef} id="products" className="max-w-6xl mx-auto px-4 md:px-6 mt-6 pb-24">
        <div className="flex items-end justify-between mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">{activeCategory || "All Shahdol Products"}</h2>
      {(query || activeCategory) && (
        <button
          onClick={() => {
            setQuery("");
            setActiveCategory(null);
            setPage(1);
            const params = new URLSearchParams(window.location.search);
            params.delete("search");
            params.delete("q");
            params.delete("category");
            const newUrl = `${window.location.pathname}?${params.toString()}`;
            window.history.replaceState({}, "", newUrl.endsWith("?") ? newUrl.slice(0, -1) : newUrl);
          }}
          className="text-orange-600 font-black text-sm uppercase flex items-center gap-2"
        >
          Reset <X size={16} />
        </button>
      )}
        </div>

        {productsLoading || (productsFetching && renderProducts.length === 0) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => <div key={i} className="h-80 bg-slate-100 animate-pulse rounded-[2rem]"></div>)}
          </div>
        ) : renderProducts.length > 0 ? (
          <>
            <div key={activeCategory || "all"} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {renderProducts.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onAddToCart={(prod) => {
                    addToCart({ ...prod, quantity: 1 });
                    toast.success("Added to cart!");
                  }}
                />
              ))}
            </div>
            <div className="flex justify-center items-center gap-10 mt-20">
              <Button disabled={page === 1} variant="ghost" className="font-black text-slate-400" onClick={() => setPage(p => p - 1)}><ChevronLeft className="mr-2" /> PREV</Button>
              <span className="text-xs font-black text-slate-300">PAGE {page} / {totalPages}</span>
              <Button disabled={page >= totalPages} variant="ghost" className="font-black text-orange-600" onClick={() => setPage(p => p + 1)}>NEXT <ChevronRight className="ml-2" /></Button>
            </div>
          </>
        ) : (
          <div className="py-32 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-50 space-y-3">
            <h3 className="text-2xl font-black text-slate-700">
              {activeCategory ? `No products found in ${activeCategory}` : "Shahdol mein yeh saaman filhal uplabdha nahi hai"}
            </h3>
            {query && <p className="text-sm text-slate-500 mt-2">Search term: “{query}”</p>}
            {(query || activeCategory) && (
              <Button
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setActiveCategory(null);
                  setPage(1);
                  const params = new URLSearchParams(window.location.search);
                  params.delete("search");
                  params.delete("q");
                  params.delete("category");
                  const newUrl = `${window.location.pathname}?${params.toString()}`;
                  window.history.replaceState({}, "", newUrl.endsWith("?") ? newUrl.slice(0, -1) : newUrl);
                }}
              >
                Clear Search
              </Button>
            )}
          </div>
        )}
      </section>
    </div>
  );
}