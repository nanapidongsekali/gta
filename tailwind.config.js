/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pricedown: ['"Impact"', '"Arial Black"', 'sans-serif'],
        bankgothic: ['"Trebuchet MS"', '"Arial Narrow"', 'sans-serif'],
        diploma: ['"Georgia"', '"Times New Roman"', 'serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
    },
  },
  plugins: [],
};
