// Shared motion tokens - one easing/duration language across the site.
export const EASE = [0.22, 1, 0.36, 1] as const;

export const DURATION = {
  fast: 0.2, // hovers, icon rotations
  base: 0.4, // accordion, menu
  slow: 0.7, // section reveals
} as const;

export const STAGGER = 0.08; // seconds between siblings
