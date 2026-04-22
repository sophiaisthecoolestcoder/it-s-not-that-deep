/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,mjs,ts,tsx,md,mdx}"],
  theme: {
    extend: {
      // Palette matches the platform's brand tokens so guests who move from
      // the website to the platform (or vice-versa) feel they're in the same
      // world.
      colors: {
        sand: {
          50: "#FAF0EA",
          100: "#EEE5DA",
          200: "#E4D5C3",
          300: "#D4BFA5",
          400: "#C2A98C", // primary accent, matches `brand400` in platform
          500: "#B09577",
          600: "#8B6A43", // bronze hover
          700: "#6D5336",
        },
        ink: {
          50: "#F5F5F5",
          100: "#ECECEC",
          200: "#D9D9D9",
          300: "#A5A6A6",
          400: "#787978",
          500: "#535353", // primary text
          600: "#2E2E2E",
        },
        amber: {
          soft: "#FAC429",
          softer: "#FAC255",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', "Georgia", "serif"],
        serif: ['"Noto Serif"', "Georgia", "serif"],
        sans: ['"Noto Sans"', "system-ui", "sans-serif"],
      },
      letterSpacing: {
        widest: "0.2em",
      },
      transitionTimingFunction: {
        "out-slow": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      animation: {
        "fade-up": "fadeUp 900ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "fade-in": "fadeIn 1200ms ease-out both",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
