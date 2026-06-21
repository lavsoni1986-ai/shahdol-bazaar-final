// 🛡️ BHARAT-OS: SOVEREIGN PRODUCT DETAIL PAGE (UNIFIED)
// Premium commerce experience with proper image governance, content hierarchy,
// trust signals, and mobile bottom-sheet pattern.
// Canonical detail renderer for all product routes.

import { useRoute } from "wouter";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  ShoppingCart,
  Store,
  ArrowLeft,
  Package,
  MapPin,
  ShieldCheck,
  Star,
  MessageCircle,
  Sparkles,
  ChevronLeft,
  Heart,
  Share2,
  Phone,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useDistrict } from "@/contexts/DistrictContext";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/api-client";
import {
  ProductImage,
  ProductDetailSkeleton,
  PricingStack,
  TrustBadgeRow,
  PrimaryCTAGroup,
  SellerInfoCard,
  DetailSection,
  RelatedProducts,
  StickyMobileCTA,
} from "@/shared/product-detail-components";
import { resolveTrustLevel } from "@/components/shared/SovereignTrustBadge";

type Product = {
  id: string | number;
  name: string;
  title?: string;
  price: string;
  category: string;
  imageUrl?: string;
  imageUrls?: string[];
  images?: string[];
  description?: string;
  shopId: number;
  vendorId?: number;
  vendorName?: string;
  vendor?: {
    name?: string;
    address?: string;
    phone?: string;
    mobile?: string;
    mapsLink?: string;
  };
  shopName?: string;
  shopAddress?: string;
  contactNumber?: string;
  sellerPhone?: string;
  seller?: {
    shopName?: string;
    shopAddress?: string;
    phone?: string;
    mobile?: string;
    contactNumber?: string;
    mapsLink?: string;
  };
  stock?: number;
  mrp?: string | number;
  isVerified?: boolean;
  dsslScore?: number;
  partner?: {
    name: string;
    slug: string;
    phone?: string;
    address?: string;
    mapsLink?: string;
    isVerified?: boolean;
    dsslScore?: number;
  };
  relatedProducts?: any[];
};

const fetchProduct = async (productKey: string): Promise<Product> => {
  if (!productKey) {
    throw new Error("Missing product identifier");
  }

  const isNumericId = /^[0-9]+$/.test(productKey);

  if (isNumericId) {
    const res = await apiRequest("GET", `marketplace/products/${Number(productKey)}`);
    return (res as any)?.data ?? res;
  }

  const safeSlug = encodeURIComponent(productKey);
  const res = await apiRequest("GET", `marketplace/products/slug/${safeSlug}`);
  return (res as any)?.data ?? res;
};

