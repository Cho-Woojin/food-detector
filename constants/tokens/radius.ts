// Corner radius scale. 14 / 10 / 6 are mapped to s/m/l/xl in code.

export const radius = {
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  pill: 999,
} as const;

export type RadiusKey = keyof typeof radius;
