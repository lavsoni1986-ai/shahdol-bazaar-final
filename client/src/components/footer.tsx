import { Link } from "wouter";
import { Mail, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="bg-[#0b1221] text-slate-200 mt-16">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* About */}
        <div className="col-span-1 space-y-3">
          <img
            src="/logo.webp"
            alt="Shahdol Bazaar"
            className="h-10 w-auto object-contain"
          />
          <p className="text-sm text-slate-300 font-medium">
            Shahdol Bazaar - Lead your business to success.
          </p>
          <span className="inline-flex items-center px-3 py-1 text-[11px] font-black uppercase bg-orange-100 text-orange-700 rounded-full border border-orange-200">
            Proudly Made in Shahdol
          </span>
        </div>

        {/* Links */}
        <div className="space-y-3">
          <h4 className="text-sm font-black uppercase text-white">Links</h4>
          <div className="flex flex-col gap-2 text-sm font-bold text-slate-200">
            <Link href="/partner">Sell on Shahdol Bazaar</Link>
            <Link href="/about">About Us</Link>
            <Link href="/terms">Terms &amp; Conditions</Link>
          </div>
        </div>

        {/* Support */}
        <div className="space-y-3">
          <h4 className="text-sm font-black uppercase text-white">Support</h4>
          <div className="flex flex-col gap-2 text-sm font-bold text-slate-200">
            <span className="flex items-center gap-2">
              <MessageCircle size={16} className="text-green-400" />
              WhatsApp: +91 9753239303
            </span>
            <span className="flex items-center gap-2">
              <Mail size={16} className="text-slate-300" />
              support@shahdolbazaar.com
            </span>
          </div>
        </div>

        {/* Newsletter */}
        <div className="space-y-3">
          <h4 className="text-sm font-black uppercase text-white">Subscribe</h4>
          <p className="text-sm text-slate-300">Subscribe to get daily offers.</p>
          <div className="flex gap-2">
            <Input type="email" placeholder="Enter your email" className="text-sm bg-slate-900 border-slate-700 text-white" />
            <Button className="bg-[#e4488f] hover:bg-[#d53e83] text-white text-sm font-bold">
              Subscribe
            </Button>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-800 bg-[#0b1221]">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 text-center text-xs font-bold text-slate-400">
          © 2026 Shahdol Bazaar. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

