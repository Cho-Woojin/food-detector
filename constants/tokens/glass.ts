import { Platform, ViewStyle } from 'react-native';

// iOS 18+ Material (Liquid Glass). Web uses backdrop-filter; native falls back to translucent fill.

export const glass = {
  /** Tab bars, headers */
  regular: Platform.select({
    web: {
      backgroundColor: 'rgba(255,255,255,0.72)',
      // @ts-ignore — RN-Web passes through
      backdropFilter: 'saturate(180%) blur(20px)',
      WebkitBackdropFilter: 'saturate(180%) blur(20px)',
    },
    default: { backgroundColor: 'rgba(255,255,255,0.92)' },
  }) as ViewStyle,
  /** Modal sheets, alert backgrounds */
  thick: Platform.select({
    web: {
      backgroundColor: 'rgba(255,255,255,0.86)',
      // @ts-ignore
      backdropFilter: 'saturate(180%) blur(30px)',
      WebkitBackdropFilter: 'saturate(180%) blur(30px)',
    },
    default: { backgroundColor: 'rgba(255,255,255,0.96)' },
  }) as ViewStyle,
  /** Lightly floating cards */
  thin: Platform.select({
    web: {
      backgroundColor: 'rgba(255,255,255,0.55)',
      // @ts-ignore
      backdropFilter: 'saturate(150%) blur(12px)',
      WebkitBackdropFilter: 'saturate(150%) blur(12px)',
    },
    default: { backgroundColor: 'rgba(255,255,255,0.85)' },
  }) as ViewStyle,
} as const;

export type GlassKey = keyof typeof glass;
