/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0B0F19',
        surface: '#1A1F2E',
        primary: '#4F46E5', // Indigo-600
        secondary: '#10B981', // Emerald-500
        accent: '#F59E0B', // Amber-500
      }
    },
  },
  plugins: [],
}
