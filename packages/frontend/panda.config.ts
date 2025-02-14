import { defineConfig } from "@pandacss/dev";
import { theme } from "./src/theme";

export default defineConfig({
  // Whether to use css reset
  preflight: true,

  // Where to look for your css declarations
  include: ["./src/**/*.{js,jsx,ts,tsx}", "./pages/**/*.{js,jsx,ts,tsx}"],
  presets: ["@pandacss/preset-base"],
  // Files to exclude
  exclude: [],

  // Useful for theme customization
  theme: { extend: theme },

  jsxFramework: "react",

  globalCss: {
    extend: {
      ".monaco-editor-background, .monaco-editor .margin": {
        backgroundColor: "background-tertiary !important",
      },
      "*:focus-visible": {
        outline: "none !important",
      },
    },
  },

  // The output directory for your css system
  outdir: "styled-system",
});
