/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          light: '#f8fafc',
          dark: '#0b0f19'
        },
        card: {
          light: '#ffffff',
          dark: '#131926'
        },
        border: {
          light: '#e2e8f0',
          dark: '#1e293b'
        },
        primary: {
          DEFAULT: '#3b82f6',
          dark: '#2563eb'
        },
        accent: {
          emerald: '#10b981',
          violet: '#8b5cf6',
          rose: '#f43f5e',
          amber: '#f59e0b'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glass-light': '0 8px 32px 0 rgba(31, 38, 135, 0.05)',
        'glass-dark': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }
    },
  },
  plugins: [],
}
