import React from "react";
import { Phone, Mail, MapPin, MessageCircle, Clock, Send } from "lucide-react";

export default function Contact() {

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("नमस्ते लव भाई! आपका संदेश हमें मिल गया है।");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-orange-500">
      {/* 1. Minimal Header */}
      <section className="py-20 text-center border-b border-white/5 bg-[radial-gradient(circle_at_top,#f9731610_0%,transparent_70%)]">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">CONNECT</h1>
        <p className="text-slate-500 uppercase tracking-[0.3em] text-xs font-bold">Shahdol Bazaar Division HQ</p>
      </section>

      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="grid lg:grid-cols-2 gap-8 md:gap-20">

          {/* Left Side: Contact Info */}
          <div className="space-y-12">
            <div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-6">संपर्क सूत्र</h2>
              <p className="text-slate-400 text-sm sm:text-base md:text-lg font-light leading-relaxed">
                शहडोल संभाग के व्यापारियों और नागरिकों के लिए हमारा द्वार हमेशा खुला है। डिजिटल क्रांति में हमसे जुड़ें।
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-3 sm:gap-6 group">
                <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-orange-600 transition-all duration-500 flex-shrink-0">
                  <Phone className="text-orange-500 group-hover:text-white h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-500 text-xs uppercase tracking-widest mb-1">Direct Call</h4>
                  <a href="tel:+919753239303" className="text-sm sm:text-base md:text-lg lg:text-xl font-black hover:text-orange-500 transition-colors break-all">+91 97532 39303</a>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-6 group">
                <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-orange-600 transition-all duration-500 flex-shrink-0">
                  <MapPin className="text-orange-500 group-hover:text-white h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-500 text-xs uppercase tracking-widest mb-1">Location</h4>
                  <p className="text-sm sm:text-base md:text-lg lg:text-xl font-black">Shahdol, Madhya Pradesh<br />District & Division HQ</p>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-6 group">
                <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-orange-600 transition-all duration-500 flex-shrink-0">
                  <Mail className="text-orange-500 group-hover:text-white h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-500 text-xs uppercase tracking-widest mb-1">Email Support</h4>
                  <a href="mailto:shahdolbazaar2.0@gmail.com" className="text-sm sm:text-base md:text-lg lg:text-xl font-black hover:text-orange-500 transition-colors break-all">shahdolbazaar2.0@gmail.com</a>
                </div>
              </div>

              <div className="flex items-start gap-3 sm:gap-6 group">
                <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-orange-600 transition-all duration-500 flex-shrink-0">
                  <Clock className="text-orange-500 group-hover:text-white h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-500 text-xs uppercase tracking-widest mb-1">Hours</h4>
                  <p className="text-sm sm:text-base md:text-lg lg:text-xl font-black">24/7 Digital Portal</p>
                </div>
              </div>
            </div>

            {/* WhatsApp Link for Instant Support */}
            <a
              href="https://wa.me/919753239303"
              className="inline-flex items-center gap-3 sm:gap-4 p-4 sm:p-6 bg-green-500/10 border border-green-500/20 rounded-3xl hover:bg-green-500/20 transition-all group"
            >
              <MessageCircle className="text-green-500 h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0" />
              <div className="min-w-0">
                <span className="block font-black text-xs sm:text-sm md:text-base lg:text-lg">Chat with Admin</span>
                <span className="text-[11px] sm:text-xs text-green-500/80 font-medium tracking-tight">Instant WhatsApp Support</span>
              </div>
            </a>
          </div>

          {/* Right Side: Contact Form */}
          <div className="relative">
            <div className="absolute inset-0 bg-orange-600/10 blur-[100px] rounded-full"></div>
            <form
              onSubmit={handleFormSubmit}
              className="relative bg-[#0a0a0a] border border-white/10 p-6 sm:p-8 md:p-10 rounded-[1.5rem] sm:rounded-[2.5rem] space-y-4 sm:space-y-6 shadow-2xl"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Your Name</label>
                <input type="text" placeholder="John Doe" className="w-full bg-white/5 border border-white/10 p-3 sm:p-4 rounded-lg sm:rounded-xl focus:outline-none focus:border-orange-500 transition-all text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Mobile Number</label>
                <input type="tel" placeholder="97532xxxxx" className="w-full bg-white/5 border border-white/10 p-3 sm:p-4 rounded-lg sm:rounded-xl focus:outline-none focus:border-orange-500 transition-all text-sm" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Message</label>
                <textarea rows={4} placeholder="How can we help you?" className="w-full bg-white/5 border border-white/10 p-3 sm:p-4 rounded-lg sm:rounded-xl focus:outline-none focus:border-orange-500 transition-all resize-none text-sm"></textarea>
              </div>
              <button className="w-full py-4 sm:py-5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-lg sm:rounded-xl transition-all flex items-center justify-center gap-2 sm:gap-3 active:scale-95 shadow-lg shadow-orange-600/20 text-sm sm:text-base">
                <Send size={18} />
                SEND MESSAGE
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
