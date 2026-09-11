/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        jardin: {
          verde: '#23392E',
          fondo: '#FAF3E7',
          terracota: '#D9714E',
          terracotaOscuro: '#C15E3D',
          salvia: '#7C9473',
          mostaza: '#E8AC4F',
        },
      },
    },
  },
  plugins: [],
};
