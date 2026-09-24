/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        jardin: {
          // Verdes
          verde: '#23392E',
          verdeOscuro: '#1A2B22',
          // Fondos crema
          fondo: '#FAF3E7',
          crema: '#F1E7D6',
          // Acentos
          terracota: '#D9714E',
          terracotaOscuro: '#C15E3D',
          salvia: '#7C9473',
          mostaza: '#E8AC4F',
          // Bordes
          borde: '#E4DCCD',
          // Estados (badges, alertas y mensajes de los paneles)
          success: '#3C5A45',
          successBg: '#EEF4EB',
          errorBg: '#FDF0EA',
          errorBorder: '#E8B4A0',
          pendingBg: '#FBF1DC',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Inter', 'Arial', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 220ms ease-out both',
      },
    },
  },
  plugins: [],
};
