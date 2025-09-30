/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // основной текст
        sans: ["Inter", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        // заголовки
        display: ["Montserrat", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // фирменный цвет приложения
        brand: {
          50:  "#effef7",
          100: "#d6fbe9",
          200: "#b0f5d8",
          300: "#7aebc2",
          400: "#40dca8",
          500: "#18c792",
          600: "#0ea57c",
          700: "#0e8666",
          800: "#0f6953",
          900: "#0d5444",
        },
      },
      boxShadow: {
        card: "0 8px 24px rgba(16, 185, 129, .12)",
      },
    },
  },
  plugins: [],
}
