export const validateEnv = () => {
  const apiUrl = import.meta.env.VITE_API_URL;
  
  if (apiUrl) {
    console.log("✅ [ENV] Sovereign Core Verified:", apiUrl);
  }
};
