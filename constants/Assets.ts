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