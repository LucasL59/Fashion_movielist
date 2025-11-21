/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fdf7f2',
          100: '#f7ece1',
          200: '#efdbc6',
          300: '#e2c2a6',
          400: '#d4a887',
          500: '#c28b69',
          600: '#a97053',
          700: '#8a5943',
          800: '#6f4737',
          900: '#57392c',
        },
      },
    },
  },
  plugins: [],
}
