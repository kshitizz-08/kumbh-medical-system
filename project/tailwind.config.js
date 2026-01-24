/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        kumbh: {
          saffron: '#FF9933', // Indian Saffron (Flag color)
          marigold: '#F4CA16', // Bright Marigold
          deep: '#800000', // Deep Maroon/Red (Holy color)
          river: '#138DFA', // Godavari River Blue
          sand: '#FFF5E1', // Light warm beige
        },
      },
      backgroundImage: {
        'kumbh-pattern': `linear-gradient(rgba(255, 245, 225, 0.95), rgba(255, 237, 213, 0.92)), url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ff9933' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        'kumbh-gradient': 'linear-gradient(135deg, #FF9933 0%, #FFB700 100%)',
      },
    },
  },
  plugins: [],
};
