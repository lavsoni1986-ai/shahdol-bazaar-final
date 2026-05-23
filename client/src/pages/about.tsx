import React from "react";
import { ShieldCheck, MapPin, Users, Zap } from "lucide-react";

export default function About() {
  
  const handleJoinClick = () => {
    // 2 सेकंड बाद व्हाट्सएप पर भेजें
    setTimeout(() => {
      window.open("https://wa.me/919753239303?text=नमस्ते लव भाई, मैं शहडोल बाज़ार पर अपना स्टोर रजिस्टर करना चाहता हूँ।", "_blank");
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-orange-500 selection:text-white">
      {/* 1. Cinematic Hero Section */}
      <section className="relative h-[80vh] flex items-center justify-center overflow-hidden border-b border-white/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#f9731633_0%,transparent_50%)]"></div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <span className="inline-block py-1 px-3 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-500 text-xs font-bold tracking-widest uppercase mb-6 animate-pulse">
            Established 2026
          </span>
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-8 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
            SHAHDOL<br/>BAZAAR
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
            Hum sirf ek marketplace nahi, balki Shahdol Sambhag ki digital legacy hain. 
            Vindhya ki mitti se lekar digital world tak ka ek naya safar.
          </p>
        </div>
      </section>

      {/* 2. The Identity (Sambhag Pride) */}
      <section className="py-32 container mx-auto px-4">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-7">
            <h2 className="text-4xl font-black mb-8 leading-tight">
              Shahdol: Ek Jila Nahi,<br/>
              <span className="text-orange-500">Ek Gauravshali Sambhag Hai.</span>
            </h2>
            <p className="text-xl text-slate-400 leading-relaxed mb-8">
              Shree Ram Hospital se lekar local market tak, Shahdol Sambhag (Anuppur, Umaria) 
              ki har ek dhadkan ab aapke phone par hai. Humne is platform ko Shahdol ke 
              vyapariyon ko ek "World-Class" digital pehchan dene ke liye banaya hai.
            </p>
            <div className="grid grid-cols-2 gap-8 border-t border-white/10 pt-12">
              <div>
                <h4 className="text-3xl font-black text-white">Sambhag</h4>
                <p className="text-slate-500 text-sm mt-2">Division Pride: Shahdol, Anuppur, Umaria</p>
              </div>
              <div>
                <h4 className="text-3xl font-black text-white">DSSL</h4>
                <p className="text-slate-500 text-sm mt-2">Military Grade Digital Safety</p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="aspect-square bg-gradient-to-br from-orange-500 to-red-600 rounded-3xl rotate-3 flex items-center justify-center p-1 shadow-2xl shadow-orange-500/20">
              <div className="bg-[#050505] w-full h-full rounded-[1.4rem] flex flex-col items-center justify-center text-center p-8">
                <MapPin size={48} className="text-orange-500 mb-6" />
                <h3 className="text-2xl font-black italic">Shahdol Marketplace</h3>
                <p className="text-slate-500 mt-4 text-sm font-medium">Headquartered in Shahdol, MP</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Features Grid - High Tech Feel */}
      <section className="py-32 bg-white/5 border-y border-white/10">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: <ShieldCheck />, title: "Digital Safety", desc: "DSSL Framework ke sath 100% fraud protection." },
              { icon: <Zap />, title: "Hyperlocal", desc: "Shahdol ki galiyo se lekar hospitals tak ki direct access." },
              { icon: <Users />, title: "Community", desc: "Local vyapariyon ko global reach dena hamara lakshya hai." },
              { icon: <ShieldCheck />, title: "Trust", desc: "Verified listings aur transparent reviews." }
            ].map((feature, i) => (
              <div key={i} className="group p-8 rounded-2xl bg-[#0a0a0a] border border-white/5 hover:border-orange-500/50 transition-all duration-500">
                <div className="text-orange-500 mb-6 group-hover:scale-110 transition-transform">{feature.icon}</div>
                <h4 className="text-lg font-black mb-4">{feature.title}</h4>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Final CTA - The "Working" Button */}
      <section className="py-32 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-orange-600/5 blur-[120px] rounded-full"></div>
        
        <h2 className="text-3xl md:text-5xl font-black mb-12 relative z-10">
          Shuru karein Shahdol ki <br/>Digital Kranti?
        </h2>
        
        <button 
          onClick={handleJoinClick}
          className="relative z-10 px-12 py-5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-full transition-all shadow-[0_0_40px_rgba(249,115,22,0.3)] hover:shadow-[0_0_60px_rgba(249,115,22,0.5)] active:scale-95 border border-white/10"
        >
          JOIN AS MERCHANT
        </button>
        
        <p className="mt-8 text-slate-500 text-sm font-medium relative z-10">
          Verified by <span className="text-orange-500">DSSL Security Layer</span>
        </p>
      </section>
    </div>
  );
}
