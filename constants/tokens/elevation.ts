import { Platform, StyleSheet, ViewStyle } from 'react-native';
import { color } from './color';

// 4 elevation levels + flat (border-only). Pick exactly one per surface.

export const elevation = {
  none: {} as ViewStyle,

  /** Hairline border, no shadow — menu groups, info rows */
  flat: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: color.border.default,
  } as ViewStyle,

  /** Tiny shadow — search bar, chip active */
  subtle: Platform.select({
    web: { boxShadow: '0 1px 2px rgba(0,0,0,0.03)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.03,
      shadowRadius: 2,
      elevation: 0.5,
    },
  }) as ViewStyle,

  /** Standard card on canvas — soft, low-key depth */
  card: Platform.select({
    web: { boxShadow: '0 2px 6px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.03)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 6,
      elevation: 1.5,
    },
  }) as ViewStyle,

  /** Floating interactive — FAB, modal, sticky CTA */
  raised: Platform.select({
    web: { boxShadow: '0 4px 12px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04)' },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.06,
      shadowRadius: 10,
      elevation: 3,
    },
  }) as ViewStyle,
} as const;

export type ElevationKey = keyof typeof elevation;
