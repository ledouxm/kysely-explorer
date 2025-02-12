import { defineConfig } from "@pandacss/dev";

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}", "./pages/**/*.{js,jsx,ts,tsx}"],
  presets: ["@pandacss/preset-base"],
  // Files to exclude
  exclude: [],

  // Useful for theme customization
  theme: {
    extend: {
      tokens: {
        colors: {
          background: { value: "#313338" },
          "background-secondary": { value: "#2B2D31" },
          "background-tertiary": { value: "#1E1F22" },
          accent: { value: "#5865F2" },
          "text-primary": { value: "#FFFFFF" },
          "text-secondary": { value: "#B5BAC1" },
          "yellow-1": { value: "#FAA61A" },
          "yellow-2": { value: "#FEE75C" },
          "red-1": { value: "#ED4245" },
          "red-2": { value: "#F23F43" },
          "green-1": { value: "#57F287" },
          "green-2": { value: "#3BA55C" },
        },
      },
    },
  },

  jsxFramework: "react",

  // The output directory for your css system
  outdir: "styled-system",
});
