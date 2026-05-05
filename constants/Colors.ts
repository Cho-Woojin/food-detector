// Food Detector - Design Tokens
// Brand: Green + Yellow color system (food safety domain)

const tintColorLight = '#2ECC71';
const tintColorDark = '#27AE60';

export const palette = {
  // ===== Brand Colors =====
  primaryGreen: '#2ECC71',
  subGreen: '#27AE60',
  lightGreen: '#D5F5E3',
  
  primaryYellow: '#F1C40F',
  subYellow: '#FFD662',
  lightYellow: '#FFF4CC',
  
  // ===== Status Colors =====
  alertRed: '#E74C3C',
  alertRedLight: '#FADBD8',
  
  infoBlue: '#3498DB',
  infoBlueLight: '#D6EAF8',
  
  // ===== Surface =====
  white: '#FFFFFF',
  bg: '#FFFDF8',
  bgCard: '#FAFAF7',
  surface: '#FFFFFF',
  
  // ===== Text =====
  text1: '#222222',
  text2: '#666666',
  text3: '#999999',
  textPrimary: '#222222',
  textSecondary: '#666666',
  
  // ===== Border =====
  border: '#E5E5E5',
  borderDark: '#CCCCCC',
  
  // ===== Cheese Grades =====
  // Gold = Primary Yellow (브랜드와 일관)
  gold: '#F1C40F',
  goldLight: '#FFF4CC',
  silver: '#94A3B8',
  silverLight: '#E2E8F0',
  bronze: '#CD7F32',
  bronzeLight: '#F5DEB3',
  
  // ===== Risk Levels (5 stages) =====
  riskGreen: '#2ECC71',          // 1, 2 평온/양호
  riskGreenLight: '#D5F5E3',
  riskYellow: '#F1C40F',         // 3 주의
  riskYellowLight: '#FFF4CC',
  riskOrange: '#FFD662',         // 4 경계 (Sub Yellow)
  riskOrangeLight: '#FFF8E1',
  riskRed: '#E74C3C',            // 5 위험
  riskRedLight: '#FADBD8',
  
  // ===== Legacy compatibility (기존 코드 호환) =====
  accent: '#2ECC71',             // ⭐ Orange → Green으로 변경
  accentLight: '#D5F5E3',
  accentDark: '#27AE60',
  
  warn: '#F1C40F',
  warnLight: '#FFF4CC',
  ok: '#2ECC71',
  okLight: '#D5F5E3',
  danger: '#E74C3C',
  dangerLight: '#FADBD8',
  info: '#3498DB',
  infoLight: '#D6EAF8',
  
  // ===== Owner Mode =====
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  
  // ===== Mascot =====
  mascotBg: '#FFFDF8',           // 배경과 동일하게 자연스럽게
  mascotBorder: '#FFD662',       // Sub Yellow로 부드럽게
} as const;

// ===== Risk Level System (5 stages) =====
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

// ===== Cheese Grade System =====
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
    color: palette.alertRed,
    bgColor: palette.alertRedLight,
    image: null,
    minScore: 0,
  },
} as const;

// ===== Expo Template Compatibility =====
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