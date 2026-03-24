export const validateEnv = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (!apiUrl) {
    console.warn("⚠️ [ENV] VITE_API_URL is missing. Proxy fallback active.");
  } else {
    console.log("✅ [ENV] Sovereign Core Verified:", apiUrl);
  }
};
