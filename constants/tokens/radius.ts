// Corner radius scale.
// 토스/배민 영향 — 카드 24~32, 작은 요소 10~14 사이. 둥글둥글한 친근한 인상.

export const radius = {
  s: 10,
  m: 14,
  l: 20,
  xl: 24,   // 일반 카드 / 모달
  xxl: 32,  // 히어로 카드
  pill: 999,
} as const;

export type RadiusKey = keyof typeof radius;
