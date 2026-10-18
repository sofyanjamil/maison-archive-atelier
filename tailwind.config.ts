import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: {
          50: "#FAF7F0",
          100: "#F5EFE2",
          200: "#ECE2CC",
          300: "#DFD0B0",
          400: "#CBB68C",
        },
        espresso: {
          950: "#0E0C0A",
          900: "#171411",
          800: "#241F1A",
          700: "#352E27",
          600: "#4A4037",
          500: "#6B5E51",
        },
        brass: {
          300: "#DFC07A",
          400: "#C8A456",
          500: "#B08A3A",
          600: "#8F6D28",
        },
        oxblood: {
          500: "#7A2822",
          600: "#631D18",
          700: "#4C1410",
        },
        sage: {
          500: "#3B4D3E",
          600: "#2C3B2F",
        },
      },
      fontFamily: {
        serif: ["var(--font-cormorant)", "Georgia", "serif"],
        display: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        archive: "0 10px 30px -10px rgba(23, 20, 17, 0.12), 0 2px 6px -1px rgba(23, 20, 17, 0.06)",
        "archive-hover": "0 20px 45px -12px rgba(23, 20, 17, 0.22), 0 4px 12px -2px rgba(23, 20, 17, 0.1)",
        stamp: "inset 0 0 0 1px rgba(176, 138, 58, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
