/** @type {import('tailwindcss').Config} */
module.exports = {
  // CRITICAL FIX: Tell Tailwind to scan all your React files in the 'src' folder
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", 
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

