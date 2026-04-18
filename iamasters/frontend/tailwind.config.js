/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f7ff',
          100: '#e8edff',
          500: '#5b6cff',
          600: '#4a58e8',
          700: '#3a46c2',
          900: '#1d2575',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
