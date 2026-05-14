import React from "react";
import { Button } from "@/components/ui/button";
import { Rocket, ShieldCheck, Zap } from "lucide-react";
import { Link } from "wouter";

// Configurable freemium settings
const FREEMIUM_CONFIG = {
  freeProducts: 2,
  aiListing: true,
  noCommission: true,
};

export default function FreemiumOnboarding() {
  return (
    <div className="relative overflow-hidden rounded-[40px] bg-gradient-to-br from-orange-600 to-orange-900 p-12 shadow-2xl group">
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform duration-700">
        <Rocket size={200} className="text-white" />
      </div>

      <div className="relative z-10 max-w-2xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-black/20 rounded-full border border-white/10 mb-6">
          <ShieldCheck size={14} className="text-orange-200" />
          <span className="text-[10px] text-white font-black uppercase tracking-[0.2em]">Sovereign Vendor Program</span>
        </div>

        <h2 className="text-4xl md:text-5xl font-black text-white leading-none mb-6 italic">
          Shahdol ke <span className="text-orange-200 underline decoration-white/20">Digital Hero</span> banein!
        </h2>

        <p className="text-orange-100 text-lg mb-10 font-medium leading-relaxed">
          Zero Commission. No Setup Fee. <br />
          Pehle <span className="text-white font-black px-2 bg-black/20 rounded">{FREEMIUM_CONFIG.freeProducts} Products</span> bilkul FREE list karein aur aaj hi apni digital dukan shuru karein.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/auth">
            <Button size="lg" className="bg-white text-orange-600 hover:bg-orange-50 font-black text-lg px-10 h-16 rounded-2xl shadow-xl transition-all hover:-translate-y-1">
              Abhi Register Karein
            </Button>
          </Link>
          <div className="flex items-center gap-3 px-6 py-2 bg-black/10 rounded-2xl border border-white/5">
            <Zap className="text-orange-300" size={20} />
            <span className="text-white/80 text-xs font-bold uppercase tracking-tighter">10 Second AI Listing</span>
          </div>
        </div>
      </div>
    </div>
  );
}