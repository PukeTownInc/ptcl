/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        toxic: {
          50: '#e6ffe6',
          100: '#ccffcc',
          200: '#99ff99',
          300: '#66ff66',
          400: '#39ff14',
          500: '#2ee60c',
          600: '#24bf0a',
          700: '#1b9908',
          800: '#127305',
          900: '#0a4d03',
        },
        radioactive: {
          50: '#ffffe6',
          100: '#ffffcc',
          200: '#ffff99',
          300: '#ffff66',
          400: '#ffff33',
          500: '#ffff00',
          600: '#cccc00',
          700: '#999900',
          800: '#666600',
          900: '#333300',
        },
        hazard: {
          amber: '#ffb700',
          orange: '#ff7a00',
          red: '#ff2d2d',
        },
        ink: {
          900: '#050505',
          850: '#0a0a0a',
          800: '#101010',
          700: '#161616',
          600: '#1e1e1e',
          500: '#2a2a2a',
          400: '#3a3a3a',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'system-ui', 'sans-serif'],
        body: ['Rajdhani', 'system-ui', 'sans-serif'],
        mono: ['Share Tech Mono', 'monospace'],
      },
      animation: {
        'spin-reel': 'spinReel 0.6s cubic-bezier(0.2, 0.8, 0.3, 1) forwards',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'slime-drip': 'slimeDrip 3s ease-in-out infinite',
        'shake': 'shake 0.5s ease-in-out',
        'pop': 'pop 0.4s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'jackpot': 'jackpot 0.8s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'count-up': 'countUp 0.6s ease-out',
        'hazard-stripe': 'hazardStripe 1s linear infinite',
      },
      keyframes: {
        spinReel: {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(-100%)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 8px #39ff14, 0 0 16px #39ff1480' },
          '50%': { boxShadow: '0 0 16px #39ff14, 0 0 32px #39ff14cc' },
        },
        slimeDrip: {
          '0%, 100%': { transform: 'translateY(0) scaleY(1)' },
          '50%': { transform: 'translateY(4px) scaleY(1.1)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px) rotate(-1deg)' },
          '75%': { transform: 'translateX(6px) rotate(1deg)' },
        },
        pop: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '70%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        jackpot: {
          '0%, 100%': { transform: 'scale(1) rotate(0deg)', filter: 'hue-rotate(0deg)' },
          '50%': { transform: 'scale(1.1) rotate(2deg)', filter: 'hue-rotate(30deg)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        countUp: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.3)', color: '#ffff00' },
          '100%': { transform: 'scale(1)' },
        },
        hazardStripe: {
          '0%': { backgroundPosition: '0 0' },
          '100%': { backgroundPosition: '40px 0' },
        },
      },
    },
  },
  plugins: [],
};
