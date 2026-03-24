import React from "react";
import { Phone, Mail, MapPin, MessageCircle, Clock, Send } from "lucide-react";
import confetti from 'canvas-confetti';

export default function Contact() {
  
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.8 },
      colors: ['#f97316', '#ffffff']
    });
    alert("नमस्ते लव भाई! आपका संदेश हमें मिल गया है।");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-orange-500">
      {/* 1. Minimal Header */}
      <section className="py-20 text-center border-b border-white/5 bg-[radial-gradient(circle_at_top,#f9731610_0%,transparent_70%)]">
        <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">CONNECT</h1>
        <p className="text-slate-500 uppercase tracking-[0.3em] text-xs font-bold">Shahdol Bazaar Division HQ</p>
      </section>

      <div className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-20">
          
          {/* Left Side: Contact Info */}
          <div className="space-y-12">
            <div>
              <h2 className="text-3xl font-black mb-6">संपर्क सूत्र</h2>
              <p className="text-slate-400 text-lg font-light leading-relaxed">
                शहडोल संभाग के व्यापारियों और नागरिकों के लिए हमारा द्वार हमेशा खुला है। डिजिटल क्रांति में हमसे जुड़ें।
              </p>
            </div>

            <div className="space-y-8">
              <div className="flex items-start gap-6 group">
                <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-orange-600 transition-all duration-500">
                  <Phone className="text-orange-500 group-hover:text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-500 text-xs uppercase tracking-widest mb-1">Direct Call</h4>
                  <a href="tel:+919753239303" className="text-xl font-black hover:text-orange-500 transition-colors">+91 97532 39303</a>
                </div>
              </div>

              <div className="flex items-start gap-6 group">
                <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-orange-600 transition-all duration-500">
                  <MapPin className="text-orange-500 group-hover:text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-500 text-xs uppercase tracking-widest mb-1">Location</h4>
                  <p className="text-xl font-black">Shahdol, Madhya Pradesh<br/>District & Division HQ</p>
                </div>
              </div>

              <div className="flex items-start gap-6 group">
                <div className="p-4 bg-white/5 rounded-2xl group-hover:bg-orange-600 transition-all duration-500">
                  <Clock className="text-orange-500 group-hover:text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-500 text-xs uppercase tracking-widest mb-1">Hours</h4>
                  <p className="text-xl font-black">24/7 Digital Portal</p>
                </div>
              </div>
            </div>

            {/* WhatsApp Link for Instant Support */}
            <a 
              href="https://wa.me/919753239303"
              className="inline-flex items-center gap-4 p-6 bg-green-500/10 border border-green-500/20 rounded-3xl hover:bg-green-500/20 transition-all group"
            >
              <MessageCircle className="text-green-500" size={32} />
              <div>
                <span className="block font-black text-lg">Chat with Admin</span>
                <span className="text-sm text-green-500/80 font-medium tracking-tight">Instant WhatsApp Support</span>
              </div>
            </a>
          </div>

          {/* Right Side: Contact Form */}
          <div className="relative">
            <div className="absolute inset-0 bg-orange-600/10 blur-[100px] rounded-full"></div>
            <form 
              onSubmit={handleFormSubmit}
              className="relative bg-[#0a0a0a] border border-white/10 p-10 rounded-[2.5rem] space-y-6 shadow-2xl"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Your Name</label>
                <input type="text" placeholder="John Doe" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-orange-500 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Mobile Number</label>
                <input type="tel" placeholder="97532xxxxx" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-orange-500 transition-all" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Message</label>
                <textarea rows={4} placeholder="How can we help you?" className="w-full bg-white/5 border border-white/10 p-4 rounded-xl focus:outline-none focus:border-orange-500 transition-all resize-none"></textarea>
              </div>
              <button className="w-full py-5 bg-orange-600 hover:bg-orange-500 text-white font-black rounded-xl transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-orange-600/20">
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
