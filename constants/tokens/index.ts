// Single import entry for all design tokens.
//
// Usage:
//   import { color, spacing, radius, typography, elevation, motion, glass } from '@/constants/tokens';
//
// Mascot size standard:
//   hero(180) / featured(120) / inline(56) / micro(28) / badge(18)

export { color } from './color';
export type { Color, RiskLevel, CheeseGradeKey } from './color';

export { spacing, minTouchSize } from './spacing';
export type { SpacingKey, SpacingValue } from './spacing';

export { radius } from './radius';
export type { RadiusKey } from './radius';

export { typography, fontFamilies } from './typography';
export type { TypographyKey } from './typography';

export { elevation } from './elevation';
export type { ElevationKey } from './elevation';

export { motion } from './motion';
export type { MotionDuration } from './motion';

export { glass } from './glass';
export type { GlassKey } from './glass';

export { darkColor } from './darkMode';

export const mascotSize = {
  hero: 180,
  featured: 120,
  inline: 56,
  micro: 28,
  badge: 18,
} as const;
export type MascotSizeKey = keyof typeof mascotSize;
