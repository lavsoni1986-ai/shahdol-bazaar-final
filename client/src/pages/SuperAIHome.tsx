// 📁 client/src/pages/SuperAIHome.tsx (FINAL SOVEREIGN VERSION)

import React, { useState } from "react";
import { useLocation } from "wouter";
import { useDistrict } from "@/contexts/DistrictContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBalance } from "@/hooks/useBalance";
import { useHomeSnapshot } from "@/hooks/useHomeSnapshot";
import { motion } from "framer-motion";
import { fadeUp, stagger } from "@/lib/motion.config";
import { Wallet, ArrowRight, Bus } from "lucide-react";

// Components
import { AISearchTerminal } from "@/components/home/AISearchTerminal";
import { QuickActions } from "@/components/home/QuickActions";
import { TrustBar } from "@/components/home/TrustBar";
import FeaturedShops from "@/components/home/FeaturedShops";
import { OffersGrid } from "@/components/home/OffersGrid";
import ServiceNetwork from "@/components/home/ServiceNetwork";
import HealthPulse from "@/components/home/HealthPulse";
import SchoolPulse from "@/components/home/SchoolPulse";
import LocalPulseBanner from "@/components/home/LocalPulseBanner";
import { SovereignEntityCard } from "@/components/shared/SovereignEntityCard";
import { ObservabilityPanel } from "@/components/dev/ObservabilityPanel";

