import { Easing } from 'react-native';

export const motion = {
  duration: {
    fast: 150,
    base: 250,
    slow: 400,
    splash: 380,
  },
  easing: {
    standard:   Easing.bezier(0.4, 0, 0.2, 1),
    decelerate: Easing.out(Easing.cubic),
    accelerate: Easing.in(Easing.cubic),
  },
  // CSS-style for web
  cssEasing: {
    standard:   'cubic-bezier(0.4, 0, 0.2, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  },
  press: {
    scale: 0.97,
    opacity: 0.7,
    duration: 150,
  },
} as const;

export type MotionDuration = keyof typeof motion.duration;
