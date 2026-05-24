import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Store, ShoppingCart, Home as HomeIcon, User, LogOut, Package, Search, Sparkles, Menu, MapPin, Brain, ChevronLeft, Share2, Heart } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useAuth, getClientRoleRedirectPath } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { Cart } from "@/components/Cart";
import { toast } from "sonner";
import { useDistrict } from "@/contexts/DistrictContext";
import { SearchBar } from "@/components/search-bar";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Z-INDEX CANONICAL REFERENCE ────────────────────────
// MUST use these constants from design/tokens.ts.
// NO arbitrary z-[*] values outside this governance.
import { zIndex as zi } from "@/design/tokens";
import { SAFE_AREAS, safeAreaClasses } from "@/design/safe-area";
import {
  resolveRouteConfig,
  isAdminOrVendorRoute,
  isProductDetailRoute,
  getProductBackHref,
} from "@/config/route-governance";
import { applyPerformanceMode, initPerformanceModeListener, shouldReduceEffects } from "@/design/performance-mode";

export function Layout({ children }: { children: React.ReactNode }) {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [location] = useLocation();
  // 🛡️ SOVEREIGN ROUTE GOVERNANCE — centralized, no scattered pathname checks
  const routeConfig = resolveRouteConfig(location);
  const isAdminOrVendor = isAdminOrVendorRoute(location);
  const isProductRoute = isProductDetailRoute(location);
  const isDetailPage = routeConfig.isDetailPage;
  const [scrollY, setScrollY] = useState(0);
  const { getTotalItems } = useCart();
  const { currentDistrict } = useDistrict();
  const { isAuthenticated, user, logout } = useAuth();
  const cartItemCount = getTotalItems();
  const districtName = currentDistrict?.name || "Shahdol";

  // ⚡ PERFORMANCE MODE — detect low-end Android and apply CSS classes
  useEffect(() => {
    applyPerformanceMode();
    initPerformanceModeListener();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 🚀 AI EVENT LISTENER: Capture open-shahdol-ai events
  useEffect(() => {
    const handleOpenAI = (e: any) => {
      console.log("🚀 AI Event Captured:", e.detail?.message);
      if (e.detail?.message) {
        setLocation(`/${currentDistrict?.slug || 'shahdol'}/ai/concierge?q=${encodeURIComponent(e.detail.message)}`);
      } else {
        setLocation(`/${currentDistrict?.slug || 'shahdol'}/ai/concierge`);
      }
    };
    window.addEventListener('open-shahdol-ai', handleOpenAI);
    return () => window.removeEventListener('open-shahdol-ai', handleOpenAI);
  }, [currentDistrict?.slug]);

  const headerOpacity = Math.max(0, 1 - scrollY / 200);
  const headerScale = Math.max(0.85, 1 - scrollY / 500);

  const [, setLocation] = useLocation();

  const handleLogout = useCallback(async () => {
    await logout();
    toast.success("Logged out successfully");
    setLocation("/");
  }, [logout, setLocation]);

  const navItems = [
    { href: "/", icon: HomeIcon, label: "Home" },
    { href: "/marketplace", icon: Store, label: "Shops" },
    { href: "/ai/concierge", icon: Sparkles, label: "AI" },
    { href: "/cart", icon: ShoppingCart, label: "Cart", hasCart: true },
    { href: "/auth", icon: User, label: "Profile" },
  ];

  // Center AI button index
  const aiCenterIndex = 2;

  // 🛡️ Centralized back-href resolution via route-governance registry
  const productBackHref = getProductBackHref(location);

  return (
    <div className="relative w-full min-h-screen overflow-x-hidden flex flex-col font-sans bg-[#030003]">
      {/* 🛡️ SOVEREIGN HEADER — SINGLE AUTHORITY
          On product routes: shows back nav + share/save
          On all other routes: shows hamburger + brand + profile
          NO duplicate headers anywhere in page components.
      */}
      <header className="h-16 px-4 md:px-6 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-xl fixed w-full top-0 z-[100]" style={{
        opacity: isProductRoute ? 1 : headerOpacity,
        transform: `scale(${isProductRoute ? 1 : headerScale})`,
        transformOrigin: 'top center',
      }}>
        {isProductRoute ? (
          <>
            {/* Left: Back Navigation */}
            <div className="flex justify-start">
              <Link href={productBackHref}>
                <Button variant="ghost" className="text-zinc-400 hover:text-white -ml-2">
                  <ChevronLeft className="h-5 w-5 mr-1" />
                  <span className="text-sm font-medium hidden sm:inline">Back</span>
                </Button>
              </Link>
            </div>

            {/* Center: Brand (dimmed) */}
            <div className="flex justify-center">
              <Link href="/" className="flex flex-col items-center group">
                <span className="text-sm sm:text-base md:text-lg font-black tracking-wider leading-none italic uppercase">
                  <span className="text-white/60">SHAHDOL</span>
                  <span className="text-orange-500/60">BAZAAR</span>
                </span>
              </Link>
            </div>

            {/* Right: Share/Save */}
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-full hover:bg-white/5 text-zinc-400 transition-colors" title="Share">
                <Share2 className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-full hover:bg-white/5 text-zinc-400 transition-colors" title="Save">
                <Heart className="w-4 h-4" />
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Left: Sidebar Trigger */}
            <div className="flex justify-start">
              <Sheet>
                <SheetTrigger asChild>
                  <button className="p-2 hover:bg-white/5 rounded-full transition-colors active:scale-90">
                    <Menu className="w-6 h-6 text-white" />
                  </button>
                </SheetTrigger>
                <SheetContent side="left" className="bg-[#0a0a0a]/98 backdrop-blur-3xl border-r border-white/10 text-white w-[300px] p-0 flex flex-col">

                  {/* 🏷️ BRAND HEADER */}
                  <div className="p-6 border-b border-white/5 bg-gradient-to-br from-orange-500/10 to-transparent">
                    <SheetTitle className="text-xl font-black tracking-tighter italic uppercase">
                      <span className="text-white">SHAHDOL</span>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">BAZAAR</span>
                    </SheetTitle>
                    <SheetDescription className="text-gray-500 text-[10px] uppercase tracking-[0.2em] mt-1">Sovereign OS v4.0</SheetDescription>
                  </div>

                  {/* 🗺️ NAVIGATION */}
                  <nav className="flex-1 flex flex-col p-4 gap-2 overflow-y-auto">
                    {[
                      { href: "/", label: "🏠 Home" },
                      { href: "/services", label: "🔧 Essential Services" },
                      { href: "/about", label: "📈 About Us" },
                      { href: "/contact", label: "📞 Contact Us" },
                      { href: "/terms", label: "📜 Terms & Conditions" }
                    ].map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={`flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-sm ${location === link.href ? "bg-orange-500/10 text-orange-500 border border-orange-500/20" : "hover:bg-white/5 text-gray-400"
                          }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>

                  {/* 🏪 FOOTER ACTION */}
                  <div className="p-6 border-t border-white/5 mb-6">
                    <Link href="/vendor/register" className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 hover:scale-[1.02] active:scale-95 text-white transition-all font-black shadow-lg shadow-orange-900/40">
                      🏪 Start Selling
                    </Link>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Center: Hero Logo */}
            <div className="flex justify-center pl-4 sm:pl-0">
              <Link href="/" className="flex flex-col items-center group overflow-visible">
                <span className="text-lg sm:text-xl md:text-2xl font-black tracking-wider leading-none italic uppercase pr-8 inline-block overflow-visible relative">
                  <span className="text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]">SHAHDOL</span>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]">BAZAAR</span>
                </span>
                <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-orange-500/20 to-transparent group-hover:via-orange-500 transition-all duration-500"></div>
              </Link>
            </div>

            {/* Right: Profile */}
            <div className="flex justify-end">
              <button
                onClick={() => {
                  const currentPath = window.location.pathname;
                  const isPartnerContext = currentPath.includes("/partner") || currentPath.includes("/merchant");
                  setLocation(isPartnerContext ? '/auth?role=partner' : '/auth');
                }}
                title="User Profile"
                className="p-2 bg-white/5 rounded-full border border-white/10 hover:bg-orange-500/20 transition-all active:scale-95 cursor-pointer"
              >
                <User size={18} className="text-gray-300" />
              </button>
            </div>
          </>
        )}
      </header>

      {/* 🛡️ SEARCH BAR — suppressed on ALL product/detail/admin routes */}
      {!isAdminOrVendor && !isDetailPage && !isProductRoute && (
        <div
          className={`fixed top-[88px] left-0 w-full z-[90] flex justify-center transition-all duration-500 py-3 px-4 will-change-transform ${scrollY > 150 ? 'opacity-100 translate-y-0 bg-[#050505]/98 backdrop-blur-3xl border-b border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.8)]' : 'opacity-0 -translate-y-10 pointer-events-none'
            }`}
        >
          <div className="relative z-[90] w-full max-w-xl">
            <SearchBar
              placeholder="Ask AI anything in Shahdol..."
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
            />
          </div>
        </div>
      )}

      {/* MAIN CONTENT — pt uses SAFE_AREAS.header (governance token) */}
      <main
        className="flex-1 w-full max-w-6xl mx-auto px-0 sm:px-6 lg:px-8 relative z-10 transition-all duration-300"
        style={{
          paddingTop: `${SAFE_AREAS.header}px`,
          paddingBottom: isAdminOrVendor ? '32px' : `${SAFE_AREAS.pageBottomPadding}px`,
        }}
      >
        {children}
      </main>

      {/* BOTTOM NAV */}
      {!isAdminOrVendor && (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#030003]/90 backdrop-blur-xl border-t border-white/10 z-[80]">
          <div className="flex justify-around items-center py-2">
            {navItems.map((item, index) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              const isAIActive = item.label === "Shops" && location === "/marketplace";
              {/* 🛡️ SOVEREIGN AI ORB - GUARANTEED CLICKABLE */ }
              const isCenterAI = index === aiCenterIndex;
              return isCenterAI ? (
                <div key={item.label} className="relative -top-5 flex flex-col items-center justify-center w-16 z-[9999] pointer-events-auto">
                  {/* KILL INVISIBLE SHIELD: pointer-events-none on the glow */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-orange-500/20 blur-xl animate-pulse"></div>
                  </div>

                  {/* THE ACTUAL BUTTON: Forced pointer-events-auto and max z-index */}
                  <button
                    type="button"
                    onClick={() => setLocation(`/${currentDistrict?.slug || 'shahdol'}/ai/concierge`)}
                    className="relative z-[10000] w-14 h-14 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-[0_0_30px_rgba(249,115,22,0.7)] border-[2px] border-white/10 hover:scale-105 transition-transform cursor-pointer pointer-events-auto"
                  >
                    <Sparkles className="w-6 h-6 text-white pointer-events-none" />
                  </button>

                  <span className="text-[11px] font-black text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] uppercase tracking-widest absolute -bottom-5 w-full text-center pointer-events-none">
                    AI
                  </span>
                </div>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-1 px-3 py-1 min-w-[60px] hover:scale-105 active:scale-95 transition ${isActive || isAIActive
                    ? "text-orange-500 drop-shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                    : "text-gray-400"
                    }`}
                >
                  <div className="relative">
                    <Icon size={20} />
                    {item.hasCart && cartItemCount > 0 && (
                      <span className="absolute -top-1 -right-2 bg-orange-600 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {cartItemCount > 99 ? '99+' : cartItemCount}
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-400">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Cart Sidebar */}
      <Cart open={isCartOpen} onOpenChange={setIsCartOpen} />

      {/* Floating WA - Direct render, no wrapper */}
      {!isAdminOrVendor && (
        <div className="fixed bottom-[140px] right-4 md:bottom-[144px] md:right-8 z-[9999] flex flex-col gap-4 items-end">
          <FloatingWhatsApp />
        </div>
      )}
    </div>
  );
}
