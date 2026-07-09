/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#14171F',
        panel: '#1B1F29',
        panelBorder: '#2A2F3B',
        paper: '#F3F1EC',
        ink: '#1C1C1C',
        muted: '#A8AFC0',
        gold: '#E8B34C',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        syncpulse: {
          '0%': { boxShadow: '0 0 0 0 rgba(232,179,76,0.55)' },
          '70%': { boxShadow: '0 0 0 10px rgba(232,179,76,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(232,179,76,0)' },
        },
      },
      animation: {
        syncpulse: 'syncpulse 0.9s ease-out',
      },
    },
  },
  plugins: [],
};
