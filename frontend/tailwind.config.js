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
          50: '#e6f7f7',
          100: '#ccefef',
          200: '#99dfdf',
          300: '#66cfcf',
          400: '#33bfbf',
          500: '#0A9396', // Main teal
          600: '#087577',
          700: '#065658',
          800: '#043839',
          900: '#021a1a',
        },
        secondary: {
          50: '#e6f2f2',
          100: '#cce6e6',
          200: '#99cccc',
          300: '#66b3b3',
          400: '#339999',
          500: '#005F73', // Dark teal
          600: '#004c5c',
          700: '#003945',
          800: '#00262e',
          900: '#001317',
        },
        accent: {
          50: '#f0f9f7',
          100: '#e1f3ef',
          200: '#c3e7df',
          300: '#a5dbcf',
          400: '#87cfbf',
          500: '#94D2BD', // Light mint
          600: '#76a896',
          700: '#587e70',
          800: '#3a544b',
          900: '#1c2a25',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}