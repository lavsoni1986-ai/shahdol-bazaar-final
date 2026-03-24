/** @type {import('tailwindcss').Config} */
/* Tailwind v4 - Minimal config for IDE support */
export default {
  content: [
    "./index.html",
    "./client/**/*.{js,ts,jsx,tsx}",
    "./client/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
