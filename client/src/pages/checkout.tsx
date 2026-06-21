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
    name: "",
    phone: "",
    address: ""
  });

  const [profile, setProfile] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | number>("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({ fullName: "", phone: "" });
  const [profileUpdating, setProfileUpdating] = useState(false);

  // New Address Form State
  const [newAddressForm, setNewAddressForm] = useState({
    streetAddress: "",
    houseNumber: "",
    landmark: "",
    village: "",
    ward: "",
    city: "",
    districtName: "",
    state: "",
    postalCode: "",
    isDefault: false,
    saveForFuture: true
  });

  const loadProfileAndAddresses = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setProfileLoading(true);
      const profRes = await apiRequest("GET", "/customer/profile");
      const profileData = profRes?.data ?? profRes;
      setProfile(profileData);
      if (profileData) {
        setProfileForm({
          fullName: profileData.fullName || "",
          phone: profileData.phone || ""
        });
        setCustomerData(prev => ({
          ...prev,
          name: profileData.fullName || "",
          phone: profileData.phone || ""
        }));
      }
    } catch (e) {
      console.error("Failed to load customer profile", e);
    } finally {
      setProfileLoading(false);
    }

    try {
      setAddressesLoading(true);
      const addrRes = await apiRequest("GET", "/customer/addresses");
      const addressesData = addrRes?.data ?? addrRes ?? [];
      setAddresses(addressesData);

      // Select default address if it exists
      const defaultAddr = addressesData.find((a: any) => a.isDefault);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        setCustomerData(prev => ({
          ...prev,
          address: defaultAddr.streetAddress
        }));
      } else if (addressesData.length > 0) {
        setSelectedAddressId(addressesData[0].id);
        setCustomerData(prev => ({
          ...prev,
          address: addressesData[0].streetAddress
        }));
      } else {
        setSelectedAddressId("new");
      }
    } catch (e) {
      console.error("Failed to load customer addresses", e);
    } finally {
      setAddressesLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authInitialized && isAuthenticated) {
      loadProfileAndAddresses();
    }
  }, [authInitialized, isAuthenticated, loadProfileAndAddresses]);

  const handleAddressSelect = (id: string | number) => {
    setSelectedAddressId(id);
    if (id === "new") {
      setCustomerData(prev => ({ ...prev, address: newAddressForm.streetAddress }));
    } else {
      const addr = addresses.find(a => a.id === id);
      if (addr) {
        setCustomerData(prev => ({ ...prev, address: addr.streetAddress }));
      }
    }
  };

  const handleNewAddressChange = (field: string, value: any) => {
    setNewAddressForm(prev => {
      const updated = { ...prev, [field]: value };
      if (selectedAddressId === "new" && field === "streetAddress") {
        setCustomerData(c => ({ ...c, address: value }));
      }
      return updated;
    });
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.fullName || !profileForm.phone) {
      toast({
        title: "त्रुटि",
        description: "कृपया सभी फ़ील्ड भरें।",
        variant: "destructive",
      });
      return;
    }

    try {
      setProfileUpdating(true);
      const res = await apiRequest("PATCH", "/customer/profile", profileForm);
      const updatedProfile = res?.data ?? res;
      setProfile(updatedProfile);
      setCustomerData(prev => ({
        ...prev,
        name: updatedProfile.fullName,
        phone: updatedProfile.phone
      }));
      toast({
        title: "प्रोफ़ाइल अपडेट की गई",
        description: "आपकी प्रोफ़ाइल सफलतापूर्वक सहेज ली गई है।",
      });
      loadProfileAndAddresses();
    } catch (err: any) {
      console.error("Failed to update profile", err);
      toast({
        title: "त्रुटि",
        description: err.message || "प्रोफ़ाइल अपडेट करने में विफल।",
        variant: "destructive",
      });
    } finally {
      setProfileUpdating(false);
    }
  };

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

      // Prepare snapshot
      let deliveryAddressSnapshotObj: any = null;

      if (selectedAddressId === "new") {
        if (!newAddressForm.streetAddress) {
          throw new Error("कृपया अपना पूरा पता दर्ज करें।");
        }
        deliveryAddressSnapshotObj = {
          streetAddress: newAddressForm.streetAddress,
          houseNumber: newAddressForm.houseNumber || null,
          landmark: newAddressForm.landmark || null,
          village: newAddressForm.village || null,
          ward: newAddressForm.ward || null,
          city: newAddressForm.city || null,
          districtName: newAddressForm.districtName || null,
          state: newAddressForm.state || null,
          postalCode: newAddressForm.postalCode || null
        };

        if (newAddressForm.saveForFuture) {
          try {
            await apiRequest("POST", "/customer/addresses", {
              ...newAddressForm,
              type: "DELIVERY"
            });
          } catch (e) {
            console.error("Failed to auto-save address", e);
          }
        }
      } else {
        const selectedAddr = addresses.find(a => a.id === selectedAddressId);
        if (selectedAddr) {
          deliveryAddressSnapshotObj = {
            streetAddress: selectedAddr.streetAddress,
            houseNumber: selectedAddr.houseNumber || null,
            landmark: selectedAddr.landmark || null,
            village: selectedAddr.village || null,
            ward: selectedAddr.ward || null,
            city: selectedAddr.city || null,
            districtName: selectedAddr.districtName || null,
            state: selectedAddr.state || null,
            postalCode: selectedAddr.postalCode || null
          };
        }
      }

      const response = await apiRequest("POST", "/orders", {
        items: orders,
        customerName: customerData.name,
        customerPhone: customerData.phone,
        customerAddress: customerData.address,
        paymentMethod,
        districtId: currentDistrict?.id,
        deliveryAddressSnapshot: deliveryAddressSnapshotObj
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
  }, [districtReady, currentDistrict, customerData, displayItems, paymentMethod, clearCart, setLocation, toast, authInitialized, selectedAddressId, newAddressForm, addresses]);

  /**
   * SOVEREIGN: Checkout content — only rendered when ALL guards pass
   * RadioGroup MUST wrap RadioGroupItem for structural integrity
   */
  const renderCheckoutContent = () => {
    if (profileLoading || addressesLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
          <Loader2 className="animate-spin text-[#FFB800]" size={40} />
        </div>
      );
    }

    const profileComplete = profile && profile.fullName && profile.phone;
    return (
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
            {!profileComplete ? (
              <Card className="bg-slate-900 border-[#FFB800] border-2 text-white">
                <CardHeader>
                  <CardTitle className="text-[#FFB800] flex items-center gap-2">
                    प्रोफ़ाइल पूरा करें / Complete Profile
                  </CardTitle>
                  <p className="text-xs text-slate-400">ऑर्डर देने से पहले कृपया अपनी प्रोफ़ाइल जानकारी पूरी करें।</p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateProfile} className="space-y-4">
                    <div className="space-y-2">
                      <Label>पूरा नाम / Full Name</Label>
                      <Input
                        placeholder="पूरा नाम दर्ज करें"
                        value={profileForm.fullName}
                        onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                        className="bg-slate-950 border-slate-700"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>मोबाइल नंबर / WhatsApp Phone</Label>
                      <Input
                        placeholder="उदा. 9876543210"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="bg-slate-950 border-slate-700"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={profileUpdating}
                      className="w-full bg-[#FFB800] hover:bg-[#e5a600] text-black font-bold flex items-center justify-center gap-2"
                    >
                      {profileUpdating && <Loader2 className="animate-spin h-4 w-4" />}
                      प्रोफ़ाइल सहेजें और आगे बढ़ें
                    </Button>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-slate-900 border-slate-800 text-white">
                <CardHeader>
                  <CardTitle className="text-[#FFB800] flex items-center gap-2">
                    <Truck className="h-5 w-5" /> डिलीवरी विवरण
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">नाम</Label>
                      <Input
                        disabled
                        value={customerData.name}
                        className="bg-slate-950/60 border-slate-800 text-slate-400 cursor-not-allowed text-xs h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-slate-400">फ़ोन नंबर</Label>
                      <Input
                        disabled
                        value={customerData.phone}
                        className="bg-slate-950/60 border-slate-800 text-slate-400 cursor-not-allowed text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <Label className="text-sm font-bold">डिलीवरी पता चुनें / Select Delivery Address</Label>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {addresses.map((addr) => (
                        <div
                          key={addr.id}
                          onClick={() => handleAddressSelect(addr.id)}
                          className={`p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                            selectedAddressId === addr.id
                              ? "border-[#FFB800] bg-[#FFB800]/10"
                              : "border-slate-800 bg-slate-950 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between font-bold text-xs">
                            <span>{addr.type} ADDRESS</span>
                            {addr.isDefault && (
                              <span className="text-[10px] bg-green-900/40 text-green-400 px-2 py-0.5 rounded border border-green-700/30">Default</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-1">{addr.streetAddress}</div>
                        </div>
                      ))}
                      <div
                        onClick={() => handleAddressSelect("new")}
                        className={`p-3 rounded-lg border text-sm cursor-pointer transition-all ${
                          selectedAddressId === "new"
                            ? "border-[#FFB800] bg-[#FFB800]/10"
                            : "border-slate-800 bg-slate-950 hover:border-slate-700"
                        }`}
                      >
                        <div className="font-bold text-[#FFB800] text-xs">+ नया पता जोड़ें / Add New Address</div>
                      </div>
                    </div>
                  </div>

                  {selectedAddressId === "new" && (
                    <div className="space-y-3 pt-3 border-t border-slate-800">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-400">गली का पता / Full Street Address *</Label>
                        <Textarea
                          placeholder="मकान नंबर, गली, मोहल्ला, ज़िला"
                          value={newAddressForm.streetAddress}
                          onChange={(e) => handleNewAddressChange("streetAddress", e.target.value)}
                          className="bg-slate-955 border-slate-700 h-16 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-400">मकान नंबर (optional)</Label>
                          <Input
                            placeholder="उदा. 42B"
                            value={newAddressForm.houseNumber}
                            onChange={(e) => handleNewAddressChange("houseNumber", e.target.value)}
                            className="bg-slate-955 border-slate-700 text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-400">सीमाचिह्न / Landmark (optional)</Label>
                          <Input
                            placeholder="उदा. मंदिर के पास"
                            value={newAddressForm.landmark}
                            onChange={(e) => handleNewAddressChange("landmark", e.target.value)}
                            className="bg-slate-955 border-slate-700 text-xs h-8"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-400">गाँव/मोहल्ला</Label>
                          <Input
                            placeholder="गाँव"
                            value={newAddressForm.village}
                            onChange={(e) => handleNewAddressChange("village", e.target.value)}
                            className="bg-slate-955 border-slate-700 text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-400">वार्ड संख्या</Label>
                          <Input
                            placeholder="वार्ड"
                            value={newAddressForm.ward}
                            onChange={(e) => handleNewAddressChange("ward", e.target.value)}
                            className="bg-slate-955 border-slate-700 text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-400">शहर</Label>
                          <Input
                            placeholder="शहर"
                            value={newAddressForm.city}
                            onChange={(e) => handleNewAddressChange("city", e.target.value)}
                            className="bg-slate-955 border-slate-700 text-xs h-8"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-400">जिला</Label>
                          <Input
                            placeholder="जिला"
                            value={newAddressForm.districtName}
                            onChange={(e) => handleNewAddressChange("districtName", e.target.value)}
                            className="bg-slate-955 border-slate-700 text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-400">राज्य</Label>
                          <Input
                            placeholder="राज्य"
                            value={newAddressForm.state}
                            onChange={(e) => handleNewAddressChange("state", e.target.value)}
                            className="bg-slate-955 border-slate-700 text-xs h-8"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-slate-400">पिन कोड</Label>
                          <Input
                            placeholder="पिन कोड"
                            value={newAddressForm.postalCode}
                            onChange={(e) => handleNewAddressChange("postalCode", e.target.value)}
                            className="bg-slate-955 border-slate-700 text-xs h-8"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <input
                          type="checkbox"
                          id="saveForFuture"
                          checked={newAddressForm.saveForFuture}
                          onChange={(e) => handleNewAddressChange("saveForFuture", e.target.checked)}
                          className="accent-[#FFB800]"
                        />
                        <Label htmlFor="saveForFuture" className="text-xs cursor-pointer">भविष्य के लिए यह पता सहेजें / Save address</Label>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

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
                  disabled={checkoutState === "submitting" || isLoadingProduct || displayItems.length === 0 || !profileComplete}
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
  };

  // SOVEREIGN: Gate all rendering through CheckoutSovereignGate
  return (
    <CheckoutSovereignGate>
      {renderCheckoutContent()}
    </CheckoutSovereignGate>
  );
}
