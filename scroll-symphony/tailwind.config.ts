import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-space)", "Space Grotesk", "Inter", "system-ui"]
      },
      colors: {
        obsidian: "#05070d",
        graphite: "#101521",
        electric: "#35a7ff",
        violet: "#8a5cff",
        cyan: "#42f5d7",
        auric: "#f6c65b",
        silver: "#b7c0d8"
      },
      boxShadow: {
        glow: "0 0 48px rgba(53, 167, 255, 0.26)",
        violet: "0 0 54px rgba(138, 92, 255, 0.3)",
        gold: "0 0 38px rgba(246, 198, 91, 0.22)"
      }
    }
  },
  plugins: []
};

export default config;
