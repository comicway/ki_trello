/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // or 'media' or 'class'
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
      },
      colors: {
        'ki-orange': {
          DEFAULT: '#FF7900', // 100% (Not specified but implied)
          700: 'rgba(255, 121, 0, 0.7)', // 70%
          500: 'rgba(255, 121, 0, 0.5)', // 50%
          200: 'rgba(255, 121, 0, 0.2)', // 20%
        },
        'ki-blue': {
          DEFAULT: '#000429',
          700: 'rgba(0, 4, 41, 0.7)',
          500: 'rgba(0, 4, 41, 0.5)',
          200: 'rgba(0, 4, 41, 0.2)',
        },
        'ki-purple': {
          DEFAULT: '#731AF2',
          700: 'rgba(115, 26, 242, 0.7)',
          500: 'rgba(115, 26, 242, 0.5)',
          200: 'rgba(115, 26, 242, 0.2)',
        },
        'ki-pastel': {
          DEFAULT: '#8476FF',
          700: 'rgba(132, 118, 255, 0.7)',
          500: 'rgba(132, 118, 255, 0.5)',
          200: 'rgba(132, 118, 255, 0.2)',
        },
        'ki-pink': {
          DEFAULT: '#F8EFF9',
          700: 'rgba(248, 239, 249, 0.7)',
          500: 'rgba(248, 239, 249, 0.5)',
          200: 'rgba(248, 239, 249, 0.2)',
        },
        // Colores Secundarios
        'border-ki': {
          DEFAULT: '#404244',
          700: 'rgba(64, 66, 68, 0.7)',
          500: 'rgba(64, 66, 68, 0.5)',
          200: 'rgba(64, 66, 68, 0.2)',
        },
        'dark-blue': {
          DEFAULT: '#303234',
          700: 'rgba(48, 50, 52, 0.7)',
          500: 'rgba(48, 50, 52, 0.5)',
          200: 'rgba(48, 50, 52, 0.2)',
        },
        'ki-black': {
          DEFAULT: '#2A2C2E',
          700: 'rgba(42, 44, 46, 0.7)',
          500: 'rgba(42, 44, 46, 0.5)',
          200: 'rgba(42, 44, 46, 0.2)',
        },
        'light-gray': {
          DEFAULT: '#DBDBDB',
          700: 'rgba(219, 219, 219, 0.7)',
          500: 'rgba(219, 219, 219, 0.5)',
          200: 'rgba(219, 219, 219, 0.2)',
        },
        'pearl-white': {
          DEFAULT: '#ffffff',
          700: 'rgba(255, 255, 255, 0.7)',
          500: 'rgba(255, 255, 255, 0.5)',
          200: 'rgba(255, 255, 255, 0.2)',
        },
        // Colores Nuevos
        'live-yellow': '#FFB503',
        'deep-lavander': '#AC74F6',
        'cool-blue': '#00017D',
        // Alertas
        'alert-info': '#163AF9',
        'alert-danger': '#E11F32',
        'alert-warning': '#FFAA05',
        'alert-success': '#44BD38',
        'alert-hold': '#949494',
      },
    },
  },
  plugins: [],
}
