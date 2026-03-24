import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBranding } from "@/contexts/BrandingContext";
import { normalizeSellerId } from "../../../shared/seller-utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
  Wallet
} from "lucide-react";
import { CartItem } from "@/contexts/CartContext";

export default function CheckoutPage() {
  const [, setLocation] = useLocation();
  const { items: cart, clearCart, getTotalPrice } = useCart();
  const total = getTotalPrice();
  const { user, isAuthenticated } = useAuth();
  const { district } = useBranding();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"online" | "cod">("online");
  
  // Customer Data State
  const [customerData, setCustomerData] = useState({
    name: user?.username || "",
    phone: "",
    address: ""
  });

  // Empty cart guard
  useEffect(() => {
    if (cart.length === 0) {
      setLocation("/");
    }
  }, [cart, setLocation]);

  const handlePlaceOrder = async () => {
    if (!customerData.phone || !customerData.address) {
      toast({
        title: "विवरण अधूरा है",
        description: "कृपया अपना फोन नंबर और पता दर्ज करें।",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Debug: Log cart items to see what's available
      console.log("🛒 Cart Items Debug:", JSON.stringify(cart, (key, value) => {
        if (key === 'price') return value; // Keep price for debugging
        return value;
      }, 2));

      // Step 1: Validate and Normalize Cart Items
      const orders = cart.map((item: CartItem, index: number) => {
        // Debug each item
        console.log(`Item ${index + 1}:`, {
          id: item.id,
          productId: item.productId,
          name: item.name,
          price: item.price,
          shopId: item.shopId,
          vendorId: item.vendorId
        });
        
        // Get productId - use productId if available, fallback to item.id
        // Ensure we always have a valid number
        let productIdValue = item.productId;
        if (!productIdValue || isNaN(Number(productIdValue))) {
          // Try to parse from item.id
          productIdValue = typeof item.id === 'number' ? item.id : parseInt(String(item.id), 10);
        }
        const productId = Number(productIdValue);
        
        // Get seller/vendor ID - normalizeSellerId prefers vendorId over shopId
        const sellerId = normalizeSellerId({ shopId: item.shopId, vendorId: item.vendorId });
        
        // Debug validation
        console.log(`Item ${index + 1} validated:`, { productId, sellerId, price: item.price });
        
        // Validate required fields
        if (!productId || isNaN(productId)) {
          console.error("❌ Invalid productId for item:", item);
          throw new Error(`Invalid product: ${item.name || 'Unknown product'}`);
        }
        
        if (!sellerId) {
          console.error("❌ Invalid sellerId for item:", item);
          throw new Error(`Invalid shop for item: ${item.name || 'Unknown product'}`);
        }
        
        // Get price - ensure it's a valid number
        const price = Number(item.price);
        if (isNaN(price) || price <= 0) {
          console.error("❌ Invalid price for item:", item);
          throw new Error(`Invalid price for: ${item.name || 'Unknown product'}`);
        }
        
        const orderData = {
          productId: productId,
          vendorId: sellerId,
          quantity: item.quantity || 1,
          totalPrice: String(price * (item.quantity || 1)),
          customerName: customerData.name,
          customerPhone: customerData.phone,
          customerAddress: customerData.address,
          districtId: district?.id || 3, // Default to Shahdol
          paymentMethod: paymentMethod,
          status: "pending"
        };
        
        console.log(`✅ Order ${index + 1} data:`, orderData);
        return orderData;
      });

      // Add debug logging
      console.log('✅ Final Order Data:', JSON.stringify(orders, null, 2));

      // Step 2: Create Order in Backend
      const response = await apiRequest("POST", "/api/orders", {
        items: orders,
        paymentMethod,
        districtSlug: district?.slug || "shahdol"
      });
      
      const result = await response.json();

      if (paymentMethod === "cod") {
        // COD Flow: Direct success
        clearCart();
        toast({
          title: "ऑर्डर सफल!",
          description: "आपका COD ऑर्डर स्वीकार कर लिया गया है।",
        });
        setLocation(`/order-success?id=${result.orderId || result.id}`);
      } else {
        // Online Flow: Redirect to Payment Gateway
        if (result.paymentLink) {
          window.location.href = result.paymentLink;
        } else {
          throw new Error("Payment link not generated");
        }
      }
    } catch (error: any) {
      console.error("Order Error:", error);
      toast({
        title: "त्रुटि",
        description: error.message || "ऑर्डर प्लेस करने में विफल।",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

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
                    onChange={(e) => setCustomerData({...customerData, name: e.target.value})}
                    className="bg-slate-950 border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>फोन नंबर</Label>
                  <Input 
                    placeholder="WhatsApp नंबर" 
                    value={customerData.phone}
                    onChange={(e) => setCustomerData({...customerData, phone: e.target.value})}
                    className="bg-slate-950 border-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <Label>पूरा पता</Label>
                  <Textarea 
                    placeholder="मकान नंबर, गली, मोहल्ला, ज़िला" 
                    value={customerData.address}
                    onChange={(e) => setCustomerData({...customerData, address: e.target.value})}
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
                <RadioGroup 
                  value={paymentMethod} 
                  onValueChange={(v: any) => setPaymentMethod(v)}
                  className="space-y-3"
                >
                  <div className={`flex items-center space-x-3 p-4 rounded-lg border transition-all ${paymentMethod === 'online' ? 'border-[#FFB800] bg-orange-600/10' : 'border-slate-800 bg-slate-950'}`}>
                    <RadioGroupItem value="online" id="online" className="border-[#FFB800]" />
                    <Label htmlFor="online" className="flex-1 cursor-pointer">
                      <div className="font-bold">ऑनलाइन भुगतान (UPI/Card)</div>
                      <div className="text-xs text-slate-400">Cashfree के माध्यम से सुरक्षित</div>
                    </Label>
                    <CreditCard className="h-5 w-5 text-orange-500" />
                  </div>

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
                <CardTitle>ऑर्डर सारांश</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {cart.map((item: CartItem) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-slate-400">{item.name} x {item.quantity}</span>
                    <span className="font-medium">₹{(Number(item.price) * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
                
                <div className="border-t border-slate-800 pt-4 mt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>कुल राशि</span>
                    <span className="text-[#FFB800]">₹{total.toLocaleString()}</span>
                  </div>
                </div>

                <Button 
                  onClick={handlePlaceOrder}
                  disabled={loading}
                  className={`w-full h-12 text-lg font-bold transition-all ${
                    paymentMethod === 'cod' 
                    ? 'bg-[#FFB800] hover:bg-[#e5a600] text-black' 
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                  }`}
                >
                  {loading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    paymentMethod === 'cod' ? "Place COD Order" : `Pay ₹${total.toLocaleString()}`
                  )}
                </Button>
                
                <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 mt-4">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  100% सुरक्षित भुगतान | BharatOS Verified
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
