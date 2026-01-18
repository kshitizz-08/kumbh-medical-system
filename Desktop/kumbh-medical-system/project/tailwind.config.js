/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kumbh: {
          saffron: '#f97316', // warm saffron/orange
          deep: '#1d3557', // deep river blue
          marigold: '#fbbf24', // marigold yellow
          sand: '#fef3c7', // ghat sand
        },
      },
      backgroundImage: {
        'kumbh-sunrise':
          'radial-gradient(circle at 0 0, rgba(248, 250, 252, 0.9) 0, transparent 55%), radial-gradient(circle at 100% 0, rgba(253, 230, 138, 0.9) 0, transparent 55%), linear-gradient(to bottom right, #0f172a, #1d3557, #f97316)',
      },
    },
  },
  plugins: [],
};

