import { Shield } from "lucide-react";

export const TrustNebulaBanner = () => {
  return (
    <div className="flex justify-center mt-4 mb-2 relative z-10">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-orange-500/10 blur-2xl rounded-full w-64 mx-auto" />

      <div className="glass-border sovereign-inner-glow flex items-center gap-2 px-5 py-1.5 rounded-full bg-white/[0.03] backdrop-blur-2xl shadow-[0_0_25px_rgba(34,197,94,0.3)]">
        <Shield className="w-4 h-4 text-emerald-500" />
        <span className="text-sm font-black tracking-widest text-emerald-400 drop-shadow-[0_0_12px_rgba(52,211,153,0.8)]">
          🔐 Verified & Safe • Powered by DSSL
        </span>
      </div>
    </div>
  );
};