/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#b9ddfd",
          300: "#7cc2fb",
          400: "#36a3f7",
          500: "#0c87eb",
          600: "#026ac8",
          700: "#0354a2",
          800: "#074885",
          900: "#0c3d6e",
          950: "#082749",
        },
        surface: {
          light: "#ffffff",
          subtle: "#f8fafc",
          border: "#e2e8f0",
          dark: "#0f172a",
          cardDark: "#1e293b",
        },
        financial: {
          income: "#10b981",
          expense: "#f43f5e",
          transfer: "#6366f1",
          refund: "#06b6d4",
          warning: "#f59e0b",
          goal: "#8b5cf6",
        },
      },
    },
  },
  plugins: [],
};
