import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#F7F7FC',
        surface: '#FFFFFF',
        navy: '#252B50',
        'navy-deep': '#141A39',
        lavender: '#E4E5F4',
        'lavender-mid': '#CFD1E8',
        rule: '#DFE1EF',
        'text-secondary': '#4E5471',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Manrope', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
      },
      maxWidth: { content: '1160px' },
      borderRadius: { '4xl': '2rem' },
    },
  },
  plugins: [],
};

export default config;
