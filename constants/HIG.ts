// @deprecated Apple HIG token re-exports.
// Kept for backward compatibility. New code should import from `@/constants/tokens` directly.

import { color, spacing, radius, typography, elevation, motion, glass, minTouchSize } from './tokens';

export { spacing, radius, typography, elevation, motion, glass, minTouchSize };
export type { SpacingKey, RadiusKey, TypographyKey, ElevationKey } from './tokens';

// `hig` mirrors the previous shape used across screens.
// Surface/* keys are intentionally pointed at color.surface tokens — the previous
// flat-white scheme is replaced by canvas (gray) + subtle (white) per the redesign.
export const hig = {
  // Labels
  label:           color.text.primary,
  secondaryLabel:  color.text.secondary,
  tertiaryLabel:   color.text.tertiary,
  quaternaryLabel: color.text.quaternary,

  // Separators
  separator:       color.border.default,
  separatorOpaque: color.border.strong,

  // Backgrounds
  systemBackground:                  color.surface.subtle,
  secondarySystemBackground:         color.surface.canvas,
  tertiarySystemBackground:          color.surface.subtle,
  systemGroupedBackground:           color.surface.canvas,
  secondarySystemGroupedBackground:  color.surface.subtle,

  // Fills
  systemFill:           color.fill.primary,
  secondarySystemFill:  color.fill.secondary,
  tertiarySystemFill:   color.fill.tertiary,
  quaternarySystemFill: color.fill.quaternary,

  // Tint (brand)
  tint:      color.brand.primary,
  tintLight: color.brand.primarySoft,

  // System colors (HIG, light)
  systemRed:    color.status.danger,
  systemOrange: color.status.warning,
  systemYellow: '#FFCC00',
  systemGreen:  color.status.success,
  systemMint:   '#00C7BE',
  systemTeal:   '#30B0C7',
  systemCyan:   '#32ADE6',
  systemBlue:   color.status.info,
  systemIndigo: '#5856D6',
  systemPurple: color.owner.primary,
  systemPink:   '#FF2D55',
  systemBrown:  '#A2845E',

  // Grays
  systemGray:  color.status.neutral,
  systemGray2: '#AEAEB2',
  systemGray3: '#C7C7CC',
  systemGray4: '#D1D1D6',
  systemGray5: '#E5E5EA',
  systemGray6: color.surface.canvas,
} as const;

export const weightEmphasized = '600' as const;
export const weightSemibold = '600' as const;
