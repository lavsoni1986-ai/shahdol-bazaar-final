import React from "react";
import { ShieldCheck, Lock, Globe, Zap } from "lucide-react";

// 🛡️ BHARAT-OS: DSSL TRUST NEBULA BANNER
export default function TrustNebulaBanner() {
  return (
    <div className="relative group overflow-hidden rounded-[2.5rem] p-1 border border-white/10 bg-gradient-to-br from-orange-500/20 via-transparent to-blue-500/10 backdrop-blur-3xl">
      <div className="glass-card-sovereign p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
        
        {/* Text Content */}
        <div className="max-w-xl text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 mb-6">
            <Zap className="w-3 h-3 text-orange-500 fill-orange-500" />
            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">
              DSSL Powered Security
            </span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-6 leading-none">
            TRUST THE <span className="text-orange-500">NEBULA.</span>
          </h2>
          <p className="text-gray-400 text-lg font-medium leading-relaxed">
            BharatOS uses the Digital Safety Signals Layer (DSSL) to verify every merchant in Shahdol. 
            Real-time fraud detection and 100% sovereign data isolation.
          </p>
        </div>

        {/* Floating Security Badges */}
        <div className="grid grid-cols-2 gap-4">
          <TrustBadge icon={<ShieldCheck />} label="Verified" />
          <TrustBadge icon={<Lock />} label="Encrypted" />
          <TrustBadge icon={<Globe />} label="Sovereign" />
          <div className="p-6 bg-orange-500 rounded-3xl flex flex-col items-center justify-center text-white shadow-[0_0_30px_rgba(234,88,12,0.4)]">
            <span className="text-2xl font-black">99.9%</span>
            <span className="text-[8px] font-bold uppercase tracking-widest">Safety Score</span>
          </div>
        </div>
      </div>

      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-orange-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-500/10 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}

function TrustBadge({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-6 bg-white/5 border border-white/10 rounded-3xl hover:border-orange-500/30 transition-all group/badge">
      <div className="text-gray-400 group-hover/badge:text-orange-500 transition-colors mb-2">
        {React.cloneElement(icon as React.ReactElement<any>, { size: 24 })}
      </div>
      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest group-hover/badge:text-white transition-colors">
        {label}
      </span>
    </div>
  );
}