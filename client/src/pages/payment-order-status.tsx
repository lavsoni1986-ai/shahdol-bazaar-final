// 🛡️ BHARAT-OS: SOVEREIGN PAYMENT STATUS PAGE
// Governed flow — no fake simulations. Real API verification only.
//
// ARCHITECTURE:
//   - Receives orderId from URL params
//   - Queries real order status from API
//   - Shows success / failed / processing based on REAL backend state
//   - NEVER simulates success with setTimeout
//
// FUTURE:
//   - Integrate with canonical order-engine API
//   - Add retry logic for failed payments
//   - Add SMS/WhatsApp confirmation trigger via sovereign notification layer

import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, CheckCircle, XCircle, Package } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/api-client";

interface PaymentOrderStatus {
    id: string;
    status: "pending" | "processing" | "confirmed" | "cancelled" | "failed";
    total: number;
    items: number;
    createdAt: string;
}

async function fetchOrderStatus(orderId: string): Promise<PaymentOrderStatus> {
    const res = await apiRequest("GET", `/api/orders/${orderId}/status`);
    return (res as any)?.data ?? res;
}

export default function PaymentOrderStatus() {
    const [match, params] = useRoute("/payment/status/:orderId");
    const orderId = match ? (params as Record<string, string>)?.orderId : undefined;

    const { data: order, isLoading, isError, error } = useQuery({
        queryKey: ["order-status", orderId],
        queryFn: () => fetchOrderStatus(orderId!),
        enabled: !!orderId,
        retry: 2,
        refetchInterval: (query) =>
            query.state.data?.status === "pending" || query.state.data?.status === "processing"
                ? 3000
                : false,
    });

    // No orderId in URL
    if (!orderId) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <Package className="w-16 h-16 text-zinc-600 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">No Order Reference</h1>
                    <p className="text-zinc-400 mb-6">No order ID was provided. Please check your order history.</p>
                    <Link href="/my-orders">
                        <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl">
                            View My Orders
                        </Button>
                    </Link>
                </div>
            </div>
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="animate-spin text-orange-500 h-12 w-12 mx-auto mb-4" />
                    <p className="text-zinc-400 font-medium">Verifying payment status...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (isError || !order) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Status Unavailable</h1>
                    <p className="text-zinc-400 mb-2">
                        Could not retrieve payment status for order <span className="font-mono text-zinc-300">{orderId}</span>.
                    </p>
                    <p className="text-zinc-500 text-sm mb-6">
                        {(error as any)?.message || "The order may not exist or the server is unavailable."}
                    </p>
                    <div className="flex gap-3 justify-center">
                        <Link href="/my-orders">
                            <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl">
                                My Orders
                            </Button>
                        </Link>
                        <Link href="/marketplace">
                            <Button variant="outline" className="border-white/10 text-zinc-300 hover:text-white px-6 py-2.5 rounded-xl">
                                Continue Shopping
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Success state
    if (order.status === "confirmed") {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-4" />
                    <h1 className="text-3xl font-black text-white mb-2">Payment Successful!</h1>
                    <p className="text-zinc-400 mb-2">Thank you for your order.</p>

                    <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-5 mb-6 space-y-3">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Order ID</span>
                            <span className="font-mono font-semibold text-zinc-200">{order.id}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Total</span>
                            <span className="font-bold text-white">₹{order.total.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Items</span>
                            <span className="font-semibold text-zinc-200">{order.items}</span>
                        </div>
                    </div>

                    <p className="text-sm text-zinc-500 mb-6">
                        A confirmation has been sent to your registered phone number and WhatsApp.
                    </p>

                    <div className="flex gap-3 justify-center">
                        <Link href="/my-orders">
                            <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl">
                                View Orders
                            </Button>
                        </Link>
                        <Link href="/marketplace">
                            <Button variant="outline" className="border-white/10 text-zinc-300 hover:text-white px-6 py-2.5 rounded-xl">
                                Continue Shopping
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Failed state
    if (order.status === "failed" || order.status === "cancelled") {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
                <div className="text-center max-w-md">
                    <XCircle className="w-20 h-20 text-red-500 mx-auto mb-4" />
                    <h1 className="text-3xl font-black text-white mb-2">Payment Failed</h1>
                    <p className="text-zinc-400 mb-6">
                        There was an issue processing your payment. Please try again or contact the store.
                    </p>

                    <div className="bg-white/[0.03] rounded-2xl border border-white/5 p-5 mb-6">
                        <div className="flex justify-between text-sm">
                            <span className="text-zinc-500">Order ID</span>
                            <span className="font-mono font-semibold text-zinc-200">{order.id}</span>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-center">
                        <Link href="/checkout">
                            <Button className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-xl">
                                Try Again
                            </Button>
                        </Link>
                        <Link href="/marketplace">
                            <Button variant="outline" className="border-white/10 text-zinc-300 hover:text-white px-6 py-2.5 rounded-xl">
                                Continue Shopping
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Processing / pending state
    return (
        <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6">
            <div className="text-center max-w-md">
                <Loader2 className="animate-spin text-orange-500 h-16 w-16 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Payment Processing</h1>
                <p className="text-zinc-400 mb-2">
                    Your payment for order <span className="font-mono text-zinc-300">{order.id}</span> is being processed.
                </p>
                <p className="text-sm text-zinc-500 mb-6">
                    This page will automatically update when the payment status changes.
                    Do not close this page.
                </p>
                <Link href="/my-orders">
                    <Button variant="outline" className="border-white/10 text-zinc-300 hover:text-white px-6 py-2.5 rounded-xl">
                        Check My Orders
                    </Button>
                </Link>
            </div>
        </div>
    );
}
