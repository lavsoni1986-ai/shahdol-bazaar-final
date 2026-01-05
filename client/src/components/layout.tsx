import { Link, useLocation } from "wouter";
import { Menu, X, MessageCircle, Bus, Store, ShoppingCart, Home as HomeIcon, Grid, ClipboardList, User } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Cart } from "@/components/Cart";
import { toast } from "sonner";
import { Footer } from "@/components/footer";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";

export function Layout({ children }: { children: React.ReactNode }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [location] = useLocation();
  const { getTotalItems } = useCart();

  const myWhatsAppNumber = "919753239303";
  const myEmail = "shaholbazaar2.0@gmail.com";
  const myName = "Lav Kumar Soni";
  const cartItemCount = getTotalItems();
  let profileDest = "/customer-dashboard";
  try {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const u = JSON.parse(userStr);
      if (u?.role === "admin" || u?.isAdmin) profileDest = "/admin";
      else if (u?.role === "seller") profileDest = "/partner";
    }
  } catch {}

  // Route change hote hi menu band karne ke liye
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  const handleComingSoon = (e: React.MouseEvent) => {
    e.preventDefault();
    toast.info("Bus Timetable: Work in progress! 🚧", {
      description: "Hum jald hi sateek timings update karenge.",
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes blink {
          0% { opacity: 1; }
          50% { opacity: 0.3; }
          100% { opacity: 1; }
        }
        .animate-blink {
          animation: blink 1.5s ease-in-out infinite;
        }
      `}} />
      {/* --- HEADER SECTION --- */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur shadow-sm">
        <div className="container mx-auto px-4 h-16 md:h-20 flex items-center justify-between gap-4">
          <Link href="/">
            <img
              src="/logo.webp"
              alt="ShahdolBazaar"
              width="180"
              height="60"
              style={{ aspectRatio: '180 / 60' }}
              className="h-10 md:h-14 w-auto object-contain cursor-pointer hover:opacity-80 transition-opacity"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-bold">
            <button
              onClick={handleComingSoon}
              className={`flex items-center gap-1 cursor-pointer transition-colors bg-transparent p-0 border-none font-bold ${
                location === "/bus"
                  ? "text-orange-600"
                  : "text-slate-500 hover:text-orange-600"
              }`}
            >
              <Bus size={16} /> Bus Timetable 
              <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[10px] font-black uppercase animate-blink border border-amber-200">
                Coming Soon
              </span>
            </button>

            <Link href="/about">
              <span
                className={`cursor-pointer transition-colors ${
                  location === "/about"
                    ? "text-orange-600"
                    : "text-slate-500 hover:text-orange-600"
                }`}
              >
                About Us
              </span>
            </Link>

            <Link href="/contact">
              <span
                className={`cursor-pointer transition-colors ${
                  location === "/contact"
                    ? "text-orange-600"
                    : "text-slate-500 hover:text-orange-600"
                }`}
              >
                Contact Us
              </span>
            </Link>

            <button
              onClick={() => {
                const userStr = localStorage.getItem("user");
                let dest = "/auth";
                if (userStr) {
                  try {
                    const u = JSON.parse(userStr);
                    if (u?.role === "seller") dest = "/partner";
                    else if (u?.role === "admin" || u?.isAdmin) dest = "/admin";
                    else dest = "/customer-dashboard";
                  } catch {}
                }
                window.location.href = dest;
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-full border ${
                location === "/partner" || location.startsWith("/partner/")
                  ? "border-orange-500 text-orange-600 bg-orange-50"
                  : "border-slate-200 text-slate-600 hover:border-orange-400 hover:text-orange-600"
              }`}
            >
              <Store size={16} /> Sell on Shahdol Bazaar
            </button>

            <Link href={profileDest}>
              <span
                className={`flex items-center gap-2 px-3 py-2 rounded-full border ${
                  location === profileDest
                    ? "border-orange-500 text-orange-600 bg-orange-50"
                    : "border-slate-200 text-slate-600 hover:border-orange-400 hover:text-orange-600"
                }`}
              >
                <User size={16} /> Profile
              </span>
            </Link>

            {/* Cart Icon */}
            <button
              onClick={() => setIsCartOpen(true)}
              aria-label="Open Cart"
              className="relative p-2 text-slate-500 hover:text-orange-600 transition-colors"
            >
              <ShoppingCart size={20} />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </button>
          </nav>

          {/* Mobile: Cart and Menu */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setIsCartOpen(true)}
              aria-label="Open Shopping Cart"
              className="relative p-2 text-slate-600"
            >
              <ShoppingCart size={24} />
              {cartItemCount > 0 && (
                <span className="absolute top-0 right-0 bg-orange-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                  {cartItemCount > 9 ? "9+" : cartItemCount}
                </span>
              )}
            </button>
            <button
              className="p-2 text-slate-600"
              aria-label="Toggle Navigation Menu"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t p-4 space-y-4 bg-white animate-in slide-in-from-top duration-200">
            <nav className="flex flex-col gap-4">
              <button
                onClick={handleComingSoon}
                className={`text-sm font-bold flex items-center gap-2 cursor-pointer bg-transparent p-0 border-none text-left ${
                  location === "/bus" ? "text-orange-600" : "text-slate-600"
                }`}
              >
                <Bus size={18} /> Bus Timetable
                <span className="ml-auto px-1.5 py-0.5 bg-amber-100 text-amber-600 rounded text-[10px] font-black uppercase animate-blink border border-amber-200">
                  Coming Soon
                </span>
              </button>

              <Link href="/about">
                <span
                  className={`text-sm font-bold cursor-pointer ${
                    location === "/about" ? "text-orange-600" : "text-slate-600"
                  }`}
                >
                  About Us
                </span>
              </Link>

              <Link href="/contact">
                <span
                  className={`text-sm font-bold cursor-pointer ${
                    location === "/contact" ? "text-orange-600" : "text-slate-600"
                  }`}
                >
                  Contact Us
                </span>
              </Link>

              <Link href="/auth">
                <span
                  className={`text-sm font-bold cursor-pointer ${
                    location === "/auth" ? "text-orange-600" : "text-slate-600"
                  }`}
                >
                  Partner Login
                </span>
              </Link>

              <Link href="/partner">
                <span
                  className={`text-sm font-bold flex items-center gap-2 cursor-pointer ${
                    location === "/partner" || location.startsWith("/partner/")
                      ? "text-orange-600"
                      : "text-slate-600"
                  }`}
                >
                  <Store size={18} /> Sell on Shahdol Bazaar
                </span>
              </Link>

              <Link href={profileDest}>
                <span
                  className={`text-sm font-bold flex items-center gap-2 cursor-pointer ${
                    location === profileDest ? "text-orange-600" : "text-slate-600"
                  }`}
                >
                  <User size={18} /> Profile
                </span>
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* --- PAGE CONTENT --- */}
      <main className="flex-1">{children}</main>

      {/* Cart Sidebar */}
      <Cart open={isCartOpen} onOpenChange={setIsCartOpen} />

      {/* Floating WhatsApp */}
      <FloatingWhatsApp />

      {/* --- FOOTER SECTION --- */}
      <Footer />

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-lg">
        <div className="grid grid-cols-4 text-center text-xs font-bold text-slate-600">
          <Link href="/" className={`py-2 flex flex-col items-center gap-1 ${location === "/" ? "text-[#e4488f]" : ""}`}>
            <HomeIcon size={18} />
            <span>Home</span>
          </Link>
          <Link href="/category/women-fashion" className={`py-2 flex flex-col items-center gap-1 ${location.startsWith("/category") ? "text-[#e4488f]" : ""}`}>
            <Grid size={18} />
            <span>Categories</span>
          </Link>
          <button
            onClick={() => setIsCartOpen(true)}
            className="py-2 flex flex-col items-center gap-1 text-slate-600"
          >
            <ShoppingCart size={18} />
            <span>Cart</span>
          </button>
          <Link href="/customer-dashboard" className={`py-2 flex flex-col items-center gap-1 ${location === "/customer-dashboard" ? "text-[#e4488f]" : ""}`}>
            <User size={18} />
            <span>Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}

