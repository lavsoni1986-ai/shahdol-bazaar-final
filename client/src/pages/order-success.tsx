import React, { useEffect, useState } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Home, Package, Banknote, ShieldCheck, Crown, Sparkles, PartyPopper } from "lucide-react";

const orange = "#f97316";
const deepBlack = "#030303";
const lavGold = "#FFB800";

export default function OrderSuccess() {
  const [, params] = useRoute("/order-success");
  const [, setLocation] = useLocation();
  const routeParams = params as { orderId?: string } | null;
  const searchParams = new URLSearchParams(window.location.search);
  const orderId = routeParams?.orderId || searchParams.get("orderId") || searchParams.get("id");
  const paymentMethod = new URLSearchParams(window.location.search).get("paymentMethod");
  const isCOD = paymentMethod === "cod";
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    // Trigger celebration animation
    setTimeout(() => setShowCelebration(true), 300);
    
    // Fetch order details if orderId is available
    if (orderId) {
      setOrderDetails({ id: orderId });
    }
  }, [orderId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* 🎉 Sovereign Celebration Effects */}
      {showCelebration && (
        <>
          {/* Golden Particles */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-float"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 2}s`
                }}
              >
                <Sparkles className="w-4 h-4" style={{ color: lavGold, opacity: 0.6 }} />
              </div>
            ))}
          </div>
          
          {/* Crown Icons */}
          <div className="absolute top-20 left-10 animate-bounce-slow">
            <Crown className="w-12 h-12" style={{ color: lavGold, opacity: 0.4 }} />
          </div>
          <div className="absolute top-32 right-16 animate-bounce-slow" style={{ animationDelay: '0.5s' }}>
            <ShieldCheck className="w-10 h-10" style={{ color: lavGold, opacity: 0.3 }} />
          </div>
        </>
      )}

      {/* Main Card */}
      <Card 
        className={`
          max-w-lg w-full relative z-10 
          bg-gradient-to-br from-slate-800 to-slate-900 
          border-2 border-amber-500/30 shadow-2xl shadow-amber-500/10
          transform transition-all duration-700
          ${showCelebration ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        {/* Sovereign Header */}
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 rounded-t-lg h-24" />
          <div className="relative pt-8 pb-4 px-6 text-center">
            {/* 🎯 Crown Badge */}
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/30 transform animate-pulse">
              <Crown className="w-10 h-10 text-white" />
            </div>
            
            <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-300 via-orange-400 to-amber-300 bg-clip-text text-transparent">
              🏆 Sovereign Order Confirmed!
            </h1>
            <p className="text-slate-400 mt-2">Your trust in local partners has been secured</p>
          </div>
        </div>

        <CardContent className="px-8 pb-8 space-y-6">
          {/* DSSL Trust Badge */}
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-amber-400">DSSL Protected Transaction</h3>
              <p className="text-sm text-slate-400">Your order is secured by BharatOS Trust Layer</p>
            </div>
          </div>

          {/* Order Details */}
          <div className="bg-slate-800/50 rounded-xl p-4 space-y-3 border border-slate-700/50">
            {isCOD ? (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Payment Mode</span>
                <span className="flex items-center gap-2 font-bold text-white">
                  <Banknote className="w-5 h-5" style={{ color: lavGold }} />
                  Cash on Delivery
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Payment Status</span>
                <span className="flex items-center gap-2 font-bold text-green-400">
                  <CheckCircle2 className="w-5 h-5" /> Paid
                </span>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Order ID</span>
              <span className="font-mono text-amber-400 font-bold">#{orderId || 'N/A'}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Status</span>
              <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                ✅ Order Placed
              </span>
            </div>
          </div>

          {/* Success Message */}
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-amber-400 mb-2">
              <Sparkles className="w-5 h-5" />
              <span className="font-medium">Your First Step Towards Digital India</span>
            </div>
            <p className="text-slate-400 text-sm">
              You've successfully placed an order with a verified local partner. 
              Support your community, empower local businesses! 🇮🇳
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Link href="/my-orders">
              <Button 
                className="w-full h-12 text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 border-0"
              >
                <Package className="mr-2 w-5 h-5" /> 
                Track Your Order
              </Button>
            </Link>
            
            <Link href="/">
              <Button 
                variant="outline"
                className="w-full h-12 text-lg border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Home className="mr-2 w-5 h-5" /> 
                Continue Shopping
              </Button>
            </Link>
          </div>

          {/* Footer Trust Note */}
          <div className="text-center pt-4 border-t border-slate-700/50">
            <p className="text-xs text-slate-500">
              🔒 Secured by <span className="text-amber-400 font-medium">BharatOS DSSL</span> • 
              Verified Local Partners
            </p>
          </div>
        </CardContent>
      </Card>

      {/* CSS Animation */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.6; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.3; }
        }
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
