import React from "react";
import { Link } from "wouter";
import { Phone, Mail, MapPin, ShieldCheck, Facebook, Instagram, Youtube, Sparkles } from "lucide-react";
import { useDistrict } from "@/contexts/DistrictContext";

export function Footer() {
  const { currentDistrict } = useDistrict();
  const districtSlug = currentDistrict?.slug || 'shahdol';

  return (
    <footer className="glass-card-sovereign text-white mt-16 border-t border-white/10 pt-8 pb-6 px-4">
      <div className="container mx-auto text-center">

        {/* Brand + Tagline Row */}
        <div className="mb-6">
          <h2 className="text-xl font-serif font-bold tracking-[0.15em] text-white" data-testid="footer-logo">
            SHAHDOL<span className="text-orange-500">BAZAAR</span>
          </h2>
          <p className="text-orange-400/80 text-xs mt-2 font-medium">Your Digital Shahdol</p>
        </div>

        {/* Quick Links + Contact Row */}
        <div className="flex flex-col md:flex-row justify-center gap-8 mb-6">
          <div>
            <h4 className="font-bold mb-3 text-white uppercase tracking-wider text-xs">Quick Links</h4>
            <ul className="space-y-2 text-gray-400 text-xs">
              <li><Link href={`/${districtSlug}/hospitals`} className="hover:text-orange-500 transition-colors">Hospitals</Link></li>
              <li><Link href={`/${districtSlug}/bus-timetable`} className="hover:text-orange-500 transition-colors">Bus Timings</Link></li>
              <li><Link href={`/${districtSlug}/marketplace`} className="hover:text-orange-500 transition-colors">Markets</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-3 text-white uppercase tracking-wider text-xs">Contact</h4>
            <ul className="space-y-2 text-gray-400 text-xs">
              <li><a href="tel:+919753239303" className="hover:text-orange-500 transition-colors">+91 97532 39303</a></li>
              <li><a href="mailto:shahdolbazaar2.0@gmail.com" className="hover:text-orange-500 transition-colors">shahdolbazaar2.0@gmail.com</a></li>
            </ul>
          </div>
        </div>

        {/* Social Row */}
        <div className="flex justify-center gap-2 mb-6">
          <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-orange-600 hover:text-white transition-all border border-white/5"><Instagram size={14} /></a>
          <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-orange-600 hover:text-white transition-all border border-white/5"><Facebook size={14} /></a>
          <a href="#" className="p-2 bg-white/5 rounded-full hover:bg-orange-600 hover:text-white transition-all border border-white/5"><Youtube size={14} /></a>
        </div>

        {/* Bottom Bar */}
        <div className="pt-4 border-t border-white/5">
          <p className="text-[10px] text-slate-500">
            © 2026 Shahdol Bazaar • Made with ❤️ for Shahdol
          </p>
        </div>
      </div>
    </footer>
  );
}
