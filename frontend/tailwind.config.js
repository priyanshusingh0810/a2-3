/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        background: "#ffffff",
        foreground: "#1d1d1f",
        "apple-gray": {
          50: "#f5f5f7",
          100: "#e5e5ea",
          200: "#d1d1d6",
          300: "#c7c7cc",
          400: "#aeaeb2",
          500: "#8e8e93",
          600: "#636366",
          700: "#48484a",
          800: "#3a3a3c",
          900: "#2c2c2e",
        }
      },
      boxShadow: {
        'apple': '0 4px 24px rgba(0, 0, 0, 0.04)',
        'apple-hover': '0 8px 32px rgba(0, 0, 0, 0.08)',
      }
    },
  },
  plugins: [],
}
