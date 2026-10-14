/**
 * SOVEREIGN CHECKOUT RENDER GATE
 *
 * Prevents checkout page from rendering until ALL required contracts are stable.
 * Renders appropriate skeleton/loading/recovery states instead of crashing.
 *
 * Contracts gated:
 * - Auth initialized (not loading)
 * - Cart hydrated (sanitized from localStorage)
 * - District validated (loaded with valid id)
 * - Items present (at least one checkout item)
 *
 * If any guard fails → renders CheckoutSkeleton
 * If recoverable errors exist → renders recovery banner + skeleton
 */

import { ReactNode } from "react";
import { useCheckoutReady, CheckoutGateState } from "@/hooks/useCheckoutReady";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";
import { Loader2, ShoppingBag, AlertTriangle, RefreshCw, LogIn, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckoutSovereignGateProps {
    /** The actual checkout content — only rendered when ALL guards pass */
    children: ReactNode;
    /** Optional custom loading skeleton */
    skeleton?: ReactNode;
    /** Optional items from Buy Now or custom source */
    customItems?: Array<any>;
    /** Optional flag indicating Buy Now mode */
    isBuyNow?: boolean;
    /** Optional flag indicating Buy Now product fetch in flight */
    isLoadingProduct?: boolean;
    /** Optional error message if Buy Now product fetch failed */
    productError?: string | null;
}

/**
 * Skeleton shown during checkout initialization
 * Mobile-first, preserves layout stability
 */
function CheckoutSkeleton() {
    return (
        <div className="min-h-screen bg-[#030303] text-white pb-20">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Back button skeleton */}
                <div className="h-10 w-32 bg-slate-800 rounded-lg animate-pulse mb-8" />

                {/* Title skeleton */}
                <div className="h-10 w-64 bg-slate-800 rounded-lg animate-pulse mb-8 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-700" />
                    <div className="h-6 w-48 bg-slate-700 rounded" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Left column skeleton */}
                    <div className="space-y-6">
                        {/* Delivery details skeleton */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                            <div className="h-6 w-40 bg-slate-800 rounded animate-pulse" />
                            <div className="h-12 bg-slate-800 rounded-lg animate-pulse" />
                            <div className="h-12 bg-slate-800 rounded-lg animate-pulse" />
                            <div className="h-24 bg-slate-800 rounded-lg animate-pulse" />
                        </div>

                        {/* Payment method skeleton */}
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                            <div className="h-6 w-44 bg-slate-800 rounded animate-pulse" />
                            <div className="h-16 bg-slate-800 rounded-lg animate-pulse" />
                        </div>
                    </div>

                    {/* Right column skeleton */}
                    <div className="space-y-6">
                        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 sticky top-24">
                            <div className="h-6 w-32 bg-slate-800 rounded animate-pulse" />
                            <div className="h-6 bg-slate-800 rounded animate-pulse" />
                            <div className="h-6 bg-slate-800 rounded animate-pulse" />
                            <div className="h-12 bg-slate-800 rounded-lg animate-pulse" />
                        </div>
                    </div>
                </div>

                {/* Loading indicator */}
                <div className="fixed bottom-8 right-8 flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm border border-slate-800 rounded-full px-4 py-2 text-sm text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin text-[#FFB800]" />
                    Initializing checkout...
                </div>
            </div>
        </div>
    );
}

/**
 * AuthRequiredGate — shown when an unauthenticated guest reaches checkout.
 * Replaces the infinite skeleton with a clear login prompt and recovery actions.
 */
function AuthRequiredGate() {
    const [, setLocation] = useLocation();
    return (
        <div className="min-h-screen bg-[#030303] flex items-center justify-center px-4">
            <div className="text-center space-y-5 max-w-sm w-full">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-600/15 border border-orange-500/20 mb-2">
                    <ShoppingBag className="h-8 w-8 text-orange-500" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white mb-2">Login Required</h2>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        Please login to continue your checkout.
                    </p>
                </div>
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => setLocation("/auth?return=/checkout")}
                        className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:opacity-90 text-white font-bold gap-2"
                    >
                        <LogIn className="h-4 w-4" />
                        Login
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setLocation("/cart")}
                        className="w-full border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Return to Cart
                    </Button>
                </div>
            </div>
        </div>
    );
}

/**
 * Recovery banner shown when some cart items were removed or vendors unavailable
 */
