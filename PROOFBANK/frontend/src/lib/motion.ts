/**
 * Motion conventions for ProofBank.
 *
 * Rules from the build spec: common interactions land in roughly
 * 150–250 ms, motion reflects real system state, reduced-motion is
 * honoured, and nothing animates perpetually or hides missing data.
 */

export const durations = {
  fast: 0.15,
  base: 0.2,
  slow: 0.25,
} as const;

export const easing = {
  standard: [0.2, 0, 0, 1] as const,
  emphasized: [0.2, 0, 0, 1] as const,
};

/** Page-level entrance: content settles in, nothing flashes. */
export const pageVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.base, ease: easing.standard },
  },
} as const;

/** Staggered list reveal for tables and feeds. */
export const listVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
} as const;

export const listItemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.fast, ease: easing.standard },
  },
} as const;

/** Row highlight when genuinely new activity arrives. */
export const highlightKeyframes = {
  backgroundColor: ['transparent', 'color-mix(in oklab, #990d81 8%, white)'],
};

/** Reusable transition objects. */
export const transition = {
  fast: { duration: durations.fast, ease: easing.standard },
  base: { duration: durations.base, ease: easing.standard },
  slow: { duration: durations.slow, ease: easing.standard },
} as const;

/** Whether the user asked the OS to reduce motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
