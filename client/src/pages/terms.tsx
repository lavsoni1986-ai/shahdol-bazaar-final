import { ShieldCheck, FileText, Scale, Info, MapPin } from "lucide-react";

export default function Terms() {
  return (
    <div className="bg-slate-50 min-h-screen py-12 md:py-20">
      <div className="max-w-4xl mx-auto px-6 bg-white p-8 md:p-12 rounded-[2rem] md:rounded-[3rem] shadow-sm border border-slate-100">
        {/* Header Section */}
        <div className="flex items-center gap-3 text-orange-600 mb-8 border-b pb-6">
          <Scale size={32} />
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
            Terms of Service
          </h1>
        </div>

        {/* Content Sections */}
        <div className="space-y-10 text-slate-600 leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <FileText size={20} className="text-orange-400" /> 1. Hamari Seva
              (Our Service)
            </h2>
            <p>
              ShahdolBazaar ek <strong>Hyperlocal Directory</strong> hai. Hum
              Shahdol ke local vyapariyon ki jankari grahakon tak pahunchate
              hain. Hum sirf ek platform hain aur koi commission nahi lete.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Info size={20} className="text-orange-400" /> 2. Content
              Disclaimer
            </h2>
            <p>
              Dukan ki jankari dukan-malik dwara di gayi hai. ShahdolBazaar kisi
              bhi galat jankari ke liye zimmedar nahi hoga.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <ShieldCheck size={20} className="text-orange-400" /> 3. Privacy
              Policy
            </h2>
            <p>
              Hum aapka personal data kisi bhi third-party ko nahi bechte. Aapka
              data hamare liye surakshit hai.
            </p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-100 text-center">
          <p className="text-[10px] md:text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">
            Last Updated: December 20, 2025
          </p>
        </div>
      </div>
    </div>
  );
}
