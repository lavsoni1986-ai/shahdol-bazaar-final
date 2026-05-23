import { Route, useLocation, Switch, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import React, { lazy, Suspense, useEffect, useState, ComponentType, memo, useRef } from "react";

import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/layout";
import { CartProvider } from "@/contexts/CartContext";

import { AuthProvider, useAuth, getClientRoleRedirectPath } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { DistrictProvider } from "@/contexts/DistrictContext";
import SuperAIHome from "./pages/SuperAIHome";
import { LiquidRoute } from "@/components/LiquidMotion";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";
import ShahdolAIAssistant from "@/components/ShahdolAIAssistant";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// OneSignal App ID - Replace with your actual OneSignal App ID from OneSignal dashboard
// Get your App ID from: https://dashboard.onesignal.com/apps
// Leave empty to disable push notifications
const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || "";

// OneSignal Initialization Component
function OneSignalInit() {
  if (!ONESIGNAL_APP_ID) return null;
  const { isAuthenticated, user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  // Consolidated OneSignal initialization and prompt logic
  useEffect(() => {
    const initOneSignal = async () => {
      // Check if already initialized or prompted
      const alreadyPrompted = localStorage.getItem("onesignal_prompted");
      if (alreadyPrompted || isInitialized) return;

      try {
        const OneSignal = (window as any).OneSignal;
        if (!OneSignal || !ONESIGNAL_APP_ID) return;

        // Initialize OneSignal if not already done
        if (!isInitialized) {
          await OneSignal.init({
            appId: ONESIGNAL_APP_ID,
            allowLocalhostAsSecureOrigin: true,
            welcomeNotification: { disable: true },
            path: "/OneSignalSDKWorker.js",
            serviceWorkerParam: { scope: "/" },
            serviceWorkerPath: "OneSignalSDKWorker.js",
          });
          setIsInitialized(true);
        }

        // Show prompt - either immediately (if logged in) or after delay
        const shouldPromptNow = isAuthenticated && user;
        const delay = shouldPromptNow ? 2000 : 30000; // 2s after login, 30s otherwise

        setTimeout(async () => {
          try {
            await OneSignal.showSlidedownPrompt();
            localStorage.setItem("onesignal_prompted", "true");
          } catch {
            // User dismissed or blocked - don't ask again
            localStorage.setItem("onesignal_prompted", "true");
          }
        }, delay);
      } catch (error) {
        console.warn("OneSignal initialization skipped:", error);
        localStorage.setItem("onesignal_prompted", "true");
      }
    };

    // Small delay to ensure DOM is ready
    const timer = setTimeout(initOneSignal, 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user, isInitialized]);

  return null;
}

const BusTimetable = lazy(() => import("@/pages/BusTimetable"));
const CategoryListing = lazy(() => import("@/pages/category-listing"));
const MarketplaceStores = lazy(() => import("@/pages/marketplace-stores"));
const MarketplaceStore = lazy(() => import("@/pages/marketplace-store"));
const MarketplaceProduct = lazy(() => import("@/pages/marketplace-product"));
// ✅ Old VendorDashboard is gone. Now using PartnerDashboard only.
const VendorRegister = lazy(() => import("@/pages/vendor-register"));
const PartnerDashboard = lazy(() => import("@/pages/partner-dashboard"));
const MyOrders = lazy(() => import("@/pages/MyOrders"));
const Marketplace = lazy(() => import("@/pages/marketplace"));
const SchoolsPage = lazy(() => import("@/pages/SchoolsPage"));
const HospitalsPage = lazy(() => import("@/pages/hospitals"));
const ServicesPage = lazy(() => import("@/pages/ServicesPage"));
const EducationPage = lazy(() => import("@/pages/EducationPage"));
const CartPage = lazy(() => import("@/pages/cart"));
const Checkout = lazy(() => import("@/pages/checkout"));
const OrderSuccess = lazy(() => import("@/pages/order-success"));
const CheckoutSuccess = lazy(() => import("@/pages/CheckoutSuccess"));
const PaymentVerifyPage = lazy(() => import("@/pages/PaymentVerifyPage"));
const AuthPage = lazy(() => import("./pages/auth"));
const MerchantOnboarding = lazy(() => import("@/pages/merchant-onboarding"));
const NotFound = lazy(() => import("@/pages/not-found"));

// Keep legacy routes but they're secondary
const SchoolLandingPage = lazy(() => import("@/pages/school"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const ServiceDetail = lazy(() => import("@/pages/ServiceDetail"));
const ShopDetail = lazy(() => import("@/pages/shop-detail"));
const About = lazy(() => import("@/pages/about"));
const Contact = lazy(() => import("@/pages/contact"));
const Terms = lazy(() => import("@/pages/terms"));
const Admin = lazy(() => import("@/pages/admin"));
const CustomerDashboard = lazy(() => import("@/pages/customer-dashboard"));
const PricingPlans = lazy(() => import("@/components/PricingPlans"));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
  </div>
);

/* ---------- AUTH GUARD COMPONENT ---------- */
/**
 * AuthGuard - Redirects authenticated users away from public pages (like /auth)
 * Uses authState to prevent routing loops
 */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { authState, isAuthenticated, user } = useAuth();
  const [, setLocation] = useLocation();
  const isAuthPage = window.location.pathname === '/auth';
  const redirectSentRef = useRef(false);

  // Clean redirect effect - only runs once when auth state is resolved
  useEffect(() => {
    // Skip if auth is still loading or not on auth page or already redirected
    if (authState === 'loading' || !isAuthPage || redirectSentRef.current) return;
    
    // If user is authenticated, redirect to appropriate dashboard
    if (authState === 'authenticated' && user) {
      redirectSentRef.current = true;
      
      // ✅ Use utility function for role-based redirect
      console.log("🛡️ [APP GUARD] User Object:", user);
      const target = getClientRoleRedirectPath(user);
      console.log("🚀 [APP GUARD] Target Path:", target);
      setLocation(target);
    }
  }, [authState, isAuthenticated, user, setLocation, isAuthPage]);

  // Show loader while checking auth
  if (authState === 'loading') {
    return <PageLoader />;
  }

  // If authenticated on auth page, show loader (redirect is in progress)
  if (authState === 'authenticated' && isAuthPage) {
    return <PageLoader />;
  }

  // Not authenticated - show the auth form
  return <>{children}</>;
}

/* ---------- PROTECTED ROUTE GUARD ---------- */
function ProtectedRouteGuard({ 
  path, 
  component: Component,
  requiredRole 
}: { 
  path: string; 
  component: ComponentType;
  requiredRole?: string | string[];
}) {
  const { authState, user } = useAuth();

  // Simple boolean check for SUPER_ADMIN - consolidated role logic
  const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.role === "superadmin" || user?.role === "admin" || user?.isAdmin === true;

  // During loading, show loader
  if (authState === 'loading') {
    return <PageLoader />;
  }

  // Not authenticated - redirect to auth
  if (authState === 'unauthenticated') {
    return <Redirect to="/auth" />;
  }

  // If SUPER_ADMIN, render the component directly without further checks
  if (isSuperAdmin) {
    return <Component />;
  }

  // For other roles, check requiredRole - consolidated logic
  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRole = roles.some(r => 
      r.toUpperCase() === user?.role?.toUpperCase()
    );
    
    if (!hasRole) {
      return <Redirect to="/" />;
    }
  }

  return <Component />;
}

// Hospital redirect component
function HospitalRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/marketplace-stores?type=healthcare");
  }, [setLocation]);
  return null;
}

