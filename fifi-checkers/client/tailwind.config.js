/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Luxury dark theme - blacks and golds
        luxury: {
          black: '#0a0a0a',
          dark: '#111111',
          card: '#1a1a1a',
          border: '#2a2a2a',
          muted: '#3a3a3a',
          text: '#888888',
          light: '#cccccc',
          white: '#f5f5f5',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Game colors
        game: {
          white: '#e8e8e8',
          black: '#1a1a1a',
          board: {
            light: '#2d2d2d',
            dark: '#1a1a1a',
          },
        },
        // Rank colors
        rank: {
          wood: '#8B7355',
          bronze: '#CD7F32',
          silver: '#C0C0C0',
          gold: '#FFD700',
          diamond: '#B9F2FF',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'shimmer': 'shimmer 2s linear infinite',
        'bounce-subtle': 'bounceSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(245, 158, 11, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(245, 158, 11, 0.6)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      boxShadow: {
        'gold': '0 0 20px rgba(245, 158, 11, 0.3)',
        'gold-lg': '0 0 40px rgba(245, 158, 11, 0.4)',
        'inner-gold': 'inset 0 0 20px rgba(245, 158, 11, 0.1)',
      }
    },
  },
  plugins: [],
}
