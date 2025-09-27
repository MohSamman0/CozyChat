/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cozy: {
          // Warm oranges
          orange: {
            50: '#fef7ed',
            100: '#fdedd3',
            200: '#fbd7a5',
            300: '#f8ba6d',
            400: '#f49532',
            500: '#f17b0c',
            600: '#e15d07',
            700: '#bb420a',
            800: '#95350f',
            900: '#782c10',
          },
          // Soft browns
          brown: {
            50: '#f8f6f3',
            100: '#ede9e0',
            200: '#ddd4c1',
            300: '#c8b89a',
            400: '#b49a73',
            500: '#a68559',
            600: '#97744d',
            700: '#7e5f42',
            800: '#67503a',
            900: '#544231',
          },
          // Cream whites
          cream: {
            50: '#fefdfb',
            100: '#fef9f0',
            200: '#fcf1dd',
            300: '#f9e4be',
            400: '#f5d393',
            500: '#f0be68',
            600: '#e8a547',
            700: '#d18b34',
            800: '#ac6f2e',
            900: '#8b5a2a',
          },
          // Muted golds
          gold: {
            50: '#fefce8',
            100: '#fef9c3',
            200: '#fef08a',
            300: '#fde047',
            400: '#facc15',
            500: '#eab308',
            600: '#ca8a04',
            700: '#a16207',
            800: '#854d0e',
            900: '#713f12',
          },
          // Cozy greens
          green: {
            50: '#f0fdf4',
            100: '#dcfce7',
            200: '#bbf7d0',
            300: '#86efac',
            400: '#4ade80',
            500: '#22c55e',
            600: '#16a34a',
            700: '#15803d',
            800: '#166534',
            900: '#14532d',
          },
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'breathe': 'breathe 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        breathe: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.02)' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
    },
  },
  plugins: [],
}
