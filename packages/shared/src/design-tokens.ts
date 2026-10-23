// Design tokens: Patchversion original identity
// Clean, professional, developer-focused. Linear/Stripe/Vercel-inspired clarity.

export const colors = {
  background: '#FAFAF9',      // warm white
  surface: '#FFFFFF',          // card surfaces
  ink: '#111827',             // near-black, high contrast
  accent: '#4F46E5',          // indigo-600
  accentLight: '#EEF2FF',     // indigo-50 for backgrounds
  accentMuted: '#C7D2FE',     // indigo-200
  border: '#E5E7EB',          // gray-200, subtle borders
  borderStrong: '#D1D5DB',    // gray-300
  textSecondary: '#6B7280',   // gray-500
  textTertiary: '#9CA3AF',    // gray-400
  success: '#059669',         // emerald-600
  successBg: '#ECFDF5',       // emerald-50
  error: '#DC2626',           // red-600
  errorBg: '#FEF2F2',         // red-50
  warning: '#D97706',         // amber-600
  warningBg: '#FFFBEB',       // amber-50
  codeBg: '#1E1E2E',          // dark code blocks
  codeText: '#E2E8F0',        // light code text
} as const;

export const typography = {
  displayFont: 'Inter, system-ui, -apple-system, sans-serif',
  bodyFont: 'Inter, system-ui, -apple-system, sans-serif',
  monoFont: '"JetBrains Mono", "Fira Code", Consolas, monospace',
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
