import type { Transition, Variants } from 'motion/react';

/*
 * Material 3 Expressive spring motion for Framer Motion.
 *
 * These mirror the CSS `--md-sys-motion-spring-*` tokens in styles/theme.css.
 * The M3 spec (Material Design token v34.0.21) publishes each spring as a
 * stiffness + damping-ratio pair; Framer wants an absolute damping coefficient,
 * so with mass = 1 we use  damping = 2 * ratio * sqrt(stiffness).
 *
 *   spatial springs -> damping ratio 0.9 (a whisper of overshoot, for movement)
 *   effects springs -> damping ratio 1.0 (no overshoot, for opacity/color)
 *   bouncy*         -> Wallwize additions with visible overshoot for hero moments
 */
const spring = (stiffness: number, damping: number): Transition => ({
  type: 'spring',
  stiffness,
  damping,
  mass: 1,
});

export const springs = {
  spatialFast: spring(1400, 67.35),
  spatialDefault: spring(700, 47.62),
  spatialSlow: spring(300, 31.18),
  effectsFast: spring(3800, 123.29),
  effectsDefault: spring(1600, 80),
  effectsSlow: spring(800, 56.57),
  bouncy: spring(520, 26.45),
  bouncySoft: spring(360, 25.05),
} as const;

/** Container that staggers its children's spring reveals. */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.04 },
  },
};

/** A child that rises and settles with a lively bounce. Pair with staggerContainer. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 26, scale: 0.9 },
  show: { opacity: 1, y: 0, scale: 1, transition: springs.bouncy },
};

/** Fade + rise reveal for a single element, with visible spring settle. */
export const reveal: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: springs.bouncy },
};

/** Pop-in used for badges, chips, and small accents. */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.5 },
  show: { opacity: 1, scale: 1, transition: springs.bouncy },
};

/** Shared whileHover / whileTap for expressive pressables. */
export const pressableHover = { scale: 1.04 } as const;
export const pressableTap = { scale: 0.9 } as const;
