import { Route, useLocation, Switch, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import React, { lazy, Suspense, useEffect, useState, ComponentType, useRef } from "react";

import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/sonner";
import { Layout } from "@/components/layout";
import { CartProvider } from "@/contexts/CartContext";

import { AuthProvider, useAuth, getClientRoleRedirectPath } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingProvider";
import { DistrictProvider } from "@/contexts/DistrictContext";
import SuperAIHome from "./pages/SuperAIHome";
import { LiquidRoute } from "@/components/LiquidMotion";
import { FloatingWhatsApp } from "@/components/FloatingWhatsApp";

import { ErrorBoundary } from "@/components/ErrorBoundary";

const ONESIGNAL_APP_ID = import.meta.env.VITE_ONESIGNAL_APP_ID || "";

function OneSignalInit() {
  if (!ONESIGNAL_APP_ID) return null;

  const { isAuthenticated, user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initOneSignal = async () => {
      const alreadyPrompted = localStorage.getItem("onesignal_prompted");
      if (alreadyPrompted || isInitialized) return;

      try {
        const OneSignal = (window as any).OneSignal;
        if (!OneSignal || !ONESIGNAL_APP_ID) return;

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

        const shouldPromptNow = isAuthenticated && user;
        const delay = shouldPromptNow ? 2000 : 30000;

        setTimeout(async () => {
          try {
            await OneSignal.showSlidedownPrompt();
            localStorage.setItem("onesignal_prompted", "true");
          } catch {
            localStorage.setItem("onesignal_prompted", "true");
          }
        }, delay);
      } catch (error) {
        console.warn("OneSignal initialization skipped:", error);
        localStorage.setItem("onesignal_prompted", "true");
      }
    };

    const timer = setTimeout(initOneSignal, 100);
    return () => clearTimeout(timer);
  }, [isAuthenticated, user, isInitialized]);

  return null;
}

/* ===================== LAZY PAGES ===================== */

const BusTimetable = lazy(() => import("@/pages/BusTimetable"));
const CategoryListing = lazy(() => import("@/pages/category-listing"));

const PartnerDashboard = lazy(() => import("@/pages/partner-dashboard"));
const MyOrders = lazy(() => import("@/pages/MyOrders"));
const Marketplace = lazy(() => import("@/pages/marketplace"));
const AIConciergePage = lazy(() => import("@/pages/ai-concierge"));
const SchoolsPage = lazy(() => import("@/pages/schools"));
const HospitalsPage = lazy(() => import("@/pages/hospitals"));
const ServicesPage = lazy(() => import("@/pages/services"));
const ServiceDetail = lazy(() => import("@/pages/ServiceDetail"));
const CartPage = lazy(() => import("@/pages/cart"));
const Checkout = lazy(() => import("@/pages/checkout"));
const OrderSuccess = lazy(() => import("@/pages/order-success"));
const CheckoutSuccess = lazy(() => import("@/pages/CheckoutSuccess"));
const PaymentOrderStatus = lazy(() => import("@/pages/payment-order-status"));
const AuthPage = lazy(() => import("./pages/auth"));
const NotFound = lazy(() => import("@/pages/not-found"));

const ProductDetail = lazy(() => import("@/pages/product-detail"));
const ShopDetail = lazy(() => import("@/pages/shop-detail"));
const About = lazy(() => import("@/pages/about"));
const Contact = lazy(() => import("@/pages/contact"));
const Terms = lazy(() => import("@/pages/terms"));
const Admin = lazy(() => import("@/pages/admin/Admin"));
const CustomerDashboard = lazy(() => import("@/pages/customer-dashboard"));
const PricingPlans = lazy(() => import("@/components/PricingPlans"));

/* ===================== LOADER ===================== */

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
  </div>
);

/* ===================== AUTH GUARD ===================== */

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { authState, user } = useAuth();
  const [, setLocation] = useLocation();
  const isAuthPage = window.location.pathname === "/auth";
  const redirectSentRef = useRef(false);

  useEffect(() => {
    if (authState === "loading" || !isAuthPage || redirectSentRef.current) return;

    if (authState === "authenticated" && user) {
      redirectSentRef.current = true;
      const target = getClientRoleRedirectPath(user);
      setLocation(target);
    }
  }, [authState, user, setLocation, isAuthPage]);

  if (authState === "loading") return <PageLoader />;
  if (authState === "authenticated" && isAuthPage) return <PageLoader />;

  return <>{children}</>;
}

/* ===================== PROTECTED GUARD ===================== */

