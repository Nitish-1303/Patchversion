import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#FFF8F3',
        surface: '#FFFFFF',
        ink: '#1A1A1A',
        accent: '#D14D2D',
        'accent-light': '#FFF0EB',
        'accent-muted': '#F5B7A6',
        rule: '#F0E6DE',
        'rule-strong': '#D7C6BA',
        'text-secondary': '#655C56',
        'text-tertiary': '#756B64',
        success: '#059669',
        'success-bg': '#ECFDF5',
        error: '#DC2626',
        'error-bg': '#FEF2F2',
        warning: '#D97706',
        'warning-bg': '#FFFBEB',
        'code-bg': '#1A1A1A',
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
