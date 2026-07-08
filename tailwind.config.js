/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          50: '#F7F4ED',
          100: '#F4F1EA',
          200: '#EDE9DF',
          300: '#DDD8CE',
          400: '#C5C0B8',
          500: '#9A958F',
          600: '#6B6862',
          700: '#4A4743',
          800: '#2A2825',
          900: '#111111',
        },
        accent: {
          yellow: '#F5C518',
          orange: '#F07B18',
          red: '#D42E3A',
          magenta: '#8C2377',
          blue: '#1D4FAA',
          green: '#1A7A41',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
