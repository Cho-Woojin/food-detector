import { Platform, TextStyle } from 'react-native';

// Pretendard via web CSS variable; native falls back to system font.
const fontFamily = Platform.select({
  web: 'Pretendard Variable, Pretendard, -apple-system, BlinkMacSystemFont, system-ui, Roboto, "Helvetica Neue", "Apple SD Gothic Neo", "Noto Sans KR", sans-serif',
  default: undefined,
});

const t = (
  size: number,
  lineHeight: number,
  weight: TextStyle['fontWeight'] = '400',
  letterSpacing?: number,
): TextStyle => ({
  fontSize: size,
  lineHeight,
  fontWeight: weight,
  fontFamily,
  ...(letterSpacing !== undefined ? { letterSpacing } : null),
});

export const typography = {
  /** 28/34 700 — screen titles */
  title: t(28, 34, '700', -0.3),
  /** 44/48 800 — score, risk-level large label */
  display: t(44, 48, '800', -1),
  /** 17/22 600 — section headers, card titles, restaurant name */
  headline: t(17, 22, '600'),
  /** 17/22 400 — body content */
  body: t(17, 22, '400'),
  /** 17/22 600 — emphasized body */
  bodyEmphasized: t(17, 22, '600'),
  /** 15/20 400 — labels, secondary content */
  subheadline: t(15, 20, '400'),
  /** 15/20 600 — emphasized subheadline */
  subheadlineEmphasized: t(15, 20, '600'),
  /** 12/16 400 — meta, captions */
  caption: t(12, 16, '400'),
  /** 12/16 600 — emphasized caption */
  captionEmphasized: t(12, 16, '600'),
  /** 11/14 500 — micro meta, timestamps */
  footnote: t(11, 14, '500'),
} as const;

export const fontFamilies = { default: fontFamily } as const;

export type TypographyKey = keyof typeof typography;
