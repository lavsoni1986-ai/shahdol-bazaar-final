import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Enhanced PWA service worker registration for caching and installability
if ("serviceWorker" in navigator) {
  // Register service worker immediately (don't wait for page load)
  // This ensures PWA installability works correctly
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("✅ [PWA] Service Worker registered:", registration.scope);
        
        // Check for updates periodically
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker available
                console.log("🔄 [PWA] New service worker available - refresh to update");
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error("❌ [PWA] Service Worker registration failed:", error);
      });
  });
  
  // Also try to register immediately (for faster install prompt)
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        console.log("✅ [PWA] Service Worker pre-registered:", registration.scope);
      })
      .catch((error) => {
        console.error("❌ [PWA] Service Worker pre-registration failed:", error);
      });
  }
}
}