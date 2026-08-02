/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './entrypoints/**/*.{html,ts,tsx}',
    './src/**/*.{html,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f4ff',
          100: '#e0e9fe',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#1e1b4b',
        },
        surface: {
          dark: '#0f172a',
          card: '#1e293b',
          border: '#334155',
          light: '#f8fafc',
          lightCard: '#ffffff',
        }
      }
    },
  },
  plugins: [],
}
