/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        tavern: {
          900: '#1a120b',
          800: '#2a1d12',
          700: '#3b2a1a',
          600: '#5a4027',
          500: '#7a5a39',
        },
      },
    },
  },
  plugins: [],
};
