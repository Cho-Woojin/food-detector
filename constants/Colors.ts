// Food Detector - Design Tokens

const tintColorLight = '#F97316';
const tintColorDark = '#FB923C';

export const palette = {
  // Neutral
  white: '#FFFFFF',
  bg: '#FAFAF9',
  bgCard: '#F5F5F4',
  border: '#E5E7EB',
  borderDark: '#D1D5DB',
  text1: '#111827',
  text2: '#6B7280',
  text3: '#9CA3AF',

  // Brand
  accent: '#F97316',
  accentLight: '#FFEDD5',
  accentDark: '#EA580C',

  // Cheese Grades
  gold: '#EAB308',
  goldLight: '#FEF08A',
  silver: '#94A3B8',
  silverLight: '#E2E8F0',
  bronze: '#CD7F32',
  bronzeLight: '#F5DEB3',

  // Risk Levels (5 stages)
  riskGreen: '#22C55E',
  riskGreenLight: '#DCFCE7',
  riskYellow: '#FBBF24',
  riskYellowLight: '#FEF3C7',
  riskOrange: '#F97316',
  riskOrangeLight: '#FFEDD5',
  riskRed: '#EF4444',
  riskRedLight: '#FEE2E2',

  // Info
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Owner Mode
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',

  // Mascot
  mascotBg: '#FFF8F0',
  mascotBorder: '#FED7AA',
} as const;

// Risk Level System (5 stages)
export const riskLevels = {
  1: {
    label: 'Calm',
    labelKr: '평온',
    emoji: '🟢',
    color: palette.riskGreen,
    bgColor: palette.riskGreenLight,
    mascot: 'weather' as const,
    message: '특별한 주의 사항 없습니다',
  },
  2: {
    label: 'Good',
    labelKr: '양호',
    emoji: '🟢',
    color: palette.riskGreen,
    bgColor: palette.riskGreenLight,
    mascot: 'weather' as const,
    message: '평소처럼 즐기세요',
  },
  3: {
    label: 'Caution',
    labelKr: '주의',
    emoji: '🟡',
    color: palette.riskYellow,
    bgColor: palette.riskYellowLight,
    mascot: 'weather' as const,
    message: '가열 메뉴 위주로 추천드려요',
  },
  4: {
    label: 'Alert',
    labelKr: '경계',
    emoji: '🟠',
    color: palette.riskOrange,
    bgColor: palette.riskOrangeLight,
    mascot: 'warning' as const,
    message: '날 음식과 해산물은 피하세요',
  },
  5: {
    label: 'Danger',
    labelKr: '위험',
    emoji: '🔴',
    color: palette.riskRed,
    bgColor: palette.riskRedLight,
    mascot: 'warning' as const,
    message: '오늘은 외식 자제 권장',
  },
} as const;

// Cheese Grade System (5 grades)
export const cheeseGrades = {
  GOLDEN: {
    label: 'Golden Cheese',
    labelKr: '골든 치즈',
    description: '식탐정이 극찬한 식당',
    color: palette.gold,
    bgColor: palette.goldLight,
    image: 'gold' as const,
    minScore: 90,
  },
  SILVER: {
    label: 'Silver Cheese',
    labelKr: '실버 치즈',
    description: '식탐정이 인정한 식당',
    color: palette.silver,
    bgColor: palette.silverLight,
    image: 'silver' as const,
    minScore: 80,
  },
  BRONZE: {
    label: 'Bronze Cheese',
    labelKr: '브론즈 치즈',
    description: '식탐정이 주목한 식당',
    color: palette.bronze,
    bgColor: palette.bronzeLight,
    image: 'bronze' as const,
    minScore: 70,
  },
  INVESTIGATING: {
    label: 'Investigating',
    labelKr: '수사 중',
    description: '식탐정이 지켜보는 식당',
    color: palette.text2,
    bgColor: palette.bgCard,
    image: null,
    minScore: 60,
  },
  WARNING: {
    label: 'Warning',
    labelKr: '요주의',
    description: '식탐정이 경고한 식당',
    color: palette.riskRed,
    bgColor: palette.riskRedLight,
    image: null,
    minScore: 0,
  },
} as const;

// Expo Template Compatibility
export default {
  light: {
    text: palette.text1,
    background: palette.bg,
    tint: tintColorLight,
    tabIconDefault: palette.text3,
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: palette.white,
    background: '#000000',
    tint: tintColorDark,
    tabIconDefault: palette.text3,
    tabIconSelected: tintColorDark,
  },
};