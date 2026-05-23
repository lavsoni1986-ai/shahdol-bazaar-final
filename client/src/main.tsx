import { createRoot } from "react-dom/client";
import React from "react";
import App from "./App";
import "./index.css";
import { validateEnv } from "./lib/env-check";

validateEnv();

class GlobalErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any) {
    console.error("GLOBAL CRASH:", error);
  }

  render() {
    if (this.state.hasError) {
      return <CrashFallback />;
    }

    return this.props.children;
  }
}

function CrashFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-black text-white">
      <h1 className="text-2xl font-bold text-red-500 mb-2">
        ⚠️ System Glitch Detected
      </h1>
      <p className="text-gray-400 mb-4">
        Sovereign Engine recovered safely
      </p>

      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 bg-orange-500 rounded-lg font-bold"
      >
        Reboot UI
      </button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>
);

// 🛡️ SERVICE WORKER - DISABLED TO PREVENT CACHING ISSUES
// Unregister any existing service workers
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      console.log("🔧 Unregistering service worker:", registration.scope);
      registration.unregister();
    });
  });
}

// 🛡️ SERVICE WORKER - ONLY register in PRODUCTION, NOT in dev
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  console.log("🔧 [PROD] Service Worker enabled");
  let registrationPromise: Promise<ServiceWorkerRegistration> | null = null;

  const registerSW = () => {
    if (registrationPromise) return registrationPromise;

    registrationPromise = navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("✅ [PWA] Service Worker registered:", registration.scope);

        const handleUpdate = () => {
          const newWorker = registration.installing;
          if (newWorker) {
            const handleStateChange = () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log("🔄 [PWA] New service worker available - refresh to update");
              }
              newWorker.removeEventListener('statechange', handleStateChange);
            };
            newWorker.addEventListener('statechange', handleStateChange);
          }
          registration.removeEventListener('updatefound', handleUpdate);
        };

        registration.addEventListener('updatefound', handleUpdate);
        return registration;
      })
      .catch((error) => {
        console.error("❌ [PWA] Service Worker registration failed:", error);
        registrationPromise = null;
        throw error;
      });

    return registrationPromise;
  };

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    registerSW();
  } else {
    window.addEventListener("load", registerSW, { once: true });
  }
} else if ("serviceWorker" in navigator) {
  console.log("🔧 [DEV] Service Worker disabled - dev mode active");
}
