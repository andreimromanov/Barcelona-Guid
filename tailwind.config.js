/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // текст
        sans: ["Inter", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        // заголовки
        display: ["Montserrat", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // сине-бордовая палитра (FC Barcelona) + золото
        brand: {
          50:  "#f5f8ff",
          100: "#e6eeff",
          200: "#c8dbff",
          300: "#9ebfff",
          400: "#6f9bff",
          500: "#3d73f5",
          600: "#004D98", // blau
          700: "#003B7A",
          800: "#002B55",
          900: "#00183B",
        },
        accent: {
          500: "#A50044", // grana
          600: "#860036",
        },
        gold: {
          500: "#FDB913",
          600: "#E7A400",
        },
      },
      boxShadow: {
        card: "0 10px 28px rgba(0,77,152,.15)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
    },
  },
  plugins: [],
}
