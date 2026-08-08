/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,jsx,ts,tsx}",
    "./src/components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#c3ff3d',
          coral: '#ff6b6b',
          dark: '#0b1120',
          light: '#f4f7ff',
          blue: '#2563eb',
          deep: '#1e3a8a',
        },
      },
    },
  },
  plugins: [],
};