// Shop redirect component
function ShopRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/marketplace-stores?type=product");
  }, [setLocation]);
  return null;
}

/* ---------- MAIN ROUTER ---------- */
const Router = () => {
  const [location] = useLocation();
  const locationKey = location;
  
  console.log("🔍 ROUTER: Current path =", location, "| Mode:", import.meta.env.MODE);
  
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch >
        {/* 🏠 SUPER AI HOME - BharatOS Command Center */}
        <Route path="/">
          <LiquidRoute location={locationKey}>
            <SuperAIHome />
          </LiquidRoute>
        </Route>
        <Route path="/home">
          <LiquidRoute location={locationKey}>
            <SuperAIHome />
          </LiquidRoute>
        </Route>
        
        {/* 👥 CUSTOMER DASHBOARD - Must come BEFORE :slug routes (wouter routes are exact by default) */}
        <Route path="/customer-dashboard">
          <ProtectedRouteGuard path="/customer-dashboard" component={CustomerDashboard} />
        </Route>
        
        {/* 🚌 BUS - Transport */}
        <Route path="/bus" component={BusTimetable} />
        
        {/* 🏥 HOSPITALS - Healthcare */}
        <Route path="/hospitals" component={HospitalsPage} />
        
        {/* 🔧 SERVICES - Plumbers, Electricians, Carpenters */}
        <Route path="/services" component={ServicesPage} />
        
        {/* 🎓 EDUCATION - Schools, Colleges, Coaching */}
        <Route path="/education" component={EducationPage} />
        
        {/* 🏢 VENDOR - Partner Portal */}
        <Route path="/vendor/register" component={VendorRegister} />
        <Route path="/vendor/dashboard">
          <Redirect to="/partner" />
        </Route>
        <Route path="/partner">
          <ProtectedRouteGuard component={PartnerDashboard} requiredRole={["seller", "merchant", "vendor", "admin", "SUPER_ADMIN"]} />
        </Route>
        
        {/* � SHOPS - Marketplace Stores */}
        <Route path="/shops">
          <ShopRedirect />
        </Route>
        
        {/* 🏪 MARKETPLACE STORES - Browse all stores */}
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/marketplace/stores" component={MarketplaceStores} />
        <Route path="/marketplace-stores" component={MarketplaceStores} />
        <Route path="/marketplace/store/:slug" component={MarketplaceStore} />
        <Route path="/marketplace/product/:id" component={MarketplaceProduct} />
        <Route path="/cart" component={CartPage} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/payment/verify" component={PaymentVerifyPage} />
        <Route path="/order-success" component={OrderSuccess} />
        <Route path="/checkout-success" component={CheckoutSuccess} />
        <Route path="/my-orders" component={MyOrders} />
        
        {/* 🏫 SCHOOLS - Top Schools in Shahdol */}
        <Route path="/schools" component={SchoolsPage} />
        
        {/* 🔍 SEARCH - Products/Shops */}
        <Route path="/search" component={CategoryListing} />
        
        {/* 🏪 MERCHANT - Onboarding (PUBLIC - No Auth Required) */}
        <Route path="/merchant/onboarding" component={MerchantOnboarding} />
        
        {/* 🔐 AUTH - Login/Signup */}
        <Route path="/auth">
          <AuthGuard>
            <AuthPage />
          </AuthGuard>
        </Route>
        
        {/* 📚 LEGACY ROUTES */}
        <Route path="/school/:slug" component={SchoolLandingPage} />
        <Route path="/service/:type/:slug" component={ServiceDetail} />
        <Route path="/product/:id" component={ProductDetail} />
        <Route path="/shop/:id" component={ShopDetail} />
        <Route path="/vendor/:slug" component={ShopDetail} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/terms" component={Terms} />
        <Route path="/pricing" component={PricingPlans} />
        
        {/* 👥 DASHBOARDS (Protected) */}
        <Route path="/admin">
          <ProtectedRouteGuard path="/admin" component={Admin} requiredRole={["admin", "superadmin", "SUPER_ADMIN"]} />
        </Route>
        <Route path="/admin/:district">
          <ProtectedRouteGuard path="/admin/:district" component={Admin} requiredRole={["admin", "superadmin", "SUPER_ADMIN", "cityadmin", "CITY_ADMIN"]} />
        </Route>
        
        
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
      <DistrictProvider>
        <BrandingProvider>
          <AuthProvider>
            <CartProvider>
              <Toaster position="top-center" richColors />
              <OneSignalInit />
              <Layout>
                <Router />
              </Layout>
              <ShahdolAIAssistant />
              <FloatingWhatsApp />
            </CartProvider>
          </AuthProvider>
        </BrandingProvider>
      </DistrictProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