export default function ProductDetail() {
  const [, slugParams] = useRoute("/product/:slug");
  const [, idParams] = useRoute("/product/:id");
  const [, districtSlugParams] = useRoute("/:district/product/:slug");
  const [, marketplaceIdParams] = useRoute("/marketplace/products/:id");
  const [, marketplaceSlugParams] = useRoute("/marketplace/products/:slug");
  const productKey = marketplaceIdParams?.id || marketplaceSlugParams?.slug || slugParams?.slug || idParams?.id || districtSlugParams?.slug;
  const { addToCart } = useCart();
  const { currentDistrict } = useDistrict();
  const districtId = currentDistrict?.id;
  const queryClient = useQueryClient();
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");

  // Fetch product
  const {
    data: product,
    isLoading: productLoading,
    error: productError,
  } = useQuery({
    queryKey: ["product", productKey, districtId],
    queryFn: () => fetchProduct(productKey!),
    enabled: !!productKey,
    retry: 1,
    staleTime: 2 * 60 * 1000,
  });

  const {
    data: reviews,
    isLoading: reviewsLoading,
  } = useQuery({
    queryKey: ["reviews", product?.id, districtId],
    queryFn: async () => {
      if (!product?.id) return [];
      try {
        const res = await apiRequest("GET", `marketplace/reviews/${product.id}`);
        return (res as any)?.data ?? res ?? [];
      } catch (err: any) {
        if ((err?.message || "").toLowerCase().includes("not found")) return [];
        throw err;
      }
    },
    enabled: !!product?.id,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const addReviewMutation = useMutation({
    mutationFn: async (payload: { rating: number; comment: string }) => {
      if (!product?.id) throw new Error("Missing product");
      const res = await apiRequest("POST", "marketplace/reviews", {
        productId: Number(product.id),
        customerName: "Guest",
        rating: payload.rating,
        comment: payload.comment,
      });
      return res;
    },
    onSuccess: () => {
      toast.success("Thank you! Your review is pending approval.");
      queryClient.invalidateQueries({ queryKey: ["reviews", product?.id, districtId] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Review submit failed");
    },
  });

  const handleAddToCart = () => {
    if (!product) return;
    const vendorId = product.vendorId;
    if (!vendorId) {
      toast.error("Cannot add this product - missing vendor information");
      return;
    }
    addToCart({
      id: product.id,
      productId: Number(product.id),
      name: product.name,
      price: Number(product.price),
      imageUrl: product.images?.[0] || product.imageUrls?.[0] || product.imageUrl,
      vendorId: Number(vendorId),
    });
    toast.success(`${product.name} added to cart!`);
  };

  const handleWhatsApp = () => {
    if (!product) return;
    const phone = (product as any).seller?.contactNumber || product.contactNumber || product.sellerPhone || (product as any).phone || (product as any).vendor?.phone || "";
    if (!phone) {
      toast.warning("Seller WhatsApp number not available");
      return;
    }
    const message = encodeURIComponent(
      `Hi, I'm interested in ${product.name} - ₹${product.price}. Please confirm availability.`
    );
    window.open(`https://wa.me/${phone.replace(/\D/g, "")}?text=${message}`, "_blank");
  };

  const handleCall = () => {
    if (!product) return;
    const phone = (product as any).seller?.phone || (product as any).vendor?.phone || product.sellerPhone || product.contactNumber || "";
    if (phone) window.open(`tel:${phone.replace(/\D/g, "")}`, "_blank");
  };

  if (productLoading) return <ProductDetailSkeleton />;

  if (productError || !product) {
    return (
      <div className="min-h-screen bg-sovereign-bg flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Package className="h-16 w-16 text-zinc-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Product Not Found</h1>
          <p className="text-zinc-400 mb-6">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/">
            <Button className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl">
              <ArrowLeft size={16} className="mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const defaultImage =
    "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&q=80&w=800";

  const toAbsolute = (url?: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const filename = url.split("/").pop() || url;
    return `/uploads/${filename}`;
  };

  const priceNum = parseFloat(product.price) || 0;
  const mrpValue = product.mrp ? (typeof product.mrp === "string" ? parseFloat(product.mrp) : product.mrp) : null;
  const originalPrice = mrpValue || Math.max(priceNum * 1.25, priceNum + 120);
  const discountPercent = mrpValue && mrpValue > priceNum
    ? Math.round((1 - priceNum / mrpValue) * 100)
    : originalPrice > 0
      ? Math.round((1 - priceNum / originalPrice) * 100)
      : 0;
  const sameDay = true;
  const primaryImage = toAbsolute(product.images?.[0] || product.imageUrls?.[0] || product.imageUrl || defaultImage);
  const sellerName = product.vendorName || product.vendor?.name || product.shopName || "Local Seller";
  const sellerAddress = product.vendor?.address || product.shopAddress || null;
  const sellerPhoneVal =
    (product as any)?.phone ||
    (product as any)?.vendor?.phone ||
    (product as any)?.vendor?.mobile ||
    product.contactNumber ||
    product.sellerPhone ||
    "";
  const sellerMaps = product.vendor?.mapsLink || product.seller?.mapsLink;
  const categoryName = typeof product.category === 'object' && product.category !== null
    ? (product.category as any)?.name || "General"
    : product.category || "General";

  const trustLevel = resolveTrustLevel({
    isVerified: (product as any).isVerified,
    dsslScore: (product as any).dsslScore
  });

  const districtSlug = currentDistrict?.slug || "shahdol";

  return (
    <div className="bg-sovereign-bg">
      {/* 🛡️ HEADER is now rendered by Layout.tsx (route-aware)
          No duplicate sticky header here. Layout handles back/share/save.
      */}

      {/* ─── MAIN CONTENT ─── */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 md:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-10">
          {/* ── LEFT: PRODUCT MEDIA ── */}
          <div className="space-y-4">
            <ProductImage
              src={primaryImage}
              alt={product.name}
              aspectRatio="square"
              priority
            />

            {primaryImage && primaryImage !== defaultImage && (
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-orange-500/50 bg-zinc-800 shrink-0">
                  <img src={primaryImage} alt="" className="w-full h-full object-contain" />
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT: PRODUCT DETAILS ── */}
          <div className="space-y-5 md:space-y-6">
            {/* Identity */}
            <div className="space-y-3">
              <span className="inline-flex items-center gap-1.5 bg-orange-500/10 text-orange-400 text-[10px] font-black uppercase tracking-[0.25em] px-3 py-1.5 rounded-full border border-orange-500/20">
                <Sparkles className="w-3 h-3" />
                {categoryName}
              </span>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                {product.name}
              </h1>

              {/* Seller */}
              <div className="inline-flex items-center gap-2 bg-white/[0.04] px-4 py-2 rounded-full">
                <Store className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-semibold text-zinc-300">{sellerName}</span>
                <span className="text-[10px] font-black text-orange-400/60 bg-orange-500/10 px-2 py-0.5 rounded-full">
                  Seller
                </span>
              </div>
            </div>

            {/* Trust Badges */}
            <TrustBadgeRow trustLevel={trustLevel} />

            {/* Pricing */}
            <PricingStack
              price={priceNum}
              originalPrice={originalPrice}
              discountPercent={discountPercent}
              deliveryInfo="Same Day Delivery in Shahdol"
            />

            {/* CTA */}
            <PrimaryCTAGroup
              onAddToCart={handleAddToCart}
              onWhatsApp={handleWhatsApp}
              onCall={handleCall}
              sellerPhone={sellerPhoneVal}
              productName={product.name}
              productPrice={product.price}
            />

            {/* Description */}
            {product.description && (
              <DetailSection title="Description" icon={<Sparkles className="w-3.5 h-3.5" />}>
                <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </DetailSection>
            )}

            {/* Product details */}
            <DetailSection title="Product Details" icon={<Package className="w-3.5 h-3.5" />}>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-zinc-500">Category</span>
                  <span className="text-zinc-200 font-medium">{categoryName}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-500">Delivery</span>
                  <span className="text-emerald-400 font-semibold">Same Day</span>
                </div>
              </div>
            </DetailSection>

            {/* Seller Info */}
            {(sellerName || sellerAddress) && (
              <SellerInfoCard
                name={sellerName}
                address={sellerAddress}
                phone={sellerPhoneVal}
                mapsLink={sellerMaps}
                trustLevel={trustLevel}
              />
            )}

            {/* Reviews */}
            <DetailSection title="Reviews" icon={<Star className="w-3.5 h-3.5" />}>
              <div className="flex items-center justify-between mb-3">
                <Button
                  onClick={() => setReviewDialogOpen(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-xl text-xs font-black"
                  size="sm"
                >
                  Write a Review
                </Button>
              </div>
              {reviewsLoading ? (
                <p className="text-sm text-zinc-500">Loading reviews...</p>
              ) : !reviews || reviews.length === 0 ? (
                <p className="text-sm text-zinc-500">No reviews yet. Be the first to review!</p>
              ) : (
                <div className="space-y-2">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="bg-white/[0.03] border border-white/5 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-zinc-200">
                        <span>{r.customerName || "Customer"}</span>
                        <span className="text-orange-400">{Array.from({ length: r.rating || 0 }).map(() => "★").join("")}</span>
                      </div>
                      <p className="text-sm text-zinc-400 mt-1">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </DetailSection>
          </div>
        </div>
      </div>

      {/* ─── STICKY MOBILE CTA ─── */}
      <StickyMobileCTA
        price={priceNum}
        onAddToCart={handleAddToCart}
        onWhatsApp={handleWhatsApp}
      />

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="bg-zinc-900 rounded-2xl max-w-[420px] w-[95%] p-6 space-y-4 border border-white/10">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white">Write a Review</DialogTitle>
            <DialogDescription className="text-sm text-zinc-400">
              Share your experience. Your review will appear once approved.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!product?.id) return;
              addReviewMutation.mutate({ rating: reviewRating, comment: reviewComment });
              setReviewDialogOpen(false);
              setReviewComment("");
              setReviewRating(5);
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`p-2 rounded-lg border text-xl ${reviewRating >= star
                      ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                      : "border-white/10 text-zinc-500"
                      }`}
                    onClick={() => setReviewRating(star)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-200">Comment</label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="How was the product?"
                required
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-orange-600 text-white hover:bg-orange-700"
              disabled={addReviewMutation.isPending}
            >
              {addReviewMutation.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
