// Food Detector — legacy color exports.
// @deprecated Prefer `@/constants/tokens` for new code. Keys here are kept for
// backward compatibility during Phase 1 of the redesign migration; values are
// mapped to the unified token system.

import { color } from './tokens/color';

// Re-export tokens so call sites can gradually move to the new API.
export { color, spacing, radius, typography, elevation, motion, glass, mascotSize, minTouchSize } from './tokens';
export type { RiskLevel, CheeseGradeKey, SpacingKey, RadiusKey, TypographyKey, ElevationKey, MascotSizeKey } from './tokens';

const tintColorLight = color.brand.primary;
const tintColorDark = color.brand.primaryHover;

export const palette = {
  // ===== Brand =====
  primaryGreen: color.brand.primary,
  subGreen:     color.brand.primaryHover,
  lightGreen:   '#D5F5E3',

  primaryYellow: color.brand.secondary,
  subYellow:     '#FFD662',
  lightYellow:   color.brand.secondarySoft,

  // ===== Status =====
  alertRed:      color.status.danger,
  alertRedLight: 'rgba(255,59,48,0.12)',

  infoBlue:      color.status.info,
  infoBlueLight: color.status.infoSoft,

  // ===== Surface =====
  white:   color.surface.subtle,
  bg:      color.surface.mascotBg,
  bgCard:  '#FAFAF7',
  surface: color.surface.subtle,

  // ===== Text =====
  text1:          color.text.primary,
  text2:          color.text.secondary,
  text3:          color.text.tertiary,
  textPrimary:    color.text.primary,
  textSecondary:  color.text.secondary,

  // ===== Border =====
  border:     color.border.default,
  borderDark: color.border.strong,

  // ===== Cheese grades =====
  gold:        color.cheese.GOLDEN.fg,
  goldLight:   color.cheese.GOLDEN.bg,
  silver:      color.cheese.SILVER.fg,
  silverLight: color.cheese.SILVER.bg,
  bronze:      color.cheese.BRONZE.fg,
  bronzeLight: color.cheese.BRONZE.bg,

  // ===== Risk levels (mapped to HIG system colors) =====
  riskGreen:       color.status.success,
  riskGreenLight:  color.status.successSoft,
  riskYellow:      color.risk[3].fg,
  riskYellowLight: color.risk[3].bg,
  riskOrange:      color.status.warning,
  riskOrangeLight: color.status.warningSoft,
  riskRed:         color.status.danger,
  riskRedLight:    color.status.dangerSoft,

  // ===== Legacy aliases =====
  accent:      color.brand.primary,
  accentLight: '#D5F5E3',
  accentDark:  color.brand.primaryHover,

  warn:        color.risk[3].fg,
  warnLight:   color.risk[3].bg,
  ok:          color.brand.primary,
  okLight:     '#D5F5E3',
  danger:      color.status.danger,
  dangerLight: color.status.dangerSoft,
  info:        color.status.info,
  infoLight:   color.status.infoSoft,

  // ===== Owner mode =====
  purple:      color.owner.primary,
  purpleLight: color.owner.primarySoft,

  // ===== Mascot =====
  mascotBg:     color.surface.mascotBg,
  mascotBorder: '#FFD662',
} as const;

// ===== Risk Level System (5 stages) =====
export const riskLevels = {
  1: {
    label: 'Calm',
    labelKr: '평온',
    emoji: '🟢',
    color: color.risk[1].fg,
    bgColor: color.risk[1].bg,
    mascot: 'weather' as const,
    message: '오늘은 마음 편히 외식해도 좋아요',
    messages: [
      '오늘은 마음 편히 외식해도 좋아요',
      '날씨가 식당하기 좋은 컨디션이에요',
      '평소처럼 회식·모임 즐겨도 좋아요',
    ],
  },
  2: {
    label: 'Good',
    labelKr: '양호',
    emoji: '🟢',
    color: color.risk[2].fg,
    bgColor: color.risk[2].bg,
    mascot: 'weather' as const,
    message: '평소처럼 즐겨도 좋아요',
    messages: [
      '평소처럼 즐겨도 좋아요',
      '대부분의 메뉴를 편하게 골라도 돼요',
      '오늘은 무난한 컨디션이에요',
    ],
  },
  3: {
    label: 'Caution',
    labelKr: '주의',
    emoji: '🟡',
    color: color.risk[3].fg,
    bgColor: color.risk[3].bg,
    mascot: 'warning' as const,
    message: '익힌 메뉴 위주로 골라봐요',
    messages: [
      '익힌 메뉴 위주로 골라봐요',
      '회식이라면 조리 메뉴를 추천해요',
      '점심엔 따뜻한 국물이 잘 맞아요',
      '날 음식은 다음 기회에 즐겨봐요',
    ],
  },
  4: {
    label: 'Alert',
    labelKr: '경계',
    emoji: '🟠',
    color: color.risk[4].fg,
    bgColor: color.risk[4].bg,
    mascot: 'warning' as const,
    message: '익힌 음식으로 안전하게 드세요',
    messages: [
      '익힌 음식으로 안전하게 드세요',
      '오늘은 충분히 가열한 메뉴를 추천해요',
      '뷔페보다는 단품 조리 메뉴가 안전해요',
      '실온 보관 음식은 다음에 만나봐요',
    ],
  },
  5: {
    label: 'Danger',
    labelKr: '위험',
    emoji: '🔴',
    color: color.risk[5].fg,
    bgColor: color.risk[5].bg,
    mascot: 'empty' as const,
    message: '오늘은 직접 조리하면 더 안전해요',
    messages: [
      '오늘은 직접 조리하면 더 안전해요',
      '집밥으로 가볍게 챙기는 날이에요',
      '회식·모임은 다음 기회에 즐겨봐요',
    ],
  },
} as const;

