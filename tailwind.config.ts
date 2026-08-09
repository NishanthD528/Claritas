import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Trustworthy, engaging palette. Confident blue accent on white.
        ink: "#0f172a", // near-navy text
        accent: {
          DEFAULT: "#2563eb", // blue-600
          hover: "#1d4ed8", // blue-700
          soft: "#dbeafe", // blue-100
          deep: "#1e3a8a", // blue-900, for dark blue sections
        },
        danger: {
          DEFAULT: "#b91c1c",
          soft: "#fee2e2",
        },
        ok: {
          DEFAULT: "#15803d",
          soft: "#dcfce7",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
