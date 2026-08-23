import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#006D77',
          'teal-light': '#83C5BE',
          coral: '#E29578',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F8F9FA',
          hover: '#F1F3F5',
        },
        text: {
          primary: '#1D1D1F',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        },
        success: '#2D6A4F',
        warning: '#E09F3E',
        error: '#D62828',
      },
    },
  },
  plugins: [],
};

export default config;
