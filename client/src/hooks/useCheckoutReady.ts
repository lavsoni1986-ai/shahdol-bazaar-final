/**
 * SOVEREIGN CHECKOUT READINESS HOOK
 * 
 * Determines if the checkout page has all required contracts stabilized.
 * Uses centralized validation engine for single-source-of-truth.
 * Prevents rendering of payment controls until EVERY dependency is ready.
 * 
 * Guards:
 * - auth: initialized and not loading
 * - cart: hydrated and sanitized
 * - district: loaded and valid
 * - vendors: validated for all cart items
 * - products: validated for all cart items
 * 
 * Returns:
 * - ready: boolean — all guards passed
 * - state: CheckoutGateState — detailed readiness breakdown
 * - loading: boolean — any guard still loading
 * - errors: string[] — specific failure reasons for recovery UX
 */

import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDistrict } from "@/contexts/DistrictContext";
import { useCart } from "@/contexts/CartContext";
import { validateCheckoutState } from "@/checkout/validation";

export interface CheckoutGateState {
    authReady: boolean;
    cartReady: boolean;
    districtReady: boolean;
    checkoutReady: boolean;
    loading: boolean;
    hasItems: boolean;
    errors: string[];
}

export function useCheckoutReady(): CheckoutGateState {
    const { initialized, loading: authLoading, authState } = useAuth();
    const { currentDistrict, isReady: districtReady } = useDistrict();
    const { items, cartHydrated } = useCart();

    return useMemo(() => {
        // SOVEREIGN: Use centralized validation engine
        const report = validateCheckoutState({
            authInitialized: initialized,
            authLoading,
            authState,
            cartHydrated,
            cartItems: items.map((item) => ({
                id: String(item.id || item.productId || ""),
                productId: item.productId || Number(item.id) || null,
                vendorId: item.vendorId || null,
                quantity: item.quantity || 1,
                price: Number(item.price) || 0,
                name: item.name || "",
            })),
            districtReady,
            districtId: currentDistrict?.id || null,
            districtSlug: currentDistrict?.slug || null,
        });

        const errors: string[] = report.errors.map((e) => e.reason);

        // SOVEREIGN: Auth must be initialized AND not in loading state
        const authReady = initialized && !authLoading && authState !== "loading";
        if (!authReady) {
            errors.push("auth");
        }

        // SOVEREIGN: Cart must be hydrated (sanitized)
        const cartReady = cartHydrated;
        if (!cartReady) {
            errors.push("cart");
        }

        // SOVEREIGN: District must be ready with valid id
        const districtValid = districtReady && !!currentDistrict?.id;
        if (!districtValid) {
            errors.push("district");
        }

        // SOVEREIGN: Must have items to check out
        const hasItems = items.length > 0;
        if (!hasItems) {
            errors.push("no_items");
        }

        // SOVEREIGN: All guards must pass — use validation report OR local checks
        const checkoutReady = report.overall && authReady && cartReady && districtValid && hasItems;
        const loading = authLoading || !initialized || !cartHydrated;

        return {
            authReady,
            cartReady,
            districtReady: districtValid,
            checkoutReady,
            loading,
            hasItems,
            errors: [...new Set(errors)], // Deduplicate
        };
    }, [
        initialized,
        authLoading,
        authState,
        currentDistrict,
        districtReady,
        items,
        cartHydrated,
    ]);
}