export default function SuperAIHome() {
  const { currentDistrict, isReady } = useDistrict();
  const { isAuthenticated } = useAuth();
  const { data: balance } = useBalance();
  const [, setLocation] = useLocation();

  // Development observability
  const [showObservability, setShowObservability] = useState(false);

  const districtSlug = currentDistrict?.slug || "shahdol";
  const { data, isLoading, isError, error } = useHomeSnapshot();

  const partners = data?.partners ?? [];
  const products = data?.products ?? [];
  const services = data?.services ?? [];
  const hospitals = data?.hospitals ?? [];
  const schools = data?.schools ?? [];
  const recommendations = data?.recommendations ?? [];

  const handleNavigation = (path: string) => setLocation(`/${districtSlug}${path}`);

  // 🛡️ PREMIUM SKELETON LOADING
  if (!isReady || isLoading || !data) {
    return (
      <div className="min-h-screen bg-[#050505] p-4 space-y-8">
        <div className="h-10 bg-white/10 rounded-full animate-pulse w-1/2 mx-auto" />
        <div className="h-20 bg-white/5 rounded-3xl animate-pulse" />
        <div className="grid grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="h-48 bg-white/5 rounded-[40px] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-[88px] selection:bg-orange-500/30">

      {/* 🥇 1. GPT-STYLE HERO SECTION */}
      <section className="pt-14 pb-6 px-4 text-center overflow-hidden relative">
        {/* Sovereign glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[500px] bg-radial-gradient from-orange-500/10 via-transparent to-transparent blur-[120px] pointer-events-none -z-10" />
        <motion.div initial="hidden" animate="show" variants={stagger}>
          <motion.h1 variants={fadeUp} className="text-4xl md:text-6xl font-black leading-[1.1] tracking-tighter mb-4 italic">
            अपने जिले में <br />
            <span className="bg-gradient-to-br from-orange-400 via-orange-500 to-red-600 bg-clip-text text-transparent drop-shadow-sm font-black tracking-tighter">
              कुछ भी खोजो
            </span>
          </motion.h1>
          <motion.p variants={fadeUp} className="text-gray-400 text-sm font-medium mb-8">
            Shops, Doctors, Services — सब कुछ {currentDistrict?.name} में
          </motion.p>
        </motion.div>

        <AISearchTerminal />

        {/* 🛡️ SOVEREIGN: Guest-only Customer Auth CTA — hidden for authenticated users */}
        {!isAuthenticated && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-6 mx-auto max-w-sm"
          >
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm">
              <p className="text-xs font-black uppercase tracking-widest text-orange-400 mb-1">
                Apna Account Banayein
              </p>
              <p className="text-[11px] text-gray-500 mb-3 leading-relaxed">
                Orders Track Karein • Wishlist Save Karein • Apne Jile ki Dukaano se Kharidein
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setLocation("/auth")}
                  className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all active:scale-95 border border-white/10"
                >
                  Login
                </button>
                <button
                  onClick={() => setLocation("/auth?mode=register")}
                  className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 hover:opacity-90 text-white text-xs font-bold transition-all active:scale-95 shadow-lg shadow-orange-900/30"
                >
                  Create Account
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* AI TOGGLE STATUS */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex justify-center mt-4">
          <div className="px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-ping" />
            <span className="text-[10px] font-black uppercase tracking-widest text-orange-400">⚡ Sovereign AI Active</span>
          </div>
        </motion.div>

        <div className="mt-8">
          <QuickActions />
        </div>

        <div className="mt-6">
          <TrustBar />
        </div>

        <div className="mt-6">
          <LocalPulseBanner />
        </div>
      </section>


      {/* 🔥 2. LIVE BUYING SIGNAL (GPT INSPIRED) */}
      <section className="px-4 mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-black italic flex items-center gap-2">
            <span className="text-orange-500">🔥</span> लोग अभी क्या खरीद रहे हैं
          </h2>
          <button className="text-[10px] font-black uppercase text-gray-500 hover:text-orange-400 transition">See All</button>
        </div>

        {products.length === 0 ? (
          <p className="text-center text-gray-500 text-sm">
            अभी कोई ट्रेंडिंग नहीं — आप पहले explore करें 🔍
          </p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
            {products.slice(0, 6).map((entity) => (
              <div key={`hero-product-${entity.id}`} className="min-w-[260px] flex-shrink-0">
                <SovereignEntityCard entity={entity} variant="grid" />
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="space-y-8 md:space-y-12 mt-8 md:mt-12">

        {/* 🥉 3. SPONSORED SPOTLIGHTS (THE REVENUE LAYER) */}
        <motion.section
          className="px-4"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          variants={stagger}
        >
          <div className="flex flex-col mb-6">
            <span className="text-[10px] text-orange-500 font-black uppercase tracking-widest mb-1">Premium District Vendors</span>
            <h2 className="text-2xl font-black italic">Featured Shops</h2>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 bg-orange-500/5 blur-[60px] rounded-full opacity-50" />
            <div className="relative">
              <FeaturedShops entities={partners} />
            </div>
          </div>
        </motion.section>

        {/* 🟡 4. TRUSTED DEALS */}
        <section className="px-4">
          <h2 className="text-xl font-black italic mb-6">Trusted Deals in Shahdol</h2>
          <OffersGrid products={products} />
        </section>

        {/* 🔧 5. SERVICE NETWORK */}
        <section className="px-4">
          <h2 className="text-xl font-black italic mb-6">Service Network</h2>
          <ServiceNetwork workers={services} isLoading={isLoading} />
        </section>

        {recommendations.length > 0 && (
          <section className="px-4">
            <h2 className="text-xl font-black italic mb-6">Recommended for You</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendations.slice(0, 6).map((entity) => (
                <SovereignEntityCard key={`recommendation-${entity.kind}-${entity.id}`} entity={entity} variant="grid" />
              ))}
            </div>
          </section>
        )}

        {/* 🚌 6. TRANSIT — Compact Utility CTA */}
        <section className="px-4">
          <div
            onClick={() => handleNavigation('/bus-timetable')}
            className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0A0A0A] to-[#1a1a2e] border border-white/10 p-6 cursor-pointer group"
          >
            <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-orange-500/20">
                  <Bus className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-tighter">District Bus Timetable</h3>
                  <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                    Check {currentDistrict?.name || 'Shahdol'} transport schedules
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-orange-500 group-hover:translate-x-1 transition-transform flex-shrink-0" />
            </div>
          </div>
        </section>

        {/* ❤️ 7. HEALTHCARE */}
        <section className="px-4">
          <h2 className="text-xl font-black italic mb-6">Healthcare</h2>
          <HealthPulse hospitals={hospitals} />
        </section>

        {/* 🎓 7. EDUCATION */}
        <section className="px-4">
          <h2 className="text-xl font-black italic mb-6">Education</h2>
          <SchoolPulse schools={schools} />
        </section>



        {/* 💰 9. WALLET */}
        {isAuthenticated && balance && balance.totalSpent > 0 && (
          <section className="px-4">
            <div
              onClick={() => handleNavigation("/transactions")}
              className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#0A0A0A] to-[#1a1a2e] border border-white/10 p-8 cursor-pointer group"
            >
              <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-orange-500/20">
                    <Wallet className="w-6 h-6 text-orange-500" />
                  </div>
                  <span className="font-black italic uppercase tracking-wider">Sovereign Wallet</span>
                </div>
                <ArrowRight className="group-hover:translate-x-2 transition-transform text-orange-500" />
              </div>
              <p className="text-4xl font-black tracking-tighter">
                ₹{balance.availableBalance?.toLocaleString() || 0}
              </p>
            </div>
          </section>
        )}
      </div>

      {/* Development Observability Panel */}
      {process.env.NODE_ENV === 'development' && (
        <ObservabilityPanel
          isOpen={showObservability}
          onToggle={() => setShowObservability(!showObservability)}
        />
      )}
    </div>
  );
}
