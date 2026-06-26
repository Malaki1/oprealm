import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "#F6F2EA",
        "warm-cream": "#FFFDF7",
        sand: "#E6D6BE",
        seafoam: "#CFE1DC",
        sage: "#A7B59B",
        ocean: "#2F5066",
        navy: "#102B35",
        charcoal: "#2B2B2B",
        gold: "#C8A15A"
      },
      fontFamily: {
        serif: ["Georgia", "Cormorant Garamond", "Playfair Display", "serif"],
        sans: ["Inter", "Montserrat", "ui-sans-serif", "system-ui", "sans-serif"]
      },
      boxShadow: {
        premium: "0 22px 56px rgba(16, 43, 53, 0.14)",
        soft: "0 14px 34px rgba(16, 43, 53, 0.1)"
      },
      maxWidth: {
        content: "1240px"
      }
    }
  },
  plugins: []
};

export default config;
