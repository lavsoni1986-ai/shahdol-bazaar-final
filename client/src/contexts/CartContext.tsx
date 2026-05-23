import { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "./AuthContext";

export interface CartItem {
  id: string | number;
  productId: number;
  name: string;
  price: number; // UI cache only. Backend recalculates authoritative pricing.
  quantity: number;
  imageUrl?: string;
  vendorId: number; // Canonical merchant identifier
}

export interface CartSanitizationResult {
  removedCount: number;
  removedItems: CartItem[];
  sanitizedItems: CartItem[];
  reason: string;
}

interface CartContextType {
  items: CartItem[];
  /** SOVEREIGN: true after cart has been hydrated and sanitized from localStorage */
  cartHydrated: boolean;
  /** SOVEREIGN: Items removed during sanitization (for recovery UX) */
  sanitizedItems: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: string | number) => void;
  updateQuantity: (id: string | number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * SOVEREIGN CART SANITIZATION
 *
 * On hydration, validates all cart items and removes:
 * - Items with missing/invalid vendorId
 * - Items with missing/invalid productId
 * - Items with quantity <= 0
 * - Items with invalid price (NaN, negative)
 * - Items with malformed IDs
 *
 * Also maps old shop fields to vendor fields.
 */
function sanitizeCartItems(items: any[]): { sanitized: CartItem[]; removed: CartItem[] } {
  const sanitized: CartItem[] = [];
  const removed: CartItem[] = [];
  const seen = new Set<string | number>();

  for (const item of items) {
    // Normalize: migrate old shop fields to vendor fields
    const normalized = {
      ...item,
      vendorId: item.vendorId || item.shopId || undefined,
      productId: item.productId || item.id || undefined,
    };

    // CHECK 1: Must have a valid ID
    const itemId = normalized.id;
    if (itemId === undefined || itemId === null || itemId === "") {
      removed.push(normalized);
      continue;
    }

    // CHECK 2: Must have a valid vendorId
    const vendorId = Number(normalized.vendorId);
    if (!normalized.vendorId || isNaN(vendorId) || vendorId <= 0) {
      removed.push(normalized);
      continue;
    }

    // CHECK 3: Must have a valid productId
    const productId = Number(normalized.productId);
    if (!productId || isNaN(productId) || productId <= 0) {
      removed.push(normalized);
      continue;
    }

    // CHECK 4: Must have a valid quantity
    const quantity = Number(normalized.quantity) || 1;
    if (quantity <= 0) {
      removed.push(normalized);
      continue;
    }

    // CHECK 5: Must have a valid price
    const price = parseFloat(String(normalized.price)) || 0;
    if (price < 0) {
      removed.push(normalized);
      continue;
    }

    // CHECK 6: Must have a name
    const name = String(normalized.name || normalized.title || "").trim();
    if (!name) {
      removed.push(normalized);
      continue;
    }

    // CHECK 7: Deduplicate by id
    if (seen.has(itemId)) continue;
    seen.add(itemId);

    // Passed all checks
    sanitized.push({
      id: itemId,
      productId: productId,
      name: name,
      price: price,
      quantity: quantity,
      imageUrl: normalized.imageUrl || undefined,
      vendorId: vendorId,
    });
  }

  return { sanitized, removed };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // ✅ SOVEREIGN PRIVACY: Cart locked to UserID + District
  const getCartKey = () => {
    if (!user) return 'guest_cart';
    const districtSlug = localStorage.getItem('districtSlug') || 'shahdol';
    return `cart_${user.id}_${districtSlug}`;
  };

  const [cartHydrated, setCartHydrated] = useState(false);
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(getCartKey());
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          const result = sanitizeCartItems(parsed);
          if (result.removed.length > 0) {
            console.warn(`🧹 [CART SANITIZATION] Removed ${result.removed.length} invalid items:`, result.removed);
          }
          return result.sanitized;
        } catch {
          return [];
        }
      }
    }
    return [];
  });

  const [sanitizedItems, setSanitizedItems] = useState<CartItem[]>([]);

  // Save to localStorage whenever items change
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(getCartKey(), JSON.stringify(items));
    }
  }, [items]);

  // Refresh cart when user changes (login/logout) — with sanitization
  useEffect(() => {
    const saved = localStorage.getItem(getCartKey());
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const result = sanitizeCartItems(parsed);
        if (result.removed.length > 0) {
          console.warn(`🧹 [CART SANITIZATION] Removed ${result.removed.length} invalid items on user change:`, result.removed);
          setSanitizedItems((prev) => [...prev, ...result.removed]);
        }
        setItems(result.sanitized);
      } catch {
        setItems([]);
      }
    } else {
      setItems([]);
    }
    // SOVEREIGN: Mark cart as hydrated after initial load
    setCartHydrated(true);
  }, [user?.id]);

  // SOVEREIGN: Ensure cartHydrated is true after initial render even if no user change
  useEffect(() => {
    if (!cartHydrated) {
      setCartHydrated(true);
    }
  }, []);

  // SOVEREIGN: Clear sanitized items on cart clear
  useEffect(() => {
    if (items.length === 0 && sanitizedItems.length > 0) {
      // Don't auto-clear sanitized items so recovery UX persists
    }
  }, [items, sanitizedItems]);

  const addToCart = useCallback((item: Omit<CartItem, "quantity">) => {
    // Vendor ID is canonical — add directly
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id || i.productId === item.productId);
      if (existing) {
        return prev.map((i) =>
          (i.id === item.id || i.productId === item.productId) ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      const newItem = { ...item, quantity: 1 };
      toast.success(`"${item.name}" added to cart`);
      return [...prev, newItem];
    });
  }, []);

  const removeFromCart = useCallback((id: string | number) => {
    setItems((prev) => {
      const itemToRemove = prev.find(i => i.id === id);
      const itemName = itemToRemove?.name || 'Item';
      const filtered = prev.filter((item) => item.id !== id);
      if (filtered.length < prev.length) {
        toast.info(`"${itemName}" removed from cart`);
      }
      return filtered;
    });
  }, []);

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
    setSanitizedItems([]);
  }, []);

  const getTotalItems = useCallback(() => {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }, [items]);

  const getTotalPrice = useCallback(() => {
    return items.reduce((sum, item) => {
      const price = parseFloat(String(item.price)) || 0;
      return sum + price * item.quantity;
    }, 0);
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      cartHydrated,
      sanitizedItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalItems,
      getTotalPrice,
    }),
    [items, cartHydrated, sanitizedItems, addToCart, removeFromCart, updateQuantity, clearCart, getTotalItems, getTotalPrice]
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