function ProtectedRouteGuard({
  component: Component,
  requiredRole
}: {
  component: ComponentType;
  requiredRole?: string | string[];
}) {
  const { authState, user } = useAuth();

  // Lightweight auth guard observability
  console.log('🔐 [ROUTE GUARD] authState=', authState, 'user=', user?.username, 'role=', user?.role, 'requiredRole=', requiredRole);

  const isSuperAdmin =
    (user?.role || '').toString().toUpperCase() === "SUPER_ADMIN" ||
    (user?.role || '').toString().toUpperCase() === "ADMIN";

  if (authState === "loading") {
    return <PageLoader />;
  }

  if (authState === "guest") {
    return <Redirect to="/auth" />;
  }

  if (isSuperAdmin) {
    return <Component />;
  }

  if (requiredRole) {
    const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRole = roles.some(
      (r) => r.toUpperCase() === user?.role?.toUpperCase()
    );

    if (!hasRole) {
      console.log('⛔ [ROUTE GUARD] access denied for user=', user?.username, 'required=', roles);
      return <Redirect to="/" />;
    }

    console.log('✅ [ROUTE GUARD] access granted for user=', user?.username);
  }

  return <Component />;
}

/* ===================== SMALL REDIRECT HELPERS ===================== */

function ShopRedirect() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    setLocation("/marketplace");
  }, [setLocation]);

  return null;
}

/* ===================== MAIN ROUTER ===================== */

const Router = () => {
  const [location] = useLocation();
  const locationKey = location;

  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
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

        <Route path="/customer-dashboard">
          <ProtectedRouteGuard component={CustomerDashboard} />
        </Route>

        <Route path="/bus" component={BusTimetable} />
        <Route path="/bus-timetable" component={BusTimetable} />
        <Route path="/:district/bus-timetable" component={BusTimetable} />
        <Route path="/:district/bus" component={BusTimetable} />
        <Route path="/hospitals" component={HospitalsPage} />
        <Route path="/:district/hospitals" component={HospitalsPage} />
        <Route path="/services" component={ServicesPage} />
        <Route path="/:district/services" component={ServicesPage} />
        <Route path="/education"><Redirect to="/schools" /></Route>

        <Route path="/vendor/register">  <Redirect to="/auth?role=partner&mode=register" /></Route>
        <Route path="/vendor/dashboard">
          <Redirect to="/partner" />
        </Route>

        <Route path="/partner/dashboard">
          <ProtectedRouteGuard
            component={PartnerDashboard}
            requiredRole={["MERCHANT", "SELLER", "VENDOR", "admin", "SUPER_ADMIN"]}
          />
        </Route>
        <Route path="/partner">
          <Redirect to="/partner/dashboard" />
        </Route>

        <Route path="/shops">
          <ShopRedirect />
        </Route>

        <Route path="/marketplace" component={Marketplace} />
        <Route path="/marketplace/stores/:slug" component={ShopDetail} />
        <Route path="/marketplace/products/:id" component={ProductDetail} />
        <Route path="/:district/partner/:slug" component={ShopDetail} />
        <Route path="/:district/product/:slug" component={ProductDetail} />
        <Route path="/:district/service/:slug" component={ServiceDetail} />
        <Route path="/:district/ai/concierge" component={AIConciergePage} />
        <Route path="/ai/concierge" component={AIConciergePage} />
        <Route path="/cart" component={CartPage} />
        <Route path="/checkout" component={Checkout} />
        <Route path="/payment/verify" component={PaymentOrderStatus} />
        <Route path="/payment/status/:orderId" component={PaymentOrderStatus} />
        <Route path="/order-success" component={OrderSuccess} />
        <Route path="/checkout-success" component={CheckoutSuccess} />
        <Route path="/my-orders" component={MyOrders} />

        <Route path="/schools" component={SchoolsPage} />
        <Route path="/search" component={CategoryListing} />
        <Route path="/:district/search" component={CategoryListing} />

        <Route path="/auth">
          <AuthGuard>
            <AuthPage />
          </AuthGuard>
        </Route>

        <Route path="/school/:slug" component={SchoolsPage} />
        <Route path="/service/:type/:slug" component={ServicesPage} />
        <Route path="/product/:id" component={ProductDetail} />
        <Route path="/shop/:id" component={ShopDetail} />
        <Route path="/vendor/:slug" component={ShopDetail} />
        <Route path="/about" component={About} />
        <Route path="/contact" component={Contact} />
        <Route path="/terms" component={Terms} />
        <Route path="/pricing" component={PricingPlans} />

        <Route path="/admin/moderation">
          <ProtectedRouteGuard
            component={Admin}
            requiredRole={["admin", "superadmin", "SUPER_ADMIN", "cityadmin", "CITY_ADMIN"]}
          />
        </Route>

        <Route path="/admin">
          <ProtectedRouteGuard
            component={Admin}
            requiredRole={["admin", "superadmin", "SUPER_ADMIN"]}
          />
        </Route>

        <Route path="/admin/:district">
          <ProtectedRouteGuard
            component={Admin}
            requiredRole={["admin", "superadmin", "SUPER_ADMIN", "cityadmin", "CITY_ADMIN"]}
          />
        </Route>

        <Route path="*">
          <NotFound />
        </Route>
      </Switch>
    </Suspense>
  );
};

/* ===================== APP ROOT ===================== */

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
                <FloatingWhatsApp />
              </CartProvider>
            </AuthProvider>
          </BrandingProvider>
        </DistrictProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}