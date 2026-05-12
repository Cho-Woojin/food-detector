/**
 * Image Asset Mapping for Food Detector
 */

// Mascots (7 poses)
export const Mascots = {
  ceremony: require('@/assets/mascots/ceremony.png'),
  search: require('@/assets/mascots/search.png'),
  warning: require('@/assets/mascots/warning.png'),
  thanks: require('@/assets/mascots/thanks.png'),
  empty: require('@/assets/mascots/empty.png'),
  badge: require('@/assets/mascots/badge.png'),
  weather: require('@/assets/mascots/weather.png'),
} as const;

export type MascotKey = keyof typeof Mascots;

// Cheese trophies (4 grades — rotten은 트랩 치즈)
export const Cheese = {
  gold: require('@/assets/cheese/gold.png'),
  silver: require('@/assets/cheese/silver.png'),
  bronze: require('@/assets/cheese/bronze.png'),
  rotten: require('@/assets/cheese/trap.png'),
} as const;

// SVG는 public/cheese/에 두고 정적 URL로 참조 (Expo web의 public dir이 root에서 서빙됨)
// require로 부르면 metro가 package.json 찾으려 해서 실패하는 케이스 있음
export const CheeseSvg = {
  gold: '/cheese/gold.svg',
  silver: '/cheese/silver.svg',
  bronze: '/cheese/bronze.svg',
  rotten: '/cheese/trap.svg',
} as const;

export type CheeseKey = keyof typeof Cheese;

// Logos (3 variants)
export const Logos = {
  appIcon: require('@/assets/logo/app_icon.png'),
  symbol: require('@/assets/logo/symbol.png'),
} as const;

// Onboarding (2 wide images)
export const Onboarding = {
  investigate: require('@/assets/onboarding/investigate.png'),
  celebrate: require('@/assets/onboarding/celebrate.png'),
} as const;

// Kakao 공식 로그인 버튼 — Kakao Developers 가이드라인 자산.
// wide: 텍스트 포함 버튼 (가로 6.67:1, "카카오 로그인" 텍스트 임베드)
// narrow: 텍스트 없는 길쭉형
// 정사각형: 심볼만 (large/medium/small)
export const Kakao = {
  loginLargeWide:    require('@/assets/kakao/kakao_login_large_wide.png'),
  loginMediumWide:   require('@/assets/kakao/kakao_login_medium_wide.png'),
  loginLargeNarrow:  require('@/assets/kakao/kakao_login_large_narrow.png'),
  loginMediumNarrow: require('@/assets/kakao/kakao_login_medium_narrow.png'),
  loginLarge:        require('@/assets/kakao/kakao_login_large.png'),
  loginMedium:       require('@/assets/kakao/kakao_login_medium.png'),
  loginSmall:        require('@/assets/kakao/kakao_login_small.png'),
} as const;