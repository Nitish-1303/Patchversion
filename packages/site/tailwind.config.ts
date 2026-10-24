import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#F5F4FD',
        surface: '#FFFFFF',
        ink: '#111534',
        navy: '#2E335B',
        'navy-deep': '#111534',
        accent: '#2E335B',
        'accent-light': '#ECEEF9',
        'accent-muted': '#CDD0E5',
        pale: '#DFE7F9',
        rule: '#E3E5F3',
        'rule-strong': '#C6C9E0',
        'text-secondary': '#565B78',
        'text-tertiary': '#666C8A',
        success: '#047857',
        'success-bg': '#ECFDF5',
        error: '#DC2626',
        'error-bg': '#FEF2F2',
        warning: '#92400E',
        'warning-bg': '#FFFBEB',
        'code-bg': '#111534',
        'code-text': '#C9CFE8',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Manrope', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['var(--font-body)', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
      maxWidth: {
        content: '1200px',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      boxShadow: {
        soft: '0 24px 60px -24px rgba(17, 21, 52, 0.25)',
        card: '0 8px 30px -12px rgba(17, 21, 52, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
