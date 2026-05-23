/** @type {import('tailwindcss').Config} */
/* Tailwind v4 - Minimal config for IDE support */
export default {
  content: [
    "./index.html",
    "./client/**/*.{js,ts,jsx,tsx}",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#ea580c",
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
          500: "#f97316",
          600: "#ea580c",
          700: "#c2410c",
          800: "#9a3412",
          900: "#7c2d12",
          950: "#431407",
        },
      },
      fontSize: {
        // 🏛️ BHARAT-OS: SEMANTIC TYPOGRAPHY TOKENS
        // Maps to design/typography.ts 16-level scale
        display: ["clamp(2.25rem,5vw,3.5rem)", { lineHeight: "1.1", fontWeight: "900" }],
        heading1: ["clamp(1.5rem,3vw,2.25rem)", { lineHeight: "1.15", fontWeight: "800" }],
        heading2: ["clamp(1.25rem,2.5vw,1.75rem)", { lineHeight: "1.2", fontWeight: "700" }],
        productTitle: ["clamp(1rem,2vw,1.25rem)", { lineHeight: "1.3", fontWeight: "700" }],
        price: ["clamp(1.125rem,2vw,1.375rem)", { lineHeight: "1.2", fontWeight: "900" }],
        priceLarge: ["clamp(1.5rem,3vw,2rem)", { lineHeight: "1.1", fontWeight: "900" }],
        discountBadge: ["clamp(0.75rem,1.5vw,0.875rem)", { lineHeight: "1", fontWeight: "800" }],
        label: ["clamp(0.625rem,1.2vw,0.75rem)", { lineHeight: "1.2", fontWeight: "700" }],
        trustLabel: ["clamp(0.5625rem,1vw,0.6875rem)", { lineHeight: "1.2", fontWeight: "600" }],
        caption: ["clamp(0.5625rem,1vw,0.625rem)", { lineHeight: "1.2", fontWeight: "700" }],
        body: ["clamp(0.8125rem,1.5vw,0.9375rem)", { lineHeight: "1.5", fontWeight: "400" }],
        bodySmall: ["clamp(0.6875rem,1.2vw,0.8125rem)", { lineHeight: "1.4", fontWeight: "400" }],
        ctaText: ["clamp(0.6875rem,1.2vw,0.8125rem)", { lineHeight: "1.2", fontWeight: "900" }],
        ctaSmall: ["clamp(0.5625rem,1vw,0.6875rem)", { lineHeight: "1.2", fontWeight: "900" }],
        storeName: ["clamp(0.875rem,1.5vw,1rem)", { lineHeight: "1.2", fontWeight: "800" }],
        districtInfo: ["clamp(0.5625rem,1vw,0.6875rem)", { lineHeight: "1.2", fontWeight: "500" }],
      },
      borderRadius: {
        "sovereign-sm": "0.5rem",
        "sovereign-md": "0.75rem",
        "sovereign-lg": "1rem",
        "sovereign-xl": "1.25rem",
        "sovereign-2xl": "1.5rem",
        "sovereign-3xl": "2rem",
        "sovereign-full": "9999px",
      },
      boxShadow: {
        "sovereign-subtle": "0 1px 2px rgba(0,0,0,0.05)",
        "sovereign-elevated": "0 4px 12px rgba(0,0,0,0.1)",
        "sovereign-card": "0 4px 20px rgba(0,0,0,0.12)",
        "sovereign-modal": "0 20px 60px rgba(0,0,0,0.3)",
        "sovereign-glow": "0 0 40px rgba(249,115,22,0.15)",
        "sovereign-glowStrong": "0 0 60px rgba(249,115,22,0.25)",
      },
    },
  },
  plugins: [],
}
