// Shared light palette for the trypatchbay site and dashboard.

export const colors = {
  background: '#F7F7FC',
  surface: '#FFFFFF',
  ink: '#141A39',
  accent: '#252B50',
  accentLight: '#E4E5F4',
  accentMuted: '#CFD1E8',
  border: '#DFE1EF',
  borderStrong: '#CFD1E8',
  textSecondary: '#4E5471',
  textTertiary: '#4E5471',
  success: '#252B50',
  successBg: '#E4E5F4',
  error: '#141A39',
  errorBg: '#E4E5F4',
  warning: '#252B50',
  warningBg: '#EFEFF9',
  codeBg: '#141A39',
  codeText: '#F7F7FC',
} as const;

export const typography = {
  displayFont: 'Manrope, Arial, sans-serif',
  bodyFont: 'Inter, Arial, sans-serif',
  monoFont: 'ui-monospace, SFMono-Regular, Consolas, monospace',
  tagline: 'Your APIs change. Your code adapts.',
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
  '4xl': '6rem',
} as const;

export const borderRadius = {
  sm: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
} as const;

