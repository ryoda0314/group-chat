/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans JP', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        // LINE Colors
        line: {
          green: '#06C755',
          'green-dark': '#05a647',
        },
        // Chat colors
        chat: {
          bg: '#9bbbd4',
          mine: '#06C755',
          other: '#ffffff',
        },
        // UI colors
        surface: '#ffffff',
        muted: '#f7f7f7',
        border: '#e0e0e0',
      },
    },
  },
  plugins: [],
}
