/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans:    ['"Outfit"', 'system-ui', 'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
      },
      animation: {
        'shimmer':     'shimmer 1.8s linear infinite',
        'spin-slow':   'spin 3s linear infinite',
        'pulse-glow':  'pulseGlow 2.4s ease-in-out infinite',
        'slide-up':    'slideUp 0.4s cubic-bezier(0.22,1,0.36,1) both',
        'fade-in':     'fadeIn 0.35s ease both',
        'scan':        'scan 1.8s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-400% 0' },
          '100%': { backgroundPosition: '400% 0' },
        },
        pulseGlow: {
          '0%,100%': { opacity: '0.6' },
          '50%':     { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        scan: {
          '0%,100%': { transform: 'translateX(-100%)' },
          '50%':     { transform: 'translateX(400%)' },
        },
      },
    },
  },
  plugins: [],
}
