import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#007C76", dark: "#005C6D", deep: "#0A3F44", light: "#E0F0EE", mist: "#F3F8F7" },
        accent: { DEFAULT: "#3DAE5A", dark: "#2E9149" },
        ink: { DEFAULT: "#10312E", soft: "#5B6B69" },
      },
      fontFamily: {
        sans: ["'Be Vietnam Pro'", "sans-serif"],
      },
      borderRadius: { xl2: "1.25rem" },
      keyframes: {
        floaty: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-10px)" } },
      },
      animation: { floaty: "floaty 6s ease-in-out infinite" },
    },
  },
  plugins: [],
};
export default config;
