import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Check, Sparkles, Zap, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { apiRequest } from "@/lib/api-client";

interface Plan {
  id: string;
  name: string;
  price: number;
  priceId: string;
  description: string;
  features: string[];
  icon: React.ReactNode;
  popular?: boolean;
  color: string;
}

const plans: Plan[] = [
  {
    id: "SILVER",
    name: "Silver",
    price: 299,
    priceId: "SILVER",
    description: "Perfect for growing businesses",
    features: [
      "Basic listing on Shahdol Bazaar",
      "Product uploads (up to 50)",
      "Business profile page",
      "Contact form integration",
      "Basic analytics dashboard",
    ],
    icon: <Sparkles className="w-6 h-6" />,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "GOLD",
    name: "Gold",
    price: 500,
    priceId: "GOLD",
    description: "AI Boost for established businesses",
    popular: true,
    features: [
      "Everything in Silver",
      "AI-Powered concierge",
      "Product uploads (up to 100)",
      "Priority search results",
      "WhatsApp notifications",
      "Advanced analytics",
      "Featured badge",
    ],
    icon: <Zap className="w-6 h-6" />,
    color: "from-orange-500 to-red-500",
  },
  {
    id: "FEATURED",
    name: "Featured",
    price: 2499,
    priceId: "FEATURED",
    description: "WhatsApp Munim + Full AI Suite",
    features: [
      "Everything in Premium",
      "WhatsApp Munim B2B Service",
      "Daily sales summaries",
      "Auto inventory alerts",
      "Top banner placement",
      "Dedicated support",
      "API access",
    ],
    icon: <Crown className="w-6 h-6" />,
    color: "from-purple-500 to-pink-500",
  },
];

export default function PricingPlans() {
  const [location] = useLocation();
  const [loading, setLoading] = useState<string | null>(null);
  
  // Parse URL search params manually for wouter
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const cashfreeStatus = (searchParams.get("cashfree_status") || searchParams.get("order_status") || "").toUpperCase();
  const success = cashfreeStatus === "PAID" || cashfreeStatus === "SUCCESS";
  const canceled = cashfreeStatus === "FAILED" || cashfreeStatus === "CANCELLED" || cashfreeStatus === "USER_DROPPED";
  const currentPlan = searchParams.get("plan");

  const loadCashfreeSdk = () =>
    new Promise<void>((resolve, reject) => {
      if ((window as any).Cashfree) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
      document.body.appendChild(script);
    });

  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Handle payment verification after redirect
  useEffect(() => {
    if (success) {
      const orderId = localStorage.getItem("cashfree_order_id");
      const plan = localStorage.getItem("cashfree_plan");

      if (orderId && plan) {
        // Call verify endpoint
        apiRequest("POST", "payments/verify", { orderId, plan })
          .then(() => {
            // Clear stored data
            localStorage.removeItem("cashfree_order_id");
            localStorage.removeItem("cashfree_plan");
          })
          .catch((error) => {
            console.error("Payment verification failed:", error);
          });
      }
    }
  }, [success]);

  const handleSubscribe = async (plan: Plan) => {
    setLoading(plan.id);
    try {
      // Use httpOnly cookies for authentication - check via isAuthenticated
      if (!isAuthenticated) {
        window.location.href = "/auth?redirect=/pricing";
        return;
      }

      const data = await apiRequest("POST", "payments/create", { plan: plan.priceId });
      if (data.payment_session_id) {
        // Store order details for verification after redirect
        localStorage.setItem("cashfree_order_id", data.order_id);
        localStorage.setItem("cashfree_plan", plan.priceId);

        await loadCashfreeSdk();
        const mode = String(data.cashfree_mode || "sandbox").toLowerCase() === "production"
          ? "production"
          : "sandbox";
        const cashfree = (window as any).Cashfree({ mode });
        await cashfree.checkout({
          paymentSessionId: data.payment_session_id,
          redirectTarget: "_self",
        });
      } else {
        alert(data.message || "Failed to create payment session");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-black mb-4">
            Choose Your <span className="text-orange-500">Plan</span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Scale your business with Shahdol Bazaar. All plans include DSSL verification.
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 mb-8 text-center">
            <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-green-400 mb-2">
              Welcome to {currentPlan} Plan! 🎉
            </h2>
            <p className="text-slate-300">
              Your subscription is now active. Enjoy all the benefits!
            </p>
          </div>
        )}

        {/* Canceled Message */}
        {canceled && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-6 mb-8 text-center">
            <p className="text-yellow-400">
              Payment was canceled. No charges were made. Please try again.
            </p>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-slate-900/50 border border-white/10 rounded-3xl overflow-hidden hover:border-orange-500/50 transition-all ${
                plan.popular ? "ring-2 ring-orange-500/50" : ""
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 py-2 text-center text-xs font-bold uppercase tracking-wider">
                  Most Popular
                </div>
              )}

              <div className={`p-6 ${plan.popular ? "pt-10" : "pt-6"}`}>
                {/* Icon & Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${plan.color}`}>
                    {plan.icon}
                  </div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                </div>

                {/* Price */}
                <div className="mb-4">
                  <span className="text-4xl font-black">₹{plan.price}</span>
                  <span className="text-slate-500">/month</span>
                </div>

                {/* Description */}
                <p className="text-slate-400 text-sm mb-6">{plan.description}</p>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-slate-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Subscribe Button */}
                <Button
                  onClick={() => handleSubscribe(plan)}
                  disabled={loading === plan.id}
                  className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 ${
                    plan.popular
                      ? "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                      : "bg-white/10 hover:bg-white/20 border border-white/20"
                  }`}
                >
                  {loading === plan.id ? (
                    "Processing..."
                  ) : (
                    <>
                      Subscribe Now <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <div className="text-center mt-12 text-slate-500 text-sm">
          <p>All plans include secure payments via Cashfree.</p>
          <p className="mt-2">
            Questions?{" "}
            <Link href="/contact" className="text-orange-500 hover:underline">
              Contact us
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
