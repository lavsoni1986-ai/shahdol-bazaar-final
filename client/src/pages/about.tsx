import {
  Users,
  Target,
  ShieldCheck,
  Rocket,
  MessageSquare,
  Heart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      {/* 1. PREMIUM HERO SECTION */}
      <section className="relative py-24 bg-slate-900 overflow-hidden">
        {/* Decorative background blur */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 bg-orange-500/10 border border-orange-500/20 text-orange-600 px-4 py-2 rounded-full mb-8">
            <Heart size={16} fill="currentColor" />
            <span className="text-xs font-black uppercase tracking-widest">
              Proudly Local
            </span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white mb-8 tracking-tight">
            Shahdol Ka <span className="text-orange-600">Apna</span> <br />
            Digital Bazaar
          </h1>
          <p className="text-slate-400 text-lg md:text-xl font-medium leading-relaxed max-w-2xl mx-auto">
            Hum Shahdol ke har chhote aur bade vyapari ko digital pehchan de
            rahe hain. Hamara maqsad local vyapar ko adhunik aur asaan banana
            hai.
          </p>
        </div>
      </section>

      {/* 2. OUR STORY & MISSION */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-20 items-center">
          <div className="relative">
            <div className="bg-slate-100 rounded-[3rem] overflow-hidden aspect-square flex items-center justify-center p-12">
              <img
                src="/logo.webp"
                alt="ShahdolBazaar"
                width="400"
                height="130"
                style={{ aspectRatio: '400 / 130' }}
                className="w-full h-auto object-contain opacity-90"
              />
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-6 -right-6 bg-white p-8 rounded-[2rem] shadow-xl border border-slate-50 hidden md:block">
              <p className="text-4xl font-black text-orange-600">100%</p>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">
                Local Trust
              </p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 text-orange-600 mb-4">
              <Target size={24} />
              <span className="font-black uppercase tracking-widest text-sm">
                Hamara Maqsad
              </span>
            </div>
            <h2 className="text-4xl font-black text-slate-900 mb-8 tracking-tight italic">
              "Gandhi Chowk se Mobile Screen tak."
            </h2>
            <div className="space-y-6 text-slate-600 text-lg leading-relaxed">
              <p>
                ShahdolBazaar ka janm ek saral soch se hua:{" "}
                <span className="text-slate-900 font-bold">
                  "Shahdol ke local businesses ko digital taqat kaise di jaye?"
                </span>
              </p>
              <p>
                Aaj ke digital daur mein, bade e-commerce platforms ki wajah se
                local dukanen kahin peeche chhoot rahi thi. Humne ek aisa
                platform banaya jahan Shahdol ka har vyapari apni dukan ko
                online la sake.
              </p>
              <p>
                Hamara mission sirf dukanen list karna nahi, balki local economy
                ko majboot karna aur grahakon ko unki bharosemand dukanon se
                seedha jodna hai.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. KEY VALUES SECTION */}
      <section className="bg-slate-50 py-24 border-y border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-900 mb-4">
              Hum Alag Kyun Hain?
            </h2>
            <p className="text-slate-500 font-medium">
              ShahdolBazaar par aapka bharosa hamari kamyabi hai.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Value 1 */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-500 group">
              <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <ShieldCheck size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Verified Listings
              </h3>
              <p className="text-slate-500 leading-relaxed">
                Hum har dukan aur business ki jankari ko verify karte hain taaki
                aapko hamesha sahi aur sateek address mile.
              </p>
            </div>

            {/* Value 2 */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-500 group">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <MessageSquare size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Zero Commission
              </h3>
              <p className="text-slate-500 leading-relaxed">
                Koi beech-bicholiya nahi. Seedha WhatsApp par dukan-dar se
                judiye aur best deals paiye bina kisi extra charge ke.
              </p>
            </div>

            {/* Value 3 */}
            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:shadow-xl transition-all duration-500 group">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                <Rocket size={32} />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">
                Shahdol First
              </h3>
              <p className="text-slate-500 leading-relaxed">
                Humara platform sirf Shahdol ke liye dedicated hai. Hum local
                branding aur local shops ko badhava dene mein vishwas rakhte
                hain.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. JOIN US / CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="bg-slate-900 rounded-[3rem] p-12 md:p-24 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-[100px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>

          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight">
              Aapka Business, <br />
              <span className="text-orange-600">Hamari Digital Pehchan.</span>
            </h2>
            <p className="text-slate-400 text-lg md:text-xl mb-12 max-w-2xl mx-auto">
              Kya aap Shahdol mein vyapar karte hain? Aaj hi ShahdolBazaar se
              judiye aur apne dukan ko online le jaiye.
            </p>
            <div className="bg-slate-800/50 p-8 rounded-3xl mb-12 border border-slate-700 max-w-xl mx-auto">
              <h3 className="text-xl font-bold mb-4">Direct Contact</h3>
              <p className="text-orange-600 font-black text-2xl mb-2">Lav Kumar Soni</p>
              <p className="text-slate-300">Mobile: 9753239303</p>
              <p className="text-slate-300">Email: shaholbazaar2.0@gmail.com</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth">
                <Button
                  size="lg"
                  className="bg-orange-500 hover:bg-orange-600 text-white font-bold px-12 h-16 rounded-2xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                >
                  Register Your Shop
                </Button>
              </Link>

              <Link href="/contact">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-slate-700 text-white hover:bg-slate-800 font-bold px-12 h-16 rounded-2xl transition-all"
                >
                  Contact Us
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FOOTER NOTE */}
      <footer className="py-12 border-t border-slate-100 text-center">
        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em]">
          ShahdolBazaar • Lead Your Business To Success
        </p>
      </footer>
    </div>
  );
}
