import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0F172A", 800: "#1E293B", 700: "#334155" },
        canvas: "#F8FAFC",
        // navy — исторический алиас «глубокого индиго/графита»
        navy: {
          50: "#F1F5F9",
          100: "#E2E8F0",
          200: "#CBD5E1",
          400: "#64748B",
          600: "#334155",
          700: "#1E293B",
          800: "#0F172A",
          900: "#0B1120",
        },
        graphite: { 700: "#2b2f36", 800: "#1e2127", 900: "#0B1120" },
        mint: { 50: "#ECFDF5", 100: "#D1FAE5", 400: "#34D399", 500: "#10B981", 600: "#059669", 700: "#047857" },
      },
      fontFamily: {
        sans: ["Onest", "Segoe UI", "system-ui", "-apple-system", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 30px rgb(0 0 0 / 0.04)",
        card: "0 1px 2px rgb(15 23 42 / 0.04), 0 8px 30px rgb(0 0 0 / 0.04)",
        lift: "0 1px 2px rgb(15 23 42 / 0.06), 0 12px 40px -8px rgb(15 23 42 / 0.18)",
        phone: "0 0 0 2px #2a2a2e, 0 50px 100px -20px rgb(15 23 42 / 0.45), 0 30px 60px -30px rgb(0 0 0 / 0.5)",
      },
      keyframes: {
        dash: { to: { strokeDashoffset: "-20" } },
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      animation: {
        dash: "dash 1s linear infinite",
        shimmer: "shimmer 2.5s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