export function pickRiskMessage(level: 1 | 2 | 3 | 4 | 5): string {
  const stage = riskLevels[level];
  const list = stage.messages as readonly string[];
  if (list.length === 0) return stage.message;
  const now = new Date();
  const seed = now.getFullYear() * 1000 + now.getMonth() * 50 + now.getDate() + now.getHours();
  return list[seed % list.length];
}

export type EnvContext = {
  temp: number;
  humidity: number;
  foodPoisoning?: string;
};

const envSummary = (e: EnvContext) => `기온 ${e.temp}°C·습도 ${e.humidity}%`;

type Builder = (district: string, env: EnvContext) => string;

const RISK_TEMPLATES: Record<1 | 2 | 3 | 4 | 5, Builder[]> = {
  1: [
    (d) => `오늘 ${d}는 외식하기 좋은 컨디션이에요. 평소처럼 즐겨봐요.`,
    (d, e) => `${d} 환경은 ${envSummary(e)}로 안정적이에요. 회·해산물도 편하게 골라봐요.`,
    (d) => `${d} 오늘은 마음 편히 회식·모임 다녀와도 좋아요.`,
  ],
  2: [
    (d) => `오늘 ${d}는 무난한 날이에요. 평소처럼 즐겨봐요.`,
    (d, e) => `${d}는 ${envSummary(e)}로 무난해요. 대부분 메뉴 편하게 골라도 좋아요.`,
  ],
  3: [
    (d, e) => `${d}는 ${envSummary(e)}로 세균이 잘 번식해요. 칼국수·국밥처럼 따뜻한 가열 메뉴를 추천해요.`,
    (d) => `${d} 오늘은 가열한 메뉴가 안전해요. 비빔국수·냉채는 다음 기회에 만나봐요.`,
    (d, e) => `오늘 ${d}는 ${e.temp}°C로 무더워요. 따끈한 국물 메뉴가 잘 어울려요.`,
    (d) => `${d} 회식이라면 구이·전골을 추천해요.`,
  ],
  4: [
    (d, e) => `${d}는 ${envSummary(e)}로 식중독 가능성이 커요. 충분히 가열한 국물 메뉴를 추천해요.`,
    (d) => `${d} 오늘은 잘 익힌 메뉴가 안전해요. 사시미·육회·생굴은 다음 기회에 만나봐요.`,
    (d, e) => `${d}는 ${envSummary(e)}로 경계 단계예요. 단품 조리 메뉴가 더 안전해요.`,
  ],
  5: [
    (d) => `오늘 ${d}는 위험 단계예요. 즉석 조리한 가열 메뉴를 추천해요.`,
    (d) => `${d} 오늘은 집에서 직접 조리하면 가장 안전해요.`,
    (d, e) => `${d}는 ${envSummary(e)}로 위험 단계예요. 모임은 다음 기회에 즐겨봐요.`,
  ],
};

export function buildRiskMessage(
  level: 1 | 2 | 3 | 4 | 5,
  district: string,
  env: EnvContext
): string {
  const list = RISK_TEMPLATES[level];
  const now = new Date();
  const seed = now.getFullYear() * 1000 + now.getMonth() * 50 + now.getDate() + now.getHours();
  return list[seed % list.length](district, env);
}

// ===== Cheese Grade System =====
// 임계값 단일 소스: utils/scoring.ts. 여기는 표시용 메타.
export const cheeseGrades = {
  GOLDEN: {
    label: 'Golden Cheese',
    labelKr: '골드 치즈',
    description: '식탐정이 극찬한 식당',
    color: color.cheese.GOLDEN.fg,
    bgColor: color.cheese.GOLDEN.bg,
    image: 'gold' as const,
    minScore: 80,
  },
  SILVER: {
    label: 'Silver Cheese',
    labelKr: '실버 치즈',
    description: '식탐정이 인정한 식당',
    color: color.cheese.SILVER.fg,
    bgColor: color.cheese.SILVER.bg,
    image: 'silver' as const,
    minScore: 60,
  },
  BRONZE: {
    label: 'Bronze Cheese',
    labelKr: '브론즈 치즈',
    description: '식탐정이 주목한 식당',
    color: color.cheese.BRONZE.fg,
    bgColor: color.cheese.BRONZE.bg,
    image: 'bronze' as const,
    minScore: 0,
  },
  ROTTEN: {
    label: 'Rotten Cheese',
    labelKr: '트랩 치즈',
    description: '과락 항목 발견 — 주의가 필요한 식당',
    color: color.cheese.ROTTEN.fg,
    bgColor: color.cheese.ROTTEN.bg,
    image: null,
    minScore: 0,
  },
} as const;

// ===== Expo template compatibility =====
export default {
  light: {
    text: color.text.primary,
    background: color.surface.canvas,
    tint: tintColorLight,
    tabIconDefault: color.text.tertiary,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#FFFFFF',
    background: '#000000',
    tint: tintColorDark,
    tabIconDefault: color.text.tertiary,
    tabIconSelected: tintColorDark,
  },
};
