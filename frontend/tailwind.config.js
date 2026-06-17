/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#25D366",
          dark: "#128C7E",
          darker: "#075E54"
        }
      }
    }
  },
  plugins: []
};
