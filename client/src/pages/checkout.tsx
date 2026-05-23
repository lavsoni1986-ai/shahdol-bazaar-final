import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  ShoppingBag,
  Truck,
  CreditCard,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Wallet,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { CartItem } from "@/contexts/CartContext";
import { SOVEREIGN_CONFIG } from "@/lib/SovereignConstants";
import { useDistrict } from "@/contexts/DistrictContext";
import { CheckoutSovereignGate } from "@/components/checkout/CheckoutSovereignGate";
import { useCheckoutReady } from "@/hooks/useCheckoutReady";

/**
 * CheckoutState
 * SOVEREIGN: Explicit state machine — NOT scattered booleans.
 */
type CheckoutState =
  | "initializing"
  | "ready"
  | "submitting"
  | "recovery"
  | "completed";

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { items: cart, clearCart, getTotalPrice, cartHydrated, sanitizedItems } = useCart();
  const total = getTotalPrice();
  const { user, isAuthenticated, initialized: authInitialized, loading: authLoading } = useAuth();
  const { currentDistrict, isReady: districtReady } = useDistrict();
  const { toast } = useToast();

  // SOVEREIGN: Render gating — all guards checked by CheckoutSovereignGate
  const checkoutGate = useCheckoutReady();

  // SOVEREIGN: State machine — single source of truth for checkout lifecycle
  const [checkoutState, setCheckoutState] = useState<CheckoutState>("initializing");
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("cod");
  const [buyNowProduct, setBuyNowProduct] = useState<any>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(false);

  // SOVEREIGN: AbortController for stale async prevention
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, []);

  // SOVEREIGN: State machine transition on gate change
  useEffect(() => {
    if (checkoutState === "submitting" || checkoutState === "completed") return;

    if (checkoutGate.checkoutReady) {
      setCheckoutState("ready");
    } else if (checkoutGate.loading || !checkoutGate.authReady) {
      setCheckoutState("initializing");
    } else if (checkoutGate.errors.length > 0 && !checkoutGate.loading) {
      setCheckoutState("recovery");
    }
  }, [checkoutGate.checkoutReady, checkoutGate.loading, checkoutGate.authReady, checkoutGate.errors.length, checkoutState]);

  // URL product for Buy Now flow
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const productIdFromUrl = searchParams.get('productId');

  useEffect(() => {
    if (productIdFromUrl) {
      abortRef.current = new AbortController();
      fetchProductDetails(productIdFromUrl);
    }
    return () => {
      abortRef.current?.abort();
    };
  }, [productIdFromUrl]);

  const fetchProductDetails = async (productId: string) => {
    setIsLoadingProduct(true);
    try {
      const response = await apiRequest("GET", `marketplace/products/${productId}`);
      if (!mountedRef.current) return;
      const product = (response as any)?.data ?? response;
      setBuyNowProduct(product);
    } catch (error) {
      if (!mountedRef.current) return;
      console.error("Failed to fetch product:", error);
    } finally {
      if (mountedRef.current) setIsLoadingProduct(false);
    }
  };

  const displayItems = buyNowProduct
    ? [{
      id: buyNowProduct.id,
      productId: buyNowProduct.id,
      name: buyNowProduct.title || buyNowProduct.name,
      price: parseFloat(buyNowProduct.price) || 0,
      quantity: 1,
      vendorId: buyNowProduct.vendorId,
      imageUrl: buyNowProduct.imageUrl
    }]
    : cart;

  const displayTotal = buyNowProduct
    ? parseFloat(buyNowProduct.price) || 0
    : total;

  // Customer Data State
  const [customerData, setCustomerData] = useState({
    name: user?.username || "",
    phone: "",
    address: ""
  });

  // Sync auth name when ready
  useEffect(() => {
    if (user?.username && authInitialized) {
      setCustomerData((prev) => ({
        ...prev,
        name: prev.name || user.username || "",
      }));
    }
  }, [user?.username, authInitialized]);

  // Empty cart guard (only redirect if no buy now product)
  useEffect(() => {
    if (!productIdFromUrl && displayItems.length === 0 && checkoutGate.checkoutReady) {
      setLocation("/");
    }
  }, [displayItems, setLocation, productIdFromUrl, checkoutGate.checkoutReady]);

  const handlePlaceOrder = useCallback(async () => {
    // SOVEREIGN: Double-check guards before submission
    if (!districtReady || !currentDistrict?.id) {
      toast({
        title: "त्रुटि",
        description: "जिला लोड नहीं हुआ है। कृपया पुनः प्रयास करें।",
        variant: "destructive",
      });
      return;
    }

    if (!customerData.phone || !customerData.address) {
      toast({
        title: "विवरण अधूरा है",
        description: "कृपया अपना फोन नंबर और पता दर्ज करें।",
        variant: "destructive",
      });
      return;
    }

    if (!authInitialized) {
      toast({
        title: "सत्र प्रारंभ नहीं हुआ",
        description: "कृपया पृष्ठ को ताज़ा करें या पुनः लॉगिन करें।",
        variant: "destructive",
      });
      return;
    }

    setCheckoutState("submitting");

    // SOVEREIGN: Fresh AbortController per submission
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      // Validate and Normalize Cart Items
      const orders = displayItems.map((item: CartItem, index: number) => {
        let productIdValue = item.productId;
        if (!productIdValue || isNaN(Number(productIdValue))) {
          productIdValue = typeof item.id === 'number' ? item.id : parseInt(String(item.id), 10);
        }
        const productId = Number(productIdValue);
        const vendorId = item.vendorId;

        if (!productId || isNaN(productId)) {
          throw new Error(`Invalid product: ${item.name || 'Unknown product'}`);
        }
        if (!vendorId) {
          throw new Error(`Invalid vendor for item: ${item.name || 'Unknown product'}`);
        }
        const price = Number(item.price);
        if (isNaN(price) || price <= 0) {
          throw new Error(`Invalid price for: ${item.name || 'Unknown product'}`);
        }

        return {
          productId: productId,
          quantity: item.quantity || 1,
          vendorId: vendorId,
          price: price,
        };
      });

      const response = await apiRequest("POST", "/orders", {
        items: orders,
        customerName: customerData.name,
        customerPhone: customerData.phone,
        customerAddress: customerData.address,
        paymentMethod,
        districtId: currentDistrict?.id,
      });

      if (!mountedRef.current || controller.signal.aborted) return;

      const result = response?.data ?? response;
      const orderId = Array.isArray(result) ? result?.[0]?.id : result?.id;

      if (paymentMethod === "cod") {
        clearCart();
        setCheckoutState("completed");
        toast({
          title: "ऑर्डर सफल!",
          description: "आपका COD ऑर्डर स्वीकार कर लिया गया है।",
        });
        setLocation(`/order-success?id=${orderId}`);
      } else {
        if (result.paymentLink) {
          window.location.href = result.paymentLink;
        } else {
          throw new Error("Payment link not generated");
        }
      }
    } catch (error: any) {
      if (!mountedRef.current || controller.signal.aborted) return;
      console.error("Order Error:", error);
      toast({
        title: "त्रुटि",
        description: error.message || "ऑर्डर प्लेस करने में विफल।",
        variant: "destructive",
      });
      setCheckoutState("ready");
    } finally {
      abortRef.current = null;
    }
  }, [districtReady, currentDistrict, customerData, displayItems, paymentMethod, clearCart, setLocation, toast, authInitialized]);

  /**
   * SOVEREIGN: Checkout content — only rendered when ALL guards pass
   * RadioGroup MUST wrap RadioGroupItem for structural integrity
   */
  const renderCheckoutContent = () => (
    <div className="min-h-screen bg-[#030303] text-white pb-20">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => setLocation("/cart")}
          className="mb-6 text-slate-400 hover:text-[#FFB800]"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> वापस कार्ट में
        </Button>

        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <ShoppingBag className="text-[#FFB800]" /> सुरक्षित चेकआउट
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column: Forms */}
          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader>
                <CardTitle className="text-[#FFB800] flex items-center gap-2">
                  <Truck className="h-5 w-5" /> डिलीवरी विवरण
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>पूरा नाम</Label>
                  <Input
                    placeholder="आपका नाम"
                    value={customerData.name}
                    onChange={(e) => setCustomerData({ ...customerData, name: e.target.value })}
                    className="bg-slate-950 border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>फोन नंबर</Label>
                  <Input
                    placeholder="WhatsApp नंबर"
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({ ...customerData, phone: e.target.value })}
                    className="bg-slate-950 border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>पूरा पता</Label>
                  <Textarea
                    placeholder="मकान नंबर, गली, मोहल्ला, ज़िला"
                    value={customerData.address}
                    onChange={(e) => setCustomerData({ ...customerData, address: e.target.value })}
                    className="bg-slate-950 border-slate-700 h-24"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900 border-slate-800 text-white">
              <CardHeader>
                <CardTitle className="text-[#FFB800] flex items-center gap-2">
                  <CreditCard className="h-5 w-5" /> भुगतान का तरीका
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/**
                 * SOVEREIGN FIX: RadioGroupItem MUST be inside RadioGroup.
                 * RadioGroup is the structural root required by Radix primitives.
                 * The value/onValueChange binding controls the COD selection.
                 */}
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as "online" | "cod")}
                  className="space-y-3"
                >
                  {/* COD-only pilot: Online payment disabled */}
                  <div className={`flex items-center space-x-3 p-4 rounded-lg border transition-all opacity-50 cursor-not-allowed border-slate-700 bg-slate-950`}>
                    <input type="radio" disabled className="accent-slate-600" />
                    <div className="flex-1">
                      <div className="font-bold">ऑनलाइन भुगतान (UPI/Card)</div>
                      <div className="text-xs text-slate-400">⏳ जल्द आ रहा है — अभी केवल COD उपलब्ध</div>
                    </div>
                    <CreditCard className="h-5 w-5 text-slate-500" />
                  </div>

                  {/* ✅ SOVEREIGN: RadioGroupItem is now INSIDE RadioGroup — structural integrity guaranteed */}
                  <div className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${paymentMethod === 'cod' ? 'border-[#FFB800] bg-[#FFB800]/10' : 'border-slate-800 bg-slate-950'}`}>
                    <RadioGroupItem value="cod" id="cod" className="border-[#FFB800]" />
                    <Label htmlFor="cod" className="flex-1 cursor-pointer">
                      <div className="font-bold">कैश ऑन डिलीवरी (COD)</div>
                      <div className="text-xs text-slate-400">सामान मिलने पर भुगतान करें</div>
                    </Label>
                    <Wallet className="h-5 w-5 text-[#FFB800]" />
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Summary */}
          <div className="space-y-6">
            <Card className="bg-slate-900 border-slate-800 text-white sticky top-24">
              <CardHeader>
                <CardTitle>{buyNowProduct ? "Buy Now" : "ऑर्डर सारांश"}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* SOVEREIGN: Sanitized items notification */}
                {sanitizedItems.length > 0 && (
                  <div className="bg-amber-900/30 border border-amber-700/40 rounded-lg p-3 text-xs text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p><strong>{sanitizedItems.length}</strong> item(s) were removed from your cart because they were no longer available or invalid.</p>
                    </div>
                  </div>
                )}

                {isLoadingProduct ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin h-8 w-8 text-[#FFB800]" />
                  </div>
                ) : (
                  <>
                    {displayItems.map((item: CartItem) => (
                      <div key={item.id} className="flex justify-between text-sm">
                        <span className="text-slate-400">{item.name} x {item.quantity}</span>
                        <span className="font-medium">₹{(Number(item.price) * item.quantity).toLocaleString()}</span>
                      </div>
                    ))}

                    <div className="border-t border-slate-800 pt-4 mt-4">
                      <div className="flex justify-between text-lg font-bold">
                        <span>कुल राशि</span>
                        <span className="text-[#FFB800]">₹{displayTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  </>
                )}

                <Button
                  onClick={handlePlaceOrder}
                  disabled={checkoutState === "submitting" || isLoadingProduct || displayItems.length === 0}
                  className={`w-full h-12 text-lg font-bold transition-all ${paymentMethod === 'cod'
                    ? 'bg-[#FFB800] hover:bg-[#e5a600] text-black'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                    }`}
                >
                  {checkoutState === "submitting" ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    paymentMethod === 'cod' ? "Place COD Order" : `Pay ₹${displayTotal.toLocaleString()}`
                  )}
                </Button>

                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 mt-4">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  100% सुरक्षित भुगतान | BharatOS Verified
                </div>
              </CardContent>
            </Card>

            {/* SOVEREIGN: Quick actions for recovery */}
            {sanitizedItems.length > 0 && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.location.reload()}
                  className="border-slate-700 text-slate-400 hover:text-white gap-2"
                >
                  <RefreshCw className="h-3 w-3" />
                  Refresh cart
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // SOVEREIGN: Gate all rendering through CheckoutSovereignGate
  return (
    <CheckoutSovereignGate>
      {renderCheckoutContent()}
    </CheckoutSovereignGate>
  );
}
