import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sora', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        navy: {
          950: '#020817',
          900: '#0a1628',
          800: '#0f2040',
          700: '#162a54',
          600: '#1e3a6e',
        },
        emerald: {
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
        },
        amber: { 400: '#fbbf24', 500: '#f59e0b' },
        rose: { 400: '#fb7185', 500: '#f43f5e' },
      },
    },
  },
  plugins: [],
};

export default config;
