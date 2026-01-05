import { useState, useMemo } from "react";
import { useCart } from "@/contexts/CartContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Minus, Plus, Trash2, ShoppingBag, MessageCircle, User, Phone, MapPin } from "lucide-react";
import { useQueries } from "@tanstack/react-query";

interface CartProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Fetch shop details for phone number
const API_BASE = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function fetchShop(shopId: number) {
  const url = `${API_BASE || ""}/api/shops/${shopId}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json();
}

export function Cart({ open, onOpenChange }: CartProps) {
  // ALL HOOKS AT THE TOP - NO CONDITIONAL HOOKS
  const {
    items,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalPrice,
  } = useCart();

  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");

  // Group items by shop - using useMemo to ensure stable reference
  const itemsByShop = useMemo(() => {
    return items.reduce((acc, item) => {
      if (!acc[item.shopId]) {
        acc[item.shopId] = [];
      }
      acc[item.shopId].push(item);
      return acc;
    }, {} as Record<number, typeof items>);
  }, [items]);

  // Get unique shop IDs - using useMemo
  const shopIds = useMemo(() => {
    return Object.keys(itemsByShop).map(Number);
  }, [itemsByShop]);

  // Use useQueries for dynamic queries - this is the correct way to handle multiple dynamic queries
  const shopQueries = useQueries({
    queries: shopIds.map((shopId) => ({
      queryKey: ["shop", shopId],
      queryFn: () => fetchShop(shopId),
      enabled: open && !!shopId,
    })),
  });

  const totalPrice = getTotalPrice();

  const handleProceedToCheckout = () => {
    if (items.length === 0) return;
    setShowCheckoutForm(true);
  };

  const handleWhatsAppCheckout = () => {
    if (items.length === 0) return;

    // Validate form
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      alert("Please fill in all fields before placing your order.");
      return;
    }

    // Group items by shop for separate orders
    const ordersByShop = Object.entries(itemsByShop).map(([shopId, shopItems]) => {
      const shopIndex = shopIds.indexOf(Number(shopId));
      const shopQuery = shopIndex >= 0 ? shopQueries[shopIndex] : null;
      const shop = shopQuery?.data;
      const phone = shop?.mobile || shop?.phone || "919753239303"; // Fallback to support number
      const shopName = shop?.name || "Shop";

      const orderItems = shopItems.map(
        (item) => `• ${item.name} - ₹${parseFloat(item.price).toLocaleString()} x ${item.quantity}`
      );
      const shopTotal = shopItems.reduce(
        (sum, item) => sum + parseFloat(item.price) * item.quantity,
        0
      );

      const message = `🛒 *Order from Shahdol Bazaar*

*Customer Details:*
👤 Name: ${customerName}
📱 Phone: ${customerPhone}
📍 Delivery Address: ${deliveryAddress}

*Shop:* ${shopName}

*Items:*
${orderItems.join("\n")}

*Total: ₹${shopTotal.toLocaleString()}*

Please confirm this order. Thank you!`;

      return { phone, message };
    });

    // If all items are from one shop, send single message
    if (ordersByShop.length === 1) {
      const { phone, message } = ordersByShop[0];
      const cleanPhone = phone.replace(/\D/g, "");
      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, "_blank");
    } else {
      // Multiple shops - send to each shop separately
      ordersByShop.forEach(({ phone, message }) => {
        const cleanPhone = phone.replace(/\D/g, "");
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        setTimeout(() => window.open(whatsappUrl, "_blank"), 100);
      });
    }

    // Clear cart and form after checkout
    clearCart();
    setCustomerName("");
    setCustomerPhone("");
    setDeliveryAddress("");
    setShowCheckoutForm(false);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ShoppingBag size={24} className="text-orange-600" />
            Shopping Cart
          </SheetTitle>
          <SheetDescription>
            {items.length === 0
              ? "Your cart is empty"
              : `${items.length} item${items.length > 1 ? "s" : ""} in your cart`}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingBag size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">Your cart is empty</p>
              <p className="text-slate-400 text-sm mt-2">
                Add some products to get started!
              </p>
            </div>
          ) : (
            <>
              {/* Items grouped by shop */}
              {Object.entries(itemsByShop).map(([shopId, shopItems]) => {
                const shopIndex = shopIds.indexOf(Number(shopId));
                const shopQuery = shopIndex >= 0 ? shopQueries[shopIndex] : null;
                const shop = shopQuery?.data;
                const shopName = shop?.name || "Shop";

                return (
                  <div key={shopId} className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        {shopName}
                      </span>
                    </div>

                    {shopItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        {item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-20 h-20 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-slate-900 mb-1 line-clamp-2">
                            {item.name}
                          </h3>
                          <p className="text-lg font-black text-orange-600 mb-3">
                            ₹{parseFloat(item.price).toLocaleString()}
                          </p>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 border border-slate-200 rounded-lg">
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity - 1)
                                }
                                className="p-1.5 hover:bg-slate-200 transition-colors"
                              >
                                <Minus size={16} />
                              </button>
                              <span className="px-3 py-1 font-bold text-slate-900 min-w-[2rem] text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() =>
                                  updateQuantity(item.id, item.quantity + 1)
                                }
                                className="p-1.5 hover:bg-slate-200 transition-colors"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-slate-900">
                            ₹
                            {(
                              parseFloat(item.price) * item.quantity
                            ).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Checkout Form */}
              {showCheckoutForm ? (
                <div className="sticky bottom-0 bg-white border-t border-slate-200 pt-4 mt-6 space-y-4">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="customerName" className="flex items-center gap-2 mb-2">
                        <User size={16} className="text-slate-500" />
                        Full Name
                      </Label>
                      <Input
                        id="customerName"
                        type="text"
                        placeholder="Enter your full name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerPhone" className="flex items-center gap-2 mb-2">
                        <Phone size={16} className="text-slate-500" />
                        Phone Number
                      </Label>
                      <Input
                        id="customerPhone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="deliveryAddress" className="flex items-center gap-2 mb-2">
                        <MapPin size={16} className="text-slate-500" />
                        Delivery Address
                      </Label>
                      <Textarea
                        id="deliveryAddress"
                        placeholder="Enter your complete delivery address"
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full min-h-[80px]"
                        required
                      />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="text-lg font-bold text-slate-700">Total:</span>
                    <span className="text-2xl font-black text-orange-600">
                      ₹{totalPrice.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowCheckoutForm(false)}
                      variant="outline"
                      className="flex-1"
                    >
                      Back
                    </Button>
                    <Button
                      onClick={handleWhatsAppCheckout}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white py-6 text-lg font-bold shadow-lg"
                      size="lg"
                    >
                      <MessageCircle className="mr-2 h-5 w-5" />
                      Place Order
                    </Button>
                  </div>
                </div>
              ) : (
                /* Total and Checkout Button */
                <div className="sticky bottom-0 bg-white border-t border-slate-200 pt-4 mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-bold text-slate-700">Total:</span>
                    <span className="text-2xl font-black text-orange-600">
                      ₹{totalPrice.toLocaleString()}
                    </span>
                  </div>
                  <Button
                    onClick={handleProceedToCheckout}
                    className="w-full bg-green-500 hover:bg-green-600 text-white py-6 text-lg font-bold shadow-lg"
                    size="lg"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    Proceed to Checkout
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