function CheckoutRecoveryBanner({ gate }: { gate: CheckoutGateState }) {
    const messages: string[] = [];

    if (gate.errors.includes("no_items")) {
        messages.push("Some items in your cart are no longer available and have been removed.");
    }

    if (messages.length === 0) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
            <div className="bg-amber-900/90 border border-amber-700/50 backdrop-blur-sm rounded-xl p-4 text-amber-200 shadow-2xl">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-2">
                        {messages.map((msg, i) => (
                            <p key={i} className="text-sm">{msg}</p>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.location.reload()}
                            className="border-amber-600 text-amber-200 hover:bg-amber-800 gap-2"
                        >
                            <RefreshCw className="h-3 w-3" />
                            Refresh & try again
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * EmptyCartGate — shown when an authenticated or guest user reaches checkout with an empty cart.
 * Replaces the infinite skeleton with a clear recovery message and return to cart/shop action.
 */
function EmptyCartGate() {
    const [, setLocation] = useLocation();
    return (
        <div className="min-h-screen bg-[#030303] flex items-center justify-center px-4">
            <div className="text-center space-y-5 max-w-sm w-full">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/20 mb-2">
                    <ShoppingBag className="h-8 w-8 text-[#FFB800]" />
                </div>
                <div>
                    <h2 className="text-xl font-black text-white mb-2">आपकी कार्ट खाली है</h2>
                    <p className="text-sm text-slate-400 leading-relaxed">
                        चेकआउट करने के लिए कृपया पहले कार्ट में सामान जोड़ें।
                    </p>
                </div>
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={() => setLocation("/cart")}
                        className="w-full bg-[#FFB800] hover:bg-[#e5a600] text-black font-bold gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        कार्ट पर जाएं / View Cart
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setLocation("/")}
                        className="w-full border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 gap-2"
                    >
                        मार्केटप्लेस देखें / Browse Shop
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function CheckoutSovereignGate({
    children,
    skeleton,
    customItems,
    isBuyNow,
    isLoadingProduct,
    productError,
}: CheckoutSovereignGateProps) {
    const gate = useCheckoutReady({ customItems, isBuyNow });
    const { authState, initialized } = useAuth();
    const [, setLocation] = useLocation();

    // 1. Buy Now product fetch in progress → show loading skeleton
    if (isLoadingProduct) {
        return skeleton || <CheckoutSkeleton />;
    }

    // 2. Buy Now product fetch failed → show clean error state with action
    if (productError) {
        return (
            <div className="min-h-screen bg-[#030303] flex items-center justify-center px-4">
                <div className="text-center space-y-5 max-w-sm w-full">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-500/15 border border-red-500/20 mb-2">
                        <AlertTriangle className="h-8 w-8 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-white mb-2">उत्पाद उपलब्ध नहीं है</h2>
                        <p className="text-sm text-slate-400 leading-relaxed">
                            {productError}
                        </p>
                    </div>
                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={() => setLocation("/")}
                            className="w-full bg-[#FFB800] hover:bg-[#e5a600] text-black font-bold gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            मार्केटप्लेस पर लौटें / Back to Shop
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setLocation("/cart")}
                            className="w-full border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 gap-2"
                        >
                            <ShoppingBag className="h-4 w-4" />
                            मेरी कार्ट देखें / View Cart
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    // 3. Render skeleton while gate/auth/cart are loading
    if (gate.loading) {
        return skeleton || <CheckoutSkeleton />;
    }

    // 4. Guest user reached checkout → show login prompt
    if (initialized && authState === "guest") {
        return <AuthRequiredGate />;
    }

    // 5. Auth initializing
    if (!gate.authReady) {
        return skeleton || <CheckoutSkeleton />;
    }

    // 6. Genuinely empty cart (and not a buy-now flow) → show EmptyCartGate instead of infinite skeleton
    if (!gate.hasItems && !isBuyNow) {
        return <EmptyCartGate />;
    }

    // 7. If checkout is not ready due to specific recovery errors (e.g. removed vendor/product)
    if (!gate.checkoutReady) {
        return (
            <>
                {gate.errors.length > 0 && <CheckoutRecoveryBanner gate={gate} />}
                {skeleton || <CheckoutSkeleton />}
            </>
        );
    }

    // 8. All guards passed — render children
    return <>{children}</>;
}

export { CheckoutSkeleton };
