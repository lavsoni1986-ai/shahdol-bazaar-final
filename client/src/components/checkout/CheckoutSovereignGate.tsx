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
import { Loader2, ShoppingBag, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckoutSovereignGateProps {
    /** The actual checkout content — only rendered when ALL guards pass */
    children: ReactNode;
    /** Optional custom loading skeleton */
    skeleton?: ReactNode;
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

export function CheckoutSovereignGate({ children, skeleton }: CheckoutSovereignGateProps) {
    const gate = useCheckoutReady();

    // SOVEREIGN: Render skeleton while loading
    if (gate.loading) {
        return skeleton || <CheckoutSkeleton />;
    }

    // SOVEREIGN: If auth not ready, show loading state (edge case)
    if (!gate.authReady) {
        return skeleton || <CheckoutSkeleton />;
    }

    // SOVEREIGN: If checkout is not ready, show skeleton with recovery banner
    if (!gate.checkoutReady) {
        return (
            <>
                {gate.errors.length > 0 && <CheckoutRecoveryBanner gate={gate} />}
                {skeleton || <CheckoutSkeleton />}
            </>
        );
    }

    // SOVEREIGN: All guards passed — render children
    return <>{children}</>;
}

export { CheckoutSkeleton };
