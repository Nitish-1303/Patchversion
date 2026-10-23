// Design tokens: warm light editorial
// Used by both the site and any rendered artifacts.

export const colors = {
  background: '#FAF7F4',      // warm off-white
  ink: '#1C1917',             // near-black
  accent: '#C96F4A',          // terracotta
  accentMuted: '#E8DDD5',     // muted terracotta for backgrounds
  surface: '#FFFFFF',          // card surfaces
  border: '#D6CFC9',          // 1px rules
  textSecondary: '#6B6560',   // secondary text
  success: '#2D7A4F',         // green for verified
  error: '#B33929',           // red for failures
  warning: '#D4A017',         // amber for warnings
} as const;

export const typography = {
  displayFont: 'Satoshi, system-ui, sans-serif',
  bodyFont: 'Inter, system-ui, sans-serif',
  serifFont: '"Instrument Serif", Georgia, serif',
  brandLine: 'Your code keeps up.',
} as const;

export const spacing = {
  xs: '0.25rem',
  sm: '0.5rem',
  md: '1rem',
  lg: '1.5rem',
  xl: '2rem',
  '2xl': '3rem',
  '3xl': '4rem',
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
} as const;
