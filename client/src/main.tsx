import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { validateEnv } from "./lib/env-check";

validateEnv();

const CLEAN_URL = (url: string) => url.replace(/(:\d+|:undefined|:null|:nan)(\/?\?|$)/g, "$2");

const DEFAULT_DISTRICT_ID = 3;
const DEFAULT_DISTRICT_SLUG = "shahdol";

function resolveDistrictContext() {
  const storedId = Number(localStorage.getItem("districtId") || DEFAULT_DISTRICT_ID);
  const districtId = (Number.isInteger(storedId) && storedId > 0) ? storedId : DEFAULT_DISTRICT_ID;
  const districtSlug = localStorage.getItem("districtSlug") || DEFAULT_DISTRICT_SLUG;
  
  localStorage.setItem("districtId", String(districtId));
  localStorage.setItem("districtSlug", districtSlug);
  return { districtId, districtSlug };
}

if (typeof window !== "undefined" && !(window as any).__tenantFetchInstalled) {
  (window as any).__tenantFetchInstalled = true;
  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    
    url = CLEAN_URL(url);

    if (url.includes("/api/districts/bus") || url.includes("/api/districts/undefined")) {
       url = url.replace("/api/districts/bus", "/api/districts/shahdol")
                .replace("/api/districts/undefined", "/api/districts/shahdol");
    }

    if (url.includes("/api/")) {
      const { districtId, districtSlug } = resolveDistrictContext();
      const headers = new Headers(init?.headers || {});
      headers.set("x-district-id", String(districtId));
      headers.set("x-district-slug", districtSlug);
      
      return originalFetch(url, { ...init, headers });
    }

    return originalFetch(url, init);
  };
}

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator) {
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
}
