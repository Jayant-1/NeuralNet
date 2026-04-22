/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: '#0B0B0F',
          light: '#12121A',
          lighter: '#1A1A28',
          border: '#2A2A3A',
        },
        cyan: '#00F2FF',
        violet: '#8A2BE2',
        acid: '#00FF41',
        action: '#FF6B00',
        'text-primary': '#E0E0E8',
        'text-dim': '#6B6B80',
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card: '16px',
      },
      backdropBlur: {
        panel: '12px',
      },
    },
  },
  plugins: [],
};
