import { Switch, Route, useLocation, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";

import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/layout";
import { CartProvider } from "@/contexts/CartContext";
import InstallPWAButton from "@/components/InstallPWAButton";

// Pages
import Home from "@/pages/home";
import About from "@/pages/about";
import Contact from "@/pages/contact";
import Terms from "@/pages/terms";
import CategoryListing from "@/pages/category-listing";
import ShopDetail from "@/pages/shop-detail";
import ProductDetail from "@/pages/product-detail";
import Admin from "@/pages/admin";
import PartnerDashboard from "@/pages/partner-dashboard";
import PartnerProducts from "@/pages/partner-products";
import SellerOnboarding from "@/pages/seller-onboarding";
import AuthPage from "@/pages/auth";
import NotFound from "@/pages/not-found";
import Bus from "@/pages/bus";
import CustomerDashboard from "@/pages/customer-dashboard";

/* ---------- ✅ AUTH HOOK ---------- */
interface User {
  id: number | string;
  username?: string;
  name?: string;
  role: "customer" | "seller" | "admin" | "SUPER_ADMIN" | "MERCHANT" | "CITY_ADMIN" | "CUSTOMER";
  isAdmin?: boolean;
}

const useAuth = (): { isAuthenticated: boolean; user: User | null } => {
  try {
    const user = localStorage.getItem("user");
    const userData = user ? (JSON.parse(user) as User) : null;
    
    if (!userData) {
      return { isAuthenticated: false, user: null };
    }
    
    // CLIENT-SIDE AUTH HOOK: Explicitly set isAdmin if username is 'admin' or role is SUPER_ADMIN
    const isAdminUser = 
      userData.username === "admin" || 
      userData.role === "admin" || 
      userData.role === "SUPER_ADMIN" ||
      userData.isAdmin === true;
    
    // Normalize admin user data but don't write to localStorage on every render
    // Only return the normalized data - localStorage updates should happen in auth.tsx
    if (isAdminUser) {
      const adminUser = {
        ...userData,
        role: "admin" as const, // Normalize to "admin" for backward compatibility
        isAdmin: true,
      };
      
      // Only update localStorage if it's actually different (prevents infinite loops)
      const currentUserStr = localStorage.getItem("user");
      if (currentUserStr) {
        try {
          const currentUser = JSON.parse(currentUserStr);
          if (currentUser.role !== "admin" || currentUser.isAdmin !== true) {
            // Only update if actually needed
            localStorage.setItem("user", JSON.stringify(adminUser));
          }
        } catch {
          // If parsing fails, update it
          localStorage.setItem("user", JSON.stringify(adminUser));
        }
      }
      
      return {
        isAuthenticated: true,
        user: adminUser,
      };
    }
    
    return {
      isAuthenticated: !!userData,
      user: userData,
    };
  } catch (error) {
    console.error("❌ [useAuth] Error parsing user:", error);
    return { isAuthenticated: false, user: null };
  }
};

/* ---------- ✅ PROTECTED ROUTE ---------- */
interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<any>;
}

function ProtectedRoute({
  component: Component,
  ...rest
}: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const returnUrl = window.location.pathname;
  const [location] = useLocation();

  // Prevent redirect loops - don't redirect if already on /auth
  if (location === "/auth") {
    return <Route {...rest} component={Component} />;
  }

  // REDIRECT FIX: Check if this is admin route
  const isAdminRoute = location === "/admin";
  
  // PROTECTED ROUTE BYPASS: For /admin route, check localStorage DIRECTLY as PRIORITY
  // This ensures we always check the most up-to-date session data
  if (isAdminRoute) {
    let storedUser: any = null;
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        storedUser = JSON.parse(userStr);
      }
    } catch (e) {
      console.error("❌ [ProtectedRoute] Error parsing localStorage user:", e);
    }
    
    // PRIORITY CHECK: localStorage first (most reliable)
    if (storedUser) {
      const isAdminFromStorage = 
        storedUser.username === "admin" ||
        storedUser.role === "admin" ||
        storedUser.role === "SUPER_ADMIN" ||
        storedUser.isAdmin === true;
      
      if (isAdminFromStorage) {
        console.log("✅ [ProtectedRoute] ADMIN DETECTED FROM LOCALSTORAGE - Allowing access to /admin");
        console.log("🔵 [ProtectedRoute] Storage user data:", {
          username: storedUser.username,
          role: storedUser.role,
          isAdmin: storedUser.isAdmin
        });
        return <Route {...rest} component={Component} />;
      }
    }
    
    // FALLBACK CHECK: useAuth hook (if localStorage check didn't pass)
    const isAdminFromHook = 
      user?.username === "admin" ||
      user?.role === "admin" ||
      user?.role === "SUPER_ADMIN" ||
      user?.isAdmin === true ||
      (user as any)?.isAdmin === true;
    
    if (isAdminFromHook) {
      console.log("✅ [ProtectedRoute] ADMIN DETECTED FROM HOOK - Allowing access to /admin");
      return <Route {...rest} component={Component} />;
    }
    
    // DEBUG: Log why access was denied
    console.log("❌ [ProtectedRoute] Admin access DENIED:", {
      location,
      storedUser: storedUser ? { username: storedUser.username, role: storedUser.role } : null,
      hookUser: user ? { username: user.username, role: user.role, isAdmin: user.isAdmin } : null,
      localStorageExists: !!localStorage.getItem("user")
    });
    
    // Don't redirect if return URL is already /auth (prevents loops)
    const redirectUrl = returnUrl === "/auth" ? "/auth" : `/auth?return=${encodeURIComponent(returnUrl)}`;
    return <Redirect to={redirectUrl} />;
  }

  // For other protected routes, check authentication
  if (isAuthenticated) {
    return <Route {...rest} component={Component} />;
  } else {
    // Don't redirect if return URL is already /auth (prevents loops)
    const redirectUrl = returnUrl === "/auth" ? "/auth" : `/auth?return=${encodeURIComponent(returnUrl)}`;
    return <Redirect to={redirectUrl} />;
  }
}

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [location]);
  return null;
}

/* ---------- ✅ MAIN ROUTER ---------- */
function Router() {
  const [location] = useLocation();
  const isPartnerRoute =
    location === "/partner" || location.startsWith("/partner/");

  const content = (
    <>
      <ScrollToTop />

      <Switch>
        {/* Public Pages */}
        <Route path="/" component={Home} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/terms" component={Terms} />
        <Route path="/bus" component={Bus} />
        <Route path="/category/:slug" component={CategoryListing} />
        <Route path="/shop/:id" component={ShopDetail} />
        <Route path="/product/:id" component={ProductDetail} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/seller-onboarding" component={SellerOnboarding} />
        <Route path="/customer-dashboard" component={CustomerDashboard} />

        {/* Protected Routes */}
        <ProtectedRoute path="/admin" component={Admin} />
        <ProtectedRoute path="/partner" component={PartnerDashboard} />
        <ProtectedRoute
          path="/partner/dashboard"
          component={PartnerDashboard}
        />
        <ProtectedRoute
          path="/partner/products"
          component={PartnerProducts}
        />

        {/* 404 Page */}
        <Route component={NotFound} />
      </Switch>
    </>
  );

  // Partner routes don't use the main Layout (they have their own)
  if (isPartnerRoute) {
    return content;
  }

  return <Layout>{content}</Layout>;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CartProvider>
        <Toaster position="top-center" richColors />
        <Router />
        <InstallPWAButton />
      </CartProvider>
    </QueryClientProvider>
  );
}
