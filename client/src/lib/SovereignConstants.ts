/**
 * 🛡️ BHARAT-OS: SOVEREIGN CONSTANTS
 * Centralized configuration for Multi-Tenant District SaaS.
 * ID_eff = API_Response ∨ Env_Variable ∨ 121
 * Priority: Backend → Frontend Context → ENV → THROW_ERROR
 */

const getEnvDistrictId = (): number => {
  const envId = import.meta.env.VITE_DEFAULT_DISTRICT_ID;
  if (envId !== undefined && envId !== null && envId !== "") {
    const parsed = parseInt(envId, 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
    console.warn("⚠️ VITE_DEFAULT_DISTRICT_ID is invalid, using fallback 121");
  }
  console.warn("⚠️ VITE_DEFAULT_DISTRICT_ID not set, using fallback 121");
  return 121;
};

const getEnvDistrictSlug = (): string => {
  const slug = import.meta.env.VITE_DEFAULT_DISTRICT_SLUG;
  return slug ?? "shahdol";
};

export const SOVEREIGN_CONFIG = {
   // 📍 Current Active District (from Environment)
   DEFAULT_DISTRICT_ID: getEnvDistrictId(),
   DEFAULT_DISTRICT_SLUG: getEnvDistrictSlug(),

  // 🗺️ Metadata
  DEFAULT_STATE: "Madhya Pradesh",

  // ⚙️ System Settings
  API_VERSION: "v1",
  DSSL_THRESHOLD: 70, // Minimum score for 'Trusted' badge

  // 🕒 Fallback Settings
  STORAGE_KEYS: {
    DISTRICT_ID: "current_district_id",
    DISTRICT_SLUG: "last_active_slug",
    THEME_CONFIG: "sovereign_theme"
  }
};

export const DISTRICT_THEMES: Record<number, { primary: string; secondary: string; glass: string; name: string }> = {
  121: { // Shahdol (DB ID)
    primary: "#f97316",
    secondary: "#fb923c",
    glass: "rgba(249, 115, 22, 0.1)",
    name: "Shahdol"
  },
  107: { // Anuppur (DB ID)
    primary: "#10b981",
    secondary: "#34d399",
    glass: "rgba(16, 185, 129, 0.1)",
    name: "Anuppur"
  },
  108: { // Umaria (DB ID)
    primary: "#8b5cf6",
    secondary: "#a78bfa",
    glass: "rgba(139, 92, 246, 0.1)",
    name: "Umaria"
  }
};

export const DISTRICT_AI_PERSONAS: Record<number, { name: string; greeting: string; voice: string }> = {
  121: { // Shahdol (DB ID)
    name: "शहडोल साथी",
    greeting: "नमस्ते लव भाई! शहडोल बाज़ार में आपका स्वागत है। मैं आपकी कैसे मदद करूँ?",
    voice: "hindi-female-soft"
  },
  107: { // Anuppur (DB ID)
    name: "अनूपपुर मित्र",
    greeting: "जय जोहार! अनूपपुर डिजिटल सर्विस में आपका स्वागत है। क्या ढूंढ रहे हैं आप?",
    voice: "hindi-male-bold"
  },
  108: { // Umaria (DB ID)
    name: "उमरिया सहायक",
    greeting: "नमस्ते! उमरिया बाज़ार में आपका स्वागत है। बताइए क्या चाहिए?",
    voice: "hindi-female-soft"
  }
};

export type DistrictPersona = typeof DISTRICT_AI_PERSONAS[keyof typeof DISTRICT_AI_PERSONAS];

export type SovereignConfig = typeof SOVEREIGN_CONFIG;
export type DistrictTheme = typeof DISTRICT_THEMES[keyof typeof DISTRICT_THEMES];

// 🏆 TRUST BADGE SYSTEM
export function getTrustBadge(score: number): { label: string; color: string; icon: string } {
  if (score >= 80) return { label: "Trusted ⭐", color: "text-emerald-500", icon: "⭐" };
  if (score >= 60) return { label: "Reliable 👍", color: "text-blue-500", icon: "👍" };
  if (score >= 40) return { label: "Average", color: "text-yellow-500", icon: "⚖️" };
  return { label: "New", color: "text-gray-500", icon: "🆕" };
}