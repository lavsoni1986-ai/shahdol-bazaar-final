// Vercel Force Update 1.0.2
import { useRoute } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  ShoppingCart,
  Store,
  ArrowLeft,
  Package,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

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
};

const fetchProduct = async (id: string): Promise<Product> => {
  const safeId = encodeURIComponent(id);
  const res = await fetch(`/api/products/${safeId}`);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
    throw new Error(errorData.message || "Product not found");
  }
  return res.json();
};

export default function ProductDetail() {
  const [, params] = useRoute("/product/:id");
  const productId = params?.id;
  const { addToCart } = useCart();
  const queryClient = useQueryClient();
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "upi">("cod");
  const [upiStatus, setUpiStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customerData, setCustomerData] = useState({ name: "", phone: "", address: "" });
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [imageError, setImageError] = useState(false);

  // Fetch product
  const {
    data: product,
    isLoading: productLoading,
    error: productError,
  } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => fetchProduct(productId!),
    enabled: !!productId,
  });

  const {
    data: reviews,
    isLoading: reviewsLoading,
  } = useQuery({
    queryKey: ["reviews", productId],
    queryFn: async () => {
      if (!productId) return [];
      const res = await fetch(`/api/reviews/${productId}`);
      if (!res.ok) throw new Error("Failed to load reviews");
      return res.json();
    },
    enabled: !!productId,
  });

  const addReviewMutation = useMutation({
    mutationFn: async (payload: { rating: number; comment: string }) => {
      if (!productId) throw new Error("Missing product");
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: Number(productId),
          customerName: "Guest",
          rating: payload.rating,
          comment: payload.comment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to submit review");
      return data;
    },
    onSuccess: () => {
      toast.success("Thank you! Your review is pending approval.");
      queryClient.invalidateQueries({ queryKey: ["reviews", productId] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Review submit failed");
    },
  });

  const handleAddToCart = () => {
    if (!product) return;
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.images?.[0] || product.imageUrls?.[0] || product.imageUrl,
      shopId: product.shopId,
    });
    toast.success(`${product.name} added to cart!`);
  };

  const handleBuyNow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;
    setIsSubmitting(true);
    try {
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
          status: paymentMethod === "upi" ? "payment_pending_verification" : "pending",
          paymentMethod,
        }),
      });
      if (!res.ok) throw new Error("Failed to place order");
      toast.success(
        paymentMethod === "upi"
          ? "Payment verification in progress. Your order will be confirmed shortly."
          : "Order Placed Successfully! 📦"
      );
      setIsCheckoutOpen(false);
      setCustomerData({ name: "", phone: "", address: "" });
      setPaymentMethod("cod");
      setUpiStatus("");
    } catch (err: any) {
      toast.error(err?.message || "Order failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (productLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-orange-600 h-12 w-12 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">Loading product...</p>
        </div>
      </div>
    );
  }

  if (productError || !product) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <Package className="text-slate-300 h-16 w-16 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-800 mb-2">Product Not Found</h1>
          <p className="text-slate-600 mb-6">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/">
            <Button className="bg-orange-500 hover:bg-orange-600">
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
  const originalPrice = Math.max(priceNum * 1.25, priceNum + 120);
  const discountPercent = originalPrice > 0 ? Math.round((1 - priceNum / originalPrice) * 100) : 0;
  const sameDay = true;
  const rating = 4.8;
  const primaryImage = toAbsolute(product.images?.[0] || product.imageUrls?.[0] || product.imageUrl || defaultImage);
  const sellerName = product.seller?.shopName || product.shopName || "Soni Electronics Shahdol";
  const sellerAddress = product.seller?.shopAddress || product.shopAddress || "Address not provided";
  const sellerPhone =
    product.contactNumber ||
    (product as any)?.seller?.contactNumber ||
    (product as any)?.seller?.mobile ||
    (product as any)?.seller?.phone ||
    product.sellerPhone ||
    "";
  const sellerMaps = product.seller?.mapsLink;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header with Back Button */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/">
            <Button
              variant="ghost"
              className="text-slate-600 hover:text-orange-600"
            >
              <ArrowLeft size={18} className="mr-2" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image */}
          <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-lg">
            <div className="aspect-square relative bg-slate-50">
              {!imageError && primaryImage ? (
                <img
                  src={primaryImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <img
                  src={defaultImage}
                  alt={product.name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            {/* Category Badge */}
            <div>
              <span className="inline-block px-4 py-1.5 bg-orange-100 text-orange-700 rounded-full text-xs font-bold uppercase tracking-wider">
                {product.category}
              </span>
            </div>

            {/* Product Name */}
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 leading-tight">
              {product.name}
            </h1>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <Star key={idx} size={16} className="text-orange-500 fill-orange-500" />
                ))}
              </div>
              <span className="font-bold text-orange-600">{rating.toFixed(1)}</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-black text-orange-600">
                ₹{priceNum.toLocaleString()}
              </span>
              <span className="text-lg line-through text-slate-400">
                ₹{originalPrice.toLocaleString()}
              </span>
              {discountPercent > 0 && (
                <span className="text-sm font-black text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full">
                  {discountPercent}% OFF
                </span>
              )}
            </div>
            {sameDay && (
              <div className="flex items-center gap-2 text-sm font-bold text-green-600">
                <ShieldCheck size={16} className="text-green-500" />
                Same Day Delivery in Shahdol
              </div>
            )}

            {/* Description */}
            {product.description && (
              <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-lg font-bold text-slate-900 mb-3">
                  Product Description
                </h2>
                <p className="text-slate-700 leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Add to Cart Button */}
            <Button
              onClick={handleAddToCart}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white py-6 text-lg font-black rounded-xl shadow-lg hover:shadow-xl transition-all"
              size="lg"
            >
              <ShoppingCart size={20} className="mr-2" />
              Add to Cart
            </Button>

            {/* Buy Now Button */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => setIsCheckoutOpen(true)}
                  className="w-full bg-black hover:bg-orange-700 text-white py-4 text-lg font-black rounded-xl shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                >
                  Buy Now
                </Button>
              </DialogTrigger>
            <DialogContent className="bg-white rounded-3xl max-w-[420px] w-[95%] max-h-[85vh] overflow-y-auto p-6 space-y-4">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-slate-900">Order Details</DialogTitle>
                  <DialogDescription className="sr-only">Checkout</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleBuyNow} className="space-y-3 max-h-[85vh] overflow-y-auto pr-1">
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Full Name"
                    required
                    value={customerData.name}
                    onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                  />
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Mobile Number"
                    type="tel"
                    maxLength={10}
                    required
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                  />
                  <input
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                    placeholder="Full Address"
                    required
                    value={customerData.address}
                    onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                  />

                  <div className="space-y-2">
                    <p className="text-sm font-bold text-slate-800">Payment Method</p>
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <input type="radio" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} />
                        Cash on Delivery
                      </label>
                      <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                        <input type="radio" checked={paymentMethod === "upi"} onChange={() => setPaymentMethod("upi")} />
                        Pay via UPI QR
                      </label>
                    </div>
                    {paymentMethod === "upi" && (
                      <div className="rounded-xl border bg-orange-50 border-orange-200 p-3 space-y-3">
                        <p className="text-sm font-bold text-orange-800">Scan & Pay (UPI)</p>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`upi://pay?pa=lav@upi&pn=ShahdolBazaar&am=${product.price}&cu=INR`)}`}
                      alt="UPI QR"
                      className="w-48 h-48 rounded-lg border mx-auto object-contain"
                    />
                        <p className="text-xs text-slate-600 text-center">
                          Pay to: lav@upi • Amount: ₹{product.price}
                        </p>
                    <div className="space-y-2">
                      <Button
                        type="button"
                        className="w-full bg-orange-600"
                        onClick={() => setUpiStatus("Payment verification in progress. Your order will be confirmed shortly.")}
                      >
                        I have paid
                      </Button>
                      {upiStatus && (
                        <div className="text-xs font-bold text-orange-700 text-center">{upiStatus}</div>
                      )}
                    </div>
                      </div>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-orange-600 h-12 text-lg font-bold"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Confirm Order"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>

            {/* WhatsApp Order Button */}
            <button
              onClick={() => {
                const shopNumber = (sellerPhone || "").replace(/\D/g, "");
                if (!shopNumber) {
                  toast.warning("Seller WhatsApp number missing");
                  return;
                }
                const waNumber = shopNumber || (localStorage.getItem("waNumber") || "910000000000").replace(/\+/g, "");
                const shopLine = sellerName ? `दुकान: ${sellerName}\n` : "";
                const message = `नमस्ते! मुझे यह खरीदना है:\n${product.name}\nकीमत: ₹${product.price}\n${shopLine}लिंक: ${window.location.origin}/product/${product.id}`;
                const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
                window.open(url, "_blank");
              }}
              className="w-full mt-3 border-2 border-green-500 text-green-600 hover:bg-green-50 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              disabled={!sellerPhone}
            >
              <Phone size={18} />
              {sellerPhone ? "WhatsApp पर आर्डर करें" : "WhatsApp नंबर नहीं मिला"}
            </button>

            {/* Sticky mobile order bar */}
            <div className="fixed md:hidden bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-200 shadow-2xl p-4 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-lg font-black text-orange-600">₹{priceNum.toLocaleString()}</span>
                <span className="text-xs text-slate-500">Same Day Delivery</span>
              </div>
                <Button
                  className="bg-green-500 hover:bg-green-600 text-white font-black px-4 py-3 rounded-xl shadow"
                  onClick={() => {
                    const shopNumber = (sellerPhone || "").replace(/\D/g, "");
                    if (!shopNumber) {
                      toast.warning("Seller WhatsApp number missing");
                      return;
                    }
                    const waNumber = shopNumber || (localStorage.getItem("waNumber") || "910000000000").replace(/\+/g, "");
                    const shopLine = sellerName ? `दुकान: ${sellerName}\n` : "";
                    const message = `नमस्ते! मुझे यह खरीदना है:\n${product.name}\nकीमत: ₹${product.price}\n${shopLine}लिंक: ${window.location.origin}/product/${product.id}`;
                    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;
                    window.open(url, "_blank");
                  }}
                  disabled={!sellerPhone}
                >
                  Order via WhatsApp
                </Button>
            </div>

            {/* Seller Information */}
            {product && product.seller && (
              <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <Store size={18} className="text-slate-500" />
                  <h3 className="text-lg font-bold text-slate-900">{sellerName}</h3>
                  <span className="flex items-center gap-1 text-xs font-black text-blue-600">
                    <ShieldCheck size={14} className="text-blue-500" /> Verified Local Seller
                  </span>
                </div>
                <div className="flex items-start gap-2 text-sm text-slate-700">
                  <MapPin size={16} className="text-slate-400 mt-0.5" />
                  <span>{sellerAddress}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <span className="font-bold text-slate-800">Category:</span>
                  <span>{product.category}</span>
                </div>
                {(sellerAddress || sellerMaps) && (
                  <Button
                    variant="outline"
                    className="w-fit border-orange-200 text-orange-600 hover:bg-orange-50"
                    onClick={() => {
                      const url = sellerMaps
                        ? sellerMaps
                        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                            sellerAddress || ""
                          )}`;
                      window.open(url, "_blank");
                    }}
                  >
                    View on Google Maps
                  </Button>
                )}
              </div>
            )}

            {/* Reviews */}
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">Reviews</h3>
                <Button
                  onClick={() => setReviewDialogOpen(true)}
                  className="bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-black"
                >
                  Write a Review
                </Button>
              </div>
              {reviewsLoading ? (
                <p className="text-sm text-slate-500">Loading reviews...</p>
              ) : !reviews || reviews.length === 0 ? (
                <p className="text-sm text-slate-500">No reviews yet.</p>
              ) : (
                <div className="space-y-2">
                  {reviews.map((r: any) => (
                    <div key={r.id} className="bg-white border rounded-xl p-3 shadow-sm">
                      <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
                        <span>{r.customerName || "Customer"}</span>
                        <span className="text-orange-600">{"★".repeat(r.rating || 0)}</span>
                      </div>
                      <p className="text-sm text-slate-700 mt-1">{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Seller Information */}
            <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Store size={18} className="text-slate-500" />
                <h3 className="text-lg font-bold text-slate-900">
                  {product.seller?.shopName || product.shopName || "Soni Electronics Shahdol"}
                </h3>
                <span className="flex items-center gap-1 text-xs font-black text-blue-600">
                  <ShieldCheck size={14} className="text-blue-500" /> Verified Local Seller
                </span>
              </div>
              <div className="flex items-start gap-2 text-sm text-slate-700">
                <MapPin size={16} className="text-slate-400 mt-0.5" />
                <span>{product.seller?.shopAddress || product.shopAddress || "Address not provided"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span className="font-bold text-slate-800">Category:</span>
                <span>{product.category}</span>
              </div>
              {(product.seller?.shopAddress || product.shopAddress || sellerMaps) && (
                <Button
                  variant="outline"
                  className="w-fit border-orange-200 text-orange-600 hover:bg-orange-50"
                  onClick={() => {
                    const url = sellerMaps
                      ? sellerMaps
                      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          product.seller?.shopAddress || product.shopAddress || ""
                        )}`;
                    window.open(url, "_blank");
                  }}
                >
                  View on Google Maps
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="bg-white rounded-2xl max-w-[420px] w-[95%] p-6 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">Write a Review</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Share your experience. Your review will appear once approved.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!productId) return;
              addReviewMutation.mutate({ rating: reviewRating, comment: reviewComment });
              setReviewDialogOpen(false);
              setReviewComment("");
              setReviewRating(5);
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={`p-2 rounded-lg border ${
                      reviewRating >= star ? "bg-orange-100 border-orange-300 text-orange-700" : "border-slate-200"
                    }`}
                    onClick={() => setReviewRating(star)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-800">Comment</label>
              <Textarea
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="How was the product?"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-orange-600 text-white"
              disabled={addReviewMutation.isLoading}
            >
              {addReviewMutation.isLoading ? "Submitting..." : "Submit Review"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

