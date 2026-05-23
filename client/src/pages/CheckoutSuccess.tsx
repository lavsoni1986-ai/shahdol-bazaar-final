// CheckoutSuccess - Order placed celebration page
// Professional Sovereign animation when order is confirmed

import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useDistrict } from "@/contexts/DistrictContext";
import {
  CheckCircle,
  PartyPopper,
  Sparkles,
  ArrowRight,
  ShoppingBag,
  MapPin,
  Phone,
  Clock,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const { currentDistrict } = useDistrict();
  
  // Get search params using native URLSearchParams
  const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const [showConfetti, setShowConfetti] = useState(true);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderDetails, setOrderDetails] = useState<any>(null);

  useEffect(() => {
    // Get order details from URL params
    const id = searchParams.get('orderId');
    const total = searchParams.get('total');
    const vendor = searchParams.get('vendor');
    
    if (id) setOrderId(id);
    if (total || vendor) {
      setOrderDetails({
        total: total,
        vendor: vendor
      });
    }
    
    // Stop confetti after animation
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, [searchParams]);

  const districtName = currentDistrict?.name || "Shahdol";

  const triggerSovereignCelebration = () => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      // Confetti removed for performance

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance("बधाई हो! आपका ऑर्डर सफलतापूर्वक दर्ज हो गया है।");
      utterance.lang = 'hi-IN';
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  };

  useEffect(() => {
    triggerSovereignCelebration();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                top: '-20px',
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            >
              <span style={{ fontSize: '24px' }}>
                {['🎉', '🎊', '✨', '🌟', '💫', '🎈'][Math.floor(Math.random() * 6)]}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-500/20 rounded-full blur-[150px]" />

      <div className="relative z-10 max-w-lg w-full">
        {/* Success Icon */}
        <div className="text-center mb-8">
          <div className="relative inline-block">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CheckCircle className="w-14 h-14 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 animate-pulse">
              <Sparkles className="w-8 h-8 text-yellow-400" />
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-2">
            Order Placed! 🎉
          </h1>
          <p className="text-xl text-slate-300">
            Thank you for your order in <span className="text-orange-400 font-semibold">{districtName}</span>
          </p>
        </div>

        {/* Order Details Card */}
        <Card className="bg-slate-800/80 border-slate-700 backdrop-blur mb-6">
          <CardContent className="p-6">
            {orderId && (
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700">
                <div>
                  <p className="text-sm text-slate-400">Order ID</p>
                  <p className="text-lg font-bold text-white">#{orderId}</p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-2 text-yellow-400">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">Processing</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-300">
                <ShoppingBag className="w-5 h-5 text-slate-400" />
                <span>Your order has been sent to the vendor</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <MapPin className="w-5 h-5 text-slate-400" />
                <span>You'll receive updates on delivery</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <Phone className="w-5 h-5 text-slate-400" />
                <span>Vendor will contact you for confirmation</span>
              </div>
            </div>

            {orderDetails?.total && (
              <div className="mt-6 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Total Amount</span>
                  <span className="text-2xl font-bold text-orange-400">₹{orderDetails.total}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button 
            onClick={() => setLocation('/my-orders')}
            className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
          >
            <ShoppingBag className="w-5 h-5 mr-2" />
            View My Orders
          </Button>
          
          <Button
            onClick={() => {
              const message = orderId 
                ? `Hi! I just placed an order #${orderId} on Shahdol Bazaar. Please confirm.`
                : `Hi! I just placed an order on Shahdol Bazaar. Please confirm.`;
              window.open(`https://wa.me/919999999999?text=${encodeURIComponent(message)}`, '_blank');
            }}
            className="w-full bg-[#25D366] hover:bg-[#20BD5A] h-12 text-lg"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            WhatsApp Receipt
          </Button>
          
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => setLocation('/')}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Back to Home
            </Button>
            <Button 
              variant="outline"
              onClick={() => setLocation('/marketplace')}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Continue Shopping
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Trust Badge */}
        <div className="mt-8 text-center">
          <p className="text-slate-500 text-sm">
            🛡️ Protected by <span className="text-green-400 font-medium">DSSL Guarantee</span>
          </p>
          <p className="text-slate-600 text-xs mt-1">
            Your transaction is secure in {districtName}
          </p>
        </div>
      </div>

      {/* CSS for confetti animation */}
      <style>{`
        @keyframes confetti {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti linear forwards;
        }
      `}</style>
    </div>
  );
}