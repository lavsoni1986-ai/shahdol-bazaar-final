import { Mail, Phone, MessageCircle, MapPin, User, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";

export default function Contact() {
  const myWhatsAppNumber = "919753239303";
  const myEmail = "shaholbazaar2.0@gmail.com";
  const myName = "Lav Kumar Soni";
  const myPhone = "9753239303";

  return (
    <div className="min-h-screen bg-white">
      {/* 1. HERO SECTION */}
      <section className="relative py-20 bg-slate-900 overflow-hidden text-center">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-0 left-0 w-96 h-96 bg-orange-500 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="max-w-4xl mx-auto px-6 relative z-10">
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tight">
            Contact <span className="text-orange-600">Us</span>
          </h1>
          <p className="text-slate-400 text-lg font-medium leading-relaxed max-w-2xl mx-auto">
            Hamein aapki sahayata karne mein khushi hogi. Kisi bhi sawal, sahayata ya partnership ke liye sampark karein.
          </p>
        </div>
      </section>

      {/* 2. CONTACT DETAILS CARDS */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Email Card */}
          <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 hover:-translate-y-2 transition-transform duration-300 overflow-hidden">
            <CardContent className="p-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
                <Mail size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Email Us</h3>
              <p className="text-slate-500 mb-6">General inquiries ke liye mail karein</p>
              <a href={`mailto:${myEmail}`} className="text-blue-600 font-bold hover:underline">
                {myEmail}
              </a>
            </CardContent>
          </Card>

          {/* WhatsApp Card */}
          <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 hover:-translate-y-2 transition-transform duration-300 overflow-hidden bg-orange-500 text-white">
            <CardContent className="p-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-white/20 text-white rounded-2xl flex items-center justify-center mb-6">
                <MessageCircle size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">WhatsApp</h3>
              <p className="text-orange-100 mb-6">Turant support ke liye message karein</p>
              <a 
                href={`https://wa.me/${myWhatsAppNumber}`} 
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-orange-600 font-black px-8 py-3 rounded-xl shadow-lg hover:bg-orange-50 transition-colors"
              >
                Chat Now
              </a>
            </CardContent>
          </Card>

          {/* Direct Call Card */}
          <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 hover:-translate-y-2 transition-transform duration-300 overflow-hidden">
            <CardContent className="p-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mb-6">
                <Phone size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Call Us</h3>
              <p className="text-slate-500 mb-6">Seedha phone par baat karein</p>
              <a href={`tel:${myPhone}`} className="text-green-600 font-bold hover:underline">
                +91 {myPhone}
              </a>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. OWNER SECTION */}
      <section className="bg-slate-50 py-24 border-y border-slate-100">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="w-24 h-24 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-8">
            <User size={48} />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4">Founder & Owner</h2>
          <p className="text-2xl font-bold text-orange-600 mb-8">{myName}</p>
          <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-slate-600">
            <div className="flex items-center gap-2">
              <MapPin className="text-orange-600" size={20} />
              <span>Shahdol, Madhya Pradesh</span>
            </div>
            <div className="hidden md:block w-1.5 h-1.5 bg-slate-300 rounded-full"></div>
            <div className="flex items-center gap-2">
              <MessageCircle className="text-green-500" size={20} />
              <span>Support Available 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FINAL CTA */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 text-white relative overflow-hidden shadow-2xl">
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-black mb-6">
              Shahdol Bazaar se <br />
              <span className="text-orange-600">Judiye Aaj Hi!</span>
            </h2>
            <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
              Kya aap ek vyapari hain aur online aana chahte hain? Hamein sampark karein aur hum aapki dukan ko digital banayenge.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth">
                <Button className="bg-orange-500 hover:bg-orange-600 text-white font-black px-12 h-16 rounded-2xl shadow-lg shadow-orange-500/20">
                  Register Now
                </Button>
              </Link>
              <a href={`https://wa.me/${myWhatsAppNumber}`}>
                <Button variant="outline" className="border-slate-700 text-white hover:bg-slate-800 font-black px-12 h-16 rounded-2xl">
                  Message on WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER NOTE */}
      <footer className="py-12 text-center">
        <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em]">
          ShahdolBazaar • Direct Support Contact
        </p>
      </footer>
    </div>
  );
}

