import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:      "#0a0a0a",
        surface: "#141414",
        card:    "#1c1c1e",
        hover:   "#252528",
        border:  "#2c2c2e",
        muted:   "#3a3a3c",
        subtle:  "#636366",
        dim:     "#8e8e93",
        text:    "#f2f2f7",
        primary: "#3b82f6",
        "primary-dim": "#1d4ed8",
        success: "#30d158",
        danger:  "#ff453a",
      },
      boxShadow: {
        // Sleek-minimal elevation: inset hairline highlight + soft drop
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 1px 2px rgba(0,0,0,0.4)",
        "card-hover": "0 1px 0 0 rgba(255,255,255,0.06) inset, 0 4px 16px rgba(0,0,0,0.5)",
        float: "0 8px 32px rgba(0,0,0,0.6), 0 1px 0 0 rgba(255,255,255,0.05) inset",
      },
      transitionTimingFunction: {
        "out-soft": "cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        "slide-up": {
          from: { transform: "translateY(12px)", opacity: "0" },
          to:   { transform: "translateY(0)",    opacity: "1" },
        },
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to:   { transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "scale-in": {
          from: { transform: "scale(0.96)", opacity: "0" },
          to:   { transform: "scale(1)",    opacity: "1" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "pop-in": {
          "0%":   { transform: "scale(0.6)", opacity: "0" },
          "60%":  { transform: "scale(1.08)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
      animation: {
        "slide-up": "slide-up 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        "sheet-up": "sheet-up 0.28s cubic-bezier(0.16, 1, 0.3, 1)",
        "fade-in":  "fade-in 0.18s ease-out",
        "scale-in": "scale-in 0.16s cubic-bezier(0.16, 1, 0.3, 1)",
        "pop-in":   "pop-in 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
        shimmer:    "shimmer 1.4s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
