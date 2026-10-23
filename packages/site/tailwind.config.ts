import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#FAFAF9',
        surface: '#FFFFFF',
        ink: '#111827',
        accent: '#4F46E5',
        'accent-light': '#EEF2FF',
        'accent-muted': '#C7D2FE',
        rule: '#E5E7EB',
        'rule-strong': '#D1D5DB',
        'text-secondary': '#6B7280',
        'text-tertiary': '#9CA3AF',
        success: '#059669',
        'success-bg': '#ECFDF5',
        error: '#DC2626',
        'error-bg': '#FEF2F2',
        warning: '#D97706',
        'warning-bg': '#FFFBEB',
        'code-bg': '#1E1E2E',
        'code-text': '#E2E8F0',
      },
      fontFamily: {
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};

export default config;
