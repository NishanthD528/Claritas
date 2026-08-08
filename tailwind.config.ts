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
        // Calm, clinical palette. Deep teal accent on white.
        ink: "#0f172a", // near-navy text
        accent: {
          DEFAULT: "#0f766e", // dark teal
          hover: "#115e59",
          soft: "#ccfbf1",
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
