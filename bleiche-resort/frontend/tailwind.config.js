/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#faf6f1', 100: '#f5ede3', 200: '#EEE5DA', 300: '#ddd0bf',
          400: '#C2A98C', 500: '#b09570', 600: '#8B6A43', 700: '#6d5234',
          800: '#503c26', 900: '#3a2b1b', 950: '#251c11',
        },
        dark: {
          50: '#f5f5f5', 100: '#ececec', 200: '#dedede', 300: '#a5a6a6',
          400: '#787978', 500: '#535353', 600: '#3a3a3a', 700: '#2d2d2d',
          800: '#222222', 900: '#1a1a1a', 950: '#111111',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif"', 'Georgia', 'serif'],
        sans: ['"Noto Sans"', 'Arial', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        doc: ['"Alegreya Sans"', '"Noto Sans"', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
