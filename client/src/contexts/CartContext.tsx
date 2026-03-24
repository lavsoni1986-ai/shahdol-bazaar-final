import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { normalizeSellerId } from "../../../shared/seller-utils";

export interface CartItem {
  id: string | number;
  productId: number;
  name: string;
  price: string;
  quantity: number;
  imageUrl?: string;
  shopId: number;
  vendorId?: number; // Optional vendorId as alternative to shopId
  shopName?: string;
  shopPhone?: string;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: string | number) => void;
  updateQuantity: (id: string | number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    // Load from localStorage on mount
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("cart");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  // Save to localStorage whenever items change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("cart", JSON.stringify(items));
    }
  }, [items]);

  const addToCart = useCallback((item: Omit<CartItem, "quantity">) => {
    // Normalize seller ID to prevent NaN issues
    const normalizedShopId = normalizeSellerId({ shopId: item.shopId, vendorId: item.vendorId });
    
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        // If item exists, increase quantity
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      // Add new item with quantity 1
      const newItem = { ...item, shopId: normalizedShopId ?? item.shopId, quantity: 1 };
      toast.success(`"${item.name}" added to cart`);
      return [...prev, newItem];
    });
  }, []);

  const removeFromCart = useCallback((id: string | number) => {
    // Find the item to show its name in toast
    const item = items.find(i => i.id === id);
    const itemName = item?.name || 'Item';
    
    setItems((prev) => {
      const filtered = prev.filter((item) => item.id !== id);
      if (filtered.length < prev.length) {
        // Item was removed
        toast.info(`"${itemName}" removed from cart`);
      }
      return filtered;
    });
  }, [items]);

  const updateQuantity = useCallback((id: string | number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity } : item))
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotalItems = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const getTotalPrice = useCallback(() => {
    return items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      return sum + price * item.quantity;
    }, 0);
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalItems,
      getTotalPrice,
    }),
    [items, addToCart, removeFromCart, updateQuantity, clearCart, getTotalItems, getTotalPrice]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

